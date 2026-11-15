import * as THREE from 'three';

export interface GameTextures {
  grassTerrain: THREE.CanvasTexture;
  desertTerrain: THREE.CanvasTexture;
  alpineTerrain: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  woodPlank: THREE.CanvasTexture;
  roofShingle: THREE.CanvasTexture;
  asphaltRoad: THREE.CanvasTexture;
  woodCrate: THREE.CanvasTexture;
  corrugatedMetal: THREE.CanvasTexture;
  lobbyFloor: THREE.CanvasTexture;
  glooGrid: THREE.CanvasTexture;
  softShadow: THREE.CanvasTexture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createGameTextures(maxAnisotropy: number): GameTextures {
  // 1. Grass / Bermuda Island Ground
  const [gCan, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#3b5930';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 4;
    gCtx.fillStyle = Math.random() > 0.5 ? 'rgba(84,118,58,0.35)' : 'rgba(38,61,28,0.35)';
    gCtx.fillRect(x, y, r, r * 1.4);
  }
  // Subtle dry dirt speckles
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    gCtx.fillStyle = 'rgba(116,96,68,0.22)';
    gCtx.beginPath();
    gCtx.arc(x, y, 2 + Math.random() * 5, 0, Math.PI * 2);
    gCtx.fill();
  }
  const grassTerrain = finalizeTexture(gCan, maxAnisotropy, 28, 28);

  // 2. Desert / Purgatory Ground
  const [dCan, dCtx] = makeCanvas(512, 512);
  dCtx.fillStyle = '#8b6e4e';
  dCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    dCtx.fillStyle = Math.random() > 0.5 ? 'rgba(164,132,94,0.32)' : 'rgba(98,74,50,0.32)';
    dCtx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  const desertTerrain = finalizeTexture(dCan, maxAnisotropy, 28, 28);

  // 2b. Alpine Snow & Slate Highland Ground
  const [alCan, alCtx] = makeCanvas(512, 512);
  alCtx.fillStyle = '#cbd5e1';
  alCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    alCtx.fillStyle =
      Math.random() > 0.45 ? 'rgba(241,245,249,0.48)' : 'rgba(148,163,184,0.34)';
    alCtx.fillRect(x, y, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    alCtx.fillStyle = Math.random() > 0.3 ? 'rgba(71,85,105,0.22)' : 'rgba(51,65,85,0.28)';
    alCtx.beginPath();
    alCtx.arc(x, y, 2 + Math.random() * 6, 0, Math.PI * 2);
    alCtx.fill();
  }
  const alpineTerrain = finalizeTexture(alCan, maxAnisotropy, 28, 28);

  // 3. Concrete Compound Wall
  const [cCan, cCtx] = makeCanvas(256, 256);
  cCtx.fillStyle = '#b4b8bd';
  cCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    cCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    cCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  cCtx.strokeStyle = 'rgba(60,65,72,0.28)';
  cCtx.lineWidth = 2;
  for (let y = 32; y < 256; y += 64) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(256, y);
    cCtx.stroke();
  }
  const concreteWall = finalizeTexture(cCan, maxAnisotropy, 2, 2);

  // 3b. Running-Bond Brick Masonry Wall
  const [bCan, bCtx] = makeCanvas(256, 256);
  bCtx.fillStyle = '#9ca3af'; // mortar base
  bCtx.fillRect(0, 0, 256, 256);
  const brickH = 16;
  const brickW = 32;
  for (let row = 0; row < 256 / brickH; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 256 / brickW + 1; col++) {
      const shade = 140 + ((row * 17 + col * 31) % 36);
      const r = Math.min(255, shade + 24);
      const g = Math.min(255, Math.round(shade * 0.78));
      const b = Math.min(255, Math.round(shade * 0.68));
      bCtx.fillStyle = `rgb(${r},${g},${b})`;
      bCtx.fillRect(col * brickW + offset + 1.5, row * brickH + 1.5, brickW - 3, brickH - 3);
    }
  }
  for (let i = 0; i < 1200; i++) {
    bCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    bCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const brickWall = finalizeTexture(bCan, maxAnisotropy, 2, 2);

  // 3c. Architectural Timber Planks (Cabins / Floors / Shutters)
  const [wpCan, wpCtx] = makeCanvas(256, 256);
  wpCtx.fillStyle = '#7c4a26';
  wpCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    const tone = ((y / 32) % 3) * 8 - 8;
    wpCtx.fillStyle = `rgb(${124 + tone},${76 + Math.round(tone * 0.6)},${42 + Math.round(tone * 0.4)})`;
    wpCtx.fillRect(0, y + 1, 256, 30);
    wpCtx.fillStyle = 'rgba(28,16,8,0.45)';
    wpCtx.fillRect(0, y, 256, 2);
    for (let g = 0; g < 18; g++) {
      wpCtx.fillStyle = 'rgba(42,24,10,0.16)';
      wpCtx.fillRect(Math.random() * 180, y + 4 + Math.random() * 22, 40 + Math.random() * 80, 1.5);
    }
  }
  const woodPlank = finalizeTexture(wpCan, maxAnisotropy, 2, 2);

  // 3d. Shingled Roof Tiles
  const [rfCan, rfCtx] = makeCanvas(256, 256);
  rfCtx.fillStyle = '#3f2e28';
  rfCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    const rowShift = ((y / 16) % 2) * 16;
    for (let x = -16; x < 256; x += 32) {
      const v = 54 + (((x + y) * 13) % 24);
      rfCtx.fillStyle = `rgb(${v + 24},${v + 8},${v + 4})`;
      rfCtx.fillRect(x + rowShift + 1, y + 1, 30, 14);
    }
    rfCtx.fillStyle = 'rgba(0,0,0,0.35)';
    rfCtx.fillRect(0, y + 14, 256, 2);
  }
  const roofShingle = finalizeTexture(rfCan, maxAnisotropy, 3, 3);

  // 4. Asphalt Road
  const [aCan, aCtx] = makeCanvas(256, 256);
  aCtx.fillStyle = '#2d3138';
  aCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2800; i++) {
    aCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    aCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  aCtx.fillStyle = '#eab308';
  aCtx.fillRect(124, 16, 8, 88);
  aCtx.fillRect(124, 144, 8, 88);
  const asphaltRoad = finalizeTexture(aCan, maxAnisotropy, 1, 18);

  // 5. Wood Crate
  const [wCan, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = '#8b5e34';
  wCtx.fillRect(0, 0, 256, 256);
  wCtx.strokeStyle = '#5c3b1e';
  wCtx.lineWidth = 10;
  wCtx.strokeRect(8, 8, 240, 240);
  wCtx.beginPath();
  wCtx.moveTo(12, 12);
  wCtx.lineTo(244, 244);
  wCtx.moveTo(244, 12);
  wCtx.lineTo(12, 244);
  wCtx.stroke();
  for (let y = 24; y < 240; y += 28) {
    wCtx.strokeStyle = 'rgba(40,22,8,0.22)';
    wCtx.lineWidth = 2;
    wCtx.beginPath();
    wCtx.moveTo(14, y);
    wCtx.lineTo(242, y);
    wCtx.stroke();
  }
  const woodCrate = finalizeTexture(wCan, maxAnisotropy);

  // 6. Corrugated Hangar Metal
  const [mCan, mCtx] = makeCanvas(256, 256);
  mCtx.fillStyle = '#475569';
  mCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    mCtx.fillStyle = 'rgba(255,255,255,0.09)';
    mCtx.fillRect(x, 0, 6, 256);
    mCtx.fillStyle = 'rgba(0,0,0,0.18)';
    mCtx.fillRect(x + 8, 0, 6, 256);
  }
  const corrugatedMetal = finalizeTexture(mCan, maxAnisotropy, 3, 2);

  // 7. Lobby Tactical Hangar Floor
  const [lCan, lCtx] = makeCanvas(512, 512);
  lCtx.fillStyle = '#12161f';
  lCtx.fillRect(0, 0, 512, 512);
  lCtx.strokeStyle = 'rgba(255, 140, 0, 0.16)';
  lCtx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    lCtx.beginPath();
    lCtx.moveTo(i, 0);
    lCtx.lineTo(i, 512);
    lCtx.stroke();
    lCtx.beginPath();
    lCtx.moveTo(0, i);
    lCtx.lineTo(512, i);
    lCtx.stroke();
  }
  lCtx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  lCtx.lineWidth = 1;
  for (let i = 32; i < 512; i += 64) {
    lCtx.beginPath();
    lCtx.moveTo(i, 0);
    lCtx.lineTo(i, 512);
    lCtx.stroke();
  }
  const lobbyFloor = finalizeTexture(lCan, maxAnisotropy, 8, 8);

  // 8. Gloo Wall Hex Grid
  const [glCan, glCtx] = makeCanvas(256, 256);
  glCtx.fillStyle = '#1e293b';
  glCtx.fillRect(0, 0, 256, 256);
  glCtx.strokeStyle = 'rgba(255,255,255,0.42)';
  glCtx.lineWidth = 3;
  const step = 32;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      glCtx.strokeRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  const glooGrid = finalizeTexture(glCan, maxAnisotropy, 2, 1);

  // 9. Soft Contact Shadow
  const [sCan, sCtx] = makeCanvas(128, 128);
  const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const softShadow = finalizeTexture(sCan, maxAnisotropy, 1, 1, false);

  return {
    grassTerrain,
    desertTerrain,
    alpineTerrain,
    concreteWall,
    brickWall,
    woodPlank,
    roofShingle,
    asphaltRoad,
    woodCrate,
    corrugatedMetal,
    lobbyFloor,
    glooGrid,
    softShadow,
  };
}

export function disposeGameTextures(tex: GameTextures) {
  Object.values(tex).forEach((t) => t.dispose());
}
