import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link as RouterLink } from 'react-router-dom'
import {
  LayoutDashboard, Store, Package, ShoppingBag, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, Leaf, AlertCircle, Camera, Link, Share2, Mail, Users, Settings,
  Truck, MapPin, Calendar, ChevronDown, ChevronUp, Route, HelpCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AccountSettings from '../../components/AccountSettings'
import { useFarmerFarm } from '../../hooks/useFarmerFarm'
import { useOrders } from '../../hooks/useOrders'
import { useCategories } from '../../hooks/useCategories'
import { styles } from '../../lib/styles'
import { supabase } from '../../lib/supabase'
import Toast, { makeNotify } from '../../components/Toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending_payment:  'bg-stone-100 text-stone-500',
  pending:          'bg-stone-100 text-stone-500',
  paid:             'bg-blue-100 text-blue-700',
  processing:       'bg-amber-100 text-amber-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  completed:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  pending_payment:  'New',
  pending:          'New',
  paid:             'Paid',
  processing:       'Preparing',
  out_for_delivery: 'Out for Delivery',
  completed:        'Delivered',
  cancelled:        'Cancelled',
}

const NEXT_STATUS = {
  paid:             'processing',
  processing:       'out_for_delivery',
  out_for_delivery: 'completed',
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

// ─── Main Component ────────────────────────────────────────────────────────────

const VALID_TABS = new Set(['overview', 'profile', 'products', 'orders', 'delivery', 'subscribers', 'subscription', 'account'])
const DELIVERY_PLAN_SLUGS = ['seed', 'growth', 'pro']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

  const notify = makeNotify(setToast)

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
    ...(DELIVERY_PLAN_SLUGS.includes(farm.platform_plan_slug)
      ? [{ id: 'delivery', label: 'Delivery', Icon: Truck }]
      : []),
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
          <RouterLink
            to="/help"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-green-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Help & Support</span>
          </RouterLink>
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
        {tab === 'delivery' && (
          <DeliverySection farm={farm} updateFarm={updateFarm} notify={notify} orders={orders} />
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
            href={`mailto:?subject=Check out ${encodeURIComponent(farm.farm_name)} on Valley Farm Network!&body=I found this farm and thought you'd love their products: ${farmUrl}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-700 text-white hover:bg-stone-800 transition-colors"
          >
            <Mail size={14} />
            Email
          </a>

          {'share' in navigator ? (
            <button
              type="button"
              onClick={() => navigator.share({ title: farm.farm_name, text: `Check out ${farm.farm_name} on Valley Farm Network!`, url: farmUrl })}
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

// ─── Delivery Section ─────────────────────────────────────────────────────────

function DeliverySection({ farm, updateFarm, notify, orders }) {
  const [subTab, setSubTab] = useState('zones')

  // ── Zones state ──
  const [zones, setZones]       = useState([])
  const [zonesLoading, setZonesLoading] = useState(true)
  const [zoneForm, setZoneForm] = useState({ postal_code: '', delivery_fee: '', minimum_order_amount: '' })
  const [addingZone, setAddingZone] = useState(false)

  // ── Schedule state ──
  const [schedules, setSchedules]         = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [schedForm, setSchedForm]         = useState({ day_of_week: '1', time_window: '' })
  const [addingSched, setAddingSched]     = useState(false)

  // ── Routes state ──
  const [routeOrders, setRouteOrders]     = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [expanded, setExpanded]           = useState({}) // { 'date|zip': bool }
  const [jobForms, setJobForms]           = useState({}) // { 'date': fee }
  const [postingJob, setPostingJob]       = useState(null)

  useEffect(() => {
    if (!farm?.id) return
    supabase.from('delivery_zones').select('*').eq('farm_id', farm.id).order('postal_code')
      .then(({ data }) => setZones(data ?? []))
      .finally(() => setZonesLoading(false))
    supabase.from('delivery_schedules').select('*').eq('farm_id', farm.id).order('day_of_week')
      .then(({ data }) => setSchedules(data ?? []))
      .finally(() => setSchedulesLoading(false))
    supabase.from('orders')
      .select('id, status, total_amount, created_at, profiles(full_name), order_items(quantity, products(name)), deliveries(id, scheduled_date, scheduled_window, postal_code, delivery_status, delivery_jobs(id, status, driver_fee, driver_id, drivers(profiles(full_name))))')
      .eq('farm_id', farm.id)
      .in('status', ['paid', 'processing', 'out_for_delivery', 'completed'])
      .not('deliveries', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRouteOrders((data ?? []).filter(o => o.deliveries?.length > 0 && o.deliveries[0].scheduled_date)))
      .finally(() => setRoutesLoading(false))
  }, [farm?.id])

  // ── Zone CRUD ──
  async function addZone() {
    if (!zoneForm.postal_code.trim()) return
    setAddingZone(true)
    const { data, error } = await supabase.from('delivery_zones').insert({
      farm_id: farm.id,
      zone_name: zoneForm.postal_code.trim(),
      postal_code: zoneForm.postal_code.trim(),
      delivery_fee: parseFloat(zoneForm.delivery_fee) || 0,
      minimum_order_amount: parseFloat(zoneForm.minimum_order_amount) || 0,
    }).select().single()
    if (error) { notify('error', error.message) }
    else { setZones(z => [...z, data]); setZoneForm({ postal_code: '', delivery_fee: '', minimum_order_amount: '' }) }
    setAddingZone(false)
  }

  async function deleteZone(id) {
    setZones(z => z.filter(x => x.id !== id))
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id)
    if (error) { notify('error', error.message); supabase.from('delivery_zones').select('*').eq('farm_id', farm.id).then(({ data }) => setZones(data ?? [])) }
  }

  // ── Schedule CRUD ──
  async function addSchedule() {
    if (!schedForm.time_window.trim()) return
    setAddingSched(true)
    const { data, error } = await supabase.from('delivery_schedules').insert({
      farm_id: farm.id,
      day_of_week: parseInt(schedForm.day_of_week),
      time_window: schedForm.time_window.trim(),
    }).select().single()
    if (error) { notify('error', error.message) }
    else { setSchedules(s => [...s, data].sort((a, b) => a.day_of_week - b.day_of_week)); setSchedForm({ day_of_week: '1', time_window: '' }) }
    setAddingSched(false)
  }

  async function deleteSchedule(id) {
    setSchedules(s => s.filter(x => x.id !== id))
    await supabase.from('delivery_schedules').delete().eq('id', id)
  }

  // ── Route status update ──
  async function updateRouteOrderStatus(orderId, newStatus) {
    setRouteOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) { notify('error', error.message); supabase.from('orders').select('id,status').eq('id', orderId).single().then(({ data }) => { if (data) setRouteOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: data.status } : o)) }) }
  }

  // ── Post delivery job (Network Pro) ──
  async function postDeliveryJob(deliveryId, dateKey) {
    const fee = parseFloat(jobForms[dateKey])
    if (!fee || fee <= 0) { notify('error', 'Enter a valid driver fee'); return }
    setPostingJob(dateKey)
    const { error } = await supabase.from('delivery_jobs').insert({ delivery_id: deliveryId, farm_id: farm.id, driver_fee: fee })
    if (error) { notify('error', error.message) }
    else {
      notify('success', 'Driver job posted')
      // Refresh route orders
      const { data } = await supabase.from('orders')
        .select('id, status, total_amount, created_at, profiles(full_name), order_items(quantity, products(name)), deliveries(id, scheduled_date, scheduled_window, postal_code, delivery_status, delivery_jobs(id, status, driver_fee, driver_id, drivers(profiles(full_name))))')
        .eq('farm_id', farm.id)
        .in('status', ['paid', 'processing', 'out_for_delivery', 'completed'])
        .not('deliveries', 'is', null)
        .order('created_at', { ascending: false })
      setRouteOrders((data ?? []).filter(o => o.deliveries?.length > 0 && o.deliveries[0].scheduled_date))
    }
    setPostingJob(null)
  }

  // ── Grouped routes ──
  const grouped = routeOrders.reduce((acc, order) => {
    const d = order.deliveries[0]
    const dateKey = d.scheduled_date
    const zipKey  = d.postal_code ?? 'Unknown'
    if (!acc[dateKey]) acc[dateKey] = {}
    if (!acc[dateKey][zipKey]) acc[dateKey][zipKey] = []
    acc[dateKey][zipKey].push(order)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort()

  const SUB_TABS = [
    { id: 'zones',    label: 'Zones',    Icon: MapPin },
    { id: 'schedule', label: 'Schedule', Icon: Calendar },
    { id: 'routes',   label: 'Routes',   Icon: Route },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Delivery</h1>
        <p className="text-stone-500 mt-1">Manage your delivery zones, schedule, and route dashboard.</p>
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-2 mb-7">
        {SUB_TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              subTab === id ? 'bg-green-700 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── ZONES ── */}
      {subTab === 'zones' && (
        <div className="space-y-5">
          {/* Toggle offers_delivery */}
          <div className="bg-white rounded-2xl border border-stone-200/50 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-stone-800">Delivery enabled</p>
              <p className="text-sm text-stone-500 mt-0.5">Show delivery option to customers at checkout</p>
            </div>
            <button
              onClick={() => updateFarm({ offers_delivery: !farm.offers_delivery })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${farm.offers_delivery ? 'bg-green-600' : 'bg-stone-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${farm.offers_delivery ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Zone list */}
          <div className="bg-white rounded-2xl border border-stone-200/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
              <p className="font-semibold text-stone-800">Delivery zones</p>
              <p className="text-xs text-stone-400">{zones.length} zip code{zones.length !== 1 ? 's' : ''}</p>
            </div>
            {zonesLoading ? (
              <div className="p-5 space-y-3">{[0,1,2].map(i => <div key={i} className="h-10 bg-stone-100 rounded-xl animate-pulse" />)}</div>
            ) : zones.length === 0 ? (
              <div className="py-10 text-center text-stone-400"><MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No zones yet. Add a zip code below.</p></div>
            ) : (
              <div className="divide-y divide-stone-100">
                {zones.map(z => (
                  <div key={z.id} className="px-5 py-3.5 flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-stone-800">{z.postal_code}</span>
                      <span className="text-stone-400 text-sm ml-3">Fee: ${Number(z.delivery_fee).toFixed(2)}</span>
                      {z.minimum_order_amount > 0 && <span className="text-stone-400 text-sm ml-2">· Min: ${Number(z.minimum_order_amount).toFixed(2)}</span>}
                    </div>
                    <button onClick={() => deleteZone(z.id)} className="text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add zone form */}
          <div className="bg-white rounded-2xl border border-stone-200/50 p-5">
            <p className="font-semibold text-stone-800 mb-3">Add zip code</p>
            <div className="flex gap-3 flex-wrap">
              <input type="text" placeholder="ZIP code (e.g. 93312)" value={zoneForm.postal_code}
                onChange={e => setZoneForm(f => ({ ...f, postal_code: e.target.value }))}
                className={`${styles.input} w-40`} />
              <input type="number" placeholder="Delivery fee ($)" value={zoneForm.delivery_fee}
                onChange={e => setZoneForm(f => ({ ...f, delivery_fee: e.target.value }))}
                className={`${styles.input} w-40`} min="0" step="0.01" />
              <input type="number" placeholder="Min order ($)" value={zoneForm.minimum_order_amount}
                onChange={e => setZoneForm(f => ({ ...f, minimum_order_amount: e.target.value }))}
                className={`${styles.input} w-36`} min="0" step="0.01" />
              <button onClick={addZone} disabled={addingZone || !zoneForm.postal_code.trim()}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />{addingZone ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE ── */}
      {subTab === 'schedule' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-stone-200/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100">
              <p className="font-semibold text-stone-800">Delivery days</p>
              <p className="text-sm text-stone-400 mt-0.5">Customers choose from these days at checkout</p>
            </div>
            {schedulesLoading ? (
              <div className="p-5 space-y-3">{[0,1].map(i => <div key={i} className="h-10 bg-stone-100 rounded-xl animate-pulse" />)}</div>
            ) : schedules.length === 0 ? (
              <div className="py-10 text-center text-stone-400"><Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No schedule yet. Add a delivery day below.</p></div>
            ) : (
              <div className="divide-y divide-stone-100">
                {schedules.map(s => (
                  <div key={s.id} className="px-5 py-3.5 flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-stone-800">{DAY_NAMES[s.day_of_week]}</span>
                      <span className="text-stone-400 text-sm ml-3">{s.time_window}</span>
                    </div>
                    <button onClick={() => deleteSchedule(s.id)} className="text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add schedule form */}
          <div className="bg-white rounded-2xl border border-stone-200/50 p-5">
            <p className="font-semibold text-stone-800 mb-3">Add delivery day</p>
            <div className="flex gap-3 flex-wrap">
              <select value={schedForm.day_of_week} onChange={e => setSchedForm(f => ({ ...f, day_of_week: e.target.value }))} className={`${styles.input} w-40`}>
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <input type="text" placeholder="Time window (e.g. 9am–12pm)" value={schedForm.time_window}
                onChange={e => setSchedForm(f => ({ ...f, time_window: e.target.value }))}
                className={`${styles.input} flex-1 min-w-48`} />
              <button onClick={addSchedule} disabled={addingSched || !schedForm.time_window.trim()}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />{addingSched ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROUTES ── */}
      {subTab === 'routes' && (
        <div>
          {routesLoading ? (
            <div className="space-y-4">{[0,1].map(i => <div key={i} className="h-24 bg-stone-200 rounded-2xl animate-pulse" />)}</div>
          ) : sortedDates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200/50 py-16 text-center">
              <Route className="w-12 h-12 mx-auto mb-3 text-stone-200" />
              <p className="text-stone-400 font-medium">No scheduled delivery routes</p>
              <p className="text-stone-400 text-sm mt-1">Orders with a scheduled delivery date will appear here.</p>
            </div>
          ) : sortedDates.map(dateKey => {
            const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            const zipGroups = grouped[dateKey]
            const allDeliveryIds = Object.values(zipGroups).flat().map(o => o.deliveries[0].id)
            // Use first delivery for the job association
            const firstDelivery = Object.values(zipGroups).flat()[0]?.deliveries[0]
            const existingJob   = firstDelivery?.delivery_jobs?.[0]

            return (
              <div key={dateKey} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-700 text-lg">{dateLabel}</h3>
                  {/* Network Pro: driver job panel */}
                  {farm.platform_plan_slug === 'pro' && (
                    <div className="flex items-center gap-2">
                      {existingJob ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${existingJob.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {existingJob.status === 'accepted'
                            ? `Driver: ${existingJob.drivers?.profiles?.full_name ?? 'Accepted'}`
                            : `Job posted · $${Number(existingJob.driver_fee).toFixed(2)}`}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="number" placeholder="Driver fee $" min="0" step="1"
                            value={jobForms[dateKey] ?? ''}
                            onChange={e => setJobForms(f => ({ ...f, [dateKey]: e.target.value }))}
                            className="w-32 px-3 py-1.5 border border-stone-200 rounded-xl text-sm" />
                          <button
                            onClick={() => postDeliveryJob(firstDelivery?.id, dateKey)}
                            disabled={postingJob === dateKey}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                            {postingJob === dateKey ? 'Posting…' : 'Post Driver Job'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {Object.entries(zipGroups).map(([zip, zipOrders]) => {
                  const groupKey = `${dateKey}|${zip}`
                  const isExpanded = expanded[groupKey] ?? false
                  return (
                    <div key={zip} className="bg-white rounded-2xl border border-stone-200/50 mb-3 overflow-hidden">
                      <button
                        onClick={() => setExpanded(e => ({ ...e, [groupKey]: !isExpanded }))}
                        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-stone-50 transition-colors text-left"
                      >
                        <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                        <div className="flex-1">
                          <span className="font-semibold text-stone-800">ZIP {zip}</span>
                          <span className="text-stone-400 text-sm ml-2">— {zipOrders.length} order{zipOrders.length !== 1 ? 's' : ''}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-stone-100">
                          {zipOrders.map(order => {
                            const delivery = order.deliveries[0]
                            const next = NEXT_STATUS[order.status]
                            const itemSummary = order.order_items?.map(i => `${i.quantity}× ${i.products?.name ?? 'item'}`).join(', ')
                            return (
                              <div key={order.id} className="px-5 py-4 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-stone-800">{order.profiles?.full_name ?? 'Guest'}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-500'}`}>
                                      {STATUS_LABELS[order.status] ?? order.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-stone-500 truncate">{itemSummary}</p>
                                  {delivery.scheduled_window && <p className="text-xs text-stone-400 mt-0.5">{delivery.scheduled_window}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold text-stone-800 mb-1.5">${Number(order.total_amount).toFixed(2)}</p>
                                  {next && (
                                    <button
                                      onClick={() => updateRouteOrderStatus(order.id, next)}
                                      className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium hover:bg-green-100 transition-all whitespace-nowrap">
                                      Mark {STATUS_LABELS[next]}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
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
  // 'new' filter covers both pending_payment and pending
  const visible = filter === 'all' ? orders
    : filter === 'new' ? orders.filter(o => o.status === 'pending_payment' || o.status === 'pending')
    : orders.filter(o => o.status === filter)
  const STATUSES = ['all', 'new', 'paid', 'processing', 'out_for_delivery', 'completed', 'cancelled']
  const STATUS_FILTER_LABELS = { new: 'New', paid: 'Paid', processing: 'Preparing', out_for_delivery: 'Out for Delivery', completed: 'Delivered', cancelled: 'Cancelled' }
  const statusCount = s => s === 'new'
    ? orders.filter(o => o.status === 'pending_payment' || o.status === 'pending').length
    : orders.filter(o => o.status === s).length

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
            {s === 'all' ? 'All' : STATUS_FILTER_LABELS[s]}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-60">({statusCount(s)})</span>
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
  const stripeActive      = !!farm?.stripe_account_id && !!farm?.charges_enabled
  const stripePending     = !!farm?.stripe_account_id && !farm?.charges_enabled
  const currentPlanSlug   = platformSub?.farm_plans?.slug ?? null
  const hasStripeCustomer = !!platformSub?.stripe_customer_id

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Billing & Plan</h1>
        <p className="text-stone-500 mt-1">Manage your Valley Farm Network subscription and payment account.</p>
      </div>

      {/* Stripe Connect status */}
      {stripeActive ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Stripe account connected</p>
            <p className="text-sm text-green-600 mt-0.5">You can receive payments from customers.</p>
          </div>
        </div>
      ) : stripePending ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 mb-1">Stripe onboarding incomplete</p>
              <p className="text-sm text-amber-700 mb-4">
                Your Stripe account was created but isn't active yet. Please finish the onboarding steps in Stripe so customers can pay you.
              </p>
              <button onClick={onConnect} disabled={connectLoading} className={styles.buttonPrimary}>
                {connectLoading ? 'Redirecting to Stripe...' : 'Complete Stripe setup →'}
              </button>
            </div>
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
