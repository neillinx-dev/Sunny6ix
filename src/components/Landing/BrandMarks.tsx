type Props = { className?: string }

/**
 * Logo mark per the Sunny6ix brand guide:
 * yellow sun disc, CN Tower silhouette in front, low Toronto skyline at the base.
 */
export function LogoMark({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {/* sun rays */}
      <g stroke="#FFC72C" strokeWidth="2.4" strokeLinecap="round">
        <line x1="32" y1="3" x2="32" y2="9" />
        <line x1="32" y1="48" x2="32" y2="52" />
        <line x1="3" y1="28" x2="9" y2="28" />
        <line x1="55" y1="28" x2="61" y2="28" />
        <line x1="11" y1="9" x2="15" y2="13" />
        <line x1="49" y1="43" x2="53" y2="47" />
        <line x1="11" y1="47" x2="15" y2="43" />
        <line x1="49" y1="13" x2="53" y2="9" />
      </g>
      {/* sun disc */}
      <circle cx="32" cy="28" r="15" fill="#FFC72C" />
      {/* CN Tower */}
      <path
        d="M30 56 L30 38 L29 35 L29 31 L28 28 L28 23 L30 20 L30 13 L31 9 L32 5 L33 9 L34 13 L34 20 L36 23 L36 28 L35 31 L35 35 L34 38 L34 56 Z"
        fill="#0D1B2A"
      />
      {/* skyline */}
      <path
        d="M4 56 L4 50 L8 50 L8 53 L11 53 L11 47 L14 47 L14 53 L18 53 L18 49 L21 49 L21 53 L25 53 L25 50 L28 50 L28 56 Z M36 56 L36 50 L40 50 L40 52 L43 52 L43 47 L46 47 L46 52 L50 52 L50 49 L54 49 L54 52 L58 52 L58 50 L60 50 L60 56 Z"
        fill="#0D1B2A"
      />
    </svg>
  )
}

export function Wordmark({ className = '' }: Props) {
  return (
    <span className={`font-display font-semibold tracking-[-0.015em] ${className}`}>
      Sunny<span className="text-[var(--color-brand-yellow)]">6ix</span>
    </span>
  )
}

/** Full brand lockup: mark + wordmark + tagline (per brand guide). */
export function LogoLockup({ className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark className="h-10 w-10 shrink-0" />
      <div className="leading-none">
        <Wordmark className="text-[1.4rem]" />
        <div className="font-display text-[0.5rem] font-semibold tracking-[0.22em] mt-1.5 opacity-65 text-[var(--color-brand-navy)]">
          CHASE THE SUN · LOVE THE CITY
        </div>
      </div>
    </div>
  )
}

/** "Sun Path" graphic per brand guide: dashed arc with a sun pinned along it. */
export function SunPath({ className = '', percent = 65 }: Props & { percent?: number }) {
  // arc from (10, 60) to (110, 60), peak at (60, 10)
  const angle = Math.PI - (percent / 100) * Math.PI
  const x = 60 + Math.cos(angle) * 50
  const y = 60 - Math.sin(angle) * 50
  return (
    <svg viewBox="0 0 120 70" className={className} aria-hidden>
      <path
        d="M10 60 A 50 50 0 0 1 110 60"
        stroke="#0D1B2A"
        strokeWidth="1.2"
        fill="none"
        strokeDasharray="2 5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx={x} cy={y} r="6" fill="#FFC72C" />
    </svg>
  )
}

/** "Patio Life" icon per brand guide: umbrella + lounger silhouette. */
export function PatioIcon({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      {/* umbrella */}
      <path d="M20 4 C 11 4, 5 12, 4 18 L 36 18 C 35 12, 29 4, 20 4 Z" fill="#FFC72C" />
      <path d="M20 4 L 20 18" stroke="#0D1B2A" strokeWidth="1.4" />
      {/* pole */}
      <line x1="20" y1="18" x2="20" y2="30" stroke="#0D1B2A" strokeWidth="1.4" strokeLinecap="round" />
      {/* lounger */}
      <path d="M8 32 L 32 32 L 30 36 L 10 36 Z" fill="#7EC8E3" />
      <line x1="8" y1="36" x2="32" y2="36" stroke="#0D1B2A" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/** Compact CN Tower silhouette (brand element) */
export function CNTower({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 64" className={className} aria-hidden>
      <path
        d="M11 64 L11 44 L10 40 L10 34 L9 30 L9 24 L11 20 L11 12 L11.5 6 L12 0 L12.5 6 L13 12 L13 20 L15 24 L15 30 L14 34 L14 40 L13 44 L13 64 Z"
        fill="#0D1B2A"
      />
    </svg>
  )
}

/** Subtle Toronto skyline strip (brand element).
 * The SVG must explicitly be 100% wide + display:block so it doesn't
 * fall back to its viewBox-derived natural width (1440px) and force
 * horizontal overflow when zoomed out on mobile. */
export function SkylineStrip({ className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 1440 60"
      className={className}
      preserveAspectRatio="none"
      style={{ width: '100%', display: 'block' }}
      aria-hidden
    >
      <path
        d="M0 60 L0 42 L40 42 L40 36 L80 36 L80 44 L120 44 L120 30 L150 30 L150 38 L180 38 L180 22 L220 22 L220 32 L260 32 L260 28 L300 28 L300 36 L340 36 L340 18 L380 18 L380 30 L420 30 L420 24 L460 24 L460 38 L500 38 L500 28 L540 28 L540 16 L560 16 L560 8 L568 8 L572 0 L576 8 L584 8 L584 16 L600 16 L600 30 L640 30 L640 24 L680 24 L680 34 L720 34 L720 20 L760 20 L760 32 L800 32 L800 26 L840 26 L840 38 L880 38 L880 28 L920 28 L920 32 L960 32 L960 22 L1000 22 L1000 34 L1040 34 L1040 28 L1080 28 L1080 38 L1120 38 L1120 24 L1160 24 L1160 32 L1200 32 L1200 28 L1240 28 L1240 36 L1280 36 L1280 30 L1320 30 L1320 38 L1360 38 L1360 32 L1400 32 L1400 40 L1440 40 L1440 60 Z"
        fill="#0D1B2A"
        opacity="0.18"
      />
    </svg>
  )
}
