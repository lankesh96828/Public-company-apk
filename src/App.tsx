import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ControlSettings,
  DEFAULT_EQUIPPED_EMOTES,
  DEFAULT_EQUIPPED_WEAPON_SKINS,
  DEFAULT_UNLOCKED_EMOTES,
  DEFAULT_UNLOCKED_WEAPON_SKINS,
  FriendRecord,
  FriendRequestRecord,
  GamePhase,
  getGameUid,
  HudState,
  LeaderboardRow,
  LobbyTab,
  MapId,
  MatchMode,
  MultiplayerRoomInfo,
  MultiplayerRosterPlayer,
  normalizeMapId,
  OnlinePlayerPresence,
  PlayerProfile,
  RoyaleBannerId,
  SquadInvite,
  StoreBundle,
  StoreTokenItem,
  TopUpMilestone,
  TopUpPack,
  TopUpTransaction,
  WeaponId,
} from './game/types';
import { loadControlSettings, saveControlSettings } from './game/controls';
import { LobbySceneController } from './game/LobbyScene';
import { BattleRoyaleEngine, MultiplayerMatchSession } from './game/BattleRoyaleEngine';
import { LobbyView } from './components/LobbyView';
import { GameHUD } from './components/GameHUD';
import { ControlsCustomizerModal } from './components/ControlsCustomizerModal';
import { TopUpModal } from './components/TopUpModal';
import { LuckRoyaleModal, SpinOutcome } from './components/LuckRoyaleModal';
import { StoreModal, StoreTab } from './components/StoreModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { FriendsModal } from './components/FriendsModal';
import { MatchLoadingScreen } from './components/MatchLoadingScreen';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import {
  applyMatchStatsToMissions,
  DailyMissionsState,
  ensureFreshDailyMissions,
  loadDailyMissions,
  saveDailyMissions,
} from './game/missions';
import { soundEngine } from './game/audio';
import {
  MERCHANT_ADMIN_EMAIL,
  addCloudFriend,
  adminResolveTopUpTransaction,
  auth,
  deleteCloudFriendRequest,
  fetchOrCreateCloudProfile,
  isTransientOfflineError,
  markCloudTopUpCredited,
  removeCloudFriend,
  saveCloudTopUpTransaction,
  sendCloudFriendRequest,
  signInWithGoogle,
  signOutAccount,
  subscribeAdminPendingTopUps,
  subscribeFriendRequests,
  subscribeFriends,
  subscribeLeaderboard,
  subscribeTopUpTransactions,
  syncCloudProfile,
} from './firebase';

const STORAGE_KEY = 'blaze_drop_profile_v1';
const FRIENDS_STORAGE_KEY = 'blaze_drop_friends_v1';
const TOPUPS_STORAGE_KEY = 'blaze_drop_topups_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'BLAZE_01',
  level: 12,
  xp: 240,
  gold: 4250,
  diamonds: 180,
  ffTokens: 0,
  luckDiamond: 0,
  luckGold: 0,
  luckWeapon: 0,
  luckIncubator: 0,
  luckEmote: 0,
  luckFaded: 0,
  totalTopUpDiamonds: 0,
  claimedTopUpMilestones: [],
  unlockedSkins: ['alok'],
  unlockedParachutes: ['ember'],
  unlockedGlooWalls: ['frost'],
  unlockedWeaponSkins: DEFAULT_UNLOCKED_WEAPON_SKINS,
  unlockedEmotes: DEFAULT_UNLOCKED_EMOTES,
  equippedEmotes: DEFAULT_EQUIPPED_EMOTES,
  wins: 3,
  kills: 24,
  matches: 11,
  rankPoints: 1820,
  selectedSkinId: 'alok',
  selectedLobbyWeapon: 'ak47',
  selectedParachuteId: 'ember',
  selectedGlooId: 'frost',
  equippedWeaponSkins: { ...DEFAULT_EQUIPPED_WEAPON_SKINS },
  sensitivity: 1.0,
};

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      ffTokens: typeof parsed.ffTokens === 'number' ? parsed.ffTokens : 0,
      luckDiamond: typeof parsed.luckDiamond === 'number' ? parsed.luckDiamond : 0,
      luckGold: typeof parsed.luckGold === 'number' ? parsed.luckGold : 0,
      luckWeapon: typeof parsed.luckWeapon === 'number' ? parsed.luckWeapon : 0,
      luckIncubator: typeof parsed.luckIncubator === 'number' ? parsed.luckIncubator : 0,
      luckEmote: typeof parsed.luckEmote === 'number' ? parsed.luckEmote : 0,
      luckFaded: typeof parsed.luckFaded === 'number' ? parsed.luckFaded : 0,
      claimedTopUpMilestones: Array.isArray(parsed.claimedTopUpMilestones)
        ? parsed.claimedTopUpMilestones
        : DEFAULT_PROFILE.claimedTopUpMilestones,
      unlockedSkins: Array.isArray(parsed.unlockedSkins)
        ? parsed.unlockedSkins
        : DEFAULT_PROFILE.unlockedSkins,
      unlockedParachutes: Array.isArray(parsed.unlockedParachutes)
        ? parsed.unlockedParachutes
        : DEFAULT_PROFILE.unlockedParachutes,
      unlockedGlooWalls: Array.isArray(parsed.unlockedGlooWalls)
        ? parsed.unlockedGlooWalls
        : DEFAULT_PROFILE.unlockedGlooWalls,
      unlockedWeaponSkins: Array.isArray(parsed.unlockedWeaponSkins)
        ? parsed.unlockedWeaponSkins
        : DEFAULT_PROFILE.unlockedWeaponSkins,
      unlockedEmotes: Array.isArray(parsed.unlockedEmotes)
        ? parsed.unlockedEmotes
        : DEFAULT_PROFILE.unlockedEmotes,
      equippedEmotes: Array.isArray(parsed.equippedEmotes)
        ? parsed.equippedEmotes.slice(0, 8)
        : DEFAULT_PROFILE.equippedEmotes,
      equippedWeaponSkins:
        parsed.equippedWeaponSkins && typeof parsed.equippedWeaponSkins === 'object'
          ? { ...DEFAULT_EQUIPPED_WEAPON_SKINS, ...parsed.equippedWeaponSkins }
          : { ...DEFAULT_EQUIPPED_WEAPON_SKINS },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function loadLocalFriends(): FriendRecord[] {
  try {
    const raw = localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalTopUps(): TopUpTransaction[] {
  try {
    const raw = localStorage.getItem(TOPUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const lobbyRef = useRef<LobbySceneController | null>(null);
  const engineRef = useRef<BattleRoyaleEngine | null>(null);
  const rewardedMatchRef = useRef(false);
  const pendingVictoryCelebrationRef = useRef(false);
  const victoryBannerTimerRef = useRef<number | null>(null);
  const [victoryCelebrationActive, setVictoryCelebrationActive] = useState(false);

  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const [controlSettings, setControlSettings] = useState<ControlSettings>(() =>
    loadControlSettings(loadProfile().sensitivity)
  );
  const [inMatch, setInMatch] = useState(false);
  const [showMatchLoading, setShowMatchLoading] = useState(false);
  const [matchKey, setMatchKey] = useState(0);
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('home');
  const [previewSkinId, setPreviewSkinId] = useState<string | null>(null);
  const [previewWeaponSkinId, setPreviewWeaponSkinId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<MapId>('bermuda');
  const [mode, setMode] = useState<MatchMode>('br_classic');
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [storeInitialTab, setStoreInitialTab] = useState<StoreTab>('bundles');
  const [showLuckRoyale, setShowLuckRoyale] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [multiplayerTab, setMultiplayerTab] = useState<'rooms' | 'leaderboard'>('rooms');
  const [hud, setHud] = useState<HudState | null>(null);
  const [dailyMissions, setDailyMissions] = useState<DailyMissionsState>(() =>
    loadDailyMissions('guest')
  );

  // Firebase Auth & Cloud Firestore state
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [cloudFriends, setCloudFriends] = useState<FriendRecord[]>([]);
  const [localFriends, setLocalFriends] = useState<FriendRecord[]>(loadLocalFriends);
  const [cloudFriendRequests, setCloudFriendRequests] = useState<FriendRequestRecord[]>([]);
  const [wsFriendRequests, setWsFriendRequests] = useState<FriendRequestRecord[]>([]);
  const [cloudTopUps, setCloudTopUps] = useState<TopUpTransaction[]>([]);
  const [localTopUps, setLocalTopUps] = useState<TopUpTransaction[]>(loadLocalTopUps);
  const [adminPendingTopUps, setAdminPendingTopUps] = useState<TopUpTransaction[]>([]);
  const claimedTxIdsRef = useRef<Set<string>>(new Set());
  const cloudLoadedRef = useRef(false);
  const skipNextSyncRef = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const dailyMissionsRef = useRef(dailyMissions);
  dailyMissionsRef.current = dailyMissions;
  const controlSettingsRef = useRef(controlSettings);
  controlSettingsRef.current = controlSettings;
  const authUidRef = useRef<string | null>(null);
  authUidRef.current = authUid;
  const inMatchRef = useRef(false);
  inMatchRef.current = inMatch;

  const isMerchantAdmin = Boolean(
    authEmail && authEmail.toLowerCase() === MERCHANT_ADMIN_EMAIL.toLowerCase()
  );

  // WebSocket Multiplayer & Presence state
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const localPlayerIdRef = useRef<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoomInfo | null>(null);
  const [openRooms, setOpenRooms] = useState<MultiplayerRoomInfo[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerPresence[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<SquadInvite[]>([]);
  const [inviteNotice, setInviteNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const activeMpSessionRef = useRef<MultiplayerMatchSession | null>(null);
  const isAutoMatchSessionRef = useRef(false);
  const voiceSignalHandlerRef = useRef<((msg: Record<string, unknown>) => void) | null>(null);

  // Persist local profile
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  // Persist local friends fallback
  useEffect(() => {
    try {
      localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(localFriends));
    } catch {
      // Ignore storage quota errors
    }
  }, [localFriends]);

  // Persist local top-up receipts fallback
  useEffect(() => {
    try {
      localStorage.setItem(TOPUPS_STORAGE_KEY, JSON.stringify(localTopUps.slice(0, 30)));
    } catch {
      // Ignore storage quota errors
    }
  }, [localTopUps]);

  // Reload scoped daily missions when signed-in account changes & refresh every 24h cycle
  useEffect(() => {
    const scopeKey = authUid || 'guest';
    setDailyMissions(loadDailyMissions(scopeKey));
  }, [authUid]);

  useEffect(() => {
    if (inMatch) return;
    const scopeKey = authUid || 'guest';
    const checkRefresh = () => {
      setDailyMissions((prev) => {
        const next = ensureFreshDailyMissions(prev);
        if (next !== prev) saveDailyMissions(scopeKey, next);
        return next;
      });
    };
    checkRefresh();
    const id = window.setInterval(checkRefresh, 30000);
    return () => window.clearInterval(id);
  }, [authUid, inMatch]);

  // Firebase Auth observer + Firestore cloud profile hydration
  useEffect(() => {
    let active = true;
    let onlineRetryListener: (() => void) | null = null;
    let retryTimer: number | null = null;

    const clearRetryHooks = () => {
      if (onlineRetryListener) {
        window.removeEventListener('online', onlineRetryListener);
        onlineRetryListener = null;
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const hydrateUser = async (user: NonNullable<typeof auth.currentUser>) => {
      if (!active) return;
      setCloudStatus('Loading Cloud Save...');
      try {
        const cloudProf = await fetchOrCreateCloudProfile(user, profileRef.current);
        if (!active || auth.currentUser?.uid !== user.uid) return;
        clearRetryHooks();
        skipNextSyncRef.current = true;
        cloudLoadedRef.current = true;
        setProfile(cloudProf);
        setCloudStatus('Synced');
      } catch (err) {
        if (isTransientOfflineError(err)) {
          if (active) setCloudStatus('Offline (Local)');
          if (!onlineRetryListener) {
            onlineRetryListener = () => {
              onlineRetryListener = null;
              if (active && auth.currentUser?.uid === user.uid) {
                hydrateUser(user);
              }
            };
            window.addEventListener('online', onlineRetryListener, { once: true });
          }
          if (
            retryTimer === null &&
            (typeof navigator === 'undefined' || navigator.onLine !== false)
          ) {
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              if (active && auth.currentUser?.uid === user.uid && !cloudLoadedRef.current) {
                hydrateUser(user);
              }
            }, 10000);
          }
        } else {
          console.error(err);
          if (active) setCloudStatus('Sync Warning');
        }
      }
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      clearRetryHooks();
      if (user) {
        cloudLoadedRef.current = false;
        setAuthUid(user.uid);
        setAuthEmail(user.email);
        await hydrateUser(user);
      } else {
        cloudLoadedRef.current = false;
        skipNextSyncRef.current = false;
        setAuthUid(null);
        setAuthEmail(null);
        setCloudStatus(null);
        setCloudFriends([]);
        setCloudFriendRequests([]);
        setAdminPendingTopUps([]);
      }
    });
    return () => {
      active = false;
      clearRetryHooks();
      unsub();
    };
  }, []);

  // Firestore real-time leaderboard listener
  useEffect(() => {
    const unsub = subscribeLeaderboard(
      (rows) => setLeaderboard(rows),
      (err) => {
        if (!isTransientOfflineError(err)) console.error('Leaderboard listener error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Firestore real-time friends, friend requests & top-up receipts listeners when signed in
  useEffect(() => {
    if (!authUid) {
      setCloudFriends([]);
      setCloudFriendRequests([]);
      setCloudTopUps([]);
      return;
    }
    const unsubFriends = subscribeFriends(
      authUid,
      (list) => setCloudFriends(list),
      (err) => {
        if (!isTransientOfflineError(err)) console.error('Friends listener error:', err);
      }
    );
    const unsubRequests = subscribeFriendRequests(
      authUid,
      (list) => setCloudFriendRequests(list),
      (err) => {
        if (!isTransientOfflineError(err)) console.error('Friend requests listener error:', err);
      }
    );
    const unsubTopUps = subscribeTopUpTransactions(
      authUid,
      (list) => setCloudTopUps(list),
      (err) => {
        if (!isTransientOfflineError(err)) console.error('Top-up receipts listener error:', err);
      }
    );
    return () => {
      unsubFriends();
      unsubRequests();
      unsubTopUps();
    };
  }, [authUid]);

  // Merchant Admin real-time pending UPI verification listener
  useEffect(() => {
    if (!authUid || !isMerchantAdmin) {
      setAdminPendingTopUps([]);
      return;
    }
    const unsubAdmin = subscribeAdminPendingTopUps(
      (list) => setAdminPendingTopUps(list),
      (err) => {
        if (!isTransientOfflineError(err)) console.error('Admin pending topups error:', err);
      }
    );
    return () => unsubAdmin();
  }, [authUid, isMerchantAdmin]);

  // Auto-process accepted cloud friend requests (for offline mutual friend additions)
  useEffect(() => {
    if (!authUid) return;
    const accepted = cloudFriendRequests.filter((r) => r.status === 'accepted');
    if (accepted.length === 0) return;
    accepted.forEach((req) => {
      if (req.fromUid && req.fromUid !== authUid) {
        addCloudFriend(authUid, {
          uid: req.fromUid,
          name: req.fromName,
          skinId: req.fromSkinId,
          level: req.fromLevel,
          rankPoints: req.fromRankPoints,
        }).catch(() => undefined);
      }
      deleteCloudFriendRequest(authUid, req.fromUid).catch(() => undefined);
    });
  }, [authUid, cloudFriendRequests]);

  // Auto-claim cloud-verified top-ups (never double-credits; only when status === 'verified' && credited === false)
  useEffect(() => {
    if (!authUid || cloudTopUps.length === 0) return;
    cloudTopUps.forEach((tx) => {
      if (
        tx.status === 'verified' &&
        tx.credited === false &&
        !claimedTxIdsRef.current.has(tx.id)
      ) {
        claimedTxIdsRef.current.add(tx.id);
        const amount = tx.diamondsCredited || tx.expectedDiamonds || 0;
        if (amount > 0) {
          soundEngine.playTopUpSuccess();
          setProfile((prev) => ({
            ...prev,
            diamonds: prev.diamonds + amount,
            totalTopUpDiamonds: prev.totalTopUpDiamonds + amount,
          }));
          setInviteNotice({
            ok: true,
            text: `+${amount} Diamonds verified & credited to your account!`,
          });
        }
        markCloudTopUpCredited(authUid, tx.id).catch((err) => {
          if (!isTransientOfflineError(err)) console.error('markCloudTopUpCredited error:', err);
        });
      }
    });
  }, [authUid, cloudTopUps]);

  // Debounced sync of profile changes to Cloud Firestore when authenticated
  useEffect(() => {
    if (!authUid || !cloudLoadedRef.current) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      syncCloudProfile(authUid, profile)
        .then(() => setCloudStatus('Synced'))
        .catch((err) => {
          if (isTransientOfflineError(err)) {
            setCloudStatus('Offline (Local)');
          } else {
            console.error(err);
            setCloudStatus('Sync Warning');
          }
        });
    }, 800);
    return () => window.clearTimeout(t);
  }, [authUid, profile]);

  // Real-time WebSocket connection for Multiplayer Rooms, Live Presence & Squad Invites
  useEffect(() => {
    let closedByCleanUp = false;
    let reconnectTimer: number | null = null;
    let noticeTimer: number | null = null;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setRoomError(null);
        const p = profileRef.current;
        ws.send(
          JSON.stringify({
            type: 'presence:identify',
            uid: authUidRef.current,
            name: p.name,
            skinId: p.selectedSkinId,
            level: p.level,
            rankPoints: p.rankPoints,
            inMatch: inMatchRef.current,
          })
        );
      };

      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        const type = String(msg.type || '');
        if (type === 'welcome') {
          const pid = String(msg.playerId || '');
          localPlayerIdRef.current = pid;
          setLocalPlayerId(pid);
          if (Array.isArray(msg.rooms)) setOpenRooms(msg.rooms as MultiplayerRoomInfo[]);
          if (Array.isArray(msg.players)) setOnlinePlayers(msg.players as OnlinePlayerPresence[]);
        } else if (type === 'presence:list') {
          if (Array.isArray(msg.players)) setOnlinePlayers(msg.players as OnlinePlayerPresence[]);
        } else if (type === 'room:list') {
          if (Array.isArray(msg.rooms)) setOpenRooms(msg.rooms as MultiplayerRoomInfo[]);
        } else if (type === 'room:joined') {
          const pid = String(msg.playerId || '');
          localPlayerIdRef.current = pid;
          setLocalPlayerId(pid);
          setCurrentRoom(msg.room as MultiplayerRoomInfo);
          setRoomError(null);
        } else if (type === 'room:state') {
          setCurrentRoom(msg.room as MultiplayerRoomInfo);
        } else if (type === 'room:left') {
          setCurrentRoom(null);
        } else if (type === 'room:error') {
          setRoomError(String(msg.message || 'Room error'));
        } else if (type === 'squad:invited') {
          soundEngine.playTopUpSuccess();
          const invite: SquadInvite = {
            inviteId: String(msg.inviteId || `inv_${Date.now()}`),
            fromPlayerId: String(msg.fromPlayerId || ''),
            fromName: String(msg.fromName || 'Survivor'),
            fromSkinId: String(msg.fromSkinId || 'alok'),
            roomCode: String(msg.roomCode || ''),
            mapId: normalizeMapId(msg.mapId),
            mode: msg.mode === 'br_blitz' ? 'br_blitz' : 'br_classic',
            receivedAt: Date.now(),
          };
          setIncomingInvites((prev) => [
            invite,
            ...prev.filter((i) => !(i.roomCode === invite.roomCode && i.fromPlayerId === invite.fromPlayerId)),
          ]);
        } else if (type === 'squad:invite_status') {
          setInviteNotice({
            ok: Boolean(msg.ok),
            text: String(msg.message || ''),
          });
          if (noticeTimer !== null) window.clearTimeout(noticeTimer);
          noticeTimer = window.setTimeout(() => setInviteNotice(null), 4500);
        } else if (type === 'friend:request') {
          soundEngine.playTopUpSuccess();
          const fromUid = String(msg.fromUid || `guest_${Date.now()}`);
          const fromName = String(msg.fromName || 'Survivor');
          const req: FriendRequestRecord = {
            id: fromUid,
            fromUid,
            fromName,
            fromSkinId: String(msg.fromSkinId || 'alok'),
            fromLevel: Number(msg.fromLevel || 1),
            fromRankPoints: Number(msg.fromRankPoints || 0),
            toUid: String(authUidRef.current || 'local'),
            status: 'pending',
            createdAt: Date.now(),
          };
          setWsFriendRequests((prev) => [
            req,
            ...prev.filter((r) => r.fromUid !== req.fromUid && r.fromName !== req.fromName),
          ]);
          setInviteNotice({
            ok: true,
            text: `${fromName} sent you a Friend Request!`,
          });
          if (noticeTimer !== null) window.clearTimeout(noticeTimer);
          noticeTimer = window.setTimeout(() => setInviteNotice(null), 4500);
        } else if (type === 'friend:accept') {
          soundEngine.playTopUpSuccess();
          const fUid = msg.fromUid ? String(msg.fromUid) : null;
          const fName = String(msg.fromName || 'Survivor');
          const record: FriendRecord = {
            id: fUid || `guest_${fName}`,
            uid: fUid && !fUid.startsWith('guest_') ? fUid : null,
            name: fName,
            skinId: String(msg.fromSkinId || 'alok'),
            level: Number(msg.fromLevel || 1),
            rankPoints: Number(msg.fromRankPoints || 0),
            addedAt: Date.now(),
          };
          setLocalFriends((prev) => [
            record,
            ...prev.filter((f) => f.id !== record.id && f.name.toLowerCase() !== fName.toLowerCase()),
          ]);
          if (authUidRef.current && record.uid && record.uid !== authUidRef.current) {
            addCloudFriend(authUidRef.current, {
              uid: record.uid,
              name: record.name,
              skinId: record.skinId,
              level: record.level,
              rankPoints: record.rankPoints,
            }).catch(() => undefined);
          }
          setInviteNotice({
            ok: true,
            text: `${fName} accepted your Friend Request!`,
          });
          if (noticeTimer !== null) window.clearTimeout(noticeTimer);
          noticeTimer = window.setTimeout(() => setInviteNotice(null), 4500);
        } else if (type === 'match:start') {
          const mMap = normalizeMapId(msg.mapId);
          const mMode = msg.mode === 'br_blitz' ? 'br_blitz' : 'br_classic';
          const roster = Array.isArray(msg.players) ? (msg.players as MultiplayerRosterPlayer[]) : [];
          const code = String(msg.roomCode || '');
          isAutoMatchSessionRef.current = Boolean(msg.isAutoMatch);
          setMapId(mMap);
          setMode(mMode);
          activeMpSessionRef.current = {
            ws: wsRef.current,
            localPlayerId: String(localPlayerIdRef.current || ''),
            roomCode: code,
            roster,
          };
          setShowMultiplayer(false);
          setShowFriends(false);
          setShowTopUp(false);
          setShowStore(false);
          setShowLuckRoyale(false);
          setIncomingInvites([]);
          pendingVictoryCelebrationRef.current = false;
          setVictoryCelebrationActive(false);
          setShowMatchLoading(true);
          setInMatch(true);
          setMatchKey((k) => k + 1);
        } else if (type.startsWith('voice:')) {
          voiceSignalHandlerRef.current?.(msg);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByCleanUp) {
          reconnectTimer = window.setTimeout(connect, 2200);
        }
      };
    };

    connect();
    return () => {
      closedByCleanUp = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (noticeTimer !== null) window.clearTimeout(noticeTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const sendWs = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const registerVoiceSignalHandler = useCallback(
    (handler: ((msg: Record<string, unknown>) => void) | null) => {
      voiceSignalHandlerRef.current = handler;
    },
    []
  );

  // Sync live online presence identity whenever profile, auth, or match state changes
  useEffect(() => {
    if (!wsConnected) return;
    sendWs({
      type: 'presence:identify',
      uid: authUid,
      name: profile.name,
      skinId: profile.selectedSkinId,
      level: profile.level,
      rankPoints: profile.rankPoints,
      inMatch,
    });
  }, [
    wsConnected,
    authUid,
    profile.name,
    profile.selectedSkinId,
    profile.level,
    profile.rankPoints,
    inMatch,
    sendWs,
  ]);

  // Mount either LobbySceneController or BattleRoyaleEngine in isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    if (!inMatch) {
      engineRef.current?.dispose();
      engineRef.current = null;
      setHud(null);

      const lobby = new LobbySceneController(
        mountEl,
        profile.selectedSkinId,
        profile.selectedLobbyWeapon,
        profile.selectedParachuteId,
        profile.equippedWeaponSkins?.[profile.selectedLobbyWeapon] ||
          DEFAULT_EQUIPPED_WEAPON_SKINS[profile.selectedLobbyWeapon]
      );
      lobbyRef.current = lobby;
      lobby.setTab(lobbyTab);

      if (pendingVictoryCelebrationRef.current) {
        pendingVictoryCelebrationRef.current = false;
        lobby.triggerVictoryFireworks(8.5);
        setVictoryCelebrationActive(true);
        if (victoryBannerTimerRef.current !== null) {
          window.clearTimeout(victoryBannerTimerRef.current);
        }
        victoryBannerTimerRef.current = window.setTimeout(() => {
          setVictoryCelebrationActive(false);
          victoryBannerTimerRef.current = null;
        }, 8500);
      }

      return () => {
        if (victoryBannerTimerRef.current !== null) {
          window.clearTimeout(victoryBannerTimerRef.current);
          victoryBannerTimerRef.current = null;
        }
        lobby.dispose();
        lobbyRef.current = null;
      };
    } else {
      lobbyRef.current?.dispose();
      lobbyRef.current = null;
      rewardedMatchRef.current = false;

      const mpSession = activeMpSessionRef.current
        ? {
            ...activeMpSessionRef.current,
            localPlayerId: localPlayerId || activeMpSessionRef.current.localPlayerId,
            ws: wsRef.current,
          }
        : null;

      const engine = new BattleRoyaleEngine(
        mountEl,
        profile,
        mapId,
        mode,
        (nextHud) => {
          setHud(nextHud);
        },
        mpSession,
        controlSettingsRef.current
      );
      engineRef.current = engine;

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inMatch, matchKey]);

  // Sync Lobby 3D character & camera preset on loadout/tab change without remounting WebGL
  useEffect(() => {
    const displayedSkinId =
      lobbyTab === 'character' && previewSkinId ? previewSkinId : profile.selectedSkinId;
    const equippedWeaponSkin =
      profile.equippedWeaponSkins?.[profile.selectedLobbyWeapon] ||
      DEFAULT_EQUIPPED_WEAPON_SKINS[profile.selectedLobbyWeapon];
    const displayedWeaponSkinId =
      lobbyTab === 'weapons' && previewWeaponSkinId ? previewWeaponSkinId : equippedWeaponSkin;
    if (!inMatch && lobbyRef.current) {
      lobbyRef.current.updateLoadout(
        displayedSkinId,
        profile.selectedLobbyWeapon,
        profile.selectedParachuteId,
        displayedWeaponSkinId
      );
    }
  }, [
    inMatch,
    lobbyTab,
    previewSkinId,
    previewWeaponSkinId,
    profile.selectedSkinId,
    profile.selectedLobbyWeapon,
    profile.selectedParachuteId,
    profile.equippedWeaponSkins,
  ]);

  useEffect(() => {
    if (lobbyTab !== 'character') {
      setPreviewSkinId(null);
    }
    if (lobbyTab !== 'weapons') {
      setPreviewWeaponSkinId(null);
    }
    if (!inMatch && lobbyRef.current) {
      lobbyRef.current.setTab(lobbyTab);
    }
  }, [inMatch, lobbyTab]);

  // Apply match rewards & daily mission progress once when entering victory / gameover
  useEffect(() => {
    if (!hud) return;
    const isEnd: GamePhase = hud.phase;
    if ((isEnd === 'victory' || isEnd === 'gameover') && !rewardedMatchRef.current) {
      rewardedMatchRef.current = true;
      pendingVictoryCelebrationRef.current = isEnd === 'victory';
      setProfile((prev) => {
        const nextXp = prev.xp + hud.earnedXp;
        const levelUp = Math.floor(nextXp / 500);
        const rpDelta = hud.rankAchieved === 1 ? 65 : hud.kills * 12 + (hud.rankAchieved <= 5 ? 25 : 5);
        return {
          ...prev,
          gold: prev.gold + hud.earnedGold,
          xp: nextXp % 500,
          level: prev.level + levelUp,
          wins: prev.wins + (hud.phase === 'victory' ? 1 : 0),
          kills: prev.kills + hud.kills,
          matches: prev.matches + 1,
          rankPoints: prev.rankPoints + rpDelta,
        };
      });

      const scopeKey = authUidRef.current || 'guest';
      const { nextState, newlyCompleted } = applyMatchStatsToMissions(dailyMissionsRef.current, {
        kills: hud.kills,
        headshots: hud.headshots,
        damageDealt: hud.damageDealt,
        isWin: isEnd === 'victory',
        isTop5: hud.rankAchieved <= 5,
      });
      saveDailyMissions(scopeKey, nextState);
      setDailyMissions(nextState);
      if (newlyCompleted.length > 0) {
        const totalGold = newlyCompleted.reduce((s, m) => s + m.rewardGold, 0);
        setInviteNotice({
          ok: true,
          text: `Daily Mission Complete! Claim +${totalGold.toLocaleString()} Gold in Missions.`,
        });
      }
    }
  }, [hud]);

  const startSoloMatch = useCallback(() => {
    pendingVictoryCelebrationRef.current = false;
    setVictoryCelebrationActive(false);
    isAutoMatchSessionRef.current = false;
    activeMpSessionRef.current = null;
    setShowMatchLoading(true);
    setInMatch(true);
    setMatchKey((k) => k + 1);
  }, []);

  const handleMatchLoadingComplete = useCallback(() => {
    setShowMatchLoading(false);
  }, []);

  const returnToLobby = useCallback(() => {
    if (activeMpSessionRef.current) {
      if (isAutoMatchSessionRef.current) {
        sendWs({ type: 'room:leave' });
        setCurrentRoom(null);
      } else {
        sendWs({ type: 'room:reset' });
      }
      activeMpSessionRef.current = null;
      isAutoMatchSessionRef.current = false;
    }
    setShowMatchLoading(false);
    setInMatch(false);
    setLobbyTab('home');
  }, [sendWs]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleChangeControlSettings = useCallback((next: ControlSettings) => {
    setControlSettings(next);
    saveControlSettings(next);
    engineRef.current?.updateControlSettings(next);
    const generalScalar = Math.round((next.sensitivity.general / 100) * 10) / 10;
    setProfile((p) => ({
      ...p,
      sensitivity: Math.max(0.4, Math.min(2.2, generalScalar)),
    }));
  }, []);

  const topUpTransactions: TopUpTransaction[] = useMemo(() => {
    const merged = new Map<string, TopUpTransaction>();
    for (const tx of localTopUps) merged.set(tx.id, tx);
    for (const tx of cloudTopUps) merged.set(tx.id, tx);
    return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [localTopUps, cloudTopUps]);

  const handleVerifiedTopUp = useCallback(
    (pack: TopUpPack, tx: TopUpTransaction) => {
      if (claimedTxIdsRef.current.has(tx.id)) return;
      claimedTxIdsRef.current.add(tx.id);

      const credited = tx.diamondsCredited || pack.diamonds + pack.bonus;
      setProfile((prev) => ({
        ...prev,
        diamonds: prev.diamonds + credited,
        totalTopUpDiamonds: prev.totalTopUpDiamonds + pack.diamonds,
      }));
      const claimedTx: TopUpTransaction = { ...tx, status: 'verified', credited: true };
      setLocalTopUps((prev) => [claimedTx, ...prev.filter((item) => item.id !== tx.id)].slice(0, 30));
      if (authUid) {
        saveCloudTopUpTransaction(authUid, tx)
          .then(() => markCloudTopUpCredited(authUid, tx.id))
          .catch((err) => console.error('Cloud top-up receipt save error:', err));
      }
    },
    [authUid]
  );

  const handlePendingTopUpSubmitted = useCallback(
    (tx: TopUpTransaction) => {
      // Security: NEVER credit Diamonds when a Direct UPI UTR is unverified!
      const pendingTx: TopUpTransaction = {
        ...tx,
        status: 'pending_verification',
        diamondsCredited: 0,
        credited: false,
      };
      setLocalTopUps((prev) => [pendingTx, ...prev.filter((item) => item.id !== tx.id)].slice(0, 30));
      if (authUid) {
        saveCloudTopUpTransaction(authUid, pendingTx).catch((err) =>
          console.error('Cloud pending top-up save error:', err)
        );
      }
    },
    [authUid]
  );

  const handleAdminResolveTopUp = useCallback(
    async (tx: TopUpTransaction, approve: boolean) => {
      if (!isMerchantAdmin || !tx.uid) return;
      await adminResolveTopUpTransaction(
        tx.uid,
        tx.id,
        approve,
        tx.expectedDiamonds || tx.diamondsCredited || 120
      );
    },
    [isMerchantAdmin]
  );

  const handleClaimMilestone = useCallback((ms: TopUpMilestone) => {
    setProfile((prev) => {
      if (prev.claimedTopUpMilestones.includes(ms.id)) return prev;
      const unlockedSkins =
        ms.unlockSkinId && !prev.unlockedSkins.includes(ms.unlockSkinId)
          ? [...prev.unlockedSkins, ms.unlockSkinId]
          : prev.unlockedSkins;
      const unlockedParachutes =
        ms.unlockParachuteId && !prev.unlockedParachutes.includes(ms.unlockParachuteId)
          ? [...prev.unlockedParachutes, ms.unlockParachuteId]
          : prev.unlockedParachutes;
      const unlockedGlooWalls =
        ms.unlockGlooId && !prev.unlockedGlooWalls.includes(ms.unlockGlooId)
          ? [...prev.unlockedGlooWalls, ms.unlockGlooId]
          : prev.unlockedGlooWalls;

      return {
        ...prev,
        gold: prev.gold + (ms.goldReward || 0),
        diamonds: prev.diamonds + (ms.bonusDiamonds || 0),
        claimedTopUpMilestones: [...prev.claimedTopUpMilestones, ms.id],
        unlockedSkins,
        unlockedParachutes,
        unlockedGlooWalls,
        selectedSkinId: ms.unlockSkinId || prev.selectedSkinId,
        selectedParachuteId: ms.unlockParachuteId || prev.selectedParachuteId,
        selectedGlooId: ms.unlockGlooId || prev.selectedGlooId,
      };
    });
  }, []);

  const handleExchangeGold = useCallback((diamondCost: number, goldGain: number) => {
    setProfile((prev) => {
      if (prev.diamonds < diamondCost) return prev;
      return {
        ...prev,
        diamonds: prev.diamonds - diamondCost,
        gold: prev.gold + goldGain,
      };
    });
  }, []);

  const handleCommitSpin = useCallback(
    (
      bannerId: RoyaleBannerId,
      cost: number,
      currency: 'diamonds' | 'gold',
      outcomes: SpinOutcome[],
      nextLuck: number
    ) => {
      setProfile((prev) => {
        if ((currency === 'diamonds' ? prev.diamonds : prev.gold) < cost) return prev;

        let nextDiamonds = prev.diamonds - (currency === 'diamonds' ? cost : 0);
        let nextGold = prev.gold - (currency === 'gold' ? cost : 0);
        let nextTokens = prev.ffTokens;
        const skins = [...prev.unlockedSkins];
        const chutes = [...prev.unlockedParachutes];
        const gloos = [...prev.unlockedGlooWalls];
        const wSkins = [...(prev.unlockedWeaponSkins || DEFAULT_UNLOCKED_WEAPON_SKINS)];
        const emotes = [...(prev.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES)];
        const eqEmotes = [...(prev.equippedEmotes || DEFAULT_EQUIPPED_EMOTES)];
        const equippedWSkins = { ...DEFAULT_EQUIPPED_WEAPON_SKINS, ...prev.equippedWeaponSkins };
        let nextSelectedSkin = prev.selectedSkinId;
        let nextSelectedChute = prev.selectedParachuteId;
        let nextSelectedGloo = prev.selectedGlooId;

        outcomes.forEach(({ prize, isDuplicate, convertedTokens }) => {
          if (isDuplicate) {
            nextTokens += convertedTokens;
            return;
          }
          if (prize.kind === 'skin' && prize.refId && !skins.includes(prize.refId)) {
            skins.push(prize.refId);
            nextSelectedSkin = prize.refId;
          } else if (prize.kind === 'weaponSkin' && prize.refId) {
            if (!wSkins.includes(prize.refId)) wSkins.push(prize.refId);
            if (prize.weaponId) equippedWSkins[prize.weaponId] = prize.refId;
          } else if (prize.kind === 'parachute' && prize.refId && !chutes.includes(prize.refId)) {
            chutes.push(prize.refId);
            nextSelectedChute = prize.refId;
          } else if (prize.kind === 'gloo' && prize.refId && !gloos.includes(prize.refId)) {
            gloos.push(prize.refId);
            nextSelectedGloo = prize.refId;
          } else if (prize.kind === 'emote' && prize.refId && !emotes.includes(prize.refId)) {
            emotes.push(prize.refId);
            if (!eqEmotes.includes(prize.refId) && eqEmotes.length < 8) {
              eqEmotes.push(prize.refId);
            }
          } else if (prize.kind === 'diamonds') {
            nextDiamonds += prize.amount || 0;
          } else if (prize.kind === 'gold') {
            nextGold += prize.amount || 0;
          } else if (prize.kind === 'tokens') {
            nextTokens += prize.amount || 0;
          }
        });

        return {
          ...prev,
          diamonds: nextDiamonds,
          gold: nextGold,
          ffTokens: nextTokens,
          luckDiamond: bannerId === 'diamond' ? nextLuck : prev.luckDiamond,
          luckWeapon: bannerId === 'weapon' ? nextLuck : prev.luckWeapon,
          luckEmote: bannerId === 'emote' ? nextLuck : prev.luckEmote,
          luckFaded: bannerId === 'faded' ? nextLuck : prev.luckFaded,
          luckGold: bannerId === 'gold' ? nextLuck : prev.luckGold,
          luckIncubator: bannerId === 'incubator' ? nextLuck : prev.luckIncubator,
          unlockedSkins: skins,
          unlockedParachutes: chutes,
          unlockedGlooWalls: gloos,
          unlockedWeaponSkins: wSkins,
          unlockedEmotes: emotes,
          equippedEmotes: eqEmotes,
          equippedWeaponSkins: equippedWSkins,
          selectedSkinId: nextSelectedSkin,
          selectedParachuteId: nextSelectedChute,
          selectedGlooId: nextSelectedGloo,
        };
      });
    },
    []
  );

  const handlePurchaseBundle = useCallback((bundle: StoreBundle) => {
    setProfile((prev) => {
      if (prev.diamonds < bundle.diamondPrice) return prev;
      const unlockedSkins =
        bundle.skinId && !prev.unlockedSkins.includes(bundle.skinId)
          ? [...prev.unlockedSkins, bundle.skinId]
          : prev.unlockedSkins;
      const prevWSkins = prev.unlockedWeaponSkins || DEFAULT_UNLOCKED_WEAPON_SKINS;
      const unlockedWeaponSkins =
        bundle.weaponSkinId && !prevWSkins.includes(bundle.weaponSkinId)
          ? [...prevWSkins, bundle.weaponSkinId]
          : prevWSkins;
      const unlockedParachutes =
        bundle.parachuteId && !prev.unlockedParachutes.includes(bundle.parachuteId)
          ? [...prev.unlockedParachutes, bundle.parachuteId]
          : prev.unlockedParachutes;
      const unlockedGlooWalls =
        bundle.glooId && !prev.unlockedGlooWalls.includes(bundle.glooId)
          ? [...prev.unlockedGlooWalls, bundle.glooId]
          : prev.unlockedGlooWalls;
      const prevEmotes = prev.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES;
      const unlockedEmotes =
        bundle.emoteId && !prevEmotes.includes(bundle.emoteId)
          ? [...prevEmotes, bundle.emoteId]
          : prevEmotes;
      const prevEqEmotes = prev.equippedEmotes || DEFAULT_EQUIPPED_EMOTES;
      const equippedEmotes =
        bundle.emoteId && !prevEqEmotes.includes(bundle.emoteId) && prevEqEmotes.length < 8
          ? [...prevEqEmotes, bundle.emoteId]
          : prevEqEmotes;
      const equippedWeaponSkins = { ...DEFAULT_EQUIPPED_WEAPON_SKINS, ...prev.equippedWeaponSkins };
      if (bundle.weaponId && bundle.weaponSkinId) {
        equippedWeaponSkins[bundle.weaponId] = bundle.weaponSkinId;
      }
      return {
        ...prev,
        diamonds: prev.diamonds - bundle.diamondPrice,
        unlockedSkins,
        unlockedWeaponSkins,
        unlockedParachutes,
        unlockedGlooWalls,
        unlockedEmotes,
        equippedEmotes,
        equippedWeaponSkins,
        selectedSkinId: bundle.skinId || prev.selectedSkinId,
        selectedParachuteId: bundle.parachuteId || prev.selectedParachuteId,
        selectedGlooId: bundle.glooId || prev.selectedGlooId,
      };
    });
  }, []);

  const handleRedeemTokenItem = useCallback((item: StoreTokenItem) => {
    setProfile((prev) => {
      if (prev.ffTokens < item.tokenCost) return prev;
      let nextGold = prev.gold;
      const unlockedSkins = [...prev.unlockedSkins];
      const unlockedParachutes = [...prev.unlockedParachutes];
      const unlockedGlooWalls = [...prev.unlockedGlooWalls];
      const unlockedWeaponSkins = [...(prev.unlockedWeaponSkins || DEFAULT_UNLOCKED_WEAPON_SKINS)];
      const unlockedEmotes = [...(prev.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES)];
      const equippedEmotes = [...(prev.equippedEmotes || DEFAULT_EQUIPPED_EMOTES)];
      const equippedWeaponSkins = { ...DEFAULT_EQUIPPED_WEAPON_SKINS, ...prev.equippedWeaponSkins };
      let selectedSkinId = prev.selectedSkinId;
      let selectedParachuteId = prev.selectedParachuteId;
      let selectedGlooId = prev.selectedGlooId;

      if (item.kind === 'gold') {
        nextGold += item.amount || 0;
      } else if (item.kind === 'skin' && item.refId) {
        if (unlockedSkins.includes(item.refId)) return prev;
        unlockedSkins.push(item.refId);
        selectedSkinId = item.refId;
      } else if (item.kind === 'weaponSkin' && item.refId) {
        if (unlockedWeaponSkins.includes(item.refId)) return prev;
        unlockedWeaponSkins.push(item.refId);
        if (item.weaponId) equippedWeaponSkins[item.weaponId] = item.refId;
      } else if (item.kind === 'parachute' && item.refId) {
        if (unlockedParachutes.includes(item.refId)) return prev;
        unlockedParachutes.push(item.refId);
        selectedParachuteId = item.refId;
      } else if (item.kind === 'gloo' && item.refId) {
        if (unlockedGlooWalls.includes(item.refId)) return prev;
        unlockedGlooWalls.push(item.refId);
        selectedGlooId = item.refId;
      } else if (item.kind === 'emote' && item.refId) {
        if (unlockedEmotes.includes(item.refId)) return prev;
        unlockedEmotes.push(item.refId);
        if (!equippedEmotes.includes(item.refId) && equippedEmotes.length < 8) {
          equippedEmotes.push(item.refId);
        }
      }

      return {
        ...prev,
        ffTokens: prev.ffTokens - item.tokenCost,
        gold: nextGold,
        unlockedSkins,
        unlockedParachutes,
        unlockedGlooWalls,
        unlockedWeaponSkins,
        unlockedEmotes,
        equippedEmotes,
        equippedWeaponSkins,
        selectedSkinId,
        selectedParachuteId,
        selectedGlooId,
      };
    });
  }, []);

  const handleUnlockSkin = useCallback((skinId: string, price: number) => {
    setProfile((prev) => {
      if (prev.unlockedSkins.includes(skinId) || prev.diamonds < price) return prev;
      return {
        ...prev,
        diamonds: prev.diamonds - price,
        unlockedSkins: [...prev.unlockedSkins, skinId],
        selectedSkinId: skinId,
      };
    });
  }, []);

  const handleRefreshDailyMissions = useCallback(() => {
    const scopeKey = authUidRef.current || 'guest';
    setDailyMissions((prev) => {
      const next = ensureFreshDailyMissions(prev);
      if (next !== prev) saveDailyMissions(scopeKey, next);
      return next;
    });
  }, []);

  const handleClaimDailyMission = useCallback((missionId: string) => {
    const scopeKey = authUidRef.current || 'guest';
    const fresh = ensureFreshDailyMissions(dailyMissionsRef.current);
    if (fresh !== dailyMissionsRef.current) {
      saveDailyMissions(scopeKey, fresh);
      setDailyMissions(fresh);
      return;
    }
    const target = fresh.missions.find(
      (m) => m.id === missionId && m.progress >= m.target && !m.claimed
    );
    if (!target) return;
    const nextState: DailyMissionsState = {
      ...fresh,
      missions: fresh.missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
    };
    saveDailyMissions(scopeKey, nextState);
    setDailyMissions(nextState);
    setProfile((prev) => ({
      ...prev,
      gold: prev.gold + target.rewardGold,
    }));
  }, []);

  const handleClaimAllDailyMissions = useCallback(() => {
    const scopeKey = authUidRef.current || 'guest';
    const fresh = ensureFreshDailyMissions(dailyMissionsRef.current);
    if (fresh !== dailyMissionsRef.current) {
      saveDailyMissions(scopeKey, fresh);
      setDailyMissions(fresh);
      return;
    }
    const ready = fresh.missions.filter((m) => m.progress >= m.target && !m.claimed);
    if (ready.length === 0) return;
    const goldToAward = ready.reduce((sum, m) => sum + m.rewardGold, 0);
    const nextState: DailyMissionsState = {
      ...fresh,
      missions: fresh.missions.map((m) =>
        m.progress >= m.target ? { ...m, claimed: true } : m
      ),
    };
    saveDailyMissions(scopeKey, nextState);
    setDailyMissions(nextState);
    setProfile((prev) => ({
      ...prev,
      gold: prev.gold + goldToAward,
    }));
  }, []);

  const handleUnlockParachute = useCallback((id: string, price: number) => {
    setProfile((prev) => {
      if (prev.unlockedParachutes.includes(id) || prev.diamonds < price) return prev;
      return {
        ...prev,
        diamonds: prev.diamonds - price,
        unlockedParachutes: [...prev.unlockedParachutes, id],
        selectedParachuteId: id,
      };
    });
  }, []);

  const handleUnlockGloo = useCallback((id: string, price: number) => {
    setProfile((prev) => {
      if (prev.unlockedGlooWalls.includes(id) || prev.diamonds < price) return prev;
      return {
        ...prev,
        diamonds: prev.diamonds - price,
        unlockedGlooWalls: [...prev.unlockedGlooWalls, id],
        selectedGlooId: id,
      };
    });
  }, []);

  const handleUnlockEmote = useCallback((emoteId: string, price: number) => {
    setProfile((prev) => {
      const unlocked = prev.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES;
      if (unlocked.includes(emoteId) || prev.diamonds < price) return prev;
      const equipped = prev.equippedEmotes || DEFAULT_EQUIPPED_EMOTES;
      const nextEquipped = equipped.includes(emoteId)
        ? equipped
        : equipped.length < 8
        ? [...equipped, emoteId]
        : [...equipped.slice(1), emoteId];
      return {
        ...prev,
        diamonds: prev.diamonds - price,
        unlockedEmotes: [...unlocked, emoteId],
        equippedEmotes: nextEquipped,
      };
    });
  }, []);

  const handleToggleEquipEmote = useCallback((emoteId: string) => {
    setProfile((prev) => {
      const unlocked = prev.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES;
      if (!unlocked.includes(emoteId)) return prev;
      const equipped = prev.equippedEmotes || DEFAULT_EQUIPPED_EMOTES;
      if (equipped.includes(emoteId)) {
        if (equipped.length <= 1) return prev;
        return {
          ...prev,
          equippedEmotes: equipped.filter((id) => id !== emoteId),
        };
      }
      const nextEquipped =
        equipped.length >= 8 ? [...equipped.slice(1), emoteId] : [...equipped, emoteId];
      return {
        ...prev,
        equippedEmotes: nextEquipped,
      };
    });
  }, []);

  const handleSelectWeaponSkin = useCallback((weaponId: WeaponId, skinId: string) => {
    setProfile((prev) => ({
      ...prev,
      equippedWeaponSkins: {
        ...DEFAULT_EQUIPPED_WEAPON_SKINS,
        ...prev.equippedWeaponSkins,
        [weaponId]: skinId,
      },
    }));
  }, []);

  const handleUnlockWeaponSkin = useCallback((skinId: string, weaponId: WeaponId, price: number) => {
    setProfile((prev) => {
      const unlocked = prev.unlockedWeaponSkins || DEFAULT_UNLOCKED_WEAPON_SKINS;
      if (unlocked.includes(skinId) || prev.diamonds < price) return prev;
      return {
        ...prev,
        diamonds: prev.diamonds - price,
        unlockedWeaponSkins: [...unlocked, skinId],
        equippedWeaponSkins: {
          ...DEFAULT_EQUIPPED_WEAPON_SKINS,
          ...prev.equippedWeaponSkins,
          [weaponId]: skinId,
        },
      };
    });
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
      setCloudStatus('Sign-In Cancelled');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleGoogleSignOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOutAccount();
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const friends: FriendRecord[] = useMemo(() => {
    const merged = new Map<string, FriendRecord>();
    for (const f of localFriends) {
      const key = f.uid ? `uid:${f.uid}` : `name:${f.name.trim().toLowerCase()}`;
      merged.set(key, f);
    }
    for (const f of cloudFriends) {
      const key = f.uid ? `uid:${f.uid}` : `name:${f.name.trim().toLowerCase()}`;
      merged.set(key, f);
    }
    return Array.from(merged.values());
  }, [localFriends, cloudFriends]);

  const friendRequests: FriendRequestRecord[] = useMemo(() => {
    const merged = new Map<string, FriendRequestRecord>();
    for (const r of wsFriendRequests) {
      if (r.status === 'pending') merged.set(r.fromUid, r);
    }
    for (const r of cloudFriendRequests) {
      if (r.status === 'pending') merged.set(r.fromUid, r);
    }
    return Array.from(merged.values()).filter(
      (r) =>
        !friends.some(
          (f) =>
            (f.uid && f.uid === r.fromUid) ||
            f.name.trim().toLowerCase() === r.fromName.trim().toLowerCase()
        )
    );
  }, [wsFriendRequests, cloudFriendRequests, friends]);

  const onlineFriendsCount = useMemo(() => {
    return friends.filter((f) => {
      if (f.uid && onlinePlayers.some((p) => p.uid && p.uid === f.uid)) return true;
      const lower = f.name.trim().toLowerCase();
      return onlinePlayers.some((p) => p.name.trim().toLowerCase() === lower);
    }).length;
  }, [friends, onlinePlayers]);

  const handleSendFriendRequest = useCallback(
    (target: {
      id: string;
      uid: string | null;
      playerId: string | null;
      name: string;
      skinId: string;
      level: number;
      rankPoints: number;
    }) => {
      const mySenderUid = authUid || `guest_${getGameUid(null, profile.name)}`;
      if (authUid && target.uid && target.uid !== authUid) {
        sendCloudFriendRequest(
          target.uid,
          {
            uid: authUid,
            name: profile.name,
            skinId: profile.selectedSkinId,
            level: profile.level,
            rankPoints: profile.rankPoints,
          },
          'pending'
        ).catch((err) => console.error('Cloud friend request error:', err));
      }
      sendWs({
        type: 'friend:request',
        targetPlayerId: target.playerId,
        targetUid: target.uid,
        targetName: target.name,
        fromUid: mySenderUid,
        fromName: profile.name,
        fromSkinId: profile.selectedSkinId,
        fromLevel: profile.level,
        fromRankPoints: profile.rankPoints,
      });
      setInviteNotice({ ok: true, text: `Friend Request sent to ${target.name}` });
    },
    [authUid, profile.name, profile.selectedSkinId, profile.level, profile.rankPoints, sendWs]
  );

  const handleRespondFriendRequest = useCallback(
    (req: FriendRequestRecord, accept: boolean) => {
      setWsFriendRequests((prev) => prev.filter((r) => r.fromUid !== req.fromUid));
      if (authUid && req.fromUid) {
        deleteCloudFriendRequest(authUid, req.fromUid).catch(() => undefined);
      }
      if (!accept) return;

      const isCloudUid = Boolean(req.fromUid && !req.fromUid.startsWith('guest_'));
      const record: FriendRecord = {
        id: req.fromUid,
        uid: isCloudUid ? req.fromUid : null,
        name: req.fromName,
        skinId: req.fromSkinId,
        level: req.fromLevel,
        rankPoints: req.fromRankPoints,
        addedAt: Date.now(),
      };
      setLocalFriends((prev) => [
        record,
        ...prev.filter(
          (f) =>
            f.id !== record.id &&
            f.name.trim().toLowerCase() !== record.name.trim().toLowerCase()
        ),
      ]);
      if (authUid && isCloudUid && req.fromUid !== authUid) {
        addCloudFriend(authUid, {
          uid: req.fromUid,
          name: req.fromName,
          skinId: req.fromSkinId,
          level: req.fromLevel,
          rankPoints: req.fromRankPoints,
        }).catch((err) => console.error('Cloud addFriend error:', err));

        sendCloudFriendRequest(
          req.fromUid,
          {
            uid: authUid,
            name: profile.name,
            skinId: profile.selectedSkinId,
            level: profile.level,
            rankPoints: profile.rankPoints,
          },
          'accepted'
        ).catch(() => undefined);
      }

      sendWs({
        type: 'friend:accept',
        targetUid: req.fromUid,
        targetName: req.fromName,
        fromUid: authUid || `guest_${getGameUid(null, profile.name)}`,
        fromName: profile.name,
        fromSkinId: profile.selectedSkinId,
        fromLevel: profile.level,
        fromRankPoints: profile.rankPoints,
      });
    },
    [authUid, profile.name, profile.selectedSkinId, profile.level, profile.rankPoints, sendWs]
  );

  const handleRemoveFriend = useCallback(
    (friendId: string) => {
      const target = friends.find((f) => f.id === friendId);
      setLocalFriends((prev) => prev.filter((f) => f.id !== friendId));
      if (authUid && target?.uid) {
        removeCloudFriend(authUid, target.uid).catch((err) =>
          console.error('Cloud removeFriend error:', err)
        );
      }
    },
    [authUid, friends]
  );

  const handleInviteFriend = useCallback(
    (target: { playerId: string | null; uid: string | null; name: string }) => {
      sendWs({
        type: 'squad:invite',
        targetPlayerId: target.playerId,
        targetUid: target.uid,
        targetName: target.name,
        mapId,
        mode,
        fromName: profile.name,
        fromSkinId: profile.selectedSkinId,
        fromParachuteId: profile.selectedParachuteId,
      });
    },
    [sendWs, mapId, mode, profile.name, profile.selectedSkinId, profile.selectedParachuteId]
  );

  const handleAcceptInvite = useCallback(
    (invite: SquadInvite) => {
      setIncomingInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
      sendWs({
        type: 'room:join',
        roomCode: invite.roomCode,
        name: profile.name,
        skinId: profile.selectedSkinId,
        parachuteId: profile.selectedParachuteId,
      });
      sendWs({
        type: 'squad:invite_reply',
        fromPlayerId: invite.fromPlayerId,
        roomCode: invite.roomCode,
        accepted: true,
      });
      setShowFriends(false);
      setMultiplayerTab('rooms');
      setShowMultiplayer(true);
    },
    [sendWs, profile.name, profile.selectedSkinId, profile.selectedParachuteId]
  );

  const handleDeclineInvite = useCallback(
    (invite: SquadInvite) => {
      setIncomingInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
      sendWs({
        type: 'squad:invite_reply',
        fromPlayerId: invite.fromPlayerId,
        roomCode: invite.roomCode,
        accepted: false,
      });
    },
    [sendWs]
  );

  // Enter shortcut to drop from Lobby when no modal is open
  useEffect(() => {
    if (
      inMatch ||
      showControls ||
      showTopUp ||
      showStore ||
      showLuckRoyale ||
      showMultiplayer ||
      showFriends ||
      showMissions
    )
      return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        soundEngine.playClick();
        if (currentRoom) {
          const isHost = Boolean(
            currentRoom.players.find((p) => p.id === localPlayerIdRef.current)?.isHost
          );
          if (isHost) {
            sendWs({ type: 'room:start' });
          } else {
            sendWs({ type: 'room:ready', ready: true });
            setInviteNotice({ ok: true, text: 'Ready! Waiting for squad host to start.' });
          }
        } else {
          startSoloMatch();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    inMatch,
    showControls,
    showTopUp,
    showStore,
    showLuckRoyale,
    showMultiplayer,
    showFriends,
    showMissions,
    currentRoom,
    sendWs,
    startSoloMatch,
  ]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0e13]">
      {/* Isolated WebGL Viewport Container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Lobby Overlay */}
      {!inMatch && (
        <LobbyView
          profile={profile}
          activeTab={lobbyTab}
          mapId={mapId}
          mode={mode}
          muted={muted}
          authUid={authUid}
          currentRoomCode={currentRoom?.roomCode || null}
          currentRoomCount={currentRoom?.playerCount || 0}
          onlineFriendsCount={onlineFriendsCount}
          pendingFriendRequestCount={friendRequests.length}
          friends={friends}
          onlinePlayers={onlinePlayers}
          incomingInvites={incomingInvites}
          claimableMissionsCount={
            dailyMissions.missions.filter((m) => m.progress >= m.target && !m.claimed).length
          }
          victoryCelebrationActive={victoryCelebrationActive}
          onReplayVictoryFireworks={() => {
            lobbyRef.current?.triggerVictoryFireworks(8.5);
            setVictoryCelebrationActive(true);
            if (victoryBannerTimerRef.current !== null) {
              window.clearTimeout(victoryBannerTimerRef.current);
            }
            victoryBannerTimerRef.current = window.setTimeout(() => {
              setVictoryCelebrationActive(false);
              victoryBannerTimerRef.current = null;
            }, 8500);
          }}
          onChangeTab={setLobbyTab}
          onPreviewSkin={setPreviewSkinId}
          onSelectSkin={(selectedSkinId) => setProfile((p) => ({ ...p, selectedSkinId }))}
          onUnlockSkin={handleUnlockSkin}
          onSelectWeapon={(selectedLobbyWeapon: WeaponId) =>
            setProfile((p) => ({ ...p, selectedLobbyWeapon }))
          }
          previewWeaponSkinId={previewWeaponSkinId}
          onPreviewWeaponSkin={setPreviewWeaponSkinId}
          onSelectWeaponSkin={handleSelectWeaponSkin}
          onUnlockWeaponSkin={handleUnlockWeaponSkin}
          onSelectParachute={(selectedParachuteId) =>
            setProfile((p) => ({ ...p, selectedParachuteId }))
          }
          onUnlockParachute={handleUnlockParachute}
          onSelectGloo={(selectedGlooId) => setProfile((p) => ({ ...p, selectedGlooId }))}
          onUnlockGloo={handleUnlockGloo}
          onPlayLobbyEmote={(emoteId) => lobbyRef.current?.playEmote(emoteId)}
          onUnlockEmote={handleUnlockEmote}
          onToggleEquipEmote={handleToggleEquipEmote}
          onQuickInviteFriend={handleInviteFriend}
          onOpenTopUp={() => setShowTopUp(true)}
          onOpenStore={() => {
            setStoreInitialTab('bundles');
            setShowStore(true);
          }}
          onOpenLuckRoyale={() => setShowLuckRoyale(true)}
          onOpenMissions={() => {
            handleRefreshDailyMissions();
            setShowMissions(true);
          }}
          onOpenMultiplayer={(tab = 'rooms') => {
            setMultiplayerTab(tab);
            setShowMultiplayer(true);
            sendWs({ type: 'room:list' });
          }}
          onOpenFriends={() => {
            setShowFriends(true);
            sendWs({ type: 'presence:list' });
          }}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
          onChangeMap={(nextMap) => {
            setMapId(nextMap);
          }}
          onChangeMode={(nextMode) => {
            setMode(nextMode);
          }}
          onOpenControls={() => setShowControls(true)}
          onChangeName={(name) => setProfile((p) => ({ ...p, name }))}
          onToggleMute={toggleMute}
          onStartMatch={() => {
            setShowControls(false);
            setShowTopUp(false);
            setShowStore(false);
            setShowLuckRoyale(false);
            setShowMultiplayer(false);
            setShowFriends(false);
            setShowMissions(false);
            if (currentRoom) {
              const isHost = Boolean(
                currentRoom.players.find((p) => p.id === localPlayerIdRef.current)?.isHost
              );
              if (isHost) {
                sendWs({ type: 'room:start' });
              } else {
                sendWs({ type: 'room:ready', ready: true });
                setInviteNotice({ ok: true, text: 'Ready! Waiting for squad host to start.' });
              }
            } else {
              startSoloMatch();
            }
          }}
        />
      )}

      {/* Free Fire 3D Controls, Sensitivity & Custom HUD Modal */}
      {!inMatch && showControls && (
        <ControlsCustomizerModal
          settings={controlSettings}
          onChange={handleChangeControlSettings}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* Diamond Top-Up Modal */}
      {!inMatch && showTopUp && (
        <TopUpModal
          profile={profile}
          authUid={authUid}
          authEmail={authEmail}
          transactions={topUpTransactions}
          isMerchantAdmin={isMerchantAdmin}
          adminPendingTopUps={adminPendingTopUps}
          onClose={() => setShowTopUp(false)}
          onVerifiedTopUp={handleVerifiedTopUp}
          onPendingTopUpSubmitted={handlePendingTopUpSubmitted}
          onAdminResolveTopUp={handleAdminResolveTopUp}
          onClaimMilestone={handleClaimMilestone}
          onExchangeGold={handleExchangeGold}
        />
      )}

      {/* Free Fire Store & FF Token Exchange Modal */}
      {!inMatch && showStore && (
        <StoreModal
          profile={profile}
          initialTab={storeInitialTab}
          onClose={() => setShowStore(false)}
          onOpenTopUp={() => {
            setShowStore(false);
            setShowTopUp(true);
          }}
          onOpenLuckRoyale={() => {
            setShowStore(false);
            setShowLuckRoyale(true);
          }}
          onPurchaseBundle={handlePurchaseBundle}
          onUnlockSkin={handleUnlockSkin}
          onSelectSkin={(selectedSkinId) => setProfile((p) => ({ ...p, selectedSkinId }))}
          onUnlockWeaponSkin={handleUnlockWeaponSkin}
          onSelectWeaponSkin={handleSelectWeaponSkin}
          onUnlockParachute={handleUnlockParachute}
          onSelectParachute={(selectedParachuteId) =>
            setProfile((p) => ({ ...p, selectedParachuteId }))
          }
          onUnlockGloo={handleUnlockGloo}
          onSelectGloo={(selectedGlooId) => setProfile((p) => ({ ...p, selectedGlooId }))}
          onUnlockEmote={handleUnlockEmote}
          onToggleEquipEmote={handleToggleEquipEmote}
          onRedeemTokenItem={handleRedeemTokenItem}
        />
      )}

      {/* Luck Royale Modal */}
      {!inMatch && showLuckRoyale && (
        <LuckRoyaleModal
          profile={profile}
          onClose={() => setShowLuckRoyale(false)}
          onOpenTopUp={() => {
            setShowLuckRoyale(false);
            setShowTopUp(true);
          }}
          onOpenStoreTokens={() => {
            setShowLuckRoyale(false);
            setStoreInitialTab('tokens');
            setShowStore(true);
          }}
          onCommitSpin={handleCommitSpin}
        />
      )}

      {/* Friends List, Player Search & Direct Squad Invites Modal */}
      {!inMatch && showFriends && (
        <FriendsModal
          profile={profile}
          authUid={authUid}
          localPlayerId={localPlayerId}
          wsConnected={wsConnected}
          friends={friends}
          friendRequests={friendRequests}
          onlinePlayers={onlinePlayers}
          currentRoom={currentRoom}
          inviteNotice={inviteNotice}
          onClose={() => setShowFriends(false)}
          onGoogleSignIn={handleGoogleSignIn}
          onSendFriendRequest={handleSendFriendRequest}
          onRespondFriendRequest={handleRespondFriendRequest}
          onRemoveFriend={handleRemoveFriend}
          onInviteFriend={handleInviteFriend}
          onOpenRoom={() => {
            setShowFriends(false);
            setMultiplayerTab('rooms');
            setShowMultiplayer(true);
          }}
        />
      )}

      {/* Multiplayer Squad Rooms & Cloud Leaderboard Modal */}
      {!inMatch && showMultiplayer && (
        <MultiplayerModal
          profile={profile}
          authUid={authUid}
          authEmail={authEmail}
          authBusy={authBusy}
          cloudStatus={cloudStatus}
          leaderboard={leaderboard}
          wsConnected={wsConnected}
          localPlayerId={localPlayerId}
          currentRoom={currentRoom}
          openRooms={openRooms}
          roomError={roomError}
          friends={friends}
          onlinePlayers={onlinePlayers}
          inviteNotice={inviteNotice}
          initialTab={multiplayerTab}
          onClose={() => setShowMultiplayer(false)}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onCreateRoom={(mId, md) =>
            sendWs({
              type: 'room:create',
              name: profile.name,
              skinId: profile.selectedSkinId,
              parachuteId: profile.selectedParachuteId,
              mapId: mId,
              mode: md,
            })
          }
          onJoinRoom={(code) =>
            sendWs({
              type: 'room:join',
              roomCode: code,
              name: profile.name,
              skinId: profile.selectedSkinId,
              parachuteId: profile.selectedParachuteId,
            })
          }
          onLeaveRoom={() => sendWs({ type: 'room:leave' })}
          onToggleReady={(ready) => sendWs({ type: 'room:ready', ready })}
          onUpdateRoomConfig={(mId, md) => sendWs({ type: 'room:config', mapId: mId, mode: md })}
          onStartRoomMatch={() => sendWs({ type: 'room:start' })}
          onRefreshRooms={() => sendWs({ type: 'room:list' })}
          onInviteFriend={handleInviteFriend}
          onOpenFriends={() => {
            setShowMultiplayer(false);
            setShowFriends(true);
            sendWs({ type: 'presence:list' });
          }}
        />
      )}

      {/* Daily Missions Modal */}
      {!inMatch && showMissions && (
        <DailyMissionsModal
          state={dailyMissions}
          currentGold={profile.gold}
          onClaimMission={handleClaimDailyMission}
          onClaimAll={handleClaimAllDailyMissions}
          onRefreshIfExpired={handleRefreshDailyMissions}
          onClose={() => setShowMissions(false)}
        />
      )}

      {/* Match Starting & Loading Screen Overlay (while 3D island initializes) */}
      {inMatch && showMatchLoading && (
        <MatchLoadingScreen
          mapId={mapId}
          mode={mode}
          profile={profile}
          roster={activeMpSessionRef.current?.roster || []}
          localPlayerId={localPlayerId || activeMpSessionRef.current?.localPlayerId || ''}
          roomCode={activeMpSessionRef.current?.roomCode}
          onComplete={handleMatchLoadingComplete}
        />
      )}

      {/* Active Match HUD Overlay */}
      {inMatch && hud && !showMatchLoading && (
        <GameHUD
          hud={hud}
          skinId={profile.selectedSkinId}
          playerName={profile.name}
          localPlayerId={localPlayerId}
          muted={muted}
          equippedEmotes={profile.equippedEmotes || DEFAULT_EQUIPPED_EMOTES}
          controlSettings={controlSettings}
          onChangeControlSettings={handleChangeControlSettings}
          onToggleMute={toggleMute}
          sendVoiceSignal={sendWs}
          registerVoiceSignalHandler={registerVoiceSignalHandler}
          onEject={() => engineRef.current?.ejectFromPlane()}
          onDeployParachute={() => engineRef.current?.deployParachute()}
          onSwitchSlot={(idx) => engineRef.current?.switchSlot(idx)}
          onReload={() => engineRef.current?.startReload()}
          onHeal={() => engineRef.current?.startHeal()}
          onGloo={() => engineRef.current?.deployGlooWall()}
          onSkill={() => engineRef.current?.activateSkill()}
          onLoot={() => engineRef.current?.interactLoot()}
          onTriggerEmote={(emoteId) => engineRef.current?.triggerEmote(emoteId)}
          onEmoteWheelOpenChange={(open) => engineRef.current?.setEmoteWheelOpen(open)}
          onEnterVehicle={(seat) => engineRef.current?.enterNearestVehicle(seat)}
          onExitVehicle={() => engineRef.current?.exitVehicle()}
          onSwitchSeat={() => engineRef.current?.switchVehicleSeat()}
          onHorn={() => engineRef.current?.honkVehicle()}
          onVehicleTouch={(throttle, steer, nitro) =>
            engineRef.current?.setVehicleTouchControls(throttle, steer, nitro)
          }
          onPause={() => engineRef.current?.setPaused(true)}
          onResume={() => engineRef.current?.setPaused(false)}
          onSkipSpectate={() => engineRef.current?.skipSpectate()}
          onPlayAgain={() => {
            if (activeMpSessionRef.current && !isAutoMatchSessionRef.current) {
              returnToLobby();
            } else {
              if (activeMpSessionRef.current) {
                sendWs({ type: 'room:leave' });
                setCurrentRoom(null);
                activeMpSessionRef.current = null;
                isAutoMatchSessionRef.current = false;
              }
              startSoloMatch();
            }
          }}
          onReturnLobby={returnToLobby}
          onTouchMove={(dx, dy, sprintLocked) =>
            engineRef.current?.setTouchJoystick(dx, dy, sprintLocked)
          }
          onTouchFire={(firing) => engineRef.current?.setTouchFire(firing)}
          onTouchAimDelta={(dx, dy, mode) =>
            engineRef.current?.addTouchAimDelta(dx, dy, mode)
          }
          onFreeLookChange={(active) => engineRef.current?.setFreeLookActive(active)}
          onToggleAds={() => engineRef.current?.toggleAds()}
          onJump={() => engineRef.current?.triggerJump()}
          onCrouch={() => engineRef.current?.toggleCrouch()}
          onProne={() => engineRef.current?.toggleProne()}
        />
      )}
    </div>
  );
}
