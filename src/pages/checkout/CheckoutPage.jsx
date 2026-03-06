import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShoppingBag, Plus, Minus, Leaf, Truck, Store,
  User, ArrowLeft, CreditCard, Check, AlertCircle,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const TAX_RATE    = 0.0825
const DELIVERY_FEE = 5.00

function genOrderNumber() {
  return 'ORN-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeFromCart, clearCart } = useCart()
  const { session } = useAuth()

  const [fulfillment, setFulfillment] = useState('pickup')
  const [guestInfo, setGuestInfo]     = useState({ name: '', email: '', phone: '' })
  const [address, setAddress]         = useState({ line1: '', city: '', state: 'CA', postal_code: '' })
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Group items by farm
  const farmGroups = useMemo(() => {
    const groups = {}
    items.forEach((item, idx) => {
      if (!groups[item.farmId]) {
        groups[item.farmId] = { farmId: item.farmId, farmName: item.farmName, items: [] }
      }
      groups[item.farmId].items.push({ ...item, _idx: idx })
    })
    return Object.values(groups)
  }, [items])

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-700 mb-2">Your cart is empty</h2>
          <p className="text-stone-500 mb-6">Add some fresh produce from local farms</p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-700 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-green-600 transition-colors"
          >
            Browse farms
          </button>
        </div>
      </div>
    )
  }

  const subtotal    = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const deliveryFee = fulfillment === 'delivery' ? DELIVERY_FEE * farmGroups.length : 0
  const taxAmount   = (subtotal + deliveryFee) * TAX_RATE
  const total       = subtotal + deliveryFee + taxAmount

  async function handlePlaceOrder() {
    setError('')

    if (!session && (!guestInfo.name.trim() || !guestInfo.email.trim())) {
      setError('Please provide your name and email to continue.')
      return
    }
    if (fulfillment === 'delivery' && (!address.line1 || !address.city || !address.postal_code)) {
      setError('Please complete the delivery address.')
      return
    }

    setLoading(true)
    try {
      const customerId     = session?.user?.id ?? null
      const createdOrderIds = []

      for (const group of farmGroups) {
        const groupSubtotal   = group.items.reduce((s, i) => s + i.product.price * i.quantity, 0)
        const groupDelivery   = fulfillment === 'delivery' ? DELIVERY_FEE : 0
        const groupTax        = (groupSubtotal + groupDelivery) * TAX_RATE
        const groupPlatformFee = groupSubtotal * 0.03
        const groupTotal      = groupSubtotal + groupDelivery + groupTax

        const guestNote = !session
          ? `Guest: ${guestInfo.name} <${guestInfo.email}>${guestInfo.phone ? ' ' + guestInfo.phone : ''}`
          : ''

        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            customer_id:      customerId,
            farm_id:          group.farmId,
            order_number:     genOrderNumber(),
            order_type:       'one_time',
            status:           'paid',          // MVP: set paid immediately; replace with Stripe webhook
            fulfillment_method: fulfillment,
            subtotal:         groupSubtotal,
            delivery_fee:     groupDelivery,
            tax_amount:       groupTax,
            platform_fee:     groupPlatformFee,
            total_amount:     groupTotal,
            notes:            [notes, guestNote].filter(Boolean).join(' | '),
          })
          .select('id')
          .single()

        if (orderErr) throw orderErr

        const { error: itemsErr } = await supabase
          .from('order_items')
          .insert(group.items.map(i => ({
            order_id:     order.id,
            product_id:   i.product.id ?? null,
            product_name: i.product.name,
            quantity:     i.quantity,
            unit_price:   i.product.price,
            line_total:   i.product.price * i.quantity,
          })))

        if (itemsErr) throw itemsErr

        if (fulfillment === 'delivery') {
          await supabase.from('deliveries').insert({
            order_id:                 order.id,
            delivery_status:          'unassigned',
            delivery_address_line_1:  address.line1,
            city:                     address.city,
            state:                    address.state,
            postal_code:              address.postal_code,
            delivery_notes:           notes,
          })
        }

        createdOrderIds.push(order.id)
      }

      clearCart()
      navigate(`/checkout/success?orders=${createdOrderIds.join(',')}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
              Kern Harvest
            </span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-stone-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          Checkout
        </h1>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* ── Left column ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Cart items */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h2 className="font-bold text-stone-800 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-green-700" />
                  Your items ({items.length})
                </h2>
              </div>
              <div className="divide-y divide-stone-100">
                {items.map((item, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.product.image_url
                        ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        : <Leaf className="w-5 h-5 text-stone-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 truncate">{item.product.name}</p>
                      {item.farmName && <p className="text-stone-400 text-xs">{item.farmName}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p className="font-semibold text-stone-800">${(item.product.price * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-red-400 hover:text-red-600 text-xs transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest contact info */}
            {!session && (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100">
                  <h2 className="font-bold text-stone-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-green-700" />
                    Contact information
                  </h2>
                  <p className="text-sm text-stone-500 mt-1">
                    Or{' '}
                    <Link to="/signin" className="text-green-700 font-medium hover:underline">
                      sign in
                    </Link>{' '}
                    to use your saved info
                  </p>
                </div>
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Full name" required>
                      <input
                        type="text"
                        value={guestInfo.name}
                        onChange={e => setGuestInfo(p => ({ ...p, name: e.target.value }))}
                        className={inputCls}
                        placeholder="Jane Smith"
                      />
                    </Field>
                  </div>
                  <Field label="Email" required>
                    <input
                      type="email"
                      value={guestInfo.email}
                      onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))}
                      className={inputCls}
                      placeholder="jane@example.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={guestInfo.phone}
                      onChange={e => setGuestInfo(p => ({ ...p, phone: e.target.value }))}
                      className={inputCls}
                      placeholder="(661) 555-0100"
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* Fulfillment */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h2 className="font-bold text-stone-800">Fulfillment method</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFulfillment('pickup')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    fulfillment === 'pickup' ? 'border-green-500 bg-green-50' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <Store className={`w-6 h-6 mb-2 ${fulfillment === 'pickup' ? 'text-green-700' : 'text-stone-400'}`} />
                  <p className="font-semibold text-stone-800">Farm pickup</p>
                  <p className="text-sm text-stone-500">Free · Pick up at the farm</p>
                </button>
                <button
                  onClick={() => setFulfillment('delivery')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    fulfillment === 'delivery' ? 'border-green-500 bg-green-50' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <Truck className={`w-6 h-6 mb-2 ${fulfillment === 'delivery' ? 'text-green-700' : 'text-stone-400'}`} />
                  <p className="font-semibold text-stone-800">Home delivery</p>
                  <p className="text-sm text-stone-500">$5.00 per farm · 1–3 days</p>
                </button>
              </div>

              {fulfillment === 'delivery' && (
                <div className="px-6 pb-6 border-t border-stone-100 pt-5 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Street address" required>
                      <input
                        type="text"
                        value={address.line1}
                        onChange={e => setAddress(p => ({ ...p, line1: e.target.value }))}
                        className={inputCls}
                        placeholder="123 Main St"
                      />
                    </Field>
                  </div>
                  <Field label="City" required>
                    <input
                      type="text"
                      value={address.city}
                      onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                      className={inputCls}
                      placeholder="Bakersfield"
                    />
                  </Field>
                  <Field label="ZIP code" required>
                    <input
                      type="text"
                      value={address.postal_code}
                      onChange={e => setAddress(p => ({ ...p, postal_code: e.target.value }))}
                      className={inputCls}
                      placeholder="93301"
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-stone-200">
              <div className="px-6 py-5">
                <Field label="Order notes (optional)">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="Special requests or delivery instructions..."
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Right column: order summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-stone-200 sticky top-6">
              <div className="px-6 py-4 border-b border-stone-100">
                <h2 className="font-bold text-stone-800">Order summary</h2>
              </div>
              <div className="px-6 py-5 space-y-3 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {fulfillment === 'delivery' && (
                  <div className="flex justify-between text-stone-600">
                    <span>
                      Delivery fee{farmGroups.length > 1 ? ` (${farmGroups.length} farms)` : ''}
                    </span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Tax (8.25%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="h-px bg-stone-100" />
                <div className="flex justify-between font-bold text-stone-800 text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Stripe placeholder */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Payment</p>
                      <p className="text-amber-700 mt-0.5">
                        Wire in your Stripe publishable key to enable real card payments.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Placing order...'
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Place order · ${total.toFixed(2)}
                    </>
                  )}
                </button>

                <p className="text-xs text-stone-400 text-center">
                  By placing your order you agree to our terms of service
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
