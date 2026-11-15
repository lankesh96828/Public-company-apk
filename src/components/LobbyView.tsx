import React, { useState } from 'react';
import {
  CHARACTER_SKINS,
  DEFAULT_EQUIPPED_EMOTES,
  DEFAULT_EQUIPPED_WEAPON_SKINS,
  DEFAULT_UNLOCKED_EMOTES,
  EMOTE_CATALOG,
  FriendRecord,
  getGameUid,
  getRankTier,
  GLOO_SKINS,
  LobbyTab,
  MAP_CATALOG,
  MapId,
  MatchMode,
  NEXT_MAP_ID,
  OnlinePlayerPresence,
  PARACHUTE_SKINS,
  PlayerProfile,
  SquadInvite,
  TOP_UP_MILESTONES,
  WEAPON_SKINS,
  WEAPONS,
  WeaponId,
} from '../game/types';
import {
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Crosshair,
  Shield,
  User,
  Play,
  Plus,
  Lock,
  Crown,
  Users,
  Trophy,
  Cloud,
  UserPlus,
  Check,
  X,
  Search,
  ShoppingBag,
  Sparkles,
  Copy,
  Smile,
  Send,
  Target,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import { DiamondIcon } from './TopUpModal';
import bermudaDropImg from '../assets/images/bermuda_drop_artwork_1794647643029.jpg';
import purgatoryDropImg from '../assets/images/purgatory_drop_artwork_1794647642950.jpg';
import alpineDropImg from '../assets/images/alpine_drop_artwork_1794659056689.jpg';

const MAP_PREVIEW_IMGS: Record<MapId, string> = {
  bermuda: bermudaDropImg,
  purgatory: purgatoryDropImg,
  alpine: alpineDropImg,
};

interface LobbyViewProps {
  profile: PlayerProfile;
  activeTab: LobbyTab;
  mapId: MapId;
  mode: MatchMode;
  muted: boolean;
  authUid: string | null;
  currentRoomCode: string | null;
  currentRoomCount: number;
  onlineFriendsCount: number;
  pendingFriendRequestCount: number;
  friends: FriendRecord[];
  onlinePlayers: OnlinePlayerPresence[];
  incomingInvites: SquadInvite[];
  claimableMissionsCount: number;
  victoryCelebrationActive?: boolean;
  onReplayVictoryFireworks?: () => void;
  onChangeTab: (tab: LobbyTab) => void;
  onPreviewSkin: (skinId: string | null) => void;
  onSelectSkin: (skinId: string) => void;
  onUnlockSkin: (skinId: string, price: number) => void;
  onSelectWeapon: (weaponId: WeaponId) => void;
  previewWeaponSkinId: string | null;
  onPreviewWeaponSkin: (skinId: string | null) => void;
  onSelectWeaponSkin: (weaponId: WeaponId, skinId: string) => void;
  onUnlockWeaponSkin: (skinId: string, weaponId: WeaponId, price: number) => void;
  onSelectParachute: (id: string) => void;
  onUnlockParachute: (id: string, price: number) => void;
  onSelectGloo: (id: string) => void;
  onUnlockGloo: (id: string, price: number) => void;
  onPlayLobbyEmote: (emoteId: string) => void;
  onUnlockEmote: (emoteId: string, price: number) => void;
  onToggleEquipEmote: (emoteId: string) => void;
  onQuickInviteFriend: (target: { playerId: string | null; uid: string | null; name: string }) => void;
  onOpenTopUp: () => void;
  onOpenStore: () => void;
  onOpenLuckRoyale: () => void;
  onOpenMissions: () => void;
  onOpenMultiplayer: (tab?: 'rooms' | 'leaderboard') => void;
  onOpenFriends: () => void;
  onAcceptInvite: (invite: SquadInvite) => void;
  onDeclineInvite: (invite: SquadInvite) => void;
  onChangeMap: (mapId: MapId) => void;
  onChangeMode: (mode: MatchMode) => void;
  onOpenControls: () => void;
  onChangeName: (name: string) => void;
  onToggleMute: () => void;
  onStartMatch: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  profile,
  activeTab,
  mapId,
  mode,
  muted,
  authUid,
  currentRoomCode,
  currentRoomCount,
  onlineFriendsCount,
  pendingFriendRequestCount,
  friends,
  onlinePlayers,
  incomingInvites,
  claimableMissionsCount,
  victoryCelebrationActive = false,
  onReplayVictoryFireworks,
  onChangeTab,
  onPreviewSkin,
  onSelectSkin,
  onUnlockSkin,
  onSelectWeapon,
  previewWeaponSkinId,
  onPreviewWeaponSkin,
  onSelectWeaponSkin,
  onUnlockWeaponSkin,
  onSelectParachute,
  onUnlockParachute,
  onSelectGloo,
  onUnlockGloo,
  onPlayLobbyEmote,
  onUnlockEmote,
  onToggleEquipEmote,
  onQuickInviteFriend,
  onOpenTopUp,
  onOpenStore,
  onOpenLuckRoyale,
  onOpenMissions,
  onOpenMultiplayer,
  onOpenFriends,
  onAcceptInvite,
  onDeclineInvite,
  onChangeMap,
  onChangeMode,
  onOpenControls,
  onChangeName,
  onToggleMute,
  onStartMatch,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [previewSkinId, setPreviewSkinId] = useState<string>(profile.selectedSkinId);
  const [charQuery, setCharQuery] = useState('');
  const [showLobbyEmotes, setShowLobbyEmotes] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  const myGameUid = getGameUid(authUid, profile.name);
  const unlockedEmotes = profile.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES;
  const equippedEmotes = profile.equippedEmotes || DEFAULT_EQUIPPED_EMOTES;

  const rank = getRankTier(profile.rankPoints);
  const selectedSkin = CHARACTER_SKINS.find((s) => s.id === previewSkinId) || CHARACTER_SKINS[0];
  const isPreviewSkinUnlocked = profile.unlockedSkins.includes(selectedSkin.id);
  const filteredCharacters = CHARACTER_SKINS.filter((s) => {
    const q = charQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  });

  const selectedWeapon = WEAPONS[profile.selectedLobbyWeapon];
  const weaponSkinsForSelected = WEAPON_SKINS.filter(
    (ws) => ws.weaponId === profile.selectedLobbyWeapon
  );
  const equippedWeaponSkinId =
    profile.equippedWeaponSkins?.[profile.selectedLobbyWeapon] ||
    DEFAULT_EQUIPPED_WEAPON_SKINS[profile.selectedLobbyWeapon];
  const activeWeaponSkinId = previewWeaponSkinId || equippedWeaponSkinId;
  const inspectedWeaponSkin =
    weaponSkinsForSelected.find((ws) => ws.id === activeWeaponSkinId) || weaponSkinsForSelected[0];
  const isWeaponSkinUnlocked =
    inspectedWeaponSkin &&
    (inspectedWeaponSkin.diamondPrice === 0 ||
      (profile.unlockedWeaponSkins || []).includes(inspectedWeaponSkin.id));

  const readyMilestones = TOP_UP_MILESTONES.filter(
    (m) =>
      profile.totalTopUpDiamonds >= m.requiredDiamonds &&
      !profile.claimedTopUpMilestones.includes(m.id)
  ).length;

  const handleTab = (tab: LobbyTab) => {
    soundEngine.playClick();
    if (tab === 'character') {
      setPreviewSkinId(profile.selectedSkinId);
      onPreviewSkin(profile.selectedSkinId);
    } else {
      onPreviewSkin(null);
    }
    if (tab !== 'weapons') {
      onPreviewWeaponSkin(null);
    }
    onChangeTab(tab);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Survivor Profile & Currencies */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-[#0e1218]/90 px-3.5 py-2.5 shadow-lg">
            {/* Bespoke SVG Rank Crest */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="shrink-0">
              <polygon
                points="18,2 32,9 32,24 18,34 4,24 4,9"
                fill="#171E29"
                stroke={rank.color}
                strokeWidth="2.2"
              />
              <polygon points="18,8 25,15 18,27 11,15" fill={rank.color} fillOpacity="0.88" />
            </svg>

            <div className="min-w-0">
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (nameDraft.trim()) onChangeName(nameDraft.trim().slice(0, 14));
                    setEditingName(false);
                  }}
                >
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => {
                      if (nameDraft.trim()) onChangeName(nameDraft.trim().slice(0, 14));
                      setEditingName(false);
                    }}
                    className="w-32 rounded border border-amber-500/60 bg-black/60 px-1.5 py-0.5 text-sm font-semibold text-white outline-none"
                  />
                </form>
              ) : (
                <button
                  onClick={() => {
                    setNameDraft(profile.name);
                    setEditingName(true);
                  }}
                  title="Click to rename callsign"
                  className="text-left text-sm font-bold tracking-wide text-white hover:text-amber-400 transition-colors whitespace-nowrap"
                >
                  {profile.name}
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                <span style={{ color: rank.color }} className="font-semibold">
                  {rank.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>Lv.{profile.level}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(myGameUid).catch(() => undefined);
                    soundEngine.playClick();
                    setUidCopied(true);
                    window.setTimeout(() => setUidCopied(false), 1600);
                  }}
                  title="Copy 9-digit Game UID"
                  className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-amber-300"
                >
                  <span>{uidCopied ? 'UID COPIED' : `UID ${myGameUid}`}</span>
                  <Copy className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            <div className="ml-3 flex items-center gap-3 sm:gap-4 border-l border-white/10 pl-3 sm:pl-4 text-xs font-mono-tabular">
              <div className="hidden sm:block">
                <div className="text-[10px] text-slate-400">GOLD</div>
                <div className="font-bold text-amber-400">{profile.gold.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[10px] text-slate-400">DIAMONDS</div>
                  <div className="flex items-center gap-1 font-bold text-sky-400">
                    <DiamondIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{profile.diamonds.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenTopUp();
                  }}
                  title="Top-Up Diamonds"
                  aria-label="Top-Up Diamonds"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-400/50 bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bespoke SVG Title Lockup */}
          <div className="flex items-center gap-2.5 pl-1">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L24 10L19 25H9L4 10L14 2Z" fill="#FF8C00" fillOpacity="0.18" stroke="#FF8C00" strokeWidth="2" />
              <path d="M14 7L18 14L14 21L10 14L14 7Z" fill="#FF8C00" />
            </svg>
            <span className="font-display text-3xl font-bold tracking-wider text-white leading-none">
              BLAZE <span className="text-amber-500">DROP</span>
            </span>
          </div>
        </div>

        {/* Top-Right: Career Summary & Audio/Settings */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-4 rounded-lg border border-white/10 bg-[#0e1218]/90 px-4 py-2 text-xs font-mono-tabular">
            <div>
              <span className="text-slate-400">BOOYAHS </span>
              <span className="font-bold text-amber-400">{profile.wins}</span>
            </div>
            <span className="text-white/15">|</span>
            <div>
              <span className="text-slate-400">KILLS </span>
              <span className="font-bold text-white">{profile.kills}</span>
            </div>
            <span className="text-white/15">|</span>
            <div>
              <span className="text-slate-400">MATCHES </span>
              <span className="font-bold text-slate-200">{profile.matches}</span>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenMultiplayer('leaderboard');
            }}
            title={authUid ? 'Cloud Synced Leaderboard' : 'Sign In & Leaderboard'}
            aria-label="Cloud & Leaderboard"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#0e1218]/90 px-3 text-xs font-semibold text-slate-200 hover:border-sky-400/60 hover:text-sky-300 transition-colors"
          >
            <Cloud className={`h-4 w-4 ${authUid ? 'text-emerald-400' : 'text-slate-400'}`} />
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">{authUid ? 'Synced' : 'Cloud DB'}</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenControls();
            }}
            aria-label="Controls & Sensitivity Settings"
            title="3D Controls, Sensitivity & Custom HUD"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#0e1218]/90 px-3 text-xs font-semibold text-slate-200 hover:border-amber-500/60 hover:text-amber-400 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Controls</span>
          </button>

          <button
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#0e1218]/90 text-slate-200 hover:border-amber-500/60 hover:text-amber-400 transition-colors"
          >
            {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Top-Center Booyah Victory Celebration Strip (clear of center 3D hero viewport) */}
      {victoryCelebrationActive && activeTab === 'home' && (
        <div className="pointer-events-auto fixed left-1/2 top-4 -translate-x-1/2 z-20 flex items-center gap-3 rounded-lg border border-amber-400/60 bg-[#0e1218]/95 px-4 py-2 shadow-xl">
          <Crown className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-wider text-amber-300 leading-none">
              BOOYAH! VICTORY CELEBRATION
            </span>
            <span className="text-[10px] font-medium text-slate-300 mt-0.5">
              Champion fireworks active in lobby hangar
            </span>
          </div>
          {onReplayVictoryFireworks && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onReplayVictoryFireworks();
              }}
              className="ml-1 flex items-center gap-1 rounded border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Replay
            </button>
          )}
        </div>
      )}

      {/* Incoming Squad Lobby Invite Notification */}
      {incomingInvites.length > 0 && (
        <div className="pointer-events-auto fixed right-4 sm:right-6 top-20 z-30 flex flex-col gap-2 w-72 sm:w-80">
          {incomingInvites.slice(0, 2).map((inv) => {
            const invSkin = CHARACTER_SKINS.find((s) => s.id === inv.fromSkinId) || CHARACTER_SKINS[0];
            return (
              <div
                key={inv.inviteId}
                className="rounded-xl border border-emerald-400/50 bg-[#0e141c]/95 p-3.5 shadow-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-slate-950"
                    style={{ backgroundColor: invSkin.swatchHex }}
                  >
                    {inv.fromName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {inv.fromName} <span className="font-normal text-emerald-400">invited you</span>
                    </div>
                    <div className="text-[10px] font-mono-tabular text-slate-400">
                      SQUAD {inv.roomCode} · {MAP_CATALOG[inv.mapId]?.name || 'Bermuda'} ·{' '}
                      {inv.mode === 'br_classic' ? 'BR Classic' : 'Blitz'}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      soundEngine.playTopUpSuccess();
                      onAcceptInvite(inv);
                    }}
                    className="flex h-8 items-center justify-center gap-1 rounded bg-emerald-500 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Join Squad
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      onDeclineInvite(inv);
                    }}
                    className="flex h-8 items-center justify-center gap-1 rounded border border-white/15 bg-[#171e29] text-xs font-semibold text-slate-300 hover:border-red-400/50 hover:text-red-300"
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Middle Zone: Left Rail Navigation + Contextual Drawer */}
      <div className="flex items-center gap-4 my-auto">
        {/* Iconic FF Left Vertical Rail */}
        <div className="pointer-events-auto flex flex-col gap-2">
          {(
            [
              { id: 'home', label: 'Lobby', icon: Play },
              { id: 'character', label: 'Character', icon: User },
              { id: 'weapons', label: 'Weapons', icon: Crosshair },
              { id: 'vault', label: 'Vault', icon: Shield },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTab(item.id)}
                className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
                  active
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-[#0e1218]/90 text-slate-300 hover:border-white/25 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenStore();
            }}
            className="flex items-center gap-2.5 rounded-lg border border-purple-500/45 bg-purple-500/15 px-3.5 py-2.5 text-xs font-semibold tracking-wide text-purple-200 hover:bg-purple-500/25 transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span>Store</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenLuckRoyale();
            }}
            className="flex items-center gap-2.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3.5 py-2.5 text-xs font-semibold tracking-wide text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
          >
            <Crown className="h-4 w-4 shrink-0" />
            <span>Luck Royale</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenMissions();
            }}
            className="flex items-center justify-between gap-2.5 rounded-lg border border-amber-400/45 bg-[#0e1218]/90 px-3.5 py-2.5 text-xs font-semibold tracking-wide text-amber-200 hover:border-amber-400 hover:bg-amber-500/15 transition-colors whitespace-nowrap"
          >
            <span className="flex items-center gap-2.5">
              <Target className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Missions</span>
            </span>
            {claimableMissionsCount > 0 && (
              <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold text-slate-950">
                {claimableMissionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenMultiplayer('rooms');
            }}
            className={`flex items-center justify-between gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
              currentRoomCode
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                : 'border-white/15 bg-[#0e1218]/90 text-slate-200 hover:border-sky-400/50 hover:text-sky-300'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0" />
              <span>{currentRoomCode ? currentRoomCode : 'Multiplayer'}</span>
            </span>
            {currentRoomCode && (
              <span className="font-mono-tabular text-[10px] font-bold text-emerald-300">
                {currentRoomCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenFriends();
            }}
            className="flex items-center justify-between gap-2.5 rounded-lg border border-emerald-500/40 bg-[#0e1218]/90 px-3.5 py-2.5 text-xs font-semibold tracking-wide text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/15 transition-colors whitespace-nowrap"
          >
            <span className="flex items-center gap-2.5">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>Friends</span>
            </span>
            {pendingFriendRequestCount > 0 ? (
              <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold text-slate-950">
                {pendingFriendRequestCount} REQ
              </span>
            ) : (
              onlineFriendsCount > 0 && (
                <span className="font-mono-tabular text-[10px] font-bold text-emerald-400">
                  {onlineFriendsCount}
                </span>
              )
            )}
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenTopUp();
            }}
            className="flex items-center justify-between gap-2.5 rounded-lg border border-sky-400/50 bg-sky-500/15 px-3.5 py-2.5 text-xs font-semibold tracking-wide text-sky-300 hover:bg-sky-500/25 transition-colors whitespace-nowrap"
          >
            <span className="flex items-center gap-2.5">
              <DiamondIcon className="h-4 w-4 shrink-0" />
              <span>Top-Up</span>
            </span>
            {readyMilestones > 0 && (
              <span className="font-mono-tabular text-[10px] font-bold text-amber-300">
                {readyMilestones}
              </span>
            )}
          </button>
        </div>

        {/* Left Contextual Drawer (only visible on Character / Weapons / Vault tabs) */}
        {activeTab === 'character' && (
          <div className="pointer-events-auto w-76 sm:w-84 rounded-lg border border-white/15 bg-[#0e1218]/95 p-4 shadow-2xl">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold tracking-wide text-white">
                SURVIVOR ROSTER <span className="text-sm font-mono-tabular text-amber-400">({CHARACTER_SKINS.length})</span>
              </h2>
              <button onClick={() => handleTab('home')} className="text-xs text-slate-400 hover:text-white">
                Done
              </button>
            </div>
            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={charQuery}
                onChange={(e) => setCharQuery(e.target.value)}
                placeholder="Search character or real name..."
                className="w-full rounded border border-white/10 bg-[#141923] py-1.5 pl-8 pr-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500/60"
              />
            </div>
            <div className="grid max-h-[225px] grid-cols-2 gap-2 mb-3 overflow-y-auto pr-1">
              {filteredCharacters.map((skin) => {
                const unlocked = profile.unlockedSkins.includes(skin.id);
                const equipped = skin.id === profile.selectedSkinId;
                const inspected = skin.id === previewSkinId;
                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setPreviewSkinId(skin.id);
                      onPreviewSkin(skin.id);
                      if (unlocked) onSelectSkin(skin.id);
                    }}
                    className={`rounded-md border p-2 text-left transition-colors ${
                      equipped
                        ? 'border-amber-500 bg-amber-500/15'
                        : inspected
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-white/10 bg-[#151b24] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: skin.swatchHex }} />
                        <span className="text-xs font-bold text-white truncate">{skin.name}</span>
                      </div>
                      {!unlocked && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                      {unlocked
                        ? skin.fullName
                        : skin.royaleOnly
                        ? 'Luck Royale Exclusive'
                        : `${skin.diamondPrice} ◆ · ${skin.fullName}`}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-md border border-white/10 bg-[#141923] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white truncate">{selectedSkin.name}</span>
                <span className="text-[11px] text-slate-400 truncate">{selectedSkin.fullName}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-amber-400">
                ACTIVE SKILL · {selectedSkin.skillName}
              </div>
              <div className="mt-0.5 text-xs text-slate-300">{selectedSkin.skillDesc}</div>
              <div className="mt-1 text-[11px] font-mono-tabular text-slate-400">
                Cooldown: {selectedSkin.cooldown}s
              </div>

              {!isPreviewSkinUnlocked && (
                selectedSkin.royaleOnly ? (
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenLuckRoyale();
                    }}
                    className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    Win in Luck Royale
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (profile.diamonds >= selectedSkin.diamondPrice) {
                        soundEngine.playTopUpSuccess();
                        onUnlockSkin(selectedSkin.id, selectedSkin.diamondPrice);
                      } else {
                        soundEngine.playClick();
                        onOpenTopUp();
                      }
                    }}
                    className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400"
                  >
                    <DiamondIcon className="h-3.5 w-3.5" />
                    {profile.diamonds >= selectedSkin.diamondPrice
                      ? `Unlock ${selectedSkin.name} (${selectedSkin.diamondPrice})`
                      : `Top-Up to Unlock (${selectedSkin.diamondPrice})`}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'weapons' && (
          <div className="pointer-events-auto w-76 sm:w-88 rounded-lg border border-white/15 bg-[#0e1218]/95 p-4 shadow-2xl">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold tracking-wide text-white">ARMORY &amp; SKINS</h2>
              <button onClick={() => handleTab('home')} className="text-xs text-slate-400 hover:text-white">
                Done
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {(Object.keys(WEAPONS) as WeaponId[]).map((wId) => {
                const w = WEAPONS[wId];
                const selected = wId === profile.selectedLobbyWeapon;
                return (
                  <button
                    key={wId}
                    onClick={() => {
                      soundEngine.playClick();
                      onPreviewWeaponSkin(null);
                      onSelectWeapon(wId);
                    }}
                    className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                      selected
                        ? 'border-amber-500 bg-amber-500/15'
                        : 'border-white/10 bg-[#151b24] hover:border-white/25'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-white truncate">{w.name}</div>
                    <div className="text-[10px] text-slate-400">{w.category}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 rounded-md border border-white/10 bg-[#141923] p-2.5 text-[11px] mb-3">
              {(
                [
                  ['Damage', selectedWeapon.statBars.damage],
                  ['Fire Rate', selectedWeapon.statBars.rate],
                  ['Range', selectedWeapon.statBars.range],
                  ['Accuracy', selectedWeapon.statBars.accuracy],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-16 text-slate-400">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-white/10">
                    <div className="h-full bg-amber-500" style={{ width: `${val}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono-tabular text-slate-200">{val}</span>
                </div>
              ))}
            </div>

            {/* Weapon Skin Library */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>WEAPON SKIN LIBRARY</span>
                </span>
                <span className="text-slate-400">{selectedWeapon.name}</span>
              </div>

              <div className="grid max-h-[155px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 mb-2.5">
                {weaponSkinsForSelected.map((ws) => {
                  const unlocked =
                    ws.diamondPrice === 0 || (profile.unlockedWeaponSkins || []).includes(ws.id);
                  const equipped = ws.id === equippedWeaponSkinId;
                  const inspected = inspectedWeaponSkin?.id === ws.id;
                  const rarityColor =
                    ws.rarity === 'evo'
                      ? 'text-amber-300 border-amber-400/40 bg-amber-500/15'
                      : ws.rarity === 'epic'
                      ? 'text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-500/15'
                      : ws.rarity === 'rare'
                      ? 'text-sky-300 border-sky-400/40 bg-sky-500/15'
                      : 'text-slate-400 border-white/10 bg-white/5';

                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        soundEngine.playClick();
                        onPreviewWeaponSkin(ws.id);
                        if (unlocked) {
                          onSelectWeaponSkin(ws.weaponId, ws.id);
                        }
                      }}
                      className={`rounded-md border p-2 text-left transition-colors ${
                        equipped
                          ? 'border-amber-500 bg-amber-500/15'
                          : inspected
                          ? 'border-sky-400 bg-sky-500/10'
                          : 'border-white/10 bg-[#151b24] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-sm shrink-0 border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${ws.primaryHex} 50%, ${ws.accentHex} 50%)`,
                            }}
                          />
                          <span className="text-[11px] font-bold text-white truncate">{ws.name}</span>
                        </span>
                        {!unlocked && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span
                          className={`rounded border px-1 py-0.2 text-[9px] font-bold uppercase ${rarityColor}`}
                        >
                          {ws.rarity}
                        </span>
                        <span className="text-[10px] font-mono-tabular text-slate-400">
                          {equipped ? 'EQUIPPED' : unlocked ? 'OWNED' : `${ws.diamondPrice} ◆`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {inspectedWeaponSkin && (
                isWeaponSkinUnlocked ? (
                  <div className="flex items-center justify-between rounded border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
                    <span className="font-semibold truncate">
                      {inspectedWeaponSkin.id === equippedWeaponSkinId
                        ? `Equipped: ${inspectedWeaponSkin.name}`
                        : inspectedWeaponSkin.name}
                    </span>
                    {inspectedWeaponSkin.id !== equippedWeaponSkinId ? (
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onSelectWeaponSkin(inspectedWeaponSkin.weaponId, inspectedWeaponSkin.id);
                        }}
                        className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 hover:bg-amber-400"
                      >
                        Equip
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold uppercase">Active In-Match</span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (profile.diamonds >= inspectedWeaponSkin.diamondPrice) {
                        soundEngine.playTopUpSuccess();
                        onUnlockWeaponSkin(
                          inspectedWeaponSkin.id,
                          inspectedWeaponSkin.weaponId,
                          inspectedWeaponSkin.diamondPrice
                        );
                      } else {
                        soundEngine.playClick();
                        onOpenTopUp();
                      }
                    }}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400"
                  >
                    <DiamondIcon className="h-3.5 w-3.5" />
                    {profile.diamonds >= inspectedWeaponSkin.diamondPrice
                      ? `Unlock ${inspectedWeaponSkin.name} (${inspectedWeaponSkin.diamondPrice})`
                      : `Top-Up to Unlock (${inspectedWeaponSkin.diamondPrice})`}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="pointer-events-auto w-72 sm:w-84 max-h-[65vh] overflow-y-auto rounded-lg border border-white/15 bg-[#0e1218]/95 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold tracking-wide text-white">TACTICAL VAULT</h2>
              <button onClick={() => handleTab('home')} className="text-xs text-slate-400 hover:text-white">
                Done
              </button>
            </div>
            <div className="mb-3">
              <div className="mb-1.5 text-[11px] font-semibold text-slate-400">PARACHUTE SKIN</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PARACHUTE_SKINS.map((p) => {
                  const unlocked = profile.unlockedParachutes.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (unlocked) {
                          soundEngine.playClick();
                          onSelectParachute(p.id);
                        } else if (profile.diamonds >= p.diamondPrice) {
                          soundEngine.playTopUpSuccess();
                          onUnlockParachute(p.id, p.diamondPrice);
                        } else {
                          soundEngine.playClick();
                          onOpenTopUp();
                        }
                      }}
                      className={`flex flex-col rounded border px-2.5 py-2 text-left text-xs font-medium ${
                        profile.selectedParachuteId === p.id
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-white/10 bg-[#151b24] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.hex }} />
                          <span className="truncate">{p.name}</span>
                        </span>
                        {!unlocked && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
                      </div>
                      {!unlocked && (
                        <span className="mt-1 font-mono-tabular text-[10px] text-sky-400">
                          Unlock {p.diamondPrice} ◆
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-3">
              <div className="mb-1.5 text-[11px] font-semibold text-slate-400">GLOO WALL FINISH</div>
              <div className="grid grid-cols-1 gap-1.5">
                {GLOO_SKINS.map((g) => {
                  const unlocked = profile.unlockedGlooWalls.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        if (unlocked) {
                          soundEngine.playClick();
                          onSelectGloo(g.id);
                        } else if (profile.diamonds >= g.diamondPrice) {
                          soundEngine.playTopUpSuccess();
                          onUnlockGloo(g.id, g.diamondPrice);
                        } else {
                          soundEngine.playClick();
                          onOpenTopUp();
                        }
                      }}
                      className={`flex items-center justify-between rounded border px-2.5 py-2 text-xs font-medium ${
                        profile.selectedGlooId === g.id
                          ? 'border-sky-400 bg-sky-500/15 text-white'
                          : 'border-white/10 bg-[#151b24] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: g.hex }} />
                        <span>{g.name}</span>
                      </span>
                      {!unlocked && (
                        <span className="font-mono-tabular text-[11px] text-sky-400">
                          Unlock {g.diamondPrice} ◆
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>EMOTE WHEEL ({equippedEmotes.length}/8)</span>
                <span className="text-amber-400">Tap to Preview &amp; Equip</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EMOTE_CATALOG.map((em) => {
                  const unlocked = unlockedEmotes.includes(em.id);
                  const equipped = equippedEmotes.includes(em.id);
                  return (
                    <button
                      key={em.id}
                      onClick={() => {
                        if (unlocked) {
                          onPlayLobbyEmote(em.id);
                          onToggleEquipEmote(em.id);
                        } else if (profile.diamonds >= em.diamondPrice) {
                          soundEngine.playTopUpSuccess();
                          onUnlockEmote(em.id, em.diamondPrice);
                          onPlayLobbyEmote(em.id);
                        } else {
                          soundEngine.playClick();
                          onOpenTopUp();
                        }
                      }}
                      className={`flex flex-col rounded border px-2 py-1.5 text-left text-[11px] font-medium ${
                        equipped
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : unlocked
                          ? 'border-white/15 bg-[#151b24] text-slate-200 hover:border-white/30'
                          : 'border-white/10 bg-[#11161f] text-slate-400 hover:border-sky-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 min-w-0">
                          <span
                            className="h-2 w-2 rounded-sm shrink-0"
                            style={{ backgroundColor: em.accentHex }}
                          />
                          <span className="truncate font-bold">{em.name}</span>
                        </span>
                        {!unlocked && <Lock className="h-2.5 w-2.5 shrink-0 text-slate-400" />}
                      </div>
                      <span className="mt-0.5 text-[9px] font-mono-tabular text-slate-400">
                        {equipped ? 'EQUIPPED' : unlocked ? 'Tap to Equip' : `${em.diamondPrice} ◆`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right-Side Free Fire Squad Quick-Invite Rail on Home Lobby */}
        {activeTab === 'home' && (
          <div className="pointer-events-auto ml-auto hidden lg:flex w-64 flex-col rounded-xl border border-white/15 bg-[#0e1218]/92 p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-white">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span>SQUAD FRIENDS</span>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenFriends();
                }}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300"
              >
                Manage All
              </button>
            </div>

            {(() => {
              const displayList =
                friends.length > 0
                  ? friends.slice(0, 5).map((f) => {
                      const match = onlinePlayers.find(
                        (p) =>
                          (f.uid && p.uid === f.uid) ||
                          p.name.trim().toLowerCase() === f.name.trim().toLowerCase()
                      );
                      return {
                        key: f.id,
                        name: f.name,
                        uid: f.uid,
                        playerId: match?.playerId || null,
                        status: match ? match.status : ('offline' as const),
                        isOnline: Boolean(match),
                      };
                    })
                  : onlinePlayers
                      .filter((p) => p.name !== profile.name)
                      .slice(0, 5)
                      .map((p) => ({
                        key: p.playerId,
                        name: p.name,
                        uid: p.uid,
                        playerId: p.playerId,
                        status: p.status,
                        isOnline: true,
                      }));

              if (displayList.length === 0) {
                return (
                  <div className="rounded-lg border border-white/10 bg-[#131922] px-3 py-3 text-[11px] text-slate-400">
                    Add friends by 9-digit Game UID or invite live server players into your squad.
                  </div>
                );
              }

              return (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                  {displayList.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141a24] px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              entry.status === 'online'
                                ? 'bg-emerald-400'
                                : entry.status === 'in_squad'
                                ? 'bg-sky-400'
                                : entry.status === 'in_match'
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                          />
                          <span className="truncate text-xs font-bold text-white">{entry.name}</span>
                        </div>
                        <div className="text-[9px] font-mono-tabular text-slate-400">
                          {entry.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <button
                        disabled={!entry.isOnline}
                        onClick={() => {
                          soundEngine.playClick();
                          onQuickInviteFriend({
                            playerId: entry.playerId,
                            uid: entry.uid,
                            name: entry.name,
                          });
                        }}
                        className={`flex h-7 items-center gap-1 rounded px-2 text-[10px] font-bold ${
                          entry.isOnline
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-[#1c2330] text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-2.5 w-2.5" />
                        <span>Invite</span>
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom Bar: Hint + Lobby Emote Trigger + START Cluster */}
      <div className="flex flex-col-reverse sm:flex-row items-center sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Lobby 3D Emote Wheel Popover */}
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowLobbyEmotes((prev) => !prev);
              }}
              aria-label="Lobby Emotes"
              className={`flex h-11 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold transition-colors ${
                showLobbyEmotes
                  ? 'border-amber-400 bg-amber-500 text-slate-950'
                  : 'border-amber-400/50 bg-[#0e1218]/92 text-amber-300 hover:border-amber-400'
              }`}
            >
              <Smile className="h-4 w-4" />
              <span>EMOTES ({equippedEmotes.length})</span>
            </button>

            {showLobbyEmotes && (
              <div className="absolute bottom-13 left-0 z-30 w-68 rounded-xl border border-amber-400/45 bg-[#0e1218]/96 p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-amber-300">
                    LOBBY EMOTE WHEEL
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLobbyEmotes(false);
                      handleTab('vault');
                    }}
                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-300"
                  >
                    Customize
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {equippedEmotes.slice(0, 8).map((emId) => {
                    const em = EMOTE_CATALOG.find((item) => item.id === emId);
                    if (!em) return null;
                    return (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => {
                          onPlayLobbyEmote(em.id);
                          setShowLobbyEmotes(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#151b26] px-2.5 py-2 text-left text-[11px] font-bold text-white hover:border-amber-400"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: em.accentHex }}
                        />
                        <span className="truncate">{em.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block text-xs text-slate-400 tracking-wide">
            Drag Survivor to Inspect · Multi-Finger 3D Controls · Tap Emotes to Dance
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-stretch gap-2.5 w-full sm:w-80">
          {/* Map & Mode Selector with Live Island Photo */}
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-white/15 bg-[#0e1218]/92 p-1.5">
            <button
              onClick={() => {
                soundEngine.playClick();
                onChangeMap(NEXT_MAP_ID[mapId]);
              }}
              className="relative overflow-hidden rounded-md bg-[#181e29] px-3 py-2 text-left hover:brightness-110 transition-all"
            >
              <img
                src={MAP_PREVIEW_IMGS[mapId]}
                alt={MAP_CATALOG[mapId].fullName}
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <div className="relative z-10">
                <div className="text-[10px] text-slate-300">ISLAND MAP</div>
                <div className="text-xs font-bold text-white whitespace-nowrap">
                  {MAP_CATALOG[mapId].name}
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                onChangeMode(mode === 'br_classic' ? 'br_blitz' : 'br_classic');
              }}
              className="rounded-md bg-[#181e29] px-3 py-2 text-left hover:bg-[#202836] transition-colors"
            >
              <div className="text-[10px] text-slate-400">MODE</div>
              <div className="text-xs font-bold text-amber-400 whitespace-nowrap">
                {mode === 'br_classic' ? 'BR Classic' : 'Blitz Drop'}
              </div>
            </button>
          </div>

          {/* Signature Free Fire Blazing Amber START Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onStartMatch();
            }}
            className="group relative flex h-14 items-center justify-center rounded-lg border border-amber-300/60 bg-gradient-to-b from-amber-400 to-orange-600 font-display text-3xl font-bold tracking-widest text-slate-950 shadow-[0_8px_28px_rgba(245,158,11,0.38)] hover:brightness-110 active:translate-y-0.5 transition-all"
          >
            {currentRoomCode ? 'START SQUAD MATCH' : 'START MATCH'}
          </button>
          <div className="text-center font-mono-tabular text-[10px] text-slate-400">
            {currentRoomCode
              ? `Squad Room ${currentRoomCode} · ${currentRoomCount} Squad + AI Bots`
              : 'Solo Battle Royale · 29 AI Bots'}
          </div>
        </div>
      </div>
    </div>
  );
};
