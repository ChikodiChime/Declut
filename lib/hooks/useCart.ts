import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSessionCart } from '@/lib/session-cart'

export const CART_QUERY_KEY = ['cart']

async function fetchCartItemIds(): Promise<string[]> {
  const res = await fetch('/api/cart')
  if (res.ok) {
    const data = await res.json()
    return data.data?.map((item: { listing_id: string }) => item.listing_id) ?? []
  }
  if (res.status === 401) {
    return getSessionCart().map((item) => item.listing_id)
  }
  return []
}

export function useCart() {
  const queryClient = useQueryClient()

  const { data: cartItemIds = [], isLoading } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: fetchCartItemIds,
    staleTime: 30_000,
  })

  useEffect(() => {
    const onUpdate = () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
    window.addEventListener('cart-updated', onUpdate)
    return () => window.removeEventListener('cart-updated', onUpdate)
  }, [queryClient])

  const isInCart = useCallback(
    (listingId: string) => cartItemIds.includes(listingId),
    [cartItemIds]
  )

  const addToCartOptimistic = useCallback(
    (listingId: string) => {
      queryClient.setQueryData<string[]>(CART_QUERY_KEY, (prev = []) => [...prev, listingId])
    },
    [queryClient]
  )

  const removeFromCartOptimistic = useCallback(
    (listingId: string) => {
      queryClient.setQueryData<string[]>(CART_QUERY_KEY, (prev = []) =>
        prev.filter((id) => id !== listingId)
      )
    },
    [queryClient]
  )

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
    [queryClient]
  )

  return {
    isInCart,
    count: cartItemIds.length,
    loading: isLoading,
    refetch,
    addToCartOptimistic,
    removeFromCartOptimistic,
  }
}
