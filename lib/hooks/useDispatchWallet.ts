'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type DispatchWallet = {
  wallet_balance: number
  paystack_onboarding_complete: boolean
  paystack_account_name: string | null
  paystack_bank_name: string | null
  paystack_account_number: string | null
}

export type DispatchWithdrawal = {
  id: string
  amount: number
  status: 'pending' | 'processed' | 'rejected'
  admin_note: string | null
  requested_at: string
  processed_at: string | null
  bank_snapshot: {
    bank_name: string
    account_number: string
    account_name: string
  }
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

export function useDispatchWallet() {
  return useQuery<DispatchWallet>({
    queryKey: ['dispatch', 'wallet'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/wallet')
      return json.data
    },
  })
}

export function useDispatchWithdrawals() {
  return useQuery<DispatchWithdrawal[]>({
    queryKey: ['dispatch', 'withdrawals'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/withdrawals')
      return json.data
    },
  })
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) =>
      apiRequest('POST', '/api/dispatch/withdrawals', { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'withdrawals'] })
      toast.success('Withdrawal request sent')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
