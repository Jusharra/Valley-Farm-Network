import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders(farmId) {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!farmId) { setLoading(false); return }

    supabase
      .from('orders')
      .select(`
        *,
        order_items(*, products(name, unit_name)),
        profiles(full_name)
      `)
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOrders(data ?? [])
        setLoading(false)
      })
  }, [farmId])

  async function updateOrderStatus(orderId, status) {
    const { data } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single()
    if (data) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data } : o))
  }

  return { orders, loading, updateOrderStatus }
}
