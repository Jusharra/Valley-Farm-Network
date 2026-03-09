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
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not set' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const { data: farm } = await admin
    .from('farms')
    .select('id, stripe_account_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!farm?.stripe_account_id) {
    return json({ charges_enabled: false, details_submitted: false })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  let account: Stripe.Account
  try {
    account = await stripe.accounts.retrieve(farm.stripe_account_id)
  } catch (err: any) {
    console.error('[sync-connect-account] retrieve failed:', err?.message)
    return json({ error: `Stripe error: ${err?.message}` }, 502)
  }

  await admin
    .from('farms')
    .update({
      charges_enabled:   account.charges_enabled,
      details_submitted: account.details_submitted,
    })
    .eq('id', farm.id)

  console.log(`[sync-connect-account] farm=${farm.id} charges_enabled=${account.charges_enabled}`)
  return json({ charges_enabled: account.charges_enabled, details_submitted: account.details_submitted })
})
