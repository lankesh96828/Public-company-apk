import React from 'react';
import {
  Crown,
  Flame,
  Flag,
  Hand,
  Heart,
  Music,
  Shield,
  Smile,
  Trophy,
  Zap,
} from 'lucide-react';
import { EMOTE_CATALOG, EmoteDef } from '../game/types';

export const EMOTE_WHEEL_SLOTS = 8;

/**
 * Resolves a 2D drag vector (dx, dy) into one of 8 clockwise radial sectors
 * starting at 12 o'clock (North = 0, NE = 1, E = 2, ... NW = 7).
 * Returns null inside the center cancel deadzone.
 */
export function resolveWheelSector(
  dx: number,
  dy: number,
  deadzonePx = 22
): number | null {
  const dist = Math.hypot(dx, dy);
  if (dist < deadzonePx) return null;
  // Angle clockwise from 12 o'clock (0 deg = North, 90 deg = East)
  const degFromNorth = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return Math.floor((degFromNorth + 22.5) / 45) % EMOTE_WHEEL_SLOTS;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function describeWedgePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number
): string {
  const sRad = degToRad(startDeg);
  const eRad = degToRad(endDeg);
  const x1 = cx + outerR * Math.cos(sRad);
  const y1 = cy + outerR * Math.sin(sRad);
  const x2 = cx + outerR * Math.cos(eRad);
  const y2 = cy + outerR * Math.sin(eRad);
  const x3 = cx + innerR * Math.cos(eRad);
  const y3 = cy + innerR * Math.sin(eRad);
  const x4 = cx + innerR * Math.cos(sRad);
  const y4 = cy + innerR * Math.sin(sRad);

  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function renderEmoteGlyph(emoteId: string, color: string, active: boolean) {
  const cls = `h-4 w-4 transition-transform duration-100 ${active ? 'scale-110' : ''}`;
  const style = { color };
  switch (emoteId) {
    case 'hello':
      return <Hand className={cls} style={style} />;
    case 'booyah':
      return <Trophy className={cls} style={style} />;
    case 'dab':
      return <Zap className={cls} style={style} />;
    case 'lol':
      return <Smile className={cls} style={style} />;
    case 'pushup':
      return <Flame className={cls} style={style} />;
    case 'heart':
      return <Heart className={cls} style={style} />;
    case 'moonwalk':
      return <Music className={cls} style={style} />;
    case 'draco_flex':
      return <Shield className={cls} style={style} />;
    case 'flag':
      return <Flag className={cls} style={style} />;
    case 'throne':
      return <Crown className={cls} style={style} />;
    default:
      return <Smile className={cls} style={style} />;
  }
}

interface RadialEmoteWheelProps {
  equippedEmotes: string[];
  selectedSlot: number | null;
  activeEmoteId?: string | null;
  cursorVector: { dx: number; dy: number };
  pinnedMode: boolean;
  onSelectSlotHover: (slot: number | null) => void;
  onTriggerSlot: (slot: number) => void;
  onClose: () => void;
}

export const RadialEmoteWheel: React.FC<RadialEmoteWheelProps> = ({
  equippedEmotes,
  selectedSlot,
  activeEmoteId,
  cursorVector,
  pinnedMode,
  onSelectSlotHover,
  onTriggerSlot,
  onClose,
}) => {
  const slots: (EmoteDef | null)[] = Array.from({ length: EMOTE_WHEEL_SLOTS }, (_, i) => {
    const id = equippedEmotes[i];
    return id ? EMOTE_CATALOG.find((item) => item.id === id) || null : null;
  });

  const selectedEmote = selectedSlot !== null ? slots[selectedSlot] : null;
  const cx = 170;
  const cy = 170;
  const innerR = 54;
  const outerR = 160;
  const labelR = 109;
  const gapDeg = 2.6;

  // Clamp directional cursor dot inside the center hub
  const mag = Math.hypot(cursorVector.dx, cursorVector.dy);
  const clampedDist = mag > 0 ? Math.min(36, (mag / 90) * 36) : 0;
  const knobX = mag > 0 ? (cursorVector.dx / mag) * clampedDist : 0;
  const knobY = mag > 0 ? (cursorVector.dy / mag) * clampedDist : 0;

  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        if (pinnedMode && e.target === e.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-[2px] touch-none select-none"
      role="dialog"
      aria-label="8-Slot Emote Wheel"
    >
      <div className="relative flex flex-col items-center">
        <div className="mb-2 rounded border border-white/15 bg-[#0b0e13]/90 px-3 py-1 text-[10px] font-mono-tabular tracking-wider text-slate-300 shadow-lg">
          {pinnedMode
            ? 'TAP SLOT OR PRESS [1-8] TO EMOTE'
            : 'DRAG TO SELECT · RELEASE TO PLAY'}
        </div>

        <div className="relative h-[320px] w-[320px] sm:h-[340px] sm:w-[340px]">
          <svg
            viewBox="0 0 340 340"
            className="h-full w-full drop-shadow-[0_14px_32px_rgba(0,0,0,0.85)]"
          >
            {/* Outer tactical ring */}
            <circle
              cx={cx}
              cy={cy}
              r={outerR + 4}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.5"
            />

            {slots.map((em, idx) => {
              // Sector 0 centered at -90 deg (12 o'clock)
              const centerDeg = -90 + idx * 45;
              const startDeg = centerDeg - 22.5 + gapDeg / 2;
              const endDeg = centerDeg + 22.5 - gapDeg / 2;
              const pathD = describeWedgePath(cx, cy, innerR, outerR, startDeg, endDeg);
              const isSelected = selectedSlot === idx;
              const isPlaying = Boolean(em && activeEmoteId === em.id);
              const accent = em?.accentHex || '#64748B';

              return (
                <g
                  key={idx}
                  onPointerEnter={() => onSelectSlotHover(idx)}
                  onPointerLeave={() => {
                    if (pinnedMode) onSelectSlotHover(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (em) onTriggerSlot(idx);
                    else onClose();
                  }}
                  className={em ? 'cursor-pointer' : 'cursor-default'}
                >
                  <path
                    d={pathD}
                    fill={
                      isSelected && em
                        ? `${accent}36`
                        : isPlaying
                        ? 'rgba(245, 158, 11, 0.22)'
                        : em
                        ? 'rgba(13, 18, 25, 0.92)'
                        : 'rgba(11, 14, 19, 0.72)'
                    }
                    stroke={
                      isSelected
                        ? em
                          ? accent
                          : 'rgba(148,163,184,0.65)'
                        : isPlaying
                        ? '#F59E0B'
                        : 'rgba(255,255,255,0.14)'
                    }
                    strokeWidth={isSelected ? 2.4 : 1.2}
                    className="transition-colors duration-100"
                  />
                </g>
              );
            })}
          </svg>

          {/* HTML labels layered cleanly over SVG sectors */}
          {slots.map((em, idx) => {
            const rad = degToRad(-90 + idx * 45);
            const pctX = ((cx + labelR * Math.cos(rad)) / 340) * 100;
            const pctY = ((cy + labelR * Math.sin(rad)) / 340) * 100;
            const isSelected = selectedSlot === idx;
            const isPlaying = Boolean(em && activeEmoteId === em.id);
            const accent = em?.accentHex || '#64748B';

            return (
              <button
                key={idx}
                type="button"
                onPointerEnter={() => onSelectSlotHover(idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (em) onTriggerSlot(idx);
                  else onClose();
                }}
                style={{
                  left: `${pctX}%`,
                  top: `${pctY}%`,
                  transform: `translate(-50%, -50%) scale(${isSelected && em ? 1.07 : 1})`,
                }}
                aria-label={em ? `Slot ${idx + 1}: ${em.name}` : `Slot ${idx + 1}: Empty`}
                className="pointer-events-auto absolute flex w-[68px] flex-col items-center justify-center text-center transition-transform duration-100 focus:outline-none"
              >
                <span className="font-mono-tabular text-[9px] font-bold leading-none text-slate-400">
                  {idx + 1}
                </span>
                {em ? (
                  <>
                    <div
                      className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full border ${
                        isSelected || isPlaying
                          ? 'bg-black/60'
                          : 'border-white/15 bg-black/40'
                      }`}
                      style={{
                        borderColor: isSelected || isPlaying ? accent : undefined,
                      }}
                    >
                      {renderEmoteGlyph(em.id, accent, isSelected)}
                    </div>
                    <span
                      className={`mt-1 w-full truncate text-[10px] font-bold leading-tight ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {em.name}
                    </span>
                  </>
                ) : (
                  <span className="mt-2 text-[9px] font-semibold text-slate-500">EMPTY</span>
                )}
              </button>
            );
          })}

          {/* Center Deadzone Hub */}
          <button
            type="button"
            onPointerEnter={() => onSelectSlotHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Cancel Emote Wheel"
            className="pointer-events-auto absolute left-1/2 top-1/2 flex h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-white/20 bg-[#0b0e13]/95 p-2 text-center shadow-inner transition-colors hover:border-white/35 focus:outline-none"
            style={{
              borderColor: selectedEmote ? selectedEmote.accentHex : undefined,
            }}
          >
            {/* Live directional indicator dot inside center hub */}
            {mag >= 6 && (
              <div
                aria-hidden="true"
                style={{
                  transform: `translate(${knobX.toFixed(1)}px, ${knobY.toFixed(1)}px)`,
                  backgroundColor: selectedEmote ? selectedEmote.accentHex : '#94A3B8',
                }}
                className="pointer-events-none absolute h-2.5 w-2.5 rounded-full opacity-90 shadow"
              />
            )}

            {selectedSlot === null ? (
              <>
                <span className="text-[10px] font-bold tracking-wider text-slate-300">
                  CANCEL
                </span>
                <span className="mt-0.5 text-[9px] text-slate-500">CENTER</span>
              </>
            ) : selectedEmote ? (
              <>
                <span
                  className="text-[9px] font-mono-tabular font-bold uppercase tracking-wider"
                  style={{ color: selectedEmote.accentHex }}
                >
                  {selectedEmote.rarity}
                </span>
                <span className="mt-0.5 w-full truncate text-[11px] font-bold text-white leading-tight">
                  {selectedEmote.name}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold text-slate-400">EMPTY</span>
                <span className="mt-0.5 text-[9px] text-slate-500">SLOT {selectedSlot + 1}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
