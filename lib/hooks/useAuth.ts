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
        router.refresh()
        return
      }
      const params = new URLSearchParams(window.location.search)
      const next = params.get('next')
      const isSafeRelative = next && next.startsWith('/') && !next.startsWith('//')
      const accountType = json.data.user?.account_type
      if (isSafeRelative) {
        router.push(next)
      } else if (accountType === 'admin') {
        router.push('/admin')
      } else if (accountType === 'dispatcher') {
        router.push('/dispatch')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    },
  })
}

export function useSignOut(redirectTo = '/auth/login') {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiPost('/api/auth/signout', {}),
    onSuccess: () => {
      queryClient.clear()
      router.push(redirectTo)
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

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name?: string; avatar_url?: string; phone?: string; address?: string; address_state?: string | null }) => {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message ?? 'Failed to update profile')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { current_password: string; new_password: string }) => {
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message ?? 'Failed to change password')
      return data
    },
  })
}
