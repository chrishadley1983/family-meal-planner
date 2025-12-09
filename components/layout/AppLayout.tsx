import { Navigation } from './Navigation'

interface AppLayoutProps {
  children: React.ReactNode
  userEmail?: string
}

export function AppLayout({ children, userEmail }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation userEmail={userEmail} />
      <main>{children}</main>
    </div>
  )
}
