/**
 * DAMBREAK HYDRO-SIM: 3D Geospatial Terrain & Dam Model Builder
 * Procedural CartoDEM/SRTM valley topography and dam-specific structural geometry.
 * Ported from authoritative dambreak-hydro-sim (4) reference engine.
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { INDIAN_DAMS_REGISTRY } from '../data/damData';

export const SUPPORTED_DAM_MODELS = {
  'hirakud-dam-odisha': 'Hirakud Composite Masonry & Earth Fill Model',
  'tehri-dam-uttarakhand': 'Tehri Rockfill Embankment Prism Model',
  'idukki-dam-kerala': 'Idukki Double-Curvature Concrete Arch Wall Model',
  'sardar-sarovar-gujarat': 'Sardar Sarovar Concrete Gravity & Radial Gate Model',
  'nagarjuna-sagar-telangana-ap': 'Nagarjuna Sagar Masonry & Flank Embankment Model',
  'kallanai-grand-anicut-tamil-nadu': 'Kallanai Ancient Solid Stone Masonry Anicut Model',
};

/**
 * Authentic Geographical Biomes & Topographical Profiles for Indian Dam Sites
 */
export const DAM_BIOMES = {
  'hirakud-dam-odisha': {
    name: 'Mahanadi Alluvial Valley & Deciduous Basin',
    ridgeScale: 14.0,
    canyonSteepness: 1.35,
    valleyWidthFactor: 1.6,
    reservoirWidth: 125,
    treeCount: 540,
    palette: {
      highlands: '#2a3d24', // Deciduous Sal & Teak woodland
      foothills: '#3c4f2e', // Rolling Sambalpur scrub slopes
      soil: '#6b4f35',      // Odisha red laterite clay
      rock: '#4e4840',      // Ancient Precambrian gneiss
      riverbank: '#385929', // Alluvial riverbank grasses & reeds
      sediment: '#8a7752',  // Wide sandy Mahanadi riverbed silt
    },
  },
  'tehri-dam-uttarakhand': {
    name: 'Bhagirathi Himalayan Mountain Gorge',
    ridgeScale: 42.0,
    canyonSteepness: 3.1,
    valleyWidthFactor: 0.58,
    reservoirWidth: 75,
    treeCount: 660,
    palette: {
      highlands: '#132816', // Deep Himalayan Chir Pine & Deodar forest
      foothills: '#1c3820', // Alpine evergreen mountain slopes
      soil: '#3d3a36',      // Rocky Garhwal mountain scree soil
      rock: '#4a4d52',      // Dark Garhwal phyllite & slate rock cliffs
      riverbank: '#264225', // Glacial mountain stream scrub
      sediment: '#7b838c',  // Glacier-ground silt & granite gravel
    },
  },
  'idukki-dam-kerala': {
    name: 'Western Ghats Periyar Rainforest Gorge',
    ridgeScale: 32.0,
    canyonSteepness: 2.5,
    valleyWidthFactor: 0.62,
    reservoirWidth: 80,
    treeCount: 680,
    palette: {
      highlands: '#11381b', // Deep Western Ghats evergreen canopy
      foothills: '#1a4d25', // Lush tropical mountain slopes
      soil: '#4d2d18',      // Rich Kerala laterite loam
      rock: '#383632',      // Weathered Charnockite granite cliff faces
      riverbank: '#225d2c', // Moist riverbank ferns & moss
      sediment: '#4a3c30',  // Periyar riverbed gravel and alluvial loam
    },
  },
  'sardar-sarovar-gujarat': {
    name: 'Narmada Basaltic Rock Canyon',
    ridgeScale: 28.0,
    canyonSteepness: 2.3,
    valleyWidthFactor: 0.88,
    reservoirWidth: 95,
    treeCount: 560,
    palette: {
      highlands: '#2f4228', // Satpura/Vindhya dry deciduous teak forest
      foothills: '#3e5232', // Acacia & dry woodland slopes
      soil: '#594432',      // Narmada red-brown loam
      rock: '#3a3532',      // Weathered Deccan Trap dark basalt canyon cliffs
      riverbank: '#335928', // Riparian riverbank vegetation
      sediment: '#6e5e49',  // Narmada riverbed alluvium
    },
  },
  'nagarjuna-sagar-telangana-ap': {
    name: 'Krishna Deccan Plateau Gorge & Terraces',
    ridgeScale: 19.0,
    canyonSteepness: 1.85,
    valleyWidthFactor: 1.15,
    reservoirWidth: 95,
    treeCount: 320,
    palette: {
      highlands: '#3e452e',
      foothills: '#4d5034',
      soil: '#5e4e3a',
      rock: '#5a5244',
      riverbank: '#44532d',
      sediment: '#7a6d54',
    },
  },
  'kallanai-grand-anicut-tamil-nadu': {
    name: 'Cauvery Delta Alluvial Plains & Coconut Groves',
    ridgeScale: 3.2,
    canyonSteepness: 0.5,
    valleyWidthFactor: 2.3,
    reservoirWidth: 130,
    treeCount: 380,
    palette: {
      highlands: '#266329',
      foothills: '#327534',
      soil: '#523f2f',
      rock: '#635748',
      riverbank: '#347e36',
      sediment: '#9b8865',
    },
  },
};

export function isDamModelSupported(damId) {
  if (!damId) return false;
  return Boolean(SUPPORTED_DAM_MODELS[damId]);
}

/**
 * Calculates scaled 3D visual height of the dam structure above riverbed
 */
export function getDamVisualHeight(dam, zExaggeration = 1.8) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  if (activeDam.id?.toLowerCase().includes('kallanai')) {
    return 8.5 * (zExaggeration / 1.5);
  }
  const h = activeDam.heightAboveLowestFoundation || 60;
  return Math.max(2.5, (h / 60) * 18 * (zExaggeration / 1.5));
}

/**
 * Computes authentic 3D reservoir water elevation matching engineering freeboard
 */
export function calculateReservoirWaterLevel(dam, zExaggeration = 1.8, simOutput = null) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const damBaseY = calculateTerrainElevation(0, -75, zExaggeration, activeDam);
  const damHeight = getDamVisualHeight(activeDam, zExaggeration);
  const isKallanai = activeDam.id?.toLowerCase().includes('kallanai');

  let fillRatio = isKallanai ? 0.82 : 0.86;
  if (simOutput?.waterDepthAboveInvert && activeDam.heightAboveLowestFoundation) {
    fillRatio = Math.min(0.94, Math.max(0.70, simOutput.waterDepthAboveInvert / activeDam.heightAboveLowestFoundation));
  }
  return damBaseY + damHeight * fillRatio;
}

/**
 * Builds longitudinal river spline from the active dam's authentic reach coordinates
 */
export function buildRiverSplineForDam(dam) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const reaches = activeDam?.reaches && activeDam.reaches.length > 0 ? activeDam.reaches : [];
  const maxKm = reaches.length > 0 ? (reaches[reaches.length - 1]?.distanceFromDamKm || 1) : 1;

  if (reaches.length === 0) {
    return [
      { z: -75, x: 0, km: 0, bedElev: 100, channelWidth: 25 },
      { z: 120, x: 10, km: 50, bedElev: 80, channelWidth: 40 },
    ];
  }

  return reaches.map((reach, idx) => {
    // Map km [0, maxKm] to Z coordinates [-75, 120]
    const z = -75 + (reach.distanceFromDamKm / Math.max(1, maxKm)) * 195;

    let x = 0;
    if (idx === 0) x = 0;
    else if (idx === 1) x = -14;
    else if (idx === 2) x = 18;
    else if (idx === 3) x = -10;
    else if (idx === 4) x = 16;
    else x = -6;

    const channelWidth3D = Math.max(16, Math.min(50, Math.round((reach.channelWidthM || 900) / 25)));

    return {
      z,
      x,
      km: reach.distanceFromDamKm,
      bedElev: reach.bedElevationM || reach.bankElevationMSL || 140,
      channelWidth: channelWidth3D,
    };
  });
}

/**
 * Interpolates the river centerline X position at a given longitudinal Z coordinate
 */
export function getRiverCenterAtZ(z, spline) {
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
 * Computes natural topographic elevation E(x, z) tailored to active dam's geography
 */
export function calculateTerrainElevation(x, z, zExaggeration = 1.8, dam) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const biome = DAM_BIOMES[activeDam?.id] || DAM_BIOMES['hirakud-dam-odisha'];
  const spline = buildRiverSplineForDam(activeDam);
  const { x: riverX, bedElev, channelWidth } = getRiverCenterAtZ(z, spline);
  const distFromRiver = Math.abs(x - riverX);

  const isIdukki = activeDam.id === 'idukki-dam-kerala';
  const isTehri = activeDam.id === 'tehri-dam-uttarakhand';
  const isKallanai = activeDam.id.toLowerCase().includes('kallanai');

  const baseDatum = isIdukki ? 500 : isTehri ? 550 : isKallanai ? 10 : 100;
  const baseValleyElev = Math.max(0, (bedElev - baseDatum) * (isIdukki || isTehri ? 0.08 : 0.25));

  let elevation = baseValleyElev;

  if (z < -75) {
    // Upstream Reservoir Basin
    const basinDist = Math.hypot(x, z + 75);
    const reservoirDepression = Math.min(2.5, basinDist * 0.04);
    const ridgeRise = Math.pow(Math.abs(x) / (biome.reservoirWidth * 0.38), biome.canyonSteepness) * biome.ridgeScale;
    const noise = Math.sin(x * 0.12) * Math.cos(z * 0.12) * (isIdukki ? 3.5 : isTehri ? 4.5 : 1.8);
    elevation = baseValleyElev + reservoirDepression + ridgeRise + noise;
  } else {
    // Downstream River Valley & Flanking Ridges
    const halfWidth = channelWidth * (isIdukki ? 0.4 : isKallanai ? 0.8 : isTehri ? 0.45 : 0.55);
    const floodplainWidth = channelWidth * (isIdukki ? 0.85 : isKallanai ? 2.4 : isTehri ? 0.95 : 1.6);

    if (distFromRiver < halfWidth) {
      const u = distFromRiver / Math.max(0.1, halfWidth);
      const bedDrop = (1.0 - u * u) * (isIdukki ? 4.2 : isKallanai ? 1.2 : isTehri ? 4.0 : 2.6);
      elevation = baseValleyElev - bedDrop;
    } else if (distFromRiver < floodplainWidth) {
      const u = (distFromRiver - halfWidth) / Math.max(0.1, floodplainWidth - halfWidth);
      elevation = baseValleyElev + u * (isIdukki ? 3.8 : isKallanai ? 0.8 : 2.0);
    } else {
      const ridgeDist = distFromRiver - floodplainWidth;
      const slopeRise = Math.pow(ridgeDist / (isIdukki ? 17.0 : isTehri ? 16.0 : isKallanai ? 35.0 : 22.0), biome.canyonSteepness) * biome.ridgeScale;
      const ridgeNoise1 = Math.sin(x * 0.08 + z * 0.04) * Math.cos(z * 0.09 - x * 0.03) * (isIdukki ? 4.5 : isTehri ? 6.5 : 3.0);
      const ridgeNoise2 = Math.sin(x * 0.18) * Math.cos(z * 0.16) * 1.4;
      elevation = baseValleyElev + (isIdukki ? 3.2 : 2.0) + slopeRise + ridgeNoise1 + ridgeNoise2;
    }

    const isHirakud = activeDam.id === 'hirakud-dam-odisha';
    const isSardarSarovar = activeDam.id === 'sardar-sarovar-gujarat';

    // 1. Idukki: Kuravan & Kurathi twin granite hill massifs flanking the Periyar gorge
    if (isIdukki && z >= -90 && z <= -58) {
      const pinchDist = Math.abs(z - (-75));
      const abutmentX = Math.abs(x);
      if (abutmentX >= 28 && abutmentX <= 75) {
        const u = (abutmentX - 28) / 45.0;
        const longitudinalProfile = Math.cos(Math.min(1.0, pinchDist / 16.0) * (Math.PI / 2));
        const kuravanRise = Math.pow(Math.min(1.0, u), 0.85) * longitudinalProfile * 16.0;
        elevation += Math.max(0, kuravanRise);
      }
    }

    // 2. Tehri: Steep Himalayan Bhagirathi mountain gorge with soaring canyon walls
    if (isTehri) {
      const pinchDist = Math.abs(z - (-75));
      const abutmentX = Math.abs(x);
      if (abutmentX >= 24) {
        const u = (abutmentX - 24) / 40.0;
        const gorgeFactor = z < -50 ? 1.0 : Math.max(0.6, 1.0 - (z + 50) * 0.003);
        const mountainRise = Math.pow(Math.min(1.5, u), 1.25) * 26.0 * gorgeFactor;
        const jaggedRock = Math.sin(x * 0.14) * Math.cos(z * 0.12) * 3.5;
        elevation += Math.max(0, mountainRise + jaggedRock);
      }
    }

    // 3. Hirakud: Broad Mahanadi alluvial floodplain with low rolling Sambalpur hills
    if (isHirakud) {
      const abutmentX = Math.abs(x);
      // Rolling Lamdungri & Chandili Dungri laterite hills flanking the vast earthen dykes
      if (abutmentX >= 75) {
        const u = (abutmentX - 75) / 55.0;
        const hillRise = Math.sin(Math.min(1.0, u) * Math.PI * 0.5) * 11.5;
        const rollingMound = Math.sin(x * 0.06 + z * 0.05) * 2.2;
        elevation += Math.max(0, hillRise + rollingMound);
      }
    }

    // 4. Sardar Sarovar: Narmada basaltic canyon with stepped Satpura & Vindhya plateau cliffs
    if (isSardarSarovar) {
      const abutmentX = Math.abs(x);
      if (abutmentX >= 32) {
        const u = (abutmentX - 32) / 38.0;
        // Stepped geological basalt terraces characteristic of the Deccan Traps
        const step = Math.floor(Math.min(3.0, u * 3.0)) / 3.0;
        const steppedCliffs = step * 18.0 + (u - step) * 6.0;
        const cliffNoise = Math.sin(z * 0.08) * 1.8;
        elevation += Math.max(0, steppedCliffs + cliffNoise);
      }
    }
  }

  return elevation * (zExaggeration / 1.5);
}

/**
 * Generates natural CartoDEM satellite terrain texture with authentic
 * geological strata, forest vegetation, soil gradients, and riverbed sediment.
 */
export function generateTerrainTexture(dam) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const biome = DAM_BIOMES[activeDam?.id] || DAM_BIOMES['hirakud-dam-odisha'];
  const pal = biome.palette;

  // 1. Base Earthen & Rock Stratum Gradient along terrain flow
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, pal.highlands);
  grad.addColorStop(0.22, pal.foothills);
  grad.addColorStop(0.46, pal.rock);
  grad.addColorStop(0.54, pal.soil);
  grad.addColorStop(0.78, pal.riverbank);
  grad.addColorStop(1, pal.foothills);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Procedural geological rock stratum banding & canyon cliff strata
  ctx.save();
  for (let y = 0; y < 1024; y += 4) {
    const noise = Math.sin(y * 0.04) * 14 + Math.cos(y * 0.11) * 7;
    const bandShade = Math.sin(y * 0.025);
    ctx.fillStyle = bandShade > 0.35
      ? pal.rock
      : bandShade < -0.35
      ? pal.highlands
      : pal.soil;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(0, y + noise, 1024, 3);
  }
  ctx.restore();

  // 3. Natural Organic Vegetative & Soil Patches (Multi-Scale Noise)
  ctx.save();
  for (let px = 0; px < 1024; px += 32) {
    for (let py = 0; py < 1024; py += 32) {
      const n1 = Math.sin(px * 0.02) * Math.cos(py * 0.02);
      const n2 = Math.sin(px * 0.06 + 1.5) * Math.cos(py * 0.05 + 0.8);
      const combined = (n1 + n2 * 0.5) / 1.5;

      if (combined > 0.22) {
        // Lush green canopy patch
        ctx.fillStyle = pal.riverbank;
        ctx.globalAlpha = Math.min(0.45, (combined - 0.22) * 1.2);
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 24 + n2 * 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (combined < -0.28) {
        // Exposed bedrock or gravel patch
        ctx.fillStyle = pal.rock;
        ctx.globalAlpha = Math.min(0.35, (-combined - 0.28) * 1.0);
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 20 + n1 * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // 4. Sandy alluvial river sediment ribbon down the center
  ctx.save();
  ctx.fillStyle = pal.sediment;
  ctx.globalAlpha = 0.28;
  for (let sy = 0; sy < 1024; sy += 8) {
    const rx = 512 + Math.sin(sy * 0.008) * 60;
    ctx.beginPath();
    ctx.arc(rx, sy, 45 + Math.sin(sy * 0.03) * 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Natural soil/gravel speckle noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain * 1.15));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain * 0.85));
  }
  ctx.putImageData(imgData, 0, 0);

  // 6. Subtle GIS telemetry grid overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

/* ============================================================
   DAM-SPECIFIC 3D STRUCTURAL MODEL BUILDERS
   Authentic structural engineering geometries
   ============================================================ */

export function createHirakudDamModel(ctx) {
  const height = ctx.scaleHeight(61.0);
  const damZ = ctx.damZ;
  const damBaseY = ctx.damBaseY;

  // Breach parameters based on backend simulation data
  const rawBreachW = ctx.breachWidthM || 180;
  const rawBreachD = ctx.breachDepthM || 18;
  const breachW = Math.min(52, Math.max(18, rawBreachW / 7.2));
  const breachD = Math.min(height * 0.75, Math.max(3.5, rawBreachD * 0.75));

  // 1. Central Concrete Spillways (Left Spillway & Right Spillway across Mahanadi)
  // Left Spillway: X in [-46, -6], Right Spillway: X in [6, 46]
  const spillwayW = 40;
  ctx.addBox(spillwayW, height, 22, -26, damBaseY + height * 0.5, ctx.concrete);
  ctx.addBox(spillwayW, height, 22, 26, damBaseY + height * 0.5, ctx.concrete);
  ctx.addBox(12, height + 1.2, 24, 0, damBaseY + (height + 1.2) * 0.5, ctx.concrete); // Center training divide island

  // Downstream Stepped Chute Apron
  ctx.addBox(spillwayW, 2.5, 14, -26, damBaseY + 1.25, damZ + 16, ctx.concrete);
  ctx.addBox(spillwayW, 2.5, 14, 26, damBaseY + 1.25, damZ + 16, ctx.concrete);

  // Undersluice gate portals along the base of the spillways (Hirakud's famous 64 undersluices)
  for (let s = -42; s <= 42; s += 7) {
    if (Math.abs(s) > 4) {
      ctx.addBox(2.2, 2.8, 1.2, s, damBaseY + 1.8, damZ + 11.2, ctx.gate);
    }
  }

  // Radial Crest Tainter Gates and Heavy Reinforced Bridge Piers on Spillways
  ctx.addGates([-40, -32, -24, -16, -8, 8, 16, 24, 32, 40], height);

  // 2. Massive Composite Earthen/Rockfill Embankment Dykes extending into Sambalpur valley ridges
  const dykeWidth = 90;
  const dykeH = height * 0.88;

  // Left dyke: X from -135 to -46
  ctx.addBox(dykeWidth, dykeH, 30, -46 - dykeWidth * 0.5, damBaseY + dykeH * 0.5, ctx.earth);

  // Right dyke with breach washout notch if simulated
  const rDykeW1 = (dykeWidth - breachW) * 0.5;
  if (breachW > 0 && ctx.breachDepthM > 0) {
    ctx.addBox(rDykeW1, dykeH, 30, 46 + rDykeW1 * 0.5, damBaseY + dykeH * 0.5, ctx.earth);
    ctx.addBox(breachW, Math.max(1.8, dykeH - breachD), 32, 46 + rDykeW1 + breachW * 0.5, damBaseY + Math.max(1.8, dykeH - breachD) * 0.5, ctx.earth);
    ctx.addBox(rDykeW1, dykeH, 30, 46 + rDykeW1 + breachW + rDykeW1 * 0.5, damBaseY + dykeH * 0.5, ctx.earth);
  } else {
    ctx.addBox(dykeWidth, dykeH, 30, 46 + dykeWidth * 0.5, damBaseY + dykeH * 0.5, ctx.earth);
  }

  // 3. Landmark Observation Towers (Authentic Hirakud Heritage)
  // Gandhi Minar on Right Flank Hill (X = 94)
  ctx.addBox(4.5, 9.5, 4.5, 94, damBaseY + dykeH + 4.75, damZ - 2, ctx.concrete);
  ctx.addBox(6.0, 1.8, 6.0, 94, damBaseY + dykeH + 10.0, damZ - 2, ctx.crest); // Viewing balcony
  ctx.addBox(3.0, 2.2, 3.0, 94, damBaseY + dykeH + 11.5, damZ - 2, ctx.pier);  // Lantern dome

  // Nehru Minar on Left Flank Hill (X = -94)
  ctx.addBox(4.5, 9.5, 4.5, -94, damBaseY + dykeH + 4.75, damZ - 2, ctx.concrete);
  ctx.addBox(6.0, 1.8, 6.0, -94, damBaseY + dykeH + 10.0, damZ - 2, ctx.crest);
  ctx.addBox(3.0, 2.2, 3.0, -94, damBaseY + dykeH + 11.5, damZ - 2, ctx.pier);

  // 4. Continuous Highway Crest across the entire structure
  ctx.addCrest(275, damBaseY + height, ctx.crest);
}

export function createTehriDamModel(ctx) {
  const height = ctx.scaleHeight(260.5); // Towering Himalayan dam height
  const damZ = ctx.damZ;
  const damBaseY = ctx.damBaseY;
  const crestY = damBaseY + height;

  // Breach parameters
  const rawBreachW = ctx.breachWidthM || 180;
  const rawBreachD = ctx.breachDepthM || 28;
  const hasBreach = (rawBreachW > 0 && ctx.breachDepthM > 0);
  const breachW = Math.min(34, Math.max(14, rawBreachW / 8.2));
  const breachD = Math.min(height * 0.68, Math.max(4.8, rawBreachD * 0.72));
  const breachHalfW = breachW * 0.5;

  // Realistic Tehri Dam Engineering Materials
  // 1. Heavy Himalayan blasted rock riprap & rockfill embankment core
  const tehriRockfill = new THREE.MeshStandardMaterial({
    color: 0x5c5347, // Compacted slate/gneiss rockfill boulders with earthen gravel
    roughness: 0.95,
    metalness: 0.03,
    flatShading: true,
  });

  // 2. Darker boulder riprap for downstream berms and slope transitions
  const tehriBermRock = new THREE.MeshStandardMaterial({
    color: 0x484238, // Heavy hand-placed armour stone & riprap boulders
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });

  // 3. Structural reinforced hydraulic concrete for spillway training walls, piers & bridge
  const tehriConcrete = new THREE.MeshStandardMaterial({
    color: 0x9fa3a7, // Weathered cured hydraulic engineering concrete
    roughness: 0.76,
    metalness: 0.06,
  });

  // 4. Heavy shaded concrete for energy dissipators & stilling basin
  const tehriConcreteDark = new THREE.MeshStandardMaterial({
    color: 0x787d82, // Water-impact resistant foundation concrete
    roughness: 0.82,
    metalness: 0.04,
  });

  // 5. Water-washed concrete chute invert
  const tehriChuteBed = new THREE.MeshStandardMaterial({
    color: 0x868c92, // Polished high-velocity discharge chute bed
    roughness: 0.52,
    metalness: 0.08,
  });

  // 6. Asphalt roadway surface across crest
  const tehriRoad = new THREE.MeshStandardMaterial({
    color: 0x36393e, // Bituminous asphalt highway pavement
    roughness: 0.88,
    metalness: 0.10,
  });

  // 7. Structural steel for radial tainter gates & hoists
  const tehriSteelGate = new THREE.MeshStandardMaterial({
    color: 0x3a424e, // High-strength hydraulic steel radial gates
    roughness: 0.35,
    metalness: 0.78,
  });

  // ====================================================================
  // 1. MASSIVE ROCKFILL EMBANKMENT SHOULDERS (LEFT & RIGHT WINGS)
  // Authentic broad trapezoidal cross-section with 1:2.2 upstream slope,
  // 1:2 downstream slope, intermediate berm terraces, and rock riprap facets.
  // ====================================================================
  function createEmbankmentShoulderGeometry(xMin, xMax, xSegments, isLeft) {
    // Upstream to downstream cross-sectional profile along Z
    const profile = [
      { z: damZ - 42.0, yRatio: 0.00, noiseScale: 0.35 }, // Upstream toe (meets reservoir)
      { z: damZ - 28.0, yRatio: 0.36, noiseScale: 0.55 }, // Upstream lower slope
      { z: damZ - 15.0, yRatio: 0.72, noiseScale: 0.60 }, // Upstream upper slope
      { z: damZ - 5.5,  yRatio: 1.00, noiseScale: 0.20 }, // Upstream crest edge
      { z: damZ + 5.5,  yRatio: 1.00, noiseScale: 0.20 }, // Downstream crest edge
      { z: damZ + 17.0, yRatio: 0.65, noiseScale: 0.55 }, // Upper downstream slope
      { z: damZ + 21.0, yRatio: 0.65, noiseScale: 0.22 }, // Berm 1 horizontal bench
      { z: damZ + 30.0, yRatio: 0.33, noiseScale: 0.55 }, // Mid downstream slope
      { z: damZ + 34.0, yRatio: 0.33, noiseScale: 0.22 }, // Berm 2 horizontal bench
      { z: damZ + 46.0, yRatio: 0.00, noiseScale: 0.35 }, // Downstream toe (meets valley floor)
    ];

    const positions = [];
    const uvs = [];
    const indices = [];
    const numZ = profile.length;
    const numX = xSegments + 1;

    for (let i = 0; i <= xSegments; i++) {
      const u = i / xSegments;
      const x = xMin + u * (xMax - xMin);

      // Abutment lift: outer ends rise slightly to lock securely into steep canyon slopes
      const abutmentDist = isLeft ? (1.0 - u) : u;
      const abutmentLift = Math.pow(abutmentDist, 2.4) * (height * 0.16);

      for (let j = 0; j < numZ; j++) {
        const p = profile[j];
        const z = p.z;

        // Natural boulder & riprap facet noise
        const rockNoise = (
          Math.sin(x * 0.42 + z * 0.35) * 0.62 +
          Math.cos(z * 0.48 - x * 0.26) * 0.48
        ) * p.noiseScale;

        let y = damBaseY + p.yRatio * height + rockNoise;
        if (p.yRatio > 0.05) {
          y += abutmentLift;
        }

        // If breach is active and encroaches on shoulder inner edge
        if (hasBreach && (j === 3 || j === 4)) {
          const distToBreachCenter = Math.abs(x);
          if (distToBreachCenter < breachHalfW + 4.0) {
            const breachFactor = Math.max(0, 1.0 - (distToBreachCenter - breachHalfW) / 4.0);
            y -= breachD * breachFactor * 0.85;
          }
        }

        positions.push(x, y, z);
        uvs.push(u, j / (numZ - 1));
      }
    }

    // Top & slope surface triangles
    for (let i = 0; i < xSegments; i++) {
      for (let j = 0; j < numZ - 1; j++) {
        const a = i * numZ + j;
        const b = (i + 1) * numZ + j;
        const c = (i + 1) * numZ + (j + 1);
        const d = i * numZ + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Foundation skirt along the inner spillway interface
    const baseOffset = positions.length / 3;
    const innerIdx = isLeft ? (numX - 1) : 0;
    for (let j = 0; j < numZ; j++) {
      const topIdx = innerIdx * numZ + j;
      const x = positions[topIdx * 3];
      const y = positions[topIdx * 3 + 1];
      const z = positions[topIdx * 3 + 2];
      positions.push(x, y, z);
      positions.push(x, damBaseY - 3.5, z);
    }
    for (let j = 0; j < numZ - 1; j++) {
      const a = baseOffset + j * 2;
      const b = baseOffset + j * 2 + 1;
      const c = baseOffset + (j + 1) * 2 + 1;
      const d = baseOffset + (j + 1) * 2;
      if (isLeft) {
        indices.push(a, b, d);
        indices.push(b, c, d);
      } else {
        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  // Add Left Rockfill Embankment Shoulder (X: -78 to -14)
  const leftShoulderGeom = createEmbankmentShoulderGeometry(-78, -14, 16, true);
  const leftShoulderMesh = new THREE.Mesh(leftShoulderGeom, tehriRockfill);
  leftShoulderMesh.castShadow = true;
  leftShoulderMesh.receiveShadow = true;
  ctx.group.add(leftShoulderMesh);

  // Add Right Rockfill Embankment Shoulder (X: +14 to +78)
  const rightShoulderGeom = createEmbankmentShoulderGeometry(14, 78, 16, false);
  const rightShoulderMesh = new THREE.Mesh(rightShoulderGeom, tehriRockfill);
  rightShoulderMesh.castShadow = true;
  rightShoulderMesh.receiveShadow = true;
  ctx.group.add(rightShoulderMesh);

  // Sub-base foundation core to guarantee zero terrain gaps
  ctx.addBox(156, 8.0, 92, 0, damBaseY - 2.0, damZ + 2.0, tehriBermRock);

  // ====================================================================
  // 2. CENTRAL CONCRETE SPILLWAY & OUTLET STRUCTURE (X: -14 to +14)
  // Monumental hydraulic concrete works with massive training walls,
  // control crest weir, radial gates, stepped cascade chute, and flip bucket.
  // ====================================================================
  const spillwayHalfW = 14.0;
  const spillwayW = spillwayHalfW * 2;

  // Concrete Training Walls (Left & Right Chute Sidewalls retaining embankment rock)
  ctx.addBox(1.8, height * 1.05, 56, -spillwayHalfW - 0.9, damBaseY + height * 0.52, damZ + 18, tehriConcrete);
  ctx.addBox(1.8, height * 1.05, 56, spillwayHalfW + 0.9, damBaseY + height * 0.52, damZ + 18, tehriConcrete);

  // Spillway Control Weir Structure
  const weirH = height * 0.78;
  const weirTopY = damBaseY + weirH;
  ctx.addBox(spillwayW - 0.2, weirH, 7.0, 0, damBaseY + weirH * 0.5, damZ - 1.5, tehriConcrete);

  // 4 Reinforced Concrete Spillway Piers
  const pierPositions = [-10.5, -3.5, 3.5, 10.5];
  pierPositions.forEach((px) => {
    ctx.addBox(2.2, height * 0.38, 14.0, px, weirTopY + (height * 0.38) * 0.5, damZ - 0.5, tehriConcrete);
    // Hydrodynamic rounded pier nose facing upstream
    ctx.addBox(2.2, height * 0.38, 2.4, px, weirTopY + (height * 0.38) * 0.5, damZ - 8.2, tehriConcrete);
  });

  // 3 Steel Radial Tainter Gates between the piers (if breach inactive, intact gates)
  if (!hasBreach) {
    const gatePositions = [-7.0, 0.0, 7.0];
    gatePositions.forEach((gx) => {
      ctx.addBox(4.6, height * 0.24, 1.4, gx, weirTopY + (height * 0.24) * 0.5 + 0.8, damZ - 0.6, tehriSteelGate);
      // Gate hoist framing and trunnion arm anchors
      ctx.addBox(4.8, 1.2, 0.8, gx, weirTopY + height * 0.24 + 1.2, damZ - 0.6, tehriSteelGate);
    });
  }

  // Stepped Concrete Cascade Chute (10 distinct energy-dissipating aeration steps)
  const chuteStartZ = damZ + 2.0;
  const chuteEndZ = damZ + 42.0;
  const chuteLen = chuteEndZ - chuteStartZ;
  const stepCount = 10;
  for (let k = 0; k < stepCount; k++) {
    const t0 = k / stepCount;
    const t1 = (k + 1) / stepCount;
    const zStep = chuteStartZ + t0 * chuteLen;
    const stepDepth = (chuteLen / stepCount) + 0.4;
    const dropFactor = Math.pow(t1, 0.88);
    const stepY = weirTopY - dropFactor * (weirH - 2.5);
    const stepH = Math.max(1.5, stepY - damBaseY + 1.0);

    ctx.addBox(spillwayW - 0.4, stepH, stepDepth, 0, damBaseY + stepH * 0.5, zStep + stepDepth * 0.5, tehriChuteBed);
  }

  // Flip-Bucket Energy Dissipator & Downstream Stilling Basin
  // Curved concrete ski-jump deflector throwing discharge into downstream channel
  const bucketZ = damZ + 45.0;
  ctx.addBox(spillwayW + 1.6, 4.2, 7.5, 0, damBaseY + 2.1, bucketZ, tehriConcrete);
  ctx.addBox(spillwayW + 2.4, 2.2, 3.2, 0, damBaseY + 4.2, bucketZ + 2.5, tehriConcreteDark); // Curved ski-jump lip

  // Energy dissipator baffle blocks in stilling basin
  [-7.5, -3.8, 0, 3.8, 7.5].forEach((bx) => {
    ctx.addBox(1.8, 2.6, 2.0, bx, damBaseY + 3.2, bucketZ - 1.2, tehriConcreteDark);
  });

  // ====================================================================
  // 3. CONCRETE CREST STRUCTURE, ROADWAY & TELEMETRY WORKS
  // Broad highway crossing across rockfill crest with crash barriers,
  // spillway service bridge, and telemetry control station.
  // ====================================================================
  // Left and Right Roadway Deck Surfaces (Z: damZ - 5.0 to damZ + 5.0)
  ctx.addBox(64, 0.6, 10.2, -46, crestY + 0.3, damZ, tehriRoad);
  ctx.addBox(64, 0.6, 10.2, 46, crestY + 0.3, damZ, tehriRoad);

  // Upstream Concrete Crash Barrier Parapet
  ctx.addBox(64, 1.3, 0.6, -46, crestY + 0.95, damZ - 5.1, tehriConcrete);
  ctx.addBox(64, 1.3, 0.6, 46, crestY + 0.95, damZ - 5.1, tehriConcrete);

  // Downstream Concrete Crash Barrier Parapet
  ctx.addBox(64, 1.3, 0.6, -46, crestY + 0.95, damZ + 5.1, tehriConcrete);
  ctx.addBox(64, 1.3, 0.6, 46, crestY + 0.95, damZ + 5.1, tehriConcrete);

  // Overhead Service Bridge spanning over the Central Spillway
  if (!hasBreach) {
    ctx.addBox(spillwayW + 0.8, 1.2, 8.6, 0, crestY + 2.2, damZ - 0.5, tehriConcrete);
    ctx.addBox(spillwayW + 0.4, 0.4, 7.4, 0, crestY + 2.9, damZ - 0.5, tehriRoad);
    ctx.addBox(spillwayW + 0.8, 1.2, 0.5, 0, crestY + 3.5, damZ - 4.6, tehriConcrete);
    ctx.addBox(spillwayW + 0.8, 1.2, 0.5, 0, crestY + 3.5, damZ + 3.6, tehriConcrete);
  } else {
    // If breach is active, broken bridge remnants on flanks
    ctx.addBox(5.0, 1.2, 8.6, -11.5, crestY + 2.2, damZ - 0.5, tehriConcrete);
    ctx.addBox(5.0, 1.2, 8.6, 11.5, crestY + 2.2, damZ - 0.5, tehriConcrete);
  }

  // Downstream Berm Access Roads (Terraces)
  // Berm 1 Terrace Roadway (Y: damBaseY + height * 0.65, Z: damZ + 19.0)
  const berm1Y = damBaseY + height * 0.65 + 0.2;
  ctx.addBox(62, 0.4, 3.8, -46, berm1Y, damZ + 19.0, tehriBermRock);
  ctx.addBox(62, 0.4, 3.8, 46, berm1Y, damZ + 19.0, tehriBermRock);

  // Berm 2 Terrace Roadway (Y: damBaseY + height * 0.33, Z: damZ + 32.0)
  const berm2Y = damBaseY + height * 0.33 + 0.2;
  ctx.addBox(62, 0.4, 3.8, -46, berm2Y, damZ + 32.0, tehriBermRock);
  ctx.addBox(62, 0.4, 3.8, 46, berm2Y, damZ + 32.0, tehriBermRock);

  // Operation Control & Telemetry Station on Right Crest
  ctx.addBox(12.0, 7.5, 8.0, 56, crestY + 4.0, damZ, tehriConcrete);
  ctx.addBox(10.5, 2.2, 6.6, 56, crestY + 7.6, damZ, tehriSteelGate); // Observation gallery
  ctx.addBox(0.4, 7.0, 0.4, 56, crestY + 11.5, damZ, tehriSteelGate);  // Telemetry antenna mast

  // Auxiliary Switchyard Building on Left Crest
  ctx.addBox(8.5, 4.5, 6.0, -62, crestY + 2.5, damZ, tehriConcrete);

  // Massive Himalayan Rock Abutment Anchors connecting into canyon slopes
  ctx.addBox(18, height * 1.15, 52, -78, damBaseY + height * 0.55, damZ + 3, ctx.abutmentRock);
  ctx.addBox(18, height * 1.15, 52, 78, damBaseY + height * 0.55, damZ + 3, ctx.abutmentRock);

  // ====================================================================
  // 4. BREACH WASHOUT CHANNEL ADAPTATION
  // Realistic eroded trapezoidal washout breach notch through the central
  // crest and upper chute matching the downstream cataract flood waterfall.
  // ====================================================================
  if (hasBreach) {
    const breachFloorY = Math.max(damBaseY + 3.0, crestY - breachD);
    // Eroded scarp flanks flanking the breach gap
    ctx.addBox(4.0, breachD * 0.9, 14.0, -breachHalfW - 1.8, breachFloorY + breachD * 0.45, damZ - 2.0, tehriBermRock);
    ctx.addBox(4.0, breachD * 0.9, 14.0, breachHalfW + 1.8, breachFloorY + breachD * 0.45, damZ - 2.0, tehriBermRock);

    // Coarse eroded rock debris lining the washout invert
    ctx.addBox(breachW * 0.85, 2.0, 12.0, 0, breachFloorY + 1.0, damZ - 2.0, tehriRockfill);
  }
}

export function createIdukkiDamModel(ctx) {
  const height = ctx.scaleHeight(168.91);
  const hSegments = 64; // Horizontal arch resolution
  const vSegments = 24; // Vertical cantilever resolution

  // Breach parameters based on backend simulation data
  const rawBreachW = ctx.breachWidthM || 180;
  const rawBreachD = ctx.breachDepthM || 22;
  const breachW = Math.min(46, Math.max(16, rawBreachW / 7.5));
  const breachD = Math.min(18, Math.max(3.8, rawBreachD * 0.72));

  // Authentic Double-Curvature Concrete Arch Mesh Generation
  // Horizontal arch curves convex upstream into the reservoir (pushing against water pressure).
  // Vertical cantilever profile leans upstream with varying thickness from base to crest.
  const vertices = [];
  const indices = [];

  const getArchLevel = (v) => {
    // Horizontal radius of curvature: tighter at base cleft, broader at crest
    const radius = 42.0 + v * 30.0; // 42m equivalent at base, 72m equivalent at crest
    // Arch angle span (radians): flares wider at crest
    const halfAngle = 0.36 * Math.PI + v * 0.12 * Math.PI;
    // Cantilever profile: subtle upstream lean / concave downstream overhang
    const crownZ = ctx.damZ - 3.2 * Math.pow(1.0 - v, 1.3) + v * 1.6;
    const centerZ = crownZ + radius;
    // Tapering structural thickness: massive base ~15.2 units down to crest ~4.5 units
    const thickness = 15.2 * Math.pow(1.0 - v, 0.82) + 4.5;
    const y = ctx.damBaseY + v * height;
    return { radius, halfAngle, centerZ, thickness, y };
  };

  const numGridPts = (hSegments + 1) * (vSegments + 1);

  // 1. Upstream Face Vertices (facing reservoir Z < centerZ)
  for (let j = 0; j <= vSegments; j++) {
    const v = j / vSegments;
    const { radius, halfAngle, centerZ, thickness, y } = getArchLevel(v);
    const rUp = radius + thickness * 0.5;

    for (let i = 0; i <= hSegments; i++) {
      const u = i / hSegments;
      const angle = -halfAngle + u * (2 * halfAngle);
      const nx = Math.sin(angle);
      const nz = -Math.cos(angle);

      const x = nx * rUp;
      const z = centerZ + nz * rUp;

      // Carve structural breach rupture opening if active
      let actualY = y;
      if (Math.abs(x) < breachW * 0.5) {
        const breachProfile = Math.pow(1.0 - Math.pow(x / (breachW * 0.5), 2), 0.75);
        const notchDrop = breachD * breachProfile;
        const crestY = ctx.damBaseY + height;
        const breachBottomY = crestY - notchDrop;
        if (actualY > breachBottomY) {
          actualY = breachBottomY + (actualY - breachBottomY) * 0.12;
        }
      }

      vertices.push(x, actualY, z);
    }
  }

  // 2. Downstream Face Vertices (facing downstream gorge Z > centerZ)
  for (let j = 0; j <= vSegments; j++) {
    const v = j / vSegments;
    const { radius, halfAngle, centerZ, thickness, y } = getArchLevel(v);
    const rDown = radius - thickness * 0.5;

    for (let i = 0; i <= hSegments; i++) {
      const u = i / hSegments;
      const angle = -halfAngle + u * (2 * halfAngle);
      const nx = Math.sin(angle);
      const nz = -Math.cos(angle);

      const x = nx * rDown;
      const z = centerZ + nz * rDown;

      // Matching breach carving on downstream face
      let actualY = y;
      if (Math.abs(x) < breachW * 0.5) {
        const breachProfile = Math.pow(1.0 - Math.pow(x / (breachW * 0.5), 2), 0.75);
        const notchDrop = breachD * breachProfile;
        const crestY = ctx.damBaseY + height;
        const breachBottomY = crestY - notchDrop;
        if (actualY > breachBottomY) {
          actualY = breachBottomY + (actualY - breachBottomY) * 0.12;
        }
      }

      vertices.push(x, actualY, z);
    }
  }

  const rowStride = hSegments + 1;

  // Triangles for Upstream Face (oriented toward reservoir)
  for (let j = 0; j < vSegments; j++) {
    for (let i = 0; i < hSegments; i++) {
      const a = j * rowStride + i;
      const b = (j + 1) * rowStride + i;
      const c = (j + 1) * rowStride + (i + 1);
      const d = j * rowStride + (i + 1);
      indices.push(a, c, b);
      indices.push(a, d, c);
    }
  }

  // Triangles for Downstream Face (oriented toward gorge)
  for (let j = 0; j < vSegments; j++) {
    for (let i = 0; i < hSegments; i++) {
      const a = numGridPts + j * rowStride + i;
      const b = numGridPts + (j + 1) * rowStride + i;
      const c = numGridPts + (j + 1) * rowStride + (i + 1);
      const d = numGridPts + j * rowStride + (i + 1);
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  // Crest Top Surface (connecting top row of upstream & downstream)
  const topUpStart = vSegments * rowStride;
  const topDownStart = numGridPts + vSegments * rowStride;
  for (let i = 0; i < hSegments; i++) {
    const u1 = topUpStart + i;
    const u2 = topUpStart + i + 1;
    const d1 = topDownStart + i;
    const d2 = topDownStart + i + 1;
    indices.push(u1, d1, d2);
    indices.push(u1, d2, u2);
  }

  // Base Bottom Surface
  for (let i = 0; i < hSegments; i++) {
    const u1 = i;
    const u2 = i + 1;
    const d1 = numGridPts + i;
    const d2 = numGridPts + i + 1;
    indices.push(u1, d2, d1);
    indices.push(u1, u2, d2);
  }

  // Left Abutment Seam (i = 0)
  for (let j = 0; j < vSegments; j++) {
    const u1 = j * rowStride;
    const u2 = (j + 1) * rowStride;
    const d1 = numGridPts + j * rowStride;
    const d2 = numGridPts + (j + 1) * rowStride;
    indices.push(u1, d1, d2);
    indices.push(u1, d2, u2);
  }

  // Right Abutment Seam (i = hSegments)
  for (let j = 0; j < vSegments; j++) {
    const u1 = j * rowStride + hSegments;
    const u2 = (j + 1) * rowStride + hSegments;
    const d1 = numGridPts + j * rowStride + hSegments;
    const d2 = numGridPts + (j + 1) * rowStride + hSegments;
    indices.push(u1, d2, d1);
    indices.push(u1, u2, d2);
  }

  const archGeo = new THREE.BufferGeometry();
  archGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  archGeo.setIndex(indices);
  archGeo.computeVertexNormals();

  const archMesh = new THREE.Mesh(archGeo, ctx.concrete);
  archMesh.castShadow = true;
  archMesh.receiveShadow = true;
  ctx.group.add(archMesh);

  // 3. Sweeping Curved Crest Parapets & Inspection Roadway
  const crestLevel = getArchLevel(1.0);
  const crestPoints = [];
  for (let i = 0; i <= 36; i++) {
    const u = i / 36;
    const angle = -crestLevel.halfAngle + u * (2 * crestLevel.halfAngle);
    const nx = Math.sin(angle);
    const nz = -Math.cos(angle);
    const rMid = crestLevel.radius;
    const cx = nx * rMid;
    const cz = crestLevel.centerZ + nz * rMid;
    crestPoints.push(new THREE.Vector3(cx, ctx.damBaseY + height + 0.35, cz));
  }
  const crestCurve = new THREE.CatmullRomCurve3(crestPoints);
  const roadGeo = new THREE.TubeGeometry(crestCurve, 36, 1.8, 6, false);
  const roadMesh = new THREE.Mesh(roadGeo, ctx.crest);
  ctx.group.add(roadMesh);

  // Upstream & Downstream Parapet Safety Curbs
  const upParapetPoints = crestPoints.map((p, idx) => {
    const u = idx / 36;
    const angle = -crestLevel.halfAngle + u * (2 * crestLevel.halfAngle);
    return new THREE.Vector3(p.x + Math.sin(angle) * 1.8, p.y + 0.6, p.z - Math.cos(angle) * 1.8);
  });
  const upParapetCurve = new THREE.CatmullRomCurve3(upParapetPoints);
  const upParapetGeo = new THREE.TubeGeometry(upParapetCurve, 36, 0.35, 4, false);
  const upParapetMesh = new THREE.Mesh(upParapetGeo, ctx.concrete);
  ctx.group.add(upParapetMesh);

  const downParapetPoints = crestPoints.map((p, idx) => {
    const u = idx / 36;
    const angle = -crestLevel.halfAngle + u * (2 * crestLevel.halfAngle);
    return new THREE.Vector3(p.x - Math.sin(angle) * 1.8, p.y + 0.6, p.z + Math.cos(angle) * 1.8);
  });
  const downParapetCurve = new THREE.CatmullRomCurve3(downParapetPoints);
  const downParapetGeo = new THREE.TubeGeometry(downParapetCurve, 36, 0.35, 4, false);
  const downParapetMesh = new THREE.Mesh(downParapetGeo, ctx.concrete);
  ctx.group.add(downParapetMesh);

  // 4. Massive Stepped Kuravan and Kurathi Charnockite Granite Rock Abutments
  // Anchoring the arch thrust forces deep into the Western Ghats canyon walls
  // Kuravan Hill (Left Abutment / X < 0)
  ctx.addBox(18, height * 0.95, 38, -42, ctx.damBaseY + height * 0.48, ctx.abutmentRock);
  ctx.addBox(20, height * 1.12, 42, -54, ctx.damBaseY + height * 0.56, ctx.abutmentRock);
  ctx.addBox(24, height * 1.28, 48, -68, ctx.damBaseY + height * 0.64, ctx.abutmentRock);

  // Kurathi Hill (Right Abutment / X > 0)
  ctx.addBox(18, height * 0.95, 38, 42, ctx.damBaseY + height * 0.48, ctx.abutmentRock);
  ctx.addBox(20, height * 1.12, 42, 54, ctx.damBaseY + height * 0.56, ctx.abutmentRock);
  ctx.addBox(24, height * 1.28, 48, 68, ctx.damBaseY + height * 0.64, ctx.abutmentRock);

  // 5. Kuravan Hill Crest Control House / Elevator Penthouse
  ctx.addBox(6.5, 4.5, 7.5, -36, ctx.damBaseY + height + 2.3, ctx.concrete);
  ctx.addBox(4.5, 1.8, 0.4, -36, ctx.damBaseY + height + 2.8, ctx.crest); // Control window band

  // 6. Twin Low-Level River Diversion & Sluice Outlet Portals near Base
  ctx.addBox(2.8, 2.8, 2.4, -5.5, ctx.damBaseY + 2.2, ctx.damZ + 2.5, ctx.pier);
  ctx.addBox(2.8, 2.8, 2.4, 5.5, ctx.damBaseY + 2.2, ctx.damZ + 2.5, ctx.pier);
  // Dark portal conduits
  ctx.addBox(1.6, 1.6, 0.6, -5.5, ctx.damBaseY + 2.2, ctx.damZ + 3.8, ctx.gate);
  ctx.addBox(1.6, 1.6, 0.6, 5.5, ctx.damBaseY + 2.2, ctx.damZ + 3.8, ctx.gate);
}

export function createSardarSarovarDamModel(ctx) {
  const height = ctx.scaleHeight(163); // Authentic 163m towering concrete gravity height
  const damZ = ctx.damZ;
  const damBaseY = ctx.damBaseY;

  // Breach parameters based on backend simulation data
  const rawBreachW = ctx.breachWidthM || 180;
  const rawBreachD = ctx.breachDepthM || 26;
  const breachW = Math.min(48, Math.max(16, rawBreachW / 7.6));
  const breachD = Math.min(height * 0.72, Math.max(4.0, rawBreachD * 0.75));

  // 1. Massive Concrete Gravity Monolith Blocks (Central Spillway + Non-Overflow Sections)
  // Sardar Sarovar spans 1,210 meters across the Narmada gorge.
  // Main concrete gravity overflow section spans X: [-54, 54] (108 units)
  const spillwayW = 108;
  const nonOverflowLeftW = 38;
  const nonOverflowRightW = 38;

  // Non-overflow monoliths on left (South / Navagam) bank: X: [-92, -54]
  ctx.addBox(nonOverflowLeftW, height * 1.02, 34, -54 - nonOverflowLeftW * 0.5, damBaseY + height * 0.51, ctx.concrete);

  // Non-overflow monoliths on right (North / Vadodara) bank: X: [54, 92]
  ctx.addBox(nonOverflowRightW, height * 1.02, 34, 54 + nonOverflowRightW * 0.5, damBaseY + height * 0.51, ctx.concrete);

  // Overflow spillway section with breach notch carving if active
  if (breachW > 0 && ctx.breachDepthM > 0) {
    const leftIntactW = (spillwayW - breachW) * 0.5;
    ctx.addBox(leftIntactW, height, 32, -spillwayW * 0.5 + leftIntactW * 0.5, damBaseY + height * 0.5, ctx.concrete);
    // Structural breach failure cavity
    ctx.addBox(breachW, Math.max(2.8, height - breachD), 36, 0, damBaseY + Math.max(2.8, height - breachD) * 0.5, ctx.concrete);
    ctx.addBox(leftIntactW, height, 32, spillwayW * 0.5 - leftIntactW * 0.5, damBaseY + height * 0.5, ctx.concrete);
  } else {
    ctx.addBox(spillwayW, height, 32, 0, damBaseY + height * 0.5, ctx.concrete);
  }

  // 2. Downstream Stepped Chute Slope & Energy Dissipating Apron
  // Sardar Sarovar features a classic 1:0.8 downstream slope with stepped dissipation
  ctx.addBox(spillwayW + 8, height * 0.65, 18, 0, damBaseY + height * 0.325, damZ + 14, ctx.concrete);
  ctx.addBox(spillwayW + 12, height * 0.32, 22, 0, damBaseY + height * 0.16, damZ + 26, ctx.concrete);

  // 3. Stilling Basin & Massive Ski-Jump Flip Bucket at the Toe (dissipates high-velocity Narmada jets)
  ctx.addBox(spillwayW + 14, 5.5, 12, 0, damBaseY + 2.75, damZ + 38, ctx.pier);
  // Curved lip deflector
  ctx.addBox(spillwayW + 14, 3.2, 4.5, 0, damBaseY + 5.0, damZ + 43, ctx.pier);

  // 4. 30 Radial Spillway Gates with Heavy Reinforced Dividing Piers
  // 7 radial gate bays across the central spillway
  const gatePositions = [-46, -33, -20, -7, 7, 20, 33, 46];
  gatePositions.forEach((gx) => {
    // Spillway pier
    ctx.addBox(2.4, height + 3.2, 22, gx, damBaseY + height * 0.5 + 1.6, damZ, ctx.pier);
    // Radial gate (tainter gate curve)
    if (Math.abs(gx) < 46) {
      ctx.addBox(10.5, height * 0.42, 1.8, gx + 6.5, damBaseY + height * 0.72, damZ + 4.2, ctx.gate);
      // Gate hoist gantry mechanism structure
      ctx.addBox(10.5, 1.8, 4.0, gx + 6.5, damBaseY + height + 2.8, damZ, ctx.crest);
    }
  });

  // 5. Riverbed Powerhouse (RBPH) & Chute Training Walls on South Bank (X: -76 to -56)
  // 1,200 MW underground & surface powerhouse intake and discharge channel
  ctx.addBox(24, height * 0.48, 42, -68, damBaseY + height * 0.24, damZ + 22, ctx.concrete);
  // Powerhouse transformer yard / generator deck
  ctx.addBox(20, 4.2, 26, -68, damBaseY + height * 0.48 + 2.1, damZ + 24, ctx.pier);

  // 6. Narmada Main Canal (NMC) Head Regulator on North Bank (X: 62 to 84)
  // Feeds world's largest irrigation canal
  ctx.addBox(22, height * 0.62, 28, 72, damBaseY + height * 0.31, damZ - 8, ctx.concrete);
  // Canal intake gates
  for (let cg = 64; cg <= 80; cg += 5.5) {
    ctx.addBox(4.0, height * 0.35, 1.5, cg, damBaseY + height * 0.25, damZ - 21.5, ctx.gate);
  }

  // 7. Basalt Canyon Abutment Anchors (Satpura Range on South, Vindhya Range on North)
  ctx.addBox(36, height * 1.15, 64, -106, damBaseY + height * 0.575, ctx.abutmentRock);
  ctx.addBox(36, height * 1.15, 64, 106, damBaseY + height * 0.575, ctx.abutmentRock);

  // 8. Continuous Crest Roadway Highway Bridge
  ctx.addCrest(235, damBaseY + height, ctx.crest);
}

export function createNagarjunaSagarDamModel(ctx) {
  const height = ctx.scaleHeight(124);
  // Center masonry overflow & non-overflow section
  ctx.addBox(140, height * 0.90, 24, 0, ctx.damBaseY + height * 0.45, ctx.stone);

  // Long earthen flank embankments connecting into valley flanks
  ctx.addBox(56, height * 0.78, 28, -98, ctx.damBaseY + height * 0.39, ctx.earth);
  ctx.addBox(56, height * 0.78, 28, 98, ctx.damBaseY + height * 0.39, ctx.earth);

  // Crest chute gates
  ctx.addGates([-48, -36, -24, -12, 0, 12, 24, 36, 48], height);
  ctx.addCrest(240, ctx.damBaseY + height, ctx.crest);
}

export function createKallanaiDamModel(ctx) {
  const height = ctx.scaleHeight(5.4); // Imposing ~8.5 scene units high
  const damZ = ctx.damZ;
  const damBaseY = ctx.damBaseY;

  // Breach parameters based on backend simulation data
  const rawBreachW = ctx.breachWidthM || 45;
  const rawBreachD = ctx.breachDepthM || 6.5;
  const breachW = Math.min(32, Math.max(12, rawBreachW / 2.8));
  const breachD = Math.min(height * 0.75, Math.max(3.0, rawBreachD * 0.7));

  // Kallanai spans 329m across the Cauvery river. In scene coordinates: X from -64 to 64 (128 units wide)
  const anicutSpan = 128;
  const wallThickness = 14;

  // 1. Solid Dravidian Granite Masonry Anicut Weir Body
  // In the center, breach notch is carved out if active
  if (breachW > 0 && ctx.breachDepthM > 0) {
    const leftW = (anicutSpan - breachW) * 0.5;
    // Left intact masonry wing
    ctx.addBox(leftW, height, wallThickness, -anicutSpan * 0.5 + leftW * 0.5, damBaseY + height * 0.5, ctx.graniteStone);
    // Breach failure depression / ruptured stonework
    ctx.addBox(breachW, Math.max(1.8, height - breachD), wallThickness + 4, 0, damBaseY + Math.max(1.8, height - breachD) * 0.5, ctx.earth);
    // Right intact masonry wing
    ctx.addBox(leftW, height, wallThickness, anicutSpan * 0.5 - leftW * 0.5, damBaseY + height * 0.5, ctx.graniteStone);
  } else {
    // Solid uncut granite weir wall
    ctx.addBox(anicutSpan, height, wallThickness, 0, damBaseY + height * 0.5, ctx.graniteStone);
  }

  // 2. Downstream Sloping Masonry Glacis & Energy-Dissipating Apron (Talus)
  // Stepped masonry apron dissipates hydraulic energy onto alluvial bed
  ctx.addBox(anicutSpan + 6, height * 0.52, 16, 0, damBaseY + height * 0.26, damZ + 12, ctx.graniteStone);
  ctx.addBox(anicutSpan + 10, height * 0.22, 14, 0, damBaseY + height * 0.11, damZ + 24, ctx.stone);

  // Energy dissipating granite baffle blocks (talus boulders)
  for (let bx = -54; bx <= 54; bx += 12) {
    ctx.addBox(3.2, 2.2, 3.2, bx, damBaseY + 1.1, damZ + 20, ctx.pier);
  }

  // 3. 30 Historical Sluice Vent Arches with Heavy Granite Divider Piers
  const sluicePositions = [-50, -42, -34, -26, -18, -10, -2, 6, 14, 22, 30, 38, 46, 54];
  sluicePositions.forEach((sx) => {
    // Heavy granite dividing pier
    ctx.addBox(2.2, height + 1.8, wallThickness + 2, sx, damBaseY + (height + 1.8) * 0.5, ctx.pier);
    // Sluice vent arch opening
    if (sx < 54 && Math.abs(sx + 4) > breachW * 0.45) {
      // Under-sluice vent opening (dark shadow void)
      ctx.addBox(5.8, height * 0.38, 2.0, sx + 4, damBaseY + height * 0.20, damZ + 1.0, ctx.gate);
    }
  });

  // 4. Sir Arthur Cotton 15 Crest Regulator Gates across Central Reach
  const gatePositions = [-26, -18, -10, -2, 6, 14, 22];
  gatePositions.forEach((gx) => {
    // Lift gate panel
    ctx.addBox(6.0, height * 0.45, 1.4, gx + 4, damBaseY + height * 0.65, damZ - 2.5, ctx.gate);
    // Gate hoist gantry mechanism
    ctx.addBox(6.0, 1.2, 2.6, gx + 4, damBaseY + height + 1.8, damZ - 1.5, ctx.crest);
  });

  // 5. Left & Right Flank River Training Bunds & Canal Head Regulators
  // Left flank: Kollidam (Coleroon) under-sluice regulator structure (X: -76 to -64)
  ctx.addBox(22, height * 1.1, 28, -75, damBaseY + height * 0.55, damZ, ctx.graniteStone);
  // Right flank: Vennar canal intake regulator structure (X: 64 to 76)
  ctx.addBox(22, height * 1.1, 28, 75, damBaseY + height * 0.55, damZ, ctx.graniteStone);

  // 6. Motorable Roadway Crest Bridge & Historic Masonry Parapets
  ctx.addCrest(anicutSpan + 28, damBaseY + height, ctx.stoneCap);
  // White/stone masonry parapet walls along both sides of the roadway
  ctx.addBox(anicutSpan + 28, 1.2, 0.8, 0, damBaseY + height + 1.3, damZ - 3.6, ctx.stoneCap);
  ctx.addBox(anicutSpan + 28, 1.2, 0.8, 0, damBaseY + height + 1.3, damZ + 3.6, ctx.stoneCap);
}

/**
 * Creates the dam-specific 3D structure according to active dam ID
 */
export function createRealisticDamStructure(dam, zExaggeration = 1.8, breachWidthM = 180, breachDepthM = 22) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const damGroup = new THREE.Group();
  damGroup.name = `DamStructureGroup_${activeDam.id}`;

  const damZ = -75;
  // Anchor dynamically to terrain riverbed elevation so the dam is NEVER buried underground
  const damBaseY = calculateTerrainElevation(0, damZ, zExaggeration, activeDam);
  const scaleHeight = (h) => {
    if (activeDam.id?.toLowerCase().includes('kallanai')) {
      return 8.5 * (zExaggeration / 1.5);
    }
    return Math.max(2.5, (h / 60) * 18 * (zExaggeration / 1.5));
  };
  const damHeight = scaleHeight(activeDam.heightAboveLowestFoundation || 60);

  const addBox = (width, height, depth, x, y, arg6, arg7) => {
    let material = arg6;
    let zPos = damZ;
    if (typeof arg6 === 'number') {
      zPos = arg6;
      material = arg7;
    } else if (typeof arg7 === 'number') {
      zPos = arg7;
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, zPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    damGroup.add(mesh);
  };

  const addCrest = (width, height, material) => addBox(width, 1.4, 8, 0, height + 0.7, material);

  // Realistic engineering materials tailored to dam construction type:
  // Weathered structural concrete with matte roughness
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x94979a, // Authentic weathered cured civil concrete
    roughness: 0.82,
    metalness: 0.04,
    flatShading: false,
  });

  // Cut-stone masonry with earthy undertone
  const stone = new THREE.MeshStandardMaterial({
    color: 0x736d65, // Hand-hewn granite/sandstone masonry blocks
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });

  // Ancient Dravidian dressed granite stone masonry (high-contrast rough stone blocks for Kallanai)
  const graniteStone = new THREE.MeshStandardMaterial({
    color: 0x3d3935, // Deep weathered Dravidian granite blocks
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true,
  });

  const stoneCap = new THREE.MeshStandardMaterial({
    color: 0x5a534c, // Dressed coping granite slabs
    roughness: 0.88,
    metalness: 0.06,
  });

  // Compacted rockfill and earthen embankment core
  const earth = new THREE.MeshStandardMaterial({
    color: 0x6e5d48, // Compacted boulder/riprap rockfill with gravel
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });

  // Massive reinforced concrete spillway piers
  const pier = new THREE.MeshStandardMaterial({
    color: 0x7b8084, // Heavy reinforced bridge/spillway piers
    roughness: 0.75,
    metalness: 0.08,
  });

  // Metallic structural steel radial gates
  const gate = new THREE.MeshStandardMaterial({
    color: 0x4a5568, // Industrial steel radial tainter gates
    roughness: 0.32,
    metalness: 0.75,
  });

  // Roadway crest pavement & concrete parapet
  const crest = new THREE.MeshStandardMaterial({
    color: 0x5a5f66, // Asphalt/concrete crest road surface
    roughness: 0.65,
    metalness: 0.12,
  });

  // Abutment wing walls anchoring dam to rock face
  const abutmentRock = new THREE.MeshStandardMaterial({
    color: 0x544c41, // Natural canyon wall rock stratum
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });

  const addGates = (positions, height) => positions.forEach((x) => {
    addBox(2.6, height + 1.8, 18, x, damBaseY + height * 0.5, pier);
    addBox(6.8, height * 0.44, 1.4, x + 3.4, damBaseY + height * 0.70, gate);
  });

  const ctx = {
    group: damGroup,
    damZ,
    damBaseY,
    scaleHeight,
    addBox,
    addCrest,
    addGates,
    concrete,
    stone,
    graniteStone,
    stoneCap,
    earth,
    pier,
    gate,
    crest,
    abutmentRock,
    breachWidthM,
    breachDepthM,
    zExaggeration,
  };

  switch (activeDam.id) {
    case 'hirakud-dam-odisha':
      createHirakudDamModel(ctx);
      break;
    case 'tehri-dam-uttarakhand':
      createTehriDamModel(ctx);
      break;
    case 'idukki-dam-kerala':
      createIdukkiDamModel(ctx);
      break;
    case 'sardar-sarovar-gujarat':
      createSardarSarovarDamModel(ctx);
      break;
    case 'nagarjuna-sagar-telangana-ap':
      createNagarjunaSagarDamModel(ctx);
      break;
    case 'kallanai-grand-anicut-tamil-nadu':
      createKallanaiDamModel(ctx);
      break;
    default:
      // Dam does not have an authenticated 3D architectural model
      return null;
  }

  // Discreet dam crest inspection telemetry point (not glowing blue rod)
  const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 4, 8);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.set(0, damBaseY + damHeight + 2, damZ);
  damGroup.add(pin);

  const headGeo = new THREE.SphereGeometry(1.0, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, damBaseY + damHeight + 4.2, damZ);
  head.userData = { name: activeDam.name, type: 'DAM', details: `${activeDam.damType} · ${activeDam.heightAboveLowestFoundation}m` };
  damGroup.add(head);

  return damGroup;
}

/**
 * Creates river corridor and wide floodplain inundation mesh geometry following longitudinal spline.
 * Broadened lateral span allows realistic visualization of massive dam-break flood volumes across valley floor.
 */
export function createRiverRibbonGeometry(spline, segZ = 160, segX = 36, widthMultiplier = 2.6) {
  const zStart = -75;
  const zEnd = 120;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segZ; i++) {
    const tZ = i / segZ;
    const z = zStart + tZ * (zEnd - zStart);
    const { x: centerX, channelWidth } = getRiverCenterAtZ(z, spline);
    // Span wide across the floodplain (minimum half-width 36m to 70m depending on channelWidth)
    const halfW = Math.max(36, channelWidth * widthMultiplier);

    for (let j = 0; j <= segX; j++) {
      const tX = j / segX;
      const x = centerX - halfW + tX * (halfW * 2);
      positions.push(x, 0, z);
    }
  }

  const rowSize = segX + 1;
  for (let i = 0; i < segZ; i++) {
    for (let j = 0; j < segX; j++) {
      const a = i * rowSize + j;
      const b = (i + 1) * rowSize + j;
      const c = (i + 1) * rowSize + (j + 1);
      const d = i * rowSize + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates 3D volumetric river & flood corridor geometry with top water surface and side boundary skirt walls.
 * Gives the downstream flood real 3D depth and volume occupying the river channel rather than a flat sheet.
 */
export function createVolumetricFloodGeometry(spline, segZ = 140, segX = 32, widthMultiplier = 2.6) {
  const zStart = -75;
  const zEnd = 120;
  const positions = [];
  const uvs = [];
  const indices = [];

  // 1. Top Flood Water Surface Grid
  for (let i = 0; i <= segZ; i++) {
    const tZ = i / segZ;
    const z = zStart + tZ * (zEnd - zStart);
    const { x: centerX, channelWidth } = getRiverCenterAtZ(z, spline);
    const halfW = Math.max(36, channelWidth * widthMultiplier);

    for (let j = 0; j <= segX; j++) {
      const tX = j / segX;
      const x = centerX - halfW + tX * (halfW * 2);
      positions.push(x, 0, z);
      uvs.push(tX, tZ);
    }
  }

  const topRowSize = segX + 1;
  for (let i = 0; i < segZ; i++) {
    for (let j = 0; j < segX; j++) {
      const a = i * topRowSize + j;
      const b = (i + 1) * topRowSize + j;
      const c = (i + 1) * topRowSize + (j + 1);
      const d = i * topRowSize + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const topVertexCount = (segZ + 1) * (segX + 1);

  // 2. Left Skirt Wall (connects left edge j=0 to ground)
  const leftSkirtStart = positions.length / 3;
  for (let i = 0; i <= segZ; i++) {
    const tZ = i / segZ;
    const z = zStart + tZ * (zEnd - zStart);
    const { x: centerX, channelWidth } = getRiverCenterAtZ(z, spline);
    const halfW = Math.max(36, channelWidth * widthMultiplier);
    const x = centerX - halfW;

    positions.push(x, 0, z);
    uvs.push(0, tZ);
    positions.push(x, 0, z);
    uvs.push(0, tZ);
  }

  for (let i = 0; i < segZ; i++) {
    const a = leftSkirtStart + i * 2;
    const b = leftSkirtStart + i * 2 + 1;
    const c = leftSkirtStart + (i + 1) * 2 + 1;
    const d = leftSkirtStart + (i + 1) * 2;
    indices.push(a, b, d);
    indices.push(b, c, d);
  }

  // 3. Right Skirt Wall (connects right edge j=segX to ground)
  const rightSkirtStart = positions.length / 3;
  for (let i = 0; i <= segZ; i++) {
    const tZ = i / segZ;
    const z = zStart + tZ * (zEnd - zStart);
    const { x: centerX, channelWidth } = getRiverCenterAtZ(z, spline);
    const halfW = Math.max(36, channelWidth * widthMultiplier);
    const x = centerX + halfW;

    positions.push(x, 0, z);
    uvs.push(1, tZ);
    positions.push(x, 0, z);
    uvs.push(1, tZ);
  }

  for (let i = 0; i < segZ; i++) {
    const a = rightSkirtStart + i * 2;
    const b = rightSkirtStart + i * 2 + 1;
    const c = rightSkirtStart + (i + 1) * 2 + 1;
    const d = rightSkirtStart + (i + 1) * 2;
    indices.push(a, d, b);
    indices.push(b, d, c);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.userData = {
    segZ,
    segX,
    topVertexCount,
    leftSkirtStart,
    rightSkirtStart,
  };
  return geom;
}

/**
 * Updates dynamic volumetric flood wave mesh with large rolling hydraulic bore, trailing swells,
 * directional churning water, and aerated whitewater foam caps.
 */
export function updateVolumetricFloodWave(
  floodMesh,
  simulationTimeHours,
  waveState,
  activeDam,
  activeSim,
  zExaggeration,
  elapsedTime
) {
  if (!floodMesh || !floodMesh.geometry) return;
  const geo = floodMesh.geometry;
  const pos = geo.attributes.position;
  const colors = geo.attributes.color;
  if (!colors) return;
  const { segZ, segX, leftSkirtStart, rightSkirtStart } = geo.userData || { segZ: 140, segX: 32, leftSkirtStart: 4653, rightSkirtStart: 4935 };

  const frontZ = waveState.frontZ;
  const spline = buildRiverSplineForDam(activeDam);
  const rowSize = segX + 1;

  let outflowIntensity = waveState.outflowRatio;
  if (activeSim?.hydrograph && activeSim.hydrograph.length > 0) {
    const pt = activeSim.hydrograph.find((h) => Math.abs(h.timeHours - simulationTimeHours) < 0.35);
    if (pt && activeSim.peakBreachOutflowM3s > 0) {
      outflowIntensity = Math.min(1.5, Math.max(0.08, pt.outflowDischargeM3s / activeSim.peakBreachOutflowM3s));
    }
  }

  // 1. Update Top Surface Vertices
  for (let i = 0; i <= segZ; i++) {
    for (let j = 0; j <= segX; j++) {
      const idx = i * rowSize + j;
      const vx = pos.getX(idx);
      const vz = pos.getZ(idx);

      if (vz <= frontZ && simulationTimeHours > 0.02) {
        const distFromFront = frontZ - vz;
        const { x: riverCenterX, km: reachKm } = getRiverCenterAtZ(vz, spline);
        const distFromCenter = Math.abs(vx - riverCenterX);

        const authenticDepthM = getInundationDepthAtKm(reachKm, activeSim, 8.5);
        const sceneDepthScale = (authenticDepthM / 6.0) * (zExaggeration / 1.5);

        // Parabolic lateral profile across floodplain
        const lateralTaper = Math.max(0.12, 1.0 - Math.pow(distFromCenter / 72.0, 1.9));

        // Base steady flood thickness
        const baseThickness = Math.max(1.0, 4.5 * sceneDepthScale * lateralTaper * (0.8 + outflowIntensity * 0.45));

        // 1. Large Rolling Wave Head (Hydraulic Bore)
        let boreWave = 0;
        if (distFromFront < 26.0) {
          const phase = (distFromFront / 26.0) * Math.PI;
          boreWave = Math.sin(phase) * (3.8 * sceneDepthScale + 1.2) * Math.exp(-distFromFront / 22.0);
        }

        // 2. Trailing rolling hydraulic swells rolling downstream
        const swell = Math.sin(vz * 0.28 - elapsedTime * 6.2) * (1.6 * lateralTaper) * Math.min(1.0, distFromFront / 10.0);

        // 3. Directional churning & breaking ripples
        const churn = (
          Math.sin(vz * 0.85 - elapsedTime * 11.0) * 0.75 +
          Math.cos(vx * 0.85 + vz * 0.35 - elapsedTime * 8.5) * 0.50 +
          Math.sin((vx + vz) * 1.2 - elapsedTime * 14.0) * 0.35
        ) * lateralTaper;

        const bedY = calculateTerrainElevation(vx, vz, zExaggeration, activeDam);
        const waterY = bedY + baseThickness + boreWave + swell + churn;
        pos.setY(idx, waterY);

        // Dynamic Foam & Whitewater Colors
        if (distFromFront < 14.0) {
          // Intense aerated boiling whitewater froth on hydraulic bore head
          const foamRatio = Math.max(0.8, 1.0 - distFromFront / 14.0);
          colors.setXYZ(idx, 0.95 * foamRatio, 0.98 * foamRatio, 1.0);
        } else if ((boreWave + swell + churn) > 1.2) {
          // Foaming white crest caps
          colors.setXYZ(idx, 0.90, 0.95, 1.0);
        } else if (distFromCenter < 30 && lateralTaper > 0.55) {
          // Deep high-velocity flood core (rich hydraulic azure/cyan)
          colors.setXYZ(idx, 0.04, 0.32, 0.68);
        } else {
          // Translucent shallow margins
          colors.setXYZ(idx, 0.10, 0.56, 0.78);
        }
      } else {
        // Dry riverbed downstream of flood wave
        const bedY = calculateTerrainElevation(vx, vz, zExaggeration, activeDam);
        pos.setY(idx, bedY - 1.8);
        colors.setXYZ(idx, 0.01, 0.05, 0.10);
      }
    }
  }

  // 2. Update Left and Right Skirts
  for (let i = 0; i <= segZ; i++) {
    const topIdx = i * rowSize; // j=0
    const topY = pos.getY(topIdx);
    const topX = pos.getX(topIdx);
    const topZ = pos.getZ(topIdx);
    const bedY = calculateTerrainElevation(topX, topZ, zExaggeration, activeDam);

    const lTopIdx = leftSkirtStart + i * 2;
    const lBotIdx = leftSkirtStart + i * 2 + 1;
    pos.setY(lTopIdx, topY);
    pos.setY(lBotIdx, Math.min(topY, bedY - 0.2));

    if (topZ <= frontZ && simulationTimeHours > 0.02) {
      colors.setXYZ(lTopIdx, 0.10, 0.45, 0.70);
      colors.setXYZ(lBotIdx, 0.02, 0.20, 0.45);
    } else {
      colors.setXYZ(lTopIdx, 0.01, 0.05, 0.10);
      colors.setXYZ(lBotIdx, 0.01, 0.05, 0.10);
    }

    const rightTopIdx = i * rowSize + segX;
    const rTopY = pos.getY(rightTopIdx);
    const rTopX = pos.getX(rightTopIdx);
    const rTopZ = pos.getZ(rightTopIdx);
    const rBedY = calculateTerrainElevation(rTopX, rTopZ, zExaggeration, activeDam);

    const rTopVertIdx = rightSkirtStart + i * 2;
    const rBotVertIdx = rightSkirtStart + i * 2 + 1;
    pos.setY(rTopVertIdx, rTopY);
    pos.setY(rBotVertIdx, Math.min(rTopY, rBedY - 0.2));

    if (rTopZ <= frontZ && simulationTimeHours > 0.02) {
      colors.setXYZ(rTopVertIdx, 0.10, 0.45, 0.70);
      colors.setXYZ(rBotVertIdx, 0.02, 0.20, 0.45);
    } else {
      colors.setXYZ(rTopVertIdx, 0.01, 0.05, 0.10);
      colors.setXYZ(rBotVertIdx, 0.01, 0.05, 0.10);
    }
  }

  pos.needsUpdate = true;
  colors.needsUpdate = true;
  geo.computeVertexNormals();
}

/**
 * Extracts authentic reach flood depth at a given distance (km) downstream
 * from backend simulationOutput.floodExtentGeoJson or maxFloodDepthM
 */
export function getInundationDepthAtKm(km, simulationOutput, defaultDepth = 8.5) {
  if (!simulationOutput) return defaultDepth;

  const features = simulationOutput.floodExtentGeoJson?.features;
  if (features && Array.isArray(features) && features.length > 0) {
    // Sort features by distanceKm
    const sorted = [...features]
      .filter((f) => f.properties && typeof f.properties.distanceKm === 'number')
      .sort((a, b) => a.properties.distanceKm - b.properties.distanceKm);

    if (sorted.length > 0) {
      if (km <= sorted[0].properties.distanceKm) {
        return sorted[0].properties.depthM || defaultDepth;
      }
      if (km >= sorted[sorted.length - 1].properties.distanceKm) {
        return sorted[sorted.length - 1].properties.depthM || defaultDepth;
      }
      for (let i = 0; i < sorted.length - 1; i++) {
        const rA = sorted[i].properties;
        const rB = sorted[i + 1].properties;
        if (km >= rA.distanceKm && km <= rB.distanceKm) {
          const t = (km - rA.distanceKm) / Math.max(0.01, rB.distanceKm - rA.distanceKm);
          return (rA.depthM || defaultDepth) * (1 - t) + (rB.depthM || defaultDepth) * t;
        }
      }
    }
  }

  if (typeof simulationOutput.maxFloodDepthM === 'number' && simulationOutput.maxFloodDepthM > 0) {
    // Attenuate depth naturally with distance downstream
    const attenuation = Math.max(0.45, 1.0 - (km / 60.0) * 0.4);
    return simulationOutput.maxFloodDepthM * attenuation;
  }

  return defaultDepth;
}

/**
 * Calculates flood wave propagation front (km downstream) and position at simulation time t
 */
export function getWavePropagationState(timeHours, dam) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const reaches = activeDam.reaches || [];
  const maxKm = reaches.length > 0 ? (reaches[reaches.length - 1]?.distanceFromDamKm || 1) : 1;

  if (timeHours <= 0) {
    return { frontKm: 0, frontZ: -75, outflowRatio: 0 };
  }

  const frontKm = Math.min(maxKm, Number((16.8 * Math.pow(timeHours, 0.82)).toFixed(1)));
  const progress = frontKm / Math.max(1, maxKm);
  const frontZ = -75 + progress * 195;
  const outflowRatio = Math.min(1.0, Math.sin((Math.PI / 2) * Math.min(1.0, timeHours / 2.0)));

  return { frontKm, frontZ, outflowRatio };
}

/**
 * Creates 3D interactive markers for settlements and critical facilities
 */
export function createGeographicMarkers(dam, zExaggeration = 1.8) {
  const group = new THREE.Group();
  group.name = 'GeographicMarkersGroup';
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const spline = buildRiverSplineForDam(activeDam);

  // Settlement markers
  const settlements = activeDam.settlements || [];
  const reaches = activeDam.reaches || [];
  const maxKm = reaches.length > 0 ? (reaches[reaches.length - 1]?.distanceFromDamKm || 1) : 1;

  settlements.forEach((s) => {
    const z = -75 + (s.distanceFromDamKm / Math.max(1, maxKm)) * 195;
    const { x: riverX } = getRiverCenterAtZ(z, spline);
    const x = riverX + 16;
    const y = calculateTerrainElevation(x, z, zExaggeration, activeDam) + 3;

    const pinGeo = new THREE.SphereGeometry(1.4, 12, 12);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
    const marker = new THREE.Mesh(pinGeo, pinMat);
    marker.position.set(x, y, z);
    marker.userData = {
      name: s.name,
      type: 'SETTLEMENT',
      km: s.distanceFromDamKm,
      elevationM: s.elevationMSL,
      censusPopulation: s.censusPopulation,
      district: s.district,
    };
    group.add(marker);
  });

  // Critical facility markers
  const facilities = activeDam.criticalFacilities || [];
  facilities.forEach((f) => {
    const z = -75 + (f.distanceFromDamKm / Math.max(1, maxKm)) * 195;
    const { x: riverX } = getRiverCenterAtZ(z, spline);
    const x = riverX - 16;
    const y = calculateTerrainElevation(x, z, zExaggeration, activeDam) + 3;

    const pinGeo = new THREE.BoxGeometry(2.4, 2.4, 2.4);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const marker = new THREE.Mesh(pinGeo, pinMat);
    marker.position.set(x, y, z);
    marker.userData = {
      name: f.name,
      type: 'FACILITY',
      km: f.distanceFromDamKm,
      elevationM: f.elevationMSL,
      facilityType: f.facilityType,
      criticalLevel: f.criticalLevel,
    };
    group.add(marker);
  });

  return group;
}

/**
 * Creates a geographic reference marker for dam location when an architectural 3D model is unavailable.
 * This is a minimal simulation reference marker based purely on registry coordinates/specs.
 * NOT an architectural model.
 */
export function createDamLocationReferenceMarker(dam, zExaggeration = 1.3) {
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const refGroup = new THREE.Group();
  refGroup.name = `DamLocationReferenceGroup_${activeDam.id}`;

  const damZ = -75;
  const baseY = calculateTerrainElevation(0, damZ, zExaggeration, activeDam);

  // Minimal reference marker: subtle transversal axis indicator (dashed/semi-transparent)
  const axisWidth = Math.min(180, Math.max(60, activeDam.crestLengthM ? activeDam.crestLengthM * 0.25 : 90));
  const axisGeo = new THREE.CylinderGeometry(0.8, 0.8, axisWidth, 8);
  axisGeo.rotateZ(Math.PI / 2);
  const axisMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.4,
    metalness: 0.2,
    transparent: true,
    opacity: 0.75,
  });
  const axisMesh = new THREE.Mesh(axisGeo, axisMat);
  axisMesh.position.set(0, baseY + 2.5, damZ);
  refGroup.add(axisMesh);

  // Vertical reference beacon post
  const beaconHeight = 22;
  const postGeo = new THREE.CylinderGeometry(0.35, 0.35, beaconHeight, 8);
  const postMat = new THREE.MeshBasicMaterial({ color: 0x00e6c8 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(0, baseY + beaconHeight / 2, damZ);
  refGroup.add(post);

  // Top glowing beacon head
  const headGeo = new THREE.SphereGeometry(2.0, 16, 16);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, baseY + beaconHeight + 1.5, damZ);
  head.userData = {
    name: activeDam.name,
    type: 'DAM_LOCATION_REFERENCE',
    details: `${activeDam.damType || 'Hydraulic Structure'} · Architectural 3D model unavailable`,
  };
  refGroup.add(head);

  return refGroup;
}

/**
 * Helper to assign uniform RGB vertex colors to a BufferGeometry
 * Automatically converts indexed geometries to non-indexed so mergeGeometries
 * can combine cylinders, cones, dodecahedrons and spheres seamlessly.
 */
function setVertexColor(geo, r, g, b) {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  const count = nonIndexed.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return nonIndexed;
}

/**
 * Safely merges multiple buffer geometries with automatic fallback
 */
function safeMergeGeometries(geos, fallbackGeo) {
  try {
    if (BufferGeometryUtils && BufferGeometryUtils.mergeGeometries) {
      const merged = BufferGeometryUtils.mergeGeometries(geos);
      if (merged) return merged;
    }
  } catch (err) {
    console.warn('safeMergeGeometries error, falling back:', err);
  }
  return fallbackGeo;
}

/**
 * Creates authentic multi-species vegetation (alpine conifers, full-canopy rainforest/deciduous trees,
 * tropical palms, riparian shrubs, and river boulders) tailored to each dam's geographical biome.
 * Uses high-performance THREE.InstancedMesh with merged compound geometries for 60fps rendering.
 */
export function createValleyVegetation(dam, zExaggeration = 1.3, customTreeCount = null) {
  const group = new THREE.Group();
  group.name = 'ValleyVegetationGroup';
  const activeDam = dam || INDIAN_DAMS_REGISTRY[0];
  const biome = DAM_BIOMES[activeDam?.id] || DAM_BIOMES['hirakud-dam-odisha'];
  const treeCount = customTreeCount || biome.treeCount || 360;
  const spline = buildRiverSplineForDam(activeDam);

  // Fallback simple geometries in case of any WebGL buffer anomalies
  const fallbackCone = setVertexColor(new THREE.ConeGeometry(2.2, 5.5, 6).translate(0, 2.75, 0), 0.12, 0.28, 0.14);
  const fallbackBroad = setVertexColor(new THREE.DodecahedronGeometry(2.5, 1).translate(0, 3.5, 0), 0.16, 0.38, 0.15);
  const fallbackPalm = setVertexColor(new THREE.CylinderGeometry(0.3, 0.5, 6.0, 6).translate(0, 3.0, 0), 0.35, 0.3, 0.24);
  const fallbackShrub = setVertexColor(new THREE.DodecahedronGeometry(1.4, 1).translate(0, 0.8, 0), 0.22, 0.45, 0.18);
  const fallbackRock = setVertexColor(new THREE.DodecahedronGeometry(1.6, 0).translate(0, 0.8, 0), 0.4, 0.38, 0.36);

  // 1. Conifer / Alpine Pine Geometry (trunk + 2 cone tiers merged with vertex colors)
  const pineTrunk = setVertexColor(new THREE.CylinderGeometry(0.32, 0.5, 3.2, 5).translate(0, 1.6, 0), 0.26, 0.17, 0.09);
  const pineT1 = setVertexColor(new THREE.ConeGeometry(2.5, 4.8, 6).translate(0, 4.4, 0), 0.08, 0.22, 0.10);
  const pineT2 = setVertexColor(new THREE.ConeGeometry(1.8, 3.8, 6).translate(0, 6.8, 0), 0.11, 0.28, 0.13);
  const pineGeo = safeMergeGeometries([pineTrunk, pineT1, pineT2], fallbackCone);

  // 2. Broadleaf Deciduous / Tropical Rainforest Canopy Tree (trunk + multi-dome canopy)
  const broadTrunk = setVertexColor(new THREE.CylinderGeometry(0.4, 0.65, 3.8, 6).translate(0, 1.9, 0), 0.28, 0.19, 0.11);
  const broadC1 = setVertexColor(new THREE.DodecahedronGeometry(2.4, 1).translate(0, 4.6, 0), 0.15, 0.36, 0.14);
  const broadC2 = setVertexColor(new THREE.DodecahedronGeometry(1.9, 1).translate(0.8, 5.6, 0.4), 0.18, 0.42, 0.16);
  const broadC3 = setVertexColor(new THREE.DodecahedronGeometry(1.7, 1).translate(-0.7, 5.2, -0.5), 0.13, 0.32, 0.12);
  const broadGeo = safeMergeGeometries([broadTrunk, broadC1, broadC2, broadC3], fallbackBroad);

  // 3. Tropical Palm / Coconut Tree (for Kaveri delta & riverbank groves)
  const palmTrunk = setVertexColor(new THREE.CylinderGeometry(0.28, 0.45, 6.5, 6).translate(0, 3.25, 0), 0.38, 0.32, 0.25);
  const palmCrown = setVertexColor(new THREE.ConeGeometry(3.6, 1.2, 7).rotateX(Math.PI).translate(0, 6.6, 0), 0.20, 0.46, 0.16);
  const palmTuft = setVertexColor(new THREE.SphereGeometry(1.1, 5, 5).translate(0, 6.9, 0), 0.24, 0.52, 0.18);
  const palmGeo = safeMergeGeometries([palmTrunk, palmCrown, palmTuft], fallbackPalm);

  // 4. Riparian Shrub & Riverbank Reeds
  const shrubM1 = setVertexColor(new THREE.DodecahedronGeometry(1.4, 1).scale(1.4, 0.85, 1.3).translate(0, 0.9, 0), 0.24, 0.46, 0.18);
  const shrubM2 = setVertexColor(new THREE.DodecahedronGeometry(1.0, 1).translate(0.7, 0.7, 0.5), 0.28, 0.52, 0.20);
  const shrubGeo = safeMergeGeometries([shrubM1, shrubM2], fallbackShrub);

  // 5. River Boulders & Scree Rock
  const rockR1 = setVertexColor(new THREE.DodecahedronGeometry(1.8, 0).scale(1.3, 0.85, 1.4).translate(0, 0.8, 0), 0.38, 0.37, 0.35);
  const rockR2 = setVertexColor(new THREE.DodecahedronGeometry(1.1, 0).translate(-1.1, 0.5, 0.6), 0.44, 0.42, 0.39);
  const rockGeo = safeMergeGeometries([rockR1, rockR2], fallbackRock);

  // Shared optimized PBR material supporting vertex colors
  const vegMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.04,
    flatShading: true,
  });

  const isTehri = activeDam.id === 'tehri-dam-uttarakhand';
  const isIdukki = activeDam.id === 'idukki-dam-kerala';
  const isHirakud = activeDam.id === 'hirakud-dam-odisha';
  const isSardarSarovar = activeDam.id === 'sardar-sarovar-gujarat';
  const isKallanai = activeDam.id.toLowerCase().includes('kallanai');

  // Species distribution ratios tailored to dam biome
  const pineRatio = isTehri ? 0.62 : isIdukki ? 0.04 : (isHirakud || isSardarSarovar || isKallanai) ? 0.02 : 0.15;
  const broadRatio = isTehri ? 0.08 : isIdukki ? 0.60 : isHirakud ? 0.54 : isSardarSarovar ? 0.48 : isKallanai ? 0.36 : 0.40;
  const palmRatio = isKallanai ? 0.38 : isIdukki ? 0.18 : isHirakud ? 0.08 : isSardarSarovar ? 0.06 : 0.05;
  const shrubRatio = isKallanai ? 0.22 : isIdukki ? 0.12 : isHirakud ? 0.24 : isSardarSarovar ? 0.26 : 0.22;
  const rockRatio = isTehri ? 0.18 : isIdukki ? 0.06 : isHirakud ? 0.12 : isSardarSarovar ? 0.18 : 0.18;

  const pineMesh = new THREE.InstancedMesh(pineGeo, vegMat, Math.max(10, Math.floor(treeCount * pineRatio)));
  const broadMesh = new THREE.InstancedMesh(broadGeo, vegMat, Math.max(10, Math.floor(treeCount * broadRatio)));
  const palmMesh = new THREE.InstancedMesh(palmGeo, vegMat, Math.max(10, Math.floor(treeCount * palmRatio)));
  const shrubMesh = new THREE.InstancedMesh(shrubGeo, vegMat, Math.max(10, Math.floor(treeCount * shrubRatio)));
  const rockMesh = new THREE.InstancedMesh(rockGeo, vegMat, Math.max(10, Math.floor(treeCount * rockRatio)));

  pineMesh.castShadow = true;
  pineMesh.receiveShadow = true;
  broadMesh.castShadow = true;
  broadMesh.receiveShadow = true;
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  shrubMesh.receiveShadow = true;
  rockMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let pineIdx = 0;
  let broadIdx = 0;
  let palmIdx = 0;
  let shrubIdx = 0;
  let rockIdx = 0;

  // Deterministic PRNG seed based on active dam id string
  let seed = 1729;
  for (let s = 0; s < (activeDam.id || '').length; s++) {
    seed = (seed * 31 + activeDam.id.charCodeAt(s)) % 233280;
  }
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate 16 natural copse cluster centers along the valley corridor
  const copseCount = 16;
  const copses = [];
  for (let c = 0; c < copseCount; c++) {
    const cz = -58 + (c / (copseCount - 1)) * 185;
    const { x: rx, channelWidth } = getRiverCenterAtZ(cz, spline);
    const side = c % 2 === 0 ? 1 : -1;
    const bankOffset = channelWidth * (0.75 + rand() * 0.85) + 12;
    const cx = rx + side * bankOffset;
    const radius = 16 + rand() * 22;
    copses.push({ cx, cz, radius });
  }

  // Crest footprint clearance width
  const crestHalfLength = Math.min(85, Math.max(45, (activeDam.crestLengthM || 600) / 14));

  // Generate candidate vegetation instances
  for (let i = 0; i < treeCount * 4; i++) {
    let vx = 0;
    let vz = 0;

    // 70% in natural forest copses/groves, 30% background scattered woodland
    if (rand() < 0.70 && copses.length > 0) {
      const copse = copses[Math.floor(rand() * copses.length)];
      const r = Math.sqrt(rand()) * copse.radius;
      const th = rand() * Math.PI * 2;
      vx = copse.cx + r * Math.cos(th);
      vz = copse.cz + r * Math.sin(th);
    } else {
      vx = (rand() - 0.5) * 280;
      vz = (rand() - 0.5) * 330;
    }

    // Boundary domain checks
    if (Math.abs(vx) > 135 || vz < -160 || vz > 165) continue;

    // River centerline and channel check
    const { x: rx, channelWidth } = getRiverCenterAtZ(vz, spline);
    const distFromRiver = Math.abs(vx - rx);

    // 1. Keep active river channel completely clear
    if (distFromRiver < channelWidth * 0.65) continue;

    const vy = calculateTerrainElevation(vx, vz, zExaggeration, activeDam);

    const resWaterLevel = calculateReservoirWaterLevel(activeDam, zExaggeration);
    // 2. Keep deep upstream reservoir water basin clear below authentic water level
    if (vz < -75 && vy < resWaterLevel) continue;

    // 3. Keep dam physical structure footprint, crest highway & chutes clear
    if (Math.abs(vz - (-75)) < 18 && Math.abs(vx) < crestHalfLength) continue;

    // 4. Conforming ground level placement with root embedding (NEVER floats!)
    const scale = 0.68 + rand() * 0.64;
    dummy.position.set(vx, vy - 0.22, vz);
    dummy.scale.set(
      scale * (0.88 + rand() * 0.24),
      scale * (0.92 + rand() * 0.35),
      scale * (0.88 + rand() * 0.24)
    );
    dummy.rotation.y = rand() * Math.PI * 2;
    dummy.rotation.x = (rand() - 0.5) * 0.08;
    dummy.rotation.z = (rand() - 0.5) * 0.08;
    dummy.updateMatrix();

    // Assign species according to ecological niche and active dam biome
    if (distFromRiver < channelWidth * 1.35 && rand() < 0.45 && shrubIdx < shrubMesh.count) {
      // Riverbank riparian shrub
      shrubMesh.setMatrixAt(shrubIdx++, dummy.matrix);
    } else if (distFromRiver < channelWidth * 1.45 && rand() < 0.35 && rockIdx < rockMesh.count) {
      // River shoreline boulder
      rockMesh.setMatrixAt(rockIdx++, dummy.matrix);
    } else if (isKallanai && rand() < 0.55 && palmIdx < palmMesh.count) {
      // Kaveri delta coconut/palm grove
      palmMesh.setMatrixAt(palmIdx++, dummy.matrix);
    } else if (isTehri && (vy > 14 || rand() < 0.65) && pineIdx < pineMesh.count) {
      // Himalayan alpine pine conifer
      pineMesh.setMatrixAt(pineIdx++, dummy.matrix);
    } else if (vy > 22 && pineIdx < pineMesh.count) {
      // High mountain ridge conifer
      pineMesh.setMatrixAt(pineIdx++, dummy.matrix);
    } else if (broadIdx < broadMesh.count) {
      // Deciduous / rainforest canopy tree
      broadMesh.setMatrixAt(broadIdx++, dummy.matrix);
    } else if (shrubIdx < shrubMesh.count) {
      shrubMesh.setMatrixAt(shrubIdx++, dummy.matrix);
    } else if (rockIdx < rockMesh.count) {
      rockMesh.setMatrixAt(rockIdx++, dummy.matrix);
    } else if (pineIdx < pineMesh.count) {
      pineMesh.setMatrixAt(pineIdx++, dummy.matrix);
    }

    if (
      pineIdx >= pineMesh.count &&
      broadIdx >= broadMesh.count &&
      palmIdx >= palmMesh.count &&
      shrubIdx >= shrubMesh.count &&
      rockIdx >= rockMesh.count
    ) {
      break;
    }
  }

  pineMesh.instanceMatrix.needsUpdate = true;
  broadMesh.instanceMatrix.needsUpdate = true;
  palmMesh.instanceMatrix.needsUpdate = true;
  shrubMesh.instanceMatrix.needsUpdate = true;
  rockMesh.instanceMatrix.needsUpdate = true;

  group.add(pineMesh);
  group.add(broadMesh);
  group.add(palmMesh);
  group.add(shrubMesh);
  group.add(rockMesh);

  return group;
}
