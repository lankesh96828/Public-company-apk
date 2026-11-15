import React, { useRef, useState } from 'react';
import {
  AimPrecisionMode,
  ControlSettings,
  HudControlSlotId,
  SensitivitySettings,
} from '../game/types';
import {
  cloneHudLayout,
  DEFAULT_HUD_LAYOUT,
  DEFAULT_SENSITIVITY_SETTINGS,
  HUD_SLOT_LABELS,
} from '../game/controls';
import {
  Crosshair,
  Eye,
  LayoutGrid,
  Move,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../game/audio';

interface ControlsCustomizerModalProps {
  settings: ControlSettings;
  initialTab?: 'sensitivity' | 'hud';
  onChange: (next: ControlSettings) => void;
  onClose: () => void;
}

const SENSITIVITY_ROWS: {
  key: keyof SensitivitySettings;
  label: string;
  desc: string;
}[] = [
  { key: 'general', label: 'General', desc: 'Hipfire, running camera & parachute look' },
  { key: 'redDot', label: 'Red Dot', desc: 'AK47, MP40, M1887 & Deagle ADS speed' },
  { key: 'scope2x', label: '2x Scope', desc: 'SCAR-Titan mid-range ADS speed' },
  { key: 'scope4x', label: '4x Scope', desc: 'AWM Dragon precision sniper scope' },
  { key: 'freeLook', label: 'Free Look', desc: '360° Eye orbit sensitivity while sprinting' },
];

const AIM_PRECISION_OPTIONS: {
  id: AimPrecisionMode;
  label: string;
  desc: string;
}[] = [
  {
    id: 'default',
    label: 'Default',
    desc: 'Free Fire soft reticle lock for hipfire & scoped bursts',
  },
  {
    id: 'precise_scope',
    label: 'Precise on Scope',
    desc: 'Assist on hipfire, 100% manual headshots when scoped',
  },
  {
    id: 'full_control',
    label: 'Full Control',
    desc: 'Zero aim assist — pure raw skill & drag-headshot control',
  },
];

export const ControlsCustomizerModal: React.FC<ControlsCustomizerModalProps> = ({
  settings,
  initialTab = 'sensitivity',
  onChange,
  onClose,
}) => {
  const [tab, setTab] = useState<'sensitivity' | 'hud'>(initialTab);
  const [selectedSlot, setSelectedSlot] = useState<HudControlSlotId>('fireRight');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    slotId: HudControlSlotId;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const updateSensitivity = (key: keyof SensitivitySettings, value: number) => {
    onChange({
      ...settings,
      sensitivity: {
        ...settings.sensitivity,
        [key]: Math.max(10, Math.min(200, Math.round(value))),
      },
    });
  };

  const resetSensitivity = () => {
    soundEngine.playClick();
    onChange({
      ...settings,
      sensitivity: { ...DEFAULT_SENSITIVITY_SETTINGS },
      aimPrecision: 'default',
      leftFireAlways: true,
    });
  };

  const resetAllHud = () => {
    soundEngine.playClick();
    onChange({
      ...settings,
      hudLayout: cloneHudLayout(DEFAULT_HUD_LAYOUT),
    });
  };

  const resetSelectedHud = () => {
    soundEngine.playClick();
    onChange({
      ...settings,
      hudLayout: {
        ...settings.hudLayout,
        [selectedSlot]: { ...DEFAULT_HUD_LAYOUT[selectedSlot] },
      },
    });
  };

  const updateSelectedSlot = (patch: Partial<{ scale: number; opacity: number }>) => {
    const cur = settings.hudLayout[selectedSlot];
    onChange({
      ...settings,
      hudLayout: {
        ...settings.hudLayout,
        [selectedSlot]: {
          ...cur,
          ...patch,
        },
      },
    });
  };

  const handleSlotPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    slotId: HudControlSlotId
  ) => {
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const cur = settings.hudLayout[slotId];
    const slotCenterX = rect.left + (cur.xPct / 100) * rect.width;
    const slotCenterY = rect.top + (cur.yPct / 100) * rect.height;

    setSelectedSlot(slotId);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      slotId,
      pointerId: e.pointerId,
      offsetX: e.clientX - slotCenterX,
      offsetY: e.clientY - slotCenterY,
    };
  };

  const handleSlotPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !stage) return;
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - drag.offsetX - rect.left;
    const cy = e.clientY - drag.offsetY - rect.top;
    const xPct = Math.max(6, Math.min(94, (cx / rect.width) * 100));
    const yPct = Math.max(12, Math.min(92, (cy / rect.height) * 100));

    onChange({
      ...settings,
      hudLayout: {
        ...settings.hudLayout,
        [drag.slotId]: {
          ...settings.hudLayout[drag.slotId],
          xPct: Math.round(xPct * 10) / 10,
          yPct: Math.round(yPct * 10) / 10,
        },
      },
    });
  };

  const handleSlotPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  if (tab === 'hud') {
    const curSlot = settings.hudLayout[selectedSlot];
    const slotMeta = HUD_SLOT_LABELS[selectedSlot];

    return (
      <div
        ref={stageRef}
        className="pointer-events-auto fixed inset-0 z-50 overflow-hidden bg-[#090d14]/95 select-none touch-none"
      >
        {/* Subtle Tactical Grid Backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Reference Landmarks (Minimap, Alive/Kills, HP Bar) */}
        <div className="pointer-events-none absolute left-3 top-3 flex h-28 w-28 flex-col items-center justify-center rounded-lg border border-dashed border-white/25 bg-[#0e1218]/80 text-[10px] font-mono-tabular text-slate-400">
          MINIMAP
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-dashed border-white/25 bg-[#0e1218]/80 px-3 py-2 text-[10px] font-mono-tabular text-slate-400">
          ALIVE · KILLS · PAUSE
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 w-52 rounded-lg border border-dashed border-white/25 bg-[#0e1218]/80 px-3 py-2 text-[10px] font-mono-tabular text-slate-400">
          HP / EP / ARMOR BAR
        </div>

        {/* Center Top Editor Control Bar */}
        <div className="fixed left-1/2 top-3 z-20 flex w-[94%] max-w-2xl -translate-x-1/2 flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-500/40 bg-[#111621] px-3.5 py-2.5 shadow-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <Move className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{slotMeta.label}</div>
              <div className="text-[10px] text-slate-400">Drag any button to reposition</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span>Size</span>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={curSlot.scale}
                onChange={(e) => updateSelectedSlot({ scale: parseFloat(e.target.value) })}
                className="w-20 accent-amber-500"
              />
              <span className="w-9 font-mono-tabular text-amber-400">
                {Math.round(curSlot.scale * 100)}%
              </span>
            </label>

            <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span>Alpha</span>
              <input
                type="range"
                min="0.35"
                max="1"
                step="0.05"
                value={curSlot.opacity}
                onChange={(e) => updateSelectedSlot({ opacity: parseFloat(e.target.value) })}
                className="w-20 accent-sky-400"
              />
              <span className="w-9 font-mono-tabular text-sky-400">
                {Math.round(curSlot.opacity * 100)}%
              </span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={resetSelectedHud}
              className="rounded-md border border-white/15 bg-[#1a2232] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-white/30"
            >
              Reset Btn
            </button>
            <button
              onClick={resetAllHud}
              className="flex items-center gap-1 rounded-md border border-red-400/40 bg-red-950/50 px-2.5 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-900/60"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                setTab('sensitivity');
              }}
              className="rounded-md border border-white/15 bg-[#1a2232] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:text-amber-300"
            >
              Sensitivity
            </button>
            <button
              onClick={() => {
                soundEngine.playTopUpSuccess();
                onClose();
              }}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400"
            >
              Save &amp; Done
            </button>
          </div>
        </div>

        {/* Draggable HUD Elements */}
        {(Object.keys(DEFAULT_HUD_LAYOUT) as HudControlSlotId[]).map((slotId) => {
          const tf = settings.hudLayout[slotId];
          const isSelected = selectedSlot === slotId;
          const meta = HUD_SLOT_LABELS[slotId];

          const isJoystick = slotId === 'joystick';
          const isFire = slotId === 'fireRight' || slotId === 'fireLeft';
          const isWeaponBar = slotId === 'weaponBar';

          return (
            <div
              key={slotId}
              onPointerDown={(e) => handleSlotPointerDown(e, slotId)}
              onPointerMove={handleSlotPointerMove}
              onPointerUp={handleSlotPointerUp}
              onPointerCancel={handleSlotPointerUp}
              style={{
                left: `${tf.xPct}%`,
                top: `${tf.yPct}%`,
                transform: `translate(-50%, -50%) scale(${tf.scale})`,
                opacity: tf.opacity,
              }}
              className={`fixed cursor-grab active:cursor-grabbing flex items-center justify-center transition-shadow ${
                isJoystick
                  ? 'h-32 w-32 rounded-full border-2 bg-[#0e141d]/85'
                  : isWeaponBar
                  ? 'h-14 w-64 rounded-lg border-2 bg-[#0e141d]/90 gap-2 px-2'
                  : isFire
                  ? 'h-18 w-18 rounded-full border-2 bg-amber-500/30'
                  : 'h-13 w-13 rounded-full border-2 bg-[#0e141d]/90'
              } ${
                isSelected
                  ? 'border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)] z-10'
                  : 'border-white/35'
              }`}
            >
              {isJoystick ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="h-10 w-10 rounded-full border border-white/40 bg-white/15" />
                  <span className="text-[10px] font-bold tracking-wider text-slate-200">
                    {meta.shortLabel}
                  </span>
                </div>
              ) : isWeaponBar ? (
                <>
                  <div className="flex-1 rounded border border-amber-400/50 bg-amber-500/15 py-1.5 text-center text-[10px] font-bold text-amber-300">
                    SLOT 1
                  </div>
                  <div className="flex-1 rounded border border-white/15 bg-white/5 py-1.5 text-center text-[10px] font-bold text-slate-300">
                    SLOT 2
                  </div>
                  <div className="flex-1 rounded border border-white/15 bg-white/5 py-1.5 text-center text-[10px] font-bold text-slate-300">
                    PISTOL
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center leading-tight">
                  {slotId === 'fireRight' || slotId === 'fireLeft' ? (
                    <Crosshair className="h-5 w-5 text-amber-300" />
                  ) : slotId === 'freeLook' ? (
                    <Eye className="h-4 w-4 text-sky-300" />
                  ) : slotId === 'gloo' ? (
                    <Shield className="h-4 w-4 text-sky-300" />
                  ) : slotId === 'skill' ? (
                    <Zap className="h-4 w-4 text-amber-300" />
                  ) : null}
                  <span className="mt-0.5 text-[9px] font-bold tracking-wide text-white">
                    {meta.shortLabel}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-xl border border-white/15 bg-[#11151e] p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wider text-white leading-none">
                FREE FIRE 3D CONTROLS
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Multi-finger sensitivity, aim precision &amp; custom HUD layout
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Close Controls"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#181e29] text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sensitivity Sliders */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              Sensitivity (0 – 200)
            </span>
            <button
              onClick={resetSensitivity}
              className="flex items-center gap-1 rounded border border-white/15 bg-[#181f2b] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Defaults
            </button>
          </div>

          <div className="space-y-2.5 rounded-lg border border-white/10 bg-[#151b26] p-3.5">
            {SENSITIVITY_ROWS.map((row) => {
              const val = settings.sensitivity[row.key];
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div>
                      <span className="font-semibold text-white">{row.label}</span>
                      <span className="ml-2 text-[10px] text-slate-400 hidden sm:inline">
                        {row.desc}
                      </span>
                    </div>
                    <span className="font-mono-tabular font-bold text-amber-400">{val}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="1"
                    value={val}
                    onChange={(e) => updateSensitivity(row.key, parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Aim Precision */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-bold tracking-wider text-amber-400 uppercase">
            Aim Precision
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {AIM_PRECISION_OPTIONS.map((opt) => {
              const active = settings.aimPrecision === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    soundEngine.playClick();
                    onChange({ ...settings, aimPrecision: opt.id });
                  }}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-500/15'
                      : 'border-white/10 bg-[#151b26] hover:border-white/25'
                  }`}
                >
                  <div
                    className={`text-xs font-bold ${
                      active ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="mt-1 text-[10px] leading-snug text-slate-400">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Left Fire Button Toggle */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-[#151b26] px-3.5 py-2.5">
          <div>
            <div className="text-xs font-bold text-white">Left Claw Fire Button</div>
            <div className="text-[10px] text-slate-400">
              Show secondary left-hand trigger for 3/4-finger play
            </div>
          </div>
          <div className="flex rounded-md border border-white/15 bg-[#0e1218] p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => {
                soundEngine.playClick();
                onChange({ ...settings, leftFireAlways: true });
              }}
              className={`rounded px-2.5 py-1 ${
                settings.leftFireAlways
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Always
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onChange({ ...settings, leftFireAlways: false });
              }}
              className={`rounded px-2.5 py-1 ${
                !settings.leftFireAlways
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scope Only
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('hud');
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-sky-400/50 bg-sky-500/15 text-sm font-bold text-sky-300 hover:bg-sky-500/25"
          >
            <LayoutGrid className="h-4 w-4" />
            Custom HUD Editor
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="flex h-11 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
