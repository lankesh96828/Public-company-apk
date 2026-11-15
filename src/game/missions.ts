export type DailyMissionMetric =
  | 'matches'
  | 'headshots'
  | 'kills'
  | 'damage'
  | 'top5'
  | 'wins';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  metric: DailyMissionMetric;
  target: number;
  progress: number;
  rewardGold: number;
  claimed: boolean;
}

export interface DailyMissionsState {
  cycleKey: number;
  expiresAt: number;
  missions: DailyMission[];
}

export const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'blaze_drop_daily_missions_v1_';

interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  metric: DailyMissionMetric;
  target: number;
  rewardGold: number;
}

const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'play_2_matches',
    title: 'Drop Ready',
    description: 'Play 2 matches',
    metric: 'matches',
    target: 2,
    rewardGold: 450,
  },
  {
    id: 'land_5_headshots',
    title: 'Sharp Aim',
    description: 'Land 5 headshots',
    metric: 'headshots',
    target: 5,
    rewardGold: 700,
  },
  {
    id: 'get_6_kills',
    title: 'Island Hunter',
    description: 'Eliminate 6 opponents',
    metric: 'kills',
    target: 6,
    rewardGold: 600,
  },
  {
    id: 'deal_1200_damage',
    title: 'Heavy Fire',
    description: 'Deal 1,200 total damage',
    metric: 'damage',
    target: 1200,
    rewardGold: 550,
  },
  {
    id: 'reach_top_5',
    title: 'Zone Survivor',
    description: 'Finish in the Top 5',
    metric: 'top5',
    target: 1,
    rewardGold: 650,
  },
  {
    id: 'win_1_match',
    title: 'BOOYAH! Champion',
    description: 'Win 1 match (Rank #1)',
    metric: 'wins',
    target: 1,
    rewardGold: 1000,
  },
  {
    id: 'play_3_matches',
    title: 'Hot Dropper',
    description: 'Play 3 matches',
    metric: 'matches',
    target: 3,
    rewardGold: 650,
  },
  {
    id: 'land_3_headshots',
    title: 'One-Tap Precision',
    description: 'Land 3 headshots',
    metric: 'headshots',
    target: 3,
    rewardGold: 500,
  },
  {
    id: 'get_10_kills',
    title: 'Rampage',
    description: 'Eliminate 10 opponents',
    metric: 'kills',
    target: 10,
    rewardGold: 900,
  },
];

function seededPick3(cycleKey: number): DailyMission[] {
  // Deterministic 24h selection guaranteeing 3 distinct metrics every cycle
  let h = (cycleKey * 2654435761) >>> 0;
  const pool = [...MISSION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    h = (Math.imul(h ^ (h >>> 15), 2246822519) + 3266489917) >>> 0;
    const j = h % (i + 1);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const picked: MissionTemplate[] = [];
  const usedMetrics = new Set<DailyMissionMetric>();
  for (const item of pool) {
    if (!usedMetrics.has(item.metric)) {
      usedMetrics.add(item.metric);
      picked.push(item);
      if (picked.length === 3) break;
    }
  }

  return picked.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    metric: t.metric,
    target: t.target,
    progress: 0,
    rewardGold: t.rewardGold,
    claimed: false,
  }));
}

export function createDailyMissionsState(now = Date.now()): DailyMissionsState {
  const cycleKey = Math.floor(now / DAY_MS);
  const expiresAt = (cycleKey + 1) * DAY_MS;
  return {
    cycleKey,
    expiresAt,
    missions: seededPick3(cycleKey),
  };
}

export function ensureFreshDailyMissions(
  state: DailyMissionsState,
  now = Date.now()
): DailyMissionsState {
  const currentCycleKey = Math.floor(now / DAY_MS);
  if (
    !state ||
    state.cycleKey !== currentCycleKey ||
    now >= state.expiresAt ||
    !Array.isArray(state.missions) ||
    state.missions.length !== 3
  ) {
    return createDailyMissionsState(now);
  }
  return state;
}

export function loadDailyMissions(scopeKey: string, now = Date.now()): DailyMissionsState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${scopeKey || 'guest'}`);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyMissionsState;
      const fresh = ensureFreshDailyMissions(parsed, now);
      if (fresh !== parsed) {
        saveDailyMissions(scopeKey, fresh);
      }
      return fresh;
    }
  } catch {
    // Ignore storage read errors
  }
  const initial = createDailyMissionsState(now);
  saveDailyMissions(scopeKey, initial);
  return initial;
}

export function saveDailyMissions(scopeKey: string, state: DailyMissionsState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${scopeKey || 'guest'}`, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyMatchStatsToMissions(
  state: DailyMissionsState,
  stats: {
    kills: number;
    headshots: number;
    damageDealt: number;
    isWin: boolean;
    isTop5: boolean;
  },
  now = Date.now()
): { nextState: DailyMissionsState; newlyCompleted: DailyMission[] } {
  const base = ensureFreshDailyMissions(state, now);
  const newlyCompleted: DailyMission[] = [];

  const missions = base.missions.map((m) => {
    let delta = 0;
    if (m.metric === 'matches') delta = 1;
    else if (m.metric === 'kills') delta = Math.max(0, Math.round(stats.kills));
    else if (m.metric === 'headshots') delta = Math.max(0, Math.round(stats.headshots));
    else if (m.metric === 'damage') delta = Math.max(0, Math.round(stats.damageDealt));
    else if (m.metric === 'wins') delta = stats.isWin ? 1 : 0;
    else if (m.metric === 'top5') delta = stats.isTop5 ? 1 : 0;

    if (delta === 0) return m;

    const wasDone = m.progress >= m.target;
    const nextProgress = Math.min(m.target, m.progress + delta);
    const updated: DailyMission = {
      ...m,
      progress: nextProgress,
    };
    if (!wasDone && nextProgress >= m.target) {
      newlyCompleted.push(updated);
    }
    return updated;
  });

  return {
    nextState: {
      ...base,
      missions,
    },
    newlyCompleted,
  };
}

export function formatMissionCountdown(remainingMs: number): string {
  const clampedSec = Math.max(0, Math.floor(remainingMs / 1000));
  const hrs = Math.floor(clampedSec / 3600);
  const mins = Math.floor((clampedSec % 3600) / 60);
  const secs = clampedSec % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}
