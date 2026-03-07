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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const stripe  = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  const admin   = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  const uc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await uc.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { planId } = await req.json()
  if (!planId) return json({ error: 'planId is required' }, 400)

  // Fetch plan
  const { data: plan, error: planErr } = await admin
    .from('farm_plans')
    .select('id, name, plan_type, stripe_price_id')
    .eq('id', planId)
    .single()

  if (planErr || !plan) return json({ error: 'Plan not found' }, 404)
  if (!plan.stripe_price_id) {
    return json({ error: 'This plan is not yet configured for online checkout. Contact support.' }, 422)
  }

  // Fetch farmer's farm
  const { data: farm, error: farmErr } = await admin
    .from('farms')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (farmErr || !farm) return json({ error: 'Farm not found' }, 404)

  // Check for existing Stripe customer on platform account
  const { data: existingSub } = await admin
    .from('farm_platform_subscriptions')
    .select('stripe_customer_id')
    .eq('farm_id', farm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const existingCustomerId = existingSub?.stripe_customer_id ?? undefined

  try {
    const isSubscription = plan.plan_type === 'monthly'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode:       isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?plan=activated`,
      cancel_url:  `${APP_URL}/dashboard?tab=subscription`,
      metadata: { farm_id: farm.id, plan_id: plan.id },
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email }),
    }

    if (isSubscription) {
      sessionParams.subscription_data = {
        metadata: { farm_id: farm.id, plan_id: plan.id },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return json({ url: session.url })
  } catch (err) {
    console.error('[create-platform-checkout] Stripe error:', err.message)
    return json({ error: err.message }, 500)
  }
})
