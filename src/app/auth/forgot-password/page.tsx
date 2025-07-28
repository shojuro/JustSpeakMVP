import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-primary mb-2">Just Speak</h1>
          </Link>
          <p className="text-text-secondary">Reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
