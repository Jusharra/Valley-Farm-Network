import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, BarChart3, Store, Package, ShoppingBag, Users, Truck, Settings,
  DollarSign, Star, CheckCircle, XCircle, ShieldCheck, Power,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3   },
  { id: 'farms',        label: 'Farms',        icon: Store       },
  { id: 'products',     label: 'Products',     icon: Package     },
  { id: 'orders',       label: 'Orders',       icon: ShoppingBag },
  { id: 'subscribers',  label: 'Subscribers',  icon: Users       },
  { id: 'drivers',      label: 'Drivers',      icon: Truck       },
  { id: 'settings',     label: 'Settings',     icon: Settings    },
]

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

const BGC_STATUS = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
            <div className="h-4 bg-stone-100 rounded w-1/4" />
            <div className="h-4 bg-stone-100 rounded flex-1" />
            <div className="h-4 bg-stone-100 rounded w-1/5" />
            <div className="h-6 bg-stone-100 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 py-16 text-center text-stone-400">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>{message}</p>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-6 rounded-full transition-colors relative ${on ? 'bg-green-500' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

const fmt = n => (n == null ? '—' : Number(n).toFixed(2))

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  // Per-tab state
  const [stats, setStats]             = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [overviewLoading, setOverviewLoading] = useState(false)

  const [farms, setFarms]             = useState([])
  const [farmsLoading, setFarmsLoading] = useState(false)

  const [products, setProducts]       = useState([])
  const [productsLoading, setProductsLoading] = useState(false)

  const [orders, setOrders]           = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [subscribers, setSubscribers] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)

  const [drivers, setDrivers]         = useState([])
  const [driversLoading, setDriversLoading] = useState(false)

  const [categories, setCategories]   = useState([])
  const [catsLoading, setCatsLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'overview') {
      setOverviewLoading(true)
      Promise.all([
        supabase.from('farms').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('customer_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders')
          .select('id, order_number, total_amount, status, created_at, farms(farm_name), profiles(full_name)')
          .order('created_at', { ascending: false }).limit(8),
      ]).then(([farmsR, subsR, usersR, pendingR, ordersR]) => {
        setStats({
          farmCount:    farmsR.count   ?? '—',
          subCount:     subsR.count    ?? '—',
          userCount:    usersR.count   ?? '—',
          pendingCount: pendingR.count ?? '—',
        })
        setRecentOrders(ordersR.data ?? [])
      }).finally(() => setOverviewLoading(false))
    }

    if (activeTab === 'farms') {
      setFarmsLoading(true)
      supabase
        .from('farms')
        .select('id, farm_name, slug, logo_url, banner_url, is_active, is_verified, is_featured, farm_addresses(city, state)')
        .order('created_at', { ascending: false })
        .then(({ data }) => setFarms(data ?? []))
        .finally(() => setFarmsLoading(false))
    }

    if (activeTab === 'products') {
      setProductsLoading(true)
      supabase
        .from('products')
        .select('id, name, price, unit_name, is_active, farms(farm_name), categories(name)')
        .order('created_at', { ascending: false }).limit(150)
        .then(({ data }) => setProducts(data ?? []))
        .finally(() => setProductsLoading(false))
    }

    if (activeTab === 'orders') {
      setOrdersLoading(true)
      supabase
        .from('orders')
        .select('id, order_number, total_amount, status, fulfillment_method, created_at, farms(farm_name), profiles(full_name)')
        .order('created_at', { ascending: false }).limit(100)
        .then(({ data }) => setOrders(data ?? []))
        .finally(() => setOrdersLoading(false))
    }

    if (activeTab === 'subscribers') {
      setSubsLoading(true)
      supabase
        .from('customer_subscriptions')
        .select('id, status, next_billing_date, profiles(full_name, email), farms(farm_name), subscription_plans(name, price, billing_interval)')
        .order('created_at', { ascending: false }).limit(100)
        .then(({ data }) => setSubscribers(data ?? []))
        .finally(() => setSubsLoading(false))
    }

    if (activeTab === 'drivers') {
      setDriversLoading(true)
      supabase
        .from('drivers')
        .select('id, vehicle_type, background_check_status, insurance_verified, is_active, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .then(({ data }) => setDrivers(data ?? []))
        .finally(() => setDriversLoading(false))
    }

    if (activeTab === 'settings') {
      setCatsLoading(true)
      supabase
        .from('categories')
        .select('id, name, slug, is_active, sort_order')
        .order('sort_order')
        .then(({ data }) => setCategories(data ?? []))
        .finally(() => setCatsLoading(false))
    }
  }, [activeTab])

  // ── Mutations ──

  async function toggleFeatured(farm) {
    const next = !farm.is_featured
    setFarms(prev => prev.map(f => f.id === farm.id ? { ...f, is_featured: next } : f))
    const { error } = await supabase.from('farms').update({ is_featured: next }).eq('id', farm.id)
    if (error) setFarms(prev => prev.map(f => f.id === farm.id ? { ...f, is_featured: farm.is_featured } : f))
  }

  async function toggleProductActive(product) {
    const next = !product.is_active
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: next } : p))
    const { error } = await supabase.from('products').update({ is_active: next }).eq('id', product.id)
    if (error) setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: product.is_active } : p))
  }

  async function updateDriverField(driver, field, value) {
    setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, [field]: value } : d))
    const { error } = await supabase.from('drivers').update({ [field]: value }).eq('id', driver.id)
    if (error) setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, [field]: driver[field] } : d))
  }

  async function toggleCategoryActive(cat) {
    const next = !cat.is_active
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: next } : c))
    const { error } = await supabase.from('categories').update({ is_active: next }).eq('id', cat.id)
    if (error) setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: cat.is_active } : c))
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Sidebar ── */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-stone-800">Kern Harvest</span>
            <span className="block text-xs text-stone-400">Admin Panel</span>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-green-50 text-green-700' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-2 pt-4 border-t border-stone-100">
          <button onClick={() => navigate('/')} className="w-full text-stone-500 hover:text-green-700 text-sm font-medium transition-colors">
            ← Back to marketplace
          </button>
          <button onClick={signOut} className="w-full text-stone-400 hover:text-red-600 text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ml-64 p-8">
        <div className="max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-800">
              {activeTab === 'overview' ? 'Dashboard Overview' : NAV_ITEMS.find(i => i.id === activeTab)?.label}
            </h1>
            <p className="text-stone-500">Welcome back, {profile?.full_name ?? 'Admin'}</p>
          </div>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            overviewLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3">
                    <div className="w-12 h-12 bg-stone-100 rounded-xl" />
                    <div className="h-8 bg-stone-200 rounded w-1/2" />
                    <div className="h-3 bg-stone-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Active Farms',        value: stats?.farmCount,    icon: Store,       bg: 'bg-green-100',  fg: 'text-green-700'  },
                    { label: 'Active Subscribers',  value: stats?.subCount,     icon: Users,       bg: 'bg-blue-100',   fg: 'text-blue-700'   },
                    { label: 'Total Users',         value: stats?.userCount,    icon: DollarSign,  bg: 'bg-amber-100',  fg: 'text-amber-700'  },
                    { label: 'Pending Orders',      value: stats?.pendingCount, icon: Package,     bg: 'bg-purple-100', fg: 'text-purple-700' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200">
                      <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                        <stat.icon className={`w-6 h-6 ${stat.fg}`} />
                      </div>
                      <p className="text-3xl font-bold text-stone-800 mb-1">{stat.value ?? '—'}</p>
                      <p className="text-stone-500 text-sm">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="p-5 border-b border-stone-100">
                    <h2 className="font-bold text-stone-800">Recent Orders</h2>
                  </div>
                  {recentOrders.length === 0 ? (
                    <p className="p-8 text-center text-stone-400">No orders yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {recentOrders.map(order => (
                        <div key={order.id} className="px-5 py-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-stone-800 text-sm font-mono">{order.order_number}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS[order.status] ?? 'bg-stone-100 text-stone-500'}`}>
                                {order.status?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-stone-400 text-xs truncate">
                              {order.profiles?.full_name ?? 'Unknown'} · {order.farms?.farm_name ?? '—'}
                            </p>
                          </div>
                          <span className="font-bold text-stone-800 text-sm">${fmt(order.total_amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          )}

          {/* ── FARMS ── */}
          {activeTab === 'farms' && (
            farmsLoading ? <TableSkeleton rows={5} /> : farms.length === 0 ? <EmptyState icon={Store} message="No farms yet." /> : (
              <div className="space-y-3">
                {farms.map(farm => {
                  const addr = farm.farm_addresses?.[0]
                  return (
                    <div key={farm.id} className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
                      {farm.logo_url || farm.banner_url ? (
                        <img src={farm.logo_url ?? farm.banner_url} alt={farm.farm_name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-amber-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-stone-800 truncate">{farm.farm_name}</h3>
                          {farm.is_verified && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium shrink-0">Verified</span>}
                          {!farm.is_active && <span className="bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full font-medium shrink-0">Inactive</span>}
                        </div>
                        <p className="text-stone-400 text-sm">{addr?.city}{addr?.state ? `, ${addr.state}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => toggleFeatured(farm)}
                          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${farm.is_featured ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                        >
                          <Star className={`w-4 h-4 ${farm.is_featured ? 'fill-amber-500' : ''}`} />
                          {farm.is_featured ? 'Featured' : 'Feature'}
                        </button>
                        <button onClick={() => navigate(`/farms/${farm.slug}`)} className="text-stone-400 text-sm font-medium hover:text-green-700 transition-colors">
                          View
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === 'products' && (
            productsLoading ? <TableSkeleton rows={6} /> : products.length === 0 ? <EmptyState icon={Package} message="No products yet." /> : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Product</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Farm</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Category</th>
                      <th className="text-right px-5 py-3 font-semibold text-stone-600">Price</th>
                      <th className="text-center px-5 py-3 font-semibold text-stone-600">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-stone-800">{p.name}</td>
                        <td className="px-5 py-3 text-stone-500">{p.farms?.farm_name ?? '—'}</td>
                        <td className="px-5 py-3 text-stone-400">{p.categories?.name ?? '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-medium">${fmt(p.price)}</span>
                          <span className="text-stone-400">/{p.unit_name ?? 'each'}</span>
                        </td>
                        <td className="px-5 py-3 flex justify-center">
                          <Toggle on={p.is_active} onToggle={() => toggleProductActive(p)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            ordersLoading ? <TableSkeleton rows={6} /> : orders.length === 0 ? <EmptyState icon={ShoppingBag} message="No orders yet." /> : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Order #</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Customer</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Farm</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Status</th>
                      <th className="text-right px-5 py-3 font-semibold text-stone-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-medium text-stone-800">{o.order_number}</td>
                        <td className="px-5 py-3 text-stone-600">{o.profiles?.full_name ?? 'Unknown'}</td>
                        <td className="px-5 py-3 text-stone-400">{o.farms?.farm_name ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS[o.status] ?? 'bg-stone-100 text-stone-500'}`}>
                            {o.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-stone-800">${fmt(o.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── SUBSCRIBERS ── */}
          {activeTab === 'subscribers' && (
            subsLoading ? <TableSkeleton rows={5} /> : subscribers.length === 0 ? <EmptyState icon={Users} message="No subscribers yet." /> : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Customer</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Farm</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Plan</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Status</th>
                      <th className="text-left px-5 py-3 font-semibold text-stone-600">Next billing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {subscribers.map(s => (
                      <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-stone-800">{s.profiles?.full_name ?? '—'}</p>
                          <p className="text-xs text-stone-400">{s.profiles?.email ?? ''}</p>
                        </td>
                        <td className="px-5 py-3 text-stone-500">{s.farms?.farm_name ?? '—'}</td>
                        <td className="px-5 py-3 text-stone-500">
                          {s.subscription_plans?.name ?? '—'}
                          {s.subscription_plans?.price != null && (
                            <span className="text-stone-400"> · ${fmt(s.subscription_plans.price)}/{s.subscription_plans.billing_interval}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS[s.status] ?? ''}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-stone-400 text-xs">{s.next_billing_date ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── DRIVERS ── */}
          {activeTab === 'drivers' && (
            driversLoading ? <TableSkeleton rows={4} /> : drivers.length === 0 ? <EmptyState icon={Truck} message="No drivers yet." /> : (
              <div className="space-y-3">
                {drivers.map(driver => (
                  <div key={driver.id} className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-500 text-sm shrink-0">
                      {(driver.profiles?.full_name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-800">{driver.profiles?.full_name ?? '—'}</p>
                      <p className="text-stone-400 text-xs truncate">
                        {driver.profiles?.email ?? ''}{driver.vehicle_type ? ` · ${driver.vehicle_type}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {/* Background check */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BGC_STATUS[driver.background_check_status] ?? ''}`}>
                        BGC {driver.background_check_status}
                      </span>
                      {driver.background_check_status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateDriverField(driver, 'background_check_status', 'approved')}
                            title="Approve background check"
                            className="text-green-600 hover:text-green-700 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateDriverField(driver, 'background_check_status', 'rejected')}
                            title="Reject background check"
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {/* Insurance */}
                      <button
                        onClick={() => updateDriverField(driver, 'insurance_verified', !driver.insurance_verified)}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${driver.insurance_verified ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {driver.insurance_verified ? 'Insured' : 'Unverified'}
                      </button>
                      {/* Active */}
                      <button
                        onClick={() => updateDriverField(driver, 'is_active', !driver.is_active)}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${driver.is_active ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            catsLoading ? <TableSkeleton rows={6} /> : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="p-5 border-b border-stone-100">
                  <h2 className="font-bold text-stone-800">Marketplace Categories</h2>
                  <p className="text-stone-400 text-sm mt-0.5">Toggle which categories appear on the homepage and browse pages</p>
                </div>
                <div className="divide-y divide-stone-100">
                  {categories.map(cat => (
                    <div key={cat.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-stone-800">{cat.name}</p>
                        <p className="text-stone-400 text-xs">/category/{cat.slug}</p>
                      </div>
                      <Toggle on={cat.is_active} onToggle={() => toggleCategoryActive(cat)} />
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="px-5 py-8 text-center text-stone-400">No categories found.</p>
                  )}
                </div>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  )
}
