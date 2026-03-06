import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Leaf, Egg, Fish, Apple, Carrot, Heart, ArrowRight, Truck, ShoppingBag } from 'lucide-react'
import { FARMS, CATEGORIES } from '../../lib/mockData'
import { styles } from '../../lib/styles'

const CATEGORY_ICONS = { eggs: Egg, vegetables: Carrot, microgreens: Leaf, honey: Heart, seafood: Fish, fruit: Apple }

export default function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const featuredFarms = FARMS.filter(f => f.featured)

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
                Kern Harvest
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-stone-600 hover:text-green-700 font-medium transition-colors"
              >
                Farmers
              </button>
              <button
                onClick={() => navigate('/signin')}
                className={styles.buttonSecondary}
              >
                Sign In
              </button>
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
              <span>Delivering to Bakersfield and surrounding areas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-stone-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          Browse by category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat.id] ?? Leaf
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.id}`)}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-stone-100 hover:border-green-300 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <Icon className="w-7 h-7" style={{ color: cat.color }} />
                </div>
                <span className="font-semibold text-stone-700">{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Featured farms */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
            Featured farms
          </h2>
          <button className="text-green-700 font-semibold hover:text-green-800 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredFarms.map(farm => (
            <button
              key={farm.id}
              onClick={() => navigate(`/farms/${farm.id}`)}
              className="group text-left bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-stone-200/50 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={farm.image}
                  alt={farm.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-1 text-white/90 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {farm.location}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-stone-800 mb-1">{farm.name}</h3>
                <p className="text-stone-500 text-sm mb-3">{farm.tagline}</p>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-semibold">★ {farm.rating}</span>
                  <span className="text-stone-400 text-sm">({farm.reviews} reviews)</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-green-800 to-green-700 py-20 mt-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12" style={{ fontFamily: 'Georgia, serif' }}>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search,      title: 'Browse local farms',   desc: "Explore farms in your area and see what's fresh this week" },
              { icon: ShoppingBag, title: 'Subscribe or order',   desc: 'Get weekly deliveries or order when you need it' },
              { icon: Truck,       title: 'We deliver',           desc: 'Fresh food arrives at your door, or pick up at the farm' },
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

      {/* Footer */}
      <footer className="bg-stone-100 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-stone-500">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-stone-700" style={{ fontFamily: 'Georgia, serif' }}>
              Kern Harvest
            </span>
          </div>
          <p>© 2026 Kern Harvest. Supporting local farms in Bakersfield and beyond.</p>
        </div>
      </footer>
    </div>
  )
}
