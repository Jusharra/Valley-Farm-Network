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

      // ── Subscription events ─────────────────────────────────────────────────
      // Connect events with product_id = customer subscribed to a farm product
      // Platform events without product_id = farmer subscribed to VFN plan
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        if (isConnectEvent && sub.metadata?.product_id) {
          await handleProductSubscriptionUpsert(sub)
        } else {
          await handleSubscriptionUpsert(sub)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        if (isConnectEvent && sub.metadata?.product_id) {
          await handleProductSubscriptionDeleted(sub)
        } else {
          await handleSubscriptionDeleted(sub)
        }
        break
      }

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
  const { error: farmErr, data: farmRows } = await supabase
    .from('farms')
    .update({
      stripe_account_id:  account.id,
      charges_enabled:    account.charges_enabled,
      details_submitted:  account.details_submitted,
    })
    .eq('stripe_account_id', account.id)
    .select('id')

  if (farmErr) throw farmErr

  // If no farm matched, the account belongs to a driver
  if (!farmRows?.length) {
    await supabase
      .from('drivers')
      .update({ stripe_connect_enabled: account.charges_enabled })
      .eq('stripe_account_id', account.id)
  }

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

// Stripe uses 'canceled' (1 l); our schema check uses 'cancelled' (2 l)
function normalizeSubStatus(status: string): string {
  return status === 'canceled' ? 'cancelled' : status
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const farmId = subscription.metadata?.farm_id
  const planIdMeta = subscription.metadata?.plan_id  // set in subscription_data.metadata
  if (!farmId) {
    console.warn(`[subscription.upsert] Missing farm_id metadata on ${subscription.id}`)
    return
  }

  const priceId = subscription.items.data[0]?.price.id

  // Prefer plan_id from metadata; fall back to stripe_price_id lookup
  let planId: string | null = planIdMeta ?? null
  if (!planId) {
    const { data: plan } = await supabase
      .from('farm_plans')
      .select('id')
      .eq('stripe_price_id', priceId)
      .maybeSingle()
    planId = plan?.id ?? null
  }

  if (!planId) {
    console.error(`[subscription.upsert] Could not resolve plan for price ${priceId} on ${subscription.id}`)
    return
  }

  const { error } = await supabase
    .from('farm_platform_subscriptions')
    .upsert(
      {
        farm_id:                farmId,
        plan_id:                planId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id:     subscription.customer as string,
        status:                 normalizeSubStatus(subscription.status),
        current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
      },
      { onConflict: 'stripe_subscription_id' },
    )

  if (error) throw error

  // Sync farms.platform_plan_slug and deactivate excess products if needed
  const { data: plan } = await supabase
    .from('farm_plans')
    .select('slug')
    .eq('id', planId)
    .single()

  const isActive = ['active', 'trialing'].includes(normalizeSubStatus(subscription.status))
  const { error: syncErr } = await supabase.rpc('sync_farm_plan', {
    p_farm_id:   farmId,
    p_plan_slug: isActive ? (plan?.slug ?? null) : null,
  })
  if (syncErr) console.error(`[subscription.upsert] sync_farm_plan error:`, syncErr.message)

  console.log(`[subscription.upsert] ${subscription.id} farm=${farmId} plan=${planId} status=${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Look up farm_id before deleting so we can sync the plan slug
  const { data: existing } = await supabase
    .from('farm_platform_subscriptions')
    .select('farm_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  const { error } = await supabase
    .from('farm_platform_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error

  // Null slug deactivates all products and clears the plan
  if (existing?.farm_id) {
    const { error: syncErr } = await supabase.rpc('sync_farm_plan', {
      p_farm_id:   existing.farm_id,
      p_plan_slug: null,
    })
    if (syncErr) console.error(`[subscription.deleted] sync_farm_plan error:`, syncErr.message)
  }

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

async function handleProductSubscriptionUpsert(subscription: Stripe.Subscription) {
  const farmId    = subscription.metadata?.farm_id
  const productId = subscription.metadata?.product_id
  if (!farmId || !productId) {
    console.warn(`[product_subscription.upsert] Missing metadata on ${subscription.id}`)
    return
  }
  const customerId = subscription.metadata?.customer_id
  const { error } = await supabase
    .from('customer_product_subscriptions')
    .upsert(
      {
        farm_id:                farmId,
        product_id:             productId,
        customer_id:            customerId && customerId !== 'guest' ? customerId : null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id:     subscription.customer as string,
        status:                 subscription.status,
        current_period_end:     new Date(subscription.current_period_end * 1000).toISOString(),
      },
      { onConflict: 'stripe_subscription_id' },
    )
  if (error) throw error
  console.log(`[product_subscription.upsert] ${subscription.id} farm=${farmId} product=${productId} status=${subscription.status}`)
}

async function handleProductSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('customer_product_subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)
  if (error) throw error
  console.log(`[product_subscription.deleted] ${subscription.id}`)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // ── Product purchase (cart checkout) ─────────────────────────────────────
  if (session.metadata?.order_type === 'product_purchase') {
    const orderIds = (session.metadata.order_ids ?? '').split(',').filter(Boolean)
    if (!orderIds.length) return

    // Mark orders as paid
    const { data: orders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, farm_id, subtotal, platform_fee, farms(stripe_account_id, charges_enabled)')
      .in('id', orderIds)
      .eq('status', 'pending_payment')

    if (fetchErr) throw fetchErr
    if (!orders?.length) {
      console.warn(`[checkout.completed] No pending orders found for ids: ${orderIds}`)
      return
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status:                    'paid',
        stripe_payment_intent_id:  session.payment_intent as string ?? null,
      })
      .in('id', orderIds)

    if (updateErr) throw updateErr

    // Transfer farm's share (subtotal minus platform fee) to each connected account
    for (const order of orders) {
      const farm = order.farms as any
      if (!farm?.stripe_account_id || !farm?.charges_enabled) {
        console.warn(`[checkout.completed] Farm for order ${order.id} has no active Connect account — skipping transfer`)
        continue
      }
      const transferAmount = Math.round(((order.subtotal ?? 0) - (order.platform_fee ?? 0)) * 100)
      if (transferAmount <= 0) continue

      try {
        await stripe.transfers.create({
          amount:      transferAmount,
          currency:    'usd',
          destination: farm.stripe_account_id,
          metadata:    { order_id: order.id },
        })
        console.log(`[checkout.completed] Transferred $${(transferAmount / 100).toFixed(2)} to ${farm.stripe_account_id} for order ${order.id}`)
      } catch (err: unknown) {
        // Log but don't throw — order is already marked paid; transfers can be retried manually
        console.error(`[checkout.completed] Transfer failed for order ${order.id}:`, (err as Error).message)
      }
    }

    console.log(`[checkout.completed] Product purchase fulfilled: orders=${orderIds}`)
    return
  }

  // ── Farm listing fee (original behavior) ─────────────────────────────────
  const farmId = session.metadata?.farm_id
  if (!farmId) return

  if (session.mode === 'payment') {
    const { error } = await supabase
      .from('farms')
      .update({ is_active: true })
      .eq('id', farmId)

    if (error) throw error

    // Sync plan slug so the product limit is enforced immediately
    const oneTimePlanId = session.metadata?.plan_id ?? null
    if (oneTimePlanId) {
      const { data: plan } = await supabase
        .from('farm_plans')
        .select('slug')
        .eq('id', oneTimePlanId)
        .single()
      if (plan?.slug) {
        const { error: syncErr } = await supabase.rpc('sync_farm_plan', {
          p_farm_id:   farmId,
          p_plan_slug: plan.slug,
        })
        if (syncErr) console.error(`[checkout.completed] sync_farm_plan error:`, syncErr.message)
      }
    }

    console.log(`[checkout.completed] Listing fee paid, activated farm=${farmId}`)
  } else if (session.mode === 'subscription' && session.subscription) {
    // Eagerly write the platform subscription row so the UI updates immediately
    // (customer.subscription.created will also fire and upsert the same row)
    const planId = session.metadata?.plan_id ?? null
    if (!planId) {
      console.warn(`[checkout.completed] No plan_id in session metadata for farm=${farmId}`)
      return
    }

    // Fetch subscription to get period dates
    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)

    const { error } = await supabase
      .from('farm_platform_subscriptions')
      .upsert(
        {
          farm_id:                farmId,
          plan_id:                planId,
          stripe_subscription_id: stripeSub.id,
          stripe_customer_id:     session.customer as string,
          status:                 normalizeSubStatus(stripeSub.status),
          current_period_start:   new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(stripeSub.current_period_end   * 1000).toISOString(),
        },
        { onConflict: 'stripe_subscription_id' },
      )

    if (error) throw error

    // Sync plan slug and enforce product limit
    const { data: subPlan } = await supabase
      .from('farm_plans')
      .select('slug')
      .eq('id', planId)
      .single()

    const subIsActive = ['active', 'trialing'].includes(normalizeSubStatus(stripeSub.status))
    const { error: syncErr } = await supabase.rpc('sync_farm_plan', {
      p_farm_id:   farmId,
      p_plan_slug: subIsActive ? (subPlan?.slug ?? null) : null,
    })
    if (syncErr) console.error(`[checkout.completed] sync_farm_plan error:`, syncErr.message)

    console.log(`[checkout.completed] Platform subscription recorded farm=${farmId} plan=${planId}`)
  }
}
