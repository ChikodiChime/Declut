'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

async function postJson(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      postJson('/api/auth/buyer/otp', { email }),
  })
}

export function useVerifyOtp(next?: string | null) {
  const router = useRouter()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      postJson('/api/auth/buyer/verify', { email, code }),
    onSuccess: () => {
      router.push(next ?? '/orders')
      router.refresh()
    },
  })
}
