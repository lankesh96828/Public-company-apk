import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_UNLOCKED_EMOTES,
  PlayerProfile,
  ROYALE_BANNERS,
  RoyaleBanner,
  RoyaleBannerId,
  RoyalePrize,
} from '../game/types';
import { Crown, ShoppingBag, Sparkles, Trophy, X } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { DiamondIcon } from './TopUpModal';

export interface SpinOutcome {
  prize: RoyalePrize;
  isDuplicate: boolean;
  convertedTokens: number;
}

interface LuckRoyaleModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onOpenTopUp: () => void;
  onOpenStoreTokens?: () => void;
  onCommitSpin: (
    bannerId: RoyaleBannerId,
    cost: number,
    currency: 'diamonds' | 'gold',
    outcomes: SpinOutcome[],
    nextLuck: number
  ) => void;
}

function pickWeightedPrize(banner: RoyaleBanner, currentLuck: number): { prize: RoyalePrize; resetLuck: boolean } {
  if (currentLuck >= 99) {
    const grand = banner.prizes.find((p) => p.id === banner.grandPrizeId) || banner.prizes[0];
    return { prize: grand, resetLuck: true };
  }
  const totalWeight = banner.prizes.reduce((acc, p) => acc + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < banner.prizes.length; i++) {
    r -= banner.prizes[i].weight;
    if (r <= 0) {
      return {
        prize: banner.prizes[i],
        resetLuck: banner.prizes[i].id === banner.grandPrizeId,
      };
    }
  }
  return { prize: banner.prizes[banner.prizes.length - 1], resetLuck: false };
}

export const LuckRoyaleModal: React.FC<LuckRoyaleModalProps> = ({
  profile,
  onClose,
  onOpenTopUp,
  onOpenStoreTokens,
  onCommitSpin,
}) => {
  const [bannerId, setBannerId] = useState<RoyaleBannerId>('diamond');
  const [spinning, setSpinning] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [results, setResults] = useState<SpinOutcome[] | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const banner = ROYALE_BANNERS.find((b) => b.id === bannerId) || ROYALE_BANNERS[0];
  const currentLuck =
    bannerId === 'diamond'
      ? profile.luckDiamond
      : bannerId === 'weapon'
      ? profile.luckWeapon
      : bannerId === 'emote'
      ? profile.luckEmote ?? 0
      : bannerId === 'faded'
      ? profile.luckFaded ?? 0
      : bannerId === 'gold'
      ? profile.luckGold
      : profile.luckIncubator;

  const balance = banner.currency === 'diamonds' ? profile.diamonds : profile.gold;
  const unlockedEmotes = profile.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES;

  const isAlreadyOwned = (prize: RoyalePrize, tempOwned: Set<string>): boolean => {
    if (!prize.refId) return false;
    if (tempOwned.has(`${prize.kind}:${prize.refId}`)) return true;
    if (prize.kind === 'skin') return profile.unlockedSkins.includes(prize.refId);
    if (prize.kind === 'weaponSkin') return (profile.unlockedWeaponSkins || []).includes(prize.refId);
    if (prize.kind === 'parachute') return profile.unlockedParachutes.includes(prize.refId);
    if (prize.kind === 'gloo') return profile.unlockedGlooWalls.includes(prize.refId);
    if (prize.kind === 'emote') return unlockedEmotes.includes(prize.refId);
    return false;
  };

  const handleSpin = (count: 1 | 11) => {
    if (spinning) return;
    const cost = count === 1 ? banner.singleCost : banner.tenPlusOneCost;
    if (balance < cost) {
      soundEngine.playClick();
      if (banner.currency === 'diamonds') onOpenTopUp();
      return;
    }

    setResults(null);
    setSpinning(true);

    // Pre-compute deterministic outcomes
    const outcomes: SpinOutcome[] = [];
    const tempOwned = new Set<string>();
    let luckCursor = currentLuck;

    for (let i = 0; i < count; i++) {
      const { prize, resetLuck } = pickWeightedPrize(banner, luckCursor);
      luckCursor = resetLuck ? 0 : Math.min(100, luckCursor + 1);
      const dup = isAlreadyOwned(prize, tempOwned);
      if (prize.refId && !dup) {
        tempOwned.add(`${prize.kind}:${prize.refId}`);
      }
      const convertedTokens = dup ? (prize.rarity === 'grand' ? 50 : prize.rarity === 'epic' ? 25 : 15) : 0;
      outcomes.push({ prize, isDuplicate: dup, convertedTokens });
    }

    const finalIdx = banner.prizes.findIndex((p) => p.id === outcomes[0].prize.id);
    const totalSteps = 14 + (finalIdx >= 0 ? finalIdx : 0);
    let step = 0;

    const advance = () => {
      setHighlightIdx(step % banner.prizes.length);
      soundEngine.playRouletteTick(step);
      step++;
      if (step <= totalSteps) {
        const delay = 45 + Math.floor((step / totalSteps) * 110);
        timerRef.current = window.setTimeout(advance, delay);
      } else {
        setSpinning(false);
        setResults(outcomes);
        onCommitSpin(bannerId, cost, banner.currency, outcomes, luckCursor);
        const hasJackpot = outcomes.some((o) => o.prize.rarity === 'grand' || o.prize.rarity === 'epic');
        if (hasJackpot) soundEngine.playJackpot();
        else soundEngine.playTopUpSuccess();
      }
    };

    advance();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0e1218] shadow-2xl max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121720] px-5 py-4">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-display text-3xl font-bold tracking-wider text-white leading-none">
                LUCK ROYALE
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Spin for Mythic Bundles, 3D Emotes, Wings &amp; Gloo Skins · Pity Guarantee at 100 Luck
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-3.5 rounded-lg border border-white/10 bg-[#0b0e13] px-3.5 py-1.5 text-xs font-mono-tabular">
              <div className="flex items-center gap-1.5">
                <DiamondIcon className="h-3.5 w-3.5" />
                <span className="font-bold text-sky-400">{profile.diamonds.toLocaleString()}</span>
              </div>
              <span className="text-white/15">|</span>
              <div>
                <span className="text-slate-400">GOLD </span>
                <span className="font-bold text-amber-400">{profile.gold.toLocaleString()}</span>
              </div>
              <span className="text-white/15">|</span>
              <div>
                <span className="text-slate-400">FF TOKENS </span>
                <span className="font-bold text-purple-400">{profile.ffTokens.toLocaleString()}</span>
              </div>
              {onOpenStoreTokens && (
                <>
                  <span className="text-white/15">|</span>
                  <button
                    disabled={spinning}
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenStoreTokens();
                    }}
                    className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[11px] font-bold text-purple-300 hover:bg-purple-500/35 disabled:opacity-50"
                  >
                    <ShoppingBag className="h-3 w-3" />
                    <span>Redeem</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => {
                if (spinning) return;
                soundEngine.playClick();
                onClose();
              }}
              aria-label="Close Luck Royale"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171d28] text-slate-300 hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Banner Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-[#10151d] px-5 py-2.5 overflow-x-auto">
          {ROYALE_BANNERS.map((b) => (
            <button
              key={b.id}
              disabled={spinning}
              onClick={() => {
                soundEngine.playClick();
                setBannerId(b.id);
                setHighlightIdx(null);
                setResults(null);
              }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors whitespace-nowrap ${
                bannerId === b.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#171d28] text-slate-300 hover:text-white'
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Banner Header + Luck Meter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#131922] p-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: banner.accentHex }}
                />
                <h3 className="font-display text-2xl font-bold tracking-wider text-white">
                  {banner.title}
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{banner.subtitle}</p>
            </div>

            <div className="w-full sm:w-64">
              <div className="mb-1 flex items-center justify-between text-xs font-mono-tabular">
                <span className="text-slate-400">LUCK PITY METER</span>
                <span className="font-bold text-amber-400">{currentLuck} / 100</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-sm bg-white/10">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, currentLuck)}%`,
                    backgroundColor: banner.accentHex,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 8-Tile Prize Wheel Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {banner.prizes.map((prize, idx) => {
              const isHighlighted = highlightIdx === idx;
              const owned =
                prize.refId &&
                ((prize.kind === 'skin' && profile.unlockedSkins.includes(prize.refId)) ||
                  (prize.kind === 'weaponSkin' && (profile.unlockedWeaponSkins || []).includes(prize.refId)) ||
                  (prize.kind === 'parachute' && profile.unlockedParachutes.includes(prize.refId)) ||
                  (prize.kind === 'gloo' && profile.unlockedGlooWalls.includes(prize.refId)) ||
                  (prize.kind === 'emote' && unlockedEmotes.includes(prize.refId)));

              const rarityBorder =
                prize.rarity === 'grand'
                  ? 'border-red-500/60 bg-[#1f1317]'
                  : prize.rarity === 'epic'
                  ? 'border-purple-500/50 bg-[#181424]'
                  : prize.rarity === 'rare'
                  ? 'border-sky-500/40 bg-[#121a26]'
                  : 'border-white/10 bg-[#141922]';

              return (
                <div
                  key={prize.id}
                  className={`relative flex flex-col justify-between rounded-lg border p-3.5 transition-all ${
                    isHighlighted
                      ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-500/15 scale-[1.02]'
                      : rarityBorder
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase">
                    <span
                      style={{
                        color:
                          prize.rarity === 'grand'
                            ? '#F87171'
                            : prize.rarity === 'epic'
                            ? '#C084FC'
                            : prize.rarity === 'rare'
                            ? '#38BDF8'
                            : '#94A3B8',
                      }}
                    >
                      {prize.rarity === 'grand' ? 'GRAND PRIZE' : prize.rarity}
                    </span>
                    {owned && <span className="text-emerald-400">OWNED</span>}
                  </div>

                  <div className="my-3 flex items-center gap-2.5">
                    <span
                      className="h-8 w-8 rounded-md border border-white/20 shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: prize.swatch }}
                    >
                      {prize.rarity === 'grand' && <Trophy className="h-4 w-4 text-white" />}
                    </span>
                    <div className="text-xs font-bold text-white leading-snug">{prize.label}</div>
                  </div>

                  <div className="text-[10px] font-mono-tabular text-slate-400">
                    Drop Weight {prize.weight}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spin Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              disabled={spinning}
              onClick={() => handleSpin(1)}
              className="flex h-12 items-center justify-between rounded-lg border border-white/15 bg-[#18202c] px-5 font-bold text-sm text-white hover:border-amber-400 disabled:opacity-60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>1x SPIN</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono-tabular text-amber-300">
                {banner.currency === 'diamonds' && <DiamondIcon className="h-4 w-4" />}
                <span>
                  {banner.singleCost.toLocaleString()} {banner.currency === 'gold' ? 'GOLD' : ''}
                </span>
              </span>
            </button>

            <button
              disabled={spinning}
              onClick={() => handleSpin(11)}
              className="flex h-12 items-center justify-between rounded-lg border border-amber-300/60 bg-gradient-to-b from-amber-400 to-orange-600 px-5 font-bold text-sm text-slate-950 hover:brightness-110 disabled:opacity-60 transition-all"
            >
              <span className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                <span>10 + 1 SPINS</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono-tabular">
                {banner.currency === 'diamonds' && <DiamondIcon className="h-4 w-4" />}
                <span>
                  {banner.tenPlusOneCost.toLocaleString()} {banner.currency === 'gold' ? 'GOLD' : ''}
                </span>
              </span>
            </button>
          </div>

          {/* Insufficient Currency Hint */}
          {balance < banner.singleCost && (
            <div className="flex items-center justify-between rounded-lg border border-sky-400/30 bg-sky-950/40 px-4 py-2.5 text-xs">
              <span className="text-sky-200">
                Not enough {banner.currency === 'diamonds' ? 'Diamonds' : 'Gold'} for this banner.
              </span>
              {banner.currency === 'diamonds' && (
                <button
                  onClick={onOpenTopUp}
                  className="rounded bg-sky-500 px-3 py-1 font-bold text-slate-950 hover:bg-sky-400"
                >
                  Top-Up Diamonds
                </button>
              )}
            </div>
          )}

          {/* Spin Results Reveal */}
          {results && (
            <div className="rounded-xl border border-amber-500/40 bg-[#141a24] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-display text-xl font-bold tracking-wider text-amber-400">
                  SPIN REWARDS ({results.length})
                </h4>
                <button
                  onClick={() => setResults(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-[#0d1117] px-2.5 py-2"
                  >
                    <span
                      className="h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: r.prize.swatch }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-white">{r.prize.label}</div>
                      {r.isDuplicate && (
                        <div className="text-[10px] font-mono-tabular text-purple-300">
                          Dup → +{r.convertedTokens} Tokens
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
