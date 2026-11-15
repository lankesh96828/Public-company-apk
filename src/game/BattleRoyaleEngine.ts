import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CHARACTER_SKINS,
  DamagePopup,
  EMOTE_CATALOG,
  GamePhase,
  GLOO_SKINS,
  HudState,
  KillFeedItem,
  LootPrompt,
  MapId,
  MatchMode,
  MinimapEntity,
  MultiplayerRosterPlayer,
  PARACHUTE_SKINS,
  PlayerProfile,
  SeatRole,
  VehicleHudState,
  VehicleType,
  WEAPONS,
  WeaponId,
  WeaponSlotState,
} from './types';
import { applyEmotePose, resetEmoteRigBase } from './emoteAnimator';
import {
  CharacterRig,
  createAirdropMesh,
  createCallsignSprite,
  createCharacterModel,
  createDeathCrateMesh,
  createGlooWallMesh,
  createPlaneModel,
  createVehicleModel,
  DeathCrateMeshRig,
  VehicleModelRig,
} from './models';
import {
  ControlSettings,
  StanceMode,
} from './types';
import { DEFAULT_CONTROL_SETTINGS } from './controls';
import { createGameTextures, disposeGameTextures, GameTextures } from './textures';
import { buildIslandWorld, groundHeightAt, PLAYABLE_LIMIT, WorldCollider } from './terrain';
import { detectSoftwareWebGL } from './LobbyScene';
import { soundEngine } from './audio';

// Module-scope reusable math objects (Zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec3D = new THREE.Vector3();
const _vec2A = new THREE.Vector2();
const _dir = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _projVec = new THREE.Vector3();

interface LootItem {
  id: number;
  kind: 'weapon' | 'medkit' | 'gloo' | 'vest' | 'helmet' | 'mushroom' | 'ammo';
  weaponId?: WeaponId;
  level?: number;
  amount: number;
  x: number;
  y: number;
  z: number;
  mesh: THREE.Group;
  collected: boolean;
}

interface DeathCrate {
  id: number;
  crateKey: string;
  victimName: string;
  droppedSlots: WeaponSlotState[];
  medkits: number;
  glooWalls: number;
  vestLevel: number;
  helmetLevel: number;
  tier: 'normal' | 'high';
  x: number;
  y: number;
  z: number;
  rig: DeathCrateMeshRig;
  collected: boolean;
  openedAge: number;
  removed: boolean;
}

interface RagdollBody {
  id: number;
  rig: CharacterRig;
  isLocalPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  yawVel: number;
  pitch: number;
  pitchVel: number;
  targetPitch: number;
  roll: number;
  rollVel: number;
  targetRoll: number;
  settled: boolean;
  age: number;
  maxAge: number;
  headPitch: number;
  headRoll: number;
  leftArmX: number;
  leftArmZ: number;
  rightArmX: number;
  rightArmZ: number;
  leftLegX: number;
  leftLegZ: number;
  rightLegX: number;
  rightLegZ: number;
}

interface GlooInstance {
  mesh: THREE.Group;
  hitMesh: THREE.Mesh;
  hp: number;
  collider: WorldCollider;
}

interface TracerEffect {
  line: THREE.Line;
  life: number;
  maxLife: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

interface BotActor {
  id: number;
  name: string;
  skinIndex: number;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  yaw: number;
  hp: number;
  maxHp: number;
  vestLevel: number;
  weaponId: WeaponId;
  alive: boolean;
  inPlane: boolean;
  parachuting: boolean;
  parachuteOpen: boolean;
  ejectDelay: number;
  fireCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  patrolX: number;
  patrolZ: number;
  patrolTimer: number;
  hitFlash: number;
  lastShotPing: number;
}

interface RemoteHumanActor {
  id: string;
  name: string;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  yaw: number;
  targetYaw: number;
  hp: number;
  alive: boolean;
  crouching: boolean;
  prone?: boolean;
  parachuteOpen: boolean;
  inPlane: boolean;
  moving: boolean;
  weaponId: WeaponId;
  weaponSkinId?: string;
  lastShotPing: number;
  emoteId?: string | null;
  emoteTimer?: number;
  emoteDuration?: number;
}

export interface MultiplayerMatchSession {
  ws: WebSocket | null;
  localPlayerId: string;
  roomCode: string;
  roster: MultiplayerRosterPlayer[];
}

interface VehicleEntity {
  id: string;
  name: string;
  type: VehicleType;
  rig: VehicleModelRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  maxSpeed: number;
  boostSpeed: number;
  accel: number;
  turnRate: number;
  hp: number;
  maxHp: number;
  boostFuel: number;
  destroyed: boolean;
  hitFlash: number;
}

const BOT_NAMES = [
  'Raistar_X', 'Viper_99', 'Kobra_FF', 'BlazeKing', 'ShadowOps',
  'Raju_OP', 'MocoHunter', 'SniperPro', 'Titan_07', 'NovaStrike',
  'Phantom_BD', 'Tornado_X', 'GhostRider', 'AceKiller', 'Falcon_BR',
  'Dante_FF', 'ZeroCool', 'StormHawk', 'VenomByte', 'ApexWolf',
  'Reaper_21', 'Kairo_OP', 'ZoroSlash', 'Lynx_Pro', 'Crusher_9',
  'OmegaFire', 'BoltAction', 'CrimsonFox', 'Nyx_Strike',
];

export class BattleRoyaleEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: GameTextures;
  private colliders: WorldCollider[] = [];
  private disposed = false;
  private frameId = 0;
  private clock = new THREE.Clock();

  private mapId: MapId;
  private mode: MatchMode;
  private profile: PlayerProfile;
  private onHudUpdate: (hud: HudState) => void;
  private mpSession: MultiplayerMatchSession | null = null;
  private remoteHumans = new Map<string, RemoteHumanActor>();
  private netSyncAccum = 0;
  private onWsMessageBound: ((ev: MessageEvent) => void) | null = null;

  private phase: GamePhase = 'plane';
  private matchTime = 0;
  private hitstopTimer = 0;
  private hudSyncTimer = 0;

  // Player state
  private playerRig!: CharacterRig;
  private playerX = 0;
  private playerY = 68;
  private playerZ = 0;
  private playerVy = 0;
  private playerYaw = 0;
  private playerPitch = 0.12;
  private grounded = false;
  private stance: StanceMode = 'stand';
  private parachuteOpen = false;
  private sprintLocked = false;
  private freeLookActive = false;
  private freeLookYaw = 0;
  private freeLookPitch = 0;
  private controlSettings: ControlSettings;

  private hp = 200;
  private maxHp = 200;
  private ep = 60;
  private maxEp = 200;
  private vestLevel = 0;
  private vestDurability = 0;
  private helmetLevel = 0;
  private helmetDurability = 0;
  private glooWalls = 2;
  private medkits = 2;

  private slots: [WeaponSlotState | null, WeaponSlotState | null, WeaponSlotState | null] = [
    null,
    null,
    { weaponId: 'deagle', mag: 7, reserve: 35 },
  ];
  private activeSlot = 2;
  private fireCooldown = 0;
  private isReloading = false;
  private reloadTimer = 0;
  private isHealing = false;
  private healTimer = 0;
  private isAds = false;

  private skillCooldown = 0;
  private skillMaxCooldown = 20;
  private skillActiveTimer = 0;
  private activeEmoteId: string | null = null;
  private activeEmoteTimer = 0;
  private activeEmoteDuration = 2.4;

  private kills = 0;
  private damageDealt = 0;
  private headshots = 0;
  private eliminatedBy = '';

  // Camera & Feel
  private recoilPitch = 0;
  private cameraShake = 0;
  private damageFlash = 0;
  private hitmarkerType: 'none' | 'body' | 'head' = 'none';
  private hitmarkerTimer = 0;
  private muzzleLight!: THREE.PointLight;
  private muzzleTimer = 0;

  // Plane & Airdrop
  private planeGroup!: THREE.Group;
  private planeProps: THREE.Object3D[] = [];
  private planeStart = new THREE.Vector3(-115, 68, -95);
  private planeEnd = new THREE.Vector3(115, 68, 95);
  private planeProgress = 0;
  private airdropSpawned = false;
  private airdropPos = new THREE.Vector3();
  private airdropGroup: THREE.Group | null = null;
  private airdropCollected = false;

  // Safe Zone (5-stage progression down to 6m close-quarters endgame)
  private readonly zoneStages = [
    { targetRadius: 88, holdSec: 22, shrinkSec: 18, dps: 3 },
    { targetRadius: 54, holdSec: 18, shrinkSec: 16, dps: 6 },
    { targetRadius: 30, holdSec: 15, shrinkSec: 14, dps: 10 },
    { targetRadius: 15, holdSec: 12, shrinkSec: 12, dps: 16 },
    { targetRadius: 6, holdSec: 10, shrinkSec: 12, dps: 24 },
  ];
  private zonePhase = 1;
  private zoneTimer = 22;
  private zoneShrinkDuration = 18;
  private zoneShrinking = false;
  private zoneFinalized = false;
  private zoneStartCenterX = 0;
  private zoneStartCenterZ = 0;
  private zoneStartRadius = 135;
  private zoneCenterX = 0;
  private zoneCenterZ = 0;
  private zoneRadius = 135;
  private nextZoneCenterX = 0;
  private nextZoneCenterZ = 0;
  private nextZoneRadius = 88;
  private zoneWallMesh!: THREE.Mesh;
  private nextZoneRingMesh!: THREE.Mesh;
  private zoneTickAccum = 0;

  // Entities
  private bots: BotActor[] = [];
  private vehicles: VehicleEntity[] = [];
  private activeVehicle: VehicleEntity | null = null;
  private activeSeat: SeatRole = 'driver';
  private vehicleHornCooldown = 0;
  private ramCooldownMap = new Map<number, number>();
  private lootItems: LootItem[] = [];
  private nextLootId = 1;
  private deathCrates: DeathCrate[] = [];
  private nextDeathCrateId = 1;
  private ragdolls: RagdollBody[] = [];
  private nextRagdollId = 1;
  private countedKillIds = new Set<string>();
  private deathCamAngle = 0;
  private spectateTimer = 0;
  private spectateMode: 'bot' | 'human' | 'pos' = 'pos';
  private spectateBotId = -1;
  private spectateHumanId = '';
  private spectateTargetName = '';
  private spectateLastX = 0;
  private spectateLastY = 0;
  private spectateLastZ = 0;
  private spectateLastYaw = 0;
  private spectateOrbitOffset = 0;
  private lockedElimRank: number | null = null;
  private lockedSurvivalTime: number | null = null;
  private lastAttackerId = '';
  private lastAttackerBotId = -1;
  private lastAttackerAt = -999;
  private lastAttackerX: number | undefined = undefined;
  private lastAttackerZ: number | undefined = undefined;
  private glooList: GlooInstance[] = [];
  private tracers: TracerEffect[] = [];
  private sparks: SparkParticle[] = [];
  private sparkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  private sparkMats = new Map<number, THREE.MeshBasicMaterial>();
  private killFeed: KillFeedItem[] = [];
  private nextFeedId = 1;
  private damagePopups: (DamagePopup & { worldPos: THREE.Vector3; life: number })[] = [];
  private nextPopupId = 1;

  // Input state
  private keys: Record<string, boolean> = {};
  private mouseFireDown = false;
  private pointerLocked = false;
  private isDragLooking = false;
  private emoteWheelOpen = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchThrottle = 0;
  private touchSteer = 0;
  private touchNitro = false;

  constructor(
    container: HTMLElement,
    profile: PlayerProfile,
    mapId: MapId,
    mode: MatchMode,
    onHudUpdate: (hud: HudState) => void,
    mpSession: MultiplayerMatchSession | null = null,
    controlSettings: ControlSettings = DEFAULT_CONTROL_SETTINGS
  ) {
    this.container = container;
    this.profile = profile;
    this.mapId = mapId;
    this.mode = mode;
    this.onHudUpdate = onHudUpdate;
    this.mpSession = mpSession;
    this.controlSettings = controlSettings;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    const isDesert = mapId === 'purgatory';
    const isAlpine = mapId === 'alpine';
    const skyColor = isAlpine ? 0xbfe3ff : isDesert ? 0xd99b66 : 0x7dd3fc;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(isAlpine ? 0xcbd5e1 : skyColor, isAlpine ? 0.0044 : 0.0052);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, w / h, 0.15, 520);

    this.textures = createGameTextures(this.renderer.capabilities.getMaxAnisotropy());

    // Outdoor Daylight Rig (Warm Sun + Cool Sky/Ground Hemisphere + Rim)
    const hemi = new THREE.HemisphereLight(
      isAlpine ? 0xe0f2fe : isDesert ? 0xfde68a : 0xbae6fd,
      isAlpine ? 0x64748b : isDesert ? 0x78350f : 0x365314,
      isAlpine ? 0.85 : 0.72
    );
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(
      isAlpine ? 0xf8fafc : isDesert ? 0xfff1d6 : 0xfffbeb,
      isAlpine ? 1.75 : 1.85
    );
    sun.position.set(85, 130, 65);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 320;
    sun.shadow.camera.left = -125;
    sun.shadow.camera.right = 125;
    sun.shadow.camera.top = 125;
    sun.shadow.camera.bottom = -125;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    this.muzzleLight = new THREE.PointLight(0xffa94d, 0, 10);
    this.scene.add(this.muzzleLight);

    // Build Island World & Landmarks
    const world = buildIslandWorld(this.scene, mapId, this.textures);
    this.colliders = world.colliders;

    // Zone Wall Cylinder + Next Safe Zone Ground Ring
    const zoneGeo = new THREE.CylinderGeometry(1, 1, 110, 48, 1, true);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.zoneWallMesh = new THREE.Mesh(zoneGeo, zoneMat);
    this.zoneWallMesh.position.y = 40;
    this.scene.add(this.zoneWallMesh);

    const ringGeo = new THREE.RingGeometry(0.985, 1.0, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.nextZoneRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.nextZoneRingMesh.position.y = 4.2;
    this.scene.add(this.nextZoneRingMesh);

    if (mode === 'br_blitz') {
      this.zonePhase = 2;
      this.zoneRadius = 95;
      this.zoneStartRadius = 95;
      this.nextZoneRadius = this.zoneStages[1].targetRadius;
      this.zoneTimer = Math.round(this.zoneStages[1].holdSec * 0.65);
    } else {
      this.zonePhase = 1;
      this.zoneRadius = 135;
      this.zoneStartRadius = 135;
      this.nextZoneRadius = this.zoneStages[0].targetRadius;
      this.zoneTimer = this.zoneStages[0].holdSec;
    }

    this.pickNextZoneCenter();
    this.nextZoneRingMesh.position.set(this.nextZoneCenterX, 4.2, this.nextZoneCenterZ);
    this.nextZoneRingMesh.scale.setScalar(this.nextZoneRadius);

    // Cargo Plane
    const plane = createPlaneModel();
    this.planeGroup = plane.group;
    this.planeProps = plane.propellers;
    this.planeGroup.position.copy(this.planeStart);
    this.planeGroup.lookAt(this.planeEnd);
    this.scene.add(this.planeGroup);

    // Player Character Rig
    const pSkin = CHARACTER_SKINS.find((s) => s.id === profile.selectedSkinId) || CHARACTER_SKINS[0];
    this.skillMaxCooldown = pSkin.cooldown;
    const chuteSkin = PARACHUTE_SKINS.find((c) => c.id === profile.selectedParachuteId) || PARACHUTE_SKINS[0];
    this.playerRig = createCharacterModel(pSkin, 'deagle', chuteSkin, profile.equippedWeaponSkins?.deagle);
    this.playerRig.root.visible = false; // Hidden while inside plane
    this.scene.add(this.playerRig.root);

    // Blitz mode gives starter MP40 so combat starts blazing immediately on landing
    if (mode === 'br_blitz') {
      this.slots[0] = { weaponId: 'mp40', mag: 28, reserve: 84 };
      this.activeSlot = 0;
      this.playerRig.setWeapon('mp40', profile.equippedWeaponSkins?.mp40);
    }

    // Spawn Ground Loot & Drivable Vehicles across compounds/roads
    this.spawnInitialLoot(world.lootSpots);
    this.spawnVehicles();

    // Spawn Remote Multiplayer Human Players + Remaining AI Bots (30 Total Survivors)
    const remoteRoster = (this.mpSession?.roster || []).filter(
      (m) => m.id !== this.mpSession?.localPlayerId
    );
    remoteRoster.forEach((m) => {
      const rSkin = CHARACTER_SKINS.find((s) => s.id === m.skinId) || CHARACTER_SKINS[0];
      const rChute = PARACHUTE_SKINS.find((c) => c.id === m.parachuteId) || PARACHUTE_SKINS[0];
      const rig = createCharacterModel(rSkin, 'deagle', rChute);
      rig.root.add(createCallsignSprite(m.name));
      rig.root.visible = false;
      this.scene.add(rig.root);
      this.remoteHumans.set(m.id, {
        id: m.id,
        name: m.name,
        rig,
        x: this.planeStart.x,
        y: 68,
        z: this.planeStart.z,
        targetX: this.planeStart.x,
        targetY: 68,
        targetZ: this.planeStart.z,
        yaw: 0,
        targetYaw: 0,
        hp: 200,
        alive: true,
        crouching: false,
        parachuteOpen: false,
        inPlane: true,
        moving: false,
        weaponId: 'deagle',
        lastShotPing: -10,
      });
    });

    const botCount = Math.max(0, 29 - remoteRoster.length);
    this.spawnBots(botCount);
    this.bindMultiplayerEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.pushHudState();
    this.tick();
  }

  private sendMp(payload: Record<string, unknown>) {
    const ws = this.mpSession?.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private bindMultiplayerEvents() {
    const ws = this.mpSession?.ws;
    if (!ws) return;
    this.onWsMessageBound = (ev: MessageEvent) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const type = String(msg.type || '');
      if (type === 'player:state') {
        const actor = this.remoteHumans.get(String(msg.id || ''));
        if (!actor || !actor.alive) return;
        actor.targetX = Number(msg.x || 0);
        actor.targetY = Number(msg.y || 0);
        actor.targetZ = Number(msg.z || 0);
        actor.targetYaw = Number(msg.yaw || 0);
        actor.hp = Number(msg.hp || 0);
        actor.alive = Boolean(msg.alive);
        actor.crouching = Boolean(msg.crouching);
        actor.prone = Boolean(msg.prone);
        actor.parachuteOpen = Boolean(msg.parachuteOpen);
        actor.inPlane = Boolean(msg.inPlane);
        actor.moving = Boolean(msg.moving);
        const wId = String(msg.weaponId || 'deagle') as WeaponId;
        const wSkinId = typeof msg.weaponSkinId === 'string' ? msg.weaponSkinId : undefined;
        if ((wId !== actor.weaponId || wSkinId !== actor.weaponSkinId) && WEAPONS[wId]) {
          actor.weaponId = wId;
          actor.weaponSkinId = wSkinId;
          actor.rig.setWeapon(wId, wSkinId);
        }
        actor.rig.root.visible = actor.alive && !actor.inPlane;
        actor.rig.parachuteGroup.visible = actor.parachuteOpen;
      } else if (type === 'player:shoot') {
        const actor = this.remoteHumans.get(String(msg.id || ''));
        if (actor) actor.lastShotPing = this.matchTime;
        const from = _vec3A.set(Number(msg.fromX || 0), Number(msg.fromY || 0), Number(msg.fromZ || 0));
        const to = _vec3B.set(Number(msg.toX || 0), Number(msg.toY || 0), Number(msg.toZ || 0));
        this.spawnTracer(from, to, 0xfef08a);
        const dist = Math.hypot(from.x - this.playerX, from.z - this.playerZ);
        if (dist < 65) {
          const wId = (String(msg.weaponId || 'ak47') as WeaponId);
          soundEngine.playShot(WEAPONS[wId] ? wId : 'ak47', Math.max(0.15, 1 - dist / 65) * 0.6);
        }
      } else if (type === 'player:gloo') {
        const gx = Number(msg.x || 0);
        const gy = Number(msg.y || 0);
        const gz = Number(msg.z || 0);
        const yaw = Number(msg.yaw || 0);
        const skinId = String(msg.skinId || 'frost');
        this.spawnGlooWallAt(gx, gy, gz, yaw, skinId);
      } else if (type === 'player:emote') {
        const actor = this.remoteHumans.get(String(msg.id || ''));
        if (actor && actor.alive) {
          const eId = String(msg.emoteId || 'hello');
          const def = EMOTE_CATALOG.find((e) => e.id === eId);
          actor.emoteId = eId;
          actor.emoteTimer = 0;
          actor.emoteDuration = def?.duration ?? 2.4;
        }
      } else if (type === 'player:hit') {
        const dmg = Number(msg.damage || 0);
        const attackerId = String(msg.attackerId || '');
        const attackerName = String(msg.attackerName || 'Survivor');
        const weaponName = String(msg.weaponName || 'Weapon');
        const isHead = Boolean(msg.headshot);
        const attackerActor = this.remoteHumans.get(attackerId);
        if (dmg > 0) {
          this.applyDamageToPlayer(
            dmg,
            attackerName,
            weaponName,
            false,
            isHead,
            attackerId,
            attackerActor?.x,
            attackerActor?.z,
            false
          );
        }
      } else if (type === 'player:elim') {
        const victimId = String(msg.victimId || '');
        const actor = this.remoteHumans.get(victimId);
        if (actor && actor.alive) {
          actor.alive = false;
          const vx = Number.isFinite(Number(msg.x)) ? Number(msg.x) : actor.x;
          const vy = Number.isFinite(Number(msg.y)) ? Number(msg.y) : actor.y;
          const vz = Number.isFinite(Number(msg.z)) ? Number(msg.z) : actor.z;
          const attackerX = Number.isFinite(Number(msg.attackerX)) ? Number(msg.attackerX) : undefined;
          const attackerZ = Number.isFinite(Number(msg.attackerZ)) ? Number(msg.attackerZ) : undefined;
          const killerId = typeof msg.killerId === 'string' ? msg.killerId : '';
          const killer = String(msg.killerName || 'Enemy');
          const weapon = String(msg.weaponName || 'Weapon');
          const rawWId = String(msg.weaponId || actor.weaponId || 'deagle') as WeaponId;
          const victimWeaponId: WeaponId = WEAPONS[rawWId] ? rawWId : 'deagle';
          const fallbackDef = WEAPONS[victimWeaponId];
          const parsedSlots: WeaponSlotState[] = Array.isArray(msg.slots)
            ? msg.slots
                .filter((s: unknown): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
                .map((s) => {
                  const sId = String(s.weaponId || '') as WeaponId;
                  if (!WEAPONS[sId]) return null;
                  return {
                    weaponId: sId,
                    mag: Math.max(0, Math.min(200, Math.floor(Number(s.mag || 0)))),
                    reserve: Math.max(0, Math.min(999, Math.floor(Number(s.reserve || 0)))),
                  };
                })
                .filter((s): s is WeaponSlotState => Boolean(s))
            : [];
          const droppedSlots =
            parsedSlots.length > 0
              ? parsedSlots
              : [{ weaponId: fallbackDef.id, mag: fallbackDef.magSize, reserve: fallbackDef.magSize * 2 }];
          const vestLv = Math.max(0, Math.min(3, Math.floor(Number(msg.vestLevel || 0))));
          const helmetLv = Math.max(0, Math.min(3, Math.floor(Number(msg.helmetLevel || 0))));
          const medkits = Math.max(0, Math.min(20, Math.floor(Number(msg.medkits ?? 2))));
          const glooWalls = Math.max(0, Math.min(20, Math.floor(Number(msg.glooWalls ?? 2))));
          const crateKey =
            typeof msg.crateKey === 'string' && msg.crateKey
              ? msg.crateKey
              : `mp_${victimId}`;
          const headshot = Boolean(msg.headshot);
          const isVehicle = Boolean(msg.isVehicle);
          const isZone = Boolean(msg.isZone) || killer === 'Safe Zone' || weapon === 'Storm';
          const isLocalKiller =
            (killerId && killerId === this.mpSession?.localPlayerId) ||
            (!killerId && killer === this.profile.name);

          if (isLocalKiller && !this.countedKillIds.has(victimId)) {
            this.countedKillIds.add(victimId);
            this.kills++;
            if (headshot) this.headshots++;
            this.hitstopTimer = 0.045;
          }

          this.spawnRagdollForRig(actor.rig, vx, vy, vz, actor.yaw, {
            attackerX,
            attackerZ,
            headshot,
            isVehicle,
            isZone,
          });
          this.spawnDeathCrate(
            actor.name,
            vx,
            vz,
            {
              slots: droppedSlots,
              medkits,
              glooWalls,
              vestLevel: vestLv,
              helmetLevel: helmetLv,
              crateKey,
            },
            'high'
          );

          this.pushKillFeed(
            killer,
            actor.name,
            weapon,
            headshot,
            isLocalKiller,
            false,
            isZone
          );
          this.checkMatchEnd();
        }
      } else if (type === 'crate:loot') {
        const key = String(msg.crateKey || '');
        if (!key) return;
        const crate = this.deathCrates.find((dc) => dc.crateKey === key);
        if (crate && !crate.collected && !crate.removed) {
          crate.collected = true;
          crate.rig.beacon.visible = false;
          crate.rig.holoRing.visible = false;
        }
      }
    };
    ws.addEventListener('message', this.onWsMessageBound);
  }

  private spawnInitialLoot(spots: THREE.Vector3[]) {
    const weaponPool: WeaponId[] = ['ak47', 'scar', 'mp40', 'm1887', 'ak47', 'mp40', 'scar', 'awm', 'm1887'];
    spots.forEach((pos, idx) => {
      // Weapon at spot
      const wId = weaponPool[idx % weaponPool.length];
      this.createLootDrop('weapon', pos.x, pos.y, pos.z, wId);

      // Pair with tactical item nearby
      const offsetX = ((idx % 3) - 1) * 1.8;
      const offsetZ = (((idx + 1) % 3) - 1) * 1.8;
      const gx = pos.x + offsetX;
      const gz = pos.z + offsetZ;
      const gy = groundHeightAt(gx, gz, this.mapId);
      const r = idx % 5;
      if (r === 0) this.createLootDrop('medkit', gx, gy, gz);
      else if (r === 1) this.createLootDrop('gloo', gx, gy, gz);
      else if (r === 2) this.createLootDrop('vest', gx, gy, gz, undefined, (idx % 2) + 1);
      else if (r === 3) this.createLootDrop('helmet', gx, gy, gz, undefined, (idx % 2) + 1);
      else this.createLootDrop('mushroom', gx, gy, gz);
    });
  }

  private createLootDrop(
    kind: LootItem['kind'],
    x: number,
    y: number,
    z: number,
    weaponId?: WeaponId,
    level = 1
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    let colorHex = 0xf59e0b;
    if (kind === 'medkit') colorHex = 0x22c55e;
    else if (kind === 'gloo') colorHex = 0x38bdf8;
    else if (kind === 'vest' || kind === 'helmet') colorHex = 0xa855f7;
    else if (kind === 'mushroom') colorHex = 0xfacc15;
    else if (kind === 'ammo') colorHex = 0x94a3b8;
    else if (weaponId === 'awm') colorHex = 0xef4444;

    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.3, 0.55),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.5 })
    );
    crate.position.y = 0.25;

    // Iconic Free Fire vertical loot glow pillar
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 2.2, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 1.1;

    group.add(crate, beam);
    this.scene.add(group);

    this.lootItems.push({
      id: this.nextLootId++,
      kind,
      weaponId,
      level,
      amount: kind === 'gloo' ? 2 : kind === 'medkit' ? 1 : kind === 'mushroom' ? 45 : 30,
      x,
      y,
      z,
      mesh: group,
      collected: false,
    });
  }

  private spawnBots(count: number) {
    const botWeapons: WeaponId[] = ['ak47', 'scar', 'mp40', 'm1887', 'deagle'];
    for (let i = 0; i < count; i++) {
      const skinIdx = i % CHARACTER_SKINS.length;
      const chuteIdx = i % PARACHUTE_SKINS.length;
      const weaponId = botWeapons[i % botWeapons.length];
      const rig = createCharacterModel(CHARACTER_SKINS[skinIdx], weaponId, PARACHUTE_SKINS[chuteIdx]);

      const targetX = (Math.random() - 0.5) * 185;
      const targetZ = (Math.random() - 0.5) * 185;
      rig.root.visible = false;
      this.scene.add(rig.root);

      this.bots.push({
        id: i + 1,
        name: BOT_NAMES[i % BOT_NAMES.length],
        skinIndex: skinIdx,
        rig,
        x: this.planeStart.x,
        y: 68,
        z: this.planeStart.z,
        vx: 0,
        vz: 0,
        vy: 0,
        yaw: Math.random() * Math.PI * 2,
        hp: 150,
        maxHp: 150,
        vestLevel: Math.random() > 0.5 ? 1 : 0,
        weaponId,
        alive: true,
        inPlane: true,
        parachuting: false,
        parachuteOpen: false,
        ejectDelay: 1.0 + (i / count) * 14,
        fireCooldown: 0.5 + Math.random(),
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1.5,
        patrolX: targetX,
        patrolZ: targetZ,
        patrolTimer: 3 + Math.random() * 4,
        hitFlash: 0,
        lastShotPing: -10,
      });
    }
  }

  private spawnVehicles() {
    const spawns: { id: string; name: string; type: VehicleType; x: number; z: number; yaw: number }[] = [
      { id: 'veh_gt_1', name: 'Phantom GT', type: 'sportscar', x: 16, z: 22, yaw: 0.45 },
      { id: 'veh_gt_2', name: 'Phantom GT', type: 'sportscar', x: -34, z: -26, yaw: -1.1 },
      { id: 'veh_pk_1', name: 'Tactical Pickup', type: 'pickup', x: -42, z: 24, yaw: 1.45 },
      { id: 'veh_pk_2', name: 'Tactical Pickup', type: 'pickup', x: 46, z: -32, yaw: -2.2 },
      { id: 'veh_bk_1', name: 'Turbo Bike', type: 'motorbike', x: 5, z: -18, yaw: 0.2 },
      { id: 'veh_bk_2', name: 'Turbo Bike', type: 'motorbike', x: -16, z: 48, yaw: 2.5 },
      { id: 'veh_bk_3', name: 'Turbo Bike', type: 'motorbike', x: 52, z: 36, yaw: -0.8 },
    ];

    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i];
      const rig = createVehicleModel(s.type);
      const colRadius = s.type === 'motorbike' ? 0.95 : 1.55;
      const baseY = groundHeightAt(s.x, s.z, this.mapId);
      const [vx, vz] = this.resolveCollisions(s.x, s.z, baseY, colRadius);
      const vy = groundHeightAt(vx, vz, this.mapId);

      rig.root.position.set(vx, vy, vz);
      rig.root.rotation.y = s.yaw;
      this.scene.add(rig.root);

      const isSport = s.type === 'sportscar';
      const isBike = s.type === 'motorbike';

      this.vehicles.push({
        id: s.id,
        name: s.name,
        type: s.type,
        rig,
        x: vx,
        y: vy,
        z: vz,
        yaw: s.yaw,
        speed: 0,
        steerAngle: 0,
        maxSpeed: isBike ? 31 : isSport ? 28 : 22,
        boostSpeed: isBike ? 42 : isSport ? 38 : 30,
        accel: isBike ? 26 : isSport ? 22 : 17,
        turnRate: isBike ? 2.7 : isSport ? 2.3 : 1.9,
        hp: isBike ? 480 : isSport ? 750 : 1100,
        maxHp: isBike ? 480 : isSport ? 750 : 1100,
        boostFuel: 100,
        destroyed: false,
        hitFlash: 0,
      });
    }
  }

  // Public Controls / Actions called from React HUD or Keyboard
  public ejectFromPlane(fromUserGesture = true) {
    if (this.phase !== 'plane') return;
    this.phase = 'parachute';
    this.playerX = this.planeGroup.position.x;
    this.playerY = this.planeGroup.position.y - 2;
    this.playerZ = this.planeGroup.position.z;
    this.playerVy = -14;
    this.parachuteOpen = false;
    this.playerRig.root.visible = true;
    this.playerRig.parachuteGroup.visible = false;
    soundEngine.playParachute();
    if (fromUserGesture) {
      this.requestPointerLockSafe();
    }
    this.pushHudState();
  }

  public deployParachute() {
    if (this.phase !== 'parachute' || this.parachuteOpen) return;
    this.parachuteOpen = true;
    this.playerRig.parachuteGroup.visible = true;
    soundEngine.playParachute();
    this.pushHudState();
  }

  public switchSlot(slotIndex: number) {
    if (this.phase !== 'playing') return;
    if (!this.slots[slotIndex] || this.activeSlot === slotIndex) return;
    this.activeSlot = slotIndex;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isAds = false;
    const wId = this.slots[slotIndex]!.weaponId;
    this.playerRig.setWeapon(wId, this.profile.equippedWeaponSkins?.[wId]);
    soundEngine.playClick();
    this.pushHudState();
  }

  public startReload() {
    if (this.phase !== 'playing' || this.isReloading) return;
    if (this.activeVehicle && this.activeSeat === 'driver') return;
    const slot = this.slots[this.activeSlot];
    if (!slot) return;
    const def = WEAPONS[slot.weaponId];
    if (slot.mag >= def.magSize || slot.reserve <= 0) return;
    this.isReloading = true;
    this.reloadTimer = 0;
    this.isHealing = false;
    soundEngine.playReload();
  }

  public startHeal() {
    if (this.phase !== 'playing' || this.isHealing || this.medkits <= 0 || this.hp >= this.maxHp) return;
    if (this.activeVehicle && this.activeSeat === 'driver') return;
    this.isHealing = true;
    this.healTimer = 0;
    this.isReloading = false;
    soundEngine.playClick();
  }

  private findNearestVehicle(radius: number): VehicleEntity | null {
    let best: VehicleEntity | null = null;
    let bestD = radius;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  public enterNearestVehicle(seat: SeatRole = 'driver') {
    if (this.phase !== 'playing' || this.activeVehicle) return;
    const v = this.findNearestVehicle(4.4);
    if (!v) return;
    this.activeVehicle = v;
    this.activeSeat = seat;
    this.stance = 'stand';
    this.sprintLocked = false;
    this.playerRig.bodyPivot.rotation.x = 0;
    this.playerRig.bodyPivot.position.set(0, 0, 0);
    this.playerRig.head.rotation.x = 0;
    this.isHealing = false;
    if (seat === 'driver') {
      this.isAds = false;
      this.mouseFireDown = false;
    }
    const sinV = Math.sin(v.yaw);
    const cosV = Math.cos(v.yaw);
    const seatOff = seat === 'driver' ? v.rig.driverSeatOffset : v.rig.passengerSeatOffset;
    this.playerX = v.x + seatOff.x * cosV + seatOff.z * sinV;
    this.playerY = v.y + seatOff.y;
    this.playerZ = v.z - seatOff.x * sinV + seatOff.z * cosV;
    soundEngine.playVehicleEnter();
    this.pushHudState();
  }

  public exitVehicle() {
    const v = this.activeVehicle;
    if (!v) return;
    const sideDist = v.type === 'motorbike' ? 1.55 : 2.25;
    const rawX = v.x - Math.cos(v.yaw) * sideDist;
    const rawZ = v.z + Math.sin(v.yaw) * sideDist;
    const [ex, ez] = this.resolveCollisions(rawX, rawZ, v.y, 0.45);
    this.playerX = ex;
    this.playerZ = ez;
    this.playerY = groundHeightAt(ex, ez, this.mapId);
    this.playerVy = 0;
    this.grounded = true;
    this.playerRig.leftLeg.rotation.x = 0;
    this.playerRig.rightLeg.rotation.x = 0;
    this.activeVehicle = null;
    this.activeSeat = 'driver';
    this.touchThrottle = 0;
    this.touchSteer = 0;
    this.touchNitro = false;
    soundEngine.playVehicleEnter();
    this.pushHudState();
  }

  public switchVehicleSeat() {
    if (this.phase !== 'playing' || !this.activeVehicle) return;
    this.activeSeat = this.activeSeat === 'driver' ? 'passenger' : 'driver';
    if (this.activeSeat === 'driver') {
      this.isAds = false;
      this.mouseFireDown = false;
      this.isHealing = false;
    }
    soundEngine.playClick();
    this.pushHudState();
  }

  public honkVehicle() {
    if (this.phase !== 'playing' || !this.activeVehicle || this.activeSeat !== 'driver') return;
    if (this.vehicleHornCooldown > 0) return;
    this.vehicleHornCooldown = 0.45;
    soundEngine.playVehicleHorn(this.activeVehicle.type === 'motorbike');
  }

  public setVehicleTouchControls(throttle: number, steer: number, nitro: boolean) {
    this.touchThrottle = throttle;
    this.touchSteer = steer;
    this.touchNitro = nitro;
  }

  private spawnGlooWallAt(gx: number, gy: number, gz: number, yaw: number, skinId: string) {
    const glooSkin = GLOO_SKINS.find((g) => g.id === skinId) || GLOO_SKINS[0];
    const mesh = createGlooWallMesh(glooSkin, this.textures);
    mesh.position.set(gx, gy, gz);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);

    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.3, 0.7),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(gx, gy + 1.15, gz);
    hitMesh.rotation.y = yaw;
    this.scene.add(hitMesh);

    const collider: WorldCollider = {
      minX: gx - 1.9,
      maxX: gx + 1.9,
      minZ: gz - 1.9,
      maxZ: gz + 1.9,
      height: 2.3,
      baseY: gy,
    };
    this.colliders.push(collider);
    this.glooList.push({ mesh, hitMesh, hp: 320, collider });
    soundEngine.playGlooDeploy();
  }

  public deployGlooWall() {
    if (this.phase !== 'playing' || this.glooWalls <= 0 || this.activeVehicle) return;
    this.glooWalls--;
    const dist = 2.8;
    const gx = this.playerX + Math.sin(this.playerYaw) * dist;
    const gz = this.playerZ + Math.cos(this.playerYaw) * dist;
    const gy = groundHeightAt(gx, gz, this.mapId);
    this.spawnGlooWallAt(gx, gy, gz, this.playerYaw, this.profile.selectedGlooId);
    this.sendMp({
      type: 'player:gloo',
      x: gx,
      y: gy,
      z: gz,
      yaw: this.playerYaw,
      skinId: this.profile.selectedGlooId,
    });
    this.pushHudState();
  }

  public activateSkill() {
    if (this.phase !== 'playing' || this.skillCooldown > 0) return;
    const skin = CHARACTER_SKINS.find((s) => s.id === this.profile.selectedSkinId) || CHARACTER_SKINS[0];
    this.skillMaxCooldown = skin.cooldown;
    this.skillCooldown = skin.cooldown;
    this.skillActiveTimer = 6.0;
    if (skin.id === 'criminal_red') {
      this.hp = Math.min(this.maxHp, this.hp + 30);
    } else if (skin.id === 'k') {
      this.ep = Math.min(this.maxEp, this.ep + 75);
    } else if (skin.id === 'skyler') {
      this.hp = Math.min(this.maxHp, this.hp + 45);
      // Riptide Rhythm sonic wave shatters nearby Gloo Walls within 28m
      const radiusSq = 28 * 28;
      for (let i = this.glooList.length - 1; i >= 0; i--) {
        const g = this.glooList[i];
        const dx = g.mesh.position.x - this.playerX;
        const dz = g.mesh.position.z - this.playerZ;
        if (dx * dx + dz * dz <= radiusSq) {
          this.spawnSparks(g.mesh.position.clone().setY(g.mesh.position.y + 1.1), 0x38bdf8, 8);
          this.destroyGlooWall(g);
        }
      }
    } else if (skin.id === 'andrew') {
      this.vestLevel = Math.max(1, this.vestLevel);
      this.vestDurability = Math.min(240, this.vestDurability + 100);
    } else if (skin.id === 'maxim' || skin.id === 'antonio') {
      this.hp = Math.min(this.maxHp, this.hp + 45);
    } else if (skin.id === 'paloma') {
      const slot = this.slots[this.activeSlot];
      if (slot) slot.reserve += 30;
    } else if (skin.id === 'a124') {
      this.hp = Math.min(this.maxHp, this.hp + 55);
      this.ep = Math.min(this.maxEp, this.ep + 35);
    } else if (skin.id === 'steffie') {
      this.hp = Math.min(this.maxHp, this.hp + 20);
    } else if (skin.id === 'kapella') {
      this.hp = Math.min(this.maxHp, this.hp + 40);
    } else if (skin.id === 'orion') {
      this.hp = Math.min(this.maxHp, this.hp + 25);
    }
    soundEngine.playSkill();
    this.pushHudState();
  }

  public interactLoot() {
    if (this.phase !== 'playing') return;
    // Check airdrop first
    if (this.airdropSpawned && !this.airdropCollected && this.airdropGroup) {
      const distAir = Math.hypot(this.playerX - this.airdropPos.x, this.playerZ - this.airdropPos.z);
      if (distAir < 4.0) {
        this.airdropCollected = true;
        this.vestLevel = 3;
        this.vestDurability = 200;
        this.helmetLevel = 3;
        this.helmetDurability = 150;
        this.glooWalls += 3;
        this.medkits += 2;
        this.equipOrAddWeapon('awm', 5, 25);
        soundEngine.playPickup();
        this.pushHudState();
        return;
      }
    }

    const nearCrate = this.findNearestDeathCrate(3.4);
    if (nearCrate) {
      this.lootDeathCrate(nearCrate);
      return;
    }

    const nearest = this.findNearestLoot(3.4);
    if (!nearest) return;
    this.collectLoot(nearest);
  }

  private equipOrAddWeapon(wId: WeaponId, mag: number, reserve: number) {
    const def = WEAPONS[wId];
    const wSkin = this.profile.equippedWeaponSkins?.[wId];
    if (def.slotType === 'sidearm') {
      this.slots[2] = { weaponId: wId, mag, reserve };
      if (this.activeSlot === 2) this.playerRig.setWeapon(wId, wSkin);
      return;
    }
    if (!this.slots[0]) {
      this.slots[0] = { weaponId: wId, mag, reserve };
      this.activeSlot = 0;
      this.playerRig.setWeapon(wId, wSkin);
    } else if (!this.slots[1]) {
      this.slots[1] = { weaponId: wId, mag, reserve };
      this.activeSlot = 1;
      this.playerRig.setWeapon(wId, wSkin);
    } else {
      const targetSlot = this.activeSlot < 2 ? this.activeSlot : 0;
      this.slots[targetSlot] = { weaponId: wId, mag, reserve };
      this.activeSlot = targetSlot;
      this.playerRig.setWeapon(wId, wSkin);
    }
  }

  private collectLoot(item: LootItem) {
    if (item.collected) return;
    item.collected = true;
    item.mesh.visible = false;
    soundEngine.playPickup();

    if (item.kind === 'weapon' && item.weaponId) {
      const def = WEAPONS[item.weaponId];
      // Check if already carrying same weapon -> add ammo
      for (let s = 0; s < 3; s++) {
        if (this.slots[s]?.weaponId === item.weaponId) {
          this.slots[s]!.reserve += def.magSize * 2;
          return;
        }
      }
      this.equipOrAddWeapon(item.weaponId, def.magSize, def.magSize * 2);
    } else if (item.kind === 'medkit') {
      this.medkits += item.amount;
    } else if (item.kind === 'gloo') {
      this.glooWalls += item.amount;
    } else if (item.kind === 'mushroom') {
      this.ep = Math.min(this.maxEp, this.ep + item.amount);
    } else if (item.kind === 'vest') {
      const lv = item.level || 1;
      if (lv >= this.vestLevel) {
        this.vestLevel = lv;
        this.vestDurability = lv * 70;
      }
    } else if (item.kind === 'helmet') {
      const lv = item.level || 1;
      if (lv >= this.helmetLevel) {
        this.helmetLevel = lv;
        this.helmetDurability = lv * 55;
      }
    } else if (item.kind === 'ammo') {
      const active = this.slots[this.activeSlot];
      if (active) active.reserve += item.amount;
    }
  }

  private findNearestLoot(radius: number): LootItem | null {
    let best: LootItem | null = null;
    let bestD = radius;
    for (let i = 0; i < this.lootItems.length; i++) {
      const item = this.lootItems[i];
      if (item.collected) continue;
      const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  private findNearestDeathCrate(radius: number): DeathCrate | null {
    let best: DeathCrate | null = null;
    let bestD = radius;
    for (let i = 0; i < this.deathCrates.length; i++) {
      const dc = this.deathCrates[i];
      if (dc.collected || dc.removed) continue;
      const d = Math.hypot(dc.x - this.playerX, dc.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        best = dc;
      }
    }
    return best;
  }

  private lootDeathCrate(crate: DeathCrate) {
    if (crate.collected || crate.removed) return;
    crate.collected = true;
    crate.rig.beacon.visible = false;
    crate.rig.holoRing.visible = false;
    soundEngine.playPickup();

    this.medkits += crate.medkits;
    this.glooWalls += crate.glooWalls;
    if (crate.vestLevel > this.vestLevel) {
      this.vestLevel = crate.vestLevel;
      this.vestDurability = crate.vestLevel * 70;
    } else if (crate.vestLevel > 0 && this.vestLevel === crate.vestLevel) {
      this.vestDurability = Math.min(this.vestLevel * 85, this.vestDurability + 35);
    }
    if (crate.helmetLevel > this.helmetLevel) {
      this.helmetLevel = crate.helmetLevel;
      this.helmetDurability = crate.helmetLevel * 55;
    } else if (crate.helmetLevel > 0 && this.helmetLevel === crate.helmetLevel) {
      this.helmetDurability = Math.min(this.helmetLevel * 70, this.helmetDurability + 25);
    }

    let replacedActivePrimary = false;
    for (let i = 0; i < crate.droppedSlots.length; i++) {
      const dropped = crate.droppedSlots[i];
      const def = WEAPONS[dropped.weaponId];
      if (!def) continue;
      const totalAmmo = Math.max(0, dropped.mag) + Math.max(0, dropped.reserve);

      let matchedExisting = false;
      for (let s = 0; s < 3; s++) {
        if (this.slots[s]?.weaponId === dropped.weaponId) {
          this.slots[s]!.reserve += Math.max(def.magSize, totalAmmo);
          matchedExisting = true;
          break;
        }
      }
      if (matchedExisting) continue;

      if (def.slotType === 'sidearm') {
        if (!this.slots[2]) {
          this.equipOrAddWeapon(dropped.weaponId, Math.max(1, dropped.mag), dropped.reserve);
        } else {
          this.slots[2]!.reserve += Math.max(def.magSize, totalAmmo);
        }
      } else {
        const hasOpenPrimary = !this.slots[0] || !this.slots[1];
        if (hasOpenPrimary || !replacedActivePrimary) {
          if (!hasOpenPrimary) replacedActivePrimary = true;
          this.equipOrAddWeapon(
            dropped.weaponId,
            Math.max(1, dropped.mag),
            Math.max(def.magSize, dropped.reserve)
          );
        } else {
          const active = this.slots[this.activeSlot] || this.slots[0] || this.slots[1];
          if (active) active.reserve += Math.max(18, Math.round(totalAmmo * 0.5));
        }
      }
    }

    if (crate.crateKey.startsWith('mp_')) {
      this.sendMp({
        type: 'crate:loot',
        crateKey: crate.crateKey,
      });
    }
    this.pushHudState();
  }

  public setPaused(paused: boolean) {
    if (paused && (this.phase === 'playing' || this.phase === 'parachute' || this.phase === 'plane')) {
      this.phase = 'paused';
      if (document.pointerLockElement) document.exitPointerLock();
      this.pushHudState();
    } else if (!paused && this.phase === 'paused') {
      this.phase = this.playerY > groundHeightAt(this.playerX, this.playerZ, this.mapId) + 2.5
        ? 'parachute'
        : 'playing';
      this.requestPointerLockSafe();
      this.pushHudState();
    }
  }

  public updateControlSettings(settings: ControlSettings) {
    this.controlSettings = settings;
  }

  public setTouchJoystick(dx: number, dy: number, sprintLocked?: boolean) {
    this.touchMoveX = dx;
    this.touchMoveY = dy;
    if (typeof sprintLocked === 'boolean') {
      this.sprintLocked = sprintLocked;
      if (sprintLocked && this.phase === 'playing' && !this.activeVehicle) {
        this.stance = 'stand';
        this.isAds = false;
      }
    }
  }

  public setTouchFire(firing: boolean) {
    this.mouseFireDown = firing;
  }

  private getActiveSensitivityMultiplier(): number {
    const activeW = this.slots[this.activeSlot]?.weaponId || 'deagle';
    const sens = this.controlSettings.sensitivity;
    let tier = sens.general;
    if (this.isAds) {
      if (activeW === 'awm') tier = sens.scope4x;
      else if (activeW === 'scar') tier = sens.scope2x;
      else tier = sens.redDot;
    }
    return Math.max(0.15, tier / 100);
  }

  public addTouchAimDelta(
    dx: number,
    dy: number,
    mode: 'look' | 'fire_drag' | 'freelook' = 'look'
  ) {
    if (this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'victory') return;
    if (mode === 'freelook') {
      const freeMult = Math.max(0.2, this.controlSettings.sensitivity.freeLook / 100);
      const freeSens = 0.0032 * freeMult;
      this.freeLookYaw = THREE.MathUtils.clamp(
        this.freeLookYaw - dx * freeSens,
        -Math.PI * 0.95,
        Math.PI * 0.95
      );
      this.freeLookPitch = THREE.MathUtils.clamp(this.freeLookPitch + dy * freeSens, -0.5, 0.58);
      return;
    }

    const sens = 0.0024 * this.getActiveSensitivityMultiplier();
    if (mode === 'fire_drag') {
      // Iconic Free Fire Drag-to-Headshot upward swipe responsiveness while firing
      this.playerYaw -= dx * sens * 1.12;
      this.playerPitch = THREE.MathUtils.clamp(
        this.playerPitch + dy * sens * 1.48,
        -0.62,
        0.72
      );
    } else {
      this.playerYaw -= dx * sens * 1.32;
      this.playerPitch = THREE.MathUtils.clamp(
        this.playerPitch + dy * sens * 1.32,
        -0.62,
        0.72
      );
    }
  }

  public setFreeLookActive(active: boolean) {
    this.freeLookActive = active;
  }

  public triggerJump() {
    if (this.phase === 'parachute' && !this.parachuteOpen) {
      this.deployParachute();
      return;
    }
    if (this.phase !== 'playing' || this.activeVehicle) return;
    if (this.grounded) {
      this.playerVy = 7.4;
      this.grounded = false;
      this.stance = 'stand';
    }
  }

  public toggleCrouch() {
    if (this.phase !== 'playing') return;
    if (this.activeVehicle) {
      this.switchVehicleSeat();
      return;
    }
    this.stance = this.stance === 'crouch' ? 'stand' : 'crouch';
    if (this.stance === 'crouch') {
      this.sprintLocked = false;
    }
    soundEngine.playClick();
    this.pushHudState();
  }

  public toggleProne() {
    if (this.phase !== 'playing' || this.activeVehicle) return;
    this.stance = this.stance === 'prone' ? 'stand' : 'prone';
    if (this.stance === 'prone') {
      this.sprintLocked = false;
    }
    soundEngine.playClick();
    this.pushHudState();
  }

  public setAds(ads: boolean) {
    if (this.phase !== 'playing') return;
    if (this.activeVehicle && this.activeSeat === 'driver') return;
    this.isAds = ads;
    if (ads) this.sprintLocked = false;
    this.pushHudState();
  }

  public toggleAds() {
    if (this.phase !== 'playing') return;
    if (this.activeVehicle && this.activeSeat === 'driver') return;
    this.isAds = !this.isAds;
    if (this.isAds) this.sprintLocked = false;
    soundEngine.playClick();
    this.pushHudState();
  }

  public requestPointerLockSafe() {
    try {
      const dom = this.renderer.domElement;
      if (!dom || document.pointerLockElement === dom) return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)').matches &&
        !window.matchMedia?.('(pointer: fine)').matches
      ) {
        return;
      }
      const userActivation = (
        navigator as Navigator & { userActivation?: { isActive: boolean } }
      ).userActivation;
      if (userActivation && !userActivation.isActive) {
        return;
      }
      const result = dom.requestPointerLock?.() as unknown;
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {});
      }
    } catch {
      // Ignore if blocked in sandboxed iframe or without user gesture
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (e.code === 'Escape') {
      if (this.phase === 'playing' || this.phase === 'parachute' || this.phase === 'plane') {
        this.setPaused(true);
      } else if (this.phase === 'paused') {
        this.setPaused(false);
      }
      return;
    }

    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      e.preventDefault();
      this.freeLookActive = true;
      return;
    }

    if (this.phase === 'plane' && (e.code === 'KeyF' || e.code === 'Space')) {
      e.preventDefault();
      this.ejectFromPlane();
      return;
    }

    if (this.phase === 'parachute' && e.code === 'Space') {
      e.preventDefault();
      this.deployParachute();
      return;
    }

    if (this.phase !== 'playing' || this.emoteWheelOpen) return;

    if (e.code === 'Digit1') this.switchSlot(0);
    else if (e.code === 'Digit2') this.switchSlot(1);
    else if (e.code === 'Digit3') this.switchSlot(2);
    else if (e.code === 'KeyR') this.startReload();
    else if (e.code === 'Digit4') this.startHeal();
    else if (e.code === 'KeyH') {
      if (this.activeVehicle && this.activeSeat === 'driver') this.honkVehicle();
      else this.startHeal();
    } else if (e.code === 'KeyG' || e.code === 'Digit5') this.deployGlooWall();
    else if (e.code === 'KeyQ') this.activateSkill();
    else if (e.code === 'KeyB') {
      if (!this.activeVehicle) this.enterNearestVehicle('passenger');
    } else if (e.code === 'KeyE') this.interactLoot();
    else if (e.code === 'KeyF') {
      if (this.activeVehicle) {
        this.exitVehicle();
      } else {
        const nearAir =
          this.airdropSpawned &&
          !this.airdropCollected &&
          Math.hypot(this.playerX - this.airdropPos.x, this.playerZ - this.airdropPos.z) < 3.8;
        const nearCrate = this.findNearestDeathCrate(3.2);
        if (!nearAir && !nearCrate && this.findNearestVehicle(4.4)) {
          this.enterNearestVehicle('driver');
        } else {
          this.interactLoot();
        }
      }
    } else if (e.code === 'KeyC') {
      this.toggleCrouch();
    } else if (e.code === 'KeyZ') {
      this.toggleProne();
    } else if (e.code === 'KeyV') {
      this.toggleAds();
    }
  };

  public setEmoteWheelOpen(open: boolean) {
    this.emoteWheelOpen = open;
    if (open) {
      this.mouseFireDown = false;
      this.isDragLooking = false;
    }
  }

  public triggerEmote(emoteId: string) {
    if (this.phase !== 'playing' || this.hp <= 0 || this.activeVehicle || this.isAds || this.isHealing) {
      return;
    }
    const def = EMOTE_CATALOG.find((e) => e.id === emoteId);
    this.activeEmoteId = emoteId;
    this.activeEmoteTimer = 0;
    this.activeEmoteDuration = def?.duration ?? 2.4;
    this.sprintLocked = false;
    this.stance = 'stand';
    soundEngine.playEmote(def?.rarity === 'mythic');
    this.sendMp({ type: 'player:emote', emoteId });
    this.pushHudState();
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      this.freeLookActive = false;
    }
  };

  private onWindowBlur = () => {
    this.keys = {};
    this.mouseFireDown = false;
    this.isDragLooking = false;
    this.freeLookActive = false;
    this.sprintLocked = false;
    this.touchThrottle = 0;
    this.touchSteer = 0;
    this.touchNitro = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (
      this.emoteWheelOpen ||
      this.phase === 'paused' ||
      this.phase === 'spectating' ||
      this.phase === 'gameover' ||
      this.phase === 'victory'
    )
      return;
    if (e.button === 0) {
      if (!this.activeVehicle || this.activeSeat === 'passenger') {
        this.mouseFireDown = true;
      }
      this.isDragLooking = true;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    } else if (e.button === 2 && this.phase === 'playing') {
      if (!this.activeVehicle || this.activeSeat === 'passenger') {
        this.isAds = true;
        this.sprintLocked = false;
      }
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseFireDown = false;
      this.isDragLooking = false;
    } else if (e.button === 2) {
      this.isAds = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (
      this.emoteWheelOpen ||
      this.phase === 'paused' ||
      this.phase === 'spectating' ||
      this.phase === 'gameover' ||
      this.phase === 'victory'
    )
      return;
    if (this.freeLookActive && (this.pointerLocked || this.isDragLooking)) {
      const dx = this.pointerLocked ? e.movementX : e.clientX - this.lastDragX;
      const dy = this.pointerLocked ? e.movementY : e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.addTouchAimDelta(dx, dy, 'freelook');
      return;
    }

    const sens = 0.0022 * this.getActiveSensitivityMultiplier();
    if (this.pointerLocked) {
      this.playerYaw -= e.movementX * sens;
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch + e.movementY * sens, -0.62, 0.72);
    } else if (this.isDragLooking) {
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.playerYaw -= dx * sens * 1.4;
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch + dy * sens * 1.4, -0.62, 0.72);
    }
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private onPointerLockError = () => {
    this.pointerLocked = false;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents() {
    const dom = this.renderer.domElement;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    window.addEventListener('resize', this.onResize);
  }

  private resolveCollisions(x: number, z: number, y: number, radius = 0.45): [number, number] {
    let nx = THREE.MathUtils.clamp(x, -PLAYABLE_LIMIT, PLAYABLE_LIMIT);
    let nz = THREE.MathUtils.clamp(z, -PLAYABLE_LIMIT, PLAYABLE_LIMIT);

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (y > c.baseY + c.height) continue;
      if (
        nx + radius > c.minX &&
        nx - radius < c.maxX &&
        nz + radius > c.minZ &&
        nz - radius < c.maxZ
      ) {
        const penLeft = Math.abs(nx + radius - c.minX);
        const penRight = Math.abs(c.maxX - (nx - radius));
        const penTop = Math.abs(nz + radius - c.minZ);
        const penBot = Math.abs(c.maxZ - (nz - radius));
        const m = Math.min(penLeft, penRight, penTop, penBot);
        if (m === penLeft) nx = c.minX - radius;
        else if (m === penRight) nx = c.maxX + radius;
        else if (m === penTop) nz = c.minZ - radius;
        else nz = c.maxZ + radius;
      }
    }
    return [nx, nz];
  }

  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3, colorHex = 0xfef08a) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08, maxLife: 0.08 });
  }

  private spawnSparks(pos: THREE.Vector3, colorHex: number, count = 5) {
    let mat = this.sparkMats.get(colorHex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: colorHex });
      this.sparkMats.set(colorHex, mat);
    }
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 7,
        vy: Math.random() * 5 + 1.5,
        vz: (Math.random() - 0.5) * 7,
        life: 0.32,
      });
    }
  }

  private addDamagePopup(worldPos: THREE.Vector3, amount: number, headshot: boolean, armorHit: boolean) {
    this.damagePopups.push({
      id: this.nextPopupId++,
      x: 0,
      y: 0,
      amount: Math.round(amount),
      headshot,
      armorHit,
      alpha: 1,
      worldPos: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, 0)),
      life: 0.75,
    });
  }

  private pushKillFeed(
    killer: string,
    victim: string,
    weapon: string,
    headshot: boolean,
    isPlayer: boolean,
    isVictimPlayer = false,
    isZone = false
  ) {
    this.killFeed.unshift({
      id: this.nextFeedId++,
      killer,
      victim,
      weapon,
      headshot,
      isPlayer,
      isVictimPlayer,
      isZone,
      ageSec: 0,
      timestamp: this.matchTime,
    });
    if (this.killFeed.length > 5) this.killFeed.length = 5;
    this.hudSyncTimer = 0.065;
  }

  private firePlayerWeapon() {
    const slot = this.slots[this.activeSlot];
    if (!slot || this.isReloading) return;
    if (slot.mag <= 0) {
      this.startReload();
      return;
    }

    const def = WEAPONS[slot.weaponId];
    slot.mag--;
    this.fireCooldown = 1 / def.fireRate;
    this.isHealing = false;

    soundEngine.playShot(def.id, 1);
    this.recoilPitch += def.recoil;
    this.cameraShake = Math.min(0.28, this.cameraShake + def.recoil * 1.8);

    // Muzzle position & flash
    const muzzleHeight = this.stance === 'prone' ? 0.42 : this.stance === 'crouch' ? 1.05 : 1.42;
    const muzzleWorld = _vec3A.set(
      this.playerX + Math.sin(this.playerYaw) * 0.75,
      this.playerY + muzzleHeight,
      this.playerZ + Math.cos(this.playerYaw) * 0.75
    );
    this.muzzleLight.position.copy(muzzleWorld);
    this.muzzleLight.intensity = 5.5;
    this.muzzleTimer = 0.045;

    // Collect raycast targets (alive bots + remote human players + gloo walls + active vehicles)
    const targets: THREE.Object3D[] = [];
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (!b.alive || b.inPlane) continue;
      targets.push(b.rig.hitHeadMesh, b.rig.hitBodyMesh);
    }
    this.remoteHumans.forEach((rh) => {
      if (rh.alive && !rh.inPlane) {
        targets.push(rh.rig.hitHeadMesh, rh.rig.hitBodyMesh);
      }
    });
    for (let i = 0; i < this.glooList.length; i++) {
      if (this.glooList[i].hp > 0) targets.push(this.glooList[i].hitMesh);
    }
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.destroyed && v !== this.activeVehicle) {
        targets.push(v.rig.hitMesh);
      }
    }

    // Free Fire Aim Precision Soft Magnetism (Default / Precise on Scope / Full Control)
    let aimOffsetNdcX = 0;
    let aimOffsetNdcY = 0;
    const aimMode = this.controlSettings.aimPrecision;
    const assistActive =
      aimMode === 'default' || (aimMode === 'precise_scope' && !this.isAds);
    if (assistActive) {
      let bestScore = this.isAds ? 0.085 : 0.115; // screen NDC radius around crosshair
      let bestNdcX = 0;
      let bestNdcY = 0;

      const considerPoint = (px: number, py: number, pz: number) => {
        const dist = Math.hypot(px - this.playerX, pz - this.playerZ);
        if (dist > def.range || dist < 1.2) return;
        _vec3D.set(px, py, pz).project(this.camera);
        if (_vec3D.z > 1 || _vec3D.z < -1) return;
        const r = Math.hypot(_vec3D.x, _vec3D.y);
        if (r < bestScore) {
          bestScore = r;
          bestNdcX = _vec3D.x;
          bestNdcY = _vec3D.y;
        }
      };

      for (let i = 0; i < this.bots.length; i++) {
        const b = this.bots[i];
        if (!b.alive || b.inPlane) continue;
        considerPoint(b.x, b.y + 1.15, b.z);
        considerPoint(b.x, b.y + 1.62, b.z);
      }
      this.remoteHumans.forEach((rh) => {
        if (!rh.alive || rh.inPlane) return;
        considerPoint(rh.x, rh.y + 1.15, rh.z);
        considerPoint(rh.x, rh.y + 1.62, rh.z);
      });

      if (bestScore < (this.isAds ? 0.085 : 0.115)) {
        const pull = this.isAds ? 0.55 : 0.65;
        aimOffsetNdcX = bestNdcX * pull;
        aimOffsetNdcY = bestNdcY * pull;
      }
    }

    const lauraPinpoint =
      this.isAds && this.skillActiveTimer > 0 && this.profile.selectedSkinId === 'laura';
    const baseSpread = lauraPinpoint ? def.adsSpread * 0.25 : this.isAds ? def.adsSpread : def.spread;
    const armorPenBonus =
      this.skillActiveTimer > 0 &&
      (this.profile.selectedSkinId === 'hayato' || this.profile.selectedSkinId === 'laura')
        ? 1.3
        : this.skillActiveTimer > 0 &&
          (this.profile.selectedSkinId === 'hiphop' || this.profile.selectedSkinId === 'rafael')
        ? 1.25
        : this.skillActiveTimer > 0 && this.profile.selectedSkinId === 'paloma'
        ? 1.2
        : 1.0;

    let anyHit = false;
    let anyHead = false;
    let lastEndPt = _vec3B;

    for (let p = 0; p < def.pellets; p++) {
      // Aim from camera center screen (true over-the-shoulder TPS aiming!)
      _vec2A.set(
        aimOffsetNdcX + (Math.random() - 0.5) * baseSpread * 2,
        aimOffsetNdcY + (Math.random() - 0.5) * baseSpread * 2
      );
      _raycaster.setFromCamera(_vec2A, this.camera);
      _raycaster.far = def.range;

      const hits = _raycaster.intersectObjects(targets, false);
      const endPt = _vec3B.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, def.range);

      if (hits.length > 0) {
        const hit = hits[0];
        endPt.copy(hit.point);

        // Check gloo wall
        const gloo = this.glooList.find((g) => g.hitMesh === hit.object);
        if (gloo) {
          gloo.hp -= def.damage;
          this.spawnSparks(hit.point, 0x38bdf8, 4);
          if (gloo.hp <= 0) {
            this.destroyGlooWall(gloo);
          }
          this.spawnTracer(muzzleWorld, endPt);
          lastEndPt = endPt;
          continue;
        }

        // Check remote human player
        let hitRemote: RemoteHumanActor | undefined;
        this.remoteHumans.forEach((rh) => {
          if (rh.alive && (rh.rig.hitHeadMesh === hit.object || rh.rig.hitBodyMesh === hit.object)) {
            hitRemote = rh;
          }
        });
        if (hitRemote) {
          const isHead = hit.object === hitRemote.rig.hitHeadMesh;
          const distFalloff = hit.distance > def.range * 0.65 ? 0.8 : 1.0;
          const klaBonus =
            this.skillActiveTimer > 0 && this.profile.selectedSkinId === 'kla' && hit.distance < 25
              ? 1.35
              : 1.0;
          const dmg = def.damage * distFalloff * (isHead ? def.headshotMult : 1.0) * armorPenBonus * klaBonus;
          this.damageDealt += dmg;
          anyHit = true;
          if (isHead) anyHead = true;
          this.addDamagePopup(hit.point, dmg, isHead, false);
          this.spawnSparks(hit.point, isHead ? 0xef4444 : 0xfbbf24, isHead ? 8 : 5);
          this.sendMp({
            type: 'player:hit',
            targetId: hitRemote.id,
            damage: dmg,
            headshot: isHead,
            weaponName: def.name,
          });
          this.spawnTracer(muzzleWorld, endPt);
          lastEndPt = endPt;
          continue;
        }

        // Check bot
        const bot = this.bots.find(
          (b) => b.alive && (b.rig.hitHeadMesh === hit.object || b.rig.hitBodyMesh === hit.object)
        );
        if (bot) {
          const isHead = hit.object === bot.rig.hitHeadMesh;
          const distFalloff = hit.distance > def.range * 0.65 ? 0.8 : 1.0;
          const klaBonus =
            this.skillActiveTimer > 0 && this.profile.selectedSkinId === 'kla' && hit.distance < 25
              ? 1.35
              : 1.0;
          let dmg = def.damage * distFalloff * (isHead ? def.headshotMult : 1.0) * armorPenBonus * klaBonus;
          if (!isHead && bot.vestLevel > 0) {
            dmg *= 1 - bot.vestLevel * 0.14;
          }
          bot.hp -= dmg;
          bot.hitFlash = 0.14;
          this.damageDealt += dmg;
          anyHit = true;
          if (isHead) anyHead = true;

          this.addDamagePopup(hit.point, dmg, isHead, !isHead && bot.vestLevel > 0);
          this.spawnSparks(hit.point, isHead ? 0xef4444 : 0xfbbf24, isHead ? 8 : 5);

          if (bot.hp <= 0) {
            this.eliminateBot(
              bot,
              this.profile.name,
              def.name,
              isHead,
              true,
              this.playerX,
              this.playerZ,
              false
            );
          }
          this.spawnTracer(muzzleWorld, endPt);
          lastEndPt = endPt;
          continue;
        }

        // Check vehicle hull
        const hitVeh = this.vehicles.find((v) => !v.destroyed && v.rig.hitMesh === hit.object);
        if (hitVeh) {
          hitVeh.hp = Math.max(0, hitVeh.hp - def.damage);
          hitVeh.hitFlash = 0.14;
          this.damageDealt += def.damage;
          anyHit = true;
          this.addDamagePopup(hit.point, def.damage, false, true);
          this.spawnSparks(hit.point, 0xfbbf24, 5);
          if (hitVeh.hp <= 0) {
            this.destroyVehicle(hitVeh);
          }
        }
      }

      this.spawnTracer(muzzleWorld, endPt);
      lastEndPt = endPt;
    }

    this.sendMp({
      type: 'player:shoot',
      fromX: muzzleWorld.x,
      fromY: muzzleWorld.y,
      fromZ: muzzleWorld.z,
      toX: lastEndPt.x,
      toY: lastEndPt.y,
      toZ: lastEndPt.z,
      weaponId: def.id,
    });

    if (anyHit) {
      soundEngine.playHitmarker(anyHead);
      this.hitmarkerType = anyHead ? 'head' : 'body';
      this.hitmarkerTimer = 0.18;
    }

    if (slot.mag === 0 && slot.reserve > 0) {
      this.startReload();
    }
  }

  private destroyGlooWall(gloo: GlooInstance) {
    gloo.hp = 0;
    this.scene.remove(gloo.mesh);
    this.scene.remove(gloo.hitMesh);
    const idx = this.colliders.indexOf(gloo.collider);
    if (idx !== -1) this.colliders.splice(idx, 1);
  }

  private spawnRagdollForRig(
    rig: CharacterRig,
    x: number,
    y: number,
    z: number,
    yaw: number,
    opts: {
      attackerX?: number;
      attackerZ?: number;
      headshot?: boolean;
      isVehicle?: boolean;
      isZone?: boolean;
      isLocalPlayer?: boolean;
    } = {}
  ) {
    rig.root.visible = true;
    rig.parachuteGroup.visible = false;
    rig.skillAuraGroup.visible = false;
    for (let i = 0; i < rig.root.children.length; i++) {
      const child = rig.root.children[i];
      if ((child as THREE.Sprite).isSprite) {
        child.visible = false;
      }
    }
    resetEmoteRigBase(rig);

    let kx = -Math.sin(yaw);
    let kz = -Math.cos(yaw);
    if (opts.attackerX !== undefined && opts.attackerZ !== undefined) {
      const dx = x - opts.attackerX;
      const dz = z - opts.attackerZ;
      const len = Math.hypot(dx, dz);
      if (len > 0.05) {
        kx = dx / len;
        kz = dz / len;
      }
    }

    // Determine whether knockback flips victim onto back (-1) or pitches forward (+1)
    const fwdDot = kx * Math.sin(yaw) + kz * Math.cos(yaw);
    const fallDir: 1 | -1 = fwdDot >= 0 ? 1 : -1;

    let launchSpeed = opts.headshot ? 7.2 : 4.6;
    let launchVy = opts.headshot ? 4.8 : 2.9;
    let pitchVel = fallDir * (opts.headshot ? 8.2 : 5.8);
    let rollVel = (Math.random() - 0.5) * (opts.headshot ? 5.5 : 3.4);
    let yawVel = (Math.random() - 0.5) * 2.6;

    if (opts.isVehicle) {
      launchSpeed = 11.5;
      launchVy = 7.4;
      pitchVel = fallDir * 9.5;
      rollVel = (Math.random() - 0.5) * 9.0;
      yawVel = (Math.random() - 0.5) * 5.2;
    } else if (opts.isZone) {
      launchSpeed = 0.8;
      launchVy = 1.2;
      pitchVel = fallDir * 3.6;
      rollVel = (Math.random() - 0.5) * 2.0;
      yawVel = (Math.random() - 0.5) * 0.8;
    }

    const spreadAngle = (Math.random() - 0.5) * 0.32;
    const cosA = Math.cos(spreadAngle);
    const sinA = Math.sin(spreadAngle);
    const vx = (kx * cosA - kz * sinA) * launchSpeed;
    const vz = (kx * sinA + kz * cosA) * launchSpeed;

    const targetPitch = fallDir === 1 ? Math.PI / 2 - 0.08 : -Math.PI / 2 + 0.08;
    const targetRoll = (Math.random() - 0.5) * 0.55;

    this.ragdolls.push({
      id: this.nextRagdollId++,
      rig,
      isLocalPlayer: Boolean(opts.isLocalPlayer),
      x,
      y,
      z,
      vx,
      vy: launchVy,
      vz,
      yaw,
      yawVel,
      pitch: rig.bodyPivot.rotation.x,
      pitchVel,
      targetPitch,
      roll: rig.bodyPivot.rotation.z,
      rollVel,
      targetRoll,
      settled: false,
      age: 0,
      maxAge: opts.isLocalPlayer ? 999 : 11.0,
      headPitch: fallDir === -1 ? 0.35 : -0.45,
      headRoll: (Math.random() - 0.5) * 0.65,
      leftArmX: -0.45 - Math.random() * 0.9,
      leftArmZ: -(0.55 + Math.random() * 0.65),
      rightArmX: -0.55 - Math.random() * 0.95,
      rightArmZ: 0.55 + Math.random() * 0.65,
      leftLegX: (Math.random() - 0.5) * 0.45,
      leftLegZ: -(0.12 + Math.random() * 0.28),
      rightLegX: (Math.random() - 0.5) * 0.45,
      rightLegZ: 0.12 + Math.random() * 0.28,
    });
  }

  private spawnDeathCrate(
    victimName: string,
    rawX: number,
    rawZ: number,
    inventory: {
      slots: WeaponSlotState[];
      medkits: number;
      glooWalls: number;
      vestLevel: number;
      helmetLevel: number;
      crateKey?: string;
    },
    tier: 'normal' | 'high' = 'normal'
  ) {
    const crateKey =
      inventory.crateKey || `local_${this.nextDeathCrateId}_${Math.round(rawX)}_${Math.round(rawZ)}`;
    if (this.deathCrates.some((dc) => dc.crateKey === crateKey)) return;

    const rawY = groundHeightAt(rawX, rawZ, this.mapId);
    const [cx, cz] = this.resolveCollisions(rawX, rawZ, rawY, 0.58);
    const cy = groundHeightAt(cx, cz, this.mapId);

    const accentHex = tier === 'high' ? 0xf59e0b : 0x38bdf8;
    const rig = createDeathCrateMesh(accentHex, tier);
    rig.group.position.set(cx, cy, cz);
    rig.group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(rig.group);

    const cleanSlots: WeaponSlotState[] = inventory.slots
      .filter((s) => Boolean(WEAPONS[s.weaponId]))
      .map((s) => ({
        weaponId: s.weaponId,
        mag: Math.max(0, Math.floor(s.mag)),
        reserve: Math.max(0, Math.floor(s.reserve)),
      }));
    if (cleanSlots.length === 0) {
      cleanSlots.push({ weaponId: 'deagle', mag: WEAPONS.deagle.magSize, reserve: 14 });
    }

    this.deathCrates.push({
      id: this.nextDeathCrateId++,
      crateKey,
      victimName,
      droppedSlots: cleanSlots,
      medkits: Math.max(0, Math.floor(inventory.medkits)),
      glooWalls: Math.max(0, Math.floor(inventory.glooWalls)),
      vestLevel: Math.max(0, Math.min(3, Math.floor(inventory.vestLevel))),
      helmetLevel: Math.max(0, Math.min(3, Math.floor(inventory.helmetLevel))),
      tier,
      x: cx,
      y: cy,
      z: cz,
      rig,
      collected: false,
      openedAge: 0,
      removed: false,
    });
  }

  private eliminateBot(
    bot: BotActor,
    killerName: string,
    weaponName: string,
    headshot: boolean,
    byPlayer: boolean,
    attackerX?: number,
    attackerZ?: number,
    isVehicle = false
  ) {
    if (!bot.alive) return;
    bot.alive = false;
    const isZoneElim = killerName === 'Safe Zone' || weaponName === 'Storm';

    this.pushKillFeed(killerName, bot.name, weaponName, headshot, byPlayer, false, isZoneElim);
    this.spawnRagdollForRig(bot.rig, bot.x, bot.y, bot.z, bot.yaw, {
      attackerX,
      attackerZ,
      headshot,
      isVehicle,
      isZone: isZoneElim,
    });
    const mainDef = WEAPONS[bot.weaponId] || WEAPONS.deagle;
    const botSlots: WeaponSlotState[] = [
      {
        weaponId: mainDef.id,
        mag: mainDef.magSize,
        reserve: mainDef.magSize * 2,
      },
    ];
    if (bot.vestLevel > 0 && mainDef.id !== 'mp40') {
      botSlots.push({ weaponId: 'mp40', mag: WEAPONS.mp40.magSize, reserve: 56 });
    }
    const isHighTier = headshot || isVehicle || bot.vestLevel > 0;
    this.spawnDeathCrate(
      bot.name,
      bot.x,
      bot.z,
      {
        slots: botSlots,
        medkits: isHighTier ? 2 : 1,
        glooWalls: isHighTier ? 2 : 1,
        vestLevel: bot.vestLevel,
        helmetLevel: isHighTier ? 1 : 0,
        crateKey: `bot_${bot.id}`,
      },
      isHighTier ? 'high' : 'normal'
    );

    if (byPlayer) {
      this.kills++;
      if (headshot) this.headshots++;
      this.hitstopTimer = 0.045; // Crisp 45ms impact punch on kill
    }

    this.checkMatchEnd();
  }

  private applyDamageToPlayer(
    rawDmg: number,
    attackerName: string,
    weaponName: string,
    isZone = false,
    isHeadshot = false,
    attackerId?: string,
    attackerX?: number,
    attackerZ?: number,
    isVehicle = false,
    attackerBotId?: number
  ) {
    if (this.phase !== 'playing' && this.phase !== 'parachute') return;
    if (!isZone) {
      if (attackerId) {
        this.lastAttackerId = attackerId;
        this.lastAttackerBotId = -1;
        this.lastAttackerAt = this.matchTime;
      } else if (attackerBotId !== undefined) {
        this.lastAttackerBotId = attackerBotId;
        this.lastAttackerId = '';
        this.lastAttackerAt = this.matchTime;
      }
    }
    if (attackerX !== undefined && attackerZ !== undefined) {
      this.lastAttackerX = attackerX;
      this.lastAttackerZ = attackerZ;
    }

    let dmg = rawDmg;
    if (!isZone && this.skillActiveTimer > 0) {
      if (this.profile.selectedSkinId === 'chrono') {
        dmg *= 0.35; // Time Turner Force-field absorbs 65% bullet damage
      } else if (
        this.profile.selectedSkinId === 'andrew' ||
        this.profile.selectedSkinId === 'orion'
      ) {
        dmg *= 0.65; // 35% Bullet / Crimson Shield
      } else if (
        this.profile.selectedSkinId === 'wukong' ||
        this.profile.selectedSkinId === 'steffie'
      ) {
        dmg *= 0.7; // 30% Damage Reduction
      } else if (this.profile.selectedSkinId === 'antonio') {
        dmg *= 0.8; // 20% Damage Reduction
      }
    }
    if (!isZone && this.vestLevel > 0 && this.vestDurability > 0) {
      const absorbed = Math.min(this.vestDurability, dmg * (0.18 * this.vestLevel));
      this.vestDurability -= absorbed * 0.6;
      dmg -= absorbed;
      if (this.vestDurability <= 0) this.vestLevel = 0;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.damageFlash = isZone ? 0.35 : 0.75;
    if (!isZone) {
      this.cameraShake = Math.min(0.22, this.cameraShake + 0.08);
    }
    if (this.hp <= 0) {
      if (this.activeVehicle) {
        this.exitVehicle();
      }
      this.isAds = false;
      this.mouseFireDown = false;
      this.isReloading = false;
      this.isHealing = false;
      this.freeLookActive = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;

      const impX = attackerX ?? this.lastAttackerX;
      const impZ = attackerZ ?? this.lastAttackerZ;
      const killerId = attackerId || this.lastAttackerId || undefined;
      const activeWepId = this.slots[this.activeSlot]?.weaponId || 'deagle';
      const droppedSlots: WeaponSlotState[] = this.slots
        .filter((s): s is WeaponSlotState => Boolean(s))
        .map((s) => ({
          weaponId: s.weaponId,
          mag: s.mag,
          reserve: s.reserve,
        }));
      const droppedMeds = this.medkits;
      const droppedGloo = this.glooWalls;
      const droppedVest = this.vestLevel;
      const droppedHelmet = this.helmetLevel;
      const crateKey = `mp_${this.mpSession?.localPlayerId || 'local'}_${Math.round(this.matchTime * 100)}`;

      // Clear local player's dropped inventory upon death crate creation
      this.slots = [null, null, null];
      this.medkits = 0;
      this.glooWalls = 0;
      this.vestLevel = 0;
      this.vestDurability = 0;
      this.helmetLevel = 0;
      this.helmetDurability = 0;

      this.eliminatedBy = attackerName;
      this.spawnRagdollForRig(
        this.playerRig,
        this.playerX,
        this.playerY,
        this.playerZ,
        this.playerYaw,
        {
          attackerX: impX,
          attackerZ: impZ,
          headshot: isHeadshot,
          isVehicle,
          isZone,
          isLocalPlayer: true,
        }
      );
      this.spawnDeathCrate(
        this.profile.name,
        this.playerX,
        this.playerZ,
        {
          slots: droppedSlots,
          medkits: droppedMeds,
          glooWalls: droppedGloo,
          vestLevel: droppedVest,
          helmetLevel: droppedHelmet,
          crateKey,
        },
        'high'
      );
      this.pushKillFeed(attackerName, this.profile.name, weaponName, isHeadshot, false, true, isZone);
      this.sendMp({
        type: 'player:elim',
        crateKey,
        killerId,
        killerName: attackerName,
        weaponName,
        weaponId: activeWepId,
        slots: droppedSlots,
        medkits: droppedMeds,
        glooWalls: droppedGloo,
        vestLevel: droppedVest,
        helmetLevel: droppedHelmet,
        headshot: isHeadshot,
        isVehicle,
        isZone,
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        attackerX: impX,
        attackerZ: impZ,
      });
      this.enterSpectatorCam(attackerName, attackerId, attackerBotId);
    }
  }

  private enterSpectatorCam(attackerName: string, attackerId?: string, attackerBotId?: number) {
    if (document.pointerLockElement) document.exitPointerLock();
    this.mouseFireDown = false;
    this.isAds = false;
    this.isReloading = false;
    this.isHealing = false;
    this.isDragLooking = false;
    const aliveEnemies = this.bots.filter((b) => b.alive).length + this.getAliveRemoteCount();
    this.lockedElimRank = Math.max(2, aliveEnemies + 1);
    this.lockedSurvivalTime = Math.round(this.matchTime);
    this.spectateTimer = 3.0;
    this.spectateOrbitOffset = 0;
    this.hudSyncTimer = 0;

    const recentAttacker = this.matchTime - this.lastAttackerAt <= 8.0;
    const resolvedHumanId = attackerId || (recentAttacker ? this.lastAttackerId : '');
    const resolvedBotId = attackerBotId ?? (recentAttacker ? this.lastAttackerBotId : -1);

    const humanKiller = resolvedHumanId ? this.remoteHumans.get(resolvedHumanId) : undefined;
    const botKiller = resolvedBotId >= 0 ? this.bots.find((b) => b.id === resolvedBotId) : undefined;

    if (humanKiller && !humanKiller.inPlane) {
      this.spectateMode = 'human';
      this.spectateHumanId = humanKiller.id;
      this.spectateBotId = -1;
      this.spectateTargetName = humanKiller.name;
      this.spectateLastX = humanKiller.x;
      this.spectateLastY = humanKiller.y;
      this.spectateLastZ = humanKiller.z;
      this.spectateLastYaw = humanKiller.yaw;
    } else if (botKiller && !botKiller.inPlane) {
      this.spectateMode = 'bot';
      this.spectateBotId = botKiller.id;
      this.spectateHumanId = '';
      this.spectateTargetName = botKiller.name;
      this.spectateLastX = botKiller.x;
      this.spectateLastY = botKiller.y;
      this.spectateLastZ = botKiller.z;
      this.spectateLastYaw = botKiller.yaw;
    } else {
      // Fallback for Safe Zone / Explosion: follow nearest alive combatant if available
      let nearestBot: BotActor | null = null;
      let nearestHuman: RemoteHumanActor | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < this.bots.length; i++) {
        const b = this.bots[i];
        if (!b.alive || b.inPlane) continue;
        const d = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
        if (d < bestDist) {
          bestDist = d;
          nearestBot = b;
        }
      }
      this.remoteHumans.forEach((rh) => {
        if (!rh.alive || rh.inPlane) return;
        const d = Math.hypot(rh.x - this.playerX, rh.z - this.playerZ);
        if (d < bestDist) {
          bestDist = d;
          nearestHuman = rh;
          nearestBot = null;
        }
      });

      if (nearestHuman) {
        const rh: RemoteHumanActor = nearestHuman;
        this.spectateMode = 'human';
        this.spectateHumanId = rh.id;
        this.spectateBotId = -1;
        this.spectateTargetName = rh.name;
        this.spectateLastX = rh.x;
        this.spectateLastY = rh.y;
        this.spectateLastZ = rh.z;
        this.spectateLastYaw = rh.yaw;
      } else if (nearestBot) {
        this.spectateMode = 'bot';
        this.spectateBotId = nearestBot.id;
        this.spectateHumanId = '';
        this.spectateTargetName = nearestBot.name;
        this.spectateLastX = nearestBot.x;
        this.spectateLastY = nearestBot.y;
        this.spectateLastZ = nearestBot.z;
        this.spectateLastYaw = nearestBot.yaw;
      } else {
        this.spectateMode = 'pos';
        this.spectateBotId = -1;
        this.spectateHumanId = '';
        this.spectateTargetName = attackerName;
        this.spectateLastX = this.playerX;
        this.spectateLastY = this.playerY;
        this.spectateLastZ = this.playerZ;
        this.spectateLastYaw = this.playerYaw;
      }
    }

    this.phase = 'spectating';
    soundEngine.playEliminated();
    this.pushHudState(this.lockedElimRank);
  }

  public skipSpectate() {
    if (this.phase === 'spectating') {
      this.finishMatch(false);
    }
  }

  private getAliveRemoteCount(): number {
    let count = 0;
    this.remoteHumans.forEach((rh) => {
      if (rh.alive) count++;
    });
    return count;
  }

  private checkMatchEnd() {
    if (this.phase === 'victory' || this.phase === 'gameover' || this.phase === 'spectating') return;
    const aliveBots = this.bots.filter((b) => b.alive).length;
    const aliveHumans = this.getAliveRemoteCount();
    if (aliveBots === 0 && aliveHumans === 0 && this.hp > 0) {
      this.finishMatch(true);
    }
  }

  private finishMatch(won: boolean) {
    if (document.pointerLockElement) document.exitPointerLock();
    this.mouseFireDown = false;
    this.isAds = false;
    this.isReloading = false;
    this.isHealing = false;
    this.isDragLooking = false;
    const wasSpectating = this.phase === 'spectating';
    const aliveEnemies = this.bots.filter((b) => b.alive).length + this.getAliveRemoteCount();
    const rank = won ? 1 : (this.lockedElimRank ?? Math.max(2, aliveEnemies + 1));
    this.phase = won ? 'victory' : 'gameover';
    if (won) soundEngine.playBooyah();
    else if (!wasSpectating) soundEngine.playEliminated();
    this.pushHudState(rank);
  }

  private pickNextZoneCenter() {
    const maxOffset = Math.max(0, this.zoneRadius - this.nextZoneRadius - 2);
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * maxOffset * 0.72;
    let cx = this.zoneCenterX + Math.cos(angle) * dist;
    let cz = this.zoneCenterZ + Math.sin(angle) * dist;
    // Keep final circles firmly on playable landmass
    const islandDist = Math.hypot(cx, cz);
    const maxIslandCenter = Math.max(20, 88 - this.nextZoneRadius);
    if (islandDist > maxIslandCenter) {
      const clampScale = maxIslandCenter / islandDist;
      cx *= clampScale;
      cz *= clampScale;
    }
    this.nextZoneCenterX = cx;
    this.nextZoneCenterZ = cz;
  }

  private getCurrentZoneDps(): number {
    const idx = Math.min(this.zoneStages.length - 1, Math.max(0, this.zonePhase - 1));
    return this.zoneStages[idx].dps;
  }

  private updateZone(dt: number) {
    if (this.phase !== 'playing' && this.phase !== 'parachute' && this.phase !== 'spectating') return;

    const stageIdx = Math.min(this.zoneStages.length - 1, Math.max(0, this.zonePhase - 1));
    const stage = this.zoneStages[stageIdx];
    const timeMult = this.mode === 'br_blitz' ? 0.65 : 1.0;

    if (!this.zoneFinalized) {
      this.zoneTimer -= dt;
      if (!this.zoneShrinking && this.zoneTimer <= 0) {
        this.zoneShrinking = true;
        this.zoneStartCenterX = this.zoneCenterX;
        this.zoneStartCenterZ = this.zoneCenterZ;
        this.zoneStartRadius = this.zoneRadius;
        this.zoneShrinkDuration = Math.max(4, stage.shrinkSec * timeMult);
        this.zoneTimer = this.zoneShrinkDuration;
        soundEngine.playZoneWarning();
      } else if (this.zoneShrinking) {
        const progress = THREE.MathUtils.clamp(1 - this.zoneTimer / this.zoneShrinkDuration, 0, 1);
        this.zoneRadius = THREE.MathUtils.lerp(this.zoneStartRadius, this.nextZoneRadius, progress);
        this.zoneCenterX = THREE.MathUtils.lerp(this.zoneStartCenterX, this.nextZoneCenterX, progress);
        this.zoneCenterZ = THREE.MathUtils.lerp(this.zoneStartCenterZ, this.nextZoneCenterZ, progress);

        if (this.zoneTimer <= 0) {
          this.zoneShrinking = false;
          this.zoneRadius = this.nextZoneRadius;
          this.zoneCenterX = this.nextZoneCenterX;
          this.zoneCenterZ = this.nextZoneCenterZ;

          if (this.zonePhase < this.zoneStages.length) {
            this.zonePhase++;
            const nextStage = this.zoneStages[this.zonePhase - 1];
            this.nextZoneRadius = nextStage.targetRadius;
            this.pickNextZoneCenter();
            this.zoneTimer = Math.round(nextStage.holdSec * timeMult);
          } else {
            this.zoneFinalized = true;
            this.zoneTimer = 0;
          }
        }
      }
    }

    this.zoneWallMesh.position.x = this.zoneCenterX;
    this.zoneWallMesh.position.z = this.zoneCenterZ;
    this.zoneWallMesh.scale.set(this.zoneRadius, 1, this.zoneRadius);

    this.nextZoneRingMesh.visible = !this.zoneFinalized;
    this.nextZoneRingMesh.position.set(this.nextZoneCenterX, 4.2, this.nextZoneCenterZ);
    this.nextZoneRingMesh.scale.setScalar(this.nextZoneRadius);

    // Mid-match Airdrop Crate!
    if (!this.airdropSpawned && this.matchTime > 22) {
      this.airdropSpawned = true;
      const ax = this.nextZoneCenterX + (Math.random() - 0.5) * Math.min(18, this.nextZoneRadius * 0.6);
      const az = this.nextZoneCenterZ + (Math.random() - 0.5) * Math.min(18, this.nextZoneRadius * 0.6);
      this.airdropPos.set(ax, 55, az);
      this.airdropGroup = createAirdropMesh(this.textures);
      this.airdropGroup.position.copy(this.airdropPos);
      this.scene.add(this.airdropGroup);
    }
    if (this.airdropGroup) {
      const groundY = groundHeightAt(this.airdropPos.x, this.airdropPos.z, this.mapId);
      if (this.airdropPos.y > groundY) {
        this.airdropPos.y = Math.max(groundY, this.airdropPos.y - dt * 10);
        this.airdropGroup.position.y = this.airdropPos.y;
      }
    }

    // Blue zone damage tick every 1s (escalating per stage)
    this.zoneTickAccum += dt;
    if (this.zoneTickAccum >= 1.0) {
      this.zoneTickAccum = 0;
      const dps = this.getCurrentZoneDps();
      const distPlayer = Math.hypot(this.playerX - this.zoneCenterX, this.playerZ - this.zoneCenterZ);
      if (distPlayer > this.zoneRadius && (this.phase === 'playing' || this.phase === 'parachute')) {
        this.applyDamageToPlayer(
          dps,
          'Safe Zone',
          'Storm',
          true,
          false,
          undefined,
          this.zoneCenterX,
          this.zoneCenterZ,
          false
        );
      }
      for (let i = 0; i < this.bots.length; i++) {
        const b = this.bots[i];
        if (!b.alive || b.inPlane || b.parachuting) continue;
        const db = Math.hypot(b.x - this.zoneCenterX, b.z - this.zoneCenterZ);
        if (db > this.zoneRadius) {
          b.hp -= dps;
          if (b.hp <= 0) {
            this.eliminateBot(
              b,
              'Safe Zone',
              'Storm',
              false,
              false,
              this.zoneCenterX,
              this.zoneCenterZ,
              false
            );
          }
        }
      }
    }
  }

  private updateBots(dt: number) {
    const aliveBots = this.bots.filter((b) => b.alive);
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (!b.alive) continue;

      if (b.inPlane) {
        b.ejectDelay -= dt;
        if (b.ejectDelay <= 0 || this.planeProgress >= 0.92) {
          b.inPlane = false;
          b.parachuting = true;
          b.x = this.planeGroup.position.x + (Math.random() - 0.5) * 6;
          b.y = 65;
          b.z = this.planeGroup.position.z + (Math.random() - 0.5) * 6;
          b.rig.root.visible = true;
        } else {
          continue;
        }
      }

      const groundY = groundHeightAt(b.x, b.z, this.mapId);
      if (b.parachuting) {
        if (!b.parachuteOpen && b.y < groundY + 26) {
          b.parachuteOpen = true;
          b.rig.parachuteGroup.visible = true;
        }
        const fallSpeed = b.parachuteOpen ? 8.5 : 19;
        b.y -= fallSpeed * dt;
        const dx = b.patrolX - b.x;
        const dz = b.patrolZ - b.z;
        const len = Math.hypot(dx, dz) || 1;
        b.x += (dx / len) * 9 * dt;
        b.z += (dz / len) * 9 * dt;
        b.yaw = Math.atan2(dx, dz);

        if (b.y <= groundY) {
          b.y = groundY;
          b.parachuting = false;
          b.parachuteOpen = false;
          b.rig.parachuteGroup.visible = false;
        }
        b.rig.root.position.set(b.x, b.y, b.z);
        b.rig.root.rotation.y = b.yaw;
        continue;
      }

      // Ground Bot AI: find closest visible target (player or another bot)
      let targetX = this.zoneCenterX;
      let targetZ = this.zoneCenterZ;
      let targetIsPlayer = false;
      let targetBot: BotActor | null = null;
      let bestDist = 56;

      if (this.phase === 'playing') {
        const dp = Math.hypot(this.playerX - b.x, this.playerZ - b.z);
        if (dp < bestDist) {
          bestDist = dp;
          targetX = this.playerX;
          targetZ = this.playerZ;
          targetIsPlayer = true;
        }
      }

      for (let j = 0; j < aliveBots.length; j++) {
        const other = aliveBots[j];
        if (!other.alive || other === b || other.inPlane || other.parachuting) continue;
        const db = Math.hypot(other.x - b.x, other.z - b.z);
        if (db < bestDist) {
          bestDist = db;
          targetX = other.x;
          targetZ = other.z;
          targetIsPlayer = false;
          targetBot = other;
        }
      }

      const distFromZone = Math.hypot(b.x - this.zoneCenterX, b.z - this.zoneCenterZ);
      let moveX = 0;
      let moveZ = 0;

      if (distFromZone > this.zoneRadius * 0.88) {
        // Sprint toward Safe Zone
        const zx = this.zoneCenterX - b.x;
        const zz = this.zoneCenterZ - b.z;
        const zl = Math.hypot(zx, zz) || 1;
        moveX = zx / zl;
        moveZ = zz / zl;
        b.yaw = Math.atan2(moveX, moveZ);
      } else if (targetIsPlayer || targetBot) {
        // Combat strafe & fire!
        const ex = targetX - b.x;
        const ez = targetZ - b.z;
        const el = Math.hypot(ex, ez) || 1;
        b.yaw = Math.atan2(ex, ez);

        b.strafeTimer -= dt;
        if (b.strafeTimer <= 0) {
          b.strafeDir *= -1;
          b.strafeTimer = 1.2 + Math.random() * 1.4;
        }
        const perpX = -ez / el;
        const perpZ = ex / el;
        const approach = el > 24 ? 0.55 : el < 10 ? -0.45 : 0;
        moveX = (ex / el) * approach + perpX * b.strafeDir * 0.75;
        moveZ = (ez / el) * approach + perpZ * b.strafeDir * 0.75;

        b.fireCooldown -= dt;
        if (b.fireCooldown <= 0 && el < 54) {
          const wDef = WEAPONS[b.weaponId];
          b.fireCooldown = Math.max(0.28, (1 / wDef.fireRate) * 2.1 + Math.random() * 0.35);
          b.lastShotPing = this.matchTime;

          // Check gloo wall occlusion between bot and target
          let blockedByGloo = false;
          _vec3A.set(b.x, b.y + 1.35, b.z);
          _vec3B.set(targetX, groundHeightAt(targetX, targetZ, this.mapId) + 1.2, targetZ);
          _dir.subVectors(_vec3B, _vec3A).normalize();
          _raycaster.set(_vec3A, _dir);
          _raycaster.far = el;

          const glooHits: THREE.Object3D[] = [];
          for (let g = 0; g < this.glooList.length; g++) {
            if (this.glooList[g].hp > 0) glooHits.push(this.glooList[g].hitMesh);
          }
          if (glooHits.length > 0) {
            const gHit = _raycaster.intersectObjects(glooHits, false);
            if (gHit.length > 0) {
              blockedByGloo = true;
              const glooObj = this.glooList.find((g) => g.hitMesh === gHit[0].object);
              if (glooObj) {
                glooObj.hp -= wDef.damage * 0.6;
                this.spawnSparks(gHit[0].point, 0x38bdf8, 3);
                if (glooObj.hp <= 0) this.destroyGlooWall(glooObj);
              }
              this.spawnTracer(_vec3A, gHit[0].point, 0xfca5a5);
            }
          }

          if (!blockedByGloo) {
            this.spawnTracer(_vec3A, _vec3B, 0xfca5a5);
            const distToPlayer = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
            if (distToPlayer < 65) {
              soundEngine.playShot(b.weaponId, Math.max(0.15, 1 - distToPlayer / 65) * 0.55);
            }
            // Accuracy check
            const hitChance = el < 16 ? 0.52 : el < 32 ? 0.34 : 0.18;
            if (Math.random() < hitChance) {
              if (targetIsPlayer) {
                this.applyDamageToPlayer(
                  wDef.damage * 0.45,
                  b.name,
                  wDef.name,
                  false,
                  false,
                  undefined,
                  b.x,
                  b.z,
                  false,
                  b.id
                );
              } else if (targetBot) {
                targetBot.hp -= wDef.damage * 0.65;
                if (targetBot.hp <= 0) {
                  this.eliminateBot(
                    targetBot,
                    b.name,
                    wDef.name,
                    Math.random() < 0.25,
                    false,
                    b.x,
                    b.z,
                    false
                  );
                }
              }
            }
          }
        }
      } else {
        // Patrol
        b.patrolTimer -= dt;
        if (b.patrolTimer <= 0 || Math.hypot(b.patrolX - b.x, b.patrolZ - b.z) < 3) {
          b.patrolX = this.zoneCenterX + (Math.random() - 0.5) * Math.min(120, this.zoneRadius * 1.4);
          b.patrolZ = this.zoneCenterZ + (Math.random() - 0.5) * Math.min(120, this.zoneRadius * 1.4);
          b.patrolTimer = 4 + Math.random() * 5;
        }
        const px = b.patrolX - b.x;
        const pz = b.patrolZ - b.z;
        const pl = Math.hypot(px, pz) || 1;
        moveX = px / pl;
        moveZ = pz / pl;
        b.yaw = Math.atan2(moveX, moveZ);
      }

      const speed = 5.4;
      const [nx, nz] = this.resolveCollisions(b.x + moveX * speed * dt, b.z + moveZ * speed * dt, b.y);
      b.x = nx;
      b.z = nz;
      b.y = groundHeightAt(b.x, b.z, this.mapId);

      b.rig.root.position.set(b.x, b.y, b.z);
      b.rig.root.rotation.y = b.yaw;

      // Leg stride animation
      const moving = Math.hypot(moveX, moveZ) > 0.1;
      if (moving) {
        const stride = Math.sin(this.matchTime * 11 + b.id) * 0.55;
        b.rig.leftLeg.rotation.x = stride;
        b.rig.rightLeg.rotation.x = -stride;
        b.rig.rightArm.rotation.set(-1.1, 0, 0);
        b.rig.leftArm.rotation.set(-0.9, 0.35, 0);
      } else {
        b.rig.leftLeg.rotation.x = 0;
        b.rig.rightLeg.rotation.x = 0;
      }
    }
  }

  private updateEffects(dt: number) {
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) this.muzzleLight.intensity = 0;
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      (t.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, t.life / t.maxLife);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vy -= 14 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.scale.setScalar(Math.max(0.01, s.life * 3));
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      }
    }

    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const d = this.damagePopups[i];
      d.life -= dt;
      d.worldPos.y += dt * 1.3;
      d.alpha = Math.min(1, d.life * 2);
      if (d.life <= 0) {
        this.damagePopups.splice(i, 1);
      }
    }

    // Rotate loot glow gently
    for (let i = 0; i < this.lootItems.length; i++) {
      const item = this.lootItems[i];
      if (!item.collected) {
        item.mesh.rotation.y += dt * 1.4;
      }
    }

    this.updateRagdolls(dt);
    this.updateDeathCrates(dt);
  }

  private updateRagdolls(dt: number) {
    for (let i = this.ragdolls.length - 1; i >= 0; i--) {
      const r = this.ragdolls[i];
      r.age += dt;
      if (r.age >= r.maxAge) {
        r.rig.root.visible = false;
        this.ragdolls.splice(i, 1);
        continue;
      }

      const prevX = r.x;
      const prevZ = r.z;
      r.vy -= 21 * dt;

      const [nx, nz] = this.resolveCollisions(r.x + r.vx * dt, r.z + r.vz * dt, r.y, 0.42);
      if (Math.abs(nx - (r.x + r.vx * dt)) > 0.01) r.vx *= -0.35;
      if (Math.abs(nz - (r.z + r.vz * dt)) > 0.01) r.vz *= -0.35;
      r.x = nx;
      r.z = nz;
      if (Math.hypot(r.x - prevX, r.z - prevZ) < 0.001 && r.settled) {
        r.vx = 0;
        r.vz = 0;
      }

      r.y += r.vy * dt;
      const groundY = groundHeightAt(r.x, r.z, this.mapId);

      if (r.y > groundY + 0.02) {
        r.pitch += r.pitchVel * dt;
        r.roll += r.rollVel * dt;
        r.yaw += r.yawVel * dt;
        r.pitchVel *= Math.exp(-1.5 * dt);
        r.rollVel *= Math.exp(-1.5 * dt);
      } else {
        if (r.vy < -3.4) {
          r.y = groundY + 0.02;
          r.vy = -r.vy * 0.24;
          r.vx *= 0.62;
          r.vz *= 0.62;
          this.spawnSparks(_vec3A.set(r.x, groundY + 0.08, r.z), 0x94a3b8, 3);
        } else {
          r.y = groundY;
          r.vy = 0;
          const groundFriction = Math.exp(-9.5 * dt);
          r.vx *= groundFriction;
          r.vz *= groundFriction;
          r.yawVel *= Math.exp(-8.0 * dt);
          r.yaw += r.yawVel * dt;
          r.pitch = THREE.MathUtils.damp(r.pitch, r.targetPitch, 11, dt);
          r.roll = THREE.MathUtils.damp(r.roll, r.targetRoll, 9, dt);
          if (Math.hypot(r.vx, r.vz) < 0.3 && Math.abs(r.pitch - r.targetPitch) < 0.08) {
            r.settled = true;
          }
        }
      }

      const sinkOffset =
        !r.isLocalPlayer && r.age > r.maxAge - 0.9
          ? ((r.age - (r.maxAge - 0.9)) / 0.9) * 0.35
          : 0;

      r.rig.root.position.set(r.x, r.y - sinkOffset, r.z);
      r.rig.root.rotation.y = r.yaw;

      const sinP = Math.sin(r.pitch);
      r.rig.bodyPivot.position.set(0, Math.abs(sinP) * 0.20, -sinP * 0.36);
      r.rig.bodyPivot.rotation.set(r.pitch, 0, r.roll);
      r.rig.torso.position.y = 0.90;

      r.rig.head.rotation.x = THREE.MathUtils.damp(r.rig.head.rotation.x, r.headPitch, 10, dt);
      r.rig.head.rotation.z = THREE.MathUtils.damp(r.rig.head.rotation.z, r.headRoll, 10, dt);
      r.rig.leftArm.rotation.x = THREE.MathUtils.damp(r.rig.leftArm.rotation.x, r.leftArmX, 9, dt);
      r.rig.leftArm.rotation.z = THREE.MathUtils.damp(r.rig.leftArm.rotation.z, r.leftArmZ, 9, dt);
      r.rig.rightArm.rotation.x = THREE.MathUtils.damp(r.rig.rightArm.rotation.x, r.rightArmX, 9, dt);
      r.rig.rightArm.rotation.z = THREE.MathUtils.damp(r.rig.rightArm.rotation.z, r.rightArmZ, 9, dt);
      r.rig.leftLeg.rotation.x = THREE.MathUtils.damp(r.rig.leftLeg.rotation.x, r.leftLegX, 9, dt);
      r.rig.leftLeg.rotation.z = THREE.MathUtils.damp(r.rig.leftLeg.rotation.z, r.leftLegZ, 9, dt);
      r.rig.rightLeg.rotation.x = THREE.MathUtils.damp(r.rig.rightLeg.rotation.x, r.rightLegX, 9, dt);
      r.rig.rightLeg.rotation.z = THREE.MathUtils.damp(r.rig.rightLeg.rotation.z, r.rightLegZ, 9, dt);
    }
  }

  private updateDeathCrates(dt: number) {
    for (let i = this.deathCrates.length - 1; i >= 0; i--) {
      const dc = this.deathCrates[i];
      if (!dc.collected) {
        dc.rig.holoRing.rotation.z += dt * 1.15;
        const bMat = dc.rig.beacon.material as THREE.MeshBasicMaterial;
        bMat.opacity = (dc.tier === 'high' ? 0.28 : 0.2) + Math.sin(this.matchTime * 3.5 + dc.id) * 0.08;
      } else {
        dc.rig.lidPivot.rotation.x = THREE.MathUtils.damp(dc.rig.lidPivot.rotation.x, -0.95, 12, dt);
        dc.openedAge += dt;
        if (dc.openedAge >= 2.8) {
          dc.removed = true;
          this.scene.remove(dc.rig.group);
          this.deathCrates.splice(i, 1);
        }
      }
    }
  }

  private updateDeathCamera(dt: number) {
    this.deathCamAngle += dt * 0.38;
    const focus = this.ragdolls.find((r) => r.isLocalPlayer);
    const fx = focus ? focus.x : this.playerX;
    const fy = focus ? focus.y : this.playerY;
    const fz = focus ? focus.z : this.playerZ;
    const dist = 5.4;
    const desiredX = fx + Math.sin(this.deathCamAngle) * dist;
    const desiredZ = fz + Math.cos(this.deathCamAngle) * dist;
    const desiredY = Math.max(groundHeightAt(desiredX, desiredZ, this.mapId) + 0.8, fy + 2.6);
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 6, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, 6, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 6, dt);
    _vec3C.set(fx, fy + 0.45, fz);
    this.camera.lookAt(_vec3C);
  }

  private updateSpectateCamera(dt: number) {
    if (Math.abs(this.camera.fov - 65) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 65, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    let targetAlive = false;
    if (this.spectateMode === 'bot') {
      const b = this.bots.find((bot) => bot.id === this.spectateBotId);
      if (b && b.alive && !b.inPlane) {
        targetAlive = true;
        this.spectateLastX = b.x;
        this.spectateLastY = b.y;
        this.spectateLastZ = b.z;
        this.spectateLastYaw = b.yaw;
      }
    } else if (this.spectateMode === 'human') {
      const rh = this.remoteHumans.get(this.spectateHumanId);
      if (rh && rh.alive && !rh.inPlane) {
        targetAlive = true;
        this.spectateLastX = rh.x;
        this.spectateLastY = rh.y;
        this.spectateLastZ = rh.z;
        this.spectateLastYaw = rh.yaw;
      }
    }

    if (!targetAlive) {
      this.spectateOrbitOffset += dt * 0.45;
    }

    const camYaw = this.spectateLastYaw + this.spectateOrbitOffset;
    const dist = 4.6;
    const desiredX = this.spectateLastX - Math.sin(camYaw) * dist;
    const desiredZ = this.spectateLastZ - Math.cos(camYaw) * dist;
    const desiredY = Math.max(
      groundHeightAt(desiredX, desiredZ, this.mapId) + 0.75,
      this.spectateLastY + 2.05
    );

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 9, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, 9, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 9, dt);
    _vec3C.set(this.spectateLastX, this.spectateLastY + 1.35, this.spectateLastZ);
    this.camera.lookAt(_vec3C);
  }

  private tick = () => {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    if (
      this.phase !== 'paused' &&
      this.phase !== 'gameover' &&
      this.phase !== 'victory' &&
      this.phase !== 'spectating'
    ) {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.matchTime += dt;
        this.stepSimulation(dt);
      }
    } else if (this.phase === 'spectating') {
      this.matchTime += dt;
      this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.6);
      this.hitmarkerTimer = 0;
      this.hitmarkerType = 'none';
      this.playerRig.skillAuraGroup.visible = false;
      this.updateCoastingVehicles(dt);
      this.updateZone(dt);
      this.updateBots(dt);
      this.updateRemoteHumans(dt);
      this.updateEffects(dt);
      this.updateSpectateCamera(dt);

      this.spectateTimer = Math.max(0, this.spectateTimer - dt);
      this.hudSyncTimer += dt;
      if (this.spectateTimer <= 0) {
        this.finishMatch(false);
      } else if (this.hudSyncTimer >= 0.065) {
        this.hudSyncTimer = 0;
        this.pushHudState(this.lockedElimRank ?? undefined);
      }
    } else if (this.phase === 'gameover') {
      this.matchTime += dt;
      this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
      this.updateEffects(dt);
      this.updateDeathCamera(dt);
    }

    this.renderer.render(this.scene, this.camera);
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private stepSimulation(dt: number) {
    // Animate Cargo Plane
    if (this.planeProgress < 1.15) {
      this.planeProgress += dt * 0.048;
      this.planeGroup.position.lerpVectors(this.planeStart, this.planeEnd, Math.min(1.15, this.planeProgress));
      this.planeProps.forEach((p) => (p.rotation.z += dt * 26));
      if (this.phase === 'plane' && this.planeProgress >= 0.96) {
        this.ejectFromPlane(false);
      }
    }

    // Decay UI flashes & recoil & Free-Look Eye spring-back
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.4);
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 12, dt);
    if (!this.freeLookActive) {
      this.freeLookYaw = THREE.MathUtils.damp(this.freeLookYaw, 0, 14, dt);
      this.freeLookPitch = THREE.MathUtils.damp(this.freeLookPitch, 0, 14, dt);
    }
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dt;
      if (this.hitmarkerTimer <= 0) this.hitmarkerType = 'none';
    }

    // Skill cooldown, aura visuals & Alok/Kapella/K healing
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.skillActiveTimer > 0) {
      this.skillActiveTimer = Math.max(0, this.skillActiveTimer - dt);
      if (
        (this.profile.selectedSkinId === 'alok' || this.profile.selectedSkinId === 'kapella') &&
        this.hp < this.maxHp
      ) {
        this.hp = Math.min(this.maxHp, this.hp + (this.profile.selectedSkinId === 'alok' ? 7 : 5) * dt);
      }
    }
    this.playerRig.skillAuraGroup.visible = this.skillActiveTimer > 0 && this.phase === 'playing';
    if (this.playerRig.skillAuraGroup.visible) {
      this.playerRig.skillAuraGroup.rotation.y += dt * 1.8;
    }

    // EP passive conversion to HP (classic Free Fire mechanic; 3x faster during K's Master of All)
    if (this.ep > 0 && this.hp < this.maxHp) {
      const epRate = this.skillActiveTimer > 0 && this.profile.selectedSkinId === 'k' ? 9 : 3;
      const conv = Math.min(this.ep, epRate * dt);
      this.ep -= conv;
      this.hp = Math.min(this.maxHp, this.hp + conv);
    }

    if (this.phase === 'plane') {
      // Orbit camera behind plane
      _vec3A.copy(this.planeGroup.position);
      _vec3B.subVectors(this.planeEnd, this.planeStart).normalize();
      this.camera.position.copy(_vec3A).addScaledVector(_vec3B, -24).add(new THREE.Vector3(0, 9, 0));
      this.camera.lookAt(_vec3A);
    } else if (this.phase === 'parachute') {
      const groundY = groundHeightAt(this.playerX, this.playerZ, this.mapId);
      if (!this.parachuteOpen && this.playerY <= groundY + 24) {
        this.deployParachute();
      }
      const fwd = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0) - this.touchMoveY;
      const str = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0) + this.touchMoveX;
      const moveAngle = this.playerYaw;
      const airSpeed = this.parachuteOpen ? 16 : 10;
      const sinkSpeed = this.parachuteOpen ? 8.5 : 22;

      const dirX = Math.sin(moveAngle) * fwd - Math.cos(moveAngle) * str;
      const dirZ = Math.cos(moveAngle) * fwd + Math.sin(moveAngle) * str;
      this.playerX = THREE.MathUtils.clamp(this.playerX + dirX * airSpeed * dt, -PLAYABLE_LIMIT, PLAYABLE_LIMIT);
      this.playerZ = THREE.MathUtils.clamp(this.playerZ + dirZ * airSpeed * dt, -PLAYABLE_LIMIT, PLAYABLE_LIMIT);
      this.playerY -= sinkSpeed * dt;

      if (this.playerY <= groundY) {
        this.playerY = groundY;
        this.parachuteOpen = false;
        this.playerRig.parachuteGroup.visible = false;
        this.phase = 'playing';
        this.grounded = true;
      }

      this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.playerRig.root.rotation.y = this.playerYaw;
      this.updateThirdPersonCamera(dt, 6.2, 2.5);
    } else if (this.phase === 'playing') {
      if (this.activeVehicle) {
        this.stepPlayerVehicle(dt);
      } else {
        this.stepPlayerGround(dt);
      }
    }

    this.updateCoastingVehicles(dt);
    this.updateZone(dt);
    this.updateBots(dt);
    this.updateRemoteHumans(dt);
    this.updateEffects(dt);

    // 20Hz Live Multiplayer State Sync
    if (this.mpSession) {
      this.netSyncAccum += dt;
      if (this.netSyncAccum >= 0.05) {
        this.netSyncAccum = 0;
        const moving =
          this.sprintLocked ||
          Math.abs((this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0) - this.touchMoveY) > 0.05 ||
          Math.abs((this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0) + this.touchMoveX) > 0.05;
        const activeWeaponId = this.slots[this.activeSlot]?.weaponId || 'deagle';
        this.sendMp({
          type: 'player:state',
          x: this.playerX,
          y: this.playerY,
          z: this.playerZ,
          yaw: this.playerYaw,
          hp: this.hp,
          alive: this.hp > 0,
          crouching: this.stance === 'crouch',
          prone: this.stance === 'prone',
          parachuteOpen: this.parachuteOpen,
          inPlane: this.phase === 'plane',
          moving,
          weaponId: activeWeaponId,
          weaponSkinId: this.profile.equippedWeaponSkins?.[activeWeaponId],
        });
      }
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.065) {
      this.hudSyncTimer = 0;
      this.pushHudState();
    }
  }

  private updateRemoteHumans(dt: number) {
    this.remoteHumans.forEach((rh) => {
      if (!rh.alive) return;
      if (rh.inPlane) {
        rh.rig.root.visible = false;
        return;
      }
      rh.rig.root.visible = true;
      rh.x = THREE.MathUtils.damp(rh.x, rh.targetX, 16, dt);
      rh.y = THREE.MathUtils.damp(rh.y, rh.targetY, 16, dt);
      rh.z = THREE.MathUtils.damp(rh.z, rh.targetZ, 16, dt);
      rh.yaw = THREE.MathUtils.damp(rh.yaw, rh.targetYaw, 16, dt);
      rh.rig.root.position.set(rh.x, rh.y, rh.z);
      rh.rig.root.rotation.y = rh.yaw;
      rh.rig.bodyPivot.rotation.x = THREE.MathUtils.damp(
        rh.rig.bodyPivot.rotation.x,
        rh.prone ? Math.PI / 2 - 0.08 : 0,
        14,
        dt
      );
      rh.rig.bodyPivot.position.y = THREE.MathUtils.damp(
        rh.rig.bodyPivot.position.y,
        rh.prone ? 0.22 : 0,
        14,
        dt
      );
      rh.rig.torso.position.y = rh.crouching ? 0.70 : 0.90;
      rh.rig.head.rotation.x = THREE.MathUtils.damp(rh.rig.head.rotation.x, rh.prone ? -0.95 : 0, 14, dt);
      if (rh.moving || rh.parachuteOpen || rh.prone) {
        if (rh.emoteId) {
          rh.emoteId = null;
          resetEmoteRigBase(rh.rig);
        }
      }
      if (rh.emoteId) {
        rh.emoteTimer = (rh.emoteTimer || 0) + dt;
        const dur = rh.emoteDuration || 2.4;
        if (rh.emoteTimer >= dur) {
          rh.emoteId = null;
          resetEmoteRigBase(rh.rig);
        } else {
          applyEmotePose(rh.rig, rh.emoteId, rh.emoteTimer, dur);
          return;
        }
      }
      if (rh.moving && !rh.parachuteOpen) {
        const stride = Math.sin(this.matchTime * 11) * (rh.prone ? 0.22 : 0.55);
        rh.rig.leftLeg.rotation.x = stride;
        rh.rig.rightLeg.rotation.x = -stride;
      } else {
        rh.rig.leftLeg.rotation.x = 0;
        rh.rig.rightLeg.rotation.x = 0;
      }
      rh.rig.rightArm.rotation.set(rh.prone ? -0.45 : -1.1, -0.05, 0);
      rh.rig.leftArm.rotation.set(rh.prone ? -0.45 : -0.9, 0.35, 0);
    });
  }

  private stepReloadAndHeal(dt: number, activeSlotObj: WeaponSlotState | null, weaponDef: (typeof WEAPONS)[WeaponId]) {
    if (this.isReloading && activeSlotObj) {
      this.reloadTimer += dt;
      if (this.reloadTimer >= weaponDef.reloadTime) {
        const needed = weaponDef.magSize - activeSlotObj.mag;
        const take = Math.min(needed, activeSlotObj.reserve);
        activeSlotObj.mag += take;
        activeSlotObj.reserve -= take;
        this.isReloading = false;
        this.reloadTimer = 0;
      }
    }

    if (this.isHealing) {
      this.healTimer += dt;
      if (this.healTimer >= 2.2) {
        this.hp = Math.min(this.maxHp, this.hp + 75);
        this.medkits = Math.max(0, this.medkits - 1);
        this.isHealing = false;
        this.healTimer = 0;
        soundEngine.playPickup();
      }
    }
  }

  private destroyVehicle(v: VehicleEntity) {
    if (v.destroyed) return;
    v.destroyed = true;
    v.hp = 0;
    v.speed = 0;
    v.rig.bodyPaintMat.color.setHex(0x1f2937);
    v.rig.bodyPaintMat.roughness = 0.9;
    v.rig.bodyPaintMat.metalness = 0.25;
    this.spawnSparks(_vec3A.set(v.x, v.y + 1.0, v.z), 0xf97316, 14);
    soundEngine.playVehicleCrash();
    if (this.activeVehicle === v) {
      this.exitVehicle();
      this.applyDamageToPlayer(25, v.name, 'Explosion', false, false, undefined, v.x, v.z, true);
    }
  }

  private syncVehiclePhysicsAndVisuals(v: VehicleEntity, dt: number, leanSteerInput = 0) {
    const prevX = v.x;
    const prevZ = v.z;
    const colRadius = v.type === 'motorbike' ? 0.95 : 1.55;
    const [nx, nz] = this.resolveCollisions(
      v.x + Math.sin(v.yaw) * v.speed * dt,
      v.z + Math.cos(v.yaw) * v.speed * dt,
      v.y,
      colRadius
    );
    const moved = Math.hypot(nx - prevX, nz - prevZ);
    const expected = Math.abs(v.speed) * dt;
    if (expected > 0.05 && moved < expected * 0.45 && Math.abs(v.speed) > 9) {
      v.speed *= -0.22;
      this.cameraShake = Math.min(0.25, this.cameraShake + 0.12);
      soundEngine.playVehicleCrash();
      this.spawnSparks(_vec3A.set(nx, v.y + 0.65, nz), 0xfbbf24, 6);
    }
    v.x = nx;
    v.z = nz;
    v.y = groundHeightAt(v.x, v.z, this.mapId);

    // Roadkill & ramming damage against bots
    if (Math.abs(v.speed) > 7.5 && this.activeVehicle === v) {
      const hitRadius = v.type === 'motorbike' ? 1.5 : 2.15;
      for (let i = 0; i < this.bots.length; i++) {
        const b = this.bots[i];
        if (!b.alive || b.inPlane || b.parachuting) continue;
        const d = Math.hypot(b.x - v.x, b.z - v.z);
        if (d < hitRadius) {
          const readyAt = this.ramCooldownMap.get(b.id) ?? 0;
          if (this.matchTime >= readyAt) {
            this.ramCooldownMap.set(b.id, this.matchTime + 0.45);
            const ramDmg = Math.round(Math.abs(v.speed) * 6.5);
            b.hp -= ramDmg;
            b.hitFlash = 0.2;
            this.damageDealt += ramDmg;
            const knockX = b.x + Math.sin(v.yaw) * 2.2;
            const knockZ = b.z + Math.cos(v.yaw) * 2.2;
            const [bx, bz] = this.resolveCollisions(knockX, knockZ, b.y);
            b.x = bx;
            b.z = bz;
            b.y = groundHeightAt(bx, bz, this.mapId);
            this.addDamagePopup(_vec3A.set(b.x, b.y + 1.5, b.z), ramDmg, false, false);
            this.spawnSparks(_vec3A.set(b.x, b.y + 0.9, b.z), 0xef4444, 7);
            soundEngine.playVehicleCrash();
            if (b.hp <= 0) {
              this.eliminateBot(b, this.profile.name, v.name, false, true, v.x, v.z, true);
            }
          }
        }
      }
    }

    // Terrain-conforming pitch/roll + bike lean + wheel rotation + steering
    const sinV = Math.sin(v.yaw);
    const cosV = Math.cos(v.yaw);
    const hFront = groundHeightAt(v.x + sinV * 1.35, v.z + cosV * 1.35, this.mapId);
    const hBack = groundHeightAt(v.x - sinV * 1.35, v.z - cosV * 1.35, this.mapId);
    const hRight = groundHeightAt(v.x - cosV * 0.9, v.z + sinV * 0.9, this.mapId);
    const hLeft = groundHeightAt(v.x + cosV * 0.9, v.z - sinV * 0.9, this.mapId);

    const targetPitch = Math.atan2(hBack - hFront, 2.7) * 0.75;
    const terrainRoll = Math.atan2(hRight - hLeft, 1.8) * 0.7;
    const bikeLean = v.type === 'motorbike' ? -leanSteerInput * THREE.MathUtils.clamp(Math.abs(v.speed) / 14, 0, 1) * 0.36 : 0;

    v.rig.root.position.set(v.x, v.y, v.z);
    v.rig.root.rotation.y = v.yaw;
    v.rig.chassisGroup.rotation.x = THREE.MathUtils.damp(v.rig.chassisGroup.rotation.x, targetPitch, 10, dt);
    v.rig.chassisGroup.rotation.z = THREE.MathUtils.damp(v.rig.chassisGroup.rotation.z, terrainRoll + bikeLean, 10, dt);

    const spinAngle = (v.speed * dt) / v.rig.wheelRadius;
    for (let i = 0; i < v.rig.wheels.length; i++) {
      v.rig.wheels[i].rotation.x += spinAngle;
    }
    for (let i = 0; i < v.rig.frontSteerPivots.length; i++) {
      v.rig.frontSteerPivots[i].rotation.y = v.steerAngle;
    }
  }

  private updateCoastingVehicles(dt: number) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.destroyed || v === this.activeVehicle) continue;
      if (Math.abs(v.speed) > 0.08) {
        v.speed = THREE.MathUtils.damp(v.speed, 0, 2.6, dt);
        v.steerAngle = THREE.MathUtils.damp(v.steerAngle, 0, 8, dt);
        this.syncVehiclePhysicsAndVisuals(v, dt, 0);
      }
    }
  }

  private stepPlayerVehicle(dt: number) {
    const v = this.activeVehicle;
    if (!v || v.destroyed) {
      this.activeVehicle = null;
      return;
    }

    if (this.vehicleHornCooldown > 0) this.vehicleHornCooldown = Math.max(0, this.vehicleHornCooldown - dt);

    const activeSlotObj = this.slots[this.activeSlot];
    const weaponDef = activeSlotObj ? WEAPONS[activeSlotObj.weaponId] : WEAPONS.deagle;

    let steerInput = 0;
    if (this.activeSeat === 'driver') {
      const throttle = THREE.MathUtils.clamp(
        (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0) + this.touchThrottle,
        -1,
        1
      );
      steerInput = THREE.MathUtils.clamp(
        (this.keys['KeyA'] ? 1 : 0) - (this.keys['KeyD'] ? 1 : 0) - this.touchSteer,
        -1,
        1
      );
      const handbrake = Boolean(this.keys['Space']);
      const nitro =
        Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchNitro) &&
        throttle > 0.1 &&
        v.boostFuel > 2 &&
        !handbrake;

      if (nitro) {
        v.boostFuel = Math.max(0, v.boostFuel - 28 * dt);
      } else {
        v.boostFuel = Math.min(100, v.boostFuel + 9 * dt);
      }

      const targetMax = nitro ? v.boostSpeed : v.maxSpeed;
      if (handbrake) {
        v.speed = THREE.MathUtils.damp(v.speed, 0, 9.5, dt);
      } else if (throttle > 0.05) {
        v.speed = Math.min(targetMax, v.speed + v.accel * (nitro ? 1.55 : 1) * throttle * dt);
      } else if (throttle < -0.05) {
        v.speed = Math.max(-v.maxSpeed * 0.45, v.speed + v.accel * 1.35 * throttle * dt);
      } else {
        v.speed = THREE.MathUtils.damp(v.speed, 0, 2.4, dt);
      }

      v.steerAngle = THREE.MathUtils.damp(v.steerAngle, steerInput * 0.48, 11, dt);
      const speedFactor = THREE.MathUtils.clamp(Math.abs(v.speed) / 5.5, 0, 1);
      const dirSign = v.speed >= -0.2 ? 1 : -1;
      const yawDelta = steerInput * v.turnRate * speedFactor * dirSign * dt;
      v.yaw += yawDelta;
      if (!this.isDragLooking) {
        this.playerYaw += yawDelta * 0.72;
      }
    } else {
      // Passenger seat: vehicle coasts while passenger has full 360 drive-by combat
      v.speed = THREE.MathUtils.damp(v.speed, 0, 1.8, dt);
      v.steerAngle = THREE.MathUtils.damp(v.steerAngle, 0, 8, dt);

      this.stepReloadAndHeal(dt, activeSlotObj, weaponDef);
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (this.mouseFireDown && this.fireCooldown <= 0) {
        this.firePlayerWeapon();
        if (!weaponDef.auto) {
          this.mouseFireDown = false;
        }
      }
    }

    this.syncVehiclePhysicsAndVisuals(v, dt, steerInput);

    // Seat player rig into Driver or Passenger position
    const sinV = Math.sin(v.yaw);
    const cosV = Math.cos(v.yaw);
    const seatOff = this.activeSeat === 'driver' ? v.rig.driverSeatOffset : v.rig.passengerSeatOffset;
    this.playerX = v.x + seatOff.x * cosV + seatOff.z * sinV;
    this.playerY = v.y + seatOff.y;
    this.playerZ = v.z - seatOff.x * sinV + seatOff.z * cosV;

    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.torso.position.y = 0.84;
    this.playerRig.leftLeg.rotation.x = -1.1;
    this.playerRig.rightLeg.rotation.x = -1.1;

    if (this.activeSeat === 'driver') {
      this.playerRig.root.rotation.y = v.yaw;
      this.playerRig.rightArm.rotation.set(-1.12, 0.14, 0);
      this.playerRig.leftArm.rotation.set(-1.12, -0.14, 0);
    } else {
      this.playerRig.root.rotation.y = this.playerYaw;
      this.playerRig.rightArm.rotation.set(-1.15 - this.playerPitch * 0.5, -0.05, 0);
      this.playerRig.leftArm.rotation.set(-0.95 - this.playerPitch * 0.4, 0.38, 0);
    }

    // Dynamic Vehicle FOV & Chase Camera
    const targetFov =
      this.activeSeat === 'passenger' && this.isAds
        ? weaponDef.adsFov
        : 65 + Math.min(14, Math.abs(v.speed) * 0.38);
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
      this.camera.updateProjectionMatrix();
    }

    const camDist =
      this.activeSeat === 'passenger' && this.isAds
        ? weaponDef.id === 'awm'
          ? 0.5
          : 2.9
        : this.activeSeat === 'driver'
        ? v.type === 'motorbike'
          ? 5.2
          : 6.6
        : 5.4;
    const camHeight = this.activeSeat === 'driver' ? 1.85 : 1.55;
    this.updateThirdPersonCamera(dt, camDist, camHeight, this.activeSeat === 'driver' ? 0 : undefined);
  }

  private stepPlayerGround(dt: number) {
    const activeSlotObj = this.slots[this.activeSlot];
    const weaponDef = activeSlotObj ? WEAPONS[activeSlotObj.weaponId] : WEAPONS.deagle;

    this.stepReloadAndHeal(dt, activeSlotObj, weaponDef);

    // Movement input (Analog Joystick + Auto-Sprint Lock + WASD)
    let fwd = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0) - this.touchMoveY;
    const str = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0) + this.touchMoveX;
    if (this.keys['KeyS'] || this.touchMoveY > 0.35) {
      this.sprintLocked = false;
    }
    if (this.sprintLocked && Math.abs(this.touchMoveY) < 0.15 && !this.keys['KeyS']) {
      fwd = 1;
    }
    const isMoving = Math.abs(fwd) > 0.05 || Math.abs(str) > 0.05;
    const sprinting =
      (Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) || this.sprintLocked) &&
      fwd > 0.25 &&
      !this.isAds &&
      this.stance === 'stand' &&
      !this.isHealing;

    let moveSpeed = 6.4 * weaponDef.moveSpeedMult;
    if (sprinting) moveSpeed *= 1.38;
    if (this.stance === 'crouch') moveSpeed *= 0.6;
    else if (this.stance === 'prone') moveSpeed *= 0.38;
    if (this.isAds) moveSpeed *= 0.72;
    if (this.isHealing) moveSpeed *= 0.45;
    if (this.skillActiveTimer > 0) {
      const sid = this.profile.selectedSkinId;
      if (sid === 'tatsuya') moveSpeed *= 1.3;
      else if (sid === 'kelly' || sid === 'joseph') moveSpeed *= 1.25;
      else if (sid === 'wukong') moveSpeed *= 1.24;
      else if (sid === 'criminal_red' || sid === 'caroline') moveSpeed *= 1.22;
      else if (sid === 'hiphop') moveSpeed *= 1.2;
      else if (sid === 'chrono') moveSpeed *= 1.18;
      else if (sid === 'alok' || sid === 'maxim' || sid === 'kla' || sid === 'rafael') moveSpeed *= 1.15;
      else if (sid === 'a124') moveSpeed *= 1.12;
    }

    const inputLen = Math.max(1, Math.hypot(fwd, str));
    const nf = fwd / inputLen;
    const ns = str / inputLen;
    const analogGain = isMoving ? Math.min(1, Math.hypot(fwd, str)) : 0;

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    const vx = (sinY * nf - cosY * ns) * moveSpeed * analogGain;
    const vz = (cosY * nf + sinY * ns) * moveSpeed * analogGain;

    const [nx, nz] = this.resolveCollisions(this.playerX + vx * dt, this.playerZ + vz * dt, this.playerY);
    this.playerX = nx;
    this.playerZ = nz;

    // Jump & Gravity
    const groundY = groundHeightAt(this.playerX, this.playerZ, this.mapId);
    if (this.keys['Space'] && this.grounded) {
      this.playerVy = 7.4;
      this.grounded = false;
      this.stance = 'stand';
    }
    this.playerVy -= 20 * dt;
    this.playerY += this.playerVy * dt;
    if (this.playerY <= groundY) {
      this.playerY = groundY;
      this.playerVy = 0;
      this.grounded = true;
    }

    // Auto-loot walk-over for consumables, armor & empty weapon slots!
    for (let i = 0; i < this.lootItems.length; i++) {
      const item = this.lootItems[i];
      if (item.collected) continue;
      const d = Math.hypot(item.x - this.playerX, item.z - this.playerZ);
      if (d < 1.85) {
        if (item.kind !== 'weapon') {
          this.collectLoot(item);
        } else if (!this.slots[0] || !this.slots[1]) {
          this.collectLoot(item);
        }
      }
    }

    // Shooting
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.mouseFireDown && this.fireCooldown <= 0) {
      this.firePlayerWeapon();
      if (!weaponDef.auto) {
        this.mouseFireDown = false;
      }
    }

    // Animate Player Rig (Emote OR Stand / Crouch / Prone 3D Stances)
    if (
      this.activeEmoteId &&
      (isMoving || !this.grounded || Boolean(this.keys['Space']) || this.mouseFireDown || this.isAds || this.isHealing || this.isReloading || this.stance !== 'stand')
    ) {
      this.activeEmoteId = null;
      resetEmoteRigBase(this.playerRig);
      if (this.skillActiveTimer > 0) this.playerRig.skillAuraGroup.visible = true;
    }

    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.root.rotation.y = this.playerYaw;
    const isProne = this.stance === 'prone';
    const isCrouch = this.stance === 'crouch';

    if (this.activeEmoteId) {
      this.activeEmoteTimer += dt;
      if (this.activeEmoteTimer >= this.activeEmoteDuration) {
        this.activeEmoteId = null;
        resetEmoteRigBase(this.playerRig);
        if (this.skillActiveTimer > 0) this.playerRig.skillAuraGroup.visible = true;
      } else {
        applyEmotePose(this.playerRig, this.activeEmoteId, this.activeEmoteTimer, this.activeEmoteDuration);
        if (this.skillActiveTimer > 0) this.playerRig.skillAuraGroup.visible = true;
      }
    }

    if (!this.activeEmoteId) {
      this.playerRig.bodyPivot.rotation.x = THREE.MathUtils.damp(
        this.playerRig.bodyPivot.rotation.x,
        isProne ? Math.PI / 2 - 0.08 : 0,
        14,
        dt
      );
      this.playerRig.bodyPivot.position.y = THREE.MathUtils.damp(
        this.playerRig.bodyPivot.position.y,
        isProne ? 0.22 : 0,
        14,
        dt
      );
      this.playerRig.bodyPivot.position.z = THREE.MathUtils.damp(
        this.playerRig.bodyPivot.position.z,
        isProne ? -0.35 : 0,
        14,
        dt
      );
      this.playerRig.torso.position.y = isCrouch ? 0.70 : 0.90;
      this.playerRig.head.rotation.x = THREE.MathUtils.damp(
        this.playerRig.head.rotation.x,
        isProne ? -0.95 : 0,
        14,
        dt
      );
      if (isMoving && this.grounded) {
        const freq = sprinting ? 13 : isProne ? 6 : 9;
        const amp = sprinting ? 0.65 : isProne ? 0.22 : 0.45;
        const stride = Math.sin(this.matchTime * freq) * amp;
        this.playerRig.leftLeg.rotation.x = stride;
        this.playerRig.rightLeg.rotation.x = -stride;
      } else {
        this.playerRig.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.leftLeg.rotation.x, 0, 10, dt);
        this.playerRig.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.rightLeg.rotation.x, 0, 10, dt);
      }
      if (isProne) {
        this.playerRig.rightArm.rotation.set(-0.45 - this.playerPitch * 0.25, -0.05, 0);
        this.playerRig.leftArm.rotation.set(-0.45 - this.playerPitch * 0.25, 0.35, 0);
      } else {
        this.playerRig.rightArm.rotation.set(-1.15 - this.playerPitch * 0.5, -0.05, 0);
        this.playerRig.leftArm.rotation.set(-0.95 - this.playerPitch * 0.4, 0.38, 0);
      }
    }

    // FOV & Third-Person Over-the-Shoulder Camera
    const targetFov = this.isAds ? weaponDef.adsFov : sprinting ? 70 : 64;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
      this.camera.updateProjectionMatrix();
    }

    const camDist = this.isAds ? (weaponDef.id === 'awm' ? 0.4 : 2.35) : isProne ? 3.8 : 4.2;
    const camHeight = isProne ? 0.65 : isCrouch ? 1.35 : 1.75;
    this.updateThirdPersonCamera(dt, camDist, camHeight);
  }

  private updateThirdPersonCamera(dt: number, dist: number, height: number, shoulderOverride?: number) {
    const camYaw = this.playerYaw + this.freeLookYaw;
    const pitch = THREE.MathUtils.clamp(
      this.playerPitch + this.freeLookPitch - this.recoilPitch,
      -0.65,
      0.78
    );
    const shoulderOffset =
      shoulderOverride !== undefined
        ? shoulderOverride
        : this.isAds && this.slots[this.activeSlot]?.weaponId === 'awm'
        ? 0
        : 0.62;

    const sinY = Math.sin(camYaw);
    const cosY = Math.cos(camYaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const lookBaseX = this.activeVehicle && this.activeSeat === 'driver' ? this.activeVehicle.x : this.playerX;
    const lookBaseY = this.activeVehicle && this.activeSeat === 'driver' ? this.activeVehicle.y : this.playerY;
    const lookBaseZ = this.activeVehicle && this.activeSeat === 'driver' ? this.activeVehicle.z : this.playerZ;

    const lookX = lookBaseX - cosY * shoulderOffset;
    const lookY = lookBaseY + height;
    const lookZ = lookBaseZ + sinY * shoulderOffset;

    const desiredX = lookX - sinY * cosP * dist;
    const desiredY = Math.max(groundHeightAt(desiredX, lookZ, this.mapId) + 0.5, lookY + sinP * dist);
    const desiredZ = lookZ - cosY * cosP * dist;

    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX + shakeX, 24, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY + shakeY, 24, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 24, dt);

    _vec3C.set(
      lookX + sinY * 18,
      lookY - sinP * 18,
      lookZ + cosY * 18
    );
    this.camera.lookAt(_vec3C);
  }

  private pushHudState(forcedRank?: number) {
    const aliveBots = this.bots.filter((b) => b.alive).length;
    const aliveRemotes = this.getAliveRemoteCount();
    const aliveCount = aliveBots + aliveRemotes + (this.hp > 0 ? 1 : 0);
    const activeSlotObj = this.slots[this.activeSlot];
    const wDef = activeSlotObj ? WEAPONS[activeSlotObj.weaponId] : WEAPONS.deagle;

    // Project floating damage popups into 2D screen coordinates
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const projectedPopups: DamagePopup[] = [];
    for (let i = 0; i < this.damagePopups.length; i++) {
      const p = this.damagePopups[i];
      _projVec.copy(p.worldPos).project(this.camera);
      if (_projVec.z > 1) continue;
      projectedPopups.push({
        id: p.id,
        x: ((_projVec.x + 1) / 2) * w,
        y: (-(_projVec.y - 1) / 2) * h,
        amount: p.amount,
        headshot: p.headshot,
        armorHit: p.armorHit,
        alpha: p.alpha,
      });
    }

    // Minimap entities (gunshot pings + Moco scan + remote human pings + airdrop)
    const minimapEntities: MinimapEntity[] = [];
    const mocoScanActive = this.skillActiveTimer > 0 && this.profile.selectedSkinId === 'moco';
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (!b.alive) continue;
      if (this.matchTime - b.lastShotPing < 3.0 || (mocoScanActive && Math.hypot(b.x - this.playerX, b.z - this.playerZ) < 60)) {
        minimapEntities.push({ x: b.x, z: b.z, type: 'bot_ping' });
      }
    }
    this.remoteHumans.forEach((rh) => {
      if (!rh.alive || rh.inPlane) return;
      if (this.matchTime - rh.lastShotPing < 4.0 || mocoScanActive) {
        minimapEntities.push({ x: rh.x, z: rh.z, type: 'human_ping' });
      }
    });
    if (this.airdropSpawned && !this.airdropCollected) {
      minimapEntities.push({ x: this.airdropPos.x, z: this.airdropPos.z, type: 'airdrop' });
    }
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.destroyed && v !== this.activeVehicle) {
        minimapEntities.push({ x: v.x, z: v.z, type: 'vehicle' });
      }
    }
    for (let i = 0; i < this.deathCrates.length; i++) {
      const dc = this.deathCrates[i];
      if (!dc.collected && !dc.removed) {
        minimapEntities.push({ x: dc.x, z: dc.z, type: 'loot' });
      }
    }

    const nearbyVehicle = !this.activeVehicle && this.phase === 'playing' ? this.findNearestVehicle(4.4) : null;
    const vehicleState: VehicleHudState = this.activeVehicle
      ? {
          inVehicle: true,
          vehicleId: this.activeVehicle.id,
          vehicleName: this.activeVehicle.name,
          vehicleType: this.activeVehicle.type,
          seatRole: this.activeSeat,
          speedKmh: Math.round(Math.abs(this.activeVehicle.speed) * 4.2),
          vehicleHp: Math.ceil(this.activeVehicle.hp),
          vehicleMaxHp: this.activeVehicle.maxHp,
          boostFuel: Math.round(this.activeVehicle.boostFuel),
          nearbyVehicleName: null,
          nearbyVehicleType: null,
          hasPassengerSeat: true,
        }
      : {
          inVehicle: false,
          vehicleId: null,
          vehicleName: '',
          vehicleType: null,
          seatRole: null,
          speedKmh: 0,
          vehicleHp: 0,
          vehicleMaxHp: 0,
          boostFuel: 0,
          nearbyVehicleName: nearbyVehicle ? nearbyVehicle.name : null,
          nearbyVehicleType: nearbyVehicle ? nearbyVehicle.type : null,
          hasPassengerSeat: Boolean(nearbyVehicle),
        };

    // Nearby loot prompt
    let lootPrompt: LootPrompt | null = null;
    if (this.phase === 'playing' && !this.activeVehicle) {
      if (
        this.airdropSpawned &&
        !this.airdropCollected &&
        Math.hypot(this.playerX - this.airdropPos.x, this.playerZ - this.airdropPos.z) < 4.0
      ) {
        lootPrompt = { label: 'AIRDROP CRATE', sublabel: 'Lv3 Gear + AWM + Gloo', rarityColor: '#F59E0B' };
      } else {
        const nearCrate = this.findNearestDeathCrate(3.4);
        if (nearCrate) {
          const weaponNames = nearCrate.droppedSlots
            .map((s) => WEAPONS[s.weaponId]?.name)
            .filter(Boolean)
            .slice(0, 2);
          const parts: string[] = [];
          if (weaponNames.length > 0) parts.push(weaponNames.join(' + '));
          if (nearCrate.medkits > 0) parts.push(`${nearCrate.medkits} Med`);
          if (nearCrate.glooWalls > 0) parts.push(`${nearCrate.glooWalls} Gloo`);
          if (nearCrate.vestLevel > 0) parts.push(`Lv.${nearCrate.vestLevel} Vest`);
          parts.push('Press F/E');
          lootPrompt = {
            label: `DEATH CRATE · ${nearCrate.victimName}`,
            sublabel: parts.join(' · '),
            rarityColor: nearCrate.tier === 'high' ? '#F59E0B' : '#38BDF8',
          };
        } else {
          const near = this.findNearestLoot(3.4);
          if (near) {
            if (near.kind === 'weapon' && near.weaponId) {
              const wd = WEAPONS[near.weaponId];
              lootPrompt = { label: wd.name, sublabel: `${wd.category} · Press F/E to Equip`, rarityColor: wd.accentColor };
            } else {
              const labels: Record<string, string> = {
                medkit: 'Medkit (+75 HP)',
                gloo: 'Gloo Wall (+2)',
                vest: `Armor Vest Lv.${near.level || 1}`,
                helmet: `Tactical Helmet Lv.${near.level || 1}`,
                mushroom: 'EP Mushroom (+45 EP)',
                ammo: 'Ammo Pack',
              };
              lootPrompt = { label: labels[near.kind] || 'Supply', sublabel: 'Press F/E to Loot', rarityColor: '#38BDF8' };
            }
          }
        }
      }
    }

    const rankAchieved = forcedRank ?? aliveCount;
    const earnedGold = (this.kills * 45) + (rankAchieved === 1 ? 250 : Math.max(20, (31 - rankAchieved) * 6));
    const earnedXp = (this.kills * 60) + Math.round(this.matchTime * 1.5) + (rankAchieved === 1 ? 300 : 40);

    const groundY = groundHeightAt(this.playerX, this.playerZ, this.mapId);
    const distFromZone = Math.hypot(this.playerX - this.zoneCenterX, this.playerZ - this.zoneCenterZ);
    const inZone = distFromZone <= this.zoneRadius;
    const zoneDistanceOutside = inZone ? 0 : Math.ceil(distFromZone - this.zoneRadius);

    // Prune expired kill feed notifications (> 7.5s) and compute real-time fade age
    this.killFeed = this.killFeed.filter((kf) => this.matchTime - kf.timestamp <= 7.5);
    const activeKillFeed = this.killFeed.map((kf) => ({
      ...kf,
      ageSec: Math.max(0, this.matchTime - kf.timestamp),
    }));

    this.onHudUpdate({
      phase: this.phase,
      aliveCount,
      totalCount: 30,
      kills: this.kills,
      damageDealt: Math.round(this.damageDealt),
      headshots: this.headshots,
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      ep: Math.ceil(this.ep),
      maxEp: this.maxEp,
      vestLevel: this.vestLevel,
      vestDurability: Math.round(this.vestDurability),
      helmetLevel: this.helmetLevel,
      helmetDurability: Math.round(this.helmetDurability),
      glooWalls: this.glooWalls,
      medkits: this.medkits,
      activeSlot: this.activeSlot,
      slots: [
        this.slots[0] ? { ...this.slots[0] } : null,
        this.slots[1] ? { ...this.slots[1] } : null,
        this.slots[2] ? { ...this.slots[2] } : null,
      ],
      isReloading: this.isReloading,
      reloadProgress: this.isReloading ? Math.min(1, this.reloadTimer / wDef.reloadTime) : 0,
      isHealing: this.isHealing,
      healProgress: this.isHealing ? Math.min(1, this.healTimer / 2.2) : 0,
      isAds: this.isAds,
      isScopedSniper: this.isAds && wDef.id === 'awm' && this.phase === 'playing',
      stance: this.stance,
      sprintLocked: this.sprintLocked,
      isFreeLooking:
        this.freeLookActive ||
        Math.abs(this.freeLookYaw) > 0.04 ||
        Math.abs(this.freeLookPitch) > 0.04,
      activeOpticLabel: !this.isAds
        ? 'HIP'
        : wDef.id === 'awm'
        ? '4X'
        : wDef.id === 'scar'
        ? '2X'
        : 'RED DOT',
      crosshairSpread: (this.isAds ? wDef.adsSpread : wDef.spread) + this.recoilPitch * 0.5,
      hitmarkerType: this.hitmarkerType,
      damageFlash: this.damageFlash,
      skillCooldown: this.skillCooldown,
      skillMaxCooldown: this.skillMaxCooldown,
      skillActiveTimer: this.skillActiveTimer,
      zonePhase: this.zonePhase,
      zoneTotalPhases: this.zoneStages.length,
      zoneTimer: Math.max(0, Math.ceil(this.zoneTimer)),
      zoneShrinking: this.zoneShrinking,
      zoneFinalized: this.zoneFinalized,
      zoneDamagePerSec: this.getCurrentZoneDps(),
      zoneDistanceOutside,
      inZone,
      zoneRadius: this.zoneRadius,
      zoneCenterX: this.zoneCenterX,
      zoneCenterZ: this.zoneCenterZ,
      nextZoneRadius: this.nextZoneRadius,
      nextZoneCenterX: this.nextZoneCenterX,
      nextZoneCenterZ: this.nextZoneCenterZ,
      playerX: this.playerX,
      playerY: this.playerY,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      planeProgress: Math.min(1, this.planeProgress),
      altitude: Math.max(0, Math.round(this.playerY - groundY)),
      parachuteOpen: this.parachuteOpen,
      canDeployParachute: this.phase === 'parachute' && !this.parachuteOpen,
      lootPrompt,
      vehicle: vehicleState,
      killFeed: activeKillFeed,
      damagePopups: projectedPopups,
      minimapEntities,
      pointerLocked: this.pointerLocked,
      survivalTime: this.lockedSurvivalTime ?? Math.round(this.matchTime),
      rankAchieved,
      earnedGold,
      earnedXp,
      mapId: this.mapId,
      eliminatedBy: this.eliminatedBy,
      spectateTargetName: this.phase === 'spectating' ? this.spectateTargetName : undefined,
      spectateTargetWeapon:
        this.phase === 'spectating'
          ? this.spectateMode === 'bot'
            ? WEAPONS[this.bots.find((b) => b.id === this.spectateBotId)?.weaponId || 'ak47']?.name
            : this.spectateMode === 'human'
            ? WEAPONS[this.remoteHumans.get(this.spectateHumanId)?.weaponId || 'deagle']?.name
            : undefined
          : undefined,
      spectateTargetHp:
        this.phase === 'spectating'
          ? this.spectateMode === 'bot'
            ? Math.max(
                0,
                Math.ceil(
                  (() => {
                    const sb = this.bots.find((b) => b.id === this.spectateBotId);
                    return sb && sb.alive ? sb.hp : 0;
                  })()
                )
              )
            : this.spectateMode === 'human'
            ? Math.max(
                0,
                Math.ceil(
                  (() => {
                    const sr = this.remoteHumans.get(this.spectateHumanId);
                    return sr && sr.alive ? sr.hp : 0;
                  })()
                )
              )
            : undefined
          : undefined,
      spectateRemainingSec: this.phase === 'spectating' ? this.spectateTimer : undefined,
      activeEmoteId: this.activeEmoteId,
      multiplayerRoomCode: this.mpSession?.roomCode,
      humanPlayersAlive: aliveRemotes + (this.hp > 0 ? 1 : 0),
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.mpSession?.ws && this.onWsMessageBound) {
      this.mpSession.ws.removeEventListener('message', this.onWsMessageBound);
    }
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    const dom = this.renderer.domElement;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    dom.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    dom.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    window.removeEventListener('resize', this.onResize);

    for (let i = 0; i < this.deathCrates.length; i++) {
      this.scene.remove(this.deathCrates[i].rig.group);
    }
    this.deathCrates = [];
    this.ragdolls = [];
    this.countedKillIds.clear();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      } else if ((obj as THREE.Line).isLine) {
        const line = obj as THREE.Line;
        line.geometry?.dispose();
        const mat = line.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      } else if ((obj as THREE.Sprite).isSprite) {
        const sprite = obj as THREE.Sprite;
        sprite.material?.map?.dispose();
        sprite.material?.dispose();
      }
    });

    this.sparkGeo.dispose();
    this.sparkMats.forEach((m) => m.dispose());
    this.sparkMats.clear();
    this.scene.environment?.dispose();
    disposeGameTextures(this.textures);
    this.renderer.dispose();
  }
}
