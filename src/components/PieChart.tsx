import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

export type PieDatum = {
  label: string
  value: number
  color: string
}

type Props = {
  title?: string
  data: PieDatum[]
  size?: number
  /** Highlighted label for this chart (mana on Colors, tribe on Tribes); dims other slices */
  spotlightActiveLabel?: string | null
  /** Toggle spotlight for clicked label (same label again clears) */
  onSpotlightToggle?: (label: string) => void
}

type HoverState = {
  label: string
  value: number
  percent: number
  color: string
  clientX: number
  clientY: number
} | null

function formatPercent(p: number): string {
  return `${p.toFixed(1)}%`
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Keep fixed tooltip on-screen (approx size; avoids clipping under scroll/overflow parents). */
function tooltipFixedPosition(clientX: number, clientY: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: clientX, top: clientY }
  const pad = 12
  const estW = 240
  const estH = 76
  const left = clamp(clientX + pad, pad, Math.max(pad, window.innerWidth - estW))
  const top = clamp(clientY + pad, pad, Math.max(pad, window.innerHeight - estH))
  return { left, top }
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 120, g: 120, b: 120 }
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

/** Slightly lighter highlight toward “lit edge” of each slice (promo-poster depth). */
function highlightForBase(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r + 38, g + 38, b + 38)
}

export function PieChart({
  title,
  data,
  size = 220,
  spotlightActiveLabel = null,
  onSpotlightToggle,
}: Props) {
  const [hover, setHover] = useState<HoverState>(null)
  const interactive = Boolean(onSpotlightToggle)
  const dimOthers = interactive && spotlightActiveLabel != null && spotlightActiveLabel !== ''
  /** SVG `id` is global in the document; each chart needs unique gradient ids or `url(#…)` resolves to the first match (wrong colors). */
  const chartUid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gradId = (i: number) => `pie-grad-${chartUid}-${i}`

  const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data])
  const slices = useMemo(() => {
    if (total <= 0) return []
    let a = -Math.PI / 2
    return data
      .filter((d) => d.value > 0)
      .map((d) => {
        const start = a
        const delta = (d.value / total) * Math.PI * 2
        const end = start + delta
        a = end
        return { ...d, startAngle: start, endAngle: end }
      })
  }, [data, total])

  const r = size / 2
  const cx = r
  const cy = r
  const loneSlice = total > 0 && slices.length === 1 ? slices[0] : null
  const sliceRadius = r - 2

  return (
    <div className="pieCard">
      {title ? <div className="pieTitle">{title}</div> : null}

      <div
        className={`pieWrap${interactive ? ' pieWrap--interactive' : ''}`}
        onMouseLeave={() => setHover(null)}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total > 0 ? (
            <defs>
              {slices.map((s, i) => {
                const gid = gradId(i)
                const hi = highlightForBase(s.color)
                return (
                  <linearGradient key={gid} id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={hi} />
                    <stop offset="100%" stopColor={s.color} />
                  </linearGradient>
                )
              })}
            </defs>
          ) : null}
          {total <= 0 ? (
            <circle cx={cx} cy={cy} r={sliceRadius} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
          ) : loneSlice ? (
            <circle
              key={loneSlice.label}
              cx={cx}
              cy={cy}
              r={sliceRadius}
              fill={`url(#${gradId(0)})`}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1}
              opacity={!dimOthers || loneSlice.label === spotlightActiveLabel ? 1 : 0.28}
              onMouseMove={(e) => {
                const percent = total > 0 ? (loneSlice.value / total) * 100 : 0
                setHover({
                  label: loneSlice.label,
                  value: loneSlice.value,
                  percent,
                  color: loneSlice.color,
                  clientX: e.clientX,
                  clientY: e.clientY,
                })
              }}
              onClick={
                onSpotlightToggle
                  ? () => {
                      onSpotlightToggle(loneSlice.label)
                    }
                  : undefined
              }
            />
          ) : (
            slices.map((s, i) => {
              const d = arcPath(cx, cy, sliceRadius, s.startAngle, s.endAngle)
              const isLit = !dimOthers || s.label === spotlightActiveLabel
              const opacity = isLit ? 1 : 0.28
              return (
                <path
                  key={s.label}
                  d={d}
                  fill={`url(#${gradId(i)})`}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={1}
                  opacity={opacity}
                  onMouseMove={(e) => {
                    const percent = total > 0 ? (s.value / total) * 100 : 0
                    setHover({
                      label: s.label,
                      value: s.value,
                      percent,
                      color: s.color,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    })
                  }}
                  onClick={
                    onSpotlightToggle
                      ? () => {
                          onSpotlightToggle(s.label)
                        }
                      : undefined
                  }
                />
              )
            })
          )}
        </svg>
      </div>

      {hover && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pieTooltip pieTooltip--fixed"
              style={tooltipFixedPosition(hover.clientX, hover.clientY)}
              role="status"
              aria-live="polite"
            >
              <div className="pieTooltipRow">
                <span className="pieSwatch" style={{ background: hover.color }} />
                <span className="pieTooltipLabel">{hover.label}</span>
              </div>
              <div className="pieTooltipMeta">
                {formatPercent(hover.percent)} · {hover.value}
              </div>
            </div>,
            document.body,
          )
        : null}

      {total > 0 ? (
        <div className="pieLegend">
          {slices.slice(0, 10).map((s) => {
            const pressed = interactive && spotlightActiveLabel === s.label
            const dimLegend = dimOthers && spotlightActiveLabel !== s.label
            if (onSpotlightToggle) {
              return (
                <button
                  key={s.label}
                  type="button"
                  className={`pieLegendItem pieLegendItemButton${pressed ? ' isSpotlight' : ''}${dimLegend ? ' isDimmed' : ''}`}
                  aria-pressed={pressed}
                  onClick={() => onSpotlightToggle(s.label)}
                >
                  <span className="pieSwatch" style={{ background: s.color }} />
                  <span className="pieLegendLabel">{s.label}</span>
                  <span className="pieLegendValue">{((s.value / total) * 100).toFixed(1)}%</span>
                </button>
              )
            }
            return (
              <div key={s.label} className="pieLegendItem">
                <span className="pieSwatch" style={{ background: s.color }} />
                <span className="pieLegendLabel">{s.label}</span>
                <span className="pieLegendValue">{((s.value / total) * 100).toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="pieEmpty">No data</div>
      )}
    </div>
  )
}

