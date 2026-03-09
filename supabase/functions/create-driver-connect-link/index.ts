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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)
  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id, stripe_account_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (driverError || !driver) return json({ error: 'Driver not found' }, 404)

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  let accountId = driver.stripe_account_id
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: { driver_id: driver.id },
    })
    accountId = account.id
    const { error: updateError } = await admin
      .from('drivers')
      .update({ stripe_account_id: accountId })
      .eq('id', driver.id)
    if (updateError) return json({ error: 'Database update failed' }, 500)
  }

  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    return_url:  `${APP_URL}/driver?stripe=success`,
    refresh_url: `${APP_URL}/driver?stripe=refresh`,
    type: 'account_onboarding',
  })

  return json({ url: accountLink.url })
})
