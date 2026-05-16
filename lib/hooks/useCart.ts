import { useState, useEffect, useCallback } from 'react'
import { getSessionCart } from '@/lib/session-cart'

export function useCart() {
  const [cartItemIds, setCartItemIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        const ids = new Set<string>(
          data.data?.map((item: { listing_id: string }) => item.listing_id) ?? []
        )
        setCartItemIds(ids)
      } else if (res.status === 401) {
        const sessionCart = getSessionCart()
        const ids = new Set<string>(sessionCart.map((item) => item.listing_id))
        setCartItemIds(ids)
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCart()

    const handleCartUpdate = () => {
      fetchCart()
    }

    window.addEventListener('cart-updated', handleCartUpdate)
    return () => window.removeEventListener('cart-updated', handleCartUpdate)
  }, [fetchCart])

  const isInCart = useCallback(
    (listingId: string) => cartItemIds.has(listingId),
    [cartItemIds]
  )

  const addToCartOptimistic = useCallback((listingId: string) => {
    setCartItemIds((prev) => new Set(prev).add(listingId))
  }, [])

  const removeFromCartOptimistic = useCallback((listingId: string) => {
    setCartItemIds((prev) => {
      const next = new Set(prev)
      next.delete(listingId)
      return next
    })
  }, [])

  return { 
    isInCart, 
    loading, 
    refetch: fetchCart,
    addToCartOptimistic,
    removeFromCartOptimistic
  }
}
