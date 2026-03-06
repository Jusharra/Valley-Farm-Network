import { createContext, useContext, useState } from 'react'

const CartContext = createContext({})

export function CartProvider({ children }) {
  const [items, setItems]             = useState([])
  const [notification, setNotification] = useState(null)

  function addToCart(farmId, product) {
    setItems(prev => [...prev, { farmId, product, quantity: 1 }])
    setNotification(`Added ${product.name} to cart`)
    setTimeout(() => setNotification(null), 2500)
  }

  function removeFromCart(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, total, addToCart, removeFromCart, clearCart, notification }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
