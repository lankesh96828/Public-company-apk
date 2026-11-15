import React, { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, MicOff, VolumeX } from 'lucide-react';
import { SquadVoiceClient, VoiceClientSnapshot } from '../game/voiceChat';

interface SquadVoicePTTProps {
  active: boolean;
  localPlayerId: string | null;
  roomCode?: string;
  playerName: string;
  sendSignal: (payload: Record<string, unknown>) => void;
  registerSignalHandler: (handler: ((msg: Record<string, unknown>) => void) | null) => void;
}

const INITIAL_SNAPSHOT: VoiceClientSnapshot = {
  joined: false,
  talking: false,
  speakerMuted: false,
  micReady: false,
  micPending: false,
  micLevel: 0,
  micError: null,
  peers: [],
};

export const SquadVoicePTT: React.FC<SquadVoicePTTProps> = ({
  active,
  localPlayerId,
  roomCode,
  playerName,
  sendSignal,
  registerSignalHandler,
}) => {
  const clientRef = useRef<SquadVoiceClient | null>(null);
  const [snapshot, setSnapshot] = useState<VoiceClientSnapshot>(INITIAL_SNAPSHOT);
  const pttPointerRef = useRef<number | null>(null);
  const pttKeyHeldRef = useRef(false);
  const sendSignalRef = useRef(sendSignal);
  sendSignalRef.current = sendSignal;

  useEffect(() => {
    if (!active) {
      registerSignalHandler(null);
      clientRef.current?.dispose();
      clientRef.current = null;
      setSnapshot(INITIAL_SNAPSHOT);
      return;
    }

    const client = new SquadVoiceClient({
      localId: localPlayerId || `local_${Date.now()}`,
      roomCode: roomCode || null,
      sendSignal: (payload) => sendSignalRef.current(payload),
      onSnapshot: (next) => setSnapshot(next),
    });
    clientRef.current = client;
    registerSignalHandler((msg) => client.handleSignal(msg));
    client.joinRoom();

    return () => {
      registerSignalHandler(null);
      client.dispose();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
      pttPointerRef.current = null;
      pttKeyHeldRef.current = false;
    };
  }, [active, localPlayerId, roomCode, registerSignalHandler]);

  // Keyboard Push-to-Talk hotkey: hold [X]
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyX' || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (pttKeyHeldRef.current) return;
      pttKeyHeldRef.current = true;
      void clientRef.current?.setTalking(true);
    };

    const stopKeyPtt = () => {
      if (!pttKeyHeldRef.current) return;
      pttKeyHeldRef.current = false;
      if (pttPointerRef.current === null) {
        void clientRef.current?.setTalking(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyX') stopKeyPtt();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopKeyPtt);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopKeyPtt);
    };
  }, [active]);

  if (!active) return null;

  const handlePttPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (pttPointerRef.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pttPointerRef.current = e.pointerId;
    void clientRef.current?.setTalking(true);
  };

  const handlePttPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pttPointerRef.current !== e.pointerId) return;
    pttPointerRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture already released
    }
    if (!pttKeyHeldRef.current) {
      void clientRef.current?.setTalking(false);
    }
  };

  const toggleSpeakerMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    clientRef.current?.setSpeakerMuted(!snapshot.speakerMuted);
  };

  const activeSpeakers = snapshot.peers.filter((p) => p.speaking);
  const meterPct = Math.round(Math.min(1, snapshot.micLevel) * 100);
  const connectedCount = snapshot.peers.filter((p) => p.connected).length;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed right-[76px] top-20 z-20 flex flex-col items-end gap-1.5 touch-none select-none"
    >
      <div className="flex items-center gap-1.5">
        {/* Squad Incoming Voice Mute Toggle */}
        <button
          type="button"
          onClick={toggleSpeakerMute}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={snapshot.speakerMuted ? 'Unmute Squad Voice' : 'Mute Squad Voice'}
          title={snapshot.speakerMuted ? 'Unmute Squad Audio' : 'Mute Squad Audio'}
          className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition-colors ${
            snapshot.speakerMuted
              ? 'border-red-400/70 bg-red-950/90 text-red-300'
              : 'border-white/25 bg-[#0e1218]/90 text-slate-200 hover:border-emerald-400/70'
          }`}
        >
          {snapshot.speakerMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
        </button>

        {/* Push-to-Talk Hold Button */}
        <button
          type="button"
          onPointerDown={handlePttPointerDown}
          onPointerUp={handlePttPointerUp}
          onPointerCancel={handlePttPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Hold to Talk [X]"
          aria-pressed={snapshot.talking}
          title="Hold button or [X] to speak to squad"
          className={`relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-full border-2 shadow-lg transition-colors touch-none ${
            snapshot.talking
              ? 'border-emerald-300 bg-emerald-500 text-slate-950'
              : snapshot.micError
              ? 'border-red-400/75 bg-[#1a0d10]/92 text-red-300'
              : 'border-white/30 bg-[#0e1218]/90 text-emerald-300 hover:border-emerald-400'
          }`}
        >
          {snapshot.talking && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-white/35 transition-[height] duration-75"
              style={{ height: `${Math.max(12, meterPct)}%` }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center">
            {snapshot.talking ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
            <span className="mt-0.5 font-mono-tabular text-[8px] font-bold leading-none">
              {snapshot.talking ? 'LIVE' : 'PTT [X]'}
            </span>
          </div>
        </button>
      </div>

      {/* Concise Voice Channel Status & Error Label */}
      <div className="rounded border border-white/15 bg-[#0e1218]/90 px-2 py-0.5 text-right font-mono-tabular text-[9px] font-semibold text-slate-300 shadow">
        {snapshot.micError ? (
          <span className="text-red-300">{snapshot.micError}</span>
        ) : snapshot.micPending ? (
          <span className="text-amber-300">MIC ACCESS...</span>
        ) : roomCode ? (
          <span>
            VOICE · {connectedCount}/{snapshot.peers.length} PEER{snapshot.peers.length === 1 ? '' : 'S'}
          </span>
        ) : (
          <span>{snapshot.talking ? `MIC ${meterPct}%` : 'VOICE READY'}</span>
        )}
      </div>

      {/* Live Active Speakers Indicator */}
      {(snapshot.talking || activeSpeakers.length > 0) && (
        <div className="flex flex-col items-end gap-1" aria-live="polite">
          {snapshot.talking && (
            <div className="flex items-center gap-1.5 rounded border border-emerald-400/60 bg-[#0c1c16]/95 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow">
              <Mic className="h-3 w-3 shrink-0" />
              <span className="max-w-[96px] truncate">{playerName}</span>
            </div>
          )}
          {activeSpeakers.map((peer) => (
            <div
              key={peer.id}
              className="flex items-center gap-1.5 rounded border border-sky-400/60 bg-[#0d1622]/95 px-2 py-0.5 text-[10px] font-bold text-sky-300 shadow"
            >
              <Mic className="h-3 w-3 shrink-0" />
              <span className="max-w-[96px] truncate">{peer.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
