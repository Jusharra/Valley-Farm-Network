import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, BarChart3, Store, Package, ShoppingBag, Users, Truck, Settings, Plus, DollarSign } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { FARMS } from '../../lib/mockData'
import { styles } from '../../lib/styles'

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3  },
  { id: 'farms',        label: 'Farms',        icon: Store      },
  { id: 'products',     label: 'Products',     icon: Package    },
  { id: 'orders',       label: 'Orders',       icon: ShoppingBag },
  { id: 'subscribers',  label: 'Subscribers',  icon: Users      },
  { id: 'drivers',      label: 'Drivers',      icon: Truck      },
  { id: 'settings',     label: 'Settings',     icon: Settings   },
]

const STATS = [
  { label: 'Total Farms',         value: 4,       icon: Store,       color: 'green'  },
  { label: 'Active Subscribers',  value: 47,      icon: Users,       color: 'blue'   },
  { label: "This Week's Revenue", value: '$1,284', icon: DollarSign,  color: 'amber'  },
  { label: 'Pending Orders',      value: 23,      icon: Package,     color: 'purple' },
]

const RECENT_ORDERS = [
  { id: 'ORD-001', customer: 'Sarah M.',  items: '1 dozen eggs, microgreens', total: 16, status: 'delivered'  },
  { id: 'ORD-002', customer: 'James K.',  items: '2 dozen eggs',              total: 16, status: 'in-transit' },
  { id: 'ORD-003', customer: 'Maria G.',  items: 'Honey, microgreens mix',    total: 22, status: 'preparing'  },
]

const STATUS_STYLES = {
  delivered:  'bg-green-100 text-green-700',
  'in-transit': 'bg-blue-100 text-blue-700',
  preparing:  'bg-amber-100 text-amber-700',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-stone-800">Kern Harvest</span>
            <span className="block text-xs text-stone-400">Admin Panel</span>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-green-50 text-green-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full text-stone-500 hover:text-green-700 text-sm font-medium transition-colors"
          >
            ← Back to marketplace
          </button>
          <button
            onClick={signOut}
            className="w-full text-stone-400 hover:text-red-600 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                {activeTab === 'overview' ? 'Dashboard Overview' : NAV_ITEMS.find(i => i.id === activeTab)?.label}
              </h1>
              <p className="text-stone-500">Welcome back, {profile?.full_name ?? 'Admin'}</p>
            </div>
            <button className={styles.buttonPrimary}>
              <Plus className="w-4 h-4 inline mr-2" />
              Add {activeTab === 'farms' ? 'Farm' : activeTab === 'products' ? 'Product' : 'New'}
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {STATS.map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200">
                    <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <p className="text-3xl font-bold text-stone-800 mb-1">{stat.value}</p>
                    <p className="text-stone-500 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                  <h2 className="font-bold text-stone-800">Recent Orders</h2>
                </div>
                <div className="divide-y divide-stone-100">
                  {RECENT_ORDERS.map(order => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-stone-800">{order.id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-stone-500 text-sm">{order.customer} • {order.items}</p>
                      </div>
                      <span className="font-bold text-stone-800">${order.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'farms' && (
            <div className="grid md:grid-cols-2 gap-4">
              {FARMS.map(farm => (
                <div key={farm.id} className="bg-white rounded-2xl border border-stone-200 p-6 flex gap-4">
                  <img src={farm.image} alt={farm.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800">{farm.name}</h3>
                    <p className="text-stone-500 text-sm mb-2">{farm.products.length} products</p>
                    <div className="flex gap-2">
                      <button className="text-green-700 text-sm font-medium hover:underline">Edit</button>
                      <button
                        onClick={() => navigate(`/farms/${farm.id}`)}
                        className="text-stone-400 text-sm font-medium hover:underline"
                      >
                        View page
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <Truck className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <h3 className="font-bold text-stone-800 mb-2">Driver Network</h3>
              <p className="text-stone-500 mb-6">Manage delivery partners for your marketplace</p>
              <button className={styles.buttonPrimary}>
                <Plus className="w-4 h-4 inline mr-2" />
                Add Driver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
