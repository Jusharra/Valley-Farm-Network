import { createContext, useContext, useState } from 'react'

const CartContext = createContext({})

export function CartProvider({ children }) {
  const [items, setItems]               = useState([])
  const [notification, setNotification] = useState(null)

  function addToCart(farmId, product, farmName = '') {
    setItems(prev => {
      const idx = prev.findIndex(i => i.farmId === farmId && i.product.id === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
        return next
      }
      return [...prev, { farmId, farmName, product, quantity: 1 }]
    })
    setNotification(`Added ${product.name} to cart`)
    setTimeout(() => setNotification(null), 2500)
  }

  function updateQuantity(index, qty) {
    if (qty <= 0) {
      setItems(prev => prev.filter((_, i) => i !== index))
    } else {
      setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item))
    }
  }

  function removeFromCart(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, total, addToCart, updateQuantity, removeFromCart, clearCart, notification }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
