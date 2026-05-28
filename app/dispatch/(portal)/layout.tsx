import type { ReactNode } from 'react'
import { DispatchNav } from './DispatchNav'

export default function DispatchPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-20">
      {children}
      <DispatchNav />
    </div>
  )
}
