/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Payloads)
 * Maps to security_spec.md and firestore.rules invariants.
 */

export const DIRTY_DOZEN_CASES = [
  { id: 1, name: 'Unverified Auth Spoof', target: 'users/uid_a', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Cross-User Profile Hijack', target: 'users/uid_b', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Blanket User Enumeration (list)', target: 'users', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Shadow Field Injection (isVerified)', target: 'users/uid_a', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Immutable Field Tampering (uid/createdAt)', target: 'users/uid_a', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Client Timestamp Forgery', target: 'leaderboard/uid_a', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Unbounded Array Attack (>8 emotes / >64 skins)', target: 'users/uid_a', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'ID Poisoning (>128 chars / invalid chars)', target: 'rooms/bad$id', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Room Ownership Hijack', target: 'rooms/FF4821', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Terminal State Violation (after finished)', target: 'rooms/FF4821', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Orphaned Room Player (missing parent)', target: 'rooms/MISSING/players/uid_a', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Impersonating Room Player', target: 'rooms/FF4821/players/uid_b', expected: 'PERMISSION_DENIED' },
  { id: 13, name: 'Fake Direct UPI Self-Verification', target: 'users/uid_a/topups/tx1', expected: 'PERMISSION_DENIED' },
  { id: 14, name: 'Non-Admin Top-Up Approval', target: 'users/uid_a/topups/tx1', expected: 'PERMISSION_DENIED' },
  { id: 15, name: 'Double-Claim Top-Up Exploit', target: 'users/uid_a/topups/tx1', expected: 'PERMISSION_DENIED' },
  { id: 16, name: 'Spoofed Friend Request Sender', target: 'users/uid_b/friendRequests/uid_c', expected: 'PERMISSION_DENIED' },
] as const;
