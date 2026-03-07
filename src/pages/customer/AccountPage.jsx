import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, ShoppingBag, RefreshCw, MapPin, Plus, Trash2, Home, Check, Settings,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { styles } from '../../lib/styles'
import AccountSettings from '../../components/AccountSettings'

// ── Status pill colours ─────────────────────────────────────────────────────
const ORDER_STATUS = {
  pending:          'bg-amber-100 text-amber-700',
  paid:             'bg-blue-100 text-blue-700',
  processing:       'bg-blue-100 text-blue-700',
  ready:            'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  completed:        'bg-green-100 text-green-700',
  cancelled:        'bg-stone-100 text-stone-500',
  refunded:         'bg-red-100 text-red-700',
}

const SUB_STATUS = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100 text-amber-700',
  cancelled: 'bg-stone-100 text-stone-500',
  past_due:  'bg-red-100 text-red-700',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => (n == null ? '—' : `$${Number(n).toFixed(2)}`)

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white/80 rounded-2xl border border-stone-200/50 p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-4 bg-stone-200 rounded w-1/4" />
            <div className="h-4 bg-stone-100 rounded flex-1" />
            <div className="h-6 bg-stone-100 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white/80 rounded-2xl border border-stone-200/50 py-16 text-center">
      <Icon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
      <p className="font-semibold text-stone-600 mb-1">{title}</p>
      <p className="text-stone-400 text-sm">{desc}</p>
    </div>
  )
}

// ── Address form ─────────────────────────────────────────────────────────────
const BLANK_ADDR = { address_line_1: '', address_line_2: '', city: '', state: 'CA', postal_code: '', is_default: false }

function AddressForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState(BLANK_ADDR)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="bg-white/80 rounded-2xl border-2 border-green-200 p-6 space-y-4">
      <h3 className="font-bold text-stone-800">New address</h3>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Street address</label>
        <input className={styles.input} placeholder="123 Farm Road" value={form.address_line_1}
          onChange={e => set('address_line_1', e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Apt / Suite (optional)</label>
        <input className={styles.input} placeholder="Apt 4B" value={form.address_line_2}
          onChange={e => set('address_line_2', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
          <input className={styles.input} placeholder="Bakersfield" value={form.city}
            onChange={e => set('city', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">State</label>
          <input className={styles.input} placeholder="CA" maxLength={2} value={form.state}
            onChange={e => set('state', e.target.value.toUpperCase())} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">ZIP</label>
          <input className={styles.input} placeholder="93301" value={form.postal_code}
            onChange={e => set('postal_code', e.target.value)} required />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)}
          className="w-4 h-4 accent-green-600" />
        <span className="text-sm text-stone-700">Set as default address</span>
      </label>

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.address_line_1 || !form.city || !form.postal_code}
          className={`${styles.buttonPrimary} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save address'}
        </button>
        <button onClick={onCancel} className={styles.buttonSecondary}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'orders',        label: 'Order history',   icon: ShoppingBag },
  { id: 'subscriptions', label: 'Subscriptions',   icon: RefreshCw   },
  { id: 'addresses',     label: 'Addresses',        icon: MapPin      },
  { id: 'account',       label: 'Account settings', icon: Settings    },
]

export default function AccountPage() {
  const navigate = useNavigate()
  const { profile, session, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('orders')

  // Orders
  const [orders, setOrders]             = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)

  // Subscriptions
  const [subs, setSubs]               = useState([])
  const [subsLoading, setSubsLoading] = useState(false)

  // Addresses
  const [addresses, setAddresses]         = useState([])
  const [addrsLoading, setAddrsLoading]   = useState(false)
  const [showAddrForm, setShowAddrForm]   = useState(false)
  const [addrSaving, setAddrSaving]       = useState(false)

  const uid = session?.user?.id

  useEffect(() => {
    if (!uid) return

    if (activeTab === 'orders') {
      setOrdersLoading(true)
      supabase
        .from('orders')
        .select(`
          id, order_number, total_amount, status, fulfillment_method, created_at,
          farms(farm_name, slug),
          order_items(id, product_name, quantity, unit_price, line_total)
        `)
        .eq('customer_id', uid)
        .order('created_at', { ascending: false })
        .then(({ data }) => setOrders(data ?? []))
        .finally(() => setOrdersLoading(false))
    }

    if (activeTab === 'subscriptions') {
      setSubsLoading(true)
      supabase
        .from('customer_subscriptions')
        .select(`
          id, status, start_date, next_billing_date, notes,
          farms(farm_name, slug),
          subscription_plans(name, price, billing_interval)
        `)
        .eq('customer_id', uid)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSubs(data ?? []))
        .finally(() => setSubsLoading(false))
    }

    if (activeTab === 'addresses') {
      setAddrsLoading(true)
      supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', uid)
        .order('is_default', { ascending: false })
        .then(({ data }) => setAddresses(data ?? []))
        .finally(() => setAddrsLoading(false))
    }
  }, [activeTab, uid])

  // ── Subscription actions ──────────────────────────────────────────────────
  async function updateSubStatus(sub, status) {
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, status } : s))
    const { error } = await supabase.from('customer_subscriptions').update({ status }).eq('id', sub.id)
    if (error) setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, status: sub.status } : s))
  }

  // ── Address actions ───────────────────────────────────────────────────────
  async function saveAddress(form) {
    setAddrSaving(true)
    // If new address is default, clear existing defaults first
    if (form.is_default) {
      await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', uid)
    }
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({ ...form, customer_id: uid })
      .select()
      .single()
    if (!error && data) {
      setAddresses(prev => {
        const base = form.is_default ? prev.map(a => ({ ...a, is_default: false })) : prev
        return [data, ...base]
      })
      setShowAddrForm(false)
    }
    setAddrSaving(false)
  }

  async function deleteAddress(id) {
    setAddresses(prev => prev.filter(a => a.id !== id))
    await supabase.from('customer_addresses').delete().eq('id', id)
  }

  async function setDefaultAddress(addr) {
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addr.id })))
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', uid)
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', addr.id)
  }

  const initial = (profile?.full_name?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className={styles.pageBackground}>
      {/* Nav */}
      <nav className="max-w-4xl mx-auto px-6 pt-8 pb-2 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>Kern Harvest</span>
        </button>
        <button onClick={signOut} className="text-stone-400 hover:text-red-600 text-sm transition-colors">
          Sign out
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Profile header */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
              {profile?.full_name ?? 'My Account'}
            </h1>
            <p className="text-stone-500">{profile?.email}</p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl mb-8 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          ordersLoading ? <TableSkeleton /> : orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" desc="Your order history will appear here once you shop from a local farm." />
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="bg-white/80 rounded-2xl border border-stone-200/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full px-6 py-5 flex items-center gap-4 hover:bg-stone-50/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-stone-800">{order.order_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS[order.status] ?? 'bg-stone-100 text-stone-500'}`}>
                          {order.status?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-stone-400 capitalize">{order.fulfillment_method}</span>
                      </div>
                      <p className="text-stone-500 text-sm">
                        {order.farms?.farm_name ?? '—'} · {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-bold text-stone-800">{fmt(order.total_amount)}</span>
                  </button>

                  {expandedOrder === order.id && (
                    <div className="px-6 pb-5 border-t border-stone-100">
                      <table className="w-full text-sm mt-4">
                        <thead>
                          <tr className="text-stone-400 text-xs font-medium">
                            <th className="text-left pb-2">Item</th>
                            <th className="text-center pb-2">Qty</th>
                            <th className="text-right pb-2">Price</th>
                            <th className="text-right pb-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {order.order_items?.map(item => (
                            <tr key={item.id}>
                              <td className="py-2 text-stone-700">{item.product_name}</td>
                              <td className="py-2 text-center text-stone-500">{item.quantity}</td>
                              <td className="py-2 text-right text-stone-500">{fmt(item.unit_price)}</td>
                              <td className="py-2 text-right font-medium text-stone-800">{fmt(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-stone-200">
                            <td colSpan={3} className="pt-3 text-right font-semibold text-stone-700">Order total</td>
                            <td className="pt-3 text-right font-bold text-stone-800">{fmt(order.total_amount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                      <button
                        onClick={() => navigate(`/farms/${order.farms?.slug}`)}
                        className="mt-4 text-green-700 text-sm font-medium hover:underline"
                      >
                        Visit {order.farms?.farm_name} →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {activeTab === 'subscriptions' && (
          subsLoading ? <TableSkeleton rows={3} /> : subs.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No subscriptions" desc="Subscribe to a farm's weekly box to see it here." />
          ) : (
            <div className="space-y-4">
              {subs.map(sub => (
                <div key={sub.id} className="bg-white/80 rounded-2xl border border-stone-200/50 p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-stone-800">{sub.subscription_plans?.name ?? '—'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS[sub.status] ?? ''}`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-stone-500 text-sm">
                        {sub.farms?.farm_name ?? '—'}
                        {sub.subscription_plans?.price != null && (
                          <span> · {fmt(sub.subscription_plans.price)}/{sub.subscription_plans.billing_interval}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-stone-400">Next billing</p>
                      <p className="font-medium text-stone-700 text-sm">{sub.next_billing_date ?? '—'}</p>
                    </div>
                  </div>

                  {sub.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {sub.status === 'active' && (
                        <button
                          onClick={() => updateSubStatus(sub, 'paused')}
                          className="text-amber-600 bg-amber-50 hover:bg-amber-100 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button
                          onClick={() => updateSubStatus(sub, 'active')}
                          className="text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => updateSubStatus(sub, 'cancelled')}
                        className="text-stone-400 hover:text-red-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── ADDRESSES ── */}
        {activeTab === 'addresses' && (
          addrsLoading ? <TableSkeleton rows={2} /> : (
            <div className="space-y-4">
              {addresses.map(addr => (
                <div key={addr.id} className={`bg-white/80 rounded-2xl border p-5 flex items-start gap-4 ${addr.is_default ? 'border-green-300' : 'border-stone-200/50'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${addr.is_default ? 'bg-green-100' : 'bg-stone-100'}`}>
                    <Home className={`w-5 h-5 ${addr.is_default ? 'text-green-600' : 'text-stone-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-stone-800">
                        {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                      </p>
                      {addr.is_default && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm">{addr.city}, {addr.state} {addr.postal_code}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!addr.is_default && (
                      <button
                        onClick={() => setDefaultAddress(addr)}
                        className="text-stone-400 hover:text-green-700 text-xs font-medium transition-colors"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {showAddrForm ? (
                <AddressForm onSave={saveAddress} onCancel={() => setShowAddrForm(false)} saving={addrSaving} />
              ) : (
                <button
                  onClick={() => setShowAddrForm(true)}
                  className="w-full bg-white/60 border-2 border-dashed border-stone-300 hover:border-green-400 hover:bg-white/80 rounded-2xl p-5 flex items-center justify-center gap-2 text-stone-400 hover:text-green-700 font-medium transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add new address
                </button>
              )}

              {addresses.length === 0 && !showAddrForm && (
                <EmptyState icon={MapPin} title="No saved addresses" desc="Add a delivery address to make checkout faster." />
              )}
            </div>
          )
        )}

        {/* ── ACCOUNT SETTINGS ── */}
        {activeTab === 'account' && <AccountSettings />}

      </div>
    </div>
  )
}
