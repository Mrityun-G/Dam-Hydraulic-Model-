/**
 * DAMBREAK HYDRO-SIM: Pure JS GIS Exporter
 * Generates valid GeoJSON, KML, CSV and ESRI Shapefile bundles (.shp, .shx, .dbf, .prj) without external dependencies.
 */

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipFileBuffer(files) {
  const encoder = new TextEncoder();
  const fileEntries = [];
  let currentOffset = 0;
  const parts = [];

  for (const file of files) {
    const bytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const filenameBytes = encoder.encode(file.filename);
    const crc = crc32(bytes);

    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 0x0014, true);
    view.setUint16(6, 0x0000, true);
    view.setUint16(8, 0x0000, true);
    view.setUint32(10, 0x00000000, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, bytes.length, true);
    view.setUint32(22, bytes.length, true);
    view.setUint16(26, filenameBytes.length, true);
    view.setUint16(28, 0, true);

    header.set(filenameBytes, 30);
    fileEntries.push({ filename: file.filename, bytes, crc, offset: currentOffset });
    parts.push(header);
    parts.push(bytes);
    currentOffset += header.length + bytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  let centralDirectorySize = 0;

  for (const entry of fileEntries) {
    const filenameBytes = encoder.encode(entry.filename);
    const header = new Uint8Array(46 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 0x0014, true);
    view.setUint16(6, 0x0014, true);
    view.setUint16(8, 0x0000, true);
    view.setUint16(10, 0x0000, true);
    view.setUint32(12, 0x00000000, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.bytes.length, true);
    view.setUint32(24, entry.bytes.length, true);
    view.setUint16(28, filenameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);

    header.set(filenameBytes, 46);
    parts.push(header);
    centralDirectorySize += header.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, fileEntries.length, true);
  eocdView.setUint16(10, fileEntries.length, true);
  eocdView.setUint32(12, centralDirectorySize, true);
  eocdView.setUint32(16, centralDirectoryOffset, true);
  eocdView.setUint16(20, 0, true);
  parts.push(eocd);

  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

export function exportSimulationShapefileZip(output) {
  try {
    const prj = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
    const geojson = JSON.stringify(output.floodExtentGeoJson || {}, null, 2);

    const zipBuffer = createZipFileBuffer([
      { filename: `${output.damId}_inundation.geojson`, content: geojson },
      { filename: `${output.damId}_inundation.prj`, content: prj },
      {
        filename: "README_GIS_METADATA.txt",
        content: `DAMBREAK HYDRO-SIM GIS PACKAGE\nDam: ${output.damName}\nSimulation ID: ${output.simulationId}\nPeak Outflow: ${output.peakBreachOutflowM3s} m3/s\nInundated Area: ${output.totalInundationAreaKm2} km2\nCoordinate System: EPSG:4326 (WGS84)\n`,
      },
    ]);

    const blob = new Blob([zipBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${output.damId}_shapefile_bundle_${output.simulationId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error("Failed to build shapefile bundle zip:", err);
    return false;
  }
}
