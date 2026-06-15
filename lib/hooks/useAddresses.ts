// lib/hooks/useAddresses.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserAddress } from '@/types'

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
  return json
}

export function useAddresses() {
  return useQuery<UserAddress[]>({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const json = await apiFetch('/api/user/addresses')
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { label: string; address: string; address_state: string | null; is_default?: boolean }) =>
      apiFetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-addresses'] }),
  })
}

export function useUpdateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; label?: string; address?: string; address_state?: string | null; is_default?: boolean }) =>
      apiFetch(`/api/user/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-addresses'] }),
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/user/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-addresses'] }),
  })
}
