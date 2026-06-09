'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/admin/Pagination'

interface AdminUser {
  id: string
  name: string | null
  email: string
  account_type: string
  suspended: boolean
  created_at: string
}

interface UsersResponse {
  users: AdminUser[]
  total: number
}

const PAGE_SIZE = 25

async function fetchUsers(page: number): Promise<UsersResponse> {
  const res = await fetch(`/api/admin/users?page=${page}`)
  if (!res.ok) throw new Error('Failed to load users')
  const json = await res.json()
  return json.data
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
  business:   'Business',
  dispatcher: 'Dispatcher',
  admin:      'Admin',
}

const ACCOUNT_TYPE_STYLE: Record<string, string> = {
  individual: 'bg-slate-100 text-slate-600',
  business:   'bg-blue-100 text-blue-700',
  dispatcher: 'bg-amber-100 text-amber-700',
  admin:      'bg-primary/15 text-primary',
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-6 py-[18px]">
              <div className="h-4 rounded bg-border" style={{ width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '50%' }} />
              {j === 0 && <div className="h-3 rounded bg-border mt-1.5" style={{ width: '40%' }} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => fetchUsers(page),
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0

  const mutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => patchUser(id, suspended),
    onSuccess: (updated) => {
      toast.success(updated.suspended ? 'Account suspended' : 'Account reactivated')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', page] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users size={19} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">Users</h1>
            {total > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {total.toLocaleString('en-NG')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">Manage accounts & suspensions</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }}>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>User</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Type</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Joined</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <TableSkeleton cols={5} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                      <Users size={22} strokeWidth={1.25} className="text-text-subtle" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                  >
                    <td className="px-6 py-[18px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                          {getInitials(u.name, u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text truncate">{u.name ?? '—'}</p>
                          <p className="text-xs text-text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ACCOUNT_TYPE_STYLE[u.account_type] ?? 'bg-border text-text-muted'}`}>
                        {ACCOUNT_TYPE_LABEL[u.account_type] ?? u.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-sm text-text-muted whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={[
                        'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
                        u.suspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700',
                      ].join(' ')}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.suspended ? 'bg-red-500' : 'bg-green-500'}`} />
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-right">
                      {u.account_type !== 'admin' && (
                        <button
                          onClick={() => mutation.mutate({ id: u.id, suspended: !u.suspended })}
                          disabled={mutation.isPending}
                          className={[
                            'text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-40',
                            u.suspended
                              ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100',
                          ].join(' ')}
                        >
                          {u.suspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-card border-t border-border">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
