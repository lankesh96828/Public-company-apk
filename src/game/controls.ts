import {
  ControlSettings,
  HudControlSlotId,
  HudSlotTransform,
  SensitivitySettings,
} from './types';

export const CONTROL_SETTINGS_STORAGE_KEY = 'blaze_drop_controls_v1';

export const DEFAULT_SENSITIVITY_SETTINGS: SensitivitySettings = {
  general: 105,
  redDot: 95,
  scope2x: 84,
  scope4x: 70,
  freeLook: 112,
};

export const DEFAULT_HUD_LAYOUT: Record<HudControlSlotId, HudSlotTransform> = {
  joystick: { xPct: 14, yPct: 68, scale: 1.0, opacity: 0.92 },
  fireLeft: { xPct: 10, yPct: 45, scale: 0.96, opacity: 0.9 },
  skill: { xPct: 26, yPct: 51, scale: 0.95, opacity: 0.92 },
  gloo: { xPct: 26, yPct: 62, scale: 1.0, opacity: 0.94 },
  medkit: { xPct: 26, yPct: 73, scale: 1.0, opacity: 0.94 },
  freeLook: { xPct: 76, yPct: 37, scale: 0.96, opacity: 0.9 },
  scope: { xPct: 92, yPct: 45, scale: 1.0, opacity: 0.94 },
  reload: { xPct: 74, yPct: 54, scale: 0.95, opacity: 0.92 },
  fireRight: { xPct: 84, yPct: 62, scale: 1.08, opacity: 0.96 },
  jump: { xPct: 93, yPct: 58, scale: 1.0, opacity: 0.94 },
  crouch: { xPct: 74, yPct: 72, scale: 0.95, opacity: 0.92 },
  prone: { xPct: 85, yPct: 76, scale: 0.95, opacity: 0.92 },
  weaponBar: { xPct: 79, yPct: 90, scale: 0.96, opacity: 0.95 },
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  sensitivity: { ...DEFAULT_SENSITIVITY_SETTINGS },
  aimPrecision: 'default',
  leftFireAlways: true,
  hudLayout: cloneHudLayout(DEFAULT_HUD_LAYOUT),
};

export const HUD_SLOT_LABELS: Record<HudControlSlotId, { label: string; shortLabel: string }> = {
  joystick: { label: 'Analog Joystick + Sprint Lock', shortLabel: 'MOVE' },
  fireRight: { label: 'Right Fire (Drag Headshot)', shortLabel: 'FIRE R' },
  fireLeft: { label: 'Left Claw Fire', shortLabel: 'FIRE L' },
  scope: { label: 'Scope / ADS', shortLabel: 'SCOPE' },
  jump: { label: 'Jump', shortLabel: 'JUMP' },
  crouch: { label: 'Crouch', shortLabel: 'CROUCH' },
  prone: { label: 'Prone', shortLabel: 'PRONE' },
  reload: { label: 'Reload', shortLabel: 'RELOAD' },
  freeLook: { label: 'Free-Look Eye', shortLabel: 'EYE' },
  gloo: { label: 'Quick Gloo Wall', shortLabel: 'GLOO' },
  medkit: { label: 'Medkit', shortLabel: 'MEDKIT' },
  skill: { label: 'Character Skill', shortLabel: 'SKILL' },
  weaponBar: { label: 'Weapon Swap Rack', shortLabel: 'WEAPONS' },
};

export function cloneHudLayout(
  src: Record<HudControlSlotId, HudSlotTransform>
): Record<HudControlSlotId, HudSlotTransform> {
  const out = {} as Record<HudControlSlotId, HudSlotTransform>;
  (Object.keys(DEFAULT_HUD_LAYOUT) as HudControlSlotId[]).forEach((key) => {
    const val = src[key] || DEFAULT_HUD_LAYOUT[key];
    out[key] = {
      xPct: clampPct(val.xPct, 6, 94),
      yPct: clampPct(val.yPct, 12, 92),
      scale: clampNum(val.scale, 0.7, 1.5),
      opacity: clampNum(val.opacity, 0.35, 1.0),
    };
  });
  return out;
}

function clampNum(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : min;
  return Math.max(min, Math.min(max, n));
}

function clampPct(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 50;
  return Math.max(min, Math.min(max, n));
}

export function loadControlSettings(fallbackSensitivityScalar = 1.0): ControlSettings {
  const fallbackGeneral = Math.round(
    clampNum(fallbackSensitivityScalar * 100, 40, 200)
  );
  try {
    const raw = localStorage.getItem(CONTROL_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_CONTROL_SETTINGS,
        sensitivity: {
          ...DEFAULT_SENSITIVITY_SETTINGS,
          general: fallbackGeneral,
        },
        hudLayout: cloneHudLayout(DEFAULT_HUD_LAYOUT),
      };
    }
    const parsed = JSON.parse(raw);
    const s = parsed.sensitivity || {};
    return {
      sensitivity: {
        general: clampNum(s.general ?? fallbackGeneral, 10, 200),
        redDot: clampNum(s.redDot ?? DEFAULT_SENSITIVITY_SETTINGS.redDot, 10, 200),
        scope2x: clampNum(s.scope2x ?? DEFAULT_SENSITIVITY_SETTINGS.scope2x, 10, 200),
        scope4x: clampNum(s.scope4x ?? DEFAULT_SENSITIVITY_SETTINGS.scope4x, 10, 200),
        freeLook: clampNum(s.freeLook ?? DEFAULT_SENSITIVITY_SETTINGS.freeLook, 10, 200),
      },
      aimPrecision:
        parsed.aimPrecision === 'precise_scope' || parsed.aimPrecision === 'full_control'
          ? parsed.aimPrecision
          : 'default',
      leftFireAlways:
        typeof parsed.leftFireAlways === 'boolean' ? parsed.leftFireAlways : true,
      hudLayout: cloneHudLayout(parsed.hudLayout || DEFAULT_HUD_LAYOUT),
    };
  } catch {
    return {
      ...DEFAULT_CONTROL_SETTINGS,
      sensitivity: {
        ...DEFAULT_SENSITIVITY_SETTINGS,
        general: fallbackGeneral,
      },
      hudLayout: cloneHudLayout(DEFAULT_HUD_LAYOUT),
    };
  }
}

export function saveControlSettings(settings: ControlSettings) {
  try {
    localStorage.setItem(CONTROL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}
