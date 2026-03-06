import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Authenticate the caller via their Supabase session JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) {
    return json({ error: 'Invalid token' }, 401)
  }

  // Find this user's farm
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('id, farm_name, stripe_account_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (farmError || !farm) {
    return json({ error: 'Farm not found' }, 404)
  }

  // Parse optional return/refresh URLs from the request body
  let return_url  = `${APP_URL}/dashboard?stripe=success`
  let refresh_url = `${APP_URL}/dashboard?stripe=refresh`
  try {
    const body = await req.json()
    if (body.return_url)  return_url  = body.return_url
    if (body.refresh_url) refresh_url = body.refresh_url
  } catch { /* empty body is fine */ }

  // Create a Stripe Express account if the farm doesn't have one yet
  let accountId = farm.stripe_account_id
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: { farm_id: farm.id },
    })
    accountId = account.id

    // Save immediately so the webhook can match account.updated back to this farm
    const { error: updateError } = await supabase
      .from('farms')
      .update({ stripe_account_id: accountId })
      .eq('id', farm.id)

    if (updateError) {
      console.error('Failed to save stripe_account_id:', updateError)
      return json({ error: 'Database update failed' }, 500)
    }
  }

  // Generate a fresh one-time Account Link for this onboarding session
  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    return_url,
    refresh_url,
    type: 'account_onboarding',
  })

  console.log(`[create-connect-link] farm=${farm.id} account=${accountId}`)
  return json({ url: accountLink.url })
})
