import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, BarChart3, Store, Package, ShoppingBag, Users, Truck, Settings,
  DollarSign, Star, CheckCircle, XCircle, ShieldCheck, Power, Globe, Plus, ExternalLink, Camera, X, Edit2, Trash2, Inbox, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { styles } from '../../lib/styles'
import AccountSettings from '../../components/AccountSettings'
import Toast, { makeNotify } from '../../components/Toast'

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',        icon: BarChart3   },
  { id: 'farms',        label: 'Farms',            icon: Store       },
  { id: 'products',     label: 'Products',         icon: Package     },
  { id: 'storefront',   label: 'Storefront',       icon: Globe       },
  { id: 'orders',       label: 'Platform Orders',  icon: ShoppingBag },
  { id: 'subscribers',  label: 'Subscribers',      icon: Users       },
  { id: 'drivers',      label: 'Drivers',          icon: Truck       },
  { id: 'support',      label: 'Support Tickets',  icon: Inbox       },
  { id: 'settings',     label: 'Settings',         icon: Settings    },
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

const TICKET_STATUS_COLORS = {
  open:        'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
}

function TicketCard({ ticket, onStatusChange, onSaveNotes }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes]       = useState(ticket.admin_notes ?? '')
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSaveNotes(ticket.id, notes)
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 truncate">{ticket.subject}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {ticket.name} · {ticket.email} · {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TICKET_STATUS_COLORS[ticket.status] ?? ''}`}>
          {ticket.status.replace('_', ' ')}
        </span>
        <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-stone-100 px-5 py-4 space-y-4">
          <p className="text-stone-700 text-sm whitespace-pre-wrap">{ticket.message}</p>

          {/* Status control */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</label>
            <select
              value={ticket.status}
              onChange={e => onStatusChange(ticket.id, e.target.value)}
              className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Admin notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Admin Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes (not visible to the farmer)…"
              className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { profile, session, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast]         = useState(null)
  const notify                    = makeNotify(setToast)

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

  const [tickets, setTickets]             = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  // Storefront (admin's own farm)
  const [myFarm, setMyFarm]                       = useState(null)
  const [storefrontLoading, setStorefrontLoading] = useState(false)
  const [adminCategories, setAdminCategories]     = useState([])
  const [showProductForm, setShowProductForm]     = useState(false)
  const [productForm, setProductForm]             = useState({ name: '', price: '', unit_name: 'each', product_type: 'one_time', category_id: '', description: '', image_url: '', is_active: true })
  const [savingProduct, setSavingProduct]         = useState(false)
  const [editingProduct, setEditingProduct]       = useState(null)
  const [confirmDelete, setConfirmDelete]         = useState(null)
  const [farmForm, setFarmForm]                   = useState({ farm_name: '', slug: '', description: '', tagline: '', banner_url: '' })
  const [savingFarm, setSavingFarm]               = useState(false)
  const [bannerUploading, setBannerUploading]     = useState(false)
  const bannerInputRef                            = useRef(null)
  const [productImgUploading, setProductImgUploading] = useState(false)
  const productImgInputRef                        = useRef(null)
  const [myOrders, setMyOrders]                   = useState([])
  const [mySubscriptions, setMySubscriptions]     = useState([])
  const [myOrdersLoading, setMyOrdersLoading]     = useState(false)

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
      const uid = session?.user?.id
      setProductsLoading(true)
      Promise.all([
        uid ? supabase.from('farms').select('id, farm_name, slug').eq('owner_id', uid).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
      ]).then(async ([farmR, catsR]) => {
        if (farmR.data) {
          setMyFarm(farmR.data)
          const { data: prodsData } = await supabase
            .from('products')
            .select('id, name, price, unit_name, product_type, is_active, image_url, description, category_id, categories(name, color_hex)')
            .eq('farm_id', farmR.data.id)
            .order('created_at', { ascending: false })
          setProducts(prodsData ?? [])
        } else {
          setProducts([])
        }
        setAdminCategories(catsR.data ?? [])
      }).finally(() => setProductsLoading(false))
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

    if (activeTab === 'support') {
      setTicketsLoading(true)
      supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => setTickets(data ?? []))
        .finally(() => setTicketsLoading(false))
    }

    if (activeTab === 'storefront') {
      const uid = session?.user?.id
      if (!uid) return
      setStorefrontLoading(true)
      Promise.all([
        supabase.from('farms').select('id, farm_name, slug, description, tagline, banner_url, is_active').eq('owner_id', uid).maybeSingle(),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
      ]).then(async ([farmR, catsR]) => {
        const farm = farmR.data ?? null
        setMyFarm(farm)
        if (farm) setFarmForm({ farm_name: farm.farm_name, slug: farm.slug, description: farm.description ?? '', tagline: farm.tagline ?? '', banner_url: farm.banner_url ?? '' })
        setAdminCategories(catsR.data ?? [])
        if (farmR.data?.id) {
          setMyOrdersLoading(true)
          const [ordersR, subsR] = await Promise.all([
            supabase
              .from('orders')
              .select('id, order_number, total_amount, status, created_at, profiles(full_name)')
              .eq('farm_id', farmR.data.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('customer_subscriptions')
              .select('id, status, next_billing_date, created_at, profiles(full_name, email), subscription_plans(name, price, billing_interval)')
              .eq('farm_id', farmR.data.id)
              .order('created_at', { ascending: false }),
          ])
          setMyOrders(ordersR.data ?? [])
          setMySubscriptions(subsR.data ?? [])
          setMyOrdersLoading(false)
        }
      }).finally(() => setStorefrontLoading(false))
    }
  }, [activeTab])

  // ── Mutations ──

  async function toggleFeatured(farm) {
    const next = !farm.is_featured
    setFarms(prev => prev.map(f => f.id === farm.id ? { ...f, is_featured: next } : f))
    const { error } = await supabase.from('farms').update({ is_featured: next }).eq('id', farm.id)
    if (error) setFarms(prev => prev.map(f => f.id === farm.id ? { ...f, is_featured: farm.is_featured } : f))
  }

  async function updateDriverField(driver, field, value) {
    // Approving the BGC also activates the driver in one step
    const updates = field === 'background_check_status' && value === 'approved'
      ? { background_check_status: 'approved', is_active: true }
      : { [field]: value }
    setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, ...updates } : d))
    const { error } = await supabase.from('drivers').update(updates).eq('id', driver.id)
    if (error) setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, [field]: driver[field] } : d))
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${session.user.id}/banner-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('farm-images').upload(path, file, { upsert: true })
    if (upErr) {
      console.error('Banner upload error:', upErr.message)
      notify('error', `Upload failed: ${upErr.message}`)
      setBannerUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('farm-images').getPublicUrl(path)
    setFarmForm(f => ({ ...f, banner_url: publicUrl }))
    setBannerUploading(false)
  }

  async function handleProductImgUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !myFarm) return
    setProductImgUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${myFarm.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (upErr) { setProductImgUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setProductForm(f => ({ ...f, image_url: publicUrl }))
    setProductImgUploading(false)
  }

  async function createFarm(e) {
    e.preventDefault()
    setSavingFarm(true)
    const { data, error } = await supabase
      .from('farms')
      .insert({
        farm_name:   farmForm.farm_name,
        slug:        farmForm.slug,
        description: farmForm.description || null,
        tagline:     farmForm.tagline     || null,
        banner_url:  farmForm.banner_url  || null,
        owner_id:    session.user.id,
        is_active:   true,
      })
      .select('id, farm_name, slug, is_active')
      .single()
    if (!error && data) setMyFarm(data)
    setSavingFarm(false)
  }

  async function updateFarm(e) {
    e.preventDefault()
    setSavingFarm(true)
    const { data, error } = await supabase
      .from('farms')
      .update({
        farm_name:   farmForm.farm_name,
        slug:        farmForm.slug,
        description: farmForm.description || null,
        tagline:     farmForm.tagline     || null,
        banner_url:  farmForm.banner_url  || null,
      })
      .eq('id', myFarm.id)
      .select('id, farm_name, slug, description, tagline, banner_url, is_active')
      .single()
    if (!error && data) setMyFarm(data)
    setSavingFarm(false)
  }

  async function handleSaveProduct(e) {
    e.preventDefault()
    setSavingProduct(true)
    const selectStr = 'id, name, price, unit_name, product_type, is_active, image_url, description, category_id, categories(name, color_hex)'
    const fields = {
      name:         productForm.name,
      price:        parseFloat(productForm.price),
      unit_name:    productForm.unit_name    || 'each',
      product_type: productForm.product_type || 'one_time',
      category_id:  productForm.category_id  || null,
      description:  productForm.description  || null,
      image_url:    productForm.image_url    || null,
      is_active:    productForm.is_active,
    }
    let data, error
    if (editingProduct) {
      ;({ data, error } = await supabase.from('products').update(fields).eq('id', editingProduct.id).select(selectStr).single())
      if (!error && data) setProducts(prev => prev.map(p => p.id === data.id ? data : p))
    } else {
      const base = productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const slug = `${base}-${Date.now().toString(36)}`
      ;({ data, error } = await supabase.from('products').insert({ ...fields, slug, farm_id: myFarm.id }).select(selectStr).single())
      if (!error && data) setProducts(prev => [data, ...prev])
    }
    if (error) {
      notify('error', `Failed to save product: ${error.message}`)
    } else {
      notify('success', editingProduct ? 'Product updated.' : 'Product added.')
      setProductForm({ name: '', price: '', unit_name: 'each', product_type: 'one_time', category_id: '', description: '', image_url: '', is_active: true })
      setEditingProduct(null)
      setShowProductForm(false)
    }
    setSavingProduct(false)
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { notify('error', `Failed to delete: ${error.message}`); return }
    setProducts(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
    notify('success', 'Product deleted.')
  }

  async function toggleCategoryActive(cat) {
    const next = !cat.is_active
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: next } : c))
    const { error } = await supabase.from('categories').update({ is_active: next }).eq('id', cat.id)
    if (error) setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: cat.is_active } : c))
  }

  async function updateTicketStatus(id, status) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    const { error } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: t.status } : t))
      notify('error', error.message)
    }
  }

  async function saveTicketNotes(id, admin_notes) {
    const { error } = await supabase.from('support_tickets').update({ admin_notes, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) notify('error', error.message)
    else {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, admin_notes } : t))
      notify('success', 'Notes saved.')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Toast msg={toast} />

      {/* ── Sidebar ── */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-stone-800">Valley Farm Network</span>
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
            productsLoading ? <TableSkeleton rows={6} /> : (
              <>
                {!myFarm ? (
                  <EmptyState icon={Package} message="Set up your storefront first to add products." />
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-stone-800">Products</h2>
                        <p className="text-stone-500 mt-1">{products.filter(p => p.is_active).length} active · {products.length} total</p>
                      </div>
                      <button
                        onClick={() => { setEditingProduct(null); setProductForm({ name: '', price: '', unit_name: 'each', product_type: 'one_time', category_id: '', description: '', image_url: '', is_active: true }); setShowProductForm(true) }}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add product
                      </button>
                    </div>

                    {products.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200/50">
                        <Package className="w-14 h-14 mx-auto mb-4 text-stone-200" />
                        <h3 className="text-lg font-bold text-stone-700 mb-2">No products yet</h3>
                        <p className="text-stone-400 mb-6 max-w-xs mx-auto text-sm">Add your first product so customers can start ordering.</p>
                        <button
                          onClick={() => { setEditingProduct(null); setProductForm({ name: '', price: '', unit_name: 'each', product_type: 'one_time', category_id: '', description: '', image_url: '', is_active: true }); setShowProductForm(true) }}
                          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Add your first product
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {products.map(p => {
                          const isDeleting = confirmDelete === p.id
                          return (
                            <div
                              key={p.id}
                              className={`bg-white rounded-2xl border p-5 transition-all ${
                                isDeleting ? 'border-red-200 bg-red-50' : 'border-stone-200/50 hover:shadow-md'
                              }`}
                            >
                              {isDeleting ? (
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-red-700 font-medium text-sm">Remove "{p.name}" from your products?</p>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-full text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all">Cancel</button>
                                    <button
                                      onClick={() => deleteProduct(p.id)}
                                      disabled={savingProduct}
                                      className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition-all text-sm disabled:opacity-60"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-4">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-100 to-amber-100 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h3 className="font-bold text-stone-800">{p.name}</h3>
                                      {!p.is_active && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Inactive</span>}
                                      {p.product_type !== 'one_time' && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                          {p.product_type === 'subscription' ? 'Sub only' : 'Sub available'}
                                        </span>
                                      )}
                                      {p.categories && (
                                        <span
                                          className="text-xs px-2 py-0.5 rounded-full"
                                          style={{ backgroundColor: `${p.categories.color_hex}20`, color: p.categories.color_hex }}
                                        >
                                          {p.categories.name}
                                        </span>
                                      )}
                                    </div>
                                    {p.description && <p className="text-sm text-stone-400 mb-1.5 truncate max-w-lg">{p.description}</p>}
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg font-bold text-green-700">${Number(p.price).toFixed(2)}</span>
                                      <span className="text-stone-400 text-sm">/ {p.unit_name}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => {
                                        setEditingProduct(p)
                                        setProductForm({ name: p.name, price: String(p.price), unit_name: p.unit_name ?? 'each', product_type: p.product_type ?? 'one_time', category_id: p.category_id ?? '', description: p.description ?? '', image_url: p.image_url ?? '', is_active: p.is_active })
                                        setShowProductForm(true)
                                      }}
                                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(p.id)}
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
                )}

                {/* ── Product drawer ── */}
                {showProductForm && (
                  <div className="fixed inset-0 z-40 flex">
                    <div className="flex-1 bg-black/40" onClick={() => { setShowProductForm(false); setEditingProduct(null) }} />
                    <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
                      <div className="flex items-center justify-between p-6 border-b border-stone-100">
                        <h2 className="text-lg font-bold text-stone-800">{editingProduct ? 'Edit product' : 'Add product'}</h2>
                        <button onClick={() => { setShowProductForm(false); setEditingProduct(null) }} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                          <X className="w-5 h-5 text-stone-400" />
                        </button>
                      </div>
                      <form onSubmit={handleSaveProduct} className="flex-1 p-6 space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-1.5">Product name *</label>
                          <input required className={styles.input} placeholder="e.g. Organic Tomatoes"
                            value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-1.5">Description</label>
                          <textarea className={`${styles.input} resize-none`} rows={3} placeholder="Tell customers about this product..."
                            value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-1.5">Product photo</label>
                          <input ref={productImgInputRef} type="file" accept="image/*" className="hidden" onChange={handleProductImgUpload} />
                          {productForm.image_url ? (
                            <div className="relative">
                              <img src={productForm.image_url} alt="Product preview" className="w-full h-40 object-cover rounded-xl border border-stone-200" />
                              <button type="button" onClick={() => productImgInputRef.current?.click()} disabled={productImgUploading}
                                className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60">
                                <Camera className="w-3.5 h-3.5" />
                                {productImgUploading ? 'Uploading…' : 'Change'}
                              </button>
                              <button type="button" onClick={() => setProductForm(f => ({ ...f, image_url: '' }))}
                                className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow">
                                <X className="w-3.5 h-3.5 text-stone-600" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => productImgInputRef.current?.click()} disabled={productImgUploading}
                              className="w-full h-32 border-2 border-dashed border-stone-300 hover:border-green-400 rounded-xl flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-green-600 transition-colors disabled:opacity-60">
                              <Camera className="w-6 h-6" />
                              <span className="text-sm font-medium">{productImgUploading ? 'Uploading…' : 'Upload photo'}</span>
                            </button>
                          )}
                          <p className="text-xs text-stone-400 mt-1.5">Best size: 800 × 600 px. JPG or PNG.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Price *</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                              <input required type="number" min="0.01" step="0.01" className={`${styles.input} pl-8`} placeholder="0.00"
                                value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Unit *</label>
                            <input required list="admin-unit-presets" className={styles.input} placeholder="lb, each, dozen…"
                              value={productForm.unit_name} onChange={e => setProductForm(f => ({ ...f, unit_name: e.target.value }))} />
                            <datalist id="admin-unit-presets">
                              {['each', 'dozen', 'lb', 'oz', 'bunch', 'bag', 'box', 'jar', 'pint', 'quart', 'gallon'].map(u => <option key={u} value={u} />)}
                            </datalist>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-1.5">Category</label>
                          <select className={styles.input} value={productForm.category_id}
                            onChange={e => setProductForm(f => ({ ...f, category_id: e.target.value }))}>
                            <option value="">No category</option>
                            {adminCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                <input type="radio" name="admin_product_type" value={opt.value}
                                  checked={productForm.product_type === opt.value}
                                  onChange={() => setProductForm(f => ({ ...f, product_type: opt.value }))}
                                  className="w-4 h-4 text-green-600" />
                                <span className="text-stone-700 text-sm">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-stone-700">Visible to customers</p>
                            <p className="text-xs text-stone-400 mt-0.5">Toggle off to hide this product</p>
                          </div>
                          <button type="button"
                            onClick={() => setProductForm(f => ({ ...f, is_active: !f.is_active }))}
                            className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${productForm.is_active ? 'bg-green-500' : 'bg-stone-300'}`}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${productForm.is_active ? 'left-6' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-stone-100">
                          <button type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null) }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all">
                            Cancel
                          </button>
                          <button type="submit" disabled={savingProduct}
                            className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
                            {savingProduct ? 'Saving…' : editingProduct ? 'Save changes' : 'Add product'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )
          )}

          {/* ── STOREFRONT ── */}
          {activeTab === 'storefront' && (
            storefrontLoading ? <TableSkeleton rows={4} /> : (
              <div className="space-y-6">
                {myFarm === null ? (
                  /* No farm yet */
                  <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-lg">
                    <h2 className="font-bold text-stone-800 mb-1">Set up your storefront</h2>
                    <p className="text-stone-400 text-sm mb-5">Create your own marketplace presence to list and sell products.</p>
                    <form onSubmit={createFarm} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Store name</label>
                        <input
                          type="text" required className={styles.input}
                          placeholder="Valley Farm Network Marketplace"
                          value={farmForm.farm_name}
                          onChange={e => {
                            const name = e.target.value
                            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                            setFarmForm(f => ({ ...f, farm_name: name, slug }))
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">URL slug</label>
                        <div className="flex items-center gap-1">
                          <span className="text-stone-400 text-sm shrink-0">/farms/</span>
                          <input
                            type="text" required className={styles.input}
                            value={farmForm.slug}
                            onChange={e => setFarmForm(f => ({ ...f, slug: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Tagline (optional)</label>
                        <input type="text" className={styles.input} placeholder="Fresh from Kern County"
                          value={farmForm.tagline} onChange={e => setFarmForm(f => ({ ...f, tagline: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Description (optional)</label>
                        <textarea className={styles.input} rows={3}
                          value={farmForm.description} onChange={e => setFarmForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Banner image (optional)</label>
                        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                        {farmForm.banner_url ? (
                          <div className="relative">
                            <img src={farmForm.banner_url} alt="Banner preview" className="w-full h-28 object-cover rounded-xl border border-stone-200" />
                            <button type="button" onClick={() => bannerInputRef.current?.click()}
                              className="absolute bottom-2 right-2 bg-white/80 hover:bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 shadow flex items-center gap-1.5">
                              <Camera className="w-3 h-3" /> Change
                            </button>
                            <button type="button" onClick={() => setFarmForm(f => ({ ...f, banner_url: '' }))}
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow">
                              <X className="w-3.5 h-3.5 text-stone-600" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" disabled={bannerUploading} onClick={() => bannerInputRef.current?.click()}
                            className="w-full h-24 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50">
                            <Camera className="w-5 h-5" />
                            <span className="text-sm">{bannerUploading ? 'Uploading…' : 'Upload banner'}</span>
                          </button>
                        )}
                        <p className="text-xs text-stone-400 mt-1">1600 × 600 px recommended.</p>
                      </div>
                      <button type="submit" disabled={savingFarm}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
                        {savingFarm ? 'Creating…' : 'Create storefront'}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Farm exists */
                  <>
                    {/* Settings form */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-stone-800">Farm settings</h2>
                        <button
                          onClick={() => navigate(`/farms/${myFarm.slug}`)}
                          className="flex items-center gap-1 text-green-700 text-sm hover:underline"
                        >
                          View storefront <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <form onSubmit={updateFarm} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Store name</label>
                          <input type="text" required className={styles.input}
                            value={farmForm.farm_name}
                            onChange={e => setFarmForm(f => ({ ...f, farm_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">URL slug</label>
                          <div className="flex items-center gap-1">
                            <span className="text-stone-400 text-sm shrink-0">/farms/</span>
                            <input type="text" required className={styles.input}
                              value={farmForm.slug}
                              onChange={e => setFarmForm(f => ({ ...f, slug: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Tagline (optional)</label>
                          <input type="text" className={styles.input}
                            value={farmForm.tagline}
                            onChange={e => setFarmForm(f => ({ ...f, tagline: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Description (optional)</label>
                          <textarea className={styles.input} rows={3}
                            value={farmForm.description}
                            onChange={e => setFarmForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Banner image</label>
                          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                          {farmForm.banner_url ? (
                            <div className="relative">
                              <img src={farmForm.banner_url} alt="Banner preview" className="w-full h-28 object-cover rounded-xl border border-stone-200" />
                              <button type="button" onClick={() => bannerInputRef.current?.click()}
                                className="absolute bottom-2 right-2 bg-white/80 hover:bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 shadow flex items-center gap-1.5">
                                <Camera className="w-3 h-3" /> Change
                              </button>
                              <button type="button" onClick={() => setFarmForm(f => ({ ...f, banner_url: '' }))}
                                className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow">
                                <X className="w-3.5 h-3.5 text-stone-600" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" disabled={bannerUploading} onClick={() => bannerInputRef.current?.click()}
                              className="w-full h-24 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50">
                              <Camera className="w-5 h-5" />
                              <span className="text-sm">{bannerUploading ? 'Uploading…' : 'Upload banner'}</span>
                            </button>
                          )}
                          <p className="text-xs text-stone-400 mt-1">1600 × 600 px recommended.</p>
                        </div>
                        <button type="submit" disabled={savingFarm}
                          className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
                          {savingFarm ? 'Saving…' : 'Save changes'}
                        </button>
                      </form>
                    </div>

                    {myOrdersLoading ? <TableSkeleton rows={3} /> : (
                      <div className="space-y-6">
                        {/* One-time orders */}
                        <div>
                          <h3 className="font-semibold text-stone-700 mb-3">One-Time Orders</h3>
                          {myOrders.length === 0 ? (
                            <EmptyState icon={ShoppingBag} message="No one-time orders yet." />
                          ) : (
                            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-stone-50 border-b border-stone-200">
                                  <tr>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Order #</th>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Customer</th>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Status</th>
                                    <th className="text-right px-5 py-3 font-semibold text-stone-600">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {myOrders.map(o => (
                                    <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                                      <td className="px-5 py-3 font-mono text-xs font-medium text-stone-800">{o.order_number}</td>
                                      <td className="px-5 py-3 text-stone-600">{o.profiles?.full_name ?? 'Unknown'}</td>
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
                          )}
                        </div>

                        {/* Subscription orders */}
                        <div>
                          <h3 className="font-semibold text-stone-700 mb-3">Subscriptions</h3>
                          {mySubscriptions.length === 0 ? (
                            <EmptyState icon={Users} message="No subscriptions yet." />
                          ) : (
                            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-stone-50 border-b border-stone-200">
                                  <tr>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Customer</th>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Plan</th>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Status</th>
                                    <th className="text-left px-5 py-3 font-semibold text-stone-600">Next billing</th>
                                    <th className="text-right px-5 py-3 font-semibold text-stone-600">Price</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {mySubscriptions.map(s => (
                                    <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                                      <td className="px-5 py-3 text-stone-800 font-medium">{s.profiles?.full_name ?? 'Unknown'}</td>
                                      <td className="px-5 py-3 text-stone-600">{s.subscription_plans?.name ?? '—'}</td>
                                      <td className="px-5 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          s.status === 'active'   ? 'bg-green-100 text-green-700' :
                                          s.status === 'paused'   ? 'bg-amber-100 text-amber-700' :
                                          s.status === 'cancelled'? 'bg-red-100 text-red-700' :
                                          'bg-stone-100 text-stone-500'
                                        }`}>{s.status}</span>
                                      </td>
                                      <td className="px-5 py-3 text-stone-500 text-xs">
                                        {s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString() : '—'}
                                      </td>
                                      <td className="px-5 py-3 text-right font-bold text-stone-800">
                                        ${fmt(s.subscription_plans?.price)}<span className="text-stone-400 font-normal text-xs">/{s.subscription_plans?.billing_interval}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
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

          {/* ── SUPPORT TICKETS ── */}
          {activeTab === 'support' && (
            ticketsLoading ? <TableSkeleton rows={4} /> : tickets.length === 0 ? <EmptyState icon={Inbox} message="No support tickets yet." /> : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onStatusChange={updateTicketStatus}
                    onSaveNotes={saveTicketNotes}
                  />
                ))}
              </div>
            )
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {catsLoading ? <TableSkeleton rows={6} /> : (
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
              )}
              <AccountSettings />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
