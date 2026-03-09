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
  const APP_URL = Deno.env.get('APP_URL') ?? 'valley-farm-network.netlify.app'

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data: farm } = await admin
    .from('farms')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!farm) return json({ error: 'Farm not found' }, 404)

  // Find the stripe_customer_id from the most recent platform subscription
  const { data: sub } = await admin
    .from('farm_platform_subscriptions')
    .select('stripe_customer_id')
    .eq('farm_id', farm.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return json({ error: 'No billing record found. Please subscribe to a plan first.' }, 404)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: body.return_url ?? `${APP_URL}/dashboard`,
    })
    return json({ url: session.url })
  } catch (err) {
    console.error('[create-portal-link] Stripe error:', err.message)
    return json({ error: err.message }, 500)
  }
})
