import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

export default function ProfileButton() {
  const user = useAppStore((s) => s.user)
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen)
  const toggleFavoritesOnly = useAppStore((s) => s.toggleFavoritesOnly)
  const filters = useAppStore((s) => s.filters)
  const setShowSunnyList = useAppStore((s) => s.setShowSunnyList)

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) {
    return (
      <button
        onClick={() => setAuthModalOpen(true)}
        className="pointer-events-auto px-4 py-2 rounded-full bg-[#FFC72C] hover:bg-[#FFD65A] text-[#0D1B2A] font-extrabold text-[13px] tracking-tight shadow-md transition-colors"
      >
        Sign in
      </button>
    )
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'You'
  const email = user.email ?? ''
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || (email[0]?.toUpperCase() ?? 'U')

  const handleFavorites = () => {
    if (!filters.favoritesOnly) toggleFavoritesOnly()
    setShowSunnyList(true)
    setOpen(false)
  }

  const handleSignOut = async () => {
    setOpen(false)
    await supabase.auth.signOut()
  }

  return (
    <div ref={rootRef} className="relative pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-[#0D1B2A] text-white font-extrabold text-[13px] tracking-tight shadow-md hover:bg-[#1a2d44] transition-colors flex items-center justify-center"
        aria-label="Profile menu"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-[#0D1B2A]/8 overflow-hidden slide-up-enter">
          <div className="px-4 py-3 border-b border-[#0D1B2A]/8">
            <div className="font-extrabold text-[#0D1B2A] text-[14px] tracking-tight truncate">
              {displayName}
            </div>
            <div className="text-[12px] text-[#0D1B2A]/55 font-medium truncate">{email}</div>
          </div>
          <button
            onClick={handleFavorites}
            className="w-full text-left px-4 py-2.5 hover:bg-[#FFC72C]/12 transition-colors flex items-center gap-2 text-[13px] font-semibold text-[#0D1B2A]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FFC72C" stroke="#FFC72C" strokeWidth="1.5">
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
            </svg>
            My Favorites
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 hover:bg-[#0D1B2A]/5 transition-colors text-[13px] font-semibold text-[#0D1B2A] border-t border-[#0D1B2A]/8"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
