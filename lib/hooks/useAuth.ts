// lib/hooks/useAuth.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignUpInput {
  email: string
  password: string
  name: string
  account_type: 'individual' | 'business'
}

interface SignInInput {
  email: string
  password: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Something went wrong')
  return data
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSignUp() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignUpInput) => apiPost('/api/auth/signup', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      router.push('/verify-email')
      router.refresh()
    },
  })
}

export function useSignIn() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignInInput) => apiPost('/api/auth/signin', input),
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      if (!json.data.emailVerified) {
        router.push('/verify-email')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    },
  })
}

export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiPost('/api/auth/signout', {}),
    onSuccess: () => {
      queryClient.clear()
      router.push('/auth/login')
      router.refresh()
    },
  })
}

export function useVerifyEmail() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => apiPost('/api/auth/verify-email', { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      router.push('/dashboard')
      router.refresh()
    },
  })
}

export function useSendVerification() {
  return useMutation({
    mutationFn: async (): Promise<{ sent: boolean; retryAfter?: number }> => {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (res.status === 429) return { sent: false, retryAfter: json.error?.retryAfter }
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to send code')
      return { sent: true }
    },
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/users/me')
      if (res.status === 401) return null
      if (!res.ok) throw new Error('Failed to fetch user')
      const json = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
