import { DispatchNav } from './DispatchNav'

export default function DispatchPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      {children}
      <DispatchNav />
    </div>
  )
}
