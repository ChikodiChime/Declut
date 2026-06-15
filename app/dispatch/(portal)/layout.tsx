import type { ReactNode } from 'react'
import { DispatchNav } from './DispatchNav'

export default function DispatchPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {children}
      <DispatchNav />
    </div>
  )
}
