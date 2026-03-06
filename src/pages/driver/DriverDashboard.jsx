import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, Truck, MapPin, Package, CheckCircle2, XCircle, Camera,
  Clock, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp, Navigation,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { styles } from '../../lib/styles'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  unassigned: 'bg-stone-100 text-stone-500',
  assigned:   'bg-blue-100 text-blue-700',
  picked_up:  'bg-amber-100 text-amber-700',
  delivered:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
}
const STATUS_LABEL = {
  unassigned: 'Unassigned',
  assigned:   'Assigned',
  picked_up:  'Picked Up',
  delivered:  'Delivered',
  failed:     'Failed',
}

// ── Onboarding form ───────────────────────────────────────────────────────────
function OnboardingForm({ profile, onComplete, signOut }) {
  const [form, setForm]   = useState({ vehicle_type: '', license_number: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const VEHICLE_TYPES = ['Car', 'SUV', 'Truck', 'Van', 'Cargo Van', 'Box Truck']

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('drivers')
      .insert({ profile_id: profile.id, ...form })
      .select()
      .single()
    if (error) { setError(error.message); setSaving(false) }
    else onComplete(data)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-green-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
            Kern Harvest
          </span>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-stone-200/50 p-8">
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Driver registration</h1>
          <p className="text-stone-500 text-sm mb-6">
            Complete your profile to apply as a delivery driver. Your application will be reviewed before you can accept deliveries.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Vehicle type</label>
              <select
                required
                value={form.vehicle_type}
                onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                className={styles.input}
              >
                <option value="">Select vehicle type…</option>
                {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Driver's license number</label>
              <input
                type="text"
                required
                value={form.license_number}
                onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                className={styles.input}
                placeholder="CA D1234567"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`${styles.buttonPrimary} w-full justify-center mt-2 disabled:opacity-60 disabled:cursor-not-allowed`}
              style={{ background: 'linear-gradient(to right, #1d4ed8, #2563eb)' }}
            >
              {saving ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </div>

        <p className="text-center mt-4">
          <button onClick={signOut} className="text-stone-400 text-sm hover:text-red-600 transition-colors">
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Pending / rejected gate ───────────────────────────────────────────────────
function StatusGate({ driver, profile, signOut }) {
  const approved = driver.background_check_status === 'approved'
  const rejected = driver.background_check_status === 'rejected'

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: rejected ? 'linear-gradient(to br, #dc2626, #b91c1c)' : 'linear-gradient(to bottom right, #d97706, #b45309)' }}>
          {rejected ? <XCircle className="w-10 h-10 text-white" /> : <Clock className="w-10 h-10 text-white" />}
        </div>

        <h1 className="text-2xl font-bold text-stone-800 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          {rejected ? 'Application not approved' : 'Application under review'}
        </h1>
        <p className="text-stone-500 mb-2">
          {rejected
            ? 'Unfortunately your driver application was not approved. Please contact support if you believe this is an error.'
            : 'Your driver application is being reviewed. You\'ll be able to accept deliveries once approved by our team.'}
        </p>

        <div className="bg-white/80 rounded-2xl border border-stone-200/50 p-5 my-6 text-left space-y-2">
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-700">Name: </span>{profile?.full_name ?? '—'}
          </p>
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-700">Vehicle: </span>{driver.vehicle_type ?? '—'}
          </p>
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-700">License: </span>{driver.license_number ?? '—'}
          </p>
          <p className="text-sm">
            <span className="font-medium text-stone-700">Status: </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {rejected ? 'Rejected' : 'Pending review'}
            </span>
          </p>
        </div>

        <button onClick={signOut} className="text-stone-400 text-sm hover:text-red-600 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Delivery card ─────────────────────────────────────────────────────────────
function DeliveryCard({ delivery, onUpdateStatus, onUploadPhoto }) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading]  = useState(false)
  const fileRef = useRef(null)
  const status = delivery.delivery_status
  const isActive = status === 'assigned' || status === 'picked_up'

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onUploadPhoto(delivery, file)
    setUploading(false)
  }

  const addr = [
    delivery.delivery_address_line_1,
    delivery.delivery_address_line_2,
    delivery.city,
    delivery.state,
    delivery.postal_code,
  ].filter(Boolean).join(', ')

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isActive ? 'border-blue-200' : 'border-stone-200'}`}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-stone-50/60 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100' : 'bg-stone-100'}`}>
          <Package className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-stone-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm font-semibold text-stone-800">
              {delivery.orders?.order_number ?? '—'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[status] ?? ''}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          <div className="flex items-center gap-1 text-stone-400 text-xs">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{addr || 'No address'}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {delivery.scheduled_date && (
            <p className="text-xs font-medium text-stone-700">{delivery.scheduled_date}</p>
          )}
          {delivery.scheduled_window && (
            <p className="text-xs text-stone-400">{delivery.scheduled_window}</p>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-stone-400 mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-stone-400 mt-1 ml-auto" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-stone-100 pt-4 space-y-4">
          {/* Farm + items */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Order from {delivery.orders?.farms?.farm_name ?? '—'}</p>
            <div className="space-y-1">
              {delivery.orders?.order_items?.map((item, i) => (
                <p key={i} className="text-sm text-stone-600">
                  {item.quantity}× {item.product_name}
                </p>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Delivery address</p>
            <p className="text-sm text-stone-700">{addr || 'No address provided'}</p>
            {delivery.delivery_notes && (
              <p className="text-xs text-stone-400 mt-1 italic">Note: {delivery.delivery_notes}</p>
            )}
          </div>

          {/* Proof photo */}
          {delivery.proof_photo_url && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Proof of delivery</p>
              <img
                src={delivery.proof_photo_url}
                alt="Proof of delivery"
                className="w-full max-w-xs h-32 object-cover rounded-xl border border-stone-200"
              />
            </div>
          )}

          {/* Status action buttons */}
          {status === 'assigned' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onUpdateStatus(delivery, 'picked_up')}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Picked Up
              </button>
            </div>
          )}

          {status === 'picked_up' && (
            <div className="space-y-3">
              {/* Photo upload */}
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  <Camera className="w-4 h-4" />
                  {uploading ? 'Uploading…' : delivery.proof_photo_url ? 'Replace photo' : 'Upload proof photo'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus(delivery, 'delivered')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Delivered
                </button>
                <button
                  onClick={() => onUpdateStatus(delivery, 'failed')}
                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Mark Failed
                </button>
              </div>
            </div>
          )}

          {status === 'delivered' && (
            <p className="text-sm text-green-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Delivered {delivery.delivered_at ? `on ${new Date(delivery.delivered_at).toLocaleDateString()}` : ''}
            </p>
          )}

          {status === 'failed' && (
            <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Delivery failed — contact support if needed
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Active driver dashboard ───────────────────────────────────────────────────
function ActiveDashboard({ driver, profile, signOut }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('deliveries')

  // Deliveries
  const [deliveries, setDeliveries]     = useState([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(true)
  const [filter, setFilter]             = useState('active')

  // Service areas
  const [areas, setAreas]               = useState([])
  const [areasLoading, setAreasLoading] = useState(false)
  const [newArea, setNewArea]           = useState({ city: '', postal_code: '' })
  const [addingArea, setAddingArea]     = useState(false)

  useEffect(() => {
    setDeliveriesLoading(true)
    supabase
      .from('deliveries')
      .select(`
        id, delivery_status, scheduled_date, scheduled_window,
        delivery_address_line_1, delivery_address_line_2, city, state, postal_code,
        delivery_notes, delivered_at, proof_photo_url,
        orders(
          id, order_number,
          farms(farm_name, slug),
          order_items(product_name, quantity)
        )
      `)
      .eq('driver_id', driver.id)
      .order('scheduled_date', { ascending: true })
      .then(({ data }) => setDeliveries(data ?? []))
      .finally(() => setDeliveriesLoading(false))
  }, [driver.id])

  useEffect(() => {
    if (activeTab !== 'areas') return
    setAreasLoading(true)
    supabase
      .from('driver_service_areas')
      .select('*')
      .eq('driver_id', driver.id)
      .then(({ data }) => setAreas(data ?? []))
      .finally(() => setAreasLoading(false))
  }, [activeTab, driver.id])

  // ── Mutations ──
  async function updateStatus(delivery, newStatus) {
    const updates = { delivery_status: newStatus }
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
    setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, ...updates } : d))
    const { error } = await supabase.from('deliveries').update(updates).eq('id', delivery.id)
    if (error) setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, delivery_status: delivery.delivery_status, delivered_at: delivery.delivered_at } : d))
  }

  async function uploadPhoto(delivery, file) {
    const ext = file.name.split('.').pop()
    const path = `${delivery.id}/proof.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(path, file, { upsert: true })
    if (uploadError) { alert(`Upload failed: ${uploadError.message}`); return }
    const { data: { publicUrl } } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
    setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, proof_photo_url: publicUrl } : d))
    await supabase.from('deliveries').update({ proof_photo_url: publicUrl }).eq('id', delivery.id)
  }

  async function addArea() {
    if (!newArea.city.trim() && !newArea.postal_code.trim()) return
    setAddingArea(true)
    const { data, error } = await supabase
      .from('driver_service_areas')
      .insert({ driver_id: driver.id, city: newArea.city.trim(), postal_code: newArea.postal_code.trim(), state: 'CA' })
      .select()
      .single()
    if (!error && data) { setAreas(prev => [...prev, data]); setNewArea({ city: '', postal_code: '' }) }
    setAddingArea(false)
  }

  async function deleteArea(id) {
    setAreas(prev => prev.filter(a => a.id !== id))
    await supabase.from('driver_service_areas').delete().eq('id', id)
  }

  const activeDeliveries    = deliveries.filter(d => d.delivery_status === 'assigned' || d.delivery_status === 'picked_up')
  const completedDeliveries = deliveries.filter(d => d.delivery_status === 'delivered' || d.delivery_status === 'failed')
  const shown = filter === 'active' ? activeDeliveries : completedDeliveries

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-blue-900 text-white p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white">Kern Harvest</span>
            <span className="block text-xs text-blue-300">Driver Portal</span>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { id: 'deliveries', label: 'My Deliveries', icon: Truck,      badge: activeDeliveries.length || null },
            { id: 'areas',      label: 'Service Areas',  icon: Navigation, badge: null },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-white/10 text-white' : 'text-blue-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="px-2">
            <p className="font-medium text-white text-sm">{profile?.full_name ?? 'Driver'}</p>
            <p className="text-blue-300 text-xs">{driver.vehicle_type}</p>
          </div>
          <button onClick={signOut} className="w-full text-blue-300 hover:text-red-400 text-sm transition-colors text-left px-2">
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="ml-64 p-8">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-800">
              {activeTab === 'deliveries' ? 'My Deliveries' : 'Service Areas'}
            </h1>
            <p className="text-stone-500">
              {activeTab === 'deliveries'
                ? `${activeDeliveries.length} active · ${completedDeliveries.length} completed`
                : 'Manage the cities and ZIP codes you deliver to'}
            </p>
          </div>

          {/* ── DELIVERIES ── */}
          {activeTab === 'deliveries' && (
            <>
              {/* Filter pills */}
              <div className="flex gap-2 mb-6">
                {[
                  { id: 'active',    label: `Active (${activeDeliveries.length})`    },
                  { id: 'completed', label: `Completed (${completedDeliveries.length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filter === f.id ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {deliveriesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse flex gap-4">
                      <div className="w-10 h-10 bg-stone-100 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-stone-200 rounded w-1/3" />
                        <div className="h-3 bg-stone-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 py-16 text-center">
                  <Truck className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="font-semibold text-stone-600 mb-1">
                    {filter === 'active' ? 'No active deliveries' : 'No completed deliveries'}
                  </p>
                  <p className="text-stone-400 text-sm">
                    {filter === 'active' ? 'New deliveries assigned to you will appear here.' : 'Completed deliveries will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shown.map(delivery => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onUpdateStatus={updateStatus}
                      onUploadPhoto={uploadPhoto}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SERVICE AREAS ── */}
          {activeTab === 'areas' && (
            <div className="space-y-4">
              {areasLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse flex gap-4">
                      <div className="h-4 bg-stone-200 rounded w-1/4" />
                      <div className="h-4 bg-stone-100 rounded flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  {areas.length === 0 ? (
                    <div className="py-10 text-center text-stone-400">
                      <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No service areas added yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {areas.map(area => (
                        <div key={area.id} className="px-5 py-4 flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium text-stone-800">{area.city || '—'}</span>
                            {area.postal_code && <span className="text-stone-400 text-sm ml-2">{area.postal_code}</span>}
                            <span className="text-stone-300 text-sm ml-1">{area.state}</span>
                          </div>
                          <button
                            onClick={() => deleteArea(area.id)}
                            className="text-stone-300 hover:text-red-500 transition-colors"
                            title="Remove area"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add area form */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <h3 className="font-semibold text-stone-800 mb-3">Add service area</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="City (e.g. Bakersfield)"
                    value={newArea.city}
                    onChange={e => setNewArea(a => ({ ...a, city: e.target.value }))}
                    className={`${styles.input} flex-1`}
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={newArea.postal_code}
                    onChange={e => setNewArea(a => ({ ...a, postal_code: e.target.value }))}
                    className={`${styles.input} w-28`}
                  />
                  <button
                    onClick={addArea}
                    disabled={addingArea || (!newArea.city.trim() && !newArea.postal_code.trim())}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function DriverDashboard() {
  const { profile, signOut } = useAuth()
  const [driver, setDriver] = useState(undefined) // undefined=loading, null=no record

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('drivers')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data }) => setDriver(data ?? null))
  }, [profile?.id])

  // Loading
  if (driver === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 flex items-center justify-center">
        <div className="text-stone-500">Loading…</div>
      </div>
    )
  }

  // No driver record yet → onboarding
  if (driver === null) {
    return <OnboardingForm profile={profile} onComplete={setDriver} signOut={signOut} />
  }

  // Rejected
  if (driver.background_check_status === 'rejected') {
    return <StatusGate driver={driver} profile={profile} signOut={signOut} />
  }

  // Pending or not yet active
  if (!driver.is_active || driver.background_check_status !== 'approved') {
    return <StatusGate driver={driver} profile={profile} signOut={signOut} />
  }

  // Fully approved and active
  return <ActiveDashboard driver={driver} profile={profile} signOut={signOut} />
}
