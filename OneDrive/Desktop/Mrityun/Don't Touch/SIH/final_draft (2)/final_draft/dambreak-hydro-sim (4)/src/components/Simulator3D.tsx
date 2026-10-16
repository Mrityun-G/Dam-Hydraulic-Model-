/**
 * DAMBREAK HYDRO-SIM: 3D Geospatial Terrain & Hydrodynamic Valley Simulator
 * Interactive 3D WebGL Visualization of Dam-Break Inundation & Wave Propagation
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  MapPin, 
  Maximize2, 
  Compass, 
  Navigation
} from 'lucide-react';
import { HydroSimulationOutput } from '../types';
import { 
  HIRAKUD_DAM_SPECS, 
  INDIAN_DAMS_REGISTRY
} from '../data/damData';
import {
  calculateTerrainElevation,
  generateTerrainTexture,
  createRealisticDamStructure,
  getRiverCenterAtZ,
  getWavePropagationState,
  createGeographicMarkers,
  buildRiverSplineForDam,
  createRiverRibbonGeometry
} from '../utils/terrainBuilder3D';

interface Simulator3DProps {
  simulationOutput: HydroSimulationOutput;
  compactMode?: boolean;
  onOpenFull?: () => void;
}

type CameraPresetKey = 'perspective' | 'dam_crest' | 'wave_front' | 'valley_oblique' | 'top_down';

interface CameraTarget {
  pos: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export const Simulator3D: React.FC<Simulator3DProps> = ({
  simulationOutput,
  compactMode = false,
  onOpenFull,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simulationTimeHours, setSimulationTimeHours] = useState<number>(2.5);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [zExaggeration, setZExaggeration] = useState<number>(1.3);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPresetKey>('perspective');

  // Layer Toggles
  const [showDam, setShowDam] = useState<boolean>(true);
  const [showReservoir, setShowReservoir] = useState<boolean>(true);
  const [showFloodWater, setShowFloodWater] = useState<boolean>(true);
  const [showVelocityVectors, setShowVelocityVectors] = useState<boolean>(true);
  const [showSettlements, setShowSettlements] = useState<boolean>(true);
  const [showFacilities, setShowFacilities] = useState<boolean>(true);

  // Sync React State to Refs to avoid stale closures in Three.js requestAnimationFrame
  const simulationTimeHoursRef = useRef<number>(simulationTimeHours);
  const showDamRef = useRef<boolean>(showDam);
  const showReservoirRef = useRef<boolean>(showReservoir);
  const showFloodWaterRef = useRef<boolean>(showFloodWater);
  const showVelocityVectorsRef = useRef<boolean>(showVelocityVectors);
  const showSettlementsRef = useRef<boolean>(showSettlements);
  const showFacilitiesRef = useRef<boolean>(showFacilities);

  useEffect(() => { simulationTimeHoursRef.current = simulationTimeHours; }, [simulationTimeHours]);
  useEffect(() => { showDamRef.current = showDam; }, [showDam]);
  useEffect(() => { showReservoirRef.current = showReservoir; }, [showReservoir]);
  useEffect(() => { showFloodWaterRef.current = showFloodWater; }, [showFloodWater]);
  useEffect(() => { showVelocityVectorsRef.current = showVelocityVectors; }, [showVelocityVectors]);
  useEffect(() => { showSettlementsRef.current = showSettlements; }, [showSettlements]);
  useEffect(() => { showFacilitiesRef.current = showFacilities; }, [showFacilities]);

  // Interactive Selected Point Probe
  const [selectedPin, setSelectedPin] = useState<{
    name: string;
    type: 'DAM' | 'SETTLEMENT' | 'FACILITY' | 'REACH';
    km: number;
    elevationM: number;
    depthM: number;
    velocityMs: number;
    hr: number;
    isFlooded: boolean;
    details: string;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dynamic Scene Meshes
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const damGroupRef = useRef<THREE.Group | null>(null);
  const reservoirMeshRef = useRef<THREE.Mesh | null>(null);
  const floodMeshRef = useRef<THREE.Mesh | null>(null);
  const breachJetMeshRef = useRef<THREE.Mesh | null>(null);
  const vectorsGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);

  // Camera Animation Tween
  const cameraTweenRef = useRef<{
    active: boolean;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    progress: number;
  }>({
    active: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
  });

  // Current dam info
  const activeDam = useMemo(() => {
    const targetDamId = simulationOutput.selectedDamId || simulationOutput.damId || 'hirakud-dam-odisha';
    return INDIAN_DAMS_REGISTRY.find(d => d.id === targetDamId) || HIRAKUD_DAM_SPECS;
  }, [simulationOutput.selectedDamId, simulationOutput.damId]);

  const riverSpline = useMemo(() => {
    return buildRiverSplineForDam(activeDam);
  }, [activeDam]);

  // Calculate current wave state for React HUD
  const waveState = useMemo(() => {
    return getWavePropagationState(simulationTimeHours, activeDam);
  }, [simulationTimeHours, activeDam]);

  // Dynamic current metrics derived strictly from active dam and simulation output
  const activeMetrics = useMemo(() => {
    const frontKm = waveState.frontKm;
    const maxReachKm = activeDam.reaches[activeDam.reaches.length - 1]?.distanceFromDamKm || 58.0;
    const progressFrac = Math.min(1.0, frontKm / Math.max(1, maxReachKm));

    // Current front depth and velocity
    const maxDepth = simulationOutput.maxFloodDepthM || 22.0;
    const maxVel = simulationOutput.maxFlowVelocityMs || 4.2;
    const currentFrontDepth = Math.max(0, Number((maxDepth * Math.pow(1.0 - progressFrac * 0.45, 1.2)).toFixed(1)));
    const currentFrontVel = Math.max(1.8, Number((maxVel * (1.0 - progressFrac * 0.4)).toFixed(1)));
    
    // Inundation area expanding with wave front
    const totalArea = simulationOutput.totalInundationAreaKm2 || 120.0;
    const currentAreaKm2 = Math.min(
      totalArea,
      Number((totalArea * Math.pow(progressFrac, 0.9)).toFixed(1))
    );

    // DEFRA Hazard Rating HR = d * (v + 0.5) + DF
    const hr = Number((currentFrontDepth * (currentFrontVel + 0.5) + (currentFrontDepth > 0.3 ? 0.5 : 0.0)).toFixed(1));
    let hazardCat = 'LOW';
    if (hr >= 2.0) hazardCat = 'EXTREME';
    else if (hr >= 1.25) hazardCat = 'SIGNIFICANT';
    else if (hr >= 0.75) hazardCat = 'MODERATE';

    // Count flooded settlements & facilities for active dam
    const settlements = activeDam.settlements && activeDam.settlements.length > 0 ? activeDam.settlements : HIRAKUD_DAM_SPECS.settlements;
    const floodedSettlements = settlements.filter(s => s.distanceFromDamKm <= frontKm);
    const totalPopExposed = floodedSettlements.reduce((sum, s) => sum + s.censusPopulation, 0);

    return {
      frontKm,
      currentFrontDepth,
      currentFrontVel,
      currentAreaKm2,
      hr,
      hazardCat,
      floodedSettlementsCount: floodedSettlements.length,
      totalPopExposed,
    };
  }, [waveState, simulationOutput, activeDam]);

  // Handle camera transition
  const transitionCameraTo = useCallback((target: CameraTarget) => {
    if (!cameraRef.current || !controlsRef.current) return;

    cameraTweenRef.current = {
      active: true,
      startPos: cameraRef.current.position.clone(),
      endPos: target.pos.clone(),
      startTarget: controlsRef.current.target.clone(),
      endTarget: target.lookAt.clone(),
      progress: 0,
    };
  }, []);

  // Optimal Camera Framing Presets (Prevent terrain clipping for all dams)
  const applyCameraPreset = useCallback((preset: CameraPresetKey) => {
    setActiveCameraPreset(preset);

    const frontZ = waveState.frontZ;
    const { x: frontX } = getRiverCenterAtZ(frontZ, riverSpline);

    switch (preset) {
      case 'perspective':
        // Primary Overview: Elevated oblique view framing Dam (Z=-75) and entire downstream valley (Z=-70 to Z=120)
        transitionCameraTo({
          pos: new THREE.Vector3(0, 150, 210),
          lookAt: new THREE.Vector3(0, 15, 30),
        });
        break;
      case 'dam_crest':
        // Upstream Dam Crest View: High above the dam structure
        transitionCameraTo({
          pos: new THREE.Vector3(60, 50, -40),
          lookAt: new THREE.Vector3(0, 15, -75),
        });
        break;
      case 'wave_front':
        // Downstream Flood Front View: Oblique perspective following the wave front
        transitionCameraTo({
          pos: new THREE.Vector3(frontX + 55, 55, frontZ + 55),
          lookAt: new THREE.Vector3(frontX, 15, frontZ),
        });
        break;
      case 'valley_oblique':
        // Downstream Looking Upstream Valley
        transitionCameraTo({
          pos: new THREE.Vector3(0, 120, -140),
          lookAt: new THREE.Vector3(0, 10, 30),
        });
        break;
      case 'top_down':
        // Orthographic GIS Plan View
        transitionCameraTo({
          pos: new THREE.Vector3(0, 280, 15),
          lookAt: new THREE.Vector3(0, 0, 15),
        });
        break;
    }
  }, [waveState.frontZ, riverSpline, transitionCameraTo]);

  // 1. Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || (compactMode ? 280 : 540);

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // High-contrast slate-900
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0018);
    sceneRef.current = scene;

    // 2. Perspective Camera (Optimal initial position high above valley looking downstream)
    const camera = new THREE.PerspectiveCamera(40, width / height, 1.0, 3500);
    camera.position.set(0, 150, 210);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 700;
    controls.minDistance = 20;
    controls.maxPolarAngle = Math.PI / 2 - 0.08; // Prevent camera going underground
    controls.target.set(0, 15, 30);
    controlsRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.85);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(120, 220, -100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -160;
    sunLight.shadow.camera.right = 160;
    sunLight.shadow.camera.top = 160;
    sunLight.shadow.camera.bottom = -160;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    fillLight.position.set(-100, 80, 100);
    scene.add(fillLight);

    // 6. Natural Valley Terrain Mesh (180 x 180 grid resolution)
    const gridRes = 180;
    const terrainGeo = new THREE.PlaneGeometry(300, 270, gridRes - 1, gridRes - 1);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const pz = posAttr.getZ(i);
      const elev = calculateTerrainElevation(px, pz, zExaggeration, activeDam);
      posAttr.setY(i, elev);
    }
    terrainGeo.computeVertexNormals();

    const terrainTexture = generateTerrainTexture(activeDam);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: false,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = false;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // 7. Realistic 3D Dam Structure
    const damGroup = createRealisticDamStructure(
      activeDam,
      zExaggeration,
      simulationOutput.breachWidthM || 180,
      simulationOutput.maxFloodDepthM || 22
    );
    scene.add(damGroup);
    damGroupRef.current = damGroup;

    // 8. Upstream Reservoir Water Body (Z < -75)
    const reservoirGeo = new THREE.PlaneGeometry(160, 90, 32, 32);
    reservoirGeo.rotateX(-Math.PI / 2);
    const resPos = reservoirGeo.attributes.position;
    for (let i = 0; i < resPos.count; i++) {
      resPos.setY(i, 20.5 * (zExaggeration / 1.5));
    }
    reservoirGeo.computeVertexNormals();

    const reservoirMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Deep turquoise lake water
      emissive: 0x0369a1,
      emissiveIntensity: 0.15,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      transmission: 0.5,
      ior: 1.333,
    });
    const reservoirMesh = new THREE.Mesh(reservoirGeo, reservoirMat);
    reservoirMesh.position.set(0, 0, -115);
    reservoirMesh.receiveShadow = true;
    scene.add(reservoirMesh);
    reservoirMeshRef.current = reservoirMesh;

    // 9. Dedicated River-Corridor Ribbon Water Mesh (Curving along riverSpline)
    const segZ = 120;
    const segX = 14;
    const floodGeo = createRiverRibbonGeometry(riverSpline, segZ, segX);

    const floodColors = new Float32Array(floodGeo.attributes.position.count * 3);
    floodGeo.setAttribute('color', new THREE.BufferAttribute(floodColors, 3));

    const floodMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      vertexColors: true,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });
    const floodMesh = new THREE.Mesh(floodGeo, floodMat);
    floodMesh.receiveShadow = true;
    scene.add(floodMesh);
    floodMeshRef.current = floodMesh;

    // 10. High-Velocity Dam Breach Outflow Jet
    const jetGeo = new THREE.CylinderGeometry(3.5, 7.5, 18, 16);
    jetGeo.rotateX(Math.PI / 2);
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
    });
    const breachJetMesh = new THREE.Mesh(jetGeo, jetMat);
    breachJetMesh.position.set(0, 8 * (zExaggeration / 1.5), -66);
    scene.add(breachJetMesh);
    breachJetMeshRef.current = breachJetMesh;

    // 11. Flow Velocity Direction Cones along River Channel
    const vectorsGroup = new THREE.Group();
    const arrowCount = 10;
    for (let k = 0; k < arrowCount; k++) {
      const arrowGeo = new THREE.ConeGeometry(1.4, 4.0, 8);
      arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(0, 14, -50 + k * 20);
      vectorsGroup.add(arrow);
    }
    scene.add(vectorsGroup);
    vectorsGroupRef.current = vectorsGroup;

    // 12. Geographic Markers (Settlements & Facilities)
    const markersGroup = createGeographicMarkers(activeDam, zExaggeration);
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // 13. Interactive Raycasting Probe for Settlements & Facilities
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.height) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (markersGroupRef.current) {
        const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
        if (intersects.length > 0) {
          let obj: THREE.Object3D | null = intersects[0].object;
          while (obj && !obj.userData?.name && obj.parent) {
            obj = obj.parent;
          }

          if (obj && obj.userData?.name) {
            const data = obj.userData;
            const currentSimTime = simulationTimeHoursRef.current;
            const currentWave = getWavePropagationState(currentSimTime, activeDam);
            const isFlooded = currentWave.frontKm >= data.km;
            const depth = isFlooded ? Math.max(0.5, Number((8.5 * Math.pow(1 - (data.km / 65), 1.1)).toFixed(1))) : 0;
            const vel = isFlooded ? Math.max(1.2, Number((5.2 * (1 - data.km / 80)).toFixed(1))) : 0;
            const hr = Number((depth * (vel + 0.5) + (depth > 0.3 ? 0.5 : 0)).toFixed(1));

            setSelectedPin({
              name: data.name,
              type: data.type,
              km: data.km,
              elevationM: Math.round(146 - data.km * 0.55),
              depthM: depth,
              velocityMs: vel,
              hr,
              isFlooded,
              details: data.pop ? `Population: ${data.pop}` : `Type: ${data.type}`,
            });
          }
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 14. Render Loop with REALTIME Simulation Time & Dynamic Wave Propagation
    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Read current simulation time and layer visibility from REFS (avoids stale closures)
      const currentSimTime = simulationTimeHoursRef.current;
      const isDamVisible = showDamRef.current;
      const isReservoirVisible = showReservoirRef.current;
      const isWaterVisible = showFloodWaterRef.current;
      const isVectorsVisible = showVelocityVectorsRef.current;
      const isSettlementsVisible = showSettlementsRef.current;
      const isFacilitiesVisible = showFacilitiesRef.current;

      if (cameraTweenRef.current.active) {
        cameraTweenRef.current.progress += 0.035;
        const p = Math.min(1.0, cameraTweenRef.current.progress);
        const ease = p * p * (3 - 2 * p);

        camera.position.lerpVectors(cameraTweenRef.current.startPos, cameraTweenRef.current.endPos, ease);
        controls.target.lerpVectors(cameraTweenRef.current.startTarget, cameraTweenRef.current.endTarget, ease);

        if (p >= 1.0) {
          cameraTweenRef.current.active = false;
        }
      }

      controls.update();

      // Reservoir surface ripple effect
      if (reservoirMeshRef.current && isReservoirVisible) {
        reservoirMeshRef.current.visible = true;
        const rPos = reservoirMeshRef.current.geometry.attributes.position;
        for (let i = 0; i < rPos.count; i++) {
          const u = rPos.getX(i);
          const v = rPos.getZ(i);
          const wave = Math.sin(u * 0.08 + elapsed * 1.5) * Math.cos(v * 0.08 + elapsed * 1.2) * 0.3;
          rPos.setY(i, (20.5 + wave) * (zExaggeration / 1.5));
        }
        reservoirMeshRef.current.geometry.computeVertexNormals();
        reservoirMeshRef.current.geometry.attributes.position.needsUpdate = true;
      } else if (reservoirMeshRef.current) {
        reservoirMeshRef.current.visible = false;
      }

      // Breach Outflow Jet Pulsing
      if (breachJetMeshRef.current) {
        const hasOutflow = currentSimTime > 0;
        breachJetMeshRef.current.visible = hasOutflow && isDamVisible;
        if (hasOutflow) {
          const pulse = 1.0 + Math.sin(elapsed * 7.0) * 0.1;
          breachJetMeshRef.current.scale.set(pulse, 1.0, pulse);
        }
      }

      // REALTIME DOWNSTREAM FLOOD WAVE PROPAGATION ALONG CURVED RIVER RIBBON
      if (floodMeshRef.current && isWaterVisible && currentSimTime > 0) {
        floodMeshRef.current.visible = true;
        const geo = floodMeshRef.current.geometry as THREE.BufferGeometry;
        const pos = geo.attributes.position;
        const colorAttr = geo.attributes.color;

        // Compute REALTIME wave propagation state from currentSimTime on EVERY FRAME
        const currentWaveState = getWavePropagationState(currentSimTime, activeDam);
        const frontZ = currentWaveState.frontZ;
        const outflowRatio = currentWaveState.outflowRatio;
        const isHirakud = activeDam.id === 'hirakud-dam-odisha';
        const isTehri = activeDam.id === 'tehri-dam-uttarakhand';
        const damFloodScale = isHirakud ? 0.6 : isTehri ? 0.5 : 1.0;
        const flowVelocityMs = activeMetrics.currentFrontVel || 3.5;

        const segZ = 120;
        const segX = 14;
        let floodedCount = 0;
        const totalVerts = (segZ + 1) * (segX + 1);

        for (let j = 0; j <= segZ; j++) {
          const factorZ = j / segZ;
          const z = -75 + factorZ * 195;

          const { x: rx, channelWidth } = getRiverCenterAtZ(z, riverSpline);
          const downstreamDist = Math.max(0, z + 75);
          // River channel width expands gradually downstream
          const halfWidth = Math.max(channelWidth * 1.6, 14 + downstreamDist * 0.05);
          const normalizedDist = Math.min(1, downstreamDist / 220);

          const distanceToFront = frontZ - z;
          // Smooth front falloff boundary over 8 units
          const frontFade = Math.min(1, Math.max(0, distanceToFront / 8));

          // Hide segments past frontZ (downstream of wave front) or upstream of dam
          const isPastFront = z > frontZ || z < -75;

          for (let i = 0; i <= segX; i++) {
            const index = j * (segX + 1) + i;
            const factorX = i / segX;
            const u = factorX * 2 - 1; // Lateral offset [-1, +1]
            const x = rx + u * halfWidth;

            const terrainElev = calculateTerrainElevation(x, z, zExaggeration, activeDam);

            if (isPastFront) {
              // Hide dry land past wave front underground to expose 100% natural terrain
              pos.setXYZ(index, x, -100, z);
              colorAttr.setXYZ(index, 0.01, 0.35, 0.65);
              continue;
            }

            floodedCount++;

            // CONTINUOUS UNBROKEN WATER SHEET (waterSurface = terrainElevation + minimumDepth + smoothFloodDepth)
            const latFactor = Math.max(0, 1 - u * u);
            const baseDepth = Math.max(1.0, 14 * damFloodScale * outflowRatio * Math.pow(1 - normalizedDist * 0.7, 0.6));
            
            // Minimum clearance of 0.35m guaranteed above local terrain everywhere inside flooded region
            const minimumDepth = 0.35;
            const smoothFloodDepth = baseDepth * (0.4 + 0.6 * Math.pow(latFactor, 0.7)) * (0.5 + 0.5 * frontFade);

            const finalWaterSurface = terrainElev + minimumDepth + smoothFloodDepth;

            // Continuous downstream flow wave ripple along river curve
            const flowWave = Math.sin(z * 0.35 - elapsed * 4.5 * (flowVelocityMs / 3.5)) * Math.cos(x * 0.25 + elapsed * 2.0) * 0.30;

            // Every vertex behind frontZ stays connected on the continuous water surface
            pos.setXYZ(index, x, finalWaterSurface + flowWave, z);

            if (distanceToFront < 6) {
              // Moving foaming wave front crest boundary
              const foamPulse = 0.82 + Math.sin(z * 0.8 - elapsed * 6.0 + i * 0.05) * 0.18;
              colorAttr.setXYZ(index, 0.9 * foamPulse, 0.96 * foamPulse, 1.0);
            } else if (smoothFloodDepth < 2.5) {
              colorAttr.setXYZ(index, 0.12, 0.65, 0.92);
            } else {
              colorAttr.setXYZ(index, 0.01, 0.42, 0.78);
            }
          }
        }

        pos.needsUpdate = true;
        colorAttr.needsUpdate = true;
        geo.computeVertexNormals();

        // Console debug log as requested by Requirement 11
        if (Math.floor(elapsed * 10) % 20 === 0) {
          console.log(`[3D FLOOD DEBUG] simTime: ${currentSimTime.toFixed(1)}h | frontKm: ${currentWaveState.frontKm}km | frontZ: ${currentWaveState.frontZ.toFixed(1)} | floodedVerts: ${floodedCount}/${totalVerts} | meshVisible: ${floodMeshRef.current.visible}`);
        }
      } else if (floodMeshRef.current) {
        floodMeshRef.current.visible = false;
      }

      // Flow Velocity Direction Cones Moving Downstream along River Curve
      if (vectorsGroupRef.current) {
        vectorsGroupRef.current.visible = isVectorsVisible && currentSimTime > 0;
        const currentFrontVel = activeMetrics.currentFrontVel || 3.5;
        const currentWaveState = getWavePropagationState(currentSimTime, activeDam);

        vectorsGroupRef.current.children.forEach((arrow, idx) => {
          const initialZ = -60 + idx * 22;
          const zOffset = (initialZ + elapsed * 10.0 * (currentFrontVel / 3.5)) % 195 - 75;

          if (zOffset >= -75 && zOffset <= currentWaveState.frontZ) {
            arrow.visible = true;
            const { x: rx } = getRiverCenterAtZ(zOffset, riverSpline);
            const terrainElev = calculateTerrainElevation(rx, zOffset, zExaggeration, activeDam);
            arrow.position.set(rx, terrainElev + 2.5, zOffset);

            // Orient arrow downstream along local river spline direction
            const pNext = getRiverCenterAtZ(zOffset + 2.0, riverSpline);
            const dx = pNext.x - rx;
            arrow.rotation.y = Math.atan2(dx, 2.0);
          } else {
            arrow.visible = false;
          }
        });
      }

      if (damGroupRef.current) damGroupRef.current.visible = isDamVisible;
      if (markersGroupRef.current) markersGroupRef.current.visible = isSettlementsVisible || isFacilitiesVisible;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || (compactMode ? 280 : 540);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, [compactMode, zExaggeration, activeDam.id, simulationOutput.peakBreachOutflowM3s, simulationOutput.breachWidthM]);

  // Timeline Timer Loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setSimulationTimeHours((prev) => {
          if (prev >= 12.0) {
            setIsPlaying(false);
            return 12.0;
          }
          return Number((prev + 0.1 * playbackSpeed).toFixed(2));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // COMPACT EMBEDDED DASHBOARD VIEW
  if (compactMode) {
    return (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-3 shadow-md flex flex-col justify-between font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">
              3D VALLEY &amp; HYDRODYNAMIC TERRAIN — {activeDam.name}
            </h4>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => applyCameraPreset('perspective')}
              className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-teal-400 text-[10px] font-mono border border-[var(--border-color)]"
            >
              Reset View
            </button>
            <button
              onClick={() => applyCameraPreset('top_down')}
              className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] text-[10px] font-mono border border-[var(--border-color)]"
            >
              Ortho
            </button>
          </div>
        </div>

        <div className="relative w-full h-56 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <div ref={mountRef} className="w-full h-full" />
          <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-teal-300 backdrop-blur-sm">
            T + {simulationTimeHours.toFixed(1)}h • Wave: {activeMetrics.frontKm} km
          </div>
          {onOpenFull && (
            <button
              onClick={onOpenFull}
              className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full 3D GIS</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)] mt-2 font-mono">
          <span>Terrain: CartoDEM 10m Topography ({activeDam.location.river} River)</span>
          <span className="text-teal-400 font-semibold">WebGL 3D Engine</span>
        </div>
      </div>
    );
  }

  // FULL SCIENTIFIC 3D GIS SIMULATOR PAGE
  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header Toolbar */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  3D Geospatial Hydrodynamic Valley Simulator — {activeDam.name}
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 uppercase">
                  CARTODEM 10M + 2D SWE
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                Dam: <strong className="text-teal-400">{activeDam.name}</strong> • River Basin: <strong className="text-[var(--text-primary)]">{activeDam.location.river} River</strong> ({activeDam.location.district}, {activeDam.location.state})
              </p>
            </div>
          </div>
        </div>

        {/* Camera Views & Z-Scale */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl text-xs">
            <span className="text-[var(--text-muted)] px-1 text-[10px] uppercase font-bold">Camera:</span>
            {[
              { id: 'perspective', label: 'RESET VIEW' },
              { id: 'dam_crest', label: 'DAM CREST' },
              { id: 'wave_front', label: 'FLOOD FRONT' },
              { id: 'top_down', label: 'ORTHO PLAN' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyCameraPreset(preset.id as CameraPresetKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeCameraPreset === preset.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1 rounded-xl text-xs">
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Z-Scale:</span>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={zExaggeration}
              onChange={(e) => setZExaggeration(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-[var(--bg-panel)] rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
            <span className="text-teal-400 font-bold text-[11px]">{zExaggeration.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Main 3D Viewport & Right HUD Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main 3D Viewport (3 Columns) */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden relative shadow-2xl flex flex-col">
          <div className="relative w-full h-[600px]">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Floating Top-Center Status Badge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md border border-teal-500/40 rounded-full px-4 py-1.5 text-teal-300 text-xs font-mono font-bold flex items-center gap-2.5 shadow-2xl z-10">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping inline-block" />
              <span>● {activeDam.name.toUpperCase()} SCENARIO</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-100">T + {simulationTimeHours.toFixed(1)} hrs</span>
            </div>

            {/* GIS Layer Toggles HUD (Top Left) */}
            <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-slate-200 shadow-2xl space-y-2 text-[11px] font-mono z-10">
              <div className="font-bold text-teal-300 text-[10px] uppercase tracking-wider pb-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>GIS LAYERS</span>
                <Layers className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={showDam}
                    onChange={(e) => setShowDam(e.target.checked)}
                    className="accent-teal-400 rounded"
                  />
                  <span>Dam &amp; Breach</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={showReservoir}
                    onChange={(e) => setShowReservoir(e.target.checked)}
                    className="accent-teal-400 rounded"
                  />
                  <span>Reservoir</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={showFloodWater}
                    onChange={(e) => setShowFloodWater(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Flood Surface</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={showVelocityVectors}
                    onChange={(e) => setShowVelocityVectors(e.target.checked)}
                    className="accent-sky-400 rounded"
                  />
                  <span>Flow Vectors</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={showSettlements}
                    onChange={(e) => setShowSettlements(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Settlements</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={showFacilities}
                    onChange={(e) => setShowFacilities(e.target.checked)}
                    className="accent-rose-400 rounded"
                  />
                  <span>Critical Facilities</span>
                </label>
              </div>
            </div>

            {/* Navigation Guide (Top Right) */}
            <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-slate-400 text-[10px] font-mono flex items-center gap-2 shadow-lg z-10">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>Orbit: Left-Click • Pan: Right-Click • Zoom: Scroll</span>
            </div>

            {/* Interactive Point Probe Overlay */}
            {selectedPin && (
              <div className="absolute bottom-24 left-4 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 text-slate-100 text-xs max-w-sm shadow-2xl space-y-2 font-mono z-20">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span className="font-bold text-slate-100 text-xs">{selectedPin.name}</span>
                  </div>
                  {selectedPin.isFlooded ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold">
                      INUNDATED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                      SAFE MARGIN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedPin.details} • Distance: {selectedPin.km} km
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Flood Depth</span>
                    <span className="font-bold text-teal-300">{selectedPin.depthM} m</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Velocity</span>
                    <span className="font-bold text-slate-200">{selectedPin.velocityMs} m/s</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block uppercase">Defra HR</span>
                    <span className="font-bold text-rose-300">{selectedPin.hr}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Control Deck */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 text-slate-100 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3.5 font-mono z-10">
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition shadow-md cursor-pointer"
                  title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  onClick={() => setSimulationTimeHours(0)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                  title="Reset to T+0.0h"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider leading-none mb-0.5">SIMULATION TIME</span>
                  <span className="text-sm font-bold text-teal-300">
                    T + {simulationTimeHours.toFixed(1)} hrs
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full flex items-center gap-3 px-2">
                <span className="text-[10px] text-slate-400">00:00</span>
                <input
                  type="range"
                  min="0.0"
                  max="12.0"
                  step="0.1"
                  value={simulationTimeHours}
                  onChange={(e) => {
                    setSimulationTimeHours(parseFloat(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="flex-1 h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <span className="text-[10px] text-slate-400">12:00</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-[10px]">
                  {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <div className="text-right text-xs hidden sm:block">
                  <span className="text-[9px] text-slate-400 block uppercase">Wave Front</span>
                  <span className="font-bold text-teal-300">{activeMetrics.frontKm} km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Professional GIS Legend */}
          <div className="bg-[#070c18] border-t border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">3D LEGEND:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-700 inline-block border border-slate-600" />
                <span>■ Natural Terrain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0284c7] inline-block" />
                <span>■ Reservoir Lake</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-cyan-400 inline-block" />
                <span>■ Dynamic Flood Surface</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-teal-400 font-bold">→</span>
                <span>Flow Velocity Vector</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">●</span>
                <span>Settlement</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">▲</span>
                <span>Critical Facility</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Live Metrics Panel (1 Column) */}
        <div className="bg-[#0a1120] border border-slate-800/80 rounded-xl p-4 shadow-2xl flex flex-col justify-between text-xs space-y-4 font-mono">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
              <div>
                <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">
                  SIMULATION METRICS
                </h3>
                <span className="text-[10px] text-slate-400">{activeDam.name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-bold">
                MODEL-DERIVED
              </span>
            </div>

            <div className="space-y-2.5">
              {/* PEAK DISCHARGE */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">PEAK DISCHARGE</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    CALCULATED (Froehlich)
                  </span>
                </div>
                <div className="text-lg font-bold text-teal-300">
                  {simulationOutput.peakBreachOutflowM3s ? `${simulationOutput.peakBreachOutflowM3s.toLocaleString()} m³/s` : 'DATA NOT AVAILABLE'}
                </div>
              </div>

              {/* MAX FLOOD DEPTH */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">MAX FLOOD DEPTH</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    MODELLED (2D SWE)
                  </span>
                </div>
                <div className="text-lg font-bold text-teal-300">
                  {activeMetrics.currentFrontDepth ? `${activeMetrics.currentFrontDepth} m` : 'DATA NOT AVAILABLE'}
                </div>
              </div>

              {/* MAX FLOW VELOCITY */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">MAX FLOW VELOCITY</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                    MODELLED VELOCITY
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {activeMetrics.currentFrontVel ? `${activeMetrics.currentFrontVel} m/s` : 'DATA NOT AVAILABLE'}
                </div>
              </div>

              {/* INUNDATION EXTENT */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">INUNDATION EXTENT</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    MODELLED EXTENT
                  </span>
                </div>
                <div className="text-lg font-bold text-teal-300">
                  {activeMetrics.currentAreaKm2 ? `${activeMetrics.currentAreaKm2} km²` : 'DATA NOT AVAILABLE'}
                </div>
              </div>

              {/* AFFECTED POPULATION */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">AFFECTED POPULATION</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    REFERENCE DATA (Census)
                  </span>
                </div>
                <div className="text-base font-bold text-amber-300">
                  {activeMetrics.totalPopExposed ? activeMetrics.totalPopExposed.toLocaleString() : 'DATA NOT AVAILABLE'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>River Reach:</span>
              <strong className="text-slate-200">{activeDam.location.river} River</strong>
            </div>
            <div className="flex justify-between">
              <span>State / District:</span>
              <strong className="text-slate-200">{activeDam.location.state}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
