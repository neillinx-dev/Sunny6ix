import { useCallback, useMemo } from 'react'
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
  const clampedHour = Math.max(BAR_OPEN, Math.min(BAR_CLOSE, currentHour))
  const isOutsideHours = currentHour < BAR_OPEN || currentHour > BAR_CLOSE

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hour = parseFloat(e.target.value)
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
        <div className="flex border-b border-gray-100">
          {[0, 1, 2, 3].map((offset) => {
            const forecast = dailyForecast?.[offset]
            return (
              <button
                key={offset}
                onClick={() => handleDaySelect(offset)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-1 transition-all ${
                  selectedDayOffset === offset
                    ? 'text-amber-600 border-b-2 border-amber-400 bg-amber-50/50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="text-[12px] font-medium">{getDayLabel(offset)}</span>
                {forecast && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">{wmoEmoji(forecast.weatherCode)}</span>
                    <span className="text-[11px] tabular-nums">{forecast.tempMax}°</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              {isOutsideHours && selectedDayOffset === 0 ? (
                <span className="text-[15px] font-medium text-gray-400">Patios closed</span>
              ) : (
                <span className="text-[23px] font-semibold text-gray-900 tabular-nums tracking-tight leading-none">
                  {formatTime(clampedHour)}
                </span>
              )}
            </div>
            <button
              onClick={handleNowClick}
              className={`flex items-center gap-1.5 text-[13px] px-3.5 py-1.5 rounded-full font-medium transition-all ${
                isLiveTime && selectedDayOffset === 0
                  ? 'bg-amber-400 text-white shadow-sm live-pulse'
                  : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
              }`}
            >
              {isLiveTime && selectedDayOffset === 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
            className="w-full"
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
                  ? 'text-sky-600 font-semibold'
                  : precipProb >= 30
                  ? 'text-sky-500 font-semibold'
                  : precipProb >= 10
                  ? 'text-sky-400 font-medium'
                  : 'text-gray-300'
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
                      isCurrent ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'
                    }`}
                  >
                    {w ? `${w.temperature}°` : ''}
                  </span>
                  <span className={`text-[10px] tabular-nums leading-none ${precipColor}`}>
                    {w ? `${precipProb}%` : ''}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums leading-none ${
                      isCurrent ? 'text-amber-600 font-bold' : 'text-gray-300'
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
