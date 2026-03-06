import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Leaf, Egg, Fish, Apple, Carrot, Heart, ArrowRight } from 'lucide-react'
import { FARMS, CATEGORIES } from '../../lib/mockData'
import { styles } from '../../lib/styles'

const CATEGORY_ICONS = { eggs: Egg, vegetables: Carrot, microgreens: Leaf, honey: Heart, seafood: Fish, fruit: Apple }

export default function CategoryPage() {
  const { slug }  = useParams()
  const navigate   = useNavigate()

  const category = CATEGORIES.find(c => c.id === slug)
  const farms    = FARMS.filter(f => f.categories.includes(slug))
  const Icon     = CATEGORY_ICONS[slug] ?? Leaf

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
                style={{ backgroundColor: `${category.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: category.color }} />
              </div>
              <h1 className="text-xl font-bold text-stone-800">{category.name}</h1>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-stone-600 mb-8">
          {farms.length} {farms.length === 1 ? 'farm' : 'farms'} selling {category?.name.toLowerCase()}
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map(farm => (
            <button
              key={farm.id}
              onClick={() => navigate(`/farms/${farm.id}`)}
              className="group text-left bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-stone-200/50 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={farm.image}
                  alt={farm.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-stone-800 mb-1">{farm.name}</h3>
                <p className="text-stone-500 text-sm mb-2">{farm.tagline}</p>
                <div className="flex items-center justify-between">
                  <span className="text-amber-500 font-semibold">★ {farm.rating}</span>
                  <span className="text-green-700 font-medium text-sm flex items-center gap-1">
                    View products <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
