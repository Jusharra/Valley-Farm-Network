import Stripe from 'npm:stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY secret is not set' }, 500)

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    console.error('Auth error:', authError?.message)
    return json({ error: 'Invalid token' }, 401)
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  const { data: farm, error: farmError } = await adminClient
    .from('farms')
    .select('id, farm_name, stripe_account_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (farmError || !farm) {
    console.error('Farm error:', farmError?.message)
    return json({ error: 'Farm not found' }, 404)
  }

  let return_url  = `${APP_URL}/dashboard?stripe=success`
  let refresh_url = `${APP_URL}/dashboard?stripe=refresh`
  try {
    const body = await req.json()
    if (body.return_url)  return_url  = body.return_url
    if (body.refresh_url) refresh_url = body.refresh_url
  } catch { /* empty body is fine */ }

  let accountId = farm.stripe_account_id
  if (!accountId) {
    let account: Stripe.Account
    try {
      account = await stripe.accounts.create({
        type: 'express',
        metadata: { farm_id: farm.id },
      })
    } catch (err: any) {
      console.error('[create-connect-link] stripe.accounts.create failed:', err?.message)
      return json({ error: `Stripe error: ${err?.message ?? 'Could not create account'}` }, 502)
    }
    accountId = account.id

    const { error: updateError } = await adminClient
      .from('farms')
      .update({ stripe_account_id: accountId })
      .eq('id', farm.id)

    if (updateError) return json({ error: 'Database update failed' }, 500)
  }

  let accountLink: Stripe.AccountLink
  try {
    accountLink = await stripe.accountLinks.create({
      account:     accountId,
      return_url,
      refresh_url,
      type: 'account_onboarding',
    })
  } catch (err: any) {
    console.error('[create-connect-link] stripe.accountLinks.create failed:', err?.message)
    return json({ error: `Stripe error: ${err?.message ?? 'Could not create onboarding link'}` }, 502)
  }

  console.log(`[create-connect-link] farm=${farm.id} account=${accountId}`)
  return json({ url: accountLink.url })
})
