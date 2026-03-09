import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Leaf, Truck, ShoppingBag, UserCircle } from 'lucide-react'
import { useFarms } from '../../hooks/useFarms'
import { useCategories } from '../../hooks/useCategories'
import { useAuth } from '../../context/AuthContext'
import { ICON_MAP } from '../../lib/icons'
import { styles } from '../../lib/styles'

function formatDistance(miles) {
  if (miles < 1) return '< 1 mile away'
  if (miles === 1.0) return '1 mile away'
  return `${miles} miles away`
}

function FarmCardSkeleton() {
  return (
    <div className="bg-white/80 rounded-2xl overflow-hidden border border-stone-200/50 animate-pulse">
      <div className="h-48 bg-stone-200" />
      <div className="p-5 space-y-2">
        <div className="h-4 bg-stone-200 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { profile } = useAuth()
  const { farms, loading: farmsLoading, userLocation } = useFarms()
  const { farms: featuredFarms, loading: featuredLoading } = useFarms({ featured: true })
  const { categories, loading: catsLoading } = useCategories()

  const filtered = searchQuery.trim()
    ? farms.filter(f =>
        f.farm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : farms

  return (
    <div className={styles.pageBackground}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
          {/* Nav */}
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
                Valley Farm Network
              </span>
            </div>
            <div className="flex items-center gap-4">
              {profile ? (
                <>
                  <button
                    onClick={() => {
                      const dest = { admin: '/admin', farmer: '/dashboard', driver: '/driver' }[profile.role] ?? '/account'
                      navigate(dest)
                    }}
                    className="flex items-center gap-2 text-stone-600 hover:text-green-700 font-medium transition-colors"
                  >
                    <UserCircle className="w-5 h-5" />
                    {profile.role === 'customer' ? 'My Account' : 'My Dashboard'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/signup?role=farmer')}
                    className="text-stone-600 hover:text-green-700 font-medium transition-colors"
                  >
                    Sell on Valley Farm Network
                  </button>
                  <button onClick={() => navigate('/signin')} className={styles.buttonSecondary}>
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Hero content */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-stone-800 mb-6 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Fresh food,
              <span className="text-green-700"> directly</span> from
              <br />local farms
            </h1>
            <p className="text-xl text-stone-600 mb-10 leading-relaxed">
              Skip the supermarket. Get eggs, vegetables, and more delivered
              straight from farms in Kern County. Subscribe weekly or order when you need it.
            </p>

            <div className="relative max-w-xl mx-auto mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search farms or products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-stone-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none text-lg bg-white/90 backdrop-blur-sm shadow-lg"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-stone-500">
              <MapPin className="w-4 h-4" />
              <span>
                {userLocation
                  ? 'Showing farms near you'
                  : 'Delivering to Bakersfield and surrounding areas'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-stone-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          Browse by category
        </h2>

        {catsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 animate-pulse">
                <div className="w-14 h-14 bg-stone-200 rounded-xl mb-3 mx-auto" />
                <div className="h-3 bg-stone-100 rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(cat => {
              const Icon = ICON_MAP[cat.icon_name] ?? Leaf
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-stone-100 hover:border-green-300 transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${cat.color_hex}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: cat.color_hex }} />
                  </div>
                  <span className="font-semibold text-stone-700">{cat.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Featured Farms */}
      {(featuredLoading || featuredFarms.length > 0) && (
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
              Featured farms
            </h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              Editor's picks
            </span>
          </div>

          {featuredLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <FarmCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredFarms.map(farm => {
                const addr = farm.farm_addresses?.[0]
                return (
                  <button
                    key={farm.id}
                    onClick={() => navigate(`/farms/${farm.slug}`)}
                    className="group text-left bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-amber-200/60 hover:border-amber-300 hover:shadow-xl transition-all hover:-translate-y-1"
                  >
                    <div className="relative h-48 overflow-hidden">
                      {farm.banner_url ? (
                        <img
                          src={farm.banner_url}
                          alt={farm.farm_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-green-100" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                        Featured
                      </div>
                      <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white/90 text-sm">
                        <MapPin className="w-3.5 h-3.5" />
                        {addr?.city}{addr?.state ? `, ${addr.state}` : ''}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-stone-800">{farm.farm_name}</h3>
                        {farm.is_verified && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-stone-500 text-sm">{farm.tagline}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Local Farms */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
            {userLocation ? 'Farms near you' : 'Local farms'}
          </h2>
          {!farmsLoading && (
            <span className="text-stone-400 text-sm">{filtered.length} farm{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {farmsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <FarmCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">No farms found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(farm => {
              const addr = farm.farm_addresses?.[0]
              return (
                <button
                  key={farm.id}
                  onClick={() => navigate(`/farms/${farm.slug}`)}
                  className="group text-left bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-stone-200/50 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden">
                    {farm.banner_url ? (
                      <img
                        src={farm.banner_url}
                        alt={farm.farm_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-amber-100" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-white/90 text-sm">
                        <MapPin className="w-3.5 h-3.5" />
                        {addr?.city}{addr?.state ? `, ${addr.state}` : ''}
                      </div>
                      {farm.distance_miles != null && (
                        <span className="bg-black/40 text-white text-xs px-2 py-1 rounded-full">
                          {formatDistance(farm.distance_miles)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-stone-800">{farm.farm_name}</h3>
                      {farm.is_verified && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm">{farm.tagline}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-green-800 to-green-700 py-20 mt-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12" style={{ fontFamily: 'Georgia, serif' }}>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search,      title: 'Browse local farms',  desc: "Explore farms in your area and see what's fresh this week" },
              { icon: ShoppingBag, title: 'Subscribe or order',  desc: 'Get weekly deliveries or order when you need it' },
              { icon: Truck,       title: 'We deliver',          desc: 'Fresh food arrives at your door, or pick up at the farm' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-green-100">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Buy From Local Farms */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-green-700 font-semibold text-sm uppercase tracking-wider mb-3">Why local?</p>
            <h2 className="text-3xl font-bold text-stone-800 mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Fresh Food, Straight From the Source
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Most grocery store food travels hundreds of miles and can sit for weeks before reaching shelves.
              Valley Farm Network connects you directly with local farms so you can enjoy food that's harvested fresh.
            </p>
            <ul className="space-y-3">
              {['Fresher eggs and produce', 'Support local farms', 'Know where your food comes from'].map(item => (
                <li key={item} className="flex items-center gap-3 text-stone-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { emoji: '🌱', label: 'Grown locally' },
              { emoji: '🚜', label: 'Direct from farmers' },
              { emoji: '📅', label: 'Harvested fresh' },
              { emoji: '❤️', label: 'Community supported' },
            ].map(({ emoji, label }) => (
              <div key={label} className="bg-gradient-to-br from-green-50 to-amber-50 rounded-2xl p-6 text-center border border-stone-100">
                <div className="text-4xl mb-2">{emoji}</div>
                <p className="text-stone-700 font-medium text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What You'll Find */}
      <div className="bg-stone-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-green-700 font-semibold text-sm uppercase tracking-wider mb-3">Products</p>
            <h2 className="text-3xl font-bold text-stone-800 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Fresh From Central Valley Farms
            </h2>
            <p className="text-stone-600">
              Browse a variety of products grown and raised by local farmers.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { emoji: '🥚', label: 'Farm Fresh Eggs' },
              { emoji: '🥬', label: 'Microgreens' },
              { emoji: '🥕', label: 'Seasonal Vegetables' },
              { emoji: '🍯', label: 'Raw Honey' },
              { emoji: '🐟', label: 'Farm Raised Fish' },
              { emoji: '🍤', label: 'Fresh Shrimp' },
            ].map(({ emoji, label }) => (
              <div key={label} className="bg-white rounded-2xl p-5 text-center border border-stone-200 hover:border-green-300 hover:shadow-md transition-all">
                <div className="text-4xl mb-2">{emoji}</div>
                <p className="text-stone-700 font-medium text-sm">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-stone-400 text-sm">Products vary by farm and season.</p>
        </div>
      </div>

      {/* Farm Subscriptions */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-3xl p-10 md:p-14">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-green-200 font-semibold text-sm uppercase tracking-wider mb-3">Subscriptions</p>
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Make Fresh Food Part of Your Routine
              </h2>
              <p className="text-green-100 mb-6 leading-relaxed">
                Many farms offer subscriptions so you can receive fresh food every week.
              </p>
              <ul className="space-y-3 mb-8">
                {['Weekly egg deliveries', 'Seasonal produce boxes', 'Farm pickup or delivery options'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-green-50">
                    <span className="w-6 h-6 bg-white/15 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-green-200 text-sm">Subscribe once and enjoy fresh food regularly.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { title: 'Weekly Eggs', desc: 'A dozen farm-fresh eggs every week', icon: '🥚' },
                { title: 'Produce Box', desc: 'Seasonal vegetables picked fresh', icon: '🥕' },
                { title: 'Honey Club', desc: 'Raw local honey delivered monthly', icon: '🍯' },
              ].map(({ title, desc, icon }) => (
                <div key={title} className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-3xl shrink-0">{icon}</div>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-green-200 text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real Farms, Real Food */}
      <div className="bg-amber-50 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🌾</div>
          <h2 className="text-3xl font-bold text-stone-800 mb-5" style={{ fontFamily: 'Georgia, serif' }}>
            Real Farms, Real Food
          </h2>
          <p className="text-stone-600 text-lg leading-relaxed mb-4">
            Valley Farm Network connects customers across the Central Valley with farmers who grow and raise food with care.
            Every product comes directly from a real farm in your region.
          </p>
          <p className="text-stone-500 leading-relaxed">
            Support local farms while enjoying food that's fresh, simple, and close to home.
          </p>
        </div>
      </div>

      {/* Start Exploring CTA */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-10 md:p-16 text-center">
          <p className="text-green-700 font-semibold text-sm uppercase tracking-wider mb-3">Get started</p>
          <h2 className="text-3xl font-bold text-stone-800 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Find Fresh Food Near You
          </h2>
          <p className="text-stone-500 text-lg mb-8 max-w-xl mx-auto">
            Browse farms in the Central Valley and see what's available this week.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-green-700 hover:bg-green-600 text-white font-semibold px-8 py-3.5 rounded-2xl transition-colors shadow-md hover:shadow-lg"
            >
              Browse Farms
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-8 py-3.5 rounded-2xl transition-colors"
            >
              Create an Account
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-stone-100 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-stone-500">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-stone-700" style={{ fontFamily: 'Georgia, serif' }}>
              Valley Farm Network
            </span>
          </div>
          <p>© 2026 Valley Farm Network. Supporting local farms in Bakersfield and beyond.</p>
        </div>
      </footer>
    </div>
  )
}
