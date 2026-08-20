'use client';

import * as React from 'react';

/**
 * Chart primitives.
 *
 * Hand-built SVG rather than a charting dependency, for three reasons:
 *
 *  1. **Theming.** Colours are `rgb(var(--chart-n))`, so light/dark switching
 *     happens in CSS with no re-render and no colour props threaded through.
 *     Most chart libraries need an explicit theme object rebuilt on toggle.
 *  2. **Weight.** The three chart types actually needed here are a few hundred
 *     lines; a general-purpose library is ~100KB gzipped for the same result.
 *  3. **Control.** Smooth curves, axis formatting and tooltip behaviour are
 *     specified exactly rather than fought against defaults.
 *
 * If richer charts are needed later (brushing, zoom, multi-axis), this is the
 * point at which a library becomes the right trade.
 */

// ---------------------------------------------------------------------------
// Sizing
// ---------------------------------------------------------------------------

/**
 * Charts render into a measured pixel box rather than a scaled viewBox, so
 * stroke widths and text stay at their intended size on every screen.
 */
function useMeasure<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0;
      // Rounded to whole pixels: sub-pixel changes would otherwise re-render
      // the chart on every layout tick.
      setWidth(Math.round(measured));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

// ---------------------------------------------------------------------------
// Maths
// ---------------------------------------------------------------------------

/**
 * Produces axis ticks at 1/2/5×10ⁿ intervals.
 *
 * Dividing the range into n equal parts gives axis labels like 3.7 and 7.4;
 * people read round numbers far faster, so the interval is snapped to a
 * "nice" step and the top of the axis extended to match.
 */
function niceScale(max: number, tickCount = 4): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };

  const rawStep = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;

  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= niceMax + step / 2; value += step) ticks.push(value);

  return { max: niceMax, ticks };
}

/**
 * Monotone cubic interpolation.
 *
 * A plain Catmull-Rom spline overshoots on sharp changes, which on a chart
 * means the curve dips below zero between two positive points — implying
 * values that were never recorded. Monotone interpolation cannot overshoot,
 * so the line stays truthful while still reading as smooth.
 */
function monotonePath(points: Array<{ x: number; y: number }>): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;
  if (n === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const dx: number[] = [];
  const dy: number[] = [];
  const slope: number[] = [];

  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }

  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      // A local extremum: flattening here is what prevents the overshoot.
      tangent[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  tangent[n - 1] = slope[n - 2];

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3;
    path +=
      ` C ${points[i].x + third} ${points[i].y + tangent[i] * third},` +
      ` ${points[i + 1].x - third} ${points[i + 1].y - tangent[i + 1] * third},` +
      ` ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return path;
}

const compact = (value: number): string =>
  Math.abs(value) >= 1000
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : String(Math.round(value * 10) / 10);

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function Tooltip({
  x, y, width, title, rows,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  rows: Array<{ label: string; value: string; colour: string }>;
}) {
  const boxWidth = 148;
  // Flips to the left of the cursor near the right edge so it is never clipped.
  const left = x + boxWidth + 16 > width ? x - boxWidth - 12 : x + 12;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 shadow-lift animate-fade-in"
      style={{ left, top: Math.max(0, y - 12), width: boxWidth }}
      role="tooltip"
    >
      <p className="mb-1.5 text-2xs font-semibold text-ink">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-2xs text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.colour }} />
              {row.label}
            </span>
            <span className="text-2xs font-semibold tabular-nums text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Area / line chart
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  label: string;
  values: number[];
}

export function AreaChart({
  data, series, height = 260, valueFormatter = compact,
}: {
  data: SeriesPoint[];
  series: Array<{ name: string; colour: string }>;
  height?: number;
  valueFormatter?: (value: number) => string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);

  const padding = { top: 16, right: 12, bottom: 28, left: 40 };
  const plotWidth = Math.max(0, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;

  const rawMax = Math.max(1, ...data.flatMap((d) => d.values));
  const { max, ticks } = niceScale(rawMax);

  const xFor = (index: number) =>
    padding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const yFor = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;

  // Labels are thinned so they never collide on narrow viewports.
  const labelStep = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / 64))));

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${series.map((s) => s.name).join(' and ')} over time`}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {series.map((entry, index) => (
                <linearGradient key={entry.name} id={`area-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.colour} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={entry.colour} stopOpacity="0.01" />
                </linearGradient>
              ))}
            </defs>

            {/* Horizontal grid only. Vertical lines add clutter without helping
                anyone read a value off the y-axis. */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={padding.left} x2={width - padding.right}
                  y1={yFor(tick)} y2={yFor(tick)}
                  stroke="rgb(var(--chart-grid))" strokeWidth="1"
                />
                <text
                  x={padding.left - 8} y={yFor(tick) + 3.5}
                  textAnchor="end" fontSize="10" fill="rgb(var(--chart-axis))"
                >
                  {valueFormatter(tick)}
                </text>
              </g>
            ))}

            {series.map((entry, seriesIndex) => {
              const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.values[seriesIndex] ?? 0) }));
              const line = monotonePath(points);
              const area =
                `${line} L ${points[points.length - 1].x} ${padding.top + plotHeight}` +
                ` L ${points[0].x} ${padding.top + plotHeight} Z`;

              return (
                <g key={entry.name}>
                  <path d={area} fill={`url(#area-${seriesIndex})`} />
                  <path
                    d={line} fill="none" stroke={entry.colour}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {hover !== null && points[hover] && (
                    <circle
                      cx={points[hover].x} cy={points[hover].y} r="4"
                      fill="rgb(var(--surface))" stroke={entry.colour} strokeWidth="2.5"
                    />
                  )}
                </g>
              );
            })}

            {hover !== null && (
              <line
                x1={xFor(hover)} x2={xFor(hover)}
                y1={padding.top} y2={padding.top + plotHeight}
                stroke="rgb(var(--chart-axis))" strokeWidth="1" strokeDasharray="3 3"
              />
            )}

            {data.map((d, i) => (
              i % labelStep === 0 ? (
                <text
                  key={d.label} x={xFor(i)} y={height - 8}
                  textAnchor="middle" fontSize="10" fill="rgb(var(--chart-axis))"
                >
                  {d.label}
                </text>
              ) : null
            ))}

            {/* Full-height hit areas: requiring the pointer to find a 2px line
                would make the tooltip almost unusable. */}
            {data.map((d, i) => (
              <rect
                key={`hit-${d.label}`}
                x={xFor(i) - plotWidth / Math.max(1, data.length) / 2}
                y={padding.top}
                width={plotWidth / Math.max(1, data.length)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
          </svg>

          {hover !== null && data[hover] && (
            <Tooltip
              x={xFor(hover)}
              y={yFor(Math.max(...data[hover].values))}
              width={width}
              title={data[hover].label}
              rows={series.map((entry, index) => ({
                label: entry.name,
                value: valueFormatter(data[hover].values[index] ?? 0),
                colour: entry.colour,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------

export function DonutChart({
  data, size = 190, thickness = 26, centreLabel, centreValue,
}: {
  data: Array<{ label: string; value: number; colour: string }>;
  size?: number;
  thickness?: number;
  centreLabel?: string;
  centreValue?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          role="img" aria-label="Distribution by status"
          className="-rotate-90"
        >
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgb(var(--chart-grid))" strokeWidth={thickness}
          />
          {total > 0 && data.map((segment, index) => {
            const fraction = segment.value / total;
            const dash = fraction * circumference;
            const element = (
              <circle
                key={segment.label}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={segment.colour}
                strokeWidth={hover === index ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                // Rounded caps look neat on one segment and overlap badly on
                // several, so the ends stay butt-joined.
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            );
            offset += dash;
            return element;
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-ink">
            {hover !== null ? data[hover].value : (centreValue ?? total)}
          </span>
          <span className="mt-0.5 max-w-[80px] text-center text-2xs text-ink-muted">
            {hover !== null ? data[hover].label : (centreLabel ?? 'Total')}
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {data.map((segment, index) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-surface-2"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: segment.colour }} />
              <span className="truncate text-xs text-ink-muted">{segment.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-xs font-semibold tabular-nums text-ink">{segment.value}</span>
              <span className="text-2xs tabular-nums text-ink-faint">
                {total > 0 ? `${Math.round((segment.value / total) * 100)}%` : '0%'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bars
// ---------------------------------------------------------------------------

export function BarChart({
  data, height = 240, horizontal = false, valueFormatter = compact,
}: {
  data: Array<{ label: string; value: number; colour?: string; secondary?: number }>;
  height?: number;
  horizontal?: boolean;
  valueFormatter?: (value: number) => string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);

  const rawMax = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const { max, ticks } = niceScale(rawMax);

  if (horizontal) {
    // Horizontal bars for category comparisons: long branch or person names
    // stay readable instead of being rotated or truncated.
    return (
      <div ref={ref} className="w-full space-y-3">
        {data.map((row, index) => (
          <div
            key={row.label}
            className="group"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="truncate text-xs text-ink-muted">{row.label}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                {valueFormatter(row.value)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-all duration-500 ease-swift"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  background: row.colour ?? 'rgb(var(--chart-1))',
                  opacity: hover === null || hover === index ? 1 : 0.45,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const padding = { top: 16, right: 12, bottom: 28, left: 40 };
  const plotWidth = Math.max(0, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;
  const slot = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(28, slot * 0.55);

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <>
          <svg width={width} height={height} role="img" aria-label="Comparison by category">
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={padding.left} x2={width - padding.right}
                  y1={padding.top + plotHeight - (tick / max) * plotHeight}
                  y2={padding.top + plotHeight - (tick / max) * plotHeight}
                  stroke="rgb(var(--chart-grid))" strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={padding.top + plotHeight - (tick / max) * plotHeight + 3.5}
                  textAnchor="end" fontSize="10" fill="rgb(var(--chart-axis))"
                >
                  {valueFormatter(tick)}
                </text>
              </g>
            ))}

            {data.map((row, index) => {
              const barHeight = (row.value / max) * plotHeight;
              const x = padding.left + slot * index + slot / 2 - barWidth / 2;

              return (
                <g
                  key={row.label}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect
                    x={padding.left + slot * index} y={padding.top}
                    width={slot} height={plotHeight} fill="transparent"
                  />
                  <rect
                    x={x} y={padding.top + plotHeight - barHeight}
                    width={barWidth} height={Math.max(2, barHeight)}
                    rx="5"
                    fill={row.colour ?? 'rgb(var(--chart-1))'}
                    opacity={hover === null || hover === index ? 1 : 0.45}
                    className="transition-all duration-200"
                  />
                  <text
                    x={padding.left + slot * index + slot / 2} y={height - 8}
                    textAnchor="middle" fontSize="10" fill="rgb(var(--chart-axis))"
                  >
                    {row.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {hover !== null && (
            <Tooltip
              x={padding.left + slot * hover + slot / 2}
              y={padding.top + plotHeight - (data[hover].value / max) * plotHeight}
              width={width}
              title={data[hover].label}
              rows={[{
                label: 'Value',
                value: valueFormatter(data[hover].value),
                colour: data[hover].colour ?? 'rgb(var(--chart-1))',
              }]}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/** Trend indicator small enough to sit inside a KPI card. */
export function Sparkline({
  values, colour = 'rgb(var(--chart-1))', width = 88, height = 30,
}: {
  values: number[];
  colour?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - 2 - ((value - min) / span) * (height - 4),
  }));

  const id = React.useId();

  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.20" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${monotonePath(points)} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#spark-${id})`}
      />
      <path
        d={monotonePath(points)}
        fill="none" stroke={colour} strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/** Named chart colours, so pages never hard-code a palette entry. */
export const CHART_COLOURS = {
  1: 'rgb(var(--chart-1))',
  2: 'rgb(var(--chart-2))',
  3: 'rgb(var(--chart-3))',
  4: 'rgb(var(--chart-4))',
  5: 'rgb(var(--chart-5))',
  6: 'rgb(var(--chart-6))',
} as const;

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex w-full items-end gap-2 px-2" style={{ height }} aria-hidden>
      {[38, 62, 48, 76, 55, 88, 66, 44, 72, 58, 82, 50].map((percentage, index) => (
        <div
          key={index}
          className="flex-1 animate-pulse rounded-t-lg bg-surface-3"
          style={{ height: `${percentage}%`, animationDelay: `${index * 40}ms` }}
        />
      ))}
    </div>
  );
}
