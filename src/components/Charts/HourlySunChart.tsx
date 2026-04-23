interface HourlySunChartProps {
  forecast: { hour: number; percentage: number }[]
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h > 12 ? `${h - 12}p` : `${h}a`
}

export default function HourlySunChart({ forecast }: HourlySunChartProps) {
  const now = new Date().getHours()

  return (
    <div className="flex items-end gap-[2px] h-14">
      {forecast.map(({ hour, percentage }) => {
        const isSunny = percentage >= 60
        const isPartial = percentage >= 20
        const isCurrent = hour === now

        return (
          <div key={hour} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full flex items-end h-9 relative">
              <div
                className={`w-full rounded-[3px] transition-all duration-500 ease-out ${
                  isSunny
                    ? 'bg-gradient-to-t from-[#FFC72C] to-[#FFD65A]'
                    : isPartial
                    ? 'bg-gradient-to-t from-[#FFC72C]/60 to-[#FFD65A]/40'
                    : 'bg-[#0D1B2A]/10'
                } ${isCurrent ? 'ring-[1.5px] ring-[#0D1B2A] ring-offset-1' : ''}`}
                style={{ height: `${Math.max(percentage, 6)}%` }}
                title={`${formatHour(hour)}: ${percentage}% sun`}
              />
            </div>
            <span
              className={`text-[8px] leading-none tabular-nums font-medium ${
                isCurrent
                  ? 'text-[#0D1B2A] font-bold'
                  : isSunny
                  ? 'text-[#0D1B2A]/60'
                  : 'text-[#0D1B2A]/30'
              }`}
            >
              {formatHour(hour)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
