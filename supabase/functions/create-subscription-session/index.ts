import Stripe from 'npm:stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not set' }, 500)

  const stripe  = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  const admin   = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const APP_URL = Deno.env.get('APP_URL') ?? 'valley-farm-network.netlify.app'

  // Optional auth
  let userId: string | null = null
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    userId = user?.id ?? null
  }

  const { farmId, productId, farmSlug } = await req.json()

  if (!farmId || !productId) return json({ error: 'farmId and productId are required' }, 400)

  // ── Fetch farm and product ────────────────────────────────────────────────
  const [{ data: farm, error: farmErr }, { data: product, error: prodErr }] = await Promise.all([
    admin.from('farms').select('id, farm_name, stripe_account_id, charges_enabled').eq('id', farmId).single(),
    admin.from('products').select('id, name, description, price').eq('id', productId).single(),
  ])

  if (farmErr || !farm) return json({ error: 'Farm not found' }, 404)
  if (prodErr || !product) return json({ error: 'Product not found' }, 404)

  if (!farm.stripe_account_id) {
    return json({ error: 'This farm has not connected a payment account yet. Contact the farm directly.' }, 422)
  }
  if (!farm.charges_enabled) {
    return json({ error: 'This farm\'s payment account is not yet active. Contact the farm directly.' }, 422)
  }

  // ── Create Stripe Checkout Session on the farm's Connected account ────────
  // Subscription sessions run "on behalf of" the connected account.
  // VFN earns via flat listing/subscription fees — no per-transaction cut.
  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode:                 'subscription',
        line_items: [
          {
            price_data: {
              currency:     'usd',
              unit_amount:  Math.round(product.price * 100),
              recurring:    { interval: 'week' },
              product_data: {
                name:        product.name,
                description: product.description ?? farm.farm_name,
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            farm_id:    farm.id,
            product_id: product.id,
            customer_id: userId ?? 'guest',
          },
        },
        success_url: `${APP_URL}/farms/${farmSlug}?subscribed=1`,
        cancel_url:  `${APP_URL}/farms/${farmSlug}`,
        customer_email: undefined, // Stripe will collect email during checkout
      },
      {
        stripeAccount: farm.stripe_account_id,  // charge on behalf of the farm
      }
    )

    return json({ url: session.url })
  } catch (err) {
    console.error('[create-subscription-session] Stripe error:', err.message)
    return json({ error: err.message }, 500)
  }
})
