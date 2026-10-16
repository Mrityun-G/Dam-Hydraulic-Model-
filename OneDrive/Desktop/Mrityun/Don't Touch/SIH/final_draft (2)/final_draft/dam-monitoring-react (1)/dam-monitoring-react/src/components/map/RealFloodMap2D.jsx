import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/floodMap.css";

/**
 * Unpacks and normalizes GeoJSON into separate polygonFeatures and lineFeatures.
 * Handles FeatureCollection, Feature, direct Geometry (Polygon, MultiPolygon, LineString, MultiLineString, GeometryCollection),
 * and JSON string payloads.
 */
function parseGeoJsonFeatures(rawGeoJson) {
  if (!rawGeoJson) return { polygonFeatures: [], lineFeatures: [] };

  let data = rawGeoJson;
  if (typeof rawGeoJson === "string") {
    try {
      data = JSON.parse(rawGeoJson);
    } catch (e) {
      console.warn("Invalid GeoJSON string payload:", e);
      return { polygonFeatures: [], lineFeatures: [] };
    }
  }

  const polygonFeatures = [];
  const lineFeatures = [];

  function processGeometry(geom, properties = {}) {
    if (!geom || !geom.type) return;

    if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      polygonFeatures.push({
        type: "Feature",
        geometry: geom,
        properties: properties || {},
      });
    } else if (geom.type === "LineString" || geom.type === "MultiLineString") {
      lineFeatures.push({
        type: "Feature",
        geometry: geom,
        properties: properties || {},
      });
    } else if (geom.type === "GeometryCollection" && Array.isArray(geom.geometries)) {
      geom.geometries.forEach((subGeom) => processGeometry(subGeom, properties));
    }
  }

  function processFeature(feat) {
    if (!feat) return;
    if (feat.type === "Feature" && feat.geometry) {
      processGeometry(feat.geometry, feat.properties || {});
    } else if (feat.type === "FeatureCollection" && Array.isArray(feat.features)) {
      feat.features.forEach(processFeature);
    } else if (feat.type) {
      processGeometry(feat, feat.properties || {});
    }
  }

  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    data.features.forEach(processFeature);
  } else if (data.type === "Feature") {
    processFeature(data);
  } else if (data.type) {
    processGeometry(data, data.properties || {});
  }

  return { polygonFeatures, lineFeatures };
}

/**
 * RealFloodMap2D: Real Geospatial Street-Level 2D Flood Map
 * Powered by Leaflet + OpenStreetMap street/road basemap tiles.
 * Overlays actual backend simulation floodExtentGeoJson filled polygons with semi-transparency.
 */
export function RealFloodMap2D({
  activeDam,
  simulationOutput,
  isLoading = false,
  errorMessage = null,
  onRetry = null,
  onRequestSimulation = null,
  showReachesTimeline = false,
  title = "STREET-LEVEL 2-D INUNDATION MAP",
  subtitle = "OpenStreetMap Real-World Roads & Backend Flood Extent Overlay",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const floodExtentLayerRef = useRef(null);
  const floodPathLayerRef = useRef(null);

  // Layer Toggles
  const [showFloodExtent, setShowFloodExtent] = useState(true);
  const [showFloodPath, setShowFloodPath] = useState(true);
  const [showDamMarker, setShowDamMarker] = useState(true);
  const [showWaterways, setShowWaterways] = useState(true);
  const [showReaches, setShowReaches] = useState(true);
  const [colorMode, setColorMode] = useState("depth"); // "depth" | "hazard"

  // Check if simulation matches currently active dam
  const isSimMatchingDam = Boolean(
    simulationOutput &&
    activeDam &&
    simulationOutput.damId === activeDam.id
  );

  const activeSimulation = isSimMatchingDam ? simulationOutput : null;

  // Extract separate polygon and line features from simulation GeoJSON
  const { polygonFeatures, lineFeatures } = useMemo(
    () => parseGeoJsonFeatures(activeSimulation?.floodExtentGeoJson),
    [activeSimulation?.floodExtentGeoJson]
  );

  const hasPolygonExtent = polygonFeatures.length > 0;
  const hasLineFeatures = lineFeatures.length > 0;
  const hasValidGeoJson = hasPolygonExtent || hasLineFeatures;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultLat = activeDam?.location?.latitude || 21.57;
      const defaultLng = activeDam?.location?.longitude || 83.87;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 11,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: "topleft" }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    // Invalidate map size after mount for accurate container dimensions
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Recenter map when activeDam changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeDam?.location) return;

    // If no simulation or new dam, smoothly fly to the dam location
    if (!hasPolygonExtent) {
      map.flyTo([activeDam.location.latitude, activeDam.location.longitude], 11, {
        duration: 1.2,
      });
    }
  }, [activeDam?.id]);

  // Render Map Layers: Basemap Tiles + Dam Marker + Reservoir + River + Flood GeoJSON + Flood Path + Reaches
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Step 3 Diagnostic Logs as strictly requested
    console.log("[FLOOD EXTENT]", activeSimulation?.floodExtentGeoJson);
    console.log("[FLOOD EXTENT TYPES]", activeSimulation?.floodExtentGeoJson?.features?.map(f => f?.geometry?.type));
    console.log("[FLOOD PATH]", activeDam?.reaches);

    // Stale data protection: clear all previous layers immediately
    layerGroup.clearLayers();
    floodExtentLayerRef.current = null;
    floodPathLayerRef.current = null;

    // Ensure dedicated custom panes for layer order: basemap (default) -> floodExtentPane (420) -> floodPathPane (460)
    if (!map.getPane("floodExtentPane")) {
      const pExtent = map.createPane("floodExtentPane");
      pExtent.style.zIndex = 420;
    }
    if (!map.getPane("floodPathPane")) {
      const pPath = map.createPane("floodPathPane");
      pPath.style.zIndex = 460;
    }

    // 1. OpenStreetMap Real Street Basemap Layer (Streets, Roads, Towns)
    const streetTileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });
    layerGroup.addLayer(streetTileLayer);

    if (!activeDam) return;

    // 2. Reservoir Water Body (if available on dam data)
    if (showWaterways && activeDam.reservoirPolygon && activeDam.reservoirPolygon.length > 0) {
      const resPolygon = L.polygon(activeDam.reservoirPolygon, {
        color: "#0284c7",
        weight: 1.5,
        fillColor: "#38bdf8",
        fillOpacity: 0.45,
      }).bindTooltip(
        `${activeDam.name} Reservoir (${activeDam.grossStorageCapacityMCM || ""} MCM)`,
        { sticky: true }
      );
      layerGroup.addLayer(resPolygon);
    }

    // 3. Natural River Centerline / Thalweg Corridor
    if (showWaterways && activeDam.riverCenterline && activeDam.riverCenterline.length > 0) {
      const riverPts = activeDam.riverCenterline.map((c) => [c.lat, c.lng]);
      const riverPolyline = L.polyline(riverPts, {
        color: "#0369a1",
        weight: 2,
        opacity: 0.7,
        dashArray: "6, 4",
      }).bindTooltip(
        `${activeDam.location?.river || "River"} River Channel`,
        { sticky: true }
      );
      layerGroup.addLayer(riverPolyline);
    }

    // 4. Actual Backend Flood Extent GeoJSON Overlay (Wide Inundation Polygon Areas)
    let floodExtentLayerInstance = null;
    if (showFloodExtent && hasPolygonExtent) {
      console.log("[FLOOD EXTENT LAYER] rendering...");
      floodExtentLayerInstance = L.geoJSON(
        {
          type: "FeatureCollection",
          features: polygonFeatures,
        },
        {
          pane: "floodExtentPane",
          style: (feature) => {
            const p = feature?.properties || {};
            const depth = typeof p.depthM === "number" ? p.depthM : (typeof p.maxFloodDepthM === "number" ? p.maxFloodDepthM : null);
            const hazard = String(p.hazardClass || p.hazardCategory || "").toUpperCase();

            // Distinct, vibrant filled colors that stand out clearly against OSM roads
            let fillColor = "#0284c7";
            let fillOpacity = 0.58;
            let strokeColor = "#00e6c8";
            let strokeWidth = 2;

            if (colorMode === "depth") {
              if (depth !== null) {
                if (depth >= 5.0) {
                  fillColor = "#2563eb"; // Vibrant cobalt/blue (>5m)
                  fillOpacity = 0.65;
                  strokeColor = "#1d4ed8";
                } else if (depth >= 2.5) {
                  fillColor = "#0284c7"; // Cerulean
                  fillOpacity = 0.58;
                  strokeColor = "#0284c7";
                } else if (depth >= 1.0) {
                  fillColor = "#06b6d4"; // Cyan
                  fillOpacity = 0.52;
                  strokeColor = "#0891b2";
                } else {
                  fillColor = "#38bdf8"; // Light sky
                  fillOpacity = 0.45;
                  strokeColor = "#0ea5e9";
                }
              } else {
                fillColor = "#0284c7";
                fillOpacity = 0.55;
                strokeColor = "#00e6c8";
              }
            } else {
              // Hazard classification mode
              if (hazard.includes("EXTREME")) {
                fillColor = "#dc2626"; // Crimson
                fillOpacity = 0.65;
                strokeColor = "#f87171";
              } else if (hazard.includes("SIGNIFICANT") || hazard.includes("HIGH")) {
                fillColor = "#ea580c"; // Orange
                fillOpacity = 0.58;
                strokeColor = "#fb923c";
              } else if (hazard.includes("MODERATE")) {
                fillColor = "#d97706"; // Amber
                fillOpacity = 0.52;
                strokeColor = "#fcd34d";
              } else {
                fillColor = "#0284c7";
                fillOpacity = 0.45;
                strokeColor = "#38bdf8";
              }
            }

            return {
              fill: true,
              fillColor,
              fillOpacity, // Semi-transparent (0.45 - 0.65) so OSM roads & street labels remain visible underneath
              color: strokeColor, // Crisp wet/dry border delineating flood boundary
              weight: strokeWidth,
              opacity: 0.95,
              lineJoin: "round",
              lineCap: "round",
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature?.properties || {};
            const depthVal = typeof p.depthM === "number" ? `${p.depthM.toFixed(1)} m` : (typeof p.maxFloodDepthM === "number" ? `${p.maxFloodDepthM.toFixed(1)} m` : "N/A");
            const velVal = typeof p.velocityMs === "number" ? `${p.velocityMs.toFixed(1)} m/s` : (typeof p.maxVelocityMs === "number" ? `${p.maxVelocityMs.toFixed(1)} m/s` : "N/A");
            const distVal = typeof p.distanceKm === "number" ? `${p.distanceKm.toFixed(1)} km` : (typeof p.distanceFromDamKm === "number" ? `${p.distanceFromDamKm.toFixed(1)} km` : "N/A");
            const arrivalVal = typeof p.arrivalTimeHours === "number" ? `T + ${p.arrivalTimeHours.toFixed(2)} hrs` : "N/A";
            const hazardVal = p.hazardClass || p.hazardCategory || (p.hazardRatingHR ? `HR ${p.hazardRatingHR}` : "N/A");
            const reachName = p.reachName || p.reachId || "Downstream Inundation Zone";
            const depthZone = p.depthZone || (typeof p.depthM === "number" ? (p.depthM >= 5.0 ? "> 5.0m (Extreme)" : (p.depthM >= 2.0 ? "2.0 - 5.0m (High)" : "0.5 - 2.0m (Moderate)")) : "N/A");
            const peakQ = typeof p.peakDischargeM3s === "number" ? `${p.peakDischargeM3s.toLocaleString()} m³/s` : "N/A";

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({
                  weight: 3.5,
                  color: "#f59e0b",
                  fillOpacity: Math.min(0.85, (l.options.fillOpacity || 0.55) + 0.15),
                });
                l.bringToFront();
              },
              mouseout: (e) => {
                floodExtentLayerInstance?.resetStyle(e.target);
              },
            });

            layer.bindTooltip(
              `
              <div style="font-family: monospace; font-size: 11px; line-height: 1.4;">
                <div style="font-weight: 800; color: #00e6c8; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 2px; margin-bottom: 4px;">
                  🌊 INUNDATED AREA: ${reachName}
                </div>
                <div>Max Flood Depth: <strong style="color: #38bdf8;">${depthVal}</strong></div>
                <div>Peak Flow Velocity: <strong style="color: #fbbf24;">${velVal}</strong></div>
                <div>Distance from Toe: <strong>${distVal}</strong></div>
                <div>Wave Arrival: <strong>${arrivalVal}</strong></div>
                <div>Hazard Rating: <strong style="color: #f87171;">${hazardVal}</strong></div>
              </div>
              `,
              { sticky: true, className: "cyber-flood-tooltip" }
            );

            layer.bindPopup(`
              <div class="dam-popup-card">
                <div class="dam-popup-title" style="color: #00e6c8;">🌊 INUNDATED AREA: ${reachName}</div>
                <div class="dam-popup-row"><span class="dam-popup-label">Max Inundation Depth:</span><span class="dam-popup-val text-cyan" style="font-weight:800;">${depthVal}</span></div>
                <div class="dam-popup-row"><span class="dam-popup-label">Peak Flow Velocity:</span><span class="dam-popup-val text-amber" style="font-weight:800;">${velVal}</span></div>
                <div class="dam-popup-row"><span class="dam-popup-label">Distance from Dam:</span><span class="dam-popup-val">${distVal}</span></div>
                <div class="dam-popup-row"><span class="dam-popup-label">Wave Arrival Time:</span><span class="dam-popup-val">${arrivalVal}</span></div>
                <div class="dam-popup-row"><span class="dam-popup-label">Hazard Classification:</span><span class="dam-popup-val text-rose" style="font-weight:800;">${hazardVal}</span></div>
                <div class="dam-popup-row"><span class="dam-popup-label">Depth Zone:</span><span class="dam-popup-val">${depthZone}</span></div>
                <div class="dam-popup-row"><span class="dam-popup-label">Peak Discharge:</span><span class="dam-popup-val">${peakQ}</span></div>
              </div>
            `);
          },
        }
      );

      layerGroup.addLayer(floodExtentLayerInstance);
      floodExtentLayerRef.current = floodExtentLayerInstance;
    }

    // 5. Downstream Flood Routing Path / Thalweg Centerline (Distinct from Flood Extent polygon)
    let floodPathLayerInstance = null;
    if (showFloodPath) {
      console.log("[FLOOD PATH LAYER] rendering...");
      const pathSegments = [];
      if (activeDam.reaches) {
        activeDam.reaches.forEach((reach) => {
          if (reach.coordinates && reach.coordinates.length > 0) {
            // Leaflet polyline expects [lat, lng], whereas GeoJSON coords are [lng, lat]
            reach.coordinates.forEach((pt) => {
              pathSegments.push([pt[1], pt[0]]);
            });
          } else if (reach.latitude && reach.longitude) {
            pathSegments.push([reach.latitude, reach.longitude]);
          }
        });
      }

      if (pathSegments.length >= 2) {
        // Core dedicated flood path centerline (thin, crisp dashed amber route in floodPathPane)
        const floodPathLine = L.polyline(pathSegments, {
          pane: "floodPathPane",
          color: "#f59e0b",
          weight: 2.5,
          opacity: 0.95,
          dashArray: "6, 5",
          lineCap: "round",
          lineJoin: "round",
        }).bindTooltip(
          `<strong>⚡ FLOOD ROUTING PATH</strong><br/>Downstream thalweg routing corridor for ${activeDam.name}`,
          { sticky: true, className: "cyber-flood-tooltip" }
        ).bindPopup(`
          <div class="dam-popup-card">
            <div class="dam-popup-title" style="color: #f59e0b;">⚡ FLOOD WAVE ROUTING CORRIDOR</div>
            <div class="dam-popup-row"><span class="dam-popup-label">River:</span><span class="dam-popup-val">${activeDam.location?.river || "River"}</span></div>
            <div class="dam-popup-row"><span class="dam-popup-label">Total Survey Length:</span><span class="dam-popup-val">${activeDam.reaches[activeDam.reaches.length - 1]?.distanceFromDamKm || "N/A"} km</span></div>
            <div class="dam-popup-row"><span class="dam-popup-label">Total Reaches:</span><span class="dam-popup-val">${activeDam.reaches.length} cross-sections</span></div>
            ${activeSimulation?.waveFrontFrontierKm ? `<div class="dam-popup-row"><span class="dam-popup-label">Wave Front Advance:</span><span class="dam-popup-val text-amber">${activeSimulation.waveFrontFrontierKm} km</span></div>` : ""}
          </div>
        `);
        layerGroup.addLayer(floodPathLine);
        floodPathLine.bringToFront();
        floodPathLayerInstance = floodPathLine;
      }

      // If simulation GeoJSON also had LineString features, render them
      if (lineFeatures.length > 0) {
        const geoJsonLineLayer = L.geoJSON(
          { type: "FeatureCollection", features: lineFeatures },
          {
            style: {
              color: "#fbbf24",
              weight: 3,
              opacity: 0.9,
              dashArray: "6, 4",
            },
          }
        );
        layerGroup.addLayer(geoJsonLineLayer);
        geoJsonLineLayer.bringToFront();
      }

      floodPathLayerRef.current = floodPathLayerInstance;
    }

    // 6. Reach Milestone Markers (along the river channel)
    if (showReaches && activeDam.reaches) {
      activeDam.reaches.forEach((reach, idx) => {
        let lat = null;
        let lng = null;

        if (reach.coordinates && reach.coordinates.length > 0) {
          const midPt = reach.coordinates[Math.floor(reach.coordinates.length / 2)];
          lng = midPt[0];
          lat = midPt[1];
        } else if (reach.latitude && reach.longitude) {
          lat = reach.latitude;
          lng = reach.longitude;
        } else if (activeDam.location) {
          const latOffset = -0.05 * (reach.distanceFromDamKm / 10);
          const lngOffset = 0.04 * (reach.distanceFromDamKm / 10);
          lat = activeDam.location.latitude + latOffset;
          lng = activeDam.location.longitude + lngOffset;
        }

        if (lat && lng) {
          const reachIcon = L.divIcon({
            className: "reach-map-pin",
            html: `<span>R${idx + 1}</span>`,
          });

          const reachMarker = L.marker([lat, lng], { icon: reachIcon, zIndexOffset: 800 }).bindPopup(`
            <div class="dam-popup-card">
              <div class="dam-popup-title" style="color: #00e6c8;">Reach ${idx + 1}: ${reach.name || reach.reachName}</div>
              <div class="dam-popup-row"><span class="dam-popup-label">Chainage:</span><span class="dam-popup-val">${reach.distanceFromDamKm} km</span></div>
              <div class="dam-popup-row"><span class="dam-popup-label">Channel Width:</span><span class="dam-popup-val">${reach.channelWidthM || "N/A"} m</span></div>
              <div class="dam-popup-row"><span class="dam-popup-label">Bed Elevation:</span><span class="dam-popup-val">${reach.bedElevationM || reach.bankElevationMSL || "N/A"} m MSL</span></div>
            </div>
          `);
          layerGroup.addLayer(reachMarker);
        }
      });
    }

    // 7. Selected Dam Marker
    if (showDamMarker && activeDam.location) {
      const damIcon = L.divIcon({
        className: "custom-dam-marker",
        html: `
          <div class="dam-map-pin" title="${activeDam.name}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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
        zIndexOffset: 1000,
      }).bindPopup(`
        <div class="dam-popup-card">
          <div class="dam-popup-title">${activeDam.name}</div>
          <div class="dam-popup-row"><span class="dam-popup-label">Dam ID:</span><span class="dam-popup-val" style="font-size:10px;">${activeDam.id}</span></div>
          <div class="dam-popup-row"><span class="dam-popup-label">River:</span><span class="dam-popup-val">${activeDam.location.river || "N/A"}</span></div>
          <div class="dam-popup-row"><span class="dam-popup-label">Basin:</span><span class="dam-popup-val">${activeDam.location.basin || "N/A"}</span></div>
          <div class="dam-popup-row"><span class="dam-popup-label">Location:</span><span class="dam-popup-val">${activeDam.location.district}, ${activeDam.location.state}</span></div>
          <div class="dam-popup-row"><span class="dam-popup-label">Structural Height:</span><span class="dam-popup-val">${activeDam.heightAboveLowestFoundation || "N/A"} m</span></div>
          <div class="dam-popup-row"><span class="dam-popup-label">Full Reservoir Level (FRL):</span><span class="dam-popup-val">${activeDam.fullReservoirLevelFRL || "N/A"} m MSL</span></div>
          <div class="dam-popup-row"><span class="dam-popup-label">Max Water Level (MWL):</span><span class="dam-popup-val">${activeDam.maximumWaterLevelMWL || "N/A"} m MSL</span></div>
          ${activeSimulation?.peakBreachOutflowM3s ? `<div class="dam-popup-row"><span class="dam-popup-label">Simulated Peak Q:</span><span class="dam-popup-val" style="color: #f87171; font-weight:800;">${activeSimulation.peakBreachOutflowM3s.toLocaleString()} m³/s</span></div>` : ""}
        </div>
      `);

      layerGroup.addLayer(damMarker);
    }

    // Auto-fit bounds if flood extent polygons are rendered
    if (floodExtentLayerInstance) {
      try {
        const bounds = floodExtentLayerInstance.getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      } catch (e) {
        console.warn("Could not fit bounds to flood extent:", e);
      }
    }
  }, [
    activeDam?.id,
    activeSimulation?.simulationId,
    polygonFeatures,
    lineFeatures,
    showFloodExtent,
    showFloodPath,
    showDamMarker,
    showWaterways,
    showReaches,
    colorMode,
  ]);

  // Helper to fit view manually
  const handleFitExtent = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Fit all flood extent polygons if rendered
    if (floodExtentLayerRef.current) {
      try {
        const b = floodExtentLayerRef.current.getBounds();
        if (b && b.isValid()) {
          map.fitBounds(b, { padding: [50, 50], maxZoom: 14 });
          return;
        }
      } catch (e) {
        console.warn("Could not get flood extent bounds:", e);
      }
    }

    // 2. Fallback to flood path bounds
    if (floodPathLayerRef.current) {
      try {
        const b = floodPathLayerRef.current.getBounds();
        if (b && b.isValid()) {
          map.fitBounds(b, { padding: [50, 50], maxZoom: 14 });
          return;
        }
      } catch (e) {
        console.warn("Could not get flood path bounds:", e);
      }
    }

    // 3. Fallback to reach coordinates bounds or dam location
    if (activeDam?.reaches && activeDam.reaches.length > 0) {
      const allPts = [];
      if (activeDam.location) allPts.push([activeDam.location.latitude, activeDam.location.longitude]);
      activeDam.reaches.forEach((r) => {
        if (r.coordinates) {
          r.coordinates.forEach((pt) => allPts.push([pt[1], pt[0]]));
        }
      });
      if (allPts.length > 1) {
        const b = L.latLngBounds(allPts);
        if (b.isValid()) {
          map.fitBounds(b, { padding: [50, 50], maxZoom: 14 });
          return;
        }
      }
    }

    if (activeDam?.location) {
      map.flyTo([activeDam.location.latitude, activeDam.location.longitude], 11);
    }
  };

  return (
    <div className="real-flood-map-wrapper">
      {/* Map Header & Toolbar */}
      <div className="real-flood-map-header">
        <div className="real-flood-map-title-wrap">
          <div className="real-flood-map-title">
            <span style={{ color: "#f59e0b" }}>●</span> {title}
          </div>
          <div className="real-flood-map-subtitle">
            {activeDam ? `${activeDam.name} · ${activeDam.location?.river} River · ${activeDam.location?.state}` : subtitle}
          </div>
        </div>

        <div className="real-flood-map-toolbar">
          <button
            type="button"
            className={`map-tool-btn ${showFloodExtent ? "active" : ""}`}
            onClick={() => setShowFloodExtent(!showFloodExtent)}
            title="Toggle Inundated Area Polygon Overlay"
          >
            {showFloodExtent ? "✓ Flood Extent (Area)" : "✕ Flood Extent (Area)"}
          </button>

          <button
            type="button"
            className={`map-tool-btn ${showFloodPath ? "active" : ""}`}
            onClick={() => setShowFloodPath(!showFloodPath)}
            title="Toggle Downstream Flood Wave Routing Path Corridor"
          >
            {showFloodPath ? "✓ Flood Path (Route)" : "✕ Flood Path (Route)"}
          </button>

          <button
            type="button"
            className="map-tool-btn"
            onClick={() => setColorMode(colorMode === "depth" ? "hazard" : "depth")}
            title="Switch color scale between Depth and Hazard Category"
          >
            Color: {colorMode === "depth" ? "Depth Scale" : "Hazard Class"}
          </button>

          <button
            type="button"
            className={`map-tool-btn ${showDamMarker ? "active" : ""}`}
            onClick={() => setShowDamMarker(!showDamMarker)}
            title="Toggle Dam Location Pin"
          >
            Dam Pin
          </button>

          <button
            type="button"
            className={`map-tool-btn ${showWaterways ? "active" : ""}`}
            onClick={() => setShowWaterways(!showWaterways)}
            title="Toggle River Channel & Reservoir"
          >
            Reservoir
          </button>

          <button
            type="button"
            className="map-tool-btn"
            onClick={handleFitExtent}
            title="Focus and center flood extent"
          >
            ⛶ Fit Extent
          </button>
        </div>
      </div>

      {/* Leaflet Map Viewport */}
      <div className="real-flood-map-container" ref={mapContainerRef}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="map-state-overlay">
            <div className="map-loading-spinner" />
            <div className="map-state-title">LOADING GEOSPATIAL FLOOD EXTENT...</div>
            <div className="map-state-desc">
              Executing hydrodynamic solver and rendering vector flood polygons over OpenStreetMap roads...
            </div>
          </div>
        )}

        {/* Error State Overlay */}
        {!isLoading && errorMessage && (
          <div className="map-state-overlay">
            <div className="map-state-icon" style={{ borderColor: "#ef4444", color: "#ef4444" }}>
              ⚠️
            </div>
            <div className="map-state-title" style={{ color: "#f87171" }}>
              UNABLE TO LOAD FLOOD SIMULATION DATA
            </div>
            <div className="map-state-desc">{errorMessage}</div>
            {onRetry && (
              <button type="button" className="map-state-btn" onClick={onRetry}>
                RETRY SIMULATION
              </button>
            )}
          </div>
        )}

        {/* Status Notice when polygon extent is unavailable */}
        {activeSimulation && !hasPolygonExtent && (
          <div className="map-status-banner">
            <span style={{ fontSize: "13px" }}>⚠️</span>
            <span>Flood extent polygon unavailable in current simulation output</span>
          </div>
        )}

        {/* No Simulation Available Overlay (When dam changed or no sim run yet) */}
        {!isLoading && !errorMessage && !activeSimulation && (
          <div className="map-state-overlay">
            <div className="map-state-icon">🌊</div>
            <div className="map-state-title">NO FLOOD SIMULATION AVAILABLE</div>
            <div className="map-state-desc">
              {`Run a simulation for ${activeDam?.name || "the selected dam"} from Model Input to visualize its real-world street flood extent.`}
            </div>
            {onRequestSimulation && (
              <button
                type="button"
                className="map-state-btn"
                onClick={onRequestSimulation}
              >
                RUN SIMULATION FOR {activeDam?.name?.toUpperCase() || "THIS DAM"}
              </button>
            )}
          </div>
        )}

        {/* Floating Cyber Legend */}
        <div className="map-hud-legend">
          <div className="map-hud-legend-title">
            <span>MAP OVERLAY LEGEND</span>
          </div>
          <div className="map-hud-legend-item">
            <span className="legend-swatch legend-swatch-dam" />
            <span>{activeDam?.name || "Selected Dam"}</span>
          </div>
          <div className="map-hud-legend-item">
            <span className="legend-swatch legend-swatch-floodpath" />
            <span>Flood Path (Route)</span>
          </div>
          {colorMode === "depth" ? (
            <>
              <div className="map-hud-legend-item">
                <span className="legend-swatch legend-swatch-deep" />
                <span>Deep Inundation (&gt; 2.5m)</span>
              </div>
              <div className="map-hud-legend-item">
                <span className="legend-swatch legend-swatch-moderate" />
                <span>Moderate Flood (1.0 - 2.5m)</span>
              </div>
              <div className="map-hud-legend-item">
                <span className="legend-swatch legend-swatch-shallow" />
                <span>Shallow Spread (&lt; 1.0m)</span>
              </div>
            </>
          ) : (
            <>
              <div className="map-hud-legend-item">
                <span className="legend-swatch" style={{ background: "#dc2626", borderColor: "#f87171" }} />
                <span>Extreme Hazard (HR &ge; 2.0)</span>
              </div>
              <div className="map-hud-legend-item">
                <span className="legend-swatch" style={{ background: "#ea580c", borderColor: "#fb923c" }} />
                <span>Significant Hazard (HR 1.25-2)</span>
              </div>
              <div className="map-hud-legend-item">
                <span className="legend-swatch" style={{ background: "#d97706", borderColor: "#fcd34d" }} />
                <span>Moderate Hazard (HR &lt; 1.25)</span>
              </div>
            </>
          )}
          <div className="map-hud-legend-item">
            <span className="legend-swatch legend-swatch-river" />
            <span>River Thalweg / Channel</span>
          </div>
          <div className="map-hud-legend-item">
            <span className="legend-swatch legend-swatch-road" />
            <span>Street / Road Network (OSM)</span>
          </div>
        </div>

        {/* Floating Impact Stats HUD */}
        {activeSimulation && (
          <div className="map-hud-stats">
            <div className="map-hud-stats-title">FLOOD IMPACT STATS</div>
            <div className="map-hud-stat-row">
              <span className="map-hud-stat-label">Peak Outflow:</span>
              <span className="map-hud-stat-value danger">
                {activeSimulation.peakBreachOutflowM3s
                  ? `${activeSimulation.peakBreachOutflowM3s.toLocaleString()} m³/s`
                  : "N/A"}
              </span>
            </div>
            <div className="map-hud-stat-row">
              <span className="map-hud-stat-label">Max Flood Depth:</span>
              <span className="map-hud-stat-value">
                {activeSimulation.maxFloodDepthM !== undefined
                  ? `${activeSimulation.maxFloodDepthM.toFixed(1)} m`
                  : "N/A"}
              </span>
            </div>
            <div className="map-hud-stat-row">
              <span className="map-hud-stat-label">Peak Velocity:</span>
              <span className="map-hud-stat-value warning">
                {activeSimulation.maxFlowVelocityMs !== undefined
                  ? `${activeSimulation.maxFlowVelocityMs.toFixed(1)} m/s`
                  : "N/A"}
              </span>
            </div>
            <div className="map-hud-stat-row">
              <span className="map-hud-stat-label">Inundated Area:</span>
              <span className="map-hud-stat-value">
                {activeSimulation.totalInundationAreaKm2 !== undefined
                  ? `${activeSimulation.totalInundationAreaKm2.toFixed(1)} km²`
                  : "N/A"}
              </span>
            </div>
            <div className="map-hud-stat-row">
              <span className="map-hud-stat-label">Time to Peak:</span>
              <span className="map-hud-stat-value">
                {activeSimulation.timeToPeakHours !== undefined
                  ? `${activeSimulation.timeToPeakHours.toFixed(2)} hrs`
                  : "N/A"}
              </span>
            </div>
            {activeSimulation.waveFrontFrontierKm && (
              <div className="map-hud-stat-row">
                <span className="map-hud-stat-label">Wave Frontier:</span>
                <span className="map-hud-stat-value">
                  {activeSimulation.waveFrontFrontierKm} km
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
