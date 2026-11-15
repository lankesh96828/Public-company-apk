import React, { useEffect, useRef, useState } from 'react';
import {
  CHARACTER_SKINS,
  ControlSettings,
  EMOTE_CATALOG,
  HudControlSlotId,
  HudState,
  MAP_CATALOG,
  normalizeMapId,
  WEAPONS,
} from '../game/types';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Bike,
  Car,
  Crosshair,
  Eye,
  LogOut,
  Megaphone,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Skull,
  SlidersHorizontal,
  Smile,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ControlsCustomizerModal } from './ControlsCustomizerModal';
import { RadialEmoteWheel, resolveWheelSector } from './RadialEmoteWheel';
import { SquadVoicePTT } from './SquadVoicePTT';

interface GameHUDProps {
  hud: HudState;
  skinId: string;
  playerName?: string;
  localPlayerId?: string | null;
  muted: boolean;
  equippedEmotes: string[];
  controlSettings: ControlSettings;
  onChangeControlSettings: (next: ControlSettings) => void;
  onToggleMute: () => void;
  sendVoiceSignal?: (payload: Record<string, unknown>) => void;
  registerVoiceSignalHandler?: (handler: ((msg: Record<string, unknown>) => void) | null) => void;
  onEject: () => void;
  onDeployParachute: () => void;
  onSwitchSlot: (idx: number) => void;
  onReload: () => void;
  onHeal: () => void;
  onGloo: () => void;
  onSkill: () => void;
  onLoot: () => void;
  onTriggerEmote: (emoteId: string) => void;
  onEmoteWheelOpenChange?: (open: boolean) => void;
  onEnterVehicle: (seat: 'driver' | 'passenger') => void;
  onExitVehicle: () => void;
  onSwitchSeat: () => void;
  onHorn: () => void;
  onVehicleTouch: (throttle: number, steer: number, nitro: boolean) => void;
  onPause: () => void;
  onResume: () => void;
  onSkipSpectate?: () => void;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
  onTouchMove: (dx: number, dy: number, sprintLocked?: boolean) => void;
  onTouchFire: (firing: boolean) => void;
  onTouchAimDelta: (dx: number, dy: number, mode?: 'look' | 'fire_drag' | 'freelook') => void;
  onFreeLookChange: (active: boolean) => void;
  onToggleAds: () => void;
  onJump: () => void;
  onCrouch: () => void;
  onProne: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  skinId,
  playerName = 'Survivor',
  localPlayerId = null,
  muted,
  equippedEmotes,
  controlSettings,
  onChangeControlSettings,
  onToggleMute,
  sendVoiceSignal,
  registerVoiceSignalHandler,
  onEject,
  onDeployParachute,
  onSwitchSlot,
  onReload,
  onHeal,
  onGloo,
  onSkill,
  onLoot,
  onTriggerEmote,
  onEmoteWheelOpenChange,
  onEnterVehicle,
  onExitVehicle,
  onSwitchSeat,
  onHorn,
  onVehicleTouch,
  onPause,
  onResume,
  onSkipSpectate,
  onPlayAgain,
  onReturnLobby,
  onTouchMove,
  onTouchFire,
  onTouchAimDelta,
  onFreeLookChange,
  onToggleAds,
  onJump,
  onCrouch,
  onProne,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [showControlsEditor, setShowControlsEditor] = useState(false);
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [emoteWheelPinned, setEmoteWheelPinned] = useState(false);
  const [wheelSelectedSlot, setWheelSelectedSlot] = useState<number | null>(null);
  const [wheelCursor, setWheelCursor] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const wheelSelectedSlotRef = useRef<number | null>(null);
  wheelSelectedSlotRef.current = wheelSelectedSlot;
  const emoteHoldRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    openedByHold: boolean;
    holdTimer: number | null;
  } | null>(null);
  const keyTHoldRef = useRef<{
    openedByHold: boolean;
    holdTimer: number | null;
    dx: number;
    dy: number;
  } | null>(null);

  // Multi-pointer refs (isolated pointerIds so 2-4 fingers never clash)
  const lookPointerRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);
  const joyPointerRef = useRef<{ pointerId: number; centerX: number; centerY: number } | null>(null);
  const rightFirePointerRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(
    null
  );
  const leftFirePointerRef = useRef<number | null>(null);
  const freeLookPointerRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(
    null
  );

  const joyInSprintRef = useRef(false);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number; active: boolean; inSprintZone: boolean }>({
    x: 0,
    y: 0,
    active: false,
    inSprintZone: false,
  });
  const [rightFiring, setRightFiring] = useState(false);
  const [leftFiring, setLeftFiring] = useState(false);

  const vehCtrlRef = useRef({ throttle: 0, steer: 0, nitro: false });
  const updateVehTouch = (patch: Partial<{ throttle: number; steer: number; nitro: boolean }>) => {
    const next = { ...vehCtrlRef.current, ...patch };
    vehCtrlRef.current = next;
    onVehicleTouch(next.throttle, next.steer, next.nitro);
  };

  // Reset active touch states when phase changes away from active gameplay
  useEffect(() => {
    if (hud.phase !== 'playing' && hud.phase !== 'parachute') {
      lookPointerRef.current = null;
      joyPointerRef.current = null;
      rightFirePointerRef.current = null;
      leftFirePointerRef.current = null;
      freeLookPointerRef.current = null;
      joyInSprintRef.current = false;
      setJoyKnob({ x: 0, y: 0, active: false, inSprintZone: false });
      setRightFiring(false);
      setLeftFiring(false);
      onTouchMove(0, 0, false);
      onTouchFire(false);
      onFreeLookChange(false);
    }
    if (hud.phase !== 'paused') {
      setShowControlsEditor(false);
    }
    if (hud.phase !== 'playing' || hud.vehicle.inVehicle) {
      if (emoteHoldRef.current?.holdTimer) window.clearTimeout(emoteHoldRef.current.holdTimer);
      if (keyTHoldRef.current?.holdTimer) window.clearTimeout(keyTHoldRef.current.holdTimer);
      emoteHoldRef.current = null;
      keyTHoldRef.current = null;
      setShowEmoteWheel(false);
      setEmoteWheelPinned(false);
      setWheelSelectedSlot(null);
      setWheelCursor({ dx: 0, dy: 0 });
    }
  }, [hud.phase, hud.vehicle.inVehicle, onFreeLookChange, onTouchFire, onTouchMove]);

  useEffect(() => {
    onEmoteWheelOpenChange?.(showEmoteWheel);
    return () => {
      onEmoteWheelOpenChange?.(false);
    };
  }, [showEmoteWheel, onEmoteWheelOpenChange]);

  const closeEmoteWheel = () => {
    setShowEmoteWheel(false);
    setEmoteWheelPinned(false);
    setWheelSelectedSlot(null);
    setWheelCursor({ dx: 0, dy: 0 });
  };

  const triggerEmoteBySlot = (slotIdx: number) => {
    const emoteId = equippedEmotes[slotIdx];
    if (emoteId) {
      onTriggerEmote(emoteId);
    }
    closeEmoteWheel();
  };

  // Hold [T] for 8-slot radial emote wheel (quick-tap [T] triggers Slot 1) + [1-8] slot hotkeys
  useEffect(() => {
    const canEmote = hud.phase === 'playing' && !hud.vehicle.inVehicle && !showControlsEditor;
    if (!canEmote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyT' && !e.repeat) {
        if (keyTHoldRef.current?.holdTimer) window.clearTimeout(keyTHoldRef.current.holdTimer);
        const holdTimer = window.setTimeout(() => {
          if (!keyTHoldRef.current) return;
          keyTHoldRef.current.openedByHold = true;
          setEmoteWheelPinned(false);
          setWheelSelectedSlot(null);
          setWheelCursor({ dx: 0, dy: 0 });
          setShowEmoteWheel(true);
        }, 140);
        keyTHoldRef.current = { openedByHold: false, holdTimer, dx: 0, dy: 0 };
        return;
      }

      if (showEmoteWheel) {
        if (e.code === 'Escape') {
          e.preventDefault();
          closeEmoteWheel();
          return;
        }
        const digitMatch = /^Digit([1-8])$/.exec(e.code);
        if (digitMatch) {
          e.preventDefault();
          const slotIdx = Number(digitMatch[1]) - 1;
          const emoteId = equippedEmotes[slotIdx];
          if (emoteId) onTriggerEmote(emoteId);
          closeEmoteWheel();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT') return;
      const kh = keyTHoldRef.current;
      if (!kh) return;
      if (kh.holdTimer) window.clearTimeout(kh.holdTimer);
      keyTHoldRef.current = null;

      if (kh.openedByHold) {
        const slot = wheelSelectedSlotRef.current;
        if (slot !== null) {
          const emoteId = equippedEmotes[slot];
          if (emoteId) onTriggerEmote(emoteId);
        }
        closeEmoteWheel();
      } else {
        const quickEmote = equippedEmotes[0] || 'hello';
        onTriggerEmote(quickEmote);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const kh = keyTHoldRef.current;
      if (!kh || !kh.openedByHold) return;
      if (document.pointerLockElement) {
        kh.dx = Math.max(-120, Math.min(120, kh.dx + e.movementX));
        kh.dy = Math.max(-120, Math.min(120, kh.dy + e.movementY));
      } else {
        kh.dx = e.clientX - window.innerWidth / 2;
        kh.dy = e.clientY - window.innerHeight / 2;
      }
      setWheelCursor({ dx: kh.dx, dy: kh.dy });
      setWheelSelectedSlot(resolveWheelSector(kh.dx, kh.dy, 22));
    };

    const handleBlur = () => {
      if (keyTHoldRef.current?.holdTimer) window.clearTimeout(keyTHoldRef.current.holdTimer);
      keyTHoldRef.current = null;
      closeEmoteWheel();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    hud.phase,
    hud.vehicle.inVehicle,
    showControlsEditor,
    showEmoteWheel,
    equippedEmotes,
    onTriggerEmote,
  ]);

  // Draw Live Tactical Minimap
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const half = size / 2;
    const scale = size / 290;

    const mapMeta = MAP_CATALOG[normalizeMapId(hud.mapId)];
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = mapMeta.minimapWater;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = mapMeta.minimapGround;
    ctx.beginPath();
    ctx.arc(half, half, 132 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(51,65,85,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(half - 18 * scale, half - 110 * scale);
    ctx.lineTo(half - 18 * scale, half + 110 * scale);
    ctx.moveTo(half - 105 * scale, half + 12 * scale);
    ctx.lineTo(half + 105 * scale, half + 12 * scale);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(half - 3, half - 18 * scale - 3, 6, 6);
    ctx.fillRect(half + 52 * scale - 4, half + 34 * scale - 3, 8, 6);
    ctx.fillRect(half - 50 * scale - 3, half - 16 * scale - 3, 6, 6);

    if (!hud.zoneFinalized) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(
        half + hud.nextZoneCenterX * scale,
        half + hud.nextZoneCenterZ * scale,
        hud.nextZoneRadius * scale,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = hud.zoneShrinking ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      half + hud.zoneCenterX * scale,
      half + hud.zoneCenterZ * scale,
      hud.zoneRadius * scale,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    const px = half + hud.playerX * scale;
    const pz = half + hud.playerZ * scale;
    const distToNext = Math.hypot(hud.playerX - hud.nextZoneCenterX, hud.playerZ - hud.nextZoneCenterZ);
    if (!hud.zoneFinalized && distToNext > hud.nextZoneRadius) {
      const dx = hud.nextZoneCenterX - hud.playerX;
      const dz = hud.nextZoneCenterZ - hud.playerZ;
      const len = Math.hypot(dx, dz) || 1;
      const edgeX = half + (hud.nextZoneCenterX - (dx / len) * hud.nextZoneRadius) * scale;
      const edgeZ = half + (hud.nextZoneCenterZ - (dz / len) * hud.nextZoneRadius) * scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(edgeX, edgeZ);
      ctx.stroke();
      ctx.restore();
    }

    hud.minimapEntities.forEach((ent) => {
      const ex = half + ent.x * scale;
      const ez = half + ent.z * scale;
      if (ent.type === 'airdrop') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(ex - 3.5, ez - 3.5, 7, 7);
      } else if (ent.type === 'vehicle') {
        ctx.save();
        ctx.translate(ex, ez);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(-2.5, -2.5, 5, 5);
        ctx.restore();
      } else if (ent.type === 'human_ping') {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(ex, ez, 3.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'loot') {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(ex - 2.2, ez - 2.2, 4.4, 4.4);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 0.9;
        ctx.strokeRect(ex - 2.2, ez - 2.2, 4.4, 4.4);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ez, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-hud.playerYaw + Math.PI);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -18);
    ctx.lineTo(9, -18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud]);

  const activeSkin = CHARACTER_SKINS.find((s) => s.id === skinId) || CHARACTER_SKINS[0];
  const spreadPx = Math.round(6 + hud.crosshairSpread * 180);
  const layout = controlSettings.hudLayout;

  const slotStyle = (slotId: HudControlSlotId): React.CSSProperties => {
    const tf = layout[slotId];
    return {
      left: `${tf.xPct}%`,
      top: `${tf.yPct}%`,
      transform: `translate(-50%, -50%) scale(${tf.scale})`,
      opacity: tf.opacity,
    };
  };

  // Swipe Camera Look Handlers (right-side / open-area pointer tracking)
  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    lookPointerRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
  };

  const handleLookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const lp = lookPointerRef.current;
    if (!lp || lp.pointerId !== e.pointerId) return;
    const dx = e.clientX - lp.lastX;
    const dy = e.clientY - lp.lastY;
    lp.lastX = e.clientX;
    lp.lastY = e.clientY;
    onTouchAimDelta(dx, dy, 'look');
  };

  const handleLookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current?.pointerId === e.pointerId) {
      lookPointerRef.current = null;
    }
  };

  // Analog Joystick + Sprint Lock Handlers
  const updateJoystickFromEvent = (clientX: number, clientY: number) => {
    const jp = joyPointerRef.current;
    if (!jp) return;
    const scale = layout.joystick.scale || 1;
    const maxR = 44 * scale;
    const rawDx = clientX - jp.centerX;
    const rawDy = clientY - jp.centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(rawDy, rawDx);
    const knobX = Math.cos(angle) * (clampedDist / scale);
    const knobY = Math.sin(angle) * (clampedDist / scale);
    const normX = Math.cos(angle) * (clampedDist / maxR);
    const normY = Math.sin(angle) * (clampedDist / maxR);

    const inSprintZone = normY < -0.78 && Math.abs(normX) < 0.48 && hud.phase === 'playing';
    joyInSprintRef.current = inSprintZone;
    setJoyKnob({ x: knobX, y: knobY, active: true, inSprintZone });
    onTouchMove(normX, normY, false);
  };

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerRef.current = {
      pointerId: e.pointerId,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerRef.current?.pointerId !== e.pointerId) return;
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerRef.current?.pointerId !== e.pointerId) return;
    const shouldLockSprint = joyInSprintRef.current;
    joyPointerRef.current = null;
    joyInSprintRef.current = false;
    setJoyKnob({ x: 0, y: 0, active: false, inSprintZone: false });
    onTouchMove(0, 0, shouldLockSprint);
  };

  // Right Fire (Drag-to-Headshot) Handlers
  const handleRightFireDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (rightFirePointerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    rightFirePointerRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    setRightFiring(true);
    onTouchFire(true);
  };

  const handleRightFireMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const fp = rightFirePointerRef.current;
    if (!fp || fp.pointerId !== e.pointerId) return;
    const dx = e.clientX - fp.lastX;
    const dy = e.clientY - fp.lastY;
    fp.lastX = e.clientX;
    fp.lastY = e.clientY;
    onTouchAimDelta(dx, dy, 'fire_drag');
  };

  const handleRightFireUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (rightFirePointerRef.current?.pointerId !== e.pointerId) return;
    rightFirePointerRef.current = null;
    setRightFiring(false);
    if (leftFirePointerRef.current === null) {
      onTouchFire(false);
    }
  };

  // Left Claw Fire Handlers
  const handleLeftFireDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (leftFirePointerRef.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    leftFirePointerRef.current = e.pointerId;
    setLeftFiring(true);
    onTouchFire(true);
  };

  const handleLeftFireUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (leftFirePointerRef.current !== e.pointerId) return;
    leftFirePointerRef.current = null;
    setLeftFiring(false);
    if (!rightFirePointerRef.current) {
      onTouchFire(false);
    }
  };

  // Free-Look Eye Handlers
  const handleFreeLookDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (freeLookPointerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    freeLookPointerRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    onFreeLookChange(true);
  };

  const handleFreeLookMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const fl = freeLookPointerRef.current;
    if (!fl || fl.pointerId !== e.pointerId) return;
    const dx = e.clientX - fl.lastX;
    const dy = e.clientY - fl.lastY;
    fl.lastX = e.clientX;
    fl.lastY = e.clientY;
    onTouchAimDelta(dx, dy, 'freelook');
  };

  const handleFreeLookUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (freeLookPointerRef.current?.pointerId !== e.pointerId) return;
    freeLookPointerRef.current = null;
    onFreeLookChange(false);
  };

  // Hold-to-Open Emote Wheel Handlers (Touch & Mouse)
  const handleEmotePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (showEmoteWheel && emoteWheelPinned) {
      closeEmoteWheel();
      return;
    }
    if (emoteHoldRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const holdTimer = window.setTimeout(() => {
      const curr = emoteHoldRef.current;
      if (!curr || curr.pointerId !== e.pointerId) return;
      curr.openedByHold = true;
      setEmoteWheelPinned(false);
      setWheelSelectedSlot(null);
      setWheelCursor({ dx: 0, dy: 0 });
      setShowEmoteWheel(true);
    }, 110);
    emoteHoldRef.current = {
      pointerId: e.pointerId,
      startX,
      startY,
      openedByHold: false,
      holdTimer,
    };
  };

  const handleEmotePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const eh = emoteHoldRef.current;
    if (!eh || eh.pointerId !== e.pointerId) return;
    const dx = e.clientX - eh.startX;
    const dy = e.clientY - eh.startY;
    if (!eh.openedByHold && Math.hypot(dx, dy) >= 12) {
      if (eh.holdTimer) window.clearTimeout(eh.holdTimer);
      eh.holdTimer = null;
      eh.openedByHold = true;
      setEmoteWheelPinned(false);
      setShowEmoteWheel(true);
    }
    if (eh.openedByHold) {
      setWheelCursor({ dx, dy });
      setWheelSelectedSlot(resolveWheelSector(dx, dy, 22));
    }
  };

  const handleEmotePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const eh = emoteHoldRef.current;
    if (!eh || eh.pointerId !== e.pointerId) return;
    if (eh.holdTimer) window.clearTimeout(eh.holdTimer);
    emoteHoldRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    if (eh.openedByHold) {
      const slot = resolveWheelSector(e.clientX - eh.startX, e.clientY - eh.startY, 22);
      if (slot !== null) {
        triggerEmoteBySlot(slot);
      } else {
        closeEmoteWheel();
      }
    } else {
      setEmoteWheelPinned(true);
      setWheelSelectedSlot(null);
      setWheelCursor({ dx: 0, dy: 0 });
      setShowEmoteWheel(true);
    }
  };

  const handleEmotePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const eh = emoteHoldRef.current;
    if (!eh || eh.pointerId !== e.pointerId) return;
    if (eh.holdTimer) window.clearTimeout(eh.holdTimer);
    emoteHoldRef.current = null;
    closeEmoteWheel();
  };

  const isCombatOnFoot = hud.phase === 'playing' && !hud.vehicle.inVehicle;
  const isPassengerShoot =
    hud.phase === 'playing' && hud.vehicle.inVehicle && hud.vehicle.seatRole === 'passenger';
  const isDriver =
    hud.phase === 'playing' && hud.vehicle.inVehicle && hud.vehicle.seatRole === 'driver';
  const showCombatTriggers = isCombatOnFoot || isPassengerShoot;
  const showJoystick = hud.phase === 'parachute' || isCombatOnFoot;
  const isLowHp =
    hud.hp > 0 &&
    hud.hp / Math.max(1, hud.maxHp) < 0.2 &&
    (hud.phase === 'playing' || hud.phase === 'parachute' || hud.phase === 'plane');

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none">
      {/* Multi-Finger Open Viewport Camera Swipe Layer (active during parachute & playing) */}
      {(hud.phase === 'playing' || hud.phase === 'parachute') && (
        <div
          onPointerDown={handleLookPointerDown}
          onPointerMove={handleLookPointerMove}
          onPointerUp={handleLookPointerUp}
          onPointerCancel={handleLookPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-auto fixed inset-0 z-0 touch-none"
        />
      )}

      {/* Low Health Pulsing Edge Vignette (< 20% HP) */}
      {isLowHp && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 low-hp-vignette bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(185,28,28,0.28)_84%,rgba(127,29,29,0.68)_100%)] shadow-[inset_0_0_55px_rgba(220,38,38,0.45)]"
        />
      )}

      {/* Damage Vignette Flash */}
      {hud.damageFlash > 0.02 && (
        <div
          className="fixed inset-0 z-10 border-[12px] border-red-600/70"
          style={{ opacity: hud.damageFlash }}
        />
      )}

      {/* AWM Sniper 4x Scope Overlay */}
      {hud.isScopedSniper && (
        <div className="fixed inset-0 z-10 flex items-center justify-center">
          <div className="relative h-full w-full bg-[radial-gradient(circle_at_center,transparent_28%,rgba(5,8,12,0.96)_32%)]">
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/80" />
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-black/80" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
          </div>
        </div>
      )}

      {/* Floating 3D-Projected Damage Numbers */}
      {hud.damagePopups.map((p) => (
        <div
          key={p.id}
          style={{
            transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
            opacity: p.alpha,
          }}
          className={`fixed left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2 font-display font-bold leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
            p.headshot
              ? 'text-3xl text-red-500'
              : p.armorHit
              ? 'text-xl text-sky-300'
              : 'text-2xl text-amber-300'
          }`}
        >
          {p.amount}
        </div>
      ))}

      {/* TOP BAR */}
      <div className="relative z-20 flex items-start justify-between p-3 sm:p-4">
        {/* Top-Left: Tactical Minimap & Zone Timer */}
        <div className="flex flex-col gap-1.5">
          <div className="overflow-hidden rounded-lg border border-white/20 bg-[#0b0e13]/92 shadow-lg">
            <canvas ref={minimapRef} width={118} height={118} className="block" />
            <div className="flex items-center justify-between border-t border-white/10 px-2 py-1 text-[10px] font-mono-tabular">
              <span
                className={
                  !hud.inZone
                    ? 'text-red-400 font-bold'
                    : hud.zoneShrinking
                    ? 'text-amber-400 font-semibold'
                    : 'text-sky-400 font-semibold'
                }
              >
                {hud.zoneFinalized
                  ? 'FINAL ZONE'
                  : hud.zoneShrinking
                  ? `SHRINK ${hud.zonePhase}/${hud.zoneTotalPhases}`
                  : `ZONE ${hud.zonePhase}/${hud.zoneTotalPhases}`}
              </span>
              <span className="text-white">
                {hud.zoneFinalized ? `${Math.round(hud.zoneRadius)}m` : `${hud.zoneTimer}s`}
              </span>
            </div>
          </div>

          {/* Real-Time Kill Feed */}
          {hud.killFeed.length > 0 && (
            <div className="flex w-56 sm:w-68 flex-col gap-1 mt-0.5" aria-live="polite">
              {hud.killFeed.map((kf) => {
                const age = kf.ageSec ?? 0;
                const fadeOpacity = age > 5.8 ? Math.max(0, 1 - (age - 5.8) / 1.7) : 1;
                const rowStyle = kf.isPlayer
                  ? 'border-amber-300/80 bg-amber-500/95 text-slate-950 font-bold'
                  : kf.isVictimPlayer
                  ? 'border-red-400/70 bg-red-950/92 text-red-100 font-semibold'
                  : kf.isZone
                  ? 'border-sky-400/40 bg-[#0c1622]/90 text-sky-200'
                  : 'border-white/15 bg-[#0e1218]/90 text-slate-100';

                return (
                  <div
                    key={kf.id}
                    style={{ opacity: fadeOpacity }}
                    className={`killfeed-item-enter flex items-center justify-between gap-1.5 rounded border px-2 py-0.5 text-[10px] shadow-md transition-opacity duration-200 ${rowStyle}`}
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {kf.isZone ? (
                        <Zap className="h-3 w-3 shrink-0 text-sky-400" />
                      ) : (
                        <span className="truncate font-semibold max-w-[78px]">{kf.killer}</span>
                      )}

                      <span
                        className={`flex items-center gap-0.5 shrink-0 font-mono-tabular text-[9px] ${
                          kf.isPlayer ? 'text-slate-900/80' : 'text-slate-400'
                        }`}
                      >
                        {!kf.isZone && <Crosshair className="h-2.5 w-2.5 shrink-0" />}
                        <span>{kf.weapon}</span>
                      </span>

                      {kf.headshot && (
                        <Skull
                          aria-label="Headshot"
                          className={`h-3 w-3 shrink-0 ${
                            kf.isPlayer ? 'text-red-700' : 'text-red-400'
                          }`}
                        />
                      )}
                    </div>

                    <span
                      className={`truncate text-right font-semibold max-w-[78px] ${
                        kf.isPlayer
                          ? 'text-slate-950'
                          : kf.isVictimPlayer
                          ? 'text-red-200'
                          : 'text-red-300'
                      }`}
                    >
                      {kf.victim}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top-Center: Outside-Zone Storm Warning or Shrinking Banner */}
        {(hud.phase === 'playing' || hud.phase === 'parachute') &&
          (!hud.inZone || hud.zoneShrinking) && (
            <div
              className={`mt-1 rounded-md border px-3 py-1 text-[11px] font-mono-tabular font-bold tracking-wide shadow-lg ${
                !hud.inZone
                  ? 'border-red-500/70 bg-red-950/90 text-red-200'
                  : 'border-amber-500/60 bg-[#0e1218]/90 text-amber-300'
              }`}
            >
              {!hud.inZone
                ? `OUTSIDE SAFE ZONE · ${hud.zoneDistanceOutside}m · -${hud.zoneDamagePerSec} HP/s`
                : `SAFE ZONE SHRINKING · ${Math.round(hud.zoneRadius)}m`}
            </div>
          )}

        {/* Top-Right: ALIVE / KILLS & Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-[#0e1218]/90 px-3 py-1.5 text-xs font-mono-tabular">
            {hud.multiplayerRoomCode && (
              <>
                <span className="text-sky-400 font-bold">{hud.multiplayerRoomCode}</span>
                <span className="text-white/20">|</span>
                <div>
                  <span className="text-slate-400">REAL </span>
                  <span className="text-base font-bold text-emerald-400">
                    {hud.humanPlayersAlive ?? 1}
                  </span>
                </div>
                <span className="text-white/20">|</span>
              </>
            )}
            <div>
              <span className="text-slate-400">ALIVE </span>
              <span className="text-base font-bold text-white">{hud.aliveCount}</span>
            </div>
            <span className="text-white/20">|</span>
            <div>
              <span className="text-slate-400">KILLS </span>
              <span className="text-base font-bold text-amber-400">{hud.kills}</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Toggle Mute"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#0e1218]/90 text-slate-200 hover:text-amber-400 touch-none"
          >
            {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {hud.phase !== 'spectating' && hud.phase !== 'gameover' && hud.phase !== 'victory' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Pause"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#0e1218]/90 text-slate-200 hover:text-amber-400 touch-none"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* PLANE & PARACHUTE PROMPTS */}
      {hud.phase === 'plane' && (
        <div className="fixed left-1/2 bottom-28 z-20 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="rounded-md bg-[#0e1218]/90 border border-white/15 px-4 py-1.5 text-xs font-mono-tabular text-slate-200">
            TRANSPORT FLIGHT · ALTITUDE 68m · {Math.round(hud.planeProgress * 100)}%
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEject();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto rounded-lg border border-amber-300/60 bg-gradient-to-b from-amber-400 to-orange-600 px-8 py-3 font-display text-2xl font-bold tracking-wider text-slate-950 shadow-xl hover:brightness-110 active:scale-95 touch-none"
          >
            EJECT [F / SPACE]
          </button>
        </div>
      )}

      {hud.phase === 'parachute' && (
        <div className="fixed left-1/2 bottom-28 z-20 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="rounded-md bg-[#0e1218]/90 border border-white/15 px-4 py-1.5 text-xs font-mono-tabular text-sky-300">
            ALTITUDE {hud.altitude}m · JOYSTICK GLIDE · SWIPE LOOK
          </div>
          {hud.canDeployParachute && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeployParachute();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto rounded-lg border border-sky-300/60 bg-sky-500 px-6 py-2.5 font-display text-2xl font-bold tracking-wider text-slate-950 shadow-xl active:scale-95 touch-none"
            >
              OPEN PARACHUTE
            </button>
          )}
        </div>
      )}

      {/* CENTER RETICLE & ACTION PROMPTS */}
      {hud.phase === 'playing' && !hud.isScopedSniper && (
        <>
          {(!hud.vehicle.inVehicle || hud.vehicle.seatRole === 'passenger') && (
            <div className="fixed left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="h-1 w-1 rounded-full bg-white/95" />
              <div
                style={{ transform: `translateY(-${spreadPx}px)` }}
                className="absolute left-1/2 -top-1.5 h-2.5 w-[2px] -translate-x-1/2 bg-white shadow"
              />
              <div
                style={{ transform: `translateY(${spreadPx}px)` }}
                className="absolute left-1/2 -bottom-1.5 h-2.5 w-[2px] -translate-x-1/2 bg-white shadow"
              />
              <div
                style={{ transform: `translateX(-${spreadPx}px)` }}
                className="absolute top-1/2 -left-1.5 h-[2px] w-2.5 -translate-y-1/2 bg-white shadow"
              />
              <div
                style={{ transform: `translateX(${spreadPx}px)` }}
                className="absolute top-1/2 -right-1.5 h-[2px] w-2.5 -translate-y-1/2 bg-white shadow"
              />

              {hud.hitmarkerType !== 'none' && (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <path
                    d="M5 5L11 11M23 5L17 11M5 23L11 17M23 23L17 17"
                    stroke={hud.hitmarkerType === 'head' ? '#EF4444' : '#FFFFFF'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          )}

          {/* Channeling Progress (Reload or Medkit) */}
          {(hud.isReloading || hud.isHealing) && (
            <div className="fixed left-1/2 top-[58%] z-20 -translate-x-1/2 w-44 rounded bg-[#0e1218]/90 border border-white/15 p-2 text-center">
              <div className="text-[11px] font-bold text-amber-400 mb-1">
                {hud.isHealing ? 'APPLYING MEDKIT...' : 'RELOADING...'}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-sm bg-white/10">
                <div
                  className={`h-full ${hud.isHealing ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{
                    width: `${Math.round(
                      (hud.isHealing ? hud.healProgress : hud.reloadProgress) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Nearby Vehicle Boarding Prompt */}
          {!hud.vehicle.inVehicle && hud.vehicle.nearbyVehicleName && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed left-1/2 top-[65%] z-20 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-[#0e1218]/95 px-3.5 py-2 shadow-xl"
            >
              {hud.vehicle.nearbyVehicleType === 'motorbike' ? (
                <Bike className="h-4 w-4 text-cyan-400 shrink-0" />
              ) : (
                <Car className="h-4 w-4 text-cyan-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white pr-1 whitespace-nowrap">
                {hud.vehicle.nearbyVehicleName}
              </span>
              <button
                onClick={() => onEnterVehicle('driver')}
                className="min-h-[36px] rounded bg-amber-500 px-3 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap"
              >
                DRIVE
              </button>
              <button
                onClick={() => onEnterVehicle('passenger')}
                className="min-h-[36px] rounded border border-sky-400/50 bg-sky-500/20 px-3 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-500/30 whitespace-nowrap"
              >
                GET IN
              </button>
            </div>
          )}

          {/* Loot Prompt */}
          {hud.lootPrompt && !hud.vehicle.nearbyVehicleName && !hud.vehicle.inVehicle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoot();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed left-1/2 top-[65%] z-20 -translate-x-1/2 flex min-h-[44px] items-center gap-3 rounded-lg border border-white/20 bg-[#0e1218]/95 px-4 py-2 text-left shadow-xl hover:border-amber-400 touch-none"
            >
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: hud.lootPrompt.rarityColor }}
              />
              <div>
                <div className="text-xs font-bold text-white">{hud.lootPrompt.label}</div>
                <div className="text-[11px] text-slate-400">{hud.lootPrompt.sublabel}</div>
              </div>
            </button>
          )}

          {/* Active Vehicle Cockpit Telemetry & Seat/Exit/Horn Controls */}
          {hud.vehicle.inVehicle && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed left-1/2 top-16 z-20 -translate-x-1/2 flex flex-col items-center gap-1.5"
            >
              <div className="flex items-center gap-3 rounded-xl border border-cyan-400/40 bg-[#0d1219]/95 px-4 py-2 shadow-2xl">
                <div className="flex items-center gap-2 pr-2 border-r border-white/10">
                  {hud.vehicle.vehicleType === 'motorbike' ? (
                    <Bike className="h-5 w-5 text-cyan-400 shrink-0" />
                  ) : (
                    <Car className="h-5 w-5 text-cyan-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white leading-tight whitespace-nowrap">
                      {hud.vehicle.vehicleName}
                    </div>
                    <div
                      className={`text-[10px] font-bold tracking-wider uppercase ${
                        hud.vehicle.seatRole === 'driver' ? 'text-amber-400' : 'text-sky-400'
                      }`}
                    >
                      {hud.vehicle.seatRole === 'driver' ? 'DRIVER' : 'PASSENGER · SHOOT'}
                    </div>
                  </div>
                </div>

                <div className="text-center pr-2 border-r border-white/10 min-w-[60px]">
                  <div className="font-mono-tabular text-xl font-bold text-white leading-none">
                    {hud.vehicle.speedKmh}
                  </div>
                  <div className="text-[9px] font-mono-tabular text-slate-400">KM/H</div>
                </div>

                <div className="flex flex-col gap-1 w-24 sm:w-28">
                  <div className="h-1.5 w-full overflow-hidden rounded-sm bg-white/10">
                    <div
                      className={`h-full ${
                        hud.vehicle.vehicleHp < hud.vehicle.vehicleMaxHp * 0.3
                          ? 'bg-red-500'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          (hud.vehicle.vehicleHp / Math.max(1, hud.vehicle.vehicleMaxHp)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-sm bg-white/10">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${hud.vehicle.boostFuel}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onSwitchSeat}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-sky-400/50 bg-[#0e1218]/95 px-3 py-1.5 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>{hud.vehicle.seatRole === 'driver' ? 'Passenger' : 'Drive'}</span>
                </button>
                {hud.vehicle.seatRole === 'driver' && (
                  <button
                    onClick={onHorn}
                    className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-amber-400/40 bg-[#0e1218]/95 px-3 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    <span>Horn</span>
                  </button>
                )}
                <button
                  onClick={onExitVehicle}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-950/90 px-3 py-1.5 text-[11px] font-bold text-red-200 hover:bg-red-800/80"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* FREE FIRE MULTI-FINGER 3D TOUCH & POINTER HUD                         */}
      {/* ===================================================================== */}

      {/* 1. ANALOG 360° JOYSTICK + AUTO-SPRINT LOCK (Parachute & Ground) */}
      {showJoystick && (
        <div
          style={slotStyle('joystick')}
          className="pointer-events-auto fixed z-20 flex flex-col items-center touch-none select-none"
        >
          {/* Auto-Sprint Lock Detent Indicator above Ring */}
          {hud.phase === 'playing' && (joyKnob.active || hud.sprintLocked) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTouchMove(0, 0, false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mb-2 flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors ${
                hud.sprintLocked || joyKnob.inSprintZone
                  ? 'border-amber-300 bg-amber-500 text-slate-950'
                  : 'border-white/25 bg-[#0e1218]/85 text-slate-300'
              }`}
            >
              <ArrowUp className="h-3 w-3" />
              <span>{hud.sprintLocked ? 'SPRINT LOCKED · TAP STOP' : 'SPRINT LOCK'}</span>
            </button>
          )}

          <div
            onPointerDown={handleJoyPointerDown}
            onPointerMove={handleJoyPointerMove}
            onPointerUp={handleJoyPointerUp}
            onPointerCancel={handleJoyPointerUp}
            className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 transition-colors touch-none ${
              hud.sprintLocked
                ? 'border-amber-400/80 bg-amber-500/15'
                : joyKnob.active
                ? 'border-white/50 bg-[#0b0e14]/65'
                : 'border-white/25 bg-[#0b0e14]/50'
            }`}
          >
            {/* Cardinal Guide Dots */}
            <div className="pointer-events-none absolute top-2 h-1.5 w-1.5 rounded-full bg-amber-400/75" />
            <div className="pointer-events-none absolute bottom-2 h-1 w-1 rounded-full bg-white/30" />
            <div className="pointer-events-none absolute left-2 h-1 w-1 rounded-full bg-white/30" />
            <div className="pointer-events-none absolute right-2 h-1 w-1 rounded-full bg-white/30" />

            {/* Thumb Knob */}
            <div
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
              className={`pointer-events-none flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg ${
                joyKnob.inSprintZone || hud.sprintLocked
                  ? 'border-amber-200 bg-amber-500 text-slate-950'
                  : 'border-white/70 bg-white/25 text-white'
              }`}
            >
              <div className="h-3 w-3 rounded-full bg-current" />
            </div>
          </div>
        </div>
      )}

      {/* 2. FREE-LOOK EYE BUTTON (Parachute, On Foot, Vehicle) */}
      {(hud.phase === 'parachute' || hud.phase === 'playing') && (
        <button
          type="button"
          style={slotStyle('freeLook')}
          onPointerDown={handleFreeLookDown}
          onPointerMove={handleFreeLookMove}
          onPointerUp={handleFreeLookUp}
          onPointerCancel={handleFreeLookUp}
          aria-label="Free Look Eye"
          className={`pointer-events-auto fixed z-20 flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg transition-colors touch-none ${
            hud.isFreeLooking
              ? 'border-sky-300 bg-sky-500 text-slate-950 scale-95'
              : 'border-white/30 bg-[#0d121a]/85 text-sky-300 hover:border-sky-400'
          }`}
        >
          <Eye className="h-5 w-5" />
        </button>
      )}

      {/* 3. RIGHT-SIDE & LEFT-SIDE COMBAT FINGER CONTROLS (On Foot & Passenger) */}
      {showCombatTriggers && (
        <>
          {/* Right Fire Button (Press + Drag Up = Drag-to-Headshot!) */}
          <button
            type="button"
            style={slotStyle('fireRight')}
            onPointerDown={handleRightFireDown}
            onPointerMove={handleRightFireMove}
            onPointerUp={handleRightFireUp}
            onPointerCancel={handleRightFireUp}
            aria-label="Right Fire Drag Headshot"
            className={`pointer-events-auto fixed z-20 flex h-18 w-18 flex-col items-center justify-center rounded-full border-2 shadow-2xl transition-transform touch-none ${
              rightFiring
                ? 'scale-95 border-amber-200 bg-amber-500 text-slate-950'
                : 'border-amber-400/80 bg-[#1a1308]/85 text-amber-300 hover:border-amber-300'
            }`}
          >
            <Crosshair className="h-7 w-7" />
            <span className="mt-0.5 text-[9px] font-bold tracking-wider">FIRE</span>
          </button>

          {/* Left Claw Fire Button */}
          {(controlSettings.leftFireAlways || hud.isAds) && (
            <button
              type="button"
              style={slotStyle('fireLeft')}
              onPointerDown={handleLeftFireDown}
              onPointerUp={handleLeftFireUp}
              onPointerCancel={handleLeftFireUp}
              aria-label="Left Claw Fire"
              className={`pointer-events-auto fixed z-20 flex h-15 w-15 flex-col items-center justify-center rounded-full border-2 shadow-xl transition-transform touch-none ${
                leftFiring
                  ? 'scale-95 border-amber-200 bg-amber-500 text-slate-950'
                  : 'border-amber-400/70 bg-[#16120b]/85 text-amber-300 hover:border-amber-300'
              }`}
            >
              <Crosshair className="h-6 w-6" />
              <span className="text-[8px] font-bold">FIRE L</span>
            </button>
          )}

          {/* Scope / ADS Toggle */}
          <button
            type="button"
            style={slotStyle('scope')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleAds();
            }}
            aria-label="Toggle Scope"
            className={`pointer-events-auto fixed z-20 flex h-13 w-13 flex-col items-center justify-center rounded-full border-2 shadow-lg transition-colors touch-none ${
              hud.isAds
                ? 'border-sky-300 bg-sky-500 text-slate-950'
                : 'border-white/30 bg-[#0e1218]/88 text-white hover:border-sky-400'
            }`}
          >
            <Crosshair className="h-5 w-5" />
            <span className="text-[8px] font-bold leading-none mt-0.5">
              {hud.isAds ? hud.activeOpticLabel : 'SCOPE'}
            </span>
          </button>

          {/* Reload */}
          <button
            type="button"
            style={slotStyle('reload')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onReload();
            }}
            aria-label="Reload Weapon"
            className={`pointer-events-auto fixed z-20 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 shadow-lg touch-none ${
              hud.isReloading
                ? 'border-amber-400 bg-amber-500/25 text-amber-300'
                : 'border-white/25 bg-[#0e1218]/88 text-slate-100 hover:border-amber-400'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-[8px] font-bold mt-0.5">
              {hud.isReloading ? `${Math.round(hud.reloadProgress * 100)}%` : 'RELOAD'}
            </span>
          </button>

          {/* Jump / Crouch / Prone (On Foot only) */}
          {isCombatOnFoot && (
            <>
              <button
                type="button"
                style={slotStyle('jump')}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onJump();
                }}
                aria-label="Jump"
                className="pointer-events-auto fixed z-20 flex h-13 w-13 flex-col items-center justify-center rounded-full border-2 border-white/30 bg-[#0e1218]/88 text-white shadow-lg active:scale-95 active:border-amber-400 touch-none"
              >
                <ArrowUp className="h-5 w-5" />
                <span className="text-[8px] font-bold">JUMP</span>
              </button>

              <button
                type="button"
                style={slotStyle('crouch')}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onCrouch();
                }}
                aria-label="Crouch"
                className={`pointer-events-auto fixed z-20 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 shadow-lg active:scale-95 touch-none ${
                  hud.stance === 'crouch'
                    ? 'border-amber-300 bg-amber-500 text-slate-950'
                    : 'border-white/30 bg-[#0e1218]/88 text-slate-100 hover:border-amber-400'
                }`}
              >
                <ArrowDown className="h-4 w-4" />
                <span className="text-[8px] font-bold">CROUCH</span>
              </button>

              <button
                type="button"
                style={slotStyle('prone')}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onProne();
                }}
                aria-label="Prone"
                className={`pointer-events-auto fixed z-20 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 shadow-lg active:scale-95 touch-none ${
                  hud.stance === 'prone'
                    ? 'border-amber-300 bg-amber-500 text-slate-950'
                    : 'border-white/30 bg-[#0e1218]/88 text-slate-100 hover:border-amber-400'
                }`}
              >
                <span className="h-1 w-5 rounded-full bg-current mb-1" />
                <span className="text-[8px] font-bold">PRONE</span>
              </button>
            </>
          )}

          {/* Quick Skill / Gloo Wall / Medkit */}
          <button
            type="button"
            style={slotStyle('skill')}
            disabled={hud.skillCooldown > 0}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSkill();
            }}
            aria-label="Character Skill"
            className={`pointer-events-auto fixed z-20 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 shadow-lg disabled:opacity-55 touch-none ${
              hud.skillActiveTimer > 0
                ? 'border-amber-300 bg-amber-500 text-slate-950'
                : 'border-amber-400/50 bg-[#0e1218]/88 text-amber-300'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span className="font-mono-tabular text-[8px] font-bold leading-none mt-0.5">
              {hud.skillCooldown > 0 ? `${Math.ceil(hud.skillCooldown)}s` : 'SKILL'}
            </span>
          </button>

          {isCombatOnFoot && (
            <button
              type="button"
              style={slotStyle('gloo')}
              onPointerDown={(e) => {
                e.stopPropagation();
                onGloo();
              }}
              aria-label="Deploy Gloo Wall"
              className="pointer-events-auto fixed z-20 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-sky-400/65 bg-[#0d1622]/90 text-sky-300 shadow-lg active:scale-95 touch-none"
            >
              <Shield className="h-4 w-4" />
              <span className="font-mono-tabular text-[9px] font-bold leading-none mt-0.5">
                {hud.glooWalls}
              </span>
            </button>
          )}

          <button
            type="button"
            style={slotStyle('medkit')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onHeal();
            }}
            aria-label="Use Medkit"
            className="pointer-events-auto fixed z-20 flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-emerald-400/65 bg-[#0c1a14]/90 text-emerald-300 shadow-lg active:scale-95 touch-none"
          >
            <span className="font-bold text-base leading-none">+</span>
            <span className="font-mono-tabular text-[9px] font-bold leading-none">
              {hud.medkits}
            </span>
          </button>

          {/* Weapon Swap Slots Bar */}
          <div
            style={slotStyle('weaponBar')}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto fixed z-20 flex items-end gap-1.5 touch-none"
          >
            {[0, 1, 2].map((idx) => {
              const slot = hud.slots[idx];
              const active = hud.activeSlot === idx;
              const def = slot ? WEAPONS[slot.weaponId] : null;
              return (
                <button
                  key={idx}
                  onClick={() => onSwitchSlot(idx)}
                  className={`flex min-w-[82px] sm:min-w-[104px] flex-col rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-500/25'
                      : 'border-white/15 bg-[#0e1218]/92 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>[{idx + 1}] {def ? def.category : 'EMPTY'}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold text-white truncate">
                    {def ? def.name : '—'}
                  </div>
                  <div className="font-mono-tabular text-[11px] font-bold text-amber-300">
                    {slot ? `${slot.mag}/${slot.reserve}` : '0/0'}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* In-Match Emote Hold Button + 8-Slot Radial Wheel (On-Foot Combat) */}
      {isCombatOnFoot && (
        <>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto fixed right-4 top-20 z-20 flex flex-col items-end gap-2 touch-none"
          >
            <button
              type="button"
              onPointerDown={handleEmotePointerDown}
              onPointerMove={handleEmotePointerMove}
              onPointerUp={handleEmotePointerUp}
              onPointerCancel={handleEmotePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Hold for Emote Wheel"
              aria-expanded={showEmoteWheel}
              title="Hold Emote button or [T] for 8-Slot Emote Wheel"
              className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 shadow-lg transition-colors touch-none ${
                showEmoteWheel || hud.activeEmoteId
                  ? 'border-amber-300 bg-amber-500 text-slate-950'
                  : 'border-white/30 bg-[#0e1218]/90 text-amber-300 hover:border-amber-400'
              }`}
            >
              <Smile className="h-5 w-5" />
              <span className="text-[8px] font-bold leading-none mt-0.5">EMOTE</span>
            </button>

            {hud.activeEmoteId && (
              <div className="rounded-md border border-amber-400/50 bg-[#0e1218]/95 px-2.5 py-1 text-[10px] font-bold text-amber-300 shadow-lg">
                {EMOTE_CATALOG.find((e) => e.id === hud.activeEmoteId)?.name || 'Emoting'}
              </div>
            )}
          </div>

          {showEmoteWheel && (
            <RadialEmoteWheel
              equippedEmotes={equippedEmotes}
              selectedSlot={wheelSelectedSlot}
              activeEmoteId={hud.activeEmoteId}
              cursorVector={wheelCursor}
              pinnedMode={emoteWheelPinned}
              onSelectSlotHover={(slot) => setWheelSelectedSlot(slot)}
              onTriggerSlot={triggerEmoteBySlot}
              onClose={closeEmoteWheel}
            />
          )}
        </>
      )}

      {/* Push-to-Talk Squad Voice Chat (WebRTC) */}
      {sendVoiceSignal && registerVoiceSignalHandler && (
        <SquadVoicePTT
          active={
            hud.phase === 'plane' || hud.phase === 'parachute' || hud.phase === 'playing'
          }
          localPlayerId={localPlayerId}
          roomCode={hud.multiplayerRoomCode}
          playerName={playerName}
          sendSignal={sendVoiceSignal}
          registerSignalHandler={registerVoiceSignalHandler}
        />
      )}

      {/* 4. BOTTOM-LEFT: VEST / HELMET / EP / HP STATUS BAR */}
      {(hud.phase === 'playing' || hud.phase === 'parachute') && (
        <div className="fixed bottom-3 left-3 z-20 w-56 sm:w-64 rounded-lg border border-white/15 bg-[#0e1218]/92 px-3 py-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between text-[10px] font-mono-tabular">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>VEST {hud.vestLevel}</span>
              <span className="text-white/20">·</span>
              <span>HELM {hud.helmetLevel}</span>
              <span className="text-white/20">·</span>
              <span className="text-amber-300 uppercase">{hud.stance}</span>
            </div>
            <span className="text-amber-400">EP {hud.ep}</span>
          </div>
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-sm bg-white/10">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${(hud.ep / hud.maxEp) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-white/15">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.hp < 60 ? 'bg-red-500' : 'bg-slate-100'
                }`}
                style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
              />
            </div>
            <span className="w-16 text-right font-mono-tabular text-xs font-bold text-white">
              {hud.hp}/{hud.maxHp}
            </span>
          </div>
        </div>
      )}

      {/* 5. DRIVING PAD OVERLAY (Driver Seat Active) */}
      {isDriver && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto fixed bottom-4 left-4 right-4 z-20 flex items-end justify-between touch-none"
        >
          <div className="mb-16 sm:mb-16 flex items-center gap-2.5">
            <button
              onPointerDown={() => updateVehTouch({ steer: -1 })}
              onPointerUp={() => updateVehTouch({ steer: 0 })}
              onPointerLeave={() => updateVehTouch({ steer: 0 })}
              onPointerCancel={() => updateVehTouch({ steer: 0 })}
              className="h-14 w-16 rounded-xl border-2 border-white/25 bg-[#0e1218]/90 text-xs font-bold text-white active:bg-amber-500 active:text-slate-950"
            >
              LEFT
            </button>
            <button
              onPointerDown={() => updateVehTouch({ steer: 1 })}
              onPointerUp={() => updateVehTouch({ steer: 0 })}
              onPointerLeave={() => updateVehTouch({ steer: 0 })}
              onPointerCancel={() => updateVehTouch({ steer: 0 })}
              className="h-14 w-16 rounded-xl border-2 border-white/25 bg-[#0e1218]/90 text-xs font-bold text-white active:bg-amber-500 active:text-slate-950"
            >
              RIGHT
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onPointerDown={() => updateVehTouch({ throttle: -1 })}
              onPointerUp={() => updateVehTouch({ throttle: 0 })}
              onPointerLeave={() => updateVehTouch({ throttle: 0 })}
              onPointerCancel={() => updateVehTouch({ throttle: 0 })}
              className="h-14 px-4 rounded-xl border-2 border-red-400/50 bg-[#0e1218]/90 text-xs font-bold text-red-300 active:bg-red-500 active:text-white"
            >
              REV
            </button>
            <button
              onPointerDown={() => updateVehTouch({ nitro: true })}
              onPointerUp={() => updateVehTouch({ nitro: false })}
              onPointerLeave={() => updateVehTouch({ nitro: false })}
              onPointerCancel={() => updateVehTouch({ nitro: false })}
              className="h-14 px-4 rounded-xl border-2 border-amber-400/70 bg-amber-500/25 text-xs font-bold text-amber-300 active:bg-amber-500 active:text-slate-950"
            >
              NITRO
            </button>
            <button
              onPointerDown={() => updateVehTouch({ throttle: 1 })}
              onPointerUp={() => updateVehTouch({ throttle: 0 })}
              onPointerLeave={() => updateVehTouch({ throttle: 0 })}
              onPointerCancel={() => updateVehTouch({ throttle: 0 })}
              className="h-16 px-5 rounded-xl border-2 border-emerald-400/70 bg-emerald-500/25 text-xs font-bold text-emerald-200 active:bg-emerald-500 active:text-slate-950"
            >
              DRIVE
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {hud.phase === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#12161f] p-6 shadow-2xl">
            <h2 className="font-display text-4xl font-bold tracking-wider text-white text-center">
              MATCH PAUSED
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">
              {activeSkin.name} · Drag Fire for Headshots · Eye for 360° Free-Look
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={onResume}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
              >
                <Play className="h-4 w-4" />
                Resume Match
              </button>
              <button
                onClick={() => setShowControlsEditor(true)}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/15 font-semibold text-sky-300 hover:bg-sky-500/25"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Sensitivity &amp; Custom HUD
              </button>
              <button
                onClick={onReturnLobby}
                className="flex h-11 items-center justify-center rounded-lg border border-white/15 bg-[#1a202c] font-semibold text-slate-200 hover:bg-[#232b3b]"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-MATCH CONTROLS & CUSTOM HUD MODAL */}
      {hud.phase === 'paused' && showControlsEditor && (
        <ControlsCustomizerModal
          settings={controlSettings}
          onChange={onChangeControlSettings}
          onClose={() => setShowControlsEditor(false)}
        />
      )}

      {/* 3-SECOND SPECTATOR CAM OVERLAY */}
      {hud.phase === 'spectating' && (
        <div className="pointer-events-none fixed inset-0 z-25 flex flex-col items-center justify-between py-6 px-4">
          <div className="mt-1 rounded-lg border border-red-500/60 bg-[#0e1218]/95 px-4 py-1.5 text-center shadow-2xl">
            <div className="font-display text-lg font-bold tracking-wider text-red-400 leading-none">
              ELIMINATED BY {hud.eliminatedBy || 'ENEMY'}
            </div>
            <div className="mt-0.5 font-mono-tabular text-[11px] text-slate-300">
              RANK #{hud.rankAchieved} / {hud.totalCount}
            </div>
          </div>

          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto w-full max-w-md rounded-xl border border-amber-400/45 bg-[#0e1218]/95 p-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-400">
                  <Eye className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-widest text-amber-400">
                    SPECTATING KILLER
                  </div>
                  <div className="truncate text-sm font-bold text-white">
                    {hud.spectateTargetName || hud.eliminatedBy || 'Survivor'}
                  </div>
                  {(hud.spectateTargetWeapon || hud.spectateTargetHp !== undefined) && (
                    <div className="font-mono-tabular text-[11px] text-slate-400">
                      {hud.spectateTargetWeapon ? hud.spectateTargetWeapon : ''}
                      {hud.spectateTargetWeapon && hud.spectateTargetHp !== undefined ? ' · ' : ''}
                      {hud.spectateTargetHp !== undefined
                        ? hud.spectateTargetHp > 0
                          ? `HP ${hud.spectateTargetHp}`
                          : 'ELIMINATED'
                        : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono-tabular text-xs font-bold text-slate-200">
                  {Math.max(1, Math.ceil(hud.spectateRemainingSec ?? 0))}s
                </span>
                {onSkipSpectate && (
                  <button
                    onClick={onSkipSpectate}
                    className="rounded-lg border border-white/20 bg-[#1a202c] px-3 py-1.5 text-xs font-bold text-white hover:border-amber-400 hover:text-amber-300"
                  >
                    SKIP
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-sm bg-white/10">
              <div
                className="h-full bg-amber-400 transition-[width] duration-75"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((hud.spectateRemainingSec ?? 0) / 3.0) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* VICTORY ("BOOYAH!") & ELIMINATED MODALS */}
      {(hud.phase === 'victory' || hud.phase === 'gameover') && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#12161f] p-6 shadow-2xl">
            <div className="text-center">
              <div
                className={`font-display text-6xl font-bold tracking-wider leading-none ${
                  hud.phase === 'victory' ? 'text-amber-400' : 'text-red-500'
                }`}
              >
                {hud.phase === 'victory' ? 'BOOYAH!' : 'ELIMINATED'}
              </div>
              <div className="mt-2 font-mono-tabular text-sm text-slate-300">
                RANK #{hud.rankAchieved} / {hud.totalCount}
                {hud.phase === 'gameover' && hud.eliminatedBy
                  ? ` · Eliminated by ${hud.eliminatedBy}`
                  : ''}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-[#0d1017] p-4 font-mono-tabular">
              <div>
                <div className="text-[11px] text-slate-400">ELIMINATIONS</div>
                <div className="text-xl font-bold text-white">{hud.kills}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">DAMAGE DEALT</div>
                <div className="text-xl font-bold text-amber-400">{hud.damageDealt}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">HEADSHOTS</div>
                <div className="text-xl font-bold text-red-400">{hud.headshots}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">SURVIVAL TIME</div>
                <div className="text-xl font-bold text-slate-200">{hud.survivalTime}s</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-mono-tabular">
              <span className="text-slate-300">REWARDS EARNED</span>
              <span className="font-bold text-amber-400">
                +{hud.earnedGold} GOLD · +{hud.earnedXp} XP
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={onReturnLobby}
                className="flex h-11 items-center justify-center rounded-lg border border-white/15 bg-[#1a202c] text-sm font-semibold text-slate-200 hover:bg-[#232b3b]"
              >
                Lobby
              </button>
              <button
                onClick={onPlayAgain}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-slate-950 hover:bg-amber-400"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
