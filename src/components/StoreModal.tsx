import React, { useState } from 'react';
import {
  CHARACTER_SKINS,
  DEFAULT_EQUIPPED_EMOTES,
  DEFAULT_EQUIPPED_WEAPON_SKINS,
  DEFAULT_UNLOCKED_EMOTES,
  EMOTE_CATALOG,
  GLOO_SKINS,
  PARACHUTE_SKINS,
  PlayerProfile,
  STORE_BUNDLES,
  STORE_FF_TOKEN_EXCHANGE,
  StoreBundle,
  StoreTokenItem,
  WEAPON_SKINS,
  WEAPONS,
  WeaponId,
} from '../game/types';
import {
  Check,
  Crown,
  Flame,
  Search,
  Shield,
  ShoppingBag,
  Smile,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import { DiamondIcon } from './TopUpModal';
import { WeaponSilhouette, WeaponStatsChart } from './WeaponStatsChart';

export type StoreTab = 'bundles' | 'characters' | 'weapons' | 'emotes' | 'vault' | 'tokens';

interface StoreModalProps {
  profile: PlayerProfile;
  initialTab?: StoreTab;
  onClose: () => void;
  onOpenTopUp: () => void;
  onOpenLuckRoyale: () => void;
  onPurchaseBundle: (bundle: StoreBundle) => void;
  onUnlockSkin: (skinId: string, price: number) => void;
  onSelectSkin: (skinId: string) => void;
  onUnlockWeaponSkin: (skinId: string, weaponId: WeaponId, price: number) => void;
  onSelectWeaponSkin: (weaponId: WeaponId, skinId: string) => void;
  onUnlockParachute: (id: string, price: number) => void;
  onSelectParachute: (id: string) => void;
  onUnlockGloo: (id: string, price: number) => void;
  onSelectGloo: (id: string) => void;
  onUnlockEmote: (emoteId: string, price: number) => void;
  onToggleEquipEmote: (emoteId: string) => void;
  onRedeemTokenItem: (item: StoreTokenItem) => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  profile,
  initialTab = 'bundles',
  onClose,
  onOpenTopUp,
  onOpenLuckRoyale,
  onPurchaseBundle,
  onUnlockSkin,
  onSelectSkin,
  onUnlockWeaponSkin,
  onSelectWeaponSkin,
  onUnlockParachute,
  onSelectParachute,
  onUnlockGloo,
  onSelectGloo,
  onUnlockEmote,
  onToggleEquipEmote,
  onRedeemTokenItem,
}) => {
  const [tab, setTab] = useState<StoreTab>(initialTab);
  const [charSearch, setCharSearch] = useState('');
  const [weaponFilter, setWeaponFilter] = useState<WeaponId | 'all'>('all');
  const [inspectedWeaponSkinId, setInspectedWeaponSkinId] = useState<string>(
    () => WEAPON_SKINS.find((ws) => ws.diamondPrice > 0)?.id || WEAPON_SKINS[0].id
  );

  const unlockedEmotes = profile.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES;
  const equippedEmotes = profile.equippedEmotes || DEFAULT_EQUIPPED_EMOTES;

  const isBundleOwned = (b: StoreBundle) => {
    const hasSkin = !b.skinId || profile.unlockedSkins.includes(b.skinId);
    const hasWeaponSkin =
      !b.weaponSkinId || (profile.unlockedWeaponSkins || []).includes(b.weaponSkinId);
    const hasChute = !b.parachuteId || profile.unlockedParachutes.includes(b.parachuteId);
    const hasGloo = !b.glooId || profile.unlockedGlooWalls.includes(b.glooId);
    const hasEmote = !b.emoteId || unlockedEmotes.includes(b.emoteId);
    return hasSkin && hasWeaponSkin && hasChute && hasGloo && hasEmote;
  };

  const isTokenItemOwned = (item: StoreTokenItem) => {
    if (item.kind === 'gold' || !item.refId) return false;
    if (item.kind === 'skin') return profile.unlockedSkins.includes(item.refId);
    if (item.kind === 'weaponSkin') return (profile.unlockedWeaponSkins || []).includes(item.refId);
    if (item.kind === 'parachute') return profile.unlockedParachutes.includes(item.refId);
    if (item.kind === 'gloo') return profile.unlockedGlooWalls.includes(item.refId);
    if (item.kind === 'emote') return unlockedEmotes.includes(item.refId);
    return false;
  };

  const filteredChars = CHARACTER_SKINS.filter((s) => {
    const q = charSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  });

  const filteredWeaponSkins = WEAPON_SKINS.filter((ws) => {
    if (ws.diamondPrice === 0) return false;
    return weaponFilter === 'all' ? true : ws.weaponId === weaponFilter;
  });

  const inspectedWeaponSkin =
    filteredWeaponSkins.find((ws) => ws.id === inspectedWeaponSkinId) || filteredWeaponSkins[0] || null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0e1218] shadow-2xl max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121720] px-5 py-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-display text-3xl font-bold tracking-wider text-white leading-none">
                FF STORE &amp; EXCHANGE
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Bundles, Survivors, 3D Emotes, Evo Weapon Skins &amp; FF Token Redeem Shop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 rounded-lg border border-white/10 bg-[#0b0e13] px-3.5 py-1.5 text-xs font-mono-tabular">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenTopUp();
                }}
                className="flex items-center gap-1.5 hover:brightness-125"
                title="Top-Up Diamonds"
              >
                <DiamondIcon className="h-3.5 w-3.5" />
                <span className="font-bold text-sky-400">{profile.diamonds.toLocaleString()}</span>
              </button>
              <span className="text-white/15">|</span>
              <div>
                <span className="text-slate-400">GOLD </span>
                <span className="font-bold text-amber-400">{profile.gold.toLocaleString()}</span>
              </div>
              <span className="text-white/15">|</span>
              <div>
                <span className="text-slate-400">TOKENS </span>
                <span className="font-bold text-purple-400">{profile.ffTokens.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenLuckRoyale();
              }}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
            >
              <Crown className="h-3.5 w-3.5" />
              <span>Luck Royale</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              aria-label="Close Store"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171d28] text-slate-300 hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-[#10151d] px-5 py-2.5 overflow-x-auto">
          {(
            [
              { id: 'bundles', label: `HOT BUNDLES (${STORE_BUNDLES.length})`, icon: Flame },
              { id: 'characters', label: `CHARACTERS (${CHARACTER_SKINS.length})`, icon: Sparkles },
              { id: 'weapons', label: 'WEAPON SKINS', icon: Tag },
              { id: 'emotes', label: `EMOTES (${EMOTE_CATALOG.length})`, icon: Smile },
              { id: 'vault', label: 'WINGS & GLOO', icon: Shield },
              { id: 'tokens', label: `FF TOKEN REDEEM (${profile.ffTokens})`, icon: Crown },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundEngine.playClick();
                  setTab(item.id);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#171d28] text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Store Body */}
        <div className="overflow-y-auto p-5">
          {tab === 'bundles' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STORE_BUNDLES.map((b) => {
                const owned = isBundleOwned(b);
                const canAfford = profile.diamonds >= b.diamondPrice;
                return (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between rounded-xl border border-white/15 bg-[#131922] p-4 shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-slate-950"
                          style={{ backgroundColor: b.accentHex }}
                        >
                          {b.badge}
                        </span>
                        {owned && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Check className="h-3.5 w-3.5" /> OWNED
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-2xl font-bold tracking-wide text-white">
                        {b.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">{b.subtitle}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/10">
                      <div className="mb-2.5 flex items-baseline justify-between font-mono-tabular">
                        <span className="text-xs text-slate-500 line-through">
                          {b.originalPrice} Diamonds
                        </span>
                        <span className="flex items-center gap-1 text-base font-bold text-sky-400">
                          <DiamondIcon className="h-4 w-4" />
                          <span>{b.diamondPrice}</span>
                        </span>
                      </div>
                      <button
                        disabled={owned}
                        onClick={() => {
                          if (canAfford) {
                            soundEngine.playJackpot();
                            onPurchaseBundle(b);
                          } else {
                            soundEngine.playClick();
                            onOpenTopUp();
                          }
                        }}
                        className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                          owned
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 cursor-default'
                            : canAfford
                            ? 'bg-gradient-to-b from-amber-400 to-orange-600 text-slate-950 hover:brightness-110'
                            : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                        }`}
                      >
                        {owned ? (
                          'Bundle Unlocked'
                        ) : canAfford ? (
                          <>
                            <DiamondIcon className="h-3.5 w-3.5" />
                            <span>Buy Bundle ({b.diamondPrice})</span>
                          </>
                        ) : (
                          `Top-Up Diamonds (${b.diamondPrice})`
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'characters' && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={charSearch}
                  onChange={(e) => setCharSearch(e.target.value)}
                  placeholder="Search character, real name or skill..."
                  className="w-full rounded-lg border border-white/15 bg-[#141a24] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredChars.map((skin) => {
                  const unlocked = profile.unlockedSkins.includes(skin.id);
                  const equipped = profile.selectedSkinId === skin.id;
                  const canAfford = profile.diamonds >= skin.diamondPrice;
                  return (
                    <div
                      key={skin.id}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 ${
                        equipped
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-white/10 bg-[#131922]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-3.5 w-3.5 rounded-sm shrink-0"
                              style={{ backgroundColor: skin.swatchHex }}
                            />
                            <span className="text-sm font-bold text-white truncate">{skin.name}</span>
                          </div>
                          <span className="text-[10px] font-mono-tabular text-slate-400 shrink-0">
                            {skin.fullName}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[11px] font-semibold text-amber-400">
                          {skin.skillName} · {skin.cooldown}s
                        </div>
                        <p className="mt-0.5 text-xs text-slate-300">{skin.skillDesc}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10">
                        {unlocked ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onSelectSkin(skin.id);
                            }}
                            className={`h-8 w-full rounded-md text-xs font-bold ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-[#1c2432] text-white hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            {equipped ? 'EQUIPPED' : 'EQUIP SURVIVOR'}
                          </button>
                        ) : skin.royaleOnly ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onOpenLuckRoyale();
                            }}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span>Spin in Luck Royale</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundEngine.playTopUpSuccess();
                                onUnlockSkin(skin.id, skin.diamondPrice);
                              } else {
                                soundEngine.playClick();
                                onOpenTopUp();
                              }
                            }}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400"
                          >
                            <DiamondIcon className="h-3.5 w-3.5" />
                            <span>
                              {canAfford
                                ? `Buy ${skin.diamondPrice} ◆`
                                : `Top-Up (${skin.diamondPrice} ◆)`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'weapons' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setWeaponFilter('all');
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-bold whitespace-nowrap shrink-0 ${
                    weaponFilter === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-[#171d28] text-slate-300 hover:text-white'
                  }`}
                >
                  All Guns
                </button>
                {(Object.keys(WEAPONS) as WeaponId[]).map((wId) => (
                  <button
                    key={wId}
                    onClick={() => {
                      soundEngine.playClick();
                      setWeaponFilter(wId);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-bold whitespace-nowrap shrink-0 ${
                      weaponFilter === wId
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-[#171d28] text-slate-300 hover:text-white'
                    }`}
                  >
                    {WEAPONS[wId].name}
                  </button>
                ))}
              </div>

              {inspectedWeaponSkin && (() => {
                const weaponDef = WEAPONS[inspectedWeaponSkin.weaponId];
                const unlocked = (profile.unlockedWeaponSkins || []).includes(inspectedWeaponSkin.id);
                const equippedId =
                  profile.equippedWeaponSkins?.[inspectedWeaponSkin.weaponId] ||
                  DEFAULT_EQUIPPED_WEAPON_SKINS[inspectedWeaponSkin.weaponId];
                const equipped = equippedId === inspectedWeaponSkin.id;
                const canAfford = profile.diamonds >= inspectedWeaponSkin.diamondPrice;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-4 rounded-xl border border-white/15 bg-[#131922] p-4 shadow-lg">
                    <div className="flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <span>{weaponDef.name}</span>
                            <span aria-hidden="true">·</span>
                            <span>{weaponDef.category}</span>
                            <span aria-hidden="true">·</span>
                            <span style={{ color: inspectedWeaponSkin.accentHex }}>
                              {inspectedWeaponSkin.rarity}
                            </span>
                          </div>
                          <h3 className="mt-0.5 font-display text-2xl font-bold tracking-wide text-white truncate">
                            {inspectedWeaponSkin.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-1">
                          <span
                            className="h-5 w-10 rounded-sm border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${inspectedWeaponSkin.primaryHex} 50%, ${inspectedWeaponSkin.accentHex} 50%)`,
                            }}
                            title="Skin Finish Swatch"
                          />
                        </div>
                      </div>

                      <div
                        className="relative flex flex-col items-center justify-center rounded-lg border border-white/10 px-4 py-3"
                        style={{
                          background: `radial-gradient(circle at 50% 45%, ${inspectedWeaponSkin.accentHex}1f, #0b0e13 76%)`,
                        }}
                      >
                        <WeaponSilhouette
                          weaponId={inspectedWeaponSkin.weaponId}
                          primaryHex={inspectedWeaponSkin.primaryHex}
                          accentHex={inspectedWeaponSkin.accentHex}
                          emissiveIntensity={inspectedWeaponSkin.emissiveIntensity}
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-mono-tabular text-slate-300">
                          <span>MAG {weaponDef.magSize}</span>
                          <span className="text-white/20">·</span>
                          <span>RELOAD {weaponDef.reloadTime}s</span>
                          <span className="text-white/20">·</span>
                          <span>HEADSHOT {weaponDef.headshotMult}×</span>
                        </div>
                      </div>

                      <div>
                        {unlocked ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onSelectWeaponSkin(inspectedWeaponSkin.weaponId, inspectedWeaponSkin.id);
                            }}
                            className={`h-9 w-full rounded-lg text-xs font-bold transition-colors ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            }`}
                          >
                            {equipped ? 'EQUIPPED IN LOADOUT' : 'EQUIP INSPECTED SKIN'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
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
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors"
                          >
                            <DiamondIcon className="h-3.5 w-3.5" />
                            <span>
                              {canAfford
                                ? `Unlock ${inspectedWeaponSkin.name} (${inspectedWeaponSkin.diamondPrice} ◆)`
                                : `Top-Up Diamonds (${inspectedWeaponSkin.diamondPrice} ◆)`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <WeaponStatsChart
                      weapon={weaponDef}
                      accentHex={inspectedWeaponSkin.accentHex}
                    />
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredWeaponSkins.map((ws) => {
                  const unlocked = (profile.unlockedWeaponSkins || []).includes(ws.id);
                  const equippedId =
                    profile.equippedWeaponSkins?.[ws.weaponId] ||
                    DEFAULT_EQUIPPED_WEAPON_SKINS[ws.weaponId];
                  const equipped = equippedId === ws.id;
                  const inspected = inspectedWeaponSkin?.id === ws.id;
                  const canAfford = profile.diamonds >= ws.diamondPrice;
                  return (
                    <div
                      key={ws.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        soundEngine.playClick();
                        setInspectedWeaponSkinId(ws.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          soundEngine.playClick();
                          setInspectedWeaponSkinId(ws.id);
                        }
                      }}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        inspected
                          ? 'border-sky-400 bg-sky-500/10'
                          : equipped
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-white/10 bg-[#131922] hover:border-white/25'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {WEAPONS[ws.weaponId].name} · {ws.rarity}
                          </span>
                          <span
                            className="h-4 w-8 rounded-sm border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${ws.primaryHex} 50%, ${ws.accentHex} 50%)`,
                            }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">{ws.name}</span>
                          {inspected && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-sky-300 shrink-0">
                              Inspecting
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10">
                        {unlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.playClick();
                              setInspectedWeaponSkinId(ws.id);
                              onSelectWeaponSkin(ws.weaponId, ws.id);
                            }}
                            className={`h-8 w-full rounded-md text-xs font-bold ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-[#1c2432] text-white hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            {equipped ? 'EQUIPPED' : 'EQUIP SKIN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedWeaponSkinId(ws.id);
                              if (canAfford) {
                                soundEngine.playTopUpSuccess();
                                onUnlockWeaponSkin(ws.id, ws.weaponId, ws.diamondPrice);
                              } else {
                                soundEngine.playClick();
                                onOpenTopUp();
                              }
                            }}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400"
                          >
                            <DiamondIcon className="h-3.5 w-3.5" />
                            <span>
                              {canAfford
                                ? `Unlock ${ws.diamondPrice} ◆`
                                : `Top-Up (${ws.diamondPrice} ◆)`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'emotes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-[#131922] px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-amber-300 tracking-wide">
                    3D VICTORY &amp; SQUAD EMOTES
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unlock emotes and equip up to 8 on your Emote Wheel (Lobby &amp; In-Match [T] Key).
                  </p>
                </div>
                <div className="font-mono-tabular text-xs font-bold text-emerald-300 shrink-0">
                  EQUIPPED: {equippedEmotes.length} / 8
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {EMOTE_CATALOG.map((em) => {
                  const unlocked = unlockedEmotes.includes(em.id);
                  const equipped = equippedEmotes.includes(em.id);
                  const canAfford = profile.diamonds >= em.diamondPrice;
                  const rarityColor =
                    em.rarity === 'mythic'
                      ? 'text-amber-300 border-amber-400/40 bg-amber-500/15'
                      : em.rarity === 'epic'
                      ? 'text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-500/15'
                      : em.rarity === 'rare'
                      ? 'text-sky-300 border-sky-400/40 bg-sky-500/15'
                      : 'text-slate-300 border-white/15 bg-white/5';

                  return (
                    <div
                      key={em.id}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 ${
                        equipped
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-white/10 bg-[#131922]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${rarityColor}`}>
                            {em.rarity}
                          </span>
                          <span className="text-[10px] font-mono-tabular text-slate-400">
                            {em.duration.toFixed(1)}s 3D Anim
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-sm shrink-0"
                            style={{ backgroundColor: em.accentHex }}
                          />
                          <div className="text-sm font-bold text-white truncate">{em.name}</div>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{em.subtitle}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10">
                        {unlocked ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onToggleEquipEmote(em.id);
                            }}
                            className={`h-8 w-full rounded-md text-xs font-bold ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                                : 'bg-[#1c2432] text-white hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            {equipped
                              ? 'EQUIPPED IN WHEEL'
                              : equippedEmotes.length >= 8
                              ? 'SWAP INTO WHEEL (8/8)'
                              : 'EQUIP TO WHEEL'}
                          </button>
                        ) : em.royaleOnly ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onOpenLuckRoyale();
                            }}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span>Spin in Emote Royale</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundEngine.playTopUpSuccess();
                                onUnlockEmote(em.id, em.diamondPrice);
                              } else {
                                soundEngine.playClick();
                                onOpenTopUp();
                              }
                            }}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400"
                          >
                            <DiamondIcon className="h-3.5 w-3.5" />
                            <span>
                              {canAfford
                                ? `Buy ${em.diamondPrice} ◆`
                                : `Top-Up (${em.diamondPrice} ◆)`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'vault' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h3 className="mb-2.5 font-display text-xl font-bold tracking-wide text-white">
                  PARACHUTE WINGS
                </h3>
                <div className="space-y-2.5">
                  {PARACHUTE_SKINS.map((p) => {
                    const unlocked = profile.unlockedParachutes.includes(p.id);
                    const equipped = profile.selectedParachuteId === p.id;
                    const canAfford = profile.diamonds >= p.diamondPrice;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-[#131922] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: p.hex }} />
                          <span className="text-sm font-bold text-white">{p.name}</span>
                        </div>
                        {unlocked ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onSelectParachute(p.id);
                            }}
                            className={`rounded px-3 py-1 text-xs font-bold ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-[#1e2636] text-white hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            {equipped ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundEngine.playTopUpSuccess();
                                onUnlockParachute(p.id, p.diamondPrice);
                              } else {
                                soundEngine.playClick();
                                onOpenTopUp();
                              }
                            }}
                            className="flex items-center gap-1 rounded bg-sky-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-sky-400"
                          >
                            <DiamondIcon className="h-3 w-3" />
                            <span>{p.diamondPrice}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-2.5 font-display text-xl font-bold tracking-wide text-white">
                  GLOO WALL SHIELDS
                </h3>
                <div className="space-y-2.5">
                  {GLOO_SKINS.map((g) => {
                    const unlocked = profile.unlockedGlooWalls.includes(g.id);
                    const equipped = profile.selectedGlooId === g.id;
                    const canAfford = profile.diamonds >= g.diamondPrice;
                    return (
                      <div
                        key={g.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-[#131922] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: g.hex }} />
                          <span className="text-sm font-bold text-white">{g.name}</span>
                        </div>
                        {unlocked ? (
                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onSelectGloo(g.id);
                            }}
                            className={`rounded px-3 py-1 text-xs font-bold ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-[#1e2636] text-white hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            {equipped ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundEngine.playTopUpSuccess();
                                onUnlockGloo(g.id, g.diamondPrice);
                              } else {
                                soundEngine.playClick();
                                onOpenTopUp();
                              }
                            }}
                            className="flex items-center gap-1 rounded bg-sky-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-sky-400"
                          >
                            <DiamondIcon className="h-3 w-3" />
                            <span>{g.diamondPrice}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'tokens' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-purple-500/35 bg-purple-950/25 px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-purple-300 tracking-wide">
                    FF TOKEN REDEEM EXCHANGE
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Earn FF Tokens from Luck Royale spins &amp; duplicate conversions, then redeem rare skins below.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono-tabular">
                  <span className="text-sm font-bold text-purple-300">
                    BALANCE: {profile.ffTokens.toLocaleString()} TOKENS
                  </span>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenLuckRoyale();
                    }}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    Spin Royale
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {STORE_FF_TOKEN_EXCHANGE.map((item) => {
                  const owned = isTokenItemOwned(item);
                  const canAfford = profile.ffTokens >= item.tokenCost;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#131922] p-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-2">
                          <span
                            className="h-7 w-7 rounded-md border border-white/20 shrink-0"
                            style={{ backgroundColor: item.swatchHex }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{item.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={owned || !canAfford}
                        onClick={() => {
                          soundEngine.playJackpot();
                          onRedeemTokenItem(item);
                        }}
                        className={`mt-3 h-8 w-full rounded-md text-xs font-bold font-mono-tabular transition-colors ${
                          owned
                            ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                            : canAfford
                            ? 'bg-purple-500 text-white hover:bg-purple-400'
                            : 'bg-[#1a202c] text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {owned ? 'OWNED' : `REDEEM · ${item.tokenCost} TOKENS`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
