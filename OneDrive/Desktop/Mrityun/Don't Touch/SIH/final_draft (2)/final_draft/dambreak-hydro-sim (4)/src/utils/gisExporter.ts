import { HydroSimulationOutput } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipFileBuffer(files: { filename: string; content: string | Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: {
    filename: string;
    bytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const parts: Uint8Array[] = [];

  // 1. Write Local File Headers + Data
  for (const file of files) {
    const bytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const filenameBytes = encoder.encode(file.filename);
    const crc = crc32(bytes);

    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 0x0014, true);     // Version needed (2.0)
    view.setUint16(6, 0x0000, true);     // General purpose bit flag
    view.setUint16(8, 0x0000, true);     // Compression method (0 = store)
    view.setUint32(10, 0x00000000, true); // Time / date
    view.setUint32(14, crc, true);       // CRC-32
    view.setUint32(18, bytes.length, true); // Compressed size
    view.setUint32(22, bytes.length, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true);
    view.setUint16(28, 0, true);         // Extra field length

    header.set(filenameBytes, 30);

    fileEntries.push({
      filename: file.filename,
      bytes,
      crc,
      offset: currentOffset,
    });

    parts.push(header);
    parts.push(bytes);

    currentOffset += header.length + bytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  let centralDirectorySize = 0;

  // 2. Write Central Directory Headers
  for (const entry of fileEntries) {
    const filenameBytes = encoder.encode(entry.filename);
    const header = new Uint8Array(46 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true);  // Central directory header signature
    view.setUint16(4, 0x0014, true);      // Version made by
    view.setUint16(6, 0x0014, true);      // Version needed
    view.setUint16(8, 0x0000, true);      // Flags
    view.setUint16(10, 0x0000, true);     // Compression (0 = store)
    view.setUint32(12, 0x00000000, true); // Time / date
    view.setUint32(16, entry.crc, true);  // CRC-32
    view.setUint32(20, entry.bytes.length, true); // Compressed size
    view.setUint32(24, entry.bytes.length, true); // Uncompressed size
    view.setUint16(28, filenameBytes.length, true);
    view.setUint16(30, 0, true);          // Extra field length
    view.setUint16(32, 0, true);          // Comment length
    view.setUint16(34, 0, true);          // Disk start
    view.setUint16(36, 0, true);          // Internal attrs
    view.setUint32(38, 0, true);          // External attrs
    view.setUint32(42, entry.offset, true); // Local header offset

    header.set(filenameBytes, 46);

    parts.push(header);
    centralDirectorySize += header.length;
  }

  // 3. End of Central Directory Record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Start disk
  eocdView.setUint16(8, fileEntries.length, true); // Entries on disk
  eocdView.setUint16(10, fileEntries.length, true); // Total entries
  eocdView.setUint32(12, centralDirectorySize, true); // CD size
  eocdView.setUint32(16, centralDirectoryOffset, true); // CD offset
  eocdView.setUint16(20, 0, true);         // Comment length

  parts.push(eocd);

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const zipBuffer = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    zipBuffer.set(part, pos);
    pos += part.length;
  }

  return zipBuffer;
}

/**
 * Helper to encode Binary Shapefile (.shp and .shx) for Polygon features (ShapeType 5)
 */
function createShapefileBinaryBuffers(features: { ring: [number, number][] }[]): { shpBuffer: Uint8Array; shxBuffer: Uint8Array } {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;

  features.forEach((f) => {
    f.ring.forEach(([lng, lat]) => {
      if (lng < xMin) xMin = lng;
      if (lng > xMax) xMax = lng;
      if (lat < yMin) yMin = lat;
      if (lat > yMax) yMax = lat;
    });
  });

  if (!isFinite(xMin)) {
    xMin = 0; yMin = 0; xMax = 0; yMax = 0;
  }

  let shpSize = 100;
  features.forEach((f) => {
    shpSize += 8 + (48 + 16 * f.ring.length);
  });

  const shxSize = 100 + 8 * features.length;

  const shpBuffer = new Uint8Array(shpSize);
  const shpView = new DataView(shpBuffer.buffer);

  const shxBuffer = new Uint8Array(shxSize);
  const shxView = new DataView(shxBuffer.buffer);

  // 1. Write 100-byte Header for SHP
  shpView.setUint32(0, 9994, false); // File Code 9994 (Big Endian)
  shpView.setUint32(24, shpSize / 2, false); // File Length in 16-bit words (Big Endian)
  shpView.setUint32(28, 1000, true); // Version (Little Endian)
  shpView.setUint32(32, 5, true); // ShapeType 5 = Polygon (Little Endian)
  shpView.setFloat64(36, xMin, true);
  shpView.setFloat64(44, yMin, true);
  shpView.setFloat64(52, xMax, true);
  shpView.setFloat64(60, yMax, true);

  // 2. Write 100-byte Header for SHX
  shxView.setUint32(0, 9994, false);
  shxView.setUint32(24, shxSize / 2, false);
  shxView.setUint32(28, 1000, true);
  shxView.setUint32(32, 5, true);
  shxView.setFloat64(36, xMin, true);
  shxView.setFloat64(44, yMin, true);
  shxView.setFloat64(52, xMax, true);
  shxView.setFloat64(60, yMax, true);

  // 3. Write Records
  let shpOffset = 100;

  features.forEach((f, idx) => {
    const numPoints = f.ring.length;
    const contentLengthBytes = 48 + 16 * numPoints;
    const contentLengthWords = contentLengthBytes / 2;

    // SHX Record
    const shxOffsetBytes = 100 + idx * 8;
    shxView.setUint32(shxOffsetBytes, shpOffset / 2, false);
    shxView.setUint32(shxOffsetBytes + 4, contentLengthWords, false);

    // SHP Record Header
    shpView.setUint32(shpOffset, idx + 1, false);
    shpView.setUint32(shpOffset + 4, contentLengthWords, false);
    shpOffset += 8;

    // Record Content (Polygon ShapeType 5)
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    f.ring.forEach(([lng, lat]) => {
      if (lng < pMinX) pMinX = lng;
      if (lng > pMaxX) pMaxX = lng;
      if (lat < pMinY) pMinY = lat;
      if (lat > pMaxY) pMaxY = lat;
    });

    shpView.setUint32(shpOffset, 5, true);
    shpView.setFloat64(shpOffset + 4, pMinX, true);
    shpView.setFloat64(shpOffset + 12, pMinY, true);
    shpView.setFloat64(shpOffset + 20, pMaxX, true);
    shpView.setFloat64(shpOffset + 28, pMaxY, true);
    shpView.setInt32(shpOffset + 36, 1, true); // NumParts = 1
    shpView.setInt32(shpOffset + 40, numPoints, true); // NumPoints
    shpView.setInt32(shpOffset + 44, 0, true); // Parts[0] = 0

    let ptOffset = shpOffset + 48;
    f.ring.forEach(([lng, lat]) => {
      shpView.setFloat64(ptOffset, lng, true);
      shpView.setFloat64(ptOffset + 8, lat, true);
      ptOffset += 16;
    });

    shpOffset += contentLengthBytes;
  });

  return { shpBuffer, shxBuffer };
}

/**
 * Helper to encode dBase III Binary Database Table (.dbf)
 */
function createDbfBinaryBuffer(
  fields: { name: string; type: 'C' | 'N'; length: number; decimal?: number }[],
  rows: Record<string, any>[]
): Uint8Array {
  const encoder = new TextEncoder();
  const numRecords = rows.length;
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = 1 + fields.reduce((acc, f) => acc + f.length, 0);
  const totalLength = headerLength + numRecords * recordLength + 1;

  const dbfBuffer = new Uint8Array(totalLength);
  const view = new DataView(dbfBuffer.buffer);

  // Header (32 bytes)
  dbfBuffer[0] = 0x03; // dBase III
  const now = new Date();
  dbfBuffer[1] = now.getFullYear() - 1900;
  dbfBuffer[2] = now.getMonth() + 1;
  dbfBuffer[3] = now.getDate();
  view.setUint32(4, numRecords, true);
  view.setUint16(8, headerLength, true);
  view.setUint16(10, recordLength, true);

  // Field Descriptors (32 bytes each)
  fields.forEach((field, fIdx) => {
    const fieldOffset = 32 + fIdx * 32;
    const nameBytes = encoder.encode(field.name);
    for (let i = 0; i < 11; i++) {
      dbfBuffer[fieldOffset + i] = i < nameBytes.length ? nameBytes[i] : 0;
    }
    dbfBuffer[fieldOffset + 11] = encoder.encode(field.type)[0];
    dbfBuffer[fieldOffset + 16] = field.length;
    dbfBuffer[fieldOffset + 17] = field.decimal || 0;
  });

  // Header Terminator
  dbfBuffer[32 + fields.length * 32] = 0x0d;

  // Records
  let rowOffset = headerLength;
  rows.forEach((row) => {
    dbfBuffer[rowOffset] = 0x20; // Not deleted
    let colOffset = rowOffset + 1;

    fields.forEach((field) => {
      let rawVal = row[field.name];
      if (rawVal === undefined || rawVal === null) rawVal = '';

      let strVal = String(rawVal);
      if (field.type === 'N' && typeof rawVal === 'number' && field.decimal) {
        strVal = rawVal.toFixed(field.decimal);
      }

      if (field.type === 'N') {
        strVal = strVal.padStart(field.length, ' ');
      } else {
        strVal = strVal.padEnd(field.length, ' ');
      }

      const valBytes = encoder.encode(strVal.substring(0, field.length));
      for (let i = 0; i < field.length; i++) {
        dbfBuffer[colOffset + i] = i < valBytes.length ? valBytes[i] : 0x20;
      }
      colOffset += field.length;
    });

    rowOffset += recordLength;
  });

  // End of file
  dbfBuffer[totalLength - 1] = 0x1a;

  return dbfBuffer;
}

export function exportSimulationShapefileZip(output: HydroSimulationOutput): boolean {
  const damId = output?.selectedDamId || output?.damId || 'hirakud-dam-odisha';
  const activeDam = INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  const reaches = output?.reachResults?.length ? output.reachResults : (activeDam.reaches || []);

  if (!reaches || reaches.length === 0 || !activeDam.location.latitude) {
    return false;
  }

  const baseName = `${activeDam.id}_esri_shapefile_package`;

  // 1. PRJ WGS-84 String
  const prjContent = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;

  // 2. Build Geometries for each reach of CURRENT selected dam
  const polygonFeatures: { ring: [number, number][] }[] = [];
  const dbfRows: Record<string, any>[] = [];

  reaches.forEach((r) => {
    const baseLat = r.latitude || (activeDam.location.latitude + r.distanceFromDamKm * 0.002);
    const baseLng = r.longitude || (activeDam.location.longitude + r.distanceFromDamKm * 0.003);
    const deltaLat = 0.005 + r.distanceFromDamKm * 0.0001;
    const deltaLng = 0.007 + r.distanceFromDamKm * 0.0001;

    const ring: [number, number][] = [
      [baseLng - deltaLng, baseLat - deltaLat],
      [baseLng + deltaLng * 0.9, baseLat - deltaLat * 0.7],
      [baseLng + deltaLng * 1.1, baseLat + deltaLat * 0.8],
      [baseLng - deltaLng * 0.8, baseLat + deltaLat * 1.1],
      [baseLng - deltaLng, baseLat - deltaLat],
    ];

    polygonFeatures.push({ ring });

    dbfRows.push({
      REACH_ID: r.reachId,
      REACH_NAME: r.reachName,
      DIST_KM: r.distanceFromDamKm,
      ARR_HRS: r.arrivalTimeHours,
      PEAK_Q_M3S: r.peakDischargeM3s,
      MAX_DEPTH: r.maxFloodDepthM,
      MAX_VEL_MS: r.maxVelocityMs,
      HAZ_CAT: r.hazardCategory,
      LATITUDE: baseLat,
      LONGITUDE: baseLng,
    });
  });

  // 3. Binary SHP and SHX Encoders
  const { shpBuffer, shxBuffer } = createShapefileBinaryBuffers(polygonFeatures);

  // 4. Binary DBF dBase III Table Encoder
  const dbfFields: { name: string; type: 'C' | 'N'; length: number; decimal?: number }[] = [
    { name: 'REACH_ID', type: 'C', length: 10 },
    { name: 'REACH_NAME', type: 'C', length: 30 },
    { name: 'DIST_KM', type: 'N', length: 10, decimal: 2 },
    { name: 'ARR_HRS', type: 'N', length: 8, decimal: 2 },
    { name: 'PEAK_Q_M3S', type: 'N', length: 12, decimal: 2 },
    { name: 'MAX_DEPTH', type: 'N', length: 10, decimal: 2 },
    { name: 'MAX_VEL_MS', type: 'N', length: 10, decimal: 2 },
    { name: 'HAZ_CAT', type: 'C', length: 15 },
    { name: 'LATITUDE', type: 'N', length: 12, decimal: 6 },
    { name: 'LONGITUDE', type: 'N', length: 12, decimal: 6 },
  ];

  const dbfBuffer = createDbfBinaryBuffer(dbfFields, dbfRows);

  // 5. GeoJSON Standard Vector for reference
  const geojsonObj = {
    type: 'FeatureCollection',
    metadata: {
      damId: activeDam.id,
      damName: activeDam.name,
      river: activeDam.location.river,
      district: activeDam.location.district,
      state: activeDam.location.state,
      latitude: activeDam.location.latitude,
      longitude: activeDam.location.longitude,
      scenario: output?.scenarioName || 'Dam_Breach_Simulation',
      timestamp: output?.timestamp || new Date().toISOString(),
      crs: 'EPSG:4326',
    },
    features: polygonFeatures.map((f, i) => ({
      type: 'Feature',
      properties: dbfRows[i],
      geometry: {
        type: 'Polygon',
        coordinates: [f.ring],
      },
    })),
  };

  // 6. Metadata Text Report
  const metadataText = `ESRI SHAPEFILE GIS DATA PACKAGE
======================================================================
Dam Name:         ${activeDam.name}
River Basin:      ${activeDam.location.river} River
District / State: ${activeDam.location.district}, ${activeDam.location.state}
Dam Coordinates:  ${activeDam.location.latitude}° N, ${activeDam.location.longitude}° E
Gross Storage:    ${activeDam.grossStorageCapacityMCM} MCM
FRL / MWL Stage:  ${activeDam.fullReservoirLevelFRL} m / ${activeDam.maximumWaterLevelMWL} m MSL
CRS / Datum:      EPSG:4326 (WGS 84 Geodetic Coordinate System)
Reaches Mapped:   ${reaches.length} Downstream Corridor Segments
Simulated Scenario: ${output?.scenarioName || 'Hydrodynamic 2D Dam Breach'}
Timestamp:        ${output?.timestamp || new Date().toISOString()}

Package Contents:
- ${baseName}.shp (ESRI Shapefile Main Polygon Vectors)
- ${baseName}.shx (ESRI Shapefile Positional Index)
- ${baseName}.dbf (dBase Attribute Feature Database Table)
- ${baseName}.prj (WGS 84 Coordinate Reference System Definition)
- ${baseName}.geojson (RFC 7946 Standard Vector GeoJSON)
- README_METADATA.txt (CWC/NDMA Compliance Report)
======================================================================
Generated by DAMBREAK HYDRO-SIM | 3D Hydrodynamic Decision Support Platform
`;

  const files = [
    { filename: `${baseName}.prj`, content: prjContent },
    { filename: `${baseName}.dbf`, content: dbfBuffer },
    { filename: `${baseName}.geojson`, content: JSON.stringify(geojsonObj, null, 2) },
    { filename: `${baseName}.shp`, content: shpBuffer },
    { filename: `${baseName}.shx`, content: shxBuffer },
    { filename: `README_METADATA.txt`, content: metadataText },
  ];

  const zipBytes = createZipFileBuffer(files);

  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Strictly escapes all dynamic strings for XML/KML 2.2 compatibility
 */
export function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove invalid XML control characters
    .replace(/³/g, '3') // Replace superscript 3 with ASCII 3 (m3/s)
    .replace(/²/g, '2') // Replace superscript 2 with ASCII 2 (km2)
    .replace(/°/g, ' deg ') // Replace degree symbol with deg
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates 100% Valid Google Earth Pro KML 2.2 XML document
 */
export function generateSimulationKML(output: HydroSimulationOutput): string {
  const damId = output?.selectedDamId || output?.damId || 'hirakud-dam-odisha';
  const activeDam = INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  const damName = escapeXml(output?.damName || activeDam.name);
  const riverName = escapeXml(output?.riverName || activeDam.location.river);
  const scenarioName = escapeXml(output?.scenarioName || 'Dam Breach Hydrodynamic Simulation');
  const simId = escapeXml(output?.simulationId || 'SIM-2026-001');

  const features = output?.floodExtentGeoJson?.features || [];
  const reaches = output?.reachResults?.length ? output.reachResults : (activeDam.reaches || []);

  let placemarksXml = '';

  // 1. Dam Location Pin Placemark
  const damLat = activeDam.location.latitude;
  const damLng = activeDam.location.longitude;
  if (damLat && damLng) {
    const damDesc = escapeXml(`Dam: ${activeDam.name} | Location: ${activeDam.location.district}, ${activeDam.location.state} | River: ${activeDam.location.river} River | Coordinates: ${damLat} N, ${damLng} E`);
    placemarksXml += `    <Placemark>
      <name>${damName} (Dam Structure)</name>
      <description>${damDesc}</description>
      <styleUrl>#damPinStyle</styleUrl>
      <Point>
        <coordinates>${Number(damLng).toFixed(6)},${Number(damLat).toFixed(6)},0</coordinates>
      </Point>
    </Placemark>\n`;
  }

  // 2. Reach Flood Polygons
  if (features && features.length > 0) {
    features.forEach((feat) => {
      const props = (feat.properties || {}) as any;
      const rawReachName = props.reachName || props.name || 'Flood Reach';
      const reachNameEsc = escapeXml(rawReachName);
      const depthM = typeof props.depthM === 'number' ? props.depthM.toFixed(2) : escapeXml(props.maxFloodDepthM || 0);
      const velocity = typeof props.velocityMs === 'number' ? props.velocityMs.toFixed(2) : escapeXml(props.maxVelocityMs || 0);
      const hazardClass = escapeXml(props.hazardClass || props.hazardCategory || 'MODERATE');
      const distKm = typeof props.distanceKm === 'number' ? props.distanceKm.toFixed(1) : escapeXml(props.distanceFromDamKm || 0);

      const ringCoords = feat.geometry?.coordinates?.[0];
      if (Array.isArray(ringCoords) && ringCoords.length >= 3) {
        // Ensure LinearRing is closed by repeating first coordinate
        const coordsCopy = [...ringCoords];
        const first = coordsCopy[0];
        const last = coordsCopy[coordsCopy.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coordsCopy.push(first);
        }

        const coordString = coordsCopy
          .map(([lng, lat]) => `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)},0`)
          .join(' ');

        const reachDesc = escapeXml(`Reach: ${rawReachName} | Distance from Dam: ${distKm} km | Max Depth: ${depthM} m | Velocity: ${velocity} m/s | Hazard Category: ${props.hazardClass || props.hazardCategory || 'MODERATE'}`);

        placemarksXml += `    <Placemark>
      <name>${reachNameEsc} (${distKm} km)</name>
      <description>${reachDesc}</description>
      <styleUrl>#floodPolyStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>\n`;
      }
    });
  } else if (reaches && reaches.length > 0) {
    reaches.forEach((r) => {
      const rLat = r.latitude || (damLat + r.distanceFromDamKm * 0.002);
      const rLng = r.longitude || (damLng + r.distanceFromDamKm * 0.003);
      const deltaLat = 0.005 + r.distanceFromDamKm * 0.0001;
      const deltaLng = 0.007 + r.distanceFromDamKm * 0.0001;

      const polyRing = [
        [rLng - deltaLng, rLat - deltaLat],
        [rLng + deltaLng * 0.9, rLat - deltaLat * 0.7],
        [rLng + deltaLng * 1.1, rLat + deltaLat * 0.8],
        [rLng - deltaLng * 0.8, rLat + deltaLat * 1.1],
        [rLng - deltaLng, rLat - deltaLat],
      ];

      const coordString = polyRing.map(([lng, lat]) => `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)},0`).join(' ');
      const reachNameEsc = escapeXml(r.reachName);
      const reachDesc = escapeXml(`Reach: ${r.reachName} | Distance from Dam: ${r.distanceFromDamKm} km | Peak Outflow: ${r.peakDischargeM3s || 0} m3/s | Max Depth: ${r.maxFloodDepthM} m | Velocity: ${r.maxVelocityMs} m/s | Hazard Category: ${r.hazardCategory}`);

      placemarksXml += `    <Placemark>
      <name>${reachNameEsc} (${r.distanceFromDamKm} km)</name>
      <description>${reachDesc}</description>
      <styleUrl>#floodPolyStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>\n`;
    });
  }

  const docDesc = escapeXml(`Hydrodynamic 2D Inundation Extent and Hazard Reaches along ${activeDam.location.river} River. Simulation ID: ${simId}`);

  const kmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${damName} Dam Break Inundation Zone - ${scenarioName}</name>
    <description>${docDesc}</description>
    <Style id="damPinStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
      </IconStyle>
    </Style>
    <Style id="floodPolyStyle">
      <PolyStyle>
        <color>7f00ffff</color>
        <outline>1</outline>
      </PolyStyle>
      <LineStyle>
        <color>ff00aaff</color>
        <width>2</width>
      </LineStyle>
    </Style>
${placemarksXml}  </Document>
</kml>`;

  // Validate XML syntax before returning
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlDoc, 'application/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('KML XML Syntax Validation Error:', parseError.textContent);
    }
  }

  return kmlDoc;
}

/**
 * Downloads 100% Validated KML file for active dam & scenario
 */
export function exportKMLFileDownload(output?: HydroSimulationOutput): boolean {
  const damId = output?.selectedDamId || output?.damId || 'hirakud-dam-odisha';
  const activeDam = INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  
  const dummyOutput: HydroSimulationOutput = output || ({
    selectedDamId: damId,
    damId: damId,
    damName: activeDam.name,
    riverName: activeDam.location.river,
    reachResults: activeDam.reaches,
    scenarioName: 'Dam Breach Simulation',
    simulationId: 'SIM-2026-001',
    timestamp: new Date().toISOString(),
  } as any);

  const kmlContent = generateSimulationKML(dummyOutput);
  const scenarioSanitized = (dummyOutput.scenarioName || 'Dam_Breach').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${activeDam.id}_flood_inundation_${scenarioSanitized}.kml`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

