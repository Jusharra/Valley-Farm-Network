import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const d = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * d) / 2) ** 2 +
    Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin(((lng2 - lng1) * d) / 2) ** 2
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

function withDistances(farms, lat, lng) {
  return farms
    .map(f => {
      const addr = f.farm_addresses?.[0]
      if (!addr?.latitude || !addr?.longitude) return f
      return { ...f, distance_miles: haversine(lat, lng, +addr.latitude, +addr.longitude) }
    })
    .sort((a, b) => (a.distance_miles ?? Infinity) - (b.distance_miles ?? Infinity))
}

// Fetches active farms.
// Pass { categorySlug } to filter by category.
// Pass { featured: true } to fetch only featured farms (ignores location sorting).
export function useFarms({ categorySlug, featured } = {}) {
  const [rawFarms, setRawFarms]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [userLocation, setUserLocation] = useState(null)

  // Fetch farms from Supabase
  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)

      try {
        let farmIds = null

        if (categorySlug) {
          const { data: cat } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .single()

          if (!cat) { if (!cancelled) setRawFarms([]); return }

          const { data: prods } = await supabase
            .from('products')
            .select('farm_id')
            .eq('category_id', cat.id)
            .eq('is_active', true)

          farmIds = [...new Set((prods ?? []).map(p => p.farm_id))]
          if (!farmIds.length) { if (!cancelled) setRawFarms([]); return }
        }

        let query = supabase
          .from('farms')
          .select(`
            id, farm_name, slug, tagline, banner_url, logo_url, is_verified, is_featured,
            delivery_radius_miles,
            farm_addresses (city, state, latitude, longitude)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (farmIds) query = query.in('id', farmIds)
        if (featured) query = query.eq('is_featured', true)

        const { data, error } = await query
        if (error) {
          console.error('Farms fetch error:', error)
          throw error
        }
        console.log('Farms loaded:', data?.length || 0, 'farms')
        if (!cancelled) setRawFarms(data ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [categorySlug, featured])

  // Request geolocation once
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setUserLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => {} // silently ignore denial
    )
  }, [])

  // Derived: enrich with distances when both are ready
  const farms = userLocation
    ? withDistances(rawFarms, userLocation.lat, userLocation.lng)
    : rawFarms

  return { farms, loading, error, userLocation }
}
