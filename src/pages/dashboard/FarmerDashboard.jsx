import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Store, Package, ShoppingBag, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, Leaf, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFarmerFarm } from '../../hooks/useFarmerFarm'
import { useOrders } from '../../hooks/useOrders'
import { useCategories } from '../../hooks/useCategories'
import { styles } from '../../lib/styles'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending:          'bg-amber-100 text-amber-700',
  confirmed:        'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
}

const NEXT_STATUS = {
  pending:          'confirmed',
  confirmed:        'out_for_delivery',
  out_for_delivery: 'delivered',
}

const UNIT_PRESETS = ['each', 'dozen', 'lb', 'oz', 'bunch', 'bag', 'box', 'jar', 'pint', 'quart', 'gallon']

const PLANS = [
  { name: 'One-Time Listing', price: '$25',  period: 'once', features: ['Up to 5 products', 'Basic farm profile', 'No monthly fee'] },
  { name: 'Seed',             price: '$39',  period: '/mo',  features: ['Up to 20 products', 'Delivery tools', 'Customer messaging'] },
  { name: 'Growth',           price: '$79',  period: '/mo',  features: ['Unlimited products', 'Subscription sales', 'Analytics', 'Priority support'] },
  { name: 'Network Pro',      price: '$129', period: '/mo',  features: ['Everything in Growth', 'Multi-farm management', 'API access', 'Dedicated support'] },
]

const BLANK_PRODUCT = {
  name: '', description: '', price: '', unit_name: 'each',
  product_type: 'one_time', category_id: '', stock_qty: '', is_active: true,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Toast({ msg }) {
  if (!msg) return null
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 ${
      msg.type === 'success' ? 'bg-green-700 text-white' : 'bg-red-600 text-white'
    }`}>
      {msg.type === 'success'
        ? <Check className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
      <span className="text-sm font-medium">{msg.text}</span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function FarmerDashboard() {
  const { profile, session, signOut } = useAuth()
  const { farm, products, loading, createFarm, updateFarm, addProduct, updateProduct, deleteProduct } = useFarmerFarm()
  const { orders, loading: ordersLoading, updateOrderStatus } = useOrders(farm?.id)
  const { categories } = useCategories()

  const [tab, setTab]               = useState('overview')
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [connectLoading, setConnectLoading] = useState(false)

  // Farm setup state (first-time farmers)
  const [setupForm, setSetupForm]       = useState({
    farm_name: '', tagline: '', story: '',
    offers_delivery: false, offers_pickup: false, delivery_radius_miles: 10,
  })
  const [setupAddress, setSetupAddress] = useState({ city: '', state: '' })

  // Farm profile edit form
  const [farmForm, setFarmForm] = useState(null)

  // Product drawer
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm]       = useState(BLANK_PRODUCT)
  const [confirmDelete, setConfirmDelete]   = useState(null)

  useEffect(() => {
    if (farm && !farmForm) {
      setFarmForm({
        farm_name:             farm.farm_name ?? '',
        tagline:               farm.tagline ?? '',
        story:                 farm.story ?? '',
        banner_url:            farm.banner_url ?? '',
        offers_delivery:       farm.offers_delivery ?? false,
        offers_pickup:         farm.offers_pickup ?? false,
        delivery_radius_miles: farm.delivery_radius_miles ?? 10,
      })
    }
  }, [farm, farmForm])

  function notify(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), type === 'success' ? 3000 : 5000)
  }

  // ── Create farm ──
  async function handleCreateFarm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createFarm(setupForm, setupAddress)
      setTab('products')
      notify('success', 'Farm created! Now add your first product.')
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Save farm profile ──
  async function handleSaveFarm(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateFarm(farmForm)
      notify('success', 'Farm profile saved.')
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Product drawer ──
  function openAddDrawer() {
    setEditingProduct(null)
    setProductForm(BLANK_PRODUCT)
    setDrawerOpen(true)
  }

  function openEditDrawer(p) {
    setEditingProduct(p)
    setProductForm({
      name:         p.name,
      description:  p.description ?? '',
      price:        p.price,
      unit_name:    p.unit_name,
      product_type: p.product_type,
      category_id:  p.category_id ?? '',
      stock_qty:    p.stock_qty ?? '',
      is_active:    p.is_active,
    })
    setDrawerOpen(true)
  }

  async function handleSaveProduct(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...productForm,
      price:       parseFloat(productForm.price),
      stock_qty:   productForm.stock_qty ? parseInt(productForm.stock_qty) : null,
      category_id: productForm.category_id || null,
    }
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
        notify('success', 'Product updated.')
      } else {
        await addProduct(payload)
        notify('success', `${payload.name} added.`)
      }
      setDrawerOpen(false)
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct(id) {
    setSaving(true)
    try {
      await deleteProduct(id)
      setConfirmDelete(null)
      notify('success', 'Product removed.')
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Stripe Connect onboarding ──
  async function handleConnectStripe() {
    setConnectLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-link', {
        body: {
          return_url:  `${window.location.origin}/dashboard?stripe=success`,
          refresh_url: `${window.location.origin}/dashboard?stripe=refresh`,
        },
      })
      if (error) throw error
      window.location.href = data.url
    } catch (err) {
      notify('error', err.message ?? 'Could not start Stripe onboarding. Try again.')
      setConnectLoading(false)
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen flex bg-stone-50">
        <div className="w-64 bg-green-900 animate-pulse" />
        <main className="flex-1 p-8 space-y-6">
          <div className="h-8 bg-stone-200 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <div key={i} className="h-28 bg-stone-200 rounded-2xl animate-pulse" />)}
          </div>
        </main>
      </div>
    )
  }

  // ── First-time farm setup ──
  if (farm === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center p-6">
        <Toast msg={toast} />
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              Set up your farm
            </h1>
            <p className="text-stone-500">Tell customers about your farm. You can update everything later.</p>
          </div>

          <form onSubmit={handleCreateFarm} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Farm name *</label>
              <input
                required
                className={styles.input}
                placeholder="e.g. Sunny Acres Farm"
                value={setupForm.farm_name}
                onChange={e => setSetupForm(f => ({ ...f, farm_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Tagline</label>
              <input
                className={styles.input}
                placeholder="e.g. Fresh eggs from Bakersfield"
                value={setupForm.tagline}
                onChange={e => setSetupForm(f => ({ ...f, tagline: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">City</label>
                <input
                  className={styles.input}
                  placeholder="Bakersfield"
                  value={setupAddress.city}
                  onChange={e => setSetupAddress(a => ({ ...a, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">State</label>
                <input
                  className={styles.input}
                  placeholder="CA"
                  maxLength={2}
                  value={setupAddress.state}
                  onChange={e => setSetupAddress(a => ({ ...a, state: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Fulfillment</label>
              <div className="flex gap-6">
                {[
                  { key: 'offers_delivery', label: 'Delivery' },
                  { key: 'offers_pickup',   label: 'Pickup' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setupForm[key]}
                      onChange={e => setSetupForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-stone-700 text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {setupForm.offers_delivery && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Delivery radius</label>
                <select
                  className={styles.input}
                  value={setupForm.delivery_radius_miles}
                  onChange={e => setSetupForm(f => ({ ...f, delivery_radius_miles: Number(e.target.value) }))}
                >
                  {[5, 10, 25, 50].map(r => <option key={r} value={r}>{r} miles</option>)}
                </select>
              </div>
            )}

            <button type="submit" disabled={saving} className={`w-full ${styles.buttonPrimary}`}>
              {saving ? 'Creating...' : 'Create my farm →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Full dashboard ──
  const pendingCount   = orders.filter(o => o.status === 'pending').length
  const activeProducts = products.filter(p => p.is_active)

  const NAV = [
    { id: 'overview',     label: 'Overview',    Icon: LayoutDashboard },
    { id: 'farm',         label: 'Farm Profile', Icon: Store },
    { id: 'products',     label: 'Products',     Icon: Package,     badge: activeProducts.length },
    { id: 'orders',       label: 'Orders',       Icon: ShoppingBag, badge: pendingCount || null },
    { id: 'subscription', label: 'Billing',      Icon: CreditCard },
  ]

  return (
    <div className="min-h-screen flex bg-stone-50">
      <Toast msg={toast} />

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-green-900 flex flex-col sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        <div className="p-5 border-b border-green-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Leaf className="w-5 h-5 text-green-300" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{farm.farm_name}</p>
              <p className="text-green-400 text-xs">Farmer Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ id, label, Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                tab === id
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-green-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm">{label}</span>
              {badge > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  id === 'orders' ? 'bg-amber-400 text-amber-900' : 'bg-white/20 text-white'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-green-800/60">
          <div className="px-3 py-1 mb-1">
            <p className="text-green-300 text-xs font-medium truncate">{profile?.full_name}</p>
            <p className="text-green-500 text-xs truncate">{profile?.email ?? session?.user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-green-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 p-8 min-w-0 overflow-auto">
        {tab === 'overview' && (
          <OverviewSection
            profile={profile}
            products={products}
            orders={orders}
            ordersLoading={ordersLoading}
            onGoToProducts={() => { setTab('products'); openAddDrawer() }}
          />
        )}
        {tab === 'farm' && farmForm && (
          <FarmProfileSection
            form={farmForm}
            setForm={setFarmForm}
            onSave={handleSaveFarm}
            saving={saving}
          />
        )}
        {tab === 'products' && (
          <ProductsSection
            products={products}
            onAdd={openAddDrawer}
            onEdit={openEditDrawer}
            confirmDelete={confirmDelete}
            onDeleteClick={setConfirmDelete}
            onConfirmDelete={handleDeleteProduct}
            onCancelDelete={() => setConfirmDelete(null)}
            saving={saving}
          />
        )}
        {tab === 'orders' && (
          <OrdersSection
            orders={orders}
            loading={ordersLoading}
            onUpdateStatus={updateOrderStatus}
          />
        )}
        {tab === 'subscription' && (
          <SubscriptionSection
            farm={farm}
            onConnect={handleConnectStripe}
            connectLoading={connectLoading}
          />
        )}
      </main>

      {/* ── Product drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-800">
                {editingProduct ? 'Edit product' : 'Add product'}
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Product name *</label>
                <input
                  required
                  className={styles.input}
                  placeholder="e.g. Free-range eggs"
                  value={productForm.name}
                  onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Description</label>
                <textarea
                  className={`${styles.input} resize-none`}
                  rows={3}
                  placeholder="Tell customers about this product..."
                  value={productForm.description}
                  onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={`${styles.input} pl-8`}
                      placeholder="0.00"
                      value={productForm.price}
                      onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Unit *</label>
                  <input
                    required
                    list="unit-presets"
                    className={styles.input}
                    placeholder="dozen"
                    value={productForm.unit_name}
                    onChange={e => setProductForm(f => ({ ...f, unit_name: e.target.value }))}
                  />
                  <datalist id="unit-presets">
                    {UNIT_PRESETS.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Category</label>
                <select
                  className={styles.input}
                  value={productForm.category_id}
                  onChange={e => setProductForm(f => ({ ...f, category_id: e.target.value }))}
                >
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Ordering type</label>
                <div className="space-y-2">
                  {[
                    { value: 'one_time',     label: 'One-time purchase only' },
                    { value: 'subscription', label: 'Subscription only' },
                    { value: 'both',         label: 'Both — customer chooses' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="product_type"
                        value={opt.value}
                        checked={productForm.product_type === opt.value}
                        onChange={() => setProductForm(f => ({ ...f, product_type: opt.value }))}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-stone-700 text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Stock quantity <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  placeholder="Leave blank for unlimited"
                  value={productForm.stock_qty}
                  onChange={e => setProductForm(f => ({ ...f, stock_qty: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-stone-700">Visible to customers</p>
                  <p className="text-xs text-stone-400 mt-0.5">Toggle off to hide this product</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${
                    productForm.is_active ? 'bg-green-500' : 'bg-stone-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    productForm.is_active ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2 border-t border-stone-100">
                <button type="button" onClick={() => setDrawerOpen(false)} className={`flex-1 ${styles.buttonSecondary}`}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={`flex-1 ${styles.buttonPrimary}`}>
                  {saving ? 'Saving...' : editingProduct ? 'Save changes' : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection({ profile, products, orders, ordersLoading, onGoToProducts }) {
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName  = profile?.full_name?.split(' ')[0] ?? 'Farmer'
  const pending    = orders.filter(o => o.status === 'pending')
  const active     = products.filter(p => p.is_active)
  const recent     = orders.slice(0, 5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">{greeting}, {firstName}</h1>
        <p className="text-stone-500 mt-1">Here's how your farm is doing.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Active products', value: active.length,  sub: `${products.length} total`,                                 alert: false },
          { label: 'Pending orders',  value: pending.length, sub: pending.length > 0 ? 'Need your attention' : 'All caught up', alert: pending.length > 0 },
          { label: 'Total orders',    value: orders.length,  sub: 'All time',                                                   alert: false },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl p-6 border ${
            stat.alert ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200/50'
          }`}>
            <p className="text-sm text-stone-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.alert ? 'text-amber-700' : 'text-stone-800'}`}>{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.alert ? 'text-amber-600' : 'text-stone-400'}`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/50 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-stone-800">Recent orders</h2>
          {ordersLoading && <span className="text-xs text-stone-400 animate-pulse">Loading...</span>}
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p className="text-stone-400 text-sm mb-4">No orders yet.</p>
            {products.length === 0 && (
              <button onClick={onGoToProducts} className={styles.buttonPrimary}>
                Add your first product
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recent.map(order => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{order.profiles?.full_name ?? 'Guest'}</p>
                  <p className="text-xs text-stone-400">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-stone-800 mb-1">${Number(order.total_amount).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-500'
                  }`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Farm Profile Section ─────────────────────────────────────────────────────

function FarmProfileSection({ form, setForm, onSave, saving }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Farm Profile</h1>
        <p className="text-stone-500 mt-1">This information is shown to customers on your farm page.</p>
      </div>

      <form onSubmit={onSave} className="space-y-5 max-w-2xl">
        <div className="bg-white rounded-2xl border border-stone-200/50 p-6 space-y-5">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-3">
            Basic Info
          </h2>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Farm name *</label>
            <input
              required
              className={styles.input}
              value={form.farm_name}
              onChange={e => setForm(f => ({ ...f, farm_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Tagline</label>
            <input
              className={styles.input}
              placeholder="A short phrase customers will remember"
              value={form.tagline}
              onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Your story</label>
            <textarea
              className={`${styles.input} resize-none`}
              rows={5}
              placeholder="Tell customers how your farm started, your philosophy, what makes you different..."
              value={form.story}
              onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Banner image URL <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              className={styles.input}
              placeholder="https://..."
              value={form.banner_url}
              onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))}
            />
            {form.banner_url && (
              <div className="mt-3 h-32 rounded-xl overflow-hidden border border-stone-200">
                <img src={form.banner_url} alt="Banner preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/50 p-6 space-y-5">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-3">
            Fulfillment
          </h2>

          <div className="flex gap-8">
            {[
              { key: 'offers_delivery', label: 'Delivery', sub: 'You deliver to customers' },
              { key: 'offers_pickup',   label: 'Pickup',   sub: 'Customers come to you' },
            ].map(({ key, label, sub }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="w-4 h-4 text-green-600 rounded mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-stone-800">{label}</p>
                  <p className="text-xs text-stone-400">{sub}</p>
                </div>
              </label>
            ))}
          </div>

          {form.offers_delivery && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Delivery radius</label>
              <select
                className={`${styles.input} max-w-xs`}
                value={form.delivery_radius_miles}
                onChange={e => setForm(f => ({ ...f, delivery_radius_miles: Number(e.target.value) }))}
              >
                {[5, 10, 25, 50].map(r => <option key={r} value={r}>{r} miles</option>)}
              </select>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className={styles.buttonPrimary}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

// ─── Products Section ─────────────────────────────────────────────────────────

function ProductsSection({ products, onAdd, onEdit, confirmDelete, onDeleteClick, onConfirmDelete, onCancelDelete, saving }) {
  const activeCount = products.filter(p => p.is_active).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Products</h1>
          <p className="text-stone-500 mt-1">{activeCount} active · {products.length} total</p>
        </div>
        <button onClick={onAdd} className={`${styles.buttonPrimary} flex items-center gap-2`}>
          <Plus className="w-4 h-4" />
          Add product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200/50">
          <Package className="w-14 h-14 mx-auto mb-4 text-stone-200" />
          <h3 className="text-lg font-bold text-stone-700 mb-2">No products yet</h3>
          <p className="text-stone-400 mb-6 max-w-xs mx-auto text-sm">
            Add your first product so customers can start ordering.
          </p>
          <button onClick={onAdd} className={`${styles.buttonPrimary} inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> Add your first product
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => {
            const isDeleting = confirmDelete === product.id
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  isDeleting ? 'border-red-200 bg-red-50' : 'border-stone-200/50 hover:shadow-md'
                }`}
              >
                {isDeleting ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-red-700 font-medium text-sm">
                      Remove "{product.name}" from your products?
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={onCancelDelete} className={styles.buttonSecondary}>Cancel</button>
                      <button
                        onClick={() => onConfirmDelete(product.id)}
                        disabled={saving}
                        className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition-all text-sm"
                      >
                        {saving ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-stone-800">{product.name}</h3>
                        {!product.is_active && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                        {product.product_type !== 'one_time' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {product.product_type === 'subscription' ? 'Sub only' : 'Sub available'}
                          </span>
                        )}
                        {product.categories && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${product.categories.color_hex}20`,
                              color: product.categories.color_hex,
                            }}
                          >
                            {product.categories.name}
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-stone-400 mb-1.5 truncate max-w-lg">{product.description}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-700">${Number(product.price).toFixed(2)}</span>
                        <span className="text-stone-400 text-sm">/ {product.unit_name}</span>
                        {product.stock_qty != null && (
                          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                            {product.stock_qty} in stock
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => onEdit(product)}
                        className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteClick(product.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Orders Section ───────────────────────────────────────────────────────────

function OrdersSection({ orders, loading, onUpdateStatus }) {
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const STATUSES = ['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Orders</h1>
        <p className="text-stone-500 mt-1">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === s
                ? 'bg-green-700 text-white'
                : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-300'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-60">({orders.filter(o => o.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-24 bg-stone-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/50">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-400">
            No {filter !== 'all' ? STATUS_LABELS[filter]?.toLowerCase() : ''} orders yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(order => {
            const next        = NEXT_STATUS[order.status]
            const itemSummary = order.order_items
              ?.map(i => `${i.quantity}× ${i.products?.name ?? 'item'}`)
              .join(', ')

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-stone-200/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-stone-800">{order.profiles?.full_name ?? 'Guest'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-500'
                      }`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 truncate">{itemSummary}</p>
                    <p className="text-xs text-stone-400 mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-stone-800 mb-2">
                      ${Number(order.total_amount).toFixed(2)}
                    </p>
                    {next && (
                      <button
                        onClick={() => onUpdateStatus(order.id, next)}
                        className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium hover:bg-green-100 transition-all whitespace-nowrap"
                      >
                        Mark as {STATUS_LABELS[next]}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Subscription Section ─────────────────────────────────────────────────────

function SubscriptionSection({ farm, onConnect, connectLoading }) {
  const stripeConnected = !!farm?.stripe_account_id

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Billing & Plan</h1>
        <p className="text-stone-500 mt-1">Manage your Kern Harvest subscription and payment account.</p>
      </div>

      {/* Stripe Connect status */}
      {stripeConnected ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Stripe account connected</p>
            <p className="text-sm text-green-600 mt-0.5">You can receive payments from customers.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 mb-1">Connect your Stripe account to accept payments</p>
              <p className="text-sm text-amber-700 mb-4">
                Customers can browse your products, but you won't be able to receive payments until you connect a Stripe account. It only takes a few minutes.
              </p>
              <button
                onClick={onConnect}
                disabled={connectLoading}
                className={styles.buttonPrimary}
              >
                {connectLoading ? 'Redirecting to Stripe...' : 'Connect with Stripe →'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200/50 rounded-2xl p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500 font-medium mb-1">Current plan</p>
          <p className="text-xl font-bold text-stone-800">Seed Plan — $39/mo</p>
          <p className="text-sm text-stone-400 mt-1">Billing managed via Stripe</p>
        </div>
        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">Active</span>
      </div>

      <h2 className="text-lg font-bold text-stone-800 mb-4">Available plans</h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {PLANS.map(plan => (
          <div key={plan.name} className="bg-white rounded-2xl border border-stone-200/50 p-5">
            <h3 className="font-bold text-stone-800 mb-1">{plan.name}</h3>
            <p className="text-2xl font-bold text-green-700 mb-4">
              {plan.price}
              <span className="text-sm font-normal text-stone-400">{plan.period}</span>
            </p>
            <ul className="space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-sm text-stone-400 text-center">
        To change your plan or manage billing, contact{' '}
        <a href="mailto:billing@kernharvest.com" className="text-green-700 underline">
          billing@kernharvest.com
        </a>
        . Stripe billing portal coming soon.
      </p>
    </div>
  )
}
