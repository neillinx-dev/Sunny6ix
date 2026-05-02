import { useEffect, useMemo, useState } from 'react'
import SunCalc from 'suncalc'
import venueData from '../../data/venues.json'
import type { Venue } from '../../types'
import {
  LogoLockup,
  LogoMark,
  Wordmark,
  SunPath,
  PatioIcon,
  CNTower,
  SkylineStrip,
} from './BrandMarks'

const venues = venueData as Venue[]
const TORONTO = { lat: 43.6532, lng: -79.3832 }

function formatTime(d: Date) {
  return d
    .toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
}

function launchApp() {
  window.location.href = '/app'
}

function launchSignIn() {
  window.location.href = '/app?auth=signin'
}

export default function LandingPage() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const sun = useMemo(() => {
    const t = SunCalc.getTimes(now, TORONTO.lat, TORONTO.lng)
    const p = SunCalc.getPosition(now, TORONTO.lat, TORONTO.lng)
    const altitudeDeg = (p.altitude * 180) / Math.PI
    return {
      sunrise: t.sunrise,
      goldenHour: t.goldenHour,
      sunset: t.sunset,
      isDay: altitudeDeg > 0,
      // % across the day arc (0% at sunrise, 100% at sunset)
      dayPercent: (() => {
        const dayMs = t.sunset.getTime() - t.sunrise.getTime()
        const elapsed = now.getTime() - t.sunrise.getTime()
        return Math.max(0, Math.min(100, (elapsed / dayMs) * 100))
      })(),
    }
  }, [now])

  // Pick the actual best-light patios from the venue catalog rather than
  // hard-coding. Logic:
  //  - drop covered patios (they never see direct sun, so "best light" is a lie)
  //  - prefer rooftops + courtyards (sky-exposed > sidewalk caves)
  //  - sort by popularity tier desc, then by whether we have a hand-drawn
  //    polygon (signals we've actually vetted the patio), then by name
  //  - take top 5
  const featured = useMemo(() => {
    const patioRank: Record<Venue['patioType'], number> = {
      rooftop: 0,
      courtyard: 1,
      backyard: 2,
      sidewalk: 3,
    }
    return venues
      .filter((v) => v.covered !== true)
      .filter((v) => (v.popularity ?? 2) >= 4)
      .sort((a, b) => {
        const popDiff = (b.popularity ?? 2) - (a.popularity ?? 2)
        if (popDiff) return popDiff
        const typeDiff = patioRank[a.patioType] - patioRank[b.patioType]
        if (typeDiff) return typeDiff
        const aHasPoly = a.patioPolygon && a.patioPolygon.length >= 3 ? 0 : 1
        const bHasPoly = b.patioPolygon && b.patioPolygon.length >= 3 ? 0 : 1
        if (aHasPoly !== bHasPoly) return aHasPoly - bHasPoly
        return a.name.localeCompare(b.name)
      })
      .slice(0, 5)
  }, [])

  return (
    <div className="min-h-full w-full bg-[var(--color-brand-cream)] text-[var(--color-brand-navy)] selection:bg-[var(--color-brand-yellow)] selection:text-[var(--color-brand-navy)]">
      {/* ── NAV ── */}
      <header className="border-b border-[rgba(13,27,42,0.08)]">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 h-[78px] flex items-center justify-between">
          <a href="/" className="block">
            <LogoLockup />
          </a>
          <nav className="hidden md:flex items-center gap-9 font-display text-[13px] font-medium opacity-75">
            <a href="#how" className="hover:opacity-100 hover:text-[var(--color-brand-navy)] transition">How it works</a>
            <a href="#patios" className="hover:opacity-100 hover:text-[var(--color-brand-navy)] transition">Patios</a>
            <a href="#about" className="hover:opacity-100 hover:text-[var(--color-brand-navy)] transition">About</a>
          </nav>
          <button
            onClick={launchApp}
            className="font-display font-extrabold text-[13px] tracking-tight bg-[var(--color-brand-yellow)] hover:brightness-105 active:brightness-95 text-[var(--color-brand-navy)] rounded-full px-5 py-2.5 shadow-[0_2px_10px_rgba(255,199,44,0.4)] hover:shadow-[0_4px_16px_rgba(255,199,44,0.55)] transition-all flex items-center gap-1.5"
          >
            Open app <span aria-hidden>→</span>
          </button>
        </div>
      </header>

      {/* ── HERO ──
          Tightened spacing so the primary CTA sits above the fold on
          iPhone 15-class viewports (≈700pt visible) AND a 13" MacBook
          Pro Chrome window. Mobile/tablet reduces hero font ~25% to
          keep the headline + CTA together. */}
      <section className="relative">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 pt-14 lg:pt-16 pb-20 lg:pb-36 grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <p className="font-display text-[11px] font-medium tracking-[0.24em] uppercase opacity-50 flex items-center gap-2.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-brand-yellow)]" />
              Toronto · {sun.isDay ? 'Sun is up' : 'After hours'}
            </p>

            <h1 className="mt-5 lg:mt-7 font-display font-medium tracking-[-0.035em] leading-[0.98] text-[clamp(2.6rem,7.5vw,6.4rem)]">
              Find the sunniest <span className="font-serif-italic font-light text-[var(--color-brand-yellow)]">patios</span> in Toronto.
            </h1>

            <p className="mt-5 lg:mt-7 max-w-[44ch] text-[1rem] lg:text-[1.05rem] leading-[1.55] opacity-65">
              Sunny6ix tracks the sun in real-time so you always know where to sit, sip, and soak it up. No more guessing which patio is in the shade by 4 pm.
            </p>

            <div className="mt-9 lg:mt-10 flex items-center gap-3 flex-wrap">
              <button onClick={launchApp} className="btn-min">
                Find a Sunny Patio
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={launchSignIn}
                className="font-display font-medium text-[0.95rem] tracking-[-0.005em] bg-white hover:bg-[#FFF8E5] text-[var(--color-brand-navy)] border border-[rgba(13,27,42,0.12)] rounded-full px-[1.6rem] py-[0.95rem] transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                Sign in
              </button>
            </div>
          </div>

          {/* Brand sun + CN Tower mark, big and quiet */}
          <div className="lg:col-span-4 hidden lg:flex justify-end items-start pt-4">
            <div className="relative w-[260px] h-[260px]">
              <LogoMark className="w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE META STRIP ── */}
      <section className="border-y border-[rgba(13,27,42,0.08)] bg-[var(--color-brand-cream)]">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-y-6 gap-x-10 items-end">
          <Meta label="Sunrise" value={formatTime(sun.sunrise)} />
          <Meta label="Golden hour" value={formatTime(sun.goldenHour)} />
          <Meta label="Sunset" value={formatTime(sun.sunset)} />
          <Meta label="Patios mapped" value={`${venues.length}`} />
          <div className="hidden lg:flex flex-col items-end gap-1.5">
            <span className="font-display text-[10.5px] font-medium tracking-[0.22em] uppercase opacity-50">Sun path · today</span>
            <SunPath className="w-32 h-12" percent={sun.dayPercent} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-[1180px] mx-auto px-6 lg:px-10 pt-20 lg:pt-44 pb-20 lg:pb-44">
        <SectionLabel kicker="How it works" title={<>Three steps to <span className="font-serif-italic font-light text-[var(--color-brand-yellow)]">vitamin D</span>.</>} />

        <div className="mt-20 grid md:grid-cols-3 gap-y-14 md:gap-x-16 lg:gap-x-24">
          <Step n="01" title="Open the map" body="Every patio in the 6ix on a single map, with the sun’s path drawn across the city in real-time." />
          <Step n="02" title="Pick a moment" body="Drag the time slider to any hour today. Watch the shadows fall across patio after patio." />
          <Step n="03" title="Sit pretty" body="Tap a patio for hours, vibe, and an honest read on how long the sun will stay on your face." />
        </div>
      </section>

      {/* ── FEATURED PATIOS ── */}
      <section id="patios" className="border-t border-[rgba(13,27,42,0.08)] relative">
        {/* faint Toronto skyline as a backdrop motif */}
        <SkylineStrip className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" />

        <div className="relative max-w-[1180px] mx-auto px-6 lg:px-10 pt-20 lg:pt-44 pb-20 lg:pb-44">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-5">
              <PatioIcon className="hidden md:block w-12 h-12 mt-2 shrink-0 opacity-90" />
              <SectionLabel kicker="Featured" title={<>Patios with the <span className="font-serif-italic font-light text-[var(--color-brand-yellow)]">best</span> light.</>} />
            </div>
            <button onClick={launchApp} className="hidden md:inline-flex items-center gap-2 font-display text-sm font-medium opacity-70 hover:opacity-100 transition">
              Browse all {venues.length} <span aria-hidden>→</span>
            </button>
          </div>

          <ul className="mt-20 divide-y divide-[rgba(13,27,42,0.08)] border-y border-[rgba(13,27,42,0.08)]">
            {featured.map((v, i) => (
              <li key={v.id}>
                <a
                  href="/app"
                  className="group grid grid-cols-[3rem_1fr_auto] md:grid-cols-[4rem_1fr_1fr_auto] items-center gap-6 py-8 transition"
                >
                  <span className="font-serif-italic text-[var(--color-brand-yellow)] text-2xl md:text-3xl font-light tabular-nums opacity-80">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-display text-2xl md:text-3xl font-medium tracking-tight">
                    {v.name}
                  </span>
                  <span className="hidden md:block text-sm opacity-55">{v.neighborhood} · {v.address}</span>
                  <span className="font-display text-sm font-medium opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition flex items-center gap-1">
                    Open <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── ABOUT / TONE OF VOICE ── */}
      <section id="about" className="border-t border-[rgba(13,27,42,0.08)]">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 pt-20 lg:pt-44 pb-20 lg:pb-44 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p className="font-display text-[11px] font-medium tracking-[0.24em] uppercase opacity-50">About</p>
            <div className="mt-8 hidden lg:block">
              <CNTower className="w-6 h-16 opacity-80" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="font-display font-medium text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.25] tracking-[-0.02em]">
              We grew up dodging shade between the condos. So we built a tool that tells you exactly where the sun is &mdash; and which patio it’s landing on next.
            </p>

            <p className="mt-12 font-serif-italic text-xl opacity-60">Chase the sun. Love the city.</p>
          </div>
        </div>
      </section>

      {/* ── BIG CTA ── */}
      <section className="border-t border-[rgba(13,27,42,0.08)]">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 pt-20 lg:pt-44 pb-20 lg:pb-44 text-center">
          <div className="flex justify-center">
            <LogoMark className="w-16 h-16 opacity-90" />
          </div>
          <h2 className="mt-10 font-display font-medium tracking-[-0.035em] leading-[0.98] text-[clamp(3rem,8vw,6.5rem)]">
            Sun’s out. <span className="font-serif-italic font-light text-[var(--color-brand-yellow)]">Patios on.</span>
          </h2>
          <div className="mt-12 flex justify-center">
            <button onClick={launchApp} className="btn-min btn-min-solid">
              Find a Sunny Patio
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[rgba(13,27,42,0.08)] bg-[var(--color-brand-navy)] text-[var(--color-brand-cream)]">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-10 py-14">
          <div className="flex flex-col lg:flex-row gap-10 justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark className="h-9 w-9" />
                <Wordmark className="text-lg text-[var(--color-brand-cream)]" />
              </div>
              <p className="mt-5 max-w-sm text-sm opacity-65 leading-relaxed">
                Sunny6ix is an independent project by Toronto patio enthusiasts. Sun positions powered by SunCalc · Map data © OpenStreetMap.
              </p>
              <p className="mt-6 font-display text-[10px] font-semibold tracking-[0.24em] uppercase opacity-55">
                Chase the sun · Love the city
              </p>
            </div>
            <div className="grid grid-cols-3 gap-10 font-display text-sm">
              <FooterCol title="Product" links={[['Open the app', '/app'], ['How it works', '#how']]} />
              <FooterCol title="Patios" links={[['Browse all', '/app'], ['Submit a patio', 'mailto:hello@sunny6ix.com']]} />
              <FooterCol title="The 6ix" links={[['About', '#about'], ['Contact', 'mailto:hello@sunny6ix.com']]} />
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-[11px] font-display tracking-[0.2em] uppercase opacity-55">
            <span>© {new Date().getFullYear()} Sunny6ix · Made in Toronto</span>
            <span>sunny6ix.com</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─────────── small components ─────────── */

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[10.5px] font-medium tracking-[0.22em] uppercase opacity-50">{label}</span>
      <span className="font-display text-2xl font-medium tracking-tight tabular-nums">{value}</span>
    </div>
  )
}

function SectionLabel({ kicker, title }: { kicker: string; title: React.ReactNode }) {
  return (
    <div>
      <p className="font-display text-[11px] font-medium tracking-[0.24em] uppercase opacity-50">{kicker}</p>
      <h2 className="mt-6 font-display font-medium tracking-[-0.03em] leading-[1.02] text-[clamp(2.2rem,4.8vw,3.8rem)] max-w-[18ch]">
        {title}
      </h2>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-serif-italic text-[var(--color-brand-yellow)] text-3xl font-light tabular-nums">{n}</p>
      <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{title}</h3>
      <p className="mt-3 text-[15px] leading-[1.6] opacity-65 max-w-[34ch]">{body}</p>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.24em] uppercase opacity-55">{title}</p>
      <ul className="mt-5 space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="opacity-85 hover:opacity-100 hover:text-[var(--color-brand-yellow)] transition">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
