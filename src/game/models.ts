import * as THREE from 'three';
import { CharacterSkin, MapId, VaultOption, VehicleType, WEAPON_SKINS, WeaponId } from './types';
import { GameTextures } from './textures';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  weaponMount: THREE.Group;
  parachuteGroup: THREE.Group;
  skillAuraGroup: THREE.Group;
  hitBodyMesh: THREE.Mesh;
  hitHeadMesh: THREE.Mesh;
  setWeapon: (weaponId: WeaponId, weaponSkinId?: string) => void;
  setParachuteSkin: (skin: VaultOption) => void;
}

export function createWeaponModel(weaponId: WeaponId, weaponSkinId?: string): THREE.Group {
  const g = new THREE.Group();
  const skin =
    (weaponSkinId && WEAPON_SKINS.find((s) => s.id === weaponSkinId && s.weaponId === weaponId)) ||
    WEAPON_SKINS.find((s) => s.weaponId === weaponId)!;

  const isEvoOrEpic = skin.rarity === 'evo' || skin.rarity === 'epic';
  const primaryMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    roughness: skin.rarity === 'standard' ? 0.58 : 0.3,
    metalness: skin.rarity === 'standard' ? 0.25 : 0.72,
    emissive: skin.emissiveColor,
    emissiveIntensity: skin.emissiveIntensity * 0.22,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.accentColor,
    roughness: 0.22,
    metalness: 0.8,
    emissive: skin.emissiveColor,
    emissiveIntensity: skin.emissiveIntensity,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: skin.metalColor,
    roughness: 0.3,
    metalness: 0.88,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x161b24,
    roughness: 0.38,
    metalness: 0.82,
  });

  if (weaponId === 'ak47') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.42), metalMat);
    receiver.position.set(0, 0.04, 0.02);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.42, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, 0.42);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.072, 0.23), primaryMat);
    handguard.position.set(0, 0.035, 0.28);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.24), primaryMat);
    stock.position.set(0, 0.015, -0.26);
    stock.rotation.x = 0.12;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.08), accentMat);
    mag.position.set(0, -0.1, 0.1);
    mag.rotation.x = 0.26;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.06), darkMetal);
    grip.position.set(0, -0.06, -0.09);
    grip.rotation.x = -0.25;
    g.add(receiver, barrel, handguard, stock, mag, grip);

    if (isEvoOrEpic) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.44), accentMat);
      rail.position.set(0, 0.105, 0.14);
      g.add(rail);
    }
  } else if (weaponId === 'scar') {
    const optic = new THREE.MeshStandardMaterial({
      color: skin.accentColor,
      roughness: 0.15,
      metalness: 0.9,
      emissive: skin.emissiveColor || skin.accentColor,
      emissiveIntensity: Math.max(0.4, skin.emissiveIntensity),
    });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.46), primaryMat);
    receiver.position.set(0, 0.04, 0.05);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.36, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.055, 0.44);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.25), primaryMat);
    stock.position.set(0, 0.03, -0.26);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.075), isEvoOrEpic ? accentMat : darkMetal);
    mag.position.set(0, -0.09, 0.11);
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.14), metalMat);
    scope.position.set(0, 0.125, 0.04);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), optic);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.125, 0.11);
    g.add(receiver, barrel, stock, mag, scope, lens);

    if (isEvoOrEpic) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.024, 0.32), accentMat);
      fin.position.set(0, 0.05, 0.16);
      g.add(fin);
    }
  } else if (weaponId === 'mp40') {
    const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 12), primaryMat);
    receiver.rotation.x = Math.PI / 2;
    receiver.position.set(0, 0.04, 0.06);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.045, 0.34);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.05), accentMat);
    mag.position.set(0, -0.1, 0.16);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.055), darkMetal);
    grip.position.set(0, -0.05, -0.05);
    grip.rotation.x = -0.22;
    const wireStock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.22), metalMat);
    wireStock.position.set(0, 0.02, -0.21);
    g.add(receiver, barrel, mag, grip, wireStock);

    if (isEvoOrEpic) {
      const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.022, 0.26), accentMat);
      shroud.position.set(0, 0.082, 0.12);
      g.add(shroud);
    }
  } else if (weaponId === 'm1887') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.24), accentMat);
    receiver.position.set(0, 0.03, -0.02);
    const barrelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 10), metalMat);
    barrelTop.rotation.x = Math.PI / 2;
    barrelTop.position.set(0, 0.065, 0.35);
    const barrelBot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 10), darkMetal);
    barrelBot.rotation.x = Math.PI / 2;
    barrelBot.position.set(0, 0.028, 0.33);
    const forend = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.24), primaryMat);
    forend.position.set(0, 0.015, 0.25);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.22), primaryMat);
    stock.position.set(0, -0.01, -0.22);
    stock.rotation.x = 0.22;
    g.add(receiver, barrelTop, barrelBot, forend, stock);

    if (isEvoOrEpic) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.44), accentMat);
      rib.position.set(0, 0.09, 0.32);
      g.add(rib);
    }
  } else if (weaponId === 'awm') {
    const opticGlow = new THREE.MeshStandardMaterial({
      color: skin.accentColor,
      roughness: 0.15,
      metalness: 0.9,
      emissive: skin.emissiveColor || skin.accentColor,
      emissiveIntensity: Math.max(0.45, skin.emissiveIntensity),
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.62), primaryMat);
    chassis.position.set(0, 0.03, 0.02);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.022, 0.64, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.055, 0.58);
    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.042, 0.08), isEvoOrEpic ? accentMat : darkMetal);
    muzzleBrake.position.set(0, 0.055, 0.9);
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.32, 12), metalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.13, 0.08);
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), opticGlow);
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.13, 0.24);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.09), isEvoOrEpic ? accentMat : darkMetal);
    mag.position.set(0, -0.06, 0.12);
    g.add(chassis, barrel, muzzleBrake, scopeTube, scopeLens, mag);
  } else {
    // Desert Eagle
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.28), primaryMat);
    slide.position.set(0, 0.055, 0.08);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.065), metalMat);
    grip.position.set(0, -0.02, -0.02);
    grip.rotation.x = -0.22;
    const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.06), darkMetal);
    triggerGuard.position.set(0, 0.005, 0.05);
    g.add(slide, grip, triggerGuard);

    if (skin.rarity !== 'standard') {
      const topRib = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.015, 0.24), accentMat);
      topRib.position.set(0, 0.092, 0.08);
      g.add(topRib);
    }
  }

  g.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
    }
  });
  return g;
}

const faceTextureCache = new Map<string, THREE.CanvasTexture>();

function hexToCss(num: number): string {
  return `#${num.toString(16).padStart(6, '0')}`;
}

function getCharacterFaceTexture(skin: CharacterSkin): THREE.CanvasTexture {
  const cached = faceTextureCache.get(skin.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const isCriminal = skin.id.startsWith('criminal_');
  const skinBase = isCriminal ? '#f8fafc' : hexToCss(skin.skinTone);

  ctx.fillStyle = skinBase;
  ctx.fillRect(0, 0, 512, 512);

  if (isCriminal) {
    // Iconic Top Criminal white clown/oni mask over the front face (center u=0.5, v=0.5 -> 256,256)
    const maskGrad = ctx.createRadialGradient(256, 256, 24, 256, 260, 114);
    maskGrad.addColorStop(0, '#ffffff');
    maskGrad.addColorStop(0.75, '#f1f5f9');
    maskGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = maskGrad;
    ctx.fillRect(144, 136, 224, 248);

    // Matching Criminal diamond eye triangles
    const criminalEyeHex =
      skin.id === 'criminal_blue' ? '#2563eb' : skin.id === 'criminal_purple' ? '#9333ea' : '#dc2626';
    [220, 292].forEach((ex) => {
      ctx.fillStyle = criminalEyeHex;
      ctx.beginPath();
      ctx.moveTo(ex, 198);
      ctx.lineTo(ex - 22, 236);
      ctx.lineTo(ex, 272);
      ctx.lineTo(ex + 22, 236);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(ex, 236, 14, 9, ex < 256 ? -0.18 : 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(ex, 236, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(256, 266, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(200, 292);
    ctx.quadraticCurveTo(256, 348, 312, 292);
    ctx.quadraticCurveTo(256, 312, 200, 292);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (let tx = 210; tx <= 294; tx += 14) {
      ctx.fillRect(tx, 298, 9, 12);
    }
  } else {
    const isFemale = skin.gender === 'female';

    // Realistic facial shading: forehead highlight, cheekbone contour, warm subsurface blush
    const faceGrad = ctx.createRadialGradient(256, 250, 32, 256, 270, 136);
    faceGrad.addColorStop(0, 'rgba(255,245,235,0.16)');
    faceGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
    faceGrad.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Warm cheek blush / undertone
    [200, 312].forEach((cx) => {
      const blush = ctx.createRadialGradient(cx, 268, 4, cx, 268, 28);
      blush.addColorStop(0, isFemale ? 'rgba(225, 95, 105, 0.24)' : 'rgba(205, 90, 75, 0.14)');
      blush.addColorStop(1, 'rgba(225, 95, 105, 0)');
      ctx.fillStyle = blush;
      ctx.beginPath();
      ctx.arc(cx, 268, 28, 0, Math.PI * 2);
      ctx.fill();
    });

    // Subtle temple & jawline shadow
    ctx.fillStyle = 'rgba(20, 12, 8, 0.12)';
    ctx.beginPath();
    ctx.ellipse(256, 338, 62, 16, 0, 0, Math.PI);
    ctx.fill();

    // Character Cheek & Brow Markings
    if (skin.id === 'wukong') {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(192, 264);
      ctx.lineTo(226, 274);
      ctx.moveTo(320, 264);
      ctx.lineTo(286, 274);
      ctx.stroke();
    } else if (skin.id === 'a124') {
      // Combat android cyan glowing cheek circuit lines
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(188, 262);
      ctx.lineTo(212, 268);
      ctx.lineTo(220, 278);
      ctx.moveTo(324, 262);
      ctx.lineTo(300, 268);
      ctx.lineTo(292, 278);
      ctx.stroke();
    } else if (skin.id === 'steffie') {
      // Magenta graffiti paint streak under eye
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(194, 260);
      ctx.lineTo(222, 266);
      ctx.stroke();
    } else if (skin.id === 'tatsuya') {
      // Rebel cheek bandage
      ctx.fillStyle = '#f8fafc';
      ctx.save();
      ctx.translate(298, 268);
      ctx.rotate(-0.25);
      ctx.fillRect(-13, -5, 26, 10);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-13, -5, 26, 10);
      ctx.restore();
    }

    // Eyebrows
    const browColor =
      skin.id === 'skyler' || skin.id === 'laura' || skin.id === 'rafael' || skin.id === 'joseph' || skin.id === 'andrew'
        ? '#64748b'
        : skin.id === 'caroline' || skin.id === 'kapella'
        ? '#854d0e'
        : hexToCss(skin.hairColor);
    ctx.strokeStyle = browColor;
    ctx.lineWidth = isFemale ? 4.8 : 6.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(204, 222);
    ctx.quadraticCurveTo(222, isFemale ? 212 : 215, 238, 224);
    ctx.moveTo(308, 222);
    ctx.quadraticCurveTo(290, isFemale ? 212 : 215, 274, 224);
    ctx.stroke();

    // Eyes: natural eyelid crease, sclera, radial iris fibers, pupil, dual catchlights
    const irisColor =
      skin.id === 'moco'
        ? '#22c55e'
        : skin.id === 'wukong' || skin.id === 'kla'
        ? '#d97706'
        : skin.id === 'chrono' || skin.id === 'skyler' || skin.id === 'laura' || skin.id === 'caroline'
        ? '#0284c7'
        : skin.id === 'hayato' || skin.id === 'rafael' || skin.id === 'orion'
        ? '#dc2626'
        : skin.id === 'a124'
        ? '#06b6d4'
        : '#4b2e1b';

    [222, 290].forEach((ex, eyeIdx) => {
      // Laura sniper tactical eyepatch over her left eye (ex === 290)
      if (skin.id === 'laura' && eyeIdx === 1) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(256, 222);
        ctx.lineTo(328, 248);
        ctx.moveTo(286, 206);
        ctx.lineTo(318, 250);
        ctx.stroke();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(ex, 239, 17, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        return;
      }

      // Soft eye socket / upper lid crease
      ctx.strokeStyle = 'rgba(65, 32, 18, 0.34)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ex, 241, 15, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();

      // Almond sclera
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(ex, 240, 14.5, isFemale ? 9.2 : 8.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iris outer limbal ring + base fill
      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.arc(ex, 240, 7.6, 0, Math.PI * 2);
      ctx.fill();

      // Lighter inner iris highlight ring
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ex, 240, 5.2, 0, Math.PI * 2);
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(ex, 240, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Primary & secondary specular catchlights for lifelike gaze
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 2.6, 237.4, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + 2.2, 242.2, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Eyeliner & upper lashes
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = isFemale ? 3.8 : 2.8;
      ctx.beginPath();
      ctx.arc(ex, 242, 13.8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });

    // Hayato diagonal samurai scar over left eye; Andrew weathered cheek scar
    if (skin.id === 'hayato') {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(276, 206);
      ctx.lineTo(302, 274);
      ctx.stroke();
    } else if (skin.id === 'andrew' || skin.id === 'antonio') {
      ctx.strokeStyle = 'rgba(135, 40, 35, 0.72)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(202, 256);
      ctx.lineTo(214, 282);
      ctx.stroke();
    }

    // Natural Nose Bridge & Tip Shading
    ctx.strokeStyle = 'rgba(45, 22, 12, 0.30)';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(256, 244);
    ctx.lineTo(254, 272);
    ctx.lineTo(262, 274);
    ctx.stroke();

    // Maxim iconic white nose bridge bandage
    if (skin.id === 'maxim') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(236, 255, 40, 12);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(236, 255, 40, 12);
    }

    // Facial Hair (Alok goatee, Andrew stubble/beard, Antonio mafia beard, Joseph silver beard)
    if (skin.id === 'alok') {
      ctx.fillStyle = 'rgba(20, 16, 16, 0.88)';
      ctx.beginPath();
      ctx.moveTo(224, 288);
      ctx.quadraticCurveTo(256, 278, 288, 288);
      ctx.lineTo(282, 330);
      ctx.quadraticCurveTo(256, 346, 230, 330);
      ctx.closePath();
      ctx.fill();
    } else if (skin.id === 'andrew') {
      // Salt & pepper rugged jawline stubble & beard
      ctx.fillStyle = 'rgba(71, 85, 105, 0.62)';
      ctx.beginPath();
      ctx.moveTo(214, 284);
      ctx.quadraticCurveTo(256, 276, 298, 284);
      ctx.lineTo(292, 332);
      ctx.quadraticCurveTo(256, 350, 220, 332);
      ctx.closePath();
      ctx.fill();
    } else if (skin.id === 'antonio') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.moveTo(234, 288);
      ctx.quadraticCurveTo(256, 280, 278, 288);
      ctx.lineTo(274, 326);
      ctx.quadraticCurveTo(256, 338, 238, 326);
      ctx.closePath();
      ctx.fill();
    } else if (skin.id === 'joseph') {
      ctx.fillStyle = 'rgba(203, 213, 225, 0.88)';
      ctx.beginPath();
      ctx.moveTo(228, 286);
      ctx.quadraticCurveTo(256, 276, 284, 286);
      ctx.lineTo(278, 328);
      ctx.quadraticCurveTo(256, 344, 234, 328);
      ctx.closePath();
      ctx.fill();
    }

    // Rafael iconic crimson/black lower-face assassin mask
    if (skin.id === 'rafael') {
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(196, 272);
      ctx.quadraticCurveTo(256, 260, 316, 272);
      ctx.lineTo(304, 346);
      ctx.quadraticCurveTo(256, 364, 208, 346);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      // Realistic Cupid's bow lips & expression
      const lipColor =
        skin.id === 'paloma' || skin.id === 'kapella'
          ? '#be185d'
          : isFemale
          ? '#b8545a'
          : '#784032';
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = isFemale ? 5.2 : 4.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (skin.id === 'alok' || skin.id === 'skyler' || skin.id === 'chrono' || skin.id === 'tatsuya') {
        // Confident smirk
        ctx.moveTo(238, 300);
        ctx.quadraticCurveTo(258, 308, 278, 296);
      } else {
        ctx.moveTo(238, 300);
        ctx.quadraticCurveTo(256, 305, 274, 300);
      }
      ctx.stroke();

      // Subtle lower lip highlight
      ctx.strokeStyle = 'rgba(255, 220, 215, 0.35)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(246, 306);
      ctx.quadraticCurveTo(256, 309, 266, 306);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  faceTextureCache.set(skin.id, tex);
  return tex;
}

function createBeveledLapel(mirror: -1 | 1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(mirror * 0.085, 0.02);
  shape.lineTo(mirror * 0.145, 0.24);
  shape.lineTo(mirror * 0.06, 0.34);
  shape.lineTo(mirror * 0.01, 0.18);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
}

export function createCharacterModel(
  skin: CharacterSkin,
  weaponId: WeaponId,
  parachuteSkin: VaultOption,
  weaponSkinId?: string
): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const isBareArms = skin.id === 'k' || skin.id === 'wukong' || skin.id === 'kla' || skin.id === 'a124' || skin.id === 'kapella';
  const isBareChest = skin.id === 'alok' || skin.id === 'k' || skin.id === 'kla';

  const matJacket = new THREE.MeshStandardMaterial({
    color: skin.jacketColor,
    roughness: skin.id === 'alok' ? 0.36 : skin.id === 'chrono' ? 0.28 : 0.62,
    metalness: skin.id === 'chrono' || skin.id === 'a124' ? 0.45 : skin.id === 'alok' ? 0.18 : 0.12,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: skin.accentColor,
    roughness: 0.26,
    metalness: skin.id === 'wukong' || skin.id === 'hiphop' || skin.id === 'alok' ? 0.82 : 0.55,
  });
  const matPants = new THREE.MeshStandardMaterial({
    color: skin.pantsColor,
    roughness: 0.74,
    metalness: 0.08,
  });
  const matSkin = new THREE.MeshStandardMaterial({
    color: skin.skinTone,
    roughness: 0.54,
    metalness: 0.02,
  });
  const matFace = new THREE.MeshStandardMaterial({
    map: getCharacterFaceTexture(skin),
    roughness: skin.id === 'criminal_red' ? 0.35 : 0.52,
    metalness: 0.02,
  });
  const matHair = new THREE.MeshStandardMaterial({
    color: skin.hairColor,
    roughness: 0.64,
    metalness: 0.08,
  });
  const matBoots = new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.38, metalness: 0.4 });
  const matUndershirt = new THREE.MeshStandardMaterial({
    color: isBareChest
      ? skin.skinTone
      : skin.id === 'skyler'
      ? 0x09090b
      : skin.id === 'hayato' || skin.id === 'antonio' || skin.id === 'caroline'
      ? 0xf8fafc
      : 0x111827,
    roughness: isBareChest ? 0.54 : 0.76,
    metalness: 0.05,
  });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.92 });
  const matVisor = new THREE.MeshStandardMaterial({
    color: skin.visorColor,
    roughness: 0.12,
    metalness: 0.9,
    emissive: skin.visorColor,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.74,
  });
  const matShades = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.08,
    metalness: 0.95,
    emissive: skin.visorColor,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.68,
  });

  // Sculpted Athletic Legs (hip pivot at y = 0.90)
  const makeLeg = (side: -1 | 1) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.13, 0.90, 0);

    const hip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), matPants);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.084, 0.26, 6, 12), matPants);
    thigh.position.y = -0.20;

    // Kelly racing stripe down pants / tactical thigh strap
    if (skin.id === 'kelly') {
      const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.56, 4, 8), matJacket);
      stripe.position.set(side * 0.075, -0.39, 0);
      legGroup.add(stripe);
    }

    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.086, 0.045, 14), matAccent);
    strap.position.y = -0.18;
    if (side === 1) {
      const holster = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.08, 4, 8), matBoots);
      holster.position.set(0.086, -0.19, 0.01);
      legGroup.add(holster);
    } else if (skin.id === 'hiphop') {
      const cargoPocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.08, 4, 8), matAccent);
      cargoPocket.position.set(-0.082, -0.22, 0);
      legGroup.add(cargoPocket);
    }

    // Sculpted knee joint & contoured knee guard
    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), matPants);
    kneeJoint.position.y = -0.41;
    const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8, 0, Math.PI), matAccent);
    kneePad.position.set(0, -0.41, 0.048);

    // Tapered calf / shin
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, 0.23, 6, 12), matPants);
    shin.position.y = -0.58;

    // Sculpted Combat Boot / Sneaker
    const ankleCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.064, 0.09, 12), matBoots);
    ankleCuff.position.y = -0.75;
    const bootUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.11, 6, 10), matBoots);
    bootUpper.rotation.x = Math.PI / 2;
    bootUpper.position.set(0, -0.83, 0.06);
    const bootSole = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.125, 4, 10), matAccent);
    bootSole.rotation.x = Math.PI / 2;
    bootSole.scale.set(1.06, 1, 0.32);
    bootSole.position.set(0, -0.88, 0.062);

    legGroup.add(hip, thigh, strap, kneeJoint, kneePad, shin, ankleCuff, bootUpper, bootSole);
    return legGroup;
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyPivot.add(leftLeg, rightLeg);

  // Sculpted Torso (waist pivot at y = 0.90)
  const torso = new THREE.Group();
  torso.position.set(0, 0.90, 0);
  bodyPivot.add(torso);

  // Pelvis & Tactical Belt
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.185, 0.14, 14), matPants);
  pelvis.scale.set(1.15, 1, 0.72);
  pelvis.position.y = 0.05;

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.182, 0.055, 14), matBoots);
  belt.scale.set(1.16, 1, 0.74);
  belt.position.y = 0.11;

  const beltBuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 6), matAccent);
  beltBuckle.rotation.x = Math.PI / 2;
  beltBuckle.position.set(0, 0.11, 0.135);

  const beltPouchL = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.055, 4, 8), matBoots);
  beltPouchL.position.set(-0.185, 0.1, 0.03);
  const beltPouchR = beltPouchL.clone();
  beltPouchR.position.x = 0.185;

  // Athletic V-Taper Core & Chest
  const coreWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.162, 0.22, 16), matUndershirt);
  coreWaist.scale.set(1.12, 1, 0.68);
  coreWaist.position.y = 0.23;

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.195, 0.28, 16), matUndershirt);
  chest.scale.set(1.16, 1, 0.72);
  chest.position.y = 0.45;

  // Wrap-around Jacket Body (open front V-cut so chest/undershirt/lapels show naturally!)
  const jacketWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.246, 0.208, 0.46, 16, 1, false, Math.PI * 0.16, Math.PI * 1.68),
    matJacket
  );
  jacketWrap.scale.set(1.18, 1, 0.76);
  jacketWrap.position.y = 0.37;

  // Sculpted Beveled Jacket Lapels
  const lapelGeoL = createBeveledLapel(-1);
  const lapelL = new THREE.Mesh(lapelGeoL, skin.id === 'k' ? matAccent : matJacket);
  lapelL.position.set(-0.02, 0.22, 0.145);
  lapelL.rotation.y = 0.22;

  const lapelGeoR = createBeveledLapel(1);
  const lapelR = new THREE.Mesh(lapelGeoR, skin.id === 'k' ? matAccent : matJacket);
  lapelR.position.set(0.02, 0.22, 0.145);
  lapelR.rotation.y = -0.22;

  // Popped Collar
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.132, 0.152, 0.10, 14, 1, true, Math.PI * 0.28, Math.PI * 1.44),
    skin.id === 'alok' || skin.id === 'wukong' ? matAccent : matJacket
  );
  collar.position.set(0, 0.60, -0.01);

  torso.add(
    pelvis,
    belt,
    beltBuckle,
    beltPouchL,
    beltPouchR,
    coreWaist,
    chest,
    jacketWrap,
    lapelL,
    lapelR,
    collar
  );

  // Character-Specific Torso Silhouette & Gear
  if (skin.id === 'chrono') {
    // Chrono CR7 Cyber Armor + Glowing Cyan Time-Turner Reactor Core
    const armorPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.202, 0.22, 16), matJacket);
    armorPlate.scale.set(1.18, 1, 0.78);
    armorPlate.position.set(0, 0.45, 0.01);
    const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 18), matMetal);
    reactorRing.position.set(0, 0.45, 0.175);
    const reactorCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 1), matVisor);
    reactorCore.scale.set(1, 1, 0.4);
    reactorCore.position.set(0, 0.45, 0.18);
    torso.add(armorPlate, reactorRing, reactorCore);
  } else if (skin.id === 'alok') {
    // DJ Alok Gold Chain + Flowing Red/Gold Coat Tail
    const goldChain = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.011, 8, 18), matAccent);
    goldChain.position.set(0, 0.54, 0.085);
    goldChain.rotation.x = 0.72;
    const coatTail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.25, 0.28, 12, 1, true, Math.PI * 0.55, Math.PI * 0.9),
      matJacket
    );
    coatTail.scale.set(1.15, 1, 0.72);
    coatTail.position.set(0, 0.0, -0.02);
    const coatHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.248, 0.252, 0.035, 12, 1, true, Math.PI * 0.55, Math.PI * 0.9),
      matAccent
    );
    coatHem.scale.set(1.15, 1, 0.72);
    coatHem.position.set(0, -0.13, -0.02);
    torso.add(goldChain, coatTail, coatHem);
  } else if (skin.id === 'k') {
    // K Martial Arts Black Belt + Hanging Sash Tails
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.192, 0.06, 14), matBoots);
    sash.scale.set(1.16, 1, 0.76);
    sash.position.y = 0.14;
    const sashTailL = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.18, 4, 8), matBoots);
    sashTailL.position.set(-0.04, 0.04, 0.145);
    sashTailL.rotation.z = -0.22;
    const sashTailR = sashTailL.clone();
    sashTailR.position.x = 0.04;
    sashTailR.rotation.z = 0.22;
    torso.add(sash, sashTailL, sashTailR);
  } else if (skin.id === 'skyler') {
    // Skyler Pop-Star Turtleneck + Silver Tie/Pin
    const turtleneck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.092, 0.10, 14), matUndershirt);
    turtleneck.position.set(0, 0.61, 0);
    const lapelPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), matVisor);
    lapelPin.position.set(0.085, 0.48, 0.17);
    torso.add(turtleneck, lapelPin);
  } else if (skin.id === 'wukong') {
    // Wukong Monkey King Golden Chest Armor & Curved Tail
    const chestArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.205, 0.24, 14), matAccent);
    chestArmor.scale.set(1.18, 1, 0.76);
    chestArmor.position.set(0, 0.44, 0.01);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.08, -0.14),
      new THREE.Vector3(0.06, 0.04, -0.34),
      new THREE.Vector3(0.14, 0.22, -0.46),
      new THREE.Vector3(0.08, 0.42, -0.42),
    ]);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.025, 8, false), matHair);
    torso.add(chestArmor, tailMesh);
  } else if (skin.id === 'hayato') {
    // Hayato Samurai Katana Scabbard + Handguard across back + Coat tail
    const scabbard = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.94, 8), matBoots);
    scabbard.position.set(0.04, 0.42, -0.24);
    scabbard.rotation.z = -0.58;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), matAccent);
    hilt.position.set(-0.26, 0.84, -0.24);
    hilt.rotation.z = -0.58;
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), matMetal);
    tsuba.position.set(-0.20, 0.76, -0.24);
    tsuba.rotation.z = -0.58;
    torso.add(scabbard, hilt, tsuba);
  } else if (skin.id === 'hiphop') {
    // Hip-Hop S2 Gold Chain + Medallion
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 8, 18), matAccent);
    chain.position.set(0, 0.53, 0.10);
    chain.rotation.x = 0.65;
    const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.016, 6), matAccent);
    medallion.rotation.x = Math.PI / 2;
    medallion.position.set(0, 0.45, 0.168);
    torso.add(chain, medallion);
  } else if (skin.id === 'andrew') {
    // Andrew Wolf: Police tactical Kevlar vest + silver shield badge
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.205, 0.24, 14), matBoots);
    vest.scale.set(1.18, 1, 0.78);
    vest.position.set(0, 0.44, 0.01);
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 6), matAccent);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(-0.1, 0.49, 0.175);
    torso.add(vest, badge);
  } else if (skin.id === 'antonio' || skin.id === 'joseph') {
    // Formal tailored tie / waistcoat trim
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.02), matAccent);
    tie.position.set(0, 0.42, 0.16);
    torso.add(tie);
  } else if (skin.id === 'paloma') {
    // Cross-chest tactical ammo bandolier
    const bandolier = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.46, 0.34), matAccent);
    bandolier.position.set(0, 0.41, 0.01);
    bandolier.rotation.z = 0.55;
    torso.add(bandolier);
  } else if (skin.id === 'orion' || skin.id === 'a124') {
    // Glowing chest energy core (Crimson Crush / A124 Android core)
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 1), matVisor);
    core.scale.set(1, 1, 0.45);
    core.position.set(0, 0.46, 0.175);
    torso.add(core);
  }

  // Sculpted Tactical Backpack (compact so character silhouette shines!)
  const backpack = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.14, 6, 10), matBoots);
  backpack.scale.set(1.15, 1, 0.58);
  backpack.position.set(0, 0.39, -0.18);
  const packPlate = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.08, 4, 8), matAccent);
  packPlate.scale.set(1.2, 1, 0.4);
  packPlate.position.set(0, 0.41, -0.245);
  torso.add(backpack, packPlate);

  // Sculpted Head & Face (neck pivot at y = 0.62)
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.074, 0.10, 12), matSkin);
  neck.position.y = 0.04;

  // Anatomical Cranium with UV-aligned canvas face texture facing +Z
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.132, 20, 16), matFace);
  cranium.scale.set(0.92, 1.06, 0.96);
  cranium.rotation.y = -Math.PI / 2;
  cranium.position.y = 0.21;

  // Sculpted Nose Bridge & Human Ears
  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.022, 4, 6), matSkin);
  nose.position.set(0, 0.195, 0.128);
  nose.rotation.x = -0.32;

  if (skin.id !== 'criminal_red') {
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), matSkin);
    earL.scale.set(0.45, 0.95, 0.72);
    earL.position.set(-0.122, 0.20, -0.01);
    const earR = earL.clone();
    earR.position.x = 0.122;
    head.add(earL, earR);
  }

  head.add(neck, cranium, nose);

  // Character-Specific Authentic Hairstyles, Glasses, Headphones & Masks
  if (skin.id === 'alok') {
    // DJ Alok: Dreadlock/fade locks + white-framed neon amber sunglasses + over-ear DJ headphones
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
      matHair
    );
    hairBase.position.set(0, 0.222, -0.008);
    head.add(hairBase);
    for (let i = -3; i <= 3; i++) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 6), matHair);
      lock.position.set(i * 0.026, 0.335 - Math.abs(i) * 0.008, 0.02 - Math.abs(i) * 0.012);
      lock.rotation.x = -0.65;
      lock.rotation.z = -i * 0.08;
      head.add(lock);
    }

    // White-framed amber sunglasses
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.3 });
    const glassBar = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.02), frameMat);
    glassBar.position.set(0, 0.228, 0.126);
    const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.015, 10), matVisor);
    lensL.rotation.x = Math.PI / 2;
    lensL.position.set(-0.046, 0.214, 0.124);
    const lensR = lensL.clone();
    lensR.position.x = 0.046;
    head.add(glassBar, lensL, lensR);

    // Over-Ear DJ Headphones
    const hpBand = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 8, 20, Math.PI), matBoots);
    hpBand.position.set(0, 0.215, 0);
    const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.035, 12), matBoots);
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(-0.135, 0.205, 0);
    const cupR = cupL.clone();
    cupR.position.x = 0.135;
    const ledL = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.007, 6, 14), matVisor);
    ledL.rotation.y = Math.PI / 2;
    ledL.position.set(-0.153, 0.205, 0);
    const ledR = ledL.clone();
    ledR.position.x = 0.153;
    head.add(hpBand, cupL, cupR, ledL, ledR);
  } else if (skin.id === 'chrono') {
    // Chrono (CR7): Swept spiky brown-black hair + cyan holographic ear-comms
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matHair
    );
    hairBase.position.set(0, 0.222, -0.01);
    head.add(hairBase);
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.10, 6), matHair);
      spike.position.set(i * 0.034, 0.34 - Math.abs(i) * 0.012, 0.035);
      spike.rotation.x = 0.35;
      spike.rotation.z = -i * 0.16;
      head.add(spike);
    }
    const earComms = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.024, 10), matVisor);
    earComms.rotation.z = Math.PI / 2;
    earComms.position.set(-0.13, 0.205, 0);
    head.add(earComms);
  } else if (skin.id === 'k') {
    // K (Captain Booyah): Wild swept crimson spiky hair
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matHair
    );
    hairBase.position.set(0, 0.22, -0.01);
    head.add(hairBase);
    for (let i = -3; i <= 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.125, 6), matHair);
      spike.position.set(i * 0.03, 0.345 - Math.abs(i) * 0.01, -0.01 + (i % 2) * 0.03);
      spike.rotation.x = -0.35;
      spike.rotation.z = -i * 0.22;
      head.add(spike);
    }
  } else if (skin.id === 'skyler') {
    // Skyler: Sleek silver-white parted K-pop hair + tinted designer sunglasses
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matHair
    );
    hairBase.position.set(0, 0.224, -0.01);
    const bangL = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.09, 4, 8), matHair);
    bangL.position.set(-0.055, 0.295, 0.078);
    bangL.rotation.set(0.55, 0.2, 0.48);
    const bangR = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.09, 4, 8), matHair);
    bangR.position.set(0.055, 0.295, 0.078);
    bangR.rotation.set(0.55, -0.2, -0.48);

    // Designer sunglasses
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.032, 0.015), matShades);
    lensL.position.set(-0.044, 0.215, 0.126);
    const lensR = lensL.clone();
    lensR.position.x = 0.044;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.009, 0.014), matMetal);
    bridge.position.set(0, 0.22, 0.126);
    head.add(hairBase, bangL, bangR, lensL, lensR, bridge);
  } else if (skin.id === 'wukong') {
    // Wukong: Golden Monkey King circlet + twin curved horns + layered wild mane
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      matHair
    );
    hairBase.position.set(0, 0.22, -0.015);
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.014, 8, 22), matAccent);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.set(0, 0.268, 0);
    const crownCrest = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 5), matAccent);
    crownCrest.position.set(0, 0.305, 0.125);
    crownCrest.rotation.x = 0.25;
    head.add(hairBase, circlet, crownCrest);
    for (let i = -3; i <= 3; i++) {
      const mane = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.13, 6), matHair);
      mane.position.set(i * 0.035, 0.34, -0.04);
      mane.rotation.x = -0.65;
      mane.rotation.z = -i * 0.22;
      head.add(mane);
    }
  } else if (skin.id === 'kelly') {
    // Kelly: Smooth bob + high swaying athletic ponytail + hair band
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      matHair
    );
    hairTop.position.set(0, 0.222, -0.012);
    const scrunchy = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.01, 6, 12), matJacket);
    scrunchy.position.set(0, 0.28, -0.125);
    scrunchy.rotation.x = 0.6;
    const ponytail = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.20, 6, 10), matHair);
    ponytail.position.set(0, 0.21, -0.185);
    ponytail.rotation.x = 0.62;
    head.add(hairTop, scrunchy, ponytail);
  } else if (skin.id === 'hayato') {
    // Hayato: Messy samurai locks + crimson hachimaki headband + fluttering tails
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      matHair
    );
    hairTop.position.set(0, 0.225, -0.01);
    const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.134, 0.134, 0.034, 16), matAccent);
    headband.position.set(0, 0.258, 0);
    const ribbonL = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.16, 4, 6), matAccent);
    ribbonL.position.set(0.055, 0.19, -0.155);
    ribbonL.rotation.x = 0.42;
    const ribbonR = ribbonL.clone();
    ribbonR.position.set(0.02, 0.17, -0.165);
    ribbonR.rotation.x = 0.56;
    head.add(hairTop, headband, ribbonL, ribbonR);
  } else if (skin.id === 'moco') {
    // Moco: Emerald asymmetric cyberpunk bob + glowing cyber-visor
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.139, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.012);
    const sideLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.13, 4, 8), matHair);
    sideLock.position.set(-0.095, 0.20, 0.065);
    sideLock.rotation.z = 0.2;
    const cyberGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.038, 16, 1, true, -0.65, 1.3), matVisor);
    cyberGlass.position.set(0, 0.218, 0.005);
    head.add(hairTop, sideLock, cyberGlass);
  } else if (skin.id === 'criminal_red') {
    // Red Criminal: Iconic pointed red heist hood wrapping back of cranium
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14, 0.45, Math.PI * 1.48), matJacket);
    hood.scale.set(1.0, 1.08, 1.05);
    hood.rotation.y = Math.PI * 0.35;
    hood.position.set(0, 0.215, -0.01);
    const hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 12), matJacket);
    hoodPeak.position.set(0, 0.29, -0.105);
    hoodPeak.rotation.x = -0.92;
    head.add(hood, hoodPeak);
  } else if (skin.id === 'hiphop') {
    // Hip-Hop S2: Backward snapback cap + gold tinted shades
    const capCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matJacket
    );
    capCrown.position.set(0, 0.23, -0.005);
    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.018, 14, 1, false, Math.PI * 0.72, Math.PI * 0.56), matAccent);
    capBrim.position.set(0, 0.238, -0.06);
    capBrim.rotation.x = -0.15;
    const shadeL = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.032, 0.015), matVisor);
    shadeL.position.set(-0.044, 0.215, 0.126);
    const shadeR = shadeL.clone();
    shadeR.position.x = 0.044;
    head.add(capCrown, capBrim, shadeL, shadeR);
  } else if (skin.id === 'andrew') {
    // Andrew Wolf: Short salt-and-pepper crew cut + tactical earpiece
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.136, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.006);
    const comms = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 8), matAccent);
    comms.rotation.z = Math.PI / 2;
    comms.position.set(0.128, 0.205, 0);
    head.add(hairTop, comms);
  } else if (skin.id === 'maxim') {
    // Maxim: Blue hoodie hood + forehead racer goggles
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.146, 16, 12, 0.4, Math.PI * 1.5),
      matJacket
    );
    hood.rotation.y = Math.PI * 0.35;
    hood.position.set(0, 0.222, -0.015);
    const goggleL = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 10), matVisor);
    goggleL.rotation.x = Math.PI / 2;
    goggleL.position.set(-0.04, 0.285, 0.115);
    const goggleR = goggleL.clone();
    goggleR.position.x = 0.04;
    head.add(hood, goggleL, goggleR);
  } else if (skin.id === 'kla') {
    // Kla: Short black fighter crop + crimson/amber Muay Thai headband
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.136, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.006);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.032, 16), matAccent);
    band.position.set(0, 0.26, 0);
    head.add(hairTop, band);
  } else if (skin.id === 'caroline') {
    // Caroline: Blonde twin-tails with pink scrunchies
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.01);
    head.add(hairTop);
    [-1, 1].forEach((side) => {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 10), matAccent);
      tie.position.set(side * 0.125, 0.245, -0.04);
      tie.rotation.y = side * 0.6;
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.17, 6, 8), matHair);
      tail.position.set(side * 0.155, 0.16, -0.05);
      tail.rotation.z = side * 0.22;
      head.add(tie, tail);
    });
  } else if (skin.id === 'kapella') {
    // Kapella: Long wavy blonde idol hair + headset microphone
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      matHair
    );
    hairTop.position.set(0, 0.222, -0.015);
    const backLocks = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.2, 6, 10), matHair);
    backLocks.position.set(0, 0.11, -0.105);
    const mic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), matAccent);
    mic.position.set(-0.085, 0.155, 0.11);
    mic.rotation.y = 0.55;
    head.add(hairTop, backLocks, mic);
  } else if (skin.id === 'steffie') {
    // Steffie: Neon magenta double space-buns + teal headband
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      matHair
    );
    hairTop.position.set(0, 0.222, -0.01);
    const bunL = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), matHair);
    bunL.position.set(-0.105, 0.325, -0.02);
    const bunR = bunL.clone();
    bunR.position.x = 0.105;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.136, 0.136, 0.028, 16), matAccent);
    band.position.set(0, 0.262, 0);
    head.add(hairTop, bunL, bunR, band);
  } else if (skin.id === 'a124') {
    // A124: Sleek cyber-bob + glowing cyan side ribbons
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.139, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.012);
    const cyberCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), matVisor);
    cyberCrest.position.set(0, 0.275, 0.128);
    head.add(hairTop, cyberCrest);
  } else if (skin.id === 'paloma' || skin.id === 'laura') {
    // Paloma / Laura: Sleek mid-length wavy / bob hairstyle
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      matHair
    );
    hairTop.position.set(0, 0.222, -0.012);
    const backHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.15, 6, 10), matHair);
    backHair.position.set(0, 0.125, -0.105);
    head.add(hairTop, backHair);
  } else if (skin.id === 'joseph') {
    // Joseph: Distinguished slicked silver hair + blue-tinted aviator shades
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.012);
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.032, 0.015), matShades);
    lensL.position.set(-0.044, 0.215, 0.126);
    const lensR = lensL.clone();
    lensR.position.x = 0.044;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.014), matMetal);
    bridge.position.set(0, 0.22, 0.126);
    head.add(hairTop, lensL, lensR, bridge);
  } else if (skin.id === 'orion') {
    // Orion: Deep crimson assassin hood
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.146, 16, 14, 0.42, Math.PI * 1.5),
      matJacket
    );
    hood.rotation.y = Math.PI * 0.35;
    hood.position.set(0, 0.22, -0.015);
    head.add(hood);
  } else if (skin.id === 'tatsuya') {
    // Tatsuya: Spiky black rebel hair with crimson streak
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matHair
    );
    hairTop.position.set(0, 0.222, -0.01);
    head.add(hairTop);
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.026, 0.1, 6),
        i === 0 ? matAccent : matHair
      );
      spike.position.set(i * 0.032, 0.34 - Math.abs(i) * 0.01, 0.035);
      spike.rotation.x = 0.4;
      spike.rotation.z = -i * 0.16;
      head.add(spike);
    }
  } else {
    // Antonio / Rafael / default sculpted swept hair
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      matHair
    );
    hairTop.position.set(0, 0.224, -0.01);
    head.add(hairTop);
  }

  // Sculpted Articulated Arms (shoulder pivot at y = 0.53)
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.295, 0.53, 0);

    const upperMat = isBareArms ? matSkin : matJacket;
    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.076, 12, 10), isBareArms ? matSkin : matJacket);
    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.088, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
      skin.id === 'wukong' || skin.id === 'chrono' ? matAccent : matJacket
    );
    pauldron.position.set(side * 0.015, 0.01, 0);
    pauldron.rotation.z = -side * 0.35;

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.16, 6, 10), upperMat);
    upperArm.position.y = -0.14;

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), matSkin);
    elbow.position.y = -0.27;

    const forearmMat = skin.id === 'chrono' || skin.id === 'skyler' || skin.id === 'criminal_red' || skin.id === 'hiphop' ? matJacket : matSkin;
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.16, 6, 10), forearmMat);
    forearm.position.set(0, -0.38, 0.035);
    forearm.rotation.x = -0.22;

    const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.07, 12), matAccent);
    bracer.position.set(0, -0.40, 0.042);
    bracer.rotation.x = -0.22;

    const glove = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.045, 4, 8), matBoots);
    glove.position.set(0, -0.51, 0.075);

    arm.add(shoulderBall, pauldron, upperArm, elbow, forearm, bracer, glove);
    return arm;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  torso.add(leftArm, rightArm);

  // Weapon mount attached to rightArm hand
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.50, 0.12);
  rightArm.add(weaponMount);

  let currentWeaponMesh = createWeaponModel(weaponId, weaponSkinId);
  weaponMount.add(currentWeaponMesh);

  // Active Character Skill Aura (shown in-match when Q / Active Skill triggers)
  const skillAuraGroup = new THREE.Group();
  skillAuraGroup.visible = false;
  root.add(skillAuraGroup);

  const auraRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.045, 8, 32),
    new THREE.MeshBasicMaterial({
      color: skin.visorColor,
      transparent: true,
      opacity: 0.78,
    })
  );
  auraRing.rotation.x = Math.PI / 2;
  auraRing.position.y = 0.08;
  skillAuraGroup.add(auraRing);

  if (skin.id === 'chrono' || skin.id === 'orion' || skin.id === 'steffie') {
    // Force-field / Crimson / Graffiti Refuge protective dome!
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshBasicMaterial({
        color: skin.visorColor,
        transparent: true,
        opacity: 0.2,
        wireframe: true,
      })
    );
    dome.position.y = 0.55;
    skillAuraGroup.add(dome);
  }

  // Parachute Group (hidden unless parachuting)
  const parachuteGroup = new THREE.Group();
  parachuteGroup.position.set(0, 2.3, -0.1);
  parachuteGroup.visible = false;
  root.add(parachuteGroup);

  const canopyMat = new THREE.MeshStandardMaterial({
    color: parachuteSkin.color,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const canopyTrimMat = new THREE.MeshStandardMaterial({
    color: parachuteSkin.accent,
    roughness: 0.55,
    metalness: 0.2,
  });

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.46),
    canopyMat
  );
  canopy.scale.set(1.35, 0.72, 0.95);
  canopy.position.y = 0.85;
  const canopyStripe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.65), canopyTrimMat);
  canopyStripe.position.y = 1.95;
  parachuteGroup.add(canopy, canopyStripe);

  const lineMat = new THREE.LineBasicMaterial({ color: 0xe2e8f0 });
  const lineOffsets = [
    [-1.7, 1.0, -0.7],
    [1.7, 1.0, -0.7],
    [-1.7, 1.0, 0.7],
    [1.7, 1.0, 0.7],
  ];
  lineOffsets.forEach(([lx, ly, lz]) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lx * 0.15, -0.8, lz * 0.15),
      new THREE.Vector3(lx, ly, lz),
    ]);
    parachuteGroup.add(new THREE.Line(geo, lineMat));
  });

  // Invisible simplified raycast hitboxes for crisp Headshot vs Bodyshot detection
  const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitBodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.38, 0.5), invisibleMat);
  hitBodyMesh.position.set(0, 0.72, 0);
  const hitHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), invisibleMat);
  hitHeadMesh.position.set(0, 1.66, 0);
  root.add(hitBodyMesh, hitHeadMesh);

  root.traverse((obj) => {
    if (
      (obj as THREE.Mesh).isMesh &&
      obj !== hitBodyMesh &&
      obj !== hitHeadMesh &&
      obj.parent !== skillAuraGroup
    ) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    weaponMount,
    parachuteGroup,
    skillAuraGroup,
    hitBodyMesh,
    hitHeadMesh,
    setWeapon: (nextId: WeaponId, nextSkinId?: string) => {
      weaponMount.remove(currentWeaponMesh);
      currentWeaponMesh = createWeaponModel(nextId, nextSkinId);
      weaponMount.add(currentWeaponMesh);
    },
    setParachuteSkin: (nextSkin: VaultOption) => {
      canopyMat.color.setHex(nextSkin.color);
      canopyTrimMat.color.setHex(nextSkin.accent);
    },
  };
}

export function createPlaneModel(): { group: THREE.Group; propellers: THREE.Object3D[] } {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.45, metalness: 0.65 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.9 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 16, 12), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.68, 12, 10), hullMat);
  nose.scale.set(1, 0.9, 1.4);
  nose.position.z = 8.0;
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.8), glassMat);
  cockpit.position.set(0, 0.95, 7.2);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(20, 0.35, 3.4), hullMat);
  wing.position.set(0, 1.1, 1.0);
  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.38, 0.7), stripeMat);
  wingStripe.position.set(0, 1.1, 1.8);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.8, 2.8), stripeMat);
  tailFin.position.set(0, 2.4, -7.0);
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.25, 1.8), hullMat);
  hStab.position.set(0, 1.2, -7.2);

  group.add(fuselage, nose, cockpit, wing, wingStripe, tailFin, hStab);

  const propellers: THREE.Object3D[] = [];
  [-5.2, 5.2].forEach((xPos) => {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 2.2, 10), darkMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(xPos, 0.75, 2.2);
    const prop = new THREE.Group();
    prop.position.set(xPos, 0.75, 3.45);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.08), darkMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.08), darkMat);
    prop.add(blade1, blade2);
    group.add(engine, prop);
    propellers.push(prop);
  });

  return { group, propellers };
}

export type BuildingType =
  | 'clock_tower'
  | 'factory'
  | 'house'
  | 'villa_house'
  | 'cabin_house'
  | 'watchtower'
  | 'crate_cluster'
  | 'perimeter_wall';

export function createBuildingMesh(
  type: BuildingType,
  textures: GameTextures,
  biome: boolean | MapId
): { group: THREE.Group; colliders: { minX: number; maxX: number; minZ: number; maxZ: number; height: number }[] } {
  const group = new THREE.Group();
  const colliders: { minX: number; maxX: number; minZ: number; maxZ: number; height: number }[] = [];
  const isDesert = biome === true || biome === 'purgatory';
  const isAlpine = biome === 'alpine';

  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    color: isDesert ? 0xd9c2a3 : isAlpine ? 0xe2e8f0 : 0xdbe0e6,
    roughness: 0.85,
    metalness: 0.05,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: textures.brickWall,
    color: isDesert ? 0xd4a373 : isAlpine ? 0xcbd5e1 : 0xdfa895,
    roughness: 0.86,
    metalness: 0.04,
  });
  const plankMat = new THREE.MeshStandardMaterial({
    map: textures.woodPlank,
    color: isDesert ? 0xc89b6e : isAlpine ? 0xa37852 : 0xb57c4a,
    roughness: 0.82,
    metalness: 0.04,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.roofShingle,
    color: isDesert ? 0x9a4e32 : isAlpine ? 0x475569 : 0x8b331b,
    roughness: 0.68,
    metalness: 0.16,
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.88,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    map: textures.corrugatedMetal,
    color: isAlpine ? 0x94a3b8 : 0x64748b,
    roughness: 0.45,
    metalness: 0.7,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodCrate,
    roughness: 0.8,
    metalness: 0.05,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: isDesert ? 0x8c735b : isAlpine ? 0x475569 : 0x525d6b,
    roughness: 0.9,
    metalness: 0.05,
  });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
  const warmGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.35,
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: isDesert ? 0x7c2d12 : isAlpine ? 0x1e3a5f : 0x334155,
    roughness: 0.65,
    metalness: 0.15,
  });
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: isDesert ? 0xb89f74 : isAlpine ? 0x94a3b8 : 0x8a795d,
    roughness: 0.94,
    metalness: 0.02,
  });

  const addWindow = (
    wx: number,
    wy: number,
    wz: number,
    rotY: number,
    width = 1.6,
    height = 1.35
  ) => {
    const win = new THREE.Group();
    win.position.set(wx, wy, wz);
    win.rotation.y = rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, height + 0.22, 0.22), darkTrim);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.25), warmGlassMat);
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, 0.28), darkTrim);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.28), darkTrim);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.12, 0.34), stoneMat);
    sill.position.y = -height / 2 - 0.1;
    const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.32, height + 0.08, 0.14), shutterMat);
    shutterL.position.set(-width / 2 - 0.28, 0, 0.06);
    const shutterR = shutterL.clone();
    shutterR.position.x = width / 2 + 0.28;
    win.add(frame, pane, mullionV, mullionH, sill, shutterL, shutterR);
    group.add(win);
  };

  if (type === 'clock_tower') {
    // Iconic Clock Tower with stone plinth, trim balconies, glowing clock faces & sloped spire
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(15.2, 1.2, 15.2), stoneMat);
    plinth.position.y = 0.6;
    const base = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), brickMat);
    base.position.y = 4.1;
    const mid = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 10), wallMat);
    mid.position.y = 11.1;
    const spireBase = new THREE.Mesh(new THREE.BoxGeometry(7, 8, 7), wallMat);
    spireBase.position.y = 18.6;
    const clockFaceMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.42,
      roughness: 0.4,
    });
    const clockFront = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.3, 16), clockFaceMat);
    clockFront.rotation.x = Math.PI / 2;
    clockFront.position.set(0, 19.1, 3.6);
    const clockBack = clockFront.clone();
    clockBack.position.z = -3.6;
    const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 6.8, 4), roofMat);
    spireRoof.rotation.y = Math.PI / 4;
    spireRoof.position.y = 25.8;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.6, 14.8), darkTrim);
    trim.position.y = 7.7;
    const trimUpper = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.5, 10.8), darkTrim);
    trimUpper.position.y = 14.6;
    addWindow(-3.6, 4.2, 7.05, 0, 1.6, 1.8);
    addWindow(3.6, 4.2, 7.05, 0, 1.6, 1.8);
    addWindow(0, 11.5, 5.05, 0, 1.8, 1.8);

    group.add(plinth, base, mid, spireBase, clockFront, clockBack, spireRoof, trim, trimUpper);
    if (isAlpine) {
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 4), snowCapMat);
      snowCap.rotation.y = Math.PI / 4;
      snowCap.position.y = 27.9;
      group.add(snowCap);
    }
    colliders.push({ minX: -7.2, maxX: 7.2, minZ: -7.2, maxZ: 7.2, height: 28 });
  } else if (type === 'factory') {
    // Factory Hangar (open corridor for gunfights + steel trusses & interior crates)
    const pad = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.35, 24), stoneMat);
    pad.position.y = 0.175;
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.5, 22), metalMat);
    leftWall.position.set(-9.5, 4.25, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.5, 22), metalMat);
    rightWall.position.set(9.5, 4.25, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(22.8, 1.0, 23.2), roofMat);
    roof.position.set(0, 9.0, 0);
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.5, 1.4), darkTrim);
    pillarL.position.set(-4, 4.25, 8);
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.5, 1.4), darkTrim);
    pillarR.position.set(4, 4.25, -8);
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), woodMat);
    crate1.position.set(-3.2, 1.25, -2.5);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 2.4), woodMat);
    crate2.position.set(3.8, 1.15, 3.2);
    const vent1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 2.2), darkTrim);
    vent1.position.set(-4.5, 10.0, -4);
    const vent2 = vent1.clone();
    vent2.position.set(4.5, 10.0, 4);

    group.add(pad, leftWall, rightWall, roof, pillarL, pillarR, crate1, crate2, vent1, vent2);
    if (isAlpine) {
      const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.25, 22.8), snowCapMat);
      roofSnow.position.set(0, 9.62, 0);
      group.add(roofSnow);
    }
    colliders.push(
      { minX: -10.6, maxX: -8.4, minZ: -11, maxZ: 11, height: 9 },
      { minX: 8.4, maxX: 10.6, minZ: -11, maxZ: 11, height: 9 },
      { minX: -4.5, maxX: -1.9, minZ: -3.8, maxZ: -1.2, height: 2.3 },
      { minX: 2.6, maxX: 5.0, minZ: 2.0, maxZ: 4.4, height: 2.1 }
    );
  } else if (type === 'house') {
    // Realistic Multi-Part Tactical House: stone foundation, covered front porch, brick/stucco walls,
    // framed glowing windows with shutters, open doorway with ajar door, interior partition & table, pitched shingled roof & chimney
    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.42, 10.6), stoneMat);
    floorSlab.position.y = 0.21;
    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.36, 2.5), plankMat);
    porchFloor.position.set(0, 0.18, 6.2);
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.75), stoneMat);
    step1.position.set(0, 0.09, 7.65);

    // Exterior walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.0, 4.6, 0.72), brickMat);
    backWall.position.set(0, 2.5, -4.64);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.72, 4.6, 10.0), brickMat);
    leftWall.position.set(-4.64, 2.5, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.72, 4.6, 10.0), brickMat);
    rightWall.position.set(4.64, 2.5, 0);
    const frontHalfL = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 0.72), brickMat);
    frontHalfL.position.set(-3.3, 2.5, 4.64);
    const frontHalfR = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 0.72), brickMat);
    frontHalfR.position.set(3.3, 2.5, 4.64);
    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 0.74), wallMat);
    doorHeader.position.set(0, 4.15, 4.64);

    // Door frame + ajar timber door
    const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.85), darkTrim);
    doorFrameL.position.set(-1.55, 1.9, 4.64);
    const doorFrameR = doorFrameL.clone();
    doorFrameR.position.x = 1.55;
    const ajarDoor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.0, 0.14), plankMat);
    ajarDoor.position.set(-0.92, 1.85, 3.9);
    ajarDoor.rotation.y = 1.05;

    // Covered porch posts + awning roof + railings
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.4, 0.24), plankMat);
    postL.position.set(-2.5, 1.9, 7.2);
    const postR = postL.clone();
    postR.position.x = 2.5;
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.26, 2.7), roofMat);
    porchRoof.position.set(0, 3.7, 6.2);
    porchRoof.rotation.x = 0.16;
    const railL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.16), darkTrim);
    railL.position.set(-2.05, 0.8, 7.2);
    const railR = railL.clone();
    railR.position.x = 2.05;

    // Pitched shingled roof + gable trim + chimney
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.2, 3.2, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6.38;
    const eaveTrim = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.26, 11.1), darkTrim);
    eaveTrim.position.y = 4.82;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.4, 1.15), stoneMat);
    chimney.position.set(-2.8, 6.9, -2.5);
    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.22, 1.38), darkTrim);
    chimneyCap.position.set(-2.8, 8.65, -2.5);

    // Interior furniture & tactical cover (wooden table + supply crate + warm ceiling bulb)
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.25), plankMat);
    tableTop.position.set(-2.2, 1.28, -1.6);
    const tableBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.86, 0.9), darkTrim);
    tableBase.position.set(-2.2, 0.82, -1.6);
    const interiorCrate = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.15, 1.35), woodMat);
    interiorCrate.position.set(2.4, 0.96, -2.2);
    const lampCord = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), darkTrim);
    lampCord.position.set(0, 4.35, 0);
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), warmGlassMat);
    lampBulb.position.set(0, 3.9, 0);

    // Framed glowing windows with sills & shutters on back, left, right, front wings
    addWindow(-3.3, 2.55, 5.02, 0, 1.4, 1.25);
    addWindow(3.3, 2.55, 5.02, 0, 1.4, 1.25);
    addWindow(-2.2, 2.55, -5.02, Math.PI, 1.6, 1.25);
    addWindow(2.2, 2.55, -5.02, Math.PI, 1.6, 1.25);
    addWindow(-5.02, 2.55, 0, -Math.PI / 2, 1.8, 1.25);
    addWindow(5.02, 2.55, 0, Math.PI / 2, 1.8, 1.25);

    group.add(
      floorSlab,
      porchFloor,
      step1,
      backWall,
      leftWall,
      rightWall,
      frontHalfL,
      frontHalfR,
      doorHeader,
      doorFrameL,
      doorFrameR,
      ajarDoor,
      postL,
      postR,
      porchRoof,
      railL,
      railR,
      roof,
      eaveTrim,
      chimney,
      chimneyCap,
      tableTop,
      tableBase,
      interiorCrate,
      lampCord,
      lampBulb
    );

    if (isAlpine) {
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(6.8, 2.3, 4), snowCapMat);
      snowCap.rotation.y = Math.PI / 4;
      snowCap.position.y = 6.95;
      const porchSnow = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 2.5), snowCapMat);
      porchSnow.position.set(0, 3.88, 6.2);
      porchSnow.rotation.x = 0.16;
      group.add(snowCap, porchSnow);
    }

    colliders.push(
      { minX: -5.0, maxX: 5.0, minZ: -5.05, maxZ: -4.2, height: 5.2 },
      { minX: -5.05, maxX: -4.2, minZ: -5.0, maxZ: 5.0, height: 5.2 },
      { minX: 4.2, maxX: 5.05, minZ: -5.0, maxZ: 5.0, height: 5.2 },
      { minX: -5.0, maxX: -1.6, minZ: 4.2, maxZ: 5.05, height: 5.2 },
      { minX: 1.6, maxX: 5.0, minZ: 4.2, maxZ: 5.05, height: 5.2 },
      { minX: -3.1, maxX: -1.3, minZ: -2.15, maxZ: -1.05, height: 1.35 },
      { minX: 1.7, maxX: 3.1, minZ: -2.9, maxZ: -1.5, height: 1.25 }
    );
  } else if (type === 'villa_house') {
    // Two-Story Compound Villa with ground floor interior, exterior stairs, upper lookout balcony & pitched roof
    const slab = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.45, 10.6), stoneMat);
    slab.position.y = 0.225;

    // Ground floor walls (open front doorway at x in [-1.7, 1.7])
    const back1 = new THREE.Mesh(new THREE.BoxGeometry(12.0, 4.4, 0.72), wallMat);
    back1.position.set(0, 2.4, -4.64);
    const left1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 4.4, 10.0), wallMat);
    left1.position.set(-5.64, 2.4, 0);
    const right1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 4.4, 10.0), wallMat);
    right1.position.set(5.64, 2.4, 0);
    const front1L = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.4, 0.72), wallMat);
    front1L.position.set(-3.9, 2.4, 4.64);
    const front1R = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.4, 0.72), wallMat);
    front1R.position.set(3.9, 2.4, 4.64);
    const front1Hdr = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.74), darkTrim);
    front1Hdr.position.set(0, 4.05, 4.64);

    // Second-floor deck + front lookout balcony
    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.4, 10.4), stoneMat);
    floor2.position.y = 4.65;
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.32, 2.2), plankMat);
    balcony.position.set(0, 4.65, 6.1);
    const balcRailFront = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.95, 0.16), darkTrim);
    balcRailFront.position.set(0, 5.28, 7.12);
    const balcRailL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 2.1), darkTrim);
    balcRailL.position.set(-6.05, 5.28, 6.1);

    // Exterior steel/wood staircase on the right side leading up to the balcony
    for (let s = 0; s < 6; s++) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.95), plankMat);
      tread.position.set(6.95, 0.65 + s * 0.72, 1.4 + s * 0.9);
      group.add(tread);
    }

    // Upper floor room (smaller penthouse set back for terrace cover)
    const upperBack = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.9, 0.65), brickMat);
    upperBack.position.set(-1.1, 6.8, -4.1);
    const upperLeft = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.9, 7.4), brickMat);
    upperLeft.position.set(-5.38, 6.8, -0.7);
    const upperRight = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.9, 7.4), brickMat);
    upperRight.position.set(3.18, 6.8, -0.7);
    const upperFrontL = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.9, 0.65), brickMat);
    upperFrontL.position.set(-3.9, 6.8, 2.7);
    const upperFrontR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.9, 0.65), brickMat);
    upperFrontR.position.set(1.9, 6.8, 2.7);

    // Upper roof + AC unit + chimney
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.8, 4), roofMat);
    roof2.rotation.y = Math.PI / 4;
    roof2.position.set(-1.1, 10.1, -0.7);
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.2), metalMat);
    acUnit.position.set(4.5, 5.3, -2.5);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 1.1), stoneMat);
    chimney.position.set(-4.0, 10.2, -2.8);

    // Interior cover crate + counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 1.1), plankMat);
    counter.position.set(-2.5, 1.0, -1.8);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 1.5), woodMat);
    crate.position.set(3.0, 1.05, -2.0);

    addWindow(-3.9, 2.5, 5.02, 0, 1.6, 1.3);
    addWindow(3.9, 2.5, 5.02, 0, 1.6, 1.3);
    addWindow(-2.5, 2.5, -5.02, Math.PI, 1.8, 1.3);
    addWindow(2.5, 2.5, -5.02, Math.PI, 1.8, 1.3);
    addWindow(-6.02, 2.5, 0, -Math.PI / 2, 1.9, 1.3);
    addWindow(-3.9, 6.8, 3.06, 0, 1.3, 1.2);
    addWindow(-5.74, 6.8, -0.7, -Math.PI / 2, 1.5, 1.2);

    group.add(
      slab,
      back1,
      left1,
      right1,
      front1L,
      front1R,
      front1Hdr,
      floor2,
      balcony,
      balcRailFront,
      balcRailL,
      upperBack,
      upperLeft,
      upperRight,
      upperFrontL,
      upperFrontR,
      roof2,
      acUnit,
      chimney,
      counter,
      crate
    );

    if (isAlpine) {
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.0, 4), snowCapMat);
      snowCap.rotation.y = Math.PI / 4;
      snowCap.position.set(-1.1, 10.6, -0.7);
      group.add(snowCap);
    }

    colliders.push(
      { minX: -6.0, maxX: 6.0, minZ: -5.05, maxZ: -4.2, height: 9.2 },
      { minX: -6.05, maxX: -5.2, minZ: -5.0, maxZ: 5.0, height: 9.2 },
      { minX: 5.2, maxX: 6.05, minZ: -5.0, maxZ: 5.0, height: 5.0 },
      { minX: -6.0, maxX: -1.75, minZ: 4.2, maxZ: 5.05, height: 5.0 },
      { minX: 1.75, maxX: 6.0, minZ: 4.2, maxZ: 5.05, height: 5.0 },
      { minX: -3.9, maxX: -1.1, minZ: -2.4, maxZ: -1.2, height: 1.45 },
      { minX: 2.2, maxX: 3.8, minZ: -2.8, maxZ: -1.2, height: 1.4 }
    );
  } else if (type === 'cabin_house') {
    // Timber Chalet / Woodland Cabin with stone base, front wooden deck, glowing windows & chimney
    const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.55, 9.2), stoneMat);
    stoneBase.position.y = 0.275;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.32, 2.2), plankMat);
    deck.position.set(0, 0.28, 5.5);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 4.3, 0.68), plankMat);
    backWall.position.set(0, 2.45, -4.1);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.68, 4.3, 8.8), plankMat);
    leftWall.position.set(-4.26, 2.45, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.68, 4.3, 8.8), plankMat);
    rightWall.position.set(4.26, 2.45, 0);
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(3.1, 4.3, 0.68), plankMat);
    frontL.position.set(-3.05, 2.45, 4.1);
    const frontR = new THREE.Mesh(new THREE.BoxGeometry(3.1, 4.3, 0.68), plankMat);
    frontR.position.set(3.05, 2.45, 4.1);
    const frontHdr = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 0.7), darkTrim);
    frontHdr.position.set(0, 4.02, 4.1);

    const deckPostL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.6, 0.26), darkTrim);
    deckPostL.position.set(-4.2, 2.0, 6.4);
    const deckPostR = deckPostL.clone();
    deckPostR.position.x = 4.2;

    const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(8.1, 3.6, 4), roofMat);
    cabinRoof.rotation.y = Math.PI / 4;
    cabinRoof.position.set(0, 6.3, 0.4);
    const extChimney = new THREE.Mesh(new THREE.BoxGeometry(1.3, 7.6, 1.3), stoneMat);
    extChimney.position.set(-4.65, 3.8, -1.8);

    const logTable = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.2), woodMat);
    logTable.position.set(2.0, 0.85, -1.8);

    addWindow(-3.05, 2.55, 4.46, 0, 1.35, 1.2);
    addWindow(3.05, 2.55, 4.46, 0, 1.35, 1.2);
    addWindow(0, 2.55, -4.46, Math.PI, 1.75, 1.25);
    addWindow(4.62, 2.55, 0, Math.PI / 2, 1.65, 1.25);

    group.add(
      stoneBase,
      deck,
      backWall,
      leftWall,
      rightWall,
      frontL,
      frontR,
      frontHdr,
      deckPostL,
      deckPostR,
      cabinRoof,
      extChimney,
      logTable
    );

    if (isAlpine) {
      const roofSnow = new THREE.Mesh(new THREE.ConeGeometry(6.9, 2.6, 4), snowCapMat);
      roofSnow.rotation.y = Math.PI / 4;
      roofSnow.position.set(0, 6.9, 0.4);
      const chimneySnow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 1.4), snowCapMat);
      chimneySnow.position.set(-4.65, 7.72, -1.8);
      group.add(roofSnow, chimneySnow);
    }

    colliders.push(
      { minX: -4.65, maxX: 4.65, minZ: -4.5, maxZ: -3.7, height: 5.0 },
      { minX: -5.3, maxX: -3.9, minZ: -4.5, maxZ: 4.5, height: 5.0 },
      { minX: 3.9, maxX: 4.65, minZ: -4.5, maxZ: 4.5, height: 5.0 },
      { minX: -4.65, maxX: -1.5, minZ: 3.7, maxZ: 4.5, height: 5.0 },
      { minX: 1.5, maxX: 4.65, minZ: 3.7, maxZ: 4.5, height: 5.0 },
      { minX: 1.0, maxX: 3.0, minZ: -2.4, maxZ: -1.2, height: 1.25 }
    );
  } else if (type === 'watchtower') {
    const legGeo = new THREE.BoxGeometry(0.55, 6.0, 0.55);
    [
      [-2.1, -2.1],
      [2.1, -2.1],
      [-2.1, 2.1],
      [2.1, 2.1],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, darkTrim);
      leg.position.set(lx, 3.0, lz);
      group.add(leg);
    });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.4, 5.4), plankMat);
    deck.position.y = 6.0;
    const railF = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 0.24), wallMat);
    railF.position.set(0, 6.75, 2.55);
    const railB = railF.clone();
    railB.position.z = -2.55;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.3, 2.5, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 9.5;
    group.add(deck, railF, railB, roof);
    if (isAlpine) {
      const snowTop = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.6, 4), snowCapMat);
      snowTop.rotation.y = Math.PI / 4;
      snowTop.position.y = 10.05;
      group.add(snowTop);
    }
    colliders.push({ minX: -2.4, maxX: 2.4, minZ: -2.4, maxZ: 2.4, height: 6.5 });
  } else if (type === 'perimeter_wall') {
    // Tactical compound concrete/stone barricade with sandbag bunker, supply crate & barrel
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 0.65), stoneMat);
    wallLeft.position.set(-3.4, 1.2, 0);
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 0.65), stoneMat);
    wallRight.position.set(3.4, 1.2, 0);
    const capL = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.22, 0.8), darkTrim);
    capL.position.set(-3.4, 2.48, 0);
    const capR = capL.clone();
    capR.position.x = 3.4;

    const sandbagRow = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.9), sandbagMat);
    sandbagRow.position.set(0, 0.55, 1.15);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 1.5), woodMat);
    crate.position.set(-2.4, 0.65, 1.25);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.3, 12), roofMat);
    barrel.position.set(2.3, 0.65, 1.2);

    group.add(wallLeft, wallRight, capL, capR, sandbagRow, crate, barrel);
    colliders.push(
      { minX: -5.75, maxX: -1.05, minZ: -0.4, maxZ: 0.4, height: 2.6 },
      { minX: 1.05, maxX: 5.75, minZ: -0.4, maxZ: 0.4, height: 2.6 },
      { minX: -1.35, maxX: 1.35, minZ: 0.65, maxZ: 1.65, height: 1.2 },
      { minX: -3.2, maxX: -1.6, minZ: 0.45, maxZ: 2.05, height: 1.4 },
      { minX: 1.75, maxX: 2.85, minZ: 0.65, maxZ: 1.75, height: 1.35 }
    );
  } else {
    // Crate cluster cover + sandbag & barrel
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), woodMat);
    c1.position.set(0, 0.9, 0);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 1.8), woodMat);
    c2.position.set(2.1, 0.75, 0.6);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.35, 12), roofMat);
    barrel.position.set(-1.7, 0.675, 0.8);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 0.85), sandbagMat);
    bag.position.set(0.2, 0.375, -1.65);
    group.add(c1, c2, barrel, bag);
    colliders.push(
      { minX: -1.1, maxX: 1.1, minZ: -1.1, maxZ: 1.1, height: 1.8 },
      { minX: 1.2, maxX: 3.0, minZ: -0.3, maxZ: 1.5, height: 1.5 },
      { minX: -2.25, maxX: -1.15, minZ: 0.25, maxZ: 1.35, height: 1.35 },
      { minX: -0.7, maxX: 1.1, minZ: -2.1, maxZ: -1.2, height: 0.85 }
    );
  }

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return { group, colliders };
}

export function createGlooWallMesh(skin: VaultOption, textures: GameTextures): THREE.Group {
  const g = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({
    map: textures.glooGrid,
    color: skin.color,
    emissive: skin.color,
    emissiveIntensity: 0.28,
    roughness: 0.25,
    metalness: 0.65,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: skin.accent,
    roughness: 0.22,
    metalness: 0.85,
  });

  // Curved 3-panel tactical barrier grounded at y=0
  const center = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.15, 0.28), panelMat);
  center.position.set(0, 1.075, 0);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 0.26), panelMat);
  wingL.position.set(-1.65, 1.0, 0.35);
  wingL.rotation.y = 0.42;
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 0.26), panelMat);
  wingR.position.set(1.65, 1.0, 0.35);
  wingR.rotation.y = -0.42;
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.34), frameMat);
  topBar.position.set(0, 2.18, 0);

  g.add(center, wingL, wingR, topBar);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function createAirdropMesh(textures: GameTextures): THREE.Group {
  const g = new THREE.Group();
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.45, metalness: 0.55 });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38, metalness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ map: textures.woodCrate, color: 0xfbbf24, roughness: 0.3, metalness: 0.7 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.6, 1.9), crateMat);
  box.position.y = 0.8;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.32, 2.05), lidMat);
  lid.position.y = 1.7;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 1.96), trimMat);
  band.position.y = 0.85;
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 22, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beacon.position.y = 11;

  g.add(box, lid, band, beacon);
  return g;
}

export interface DeathCrateMeshRig {
  group: THREE.Group;
  lidPivot: THREE.Group;
  holoRing: THREE.Mesh;
  beacon: THREE.Mesh;
}

let cachedDeathCrateDecalTex: THREE.CanvasTexture | null = null;

function getDeathCrateDecalTexture(): THREE.CanvasTexture {
  if (cachedDeathCrateDecalTex) return cachedDeathCrateDecalTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 128);

  // Diagonal hazard border stripes
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 116);

  // Stylized skull emblem
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(64, 52, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(50, 68, 28, 18);

  // Skull eyes & nasal cavity
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(54, 52, 6, 0, Math.PI * 2);
  ctx.arc(74, 52, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(64, 59);
  ctx.lineTo(59, 68);
  ctx.lineTo(69, 68);
  ctx.closePath();
  ctx.fill();

  // Jaw teeth lines
  ctx.fillRect(56, 76, 3, 10);
  ctx.fillRect(63, 76, 3, 10);
  ctx.fillRect(70, 76, 3, 10);

  // Crossed hazard bars
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(22, 102);
  ctx.lineTo(106, 102);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedDeathCrateDecalTex = tex;
  return tex;
}

export function createDeathCrateMesh(
  accentColorHex: number,
  tier: 'normal' | 'high' = 'normal'
): DeathCrateMeshRig {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.72,
    metalness: 0.32,
  });
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.68,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColorHex,
    roughness: 0.24,
    metalness: 0.82,
    emissive: accentColorHex,
    emissiveIntensity: tier === 'high' ? 0.52 : 0.3,
  });
  const latchMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.18,
    metalness: 0.92,
  });
  const decalMat = new THREE.MeshStandardMaterial({
    map: getDeathCrateDecalTexture(),
    emissiveMap: getDeathCrateDecalTexture(),
    emissive: accentColorHex,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // 1. Grounded armored base tray (y = 0)
  const baseTray = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.09, 0.66), baseMat);
  baseTray.position.set(0, 0.045, 0);

  // 2. Main tactical chest hull
  const chestHull = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.32, 0.56), hullMat);
  chestHull.position.set(0, 0.24, 0);

  // 3. Reinforced neon/metallic straps
  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.35, 0.60), accentMat);
  strapL.position.set(-0.24, 0.24, 0);
  const strapR = strapL.clone();
  strapR.position.x = 0.24;

  // 4. Front steel clasp latch
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), latchMat);
  latch.position.set(0, 0.33, 0.29);

  // 5. Hinged Lid Assembly (pivots from back edge so crate opens smoothly on loot)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.40, -0.28);

  const lidCap = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.11, 0.60), hullMat);
  lidCap.position.set(0, 0.055, 0.28);

  const lidTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.62), accentMat);
  lidTrimL.position.set(-0.24, 0.06, 0.28);
  const lidTrimR = lidTrimL.clone();
  lidTrimR.position.x = 0.24;

  const skullPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), decalMat);
  skullPlate.rotation.x = -Math.PI / 2;
  skullPlate.position.set(0, 0.114, 0.28);

  lidPivot.add(lidCap, lidTrimL, lidTrimR, skullPlate);

  // 6. Ground holographic ring & vertical loot beacon
  const holoRing = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.66, 24),
    new THREE.MeshBasicMaterial({
      color: accentColorHex,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  holoRing.rotation.x = -Math.PI / 2;
  holoRing.position.set(0, 0.03, 0);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.22, 3.0, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: accentColorHex,
      transparent: true,
      opacity: tier === 'high' ? 0.32 : 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beacon.position.set(0, 1.55, 0);

  group.add(baseTray, chestHull, strapL, strapR, latch, lidPivot, holoRing, beacon);
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== beacon && obj !== holoRing) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { group, lidPivot, holoRing, beacon };
}

export function createCallsignSprite(label: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(11, 14, 19, 0.82)';
    ctx.fillRect(8, 12, 240, 40);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 12, 240, 40);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 14), 128, 33);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5, 0.38, 1);
  sprite.position.set(0, 2.25, 0);
  return sprite;
}

export interface VehicleModelRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  frontSteerPivots: THREE.Group[];
  wheels: THREE.Object3D[];
  hitMesh: THREE.Mesh;
  driverSeatOffset: THREE.Vector3;
  passengerSeatOffset: THREE.Vector3;
  wheelRadius: number;
  bodyPaintMat: THREE.MeshPhysicalMaterial;
}

function createWheelAssembly(radius: number, width: number, rimColor: number): THREE.Group {
  const wheelGroup = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111419,
    roughness: 0.85,
    metalness: 0.08,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.22,
    metalness: 0.88,
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.32,
    metalness: 0.55,
  });

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), tireMat);
  tire.rotation.z = Math.PI / 2;

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 12), rimMat);
  rim.rotation.z = Math.PI / 2;

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.04, 8), caliperMat);
  hub.rotation.z = Math.PI / 2;

  wheelGroup.add(tire, rim, hub);
  return wheelGroup;
}

export function createVehicleModel(type: VehicleType): VehicleModelRig {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const frontSteerPivots: THREE.Group[] = [];
  const wheels: THREE.Object3D[] = [];

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.68, metalness: 0.22 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.18, metalness: 0.92 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.66,
  });
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.25,
    roughness: 0.25,
  });

  let wheelRadius = 0.36;
  let driverSeatOffset = new THREE.Vector3(0.42, 0.38, -0.05);
  let passengerSeatOffset = new THREE.Vector3(-0.42, 0.38, -0.05);
  let bodyPaintMat: THREE.MeshPhysicalMaterial;
  let hitMesh: THREE.Mesh;

  if (type === 'sportscar') {
    wheelRadius = 0.36;
    driverSeatOffset = new THREE.Vector3(0.42, 0.34, 0.05);
    passengerSeatOffset = new THREE.Vector3(-0.42, 0.34, 0.05);

    bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      metalness: 0.72,
      roughness: 0.28,
      clearcoat: 0.92,
      clearcoatRoughness: 0.1,
    });

    // Lower sculpted floorpan + side skirts
    const underTray = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 4.35), trimMat);
    underTray.position.set(0, 0.34, 0);

    // Main aerodynamic body shell
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.44, 4.2), bodyPaintMat);
    mainBody.position.set(0, 0.62, 0);

    // Sloped front hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.2, 1.45), bodyPaintMat);
    hood.position.set(0, 0.78, 1.32);
    hood.rotation.x = 0.14;

    // Front splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.08, 0.42), trimMat);
    splitter.position.set(0, 0.3, 2.08);

    // Cockpit cabin & panoramic windshield
    const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.44, 1.85), glassMat);
    cabinBase.position.set(0, 1.02, -0.18);
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 1.25), bodyPaintMat);
    roofCap.position.set(0, 1.25, -0.24);

    // Dual racing stripes
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.2 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 1.4), stripeMat);
    stripeL.position.set(-0.22, 0.89, 1.3);
    stripeL.rotation.x = 0.14;
    const stripeR = stripeL.clone();
    stripeR.position.x = 0.22;

    // Rear GT Wing Spoiler
    const wingPylonL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.18), trimMat);
    wingPylonL.position.set(-0.55, 0.98, -1.88);
    const wingPylonR = wingPylonL.clone();
    wingPylonR.position.x = 0.55;
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.06, 0.32), trimMat);
    wingBlade.position.set(0, 1.14, -1.94);
    wingBlade.rotation.x = -0.12;

    // Headlights & Taillights
    [-0.68, 0.68].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.08), headLightMat);
      hl.position.set(lx, 0.62, 2.09);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.08), tailLightMat);
      tl.position.set(lx, 0.68, -2.09);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), chromeMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(lx * 0.72, 0.36, -2.14);
      chassisGroup.add(hl, tl, exhaust);
    });

    chassisGroup.add(
      underTray,
      mainBody,
      hood,
      splitter,
      cabinBase,
      roofCap,
      stripeL,
      stripeR,
      wingPylonL,
      wingPylonR,
      wingBlade
    );

    const wheelCoords: [number, number, boolean][] = [
      [-0.98, 1.32, true],
      [0.98, 1.32, true],
      [-0.98, -1.32, false],
      [0.98, -1.32, false],
    ];
    wheelCoords.forEach(([wx, wz, isFront]) => {
      const wAsm = createWheelAssembly(wheelRadius, 0.28, 0xf59e0b);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, wheelRadius, wz);
        pivot.add(wAsm);
        root.add(pivot);
        frontSteerPivots.push(pivot);
      } else {
        wAsm.position.set(wx, wheelRadius, wz);
        root.add(wAsm);
      }
      wheels.push(wAsm);
    });

    hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.35, 4.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.y = 0.72;
    root.add(hitMesh);
  } else if (type === 'pickup') {
    wheelRadius = 0.45;
    driverSeatOffset = new THREE.Vector3(0.45, 0.62, 0.28);
    passengerSeatOffset = new THREE.Vector3(-0.45, 0.62, 0.28);

    bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0x3f6212,
      metalness: 0.35,
      roughness: 0.52,
      clearcoat: 0.35,
      clearcoatRoughness: 0.32,
    });
    const accentArmorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42, metalness: 0.55 });

    // Raised off-road chassis frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 4.45), trimMat);
    frame.position.set(0, 0.56, 0);

    // Front engine hood + cab
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.52, 1.35), bodyPaintMat);
    hood.position.set(0, 0.92, 1.52);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.98, 1.48), bodyPaintMat);
    cab.position.set(0, 1.32, 0.22);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.52, 0.1), glassMat);
    windshield.position.set(0, 1.44, 0.96);
    windshield.rotation.x = -0.22;

    // Rear open cargo bed
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 1.75), bodyPaintMat);
    bedFloor.position.set(0, 0.78, -1.35);
    const bedWallL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 1.75), bodyPaintMat);
    bedWallL.position.set(-0.92, 1.12, -1.35);
    const bedWallR = bedWallL.clone();
    bedWallR.position.x = 0.92;
    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.52, 0.16), bodyPaintMat);
    tailgate.position.set(0, 1.12, -2.18);

    // Rollbar + Roof spotlight bar + Front bullbar
    const rollBarL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.9, 8), trimMat);
    rollBarL.position.set(-0.78, 1.42, -0.68);
    const rollBarR = rollBarL.clone();
    rollBarR.position.x = 0.78;
    const rollBarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.62, 8), trimMat);
    rollBarTop.rotation.z = Math.PI / 2;
    rollBarTop.position.set(0, 1.85, -0.68);

    const roofBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.16), accentArmorMat);
    roofBar.position.set(0, 1.88, 0.55);

    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.34, 0.22), trimMat);
    bullbar.position.set(0, 0.72, 2.26);

    [-0.72, 0.72].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), headLightMat);
      hl.position.set(lx, 0.98, 2.21);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.08), tailLightMat);
      tl.position.set(lx, 1.06, -2.26);
      chassisGroup.add(hl, tl);
    });

    chassisGroup.add(
      frame,
      hood,
      cab,
      windshield,
      bedFloor,
      bedWallL,
      bedWallR,
      tailgate,
      rollBarL,
      rollBarR,
      rollBarTop,
      roofBar,
      bullbar
    );

    const wheelCoords: [number, number, boolean][] = [
      [-1.08, 1.42, true],
      [1.08, 1.42, true],
      [-1.08, -1.42, false],
      [1.08, -1.42, false],
    ];
    wheelCoords.forEach(([wx, wz, isFront]) => {
      const wAsm = createWheelAssembly(wheelRadius, 0.34, 0x94a3b8);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, wheelRadius, wz);
        pivot.add(wAsm);
        root.add(pivot);
        frontSteerPivots.push(pivot);
      } else {
        wAsm.position.set(wx, wheelRadius, wz);
        root.add(wAsm);
      }
      wheels.push(wAsm);
    });

    hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.25, 1.85, 4.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.y = 0.95;
    root.add(hitMesh);
  } else {
    // Turbo Superbike
    wheelRadius = 0.34;
    driverSeatOffset = new THREE.Vector3(0, 0.56, -0.02);
    passengerSeatOffset = new THREE.Vector3(0, 0.62, -0.52);

    bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.65,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });

    const engineCore = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.96), trimMat);
    engineCore.position.set(0, 0.48, -0.05);

    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.72), bodyPaintMat);
    fairing.position.set(0, 0.76, 0.42);
    fairing.rotation.x = 0.22;

    const fuelTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.38, 6, 10), bodyPaintMat);
    fuelTank.rotation.x = Math.PI / 2;
    fuelTank.position.set(0, 0.86, 0.16);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.88), trimMat);
    seat.position.set(0, 0.76, -0.34);
    seat.rotation.x = -0.08;

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.06), glassMat);
    windshield.position.set(0, 1.04, 0.64);
    windshield.rotation.x = -0.52;

    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.08), tailLightMat);
    tailLight.position.set(0, 0.82, -0.84);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.68, 10), chromeMat);
    exhaust.rotation.x = Math.PI / 2 - 0.18;
    exhaust.position.set(0.22, 0.42, -0.52);

    chassisGroup.add(engineCore, fairing, fuelTank, seat, windshield, tailLight, exhaust);

    // Front Steering Assembly (Fork + Handlebars + Headlight + Front Wheel)
    const frontPivot = new THREE.Group();
    frontPivot.position.set(0, 0.34, 0.88);
    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 8), chromeMat);
    forkL.position.set(-0.14, 0.36, -0.08);
    forkL.rotation.x = -0.28;
    const forkR = forkL.clone();
    forkR.position.x = 0.14;
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.74, 8), trimMat);
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 0.72, -0.18);
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.1), headLightMat);
    headlight.position.set(0, 0.56, 0.02);

    const frontWheel = createWheelAssembly(wheelRadius, 0.18, 0xf59e0b);
    frontPivot.add(forkL, forkR, handleBar, headlight, frontWheel);
    root.add(frontPivot);
    frontSteerPivots.push(frontPivot);
    wheels.push(frontWheel);

    // Rear Wheel
    const rearWheel = createWheelAssembly(wheelRadius, 0.22, 0xf59e0b);
    rearWheel.position.set(0, wheelRadius, -0.86);
    root.add(rearWheel);
    wheels.push(rearWheel);

    hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.25, 2.35),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.y = 0.64;
    root.add(hitMesh);
  }

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== hitMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root,
    chassisGroup,
    frontSteerPivots,
    wheels,
    hitMesh,
    driverSeatOffset,
    passengerSeatOffset,
    wheelRadius,
    bodyPaintMat,
  };
}
