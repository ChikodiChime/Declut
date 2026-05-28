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
  business: 'Business',
  dispatcher: 'Dispatcher',
  admin: 'Admin',
}

const ACCOUNT_TYPE_STYLE: Record<string, string> = {
  individual: 'bg-slate-100 text-slate-600',
  business:   'bg-blue-50 text-blue-600',
  dispatcher: 'bg-amber-50 text-amber-700',
  admin:      'bg-primary/10 text-primary',
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
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-4 rounded-md bg-border" style={{ width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '50%' }} />
              {j === 0 && <div className="h-3 rounded-md bg-border mt-1.5" style={{ width: '40%' }} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyRow({ message, cols }: { message: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-16 text-center">
        <Users size={32} strokeWidth={1.25} className="mx-auto mb-3 text-border" />
        <p className="text-sm text-text-muted">{message}</p>
      </td>
    </tr>
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
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users size={18} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text leading-tight">Users</h1>
          {total > 0 && <p className="text-xs text-text-muted">{total.toLocaleString('en-NG')} accounts</p>}
        </div>
      </div>



      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">User</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Type</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Joined</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton cols={5} />
              ) : users.length === 0 ? (
                <EmptyRow message="No users found." cols={5} />
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-semibold text-primary">
                          {getInitials(u.name, u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text truncate">{u.name ?? '—'}</p>
                          <p className="text-xs text-text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_STYLE[u.account_type] ?? 'bg-border text-text-muted'}`}>
                        {ACCOUNT_TYPE_LABEL[u.account_type] ?? u.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={[
                        'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                        u.suspended ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700',
                      ].join(' ')}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.suspended ? 'bg-red-500' : 'bg-green-500'}`} />
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.account_type !== 'admin' && (
                        <button
                          onClick={() => mutation.mutate({ id: u.id, suspended: !u.suspended })}
                          disabled={mutation.isPending}
                          className={[
                            'text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40',
                            u.suspended
                              ? 'border-green-200 text-green-700 hover:bg-green-50'
                              : 'border-red-200 text-red-600 hover:bg-red-50',
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
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </div>
    </div>
  )
}
