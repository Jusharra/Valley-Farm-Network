import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Check, ShoppingBag } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage         from './pages/public/HomePage'
import FarmPage         from './pages/public/FarmPage'
import CategoryPage     from './pages/public/CategoryPage'
import SignInPage       from './pages/auth/SignInPage'
import SignUpPage       from './pages/auth/SignUpPage'
import FarmerDashboard  from './pages/dashboard/FarmerDashboard'
import DriverDashboard  from './pages/driver/DriverDashboard'
import AdminDashboard   from './pages/admin/AdminDashboard'
import AccountPage      from './pages/customer/AccountPage'
import CheckoutPage     from './pages/checkout/CheckoutPage'
import CheckoutSuccessPage from './pages/checkout/CheckoutSuccessPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

function NotificationToast() {
  const { notification } = useCart()
  if (!notification) return null
  return (
    <div className="fixed bottom-28 right-6 z-50 bg-green-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xs">
      <Check className="w-5 h-5" />
      {notification}
    </div>
  )
}

function FloatingCartButton() {
  const { items, total } = useCart()
  const navigate = useNavigate()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (itemCount === 0) return null

  return (
    <button
      onClick={() => navigate('/checkout')}
      className="fixed bottom-6 right-6 bg-green-700 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 z-40 flex items-center gap-3"
    >
      <ShoppingBag className="w-6 h-6" />
      <div className="flex flex-col items-start">
        <span className="text-xs font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        <span className="text-sm font-bold">${total.toFixed(2)}</span>
      </div>
    </button>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <NotificationToast />
          <FloatingCartButton />
          <Routes>
            {/* Public */}
            <Route path="/"               element={<HomePage />} />
            <Route path="/farms/:slug"    element={<FarmPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />

            {/* Checkout */}
            <Route path="/checkout"        element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

            {/* Auth */}
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer account */}
            <Route path="/account" element={
              <ProtectedRoute role="customer">
                <AccountPage />
              </ProtectedRoute>
            } />

            {/* Protected dashboards */}
            <Route path="/dashboard/*" element={
              <ProtectedRoute role="farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/driver/*" element={
              <ProtectedRoute role="driver">
                <DriverDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
