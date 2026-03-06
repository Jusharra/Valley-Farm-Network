import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Check } from 'lucide-react'
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

function NotificationToast() {
  const { notification } = useCart()
  if (!notification) return null
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
      <Check className="w-5 h-5" />
      {notification}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <NotificationToast />
          <Routes>
            {/* Public */}
            <Route path="/"               element={<HomePage />} />
            <Route path="/farms/:slug"    element={<FarmPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />

            {/* Auth */}
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />

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
