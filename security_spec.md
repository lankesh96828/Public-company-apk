# Firestore Security Specification

## 1. Data Invariants
1. **Owner-Isolated Profiles (`/users/{userId}`)**: A survivor profile document ID and `uid` field must strictly match `request.auth.uid` for an email-verified user; no other user can read, list, create, update, or delete another user's private profile or currencies.
2. **Non-PII Public Leaderboard (`/leaderboard/{userId}`)**: Leaderboard entries contain zero PII and can only be created or updated by the verified owner matching `{userId}` and `uid`, with server-validated `createdAt == request.time` / `updatedAt == request.time` and bounded integer stats.
3. **Multiplayer Rooms (`/rooms/{roomId}`)**: Rooms can only be created by verified authenticated users with `ownerUid == request.auth.uid`, initial `status == 'waiting'`, and `roomCode == roomId`. Once `status == 'finished'`, terminal state locking prevents all subsequent updates.
4. **Master Gate Room Players (`/rooms/{roomId}/players/{playerId}`)**: Room player records require the parent `/rooms/{roomId}` document to exist and not be `'finished'`, with `{playerId} == request.auth.uid` and `uid == request.auth.uid`.
5. **Master Gate Friends List (`/users/{userId}/friends/{friendUid}`)**: Friend entries require parent `/users/{userId}` to exist, `{userId} == request.auth.uid`, `friendUid != userId`, and `/leaderboard/{friendUid}` to exist. List queries must enforce `ownerUid == request.auth.uid`.
6. **Incoming Friend Requests (`/users/{userId}/friendRequests/{fromUid}`)**: Senders can only create a request under `{userId}` where `{fromUid} == request.auth.uid`, `fromUid != userId`, parent `/users/{userId}` exists, and `/leaderboard/{fromUid}` exists. Recipients (`{userId}`) can list (`where('toUid', '==', uid)`) and delete requests; senders can also delete their outgoing request. Updates are denied (`update: if false`).
7. **Anti-Fraud Top-Up Receipts (`/users/{userId}/topups/{transactionId}`)**:
   - Direct UPI submissions (`method == 'direct_upi'`) MUST be created with `status == 'pending_verification'`, `diamondsCredited == 0`, and `credited == false` so fake UTRs can never self-credit Diamonds.
   - Razorpay receipts (`method in ['razorpay_upi', 'razorpay_qr']`) require `paymentRef` matching `^pay_[a-zA-Z0-9]+$` and `credited == false`.
   - Only the verified merchant admin (`request.auth.token.email == 'shivarajnaik60@gmail.com' && request.auth.token.email_verified == true`) can list pending receipts via collectionGroup and transition `pending_verification` -> `verified` or `rejected` (immutably locking amount/UTR/expectedDiamonds).
   - Once `status == 'verified' && credited == false`, only the owner can flip `credited: false -> true` (`affectedKeys().hasOnly(['credited'])`). Terminal states (`rejected` or `credited == true`) cannot be updated or deleted.
8. **Strict Key & Size Guards**: Every `create` enforces `hasAll` + `hasOnly`, every `update` uses action-based `affectedKeys().hasOnly(...)`, every string enforces `.size()`, every array enforces bounded `.size() <= 64`, and every document ID matches `^[a-zA-Z0-9_\\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Auth Spoof**: Creating `/users/abc` when `request.auth.token.email_verified == false` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Hijack**: Authenticated user `uid_A` attempting `get`, `create`, or `update` on `/users/uid_B` -> `PERMISSION_DENIED`.
3. **Blanket User Enumeration**: Attempting `list` on `/users` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Updating `/users/uid_A` with extra ghost field `{ isVerified: true }` or `{ role: 'admin' }` -> `PERMISSION_DENIED`.
5. **Immutable Field Tampering**: Updating `/users/uid_A` with modified `uid` or `createdAt` -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery**: Creating `/leaderboard/uid_A` with client-supplied `createdAt` != `request.time` -> `PERMISSION_DENIED`.
7. **Unbounded Array / DoW Attack**: Writing `equippedEmotes` with > 8 entries or `unlockedSkins` with > 64 entries -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Creating `/rooms/<1.5KB junk string>` or invalid characters in `{roomId}` -> `PERMISSION_DENIED`.
9. **Room Ownership Hijack**: Non-owner attempting to change `mapId`, `mode`, or `status` on `/rooms/FF1234` -> `PERMISSION_DENIED`.
10. **Terminal State Violation**: Updating `/rooms/FF1234` after `status` becomes `'finished'` -> `PERMISSION_DENIED`.
11. **Orphaned Room Player**: Creating `/rooms/NONEXISTENT/players/uid_A` -> `PERMISSION_DENIED`.
12. **Impersonating Room Player**: User `uid_A` creating `/rooms/FF4821/players/uid_B` -> `PERMISSION_DENIED`.
13. **Fake UTR Self-Verification**: User `uid_A` creating `/users/uid_A/topups/tx1` with `method: 'direct_upi', status: 'verified', diamondsCredited: 5600` -> `PERMISSION_DENIED`.
14. **Non-Admin Top-Up Approval**: User `uid_A` (or spoofed unverified admin email) updating `pending_verification` receipt to `verified` -> `PERMISSION_DENIED`.
15. **Double-Claim Top-Up Exploit**: User `uid_A` flipping `credited: true -> false` after already claiming Diamonds -> `PERMISSION_DENIED`.
16. **Spoofed Friend Request**: User `uid_A` creating `/users/uid_B/friendRequests/uid_C` with `fromUid: 'uid_C'` -> `PERMISSION_DENIED`.
