import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

type Tab = 'signin' | 'signup'

export default function AuthModal() {
  const open = useAppStore((s) => s.authModalOpen)
  const setOpen = useAppStore((s) => s.setAuthModalOpen)

  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Reset on close
  useEffect(() => {
    if (!open) {
      setError(null)
      setLoading(false)
      setEmail('')
      setPassword('')
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        // Fire-and-forget newsletter subscribe
        const subEmail = email
        fetch('/__api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: subEmail }),
        }).catch(() => {})
      }
      setOpen(false)
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      })
      if (err) throw err
    } catch (err) {
      setError((err as Error).message || 'Google sign-in failed.')
    }
  }

  return (
    <div
      onMouseDown={onBackdropClick}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0D1B2A]/40 backdrop-blur-sm p-4"
    >
      <div
        ref={panelRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 slide-up-enter"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-[#0D1B2A] text-[20px] tracking-tight">
            {tab === 'signin' ? 'Welcome back' : 'Join Sunny6ix'}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#0D1B2A]/5 hover:bg-[#0D1B2A]/12 text-[#0D1B2A]/50 hover:text-[#0D1B2A] transition-all"
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#F2F4F7] rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
              tab === 'signin' ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-[#0D1B2A]/60'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
              tab === 'signup' ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-[#0D1B2A]/60'
            }`}
          >
            Sign up
          </button>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#0D1B2A]/12 hover:bg-[#0D1B2A]/4 transition-colors text-[13px] font-bold text-[#0D1B2A] mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#0D1B2A]/10" />
          <span className="text-[11px] font-semibold text-[#0D1B2A]/40 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-[#0D1B2A]/10" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#0D1B2A]/60 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#F2F4F7] text-[16px] sm:text-[14px] text-[#0D1B2A] font-medium outline-none focus:ring-2 focus:ring-[#FFC72C]"
              placeholder="you@example.com"
            />
            {tab === 'signup' && (
              <p className="text-[11px] text-[#0D1B2A]/55 mt-2 leading-snug">
                By creating an account, you agree to get Sunny6ix's patio deals email. Unsubscribe anytime.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#0D1B2A]/60 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#F2F4F7] text-[16px] sm:text-[14px] text-[#0D1B2A] font-medium outline-none focus:ring-2 focus:ring-[#FFC72C]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[12px] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#FFC72C] hover:bg-[#FFD65A] text-[#0D1B2A] font-extrabold text-[14px] tracking-tight transition-colors disabled:opacity-60"
          >
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
