/**
 * Slim header. Brand mark is hidden on mobile (< sm) to free up screen real
 * estate; weather has been removed entirely since the time slider already
 * shows current conditions inline. The filter button anchors to the same
 * top-area but sits in its own absolute layer (FilterBar.tsx).
 */
export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-start justify-between px-5 py-4 gap-3">
        {/* Brand — hidden on small screens */}
        <div className="pointer-events-auto glass-card rounded-2xl px-4 py-2.5 flex items-center gap-3 hidden sm:flex">
          <Sunny6ixMark className="w-9 h-9" />
          <div className="flex flex-col">
            <span className="font-extrabold text-[#0D1B2A] text-[17px] leading-none tracking-tight">
              Sunny<span className="text-[#FFC72C]">6ix</span>
            </span>
            <span className="text-[10px] text-[#0D1B2A]/55 font-medium tracking-[0.14em] uppercase mt-1">
              Chase the sun
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

function Sunny6ixMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="22" r="11" fill="#FFC72C" />
      <g stroke="#FFC72C" strokeWidth="2.5" strokeLinecap="round">
        <line x1="24" y1="3" x2="24" y2="7" />
        <line x1="5" y1="22" x2="9" y2="22" />
        <line x1="39" y1="22" x2="43" y2="22" />
        <line x1="10.5" y1="8.5" x2="13.2" y2="11.2" />
        <line x1="34.8" y1="11.2" x2="37.5" y2="8.5" />
      </g>
      <g fill="#0D1B2A">
        <rect x="22.5" y="14" width="3" height="24" rx="0.5" />
        <path d="M21 22 Q24 19 27 22 L26 26 Q24 28 22 26 Z" />
        <rect x="21" y="12" width="6" height="2" rx="0.5" />
        <rect x="23.3" y="6" width="1.4" height="6" />
        <rect x="8" y="28" width="6" height="12" />
        <rect x="14.5" y="24" width="4.5" height="16" />
        <rect x="28.5" y="26" width="5.5" height="14" />
        <rect x="34.5" y="30" width="5.5" height="10" />
      </g>
      <rect x="4" y="39" width="40" height="2" fill="#0D1B2A" />
    </svg>
  )
}
