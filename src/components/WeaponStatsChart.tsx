import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WeaponDef, WeaponId } from '../game/types';

export interface WeaponStatMetric {
  key: 'damage' | 'rate' | 'range' | 'accuracy' | 'mobility';
  label: string;
  shortLabel: string;
  value: number;
  rawText: string;
}

export function getWeaponStatMetrics(weapon: WeaponDef): WeaponStatMetric[] {
  const mobility = Math.min(
    100,
    Math.max(20, Math.round(50 + (weapon.moveSpeedMult - 0.94) * 350))
  );
  const rawDamage =
    weapon.pellets > 1 ? `${weapon.damage}×${weapon.pellets}` : `${weapon.damage}`;

  return [
    {
      key: 'damage',
      label: 'Damage',
      shortLabel: 'DMG',
      value: weapon.statBars.damage,
      rawText: rawDamage,
    },
    {
      key: 'rate',
      label: 'Fire Rate',
      shortLabel: 'RATE',
      value: weapon.statBars.rate,
      rawText: `${weapon.fireRate}/s`,
    },
    {
      key: 'range',
      label: 'Range',
      shortLabel: 'RNG',
      value: weapon.statBars.range,
      rawText: `${weapon.range}m`,
    },
    {
      key: 'accuracy',
      label: 'Accuracy',
      shortLabel: 'ACC',
      value: weapon.statBars.accuracy,
      rawText: `${weapon.magSize} mag`,
    },
    {
      key: 'mobility',
      label: 'Mobility',
      shortLabel: 'MOB',
      value: mobility,
      rawText: `${Math.round(weapon.moveSpeedMult * 100)}%`,
    },
  ];
}

interface WeaponSilhouetteProps {
  weaponId: WeaponId;
  primaryHex: string;
  accentHex: string;
  emissiveIntensity?: number;
}

export const WeaponSilhouette: React.FC<WeaponSilhouetteProps> = ({
  weaponId,
  primaryHex,
  accentHex,
  emissiveIntensity = 0,
}) => {
  const glowStyle =
    emissiveIntensity > 0.25
      ? { filter: `drop-shadow(0 0 10px ${accentHex}55)` }
      : undefined;

  return (
    <svg
      viewBox="0 0 260 88"
      className="h-20 w-full max-w-[260px]"
      style={glowStyle}
      aria-hidden="true"
    >
      {weaponId === 'ak47' && (
        <g>
          <polygon points="18,44 62,36 64,52 14,62" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="62" y="34" width="84" height="17" rx="2" fill="#334155" stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="146" y="35" width="46" height="14" rx="2" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="192" y="38" width="52" height="6" rx="1" fill="#64748b" />
          <rect x="234" y="31" width="4" height="7" fill={accentHex} />
          <path d="M122 51 L138 51 L148 78 L131 81 Z" fill={accentHex} stroke="#0b0e13" strokeWidth="1.4" />
          <path d="M74 51 L86 51 L78 74 L67 72 Z" fill="#1e293b" />
          <rect x="82" y="29" width="96" height="4" rx="1" fill={accentHex} />
        </g>
      )}
      {weaponId === 'scar' && (
        <g>
          <polygon points="18,35 66,33 66,55 24,58 18,49" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="66" y="32" width="112" height="19" rx="2" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="178" y="37" width="60" height="6" rx="1" fill="#64748b" />
          <rect x="232" y="35" width="10" height="10" rx="1" fill={accentHex} />
          <rect x="128" y="51" width="17" height="26" rx="2" fill={accentHex} stroke="#0b0e13" strokeWidth="1.4" />
          <path d="M84 51 L96 51 L89 72 L78 70 Z" fill="#1e293b" />
          <rect x="92" y="22" width="38" height="10" rx="2" fill="#334155" stroke="#0b0e13" strokeWidth="1.2" />
          <circle cx="127" cy="27" r="3" fill={accentHex} />
          <rect x="94" y="39" width="76" height="4" rx="1" fill={accentHex} />
        </g>
      )}
      {weaponId === 'mp40' && (
        <g>
          <path d="M24 38 L68 38 L68 43 L28 45 L24 54 L18 54 L18 40 Z" fill="#475569" />
          <rect x="68" y="33" width="96" height="16" rx="3" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="164" y="37" width="54" height="6" rx="1" fill="#64748b" />
          <rect x="126" y="49" width="12" height="32" rx="1.5" fill={accentHex} stroke="#0b0e13" strokeWidth="1.4" />
          <path d="M80 49 L92 49 L85 73 L74 71 Z" fill="#1e293b" />
          <rect x="86" y="29" width="66" height="4" rx="1" fill={accentHex} />
        </g>
      )}
      {weaponId === 'm1887' && (
        <g>
          <polygon points="18,46 66,38 68,52 24,66" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="66" y="36" width="50" height="17" rx="2" fill={accentHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="116" y="34" width="122" height="7" rx="1" fill="#64748b" />
          <rect x="116" y="43" width="114" height="6" rx="1" fill="#334155" />
          <rect x="128" y="48" width="58" height="9" rx="2" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.2" />
          <rect x="126" y="31" width="96" height="3" rx="1" fill={accentHex} />
        </g>
      )}
      {weaponId === 'awm' && (
        <g>
          <polygon points="12,41 56,36 58,52 14,57" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="56" y="35" width="106" height="16" rx="2" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="162" y="38" width="76" height="6" rx="1" fill="#64748b" />
          <rect x="234" y="35" width="14" height="12" rx="1" fill={accentHex} stroke="#0b0e13" strokeWidth="1.2" />
          <rect x="92" y="18" width="62" height="11" rx="3" fill="#334155" stroke="#0b0e13" strokeWidth="1.3" />
          <rect x="150" y="19" width="6" height="9" rx="1" fill={accentHex} />
          <rect x="104" y="29" width="6" height="6" fill="#475569" />
          <rect x="136" y="29" width="6" height="6" fill="#475569" />
          <rect x="114" y="51" width="22" height="17" rx="2" fill={accentHex} stroke="#0b0e13" strokeWidth="1.3" />
          <path d="M68 51 L80 51 L73 72 L62 70 Z" fill="#1e293b" />
        </g>
      )}
      {weaponId === 'deagle' && (
        <g>
          <rect x="74" y="24" width="112" height="18" rx="2" fill={primaryHex} stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="86" y="19" width="84" height="5" rx="1" fill={accentHex} />
          <rect x="78" y="42" width="86" height="8" rx="1" fill="#475569" />
          <path d="M82 48 L108 48 L96 76 L72 74 Z" fill="#334155" stroke="#0b0e13" strokeWidth="1.5" />
          <rect x="114" y="48" width="22" height="12" rx="2" fill="none" stroke="#64748b" strokeWidth="3" />
          <circle cx="182" cy="31" r="2.5" fill={accentHex} />
        </g>
      )}
    </svg>
  );
};

interface WeaponStatsChartProps {
  weapon: WeaponDef;
  accentHex: string;
}

type ChartViewMode = 'radar' | 'bars';

export const WeaponStatsChart: React.FC<WeaponStatsChartProps> = ({ weapon, accentHex }) => {
  const [chartMode, setChartMode] = useState<ChartViewMode>('radar');
  const [hoveredAxis, setHoveredAxis] = useState<WeaponStatMetric['key'] | null>(null);

  const metrics = useMemo(() => getWeaponStatMetrics(weapon), [weapon]);
  const targetValues = useMemo(() => metrics.map((m) => m.value), [metrics]);
  const [animatedValues, setAnimatedValues] = useState<number[]>(targetValues);
  const animatedRef = useRef<number[]>(targetValues);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      animatedRef.current = targetValues;
      setAnimatedValues(targetValues);
      return;
    }

    const startValues = [...animatedRef.current];
    const startTime = performance.now();
    const duration = 200;
    let rafId = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = targetValues.map((target, idx) => {
        const from = startValues[idx] ?? target;
        return from + (target - from) * eased;
      });
      animatedRef.current = next;
      setAnimatedValues(next);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetValues]);

  // Radar geometry (5 axes starting at top 12 o'clock)
  const cx = 104;
  const cy = 90;
  const maxR = 58;
  const ringLevels = [0.25, 0.5, 0.75, 1];

  const getPoint = (axisIdx: number, pct: number) => {
    const angle = -Math.PI / 2 + (axisIdx * 2 * Math.PI) / metrics.length;
    const r = (pct / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  const dataPolygonPoints = animatedValues
    .map((val, idx) => {
      const pt = getPoint(idx, val);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const hoveredMetric = metrics.find((m) => m.key === hoveredAxis) || null;

  return (
    <div className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#0e1218]/90 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
            Ballistic Profile
          </div>
          <div className="text-[10px] text-slate-400 font-mono-tabular">
            {hoveredMetric
              ? `${hoveredMetric.label}: ${hoveredMetric.value}/100 (${hoveredMetric.rawText})`
              : `${weapon.category} · ${weapon.auto ? 'Full-Auto' : 'Semi / Single'}`}
          </div>
        </div>

        <div
          role="group"
          aria-label="Weapon stats visualization mode"
          className="flex items-center gap-0.5 rounded-md border border-white/10 bg-[#141a24] p-0.5"
        >
          <button
            type="button"
            onClick={() => setChartMode('radar')}
            className={`rounded px-2 py-1 text-[10px] font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
              chartMode === 'radar'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Radar
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            className={`rounded px-2 py-1 text-[10px] font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
              chartMode === 'bars'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Bars
          </button>
        </div>
      </div>

      {chartMode === 'radar' ? (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <svg
            viewBox="0 0 208 178"
            className="h-[164px] w-[196px] shrink-0 select-none"
            role="img"
            aria-label={`${weapon.name} radar chart showing Damage ${weapon.statBars.damage}, Fire Rate ${weapon.statBars.rate}, Range ${weapon.statBars.range}, Accuracy ${weapon.statBars.accuracy}`}
          >
            {ringLevels.map((lvl) => {
              const pts = metrics
                .map((_, idx) => {
                  const p = getPoint(idx, lvl * 100);
                  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                })
                .join(' ');
              return (
                <polygon
                  key={lvl}
                  points={pts}
                  fill={lvl === 1 ? 'rgba(255,255,255,0.02)' : 'none'}
                  stroke="rgba(255,255,255,0.11)"
                  strokeWidth="1"
                />
              );
            })}

            {metrics.map((metric, idx) => {
              const outer = getPoint(idx, 100);
              const labelPt = getPoint(idx, 126);
              const isHighlighted = hoveredAxis === metric.key;
              return (
                <g key={metric.key}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={isHighlighted ? accentHex : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isHighlighted ? '1.4' : '1'}
                  />
                  <text
                    x={labelPt.x}
                    y={labelPt.y + 3}
                    textAnchor="middle"
                    className="cursor-pointer fill-current text-[9px] font-bold tracking-wider"
                    fill={isHighlighted ? '#fbbf24' : '#94a3b8'}
                    onMouseEnter={() => setHoveredAxis(metric.key)}
                    onMouseLeave={() => setHoveredAxis(null)}
                  >
                    {metric.shortLabel}
                  </text>
                </g>
              );
            })}

            <polygon
              points={dataPolygonPoints}
              fill={accentHex}
              fillOpacity="0.26"
              stroke={accentHex}
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {animatedValues.map((val, idx) => {
              const metric = metrics[idx];
              const pt = getPoint(idx, val);
              const isHighlighted = hoveredAxis === metric.key;
              return (
                <circle
                  key={metric.key}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHighlighted ? 4.2 : 3}
                  fill={isHighlighted ? '#ffffff' : accentHex}
                  stroke="#0b0e13"
                  strokeWidth="1.2"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis(metric.key)}
                  onMouseLeave={() => setHoveredAxis(null)}
                />
              );
            })}
          </svg>

          <div className="w-full flex-1 space-y-1.5 min-w-0">
            {metrics.map((m) => {
              const active = hoveredAxis === m.key;
              return (
                <div
                  key={m.key}
                  onMouseEnter={() => setHoveredAxis(m.key)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-[11px] transition-colors ${
                    active ? 'bg-white/10' : 'bg-white/[0.03]'
                  }`}
                >
                  <span className="text-slate-300 font-medium truncate">{m.label}</span>
                  <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                    <span className="text-[10px] text-slate-400">{m.rawText}</span>
                    <span className="w-6 text-right font-bold text-white">{m.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2 py-1">
          {metrics.map((m) => (
            <div
              key={m.key}
              onMouseEnter={() => setHoveredAxis(m.key)}
              onMouseLeave={() => setHoveredAxis(null)}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-300">{m.label}</span>
                <span className="font-mono-tabular text-slate-200">
                  <span className="text-slate-400 mr-2">{m.rawText}</span>
                  <span className="font-bold text-white">{m.value}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-sm bg-white/10">
                <div
                  className="h-full w-full origin-left transition-transform duration-200"
                  style={{
                    backgroundColor: accentHex,
                    transform: `scaleX(${Math.max(0.04, m.value / 100)})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
