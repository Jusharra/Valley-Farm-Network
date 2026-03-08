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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { deliveryId, jobId } = await req.json()
  if (!deliveryId) return json({ error: 'deliveryId is required' }, 400)

  // Verify the caller is the assigned driver for this delivery
  const { data: delivery, error: deliveryError } = await admin
    .from('deliveries')
    .select('id, order_id, driver_id, drivers(profile_id, stripe_account_id, stripe_connect_enabled)')
    .eq('id', deliveryId)
    .single()

  if (deliveryError || !delivery) return json({ error: 'Delivery not found' }, 404)

  const driverRecord = delivery.drivers as any
  if (driverRecord?.profile_id !== user.id) return json({ error: 'Forbidden' }, 403)

  // Mark delivery as delivered
  await admin
    .from('deliveries')
    .update({ delivery_status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', deliveryId)

  // Mark the delivery job as completed (if jobId provided)
  if (jobId) {
    await admin
      .from('delivery_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId)
  }

  // Mark the parent order as completed
  if (delivery.order_id) {
    await admin
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', delivery.order_id)
  }

  // Stripe payout to driver if connected and there's a job fee
  if (jobId && driverRecord?.stripe_connect_enabled && driverRecord?.stripe_account_id) {
    const { data: job } = await admin
      .from('delivery_jobs')
      .select('driver_fee')
      .eq('id', jobId)
      .single()

    const fee = Number(job?.driver_fee ?? 0)
    if (fee > 0) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
        try {
          await stripe.transfers.create({
            amount:      Math.round(fee * 100),
            currency:    'usd',
            destination: driverRecord.stripe_account_id,
            metadata:    { delivery_id: deliveryId, job_id: jobId },
          })
        } catch (err: any) {
          // Log but don't fail the delivery completion
          console.error('[complete-delivery] Stripe transfer failed:', err.message)
        }
      }
    }
  }

  return json({ ok: true })
})
