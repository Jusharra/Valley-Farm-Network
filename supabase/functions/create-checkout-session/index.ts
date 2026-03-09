import Stripe from 'npm:stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const TAX_RATE     = 0.0825
const DELIVERY_FEE = 5.00

function genOrderNumber() {
  return 'ORN-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not set' }, 500)

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  const admin  = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  // Optional auth — guest checkout is allowed
  let userId: string | null = null
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    userId = user?.id ?? null
  }

  const { items, fulfillment, address, notes, guestInfo, deliverySelections } = await req.json()
  // deliverySelections: { [farmId]: { date, window, zoneId, fee } }

  // ── Group items by farm and fetch Stripe account status ──────────────────
  type FarmGroup = {
    farmId: string
    farmName: string
    stripeAccountId: string | null
    chargesEnabled: boolean
    items: any[]
  }

  const groupMap: Record<string, FarmGroup> = {}

  for (const item of items) {
    if (!groupMap[item.farmId]) {
      const { data: farm } = await admin
        .from('farms')
        .select('stripe_account_id, charges_enabled')
        .eq('id', item.farmId)
        .single()

      groupMap[item.farmId] = {
        farmId:          item.farmId,
        farmName:        item.farmName,
        stripeAccountId: farm?.stripe_account_id ?? null,
        chargesEnabled:  farm?.charges_enabled   ?? false,
        items: [],
      }
    }
    groupMap[item.farmId].items.push(item)
  }

  const groups = Object.values(groupMap)

  // ── Create pending orders in DB ───────────────────────────────────────────
  const createdOrderIds: string[] = []

  try {
    for (const g of groups) {
      const subtotal    = g.items.reduce((s: number, i: any) => s + i.product.price * i.quantity, 0)
      const zoneSel     = deliverySelections?.[g.farmId]
      const delivery    = fulfillment === 'delivery' ? (zoneSel?.fee ?? DELIVERY_FEE) : 0
      const tax         = (subtotal + delivery) * TAX_RATE
      const platformFee = 0
      const guestNote   = !userId && guestInfo
        ? `Guest: ${guestInfo.name} <${guestInfo.email}>${guestInfo.phone ? ' ' + guestInfo.phone : ''}`
        : ''

      const { data: order, error: oErr } = await admin
        .from('orders')
        .insert({
          customer_id:        userId,
          farm_id:            g.farmId,
          order_number:       genOrderNumber(),
          order_type:         'one_time',
          status:             'pending_payment',
          fulfillment_method: fulfillment,
          subtotal,
          delivery_fee:       delivery,
          tax_amount:         tax,
          platform_fee:       platformFee,
          total_amount:       subtotal + delivery + tax,
          notes:              [notes, guestNote].filter(Boolean).join(' | ') || null,
        })
        .select('id')
        .single()

      if (oErr) throw new Error(oErr.message)

      await admin.from('order_items').insert(
        g.items.map((i: any) => ({
          order_id:     order.id,
          product_id:   i.product.id ?? null,
          product_name: i.product.name,
          quantity:     i.quantity,
          unit_price:   i.product.price,
          line_total:   i.product.price * i.quantity,
        }))
      )

      if (fulfillment === 'delivery' && address) {
        await admin.from('deliveries').insert({
          order_id:                order.id,
          delivery_status:         'unassigned',
          delivery_address_line_1: address.line1,
          city:                    address.city,
          state:                   address.state,
          postal_code:             address.postal_code,
          delivery_notes:          notes ?? null,
          scheduled_date:          zoneSel?.date   ?? null,
          scheduled_window:        zoneSel?.window ?? null,
          delivery_zone_id:        zoneSel?.zoneId ?? null,
        })
      }

      createdOrderIds.push(order.id)
    }
  } catch (err) {
    return json({ error: err.message }, 500)
  }

  // ── Build Stripe line items ───────────────────────────────────────────────
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  for (const g of groups) {
    for (const item of g.items) {
      lineItems.push({
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(item.product.price * 100),
          product_data: {
            name:        item.product.name,
            description: g.farmName,
          },
        },
        quantity: item.quantity,
      })
    }
    if (fulfillment === 'delivery') {
      const fee = deliverySelections?.[g.farmId]?.fee ?? DELIVERY_FEE
      lineItems.push({
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(fee * 100),
          product_data: { name: `Delivery — ${g.farmName}` },
        },
        quantity: 1,
      })
    }
  }

  // ── Create Stripe Checkout Session ───────────────────────────────────────
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      line_items:           lineItems,
      success_url:          `${APP_URL}/checkout/success?orders=${createdOrderIds.join(',')}`,
      cancel_url:           `${APP_URL}/checkout`,
      customer_email:       guestInfo?.email ?? undefined,
      metadata: {
        order_type: 'product_purchase',
        order_ids:  createdOrderIds.join(','),
      },
    })

    // Store session ID on pending orders so webhook can look them up
    await admin.from('orders').update({ stripe_session_id: session.id }).in('id', createdOrderIds)

    return json({ url: session.url })
  } catch (err) {
    // Mark orders cancelled on Stripe failure so they don't sit as pending forever
    await admin.from('orders').update({ status: 'cancelled' }).in('id', createdOrderIds)
    return json({ error: err.message }, 500)
  }
})
