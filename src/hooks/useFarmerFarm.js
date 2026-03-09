import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Maps plan slug → max active product listings (mirrors farm_plans.max_products in the DB)
const PLAN_LIMITS = { listing: 10, seed: 20, growth: 40, pro: 60 }

// Fetches + manages the current farmer's own farm, products, and addresses
export function useFarmerFarm() {
  const [farm, setFarm]         = useState(undefined) // undefined = loading, null = no farm yet
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    // getSession reads from localStorage — avoids a server round-trip that can hang on cold start.
    // RLS on the farms table already scopes results to the authenticated user.
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('farms')
      .select('*, farm_addresses(*)')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (err) { setError(err.message); setFarm(null); setLoading(false); return }

    setFarm(data) // null if no farm exists yet

    if (data) {
      const { data: prods } = await supabase
        .from('products')
        .select('*, categories(name, color_hex, icon_name)')
        .eq('farm_id', data.id)
        .order('created_at')
      setProducts(prods ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createFarm(farmData, address) {
    const { data: { user } } = await supabase.auth.getUser()
    const base = farmData.farm_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${base}-${Date.now().toString(36)}`

    const { data, error: err } = await supabase
      .from('farms')
      .insert({ ...farmData, owner_id: user.id, slug })
      .select()
      .single()
    if (err) throw err

    if (address?.city || address?.state) {
      await supabase
        .from('farm_addresses')
        .insert({ farm_id: data.id, ...address, is_primary: true })
    }

    const { data: full } = await supabase
      .from('farms')
      .select('*, farm_addresses(*)')
      .eq('id', data.id)
      .single()
    setFarm(full)
    setProducts([])
    return full
  }

  async function updateFarm(updates) {
    const { data, error: err } = await supabase
      .from('farms')
      .update(updates)
      .eq('id', farm.id)
      .select('*, farm_addresses(*)')
      .single()
    if (err) throw err
    setFarm(data)
    return data
  }

  async function addProduct(productData) {
    const { data, error: err } = await supabase
      .from('products')
      .insert({ ...productData, farm_id: farm.id })
      .select('*, categories(name, color_hex, icon_name)')
      .single()
    if (err) throw err
    setProducts(prev => [...prev, data])
    return data
  }

  async function updateProduct(id, updates) {
    const { data, error: err } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*, categories(name, color_hex, icon_name)')
      .single()
    if (err) throw err
    setProducts(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  async function deleteProduct(id) {
    const { error: err } = await supabase.from('products').delete().eq('id', id)
    if (err) throw err
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const activeProductCount = products.filter(p => p.is_active).length
  // 0 = no plan (blocked), null = unlimited, number = capped
  const productLimit = farm?.platform_plan_slug
    ? (PLAN_LIMITS[farm.platform_plan_slug] ?? null)
    : 0

  return { farm, products, loading, error, activeProductCount, productLimit, createFarm, updateFarm, addProduct, updateProduct, deleteProduct, reload: load }
}
