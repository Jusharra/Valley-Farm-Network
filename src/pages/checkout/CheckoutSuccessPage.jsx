import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, ShoppingBag, Home, Leaf, Package } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CheckoutSuccessPage() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const { session }    = useAuth()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  const orderIds = params.get('orders')?.split(',').filter(Boolean) ?? []

  useEffect(() => {
    if (!orderIds.length) { setLoading(false); return }
    supabase
      .from('orders')
      .select('id, order_number, total_amount, fulfillment_method, order_items(product_name, quantity, unit_price)')
      .in('id', orderIds)
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
              Kern Harvest
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-stone-800 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          Order placed!
        </h1>
        <p className="text-stone-600 mb-10">
          Thank you for supporting local farms. You'll receive a confirmation shortly.
        </p>

        {/* Order cards */}
        {loading ? (
          <div className="space-y-4 mb-10">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse text-left">
                <div className="h-4 bg-stone-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : orders.length > 0 && (
          <div className="space-y-4 mb-10 text-left">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-700" />
                    <span className="font-semibold text-stone-800">Order #{order.order_number}</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    ${Number(order.total_amount).toFixed(2)}
                  </span>
                </div>
                <div className="px-6 py-4 space-y-2">
                  {order.order_items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-stone-600">
                      <span>{item.quantity}× {item.product_name}</span>
                      <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-stone-400">
                    {order.fulfillment_method === 'delivery' ? '🚚 Home delivery · 1–3 days' : '🏪 Farm pickup'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-2xl transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to market
          </button>
          {session && (
            <button
              onClick={() => navigate('/account')}
              className="flex items-center justify-center gap-2 border-2 border-stone-200 hover:border-stone-300 text-stone-700 font-semibold px-8 py-3 rounded-2xl transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              View order history
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
