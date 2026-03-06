import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Leaf, MapPin, ArrowRight } from 'lucide-react'
import { useFarms } from '../../hooks/useFarms'
import { useCategories } from '../../hooks/useCategories'
import { ICON_MAP } from '../../lib/icons'
import { styles } from '../../lib/styles'

function formatDistance(miles) {
  if (miles < 1) return '< 1 mile away'
  if (miles === 1.0) return '1 mile away'
  return `${miles} miles away`
}

export default function CategoryPage() {
  const { slug }   = useParams()
  const navigate   = useNavigate()

  const { farms, loading: farmsLoading, userLocation } = useFarms({ categorySlug: slug })
  const { categories } = useCategories()

  const category = categories.find(c => c.slug === slug)
  const Icon     = ICON_MAP[category?.icon_name] ?? Leaf

  return (
    <div className={styles.pageBackground}>
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-stone-600 hover:text-green-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {category && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${category.color_hex}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: category.color_hex }} />
              </div>
              <h1 className="text-xl font-bold text-stone-800">{category.name}</h1>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!farmsLoading && (
          <p className="text-stone-600 mb-8">
            {farms.length} {farms.length === 1 ? 'farm' : 'farms'} selling {category?.name?.toLowerCase() ?? slug}
            {userLocation ? ' near you' : ''}
          </p>
        )}

        {farmsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/80 rounded-2xl overflow-hidden border border-stone-200/50 animate-pulse">
                <div className="h-40 bg-stone-200" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : farms.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">No farms found for this category yet.</p>
            <button onClick={() => navigate('/')} className={`${styles.buttonSecondary} mt-4`}>
              Browse all farms
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farms.map(farm => {
              const addr = farm.farm_addresses?.[0]
              return (
                <button
                  key={farm.id}
                  onClick={() => navigate(`/farms/${farm.slug}`)}
                  className="group text-left bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-stone-200/50 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="relative h-40 overflow-hidden">
                    {farm.banner_url ? (
                      <img
                        src={farm.banner_url}
                        alt={farm.farm_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-amber-100" />
                    )}
                    {farm.distance_miles != null && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                          {formatDistance(farm.distance_miles)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-stone-800">{farm.farm_name}</h3>
                      {farm.is_verified && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm mb-2">{farm.tagline}</p>
                    <div className="flex items-center justify-between">
                      {addr && (
                        <span className="flex items-center gap-1 text-stone-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          {[addr.city, addr.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span className="text-green-700 font-medium text-sm flex items-center gap-1 ml-auto">
                        View products <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
