export interface VoicePeerStatus {
  id: string;
  name: string;
  connected: boolean;
  speaking: boolean;
}

export interface VoiceClientSnapshot {
  joined: boolean;
  talking: boolean;
  speakerMuted: boolean;
  micReady: boolean;
  micPending: boolean;
  micLevel: number; // 0..1
  micError: string | null;
  peers: VoicePeerStatus[];
}

interface PeerEntry {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  audioSender: RTCRtpSender | null;
  audioEl: HTMLAudioElement | null;
  connected: boolean;
  speaking: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class SquadVoiceClient {
  private localId: string;
  private roomCode: string | null;
  private sendSignal: (payload: Record<string, unknown>) => void;
  private onSnapshot: (snapshot: VoiceClientSnapshot) => void;

  private peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private meterRafId: number | null = null;

  private joined = false;
  private talking = false;
  private speakerMuted = false;
  private micPending = false;
  private micLevel = 0;
  private micError: string | null = null;
  private disposed = false;

  constructor(options: {
    localId: string;
    roomCode: string | null;
    sendSignal: (payload: Record<string, unknown>) => void;
    onSnapshot: (snapshot: VoiceClientSnapshot) => void;
  }) {
    this.localId = options.localId;
    this.roomCode = options.roomCode;
    this.sendSignal = options.sendSignal;
    this.onSnapshot = options.onSnapshot;
  }

  public joinRoom() {
    if (this.disposed || this.joined) return;
    this.joined = true;
    if (this.roomCode && this.localId) {
      this.sendSignal({ type: 'voice:join' });
    }
    this.emitSnapshot();
  }

  public setSpeakerMuted(muted: boolean) {
    this.speakerMuted = muted;
    this.peers.forEach((peer) => {
      if (peer.audioEl) {
        peer.audioEl.muted = muted;
      }
    });
    this.emitSnapshot();
  }

  public async setTalking(active: boolean) {
    if (this.disposed) return;
    if (!active) {
      this.talking = false;
      this.micLevel = 0;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      if (this.roomCode) {
        this.sendSignal({ type: 'voice:speaking', speaking: false });
      }
      this.emitSnapshot();
      return;
    }

    this.talking = true;
    this.micError = null;
    this.emitSnapshot();

    const stream = await this.ensureMicrophone();
    if (this.disposed || !this.talking) {
      if (stream) {
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      return;
    }

    if (!stream) {
      this.talking = false;
      this.emitSnapshot();
      return;
    }

    stream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });

    await this.attachLocalStreamToPeers(stream);

    if (this.roomCode) {
      this.sendSignal({ type: 'voice:speaking', speaking: true });
    }
    this.startMeterLoop();
    this.emitSnapshot();
  }

  public handleSignal(msg: Record<string, unknown>) {
    if (this.disposed) return;
    const type = String(msg.type || '');

    if (type === 'voice:peers') {
      const list = Array.isArray(msg.peers) ? msg.peers : [];
      list.forEach((raw) => {
        const p = raw as { id?: unknown; name?: unknown };
        const id = String(p.id || '');
        const name = String(p.name || 'Squadmate');
        if (id && id !== this.localId) {
          this.ensurePeer(id, name, this.localId < id);
        }
      });
      this.emitSnapshot();
      return;
    }

    if (type === 'voice:peer_joined') {
      const id = String(msg.peerId || '');
      const name = String(msg.name || 'Squadmate');
      if (id && id !== this.localId) {
        this.ensurePeer(id, name, this.localId < id);
        this.emitSnapshot();
      }
      return;
    }

    if (type === 'voice:peer_left') {
      const id = String(msg.peerId || '');
      if (id) {
        this.removePeer(id);
        this.emitSnapshot();
      }
      return;
    }

    if (type === 'voice:speaking') {
      const id = String(msg.peerId || '');
      const peer = this.peers.get(id);
      if (peer) {
        peer.speaking = Boolean(msg.speaking);
        this.emitSnapshot();
      }
      return;
    }

    if (type === 'voice:offer' || type === 'voice:answer') {
      const fromId = String(msg.fromId || '');
      const fromName = String(msg.fromName || 'Squadmate');
      if (!fromId || fromId === this.localId || !msg.sdp) return;
      void this.handleSdp(fromId, fromName, msg.sdp as RTCSessionDescriptionInit);
      return;
    }

    if (type === 'voice:ice') {
      const fromId = String(msg.fromId || '');
      if (!fromId || fromId === this.localId || !msg.candidate) return;
      const peer = this.peers.get(fromId);
      if (peer) {
        void peer.pc.addIceCandidate(new RTCIceCandidate(msg.candidate as RTCIceCandidateInit)).catch(() => undefined);
      }
    }
  }

  private async ensureMicrophone(): Promise<MediaStream | null> {
    if (this.localStream) return this.localStream;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.micError = 'Mic unsupported';
      return null;
    }
    this.micPending = true;
    this.emitSnapshot();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (this.disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return null;
      }
      this.localStream = stream;
      this.micPending = false;
      this.micError = null;
      this.setupAnalyser(stream);
      return stream;
    } catch (err) {
      this.micPending = false;
      const name = err instanceof Error ? err.name : '';
      this.micError =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Mic denied'
          : name === 'NotFoundError'
          ? 'No mic found'
          : 'Mic error';
      return null;
    }
  }

  private setupAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.audioCtx = ctx;
      this.analyser = analyser;
      this.analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      // Optional meter only
    }
  }

  private startMeterLoop() {
    if (this.meterRafId !== null || !this.analyser || !this.analyserData) return;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => undefined);
    }
    const tick = () => {
      if (this.disposed || !this.talking || !this.analyser || !this.analyserData) {
        this.meterRafId = null;
        this.micLevel = 0;
        return;
      }
      this.analyser.getByteTimeDomainData(this.analyserData);
      let sum = 0;
      for (let i = 0; i < this.analyserData.length; i++) {
        const v = (this.analyserData[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.analyserData.length);
      this.micLevel = Math.min(1, rms * 3.8);
      this.emitSnapshot();
      this.meterRafId = window.requestAnimationFrame(tick);
    };
    this.meterRafId = window.requestAnimationFrame(tick);
  }

  private async attachLocalStreamToPeers(stream: MediaStream) {
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    const tasks: Promise<void>[] = [];
    this.peers.forEach((peer) => {
      if (peer.audioSender) {
        tasks.push(peer.audioSender.replaceTrack(track).catch(() => undefined));
      } else {
        const sender = peer.pc.addTrack(track, stream);
        peer.audioSender = sender;
      }
    });
    await Promise.all(tasks);
  }

  private ensurePeer(id: string, name: string, shouldInitiate: boolean): PeerEntry {
    const existing = this.peers.get(id);
    if (existing) {
      existing.name = name;
      return existing;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    let audioSender: RTCRtpSender | null = null;

    const localTrack = this.localStream?.getAudioTracks()[0] || null;
    if (localTrack && this.localStream) {
      audioSender = pc.addTrack(localTrack, this.localStream);
    } else {
      const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
      audioSender = transceiver.sender;
    }

    const entry: PeerEntry = {
      id,
      name,
      pc,
      audioSender,
      audioEl: null,
      connected: false,
      speaking: false,
      makingOffer: false,
      ignoreOffer: false,
    };
    this.peers.set(id, entry);

    pc.onicecandidate = (ev) => {
      if (ev.candidate && !this.disposed) {
        this.sendSignal({
          type: 'voice:ice',
          targetId: id,
          candidate: ev.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      entry.connected =
        pc.connectionState === 'connected' || pc.iceConnectionState === 'connected';
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        entry.connected = false;
        entry.speaking = false;
      }
      this.emitSnapshot();
    };

    pc.oniceconnectionstatechange = () => {
      entry.connected =
        pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed';
      this.emitSnapshot();
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      if (!entry.audioEl) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        audio.muted = this.speakerMuted;
        audio.style.display = 'none';
        document.body.appendChild(audio);
        entry.audioEl = audio;
      }
      entry.audioEl.srcObject = stream;
      entry.audioEl.muted = this.speakerMuted;
      void entry.audioEl.play().catch(() => undefined);
    };

    pc.onnegotiationneeded = async () => {
      if (!shouldInitiate || this.disposed) return;
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.sendSignal({
            type: 'voice:offer',
            targetId: id,
            sdp: pc.localDescription,
          });
        }
      } catch {
        // Ignore transient negotiation race
      } finally {
        entry.makingOffer = false;
      }
    };

    if (shouldInitiate) {
      void (async () => {
        try {
          entry.makingOffer = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (pc.localDescription && !this.disposed) {
            this.sendSignal({
              type: 'voice:offer',
              targetId: id,
              sdp: pc.localDescription,
            });
          }
        } catch {
          // Ignore offer error on teardown
        } finally {
          entry.makingOffer = false;
        }
      })();
    }

    return entry;
  }

  private async handleSdp(fromId: string, fromName: string, description: RTCSessionDescriptionInit) {
    const polite = this.localId > fromId;
    const peer = this.ensurePeer(fromId, fromName, false);
    const { pc } = peer;
    try {
      const offerCollision =
        description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
      peer.ignoreOffer = !polite && offerCollision;
      if (peer.ignoreOffer) return;

      await pc.setRemoteDescription(new RTCSessionDescription(description));
      if (description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription && !this.disposed) {
          this.sendSignal({
            type: 'voice:answer',
            targetId: fromId,
            sdp: pc.localDescription,
          });
        }
      }
    } catch {
      // Ignore stale SDP signaling race
    }
  }

  private removePeer(id: string) {
    const entry = this.peers.get(id);
    if (!entry) return;
    try {
      entry.pc.close();
    } catch {
      // Ignore close errors
    }
    if (entry.audioEl) {
      entry.audioEl.srcObject = null;
      entry.audioEl.remove();
    }
    this.peers.delete(id);
  }

  private emitSnapshot() {
    if (this.disposed) return;
    const peers: VoicePeerStatus[] = Array.from(this.peers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      speaking: p.speaking,
    }));
    this.onSnapshot({
      joined: this.joined,
      talking: this.talking,
      speakerMuted: this.speakerMuted,
      micReady: Boolean(this.localStream),
      micPending: this.micPending,
      micLevel: this.micLevel,
      micError: this.micError,
      peers,
    });
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.meterRafId !== null) {
      window.cancelAnimationFrame(this.meterRafId);
      this.meterRafId = null;
    }
    if (this.joined && this.roomCode) {
      this.sendSignal({ type: 'voice:speaking', speaking: false });
      this.sendSignal({ type: 'voice:leave' });
    }
    Array.from(this.peers.keys()).forEach((id) => this.removePeer(id));
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
    }
  }
}
