import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore, type HourlyCloud } from '../../store/useAppStore'
import { wmoEmoji } from '../../hooks/useWeather'

const BAR_OPEN = 11
const BAR_CLOSE = 21

function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function getDayLabel(offset: number): string {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tmrw'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

const ticks = Array.from({ length: 11 }, (_, i) => BAR_OPEN + i)

export default function TimeSlider() {
  const currentTime = useAppStore((s) => s.currentTime)
  const setCurrentTime = useAppStore((s) => s.setCurrentTime)
  const isLiveTime = useAppStore((s) => s.isLiveTime)
  const setIsLiveTime = useAppStore((s) => s.setIsLiveTime)
  const selectedDayOffset = useAppStore((s) => s.selectedDayOffset)
  const setSelectedDayOffset = useAppStore((s) => s.setSelectedDayOffset)
  const dailyForecast = useAppStore((s) => s.dailyForecast)
  const hourlyCloud = useAppStore((s) => s.hourlyCloud)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)

  // Build a per-hour weather lookup for the selected day.
  // HourlyCloud.hour is encoded as hourOfDay + dayOfMonth * 24.
  const hourlyByHour = useMemo(() => {
    if (!hourlyCloud) return new Map<number, HourlyCloud>()
    const target = new Date()
    target.setDate(target.getDate() + selectedDayOffset)
    const day = target.getDate()
    const map = new Map<number, HourlyCloud>()
    for (const h of hourlyCloud) {
      const hour = h.hour - day * 24
      if (hour < 0 || hour > 23) continue
      if (h.hour >= day * 24 && h.hour < (day + 1) * 24) {
        map.set(hour, h)
      }
    }
    return map
  }, [hourlyCloud, selectedDayOffset])

  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
  const storeClampedHour = Math.max(BAR_OPEN, Math.min(BAR_CLOSE, currentHour))

  // Local mirror of the slider position. Updates IMMEDIATELY on every
  // touchmove so the thumb + label stay glued to the finger. Heavy work
  // (shadow render, sun-status recompute) reads from the store's currentTime
  // which is rAF-throttled below — that's where the lag was coming from.
  const [localHour, setLocalHour] = useState(storeClampedHour)
  // Keep localHour in sync if store changes from elsewhere (e.g. NOW button,
  // day tab change, live ticker), but ignore re-syncs while user is actively
  // dragging — otherwise the thumb snaps backward mid-gesture.
  const draggingRef = useRef(false)
  useEffect(() => {
    if (!draggingRef.current) setLocalHour(storeClampedHour)
  }, [storeClampedHour])

  const clampedHour = localHour
  const isOutsideHours = currentHour < BAR_OPEN || currentHour > BAR_CLOSE

  // rAF-coalesce store commits — at most one setCurrentTime per frame even
  // if onChange fires 100x/s during a fast drag.
  const rafRef = useRef<number | null>(null)
  const pendingHourRef = useRef<number | null>(null)
  const commitToStore = useCallback(
    (hour: number) => {
      const newTime = new Date()
      newTime.setDate(newTime.getDate() + selectedDayOffset)
      const h = Math.floor(hour)
      const m = Math.round((hour - h) * 60)
      newTime.setHours(h, m, 0, 0)
      setCurrentTime(newTime)
      setIsLiveTime(false)
    },
    [selectedDayOffset, setCurrentTime, setIsLiveTime]
  )

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hour = parseFloat(e.target.value)
      // Update visual state instantly — no batching, no waiting.
      setLocalHour(hour)
      // Coalesce store commits to one per animation frame.
      pendingHourRef.current = hour
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const next = pendingHourRef.current
        if (next !== null) commitToStore(next)
      })
    },
    [commitToStore]
  )

  // Touch/pointer hooks let the heavy computation skip while the user is
  // actively dragging. We commit only on release for the final sun-status
  // recompute — slider scrub stays buttery.
  const onPointerDown = useCallback(() => { draggingRef.current = true }, [])
  const onPointerUp = useCallback(() => {
    draggingRef.current = false
    // Force a final commit on release so the rendering catches up.
    if (pendingHourRef.current !== null) commitToStore(pendingHourRef.current)
  }, [commitToStore])

  const handleNowClick = useCallback(() => {
    setCurrentTime(new Date())
    setIsLiveTime(true)
    setSelectedDayOffset(0)
  }, [setCurrentTime, setIsLiveTime, setSelectedDayOffset])

  const handleDaySelect = useCallback((offset: number) => {
    setSelectedDayOffset(offset)
    const newTime = new Date()
    newTime.setDate(newTime.getDate() + offset)
    if (offset > 0) {
      newTime.setHours(12, 0, 0, 0)
      setIsLiveTime(false)
    } else {
      setIsLiveTime(true)
    }
    setCurrentTime(newTime)
  }, [setCurrentTime, setIsLiveTime, setSelectedDayOffset])

  return (
    <div className="absolute bottom-5 left-4 right-4 z-10 flex justify-center">
      <div className="glass-card rounded-[22px] max-w-2xl w-full slide-up-enter overflow-hidden">
        {/* Day selector with weather icons */}
        <div className="flex border-b border-[#0D1B2A]/8">
          {[0, 1, 2, 3].map((offset) => {
            const forecast = dailyForecast?.[offset]
            const active = selectedDayOffset === offset
            return (
              <button
                key={offset}
                onClick={() => handleDaySelect(offset)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-1 transition-all ${
                  active
                    ? 'text-[#0D1B2A] border-b-2 border-[#FFC72C] bg-[#FFC72C]/10'
                    : 'text-[#0D1B2A]/45 hover:text-[#0D1B2A]/80'
                }`}
              >
                <span className="text-[12px] font-semibold">{getDayLabel(offset)}</span>
                {forecast && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">{wmoEmoji(forecast.weatherCode)}</span>
                    <span className="text-[11px] tabular-nums font-medium">{forecast.tempMax}°</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="px-6 py-4">
          {/* Three pills, all h-9 so the row reads as a single bar. Time is
              text-only on a tint, search has icon + input + clear, LIVE is
              the brand-yellow accent. */}
          <div className="flex items-center gap-2 mb-4 h-9">
            <div className="shrink-0 h-9 flex items-center px-3.5 rounded-full bg-[#0D1B2A]/5">
              {isOutsideHours && selectedDayOffset === 0 ? (
                <span className="text-[13px] font-semibold text-[#0D1B2A]/45 leading-none">Closed</span>
              ) : (
                <span className="text-[15px] font-bold text-[#0D1B2A] tabular-nums tracking-tight leading-none">
                  {formatTime(clampedHour)}
                </span>
              )}
            </div>

            {/* Search — flex-1 so it eats remaining width, min-w-0 to allow
                shrinking instead of pushing LIVE off-screen. */}
            <div className="flex-1 min-w-0 h-9 flex items-center gap-1.5 px-3 rounded-full bg-[#0D1B2A]/5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FFC72C]/40 transition-all">
              <svg className="w-3.5 h-3.5 text-[#0D1B2A]/45 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search patios"
                className="flex-1 min-w-0 bg-transparent outline-none border-none text-[13px] font-medium text-[#0D1B2A] placeholder:text-[#0D1B2A]/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-[#0D1B2A]/15 hover:bg-[#0D1B2A]/30 text-white text-[10px] leading-none"
                >
                  ×
                </button>
              )}
            </div>

            <button
              onClick={handleNowClick}
              className={`shrink-0 h-9 flex items-center gap-1.5 text-[13px] px-3.5 rounded-full font-semibold transition-all ${
                isLiveTime && selectedDayOffset === 0
                  ? 'bg-[#FFC72C] text-[#0D1B2A] shadow-sm live-pulse'
                  : 'bg-[#0D1B2A]/5 text-[#0D1B2A]/55 hover:bg-[#FFC72C]/15 hover:text-[#0D1B2A]'
              }`}
            >
              {isLiveTime && selectedDayOffset === 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D1B2A] animate-pulse" />
              )}
              {isLiveTime && selectedDayOffset === 0 ? 'LIVE' : 'NOW'}
            </button>
          </div>

          <input
            type="range"
            min={BAR_OPEN}
            max={BAR_CLOSE}
            step={0.1}
            value={clampedHour}
            onChange={handleSliderChange}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="w-full"
            style={{ touchAction: 'pan-x' }}
          />

          {/* Hourly weather row: emoji + temp + precip% + hour label (always all 4) */}
          <div className="flex justify-between mt-3 px-1">
            {ticks.map((h) => {
              const w = hourlyByHour.get(h)
              const isCurrent = h === Math.floor(clampedHour)
              const precipProb = w?.precipitationProb ?? 0
              // Color scale for precip %: stronger blue the higher the chance
              const precipColor =
                precipProb >= 50
                  ? 'text-[#4FA6C9] font-bold'
                  : precipProb >= 30
                  ? 'text-[#7EC8E3] font-semibold'
                  : precipProb >= 10
                  ? 'text-[#7EC8E3]/70 font-medium'
                  : 'text-[#0D1B2A]/25'
              return (
                <div
                  key={h}
                  className="flex flex-col items-center gap-1 min-w-0"
                >
                  <span className="text-[15px] leading-none">
                    {w ? wmoEmoji(w.weatherCode) : '·'}
                  </span>
                  <span
                    className={`text-[12px] tabular-nums leading-none ${
                      isCurrent ? 'text-[#0D1B2A] font-bold' : 'text-[#0D1B2A]/55 font-semibold'
                    }`}
                  >
                    {w ? `${w.temperature}°` : ''}
                  </span>
                  <span className={`text-[10px] tabular-nums leading-none ${precipColor}`}>
                    {w ? `${precipProb}%` : ''}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums leading-none ${
                      isCurrent ? 'text-[#0D1B2A] font-bold' : 'text-[#0D1B2A]/30'
                    }`}
                  >
                    {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
