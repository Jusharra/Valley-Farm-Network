import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MapPin, Truck, Store } from 'lucide-react'
import { FARMS } from '../../lib/mockData'
import { styles } from '../../lib/styles'
import { useCart } from '../../context/CartContext'

export default function FarmPage() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const { items, addToCart } = useCart()

  const farm = FARMS.find(f => f.id === slug)
  if (!farm) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-stone-500">Farm not found.</p>
    </div>
  )

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
          {items.length > 0 && (
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              {items.length} {items.length === 1 ? 'item' : 'items'} in cart
            </span>
          )}
        </div>
      </div>

      {/* Hero image */}
      <div className="relative h-72 md:h-96">
        <img src={farm.image} alt={farm.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Farm info card */}
      <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10">
        <div className={`${styles.card} p-8`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                {farm.name}
              </h1>
              <p className="text-lg text-stone-600 mb-3">{farm.tagline}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  ★ {farm.rating} <span className="text-stone-400">({farm.reviews})</span>
                </span>
                <span className="flex items-center gap-1 text-stone-500">
                  <MapPin className="w-4 h-4" /> {farm.location}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className={styles.buttonSecondary}>Share</button>
              <button className={styles.buttonPrimary}>Subscribe</button>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-800 mb-2">About the farm</h2>
            <p className="text-stone-600 leading-relaxed">{farm.about}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-stone-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Delivery</h3>
                <p className="text-sm text-stone-500">{farm.delivery.join(', ')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Pickup</h3>
                <p className="text-sm text-stone-500">{farm.pickup}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mt-8 mb-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Products
          </h2>
          <div className="space-y-4">
            {farm.products.map(product => (
              <div key={product.id} className={`${styles.card} p-6 transition-all hover:shadow-xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-stone-800">{product.name}</h3>
                      {product.subscription && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          Subscription available
                        </span>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm mb-2">{product.description}</p>
                    <p className="text-xl font-bold text-green-700">
                      ${product.price} <span className="text-sm font-normal text-stone-400">/ {product.unit}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-6">
                    <button
                      onClick={() => addToCart(farm.id, product)}
                      className={styles.buttonPrimary}
                    >
                      Add to cart
                    </button>
                    {product.subscription && (
                      <button className="text-green-700 font-medium text-sm hover:underline">
                        Subscribe weekly →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
