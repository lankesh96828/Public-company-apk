import * as THREE from 'three';
import { MapId } from './types';
import { GameTextures } from './textures';
import { BuildingType, createBuildingMesh } from './models';

export interface WorldCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  baseY: number;
}

export const ISLAND_RADIUS = 138;
export const PLAYABLE_LIMIT = 128;

export function groundHeightAt(x: number, z: number, mapId: MapId): number {
  const dist = Math.hypot(x, z);
  const hillScale = mapId === 'alpine' ? 4.4 : mapId === 'purgatory' ? 3.8 : 2.9;
  let h =
    Math.sin(x * 0.025) * Math.cos(z * 0.024) * hillScale +
    Math.sin((x + z) * 0.055) * (mapId === 'alpine' ? 1.15 : 0.85);

  if (mapId === 'alpine' && dist > 64 && dist < ISLAND_RADIUS - 20) {
    // High perimeter snowy ridges framing the alpine valley
    h += Math.sin((dist - 64) * 0.06) * 2.4;
  }

  // Flatten center landmark plazas (Clock Tower at (0, -18), Factory at (52, 34), Western Villa at (-52, -16))
  const dCenter = Math.hypot(x, z + 18);
  if (dCenter < 22) {
    const t = Math.max(0, (dCenter - 12) / 10);
    h = THREE.MathUtils.lerp(1.8, h, t);
  }
  const dFactory = Math.hypot(x - 52, z - 34);
  if (dFactory < 24) {
    const t = Math.max(0, (dFactory - 14) / 10);
    h = THREE.MathUtils.lerp(1.2, h, t);
  }
  const dWest = Math.hypot(x + 52, z + 16);
  if (dWest < 20) {
    const t = Math.max(0, (dWest - 11) / 9);
    h = THREE.MathUtils.lerp(1.6, h, t);
  }

  // Coastal beach / frozen shoreline drop-off outside island radius
  if (dist > ISLAND_RADIUS - 18) {
    const shoreT = (dist - (ISLAND_RADIUS - 18)) / 26;
    h -= shoreT * shoreT * 7.5;
  }

  return Math.max(-3.5, h);
}

export interface WorldBuildResult {
  colliders: WorldCollider[];
  spawnPoints: THREE.Vector3[];
  lootSpots: THREE.Vector3[];
}

interface BuildingPlacement {
  type: BuildingType;
  x: number;
  z: number;
  rot: number;
}

function getMapPlacements(mapId: MapId): BuildingPlacement[] {
  if (mapId === 'alpine') {
    return [
      { type: 'clock_tower', x: 0, z: -18, rot: 0 },
      { type: 'factory', x: 52, z: 34, rot: Math.PI * 0.15 },
      { type: 'villa_house', x: -50, z: -16, rot: 0.25 },
      { type: 'villa_house', x: 38, z: -50, rot: -0.35 },
      { type: 'cabin_house', x: -46, z: 36, rot: 0.45 },
      { type: 'cabin_house', x: 10, z: 66, rot: -0.15 },
      { type: 'cabin_house', x: -74, z: 18, rot: 1.2 },
      { type: 'cabin_house', x: 78, z: -14, rot: -1.35 },
      { type: 'house', x: -58, z: -48, rot: 0.8 },
      { type: 'house', x: 64, z: -44, rot: Math.PI },
      { type: 'house', x: -26, z: 66, rot: 0.2 },
      { type: 'perimeter_wall', x: -16, z: -32, rot: 0.1 },
      { type: 'perimeter_wall', x: 24, z: 18, rot: -0.7 },
      { type: 'perimeter_wall', x: -34, z: -4, rot: Math.PI / 2 },
      { type: 'watchtower', x: -15, z: 26, rot: 0 },
      { type: 'watchtower', x: 24, z: -8, rot: 1.2 },
      { type: 'watchtower', x: -64, z: -60, rot: 0.5 },
      { type: 'watchtower', x: 64, z: 72, rot: -0.8 },
      { type: 'crate_cluster', x: -9, z: -4, rot: 0.3 },
      { type: 'crate_cluster', x: 28, z: 26, rot: 1.1 },
      { type: 'crate_cluster', x: -32, z: 32, rot: -0.5 },
      { type: 'crate_cluster', x: 18, z: -42, rot: 0.8 },
      { type: 'crate_cluster', x: -62, z: 6, rot: 0.2 },
      { type: 'crate_cluster', x: 74, z: 12, rot: 1.5 },
      { type: 'crate_cluster', x: 14, z: 48, rot: -0.9 },
    ];
  }

  if (mapId === 'purgatory') {
    return [
      { type: 'clock_tower', x: 0, z: -18, rot: 0 },
      { type: 'factory', x: 52, z: 34, rot: Math.PI * 0.15 },
      { type: 'villa_house', x: -50, z: -18, rot: 0.18 },
      { type: 'villa_house', x: 12, z: 68, rot: Math.PI },
      { type: 'house', x: -42, z: -46, rot: 0.2 },
      { type: 'house', x: 34, z: -54, rot: -0.4 },
      { type: 'house', x: 58, z: -40, rot: Math.PI },
      { type: 'house', x: -38, z: 54, rot: 0.6 },
      { type: 'cabin_house', x: -76, z: 24, rot: 1.1 },
      { type: 'cabin_house', x: 82, z: -8, rot: -1.4 },
      { type: 'perimeter_wall', x: -16, z: -30, rot: 0 },
      { type: 'perimeter_wall', x: 26, z: 22, rot: -0.6 },
      { type: 'perimeter_wall', x: -34, z: 4, rot: 1.57 },
      { type: 'watchtower', x: -16, z: 22, rot: 0 },
      { type: 'watchtower', x: 24, z: -8, rot: 1.2 },
      { type: 'watchtower', x: -64, z: -58, rot: 0.5 },
      { type: 'watchtower', x: 64, z: 74, rot: -0.8 },
      { type: 'crate_cluster', x: -10, z: -4, rot: 0.3 },
      { type: 'crate_cluster', x: 26, z: 24, rot: 1.1 },
      { type: 'crate_cluster', x: -32, z: 34, rot: -0.5 },
      { type: 'crate_cluster', x: 18, z: -42, rot: 0.8 },
      { type: 'crate_cluster', x: -62, z: 6, rot: 0.2 },
      { type: 'crate_cluster', x: 74, z: 12, rot: 1.5 },
      { type: 'crate_cluster', x: 14, z: 48, rot: -0.9 },
    ];
  }

  // Bermuda Island (enhanced compounds with villas, houses, cabins & perimeter barricades)
  return [
    { type: 'clock_tower', x: 0, z: -18, rot: 0 },
    { type: 'factory', x: 52, z: 34, rot: Math.PI * 0.15 },
    { type: 'villa_house', x: -48, z: -22, rot: 0.2 },
    { type: 'villa_house', x: 56, z: -42, rot: Math.PI },
    { type: 'house', x: -58, z: 2, rot: Math.PI / 2 },
    { type: 'house', x: 34, z: -54, rot: -0.4 },
    { type: 'house', x: -38, z: 54, rot: 0.6 },
    { type: 'house', x: 8, z: 68, rot: -0.2 },
    { type: 'cabin_house', x: -76, z: 24, rot: 1.1 },
    { type: 'cabin_house', x: 82, z: -8, rot: -1.4 },
    { type: 'perimeter_wall', x: -18, z: -34, rot: 0.08 },
    { type: 'perimeter_wall', x: 28, z: 20, rot: -0.65 },
    { type: 'watchtower', x: -16, z: 22, rot: 0 },
    { type: 'watchtower', x: 24, z: -8, rot: 1.2 },
    { type: 'watchtower', x: -64, z: -58, rot: 0.5 },
    { type: 'watchtower', x: 64, z: 74, rot: -0.8 },
    { type: 'crate_cluster', x: -10, z: -4, rot: 0.3 },
    { type: 'crate_cluster', x: 26, z: 24, rot: 1.1 },
    { type: 'crate_cluster', x: -32, z: 34, rot: -0.5 },
    { type: 'crate_cluster', x: 18, z: -42, rot: 0.8 },
    { type: 'crate_cluster', x: -62, z: 6, rot: 0.2 },
    { type: 'crate_cluster', x: 74, z: 12, rot: 1.5 },
    { type: 'crate_cluster', x: 14, z: 48, rot: -0.9 },
  ];
}

export function buildIslandWorld(
  scene: THREE.Scene,
  mapId: MapId,
  textures: GameTextures
): WorldBuildResult {
  const isDesert = mapId === 'purgatory';
  const isAlpine = mapId === 'alpine';
  const colliders: WorldCollider[] = [];
  const spawnPoints: THREE.Vector3[] = [];
  const lootSpots: THREE.Vector3[] = [];

  // 1. Continuous Ground Mesh extending to 440m (natural sea/canyon/glacial horizon)
  const terrainGeo = new THREE.PlaneGeometry(440, 440, 110, 110);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(vx, vz, mapId));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: isAlpine
      ? textures.alpineTerrain
      : isDesert
      ? textures.desertTerrain
      : textures.grassTerrain,
    roughness: isAlpine ? 0.86 : 0.92,
    metalness: isAlpine ? 0.05 : 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 2. Surrounding Coastal Ocean / Glacial Sea Plane
  const waterMat = new THREE.MeshStandardMaterial({
    color: isAlpine ? 0x1e3a5f : isDesert ? 0x0f4c5c : 0x0e7490,
    roughness: isAlpine ? 0.14 : 0.18,
    metalness: isAlpine ? 0.65 : 0.55,
  });
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = -1.25;
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  // 3. Intersecting Cross-Island Asphalt Road Network
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltRoad,
    roughness: 0.82,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 220, 1, 40), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  const nsPos = roadNS.geometry.attributes.position;
  for (let i = 0; i < nsPos.count; i++) {
    const rx = nsPos.getX(i) - 18;
    const rz = -nsPos.getY(i);
    nsPos.setZ(i, groundHeightAt(rx, rz, mapId) + 0.08);
  }
  roadNS.position.set(-18, 0, 0);
  roadNS.receiveShadow = true;
  scene.add(roadNS);

  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 210, 1, 40), roadMat);
  roadEW.rotation.order = 'YXZ';
  roadEW.rotation.y = Math.PI / 2;
  roadEW.rotation.x = -Math.PI / 2;
  const ewPos = roadEW.geometry.attributes.position;
  for (let i = 0; i < ewPos.count; i++) {
    const wx = -ewPos.getY(i);
    const wz = 12 - ewPos.getX(i);
    ewPos.setZ(i, groundHeightAt(wx, wz, mapId) + 0.09);
  }
  roadEW.position.set(0, 0, 12);
  roadEW.receiveShadow = true;
  scene.add(roadEW);

  // Roadside tactical streetlights along crossroads
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
  });
  const poleCoords: [number, number][] = [
    [-12.8, -80],
    [-23.2, -52],
    [-12.8, -24],
    [-23.2, 42],
    [-12.8, 72],
    [-72, 6.8],
    [-46, 17.2],
    [16, 6.8],
    [48, 17.2],
    [76, 6.8],
  ];
  poleCoords.forEach(([px, pz]) => {
    const py = groundHeightAt(px, pz, mapId);
    if (py < 0.1) return;
    const poleGroup = new THREE.Group();
    poleGroup.position.set(px, py, pz);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 5.2, 8), poleMat);
    mast.position.y = 2.6;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.12), poleMat);
    arm.position.set(0.45, 5.15, 0);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.24), lampMat);
    bulb.position.set(0.95, 5.05, 0);
    poleGroup.add(mast, arm, bulb);
    poleGroup.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    scene.add(poleGroup);
    colliders.push({ minX: px - 0.35, maxX: px + 0.35, minZ: pz - 0.35, maxZ: pz + 0.35, height: 5.2, baseY: py });
  });

  // 4. Compounds & Iconic Landmarks
  const placements = getMapPlacements(mapId);

  placements.forEach((p) => {
    const baseY = groundHeightAt(p.x, p.z, mapId);
    const { group, colliders: localCols } = createBuildingMesh(p.type, textures, mapId);
    group.position.set(p.x, baseY, p.z);
    group.rotation.y = p.rot;
    scene.add(group);

    // Transform local AABBs conservatively into world space
    const cos = Math.cos(p.rot);
    const sin = Math.sin(p.rot);
    localCols.forEach((c) => {
      const corners = [
        [c.minX, c.minZ],
        [c.maxX, c.minZ],
        [c.minX, c.maxZ],
        [c.maxX, c.maxZ],
      ];
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      corners.forEach(([lx, lz]) => {
        const wx = p.x + lx * cos + lz * sin;
        const wz = p.z - lx * sin + lz * cos;
        if (wx < minX) minX = wx;
        if (wx > maxX) maxX = wx;
        if (wz < minZ) minZ = wz;
        if (wz > maxZ) maxZ = wz;
      });
      colliders.push({ minX, maxX, minZ, maxZ, height: c.height, baseY });
    });

    // Generate indoor & courtyard loot spots near buildings
    if (p.type === 'house' || p.type === 'villa_house' || p.type === 'cabin_house') {
      lootSpots.push(new THREE.Vector3(p.x, baseY + 0.45, p.z));
      lootSpots.push(new THREE.Vector3(p.x + 2.0 * cos, baseY + 0.45, p.z - 2.0 * sin));
    } else if (p.type === 'factory') {
      lootSpots.push(new THREE.Vector3(p.x - 1.5, baseY + 0.35, p.z + 4));
      lootSpots.push(new THREE.Vector3(p.x + 2.5, baseY + 0.35, p.z - 5));
      lootSpots.push(new THREE.Vector3(p.x, baseY + 0.35, p.z));
    } else if (p.type === 'clock_tower') {
      lootSpots.push(new THREE.Vector3(p.x + 9.5, baseY + 0.1, p.z));
      lootSpots.push(new THREE.Vector3(p.x - 9.5, baseY + 0.1, p.z + 4));
    } else {
      lootSpots.push(new THREE.Vector3(p.x + 2.6, baseY + 0.1, p.z - 2.2));
    }
    spawnPoints.push(new THREE.Vector3(p.x + 8, baseY + 0.1, p.z + 8));
  });

  // Extra scattered outdoor loot spots along ridges & roads
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const rad = 28 + ((i * 37) % 75);
    const lx = Math.cos(angle) * rad;
    const lz = Math.sin(angle) * rad;
    lootSpots.push(new THREE.Vector3(lx, groundHeightAt(lx, lz, mapId) + 0.1, lz));
  }

  // 5. Instanced Trees (Trunks + Foliage Crowns + Alpine Snow Tier)
  const treeCount = 135;
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 3.6, 7);
  trunkGeo.translate(0, 1.8, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: isAlpine ? 0x452b18 : 0x5c3a21,
    roughness: 0.9,
  });

  const crownGeo = new THREE.ConeGeometry(isAlpine ? 1.95 : 2.1, isAlpine ? 5.6 : 4.8, 7);
  crownGeo.translate(0, isAlpine ? 5.4 : 5.2, 0);
  const crownMat = new THREE.MeshStandardMaterial({
    color: isAlpine ? 0x1b4332 : isDesert ? 0x6b7c3f : 0x2f6b34,
    roughness: 0.85,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  trunks.castShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;

  let snowCaps: THREE.InstancedMesh | null = null;
  if (isAlpine) {
    const snowGeo = new THREE.ConeGeometry(1.32, 2.7, 7);
    snowGeo.translate(0, 6.95, 0);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88 });
    snowCaps = new THREE.InstancedMesh(snowGeo, snowMat, treeCount);
    snowCaps.castShadow = true;
    snowCaps.receiveShadow = true;
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placedTrees = 0;
  let attempts = 0;
  while (placedTrees < treeCount && attempts < 1000) {
    attempts++;
    const a = (attempts * 2.39996) % (Math.PI * 2);
    const r = 18 + ((attempts * 17.3) % 104);
    const tx = Math.cos(a) * r;
    const tz = Math.sin(a) * r;
    const ty = groundHeightAt(tx, tz, mapId);
    if (ty < 0.1) continue;

    // Avoid overlapping buildings or crossroads
    if (Math.abs(tx + 18) < 7.5 || Math.abs(tz - 12) < 7.5) continue;
    let blocked = false;
    for (let c = 0; c < colliders.length; c++) {
      const col = colliders[c];
      if (tx > col.minX - 3.5 && tx < col.maxX + 3.5 && tz > col.minZ - 3.5 && tz < col.maxZ + 3.5) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    const sc = 0.85 + (placedTrees % 5) * 0.08;
    dummy.position.set(tx, ty - 0.15, tz);
    dummy.rotation.set(0, (placedTrees * 1.7) % (Math.PI * 2), 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunks.setMatrixAt(placedTrees, dummy.matrix);
    crowns.setMatrixAt(placedTrees, dummy.matrix);
    if (snowCaps) snowCaps.setMatrixAt(placedTrees, dummy.matrix);

    const tint = isAlpine
      ? color.setHSL(0.41 + (placedTrees % 3) * 0.015, 0.38, 0.17 + (placedTrees % 3) * 0.03)
      : isDesert
      ? color.setHSL(0.22 + (placedTrees % 4) * 0.02, 0.35, 0.34 + (placedTrees % 3) * 0.04)
      : color.setHSL(0.32 + (placedTrees % 5) * 0.015, 0.45, 0.27 + (placedTrees % 3) * 0.04);
    crowns.setColorAt(placedTrees, tint);

    colliders.push({
      minX: tx - 0.45 * sc,
      maxX: tx + 0.45 * sc,
      minZ: tz - 0.45 * sc,
      maxZ: tz + 0.45 * sc,
      height: 5.0,
      baseY: ty,
    });
    placedTrees++;
  }
  trunks.count = placedTrees;
  crowns.count = placedTrees;
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  scene.add(trunks, crowns);
  if (snowCaps) {
    snowCaps.count = placedTrees;
    snowCaps.instanceMatrix.needsUpdate = true;
    snowCaps.computeBoundingSphere();
    scene.add(snowCaps);
  }

  // 6. Instanced Cover Boulders
  const rockCount = 55;
  const rockGeo = new THREE.DodecahedronGeometry(1.5, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: isAlpine ? 0x64748b : isDesert ? 0x9c7b56 : 0x64748b,
    roughness: 0.88,
    metalness: 0.06,
  });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  let placedRocks = 0;
  for (let i = 0; i < rockCount; i++) {
    const a = (i * 1.91) % (Math.PI * 2);
    const r = 22 + ((i * 29) % 98);
    const rx = Math.cos(a) * r;
    const rz = Math.sin(a) * r;
    const ry = groundHeightAt(rx, rz, mapId);
    if (ry < 0.0 || Math.abs(rx + 18) < 6.5 || Math.abs(rz - 12) < 6.5) continue;
    let nearBld = false;
    for (let c = 0; c < colliders.length; c++) {
      const col = colliders[c];
      if (rx > col.minX - 2.2 && rx < col.maxX + 2.2 && rz > col.minZ - 2.2 && rz < col.maxZ + 2.2) {
        nearBld = true;
        break;
      }
    }
    if (nearBld) continue;

    const sc = 0.85 + (i % 4) * 0.25;
    dummy.position.set(rx, ry + 0.65 * sc, rz);
    dummy.rotation.set(i * 0.4, i * 1.1, 0);
    dummy.scale.set(sc * 1.25, sc * 0.9, sc);
    dummy.updateMatrix();
    rocks.setMatrixAt(placedRocks, dummy.matrix);
    rocks.setColorAt(
      placedRocks,
      color.setHSL(
        isAlpine ? 0.59 : isDesert ? 0.08 : 0.6,
        isAlpine ? 0.14 : isDesert ? 0.26 : 0.1,
        isAlpine ? 0.52 + (i % 3) * 0.08 : 0.42 + (i % 3) * 0.05
      )
    );
    colliders.push({
      minX: rx - 1.3 * sc,
      maxX: rx + 1.3 * sc,
      minZ: rz - 1.1 * sc,
      maxZ: rz + 1.1 * sc,
      height: 2.2 * sc,
      baseY: ry,
    });
    placedRocks++;
  }
  rocks.count = placedRocks;
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.computeBoundingSphere();
  scene.add(rocks);

  return { colliders, spawnPoints, lootSpots };
}

