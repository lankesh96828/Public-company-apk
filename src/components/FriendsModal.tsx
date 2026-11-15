import React, { useEffect, useMemo, useState } from 'react';
import {
  CHARACTER_SKINS,
  FriendRecord,
  FriendRequestRecord,
  getGameUid,
  getRankTier,
  MultiplayerRoomInfo,
  OnlinePlayerPresence,
  OnlineStatus,
  PlayerProfile,
  PlayerSearchResult,
} from '../game/types';
import { searchCloudPlayers } from '../firebase';
import { soundEngine } from '../game/audio';
import {
  Check,
  Cloud,
  Copy,
  Radio,
  Search,
  Send,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface FriendsModalProps {
  profile: PlayerProfile;
  authUid: string | null;
  localPlayerId: string | null;
  wsConnected: boolean;
  friends: FriendRecord[];
  friendRequests: FriendRequestRecord[];
  onlinePlayers: OnlinePlayerPresence[];
  currentRoom: MultiplayerRoomInfo | null;
  inviteNotice: { ok: boolean; text: string } | null;
  onClose: () => void;
  onGoogleSignIn: () => void;
  onSendFriendRequest: (player: {
    id: string;
    uid: string | null;
    playerId: string | null;
    name: string;
    skinId: string;
    level: number;
    rankPoints: number;
  }) => void;
  onRespondFriendRequest: (req: FriendRequestRecord, accept: boolean) => void;
  onRemoveFriend: (friendId: string) => void;
  onInviteFriend: (target: {
    playerId: string | null;
    uid: string | null;
    name: string;
  }) => void;
  onOpenRoom: () => void;
}

type SocialTab = 'friends' | 'requests' | 'find' | 'live';

function getStatusDisplay(status: OnlineStatus, roomCode: string | null) {
  if (status === 'online') {
    return {
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
      textClass: 'text-emerald-400',
      label: 'ONLINE · LOBBY',
    };
  }
  if (status === 'in_squad') {
    return {
      dotClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
      textClass: 'text-sky-400',
      label: roomCode ? `IN SQUAD · ${roomCode}` : 'IN SQUAD',
    };
  }
  if (status === 'in_match') {
    return {
      dotClass: 'bg-amber-400',
      textClass: 'text-amber-400',
      label: 'IN MATCH',
    };
  }
  return {
    dotClass: 'bg-slate-600',
    textClass: 'text-slate-500',
    label: 'OFFLINE',
  };
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  profile,
  authUid,
  localPlayerId,
  wsConnected,
  friends,
  friendRequests,
  onlinePlayers,
  currentRoom,
  inviteNotice,
  onClose,
  onGoogleSignIn,
  onSendFriendRequest,
  onRespondFriendRequest,
  onRemoveFriend,
  onInviteFriend,
  onOpenRoom,
}) => {
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [copiedUid, setCopiedUid] = useState(false);
  const [cloudResults, setCloudResults] = useState<
    Array<{
      uid: string;
      name: string;
      skinId: string;
      level: number;
      rankPoints: number;
    }>
  >([]);
  const [searching, setSearching] = useState(false);

  const myGameUid = useMemo(() => getGameUid(authUid, profile.name), [authUid, profile.name]);

  const pendingRequests = useMemo(
    () => friendRequests.filter((r) => r.status === 'pending'),
    [friendRequests]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        // Fetch directory (pass empty to allow UID search locally too)
        const rows = await searchCloudPlayers('');
        if (!cancelled) {
          setCloudResults(
            rows.map((r) => ({
              uid: r.uid,
              name: r.name,
              skinId: r.selectedSkinId,
              level: r.level,
              rankPoints: r.rankPoints,
            }))
          );
        }
      } catch (err) {
        console.error('Player search error:', err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const resolvePresence = useMemo(() => {
    return (uid: string | null, name: string): OnlinePlayerPresence | null => {
      if (uid) {
        const byUid = onlinePlayers.find((p) => p.uid && p.uid === uid);
        if (byUid) return byUid;
      }
      const lower = name.trim().toLowerCase();
      return onlinePlayers.find((p) => p.name.trim().toLowerCase() === lower) || null;
    };
  }, [onlinePlayers]);

  const enrichedFriends = useMemo(() => {
    const rankOrder: Record<OnlineStatus, number> = {
      online: 0,
      in_squad: 1,
      in_match: 2,
      offline: 3,
    };
    return friends
      .map((f) => {
        const live = resolvePresence(f.uid, f.name);
        const status: OnlineStatus = live ? live.status : 'offline';
        return {
          friend: f,
          live,
          status,
          roomCode: live?.roomCode || null,
          skinId: live?.skinId || f.skinId,
          level: live?.level || f.level,
          rankPoints: live?.rankPoints ?? f.rankPoints,
          gameUid: getGameUid(f.uid, f.name),
        };
      })
      .sort((a, b) => rankOrder[a.status] - rankOrder[b.status] || b.rankPoints - a.rankPoints);
  }, [friends, resolvePresence]);

  const onlineFriendCount = enrichedFriends.filter((e) => e.status !== 'offline').length;

  const searchResults: PlayerSearchResult[] = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const map = new Map<string, PlayerSearchResult>();

    for (const p of onlinePlayers) {
      if (p.playerId === localPlayerId) continue;
      if (authUid && p.uid && p.uid === authUid) continue;
      const gUid = getGameUid(p.uid, p.name);
      if (needle && !p.name.toLowerCase().includes(needle) && !gUid.includes(needle)) continue;
      const key = p.uid ? `uid:${p.uid}` : `name:${p.name.toLowerCase()}`;
      map.set(key, {
        id: p.uid || `live_${p.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`,
        uid: p.uid,
        playerId: p.playerId,
        name: p.name,
        skinId: p.skinId,
        level: p.level,
        rankPoints: p.rankPoints,
        status: p.status,
        roomCode: p.roomCode,
        source: 'live',
      });
    }

    for (const c of cloudResults) {
      if (authUid && c.uid === authUid) continue;
      const gUid = getGameUid(c.uid, c.name);
      if (needle && !c.name.toLowerCase().includes(needle) && !gUid.includes(needle)) continue;
      const keyByUid = `uid:${c.uid}`;
      const keyByName = `name:${c.name.toLowerCase()}`;
      const existing = map.get(keyByUid) || map.get(keyByName);
      if (existing) {
        existing.uid = c.uid;
        existing.id = c.uid;
        existing.rankPoints = Math.max(existing.rankPoints, c.rankPoints);
        existing.level = Math.max(existing.level, c.level);
      } else {
        const live = resolvePresence(c.uid, c.name);
        map.set(keyByUid, {
          id: c.uid,
          uid: c.uid,
          playerId: live?.playerId || null,
          name: c.name,
          skinId: live?.skinId || c.skinId,
          level: live?.level || c.level,
          rankPoints: live?.rankPoints ?? c.rankPoints,
          status: live ? live.status : 'offline',
          roomCode: live?.roomCode || null,
          source: 'cloud',
        });
      }
    }

    const order: Record<OnlineStatus, number> = {
      online: 0,
      in_squad: 1,
      in_match: 2,
      offline: 3,
    };
    return Array.from(map.values())
      .sort((a, b) => order[a.status] - order[b.status] || b.rankPoints - a.rankPoints)
      .slice(0, 40);
  }, [onlinePlayers, cloudResults, searchQuery, localPlayerId, authUid, resolvePresence]);

  const liveServerOthers = useMemo(
    () =>
      onlinePlayers.filter(
        (p) => p.playerId !== localPlayerId && !(authUid && p.uid && p.uid === authUid)
      ),
    [onlinePlayers, localPlayerId, authUid]
  );

  const isAlreadyFriend = (uid: string | null, id: string, name: string) =>
    friends.some(
      (f) =>
        (uid && f.uid === uid) ||
        f.id === id ||
        f.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(myGameUid);
      setCopiedUid(true);
      window.setTimeout(() => setCopiedUid(false), 1800);
    } catch {
      setCopiedUid(false);
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0e1218] shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#121720] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Users className="h-6 w-6 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-bold tracking-wider text-white leading-none">
                FREE FIRE SOCIAL &amp; FRIEND LIST
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                <span>
                  {onlineFriendCount} Online · {friends.length} Friends · {onlinePlayers.length} Live
                </span>
                <span className="text-white/15">|</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20"
                >
                  <span>MY UID: {myGameUid}</span>
                  {copiedUid ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentRoom && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenRoom();
                }}
                className="min-h-[40px] rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 font-mono-tabular"
              >
                SQUAD {currentRoom.roomCode} ({currentRoom.playerCount}/{currentRoom.maxPlayers})
              </button>
            )}
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              aria-label="Close Friends Modal"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#171d28] text-slate-300 hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cloud Sync / Feedback Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0b0f16] px-5 py-2.5 text-xs">
          {inviteNotice ? (
            <div className={`font-semibold ${inviteNotice.ok ? 'text-emerald-400' : 'text-amber-300'}`}>
              {inviteNotice.text}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Cloud className={`h-3.5 w-3.5 ${authUid ? 'text-emerald-400' : 'text-slate-500'}`} />
              {authUid ? (
                <span>
                  Synced to Cloud Firestore as <strong className="text-white">{profile.name}</strong>
                </span>
              ) : (
                <span>Sign in with Google to send &amp; receive persistent Friend Requests by UID</span>
              )}
            </div>
          )}

          {!authUid && (
            <button
              onClick={onGoogleSignIn}
              className="min-h-[34px] rounded bg-sky-500 px-3 py-1 text-[11px] font-bold text-slate-950 hover:bg-sky-400"
            >
              Sign In with Google
            </button>
          )}
        </div>

        {/* FF Tab Bar */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#10151d] px-5 py-2.5">
          {(
            [
              { id: 'friends', label: `Game Friends (${friends.length})` },
              {
                id: 'requests',
                label:
                  pendingRequests.length > 0
                    ? `Requests (${pendingRequests.length} New)`
                    : 'Requests',
              },
              { id: 'find', label: 'Add / Find UID' },
              { id: 'live', label: `Live Server (${liveServerOthers.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                soundEngine.playClick();
                setActiveTab(t.id);
              }}
              className={`min-h-[40px] rounded-md px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#171d28] text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Workspace */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: GAME FRIENDS */}
          {activeTab === 'friends' && (
            <div>
              {enrichedFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#121721] p-10 text-center">
                  <Users className="h-9 w-9 text-slate-600 mb-2" />
                  <div className="text-sm font-bold text-slate-200">Your Game Friend List is Empty</div>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    Open the <strong>Add / Find UID</strong> tab to search any Survivor by name or 9-digit Game UID and send a friend request.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('find')}
                    className="mt-4 min-h-[42px] rounded-lg bg-sky-500 px-4 text-xs font-bold text-slate-950 hover:bg-sky-400"
                  >
                    Find Survivors Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {enrichedFriends.map(
                    ({ friend, live, status, roomCode, skinId, level, rankPoints, gameUid }) => {
                      const skin = CHARACTER_SKINS.find((s) => s.id === skinId) || CHARACTER_SKINS[0];
                      const tier = getRankTier(rankPoints);
                      const st = getStatusDisplay(status, roomCode);
                      const alreadyInMyRoom = Boolean(
                        currentRoom && roomCode && currentRoom.roomCode === roomCode
                      );
                      const canInvite =
                        wsConnected && (status === 'online' || status === 'in_squad') && !alreadyInMyRoom;

                      return (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141a24] px-3.5 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-xs font-bold text-slate-950"
                                style={{ backgroundColor: skin.swatchHex }}
                              >
                                {friend.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#141a24] ${st.dotClass}`}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  {friend.name}
                                </span>
                                <span className="text-[10px] font-bold" style={{ color: tier.color }}>
                                  {tier.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono-tabular">
                                <span className={`font-semibold ${st.textClass}`}>{st.label}</span>
                                <span className="text-slate-500">· Lv.{level}</span>
                                <span className="text-slate-500">· UID {gameUid}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              disabled={!canInvite}
                              onClick={() => {
                                soundEngine.playClick();
                                onInviteFriend({
                                  playerId: live?.playerId || null,
                                  uid: friend.uid,
                                  name: friend.name,
                                });
                              }}
                              className={`flex min-h-[38px] items-center gap-1 rounded px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                                alreadyInMyRoom
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : canInvite
                                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                  : 'bg-white/5 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Send className="h-3 w-3" />
                              <span>
                                {alreadyInMyRoom ? 'In Squad' : status === 'in_match' ? 'Busy' : 'Invite'}
                              </span>
                            </button>

                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                onRemoveFriend(friend.id);
                              }}
                              title="Remove friend"
                              aria-label={`Remove ${friend.name}`}
                              className="flex h-[38px] w-[38px] items-center justify-center rounded border border-white/10 bg-[#1a212d] text-slate-400 hover:border-red-400/50 hover:text-red-300"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INCOMING FRIEND REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#121721] p-10 text-center">
                  <UserCheck className="h-9 w-9 text-slate-600 mb-2" />
                  <div className="text-sm font-bold text-slate-200">No Pending Friend Requests</div>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    Share your UID (<span className="font-mono-tabular text-amber-300">{myGameUid}</span>) with squadmates so they can add you.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingRequests.map((req) => {
                    const skin =
                      CHARACTER_SKINS.find((s) => s.id === req.fromSkinId) || CHARACTER_SKINS[0];
                    const tier = getRankTier(req.fromRankPoints);
                    const gUid = getGameUid(req.fromUid, req.fromName);
                    return (
                      <div
                        key={req.fromUid}
                        className="flex items-center justify-between gap-3 rounded-lg border border-sky-500/30 bg-[#141a24] px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15 text-xs font-bold text-slate-950"
                            style={{ backgroundColor: skin.swatchHex }}
                          >
                            {req.fromName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {req.fromName}
                              </span>
                              <span className="text-[10px] font-bold" style={{ color: tier.color }}>
                                {tier.name}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono-tabular text-slate-400">
                              Lv.{req.fromLevel} · UID {gUid}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onRespondFriendRequest(req, true);
                            }}
                            className="flex min-h-[40px] items-center gap-1 rounded bg-emerald-500 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onRespondFriendRequest(req, false);
                            }}
                            className="flex min-h-[40px] items-center gap-1 rounded border border-white/15 bg-[#1b2230] px-3 text-xs font-semibold text-slate-300 hover:border-red-400/50 hover:text-red-300"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIND BY NAME OR 9-DIGIT UID */}
          {activeTab === 'find' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Survivor name or 9-digit Game UID..."
                    maxLength={24}
                    className="h-11 w-full rounded-lg border border-white/15 bg-[#0a0d13] pl-9 pr-8 text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-sky-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {searching && <span className="text-xs text-sky-400">Searching...</span>}
              </div>

              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#121721] p-10 text-center text-xs text-slate-400">
                  {searchQuery.trim()
                    ? `No survivors found matching "${searchQuery.trim()}".`
                    : 'No other survivors registered yet. Have squadmates sign in with Google!'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {searchResults.map((res) => {
                    const skin = CHARACTER_SKINS.find((s) => s.id === res.skinId) || CHARACTER_SKINS[0];
                    const tier = getRankTier(res.rankPoints);
                    const st = getStatusDisplay(res.status, res.roomCode);
                    const added = isAlreadyFriend(res.uid, res.id, res.name);
                    const requested = Boolean(sentIds[res.id]);
                    const gUid = getGameUid(res.uid, res.name);
                    const canInvite =
                      wsConnected && (res.status === 'online' || res.status === 'in_squad');

                    return (
                      <div
                        key={`${res.source}_${res.id}_${res.name}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141a24] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-xs font-bold text-slate-950"
                              style={{ backgroundColor: skin.swatchHex }}
                            >
                              {res.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#141a24] ${st.dotClass}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">{res.name}</span>
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono-tabular text-slate-400">
                                {res.source === 'live' ? 'LIVE' : 'CLOUD'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono-tabular">
                              <span className={`font-semibold ${st.textClass}`}>{st.label}</span>
                              <span style={{ color: tier.color }}>{tier.name}</span>
                              <span className="text-slate-500">· {gUid}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canInvite && (
                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                onInviteFriend({
                                  playerId: res.playerId,
                                  uid: res.uid,
                                  name: res.name,
                                });
                              }}
                              className="flex min-h-[38px] items-center gap-1 rounded bg-amber-500/90 px-2.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400"
                            >
                              <Send className="h-3 w-3" />
                              <span>Invite</span>
                            </button>
                          )}

                          {added ? (
                            <span className="flex min-h-[38px] items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11px] font-bold text-emerald-300">
                              <Check className="h-3 w-3" />
                              Friend
                            </span>
                          ) : requested ? (
                            <span className="flex min-h-[38px] items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2.5 text-[11px] font-bold text-sky-300">
                              Requested
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                setSentIds((prev) => ({ ...prev, [res.id]: true }));
                                onSendFriendRequest({
                                  id: res.id,
                                  uid: res.uid,
                                  playerId: res.playerId,
                                  name: res.name,
                                  skinId: res.skinId,
                                  level: res.level,
                                  rankPoints: res.rankPoints,
                                });
                              }}
                              className="flex min-h-[38px] items-center gap-1 rounded bg-sky-500 px-2.5 text-[11px] font-bold text-slate-950 hover:bg-sky-400"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LIVE SERVER LOBBY */}
          {activeTab === 'live' && (
            <div className="space-y-3">
              {liveServerOthers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#121721] p-10 text-center text-xs text-slate-400">
                  <Radio className="h-8 w-8 text-slate-600 mb-2" />
                  No other players connected to this WebSocket server right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {liveServerOthers.map((p) => {
                    const skin = CHARACTER_SKINS.find((s) => s.id === p.skinId) || CHARACTER_SKINS[0];
                    const tier = getRankTier(p.rankPoints);
                    const st = getStatusDisplay(p.status, p.roomCode);
                    const gUid = getGameUid(p.uid, p.name);
                    const id = p.uid || `live_${p.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
                    const added = isAlreadyFriend(p.uid, id, p.name);

                    return (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141a24] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-xs font-bold text-slate-950"
                              style={{ backgroundColor: skin.swatchHex }}
                            >
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#141a24] ${st.dotClass}`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">{p.name}</span>
                              <span className="text-[10px] font-bold" style={{ color: tier.color }}>
                                {tier.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono-tabular">
                              <span className={`font-semibold ${st.textClass}`}>{st.label}</span>
                              <span className="text-slate-500">· UID {gUid}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            disabled={!wsConnected || p.status === 'in_match'}
                            onClick={() => {
                              soundEngine.playClick();
                              onInviteFriend({ playerId: p.playerId, uid: p.uid, name: p.name });
                            }}
                            className="flex min-h-[38px] items-center gap-1 rounded bg-amber-500 px-2.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400 disabled:bg-white/5 disabled:text-slate-500"
                          >
                            <Send className="h-3 w-3" />
                            <span>Invite</span>
                          </button>

                          {!added && (
                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                setSentIds((prev) => ({ ...prev, [id]: true }));
                                onSendFriendRequest({
                                  id,
                                  uid: p.uid,
                                  playerId: p.playerId,
                                  name: p.name,
                                  skinId: p.skinId,
                                  level: p.level,
                                  rankPoints: p.rankPoints,
                                });
                              }}
                              className="flex min-h-[38px] items-center gap-1 rounded bg-sky-500 px-2.5 text-[11px] font-bold text-slate-950 hover:bg-sky-400"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>{sentIds[id] ? 'Sent' : 'Add'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
