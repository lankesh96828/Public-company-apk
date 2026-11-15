import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const MERCHANT_UPI_ID = (process.env.MERCHANT_UPI_ID || '9945901131-1@fam').trim();
const MERCHANT_NAME = 'BLAZE DROP';

interface ServerTopUpPack {
  id: string;
  diamonds: number;
  bonus: number;
  inrAmount: number;
  tierLabel: string;
}

const TOP_UP_PACK_CATALOG: Record<string, ServerTopUpPack> = {
  pack_100: { id: 'pack_100', diamonds: 100, bonus: 20, inrAmount: 80, tierLabel: 'Starter Drop' },
  pack_310: { id: 'pack_310', diamonds: 310, bonus: 50, inrAmount: 240, tierLabel: 'Popular' },
  pack_520: { id: 'pack_520', diamonds: 520, bonus: 100, inrAmount: 400, tierLabel: 'Squad Bundle' },
  pack_1060: { id: 'pack_1060', diamonds: 1060, bonus: 220, inrAmount: 800, tierLabel: 'Elite Crate' },
  pack_2180: { id: 'pack_2180', diamonds: 2180, bonus: 500, inrAmount: 1600, tierLabel: 'Heroic Pack' },
  pack_5600: { id: 'pack_5600', diamonds: 5600, bonus: 1400, inrAmount: 4000, tierLabel: 'Grandmaster' },
};

interface PendingPaymentOrder {
  orderId: string;
  packId: string;
  amountInr: number;
  method: 'razorpay' | 'razorpay_qr' | 'upi';
  payerUpiId: string;
  createdAt: number;
  settled: boolean;
}

const pendingPaymentOrders = new Map<string, PendingPaymentOrder>();
const settledPaymentRefs = new Set<string>();
const webhookConfirmedPaymentIds = new Set<string>();

function pruneExpiredPaymentOrders() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, order] of pendingPaymentOrders.entries()) {
    if (order.createdAt < cutoff) {
      pendingPaymentOrders.delete(key);
    }
  }
}

function getRazorpayCredentials() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const configured =
    keyId.length > 0 &&
    keySecret.length > 0 &&
    !keyId.includes('MY_RAZORPAY') &&
    !keySecret.includes('MY_RAZORPAY');
  const webhookConfigured =
    webhookSecret.length > 0 && !webhookSecret.includes('MY_RAZORPAY');
  return { keyId, keySecret, webhookSecret, configured, webhookConfigured };
}

function isLikelyFakeUtr(utrRaw: string): boolean {
  const utr = utrRaw.trim().toUpperCase();
  if (!/^[A-Z0-9]{10,22}$/.test(utr)) return true;
  if (/^(.)\1+$/.test(utr)) return true;
  const uniqueChars = new Set(utr.split(''));
  if (uniqueChars.size < 4) return true;
  const blockedSubstrings = ['FAKE', 'TEST', 'DEMO', 'DUMMY', 'SAMPLE', 'ABCDEF', '12345678', '87654321', '000000', '999999'];
  if (blockedSubstrings.some((b) => utr.includes(b))) return true;
  const seqAsc = '012345678901234567890123';
  const seqDesc = '987654321098765432109876';
  if (seqAsc.includes(utr) || seqDesc.includes(utr)) return true;
  return false;
}

async function verifyAndCaptureRazorpayPayment(
  paymentId: string,
  expectedAmountPaise: number,
  expectedOrderId: string | null,
  keyId: string,
  keySecret: string
): Promise<{ ok: true; vpa?: string } | { ok: false; status: number; error: string }> {
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  let payRes: Response;
  try {
    payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'Unable to reach Razorpay Payments API for live capture verification.',
    };
  }

  if (!payRes.ok) {
    return {
      ok: false,
      status: 400,
      error: 'Razorpay payment lookup failed or payment does not exist.',
    };
  }

  const payData = (await payRes.json()) as {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    order_id?: string;
    vpa?: string;
  };

  if (payData.currency !== 'INR' || payData.amount !== expectedAmountPaise) {
    return { ok: false, status: 400, error: 'Payment amount or currency mismatch.' };
  }
  if (expectedOrderId && payData.order_id && payData.order_id !== expectedOrderId) {
    return { ok: false, status: 400, error: 'Payment order ID mismatch.' };
  }

  if (payData.status === 'authorized') {
    try {
      const capRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: expectedAmountPaise, currency: 'INR' }),
        }
      );
      if (!capRes.ok) {
        return { ok: false, status: 402, error: 'Authorized payment could not be captured.' };
      }
      const capData = (await capRes.json()) as { status?: string };
      if (capData.status !== 'captured') {
        return { ok: false, status: 402, error: `Payment capture returned ${capData.status || 'unknown'}.` };
      }
    } catch {
      return { ok: false, status: 502, error: 'Network error while capturing authorized payment.' };
    }
  } else if (payData.status !== 'captured') {
    return {
      ok: false,
      status: 400,
      error: `Payment status is '${payData.status || 'unknown'}', not captured.`,
    };
  }

  return { ok: true, vpa: payData.vpa };
}

async function findCapturedRazorpayPaymentByUtr(
  utr: string,
  expectedAmountPaise: number,
  keyId: string,
  keySecret: string
): Promise<{ paymentId: string; orderId: string; vpa: string } | null> {
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  try {
    const res = await fetch('https://api.razorpay.com/v1/payments?count=50', {
      headers: { Authorization: `Basic ${authHeader}` },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      items?: Array<{
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        vpa?: string;
        acquirer_data?: {
          rrn?: string;
          upi_transaction_id?: string;
          bank_transaction_id?: string;
        };
      }>;
    };
    const needle = utr.trim().toUpperCase();
    for (const item of payload.items || []) {
      if (!item.id || item.status !== 'captured') continue;
      if (item.currency !== 'INR' || item.amount !== expectedAmountPaise) continue;
      if (settledPaymentRefs.has(item.id)) continue;
      const refs = [
        item.acquirer_data?.rrn,
        item.acquirer_data?.upi_transaction_id,
        item.acquirer_data?.bank_transaction_id,
      ]
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim().toUpperCase());
      if (refs.includes(needle)) {
        return {
          paymentId: item.id,
          orderId: item.order_id || `RZP_${needle}`,
          vpa: item.vpa || 'razorpay_upi',
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

interface RoomMember {
  id: string;
  name: string;
  skinId: string;
  parachuteId: string;
  isHost: boolean;
  ready: boolean;
  voiceActive?: boolean;
  ws: WebSocket;
}

type ServerMapId = 'bermuda' | 'purgatory' | 'alpine';

function normalizeServerMapId(raw: unknown): ServerMapId {
  if (raw === 'purgatory' || raw === 'alpine') return raw;
  return 'bermuda';
}

interface RoomRecord {
  roomCode: string;
  mapId: ServerMapId;
  mode: 'br_classic' | 'br_blitz';
  status: 'waiting' | 'active';
  maxPlayers: number;
  isAutoMatch?: boolean;
  members: Map<string, RoomMember>;
}

interface PresenceRecord {
  playerId: string;
  uid: string | null;
  name: string;
  skinId: string;
  level: number;
  rankPoints: number;
  inMatch: boolean;
  ws: WebSocket;
}

interface MatchmakingEntry {
  playerId: string;
  name: string;
  skinId: string;
  parachuteId: string;
  ws: WebSocket;
}

interface MatchmakingQueue {
  key: string;
  mapId: ServerMapId;
  mode: 'br_classic' | 'br_blitz';
  entries: Map<string, MatchmakingEntry>;
  expiresAt: number;
  maxWaitSec: number;
  intervalId: ReturnType<typeof setInterval>;
}

const MATCHMAKE_WAIT_MS = 8000;
const MATCHMAKE_MULTI_LOCK_MS = 3500;
const MATCHMAKE_MAX_REAL_PLAYERS = 16;

const rooms = new Map<string, RoomRecord>();
const matchmakingQueues = new Map<string, MatchmakingQueue>();
const socketMeta = new WeakMap<WebSocket, { playerId: string; roomCode: string | null; matchmakeKey: string | null }>();
const presenceBySocket = new Map<WebSocket, PresenceRecord>();

let nextSocketNum = 1;

function makeRoomCode(prefix = 'FF'): string {
  for (let i = 0; i < 20; i++) {
    const code = prefix + Math.floor(1000 + Math.random() * 9000);
    if (!rooms.has(code)) return code;
  }
  return prefix + Date.now().toString().slice(-4);
}

function serializeRoom(r: RoomRecord) {
  const players = Array.from(r.members.values()).map((m) => ({
    id: m.id,
    name: m.name,
    skinId: m.skinId,
    parachuteId: m.parachuteId,
    isHost: m.isHost,
    ready: m.ready,
  }));
  const host = players.find((p) => p.isHost) || players[0];
  return {
    roomCode: r.roomCode,
    hostName: host ? host.name : 'Host',
    mapId: r.mapId,
    mode: r.mode,
    status: r.status,
    playerCount: players.length,
    maxPlayers: r.maxPlayers,
    players,
  };
}

function listPublicRooms() {
  return Array.from(rooms.values())
    .filter((r) => r.members.size > 0 && !r.isAutoMatch)
    .map(serializeRoom);
}

function listOnlinePlayers() {
  const list: Array<{
    playerId: string;
    uid: string | null;
    name: string;
    skinId: string;
    level: number;
    rankPoints: number;
    status: 'online' | 'in_squad' | 'in_match';
    roomCode: string | null;
  }> = [];

  for (const [ws, p] of presenceBySocket.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    const meta = socketMeta.get(ws);
    const roomCode = meta?.roomCode || null;
    const status = p.inMatch ? 'in_match' : roomCode ? 'in_squad' : 'online';
    list.push({
      playerId: p.playerId,
      uid: p.uid,
      name: p.name,
      skinId: p.skinId,
      level: p.level,
      rankPoints: p.rankPoints,
      status,
      roomCode,
    });
  }
  return list;
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: RoomRecord, payload: unknown, excludeId?: string) {
  const raw = JSON.stringify(payload);
  for (const m of room.members.values()) {
    if (excludeId && m.id === excludeId) continue;
    if (m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(raw);
    }
  }
}

function broadcastRoomList(wss: WebSocketServer) {
  const raw = JSON.stringify({ type: 'room:list', rooms: listPublicRooms() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  });
}

function broadcastPresenceList(wss: WebSocketServer) {
  const raw = JSON.stringify({ type: 'presence:list', players: listOnlinePlayers() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  });
}

function createRoomForSocket(
  ws: WebSocket,
  wss: WebSocketServer,
  opts: {
    mapId?: unknown;
    mode?: unknown;
    name?: unknown;
    skinId?: unknown;
    parachuteId?: unknown;
  }
): RoomRecord | null {
  const meta = socketMeta.get(ws);
  if (!meta) return null;
  leaveCurrentRoom(ws, wss, false);

  const presence = presenceBySocket.get(ws);
  const roomCode = makeRoomCode();
  const mapId = normalizeServerMapId(opts.mapId);
  const mode = opts.mode === 'br_blitz' ? 'br_blitz' : 'br_classic';
  const name = String(opts.name || presence?.name || 'Survivor').slice(0, 16);
  const skinId = String(opts.skinId || presence?.skinId || 'alok').slice(0, 32);
  const parachuteId = String(opts.parachuteId || 'ember').slice(0, 32);

  const room: RoomRecord = {
    roomCode,
    mapId,
    mode,
    status: 'waiting',
    maxPlayers: 16,
    members: new Map(),
  };
  room.members.set(meta.playerId, {
    id: meta.playerId,
    name,
    skinId,
    parachuteId,
    isHost: true,
    ready: true,
    ws,
  });
  rooms.set(roomCode, room);
  meta.roomCode = roomCode;

  const serialized = serializeRoom(room);
  sendJson(ws, { type: 'room:joined', playerId: meta.playerId, room: serialized });
  broadcastRoomList(wss);
  broadcastPresenceList(wss);
  return room;
}

function leaveCurrentRoom(ws: WebSocket, wss: WebSocketServer, shouldBroadcastPresence = true) {
  const meta = socketMeta.get(ws);
  if (!meta || !meta.roomCode) return;
  const room = rooms.get(meta.roomCode);
  meta.roomCode = null;
  if (!room) return;

  const leavingMember = room.members.get(meta.playerId);
  const wasHost = leavingMember?.isHost;
  room.members.delete(meta.playerId);

  if (room.members.size === 0) {
    rooms.delete(room.roomCode);
  } else {
    if (room.status === 'active' && leavingMember) {
      broadcastRoom(room, {
        type: 'player:elim',
        victimId: meta.playerId,
        victimName: leavingMember.name,
        killerName: 'Disconnected',
        weaponName: 'Left Match',
        weaponId: 'deagle',
        vestLevel: 0,
        headshot: false,
        isVehicle: false,
        isZone: true,
      });
    }
    if (wasHost) {
      const nextHost = room.members.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.ready = true;
      }
    }
    if (leavingMember?.voiceActive) {
      broadcastRoom(room, { type: 'voice:peer_left', peerId: meta.playerId });
    }
    broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
  }
  broadcastRoomList(wss);
  if (shouldBroadcastPresence) {
    broadcastPresenceList(wss);
  }
}

function broadcastMatchmakeStatus(queue: MatchmakingQueue) {
  const remainingMs = Math.max(0, queue.expiresAt - Date.now());
  const remainingSec = Math.ceil(remainingMs / 1000);
  const realPlayers = Array.from(queue.entries.values()).map((e) => ({
    id: e.playerId,
    name: e.name,
    skinId: e.skinId,
  }));
  const payload = JSON.stringify({
    type: 'matchmake:status',
    mapId: queue.mapId,
    mode: queue.mode,
    remainingSec,
    maxWaitSec: queue.maxWaitSec,
    realPlayers,
    phase: remainingSec <= 1 ? 'filling_bots' : 'searching',
  });
  for (const entry of queue.entries.values()) {
    if (entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.send(payload);
    }
  }
}

function launchMatchmakingQueue(key: string, wss: WebSocketServer) {
  const queue = matchmakingQueues.get(key);
  if (!queue) return;
  clearInterval(queue.intervalId);
  matchmakingQueues.delete(key);

  const activeEntries = Array.from(queue.entries.values()).filter(
    (e) => e.ws.readyState === WebSocket.OPEN
  );
  if (activeEntries.length === 0) return;

  const roomCode = makeRoomCode('MM');
  const room: RoomRecord = {
    roomCode,
    mapId: queue.mapId,
    mode: queue.mode,
    status: 'active',
    maxPlayers: MATCHMAKE_MAX_REAL_PLAYERS,
    isAutoMatch: true,
    members: new Map(),
  };

  activeEntries.forEach((entry, idx) => {
    const meta = socketMeta.get(entry.ws);
    if (meta) {
      meta.matchmakeKey = null;
      meta.roomCode = roomCode;
    }
    const p = presenceBySocket.get(entry.ws);
    if (p) p.inMatch = true;

    room.members.set(entry.playerId, {
      id: entry.playerId,
      name: entry.name,
      skinId: entry.skinId,
      parachuteId: entry.parachuteId,
      isHost: idx === 0,
      ready: true,
      ws: entry.ws,
    });
  });

  rooms.set(roomCode, room);
  const serialized = serializeRoom(room);
  broadcastRoom(room, {
    type: 'match:start',
    roomCode: room.roomCode,
    isAutoMatch: true,
    mapId: room.mapId,
    mode: room.mode,
    seed: Math.floor(Math.random() * 1_000_000),
    players: serialized.players,
  });
  broadcastRoomList(wss);
  broadcastPresenceList(wss);
}

function leaveMatchmakingQueue(ws: WebSocket, notify = false) {
  const meta = socketMeta.get(ws);
  if (!meta || !meta.matchmakeKey) return;
  const key = meta.matchmakeKey;
  meta.matchmakeKey = null;
  const queue = matchmakingQueues.get(key);
  if (!queue) return;

  queue.entries.delete(meta.playerId);
  if (notify) {
    sendJson(ws, { type: 'matchmake:cancelled' });
  }
  if (queue.entries.size === 0) {
    clearInterval(queue.intervalId);
    matchmakingQueues.delete(key);
  } else {
    broadcastMatchmakeStatus(queue);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size, online: presenceBySocket.size });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: listPublicRooms() });
  });

  app.get('/api/players', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const online = listOnlinePlayers();
    const filtered = q ? online.filter((p) => p.name.toLowerCase().includes(q)) : online;
    res.json({ players: filtered });
  });

  // Payment Gateway Config (exposes only public Key ID & destination UPI VPA, never Key Secret)
  app.get('/api/payments/config', (_req, res) => {
    const { keyId, configured, webhookConfigured } = getRazorpayCredentials();

    res.json({
      merchantUpiId: MERCHANT_UPI_ID,
      merchantName: MERCHANT_NAME,
      currency: 'INR',
      razorpayConfigured: configured,
      razorpayWebhookConfigured: webhookConfigured,
      razorpayKeyId: configured ? keyId : null,
      directUpiRequiresAdminReview: true,
    });
  });

  // Create Authoritative Razorpay Order (Server computes exact INR amount in paise)
  app.post('/api/payments/razorpay/order', async (req, res) => {
    const packId = String(req.body?.packId || '').trim();
    const pack = TOP_UP_PACK_CATALOG[packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Invalid Diamond pack selected.' });
      return;
    }

    const { keyId, keySecret, configured } = getRazorpayCredentials();
    if (!configured) {
      res.status(412).json({
        ok: false,
        code: 'RAZORPAY_NOT_CONFIGURED',
        error: `Razorpay server credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured. Pay directly to ${MERCHANT_UPI_ID} for manual merchant approval or add Razorpay keys in Secrets.`,
      });
      return;
    }

    const payerUpiId = String(req.body?.payerUpiId || '').trim().slice(0, 64);
    const playerName = String(req.body?.playerName || 'Survivor').trim().slice(0, 20);
    const uid = typeof req.body?.uid === 'string' ? req.body.uid.slice(0, 128) : '';
    const amountPaise = pack.inrAmount * 100;
    const receipt = `bd_${pack.id}_${Date.now().toString(36)}`.slice(0, 40);

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          notes: {
            packId: pack.id,
            diamonds: String(pack.diamonds + pack.bonus),
            merchantUpiId: MERCHANT_UPI_ID,
            payerUpiId: payerUpiId || 'upi_checkout',
            playerName,
            uid,
          },
        }),
      });

      const rzpJson = (await rzpRes.json()) as Record<string, unknown>;
      if (!rzpRes.ok || typeof rzpJson.id !== 'string') {
        const errDesc =
          (rzpJson.error as { description?: string } | undefined)?.description ||
          'Razorpay order creation failed.';
        res.status(rzpRes.status || 502).json({ ok: false, error: errDesc });
        return;
      }

      pruneExpiredPaymentOrders();
      pendingPaymentOrders.set(rzpJson.id, {
        orderId: rzpJson.id,
        packId: pack.id,
        amountInr: pack.inrAmount,
        method: 'razorpay',
        payerUpiId,
        createdAt: Date.now(),
        settled: false,
      });

      res.json({
        ok: true,
        keyId,
        orderId: rzpJson.id,
        amountPaise,
        amountInr: pack.inrAmount,
        currency: 'INR',
        merchantUpiId: MERCHANT_UPI_ID,
        merchantName: MERCHANT_NAME,
        pack,
      });
    } catch (err) {
      console.error('Razorpay order error:', err);
      res.status(502).json({
        ok: false,
        error: 'Unable to reach Razorpay API. Check network or use Direct UPI QR.',
      });
    }
  });

  // Verify Razorpay Payment HMAC-SHA256 + Mandatory Live Capture Check (Fail-Closed)
  app.post('/api/payments/razorpay/verify', async (req, res) => {
    const orderId = String(req.body?.razorpay_order_id || '').trim();
    const paymentId = String(req.body?.razorpay_payment_id || '').trim();
    const signature = String(req.body?.razorpay_signature || '').trim();
    const payerUpiId = String(req.body?.payerUpiId || '').trim().slice(0, 64);

    if (!orderId || !paymentId || !signature) {
      res.status(400).json({ ok: false, error: 'Missing Razorpay verification parameters.' });
      return;
    }

    const { keyId, keySecret, configured } = getRazorpayCredentials();
    if (!configured) {
      res.status(412).json({ ok: false, error: 'Razorpay server secret unavailable.' });
      return;
    }

    const orderRecord = pendingPaymentOrders.get(orderId);
    if (!orderRecord) {
      res.status(404).json({ ok: false, error: 'Order not found or expired.' });
      return;
    }
    if (orderRecord.settled || settledPaymentRefs.has(paymentId)) {
      res.status(409).json({ ok: false, error: 'Payment has already been redeemed.' });
      return;
    }

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(400).json({ ok: false, error: 'Invalid Razorpay payment signature.' });
      return;
    }

    const pack = TOP_UP_PACK_CATALOG[orderRecord.packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Unknown pack on order.' });
      return;
    }

    const captureCheck = await verifyAndCaptureRazorpayPayment(
      paymentId,
      pack.inrAmount * 100,
      orderId,
      keyId,
      keySecret
    );
    if (captureCheck.ok === false) {
      res.status(captureCheck.status).json({ ok: false, error: captureCheck.error });
      return;
    }

    orderRecord.settled = true;
    settledPaymentRefs.add(paymentId);
    const totalDiamonds = pack.diamonds + pack.bonus;

    res.json({
      ok: true,
      verified: true,
      transaction: {
        id: paymentId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64),
        orderId,
        paymentRef: paymentId,
        method: 'razorpay_upi',
        merchantUpiId: MERCHANT_UPI_ID,
        payerUpiId: payerUpiId || captureCheck.vpa || orderRecord.payerUpiId || 'razorpay_upi',
        packId: pack.id,
        amountInr: pack.inrAmount,
        diamondsCredited: totalDiamonds,
        expectedDiamonds: totalDiamonds,
        bonusDiamonds: pack.bonus,
        baseDiamonds: pack.diamonds,
        status: 'verified',
        credited: false,
        createdAt: Date.now(),
      },
    });
  });

  // Create Dynamic Single-Use Exact-Amount Razorpay UPI QR Code
  app.post('/api/payments/razorpay/qr', async (req, res) => {
    const packId = String(req.body?.packId || '').trim();
    const pack = TOP_UP_PACK_CATALOG[packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Invalid Diamond pack selected.' });
      return;
    }

    const { keyId, keySecret, configured } = getRazorpayCredentials();
    if (!configured) {
      res.status(412).json({
        ok: false,
        code: 'RAZORPAY_NOT_CONFIGURED',
        error: 'Razorpay server keys are not configured for dynamic auto-verified UPI QR.',
      });
      return;
    }

    const payerUpiId = String(req.body?.payerUpiId || '').trim().slice(0, 64);
    const uid = typeof req.body?.uid === 'string' ? req.body.uid.slice(0, 128) : '';
    const amountPaise = pack.inrAmount * 100;

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const qrRes = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'upi_qr',
          name: `${MERCHANT_NAME} ${pack.diamonds}D`,
          usage: 'single_use',
          fixed_amount: true,
          payment_amount: amountPaise,
          description: `${pack.diamonds + pack.bonus} Diamonds TopUp`,
          close_by: Math.floor(Date.now() / 1000) + 900,
          notes: {
            packId: pack.id,
            merchantUpiId: MERCHANT_UPI_ID,
            uid,
          },
        }),
      });
      const qrData = (await qrRes.json()) as {
        id?: string;
        image_url?: string;
        short_url?: string;
        error?: { description?: string };
      };
      if (!qrRes.ok || !qrData.id) {
        res.status(qrRes.status || 502).json({
          ok: false,
          error: qrData.error?.description || 'Failed to generate Razorpay Dynamic UPI QR.',
        });
        return;
      }

      pendingPaymentOrders.set(qrData.id, {
        orderId: qrData.id,
        packId: pack.id,
        amountInr: pack.inrAmount,
        method: 'razorpay_qr',
        payerUpiId,
        createdAt: Date.now(),
        settled: false,
      });

      res.json({
        ok: true,
        qrId: qrData.id,
        imageUrl: qrData.image_url || '',
        shortUrl: qrData.short_url || '',
        amountInr: pack.inrAmount,
        pack,
      });
    } catch {
      res.status(502).json({
        ok: false,
        error: 'Unable to reach Razorpay QR API.',
      });
    }
  });

  // Poll Dynamic Razorpay QR Payment Settlement
  app.get('/api/payments/razorpay/qr-status/:qrId', async (req, res) => {
    const qrId = String(req.params.qrId || '').trim();
    const orderRecord = pendingPaymentOrders.get(qrId);
    if (!orderRecord || orderRecord.method !== 'razorpay_qr') {
      res.status(404).json({ ok: false, error: 'QR session not found or expired.' });
      return;
    }
    if (orderRecord.settled) {
      res.status(409).json({ ok: false, error: 'QR payment already redeemed.' });
      return;
    }

    const { keyId, keySecret, configured } = getRazorpayCredentials();
    if (!configured) {
      res.status(412).json({ ok: false, error: 'Razorpay credentials unavailable.' });
      return;
    }

    const pack = TOP_UP_PACK_CATALOG[orderRecord.packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Invalid pack on QR order.' });
      return;
    }

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const payRes = await fetch(
        `https://api.razorpay.com/v1/payments/qr_codes/${encodeURIComponent(qrId)}/payments?count=5`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      if (!payRes.ok) {
        res.json({ ok: true, paid: false });
        return;
      }
      const payJson = (await payRes.json()) as {
        items?: Array<{ id?: string; status?: string; amount?: number; currency?: string; vpa?: string }>;
      };
      const match = (payJson.items || []).find(
        (item) =>
          typeof item.id === 'string' &&
          !settledPaymentRefs.has(item.id) &&
          item.currency === 'INR' &&
          item.amount === pack.inrAmount * 100 &&
          (item.status === 'captured' || item.status === 'authorized' || webhookConfirmedPaymentIds.has(item.id))
      );

      if (!match || !match.id) {
        res.json({ ok: true, paid: false });
        return;
      }

      const captureCheck = await verifyAndCaptureRazorpayPayment(
        match.id,
        pack.inrAmount * 100,
        null,
        keyId,
        keySecret
      );
      if (captureCheck.ok === false) {
        res.json({ ok: true, paid: false });
        return;
      }

      orderRecord.settled = true;
      settledPaymentRefs.add(match.id);
      const totalDiamonds = pack.diamonds + pack.bonus;

      res.json({
        ok: true,
        paid: true,
        verified: true,
        transaction: {
          id: match.id.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64),
          orderId: qrId,
          paymentRef: match.id,
          method: 'razorpay_qr',
          merchantUpiId: MERCHANT_UPI_ID,
          payerUpiId: match.vpa || orderRecord.payerUpiId || 'razorpay_qr',
          packId: pack.id,
          amountInr: pack.inrAmount,
          diamondsCredited: totalDiamonds,
          expectedDiamonds: totalDiamonds,
          bonusDiamonds: pack.bonus,
          baseDiamonds: pack.diamonds,
          status: 'verified',
          credited: false,
          createdAt: Date.now(),
        },
      });
    } catch {
      res.json({ ok: true, paid: false });
    }
  });

  // Verify a Bank RRN / UPI UTR against Live Captured Razorpay Payments
  app.post('/api/payments/razorpay/verify-utr', async (req, res) => {
    const packId = String(req.body?.packId || '').trim();
    const orderRef = String(req.body?.orderRef || '').trim();
    const utr = String(req.body?.utr || '').trim().toUpperCase();
    const payerUpiId = String(req.body?.payerUpiId || '').trim().slice(0, 64);

    if (isLikelyFakeUtr(utr)) {
      res.status(400).json({
        ok: false,
        verified: false,
        error: 'Invalid or dummy UTR rejected. Enter the genuine 12-digit Bank RRN from your UPI receipt.',
      });
      return;
    }

    if (settledPaymentRefs.has(utr)) {
      res.status(409).json({ ok: false, error: 'This UTR reference has already been redeemed.' });
      return;
    }

    const pack = TOP_UP_PACK_CATALOG[packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Invalid Diamond pack selected.' });
      return;
    }

    const { keyId, keySecret, configured } = getRazorpayCredentials();
    if (!configured) {
      res.status(412).json({
        ok: false,
        verified: false,
        error: 'Razorpay live API keys are required for automated UTR lookup.',
      });
      return;
    }

    const found = await findCapturedRazorpayPaymentByUtr(
      utr,
      pack.inrAmount * 100,
      keyId,
      keySecret
    );
    if (!found) {
      res.status(404).json({
        ok: false,
        verified: false,
        error: `No captured ₹${pack.inrAmount} Razorpay payment found matching UTR ${utr}.`,
      });
      return;
    }

    settledPaymentRefs.add(utr);
    settledPaymentRefs.add(found.paymentId);
    if (orderRef && pendingPaymentOrders.has(orderRef)) {
      const ord = pendingPaymentOrders.get(orderRef);
      if (ord) ord.settled = true;
    }

    const totalDiamonds = pack.diamonds + pack.bonus;
    res.json({
      ok: true,
      verified: true,
      transaction: {
        id: found.paymentId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64),
        orderId: orderRef || utr,
        paymentRef: found.paymentId,
        method: 'razorpay_upi',
        merchantUpiId: MERCHANT_UPI_ID,
        payerUpiId: payerUpiId || found.vpa,
        packId: pack.id,
        amountInr: pack.inrAmount,
        diamondsCredited: totalDiamonds,
        expectedDiamonds: totalDiamonds,
        bonusDiamonds: pack.bonus,
        baseDiamonds: pack.diamonds,
        status: 'verified',
        credited: false,
        createdAt: Date.now(),
      },
    });
  });

  // Razorpay Webhook Listener (Optional secondary confirmation via RAZORPAY_WEBHOOK_SECRET)
  app.post('/api/payments/razorpay/webhook', (req, res) => {
    const { webhookSecret, webhookConfigured } = getRazorpayCredentials();
    if (!webhookConfigured) {
      res.status(412).json({ ok: false, error: 'RAZORPAY_WEBHOOK_SECRET not configured.' });
      return;
    }
    const sig = String(req.header('x-razorpay-signature') || '').trim();
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(400).json({ ok: false, error: 'Invalid webhook signature.' });
      return;
    }
    const paymentEntity = (req.body as { payload?: { payment?: { entity?: { id?: string; status?: string } } } })?.payload?.payment?.entity;
    if (paymentEntity?.id && paymentEntity.status === 'captured') {
      webhookConfirmedPaymentIds.add(paymentEntity.id);
    }
    res.json({ ok: true });
  });

  // Create Direct UPI Intent / Scannable QR Order for 9945901131-1@fam
  app.post('/api/payments/upi/intent', (req, res) => {
    const packId = String(req.body?.packId || '').trim();
    const pack = TOP_UP_PACK_CATALOG[packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Invalid Diamond pack selected.' });
      return;
    }

    const payerUpiId = String(req.body?.payerUpiId || '').trim().slice(0, 64);
    const orderRef = `BDUPI${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    pruneExpiredPaymentOrders();
    pendingPaymentOrders.set(orderRef, {
      orderId: orderRef,
      packId: pack.id,
      amountInr: pack.inrAmount,
      method: 'upi',
      payerUpiId,
      createdAt: Date.now(),
      settled: false,
    });

    const params = new URLSearchParams({
      pa: MERCHANT_UPI_ID,
      pn: MERCHANT_NAME,
      tr: orderRef,
      tn: `${pack.diamonds + pack.bonus} Diamonds TopUp`,
      am: `${pack.inrAmount}.00`,
      cu: 'INR',
    });

    res.json({
      ok: true,
      orderRef,
      merchantUpiId: MERCHANT_UPI_ID,
      merchantName: MERCHANT_NAME,
      amountInr: pack.inrAmount,
      upiUri: `upi://pay?${params.toString()}`,
      pack,
    });
  });

  // Submit Direct UPI UTR (NEVER self-credits fake UTRs! Queues pending verification unless Razorpay API confirms capture)
  app.post('/api/payments/upi/confirm', async (req, res) => {
    const orderRef = String(req.body?.orderRef || '').trim();
    const utr = String(req.body?.utr || '').trim().toUpperCase();
    const payerUpiId = String(req.body?.payerUpiId || '').trim().slice(0, 64);

    if (!orderRef) {
      res.status(400).json({ ok: false, error: 'Missing UPI order reference.' });
      return;
    }
    if (isLikelyFakeUtr(utr)) {
      res.status(400).json({
        ok: false,
        verified: false,
        error: 'Fake or invalid UTR format rejected. Enter the real 12-digit UTR from your UPI payment receipt.',
      });
      return;
    }

    const orderRecord = pendingPaymentOrders.get(orderRef);
    if (!orderRecord) {
      res.status(404).json({ ok: false, error: 'UPI order expired. Please generate a fresh QR.' });
      return;
    }
    if (orderRecord.settled || settledPaymentRefs.has(utr)) {
      res.status(409).json({ ok: false, error: 'This UTR reference has already been submitted or redeemed.' });
      return;
    }

    const pack = TOP_UP_PACK_CATALOG[orderRecord.packId];
    if (!pack) {
      res.status(400).json({ ok: false, error: 'Invalid pack on order.' });
      return;
    }

    // If Razorpay API keys are configured, verify whether this UTR matches a real captured Razorpay payment
    const { keyId, keySecret, configured } = getRazorpayCredentials();
    if (configured) {
      const matched = await findCapturedRazorpayPaymentByUtr(
        utr,
        pack.inrAmount * 100,
        keyId,
        keySecret
      );
      if (matched) {
        orderRecord.settled = true;
        settledPaymentRefs.add(utr);
        settledPaymentRefs.add(matched.paymentId);
        const totalDiamonds = pack.diamonds + pack.bonus;
        res.json({
          ok: true,
          verified: true,
          pending: false,
          transaction: {
            id: matched.paymentId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64),
            orderId: utr,
            paymentRef: matched.paymentId,
            method: 'razorpay_upi',
            merchantUpiId: MERCHANT_UPI_ID,
            payerUpiId: payerUpiId || matched.vpa || orderRecord.payerUpiId || 'upi_app',
            packId: pack.id,
            amountInr: pack.inrAmount,
            diamondsCredited: totalDiamonds,
            expectedDiamonds: totalDiamonds,
            bonusDiamonds: pack.bonus,
            baseDiamonds: pack.diamonds,
            status: 'verified',
            credited: false,
            createdAt: Date.now(),
          },
        });
        return;
      }
    }

    // Direct UPI to 9945901131-1@fam cannot verify bank settlement without merchant/bank confirmation:
    // Queue as pending_verification with 0 Diamonds credited!
    orderRecord.settled = true;
    settledPaymentRefs.add(utr);
    const totalDiamonds = pack.diamonds + pack.bonus;

    res.json({
      ok: true,
      verified: false,
      pending: true,
      message: `UTR ${utr} queued for merchant verification on ${MERCHANT_UPI_ID}. 0 Diamonds credited until confirmed.`,
      transaction: {
        id: `UPI_${utr}`,
        orderId: orderRef,
        paymentRef: utr,
        method: 'direct_upi',
        merchantUpiId: MERCHANT_UPI_ID,
        payerUpiId: payerUpiId || orderRecord.payerUpiId || 'upi_app',
        packId: pack.id,
        amountInr: pack.inrAmount,
        diamondsCredited: 0,
        expectedDiamonds: totalDiamonds,
        bonusDiamonds: pack.bonus,
        baseDiamonds: pack.diamonds,
        status: 'pending_verification',
        credited: false,
        createdAt: Date.now(),
      },
    });
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const playerId = `P_${nextSocketNum++}_${Math.random().toString(36).slice(2, 6)}`;
    socketMeta.set(ws, { playerId, roomCode: null, matchmakeKey: null });
    presenceBySocket.set(ws, {
      playerId,
      uid: null,
      name: `Survivor_${nextSocketNum}`,
      skinId: 'alok',
      level: 1,
      rankPoints: 1000,
      inMatch: false,
      ws,
    });
    sendJson(ws, {
      type: 'welcome',
      playerId,
      rooms: listPublicRooms(),
      players: listOnlinePlayers(),
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      const meta = socketMeta.get(ws);
      if (!meta) return;
      const type = String(msg.type || '');

      if (type === 'presence:identify') {
        const cleanName = String(msg.name || 'Survivor').trim().slice(0, 20) || 'Survivor';
        const cleanSkin = String(msg.skinId || 'alok').slice(0, 32);
        const uid = typeof msg.uid === 'string' && msg.uid.trim() ? msg.uid.trim().slice(0, 128) : null;
        const level = Math.max(1, Math.min(999, Number(msg.level || 1)));
        const rankPoints = Math.max(0, Math.min(1000000, Number(msg.rankPoints || 0)));
        const inMatch = Boolean(msg.inMatch);

        presenceBySocket.set(ws, {
          playerId: meta.playerId,
          uid,
          name: cleanName,
          skinId: cleanSkin,
          level,
          rankPoints,
          inMatch,
          ws,
        });

        // Also update member info if currently in a waiting room
        if (meta.roomCode) {
          const room = rooms.get(meta.roomCode);
          const member = room?.members.get(meta.playerId);
          if (room && member) {
            member.name = cleanName.slice(0, 16);
            member.skinId = cleanSkin;
            broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
          }
        }

        broadcastPresenceList(wss);
        return;
      }

      if (type === 'presence:list') {
        sendJson(ws, { type: 'presence:list', players: listOnlinePlayers() });
        return;
      }

      if (type === 'matchmake:join') {
        leaveMatchmakingQueue(ws, false);
        leaveCurrentRoom(ws, wss, false);

        const presence = presenceBySocket.get(ws);
        const mapId = normalizeServerMapId(msg.mapId);
        const mode = msg.mode === 'br_blitz' ? 'br_blitz' : 'br_classic';
        const name = String(msg.name || presence?.name || 'Survivor').trim().slice(0, 16) || 'Survivor';
        const skinId = String(msg.skinId || presence?.skinId || 'alok').slice(0, 32);
        const parachuteId = String(msg.parachuteId || 'ember').slice(0, 32);
        const key = `${mapId}:${mode}`;

        let queue = matchmakingQueues.get(key);
        if (!queue) {
          const expiresAt = Date.now() + MATCHMAKE_WAIT_MS;
          const intervalId = setInterval(() => {
            const activeQ = matchmakingQueues.get(key);
            if (!activeQ) {
              clearInterval(intervalId);
              return;
            }
            if (Date.now() >= activeQ.expiresAt) {
              launchMatchmakingQueue(key, wss);
            } else {
              broadcastMatchmakeStatus(activeQ);
            }
          }, 500);

          queue = {
            key,
            mapId,
            mode,
            entries: new Map(),
            expiresAt,
            maxWaitSec: Math.ceil(MATCHMAKE_WAIT_MS / 1000),
            intervalId,
          };
          matchmakingQueues.set(key, queue);
        }

        queue.entries.set(meta.playerId, {
          playerId: meta.playerId,
          name,
          skinId,
          parachuteId,
          ws,
        });
        meta.matchmakeKey = key;

        if (queue.entries.size >= MATCHMAKE_MAX_REAL_PLAYERS) {
          launchMatchmakingQueue(key, wss);
          return;
        }
        if (queue.entries.size >= 2) {
          queue.expiresAt = Math.min(queue.expiresAt, Date.now() + MATCHMAKE_MULTI_LOCK_MS);
        }
        broadcastMatchmakeStatus(queue);
        return;
      }

      if (type === 'matchmake:leave') {
        leaveMatchmakingQueue(ws, true);
        return;
      }

      if (type === 'matchmake:launch_now') {
        if (meta.matchmakeKey) {
          launchMatchmakingQueue(meta.matchmakeKey, wss);
        }
        return;
      }

      if (type === 'room:list') {
        sendJson(ws, { type: 'room:list', rooms: listPublicRooms() });
        return;
      }

      if (type === 'room:create') {
        leaveMatchmakingQueue(ws, false);
        createRoomForSocket(ws, wss, msg);
        return;
      }

      if (type === 'room:join') {
        const roomCode = String(msg.roomCode || '').trim().toUpperCase();
        const room = rooms.get(roomCode);
        if (!room) {
          sendJson(ws, { type: 'room:error', message: `Room ${roomCode} not found.` });
          return;
        }
        if (room.status !== 'waiting') {
          sendJson(ws, { type: 'room:error', message: `Room ${roomCode} is already in match.` });
          return;
        }
        if (room.members.size >= room.maxPlayers) {
          sendJson(ws, { type: 'room:error', message: `Room ${roomCode} is full.` });
          return;
        }

        leaveCurrentRoom(ws, wss, false);
        const name = String(msg.name || 'Survivor').slice(0, 16);
        const skinId = String(msg.skinId || 'alok').slice(0, 32);
        const parachuteId = String(msg.parachuteId || 'ember').slice(0, 32);

        room.members.set(meta.playerId, {
          id: meta.playerId,
          name,
          skinId,
          parachuteId,
          isHost: false,
          ready: true,
          ws,
        });
        meta.roomCode = roomCode;

        const serialized = serializeRoom(room);
        sendJson(ws, { type: 'room:joined', playerId: meta.playerId, room: serialized });
        broadcastRoom(room, { type: 'room:state', room: serialized }, meta.playerId);
        broadcastRoomList(wss);
        broadcastPresenceList(wss);
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom(ws, wss);
        sendJson(ws, { type: 'room:left' });
        return;
      }

      if (type === 'squad:invite') {
        let room = meta.roomCode ? rooms.get(meta.roomCode) || null : null;
        if (!room) {
          room = createRoomForSocket(ws, wss, {
            mapId: msg.mapId,
            mode: msg.mode,
            name: msg.fromName,
            skinId: msg.fromSkinId,
            parachuteId: msg.fromParachuteId,
          });
        }
        if (!room) {
          sendJson(ws, { type: 'squad:invite_status', ok: false, message: 'Could not create squad lobby.' });
          return;
        }
        if (room.status !== 'waiting') {
          sendJson(ws, { type: 'squad:invite_status', ok: false, message: 'Match already started in this room.' });
          return;
        }
        if (room.members.size >= room.maxPlayers) {
          sendJson(ws, { type: 'squad:invite_status', ok: false, message: 'Squad lobby is full.' });
          return;
        }

        const targetPlayerId = typeof msg.targetPlayerId === 'string' ? msg.targetPlayerId : null;
        const targetUid = typeof msg.targetUid === 'string' ? msg.targetUid : null;
        const targetName = typeof msg.targetName === 'string' ? msg.targetName.trim().toLowerCase() : null;

        let targetRecord: PresenceRecord | null = null;
        for (const [candidateWs, rec] of presenceBySocket.entries()) {
          if (candidateWs === ws || candidateWs.readyState !== WebSocket.OPEN) continue;
          if (targetPlayerId && rec.playerId === targetPlayerId) {
            targetRecord = rec;
            break;
          }
          if (targetUid && rec.uid && rec.uid === targetUid) {
            targetRecord = rec;
            break;
          }
          if (targetName && rec.name.toLowerCase() === targetName) {
            targetRecord = rec;
            break;
          }
        }

        if (!targetRecord) {
          sendJson(ws, {
            type: 'squad:invite_status',
            ok: false,
            message: `${msg.targetName || 'Player'} is currently offline.`,
          });
          return;
        }

        if (targetRecord.inMatch) {
          sendJson(ws, {
            type: 'squad:invite_status',
            ok: false,
            message: `${targetRecord.name} is currently in a match.`,
          });
          return;
        }

        const targetMeta = socketMeta.get(targetRecord.ws);
        if (targetMeta?.roomCode === room.roomCode) {
          sendJson(ws, {
            type: 'squad:invite_status',
            ok: false,
            message: `${targetRecord.name} is already in your squad lobby.`,
          });
          return;
        }

        const senderPresence = presenceBySocket.get(ws);
        const inviteId = `INV_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        sendJson(targetRecord.ws, {
          type: 'squad:invited',
          inviteId,
          fromPlayerId: meta.playerId,
          fromName: senderPresence?.name || 'Survivor',
          fromSkinId: senderPresence?.skinId || 'alok',
          roomCode: room.roomCode,
          mapId: room.mapId,
          mode: room.mode,
        });

        sendJson(ws, {
          type: 'squad:invite_status',
          ok: true,
          roomCode: room.roomCode,
          targetName: targetRecord.name,
          message: `Squad invite sent to ${targetRecord.name} (Room ${room.roomCode})!`,
        });
        return;
      }

      if (type === 'squad:invite_reply') {
        const fromPlayerId = String(msg.fromPlayerId || '');
        const accepted = Boolean(msg.accepted);
        const myPresence = presenceBySocket.get(ws);
        if (!accepted && fromPlayerId) {
          for (const [candidateWs, rec] of presenceBySocket.entries()) {
            if (rec.playerId === fromPlayerId && candidateWs.readyState === WebSocket.OPEN) {
              sendJson(candidateWs, {
                type: 'squad:invite_status',
                ok: false,
                message: `${myPresence?.name || 'Survivor'} declined your squad invite.`,
              });
              break;
            }
          }
        }
        return;
      }

      if (type === 'friend:request') {
        const targetUid =
          typeof msg.targetUid === 'string'
            ? msg.targetUid.trim()
            : typeof msg.toUid === 'string'
              ? msg.toUid.trim()
              : '';
        const targetPlayerId = typeof msg.targetPlayerId === 'string' ? msg.targetPlayerId.trim() : '';
        const targetName = (
          typeof msg.targetName === 'string'
            ? msg.targetName
            : typeof msg.toName === 'string'
              ? msg.toName
              : ''
        )
          .trim()
          .toLowerCase();
        const sender = presenceBySocket.get(ws);
        for (const [candidateWs, rec] of presenceBySocket.entries()) {
          if (candidateWs === ws || candidateWs.readyState !== WebSocket.OPEN) continue;
          const matched =
            (targetUid && (rec.uid === targetUid || rec.playerId === targetUid)) ||
            (targetPlayerId && rec.playerId === targetPlayerId) ||
            (targetName && rec.name.trim().toLowerCase() === targetName);
          if (matched) {
            sendJson(candidateWs, {
              type: 'friend:request',
              fromUid: sender?.uid || meta.playerId,
              fromPlayerId: meta.playerId,
              fromName: sender?.name || String(msg.fromName || 'Survivor').slice(0, 20),
              fromSkinId: sender?.skinId || String(msg.fromSkinId || 'alok').slice(0, 32),
              fromLevel: sender?.level || Number(msg.fromLevel || 1),
              fromRankPoints: sender?.rankPoints || Number(msg.fromRankPoints || 1000),
            });
            break;
          }
        }
        return;
      }

      if (type === 'friend:accept') {
        const targetUid =
          typeof msg.targetUid === 'string'
            ? msg.targetUid.trim()
            : typeof msg.toUid === 'string'
              ? msg.toUid.trim()
              : '';
        const targetPlayerId = typeof msg.targetPlayerId === 'string' ? msg.targetPlayerId.trim() : '';
        const targetName = (
          typeof msg.targetName === 'string'
            ? msg.targetName
            : typeof msg.toName === 'string'
              ? msg.toName
              : ''
        )
          .trim()
          .toLowerCase();
        const sender = presenceBySocket.get(ws);
        for (const [candidateWs, rec] of presenceBySocket.entries()) {
          if (candidateWs === ws || candidateWs.readyState !== WebSocket.OPEN) continue;
          const matched =
            (targetUid && (rec.uid === targetUid || rec.playerId === targetUid)) ||
            (targetPlayerId && rec.playerId === targetPlayerId) ||
            (targetName && rec.name.trim().toLowerCase() === targetName);
          if (matched) {
            sendJson(candidateWs, {
              type: 'friend:accept',
              fromUid: sender?.uid || meta.playerId,
              fromPlayerId: meta.playerId,
              fromName: sender?.name || String(msg.fromName || 'Survivor').slice(0, 20),
              fromSkinId: sender?.skinId || String(msg.fromSkinId || 'alok').slice(0, 32),
              fromLevel: sender?.level || Number(msg.fromLevel || 1),
              fromRankPoints: sender?.rankPoints || Number(msg.fromRankPoints || 1000),
            });
            break;
          }
        }
        return;
      }

      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const member = room.members.get(meta.playerId);
      if (!member) return;

      if (type === 'room:ready') {
        member.ready = Boolean(msg.ready);
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (type === 'room:config' && member.isHost) {
        if (msg.mapId === 'bermuda' || msg.mapId === 'purgatory' || msg.mapId === 'alpine') {
          room.mapId = msg.mapId;
        }
        if (msg.mode === 'br_classic' || msg.mode === 'br_blitz') room.mode = msg.mode;
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        broadcastRoomList(wss);
        return;
      }

      if (type === 'room:start' && member.isHost) {
        room.status = 'active';
        for (const m of room.members.values()) {
          const p = presenceBySocket.get(m.ws);
          if (p) p.inMatch = true;
        }
        const serialized = serializeRoom(room);
        broadcastRoom(room, {
          type: 'match:start',
          roomCode: room.roomCode,
          mapId: room.mapId,
          mode: room.mode,
          seed: Math.floor(Math.random() * 1_000_000),
          players: serialized.players,
        });
        broadcastRoomList(wss);
        broadcastPresenceList(wss);
        return;
      }

      if (type === 'room:reset') {
        room.status = 'waiting';
        const p = presenceBySocket.get(ws);
        if (p) p.inMatch = false;
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        broadcastRoomList(wss);
        broadcastPresenceList(wss);
        return;
      }

      // Live In-Match Synchronization
      if (type === 'player:state') {
        broadcastRoom(
          room,
          {
            type: 'player:state',
            id: meta.playerId,
            x: Number(msg.x || 0),
            y: Number(msg.y || 0),
            z: Number(msg.z || 0),
            yaw: Number(msg.yaw || 0),
            hp: Number(msg.hp || 0),
            alive: Boolean(msg.alive),
            crouching: Boolean(msg.crouching),
            prone: Boolean(msg.prone),
            parachuteOpen: Boolean(msg.parachuteOpen),
            inPlane: Boolean(msg.inPlane),
            moving: Boolean(msg.moving),
            weaponId: String(msg.weaponId || 'deagle'),
            weaponSkinId: typeof msg.weaponSkinId === 'string' ? msg.weaponSkinId.slice(0, 32) : undefined,
          },
          meta.playerId
        );
        return;
      }

      if (type === 'player:shoot') {
        broadcastRoom(
          room,
          {
            type: 'player:shoot',
            id: meta.playerId,
            fromX: Number(msg.fromX || 0),
            fromY: Number(msg.fromY || 0),
            fromZ: Number(msg.fromZ || 0),
            toX: Number(msg.toX || 0),
            toY: Number(msg.toY || 0),
            toZ: Number(msg.toZ || 0),
            weaponId: String(msg.weaponId || 'ak47'),
          },
          meta.playerId
        );
        return;
      }

      if (type === 'player:gloo') {
        broadcastRoom(
          room,
          {
            type: 'player:gloo',
            id: meta.playerId,
            x: Number(msg.x || 0),
            y: Number(msg.y || 0),
            z: Number(msg.z || 0),
            yaw: Number(msg.yaw || 0),
            skinId: String(msg.skinId || 'frost'),
          },
          meta.playerId
        );
        return;
      }

      if (type === 'player:hit') {
        const targetId = String(msg.targetId || '');
        const target = room.members.get(targetId);
        if (target) {
          sendJson(target.ws, {
            type: 'player:hit',
            attackerId: meta.playerId,
            attackerName: member.name,
            damage: Math.max(0, Math.min(350, Number(msg.damage || 0))),
            headshot: Boolean(msg.headshot),
            weaponName: String(msg.weaponName || 'Weapon').slice(0, 24),
          });
        }
        return;
      }

      if (type === 'player:emote') {
        const emoteId = String(msg.emoteId || 'hello').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 32);
        broadcastRoom(
          room,
          {
            type: 'player:emote',
            id: meta.playerId,
            emoteId,
          },
          meta.playerId
        );
        return;
      }

      // Squad WebRTC Voice Chat Signaling (strictly room-isolated)
      if (type === 'voice:join') {
        member.voiceActive = true;
        const peers = Array.from(room.members.values())
          .filter((m) => m.id !== meta.playerId && m.voiceActive)
          .map((m) => ({ id: m.id, name: m.name }));
        sendJson(ws, { type: 'voice:peers', peers });
        broadcastRoom(
          room,
          { type: 'voice:peer_joined', peerId: meta.playerId, name: member.name },
          meta.playerId
        );
        return;
      }

      if (type === 'voice:leave') {
        member.voiceActive = false;
        broadcastRoom(room, { type: 'voice:peer_left', peerId: meta.playerId }, meta.playerId);
        return;
      }

      if (type === 'voice:speaking') {
        broadcastRoom(
          room,
          {
            type: 'voice:speaking',
            peerId: meta.playerId,
            name: member.name,
            speaking: Boolean(msg.speaking),
          },
          meta.playerId
        );
        return;
      }

      if (type === 'voice:offer' || type === 'voice:answer' || type === 'voice:ice') {
        const targetId = String(msg.targetId || '');
        const target = room.members.get(targetId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          sendJson(target.ws, {
            type,
            fromId: meta.playerId,
            fromName: member.name,
            sdp: msg.sdp,
            candidate: msg.candidate,
          });
        }
        return;
      }

      if (type === 'player:elim') {
        const sanitizedSlots = Array.isArray(msg.slots)
          ? msg.slots
              .slice(0, 3)
              .filter((s: unknown): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
              .map((s) => ({
                weaponId: String(s.weaponId || 'deagle').slice(0, 16),
                mag: Math.max(0, Math.min(200, Math.floor(Number(s.mag || 0)))),
                reserve: Math.max(0, Math.min(999, Math.floor(Number(s.reserve || 0)))),
              }))
          : undefined;
        broadcastRoom(
          room,
          {
            type: 'player:elim',
            victimId: meta.playerId,
            victimName: member.name,
            crateKey:
              typeof msg.crateKey === 'string'
                ? msg.crateKey.slice(0, 64)
                : `mp_${meta.playerId}`,
            killerId: typeof msg.killerId === 'string' ? msg.killerId.slice(0, 64) : undefined,
            killerName: String(msg.killerName || 'Enemy').slice(0, 32),
            weaponName: String(msg.weaponName || 'Weapon').slice(0, 24),
            weaponId: typeof msg.weaponId === 'string' ? msg.weaponId.slice(0, 24) : 'deagle',
            slots: sanitizedSlots,
            medkits: Math.max(0, Math.min(20, Math.floor(Number(msg.medkits ?? 1)))),
            glooWalls: Math.max(0, Math.min(20, Math.floor(Number(msg.glooWalls ?? 1)))),
            vestLevel: Math.max(0, Math.min(3, Math.floor(Number(msg.vestLevel || 0)))),
            helmetLevel: Math.max(0, Math.min(3, Math.floor(Number(msg.helmetLevel || 0)))),
            headshot: Boolean(msg.headshot),
            isVehicle: Boolean(msg.isVehicle),
            isZone: Boolean(msg.isZone),
            x: Number.isFinite(Number(msg.x)) ? Number(msg.x) : undefined,
            y: Number.isFinite(Number(msg.y)) ? Number(msg.y) : undefined,
            z: Number.isFinite(Number(msg.z)) ? Number(msg.z) : undefined,
            attackerX: Number.isFinite(Number(msg.attackerX)) ? Number(msg.attackerX) : undefined,
            attackerZ: Number.isFinite(Number(msg.attackerZ)) ? Number(msg.attackerZ) : undefined,
          },
          meta.playerId
        );
        return;
      }

      if (type === 'crate:loot') {
        const crateKey = typeof msg.crateKey === 'string' ? msg.crateKey.slice(0, 64) : '';
        if (!crateKey) return;
        broadcastRoom(
          room,
          {
            type: 'crate:loot',
            crateKey,
            looterId: meta.playerId,
          },
          meta.playerId
        );
      }
    });

    ws.on('close', () => {
      presenceBySocket.delete(ws);
      leaveMatchmakingQueue(ws, false);
      leaveCurrentRoom(ws, wss, false);
      broadcastPresenceList(wss);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BLAZE DROP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
