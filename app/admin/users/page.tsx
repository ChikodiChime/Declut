'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'

interface AdminUser {
  id: string
  name: string | null
  email: string
  account_type: string
  suspended: boolean
  created_at: string
}

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users')
  if (!res.ok) throw new Error('Failed to load users')
  const json = await res.json()
  return json.data.users
}

async function patchUser(id: string, suspended: boolean): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspended }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update user')
  return json.data.user
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  business: 'Business',
  dispatcher: 'Dispatcher',
  admin: 'Admin',
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers })
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => patchUser(id, suspended),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (e: Error) => setActionError(e.message),
  })

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Users size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text">Users</h1>
        <span className="text-sm text-text-muted">({users.length})</span>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Joined</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-text">{u.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </td>
                  <td className="px-6 py-3 text-text-muted">
                    {ACCOUNT_TYPE_LABEL[u.account_type] ?? u.account_type}
                  </td>
                  <td className="px-6 py-3 text-text-muted">
                    {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={[
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
                    ].join(' ')}>
                      {u.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {u.account_type !== 'admin' && (
                      <button
                        onClick={() => { setActionError(null); mutation.mutate({ id: u.id, suspended: !u.suspended }) }}
                        disabled={mutation.isPending}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {u.suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
