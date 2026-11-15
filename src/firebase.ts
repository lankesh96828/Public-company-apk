import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  DEFAULT_EQUIPPED_EMOTES,
  DEFAULT_EQUIPPED_WEAPON_SKINS,
  DEFAULT_UNLOCKED_EMOTES,
  DEFAULT_UNLOCKED_WEAPON_SKINS,
  FriendRecord,
  FriendRequestRecord,
  LeaderboardRow,
  PlayerProfile,
  TopUpTransaction,
  WeaponId,
} from './game/types';

export const MERCHANT_ADMIN_EMAIL = 'shivarajnaik60@gmail.com';

const app = initializeApp(firebaseConfig);
function createDbInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}
export const db = createDbInstance();
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreOfflineError extends Error {
  constructor(message = 'Firestore client is offline.') {
    super(message);
    this.name = 'FirestoreOfflineError';
  }
}

export function isTransientOfflineError(error: unknown): boolean {
  if (error instanceof FirestoreOfflineError) return true;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: unknown } | null)?.code;
  return (
    code === 'unavailable' ||
    msg.includes('the client is offline') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('unavailable')
  );
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Validate connection to Firestore on boot (retries once to allow long-polling fallback)
async function testConnection() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return;
    } catch (error) {
      if (attempt === 0 && isTransientOfflineError(error)) {
        await waitMs(1500);
        continue;
      }
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firestore connection warning (offline/retrying):', error.message);
      }
      return;
    }
  }
}
testConnection();

function sanitizeSlug(val: string, fallback: string): string {
  const clean = val.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 32);
  return clean.length > 0 ? clean : fallback;
}

function sanitizeArray(arr: unknown, fallback: string[], maxItems = 64): string[] {
  const list = Array.isArray(arr) ? arr : [];
  const clean = list
    .map((s) => sanitizeSlug(String(s), ''))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
  return clean.length > 0 ? Array.from(new Set(clean)) : fallback;
}

const WEAPON_KEYS: WeaponId[] = ['ak47', 'scar', 'mp40', 'm1887', 'awm', 'deagle'];

function sanitizeWeaponId(raw: unknown, fallback: WeaponId = 'ak47'): WeaponId {
  return typeof raw === 'string' && WEAPON_KEYS.includes(raw as WeaponId)
    ? (raw as WeaponId)
    : fallback;
}

function sanitizeEquippedWeaponSkins(
  raw?: Partial<Record<WeaponId, string>> | null
): Record<WeaponId, string> {
  const out: Record<WeaponId, string> = { ...DEFAULT_EQUIPPED_WEAPON_SKINS };
  if (raw && typeof raw === 'object') {
    for (const w of WEAPON_KEYS) {
      if (typeof raw[w] === 'string') {
        out[w] = sanitizeSlug(raw[w] as string, DEFAULT_EQUIPPED_WEAPON_SKINS[w]);
      }
    }
  }
  return out;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

export function sanitizeProfilePayload(profile: PlayerProfile) {
  const cleanName = (profile.name || 'BLAZE_01').trim().slice(0, 20) || 'BLAZE_01';
  const rawMilestones = Array.isArray(profile.claimedTopUpMilestones)
    ? profile.claimedTopUpMilestones
    : [];
  const rawSens = Number(profile.sensitivity);
  const sensitivity = Number.isFinite(rawSens)
    ? Math.max(0.2, Math.min(3.5, Math.round(rawSens * 100) / 100))
    : 1.0;

  return {
    name: cleanName,
    level: clampInt(profile.level, 1, 999),
    xp: clampInt(profile.xp, 0, 4999),
    gold: clampInt(profile.gold, 0, 10000000),
    diamonds: clampInt(profile.diamonds, 0, 10000000),
    ffTokens: clampInt(profile.ffTokens, 0, 1000000),
    luckDiamond: clampInt(profile.luckDiamond, 0, 100),
    luckGold: clampInt(profile.luckGold, 0, 100),
    luckWeapon: clampInt(profile.luckWeapon, 0, 100),
    luckIncubator: clampInt(profile.luckIncubator, 0, 100),
    luckEmote: clampInt(profile.luckEmote ?? 0, 0, 100),
    luckFaded: clampInt(profile.luckFaded ?? 0, 0, 100),
    totalTopUpDiamonds: clampInt(profile.totalTopUpDiamonds, 0, 10000000),
    claimedTopUpMilestones: rawMilestones
      .map((s) => sanitizeSlug(String(s), ''))
      .filter((s) => s.length > 0)
      .slice(0, 32),
    unlockedSkins: sanitizeArray(profile.unlockedSkins, ['alok'], 64),
    unlockedParachutes: sanitizeArray(profile.unlockedParachutes, ['ember'], 32),
    unlockedGlooWalls: sanitizeArray(profile.unlockedGlooWalls, ['frost'], 32),
    unlockedWeaponSkins: sanitizeArray(
      profile.unlockedWeaponSkins || DEFAULT_UNLOCKED_WEAPON_SKINS,
      DEFAULT_UNLOCKED_WEAPON_SKINS,
      64
    ),
    unlockedEmotes: sanitizeArray(
      profile.unlockedEmotes || DEFAULT_UNLOCKED_EMOTES,
      DEFAULT_UNLOCKED_EMOTES,
      32
    ),
    equippedEmotes: sanitizeArray(
      profile.equippedEmotes || DEFAULT_EQUIPPED_EMOTES,
      DEFAULT_EQUIPPED_EMOTES,
      8
    ).slice(0, 8),
    wins: clampInt(profile.wins, 0, 1000000),
    kills: clampInt(profile.kills, 0, 10000000),
    matches: clampInt(profile.matches, 0, 1000000),
    rankPoints: clampInt(profile.rankPoints, 0, 1000000),
    selectedSkinId: sanitizeSlug(profile.selectedSkinId, 'alok'),
    selectedLobbyWeapon: sanitizeWeaponId(profile.selectedLobbyWeapon, 'ak47'),
    selectedParachuteId: sanitizeSlug(profile.selectedParachuteId, 'ember'),
    selectedGlooId: sanitizeSlug(profile.selectedGlooId, 'frost'),
    equippedWeaponSkins: sanitizeEquippedWeaponSkins(profile.equippedWeaponSkins),
    sensitivity,
  };
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

export async function fetchOrCreateCloudProfile(
  user: User,
  localProfile: PlayerProfile
): Promise<PlayerProfile> {
  const userPath = `users/${user.uid}`;
  const lbPath = `leaderboard/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const lbRef = doc(db, 'leaderboard', user.uid);

  let snap;
  let usedOfflineCache = false;
  const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const maxAttempts = isBrowserOffline ? 1 : 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      snap = await getDoc(userRef);
      break;
    } catch (err) {
      if (isTransientOfflineError(err)) {
        if (attempt < maxAttempts - 1) {
          await waitMs(900 * (attempt + 1));
          continue;
        }
        try {
          const cached = await getDocFromCache(userRef);
          if (cached.exists()) {
            snap = cached;
            usedOfflineCache = true;
            break;
          }
        } catch {
          // No offline cached profile available yet
        }
        console.warn('Firestore offline during profile load; continuing in local mode.');
        throw new FirestoreOfflineError('Failed to get document because the client is offline.');
      }
      handleFirestoreError(err, OperationType.GET, userPath);
    }
  }
  if (!snap) {
    handleFirestoreError(new Error('Failed to load user profile snapshot.'), OperationType.GET, userPath);
  }

  if (snap.exists()) {
    const data = snap.data();
    const hydrated: PlayerProfile = {
      ...localProfile,
      name: typeof data.name === 'string' && data.name.trim() ? data.name : localProfile.name,
      level: typeof data.level === 'number' ? data.level : localProfile.level,
      xp: typeof data.xp === 'number' ? data.xp : localProfile.xp,
      gold: typeof data.gold === 'number' ? data.gold : localProfile.gold,
      diamonds: typeof data.diamonds === 'number' ? data.diamonds : localProfile.diamonds,
      ffTokens: typeof data.ffTokens === 'number' ? data.ffTokens : localProfile.ffTokens,
      luckDiamond: typeof data.luckDiamond === 'number' ? data.luckDiamond : 0,
      luckGold: typeof data.luckGold === 'number' ? data.luckGold : 0,
      luckWeapon: typeof data.luckWeapon === 'number' ? data.luckWeapon : 0,
      luckIncubator: typeof data.luckIncubator === 'number' ? data.luckIncubator : 0,
      luckEmote: typeof data.luckEmote === 'number' ? data.luckEmote : 0,
      luckFaded: typeof data.luckFaded === 'number' ? data.luckFaded : 0,
      totalTopUpDiamonds: typeof data.totalTopUpDiamonds === 'number' ? data.totalTopUpDiamonds : 0,
      claimedTopUpMilestones: Array.isArray(data.claimedTopUpMilestones) ? data.claimedTopUpMilestones : [],
      unlockedSkins: Array.isArray(data.unlockedSkins) ? data.unlockedSkins : ['alok'],
      unlockedParachutes: Array.isArray(data.unlockedParachutes) ? data.unlockedParachutes : ['ember'],
      unlockedGlooWalls: Array.isArray(data.unlockedGlooWalls) ? data.unlockedGlooWalls : ['frost'],
      unlockedWeaponSkins: Array.isArray(data.unlockedWeaponSkins)
        ? data.unlockedWeaponSkins
        : localProfile.unlockedWeaponSkins,
      unlockedEmotes: Array.isArray(data.unlockedEmotes)
        ? data.unlockedEmotes
        : localProfile.unlockedEmotes,
      equippedEmotes: Array.isArray(data.equippedEmotes)
        ? data.equippedEmotes.slice(0, 8)
        : localProfile.equippedEmotes,
      wins: typeof data.wins === 'number' ? data.wins : localProfile.wins,
      kills: typeof data.kills === 'number' ? data.kills : localProfile.kills,
      matches: typeof data.matches === 'number' ? data.matches : localProfile.matches,
      rankPoints: typeof data.rankPoints === 'number' ? data.rankPoints : localProfile.rankPoints,
      selectedSkinId: typeof data.selectedSkinId === 'string' ? data.selectedSkinId : localProfile.selectedSkinId,
      selectedLobbyWeapon: sanitizeWeaponId(data.selectedLobbyWeapon, localProfile.selectedLobbyWeapon),
      selectedParachuteId: typeof data.selectedParachuteId === 'string' ? data.selectedParachuteId : localProfile.selectedParachuteId,
      selectedGlooId: typeof data.selectedGlooId === 'string' ? data.selectedGlooId : localProfile.selectedGlooId,
      equippedWeaponSkins: sanitizeEquippedWeaponSkins(
        data.equippedWeaponSkins || localProfile.equippedWeaponSkins
      ),
      sensitivity: typeof data.sensitivity === 'number' ? data.sensitivity : localProfile.sensitivity,
    };

    const hasValidUid = typeof data.uid === 'string' && data.uid === user.uid;
    const hasValidCreatedAt = Boolean(
      data.createdAt &&
      typeof data.createdAt === 'object' &&
      typeof (data.createdAt as { toMillis?: unknown }).toMillis === 'function'
    );
    const clean = sanitizeProfilePayload(hydrated);
    const hasValidWeaponSkinsMap = Boolean(
      data.equippedWeaponSkins &&
      typeof data.equippedWeaponSkins === 'object' &&
      WEAPON_KEYS.every((k) => {
        const val = (data.equippedWeaponSkins as Record<string, unknown>)[k];
        return typeof val === 'string' && val.length >= 1 && val.length <= 32 && /^[a-zA-Z0-9_\-]+$/.test(val);
      }) &&
      Object.keys(data.equippedWeaponSkins as Record<string, unknown>).every((k) =>
        WEAPON_KEYS.includes(k as WeaponId)
      )
    );
    const hasInvalidLegacyValue =
      typeof data.name !== 'string' ||
      data.name !== clean.name ||
      !Number.isInteger(data.level) ||
      data.level !== clean.level ||
      !Number.isInteger(data.xp) ||
      data.xp !== clean.xp ||
      !Number.isInteger(data.gold) ||
      data.gold !== clean.gold ||
      !Number.isInteger(data.diamonds) ||
      data.diamonds !== clean.diamonds ||
      !Number.isInteger(data.rankPoints) ||
      data.rankPoints !== clean.rankPoints ||
      typeof data.sensitivity !== 'number' ||
      data.sensitivity < 0.2 ||
      data.sensitivity > 3.5 ||
      !WEAPON_KEYS.includes(data.selectedLobbyWeapon as WeaponId) ||
      !hasValidWeaponSkinsMap;

    const missingLegacyFields =
      !hasValidUid ||
      !hasValidCreatedAt ||
      typeof data.ffTokens !== 'number' ||
      typeof data.luckEmote !== 'number' ||
      typeof data.luckFaded !== 'number' ||
      !Array.isArray(data.unlockedWeaponSkins) ||
      !Array.isArray(data.unlockedEmotes) ||
      !Array.isArray(data.equippedEmotes) ||
      hasInvalidLegacyValue;

    if (missingLegacyFields && !usedOfflineCache) {
      const updatePayload: Record<string, unknown> =
        hasValidUid && hasValidCreatedAt
          ? {
              ...clean,
              updatedAt: serverTimestamp(),
            }
          : {
              ...(!hasValidUid ? { uid: user.uid } : {}),
              ...(!hasValidCreatedAt ? { createdAt: serverTimestamp() } : {}),
              ...clean,
              updatedAt: serverTimestamp(),
            };
      try {
        await updateDoc(userRef, updatePayload);
      } catch (err) {
        if (isTransientOfflineError(err)) {
          console.warn('Firestore offline during profile backfill; will sync when reconnected.');
          return hydrated;
        }
        const msg = err instanceof Error ? err.message : String(err);
        const diagErr = new Error(
          `${msg} [hasValidUid=${hasValidUid}, hasValidCreatedAt=${hasValidCreatedAt}, hasValidWeaponSkinsMap=${hasValidWeaponSkinsMap}, hasInvalidLegacyValue=${hasInvalidLegacyValue}, keys=${Object.keys(updatePayload).join(',')}]`
        );
        handleFirestoreError(diagErr, OperationType.UPDATE, userPath);
      }
    }

    try {
      const lbSnap = await getDoc(lbRef);
      if (!lbSnap.exists()) {
        const clean = sanitizeProfilePayload(hydrated);
        await setDoc(lbRef, {
          uid: user.uid,
          name: clean.name,
          level: clean.level,
          wins: clean.wins,
          kills: clean.kills,
          matches: clean.matches,
          rankPoints: clean.rankPoints,
          selectedSkinId: clean.selectedSkinId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-fatal: leaderboard entry will be synced on next profile save
    }

    return hydrated;
  }

  const initialName =
    localProfile.name === 'BLAZE_01' && user.displayName
      ? user.displayName.replace(/\s+/g, '_').slice(0, 14)
      : localProfile.name;

  const merged: PlayerProfile = { ...localProfile, name: initialName };
  const clean = sanitizeProfilePayload(merged);

  try {
    await setDoc(userRef, {
      uid: user.uid,
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (isTransientOfflineError(err)) {
      console.warn('Firestore offline during profile creation; continuing in local mode.');
      throw new FirestoreOfflineError('Failed to create user profile because the client is offline.');
    }
    handleFirestoreError(err, OperationType.CREATE, userPath);
  }

  try {
    await setDoc(lbRef, {
      uid: user.uid,
      name: clean.name,
      level: clean.level,
      wins: clean.wins,
      kills: clean.kills,
      matches: clean.matches,
      rankPoints: clean.rankPoints,
      selectedSkinId: clean.selectedSkinId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (isTransientOfflineError(err)) {
      console.warn('Firestore offline during leaderboard initialization; will sync later.');
      return merged;
    }
    handleFirestoreError(err, OperationType.CREATE, lbPath);
  }

  return merged;
}

export async function syncCloudProfile(uid: string, profile: PlayerProfile): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return;
  }
  const userPath = `users/${uid}`;
  const lbPath = `leaderboard/${uid}`;
  const clean = sanitizeProfilePayload(profile);
  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, {
      ...clean,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (isTransientOfflineError(err)) {
      console.warn('Firestore offline during profile sync; will retry on reconnect.');
      throw new FirestoreOfflineError('Failed to update document because the client is offline.');
    }
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }

  try {
    const lbRef = doc(db, 'leaderboard', uid);
    const lbSnap = await getDoc(lbRef);
    if (lbSnap.exists()) {
      const lbData = lbSnap.data();
      const lbHasValidUid = typeof lbData.uid === 'string' && lbData.uid === uid;
      const lbHasValidCreatedAt = Boolean(
        lbData.createdAt &&
        typeof lbData.createdAt === 'object' &&
        typeof (lbData.createdAt as { toMillis?: unknown }).toMillis === 'function'
      );
      await updateDoc(lbRef, {
        ...(!lbHasValidUid ? { uid } : {}),
        ...(!lbHasValidCreatedAt ? { createdAt: serverTimestamp() } : {}),
        name: clean.name,
        level: clean.level,
        wins: clean.wins,
        kills: clean.kills,
        matches: clean.matches,
        rankPoints: clean.rankPoints,
        selectedSkinId: clean.selectedSkinId,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(lbRef, {
        uid,
        name: clean.name,
        level: clean.level,
        wins: clean.wins,
        kills: clean.kills,
        matches: clean.matches,
        rankPoints: clean.rankPoints,
        selectedSkinId: clean.selectedSkinId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    if (isTransientOfflineError(err)) {
      console.warn('Firestore offline during leaderboard sync; will retry on reconnect.');
      throw new FirestoreOfflineError('Failed to sync leaderboard because the client is offline.');
    }
    handleFirestoreError(err, OperationType.WRITE, lbPath);
  }
}

export function subscribeLeaderboard(
  onRows: (rows: LeaderboardRow[]) => void,
  onErr?: (err: Error) => void
): Unsubscribe {
  const lbPath = 'leaderboard';
  const q = query(
    collection(db, 'leaderboard'),
    where('rankPoints', '>=', 0),
    orderBy('rankPoints', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: LeaderboardRow[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: String(data.uid || d.id),
          name: String(data.name || 'Survivor'),
          level: Number(data.level || 1),
          wins: Number(data.wins || 0),
          kills: Number(data.kills || 0),
          matches: Number(data.matches || 0),
          rankPoints: Number(data.rankPoints || 0),
          selectedSkinId: String(data.selectedSkinId || 'alok'),
        };
      });
      onRows(rows);
    },
    (error) => {
      if (isTransientOfflineError(error)) {
        if (onErr) onErr(new FirestoreOfflineError('Leaderboard unavailable while offline.'));
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, lbPath);
      } catch (wrapped) {
        if (onErr && wrapped instanceof Error) onErr(wrapped);
      }
    }
  );
}

export async function searchCloudPlayers(searchText: string): Promise<LeaderboardRow[]> {
  const lbPath = 'leaderboard';
  const q = query(
    collection(db, lbPath),
    where('rankPoints', '>=', 0),
    orderBy('rankPoints', 'desc'),
    limit(100)
  );
  let snap;
  try {
    snap = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, lbPath);
  }
  const needle = searchText.trim().toLowerCase();
  const rows: LeaderboardRow[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: String(data.uid || d.id),
      name: String(data.name || 'Survivor'),
      level: Number(data.level || 1),
      wins: Number(data.wins || 0),
      kills: Number(data.kills || 0),
      matches: Number(data.matches || 0),
      rankPoints: Number(data.rankPoints || 0),
      selectedSkinId: String(data.selectedSkinId || 'alok'),
    };
  });
  if (!needle) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(needle));
}

export function subscribeFriends(
  ownerUid: string,
  onFriends: (friends: FriendRecord[]) => void,
  onErr?: (err: Error) => void
): Unsubscribe {
  const friendsPath = `users/${ownerUid}/friends`;
  const q = query(
    collection(db, 'users', ownerUid, 'friends'),
    where('ownerUid', '==', ownerUid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FriendRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.friendUid || d.id),
          uid: String(data.friendUid || d.id),
          name: String(data.friendName || 'Survivor'),
          skinId: String(data.friendSkinId || 'alok'),
          level: Number(data.friendLevel || 1),
          rankPoints: Number(data.friendRankPoints || 0),
          addedAt:
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now(),
        };
      });
      onFriends(list);
    },
    (error) => {
      if (isTransientOfflineError(error)) {
        if (onErr) onErr(new FirestoreOfflineError('Friends unavailable while offline.'));
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, friendsPath);
      } catch (wrapped) {
        if (onErr && wrapped instanceof Error) onErr(wrapped);
      }
    }
  );
}

export async function addCloudFriend(
  ownerUid: string,
  friend: { uid: string; name: string; skinId: string; level: number; rankPoints: number }
): Promise<void> {
  if (!friend.uid || friend.uid === ownerUid) return;
  const path = `users/${ownerUid}/friends/${friend.uid}`;
  const ref = doc(db, 'users', ownerUid, 'friends', friend.uid);
  const cleanName = (friend.name || 'Survivor').trim().slice(0, 20) || 'Survivor';
  const cleanSkin = sanitizeSlug(friend.skinId || 'alok', 'alok');
  const cleanLevel = clampInt(friend.level || 1, 1, 999);
  const cleanRp = clampInt(friend.rankPoints || 0, 0, 1000000);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (existingSnap.exists()) {
    try {
      await updateDoc(ref, {
        friendName: cleanName,
        friendSkinId: cleanSkin,
        friendLevel: cleanLevel,
        friendRankPoints: cleanRp,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(ref, {
        ownerUid,
        friendUid: friend.uid,
        friendName: cleanName,
        friendSkinId: cleanSkin,
        friendLevel: cleanLevel,
        friendRankPoints: cleanRp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }
}

export async function removeCloudFriend(ownerUid: string, friendUid: string): Promise<void> {
  const path = `users/${ownerUid}/friends/${friendUid}`;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'friends', friendUid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function sendCloudFriendRequest(
  toUid: string,
  sender: { uid: string; name: string; skinId: string; level: number; rankPoints: number },
  status: 'pending' | 'accepted' = 'pending'
): Promise<void> {
  if (!toUid || !sender.uid || toUid === sender.uid) return;
  const path = `users/${toUid}/friendRequests/${sender.uid}`;
  const ref = doc(db, 'users', toUid, 'friendRequests', sender.uid);
  try {
    await setDoc(ref, {
      fromUid: sender.uid,
      toUid,
      fromName: (sender.name || 'Survivor').trim().slice(0, 20) || 'Survivor',
      fromSkinId: sanitizeSlug(sender.skinId || 'alok', 'alok'),
      fromLevel: clampInt(sender.level || 1, 1, 999),
      fromRankPoints: clampInt(sender.rankPoints || 0, 0, 1000000),
      status,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeFriendRequests(
  ownerUid: string,
  onRequests: (list: FriendRequestRecord[]) => void,
  onErr?: (err: Error) => void
): Unsubscribe {
  const path = `users/${ownerUid}/friendRequests`;
  const q = query(
    collection(db, 'users', ownerUid, 'friendRequests'),
    where('toUid', '==', ownerUid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FriendRequestRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.fromUid || d.id),
          fromUid: String(data.fromUid || d.id),
          toUid: String(data.toUid || ownerUid),
          fromName: String(data.fromName || 'Survivor'),
          fromSkinId: String(data.fromSkinId || 'alok'),
          fromLevel: Number(data.fromLevel || 1),
          fromRankPoints: Number(data.fromRankPoints || 0),
          status: data.status === 'accepted' ? 'accepted' : 'pending',
          createdAt:
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now(),
        };
      });
      onRequests(list);
    },
    (error) => {
      if (isTransientOfflineError(error)) {
        if (onErr) onErr(new FirestoreOfflineError('Friend requests unavailable while offline.'));
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onErr && wrapped instanceof Error) onErr(wrapped);
      }
    }
  );
}

export async function deleteCloudFriendRequest(ownerUid: string, fromUid: string): Promise<void> {
  const path = `users/${ownerUid}/friendRequests/${fromUid}`;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'friendRequests', fromUid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveCloudTopUpTransaction(
  uid: string,
  tx: TopUpTransaction
): Promise<void> {
  const txId = (tx.id || tx.paymentRef || `tx_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, 128);
  const path = `users/${uid}/topups/${txId}`;
  const ref = doc(db, 'users', uid, 'topups', txId);

  const cleanOrderId =
    (tx.orderId || txId).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || 'ORDER001';
  const cleanPaymentRef =
    (tx.paymentRef || txId).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || 'REF001';
  const cleanMerchantUpi = (tx.merchantUpiId || '9945901131-1@fam').trim().slice(0, 64);
  const cleanPayerUpi = (tx.payerUpiId || 'upi_app').trim().slice(0, 64) || 'upi_app';
  const cleanPackId = sanitizeSlug(tx.packId || 'pack_100', 'pack_100');
  const method =
    tx.method === 'razorpay_upi' || tx.method === 'razorpay_qr' ? tx.method : 'direct_upi';
  const status =
    method === 'direct_upi' ? 'pending_verification' : 'verified';
  const expectedDiamonds = clampInt(
    tx.expectedDiamonds ?? tx.diamondsCredited ?? 120,
    1,
    50000
  );
  const diamondsCredited = status === 'verified' ? expectedDiamonds : 0;

  try {
    await setDoc(ref, {
      uid,
      orderId: cleanOrderId.length >= 4 ? cleanOrderId : `ORD_${cleanOrderId}`,
      paymentRef: cleanPaymentRef.length >= 4 ? cleanPaymentRef : `REF_${cleanPaymentRef}`,
      method,
      merchantUpiId: cleanMerchantUpi.length >= 5 ? cleanMerchantUpi : '9945901131-1@fam',
      payerUpiId: cleanPayerUpi,
      packId: cleanPackId,
      amountInr: clampInt(tx.amountInr, 1, 100000),
      diamondsCredited,
      expectedDiamonds,
      bonusDiamonds: clampInt(tx.bonusDiamonds, 0, 20000),
      status,
      credited: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function markCloudTopUpCredited(uid: string, txId: string): Promise<void> {
  const path = `users/${uid}/topups/${txId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'topups', txId), {
      credited: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

function mapTopUpDoc(d: { id: string; data: () => Record<string, unknown> }): TopUpTransaction {
  const data = d.data();
  const methodRaw = String(data.method || 'direct_upi');
  const method: TopUpTransaction['method'] =
    methodRaw === 'razorpay_upi' || methodRaw === 'razorpay_qr' ? methodRaw : 'direct_upi';
  const statusRaw = String(data.status || 'verified');
  const status: TopUpTransaction['status'] =
    statusRaw === 'pending_verification' || statusRaw === 'rejected' ? statusRaw : 'verified';
  const createdAtRaw = data.createdAt as { toMillis?: () => number } | undefined;

  return {
    id: d.id,
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    orderId: String(data.orderId || d.id),
    paymentRef: String(data.paymentRef || ''),
    method,
    merchantUpiId: String(data.merchantUpiId || '9945901131-1@fam'),
    payerUpiId: String(data.payerUpiId || 'upi_app'),
    packId: String(data.packId || 'pack_100'),
    amountInr: Number(data.amountInr || 0),
    diamondsCredited: Number(data.diamondsCredited || 0),
    expectedDiamonds: Number(data.expectedDiamonds || data.diamondsCredited || 0),
    bonusDiamonds: Number(data.bonusDiamonds || 0),
    status,
    credited: typeof data.credited === 'boolean' ? data.credited : status === 'verified',
    createdAt:
      createdAtRaw && typeof createdAtRaw.toMillis === 'function'
        ? createdAtRaw.toMillis()
        : Date.now(),
  };
}

export function subscribeTopUpTransactions(
  ownerUid: string,
  onTransactions: (list: TopUpTransaction[]) => void,
  onErr?: (err: Error) => void
): Unsubscribe {
  const path = `users/${ownerUid}/topups`;
  const q = query(
    collection(db, 'users', ownerUid, 'topups'),
    where('uid', '==', ownerUid),
    limit(30)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(mapTopUpDoc).sort((a, b) => b.createdAt - a.createdAt);
      onTransactions(list);
    },
    (error) => {
      if (isTransientOfflineError(error)) {
        if (onErr) onErr(new FirestoreOfflineError('Top-up receipts unavailable while offline.'));
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onErr && wrapped instanceof Error) onErr(wrapped);
      }
    }
  );
}

export function subscribeAdminPendingTopUps(
  onPending: (list: TopUpTransaction[]) => void,
  onErr?: (err: Error) => void
): Unsubscribe {
  const path = 'topups(collectionGroup)';
  const q = query(
    collectionGroup(db, 'topups'),
    where('status', '==', 'pending_verification'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(mapTopUpDoc).sort((a, b) => b.createdAt - a.createdAt);
      onPending(list);
    },
    (error) => {
      if (isTransientOfflineError(error)) {
        if (onErr) onErr(new FirestoreOfflineError('Admin pending top-ups unavailable while offline.'));
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onErr && wrapped instanceof Error) onErr(wrapped);
      }
    }
  );
}

export async function adminResolveTopUpTransaction(
  targetUid: string,
  txId: string,
  approve: boolean,
  expectedDiamonds: number
): Promise<void> {
  const path = `users/${targetUid}/topups/${txId}`;
  try {
    await updateDoc(doc(db, 'users', targetUid, 'topups', txId), {
      status: approve ? 'verified' : 'rejected',
      diamondsCredited: approve ? clampInt(expectedDiamonds, 1, 50000) : 0,
      credited: false,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}


