// lib/hooks/useClaims.ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type ClaimStatus = 'pending' | 'accepted' | 'completed' | 'cancelled'

export type MyClaim = {
  id: string
  listing_id: string
  buyer_id: string
  status: ClaimStatus
  pickup_address: string | null
  claimed_at: string
  accepted_at: string | null
  completed_at: string | null
  listing: {
    id: string
    title: string
    images: string[]
    area: string
    seller: { id: string; name: string | null; avatar_url: string | null }
  }
}

export type SellerClaim = {
  id: string
  listing_id: string
  buyer_id: string
  status: ClaimStatus
  pickup_address: string | null
  claimed_at: string
  accepted_at: string | null
  completed_at: string | null
  listing: { id: string; title: string; images: string[]; area: string }
  buyer: { id: string; name: string | null; avatar_url: string | null }
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
  return json
}

export function useMyClaims({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<MyClaim[]>({
    queryKey: ['claims', 'mine'],
    enabled,
    queryFn: async () => {
      const res = await fetch('/api/claims/mine')
      // NOTE: return empty array for unauthenticated users — listing pages call this hook
      // without requiring login, so 401 is expected and should not put the query in error state
      if (res.status === 401) return []
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
      return json.data
    },
  })
}

export function useSellerClaims() {
  return useQuery<SellerClaim[]>({
    queryKey: ['claims', 'seller'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/seller/claims')
      return json.data
    },
  })
}

export function useClaimListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (listing_id: string) =>
      apiRequest('POST', '/api/claims', { listing_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'mine'] })
      toast.success('Item claimed! Waiting for seller to accept.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: ClaimStatus; pickup_address?: string }) =>
      apiRequest('PATCH', `/api/claims/${id}`, body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['claims', 'seller'] })
      if (vars.status === 'cancelled') toast.success('Claim cancelled')
      if (vars.status === 'accepted') toast.success('Claim accepted — pickup address sent to buyer')
      if (vars.status === 'completed') toast.success('Item marked as collected')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
