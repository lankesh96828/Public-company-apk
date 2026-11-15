import * as THREE from 'three';

const MAX_PARTICLES = 960;
const GRAVITY = -6.8;

const PALETTES: ReadonlyArray<ReadonlyArray<number>> = [
  [0xf59e0b, 0xfef08a, 0xff6b00], // Booyah Gold & Blaze Orange
  [0x38bdf8, 0x818cf8, 0xf8fafc], // Diamond Sky & Electric Indigo
  [0xec4899, 0xf472b6, 0xfef08a], // Neon Rose & Gold Spark
  [0x34d399, 0x22d3ee, 0xf8fafc], // Emerald Pulse & Ice Cyan
  [0xfb7185, 0xfbbf24, 0xffffff], // Crimson Flare & Bright White
];

type BurstPattern = 'peony' | 'chrysanthemum' | 'ring' | 'glitter';

interface ScheduledShell {
  delay: number;
  startX: number;
  startZ: number;
  vx: number;
  vy: number;
  vz: number;
  fuseTime: number;
  paletteIndex: number;
  pattern: BurstPattern;
  scale: number;
}

interface ActiveRocket {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  fuseTime: number;
  paletteIndex: number;
  pattern: BurstPattern;
  scale: number;
  trailAccum: number;
}

interface FlashLightSlot {
  light: THREE.PointLight;
  age: number;
  duration: number;
  peakIntensity: number;
}

export interface VictoryFireworksCallbacks {
  onLaunch?: () => void;
  onBurst?: (intensity: number) => void;
}

function createFireworkGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.22, 'rgba(255, 250, 225, 0.92)');
  grad.addColorStop(0.55, 'rgba(255, 200, 110, 0.35)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Pre-allocated color helper to avoid allocations in hot loops
const _tmpColor = new THREE.Color();

export class VictoryFireworksSystem {
  private scene: THREE.Scene;
  private callbacks: VictoryFireworksCallbacks;
  private glowTexture: THREE.CanvasTexture;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;

  // Flat typed arrays for zero-GC particle simulation
  private positions = new Float32Array(MAX_PARTICLES * 3);
  private colors = new Float32Array(MAX_PARTICLES * 3);
  private velX = new Float32Array(MAX_PARTICLES);
  private velY = new Float32Array(MAX_PARTICLES);
  private velZ = new Float32Array(MAX_PARTICLES);
  private life = new Float32Array(MAX_PARTICLES);
  private maxLife = new Float32Array(MAX_PARTICLES);
  private baseR = new Float32Array(MAX_PARTICLES);
  private baseG = new Float32Array(MAX_PARTICLES);
  private baseB = new Float32Array(MAX_PARTICLES);
  private drag = new Float32Array(MAX_PARTICLES);
  private twinkle = new Uint8Array(MAX_PARTICLES);
  private cursor = 0;

  private scheduled: ScheduledShell[] = [];
  private rockets: ActiveRocket[] = [];
  private flashLights: FlashLightSlot[] = [];
  private flashSlotIndex = 0;
  private showRemaining = 0;
  private activeParticleCount = 0;

  constructor(scene: THREE.Scene, callbacks: VictoryFireworksCallbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;

    // Initialize particles far off-screen with 0 life
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.positions[i * 3 + 1] = -999;
      this.life[i] = 0;
    }

    this.glowTexture = createFireworkGlowTexture();
    this.geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(this.colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', posAttr);
    this.geometry.setAttribute('color', colAttr);

    this.material = new THREE.PointsMaterial({
      size: 0.24,
      map: this.glowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.scene.add(this.points);

    // 2 pooled dynamic PointLights to cast real-time firework light onto hangar & character
    for (let i = 0; i < 2; i++) {
      const light = new THREE.PointLight(0xfbbf24, 0, 18, 1.5);
      light.position.set(0, 4.5, -4);
      this.scene.add(light);
      this.flashLights.push({ light, age: 1, duration: 0.6, peakIntensity: 0 });
    }
  }

  public isActive(): boolean {
    return (
      this.showRemaining > 0 ||
      this.scheduled.length > 0 ||
      this.rockets.length > 0 ||
      this.activeParticleCount > 0
    );
  }

  public triggerShow(durationSec = 8.5): void {
    this.scheduled.length = 0;
    this.showRemaining = durationSec;
    this.points.visible = true;

    // Choreographed multi-wave Victory Booyah show framing the hero character
    const patterns: BurstPattern[] = ['chrysanthemum', 'peony', 'ring', 'glitter'];
    const shellCount = 13;

    for (let i = 0; i < shellCount; i++) {
      const isFinale = i >= shellCount - 3;
      const delay = isFinale
        ? Math.max(0.3, durationSec - 2.35) + (i - (shellCount - 3)) * 0.14
        : i * ((durationSec - 3.0) / Math.max(1, shellCount - 4));

      // Alternate left & right hangar flanks so center hero silhouette stays crisp
      const side = i % 2 === 0 ? -1 : 1;
      const startX = isFinale
        ? (i === shellCount - 2 ? 0 : side * 2.8)
        : side * (1.8 + Math.random() * 3.1);
      const startZ = -3.4 - Math.random() * 2.6;
      const targetPeakY = isFinale ? 4.8 + Math.random() * 0.7 : 3.8 + Math.random() * 1.4;
      const fuseTime = isFinale ? 0.62 : 0.52 + Math.random() * 0.18;
      // Solve y(t) = y0 + vy*t + 0.5*g*t^2 => vy = (peak - 0.35 - 0.5*G*t^2) / t
      const vy = (targetPeakY - 0.35 - 0.5 * GRAVITY * fuseTime * fuseTime) / fuseTime;

      this.scheduled.push({
        delay,
        startX,
        startZ,
        vx: (Math.random() - 0.5) * 0.9 - side * 0.25,
        vy,
        vz: (Math.random() - 0.5) * 0.6,
        fuseTime,
        paletteIndex: (i + (isFinale ? 0 : 1)) % PALETTES.length,
        pattern: isFinale ? 'chrysanthemum' : patterns[i % patterns.length],
        scale: isFinale ? 1.25 : 0.92 + Math.random() * 0.22,
      });
    }

    // Immediate opening celebratory gold burst flanking left & right
    this.spawnBurst(new THREE.Vector3(-2.4, 4.1, -3.8), 0, 'peony', 1.0);
    this.spawnBurst(new THREE.Vector3(2.4, 4.3, -4.0), 1, 'ring', 1.0);
    this.callbacks.onBurst?.(1.1);
  }

  private allocParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    hexColor: number,
    lifetime: number,
    dragFactor: number,
    twinkleMode: boolean
  ): void {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;

    const i3 = idx * 3;
    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;

    _tmpColor.setHex(hexColor);
    this.baseR[idx] = _tmpColor.r;
    this.baseG[idx] = _tmpColor.g;
    this.baseB[idx] = _tmpColor.b;
    this.colors[i3] = _tmpColor.r;
    this.colors[i3 + 1] = _tmpColor.g;
    this.colors[i3 + 2] = _tmpColor.b;

    this.velX[idx] = vx;
    this.velY[idx] = vy;
    this.velZ[idx] = vz;
    this.life[idx] = lifetime;
    this.maxLife[idx] = lifetime;
    this.drag[idx] = dragFactor;
    this.twinkle[idx] = twinkleMode ? 1 : 0;
  }

  private spawnBurst(
    origin: THREE.Vector3,
    paletteIndex: number,
    pattern: BurstPattern,
    scale: number
  ): void {
    const palette = PALETTES[paletteIndex % PALETTES.length];
    const count = pattern === 'chrysanthemum' ? 76 : pattern === 'ring' ? 58 : 64;

    for (let i = 0; i < count; i++) {
      let dx = 0;
      let dy = 0;
      let dz = 0;
      let speed = (3.1 + Math.random() * 1.9) * scale;

      if (pattern === 'ring') {
        const theta = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
        const tilt = 0.28;
        dx = Math.cos(theta);
        dy = Math.sin(theta) * tilt + (Math.random() - 0.5) * 0.12;
        dz = Math.sin(theta);
        speed = (3.7 + Math.random() * 0.55) * scale;
      } else {
        // Uniform Fibonacci-jittered sphere distribution
        const u = (i + 0.5) / count;
        const phi = Math.acos(1 - 2 * u);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + (Math.random() - 0.5) * 0.25;
        dx = Math.sin(phi) * Math.cos(theta);
        dy = Math.cos(phi);
        dz = Math.sin(phi) * Math.sin(theta);
        if (pattern === 'chrysanthemum') {
          speed = (2.4 + Math.random() * 2.9) * scale;
        }
      }

      const colorHex = palette[i % palette.length];
      const lifetime =
        pattern === 'glitter'
          ? 1.15 + Math.random() * 0.55
          : 0.9 + Math.random() * 0.45;
      const dragFactor = pattern === 'chrysanthemum' ? 2.1 : 1.7;

      this.allocParticle(
        origin.x,
        origin.y,
        origin.z,
        dx * speed,
        dy * speed,
        dz * speed,
        colorHex,
        lifetime,
        dragFactor,
        pattern === 'glitter' || (i % 4 === 0)
      );
    }

    // Bright white/gold core flash particles
    for (let c = 0; c < 8; c++) {
      this.allocParticle(
        origin.x,
        origin.y,
        origin.z,
        (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 1.1,
        0xffffff,
        0.24 + Math.random() * 0.12,
        4.0,
        false
      );
    }

    // Trigger pooled PointLight illumination
    const slot = this.flashLights[this.flashSlotIndex % this.flashLights.length];
    this.flashSlotIndex++;
    slot.light.position.set(origin.x, origin.y, origin.z);
    slot.light.color.setHex(palette[0]);
    slot.peakIntensity = 8.5 * scale;
    slot.light.intensity = slot.peakIntensity;
    slot.age = 0;
    slot.duration = 0.72;
  }

  public update(dt: number): void {
    if (this.showRemaining > 0) {
      this.showRemaining = Math.max(0, this.showRemaining - dt);
    }

    // Advance scheduled shell timers
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const s = this.scheduled[i];
      s.delay -= dt;
      if (s.delay <= 0) {
        this.rockets.push({
          x: s.startX,
          y: 0.35,
          z: s.startZ,
          vx: s.vx,
          vy: s.vy,
          vz: s.vz,
          age: 0,
          fuseTime: s.fuseTime,
          paletteIndex: s.paletteIndex,
          pattern: s.pattern,
          scale: s.scale,
          trailAccum: 0,
        });
        this.callbacks.onLaunch?.();
        this.scheduled.splice(i, 1);
      }
    }

    // Advance rising rockets and emit exhaust sparks
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.age += dt;
      r.vy += GRAVITY * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.z += r.vz * dt;
      r.trailAccum += dt;

      while (r.trailAccum >= 0.022) {
        r.trailAccum -= 0.022;
        this.allocParticle(
          r.x,
          r.y,
          r.z,
          (Math.random() - 0.5) * 0.45,
          -0.9 - Math.random() * 0.8,
          (Math.random() - 0.5) * 0.45,
          0xfbbf24,
          0.28 + Math.random() * 0.14,
          2.6,
          false
        );
      }

      if (r.age >= r.fuseTime) {
        const origin = new THREE.Vector3(r.x, r.y, r.z);
        this.spawnBurst(origin, r.paletteIndex, r.pattern, r.scale);
        this.callbacks.onBurst?.(r.scale);
        this.rockets.splice(i, 1);
      }
    }

    // Decay pooled flash lights
    for (let i = 0; i < this.flashLights.length; i++) {
      const slot = this.flashLights[i];
      if (slot.age < slot.duration) {
        slot.age += dt;
        const t = Math.min(1, slot.age / slot.duration);
        slot.light.intensity = slot.peakIntensity * (1 - t) * (1 - t);
      } else {
        slot.light.intensity = 0;
      }
    }

    // Update all particles in flat typed arrays
    let aliveCount = 0;
    const nowPhase = performance.now() * 0.028;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const rem = this.life[i];
      if (rem <= 0) continue;

      const nextLife = rem - dt;
      const i3 = i * 3;
      if (nextLife <= 0) {
        this.life[i] = 0;
        this.positions[i3 + 1] = -999;
        this.colors[i3] = 0;
        this.colors[i3 + 1] = 0;
        this.colors[i3 + 2] = 0;
        continue;
      }

      aliveCount++;
      this.life[i] = nextLife;
      const damping = Math.exp(-this.drag[i] * dt);
      this.velX[i] *= damping;
      this.velY[i] = (this.velY[i] + GRAVITY * 0.55 * dt) * damping;
      this.velZ[i] *= damping;

      this.positions[i3] += this.velX[i] * dt;
      this.positions[i3 + 1] += this.velY[i] * dt;
      this.positions[i3 + 2] += this.velZ[i] * dt;

      const frac = nextLife / this.maxLife[i];
      let fade = frac * frac;
      if (this.twinkle[i] === 1 && frac < 0.6) {
        fade *= 0.45 + 0.55 * Math.abs(Math.sin(nowPhase + i * 1.7));
      }
      this.colors[i3] = this.baseR[i] * fade;
      this.colors[i3 + 1] = this.baseG[i] * fade;
      this.colors[i3 + 2] = this.baseB[i] * fade;
    }

    this.activeParticleCount = aliveCount;
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    this.points.visible = this.isActive();
  }

  public dispose(): void {
    this.scheduled.length = 0;
    this.rockets.length = 0;
    this.scene.remove(this.points);
    for (let i = 0; i < this.flashLights.length; i++) {
      this.scene.remove(this.flashLights[i].light);
    }
    this.flashLights.length = 0;
    this.geometry.dispose();
    this.material.dispose();
    this.glowTexture.dispose();
  }
}
