import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Crosshair,
  Flame,
  Gamepad2,
  Skull,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import {
  DailyMission,
  DailyMissionMetric,
  DailyMissionsState,
  formatMissionCountdown,
} from '../game/missions';
import { soundEngine } from '../game/audio';

interface DailyMissionsModalProps {
  state: DailyMissionsState;
  currentGold: number;
  onClaimMission: (missionId: string) => void;
  onClaimAll: () => void;
  onRefreshIfExpired: () => void;
  onClose: () => void;
}

function getMissionIcon(metric: DailyMissionMetric) {
  switch (metric) {
    case 'headshots':
      return Crosshair;
    case 'kills':
      return Skull;
    case 'damage':
      return Flame;
    case 'wins':
      return Trophy;
    case 'top5':
      return Target;
    case 'matches':
    default:
      return Gamepad2;
  }
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  state,
  currentGold,
  onClaimMission,
  onClaimAll,
  onRefreshIfExpired,
  onClose,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = Date.now();
      setNowMs(next);
      if (next >= state.expiresAt) {
        onRefreshIfExpired();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.expiresAt, onRefreshIfExpired]);

  const completedCount = state.missions.filter((m) => m.progress >= m.target).length;
  const claimableMissions = state.missions.filter((m) => m.progress >= m.target && !m.claimed);
  const totalClaimableGold = claimableMissions.reduce((sum, m) => sum + m.rewardGold, 0);
  const remainingMs = Math.max(0, state.expiresAt - nowMs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-amber-500/35 bg-[#0e1218] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#121823] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-3xl font-bold tracking-wider text-white leading-none">
                DAILY MISSIONS
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Complete daily challenges to earn Gold · Automatically refreshes every 24 hours
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Close Daily Missions"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#192130] text-slate-300 hover:border-white/30 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0f15] px-5 py-2.5 text-xs font-mono-tabular">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            <span>Refreshes in</span>
            <span className="font-bold text-sky-300">{formatMissionCountdown(remainingMs)}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              Completed:{' '}
              <strong className="text-white">
                {completedCount} / {state.missions.length}
              </strong>
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Coins className="h-3.5 w-3.5" />
              {currentGold.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 3 Daily Mission Cards */}
        <div className="space-y-3 p-5">
          {state.missions.map((mission: DailyMission) => {
            const Icon = getMissionIcon(mission.metric);
            const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            const isComplete = mission.progress >= mission.target;
            const isClaimable = isComplete && !mission.claimed;

            return (
              <div
                key={mission.id}
                className={`rounded-lg border p-3.5 transition-colors ${
                  mission.claimed
                    ? 'border-emerald-500/25 bg-emerald-950/15'
                    : isClaimable
                    ? 'border-amber-400/60 bg-amber-500/10'
                    : 'border-white/10 bg-[#141a24]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                        mission.claimed
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-400'
                          : isClaimable
                          ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-[#1b2331] text-slate-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {mission.title}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-bold text-amber-400 shrink-0">
                          <Coins className="h-3 w-3" />+{mission.rewardGold}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{mission.description}</p>
                    </div>
                  </div>

                  {mission.claimed ? (
                    <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-300">
                      <Check className="h-3.5 w-3.5" />
                      CLAIMED
                    </span>
                  ) : isClaimable ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTopUpSuccess();
                        onClaimMission(mission.id);
                      }}
                      className="h-9 shrink-0 rounded-lg bg-amber-500 px-3.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 active:translate-y-0.5 transition-all"
                    >
                      CLAIM GOLD
                    </button>
                  ) : (
                    <span className="shrink-0 font-mono-tabular text-xs font-semibold text-slate-400">
                      In Progress
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-white/10">
                    <div
                      className={`h-full transition-all duration-300 ${
                        mission.claimed
                          ? 'bg-emerald-400'
                          : isComplete
                          ? 'bg-amber-400'
                          : 'bg-sky-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono-tabular text-[11px] font-semibold text-slate-300 shrink-0">
                    {mission.progress.toLocaleString()} / {mission.target.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#121823] px-5 py-3.5">
          <span className="text-xs text-slate-400">
            Play matches in Bermudas or Purgatory to advance all daily challenges.
          </span>

          {claimableMissions.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTopUpSuccess();
                onClaimAll();
              }}
              className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              CLAIM ALL (+{totalClaimableGold.toLocaleString()} GOLD)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="shrink-0 rounded-lg border border-white/15 bg-[#1b2331] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
