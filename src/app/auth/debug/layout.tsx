import { notFound } from 'next/navigation'

// Server component to check debug access
export default function DebugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check environment on server side
  const isDebugEnabled = 
    process.env.NODE_ENV === 'development' || 
    process.env.ENABLE_DEBUG === 'true'

  if (!isDebugEnabled) {
    notFound()
  }

  return <>{children}</>
}