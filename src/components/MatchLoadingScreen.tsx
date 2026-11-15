import React, { useEffect, useRef, useState } from 'react';
import {
  CHARACTER_SKINS,
  MAP_CATALOG,
  MapId,
  MatchMode,
  MultiplayerRosterPlayer,
  PlayerProfile,
} from '../game/types';
import { Bot, Crosshair, MapPin, Shield, User, Users } from 'lucide-react';
import bermudaDropImg from '../assets/images/bermuda_drop_artwork_1794647643029.jpg';
import purgatoryDropImg from '../assets/images/purgatory_drop_artwork_1794647642950.jpg';
import alpineDropImg from '../assets/images/alpine_drop_artwork_1794659056689.jpg';
import squadReadyImg from '../assets/images/squad_ready_banner_1794647644172.jpg';

const MAP_ARTWORK: Record<MapId, string> = {
  bermuda: bermudaDropImg,
  purgatory: purgatoryDropImg,
  alpine: alpineDropImg,
};

interface MatchLoadingScreenProps {
  mapId: MapId;
  mode: MatchMode;
  profile: PlayerProfile;
  roster: MultiplayerRosterPlayer[];
  localPlayerId: string;
  roomCode?: string;
  onComplete: () => void;
}

const BOT_PREVIEW_NAMES = [
  'Raistar_X',
  'Viper_99',
  'Kobra_FF',
  'BlazeKing',
  'ShadowOps',
  'Raju_OP',
  'MocoHunter',
];

const BOT_LOADING_STEPS = [
  'Preparing Solo Drop Loadout',
  'Deploying 29 Adaptive AI Bots',
  'Generating Island Terrain & Compounds',
  'Deploying Weapons, Vehicles & Supply Drops',
  'Boarding Cargo Plane — Ready to Drop',
];

const SQUAD_LOADING_STEPS = [
  'Connecting Squad Roster',
  'Deploying AI Bot Combatants',
  'Generating Island Terrain & Compounds',
  'Deploying Weapons, Vehicles & Supply Drops',
  'Boarding Cargo Plane — Ready to Drop',
];

const TACTICAL_TIPS = [
  'Drag up while firing for crisp headshots and faster eliminations.',
  'Deploy Gloo Walls immediately when caught in open terrain.',
  'Loot defeated enemy Death Crates for Tier-3 armor and extra medkits.',
  'Drive vehicles to rotate ahead of the shrinking Safe Zone.',
];

export const MatchLoadingScreen: React.FC<MatchLoadingScreenProps> = ({
  mapId,
  mode,
  profile,
  roster,
  localPlayerId,
  roomCode,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [squadPhotoFailed, setSquadPhotoFailed] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const start = performance.now();
    const durationMs = 2400;
    let rafId = 0;
    let doneTimeout: number | null = null;
    let completed = false;

    const finishLoading = () => {
      if (completed) return;
      completed = true;
      setProgress(100);
      setFadingOut(true);
      doneTimeout = window.setTimeout(() => {
        onCompleteRef.current();
      }, 320);
    };

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(Math.round(eased * 100));

      if (raw < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        finishLoading();
      }
    };

    rafId = requestAnimationFrame(tick);
    const safetyTimeout = window.setTimeout(finishLoading, durationMs + 400);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(safetyTimeout);
      if (doneTimeout !== null) window.clearTimeout(doneTimeout);
    };
  }, []);

  const displayPlayers: MultiplayerRosterPlayer[] =
    roster.length > 0
      ? roster
      : [
          {
            id: localPlayerId || 'local',
            name: profile.name,
            skinId: profile.selectedSkinId,
            parachuteId: profile.selectedParachuteId,
            isHost: true,
            ready: true,
          },
        ];

  const isSquadRoom = displayPlayers.length > 1;
  const humanCount = displayPlayers.length;
  const botCount = Math.max(0, 30 - humanCount);
  const mapMeta = MAP_CATALOG[mapId];
  const mapPhoto = MAP_ARTWORK[mapId];
  const mapTitle = mapMeta.fullName;
  const modeTitle = mode === 'br_classic' ? 'Battle Royale Classic' : 'Blitz Drop';
  const steps = isSquadRoom ? SQUAD_LOADING_STEPS : BOT_LOADING_STEPS;
  const stepIndex = Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));
  const tip = TACTICAL_TIPS[(humanCount + (mapId === 'bermuda' ? 0 : mapId === 'purgatory' ? 1 : 2)) % TACTICAL_TIPS.length];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#090c12] transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Full-Screen Cinematic Map Key Art Backdrop */}
      {!bgFailed ? (
        <img
          src={mapPhoto}
          alt={`${mapTitle} aerial drop loading artwork`}
          referrerPolicy="no-referrer"
          onError={() => setBgFailed(true)}
          className="match-photo-zoom absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              mapId === 'alpine'
                ? 'radial-gradient(circle at 65% 25%, rgba(56,189,248,0.34), transparent 55%), linear-gradient(135deg, #0b1628 0%, #1a2c42 50%, #090c12 100%)'
                : mapId === 'bermuda'
                ? 'radial-gradient(circle at 70% 30%, rgba(245,158,11,0.32), transparent 55%), linear-gradient(135deg, #0b1320 0%, #162436 50%, #090c12 100%)'
                : 'radial-gradient(circle at 30% 30%, rgba(234,88,12,0.35), transparent 55%), linear-gradient(135deg, #1b100b 0%, #2a1810 50%, #090c12 100%)',
          }}
        />
      )}

      {/* Measured Contrast Scrim for WCAG AA Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090c12]/80 via-[#090c12]/45 to-[#090c12]/95" />

      {/* Top Strip: Match Deployment Header */}
      <div className="relative z-10 shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-10 sm:pt-7">
        <div className="match-title-slam min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-amber-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Match Starting</span>
            <span aria-hidden="true">·</span>
            <span>{modeTitle}</span>
            {roomCode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-sky-300">Room {roomCode}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-5xl font-bold tracking-wider text-white leading-none">
            DROPPING TO <span className="text-amber-400">{mapTitle}</span>
          </h1>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 text-xs font-mono-tabular text-slate-200 bg-[#0d121a]/90 border border-white/15 rounded-lg px-3.5 py-2 whitespace-nowrap">
          <div className="flex items-center gap-1.5 shrink-0">
            {isSquadRoom ? (
              <Users className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <User className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-bold text-emerald-300">{humanCount}</span>
            <span className="text-slate-400">{isSquadRoom ? 'Squad' : 'Player'}</span>
          </div>
          <span className="text-white/20 shrink-0">|</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Bot className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300">{botCount}</span>
            <span className="text-slate-400">AI Bots</span>
          </div>
          <span className="text-white/20 shrink-0">|</span>
          <div className="shrink-0">
            <span className="font-bold text-white">30</span>{' '}
            <span className="text-slate-400">Total</span>
          </div>
        </div>
      </div>

      {/* Center Content: Squad Photo Showcase + Bot Match Roster */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-10 sm:py-4 flex items-start lg:items-center">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 lg:grid-cols-12 items-stretch gap-3.5 sm:gap-5">
        {/* Left: Featured Action Photo */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-xl border border-white/15 bg-[#0e131c]/90 shadow-2xl h-[155px] sm:h-[220px] lg:h-auto lg:min-h-[260px]">
          {!squadPhotoFailed ? (
            <img
              src={squadReadyImg}
              alt="Survivors preparing to deploy from cargo transport plane"
              referrerPolicy="no-referrer"
              onError={() => setSquadPhotoFailed(true)}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#161e2b] to-[#0b0f17] p-6 text-center">
              <Crosshair className="h-10 w-10 text-amber-400 mb-2" />
              <div className="font-display text-2xl font-bold text-white">CARGO PLANE READY</div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090c12]/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4">
            <div className="text-[11px] font-medium text-amber-300">
              Flight Briefing · {mapMeta.dropZoneLabel}
            </div>
            <div className="mt-0.5 text-sm font-bold text-white">
              {isSquadRoom
                ? `${humanCount} Squad Survivors + ${botCount} AI Bots`
                : `Solo Drop with ${botCount} Adaptive AI Bots`}
            </div>
          </div>
        </div>

        {/* Right: Animated Bot & Survivor Roster Grid */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/15 bg-[#0d121a]/92 p-3.5 sm:p-5 shadow-2xl">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5 sm:pb-3">
              <div>
                <h2 className="text-sm font-bold tracking-wide text-white">
                  {isSquadRoom ? 'Squad & AI Bot Roster' : 'AI Bot Combatants'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isSquadRoom
                    ? 'Your squad and adaptive AI bots deploying onto the island'
                    : `You + ${botCount} AI bots deploying onto the island`}
                </p>
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-amber-400 whitespace-nowrap shrink-0">
                {botCount} AI Bots + {isSquadRoom ? `${humanCount} Squad` : 'You'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[165px] sm:max-h-[210px] overflow-y-auto pr-1">
              {displayPlayers.slice(0, 8).map((player, idx) => {
                const skin =
                  CHARACTER_SKINS.find((s) => s.id === player.skinId) || CHARACTER_SKINS[0];
                const isLocal =
                  player.id === localPlayerId ||
                  (!localPlayerId && idx === 0 && player.name === profile.name);

                return (
                  <div
                    key={player.id}
                    style={{ animationDelay: `${idx * 95}ms` }}
                    className={`match-card-enter flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                      isLocal
                        ? 'border-amber-400/55 bg-amber-500/10'
                        : 'border-white/10 bg-[#141b26]'
                    }`}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 text-sm font-bold text-slate-950 shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${skin.swatchHex} 0%, #f59e0b 100%)`,
                      }}
                    >
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-white">
                          {player.name}
                        </span>
                        {isLocal && (
                          <span className="text-[10px] font-bold text-amber-400 shrink-0">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                        <span>{skin.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400">Ready</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isSquadRoom &&
                BOT_PREVIEW_NAMES.slice(0, Math.min(BOT_PREVIEW_NAMES.length, botCount)).map(
                  (botName, botIdx) => {
                    const botSkin = CHARACTER_SKINS[(botIdx + 1) % CHARACTER_SKINS.length];
                    return (
                      <div
                        key={botName}
                        style={{ animationDelay: `${(botIdx + 1) * 80}ms` }}
                        className="match-card-enter flex items-center gap-3 rounded-lg border border-white/10 bg-[#141b26] px-3 py-2.5"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-amber-300 shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${botSkin.swatchHex}44 0%, #1b2434 100%)`,
                          }}
                        >
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-slate-100">
                              {botName}
                            </span>
                            <span className="text-[10px] font-semibold text-amber-400 shrink-0">
                              BOT
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                            <span>{botSkin.name}</span>
                            <span aria-hidden="true">·</span>
                            <span>AI Combatant</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}

              {isSquadRoom && displayPlayers.length > 8 && (
                <div
                  style={{ animationDelay: '760ms' }}
                  className="match-card-enter flex items-center justify-center rounded-lg border border-white/10 bg-[#141b26] px-3 py-2.5 text-xs font-semibold text-sky-300"
                >
                  +{displayPlayers.length - 8} more squad survivors
                </div>
              )}

              {botCount > 0 && (
                <div
                  style={{
                    animationDelay: `${
                      (isSquadRoom ? Math.min(8, displayPlayers.length) : 8) * 80
                    }ms`,
                  }}
                  className="match-card-enter flex items-center gap-3 rounded-lg border border-white/10 bg-[#111722] px-3 py-2.5 sm:col-span-2"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#1b2434] text-amber-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-200">
                      {isSquadRoom
                        ? `${botCount} AI Bot Survivors`
                        : `+${Math.max(0, botCount - BOT_PREVIEW_NAMES.length)} More AI Bots Deploying`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Full 30-combatant battle with adaptive AI bots
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-slate-300">
            <Shield className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="truncate">{tip}</span>
          </div>
        </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="relative z-10 shrink-0 border-t border-white/10 bg-[#090c12]/85 px-4 py-3.5 sm:border-t-0 sm:bg-transparent sm:px-10 sm:pb-8 sm:pt-2">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-mono-tabular">
            <span className="font-semibold text-slate-200 truncate">{steps[stepIndex]}</span>
            <span className="font-bold text-amber-400 shrink-0">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-sm bg-white/15">
            <div
              className="h-full w-full origin-left bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 transition-transform duration-75"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
