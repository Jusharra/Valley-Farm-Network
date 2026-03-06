import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) {
          console.error('Categories fetch error:', error)
          setCategories([])
        } else {
          console.log('Categories loaded:', data?.length || 0, 'items')
          setCategories(data ?? [])
        }
        setLoading(false)
      })
  }, [])

  return { categories, loading }
}
