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

const PLATFORM_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const CONNECT_SECRET  = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  let isConnectEvent = false

  // Each webhook endpoint uses a different secret — try platform first, then Connect
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, PLATFORM_SECRET)
  } catch {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, CONNECT_SECRET)
      isConnectEvent = true
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook error: ${err.message}`, { status: 400 })
    }
  }

  console.log(`[stripe-webhook] ${event.type} (connect=${isConnectEvent})`)

  try {
    switch (event.type) {

      // ── Connect account events ──────────────────────────────────────────────
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.account as string)
        break

      // ── Platform subscription events ────────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, err)
    return new Response(`Handler error: ${err.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account) {
  // Fired repeatedly during onboarding — once charges_enabled flips true, the farmer is live
  const { error } = await supabase
    .from('farms')
    .update({
      stripe_account_id:  account.id,
      charges_enabled:    account.charges_enabled,
      details_submitted:  account.details_submitted,
    })
    .eq('stripe_account_id', account.id)

  if (error) throw error
  console.log(`[account.updated] ${account.id} charges_enabled=${account.charges_enabled}`)
}

async function handleAccountDeauthorized(accountId: string) {
  // Farmer disconnected their Stripe account from the platform
  const { error } = await supabase
    .from('farms')
    .update({
      stripe_account_id: null,
      charges_enabled:   false,
      details_submitted: false,
    })
    .eq('stripe_account_id', accountId)

  if (error) throw error
  console.log(`[account.deauthorized] ${accountId}`)
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  // We expect farm_id in subscription metadata, set when creating the checkout
  const farmId = subscription.metadata?.farm_id
  if (!farmId) {
    console.warn(`[subscription.upsert] Missing farm_id metadata on ${subscription.id}`)
    return
  }

  const priceId = subscription.items.data[0]?.price.id

  // Resolve to a farm_plans row via the Stripe price ID
  const { data: plan } = await supabase
    .from('farm_plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .maybeSingle()

  const { error } = await supabase
    .from('farm_platform_subscriptions')
    .upsert(
      {
        farm_id:                farmId,
        plan_id:                plan?.id ?? null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id:     subscription.customer as string,
        status:                 subscription.status,
        current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
      },
      { onConflict: 'stripe_subscription_id' },
    )

  if (error) throw error
  console.log(`[subscription.upsert] ${subscription.id} farm=${farmId} status=${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('farm_platform_subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error
  console.log(`[subscription.deleted] ${subscription.id}`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const { error } = await supabase
    .from('farm_platform_subscriptions')
    .update({ status: 'active' })
    .eq('stripe_subscription_id', invoice.subscription as string)

  if (error) throw error
  console.log(`[invoice.paid] subscription=${invoice.subscription}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const { error } = await supabase
    .from('farm_platform_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription as string)

  if (error) throw error
  console.log(`[invoice.payment_failed] subscription=${invoice.subscription}`)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const farmId = session.metadata?.farm_id
  if (!farmId) return

  if (session.mode === 'payment') {
    // One-time listing fee paid — activate the farm
    const { error } = await supabase
      .from('farms')
      .update({ is_active: true })
      .eq('id', farmId)

    if (error) throw error
    console.log(`[checkout.completed] One-time listing paid, activated farm=${farmId}`)
  } else {
    // Subscription checkout — subscription events will handle the rest
    console.log(`[checkout.completed] Subscription checkout for farm=${farmId}`)
  }
}
