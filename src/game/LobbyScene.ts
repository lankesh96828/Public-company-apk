import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CHARACTER_SKINS,
  EMOTE_CATALOG,
  LobbyTab,
  PARACHUTE_SKINS,
  WeaponId,
} from './types';
import { createCharacterModel, CharacterRig } from './models';
import { createGameTextures, disposeGameTextures, GameTextures } from './textures';
import { applyEmotePose, resetEmoteRigBase } from './emoteAnimator';
import { soundEngine } from './audio';
import { VictoryFireworksSystem } from './fireworks';

function disposeObjectGeometriesAndMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

export function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class LobbySceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: GameTextures;
  private characterGroup: THREE.Group;
  private rig: CharacterRig;
  private pedestalRing: THREE.Mesh;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private targetYaw = 0.25;
  private currentYaw = 0.25;
  private isDragging = false;
  private lastPointerX = 0;
  private activeTab: LobbyTab = 'home';

  private camTargetPos = new THREE.Vector3(0.35, 1.55, 3.8);
  private camLookTarget = new THREE.Vector3(0, 1.05, 0);
  private camCurrentLook = new THREE.Vector3(0, 1.05, 0);

  private currentSkinId: string;
  private currentWeaponId: WeaponId;
  private currentParachuteId: string;
  private currentWeaponSkinId: string;

  private activeEmoteId: string | null = null;
  private emoteTimer = 0;
  private emoteDuration = 2.4;
  private fireworks: VictoryFireworksSystem;
  private baseRingColorHex = 0xff8c00;

  constructor(
    container: HTMLElement,
    initialSkinId: string,
    initialWeaponId: WeaponId,
    initialParachuteId: string,
    initialWeaponSkinId = ''
  ) {
    this.container = container;
    this.currentSkinId = initialSkinId;
    this.currentWeaponId = initialWeaponId;
    this.currentParachuteId = initialParachuteId;
    this.currentWeaponSkinId = initialWeaponSkinId;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d121a);
    this.scene.fog = new THREE.FogExp2(0x0d121a, 0.042);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.copy(this.camTargetPos);
    this.camera.lookAt(this.camLookTarget);

    this.textures = createGameTextures(this.renderer.capabilities.getMaxAnisotropy());

    // 3-Point Studio Hangar Lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e1b18, 0.75);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(3.8, 6.2, 4.5);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf97316, 1.8);
    rimLight.position.set(-4.2, 3.6, -4.5);
    this.scene.add(rimLight);

    const fillPoint = new THREE.PointLight(0x38bdf8, 1.4, 14);
    fillPoint.position.set(-3.2, 2.4, 2.8);
    this.scene.add(fillPoint);

    // Hangar Floor + Hexagonal Armory Pedestal
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshStandardMaterial({
        map: this.textures.lobbyFloor,
        roughness: 0.45,
        metalness: 0.55,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const pedestalBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.85, 0.24, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e2532, roughness: 0.35, metalness: 0.85 })
    );
    pedestalBase.position.y = 0.12;
    pedestalBase.receiveShadow = true;
    this.scene.add(pedestalBase);

    const pedestalRingMat = new THREE.MeshStandardMaterial({
      color: 0xff8c00,
      emissive: 0xff8c00,
      emissiveIntensity: 1.1,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.pedestalRing = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.032, 8, 8), pedestalRingMat);
    this.pedestalRing.rotation.x = Math.PI / 2;
    this.pedestalRing.position.y = 0.245;
    this.scene.add(this.pedestalRing);

    // Contact shadow plane directly on pedestal top
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({
        map: this.textures.softShadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.246;
    this.scene.add(contactShadow);

    // Background Tactical Crates & Drop Bay Pillars (depth framing)
    const crateMat = new THREE.MeshStandardMaterial({ map: this.textures.woodCrate, roughness: 0.78 });
    const metalMat = new THREE.MeshStandardMaterial({ map: this.textures.corrugatedMetal, color: 0x334155, roughness: 0.45, metalness: 0.7 });
    const bgPositions = [
      [-4.6, 0.75, -5.2],
      [-5.9, 0.55, -3.8],
      [4.8, 0.85, -5.6],
    ];
    bgPositions.forEach(([bx, by, bz], idx) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, by * 2, 1.5), idx === 2 ? metalMat : crateMat);
      box.position.set(bx, by, bz);
      box.rotation.y = idx * 0.5;
      box.castShadow = true;
      box.receiveShadow = true;
      this.scene.add(box);
    });

    // Overhead Hangar Arch Frame
    const archMat = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.4, metalness: 0.8 });
    [-3.6, 3.6].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7, 0.55), archMat);
      pillar.position.set(px, 3.5, -4.5);
      this.scene.add(pillar);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.45, 0.6), archMat);
    beam.position.set(0, 6.8, -4.5);
    this.scene.add(beam);

    // Hero Character Group on Pedestal
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.y = 0.24;
    this.scene.add(this.characterGroup);

    this.rig = this.buildRig();
    this.characterGroup.add(this.rig.root);

    const initialSkin = CHARACTER_SKINS.find((s) => s.id === this.currentSkinId) || CHARACTER_SKINS[0];
    this.baseRingColorHex = initialSkin.visorColor;
    const initRingMat = this.pedestalRing.material as THREE.MeshStandardMaterial;
    initRingMat.color.setHex(this.baseRingColorHex);
    initRingMat.emissive.setHex(this.baseRingColorHex);

    this.fireworks = new VictoryFireworksSystem(this.scene, {
      onLaunch: () => soundEngine.playFireworkLaunch(),
      onBurst: (intensity) => soundEngine.playFireworkBurst(intensity),
    });

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.tick();
  }

  private buildRig(): CharacterRig {
    const skin = CHARACTER_SKINS.find((s) => s.id === this.currentSkinId) || CHARACTER_SKINS[0];
    const chute = PARACHUTE_SKINS.find((p) => p.id === this.currentParachuteId) || PARACHUTE_SKINS[0];
    const rig = createCharacterModel(skin, this.currentWeaponId, chute, this.currentWeaponSkinId);
    // Heroic FF-lobby ready weapon stance
    rig.rightArm.rotation.set(-0.75, -0.15, -0.1);
    rig.leftArm.rotation.set(-0.45, 0.35, 0.22);
    rig.leftLeg.rotation.z = -0.05;
    rig.rightLeg.rotation.z = 0.05;
    return rig;
  }

  public updateLoadout(skinId: string, weaponId: WeaponId, parachuteId: string, weaponSkinId?: string) {
    const needsRebuild = skinId !== this.currentSkinId;
    this.currentSkinId = skinId;
    this.currentWeaponId = weaponId;
    this.currentParachuteId = parachuteId;
    if (weaponSkinId !== undefined) {
      this.currentWeaponSkinId = weaponSkinId;
    }

    const skin = CHARACTER_SKINS.find((s) => s.id === skinId) || CHARACTER_SKINS[0];
    this.baseRingColorHex = skin.visorColor;
    const ringMat = this.pedestalRing.material as THREE.MeshStandardMaterial;
    ringMat.color.setHex(skin.visorColor);
    ringMat.emissive.setHex(skin.visorColor);

    if (needsRebuild) {
      this.activeEmoteId = null;
      this.characterGroup.remove(this.rig.root);
      disposeObjectGeometriesAndMaterials(this.rig.root);
      this.rig = this.buildRig();
      this.characterGroup.add(this.rig.root);
    } else {
      this.rig.setWeapon(weaponId, this.currentWeaponSkinId);
      const chute = PARACHUTE_SKINS.find((p) => p.id === parachuteId) || PARACHUTE_SKINS[0];
      this.rig.setParachuteSkin(chute);
    }
  }

  public playEmote(emoteId: string) {
    const def = EMOTE_CATALOG.find((e) => e.id === emoteId);
    this.activeEmoteId = emoteId;
    this.emoteTimer = 0;
    this.emoteDuration = def?.duration ?? 2.4;
    soundEngine.playEmote(def?.rarity === 'mythic');
  }

  public triggerVictoryFireworks(durationSec = 8.5) {
    if (this.disposed) return;
    this.fireworks.triggerShow(durationSec);
    if (this.activeTab === 'home' && !this.activeEmoteId) {
      this.playEmote('booyah');
    }
  }

  public setTab(tab: LobbyTab) {
    this.activeTab = tab;
    if (tab === 'home') {
      this.camTargetPos.set(0.35, 1.55, 3.85);
      this.camLookTarget.set(0, 1.05, 0);
    } else if (tab === 'character') {
      this.camTargetPos.set(-0.55, 1.48, 3.1);
      this.camLookTarget.set(-0.35, 1.08, 0);
    } else if (tab === 'weapons') {
      this.camTargetPos.set(0.75, 1.32, 2.65);
      this.camLookTarget.set(-0.2, 1.05, 0.15);
      this.targetYaw = -0.45;
    } else if (tab === 'vault') {
      this.camTargetPos.set(-0.4, 2.2, 4.3);
      this.camLookTarget.set(-0.3, 1.4, 0);
    }
    this.rig.parachuteGroup.visible = tab === 'vault';
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;
    this.targetYaw += dx * 0.011;
  };

  private onPointerUp = () => {
    this.isDragging = false;
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
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
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

  private tick = () => {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.elapsedTime;

    // Gentle idle breathing + subtle auto-turn when not dragging
    if (!this.isDragging && this.activeTab === 'home') {
      this.targetYaw += dt * 0.14;
    }
    this.currentYaw = THREE.MathUtils.damp(this.currentYaw, this.targetYaw, 8, dt);
    this.characterGroup.rotation.y = this.currentYaw;
    if (this.activeEmoteId) {
      this.emoteTimer += dt;
      if (this.emoteTimer >= this.emoteDuration) {
        this.activeEmoteId = null;
        resetEmoteRigBase(this.rig);
        this.rig.rightArm.rotation.set(-0.75, -0.15, -0.1);
        this.rig.leftArm.rotation.set(-0.45, 0.35, 0.22);
        this.rig.leftLeg.rotation.z = -0.05;
        this.rig.rightLeg.rotation.z = 0.05;
      } else {
        applyEmotePose(this.rig, this.activeEmoteId, this.emoteTimer, this.emoteDuration);
      }
    } else {
      this.rig.torso.position.y = 0.90 + Math.sin(elapsed * 2.1) * 0.015;
      this.rig.head.rotation.y = Math.sin(elapsed * 0.9) * 0.08;
    }
    this.pedestalRing.rotation.z = elapsed * 0.35;
    this.fireworks.update(dt);

    const ringMat = this.pedestalRing.material as THREE.MeshStandardMaterial;
    if (this.fireworks.isActive()) {
      ringMat.color.setHex(0xfbbf24);
      ringMat.emissive.setHex(0xf59e0b);
      ringMat.emissiveIntensity = 1.65 + Math.sin(elapsed * 8) * 0.55;
    } else {
      ringMat.color.setHex(this.baseRingColorHex);
      ringMat.emissive.setHex(this.baseRingColorHex);
      ringMat.emissiveIntensity = 1.1;
    }

    // Smooth camera preset damping
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.camTargetPos.x, 5.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.camTargetPos.y, 5.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.camTargetPos.z, 5.5, dt);
    this.camCurrentLook.x = THREE.MathUtils.damp(this.camCurrentLook.x, this.camLookTarget.x, 6, dt);
    this.camCurrentLook.y = THREE.MathUtils.damp(this.camCurrentLook.y, this.camLookTarget.y, 6, dt);
    this.camCurrentLook.z = THREE.MathUtils.damp(this.camCurrentLook.z, this.camLookTarget.z, 6, dt);
    this.camera.lookAt(this.camCurrentLook);

    this.renderer.render(this.scene, this.camera);
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
    this.fireworks.dispose();
    disposeObjectGeometriesAndMaterials(this.scene);
    this.scene.environment?.dispose();
    disposeGameTextures(this.textures);
    this.renderer.dispose();
  }
}
