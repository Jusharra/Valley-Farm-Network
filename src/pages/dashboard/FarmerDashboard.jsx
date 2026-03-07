import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, Store, Package, ShoppingBag, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, Leaf, AlertCircle, Camera, Link, Share2, Mail, Users, Settings,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AccountSettings from '../../components/AccountSettings'
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
  { slug: 'listing', name: 'Garden Plot Listing', price: '$25',  period: 'once', features: ['Storefront page', 'Up to 10 products', 'Marketplace visibility', 'Shareable storefront link', 'Social share links', 'QR code for local promotion', 'Basic order analytics', 'Support'] },
  { slug: 'seed',    name: 'Seed Listing',        price: '$39',  period: '/mo',  features: ['Everything in Garden Plot', 'Up to 20 products', 'Delivery management', 'One-time product sales', 'Ticket support'] },
  { slug: 'growth',  name: 'Growth Subscription', price: '$79',  period: '/mo',  features: ['Everything in Seed', 'Recurring subscriptions for products', 'Up to 40 product listings', 'Delivery management', 'Customer list export', 'Ticket support'] },
  { slug: 'pro',     name: 'Network Pro',         price: '$129', period: '/mo',  features: ['Everything in Growth', 'Multiple staff users', '60 product listings', 'Driver network access', 'Premium support', 'Featured placement in marketplace search'] },
]

const BLANK_PRODUCT = {
  name: '', description: '', price: '', unit_name: 'each',
  product_type: 'one_time', category_id: '', stock_qty: '', is_active: true, image_url: '',
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

const VALID_TABS = new Set(['overview', 'profile', 'products', 'orders', 'subscribers', 'subscription', 'account'])

export default function FarmerDashboard() {
  const { profile, session, signOut } = useAuth()
  const { farm, products, loading, activeProductCount, productLimit, createFarm, updateFarm, addProduct, updateProduct, deleteProduct } = useFarmerFarm()
  const { orders, subscriptions, loading: ordersLoading, updateOrderStatus } = useOrders(farm?.id)
  const { categories } = useCategories()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab')
    return VALID_TABS.has(t) ? t : 'overview'
  })
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [portalLoading, setPortalLoading]   = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const [dbPlans, setDbPlans]             = useState([])
  const [platformSub, setPlatformSub]     = useState(null)
  const [planLoading, setPlanLoading]     = useState(false)
  const imgInputRef = useRef(null)
  const [subscribers, setSubscribers]   = useState([])

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
    if (!farm?.id || tab !== 'subscribers') return
    supabase
      .from('customer_product_subscriptions')
      .select('*, products(name, unit_name), profiles(full_name)')
      .eq('farm_id', farm.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSubscribers(data ?? []))
  }, [farm?.id, tab])

  useEffect(() => {
    if (!farm?.id || tab !== 'subscription') return
    setPlanLoading(true)
    Promise.all([
      supabase.from('farm_plans').select('id, name, slug, stripe_price_id').eq('is_active', true).order('sort_order'),
      supabase.from('farm_platform_subscriptions').select('*, farm_plans(name, slug)').eq('farm_id', farm.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([{ data: plans }, { data: sub }]) => {
      setDbPlans(plans ?? [])
      setPlatformSub(sub ?? null)
      setPlanLoading(false)
    })
  }, [farm?.id, tab])

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
    if (productLimit === 0) {
      notify('error', 'You need an active subscription to add products.')
      return
    }
    if (productLimit !== null && activeProductCount >= productLimit) {
      notify('error', `You've reached your ${productLimit}-product limit. Upgrade your plan to add more.`)
      return
    }
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
      image_url:    p.image_url ?? '',
    })
    setDrawerOpen(true)
  }

  async function handleProductImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !farm) return
    setImgUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${farm.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })
    if (upErr) { notify('error', upErr.message); setImgUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setProductForm(f => ({ ...f, image_url: publicUrl }))
    setImgUploading(false)
  }

  async function handleSaveProduct(e) {
    e.preventDefault()
    setSaving(true)
    const base = productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const payload = {
      ...productForm,
      price:       parseFloat(productForm.price),
      stock_qty:   productForm.stock_qty ? parseInt(productForm.stock_qty) : null,
      category_id: productForm.category_id || null,
      ...(!editingProduct && { slug: `${base}-${Date.now().toString(36)}` }),
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
      const msg = err.message?.includes('no_subscription')
        ? 'You need an active subscription to add products.'
        : err.message?.includes('product_limit_reached')
          ? `Product limit reached. Upgrade your plan to add more.`
          : err.message
      notify('error', msg)
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

  // ── Platform plan checkout ──
  async function handleSwitchPlan(planId) {
    setPlanLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-platform-checkout', {
        body: { planId },
      })
      if (error) {
        const body = await error.context?.json?.().catch(() => null)
        throw new Error(body?.error ?? body?.message ?? error.message)
      }
      window.location.href = data.url
    } catch (err) {
      notify('error', err.message ?? 'Could not start checkout. Try again.')
      setPlanLoading(false)
    }
  }

  // ── Stripe billing portal ──
  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-link', {
        body: { return_url: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
      window.location.href = data.url
    } catch (err) {
      notify('error', err.message ?? 'Could not open billing portal. Try again.')
      setPortalLoading(false)
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
    { id: 'subscribers',  label: 'Subscribers',  Icon: Users },
    { id: 'subscription', label: 'Billing',      Icon: CreditCard },
    { id: 'account',      label: 'Account',      Icon: Settings },
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
            farm={farm}
          />
        )}
        {tab === 'products' && (
          <ProductsSection
            products={products}
            productLimit={productLimit}
            activeProductCount={activeProductCount}
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
            subscriptions={subscriptions}
            loading={ordersLoading}
            onUpdateStatus={updateOrderStatus}
          />
        )}
        {tab === 'subscribers' && (
          <SubscribersSection subscribers={subscribers} />
        )}
        {tab === 'subscription' && (
          <SubscriptionSection
            farm={farm}
            onConnect={handleConnectStripe}
            connectLoading={connectLoading}
            onManage={handleManageSubscription}
            portalLoading={portalLoading}
            dbPlans={dbPlans}
            platformSub={platformSub}
            planLoading={planLoading}
            onSwitchPlan={handleSwitchPlan}
          />
        )}
        {tab === 'account' && <AccountSettings />}
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

              {/* Product image */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Product photo</label>
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                {productForm.image_url ? (
                  <div className="relative">
                    <img
                      src={productForm.image_url}
                      alt="Product preview"
                      className="w-full h-40 object-cover rounded-xl border border-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      disabled={imgUploading}
                      className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {imgUploading ? 'Uploading…' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={imgUploading}
                    className="w-full h-32 border-2 border-dashed border-stone-300 hover:border-green-400 rounded-xl flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-green-600 transition-colors disabled:opacity-60"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-sm font-medium">{imgUploading ? 'Uploading…' : 'Upload photo'}</span>
                  </button>
                )}
                <p className="text-xs text-stone-400 mt-1.5">Best size: 800 × 600 px (landscape). JPG or PNG.</p>
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
                {(productForm.product_type === 'subscription' || productForm.product_type === 'both') && !farm?.charges_enabled && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Subscriptions require your Stripe account to be connected and active.{' '}
                      <button type="button" className="underline font-medium" onClick={() => setTab('subscription')}>
                        Set up payments →
                      </button>
                    </span>
                  </div>
                )}
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

function FarmProfileSection({ form, setForm, onSave, saving, farm }) {
  const bannerInputRef = useRef(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [copied, setCopied] = useState(false)

  const farmUrl = `${window.location.origin}/farms/${farm.slug}`

  async function handleCopy() {
    await navigator.clipboard.writeText(farmUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${farm.id}/banner-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('farm-images')
      .upload(path, file, { upsert: true })
    if (upErr) { setBannerUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('farm-images').getPublicUrl(path)
    setForm(f => ({ ...f, banner_url: publicUrl }))
    setBannerUploading(false)
  }

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
              Banner image <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            {form.banner_url ? (
              <div className="relative">
                <img src={form.banner_url} alt="Banner preview" className="w-full h-36 object-cover rounded-xl border border-stone-200" />
                <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">1600 × 600 px recommended</span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, banner_url: '' }))}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow"
                >
                  <X size={14} className="text-stone-600" />
                </button>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white/80 hover:bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 shadow flex items-center gap-1.5"
                >
                  <Camera size={12} /> Change photo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={bannerUploading}
                  onClick={() => bannerInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50"
                >
                  {bannerUploading ? (
                    <span className="text-sm">Uploading...</span>
                  ) : (
                    <>
                      <Camera size={20} />
                      <span className="text-sm font-medium">Upload banner photo</span>
                      <span className="text-xs">Best size: 1600 × 600 px (wide landscape). JPG or PNG.</span>
                    </>
                  )}
                </button>
                <div className="flex items-center gap-2 text-stone-400 text-xs">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span>or paste a URL</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>
                <input
                  className={styles.input}
                  placeholder="https://..."
                  value={form.banner_url}
                  onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))}
                />
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

      {/* ── Share your farm ── */}
      <div className="bg-white rounded-2xl border border-stone-200/50 p-6 max-w-2xl mt-5">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-3 mb-5">
          Share your farm
        </h2>

        <div className="mb-5">
          <p className="text-sm font-semibold text-stone-700 mb-2">Your farm page URL</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 min-w-0">
              <Link size={14} className="text-stone-400 flex-shrink-0" />
              <span className="text-sm text-stone-600 truncate">{farmUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                copied ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {copied ? <><Check size={14} /> Copied!</> : 'Copy link'}
            </button>
          </div>
        </div>

        <p className="text-sm font-semibold text-stone-700 mb-3">Share on</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(farmUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1877F2] text-white hover:bg-[#166FE5] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>

          <a
            href={`mailto:?subject=Check out ${encodeURIComponent(farm.farm_name)} on Kern Harvest!&body=I found this farm and thought you'd love their products: ${farmUrl}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-700 text-white hover:bg-stone-800 transition-colors"
          >
            <Mail size={14} />
            Email
          </a>

          {'share' in navigator ? (
            <button
              type="button"
              onClick={() => navigator.share({ title: farm.farm_name, text: `Check out ${farm.farm_name} on Kern Harvest!`, url: farmUrl })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <Share2 size={14} />
              More apps
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <Share2 size={14} />
              {copied ? 'Link copied!' : 'Instagram / TikTok'}
            </button>
          )}
        </div>

        {'share' in navigator ? null : (
          <p className="text-xs text-stone-400 mt-3">
            Paste the copied link in your Instagram bio or TikTok profile to drive traffic to your farm page.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Products Section ─────────────────────────────────────────────────────────

function ProductsSection({ products, productLimit, activeProductCount, onAdd, onEdit, confirmDelete, onDeleteClick, onConfirmDelete, onCancelDelete, saving }) {
  const atLimit    = productLimit !== null && productLimit !== undefined && activeProductCount >= productLimit
  const nearLimit  = productLimit && !atLimit && activeProductCount / productLimit >= 0.8
  const limitColor = atLimit ? 'text-red-600' : nearLimit ? 'text-amber-600' : 'text-stone-500'
  const limitLabel = productLimit === 0
    ? 'No active subscription'
    : productLimit === null
      ? `${activeProductCount} active · ${products.length} total`
      : `${activeProductCount} / ${productLimit} products used`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Products</h1>
          <p className={`mt-1 text-sm font-medium ${limitColor}`}>{limitLabel}</p>
        </div>
        <button
          onClick={onAdd}
          disabled={atLimit || productLimit === 0}
          className={`${styles.buttonPrimary} flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
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

const SUB_STATUS_COLORS = {
  active:     'bg-green-100 text-green-700',
  trialing:   'bg-blue-100 text-blue-700',
  past_due:   'bg-amber-100 text-amber-700',
  cancelled:  'bg-red-100 text-red-700',
  canceled:   'bg-red-100 text-red-700',
  incomplete: 'bg-stone-100 text-stone-500',
}

function OrdersSection({ orders, subscriptions = [], loading, onUpdateStatus }) {
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const STATUSES = ['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Orders</h1>
        <p className="text-stone-500 mt-1">{orders.length} one-time · {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}</p>
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

      {/* ── Subscriptions ── */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-stone-800 mb-2">Subscriptions</h2>
        <p className="text-stone-500 text-sm mb-5">
          {subscriptions.filter(s => s.status === 'active').length} active subscription{subscriptions.filter(s => s.status === 'active').length !== 1 ? 's' : ''}
        </p>
        {subscriptions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200/50">
            <Users className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p className="text-stone-400">No subscription orders yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-stone-200/50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-stone-800">{s.profiles?.full_name ?? 'Unknown'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS_COLORS[s.status] ?? 'bg-stone-100 text-stone-500'}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500">{s.subscription_plans?.name ?? '—'}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {s.next_billing_date ? `Next billing: ${new Date(s.next_billing_date).toLocaleDateString()}` : `Started: ${formatDate(s.created_at)}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-stone-800">
                      ${Number(s.subscription_plans?.price ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-stone-400">/{s.subscription_plans?.billing_interval ?? 'mo'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Subscribers Section ──────────────────────────────────────────────────────

function SubscribersSection({ subscribers }) {
  const [filter, setFilter] = useState('all')
  const STATUSES = ['all', 'active', 'past_due', 'canceled']
  const visible  = filter === 'all' ? subscribers : subscribers.filter(s => s.status === filter)
  const active   = subscribers.filter(s => s.status === 'active').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Product Subscribers</h1>
        <p className="text-stone-500 mt-1">
          {active} active subscriber{active !== 1 ? 's' : ''} across your products
        </p>
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
            {s === 'all' ? 'All' : s === 'past_due' ? 'Past due' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-60">
              ({s === 'all' ? subscribers.length : subscribers.filter(x => x.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/50">
          <Users className="w-12 h-12 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-400">
            {filter === 'all' ? 'No subscribers yet.' : `No ${filter} subscribers.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(sub => (
            <div key={sub.id} className="bg-white rounded-2xl border border-stone-200/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-stone-800">
                      {sub.profiles?.full_name ?? 'Guest'}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      SUB_STATUS_COLORS[sub.status] ?? 'bg-stone-100 text-stone-500'
                    }`}>
                      {sub.status === 'past_due' ? 'Past due' : sub.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500">
                    {sub.products?.name ?? 'Unknown product'}
                    {sub.products?.unit_name ? ` · per ${sub.products.unit_name}` : ''}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Subscribed {formatDate(sub.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {sub.current_period_end && (
                    <p className="text-sm text-stone-500">
                      Next billing
                    </p>
                  )}
                  {sub.current_period_end && (
                    <p className="text-sm font-semibold text-stone-800">
                      {formatDate(sub.current_period_end)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Subscription Section ─────────────────────────────────────────────────────

function SubscriptionSection({ farm, onConnect, connectLoading, onManage, portalLoading, dbPlans, platformSub, planLoading, onSwitchPlan }) {
  const stripeConnected   = !!farm?.stripe_account_id
  const currentPlanSlug   = platformSub?.farm_plans?.slug ?? null
  const hasStripeCustomer = !!platformSub?.stripe_customer_id

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
              <button onClick={onConnect} disabled={connectLoading} className={styles.buttonPrimary}>
                {connectLoading ? 'Redirecting to Stripe...' : 'Connect with Stripe →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current plan + portal button */}
      <div className="bg-white border border-stone-200/50 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500 font-medium mb-1">Current plan</p>
          {platformSub ? (
            <>
              <p className="text-xl font-bold text-stone-800">{platformSub.farm_plans?.name ?? 'Unknown plan'}</p>
              <p className="text-sm text-stone-400 mt-1">Billing managed via Stripe</p>
            </>
          ) : (
            <p className="text-xl font-bold text-stone-800 text-stone-400">No active plan</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {platformSub && (
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${SUB_STATUS_COLORS[platformSub.status] ?? 'bg-stone-100 text-stone-600'}`}>
              {platformSub.status.charAt(0).toUpperCase() + platformSub.status.slice(1)}
            </span>
          )}
          {hasStripeCustomer && (
            <button
              onClick={onManage}
              disabled={portalLoading}
              className={`${styles.buttonSecondary} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {portalLoading ? 'Opening...' : 'Manage subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <h2 className="text-lg font-bold text-stone-800 mb-4">Available plans</h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {PLANS.map(plan => {
          const dbPlan   = dbPlans.find(p => p.slug === plan.slug)
          const isCurrent = dbPlan && dbPlan.slug === currentPlanSlug
          const busy      = planLoading || portalLoading
          return (
            <div
              key={plan.slug}
              className={`rounded-2xl border p-5 flex flex-col ${
                isCurrent
                  ? 'bg-green-50 border-green-300 ring-2 ring-green-500/20'
                  : 'bg-white border-stone-200/50'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-bold text-stone-800">{plan.name}</h3>
                {isCurrent && (
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                    Current
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-green-700 mb-4">
                {plan.price}
                <span className="text-sm font-normal text-stone-400">{plan.period}</span>
              </p>
              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => dbPlan && onSwitchPlan(dbPlan.id)}
                disabled={busy || isCurrent || !dbPlan}
                className={`w-full text-sm font-medium py-2 rounded-xl transition-all disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'bg-green-100 text-green-700 opacity-60'
                    : 'bg-stone-100 text-stone-700 hover:bg-green-600 hover:text-white disabled:opacity-50'
                }`}
              >
                {isCurrent ? 'Current plan' : busy ? 'Loading...' : 'Switch to this plan'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
