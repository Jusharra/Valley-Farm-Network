import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MapPin, Truck, Store, Leaf, Share2, ShoppingBag } from 'lucide-react'
import { useFarm } from '../../hooks/useFarm'
import { styles } from '../../lib/styles'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'


export default function FarmPage() {
  const { slug }  = useParams()
  const navigate  = useNavigate()
  const { items, total, addToCart } = useCart()
  const { farm, products, deliveryZones, loading, error } = useFarm(slug)
  const [copied, setCopied]           = useState(false)
  const [subscribing, setSubscribing] = useState(null)   // productId being subscribed
  const [subError, setSubError]       = useState(null)

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  async function handleSubscribe(product) {
    setSubError(null)
    setSubscribing(product.id)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-subscription-session', {
        body: { farmId: farm.id, productId: product.id, farmSlug: farm.slug },
      })
      if (fnErr) {
        // Extract the real error message from the edge function response body
        let message = fnErr.message
        try {
          const body = await fnErr.context?.json()
          if (body?.error) message = body.error
        } catch {}
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setSubError(err.message)
      setSubscribing(null)
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/farms/${farm.slug}`
    if (navigator.share) {
      navigator.share({ title: farm.farm_name, text: farm.tagline ?? '', url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (loading) {
    return (
      <div className={styles.pageBackground}>
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="w-32 h-4 bg-stone-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-72 md:h-96 bg-stone-200 animate-pulse" />
        <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10">
          <div className="bg-white/80 rounded-2xl p-8 animate-pulse space-y-4">
            <div className="h-8 bg-stone-200 rounded w-1/2" />
            <div className="h-4 bg-stone-100 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !farm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-stone-500">{error ?? 'Farm not found.'}</p>
        <button onClick={() => navigate('/')} className={styles.buttonSecondary}>
          Back to market
        </button>
      </div>
    )
  }

  const addr          = farm.farm_addresses?.[0]
  const deliveryCities = deliveryZones.map(z => z.city ?? z.zone_name).filter(Boolean)

  return (
    <div className={styles.pageBackground}>
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-600 hover:text-green-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to market</span>
          </button>
          {itemCount > 0 && (
            <button
              onClick={() => navigate('/checkout')}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · ${total.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {/* Hero image */}
      <div className="relative h-72 md:h-96">
        {farm.banner_url ? (
          <img src={farm.banner_url} alt={farm.farm_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-200 to-amber-100 flex items-center justify-center">
            <Leaf className="w-24 h-24 text-green-400/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Farm info card */}
      <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10">
        <div className={`${styles.card} p-8`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
                  {farm.farm_name}
                </h1>
                {farm.is_verified && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-lg text-stone-600 mb-3">{farm.tagline}</p>
              {addr && (
                <span className="flex items-center gap-1 text-stone-500 text-sm">
                  <MapPin className="w-4 h-4" />
                  {[addr.city, addr.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleShare} className={styles.buttonSecondary}>
                <Share2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                {copied ? 'Link copied!' : 'Share'}
              </button>
            </div>
          </div>

          {/* About */}
          {(farm.description || farm.story) && (
            <div className="border-t border-stone-100 pt-6">
              <h2 className="font-bold text-stone-800 mb-2">About the farm</h2>
              <p className="text-stone-600 leading-relaxed">{farm.story || farm.description}</p>
            </div>
          )}

          {/* Fulfillment */}
          <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-stone-100">
            {farm.offers_delivery && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800 mb-1">Delivery</h3>
                  <p className="text-sm text-stone-500">
                    {deliveryCities.length
                      ? deliveryCities.join(', ')
                      : `Within ${farm.delivery_radius_miles ?? '?'} miles`}
                  </p>
                </div>
              </div>
            )}
            {farm.offers_pickup && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800 mb-1">Pickup</h3>
                  <p className="text-sm text-stone-500">Contact farm for pickup schedule</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mt-8 mb-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Products
          </h2>

          {products.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <p>No products listed yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map(product => {
                const hasSubscription =
                  product.product_type === 'subscription' || product.product_type === 'both'
                return (
                  <div key={product.id} className={`${styles.card} p-6 transition-all hover:shadow-xl`}>
                    <div className="flex items-center gap-4">
                      {/* Product image */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 flex items-center justify-center">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          : <Leaf className="w-8 h-8 text-stone-300" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-stone-800">{product.name}</h3>
                          {hasSubscription && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              Subscription available
                            </span>
                          )}
                        </div>
                        <p className="text-stone-500 text-sm mb-2">{product.description}</p>
                        <p className="text-xl font-bold text-green-700">
                          ${product.price}
                          <span className="text-sm font-normal text-stone-400"> / {product.unit_name}</span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 ml-2 flex-shrink-0">
                        <button
                          onClick={() => addToCart(farm.id, product, farm.farm_name)}
                          className={styles.buttonPrimary}
                        >
                          Add to cart
                        </button>
                        {hasSubscription && (
                          <button
                            onClick={() => handleSubscribe(product)}
                            disabled={subscribing === product.id}
                            className="text-green-700 font-medium text-sm hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {subscribing === product.id ? 'Redirecting…' : 'Subscribe weekly →'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

            </div>
          )}

          {subError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {subError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
