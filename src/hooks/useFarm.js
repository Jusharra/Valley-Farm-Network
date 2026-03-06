import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Fetches a single farm by slug with its products and delivery zones
export function useFarm(slug) {
  const [farm, setFarm]                 = useState(null)
  const [products, setProducts]         = useState([])
  const [deliveryZones, setDeliveryZones] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)

      try {
        const { data: farmData, error: farmError } = await supabase
          .from('farms')
          .select('*, farm_addresses (*)')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (farmError) throw farmError

        const [{ data: productsData }, { data: zonesData }] = await Promise.all([
          supabase
            .from('products')
            .select('*, categories (name, slug, color_hex, icon_name)')
            .eq('farm_id', farmData.id)
            .eq('is_active', true)
            .order('created_at'),
          supabase
            .from('delivery_zones')
            .select('*')
            .eq('farm_id', farmData.id)
            .eq('is_active', true),
        ])

        if (!cancelled) {
          setFarm(farmData)
          setProducts(productsData ?? [])
          setDeliveryZones(zonesData ?? [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [slug])

  return { farm, products, deliveryZones, loading, error }
}
