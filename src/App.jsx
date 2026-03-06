import React, { useState } from 'react';
import { Search, MapPin, Leaf, Egg, Fish, Apple, Carrot, Heart, ArrowRight, ChevronLeft, Clock, Truck, Store, Users, Package, DollarSign, Plus, Settings, BarChart3, X, Check, ShoppingBag } from 'lucide-react';

// Sample data - this would come from your database
const FARMS = [
  {
    id: 'sunrise-acres',
    name: 'Sunrise Acres',
    tagline: 'Pasture-raised eggs from happy hens',
    location: 'Bakersfield, CA',
    image: 'https://images.unsplash.com/photo-1500595046743-cd271d694e30?w=600&h=400&fit=crop',
    rating: 4.9,
    reviews: 47,
    featured: true,
    categories: ['eggs'],
    about: 'Third-generation family farm raising heritage breed chickens on open pasture. Our girls roam freely, eating bugs, grass, and organic feed. You can taste the difference.',
    products: [
      { id: 1, name: 'Farm Fresh Eggs', description: 'One dozen large brown eggs', price: 8, unit: 'dozen', subscription: true },
      { id: 2, name: 'Jumbo Eggs', description: 'Extra large eggs, perfect for baking', price: 10, unit: 'dozen', subscription: true },
      { id: 3, name: 'Duck Eggs', description: 'Rich, creamy duck eggs', price: 12, unit: 'half dozen', subscription: false },
    ],
    delivery: ['Bakersfield', 'Oildale', 'Rosedale'],
    pickup: 'Saturday 8am-12pm at farm stand'
  },
  {
    id: 'green-valley-micro',
    name: 'Green Valley Microgreens',
    tagline: 'Nutrient-dense greens grown with care',
    location: 'Shafter, CA',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop',
    rating: 4.8,
    reviews: 31,
    featured: true,
    categories: ['microgreens', 'vegetables'],
    about: 'We grow over 15 varieties of microgreens in our climate-controlled greenhouse. Harvested fresh the morning of delivery for maximum nutrition and flavor.',
    products: [
      { id: 4, name: 'Microgreens Mix', description: 'Chef\'s blend of sunflower, pea, and radish', price: 8, unit: '4oz', subscription: true },
      { id: 5, name: 'Sunflower Shoots', description: 'Nutty, crunchy sunflower microgreens', price: 6, unit: '2oz', subscription: true },
      { id: 6, name: 'Spicy Mix', description: 'Radish, mustard, and arugula micros', price: 7, unit: '2oz', subscription: false },
    ],
    delivery: ['Bakersfield', 'Shafter', 'Wasco'],
    pickup: 'Wednesday & Saturday at Bako Farmer\'s Market'
  },
  {
    id: 'honey-hollow',
    name: 'Honey Hollow Apiary',
    tagline: 'Raw, unfiltered local honey',
    location: 'Arvin, CA',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=400&fit=crop',
    rating: 5.0,
    reviews: 28,
    featured: false,
    categories: ['honey'],
    about: 'Our bees forage on wildflowers, citrus, and almond blossoms across Kern County. Each batch reflects the unique terroir of our region.',
    products: [
      { id: 7, name: 'Wildflower Honey', description: 'Multi-floral raw honey', price: 14, unit: 'pint', subscription: true },
      { id: 8, name: 'Honeycomb', description: 'Pure comb straight from the hive', price: 18, unit: '12oz', subscription: false },
    ],
    delivery: ['Bakersfield', 'Arvin', 'Lamont'],
    pickup: 'By appointment'
  },
  {
    id: 'valley-aquaponics',
    name: 'Valley Aquaponics',
    tagline: 'Sustainable shrimp & greens',
    location: 'Bakersfield, CA',
    image: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=600&h=400&fit=crop',
    rating: 4.7,
    reviews: 19,
    featured: true,
    categories: ['seafood', 'vegetables'],
    about: 'Closed-loop aquaponics system raising Pacific white shrimp and leafy greens. Zero waste, zero antibiotics, incredible freshness.',
    products: [
      { id: 9, name: 'Fresh Shrimp', description: 'Live or flash-frozen, your choice', price: 18, unit: 'lb', subscription: true },
      { id: 10, name: 'Butter Lettuce', description: 'Hydroponically grown, no soil', price: 4, unit: 'head', subscription: true },
    ],
    delivery: ['Bakersfield'],
    pickup: 'Friday 4pm-7pm'
  }
];

const CATEGORIES = [
  { id: 'eggs', name: 'Eggs', icon: Egg, color: '#E8B86D' },
  { id: 'vegetables', name: 'Vegetables', icon: Carrot, color: '#7CB342' },
  { id: 'microgreens', name: 'Microgreens', icon: Leaf, color: '#43A047' },
  { id: 'honey', name: 'Honey', icon: Heart, color: '#FFB300' },
  { id: 'seafood', name: 'Seafood', icon: Fish, color: '#4FC3F7' },
  { id: 'fruit', name: 'Fruit', icon: Apple, color: '#EF5350' },
];

// Styles object for consistent theming
const styles = {
  pageBackground: 'min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-green-50',
  card: 'bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-stone-200/50',
  buttonPrimary: 'bg-gradient-to-r from-green-700 to-green-600 text-white px-6 py-3 rounded-full font-semibold hover:from-green-800 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
  buttonSecondary: 'bg-stone-100 text-stone-700 px-5 py-2.5 rounded-full font-medium hover:bg-stone-200 transition-all',
  input: 'w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all bg-white/80',
};

// Homepage Component
function Homepage({ onNavigate, onCategorySelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const featuredFarms = FARMS.filter(f => f.featured);

  return (
    <div className={styles.pageBackground}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
          {/* Logo/Header */}
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
                onClick={() => onNavigate('admin')}
                className="text-stone-600 hover:text-green-700 font-medium transition-colors"
              >
                Farmers
              </button>
              <button className={styles.buttonSecondary}>
                Sign In
              </button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 
              className="text-5xl md:text-6xl font-bold text-stone-800 mb-6 leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Fresh food,
              <span className="text-green-700"> directly</span> from
              <br />local farms
            </h1>
            <p className="text-xl text-stone-600 mb-10 leading-relaxed">
              Skip the supermarket. Get eggs, vegetables, and more delivered 
              straight from farms in Kern County. Subscribe weekly or order when you need it.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search farms or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-stone-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none text-lg bg-white/90 backdrop-blur-sm shadow-lg"
              />
            </div>

            {/* Location */}
            <div className="flex items-center justify-center gap-2 text-stone-500">
              <MapPin className="w-4 h-4" />
              <span>Delivering to Bakersfield and surrounding areas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-stone-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          Browse by category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => onCategorySelect(cat.id)}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-stone-100 hover:border-green-300 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <IconComponent className="w-7 h-7" style={{ color: cat.color }} />
                </div>
                <span className="font-semibold text-stone-700">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Farms */}
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
          {featuredFarms.map((farm) => (
            <button
              key={farm.id}
              onClick={() => onNavigate('farm', farm.id)}
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

      {/* How It Works */}
      <div className="bg-gradient-to-r from-green-800 to-green-700 py-20 mt-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12" style={{ fontFamily: 'Georgia, serif' }}>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Browse local farms', desc: 'Explore farms in your area and see what\'s fresh this week' },
              { icon: ShoppingBag, title: 'Subscribe or order', desc: 'Get weekly deliveries or order when you need it' },
              { icon: Truck, title: 'We deliver', desc: 'Fresh food arrives at your door, or pick up at the farm' },
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
  );
}

// Farm Page Component (The "Booth")
function FarmPage({ farmId, onNavigate, onAddToCart, cart }) {
  const farm = FARMS.find(f => f.id === farmId);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [subscribeMode, setSubscribeMode] = useState(false);
  
  if (!farm) return <div>Farm not found</div>;

  return (
    <div className={styles.pageBackground}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-stone-600 hover:text-green-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to market</span>
          </button>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {cart.length} items
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Farm Hero */}
      <div className="relative h-72 md:h-96">
        <img 
          src={farm.image} 
          alt={farm.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Farm Info Card */}
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
              <button className={styles.buttonSecondary}>
                Share
              </button>
              <button className={styles.buttonPrimary}>
                Subscribe
              </button>
            </div>
          </div>

          {/* About */}
          <div className="border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-800 mb-2">About the farm</h2>
            <p className="text-stone-600 leading-relaxed">{farm.about}</p>
          </div>

          {/* Fulfillment Info */}
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
            {farm.products.map((product) => (
              <div 
                key={product.id}
                className={`${styles.card} p-6 transition-all hover:shadow-xl`}
              >
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
                      onClick={() => onAddToCart(farm.id, product)}
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
  );
}

// Category View
function CategoryPage({ categoryId, onNavigate }) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  const farms = FARMS.filter(f => f.categories.includes(categoryId));

  return (
    <div className={styles.pageBackground}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-stone-600 hover:text-green-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {category && (
              <>
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <category.icon className="w-5 h-5" style={{ color: category.color }} />
                </div>
                <h1 className="text-xl font-bold text-stone-800">{category.name}</h1>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-stone-600 mb-8">{farms.length} farms selling {category?.name.toLowerCase()}</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <button
              key={farm.id}
              onClick={() => onNavigate('farm', farm.id)}
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
  );
}

// Admin Dashboard
function AdminDashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock data for dashboard
  const stats = {
    farms: 4,
    products: 10,
    subscribers: 47,
    revenue: 1284,
    orders: 23,
    drivers: 2
  };

  const recentOrders = [
    { id: 'ORD-001', customer: 'Sarah M.', items: '1 dozen eggs, microgreens', total: 16, status: 'delivered' },
    { id: 'ORD-002', customer: 'James K.', items: '2 dozen eggs', total: 16, status: 'in-transit' },
    { id: 'ORD-003', customer: 'Maria G.', items: 'Honey, microgreens mix', total: 22, status: 'preparing' },
  ];

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

        <nav className="space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'farms', label: 'Farms', icon: Store },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'subscribers', label: 'Subscribers', icon: Users },
            { id: 'drivers', label: 'Drivers', icon: Truck },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
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

        <button 
          onClick={() => onNavigate('home')}
          className="absolute bottom-6 left-6 right-6 text-stone-500 hover:text-green-700 text-sm font-medium"
        >
          ← Back to marketplace
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="text-stone-500">Manage your marketplace</p>
            </div>
            <button className={styles.buttonPrimary}>
              <Plus className="w-4 h-4 inline mr-2" />
              Add {activeTab === 'farms' ? 'Farm' : activeTab === 'products' ? 'Product' : 'New'}
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Farms', value: stats.farms, icon: Store, color: 'green' },
                  { label: 'Active Subscribers', value: stats.subscribers, icon: Users, color: 'blue' },
                  { label: 'This Week\'s Revenue', value: `$${stats.revenue}`, icon: DollarSign, color: 'amber' },
                  { label: 'Pending Orders', value: stats.orders, icon: Package, color: 'purple' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200">
                    <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                    <p className="text-3xl font-bold text-stone-800 mb-1">{stat.value}</p>
                    <p className="text-stone-500 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                  <h2 className="font-bold text-stone-800">Recent Orders</h2>
                </div>
                <div className="divide-y divide-stone-100">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-stone-800">{order.id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'in-transit' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
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
              {FARMS.map((farm) => (
                <div key={farm.id} className="bg-white rounded-2xl border border-stone-200 p-6 flex gap-4">
                  <img src={farm.image} alt={farm.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800">{farm.name}</h3>
                    <p className="text-stone-500 text-sm mb-2">{farm.products.length} products</p>
                    <div className="flex gap-2">
                      <button className="text-green-700 text-sm font-medium hover:underline">Edit</button>
                      <button className="text-stone-400 text-sm font-medium hover:underline">View page</button>
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
  );
}

// Main App Component
export default function FarmersMarketplace() {
  const [currentView, setCurrentView] = useState('home');
  const [currentFarm, setCurrentFarm] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [notification, setNotification] = useState(null);

  const handleNavigate = (view, id = null) => {
    setCurrentView(view);
    if (view === 'farm') setCurrentFarm(id);
    if (view === 'category') setCurrentCategory(id);
  };

  const handleCategorySelect = (categoryId) => {
    setCurrentCategory(categoryId);
    setCurrentView('category');
  };

  const handleAddToCart = (farmId, product) => {
    setCart([...cart, { farmId, product, quantity: 1 }]);
    setNotification(`Added ${product.name} to cart`);
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <div className="relative">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-green-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
          <Check className="w-5 h-5" />
          {notification}
        </div>
      )}

      {/* View Router */}
      {currentView === 'home' && (
        <Homepage 
          onNavigate={handleNavigate} 
          onCategorySelect={handleCategorySelect}
        />
      )}
      {currentView === 'farm' && (
        <FarmPage 
          farmId={currentFarm} 
          onNavigate={handleNavigate}
          onAddToCart={handleAddToCart}
          cart={cart}
        />
      )}
      {currentView === 'category' && (
        <CategoryPage 
          categoryId={currentCategory} 
          onNavigate={handleNavigate}
        />
      )}
      {currentView === 'admin' && (
        <AdminDashboard onNavigate={handleNavigate} />
      )}
    </div>
  );
}
