import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders(farmId) {
  const [orders, setOrders]             = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!farmId) { setLoading(false); return }

    Promise.all([
      supabase
        .from('orders')
        .select('*, order_items(*, products(name, unit_name)), profiles(full_name)')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('customer_subscriptions')
        .select('id, status, next_billing_date, created_at, profiles(full_name, email), subscription_plans(name, price, billing_interval)')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false }),
    ]).then(([ordersR, subsR]) => {
      setOrders(ordersR.data ?? [])
      setSubscriptions(subsR.data ?? [])
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

  return { orders, subscriptions, loading, updateOrderStatus }
}
