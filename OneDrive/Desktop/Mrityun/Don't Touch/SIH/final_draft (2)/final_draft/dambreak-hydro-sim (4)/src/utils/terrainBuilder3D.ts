/**
 * DAMBREAK HYDRO-SIM: 3D Geospatial Terrain & Hydrodynamic Visualization Engine
 * High-fidelity CartoDEM/SRTM procedural mesh, dam-specific gorge morphology, and dynamic flood wave solver
 */

import * as THREE from 'three';
import { DamSpecifications, RiverReachProfile, SettlementData, CriticalFacility } from '../types';
import { HIRAKUD_DAM_SPECS, INDIAN_DAMS_REGISTRY } from '../data/damData';

export interface RiverSplinePoint {
  z: number;
  x: number;
  km: number;
  bedElev: number;
  channelWidth: number;
}

/**
 * Builds a 3D longitudinal river spline from the active dam's real reaches
 */
export function buildRiverSplineForDam(dam: DamSpecifications = HIRAKUD_DAM_SPECS): RiverSplinePoint[] {
  const reaches = dam.reaches && dam.reaches.length > 0 ? dam.reaches : HIRAKUD_DAM_SPECS.reaches;
  const maxKm = reaches[reaches.length - 1]?.distanceFromDamKm || 58.0;

  return reaches.map((reach, idx) => {
    // Map km [0, maxKm] to Z coordinates [-75, 120]
    const z = -75 + (reach.distanceFromDamKm / Math.max(1, maxKm)) * 195;
    
    // Natural meandering lateral X position based on reach index and coordinates
    let x = 0;
    if (idx === 0) x = 0;
    else if (idx === 1) x = -14;
    else if (idx === 2) x = 18;
    else if (idx === 3) x = -10;
    else if (idx === 4) x = 16;
    else x = -6;

    // Scale channel width for 3D units
    const channelWidth3D = Math.max(16, Math.min(50, Math.round(reach.channelWidthM / 25)));

    return {
      z,
      x,
      km: reach.distanceFromDamKm,
      bedElev: reach.bedElevationM,
      channelWidth: channelWidth3D,
    };
  });
}

// 6 Key longitudinal control points along the default Mahanadi river valley
export const RIVER_VALLEY_SPLINE: RiverSplinePoint[] = buildRiverSplineForDam(HIRAKUD_DAM_SPECS);

/**
 * Interpolates the river centerline X position at a given longitudinal Z coordinate
 */
export function getRiverCenterAtZ(
  z: number,
  spline: RiverSplinePoint[] = RIVER_VALLEY_SPLINE
): { x: number; km: number; bedElev: number; channelWidth: number } {
  if (!spline || spline.length === 0) {
    return { x: 0, km: 0, bedElev: 140, channelWidth: 25 };
  }

  if (z <= spline[0].z) {
    const p0 = spline[0];
    return { x: p0.x, km: 0, bedElev: p0.bedElev, channelWidth: p0.channelWidth };
  }
  if (z >= spline[spline.length - 1].z) {
    const pEnd = spline[spline.length - 1];
    return { x: pEnd.x, km: pEnd.km, bedElev: pEnd.bedElev, channelWidth: pEnd.channelWidth };
  }

  for (let i = 0; i < spline.length - 1; i++) {
    const pA = spline[i];
    const pB = spline[i + 1];
    if (z >= pA.z && z <= pB.z) {
      const factor = (z - pA.z) / Math.max(0.001, pB.z - pA.z);
      // Smooth Hermite cubic interpolation for realistic meandering
      const t = factor * factor * (3 - 2 * factor);
      const x = pA.x + (pB.x - pA.x) * t;
      const km = pA.km + (pB.km - pA.km) * factor;
      const bedElev = pA.bedElev + (pB.bedElev - pA.bedElev) * factor;
      const channelWidth = pA.channelWidth + (pB.channelWidth - pA.channelWidth) * factor;
      return { x, km, bedElev, channelWidth };
    }
  }

  return { x: 0, km: 0, bedElev: 140, channelWidth: 25 };
}

/**
 * Computes natural topographic elevation E(x, z) tailored to the active dam's unique geography
 */
export function calculateTerrainElevation(
  x: number,
  z: number,
  zExaggeration: number = 1.8,
  dam: DamSpecifications = HIRAKUD_DAM_SPECS
): number {
  const spline = buildRiverSplineForDam(dam);
  const { x: riverX, bedElev, channelWidth } = getRiverCenterAtZ(z, spline);
  const distFromRiver = Math.abs(x - riverX);

  const isIdukki = dam.id === 'idukki-dam-kerala';
  const isTehri = dam.id === 'tehri-dam-uttarakhand';
  const isKallanai = dam.id === 'kallanai-dam-tamilnadu';
  const isSardarSarovar = dam.id === 'sardar-sarovar-gujarat';

  // Base elevation datum scaled to 3D units
  const baseDatum = isIdukki ? 500 : isTehri ? 550 : isKallanai ? 10 : 100;
  const baseValleyElev = Math.max(0, (bedElev - baseDatum) * (isIdukki || isTehri ? 0.08 : 0.25));

  let elevation = baseValleyElev;

  if (z < -75) {
    // UPSTREAM RESERVOIR BASIN
    const basinDist = Math.hypot(x, z + 75);
    const reservoirDepression = Math.min(2.5, basinDist * 0.04);
    
    // Mountain ridge steepness depends on topography
    const ridgeFactor = isIdukki || isTehri ? 26.0 : isKallanai ? 2.5 : 16.0;
    const ridgeRise = Math.pow(Math.abs(x) / (isIdukki ? 28 : 38), 2.2) * ridgeFactor;
    const noise = Math.sin(x * 0.12) * Math.cos(z * 0.12) * (isIdukki ? 3.5 : 1.8);
    elevation = baseValleyElev + reservoirDepression + ridgeRise + noise;
  } else {
    // DOWNSTREAM RIVER VALLEY & FLANKING RIDGES
    const halfWidth = channelWidth * (isIdukki ? 0.4 : isKallanai ? 0.75 : 0.5);
    const floodplainWidth = channelWidth * (isIdukki ? 0.9 : isKallanai ? 2.2 : 1.6);

    if (distFromRiver < halfWidth) {
      // Main riverbed channel
      const u = distFromRiver / Math.max(0.1, halfWidth);
      const bedDrop = (1.0 - u * u) * (isIdukki ? 4.5 : isKallanai ? 1.4 : 2.8);
      elevation = baseValleyElev - bedDrop;
    } else if (distFromRiver < floodplainWidth) {
      // Alluvial floodplain terrace
      const u = (distFromRiver - halfWidth) / Math.max(0.1, floodplainWidth - halfWidth);
      elevation = baseValleyElev + u * (isIdukki ? 4.0 : isKallanai ? 1.0 : 2.2);
    } else {
      // Valley canyon walls and mountain ridges
      const ridgeDist = distFromRiver - floodplainWidth;
      const ridgeScale = isIdukki ? 28.0 : isTehri ? 32.0 : isKallanai ? 3.0 : 14.0;
      const slopeRise = Math.pow(ridgeDist / (isIdukki ? 16.0 : 22.0), 1.8) * ridgeScale;
      const ridgeNoise1 = Math.sin(x * 0.08 + z * 0.04) * Math.cos(z * 0.09 - x * 0.03) * (isIdukki ? 5.2 : 3.0);
      const ridgeNoise2 = Math.sin(x * 0.18) * Math.cos(z * 0.16) * 1.2;
      elevation = baseValleyElev + (isIdukki ? 4.0 : 2.2) + slopeRise + ridgeNoise1 + ridgeNoise2;
    }
  }

  // Bound within reasonable physical limits
  return Math.max(0, elevation * (zExaggeration / 1.5));
}

/**
 * Generates a realistic satellite and topographic shaded relief canvas texture
 */
export function generateTerrainTexture(dam: DamSpecifications = HIRAKUD_DAM_SPECS): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;createIdukkiDamModel
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const imgData = ctx.createImageData(1024, 1024);
  const data = imgData.data;
  const spline = buildRiverSplineForDam(dam);

  // Render multi-layered hypsometric tints, landcover, and topographic contours
  for (let py = 0; py < 1024; py++) {
    const z = -130 + (py / 1024) * 270; // Map py to Z range [-130, 140]
    const { x: riverX, channelWidth } = getRiverCenterAtZ(z, spline);

    for (let px = 0; px < 1024; px++) {
      const x = -150 + (px / 1024) * 300; // Map px to X range [-150, 150]
      const distFromRiver = Math.abs(x - riverX);
      const elev = calculateTerrainElevation(x, z, 1.5, dam);

      const idx = (py * 1024 + px) * 4;

      let r = 70;
      let g = 88;
      let b = 65;

      if (z < -75 && Math.abs(x) < 40) {
        // Upstream submerged reservoir bed
        r = 28;
        g = 52;
        b = 58;
      } else if (distFromRiver < channelWidth * 0.5) {
        // Riverbed sand / alluvial gravel
        r = 62;
        g = 75;
        b = 78;
      } else if (distFromRiver < channelWidth * 1.5) {
        // Floodplain agricultural terraces
        const pattern = ((Math.sin(px * 0.2) + Math.cos(py * 0.2)) * 0.5 + 0.5);
        r = Math.floor(85 + pattern * 25);
        g = Math.floor(115 + pattern * 30);
        b = Math.floor(75 + pattern * 20);
      } else if (elev > 18) {
        // High rocky mountain ridge
        const rock = Math.sin(px * 0.15) * 15;
        r = Math.floor(110 + rock);
        g = Math.floor(105 + rock);
        b = Math.floor(95 + rock);
      } else {
        // Forested foothill slopes
        const veg = Math.sin(px * 0.08 + py * 0.08) * 12;
        r = Math.floor(58 + veg);
        g = Math.floor(82 + veg);
        b = Math.floor(52 + veg);
      }

      // Shaded relief hillshade lighting (Sun from NW)
      const elevE = calculateTerrainElevation(x + 1.2, z, 1.5, dam);
      const elevS = calculateTerrainElevation(x, z + 1.2, 1.5, dam);
      const dx = elevE - elev;
      const dz = elevS - elev;
      const shade = Math.max(0.6, Math.min(1.35, 1.0 - (dx * 0.12 + dz * 0.15)));

      r = Math.min(255, Math.floor(r * shade));
      g = Math.min(255, Math.floor(g * shade));
      b = Math.min(255, Math.floor(b * shade));

      // Topographic contour line overlay (every 5m elevation interval)
      if (Math.abs(elev % 3.0) < 0.15) {
        r = Math.max(0, r - 35);
        g = Math.max(0, g - 35);
        b = Math.max(0, b - 35);
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

interface DamModelContext {
  group: THREE.Group;
  damZ: number;
  damBaseY: number;
  scaleHeight: (height: number) => number;
  addBox: (width: number, height: number, depth: number, x: number, y: number, material: THREE.Material) => void;
  addCrest: (width: number, height: number, material: THREE.Material) => void;
  addGates: (positions: number[], height: number) => void;
  concrete: THREE.Material;
  stone: THREE.Material;
  earth: THREE.Material;
  pier: THREE.Material;
  gate: THREE.Material;
  crest: THREE.Material;
  breachDepthM: number;
  zExaggeration: number;
}



export function createHirakudDamModel(context: DamModelContext): void {
  const height = context.scaleHeight(61.0);
  const breachHeight = Math.max(2, (context.breachDepthM / 30) * 12 * (context.zExaggeration / 1.5));
  context.addBox(52, height, 18, -48, context.damBaseY + height * 0.5, context.concrete);
  context.addBox(52, height, 18, 48, context.damBaseY + height * 0.5, context.concrete);
  context.addBox(44, Math.max(2, height - breachHeight), 20, 0, context.damBaseY + Math.max(2, height - breachHeight) * 0.5, context.concrete);
  context.addGates([-18, -12, -6, 0, 6, 12, 18], height);
  context.addCrest(144, context.damBaseY + height, context.crest);
}

export function createIdukkiDamModel(
  context: DamModelContext
): void {
  const height = context.scaleHeight(168.91);

  const radius = 52;
  const segments = 64;
  const thickness = 5;

  const vertices: number[] = [];
  const indices: number[] = [];

  // Curved arch wall
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    const angle =
      -Math.PI * 0.40 +
      t * Math.PI * 0.80;

    const centerX =
      Math.sin(angle) * radius;

    const centerZ =
      context.damZ -
      (
        Math.cos(angle) * radius -
        radius * 0.92
      );

    // Radial direction gives the wall thickness
    const normalX = Math.sin(angle);
    const normalZ = -Math.cos(angle);

    const frontX =
      centerX + normalX * thickness * 0.5;

    const frontZ =
      centerZ + normalZ * thickness * 0.5;

    const backX =
      centerX - normalX * thickness * 0.5;

    const backZ =
      centerZ - normalZ * thickness * 0.5;

    // Bottom
    vertices.push(
      frontX,
      context.damBaseY,
      frontZ
    );

    vertices.push(
      backX,
      context.damBaseY,
      backZ
    );

    // Top
    vertices.push(
      frontX,
      context.damBaseY + height,
      frontZ
    );

    vertices.push(
      backX,
      context.damBaseY + height,
      backZ
    );
  }

  // Connect every arch segment
  for (let i = 0; i < segments; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;

    // Front surface
    indices.push(
      a,
      b,
      b + 2,

      a,
      b + 2,
      a + 2
    );

    // Back surface
    indices.push(
      a + 1,
      b + 3,
      b + 1,

      a + 1,
      a + 3,
      b + 3
    );

    // Top surface
    indices.push(
      a + 2,
      b + 2,
      b + 3,

      a + 2,
      b + 3,
      a + 3
    );

    // Bottom surface
    indices.push(
      a,
      b + 1,
      b,

      a,
      a + 1,
      b + 1
    );

    // Left/right segment edges
    indices.push(
      a,
      a + 2,
      a + 3,

      a,
      a + 3,
      a + 1
    );
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      vertices,
      3
    )
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const arch =
    new THREE.Mesh(
      geometry,
      context.concrete
    );

  arch.castShadow = true;
  arch.receiveShadow = true;

  context.group.add(arch);

  // Left abutment
  context.addBox(
    18,
    height * 0.75,
    24,
    -52,
    context.damBaseY + height * 0.375,
    context.pier
  );

  // Right abutment
  context.addBox(
    18,
    height * 0.75,
    24,
    52,
    context.damBaseY + height * 0.375,
    context.pier
  );

  // Curved crest support
  context.addCrest(
    108,
    context.damBaseY + height,
    context.crest
  );
}
export function createKallanaiDamModel(context: DamModelContext): void {
  const height = Math.max(2.4, context.scaleHeight(5.4));
  context.addBox(154, height, 13, 0, context.damBaseY + height * 0.5, context.stone);
  for (let x = -70; x <= 70; x += 14) {
    context.addBox(2.8, height + 3.5, 17, x, context.damBaseY + (height + 3.5) * 0.5, context.pier);
    context.addBox(9.5, height * 0.62, 1.2, x + 5.5, context.damBaseY + height * 0.64, context.gate);
  }
  context.addCrest(158, context.damBaseY + height, context.crest);
}

export function createTehriDamModel(context: DamModelContext): void {
  const height = context.scaleHeight(260.5);
  const shape = new THREE.Shape();
  shape.moveTo(-58, 0);
  shape.lineTo(58, 0);
  shape.lineTo(43, height);
  shape.lineTo(-43, height);
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 24, bevelEnabled: false }), context.earth);
  mesh.position.set(0, context.damBaseY, context.damZ - 12);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  context.group.add(mesh);
  context.addCrest(86, context.damBaseY + height, context.crest);
}

export function createSardarSarovarDamModel(context: DamModelContext): void {
  const height = context.scaleHeight(163);
  const breachHeight = Math.max(2, (context.breachDepthM / 30) * 12 * (context.zExaggeration / 1.5));
  context.addBox(38, height, 18, -48, context.damBaseY + height * 0.5, context.concrete);
  context.addBox(38, height, 18, 48, context.damBaseY + height * 0.5, context.concrete);
  context.addBox(42, Math.max(2, height - breachHeight), 20, 0, context.damBaseY + Math.max(2, height - breachHeight) * 0.5, context.concrete);
  context.addGates([-16, -8, 0, 8, 16], height);
  context.addCrest(134, context.damBaseY + height, context.crest);
}

export function createNagarjunaSagarDamModel(context: DamModelContext): void {
  const height = context.scaleHeight(124);
  context.addBox(154, height * 0.88, 18, 0, context.damBaseY + height * 0.44, context.stone);
  context.addBox(42, height * 0.75, 15, -83, context.damBaseY + height * 0.375, context.earth);
  context.addBox(42, height * 0.75, 15, 83, context.damBaseY + height * 0.375, context.earth);
  context.addGates([-54, -42, -30, -18, -6, 6, 18, 30, 42, 54], height);
  context.addCrest(210, context.damBaseY + height, context.crest);
}

function createFallbackDamModel(context: DamModelContext, dam: DamSpecifications): void {
  const height = context.scaleHeight(dam.heightAboveLowestFoundation);
  context.addBox(84, height, 18, 0, context.damBaseY + height * 0.5, context.concrete);
  context.addCrest(84, context.damBaseY + height, context.crest);
}

/** Creates a dam-specific 3D structure selected by the registry ID. */
export function createRealisticDamStructure(
  dam: DamSpecifications = HIRAKUD_DAM_SPECS,
  zExaggeration: number = 1.8,
  breachWidthM: number = 180,
  breachDepthM: number = 22
): THREE.Group {
  const damGroup = new THREE.Group();
  damGroup.name = `DamStructureGroup_${dam.id}`;

  const damZ = -75;
  const damBaseY = 4 * (zExaggeration / 1.5);
  const scaleHeight = (height: number) => Math.max(1.5, (height / 60) * 18 * (zExaggeration / 1.5));
  const damHeight = scaleHeight(dam.heightAboveLowestFoundation);
  const addBox = (width: number, height: number, depth: number, x: number, y: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, damZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    damGroup.add(mesh);
  };
  const addCrest = (width: number, height: number, material: THREE.Material) => addBox(width, 1.2, 7, 0, height + 0.6, material);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, roughness: 0.72, metalness: 0.1, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: 0x766f63, roughness: 0.94, flatShading: true });
  const earth = new THREE.MeshStandardMaterial({ color: 0x806b52, roughness: 1, flatShading: true });
  const pier = new THREE.MeshStandardMaterial({ color: 0x566575, roughness: 0.65 });
  const gate = new THREE.MeshStandardMaterial({ color: 0xc0ccd0, roughness: 0.35, metalness: 0.55 });
  const crest = new THREE.MeshStandardMaterial({ color: 0xd2d7d9, roughness: 0.45, metalness: 0.15 });

  const addGates = (positions: number[], height: number) => positions.forEach((x) => {
    addBox(2.4, height + 1.5, 17, x, damBaseY + height * 0.5, pier);
    addBox(7, height * 0.42, 1, x + 3.5, damBaseY + height * 0.72, gate);
  });

  const context: DamModelContext = {
    group: damGroup, damZ, damBaseY, scaleHeight, addBox, addCrest, addGates,
    concrete, stone, earth, pier, gate, crest, breachDepthM, zExaggeration,
  };
  switch (dam.id) {
    case 'hirakud-dam-odisha': createHirakudDamModel(context); break;
    case 'tehri-dam-uttarakhand': createTehriDamModel(context); break;
    case 'idukki-dam-kerala': createIdukkiDamModel(context); break;
    case 'sardar-sarovar-gujarat': createSardarSarovarDamModel(context); break;
    case 'nagarjuna-sagar-telangana-ap': createNagarjunaSagarDamModel(context); break;
    case 'kallanai-dam-tamilnadu': createKallanaiDamModel(context); break;
    default: createFallbackDamModel(context, dam); break;
  }

  // 3D Floating Pin / Marker for Dam
  const pinGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 8);
  const pinMat = new THREE.MeshBasicMaterial({ color: 0x0d9488 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.set(0, damBaseY + damHeight + 6, damZ);
  damGroup.add(pin);

  const headGeo = new THREE.SphereGeometry(1.6, 16, 16);
  const headMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, damBaseY + damHeight + 12, damZ);
  damGroup.add(head);

  return damGroup;
}

/**
 * Calculates flood wave propagation front (km downstream) and reach stages at timestep t
 */
export function getWavePropagationState(timeHours: number, dam: DamSpecifications = HIRAKUD_DAM_SPECS) {
  const reaches = dam.reaches && dam.reaches.length > 0 ? dam.reaches : HIRAKUD_DAM_SPECS.reaches;
  const maxKm = reaches[reaches.length - 1]?.distanceFromDamKm || 58.0;

  if (timeHours <= 0) {
    return {
      frontKm: 0,
      frontZ: -75,
      outflowRatio: 0,
    };
  }

  // Wave celerity propagation law scaled across full 12.0-hour simulation timeline
  const progressRatio = Math.min(1.0, Math.pow(timeHours / 12.0, 0.8));
  const frontKm = Number((maxKm * progressRatio).toFixed(1));
  const frontZ = -75 + progressRatio * 195;

  let outflowRatio = 1.0;
  if (timeHours < 2.0) {
    outflowRatio = Math.pow(timeHours / 2.0, 1.8);
  } else {
    outflowRatio = Math.max(0.2, Math.exp(-0.18 * (timeHours - 2.0)));
  }

  return { frontKm, frontZ, outflowRatio };
}

/**
 * Creates 3D Marker objects for active Dam's Census Settlements and Critical Facilities
 */
export function createGeographicMarkers(
  dam: DamSpecifications = HIRAKUD_DAM_SPECS,
  zExaggeration: number = 1.8
): THREE.Group {
  const group = new THREE.Group();
  group.name = `GeographicMarkersGroup_${dam.id}`;

  const spline = buildRiverSplineForDam(dam);
  const settlements = dam.settlements && dam.settlements.length > 0 ? dam.settlements : HIRAKUD_DAM_SPECS.settlements;
  const maxKm = dam.reaches[dam.reaches.length - 1]?.distanceFromDamKm || 58.0;

  settlements.forEach((s, idx) => {
    const z = -75 + (s.distanceFromDamKm / Math.max(1, maxKm)) * 195;
    const { x: riverX } = getRiverCenterAtZ(z, spline);
    const lateralOffset = (idx % 2 === 0 ? 1 : -1) * (12 + (idx % 3) * 6);
    const x = riverX + lateralOffset;
    const sElev = calculateTerrainElevation(x, z, zExaggeration, dam);

    const marker = new THREE.Group();
    marker.name = `SettlementMarker_${s.name}`;

    // Vertical stem
    const stemGeo = new THREE.CylinderGeometry(0.25, 0.25, 6, 8);
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 3, 0);
    marker.add(stem);

    // Marker sphere
    const sphereGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(0, 6, 0);
    marker.add(sphere);

    marker.position.set(x, sElev, z);
    marker.userData = {
      name: s.name,
      km: s.distanceFromDamKm,
      pop: s.censusPopulation.toLocaleString(),
      type: 'SETTLEMENT',
      district: s.district,
    };
    group.add(marker);
  });

  // Critical Facilities
  const facilities = dam.criticalFacilities && dam.criticalFacilities.length > 0 ? dam.criticalFacilities : HIRAKUD_DAM_SPECS.criticalFacilities;
  facilities.forEach((f, idx) => {
    const z = -75 + (f.distanceFromDamKm / Math.max(1, maxKm)) * 195;
    const { x: riverX } = getRiverCenterAtZ(z, spline);
    const lateralOffset = (idx % 2 === 0 ? -1 : 1) * (8 + (idx % 2) * 5);
    const x = riverX + lateralOffset;
    const fElev = calculateTerrainElevation(x, z, zExaggeration, dam);

    const fMarker = new THREE.Group();
    fMarker.name = `FacilityMarker_${f.name}`;

    const boxGeo = new THREE.BoxGeometry(1.6, 5, 1.6);
    const boxMat = new THREE.MeshBasicMaterial({
      color: f.type === 'HOSPITAL' ? 0xef4444 : f.type === 'POWER_STATION' ? 0xf59e0b : 0x8b5cf6,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 2.5, 0);
    fMarker.add(box);

    fMarker.position.set(x, fElev, z);
    fMarker.userData = {
      name: f.name,
      km: f.distanceFromDamKm,
      type: 'FACILITY',
      facilityType: f.type,
    };
    group.add(fMarker);
  });

  return group;
}

/**
 * Builds a 3D curved River Corridor Ribbon Geometry with upward-facing normals (+Y)
 * that strictly follows riverSpline meanders
 */
export function createRiverRibbonGeometry(
  spline: RiverSplinePoint[] = RIVER_VALLEY_SPLINE,
  segZ: number = 120,
  segX: number = 14
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const numVertices = (segZ + 1) * (segX + 1);
  const positions = new Float32Array(numVertices * 3);
  const uvs = new Float32Array(numVertices * 2);
  const normals = new Float32Array(numVertices * 3);

  for (let j = 0; j <= segZ; j++) {
    const factorZ = j / segZ;
    const z = -75 + factorZ * 195;
    const { x: rx, channelWidth } = getRiverCenterAtZ(z, spline);
    const downstreamDist = Math.max(0, z + 75);
    const halfWidth = Math.max(channelWidth * 1.6, 14 + downstreamDist * 0.04);

    for (let i = 0; i <= segX; i++) {
      const factorX = i / segX;
      const u = factorX * 2 - 1; // Lateral offset from left bank (-1) to right bank (+1)
      const x = rx + u * halfWidth;
      const idx = j * (segX + 1) + i;

      positions[idx * 3 + 0] = x;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = z;

      uvs[idx * 2 + 0] = factorX;
      uvs[idx * 2 + 1] = factorZ;

      // Upward sky-facing normal vector (+Y)
      normals[idx * 3 + 0] = 0;
      normals[idx * 3 + 1] = 1;
      normals[idx * 3 + 2] = 0;
    }
  }

  // Counter-clockwise indices for upward (+Y) facing triangles
  const numIndices = segZ * segX * 6;
  const indices = new Uint32Array(numIndices);
  let ptr = 0;

  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i;
      const b = j * (segX + 1) + (i + 1);
      const c = (j + 1) * (segX + 1) + i;
      const d = (j + 1) * (segX + 1) + (i + 1);

      // Top face winding (counter-clockwise when looking down +Y)
      indices[ptr++] = a;
      indices[ptr++] = c;
      indices[ptr++] = b;

      indices[ptr++] = b;
      indices[ptr++] = c;
      indices[ptr++] = d;
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));

  return geo;
}

