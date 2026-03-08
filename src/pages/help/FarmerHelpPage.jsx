import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Leaf, ChevronDown, ChevronUp, Check, ExternalLink,
  CreditCard, Package, ShoppingBag, Truck, Star,
  BookOpen, Mail, HelpCircle, ArrowLeft, AlertCircle,
} from 'lucide-react'

const SUPPORT_EMAIL = 'support@valleyfarmnetwork.com'

// ── Accordion item ────────────────────────────────────────────────────────────
function Accordion({ question, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="font-medium text-stone-800 text-sm">{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-stone-600 space-y-2 border-t border-stone-100 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Step row ──────────────────────────────────────────────────────────────────
function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 pb-6">
        <p className="font-semibold text-stone-800 mb-1">{title}</p>
        <div className="text-sm text-stone-600 space-y-1">{children}</div>
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, icon: Icon, title, subtitle, children }) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-green-700" />
        </div>
        <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      </div>
      {subtitle && <p className="text-stone-500 text-sm mb-5 ml-12">{subtitle}</p>}
      <div className="ml-0">{children}</div>
    </section>
  )
}

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ name, color }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${color}`}>
      {name}
    </span>
  )
}

const NAV_ITEMS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'plans',           label: 'Plans & Billing' },
  { id: 'payments',        label: 'Payment Setup' },
  { id: 'products',        label: 'Products' },
  { id: 'orders',          label: 'Managing Orders' },
  { id: 'delivery',        label: 'Delivery (Seed+)' },
  { id: 'faq',             label: 'FAQ' },
  { id: 'support',         label: 'Contact Support' },
]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FarmerHelpPage() {
  const [form, setForm]         = useState({ name: '', email: '', subject: 'General Question', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const topRef = useRef(null)

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    )
    const sub  = encodeURIComponent(`[Support] ${form.subject}`)
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${sub}&body=${body}`
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-stone-800 text-lg">Valley Farm Network</span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-500 text-sm">Farmer Help Center</span>
          <div className="ml-auto">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-10" ref={topRef}>

        {/* Sidebar nav */}
        <aside className="w-52 shrink-0 hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">On this page</p>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="w-full text-left text-sm text-stone-600 hover:text-green-700 py-1.5 px-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 space-y-14 min-w-0">

          {/* Hero */}
          <div>
            <h1 className="text-3xl font-bold text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              Farmer Help Center
            </h1>
            <p className="text-stone-500">
              Everything you need to set up your farm, accept payments, and start selling on Valley Farm Network.
            </p>
          </div>

          {/* ── Getting Started ── */}
          <Section id="getting-started" icon={BookOpen} title="Getting Started"
            subtitle="New to Valley Farm Network? Here's how to get your farm up and running.">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-0 divide-y divide-stone-100">
              <Step n="1" title="Create your account">
                <p>Sign up at <strong>/signup</strong> and choose <strong>Farmer</strong> as your role. You'll need a valid email address — use the same one you'll associate with Stripe later.</p>
              </Step>
              <div className="pt-6">
              <Step n="2" title="Choose a subscription plan">
                <p>After signing in, go to your dashboard and open the <strong>Subscription</strong> tab. Pick the plan that fits your needs. You can upgrade at any time.</p>
                <p>First-time listings on the <strong>Garden Plot</strong> plan require a one-time $25 setup fee.</p>
              </Step>
              </div>
              <div className="pt-6">
              <Step n="3" title="Complete your farm profile">
                <p>Open the <strong>Profile</strong> tab. Fill in your farm name, description, tagline, and upload a banner photo. A complete profile increases buyer trust and search visibility.</p>
              </Step>
              </div>
              <div className="pt-6">
              <Step n="4" title="Connect Stripe to accept payments">
                <p>Go to the <strong>Subscription</strong> tab and click <strong>Connect Stripe</strong>. Follow the prompts to create or connect your Stripe Express account. You won't receive payouts until this step is complete.</p>
                <p className="text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Customers see a warning banner on your storefront if Stripe is not yet connected. Connect it before sharing your store link.
                </p>
              </Step>
              </div>
              <div className="pt-6">
              <Step n="5" title="Add your first products">
                <p>Open the <strong>Products</strong> tab and click <strong>Add Product</strong>. Set a name, description, price, unit, and category. Toggle <strong>Active</strong> to make it visible to buyers.</p>
              </Step>
              </div>
            </div>
          </Section>

          {/* ── Plans ── */}
          <Section id="plans" icon={Star} title="Plans & Billing"
            subtitle="Valley Farm Network offers four tiers. You can upgrade at any time from the Subscription tab.">
            <div className="space-y-3">
              {[
                {
                  name: 'Garden Plot Listing', price: '$25 one-time', badge: 'bg-stone-100 text-stone-600',
                  features: ['Storefront page', 'Up to 10 products', 'Marketplace visibility', 'Shareable link & QR code', 'Basic analytics'],
                },
                {
                  name: 'Seed Listing', price: '$39/month', badge: 'bg-green-100 text-green-700',
                  features: ['Everything in Garden Plot', 'Up to 20 products', 'Delivery zone management', 'One-time product sales', 'Ticket support'],
                },
                {
                  name: 'Growth Subscription', price: '$79/month', badge: 'bg-blue-100 text-blue-700',
                  features: ['Everything in Seed', 'Recurring product subscriptions', 'Up to 40 products', 'Customer list export'],
                },
                {
                  name: 'Network Pro', price: '$129/month', badge: 'bg-purple-100 text-purple-700',
                  features: ['Everything in Growth', '60 products', 'Driver network — post delivery jobs', 'Multiple staff users', 'Featured marketplace placement'],
                },
              ].map(plan => (
                <div key={plan.name} className="bg-white rounded-2xl border border-stone-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${plan.badge}`}>{plan.name}</span>
                    <span className="text-stone-500 text-sm">{plan.price}</span>
                  </div>
                  <ul className="space-y-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-stone-600">
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-stone-50 rounded-2xl border border-stone-200 p-5 text-sm text-stone-600 space-y-2">
              <p><strong>Upgrading:</strong> Go to <strong>Subscription → Upgrade Plan</strong>. Your new features are available immediately after payment.</p>
              <p><strong>Cancelling:</strong> You can cancel at any time from the Stripe billing portal (Subscription tab → <em>Manage billing</em>). Access continues until the end of your billing period.</p>
              <p><strong>Refunds:</strong> Contact support within 7 days of a charge if you believe it was made in error.</p>
            </div>
          </Section>

          {/* ── Payments ── */}
          <Section id="payments" icon={CreditCard} title="Setting Up Payments (Stripe Connect)"
            subtitle="Stripe Connect lets Valley Farm Network transfer your earnings directly to your bank account.">

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-amber-800">
                <strong>Required before you can receive payouts.</strong> Orders will still be placed, but funds stay in escrow until your Stripe account is fully verified.
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-0 divide-y divide-stone-100">
              <Step n="1" title="Open the Subscription tab">
                <p>From your farmer dashboard, click <strong>Subscription</strong> in the left navigation.</p>
              </Step>
              <div className="pt-6">
              <Step n="2" title='Click "Connect Stripe"'>
                <p>You'll be redirected to Stripe's secure onboarding flow. This takes 3–5 minutes.</p>
              </Step>
              </div>
              <div className="pt-6">
              <Step n="3" title="Provide business details">
                <p>Stripe will ask for your legal name, date of birth, address, and bank account details. You may also need to upload a government-issued ID for identity verification.</p>
                <p>You can use <strong>Individual</strong> business type if you are a sole proprietor.</p>
              </Step>
              </div>
              <div className="pt-6">
              <Step n="4" title="Complete verification">
                <p>Once Stripe verifies your information, your dashboard will show <strong>Charges Enabled</strong>. Payouts are typically initiated within 2 business days of each order.</p>
              </Step>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <Accordion question="How long does Stripe verification take?">
                <p>Most accounts are verified within a few minutes. In some cases Stripe may request additional documents, which can take 1–2 business days.</p>
              </Accordion>
              <Accordion question="What does Valley Farm Network keep as a platform fee?">
                <p>Currently $0 platform fee during our launch period. You keep 100% of what customers pay (minus Stripe's processing fee of ~2.9% + $0.30 per transaction).</p>
              </Accordion>
              <Accordion question="When do I get paid?">
                <p>When a customer completes checkout, Stripe immediately transfers your share to your connected account. Payouts to your bank account typically take 2 business days depending on your bank.</p>
              </Accordion>
              <Accordion question="My storefront shows a warning about payment. What does that mean?">
                <p>Customers see a notice that your farm's payment account isn't active yet. This happens when Stripe Connect hasn't been completed. Go to <strong>Subscription → Connect Stripe</strong> to resolve it.</p>
              </Accordion>
            </div>
          </Section>

          {/* ── Products ── */}
          <Section id="products" icon={Package} title="Managing Products"
            subtitle="Products are what customers browse and add to their cart.">
            <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
              {[
                { title: 'Adding a product', body: 'Go to Products → Add Product. Fill in the name, description, price, unit (e.g. lb, dozen, each), category, and available stock. Toggle Active when it\'s ready to sell.' },
                { title: 'Product types', body: 'One-time products are purchased outright. Subscription products (Growth+ plans) let customers subscribe to weekly or monthly recurring deliveries.' },
                { title: 'Setting stock quantity', body: 'Enter a stock quantity to cap purchases. Leave it blank for unlimited. Stock is decremented automatically as orders are placed.' },
                { title: 'Uploading a product image', body: 'Click the camera icon when editing a product. Images are stored in Supabase Storage and served via a public CDN URL.' },
                { title: 'Deactivating a product', body: 'Toggle the Active switch off to hide a product from your storefront without deleting it. This is useful for seasonal items.' },
                { title: 'Plan limits', body: 'Garden Plot: 10 products. Seed: 20. Growth: 40. Network Pro: 60. Attempting to add more than your limit will show an error — upgrade your plan to continue.' },
              ].map(item => (
                <div key={item.title} className="px-5 py-4">
                  <p className="font-semibold text-stone-800 text-sm mb-1">{item.title}</p>
                  <p className="text-stone-500 text-sm">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Orders ── */}
          <Section id="orders" icon={ShoppingBag} title="Managing Orders"
            subtitle="Track and advance orders from your Orders tab.">

            <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
              <p className="text-sm font-semibold text-stone-700 mb-3">Order status workflow</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: 'New',               color: 'bg-stone-100 text-stone-500' },
                  { label: '→' },
                  { label: 'Paid',              color: 'bg-blue-100 text-blue-700' },
                  { label: '→' },
                  { label: 'Preparing',         color: 'bg-amber-100 text-amber-700' },
                  { label: '→' },
                  { label: 'Out for Delivery',  color: 'bg-purple-100 text-purple-700' },
                  { label: '→' },
                  { label: 'Delivered',         color: 'bg-green-100 text-green-700' },
                ].map((s, i) => (
                  s.color
                    ? <span key={i} className={`px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    : <span key={i} className="text-stone-300 font-bold">{s.label}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
              {[
                { title: 'New orders', body: 'Orders start as "New" when a customer submits payment. They automatically advance to "Paid" once Stripe confirms the charge (usually seconds).' },
                { title: 'Advancing an order', body: 'Click the action button on an order card — "Mark Preparing", "Mark Out for Delivery", or "Mark Delivered" — to move it forward. Each step sends a notification to the customer.' },
                { title: 'Filtering orders', body: 'Use the filter pills at the top of the Orders tab to view New, Paid, Preparing, Out for Delivery, Delivered, or Cancelled orders.' },
                { title: 'Cancelling an order', body: 'To cancel an order, contact the customer first, then update the order status to Cancelled. For refunds, log in to your Stripe dashboard and issue a refund from there.' },
                { title: 'Delivery orders', body: 'Orders with a scheduled delivery date show the date and window on the order card. You can also manage these from the Delivery → Routes sub-tab.' },
              ].map(item => (
                <div key={item.title} className="px-5 py-4">
                  <p className="font-semibold text-stone-800 text-sm mb-1">{item.title}</p>
                  <p className="text-stone-500 text-sm">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Delivery ── */}
          <Section id="delivery" icon={Truck} title="Delivery Management"
            subtitle={<>Available on <PlanBadge name="Seed" color="bg-green-100 text-green-700" />, <PlanBadge name="Growth" color="bg-blue-100 text-blue-700" />, and <PlanBadge name="Network Pro" color="bg-purple-100 text-purple-700" /> plans.</>}>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <p className="font-semibold text-stone-800 mb-1 text-sm">Delivery Zones</p>
                <p className="text-stone-500 text-sm mb-3">Zones define which ZIP codes you deliver to and what fee to charge for each.</p>
                <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
                  <li>Go to <strong>Delivery → Zones</strong>.</li>
                  <li>Toggle <strong>Offer Delivery</strong> on.</li>
                  <li>Enter a ZIP code, delivery fee, and optional minimum order amount, then click Add Zone.</li>
                  <li>Repeat for each ZIP code you serve.</li>
                </ol>
                <p className="mt-3 text-xs text-stone-400">Customers outside your listed ZIP codes will see a warning and won't be able to check out with delivery.</p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <p className="font-semibold text-stone-800 mb-1 text-sm">Delivery Schedules</p>
                <p className="text-stone-500 text-sm mb-3">Set which days and time windows you offer delivery. Customers pick an available slot at checkout.</p>
                <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
                  <li>Go to <strong>Delivery → Schedule</strong>.</li>
                  <li>Select a day of the week (e.g. Wednesday).</li>
                  <li>Enter a time window (e.g. <code className="bg-stone-100 px-1 rounded">9am–12pm</code>).</li>
                  <li>Click Add Schedule. Add as many day/window combinations as you want.</li>
                </ol>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <p className="font-semibold text-stone-800 mb-1 text-sm">Route View</p>
                <p className="text-stone-500 text-sm mb-3">The Routes sub-tab groups active delivery orders by date and ZIP code to help you plan your route.</p>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /><span>Orders are grouped by <strong>delivery date → ZIP code</strong>.</span></li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /><span>Click an order to expand it and advance its status.</span></li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /><span><strong>Network Pro:</strong> Post a Driver Job from the Routes view to broadcast the route to approved drivers in your area.</span></li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <p className="font-semibold text-stone-800 mb-2 text-sm flex items-center gap-2">
                  Driver Network
                  <PlanBadge name="Network Pro only" color="bg-purple-100 text-purple-700" />
                </p>
                <p className="text-stone-500 text-sm mb-3">Broadcast a delivery route to vetted drivers and have them pick it up for a flat fee.</p>
                <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
                  <li>In Routes, find the delivery date group you want to outsource.</li>
                  <li>Click <strong>Post Driver Job</strong>, set a flat driver fee, and submit.</li>
                  <li>Approved drivers in the delivery area will see the job and can accept it first-come, first-served.</li>
                  <li>Once a driver accepts, their name appears on the job card. The driver fee is transferred automatically when they mark the delivery complete.</li>
                </ol>
              </div>
            </div>
          </Section>

          {/* ── FAQ ── */}
          <Section id="faq" icon={HelpCircle} title="Frequently Asked Questions">
            <div className="space-y-3">
              <Accordion question="Why does my storefront show a payment warning to customers?">
                <p>Your Stripe Connect account isn't fully set up yet. Go to <strong>Dashboard → Subscription → Connect Stripe</strong> and complete the onboarding. The warning disappears automatically once Stripe verifies your account.</p>
              </Accordion>
              <Accordion question="Can I have multiple farms on one account?">
                <p>Currently each account supports one farm. If you manage multiple farms, create a separate account for each. Multi-farm support is on our roadmap.</p>
              </Accordion>
              <Accordion question="How do I share my storefront link?">
                <p>Go to <strong>Dashboard → Overview</strong>. Your storefront URL is displayed there and can be copied or shared directly. A QR code is also available for printing.</p>
              </Accordion>
              <Accordion question="Can I offer both pickup and delivery?">
                <p>Yes. Customers choose pickup or delivery at checkout. Delivery is only offered if you have active delivery zones set up. If you haven't set up zones, only pickup will be shown.</p>
              </Accordion>
              <Accordion question="How do product subscriptions work?">
                <p>On Growth+ plans, you can create Subscription-type products. Customers subscribe and are billed automatically each month or week. You can view active subscribers in the <strong>Subscribers</strong> tab.</p>
              </Accordion>
              <Accordion question="What happens if a customer asks for a refund?">
                <p>Log in to your <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="text-green-700 underline">Stripe dashboard</a> and issue a refund from there. Then update the order status to Cancelled in your Valley Farm Network dashboard so your records stay in sync.</p>
              </Accordion>
              <Accordion question="I upgraded my plan but my product limit didn't change.">
                <p>Try refreshing the page. If it still shows the old limit, sign out and back in. If the issue persists, contact support — it may be a billing sync delay.</p>
              </Accordion>
              <Accordion question="How are drivers vetted?">
                <p>All drivers complete an application and background check approval process managed by Valley Farm Network admins before they can see or accept delivery jobs.</p>
              </Accordion>
            </div>
          </Section>

          {/* ── Support form ── */}
          <Section id="support" icon={Mail} title="Contact Support"
            subtitle="Can't find the answer? Send us a ticket and we'll get back to you within one business day.">

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-green-700" />
                </div>
                <h3 className="font-bold text-stone-800 text-lg mb-2">Your email client should have opened</h3>
                <p className="text-stone-500 text-sm mb-4">
                  If it didn't open automatically, email us directly at{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-green-700 underline">{SUPPORT_EMAIL}</a>.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Your name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Your email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
                  >
                    <option>General Question</option>
                    <option>Getting Started</option>
                    <option>Billing / Subscription</option>
                    <option>Stripe / Payment Setup</option>
                    <option>Products or Orders</option>
                    <option>Delivery Management</option>
                    <option>Technical Issue</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your question or issue in as much detail as possible…"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-stone-400">
                    This will open your email client pre-filled with your message. Alternatively, email{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-green-700 underline">{SUPPORT_EMAIL}</a> directly.
                  </p>
                  <button
                    type="submit"
                    className="shrink-0 flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Send ticket
                  </button>
                </div>
              </form>
            )}
          </Section>

        </main>
      </div>
    </div>
  )
}
