import React, { useState } from 'react';
import {
  FriendRecord,
  getRankTier,
  LeaderboardRow,
  MAP_CATALOG,
  MapId,
  MatchMode,
  MultiplayerRoomInfo,
  NEXT_MAP_ID,
  normalizeMapId,
  OnlinePlayerPresence,
  PlayerProfile,
} from '../game/types';
import { Cloud, LogIn, LogOut, Play, Plus, RefreshCw, Send, Trophy, UserPlus, Users, X } from 'lucide-react';
import { soundEngine } from '../game/audio';

interface MultiplayerModalProps {
  profile: PlayerProfile;
  authUid: string | null;
  authEmail: string | null;
  authBusy: boolean;
  cloudStatus: string | null;
  leaderboard: LeaderboardRow[];
  wsConnected: boolean;
  localPlayerId: string | null;
  currentRoom: MultiplayerRoomInfo | null;
  openRooms: MultiplayerRoomInfo[];
  roomError: string | null;
  friends: FriendRecord[];
  onlinePlayers: OnlinePlayerPresence[];
  inviteNotice: { ok: boolean; text: string } | null;
  initialTab?: 'rooms' | 'leaderboard';
  onClose: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onCreateRoom: (mapId: MapId, mode: MatchMode) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: (ready: boolean) => void;
  onUpdateRoomConfig: (mapId: MapId, mode: MatchMode) => void;
  onStartRoomMatch: () => void;
  onRefreshRooms: () => void;
  onInviteFriend: (target: { playerId: string | null; uid: string | null; name: string }) => void;
  onOpenFriends: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  profile,
  authUid,
  authEmail,
  authBusy,
  cloudStatus,
  leaderboard,
  wsConnected,
  localPlayerId,
  currentRoom,
  openRooms,
  roomError,
  friends,
  onlinePlayers,
  inviteNotice,
  initialTab = 'rooms',
  onClose,
  onGoogleSignIn,
  onGoogleSignOut,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onUpdateRoomConfig,
  onStartRoomMatch,
  onRefreshRooms,
  onInviteFriend,
  onOpenFriends,
}) => {
  const [tab, setTab] = useState<'rooms' | 'leaderboard'>(initialTab);
  const [joinCode, setJoinCode] = useState('');

  const localMember = currentRoom?.players.find((p) => p.id === localPlayerId);
  const isHost = Boolean(localMember?.isHost);

  const invitableFriends = friends
    .map((f) => {
      const live =
        (f.uid && onlinePlayers.find((p) => p.uid && p.uid === f.uid)) ||
        onlinePlayers.find((p) => p.name.trim().toLowerCase() === f.name.trim().toLowerCase()) ||
        null;
      return { friend: f, live };
    })
    .filter(({ live }) => live && live.status !== 'in_match' && live.roomCode !== currentRoom?.roomCode);

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0e1218] shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121720] px-5 py-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-sky-400 shrink-0" />
            <div>
              <h2 className="font-display text-3xl font-bold tracking-wider text-white leading-none">
                ONLINE MULTIPLAYER &amp; RANKINGS
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Real-time WebSocket Squad Rooms &amp; Cloud Firestore Leaderboard
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Close Multiplayer Hub"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171d28] text-slate-300 hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cloud Account Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c1017] px-5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Cloud className={`h-4 w-4 ${authUid ? 'text-emerald-400' : 'text-slate-500'}`} />
            {authUid ? (
              <span>
                Cloud Synced: <strong className="text-white">{profile.name}</strong>{' '}
                <span className="text-slate-400">({authEmail || authUid.slice(0, 8)})</span>
              </span>
            ) : (
              <span>Playing locally · Sign in with Google to save profile &amp; rank to Cloud Database</span>
            )}
            {cloudStatus && <span className="text-sky-400">· {cloudStatus}</span>}
          </div>

          {authUid ? (
            <button
              onClick={onGoogleSignOut}
              disabled={authBusy}
              className="flex items-center gap-1.5 rounded border border-white/15 bg-[#171d28] px-3 py-1 font-semibold text-slate-200 hover:border-red-400/50 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn}
              disabled={authBusy}
              className="flex items-center gap-1.5 rounded bg-sky-500 px-3.5 py-1.5 font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              <LogIn className="h-3.5 w-3.5" />
              {authBusy ? 'Connecting...' : 'Sign In with Google'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-[#10151d] px-5 py-2.5">
          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('rooms');
            }}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors ${
              tab === 'rooms' ? 'bg-amber-500 text-slate-950' : 'bg-[#171d28] text-slate-300 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Live Rooms {currentRoom ? `(${currentRoom.roomCode})` : ''}
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('leaderboard');
            }}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors ${
              tab === 'leaderboard' ? 'bg-amber-500 text-slate-950' : 'bg-[#171d28] text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Global Leaderboard ({leaderboard.length})
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5">
          {tab === 'rooms' && (
            <div className="space-y-4">
              {roomError && (
                <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-3.5 py-2 text-xs text-red-200">
                  {roomError}
                </div>
              )}

              {!currentRoom ? (
                <>
                  {/* Create or Join by Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#141a24] p-4">
                      <div className="text-xs font-bold text-white mb-1">HOST CUSTOM BR ROOM</div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Create a live multiplayer room code and invite friends in another tab or device.
                      </p>
                      <button
                        disabled={!wsConnected}
                        onClick={() => {
                          soundEngine.playClick();
                          onCreateRoom('bermuda', 'br_classic');
                        }}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        {wsConnected ? 'Create Multiplayer Room' : 'Connecting Server...'}
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (joinCode.trim()) onJoinRoom(joinCode.trim().toUpperCase());
                      }}
                      className="rounded-xl border border-white/10 bg-[#141a24] p-4"
                    >
                      <div className="text-xs font-bold text-white mb-1">JOIN BY ROOM CODE</div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Enter a 6-character code (example: FF4821) to enter a live lobby.
                      </p>
                      <div className="flex gap-2">
                        <input
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="FF1234"
                          maxLength={8}
                          className="flex-1 rounded-lg border border-white/15 bg-[#0b0e13] px-3 py-2 font-mono-tabular text-xs font-bold text-white uppercase outline-none focus:border-sky-400"
                        />
                        <button
                          type="submit"
                          disabled={!wsConnected || !joinCode.trim()}
                          className="rounded-lg bg-sky-500 px-4 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                        >
                          Join
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Open Rooms Browser */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">ACTIVE SERVER ROOMS</span>
                      <button
                        onClick={onRefreshRooms}
                        className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </button>
                    </div>

                    {openRooms.length === 0 ? (
                      <div className="rounded-lg border border-white/10 bg-[#131821] p-6 text-center text-xs text-slate-400">
                        No open multiplayer rooms right now. Create one above to start!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {openRooms.map((r) => (
                          <div
                            key={r.roomCode}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-[#141a24] px-4 py-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono-tabular text-sm font-bold text-amber-400">
                                  {r.roomCode}
                                </span>
                                <span className="text-xs font-semibold text-white">Host: {r.hostName}</span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400 font-mono-tabular">
                                {MAP_CATALOG[normalizeMapId(r.mapId)].name} ·{' '}
                                {r.mode === 'br_classic' ? 'BR Classic' : 'Blitz Drop'} ·{' '}
                                {r.playerCount}/{r.maxPlayers} Players · {r.status.toUpperCase()}
                              </div>
                            </div>
                            <button
                              disabled={r.status !== 'waiting'}
                              onClick={() => onJoinRoom(r.roomCode)}
                              className="rounded-md bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:bg-white/10 disabled:text-slate-500"
                            >
                              {r.status === 'waiting' ? 'Join Room' : 'In Match'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Inside Joined Multiplayer Room */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/40 bg-[#121923] p-4">
                    <div>
                      <div className="text-[11px] font-semibold text-sky-400">ROOM CODE (SHARE WITH PLAYERS)</div>
                      <div className="font-mono-tabular text-3xl font-bold tracking-widest text-white">
                        {currentRoom.roomCode}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHost ? (
                        <>
                          <button
                            onClick={() =>
                              onUpdateRoomConfig(
                                NEXT_MAP_ID[normalizeMapId(currentRoom.mapId)],
                                currentRoom.mode
                              )
                            }
                            className="rounded-md border border-white/15 bg-[#1a2230] px-3 py-2 text-xs font-semibold text-white hover:border-amber-400"
                          >
                            Map: {MAP_CATALOG[normalizeMapId(currentRoom.mapId)].name}
                          </button>
                          <button
                            onClick={() =>
                              onUpdateRoomConfig(
                                currentRoom.mapId,
                                currentRoom.mode === 'br_classic' ? 'br_blitz' : 'br_classic'
                              )
                            }
                            className="rounded-md border border-white/15 bg-[#1a2230] px-3 py-2 text-xs font-semibold text-amber-300 hover:border-amber-400"
                          >
                            {currentRoom.mode === 'br_classic' ? 'BR Classic' : 'Blitz Drop'}
                          </button>
                        </>
                      ) : (
                        <div className="rounded-md border border-white/10 bg-[#0d121a] px-3 py-2 text-xs text-slate-300">
                          {MAP_CATALOG[normalizeMapId(currentRoom.mapId)].name} ·{' '}
                          {currentRoom.mode === 'br_classic' ? 'BR Classic' : 'Blitz Drop'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Roster */}
                  <div className="rounded-xl border border-white/10 bg-[#131822] p-4">
                    <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>CONNECTED SURVIVORS ({currentRoom.players.length}/{currentRoom.maxPlayers})</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        Empty slots auto-fill with AI Bots up to 30
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentRoom.players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d1118] px-3 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-sm bg-sky-400 shrink-0" />
                            <span className="font-bold text-white truncate">
                              {p.name} {p.id === localPlayerId ? '(You)' : ''}
                            </span>
                            {p.isHost && (
                              <span className="text-[10px] font-bold text-amber-400">HOST</span>
                            )}
                          </div>
                          <span className={`font-mono-tabular text-[11px] font-bold ${p.ready ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {p.ready ? 'READY' : 'WAIT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Invite Online Friends */}
                  <div className="rounded-xl border border-white/10 bg-[#131822] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        INVITE ONLINE FRIENDS ({invitableFriends.length})
                      </span>
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onOpenFriends();
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                      >
                        <UserPlus className="h-3 w-3" />
                        Find / Manage Friends
                      </button>
                    </div>
                    {inviteNotice && (
                      <div
                        className={`mb-2 text-[11px] font-semibold ${
                          inviteNotice.ok ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {inviteNotice.text}
                      </div>
                    )}
                    {invitableFriends.length === 0 ? (
                      <div className="text-[11px] text-slate-500">
                        No online friends available to invite right now. Add players in Friends or share code{' '}
                        <span className="font-mono-tabular text-amber-400">{currentRoom.roomCode}</span>.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {invitableFriends.map(({ friend, live }) => (
                          <button
                            key={friend.id}
                            onClick={() => {
                              soundEngine.playClick();
                              onInviteFriend({
                                playerId: live?.playerId || null,
                                uid: friend.uid,
                                name: friend.name,
                              });
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span>{friend.name}</span>
                            <Send className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Room Action Bar */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={onLeaveRoom}
                      className="rounded-lg border border-white/15 bg-[#171d28] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-red-400/50 hover:text-red-300"
                    >
                      Leave Room
                    </button>

                    <div className="flex items-center gap-2.5">
                      {!isHost && (
                        <button
                          onClick={() => onToggleReady(!localMember?.ready)}
                          className={`rounded-lg px-5 py-2.5 text-xs font-bold ${
                            localMember?.ready
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-sky-500 text-slate-950'
                          }`}
                        >
                          {localMember?.ready ? 'Ready (Click to Cancel)' : 'Ready Up'}
                        </button>
                      )}
                      {isHost && (
                        <button
                          onClick={onStartRoomMatch}
                          className="flex items-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-orange-600 px-6 py-2.5 font-display text-xl font-bold tracking-wider text-slate-950 hover:brightness-110"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          LAUNCH MATCH ({currentRoom.players.length} HUMAN)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#141923] p-8 text-center text-xs text-slate-400">
                  No ranked survivors synced yet. Sign in with Google above to publish your Rank Points &amp; BOOYAH stats to Firestore!
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-[#121720]">
                  <table className="w-full text-left text-xs font-mono-tabular">
                    <thead className="border-b border-white/10 bg-[#0d1118] text-[11px] text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2.5">#</th>
                        <th className="px-3.5 py-2.5">SURVIVOR</th>
                        <th className="px-3.5 py-2.5">TIER</th>
                        <th className="px-3.5 py-2.5 text-right">BOOYAHS</th>
                        <th className="px-3.5 py-2.5 text-right">KILLS</th>
                        <th className="px-3.5 py-2.5 text-right">RP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {leaderboard.map((row, idx) => {
                        const tier = getRankTier(row.rankPoints);
                        const isMe = authUid === row.uid;
                        return (
                          <tr key={row.uid} className={isMe ? 'bg-amber-500/10' : 'hover:bg-white/[0.02]'}>
                            <td className="px-3.5 py-2.5 font-bold text-slate-300">#{idx + 1}</td>
                            <td className="px-3.5 py-2.5 font-sans font-bold text-white">
                              {row.name} {isMe && <span className="text-[10px] text-amber-400">(YOU)</span>}
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold" style={{ color: tier.color }}>
                              {tier.name}
                            </td>
                            <td className="px-3.5 py-2.5 text-right text-amber-400 font-bold">{row.wins}</td>
                            <td className="px-3.5 py-2.5 text-right text-white">{row.kills}</td>
                            <td className="px-3.5 py-2.5 text-right text-sky-400 font-bold">
                              {row.rankPoints.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
