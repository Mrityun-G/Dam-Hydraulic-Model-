import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  isDamModelSupported,
  buildRiverSplineForDam,
  getRiverCenterAtZ,
  calculateTerrainElevation,
  generateTerrainTexture,
  createRealisticDamStructure,
  createRiverRibbonGeometry,
  createVolumetricFloodGeometry,
  updateVolumetricFloodWave,
  getDamVisualHeight,
  calculateReservoirWaterLevel,
  getInundationDepthAtKm,
  getWavePropagationState,
  createGeographicMarkers,
  createDamLocationReferenceMarker,
  createValleyVegetation,
} from '../../utils/terrainBuilder3D';

function getDamAtmosphereWaterProps(damId) {
  switch (damId) {
    case 'kallanai-grand-anicut-tamil-nadu':
      return {
        skyColor: 0x98b8ce, // Bright Cauvery delta tropical sky
        fogColor: 0xaec9da,
        fogDensity: 0.0009, // Clear visibility across wide alluvial plains
        reservoirColor: 0x096472, // Vibrant Kaveri delta turquoise blue
        reservoirEmissive: 0x04353d,
        baseflowColor: 0x0d7585,
      };
    case 'nagarjuna-sagar-telangana-ap':
      return {
        skyColor: 0x8aaebb, // Semi-arid Deccan plateau sky
        fogColor: 0x9ebdc8,
        fogDensity: 0.0011,
        reservoirColor: 0x0a5b66, // Deep Krishna river blue-green
        reservoirEmissive: 0x053037,
        baseflowColor: 0x0d6c7a,
      };
    case 'tehri-dam-uttarakhand':
      return {
        skyColor: 0x7da4bd, // Crisp high-altitude Himalayan alpine sky
        fogColor: 0x92b4cb,
        fogDensity: 0.0010,
        reservoirColor: 0x0a626b, // Authentic glacial melt turquoise
        reservoirEmissive: 0x05353a,
        baseflowColor: 0x0c6f79,
      };
    case 'hirakud-dam-odisha':
      return {
        skyColor: 0x93b5c7, // Tropical monsoon floodplain sky
        fogColor: 0xa4c2cf,
        fogDensity: 0.0014,
        reservoirColor: 0x0e5863, // Alluvial silt blue-green
        reservoirEmissive: 0x063138,
        baseflowColor: 0x116673,
      };
    case 'sardar-sarovar-gujarat':
      return {
        skyColor: 0x88adbf, // Narmada river valley bright sky
        fogColor: 0x9ab8c8,
        fogDensity: 0.0012,
        reservoirColor: 0x085268, // Deep Narmada canyon blue
        reservoirEmissive: 0x042e3b,
        baseflowColor: 0x0a627a,
      };
    case 'idukki-dam-kerala':
    default:
      return {
        skyColor: 0x8cb0c4, // Natural tropical rainforest sky blue
        fogColor: 0x9cb9c9,
        fogDensity: 0.0012,
        reservoirColor: 0x094c59, // Authentic deep Western Ghats mountain lake blue-green
        reservoirEmissive: 0x052e36,
        baseflowColor: 0x0c5d6e,
      };
  }
}

/**
 * Dam3DScene: Interactive Three.js WebGL Geospatial 3D Simulation Viewport
 * Renders authentic dam-specific 3D models, procedural CartoDEM river valley terrain,
 * upstream reservoir, dynamic flood wave propagation, breach outflow jet, and settlement probes.
 */
export function Dam3DScene({
  activeDam,
  simulationOutput,
  simulationTimeHours = 2.5,
  showDam = true,
  showReservoir = true,
  showFloodWater = true,
  showVelocityVectors = true,
  showSettlements = true,
  showFacilities = true,
  showVegetation = true,
  activeCameraPreset = 'valley_overview',
  onCameraPresetApplied = null,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);

  // Dynamic Scene Mesh Refs
  const terrainMeshRef = useRef(null);
  const damGroupRef = useRef(null);
  const reservoirGroupRef = useRef(null);
  const reservoirMeshRef = useRef(null);
  const reservoirFrontWallRef = useRef(null);
  const floodMeshRef = useRef(null);
  const baseflowMeshRef = useRef(null);
  const breachJetMeshRef = useRef(null);
  const splashPointsRef = useRef(null);
  const vectorsGroupRef = useRef(null);
  const markersGroupRef = useRef(null);
  const vegetationGroupRef = useRef(null);

  // Probe pin selection state
  const [selectedPin, setSelectedPin] = useState(null);
  const [initError, setInitError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Active Simulation Result
  const isSimMatchingDam = Boolean(
    simulationOutput && activeDam && simulationOutput.damId === activeDam.id
  );
  const activeSim = isSimMatchingDam
    ? (simulationOutput?.scenarios && simulationOutput?.defaultScenario
        ? simulationOutput.scenarios[simulationOutput.defaultScenario] || simulationOutput
        : simulationOutput)
    : null;

  const zExaggeration = activeDam?.isFlatDelta ? 1.3 : 1.6;
  const has3DModel = activeDam ? isDamModelSupported(activeDam.id) : false;
  const atmoProps = useMemo(() => getDamAtmosphereWaterProps(activeDam?.id), [activeDam?.id]);

  const riverSpline = useMemo(() => {
    return buildRiverSplineForDam(activeDam);
  }, [activeDam?.id]);

  const waveState = useMemo(() => {
    return getWavePropagationState(simulationTimeHours, activeDam);
  }, [simulationTimeHours, activeDam?.id]);

  // Ref to track waveState without causing callback re-creation on every timeline tick
  const waveStateRef = useRef(waveState);
  useEffect(() => {
    waveStateRef.current = waveState;
  }, [waveState]);

  const simulationTimeHoursRef = useRef(simulationTimeHours);
  useEffect(() => {
    simulationTimeHoursRef.current = simulationTimeHours;
  }, [simulationTimeHours]);

  const showFloodWaterRef = useRef(showFloodWater);
  useEffect(() => {
    showFloodWaterRef.current = showFloodWater;
  }, [showFloodWater]);

  const activeSimRef = useRef(activeSim);
  useEffect(() => {
    activeSimRef.current = activeSim;
  }, [activeSim]);

  // Smooth camera tweening ref
  const cameraTweenRef = useRef({
    active: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
  });

  const transitionCameraTo = useCallback((pos, lookAt) => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraTweenRef.current = {
      active: true,
      startPos: cameraRef.current.position.clone(),
      endPos: pos.clone(),
      startTarget: controlsRef.current.target.clone(),
      endTarget: lookAt.clone(),
      progress: 0,
    };
  }, []);

  // Apply Camera Preset
  const applyPreset = useCallback(
    (preset) => {
      const frontZ = waveStateRef.current?.frontZ ?? -60;
      const { x: frontX } = getRiverCenterAtZ(frontZ, riverSpline);
      const isKallanai = activeDam?.id?.toLowerCase().includes('kallanai');

      if (isKallanai) {
        switch (preset) {
          case 'valley_overview':
          case 'perspective':
          case 'valley_oblique':
            // Cinematic Grand Anicut Delta Overview: entire 329m Chola stone masonry anicut centered, Cauvery reservoir upstream, delta branches downstream
            transitionCameraTo(new THREE.Vector3(-28, 52, 35), new THREE.Vector3(0, 13, -75));
            break;
          case 'dam_front':
            // Frontal view looking directly at the dressed granite weir body, sluice arches and downstream apron
            transitionCameraTo(new THREE.Vector3(0, 24, -30), new THREE.Vector3(0, 13, -75));
            break;
          case 'dam_crest':
            // Looking along the historic Chola stone roadway bridge and regulator gates from left flank
            transitionCameraTo(new THREE.Vector3(-55, 23, -74), new THREE.Vector3(25, 15, -75));
            break;
          case 'reservoir_view':
            // Upstream perspective looking across the serene Cauvery lake towards the stone anicut
            transitionCameraTo(new THREE.Vector3(0, 40, -145), new THREE.Vector3(0, 13, -75));
            break;
          case 'breach_view':
            // Focused perspective on the breach washout notch and roaring discharge torrent
            transitionCameraTo(new THREE.Vector3(22, 19, -52), new THREE.Vector3(0, 12, -74));
            break;
          case 'wave_front':
            // Dynamic tracking of the downstream flood wave front in the Cauvery floodplain
            transitionCameraTo(new THREE.Vector3(frontX + 38, 30, frontZ + 38), new THREE.Vector3(frontX, 10, frontZ));
            break;
          case 'top_down':
            transitionCameraTo(new THREE.Vector3(0, 210, -20), new THREE.Vector3(0, 0, -20));
            break;
          default:
            transitionCameraTo(new THREE.Vector3(-28, 52, 35), new THREE.Vector3(0, 13, -75));
            break;
        }
      } else {
        switch (preset) {
          case 'valley_overview':
          case 'perspective':
          case 'valley_oblique':
            transitionCameraTo(new THREE.Vector3(-35, 90, 75), new THREE.Vector3(0, 22, -65));
            break;
          case 'dam_front':
            transitionCameraTo(new THREE.Vector3(0, 32, -20), new THREE.Vector3(0, 20, -75));
            break;
          case 'dam_crest':
            transitionCameraTo(new THREE.Vector3(-45, 38, -68), new THREE.Vector3(15, 27, -76));
            break;
          case 'reservoir_view':
            transitionCameraTo(new THREE.Vector3(0, 68, -165), new THREE.Vector3(0, 20, -75));
            break;
          case 'breach_view':
            transitionCameraTo(new THREE.Vector3(26, 28, -48), new THREE.Vector3(0, 18, -74));
            break;
          case 'wave_front':
            transitionCameraTo(new THREE.Vector3(frontX + 45, 45, frontZ + 45), new THREE.Vector3(frontX, 14, frontZ));
            break;
          case 'top_down':
            transitionCameraTo(new THREE.Vector3(0, 260, -20), new THREE.Vector3(0, 0, -20));
            break;
          default:
            transitionCameraTo(new THREE.Vector3(-35, 90, 75), new THREE.Vector3(0, 22, -65));
            break;
        }
      }
      if (onCameraPresetApplied) onCameraPresetApplied(preset);
      lastPresetRef.current = preset;
    },
    [activeDam?.id, riverSpline, transitionCameraTo, onCameraPresetApplied]
  );

  // Track applied preset and dam ID to prevent automatic/unintended camera moves on simulation playback or timeline scrub
  const lastPresetRef = useRef('valley_overview');
  const lastDamIdRef = useRef(activeDam?.id);

  // Reset preset reference when switching dams
  useEffect(() => {
    if (activeDam?.id && lastDamIdRef.current !== activeDam.id) {
      lastDamIdRef.current = activeDam.id;
      lastPresetRef.current = 'valley_overview';
      if (onCameraPresetApplied) {
        onCameraPresetApplied('valley_overview');
      }
    }
  }, [activeDam?.id, onCameraPresetApplied]);

  // Apply preset ONLY when activeCameraPreset explicitly changes to a different value
  useEffect(() => {
    if (activeCameraPreset && activeCameraPreset !== lastPresetRef.current) {
      lastPresetRef.current = activeCameraPreset;
      applyPreset(activeCameraPreset);
    }
  }, [activeCameraPreset, applyPreset]);

  // Main Three.js Scene Setup & Lifecycle
  useEffect(() => {
    if (!mountRef.current) return;
    setInitError(null);

    let scene = null;
    let renderer = null;
    let camera = null;
    let controls = null;
    let handleResize = null;
    let handlePointerDown = null;
    let handleControlsStart = null;

    try {
      const width = mountRef.current.clientWidth || 800;
      const height = mountRef.current.clientHeight || 520;

      // 1. Scene & Regional Atmosphere
      scene = new THREE.Scene();
      scene.background = new THREE.Color(atmoProps.skyColor);
      scene.fog = new THREE.FogExp2(atmoProps.fogColor, atmoProps.fogDensity);
      sceneRef.current = scene;

      const isKallanai = activeDam?.id?.toLowerCase().includes('kallanai');

      // 2. Camera - Valley-Oblique cinematic vantage point
      camera = new THREE.PerspectiveCamera(45, width / height, 1, 1400);
      if (isKallanai) {
        camera.position.set(-28, 52, 35);
      } else {
        camera.position.set(-35, 90, 75);
      }
      cameraRef.current = camera;

      // 3. Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      mountRef.current.appendChild(renderer.domElement);

      // 4. Orbit Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent camera going below ground
      controls.minDistance = 15;
      controls.maxDistance = 750;
      if (isKallanai) {
        controls.target.set(0, 13, -75);
      } else {
        controls.target.set(0, 22, -65);
      }
      controlsRef.current = controls;

      // Yield immediate control to user upon manual interaction
      handleControlsStart = () => {
        cameraTweenRef.current.active = false;
      };
      controls.addEventListener('start', handleControlsStart);

      // 5. Realistic Natural Daylight Environment Lighting
      const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x36482e, 1.15); // Clear tropical sky + warm vegetative bounce
      hemiLight.position.set(0, 280, 0);
      scene.add(hemiLight);

      const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.85); // Warm tropical sunlight
      sunLight.position.set(120, 240, 95);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 650;
      sunLight.shadow.camera.left = -180;
      sunLight.shadow.camera.right = 180;
      sunLight.shadow.camera.top = 180;
      sunLight.shadow.camera.bottom = -180;
      sunLight.shadow.bias = -0.0004;
      scene.add(sunLight);

      // Soft ambient canyon fill light from opposite ridge
      const ridgeFillLight = new THREE.DirectionalLight(0xa5c0d1, 0.5);
      ridgeFillLight.position.set(-140, 85, -80);
      scene.add(ridgeFillLight);

      // 6. Terrain Mesh with Natural Soil, Rock & Forest Shader
      const gridX = 140;
      const gridZ = 180;
      const terrainGeo = new THREE.PlaneGeometry(320, 380, gridX, gridZ);
      terrainGeo.rotateX(-Math.PI / 2);

      const pos = terrainGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        pos.setY(i, calculateTerrainElevation(vx, vz, zExaggeration, activeDam));
      }
      terrainGeo.computeVertexNormals();

      const terrainTexture = generateTerrainTexture(activeDam);
      const terrainMat = new THREE.MeshStandardMaterial({
        map: terrainTexture,
        roughness: 0.92,
        metalness: 0.02,
        flatShading: false,
      });
      const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
      terrainMesh.receiveShadow = true;
      scene.add(terrainMesh);
      terrainMeshRef.current = terrainMesh;

      // 7. Dam Structure or Geographic Location Reference Marker
      const breachW = activeSim?.breachWidthM || (activeDam?.id?.includes('kallanai') ? 45 : 180);
      const breachD = activeSim ? Math.max(8, activeSim.maxFloodDepthM * 1.2) : 22;
      if (has3DModel) {
        const damGroup = createRealisticDamStructure(activeDam, zExaggeration, breachW, breachD);
        if (damGroup) {
          scene.add(damGroup);
          damGroupRef.current = damGroup;
        }
      } else {
        // Architectural model unavailable: render minimal simulation reference marker based on registry coordinates
        const refGroup = createDamLocationReferenceMarker(activeDam, zExaggeration);
        if (refGroup) {
          scene.add(refGroup);
          damGroupRef.current = refGroup;
        }
      }

      // 8. Upstream Reservoir Water Basin (Z < -75)
      // Dynamic authentic water elevation matching engineering freeboard & dam geometry
      const resWaterLevel = calculateReservoirWaterLevel(activeDam, zExaggeration, activeSim);
      const damBaseY = calculateTerrainElevation(0, -75, zExaggeration, activeDam);
      const reservoirGroup = new THREE.Group();
      reservoirGroup.name = 'ReservoirGroup';

      const reservoirGeo = new THREE.PlaneGeometry(340, 160, 64, 64);
      reservoirGeo.rotateX(-Math.PI / 2);
      const resPos = reservoirGeo.attributes.position;
      for (let i = 0; i < resPos.count; i++) {
        resPos.setY(i, resWaterLevel);
      }
      reservoirGeo.computeVertexNormals();

      const reservoirMat = new THREE.MeshPhysicalMaterial({
        color: atmoProps.reservoirColor, // Dam-specific authentic water hue
        emissive: atmoProps.reservoirEmissive,
        emissiveIntensity: 0.08,
        roughness: 0.06,
        metalness: 0.1,
        transparent: true,
        opacity: 0.88,
        transmission: 0.62,
        ior: 1.333,
        clearcoat: 0.9,
        clearcoatRoughness: 0.05,
      });
      const reservoirMesh = new THREE.Mesh(reservoirGeo, reservoirMat);
      reservoirMesh.position.set(0, 0, -155);
      reservoirMesh.receiveShadow = true;
      reservoirGroup.add(reservoirMesh);
      reservoirMeshRef.current = reservoirMesh;

      // Volumetric vertical front water wall at upstream face of dam (Z = -75)
      // Gives the reservoir visible 3D water depth and volume behind the dam
      const wallHeight = Math.max(2.5, resWaterLevel - damBaseY + 2.0);
      const frontWallGeo = new THREE.PlaneGeometry(280, wallHeight, 32, 8);
      const frontWallMat = new THREE.MeshPhysicalMaterial({
        color: atmoProps.reservoirColor,
        roughness: 0.1,
        metalness: 0.08,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const frontWallMesh = new THREE.Mesh(frontWallGeo, frontWallMat);
      frontWallMesh.position.set(0, resWaterLevel - wallHeight * 0.5, -75.2);
      reservoirGroup.add(frontWallMesh);
      reservoirFrontWallRef.current = frontWallMesh;

      scene.add(reservoirGroup);
      reservoirGroupRef.current = reservoirGroup;

      // 8b. Natural Downstream Baseflow River (Continuous serene water connecting reservoir to valley)
      const baseflowGeo = createRiverRibbonGeometry(riverSpline, 140, 16, 1.05);
      const baseflowPos = baseflowGeo.attributes.position;
      for (let bi = 0; bi < baseflowPos.count; bi++) {
        const bx = baseflowPos.getX(bi);
        const bz = baseflowPos.getZ(bi);
        const bedY = calculateTerrainElevation(bx, bz, zExaggeration, activeDam);
        baseflowPos.setY(bi, bedY + 0.65);
      }
      baseflowGeo.computeVertexNormals();

      const baseflowMat = new THREE.MeshPhysicalMaterial({
        color: atmoProps.baseflowColor,
        emissive: atmoProps.reservoirEmissive,
        emissiveIntensity: 0.08,
        roughness: 0.1,
        metalness: 0.08,
        transparent: true,
        opacity: 0.85,
        transmission: 0.55,
        ior: 1.333,
      });
      const baseflowMesh = new THREE.Mesh(baseflowGeo, baseflowMat);
      baseflowMesh.receiveShadow = true;
      scene.add(baseflowMesh);
      baseflowMeshRef.current = baseflowMesh;

      // 9. Downstream Valley Flood Inundation Mesh - 3D Volumetric with Skirt Boundary Walls
      // segZ = 140, segX = 32 gives high-fidelity 3D volume filling the river valley
      const floodGeo = createVolumetricFloodGeometry(riverSpline, 140, 32, 2.6);
      const floodColors = new Float32Array(floodGeo.attributes.position.count * 3);
      floodGeo.setAttribute('color', new THREE.BufferAttribute(floodColors, 3));

      const floodMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.14,
        metalness: 0.15,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
      const floodMesh = new THREE.Mesh(floodGeo, floodMat);
      floodMesh.receiveShadow = true;
      scene.add(floodMesh);
      floodMeshRef.current = floodMesh;

      // 10. High-Volume Breach Outflow Torrent & Cataract Waterfall
      // Cascades from the breach notch down into the downstream plunge pool
      if (isKallanai) {
        // ==========================================================
        // KALLANAI DAM — EXACT EXISTING IMPLEMENTATION (UNMODIFIED)
        // ==========================================================
        const rawBreachW = activeSim?.breachWidthM || 45;
        const jetRadius = Math.max(3.5, Math.min(16.0, rawBreachW / 14));
        const cataractLen = Math.max(16.0, (resWaterLevel - damBaseY) * 1.8);
        const jetGeo = new THREE.CylinderGeometry(jetRadius * 0.65, jetRadius * 1.5, cataractLen, 24, 8);
        jetGeo.rotateX(Math.PI / 2.3);
        const jetMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc, // Foaming aerated white-water torrent
          roughness: 0.25,
          metalness: 0.05,
          transparent: true,
          opacity: 0.95,
          emissive: 0xdbeafe,
          emissiveIntensity: 0.35,
        });
        const breachJetMesh = new THREE.Mesh(jetGeo, jetMat);
        breachJetMesh.position.set(0, damBaseY + (resWaterLevel - damBaseY) * 0.5, -67);
        scene.add(breachJetMesh);
        breachJetMeshRef.current = breachJetMesh;

        // Kallanai splash particle system (UNMODIFIED)
        const particleCount = 450;
        const splashGeo = new THREE.BufferGeometry();
        const splashPositions = new Float32Array(particleCount * 3);
        const splashColors = new Float32Array(particleCount * 3);
        const splashSizes = new Float32Array(particleCount);
        const splashVelocities = [];

        for (let p = 0; p < particleCount; p++) {
          const isPlunge = p < particleCount * 0.55;
          splashPositions[p * 3] = (Math.random() - 0.5) * (rawBreachW / 4);
          splashPositions[p * 3 + 1] = damBaseY + Math.random() * 4;
          splashPositions[p * 3 + 2] = -66 + Math.random() * 12;

          splashVelocities.push({
            vx: (Math.random() - 0.5) * 12,
            vy: 6 + Math.random() * 14,
            vz: 8 + Math.random() * 16,
            life: Math.random(),
            maxLife: 0.6 + Math.random() * 0.8,
            isPlunge,
          });

          splashColors[p * 3] = 0.92 + Math.random() * 0.08;
          splashColors[p * 3 + 1] = 0.96 + Math.random() * 0.04;
          splashColors[p * 3 + 2] = 1.0;
          splashSizes[p] = 2.2 + Math.random() * 3.5;
        }

        splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
        splashGeo.setAttribute('color', new THREE.BufferAttribute(splashColors, 3));
        splashGeo.setAttribute('size', new THREE.BufferAttribute(splashSizes, 1));
        splashGeo.userData = { velocities: splashVelocities, damBaseY, rawBreachW, isKallanai: true };

        const splashMat = new THREE.PointsMaterial({
          size: 3.2,
          vertexColors: true,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const splashPoints = new THREE.Points(splashGeo, splashMat);
        splashPoints.visible = false;
        scene.add(splashPoints);
        splashPointsRef.current = splashPoints;
      } else {
        // ==========================================================
        // ALL NON-KALLANAI DAMS (Idukki, Tehri, Hirakud, Sardar Sarovar, Nagarjuna Sagar)
        // Controlled, realistic breach cascade & whitewater chute proportional to dam & notch
        // ==========================================================
        const rawBreachW = activeSim?.breachWidthM || 180;
        // Chute width neatly fits within the structural breach notch
        const breachChannelW = Math.min(22.0, Math.max(8.0, rawBreachW / 16.0));
        const topRadius = breachChannelW * 0.20;
        const bottomRadius = breachChannelW * 0.34;
        const cataractLen = Math.min(22.0, Math.max(10.0, (resWaterLevel - damBaseY) * 0.68));

        const jetGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, cataractLen, 18, 6);
        jetGeo.rotateX(Math.PI / 2.4);

        // Realistic turbulent aerated whitewater material (semi-translucent, non-solid, never obscures the dam)
        const jetMat = new THREE.MeshStandardMaterial({
          color: 0xdaf0f8, // Aerated whitewater foam with natural aquatic undertone
          roughness: 0.18,
          metalness: 0.10,
          transparent: true,
          opacity: 0.68,   // Semi-translucent so the dam structure and breach notch remain visible
          emissive: 0x60a5fa,
          emissiveIntensity: 0.08,
        });
        const breachJetMesh = new THREE.Mesh(jetGeo, jetMat);
        // Positioned precisely at the downstream breach chute opening (Z from -74 to -66)
        breachJetMesh.position.set(0, damBaseY + cataractLen * 0.40, -71.5);
        scene.add(breachJetMesh);
        breachJetMeshRef.current = breachJetMesh;

        // Controlled spray & mist particle system proportional to the breach plunge pool
        const particleCount = 360;
        const splashGeo = new THREE.BufferGeometry();
        const splashPositions = new Float32Array(particleCount * 3);
        const splashColors = new Float32Array(particleCount * 3);
        const splashSizes = new Float32Array(particleCount);
        const splashVelocities = [];

        for (let p = 0; p < particleCount; p++) {
          const isPlunge = p < particleCount * 0.60;
          // Contained tightly within the plunge pool
          splashPositions[p * 3] = (Math.random() - 0.5) * (breachChannelW * 1.3);
          splashPositions[p * 3 + 1] = damBaseY + Math.random() * 2.5;
          splashPositions[p * 3 + 2] = -70 + Math.random() * 7;

          splashVelocities.push({
            vx: (Math.random() - 0.5) * 8,
            vy: 4 + Math.random() * 9,
            vz: 5 + Math.random() * 10,
            life: Math.random(),
            maxLife: 0.5 + Math.random() * 0.5,
            isPlunge,
          });

          splashColors[p * 3] = 0.88 + Math.random() * 0.10;
          splashColors[p * 3 + 1] = 0.95 + Math.random() * 0.05;
          splashColors[p * 3 + 2] = 1.0;
          splashSizes[p] = 1.8 + Math.random() * 2.0;
        }

        splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
        splashGeo.setAttribute('color', new THREE.BufferAttribute(splashColors, 3));
        splashGeo.setAttribute('size', new THREE.BufferAttribute(splashSizes, 1));
        splashGeo.userData = { velocities: splashVelocities, damBaseY, breachChannelW, isKallanai: false };

        const splashMat = new THREE.PointsMaterial({
          size: 2.2, // Delicate mist & droplet spray
          vertexColors: true,
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const splashPoints = new THREE.Points(splashGeo, splashMat);
        splashPoints.visible = false;
        scene.add(splashPoints);
        splashPointsRef.current = splashPoints;
      }

      // 11. Velocity Vectors along River Channel
      const vectorsGroup = new THREE.Group();
      const arrowCount = 10;
      for (let k = 0; k < arrowCount; k++) {
        const arrowGeo = new THREE.ConeGeometry(1.4, 4.0, 8);
        arrowGeo.rotateX(Math.PI / 2);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00e6c8 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(0, 14, -50 + k * 20);
        vectorsGroup.add(arrow);
      }
      scene.add(vectorsGroup);
      vectorsGroupRef.current = vectorsGroup;

      // 12. Geographic Markers for Settlements & Facilities
      const markersGroup = createGeographicMarkers(activeDam, zExaggeration);
      scene.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // 13. Lush Valley Trees, Conifers & Riparian Plants
      const vegetationGroup = createValleyVegetation(activeDam, zExaggeration);
      scene.add(vegetationGroup);
      vegetationGroupRef.current = vegetationGroup;

      // 14. Raycasting Interaction Probe
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      handlePointerDown = (event) => {
        if (!renderer || !renderer.domElement) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.height) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        if (markersGroupRef.current) {
          const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
          if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData?.name && obj.parent) {
              obj = obj.parent;
            }
            if (obj && obj.userData?.name) {
              setSelectedPin(obj.userData);
            }
          }
        }
      };
      renderer.domElement.addEventListener('pointerdown', handlePointerDown);

      // 15. Resize Handler
      handleResize = () => {
        if (!mountRef.current || !renderer || !camera) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // 16. Animation Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        // Camera tweening
        if (cameraTweenRef.current.active) {
          cameraTweenRef.current.progress += delta * 1.6;
          if (cameraTweenRef.current.progress >= 1.0) {
            cameraTweenRef.current.progress = 1.0;
            cameraTweenRef.current.active = false;
          }
          const t = cameraTweenRef.current.progress;
          const smoothT = t * t * (3 - 2 * t);
          camera.position.lerpVectors(cameraTweenRef.current.startPos, cameraTweenRef.current.endPos, smoothT);
          controls.target.lerpVectors(cameraTweenRef.current.startTarget, cameraTweenRef.current.endTarget, smoothT);
        }

        const elapsedTime = clock.getElapsedTime();

        // Reservoir subtle surface ripples & dynamic hydrodynamic flow
        if (reservoirMeshRef.current) {
          const rPos = reservoirMeshRef.current.geometry.attributes.position;
          const count = rPos.count;
          for (let ri = 0; ri < count; ri++) {
            const rx = rPos.getX(ri);
            const rz = rPos.getZ(ri);
            const ripple =
              Math.sin(rx * 0.08 + elapsedTime * 1.5) * 0.18 +
              Math.cos(rz * 0.08 + elapsedTime * 1.2) * 0.18;
            rPos.setY(ri, resWaterLevel + ripple);
          }
          rPos.needsUpdate = true;
        }

        // Downstream natural river gentle surface flow ripples
        if (baseflowMeshRef.current) {
          const bPos = baseflowMeshRef.current.geometry.attributes.position;
          const bCount = bPos.count;
          for (let bi = 0; bi < bCount; bi++) {
            const bx = bPos.getX(bi);
            const bz = bPos.getZ(bi);
            const flowRipple = Math.sin(bz * 0.12 - elapsedTime * 2.0) * 0.08 + Math.cos(bx * 0.18 + elapsedTime * 1.5) * 0.05;
            const bedY = calculateTerrainElevation(bx, bz, zExaggeration, activeDam);
            bPos.setY(bi, bedY + 0.65 + flowRipple);
          }
          bPos.needsUpdate = true;
        }

        // 3D Volumetric Hydraulic Flood Wave (Rolling bore, trailing swells, churning ripples)
        if (floodMeshRef.current && showFloodWaterRef.current) {
          updateVolumetricFloodWave(
            floodMeshRef.current,
            simulationTimeHoursRef.current,
            waveStateRef.current,
            activeDam,
            activeSimRef.current,
            zExaggeration,
            elapsedTime
          );
        }

        // Heavy Splashing & Aerated Spray Particle Physics
        if (splashPointsRef.current && splashPointsRef.current.visible) {
          const sPos = splashPointsRef.current.geometry.attributes.position;
          const velArr = splashPointsRef.current.geometry.userData.velocities;
          const fZ = waveStateRef.current?.frontZ ?? -60;
          const { x: fX } = getRiverCenterAtZ(fZ, riverSpline);
          const fBedY = calculateTerrainElevation(fX, fZ, zExaggeration, activeDam);

          const uData = splashPointsRef.current.geometry.userData || {};
          const isKall = uData.isKallanai;

          for (let p = 0; p < velArr.length; p++) {
            const v = velArr[p];
            v.life += delta;
            if (v.life >= v.maxLife) {
              v.life = 0;
              if (v.isPlunge) {
                if (isKall) {
                  // Kallanai plunge pool reset (UNMODIFIED)
                  sPos.setXYZ(
                    p,
                    (Math.random() - 0.5) * ((uData.rawBreachW || 45) / 4),
                    damBaseY + Math.random() * 2,
                    -66 + Math.random() * 8
                  );
                  v.vx = (Math.random() - 0.5) * 14;
                  v.vy = 8 + Math.random() * 16;
                  v.vz = 10 + Math.random() * 18;
                } else {
                  // Non-Kallanai plunge pool reset (controlled, tight to breach notch)
                  const bw = uData.breachChannelW || 16;
                  sPos.setXYZ(
                    p,
                    (Math.random() - 0.5) * (bw * 1.3),
                    damBaseY + Math.random() * 1.8,
                    -70 + Math.random() * 6
                  );
                  v.vx = (Math.random() - 0.5) * 8;
                  v.vy = 4 + Math.random() * 9;
                  v.vz = 5 + Math.random() * 10;
                }
              } else {
                sPos.setXYZ(
                  p,
                  fX + (Math.random() - 0.5) * 36,
                  fBedY + 2.5 + Math.random() * 4,
                  fZ - Math.random() * 10
                );
                v.vx = (Math.random() - 0.5) * 10;
                v.vy = 4 + Math.random() * 12;
                v.vz = 8 + Math.random() * 14;
              }
            } else {
              const px = sPos.getX(p) + v.vx * delta;
              const py = sPos.getY(p) + v.vy * delta;
              const pz = sPos.getZ(p) + v.vz * delta;
              v.vy -= 24 * delta;
              sPos.setXYZ(p, px, py, pz);
            }
          }
          sPos.needsUpdate = true;
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    } catch (err) {
      console.error('Dam3DScene initialization error:', err);
      setInitError(err?.message || 'Failed to initialize 3D WebGL viewport');
    }

    // Cleanup on unmount or dam switch
    return () => {
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement && handlePointerDown) {
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      }
      if (controls) {
        if (handleControlsStart) controls.removeEventListener('start', handleControlsStart);
        controls.dispose();
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // Dispose Three.js scene
      if (scene) {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      if (renderer) {
        renderer.dispose();
        if (mountRef.current && renderer.domElement) {
          try {
            mountRef.current.removeChild(renderer.domElement);
          } catch (_) {}
        }
      }
    };
  }, [activeDam?.id, has3DModel, retryKey]);

  // Dynamic Simulation Frame Updates (driven by simulationTimeHours & backend outputs)
  useEffect(() => {
    if (!floodMeshRef.current || !breachJetMeshRef.current) return;

    const frontZ = waveState.frontZ;

    // Modulate breach outflow torrent intensity according to backend hydrograph if available
    let outflowIntensity = waveState.outflowRatio;
    if (activeSim?.hydrograph && activeSim.hydrograph.length > 0) {
      const pt = activeSim.hydrograph.find((h) => Math.abs(h.timeHours - simulationTimeHours) < 0.35);
      if (pt && activeSim.peakBreachOutflowM3s > 0) {
        outflowIntensity = Math.min(1.5, Math.max(0.08, pt.outflowDischargeM3s / activeSim.peakBreachOutflowM3s));
      }
    }

    // Scale breach jet mesh dynamically with discharge
    const isKall = activeDam?.id?.toLowerCase().includes('kallanai');
    if (isKall) {
      // Kallanai dam (UNMODIFIED)
      breachJetMeshRef.current.scale.set(
        1.0 + outflowIntensity * 1.4,
        1.0 + outflowIntensity * 1.0,
        1.0 + outflowIntensity * 1.8
      );
    } else {
      // Non-Kallanai dams: controlled, realistic scaling strictly proportional to discharge
      // Never expands into a giant blob; stays compact and contained within the breach chute
      const widthScale = Math.min(1.22, 0.88 + outflowIntensity * 0.25);
      const depthScale = Math.min(1.18, 0.88 + outflowIntensity * 0.20);
      const lengthScale = Math.min(1.25, 0.90 + outflowIntensity * 0.24);
      breachJetMeshRef.current.scale.set(widthScale, depthScale, lengthScale);
    }
    breachJetMeshRef.current.visible = showFloodWater && simulationTimeHours > 0.05 && outflowIntensity > 0.03;

    // Upstream Reservoir Water Level Depletion (as water discharges through the breach)
    if (reservoirGroupRef.current) {
      const depletionY = Math.min(2.8, simulationTimeHours * 0.24 * (0.8 + outflowIntensity * 0.4));
      reservoirGroupRef.current.position.y = -depletionY;
    }

    // Splash particle system visibility
    if (splashPointsRef.current) {
      splashPointsRef.current.visible = showFloodWater && simulationTimeHours > 0.08 && outflowIntensity > 0.05;
    }

    // Update volumetric flood wave immediately for scrubbed/stepped timeline frames
    if (floodMeshRef.current && showFloodWater) {
      updateVolumetricFloodWave(
        floodMeshRef.current,
        simulationTimeHours,
        waveState,
        activeDam,
        activeSim,
        zExaggeration,
        simulationTimeHours * 10
      );
    }

    // Update velocity vectors position and direction
    if (vectorsGroupRef.current) {
      const spline = buildRiverSplineForDam(activeDam);
      vectorsGroupRef.current.children.forEach((arrow, idx) => {
        const arrowZ = -50 + idx * 18;
        const isReached = arrowZ <= frontZ;
        arrow.visible = showVelocityVectors && isReached;
        if (isReached) {
          const { x: rx } = getRiverCenterAtZ(arrowZ, spline);
          const ry = calculateTerrainElevation(rx, arrowZ, zExaggeration, activeDam) + 5;
          arrow.position.set(rx, ry, arrowZ);
        }
      });
    }

    // Toggle layer visibility
    if (damGroupRef.current) damGroupRef.current.visible = showDam;
    if (reservoirGroupRef.current) reservoirGroupRef.current.visible = showReservoir;
    if (baseflowMeshRef.current) baseflowMeshRef.current.visible = showReservoir || showFloodWater;
    if (floodMeshRef.current) floodMeshRef.current.visible = showFloodWater;
    if (markersGroupRef.current) markersGroupRef.current.visible = showSettlements || showFacilities;
    if (vegetationGroupRef.current) vegetationGroupRef.current.visible = showVegetation;
  }, [
    simulationTimeHours,
    waveState,
    showDam,
    showReservoir,
    showFloodWater,
    showVelocityVectors,
    showSettlements,
    showFacilities,
    showVegetation,
    activeDam?.id,
    activeSim,
    zExaggeration,
  ]);

  return (
    <div className="sim3d-viewport-wrapper">
      {/* 3D Header Bar */}
      <div className="sim3d-header-bar">
        <div className="sim3d-title-group">
          <span style={{ color: '#00e6c8' }}>■</span>
          <span className="sim3d-title">3D HYDRODYNAMIC VALLEY SIMULATOR</span>
          <span className="sim3d-badge">{activeDam?.name || 'Dam Model'}</span>
          <span className="sim3d-badge" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
            {activeDam?.damType || 'Structure'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="sim3d-badge"
            style={{
              borderColor: has3DModel ? '#00e6c8' : '#ef4444',
              color: has3DModel ? '#00e6c8' : '#f87171',
              background: has3DModel ? 'rgba(0, 230, 200, 0.1)' : 'rgba(239, 68, 68, 0.12)',
            }}
          >
            3D MODEL: {has3DModel ? 'AVAILABLE' : 'UNAVAILABLE'}
          </span>
          <span
            className="sim3d-badge"
            style={{
              borderColor: isSimMatchingDam ? '#38bdf8' : '#64748b',
              color: isSimMatchingDam ? '#38bdf8' : '#94a3b8',
              background: isSimMatchingDam ? 'rgba(56, 189, 248, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            }}
          >
            SIMULATION: {isSimMatchingDam ? 'RESULT ACTIVE' : 'READY TO EXECUTE'}
          </span>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div className="sim3d-canvas-container" ref={mountRef}>
        {/* Graceful 3D Error Overlay with Retry button */}
        {initError && (
          <div
            className="sim3d-init-error-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(9, 21, 32, 0.95)',
              zIndex: 60,
              gap: '16px',
              padding: '24px',
              textAlign: 'center',
              fontFamily: 'monospace',
              color: '#f87171',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>
              ⚠️ 3D VIEW INITIALIZATION ERROR
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', maxWidth: '520px', lineHeight: 1.6 }}>
              {initError}
            </div>
            <button
              type="button"
              className="sim3d-btn primary"
              onClick={() => {
                setInitError(null);
                setRetryKey((k) => k + 1);
              }}
              style={{ padding: '8px 24px', fontSize: '12px' }}
            >
              ↺ RETRY INITIALIZATION
            </button>
          </div>
        )}

        {/* Compact Non-Blocking Dam Model Status Panel */}
        {!has3DModel && (
          <div className="sim3d-model-status-panel">
            <div className="sim3d-model-status-header">
              <span>DAM MODEL STATUS</span>
              <span>⚠️</span>
            </div>
            <div className="sim3d-model-status-body">
              <span style={{ color: '#fbbf24' }}>⚠ Architectural model unavailable</span>
            </div>
            <div className="sim3d-model-status-sub">
              Geographic & hydrodynamic simulation scene active
            </div>
          </div>
        )}

        {/* Top Floating Camera Presets */}
        <div className="sim3d-cam-controls">
          <div style={{ fontSize: '9px', color: '#00e6c8', fontWeight: 800, marginBottom: '4px' }}>
            CAMERA PRESETS
          </div>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'valley_overview' ? 'active' : ''}`}
            onClick={() => applyPreset('valley_overview')}
          >
            Valley Overview
          </button>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'dam_front' ? 'active' : ''}`}
            onClick={() => applyPreset('dam_front')}
          >
            Dam Front
          </button>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'dam_crest' ? 'active' : ''}`}
            onClick={() => applyPreset('dam_crest')}
          >
            Dam Crest
          </button>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'reservoir_view' ? 'active' : ''}`}
            onClick={() => applyPreset('reservoir_view')}
          >
            Reservoir View
          </button>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'breach_view' ? 'active' : ''}`}
            onClick={() => applyPreset('breach_view')}
          >
            Breach View
          </button>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'wave_front' ? 'active' : ''}`}
            onClick={() => applyPreset('wave_front')}
          >
            Flood Wave
          </button>
          <button
            type="button"
            className={`sim3d-cam-btn ${activeCameraPreset === 'top_down' ? 'active' : ''}`}
            onClick={() => applyPreset('top_down')}
          >
            Top Down
          </button>
        </div>

        {/* Floating Probe Pin Inspector Modal */}
        {selectedPin && (
          <div className="sim3d-probe-card">
            <div className="sim3d-probe-header">
              <span className="sim3d-probe-title">{selectedPin.name}</span>
              <button type="button" className="sim3d-probe-close" onClick={() => setSelectedPin(null)}>
                ✕
              </button>
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              <div><b>Type:</b> {selectedPin.type}</div>
              <div><b>Distance from Dam:</b> {selectedPin.km} km</div>
              <div><b>Elevation:</b> {selectedPin.elevationM} m MSL</div>
              {selectedPin.censusPopulation && <div><b>Census Population:</b> {selectedPin.censusPopulation.toLocaleString()}</div>}
              {selectedPin.district && <div><b>District:</b> {selectedPin.district}</div>}
              {selectedPin.facilityType && <div><b>Facility:</b> {selectedPin.facilityType} ({selectedPin.criticalLevel})</div>}
              {selectedPin.details && <div><b>Specs:</b> {selectedPin.details}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
