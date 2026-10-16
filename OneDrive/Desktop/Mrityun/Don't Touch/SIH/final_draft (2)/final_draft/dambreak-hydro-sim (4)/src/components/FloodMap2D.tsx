/**
 * DAMBREAK HYDRO-SIM: Real Geospatial 2D GIS Flood Map
 * Interactive Leaflet-powered GIS engine rendering model-derived flood extents, continuous depth rasters,
 * river geometries, dam infrastructure, critical facilities, and Census settlements.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  MapPin,
  Eye,
  EyeOff,
  Compass,
  Info,
  ShieldAlert,
  Crosshair,
  Maximize2,
  Sliders,
  ChevronRight,
  Activity,
  Waves,
  Building2,
  Navigation,
} from 'lucide-react';
import { HydroSimulationOutput, SettlementData, CriticalFacility } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface FloodMap2DProps {
  simulationOutput: HydroSimulationOutput;
}

export const FloodMap2D: React.FC<FloodMap2DProps> = ({ simulationOutput }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Time Scrubbing & Animation State
  const [simulationTimeHours, setSimulationTimeHours] = useState<number>(3.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Layer Toggles
  const [activeBaseMap, setActiveBaseMap] = useState<'openstreetmap'>('openstreetmap');
  const [showDepthLayer, setShowDepthLayer] = useState<boolean>(true);
  const [showExtentLayer, setShowExtentLayer] = useState<boolean>(true);
  const [showVelocityLayer, setShowVelocityLayer] = useState<boolean>(true);
  const [showArrivalTime, setShowArrivalTime] = useState<boolean>(false);
  const [showFacilities, setShowFacilities] = useState<boolean>(true);
  const [showSettlements, setShowSettlements] = useState<boolean>(true);
  const [showRiverCenterline, setShowRiverCenterline] = useState<boolean>(true);
  const [showReservoir, setShowReservoir] = useState<boolean>(true);

  // Mouse & Probe Coordinates
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: simulationOutput.reachResults[0]?.latitude || 21.57,
    lng: simulationOutput.reachResults[0]?.longitude || 83.87,
  });

  const [selectedProbePoint, setSelectedProbePoint] = useState<{
    name: string;
    lat: number;
    lng: number;
    kmFromDam: number;
    elevationM: number;
    depthM: number;
    velocityMs: number;
    hr: number;
    hazardClass: string;
    arrivalTimeHours: number;
  } | null>(null);

  // Get active dam specifications
  const activeDam = useMemo(() => {
    return (
      INDIAN_DAMS_REGISTRY.find((d) => d.id === simulationOutput.damId) ||
      HIRAKUD_DAM_SPECS
    );
  }, [simulationOutput.damId]);

  // Dynamic flood front distance (km) based on active timestep
  const currentFrontKm = useMemo(() => {
    const t = simulationTimeHours;
    if (t <= 0) return 0;
    return Math.min(
      simulationOutput.waveFrontFrontierKm || 58.0,
      Number((16.8 * Math.pow(t, 0.82)).toFixed(1))
    );
  }, [simulationTimeHours, simulationOutput.waveFrontFrontierKm]);

  // Initial Probe Point setup
  useEffect(() => {
    const firstReach = simulationOutput.reachResults[1] || simulationOutput.reachResults[0];
    if (firstReach) {
      setSelectedProbePoint({
        name: firstReach.reachName,
        lat: firstReach.latitude,
        lng: firstReach.longitude,
        kmFromDam: firstReach.distanceFromDamKm,
        elevationM: firstReach.peakStageM - firstReach.maxFloodDepthM,
        depthM: firstReach.maxFloodDepthM,
        velocityMs: firstReach.maxVelocityMs,
        hr: firstReach.hazardRatingHR,
        hazardClass: firstReach.hazardCategory,
        arrivalTimeHours: firstReach.arrivalTimeHours,
      });
    }
  }, [simulationOutput]);

  // Time animation loop
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

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [activeDam.location.latitude, activeDam.location.longitude],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      map.on('mousemove', (e) => {
        setCursorCoords({
          lat: Number(e.latlng.lat.toFixed(4)),
          lng: Number(e.latlng.lng.toFixed(4)),
        });
      });

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Reset view to active dam bounds
    if (simulationOutput.bounds) {
      map.fitBounds([
        [simulationOutput.bounds.south, simulationOutput.bounds.west],
        [simulationOutput.bounds.north, simulationOutput.bounds.east],
      ]);
    }
  }, [simulationOutput.damId]);

  // Render Geospatial Map Layers (Base Tiles + Vectors + GeoJSON + Probes)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. OpenStreetMap Base Layer
    // No API key is required for the standard OSM tile endpoint.
    const tileLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }
    );
    layerGroup.addLayer(tileLayer);

    // 2. Reservoir Water Body
    if (showReservoir && activeDam.reservoirPolygon && activeDam.reservoirPolygon.length > 0) {
      const reservoirPolygon = L.polygon(activeDam.reservoirPolygon, {
        color: '#0284c7',
        weight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.45,
      }).bindTooltip(`${activeDam.name} Reservoir (${activeDam.grossStorageCapacityMCM} MCM)`, {
        sticky: true,
        className: 'font-mono text-xs',
      });
      layerGroup.addLayer(reservoirPolygon);
    }

    // 3. River Centerline
    if (showRiverCenterline && activeDam.riverCenterline && activeDam.riverCenterline.length > 0) {
      const riverLatLngs = activeDam.riverCenterline.map((c) => [c.lat, c.lng] as [number, number]);
      const riverLine = L.polyline(riverLatLngs, {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 4',
      }).bindTooltip(`${activeDam.location.river} River Centerline Thalweg`, {
        sticky: true,
      });
      layerGroup.addLayer(riverLine);
    }

    // 4. Dam Infrastructure Marker
    const damIcon = L.divIcon({
      className: 'custom-dam-marker',
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border-2 border-amber-400 text-amber-400 shadow-md transform -translate-x-4 -translate-y-4 hover:scale-110 transition cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 20h20"/>
            <path d="m5 20 2-16h10l2 16"/>
            <path d="M9 4v16"/>
            <path d="M15 4v16"/>
          </svg>
        </div>
      `,
    });

    const damMarker = L.marker([activeDam.location.latitude, activeDam.location.longitude], {
      icon: damIcon,
    }).bindPopup(`
      <div class="p-2 font-sans space-y-1 text-slate-800">
        <div class="font-bold text-xs text-slate-900 border-b pb-1">${activeDam.name}</div>
        <div class="text-[11px]"><b>River:</b> ${activeDam.location.river}</div>
        <div class="text-[11px]"><b>Type:</b> ${activeDam.damType}</div>
        <div class="text-[11px]"><b>Height:</b> ${activeDam.heightAboveLowestFoundation} m</div>
        <div class="text-[11px]"><b>FRL:</b> ${activeDam.fullReservoirLevelFRL} m MSL</div>
        <div class="text-[11px]"><b>MWL:</b> ${activeDam.maximumWaterLevelMWL} m MSL</div>
        <div class="text-[11px] text-teal-700 font-bold">Breach Peak Q: ${simulationOutput.peakBreachOutflowM3s.toLocaleString()} m³/s</div>
      </div>
    `);
    layerGroup.addLayer(damMarker);

    // 5. Model-Derived Flood Extent & Continuous Depth Polygons
    if (showExtentLayer && simulationOutput.floodExtentGeoJson) {
      simulationOutput.floodExtentGeoJson.features.forEach((feat) => {
        const isReached = currentFrontKm >= feat.properties.distanceKm * 0.75;
        if (!isReached) return;

        // Dynamic color styling by depth or velocity
        let fillColor = '#38bdf8';
        let fillOpacity = 0.55;

        if (showDepthLayer) {
          if (feat.properties.depthM >= 5.0) {
            fillColor = '#1e3a8a'; // Deep navy
            fillOpacity = 0.75;
          } else if (feat.properties.depthM >= 3.0) {
            fillColor = '#0284c7'; // Cerulean
            fillOpacity = 0.65;
          } else if (feat.properties.depthM >= 1.5) {
            fillColor = '#38bdf8'; // Aqua
            fillOpacity = 0.55;
          } else {
            fillColor = '#67e8f9'; // Cyan shallow
            fillOpacity = 0.45;
          }
        } else if (showVelocityLayer) {
          if (feat.properties.velocityMs >= 4.0) fillColor = '#dc2626'; // High velocity red
          else if (feat.properties.velocityMs >= 2.5) fillColor = '#f97316'; // Orange
          else fillColor = '#0ea5e9'; // Moderate blue
        }

        const latLngs = feat.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);

        const floodPoly = L.polygon(latLngs, {
          color: fillColor,
          weight: 1.5,
          fillColor,
          fillOpacity,
        }).on('click', () => {
          setSelectedProbePoint({
            name: feat.properties.reachName,
            lat: latLngs[0][0],
            lng: latLngs[0][1],
            kmFromDam: feat.properties.distanceKm,
            elevationM: 140.0 - feat.properties.distanceKm * 0.5,
            depthM: feat.properties.depthM,
            velocityMs: feat.properties.velocityMs,
            hr: feat.properties.hazardRating,
            hazardClass: feat.properties.hazardClass,
            arrivalTimeHours: feat.properties.arrivalTimeHours,
          });
        });

        floodPoly.bindTooltip(`
          <div class="font-sans text-xs">
            <div class="font-bold">${feat.properties.reachName}</div>
            <div>Depth: <b>${feat.properties.depthM} m</b></div>
            <div>Velocity: <b>${feat.properties.velocityMs} m/s</b></div>
            <div>Hazard: <b class="text-rose-700">${feat.properties.hazardClass}</b></div>
          </div>
        `, { sticky: true });

        layerGroup.addLayer(floodPoly);
      });
    }

    // 6. Census Settlements Markers
    if (showSettlements && activeDam.settlements) {
      activeDam.settlements.forEach((s) => {
        const isFlooded = currentFrontKm >= s.distanceFromDamKm;
        const color = isFlooded ? '#e11d48' : '#475569';

        const settleMarker = L.circleMarker([s.latitude, s.longitude], {
          radius: 6,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).on('click', () => {
          const reach = simulationOutput.reachResults.reduce((prev, curr) =>
            Math.abs(curr.distanceFromDamKm - s.distanceFromDamKm) < Math.abs(prev.distanceFromDamKm - s.distanceFromDamKm) ? curr : prev
          );
          setSelectedProbePoint({
            name: s.name,
            lat: s.latitude,
            lng: s.longitude,
            kmFromDam: s.distanceFromDamKm,
            elevationM: s.elevationM,
            depthM: isFlooded ? reach.maxFloodDepthM : 0,
            velocityMs: isFlooded ? reach.maxVelocityMs : 0,
            hr: isFlooded ? reach.hazardRatingHR : 0,
            hazardClass: isFlooded ? reach.hazardCategory : 'LOW',
            arrivalTimeHours: reach.arrivalTimeHours,
          });
        });

        settleMarker.bindTooltip(`
          <div class="font-sans text-xs">
            <div class="font-bold text-slate-900">${s.name}</div>
            <div class="text-[11px] text-slate-600">Population: <b>${s.censusPopulation.toLocaleString()}</b></div>
            <div class="text-[11px] text-slate-600">Distance: <b>${s.distanceFromDamKm} km</b></div>
            <div class="text-[11px] font-bold ${isFlooded ? 'text-rose-600' : 'text-emerald-700'}">
              Status: ${isFlooded ? 'INUNDATED' : 'SAFE'}
            </div>
          </div>
        `, { sticky: true });

        layerGroup.addLayer(settleMarker);
      });
    }

    // 7. Critical Facilities Markers
    if (showFacilities && activeDam.criticalFacilities) {
      activeDam.criticalFacilities.forEach((fac) => {
        const isFlooded = currentFrontKm >= fac.distanceFromDamKm;

        const facIcon = L.divIcon({
          className: 'custom-fac-marker',
          html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-full ${
              isFlooded ? 'bg-rose-600 border-2 border-white text-white animate-pulse' : 'bg-teal-700 border-2 border-white text-white'
            } shadow-sm transform -translate-x-3 -translate-y-3 cursor-pointer">
              <span class="text-[10px] font-bold">${fac.type === 'HOSPITAL' ? 'H' : fac.type === 'POWER_STATION' ? '⚡' : fac.type === 'BRIDGE' ? '🌉' : '🏛️'}</span>
            </div>
          `,
        });

        const facMarker = L.marker([fac.latitude, fac.longitude], { icon: facIcon }).on('click', () => {
          const reach = simulationOutput.reachResults.reduce((prev, curr) =>
            Math.abs(curr.distanceFromDamKm - fac.distanceFromDamKm) < Math.abs(prev.distanceFromDamKm - fac.distanceFromDamKm) ? curr : prev
          );
          setSelectedProbePoint({
            name: fac.name,
            lat: fac.latitude,
            lng: fac.longitude,
            kmFromDam: fac.distanceFromDamKm,
            elevationM: fac.elevationM,
            depthM: isFlooded ? reach.maxFloodDepthM : 0,
            velocityMs: isFlooded ? reach.maxVelocityMs : 0,
            hr: isFlooded ? reach.hazardRatingHR : 0,
            hazardClass: isFlooded ? reach.hazardCategory : 'LOW',
            arrivalTimeHours: reach.arrivalTimeHours,
          });
        });

        facMarker.bindTooltip(`
          <div class="font-sans text-xs">
            <div class="font-bold text-slate-900">${fac.name}</div>
            <div class="text-[11px] text-slate-600">Type: <b>${fac.type}</b></div>
            <div class="text-[11px] text-slate-600">Elevation: <b>${fac.elevationM} m MSL</b></div>
            <div class="text-[11px] font-bold ${isFlooded ? 'text-rose-600' : 'text-teal-700'}">
              Operational Status: ${isFlooded ? 'INUNDATED / ACCESS CUT' : 'OPERATIONAL'}
            </div>
          </div>
        `, { sticky: true });

        layerGroup.addLayer(facMarker);
      });
    }
  }, [
    activeBaseMap,
    showDepthLayer,
    showExtentLayer,
    showVelocityLayer,
    showArrivalTime,
    showFacilities,
    showSettlements,
    showRiverCenterline,
    showReservoir,
    currentFrontKm,
    simulationOutput,
    activeDam,
  ]);

  const handleResetMap = () => {
    if (mapInstanceRef.current && simulationOutput.bounds) {
      mapInstanceRef.current.fitBounds([
        [simulationOutput.bounds.south, simulationOutput.bounds.west],
        [simulationOutput.bounds.north, simulationOutput.bounds.east],
      ]);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top GIS Command Bar */}
      <div className="bg-[#0a1120] border border-slate-800/80 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                2D Hydrodynamic GIS Flood Inundation Engine
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                CARTODEM 10M GODUNOV
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dam: <strong className="text-teal-300">{activeDam.name}</strong> • River Basin: <strong className="text-slate-200">{activeDam.location.river} River</strong> ({activeDam.location.state})
            </p>
          </div>

          {/* Time Scrubber Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition shadow-[0_0_15px_rgba(13,148,136,0.3)] cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setSimulationTimeHours(0.5);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Time Slider */}
            <div className="flex items-center gap-2.5 px-2">
              <span className="text-xs font-bold text-teal-300 whitespace-nowrap">
                T + {simulationTimeHours.toFixed(1)} hrs
              </span>
              <input
                type="range"
                min="0.5"
                max="12.0"
                step="0.1"
                value={simulationTimeHours}
                onChange={(e) => setSimulationTimeHours(parseFloat(e.target.value))}
                className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 text-[11px] border-l border-slate-800 pl-2">
              {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded-md transition ${
                    playbackSpeed === spd
                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layer Controls Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-1 uppercase">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>GIS Overlays:</span>
            </span>

            <button
              onClick={() => setShowDepthLayer(!showDepthLayer)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showDepthLayer
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              Depth Raster
            </button>

            <button
              onClick={() => setShowVelocityLayer(!showVelocityLayer)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showVelocityLayer
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              Flow Velocity
            </button>

            <button
              onClick={() => setShowExtentLayer(!showExtentLayer)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showExtentLayer
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              Flood Extent
            </button>

            <button
              onClick={() => setShowFacilities(!showFacilities)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showFacilities
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              Critical Facilities ({activeDam.criticalFacilities?.length || 0})
            </button>

            <button
              onClick={() => setShowSettlements(!showSettlements)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showSettlements
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              Settlements ({activeDam.settlements?.length || 0})
            </button>

            <button
              onClick={() => setShowReservoir(!showReservoir)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showReservoir
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              Reservoir Body
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetMap}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
              title="Fit Extent"
            >
              Fit Bounds
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas and Probe Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Cols: Leaflet GIS Interactive Map */}
        <div className="lg:col-span-3 bg-[#0a1120] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative">
          <div ref={mapContainerRef} className="w-full h-[600px] bg-slate-950 z-0" />

          {/* Coordinate HUD (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300 shadow-xl flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-teal-400" />
              <span>Cursor: <b className="text-slate-100">{cursorCoords.lat.toFixed(4)}°N, {cursorCoords.lng.toFixed(4)}°E</b></span>
            </div>
            <span className="text-slate-700">•</span>
            <div>Front: <b className="text-teal-300">{currentFrontKm} km</b> downstream</div>
          </div>

          {/* Continuous Depth Color Scale Legend (Bottom Right) */}
          <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs shadow-xl space-y-1.5">
            <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
              {showDepthLayer ? 'Flood Depth (m)' : 'Flow Velocity (m/s)'}
            </div>
            {showDepthLayer ? (
              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-blue-900" />
                  <span>&gt; 5.0 m (Extreme)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-sky-600" />
                  <span>3.0 – 5.0 m</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-sky-400" />
                  <span>1.5 – 3.0 m</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-cyan-300" />
                  <span>&lt; 1.5 m (Shallow)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-rose-600" />
                  <span>&gt; 4.0 m/s (Supercritical)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-amber-500" />
                  <span>2.5 – 4.0 m/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded bg-sky-500" />
                  <span>&lt; 2.5 m/s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Click Probe Inspector HUD */}
        <div className="space-y-4 font-mono">
          <div className="bg-[#0a1120] border border-slate-800/80 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-teal-400" />
                <span>Geospatial Probe</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                LIVE INTERSECT
              </span>
            </div>

            {selectedProbePoint ? (
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Location</span>
                  <div className="text-xs font-bold text-slate-100 leading-tight">
                    {selectedProbePoint.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedProbePoint.lat.toFixed(4)}°N, {selectedProbePoint.lng.toFixed(4)}°E ({selectedProbePoint.kmFromDam} km)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Elevation</span>
                    <span className="font-bold text-slate-200">{selectedProbePoint.elevationM.toFixed(1)} m MSL</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-teal-400 uppercase block">Flood Depth</span>
                    <span className="font-bold text-teal-300">{selectedProbePoint.depthM.toFixed(2)} m</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-emerald-400 uppercase block">Wave Velocity</span>
                    <span className="font-bold text-emerald-300">{selectedProbePoint.velocityMs.toFixed(2)} m/s</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-purple-400 uppercase block">Arrival Time</span>
                    <span className="font-bold text-purple-300">T+{selectedProbePoint.arrivalTimeHours.toFixed(2)} h</span>
                  </div>
                </div>

                {/* Defra Hazard Classification */}
                <div className="p-3 rounded-xl border space-y-1 bg-slate-900/80 border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Hazard Rating (HR):</span>
                    <span className="font-bold text-slate-100">{selectedProbePoint.hr}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Hazard Class:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      selectedProbePoint.hazardClass === 'EXTREME'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : selectedProbePoint.hazardClass === 'SIGNIFICANT'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {selectedProbePoint.hazardClass}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Click any settlement, facility, or flood reach polygon on the map to probe live hydraulic metrics.
              </div>
            )}
          </div>

          {/* Quick Reach Jumper */}
          <div className="bg-[#0a1120] border border-slate-800/80 rounded-2xl p-4 shadow-2xl space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800/80 pb-2">
              Downstream River Reaches
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {simulationOutput.reachResults.map((reach) => (
                <button
                  key={reach.reachId}
                  onClick={() => {
                    setSelectedProbePoint({
                      name: reach.reachName,
                      lat: reach.latitude,
                      lng: reach.longitude,
                      kmFromDam: reach.distanceFromDamKm,
                      elevationM: reach.peakStageM - reach.maxFloodDepthM,
                      depthM: reach.maxFloodDepthM,
                      velocityMs: reach.maxVelocityMs,
                      hr: reach.hazardRatingHR,
                      hazardClass: reach.hazardCategory,
                      arrivalTimeHours: reach.arrivalTimeHours,
                    });
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo([reach.latitude, reach.longitude]);
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/40 text-xs transition flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-200 block truncate">{reach.reachName}</span>
                    <span className="text-[10px] text-slate-500">{reach.distanceFromDamKm} km • T+{reach.arrivalTimeHours}h</span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-300 shrink-0">
                    {reach.maxFloodDepthM}m
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


