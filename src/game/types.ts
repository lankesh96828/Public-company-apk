export type GamePhase =
  | 'lobby'
  | 'plane'
  | 'parachute'
  | 'playing'
  | 'paused'
  | 'spectating'
  | 'gameover'
  | 'victory';

export type MapId = 'bermuda' | 'purgatory' | 'alpine';
export type MatchMode = 'br_classic' | 'br_blitz';
export type LobbyTab = 'home' | 'character' | 'weapons' | 'vault';

export interface MapMeta {
  id: MapId;
  name: string;
  fullName: string;
  dropZoneLabel: string;
  minimapGround: string;
  minimapWater: string;
}

export const MAP_CATALOG: Record<MapId, MapMeta> = {
  bermuda: {
    id: 'bermuda',
    name: 'Bermuda',
    fullName: 'BERMUDA ISLAND',
    dropZoneLabel: 'Coastal Drop Zone',
    minimapGround: '#2f4b29',
    minimapWater: '#092433',
  },
  purgatory: {
    id: 'purgatory',
    name: 'Purgatory',
    fullName: 'PURGATORY CANYON',
    dropZoneLabel: 'Canyon Drop Zone',
    minimapGround: '#7a5d3f',
    minimapWater: '#0c2d3b',
  },
  alpine: {
    id: 'alpine',
    name: 'Alpine',
    fullName: 'ALPINE SNOWPEAKS',
    dropZoneLabel: 'Highland Valley Drop',
    minimapGround: '#94a3b8',
    minimapWater: '#1e3a5f',
  },
};

export const NEXT_MAP_ID: Record<MapId, MapId> = {
  bermuda: 'purgatory',
  purgatory: 'alpine',
  alpine: 'bermuda',
};

export function normalizeMapId(raw: unknown): MapId {
  if (raw === 'purgatory' || raw === 'alpine') return raw;
  return 'bermuda';
}

export type WeaponId = 'ak47' | 'scar' | 'mp40' | 'm1887' | 'awm' | 'deagle';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  category: 'AR' | 'SMG' | 'SG' | 'SR' | 'HG';
  slotType: 'primary' | 'sidearm';
  damage: number;
  headshotMult: number;
  fireRate: number; // shots per second
  magSize: number;
  reloadTime: number; // seconds
  range: number;
  spread: number;
  adsSpread: number;
  pellets: number;
  recoil: number;
  adsFov: number;
  moveSpeedMult: number;
  auto: boolean;
  ammoType: 'AR' | 'SMG' | 'SG' | 'SR' | 'HG';
  accentColor: string;
  statBars: {
    damage: number;
    rate: number;
    range: number;
    accuracy: number;
  };
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ak47: {
    id: 'ak47',
    name: 'AK47',
    category: 'AR',
    slotType: 'primary',
    damage: 34,
    headshotMult: 2.2,
    fireRate: 7.2,
    magSize: 30,
    reloadTime: 1.9,
    range: 145,
    spread: 0.032,
    adsSpread: 0.011,
    pellets: 1,
    recoil: 0.022,
    adsFov: 52,
    moveSpeedMult: 0.94,
    auto: true,
    ammoType: 'AR',
    accentColor: '#F59E0B',
    statBars: { damage: 76, rate: 64, range: 74, accuracy: 62 },
  },
  scar: {
    id: 'scar',
    name: 'SCAR-Titan',
    category: 'AR',
    slotType: 'primary',
    damage: 29,
    headshotMult: 2.1,
    fireRate: 8.4,
    magSize: 30,
    reloadTime: 1.7,
    range: 140,
    spread: 0.022,
    adsSpread: 0.007,
    pellets: 1,
    recoil: 0.014,
    adsFov: 50,
    moveSpeedMult: 0.96,
    auto: true,
    ammoType: 'AR',
    accentColor: '#38BDF8',
    statBars: { damage: 66, rate: 74, range: 72, accuracy: 82 },
  },
  mp40: {
    id: 'mp40',
    name: 'MP40 Cobra',
    category: 'SMG',
    slotType: 'primary',
    damage: 21,
    headshotMult: 1.9,
    fireRate: 13.5,
    magSize: 28,
    reloadTime: 1.5,
    range: 75,
    spread: 0.038,
    adsSpread: 0.018,
    pellets: 1,
    recoil: 0.011,
    adsFov: 56,
    moveSpeedMult: 1.02,
    auto: true,
    ammoType: 'SMG',
    accentColor: '#EF4444',
    statBars: { damage: 48, rate: 96, range: 42, accuracy: 64 },
  },
  m1887: {
    id: 'm1887',
    name: 'M1887 One-Tap',
    category: 'SG',
    slotType: 'primary',
    damage: 20,
    headshotMult: 1.85,
    fireRate: 1.5,
    magSize: 2,
    reloadTime: 1.6,
    range: 34,
    spread: 0.085,
    adsSpread: 0.06,
    pellets: 8,
    recoil: 0.055,
    adsFov: 58,
    moveSpeedMult: 0.98,
    auto: false,
    ammoType: 'SG',
    accentColor: '#FB923C',
    statBars: { damage: 98, rate: 28, range: 26, accuracy: 54 },
  },
  awm: {
    id: 'awm',
    name: 'AWM Dragon',
    category: 'SR',
    slotType: 'primary',
    damage: 115,
    headshotMult: 2.6,
    fireRate: 0.72,
    magSize: 5,
    reloadTime: 2.5,
    range: 240,
    spread: 0.065,
    adsSpread: 0.001,
    pellets: 1,
    recoil: 0.068,
    adsFov: 22,
    moveSpeedMult: 0.88,
    auto: false,
    ammoType: 'SR',
    accentColor: '#22C55E',
    statBars: { damage: 100, rate: 18, range: 100, accuracy: 98 },
  },
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle',
    category: 'HG',
    slotType: 'sidearm',
    damage: 45,
    headshotMult: 2.3,
    fireRate: 2.8,
    magSize: 7,
    reloadTime: 1.4,
    range: 90,
    spread: 0.028,
    adsSpread: 0.009,
    pellets: 1,
    recoil: 0.032,
    adsFov: 56,
    moveSpeedMult: 1.04,
    auto: false,
    ammoType: 'HG',
    accentColor: '#E2E8F0',
    statBars: { damage: 82, rate: 42, range: 56, accuracy: 74 },
  },
};

export interface CharacterSkin {
  id: string;
  name: string;
  fullName: string;
  gender: 'male' | 'female';
  role: string;
  skillName: string;
  skillDesc: string;
  cooldown: number;
  jacketColor: number;
  accentColor: number;
  pantsColor: number;
  skinTone: number;
  hairColor: number;
  visorColor: number;
  swatchHex: string;
  diamondPrice: number;
  royaleOnly?: boolean;
}

export const CHARACTER_SKINS: CharacterSkin[] = [
  {
    id: 'alok',
    name: 'DJ Alok',
    fullName: 'Alok Achkar',
    gender: 'male',
    role: 'Drop the Beat',
    skillName: 'Drop the Beat',
    skillDesc: '+15% Move Speed & +35 HP over 5s aura',
    cooldown: 22,
    jacketColor: 0x991b1b,
    accentColor: 0xf59e0b,
    pantsColor: 0x111827,
    skinTone: 0xb97c4e,
    hairColor: 0x17171b,
    visorColor: 0xfbbf24,
    swatchHex: '#F59E0B',
    diamondPrice: 0,
  },
  {
    id: 'kelly',
    name: 'Kelly',
    fullName: 'Shimada Kiriko',
    gender: 'female',
    role: 'Track Sprinter',
    skillName: 'Deadly Dash',
    skillDesc: '+25% Sprint Speed for 6s',
    cooldown: 18,
    jacketColor: 0xfacc15,
    accentColor: 0x111827,
    pantsColor: 0x0f172a,
    skinTone: 0xe8b490,
    hairColor: 0x452b1a,
    visorColor: 0xfef08a,
    swatchHex: '#EAB308',
    diamondPrice: 120,
  },
  {
    id: 'hayato',
    name: 'Hayato',
    fullName: 'Hayato Yagami',
    gender: 'male',
    role: 'Shimada Samurai',
    skillName: 'Bushido Edge',
    skillDesc: '+30% Armor Penetration for 6s',
    cooldown: 20,
    jacketColor: 0x1e3a5f,
    accentColor: 0xdc2626,
    pantsColor: 0x141b29,
    skinTone: 0xdcb08e,
    hairColor: 0x0f172a,
    visorColor: 0xef4444,
    swatchHex: '#3B82F6',
    diamondPrice: 280,
  },
  {
    id: 'moco',
    name: 'Moco',
    fullName: 'Enigma Hacker',
    gender: 'female',
    role: 'Cyber Recon',
    skillName: 'Hacker’s Eye',
    skillDesc: 'Reveals nearby enemies on radar for 6s',
    cooldown: 20,
    jacketColor: 0x132a24,
    accentColor: 0x22c55e,
    pantsColor: 0x0f171e,
    skinTone: 0xd49b76,
    hairColor: 0x16a34a,
    visorColor: 0x4ade80,
    swatchHex: '#22C55E',
    diamondPrice: 220,
  },
  {
    id: 'chrono',
    name: 'Chrono',
    fullName: 'Cristiano · CR7',
    gender: 'male',
    role: 'Time Turner',
    skillName: 'Time Turner',
    skillDesc: 'Force-field Dome (65% Shield) & +18% Speed',
    cooldown: 24,
    jacketColor: 0x1e3a8a,
    accentColor: 0x38bdf8,
    pantsColor: 0x0f172a,
    skinTone: 0xd2976e,
    hairColor: 0x1c1917,
    visorColor: 0x38bdf8,
    swatchHex: '#38BDF8',
    diamondPrice: 400,
  },
  {
    id: 'k',
    name: 'K · Booyah',
    fullName: 'Captain Booyah',
    gender: 'male',
    role: 'Jiujitsu Master',
    skillName: 'Master of All',
    skillDesc: '+75 Instant EP & 3x Rapid EP→HP Heal',
    cooldown: 20,
    jacketColor: 0xdc2626,
    accentColor: 0xfef2f2,
    pantsColor: 0x18181b,
    skinTone: 0xc98a5b,
    hairColor: 0x7f1d1d,
    visorColor: 0xf87171,
    swatchHex: '#EF4444',
    diamondPrice: 340,
  },
  {
    id: 'skyler',
    name: 'Skyler',
    fullName: 'Sơn Tùng M-TP',
    gender: 'male',
    role: 'Sonic Superstar',
    skillName: 'Riptide Rhythm',
    skillDesc: 'Shatters nearby Gloo Walls & heals +45 HP',
    cooldown: 21,
    jacketColor: 0xe2e8f0,
    accentColor: 0x0ea5e9,
    pantsColor: 0x111827,
    skinTone: 0xe4b596,
    hairColor: 0xcbd5e1,
    visorColor: 0x38bdf8,
    swatchHex: '#E2E8F0',
    diamondPrice: 280,
  },
  {
    id: 'wukong',
    name: 'Wukong',
    fullName: 'Sun Wukong',
    gender: 'male',
    role: 'Monkey King',
    skillName: 'Camouflage',
    skillDesc: '+24% Sprint & 30% Damage Reduction for 6s',
    cooldown: 22,
    jacketColor: 0x7f1d1d,
    accentColor: 0xfbbf24,
    pantsColor: 0x1c1917,
    skinTone: 0xa66e43,
    hairColor: 0x5c2b16,
    visorColor: 0xfacc15,
    swatchHex: '#FBBF24',
    diamondPrice: 360,
  },
  {
    id: 'andrew',
    name: 'Andrew',
    fullName: 'Andrew Wolf',
    gender: 'male',
    role: 'Armor Specialist',
    skillName: 'Wolf Pack',
    skillDesc: '35% Bullet Shield & restores +100 Vest',
    cooldown: 22,
    jacketColor: 0x1e293b,
    accentColor: 0x3b82f6,
    pantsColor: 0x0f172a,
    skinTone: 0xc88d65,
    hairColor: 0x64748b,
    visorColor: 0x60a5fa,
    swatchHex: '#60A5FA',
    diamondPrice: 100,
  },
  {
    id: 'maxim',
    name: 'Maxim',
    fullName: 'Maxim Speedster',
    gender: 'male',
    role: 'Gluttony Rush',
    skillName: 'Gluttony',
    skillDesc: '+45 HP Instant Heal & +15% Move Speed',
    cooldown: 19,
    jacketColor: 0x1d4ed8,
    accentColor: 0xf97316,
    pantsColor: 0x1e293b,
    skinTone: 0xe0ac88,
    hairColor: 0x4a2c18,
    visorColor: 0xfb923c,
    swatchHex: '#2563EB',
    diamondPrice: 120,
  },
  {
    id: 'kla',
    name: 'Kla',
    fullName: 'Kla Muay Thai',
    gender: 'male',
    role: 'Close-Combat Striker',
    skillName: 'Muay Thai',
    skillDesc: '+35% Close-Range Damage (<25m) & +15% Speed',
    cooldown: 20,
    jacketColor: 0x9a3412,
    accentColor: 0xf59e0b,
    pantsColor: 0x18181b,
    skinTone: 0xaa6f44,
    hairColor: 0x111827,
    visorColor: 0xf59e0b,
    swatchHex: '#EA580C',
    diamondPrice: 160,
  },
  {
    id: 'paloma',
    name: 'Paloma',
    fullName: 'Paloma Arms Queen',
    gender: 'female',
    role: 'Ordnance Queen',
    skillName: 'Arms-Dealing',
    skillDesc: '+20% Weapon Damage & +30 Reserve Ammo',
    cooldown: 21,
    jacketColor: 0x881337,
    accentColor: 0xfbbf24,
    pantsColor: 0x18181b,
    skinTone: 0xdeb08c,
    hairColor: 0x1f1715,
    visorColor: 0xf43f5e,
    swatchHex: '#E11D48',
    diamondPrice: 180,
  },
  {
    id: 'caroline',
    name: 'Caroline',
    fullName: 'Caroline Vance',
    gender: 'female',
    role: 'Shotgun Prodigy',
    skillName: 'Agility',
    skillDesc: '+22% Move Speed for 6s',
    cooldown: 18,
    jacketColor: 0x1e3a8a,
    accentColor: 0xf472b6,
    pantsColor: 0x1e293b,
    skinTone: 0xf1c7ab,
    hairColor: 0xeab308,
    visorColor: 0xf472b6,
    swatchHex: '#F472B6',
    diamondPrice: 160,
  },
  {
    id: 'antonio',
    name: 'Antonio',
    fullName: 'Antonio Mafia',
    gender: 'male',
    role: 'Gangster Enforcer',
    skillName: 'Gangster’s Spirit',
    skillDesc: '+45 Instant HP & 20% Damage Reduction',
    cooldown: 22,
    jacketColor: 0x18181b,
    accentColor: 0xdc2626,
    pantsColor: 0x09090b,
    skinTone: 0xbf8256,
    hairColor: 0x0f172a,
    visorColor: 0xef4444,
    swatchHex: '#991B1B',
    diamondPrice: 200,
  },
  {
    id: 'laura',
    name: 'Laura',
    fullName: 'Laura Special Agent',
    gender: 'female',
    role: 'Sharp Shooter',
    skillName: 'Sharp Shooter',
    skillDesc: '+30% Armor Pen & Pinpoint ADS Accuracy',
    cooldown: 20,
    jacketColor: 0x0f172a,
    accentColor: 0x38bdf8,
    pantsColor: 0x1e293b,
    skinTone: 0xebbfa0,
    hairColor: 0xe2e8f0,
    visorColor: 0x38bdf8,
    swatchHex: '#0EA5E9',
    diamondPrice: 240,
  },
  {
    id: 'rafael',
    name: 'Rafael',
    fullName: 'Rafael Shadow',
    gender: 'male',
    role: 'Silent Marksman',
    skillName: 'Dead Silent',
    skillDesc: '+25% Armor Pen & +15% Move Speed',
    cooldown: 20,
    jacketColor: 0x27272a,
    accentColor: 0xef4444,
    pantsColor: 0x09090b,
    skinTone: 0xdeb08e,
    hairColor: 0xd4d4d8,
    visorColor: 0xef4444,
    swatchHex: '#F87171',
    diamondPrice: 240,
  },
  {
    id: 'a124',
    name: 'A124',
    fullName: 'A124 Android',
    gender: 'female',
    role: 'Combat Android',
    skillName: 'Thrill of Battle',
    skillDesc: 'Converts EP→HP (+55 HP) & +12% Speed',
    cooldown: 20,
    jacketColor: 0x4c1d95,
    accentColor: 0x22d3ee,
    pantsColor: 0x1e1b4b,
    skinTone: 0xf2ccb4,
    hairColor: 0xddd6fe,
    visorColor: 0x22d3ee,
    swatchHex: '#22D3EE',
    diamondPrice: 260,
  },
  {
    id: 'joseph',
    name: 'Joseph',
    fullName: 'Joseph Billionaire',
    gender: 'male',
    role: 'Tactical Veteran',
    skillName: 'Nutty Movement',
    skillDesc: '+25% Sprint Speed for 6s',
    cooldown: 19,
    jacketColor: 0xf8fafc,
    accentColor: 0x1d4ed8,
    pantsColor: 0x1e293b,
    skinTone: 0xd29c76,
    hairColor: 0xe2e8f0,
    visorColor: 0x60a5fa,
    swatchHex: '#93C5FD',
    diamondPrice: 180,
  },
  {
    id: 'steffie',
    name: 'Steffie',
    fullName: 'Steffie Graffiti',
    gender: 'female',
    role: 'Refuge Artist',
    skillName: 'Painted Refuge',
    skillDesc: '30% Bullet Shield & +20 Instant HP',
    cooldown: 21,
    jacketColor: 0xbe185d,
    accentColor: 0x2dd4bf,
    pantsColor: 0x1e293b,
    skinTone: 0xd9a17a,
    hairColor: 0xec4899,
    visorColor: 0x2dd4bf,
    swatchHex: '#EC4899',
    diamondPrice: 220,
  },
  {
    id: 'kapella',
    name: 'Kapella',
    fullName: 'Kapella Pop Star',
    gender: 'female',
    role: 'Healing Idol',
    skillName: 'Healing Song',
    skillDesc: '+40 Instant HP & +30 HP Song Aura',
    cooldown: 21,
    jacketColor: 0x701a75,
    accentColor: 0xf9a8d4,
    pantsColor: 0x3b0764,
    skinTone: 0xf2c8ab,
    hairColor: 0xfde047,
    visorColor: 0xf472b6,
    swatchHex: '#F9A8D4',
    diamondPrice: 240,
  },
  {
    id: 'orion',
    name: 'Orion',
    fullName: 'Orion Crimson',
    gender: 'male',
    role: 'Crimson Energy',
    skillName: 'Crimson Crush',
    skillDesc: '35% Damage Shield & +25 Instant HP',
    cooldown: 22,
    jacketColor: 0x450a0a,
    accentColor: 0xef4444,
    pantsColor: 0x18181b,
    skinTone: 0xbb7d52,
    hairColor: 0x1c1917,
    visorColor: 0xdc2626,
    swatchHex: '#DC2626',
    diamondPrice: 320,
  },
  {
    id: 'tatsuya',
    name: 'Tatsuya',
    fullName: 'Tatsuya Rebel',
    gender: 'male',
    role: 'Rebel Sprinter',
    skillName: 'Rebel Rush',
    skillDesc: '+30% Rebel Dash Sprint Burst for 6s',
    cooldown: 19,
    jacketColor: 0x18181b,
    accentColor: 0xef4444,
    pantsColor: 0x27272a,
    skinTone: 0xdcb08e,
    hairColor: 0x111827,
    visorColor: 0xf87171,
    swatchHex: '#FB7185',
    diamondPrice: 320,
  },
  {
    id: 'criminal_red',
    name: 'Red Criminal',
    fullName: 'Top Criminal (Red)',
    gender: 'male',
    role: 'Top Criminal',
    skillName: 'Phantom Surge',
    skillDesc: '+22% Sprint & +30 HP Instant Boost',
    cooldown: 19,
    jacketColor: 0xb91c1c,
    accentColor: 0xfef08a,
    pantsColor: 0x991b1b,
    skinTone: 0xe2b594,
    hairColor: 0x7f1d1d,
    visorColor: 0xfacc15,
    swatchHex: '#DC2626',
    diamondPrice: 600,
    royaleOnly: true,
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop S2',
    fullName: 'Street Boy · S2',
    gender: 'male',
    role: 'Season 2 Legend',
    skillName: 'Rhythm Rush',
    skillDesc: '+20% Move Speed & +25% Armor Pen',
    cooldown: 20,
    jacketColor: 0x6d28d9,
    accentColor: 0xf59e0b,
    pantsColor: 0x1f2937,
    skinTone: 0xb97a4b,
    hairColor: 0x111827,
    visorColor: 0xfbbf24,
    swatchHex: '#8B5CF6',
    diamondPrice: 550,
    royaleOnly: true,
  },
  {
    id: 'criminal_blue',
    name: 'Blue Criminal',
    fullName: 'Top Criminal (Blue)',
    gender: 'male',
    role: 'Top Criminal',
    skillName: 'Phantom Surge',
    skillDesc: '+22% Sprint & +30 HP Instant Boost',
    cooldown: 19,
    jacketColor: 0x1d4ed8,
    accentColor: 0x38bdf8,
    pantsColor: 0x1e3a8a,
    skinTone: 0xe2b594,
    hairColor: 0x0f172a,
    visorColor: 0x38bdf8,
    swatchHex: '#2563EB',
    diamondPrice: 600,
    royaleOnly: true,
  },
  {
    id: 'criminal_purple',
    name: 'Purple Criminal',
    fullName: 'Top Criminal (Purple)',
    gender: 'male',
    role: 'Top Criminal',
    skillName: 'Phantom Surge',
    skillDesc: '+22% Sprint & +30 HP Instant Boost',
    cooldown: 19,
    jacketColor: 0x7e22ce,
    accentColor: 0xf0abfc,
    pantsColor: 0x581c87,
    skinTone: 0xe2b594,
    hairColor: 0x3b0764,
    visorColor: 0xe879f9,
    swatchHex: '#9333EA',
    diamondPrice: 540,
  },
  {
    id: 'sakura',
    name: 'Sakura S1',
    fullName: 'Sakura Blossom Oni',
    gender: 'male',
    role: 'Season 1 Legend',
    skillName: 'Bushido Edge',
    skillDesc: '+30% Armor Pen & +25 Instant HP',
    cooldown: 20,
    jacketColor: 0xbe185d,
    accentColor: 0xfbcfe8,
    pantsColor: 0x1e1b4b,
    skinTone: 0xe8c0a0,
    hairColor: 0xf472b6,
    visorColor: 0xf472b6,
    swatchHex: '#EC4899',
    diamondPrice: 480,
  },
  {
    id: 'bunny_warrior',
    name: 'Bunny Warrior',
    fullName: 'Neon Bunny Striker',
    gender: 'male',
    role: 'Faded Striker',
    skillName: 'Deadly Dash',
    skillDesc: '+25% Sprint Speed & +15% Fire Agility',
    cooldown: 18,
    jacketColor: 0x0f766e,
    accentColor: 0x2dd4bf,
    pantsColor: 0x111827,
    skinTone: 0xdcb08e,
    hairColor: 0xf8fafc,
    visorColor: 0x2dd4bf,
    swatchHex: '#14B8A6',
    diamondPrice: 380,
  },
  {
    id: 'cobra_kai',
    name: 'Cobra Rage',
    fullName: 'Legendary Cobra',
    gender: 'male',
    role: 'Legendary Evo Bundle',
    skillName: 'Crimson Crush',
    skillDesc: '35% Damage Shield & +25 Instant HP',
    cooldown: 21,
    jacketColor: 0x991b1b,
    accentColor: 0xfbbf24,
    pantsColor: 0x09090b,
    skinTone: 0xc98a5b,
    hairColor: 0xfef08a,
    visorColor: 0xef4444,
    swatchHex: '#EF4444',
    diamondPrice: 580,
  },
];

export interface WeaponSkin {
  id: string;
  weaponId: WeaponId;
  name: string;
  rarity: 'standard' | 'rare' | 'epic' | 'evo';
  primaryColor: number;
  accentColor: number;
  metalColor: number;
  emissiveColor: number;
  emissiveIntensity: number;
  primaryHex: string;
  accentHex: string;
  diamondPrice: number;
}

export const WEAPON_SKINS: WeaponSkin[] = [
  // AK47
  {
    id: 'ak47_default',
    weaponId: 'ak47',
    name: 'Factory Walnut',
    rarity: 'standard',
    primaryColor: 0x8a4b22,
    accentColor: 0xf59e0b,
    metalColor: 0x1e242e,
    emissiveColor: 0x000000,
    emissiveIntensity: 0,
    primaryHex: '#8A4B22',
    accentHex: '#F59E0B',
    diamondPrice: 0,
  },
  {
    id: 'ak47_blue_flame',
    weaponId: 'ak47',
    name: 'Blue Flame Draco',
    rarity: 'evo',
    primaryColor: 0x0f172a,
    accentColor: 0x38bdf8,
    metalColor: 0x1e3a8a,
    emissiveColor: 0x0ea5e9,
    emissiveIntensity: 0.75,
    primaryHex: '#0F172A',
    accentHex: '#38BDF8',
    diamondPrice: 280,
  },
  {
    id: 'ak47_flaming_red',
    weaponId: 'ak47',
    name: 'Flaming Red',
    rarity: 'epic',
    primaryColor: 0x7f1d1d,
    accentColor: 0xf97316,
    metalColor: 0x18181b,
    emissiveColor: 0xea580c,
    emissiveIntensity: 0.55,
    primaryHex: '#7F1D1D',
    accentHex: '#F97316',
    diamondPrice: 180,
  },
  {
    id: 'ak47_gold',
    weaponId: 'ak47',
    name: 'Golden Baron',
    rarity: 'rare',
    primaryColor: 0x5c3416,
    accentColor: 0xfbbf24,
    metalColor: 0xd97706,
    emissiveColor: 0xf59e0b,
    emissiveIntensity: 0.2,
    primaryHex: '#D97706',
    accentHex: '#FBBF24',
    diamondPrice: 120,
  },

  // SCAR-Titan
  {
    id: 'scar_default',
    weaponId: 'scar',
    name: 'Titan Tactical',
    rarity: 'standard',
    primaryColor: 0xb89b6a,
    accentColor: 0x38bdf8,
    metalColor: 0x1e242e,
    emissiveColor: 0x0284c7,
    emissiveIntensity: 0.35,
    primaryHex: '#B89B6A',
    accentHex: '#38BDF8',
    diamondPrice: 0,
  },
  {
    id: 'scar_megalodon',
    weaponId: 'scar',
    name: 'Megalodon Alpha',
    rarity: 'evo',
    primaryColor: 0x18181b,
    accentColor: 0xef4444,
    metalColor: 0x334155,
    emissiveColor: 0xdc2626,
    emissiveIntensity: 0.8,
    primaryHex: '#18181B',
    accentHex: '#EF4444',
    diamondPrice: 280,
  },
  {
    id: 'scar_cupid',
    weaponId: 'scar',
    name: 'Cupid Neon',
    rarity: 'epic',
    primaryColor: 0xfbcfe8,
    accentColor: 0xec4899,
    metalColor: 0xf8fafc,
    emissiveColor: 0xdb2777,
    emissiveIntensity: 0.5,
    primaryHex: '#FBCFE8',
    accentHex: '#EC4899',
    diamondPrice: 160,
  },
  {
    id: 'scar_arctic',
    weaponId: 'scar',
    name: 'Arctic Titan',
    rarity: 'rare',
    primaryColor: 0xe2e8f0,
    accentColor: 0x22d3ee,
    metalColor: 0x64748b,
    emissiveColor: 0x06b6d4,
    emissiveIntensity: 0.35,
    primaryHex: '#E2E8F0',
    accentHex: '#22D3EE',
    diamondPrice: 120,
  },

  // MP40 Cobra
  {
    id: 'mp40_default',
    weaponId: 'mp40',
    name: 'Cobra Classic',
    rarity: 'standard',
    primaryColor: 0x1e242e,
    accentColor: 0xef4444,
    metalColor: 0x475569,
    emissiveColor: 0x000000,
    emissiveIntensity: 0,
    primaryHex: '#1E242E',
    accentHex: '#EF4444',
    diamondPrice: 0,
  },
  {
    id: 'mp40_predatory',
    weaponId: 'mp40',
    name: 'Predatory Cobra',
    rarity: 'evo',
    primaryColor: 0x450a0a,
    accentColor: 0xf87171,
    metalColor: 0x09090b,
    emissiveColor: 0xef4444,
    emissiveIntensity: 0.85,
    primaryHex: '#450A0A',
    accentHex: '#F87171',
    diamondPrice: 260,
  },
  {
    id: 'mp40_poker_gold',
    weaponId: 'mp40',
    name: 'Royal Flush Gold',
    rarity: 'epic',
    primaryColor: 0xfbbf24,
    accentColor: 0x111827,
    metalColor: 0xd97706,
    emissiveColor: 0xf59e0b,
    emissiveIntensity: 0.4,
    primaryHex: '#FBBF24',
    accentHex: '#111827',
    diamondPrice: 180,
  },
  {
    id: 'mp40_lightning',
    weaponId: 'mp40',
    name: 'Lightning Strike',
    rarity: 'rare',
    primaryColor: 0x3b0764,
    accentColor: 0x22d3ee,
    metalColor: 0x581c87,
    emissiveColor: 0x06b6d4,
    emissiveIntensity: 0.55,
    primaryHex: '#581C87',
    accentHex: '#22D3EE',
    diamondPrice: 120,
  },

  // M1887
  {
    id: 'm1887_default',
    weaponId: 'm1887',
    name: 'One-Tap Brass',
    rarity: 'standard',
    primaryColor: 0x6b3a1e,
    accentColor: 0xfb923c,
    metalColor: 0x475569,
    emissiveColor: 0x000000,
    emissiveIntensity: 0,
    primaryHex: '#6B3A1E',
    accentHex: '#FB923C',
    diamondPrice: 0,
  },
  {
    id: 'm1887_tropical',
    weaponId: 'm1887',
    name: 'Tropical Parrot',
    rarity: 'epic',
    primaryColor: 0x065f46,
    accentColor: 0xfacc15,
    metalColor: 0xdc2626,
    emissiveColor: 0x10b981,
    emissiveIntensity: 0.45,
    primaryHex: '#065F46',
    accentHex: '#FACC15',
    diamondPrice: 200,
  },
  {
    id: 'm1887_rapper',
    weaponId: 'm1887',
    name: 'Rapper Underworld',
    rarity: 'epic',
    primaryColor: 0x1e1b4b,
    accentColor: 0xc084fc,
    metalColor: 0xfbbf24,
    emissiveColor: 0xa855f7,
    emissiveIntensity: 0.6,
    primaryHex: '#1E1B4B',
    accentHex: '#C084FC',
    diamondPrice: 220,
  },
  {
    id: 'm1887_sterling',
    weaponId: 'm1887',
    name: 'Sterling Conqueror',
    rarity: 'evo',
    primaryColor: 0xe2e8f0,
    accentColor: 0x38bdf8,
    metalColor: 0x1e3a8a,
    emissiveColor: 0x0ea5e9,
    emissiveIntensity: 0.72,
    primaryHex: '#E2E8F0',
    accentHex: '#38BDF8',
    diamondPrice: 260,
  },

  // AWM
  {
    id: 'awm_default',
    weaponId: 'awm',
    name: 'Dragon Olive',
    rarity: 'standard',
    primaryColor: 0x2f4f38,
    accentColor: 0x22c55e,
    metalColor: 0x1e242e,
    emissiveColor: 0x16a34a,
    emissiveIntensity: 0.45,
    primaryHex: '#2F4F38',
    accentHex: '#22C55E',
    diamondPrice: 0,
  },
  {
    id: 'awm_duke',
    weaponId: 'awm',
    name: 'Duke Swallowtail',
    rarity: 'epic',
    primaryColor: 0x7f1d1d,
    accentColor: 0xfbbf24,
    metalColor: 0x18181b,
    emissiveColor: 0xf59e0b,
    emissiveIntensity: 0.55,
    primaryHex: '#7F1D1D',
    accentHex: '#FBBF24',
    diamondPrice: 200,
  },
  {
    id: 'awm_cyber',
    weaponId: 'awm',
    name: 'Cyber Bounty',
    rarity: 'evo',
    primaryColor: 0x090d16,
    accentColor: 0x4ade80,
    metalColor: 0x334155,
    emissiveColor: 0x22c55e,
    emissiveIntensity: 0.8,
    primaryHex: '#090D16',
    accentHex: '#4ADE80',
    diamondPrice: 250,
  },

  // Desert Eagle
  {
    id: 'deagle_default',
    weaponId: 'deagle',
    name: 'Chrome Eagle',
    rarity: 'standard',
    primaryColor: 0xd1d5db,
    accentColor: 0x1e242e,
    metalColor: 0x94a3b8,
    emissiveColor: 0x000000,
    emissiveIntensity: 0,
    primaryHex: '#D1D5DB',
    accentHex: '#1E242E',
    diamondPrice: 0,
  },
  {
    id: 'deagle_golden',
    weaponId: 'deagle',
    name: 'Golden Vow',
    rarity: 'rare',
    primaryColor: 0xfbbf24,
    accentColor: 0x18181b,
    metalColor: 0xd97706,
    emissiveColor: 0xf59e0b,
    emissiveIntensity: 0.25,
    primaryHex: '#FBBF24',
    accentHex: '#18181B',
    diamondPrice: 120,
  },
  {
    id: 'deagle_crimson',
    weaponId: 'deagle',
    name: 'Crimson Heir',
    rarity: 'epic',
    primaryColor: 0x991b1b,
    accentColor: 0xf87171,
    metalColor: 0x09090b,
    emissiveColor: 0xef4444,
    emissiveIntensity: 0.5,
    primaryHex: '#991B1B',
    accentHex: '#F87171',
    diamondPrice: 160,
  },
  {
    id: 'ak47_unicorn',
    weaponId: 'ak47',
    name: 'Unicorn Rage',
    rarity: 'epic',
    primaryColor: 0x86198f,
    accentColor: 0xf472b6,
    metalColor: 0xe2e8f0,
    emissiveColor: 0xec4899,
    emissiveIntensity: 0.62,
    primaryHex: '#86198F',
    accentHex: '#F472B6',
    diamondPrice: 210,
  },
  {
    id: 'scar_bloodmoon',
    weaponId: 'scar',
    name: 'Blood Moon',
    rarity: 'epic',
    primaryColor: 0x450a0a,
    accentColor: 0xfbbf24,
    metalColor: 0x18181b,
    emissiveColor: 0xdc2626,
    emissiveIntensity: 0.65,
    primaryHex: '#450A0A',
    accentHex: '#FBBF24',
    diamondPrice: 190,
  },
  {
    id: 'mp40_bunny',
    weaponId: 'mp40',
    name: 'Crazy Bunny',
    rarity: 'epic',
    primaryColor: 0x0f766e,
    accentColor: 0xfacc15,
    metalColor: 0x1e293b,
    emissiveColor: 0x14b8a6,
    emissiveIntensity: 0.58,
    primaryHex: '#0F766E',
    accentHex: '#FACC15',
    diamondPrice: 200,
  },
  {
    id: 'm1887_onepunch',
    weaponId: 'm1887',
    name: 'One Punch Man',
    rarity: 'evo',
    primaryColor: 0xb91c1c,
    accentColor: 0xfef08a,
    metalColor: 0xfacc15,
    emissiveColor: 0xef4444,
    emissiveIntensity: 0.85,
    primaryHex: '#B91C1C',
    accentHex: '#FEF08A',
    diamondPrice: 300,
  },
  {
    id: 'awm_lucky_koi',
    weaponId: 'awm',
    name: 'Lucky Koi',
    rarity: 'epic',
    primaryColor: 0x0c4a6e,
    accentColor: 0xfb923c,
    metalColor: 0xf8fafc,
    emissiveColor: 0x0ea5e9,
    emissiveIntensity: 0.6,
    primaryHex: '#0C4A6E',
    accentHex: '#FB923C',
    diamondPrice: 220,
  },
  {
    id: 'deagle_cyber',
    weaponId: 'deagle',
    name: 'Cyber Surge',
    rarity: 'evo',
    primaryColor: 0x090d16,
    accentColor: 0x22d3ee,
    metalColor: 0x334155,
    emissiveColor: 0x06b6d4,
    emissiveIntensity: 0.82,
    primaryHex: '#090D16',
    accentHex: '#22D3EE',
    diamondPrice: 240,
  },
];

export const DEFAULT_UNLOCKED_WEAPON_SKINS: string[] = WEAPON_SKINS.filter(
  (s) => s.diamondPrice === 0
).map((s) => s.id);

export const DEFAULT_EQUIPPED_WEAPON_SKINS: Record<WeaponId, string> = {
  ak47: 'ak47_default',
  scar: 'scar_default',
  mp40: 'mp40_default',
  m1887: 'm1887_default',
  awm: 'awm_default',
  deagle: 'deagle_default',
};

export interface VaultOption {
  id: string;
  name: string;
  color: number;
  accent: number;
  hex: string;
  diamondPrice: number;
}

export const PARACHUTE_SKINS: VaultOption[] = [
  { id: 'ember', name: 'Blaze Wing', color: 0xf97316, accent: 0x111827, hex: '#F97316', diamondPrice: 0 },
  { id: 'cobalt', name: 'Sky Strike', color: 0x0ea5e9, accent: 0xf8fafc, hex: '#0EA5E9', diamondPrice: 120 },
  { id: 'crimson', name: 'Crimson Ace', color: 0xdc2626, accent: 0xfbbf24, hex: '#DC2626', diamondPrice: 240 },
  { id: 'stealth', name: 'Shadow Ops', color: 0x1e293b, accent: 0x22c55e, hex: '#334155', diamondPrice: 300 },
  { id: 'phoenix', name: 'Phoenix Fire', color: 0xea580c, accent: 0xfef08a, hex: '#EA580C', diamondPrice: 340 },
  { id: 'cyber_wing', name: 'Cyber Glitch Wing', color: 0x7e22ce, accent: 0x22d3ee, hex: '#9333EA', diamondPrice: 360 },
];

export const GLOO_SKINS: VaultOption[] = [
  { id: 'frost', name: 'Cryo Shield', color: 0x38bdf8, accent: 0xe0f2fe, hex: '#38BDF8', diamondPrice: 0 },
  { id: 'amber', name: 'Titan Aegis', color: 0xf59e0b, accent: 0xfef3c7, hex: '#F59E0B', diamondPrice: 180 },
  { id: 'crimson', name: 'Blood Barrier', color: 0xef4444, accent: 0xfecaca, hex: '#EF4444', diamondPrice: 280 },
  { id: 'cobra_wall', name: 'Cobra Strike', color: 0x991b1b, accent: 0xfacc15, hex: '#B91C1C', diamondPrice: 320 },
  { id: 'booyah_day', name: 'Booyah Day Gold', color: 0xd97706, accent: 0xfef08a, hex: '#D97706', diamondPrice: 350 },
  { id: 'sakura_wall', name: 'Sakura Petals', color: 0xdb2777, accent: 0xfbcfe8, hex: '#EC4899', diamondPrice: 300 },
];

export interface EmoteDef {
  id: string;
  name: string;
  subtitle: string;
  rarity: 'standard' | 'rare' | 'epic' | 'mythic';
  duration: number;
  diamondPrice: number;
  accentHex: string;
  royaleOnly?: boolean;
}

export const EMOTE_CATALOG: EmoteDef[] = [
  {
    id: 'hello',
    name: 'Hi! Wave',
    subtitle: 'Friendly squad greeting & salute',
    rarity: 'standard',
    duration: 2.2,
    diamondPrice: 0,
    accentHex: '#38BDF8',
  },
  {
    id: 'booyah',
    name: 'BOOYAH! Victory',
    subtitle: 'Double fist-pump champion leap',
    rarity: 'rare',
    duration: 2.6,
    diamondPrice: 120,
    accentHex: '#F59E0B',
  },
  {
    id: 'dab',
    name: 'Dab',
    subtitle: 'Iconic sharp diagonal dab freeze',
    rarity: 'rare',
    duration: 2.2,
    diamondPrice: 140,
    accentHex: '#22C55E',
  },
  {
    id: 'lol',
    name: 'LOL Laugh',
    subtitle: 'Mocking belly-laugh & point taunt',
    rarity: 'rare',
    duration: 2.8,
    diamondPrice: 160,
    accentHex: '#FACC15',
  },
  {
    id: 'pushup',
    name: 'Push-Ups',
    subtitle: 'Drops horizontal for rapid combat reps',
    rarity: 'epic',
    duration: 3.2,
    diamondPrice: 200,
    accentHex: '#FB923C',
  },
  {
    id: 'heart',
    name: 'Heart Rose',
    subtitle: 'Gentleman kneel & radiant rose offer',
    rarity: 'epic',
    duration: 2.8,
    diamondPrice: 220,
    accentHex: '#EC4899',
  },
  {
    id: 'moonwalk',
    name: 'Moonwalk Groove',
    subtitle: 'Smooth backwards rhythm dance',
    rarity: 'epic',
    duration: 3.0,
    diamondPrice: 240,
    accentHex: '#A855F7',
  },
  {
    id: 'draco_flex',
    name: 'Draco Flex',
    subtitle: 'Weapon showcase + cyan power aura surge',
    rarity: 'mythic',
    duration: 3.0,
    diamondPrice: 320,
    accentHex: '#0EA5E9',
  },
  {
    id: 'flag',
    name: "Pirate's Flag",
    subtitle: 'Heroic slam & victory banner plant',
    rarity: 'mythic',
    duration: 3.0,
    diamondPrice: 350,
    accentHex: '#EF4444',
  },
  {
    id: 'throne',
    name: 'FFWS Throne',
    subtitle: 'Crossed-arms royal hover with gold aura',
    rarity: 'mythic',
    duration: 3.4,
    diamondPrice: 420,
    accentHex: '#FBBF24',
  },
];

export const DEFAULT_UNLOCKED_EMOTES: string[] = ['hello'];
export const DEFAULT_EQUIPPED_EMOTES: string[] = ['hello'];

export const DEFAULT_MERCHANT_UPI_ID = '9945901131-1@fam';

export interface TopUpPack {
  id: string;
  diamonds: number;
  bonus: number;
  inrAmount: number;
  priceLabel: string;
  tierLabel: string;
}

export const TOP_UP_PACKS: TopUpPack[] = [
  { id: 'pack_100', diamonds: 100, bonus: 20, inrAmount: 80, priceLabel: '₹80 / $0.99', tierLabel: 'Starter Drop' },
  { id: 'pack_310', diamonds: 310, bonus: 50, inrAmount: 240, priceLabel: '₹240 / $2.99', tierLabel: 'Popular' },
  { id: 'pack_520', diamonds: 520, bonus: 100, inrAmount: 400, priceLabel: '₹400 / $4.99', tierLabel: 'Squad Bundle' },
  { id: 'pack_1060', diamonds: 1060, bonus: 220, inrAmount: 800, priceLabel: '₹800 / $9.99', tierLabel: 'Elite Crate' },
  { id: 'pack_2180', diamonds: 2180, bonus: 500, inrAmount: 1600, priceLabel: '₹1,600 / $19.99', tierLabel: 'Heroic Pack' },
  { id: 'pack_5600', diamonds: 5600, bonus: 1400, inrAmount: 4000, priceLabel: '₹4,000 / $49.99', tierLabel: 'Grandmaster' },
];

export interface TopUpTransaction {
  id: string;
  orderId: string;
  paymentRef: string;
  method: 'razorpay_upi' | 'razorpay_qr' | 'direct_upi';
  merchantUpiId: string;
  payerUpiId: string;
  packId: string;
  amountInr: number;
  diamondsCredited: number;
  expectedDiamonds?: number;
  bonusDiamonds: number;
  status: 'pending_verification' | 'verified' | 'rejected';
  credited?: boolean;
  uid?: string;
  createdAt: number;
}

export interface TopUpMilestone {
  id: string;
  requiredDiamonds: number;
  title: string;
  rewardSummary: string;
  goldReward?: number;
  bonusDiamonds?: number;
  unlockSkinId?: string;
  unlockParachuteId?: string;
  unlockGlooId?: string;
}

export const TOP_UP_MILESTONES: TopUpMilestone[] = [
  {
    id: 'm_100',
    requiredDiamonds: 100,
    title: '100 Diamonds Top-Up',
    rewardSummary: '+1,500 Gold Bonus',
    goldReward: 1500,
  },
  {
    id: 'm_300',
    requiredDiamonds: 300,
    title: '300 Diamonds Top-Up',
    rewardSummary: 'Blood Barrier Gloo Wall',
    unlockGlooId: 'crimson',
  },
  {
    id: 'm_500',
    requiredDiamonds: 500,
    title: '500 Diamonds Top-Up',
    rewardSummary: 'Crimson Ace Parachute',
    unlockParachuteId: 'crimson',
  },
  {
    id: 'm_1000',
    requiredDiamonds: 1000,
    title: '1,000 Diamonds Top-Up',
    rewardSummary: 'Hayato + 250 Diamonds',
    unlockSkinId: 'hayato',
    bonusDiamonds: 250,
  },
];

export type VehicleType = 'sportscar' | 'pickup' | 'motorbike';
export type SeatRole = 'driver' | 'passenger';

export interface VehicleHudState {
  inVehicle: boolean;
  vehicleId: string | null;
  vehicleName: string;
  vehicleType: VehicleType | null;
  seatRole: SeatRole | null;
  speedKmh: number;
  vehicleHp: number;
  vehicleMaxHp: number;
  boostFuel: number;
  nearbyVehicleName: string | null;
  nearbyVehicleType: VehicleType | null;
  hasPassengerSeat: boolean;
}

export interface StoreTokenItem {
  id: string;
  name: string;
  subtitle: string;
  tokenCost: number;
  swatchHex: string;
  kind: 'skin' | 'weaponSkin' | 'parachute' | 'gloo' | 'emote' | 'gold';
  refId?: string;
  weaponId?: WeaponId;
  amount?: number;
}

export const STORE_FF_TOKEN_EXCHANGE: StoreTokenItem[] = [
  {
    id: 'tok_crimson_deagle',
    name: 'Crimson Heir · Deagle',
    subtitle: 'Epic Sidearm Skin',
    tokenCost: 45,
    swatchHex: '#991B1B',
    kind: 'weaponSkin',
    refId: 'deagle_crimson',
    weaponId: 'deagle',
  },
  {
    id: 'tok_cupid_scar',
    name: 'Cupid Neon · SCAR',
    subtitle: 'Epic Assault Rifle Skin',
    tokenCost: 60,
    swatchHex: '#EC4899',
    kind: 'weaponSkin',
    refId: 'scar_cupid',
    weaponId: 'scar',
  },
  {
    id: 'tok_tropical_m1887',
    name: 'Tropical Parrot · M1887',
    subtitle: 'Epic Shotgun Skin',
    tokenCost: 75,
    swatchHex: '#10B981',
    kind: 'weaponSkin',
    refId: 'm1887_tropical',
    weaponId: 'm1887',
  },
  {
    id: 'tok_unicorn_ak47',
    name: 'Unicorn Rage · AK47',
    subtitle: 'Epic Rifle Skin',
    tokenCost: 80,
    swatchHex: '#EC4899',
    kind: 'weaponSkin',
    refId: 'ak47_unicorn',
    weaponId: 'ak47',
  },
  {
    id: 'tok_emote_lol',
    name: 'LOL Laugh Emote',
    subtitle: 'Iconic Victory Taunt',
    tokenCost: 50,
    swatchHex: '#FACC15',
    kind: 'emote',
    refId: 'lol',
  },
  {
    id: 'tok_emote_pushup',
    name: 'Push-Ups Emote',
    subtitle: '3D Ground Combat Reps',
    tokenCost: 65,
    swatchHex: '#FB923C',
    kind: 'emote',
    refId: 'pushup',
  },
  {
    id: 'tok_kelly',
    name: 'Kelly · Shimada Kiriko',
    subtitle: 'Track Sprinter Character',
    tokenCost: 65,
    swatchHex: '#EAB308',
    kind: 'skin',
    refId: 'kelly',
  },
  {
    id: 'tok_bunny',
    name: 'Bunny Warrior',
    subtitle: 'Neon Bunny Bundle',
    tokenCost: 110,
    swatchHex: '#14B8A6',
    kind: 'skin',
    refId: 'bunny_warrior',
  },
  {
    id: 'tok_moco',
    name: 'Moco · Enigma Hacker',
    subtitle: 'Cyber Recon Character',
    tokenCost: 90,
    swatchHex: '#22C55E',
    kind: 'skin',
    refId: 'moco',
  },
  {
    id: 'tok_stealth_chute',
    name: 'Shadow Ops Wing',
    subtitle: 'Tactical Parachute',
    tokenCost: 55,
    swatchHex: '#334155',
    kind: 'parachute',
    refId: 'stealth',
  },
  {
    id: 'tok_amber_gloo',
    name: 'Titan Aegis Gloo',
    subtitle: 'Armored Gloo Wall',
    tokenCost: 50,
    swatchHex: '#F59E0B',
    kind: 'gloo',
    refId: 'amber',
  },
  {
    id: 'tok_gold_crate',
    name: '2,000 Gold Crate',
    subtitle: 'Instant Currency Exchange',
    tokenCost: 25,
    swatchHex: '#FBBF24',
    kind: 'gold',
    amount: 2000,
  },
];

export interface StoreBundle {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  diamondPrice: number;
  originalPrice: number;
  accentHex: string;
  skinId?: string;
  weaponSkinId?: string;
  weaponId?: WeaponId;
  parachuteId?: string;
  glooId?: string;
  emoteId?: string;
}

export const STORE_BUNDLES: StoreBundle[] = [
  {
    id: 'bundle_draco',
    title: 'BLUE FLAME DRACO PACK',
    subtitle: 'Chrono (CR7) + AK47 Blue Flame Draco + Draco Flex Emote',
    badge: 'EVO BUNDLE · -30%',
    diamondPrice: 540,
    originalPrice: 780,
    accentHex: '#38BDF8',
    skinId: 'chrono',
    weaponSkinId: 'ak47_blue_flame',
    weaponId: 'ak47',
    emoteId: 'draco_flex',
  },
  {
    id: 'bundle_cobra',
    title: 'LEGENDARY COBRA RAGE',
    subtitle: 'Cobra Rage + MP40 Predatory Cobra + Cobra Strike Gloo + Booyah Emote',
    badge: 'MYTHIC DROP · -28%',
    diamondPrice: 760,
    originalPrice: 1060,
    accentHex: '#EF4444',
    skinId: 'cobra_kai',
    weaponSkinId: 'mp40_predatory',
    weaponId: 'mp40',
    glooId: 'cobra_wall',
    emoteId: 'booyah',
  },
  {
    id: 'bundle_criminal_purple',
    title: 'PURPLE CRIMINAL SYNDICATE',
    subtitle: 'Purple Criminal + M1887 One Punch Man + FFWS Throne Emote',
    badge: 'CRIMINAL · -25%',
    diamondPrice: 820,
    originalPrice: 1100,
    accentHex: '#9333EA',
    skinId: 'criminal_purple',
    weaponSkinId: 'm1887_onepunch',
    weaponId: 'm1887',
    emoteId: 'throne',
  },
  {
    id: 'bundle_sakura',
    title: 'SAKURA SEASON 1 LEGACY',
    subtitle: 'Sakura S1 Oni + SCAR Blood Moon + Sakura Gloo + Heart Rose Emote',
    badge: 'S1 CLASSIC · -24%',
    diamondPrice: 720,
    originalPrice: 950,
    accentHex: '#EC4899',
    skinId: 'sakura',
    weaponSkinId: 'scar_bloodmoon',
    weaponId: 'scar',
    glooId: 'sakura_wall',
    emoteId: 'heart',
  },
  {
    id: 'bundle_samurai',
    title: 'BUSHIDO SAMURAI PACK',
    subtitle: "Hayato Yagami + Crimson Ace Wing + Blood Barrier + Pirate's Flag Emote",
    badge: 'LIMITED · -22%',
    diamondPrice: 680,
    originalPrice: 880,
    accentHex: '#F59E0B',
    skinId: 'hayato',
    parachuteId: 'crimson',
    glooId: 'crimson',
    emoteId: 'flag',
  },
  {
    id: 'bundle_bunny',
    title: 'NEON BUNNY RAMPAGE',
    subtitle: 'Bunny Warrior + MP40 Crazy Bunny + Cyber Glitch Wing + Dab Emote',
    badge: 'HOT PICK · -25%',
    diamondPrice: 640,
    originalPrice: 850,
    accentHex: '#14B8A6',
    skinId: 'bunny_warrior',
    weaponSkinId: 'mp40_bunny',
    weaponId: 'mp40',
    parachuteId: 'cyber_wing',
    emoteId: 'dab',
  },
  {
    id: 'bundle_booyah_gold',
    title: 'BOOYAH DAY GRANDMASTER',
    subtitle: 'K · Booyah + Deagle Cyber Surge + Booyah Day Gold Gloo + Moonwalk Emote',
    badge: 'ESPORTS · -25%',
    diamondPrice: 740,
    originalPrice: 990,
    accentHex: '#FBBF24',
    skinId: 'k',
    weaponSkinId: 'deagle_cyber',
    weaponId: 'deagle',
    glooId: 'booyah_day',
    emoteId: 'moonwalk',
  },
  {
    id: 'bundle_sniper_elite',
    title: 'CYBER BOUNTY SNIPER',
    subtitle: 'Laura Special Agent + AWM Lucky Koi + Phoenix Fire Wing',
    badge: 'SHARPSHOOTER · -22%',
    diamondPrice: 590,
    originalPrice: 760,
    accentHex: '#0EA5E9',
    skinId: 'laura',
    weaponSkinId: 'awm_lucky_koi',
    weaponId: 'awm',
    parachuteId: 'phoenix',
  },
];

export type RoyaleBannerId = 'diamond' | 'weapon' | 'emote' | 'faded' | 'gold' | 'incubator';

export interface RoyalePrize {
  id: string;
  label: string;
  rarity: 'grand' | 'epic' | 'rare' | 'common';
  weight: number;
  swatch: string;
  kind: 'skin' | 'weaponSkin' | 'parachute' | 'gloo' | 'emote' | 'diamonds' | 'gold' | 'tokens';
  refId?: string;
  weaponId?: WeaponId;
  amount?: number;
}

export interface RoyaleBanner {
  id: RoyaleBannerId;
  title: string;
  subtitle: string;
  currency: 'diamonds' | 'gold';
  singleCost: number;
  tenPlusOneCost: number;
  accentHex: string;
  grandPrizeId: string;
  prizes: RoyalePrize[];
}

export const ROYALE_BANNERS: RoyaleBanner[] = [
  {
    id: 'diamond',
    title: 'DIAMOND ROYALE',
    subtitle: 'Top Criminal Red & Blue + Sakura S1 · Guaranteed at 100 Luck',
    currency: 'diamonds',
    singleCost: 40,
    tenPlusOneCost: 360,
    accentHex: '#38BDF8',
    grandPrizeId: 'dr_criminal_blue',
    prizes: [
      { id: 'dr_criminal_blue', label: 'Blue Criminal Bundle', rarity: 'grand', weight: 3, swatch: '#2563EB', kind: 'skin', refId: 'criminal_blue' },
      { id: 'dr_criminal', label: 'Red Criminal Bundle', rarity: 'epic', weight: 4, swatch: '#DC2626', kind: 'skin', refId: 'criminal_red' },
      { id: 'dr_sakura', label: 'Sakura S1 Bundle', rarity: 'epic', weight: 6, swatch: '#EC4899', kind: 'skin', refId: 'sakura' },
      { id: 'dr_chute_phoenix', label: 'Phoenix Fire Wing', rarity: 'epic', weight: 9, swatch: '#EA580C', kind: 'parachute', refId: 'phoenix' },
      { id: 'dr_gloo_crimson', label: 'Blood Barrier Gloo', rarity: 'rare', weight: 12, swatch: '#EF4444', kind: 'gloo', refId: 'crimson' },
      { id: 'dr_dia_120', label: '120 Diamonds', rarity: 'rare', weight: 10, swatch: '#38BDF8', kind: 'diamonds', amount: 120 },
      { id: 'dr_tokens_15', label: '15 FF Tokens', rarity: 'common', weight: 22, swatch: '#A855F7', kind: 'tokens', amount: 15 },
      { id: 'dr_gold_800', label: '800 Gold', rarity: 'common', weight: 34, swatch: '#F59E0B', kind: 'gold', amount: 800 },
    ],
  },
  {
    id: 'weapon',
    title: 'WEAPON ROYALE',
    subtitle: 'Evo AK47 Draco, One Punch M1887 & Cyber Deagle · 100 Luck Guarantee',
    currency: 'diamonds',
    singleCost: 35,
    tenPlusOneCost: 315,
    accentHex: '#0EA5E9',
    grandPrizeId: 'wr_m1887_onepunch',
    prizes: [
      { id: 'wr_m1887_onepunch', label: 'M1887 · One Punch Man', rarity: 'grand', weight: 4, swatch: '#B91C1C', kind: 'weaponSkin', refId: 'm1887_onepunch', weaponId: 'm1887' },
      { id: 'wr_ak47_draco', label: 'AK47 · Blue Flame Draco', rarity: 'epic', weight: 5, swatch: '#0EA5E9', kind: 'weaponSkin', refId: 'ak47_blue_flame', weaponId: 'ak47' },
      { id: 'wr_scar_mega', label: 'SCAR · Megalodon Alpha', rarity: 'epic', weight: 7, swatch: '#EF4444', kind: 'weaponSkin', refId: 'scar_megalodon', weaponId: 'scar' },
      { id: 'wr_deagle_cyber', label: 'Deagle · Cyber Surge', rarity: 'epic', weight: 8, swatch: '#22D3EE', kind: 'weaponSkin', refId: 'deagle_cyber', weaponId: 'deagle' },
      { id: 'wr_awm_koi', label: 'AWM · Lucky Koi', rarity: 'rare', weight: 10, swatch: '#FB923C', kind: 'weaponSkin', refId: 'awm_lucky_koi', weaponId: 'awm' },
      { id: 'wr_mp40_bunny', label: 'MP40 · Crazy Bunny', rarity: 'rare', weight: 12, swatch: '#14B8A6', kind: 'weaponSkin', refId: 'mp40_bunny', weaponId: 'mp40' },
      { id: 'wr_tokens_20', label: '20 FF Tokens', rarity: 'common', weight: 22, swatch: '#C084FC', kind: 'tokens', amount: 20 },
      { id: 'wr_gold_900', label: '900 Gold', rarity: 'common', weight: 32, swatch: '#F59E0B', kind: 'gold', amount: 900 },
    ],
  },
  {
    id: 'emote',
    title: 'EMOTE ROYALE',
    subtitle: "FFWS Throne, Pirate's Flag, Draco Flex & Moonwalk · 3D Animations!",
    currency: 'diamonds',
    singleCost: 30,
    tenPlusOneCost: 270,
    accentHex: '#FBBF24',
    grandPrizeId: 'er_throne',
    prizes: [
      { id: 'er_throne', label: 'FFWS Throne Emote', rarity: 'grand', weight: 4, swatch: '#FBBF24', kind: 'emote', refId: 'throne' },
      { id: 'er_flag', label: "Pirate's Flag Emote", rarity: 'epic', weight: 7, swatch: '#EF4444', kind: 'emote', refId: 'flag' },
      { id: 'er_draco_flex', label: 'Draco Flex Emote', rarity: 'epic', weight: 8, swatch: '#0EA5E9', kind: 'emote', refId: 'draco_flex' },
      { id: 'er_moonwalk', label: 'Moonwalk Emote', rarity: 'rare', weight: 11, swatch: '#A855F7', kind: 'emote', refId: 'moonwalk' },
      { id: 'er_heart', label: 'Heart Rose Emote', rarity: 'rare', weight: 12, swatch: '#EC4899', kind: 'emote', refId: 'heart' },
      { id: 'er_pushup', label: 'Push-Ups Emote', rarity: 'rare', weight: 14, swatch: '#FB923C', kind: 'emote', refId: 'pushup' },
      { id: 'er_tokens_15', label: '15 FF Tokens', rarity: 'common', weight: 22, swatch: '#C084FC', kind: 'tokens', amount: 15 },
      { id: 'er_gold_750', label: '750 Gold', rarity: 'common', weight: 22, swatch: '#F59E0B', kind: 'gold', amount: 750 },
    ],
  },
  {
    id: 'faded',
    title: 'FADED WHEEL',
    subtitle: 'Mythic Cobra Rage + MP40 Predatory Cobra + Cobra Strike Gloo!',
    currency: 'diamonds',
    singleCost: 45,
    tenPlusOneCost: 400,
    accentHex: '#EF4444',
    grandPrizeId: 'fw_cobra_kai',
    prizes: [
      { id: 'fw_cobra_kai', label: 'Cobra Rage Bundle', rarity: 'grand', weight: 4, swatch: '#EF4444', kind: 'skin', refId: 'cobra_kai' },
      { id: 'fw_mp40_cobra', label: 'MP40 · Predatory Cobra', rarity: 'epic', weight: 7, swatch: '#DC2626', kind: 'weaponSkin', refId: 'mp40_predatory', weaponId: 'mp40' },
      { id: 'fw_gloo_cobra', label: 'Cobra Strike Gloo', rarity: 'epic', weight: 10, swatch: '#B91C1C', kind: 'gloo', refId: 'cobra_wall' },
      { id: 'fw_chute_cyber', label: 'Cyber Glitch Wing', rarity: 'rare', weight: 12, swatch: '#9333EA', kind: 'parachute', refId: 'cyber_wing' },
      { id: 'fw_emote_booyah', label: 'BOOYAH! Emote', rarity: 'rare', weight: 13, swatch: '#F59E0B', kind: 'emote', refId: 'booyah' },
      { id: 'fw_dia_150', label: '150 Diamonds', rarity: 'rare', weight: 9, swatch: '#38BDF8', kind: 'diamonds', amount: 150 },
      { id: 'fw_tokens_25', label: '25 FF Tokens', rarity: 'common', weight: 23, swatch: '#A855F7', kind: 'tokens', amount: 25 },
      { id: 'fw_gold_1000', label: '1,000 Gold', rarity: 'common', weight: 22, swatch: '#FBBF24', kind: 'gold', amount: 1000 },
    ],
  },
  {
    id: 'gold',
    title: 'GOLD ROYALE',
    subtitle: 'Season 2 Street Hip-Hop & Bunny Warrior · Spin with Match Gold',
    currency: 'gold',
    singleCost: 300,
    tenPlusOneCost: 3000,
    accentHex: '#F59E0B',
    grandPrizeId: 'gr_hiphop',
    prizes: [
      { id: 'gr_hiphop', label: 'Hip-Hop S2 Bundle', rarity: 'grand', weight: 4, swatch: '#8B5CF6', kind: 'skin', refId: 'hiphop' },
      { id: 'gr_bunny', label: 'Bunny Warrior', rarity: 'epic', weight: 6, swatch: '#14B8A6', kind: 'skin', refId: 'bunny_warrior' },
      { id: 'gr_kelly', label: 'Kelly', rarity: 'epic', weight: 8, swatch: '#EAB308', kind: 'skin', refId: 'kelly' },
      { id: 'gr_emote_dab', label: 'Dab Emote', rarity: 'rare', weight: 10, swatch: '#22C55E', kind: 'emote', refId: 'dab' },
      { id: 'gr_chute_cobalt', label: 'Sky Strike Wing', rarity: 'rare', weight: 11, swatch: '#0EA5E9', kind: 'parachute', refId: 'cobalt' },
      { id: 'gr_dia_50', label: '50 Diamonds', rarity: 'rare', weight: 10, swatch: '#38BDF8', kind: 'diamonds', amount: 50 },
      { id: 'gr_tokens_10', label: '10 FF Tokens', rarity: 'common', weight: 23, swatch: '#A855F7', kind: 'tokens', amount: 10 },
      { id: 'gr_gold_600', label: '600 Gold', rarity: 'common', weight: 28, swatch: '#F59E0B', kind: 'gold', amount: 600 },
    ],
  },
  {
    id: 'incubator',
    title: 'HERO INCUBATOR',
    subtitle: 'Purple Criminal, Booyah Day Gloo & 250 Diamond Jackpots',
    currency: 'diamonds',
    singleCost: 35,
    tenPlusOneCost: 315,
    accentHex: '#9333EA',
    grandPrizeId: 'inc_criminal_purple',
    prizes: [
      { id: 'inc_criminal_purple', label: 'Purple Criminal Bundle', rarity: 'grand', weight: 4, swatch: '#9333EA', kind: 'skin', refId: 'criminal_purple' },
      { id: 'inc_hayato', label: 'Hayato', rarity: 'epic', weight: 6, swatch: '#3B82F6', kind: 'skin', refId: 'hayato' },
      { id: 'inc_dia_250', label: '250 Diamonds', rarity: 'epic', weight: 7, swatch: '#38BDF8', kind: 'diamonds', amount: 250 },
      { id: 'inc_gloo_booyah', label: 'Booyah Day Gold Gloo', rarity: 'epic', weight: 10, swatch: '#D97706', kind: 'gloo', refId: 'booyah_day' },
      { id: 'inc_gloo_sakura', label: 'Sakura Petals Gloo', rarity: 'rare', weight: 12, swatch: '#EC4899', kind: 'gloo', refId: 'sakura_wall' },
      { id: 'inc_tokens_25', label: '25 FF Tokens', rarity: 'rare', weight: 18, swatch: '#A855F7', kind: 'tokens', amount: 25 },
      { id: 'inc_gold_1500', label: '1,500 Gold', rarity: 'common', weight: 23, swatch: '#F59E0B', kind: 'gold', amount: 1500 },
      { id: 'inc_tokens_12', label: '12 FF Tokens', rarity: 'common', weight: 20, swatch: '#C084FC', kind: 'tokens', amount: 12 },
    ],
  },
];

export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  gold: number;
  diamonds: number;
  ffTokens: number;
  luckDiamond: number;
  luckGold: number;
  luckWeapon: number;
  luckIncubator: number;
  luckEmote: number;
  luckFaded: number;
  totalTopUpDiamonds: number;
  claimedTopUpMilestones: string[];
  unlockedSkins: string[];
  unlockedParachutes: string[];
  unlockedGlooWalls: string[];
  unlockedWeaponSkins: string[];
  unlockedEmotes: string[];
  equippedEmotes: string[];
  wins: number;
  kills: number;
  matches: number;
  rankPoints: number;
  selectedSkinId: string;
  selectedLobbyWeapon: WeaponId;
  selectedParachuteId: string;
  selectedGlooId: string;
  equippedWeaponSkins: Record<WeaponId, string>;
  sensitivity: number;
}

export interface MultiplayerRosterPlayer {
  id: string;
  name: string;
  skinId: string;
  parachuteId: string;
  isHost: boolean;
  ready: boolean;
}

export interface MultiplayerRoomInfo {
  roomCode: string;
  hostName: string;
  mapId: MapId;
  mode: MatchMode;
  status: 'waiting' | 'active';
  playerCount: number;
  maxPlayers: number;
  players: MultiplayerRosterPlayer[];
}

export interface MatchmakingPlayer {
  id: string;
  name: string;
  skinId: string;
}

export interface MatchmakingState {
  active: boolean;
  mapId: MapId;
  mode: MatchMode;
  remainingSec: number;
  maxWaitSec: number;
  realPlayers: MatchmakingPlayer[];
  phase: 'connecting' | 'searching' | 'filling_bots';
}

export interface LeaderboardRow {
  uid: string;
  name: string;
  level: number;
  wins: number;
  kills: number;
  matches: number;
  rankPoints: number;
  selectedSkinId: string;
}

export type OnlineStatus = 'online' | 'in_squad' | 'in_match' | 'offline';

export interface FriendRecord {
  id: string;
  uid: string | null;
  name: string;
  skinId: string;
  level: number;
  rankPoints: number;
  addedAt: number;
}

export interface FriendRequestRecord {
  id: string;
  fromUid: string;
  fromName: string;
  fromSkinId: string;
  fromLevel: number;
  fromRankPoints: number;
  toUid: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}

export function getGameUid(uid?: string | null, fallbackSeed = 'BLAZE_01'): string {
  const src = (uid && uid.trim()) || fallbackSeed || 'BLAZE_01';
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const num = (Math.abs(h) % 900000000) + 100000000;
  return String(num);
}

export interface OnlinePlayerPresence {
  playerId: string;
  uid: string | null;
  name: string;
  skinId: string;
  level: number;
  rankPoints: number;
  status: 'online' | 'in_squad' | 'in_match';
  roomCode: string | null;
}

export interface PlayerSearchResult {
  id: string;
  uid: string | null;
  playerId: string | null;
  name: string;
  skinId: string;
  level: number;
  rankPoints: number;
  status: OnlineStatus;
  roomCode: string | null;
  source: 'cloud' | 'live';
}

export interface SquadInvite {
  inviteId: string;
  fromPlayerId: string;
  fromName: string;
  fromSkinId: string;
  roomCode: string;
  mapId: MapId;
  mode: MatchMode;
  receivedAt: number;
}

export interface WeaponSlotState {
  weaponId: WeaponId;
  mag: number;
  reserve: number;
}

export interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  isPlayer: boolean;
  isVictimPlayer?: boolean;
  isZone?: boolean;
  ageSec?: number;
  timestamp: number;
}

export interface DamagePopup {
  id: number;
  x: number; // screen px
  y: number; // screen px
  amount: number;
  headshot: boolean;
  armorHit: boolean;
  alpha: number;
}

export interface LootPrompt {
  label: string;
  sublabel: string;
  rarityColor: string;
}

export interface MinimapEntity {
  x: number;
  z: number;
  type: 'bot_ping' | 'airdrop' | 'loot' | 'human_ping' | 'vehicle';
}

export type StanceMode = 'stand' | 'crouch' | 'prone';
export type AimPrecisionMode = 'default' | 'precise_scope' | 'full_control';

export interface SensitivitySettings {
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  freeLook: number;
}

export type HudControlSlotId =
  | 'joystick'
  | 'fireRight'
  | 'fireLeft'
  | 'scope'
  | 'jump'
  | 'crouch'
  | 'prone'
  | 'reload'
  | 'freeLook'
  | 'gloo'
  | 'medkit'
  | 'skill'
  | 'weaponBar';

export interface HudSlotTransform {
  xPct: number;
  yPct: number;
  scale: number;
  opacity: number;
}

export interface ControlSettings {
  sensitivity: SensitivitySettings;
  aimPrecision: AimPrecisionMode;
  leftFireAlways: boolean;
  hudLayout: Record<HudControlSlotId, HudSlotTransform>;
}

export interface HudState {
  phase: GamePhase;
  aliveCount: number;
  totalCount: number;
  kills: number;
  damageDealt: number;
  headshots: number;
  hp: number;
  maxHp: number;
  ep: number;
  maxEp: number;
  vestLevel: number; // 0-3
  vestDurability: number;
  helmetLevel: number; // 0-3
  helmetDurability: number;
  glooWalls: number;
  medkits: number;
  activeSlot: number; // 0, 1, 2
  slots: [WeaponSlotState | null, WeaponSlotState | null, WeaponSlotState | null];
  isReloading: boolean;
  reloadProgress: number; // 0-1
  isHealing: boolean;
  healProgress: number; // 0-1
  isAds: boolean;
  isScopedSniper: boolean;
  stance: StanceMode;
  sprintLocked: boolean;
  isFreeLooking: boolean;
  activeOpticLabel: 'HIP' | 'RED DOT' | '2X' | '4X';
  crosshairSpread: number;
  hitmarkerType: 'none' | 'body' | 'head';
  damageFlash: number; // 0-1
  skillCooldown: number;
  skillMaxCooldown: number;
  skillActiveTimer: number;
  zonePhase: number;
  zoneTotalPhases: number;
  zoneTimer: number;
  zoneShrinking: boolean;
  zoneFinalized: boolean;
  zoneDamagePerSec: number;
  zoneDistanceOutside: number;
  inZone: boolean;
  zoneRadius: number;
  zoneCenterX: number;
  zoneCenterZ: number;
  nextZoneRadius: number;
  nextZoneCenterX: number;
  nextZoneCenterZ: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  planeProgress: number; // 0-1
  altitude: number;
  parachuteOpen: boolean;
  canDeployParachute: boolean;
  lootPrompt: LootPrompt | null;
  vehicle: VehicleHudState;
  killFeed: KillFeedItem[];
  damagePopups: DamagePopup[];
  minimapEntities: MinimapEntity[];
  pointerLocked: boolean;
  survivalTime: number;
  rankAchieved: number;
  earnedGold: number;
  earnedXp: number;
  mapId: MapId;
  eliminatedBy: string;
  spectateTargetName?: string;
  spectateTargetWeapon?: string;
  spectateTargetHp?: number;
  spectateRemainingSec?: number;
  activeEmoteId?: string | null;
  multiplayerRoomCode?: string;
  humanPlayersAlive?: number;
}

export function getRankTier(points: number): { name: string; color: string } {
  if (points >= 3200) return { name: 'GRANDMASTER', color: '#EF4444' };
  if (points >= 2400) return { name: 'HEROIC', color: '#F59E0B' };
  if (points >= 1700) return { name: 'DIAMOND', color: '#38BDF8' };
  if (points >= 1100) return { name: 'PLATINUM', color: '#22D3EE' };
  if (points >= 600) return { name: 'GOLD', color: '#FACC15' };
  return { name: 'SILVER', color: '#94A3B8' };
}
