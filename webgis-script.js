// Global Variables
const searchIndex = [];

// Init map
const map = L.map("map", { zoomControl: false }).setView([-2.5, 118], 5);

// Pane Projects
map.createPane("projectsPane");
map.getPane("projectsPane").style.zIndex = 650;

// Layer Group Projects
// All Supabase project polygons are stored in one layer group.
// Status checkboxes, filters, and legends are generated automatically from Supabase status values.
const projectsLayerGroup = L.layerGroup([], { pane: "projectsPane" });
const projectsLayers = { all: projectsLayerGroup };

// Basemaps
const baseLayers = {
  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }),
  "MapLibre Streets": L.tileLayer("https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=Z5VIeqPMzR9Mm2lcTT57", { maxZoom: 19 }),
  "Google Satellite": L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", { maxZoom: 20 }),
  "Google Terrain": L.tileLayer("https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", { maxZoom: 20 }),
  "Google Street": L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { maxZoom: 20 }),
  "Topographic": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20 })
};

// Default basemap
baseLayers["OpenStreetMap"].addTo(map);

// Minimap
new L.Control.MiniMap(
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  { toggleDisplay: true, minimized: false, position: "bottomright" }
).addTo(map);

// Zoom
L.control.zoom({ position: "bottomright" }).addTo(map);

// Sidebar
const sidebar = document.getElementById("sidebar");
document.getElementById("toggleSidebar").onclick = () => sidebar.classList.toggle("collapsed");

// Basemap Selector (Dropdown dengan style)
const basemapControlDiv = document.getElementById("basemapControl");

// Buat elemen select
const select = document.createElement("select");
select.id = "basemapDropdown";

// Tambahkan opsi dari baseLayers
Object.keys(baseLayers).forEach(name => {
  const option = document.createElement("option");
  option.value = name;
  option.text = name;
  if (map.hasLayer(baseLayers[name])) {
    option.selected = true;
  }
  select.appendChild(option);
});

// Masukkan dropdown ke container
basemapControlDiv.appendChild(select);

// Event onchange untuk ganti basemap
select.onchange = e => {
  const selected = e.target.value;
  Object.values(baseLayers).forEach(layer => map.removeLayer(layer));
  baseLayers[selected].addTo(map);
};

// Layer WIUP (Vector Tile)
// Fungsi untuk generate warna dari string komoditas
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash → color hex
  let color = "#";
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}

let komoditasSet = new Set();
let activeFilter = "ALL";

const allProjectLayers = [];
const projectStatusSet = new Set();
const activeProjectStatuses = new Set();
let activeProjectStatusFilter = "ALL";

const PROJECT_STATUS_COLORS = {
  "waiting ppkh and rkab": "#ff9800",
  "plan exploration": "#2196f3",
  "mining operation": "#4caf50",
  "supporting facilities construction": "#9c27b0",
  "tanpa status": "#9e9e9e"
};

function normalizeProjectStatus(status) {
  return (status || "tanpa status").toString().trim().toLowerCase();
}

function titleCaseStatus(status) {
  return (status || "No Status")
    .split(" ")
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(" ");
}


// Layer WIUP (Vector Tile)
const wiupLayer = L.vectorGrid.protobuf(
  "https://api.maptiler.com/tiles/019ad094-0cbc-7979-9a4a-5a6b1e2c1ee1/{z}/{x}/{y}.pbf?key=Z5VIeqPMzR9Mm2lcTT57",
  {
    interactive: true,
    maxNativeZoom: 9,
    maxZoom: 22,

    vectorTileLayerStyles: {
      "WIUP_250612": properties => {
        const kom = (properties.komoditas || "").trim().toUpperCase();

        // Simpan komoditas untuk legend + filter
        if (kom) komoditasSet.add(kom);

        // FILTER: jika tidak cocok dengan dropdown → hide
        if (activeFilter !== "ALL" && kom !== activeFilter) {
          return {
            fill: false,
            stroke: false
          };
        }

        // automatic color
        const warna = stringToColor(kom);

        return {
          fill: true,
          fillOpacity: 0,
          color: warna,
          weight: 0.3
        };
      }
    }
  }
);

// WIUP Popup
wiupLayer.on("click", e => {
  let html = "<b>WIUP</b><br><hr>";
  const props = e.layer.properties;
  for (const k in props) html += `<b>${k}</b>: ${props[k]}<br>`;
  L.popup().setLatLng(e.latlng).setContent(html).openOn(map);
});

map.addLayer(wiupLayer);

//Dropdown Otomatis WIUP
function updateFilterOptions() {
  const select = document.getElementById("filterKomoditas");
  select.innerHTML = `<option value="ALL">All</option>`;

  [...komoditasSet].sort().forEach(kom => {
    const opt = document.createElement("option");
    opt.value = kom;
    opt.textContent = kom;
    select.appendChild(opt);
  });
}

// jalankan setelah map load
setTimeout(updateFilterOptions, 2000);

//Event Dropdown
document.getElementById("filterKomoditas").addEventListener("change", e => {
  activeFilter = e.target.value;
  wiupLayer.redraw();   // refresh layer
});


// Layer KLHK
const kLHKLayer = L.esri.tiledMapLayer({
  url: "https://geoportal.menlhk.go.id/server/rest/services/jsdgejawfvrdtasdt/KWS_HUTAN/MapServer",
  useCors: false
});

// Legend KLHK
const legendKLHK = document.getElementById("legendKLHK");

legendKLHK.innerHTML = `
  <b>Legend Kawasan Hutan KLHK</b>

  <div class="item"><span class="box" style="background:#AD40FF;"></span>Kawasan Konservasi</div>
  <div class="item"><span class="line" style="border-top:2px solid #AD40FF;"></span>Kawasan Konservasi Laut</div>
  <div class="item"><span class="box" style="background:#00AD00;"></span>Hutan Lindung</div>
  <div class="item"><span class="box" style="background:#FFFF00;"></span>Permanent Production Forest</div>
  <div class="item"><span class="box" style="background:#8AF200;"></span>Limited Production Forest</div>
  <div class="item"><span class="box" style="background:#FF5DFF;"></span>Convertible Production Forest</div>
  <div class="item"><span class="box" style="background:#FFFFFF;border:1px solid #000;"></span>Area Penggunaan Lain</div>
  <div class="item"><span class="box" style="background:#00C5FF;"></span>Tubuh Air</div>
  <div class="item"><span class="box" style="background:#FF0000;"></span>Tidak Terdefinisi</div>
`;

legendKLHK.style.display = "none"; // hidden by default

// Toggle Legend KLHK
document.getElementById("klhkCheck").addEventListener("change", function () {
  if (this.checked) {
    map.addLayer(kLHKLayer);
    legendKLHK.style.display = "block";
  } else {
    map.removeLayer(kLHKLayer);
    legendKLHK.style.display = "none";
  }
});

//Transparency
document.querySelectorAll(".expandBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        const li = btn.closest(".layer-item");              // cari parent LI
        const options = li.querySelector(".layer-options"); // ambil layer-options

        const shown = options.style.display === "block";
        options.style.display = shown ? "none" : "block";

        btn.textContent = shown ? "▼" : "▲";
    });
});

document.getElementById("wiupOpacity").addEventListener("input", function () {
  wiupLayer.setOpacity(parseFloat(this.value));
});

document.getElementById("klhkOpacity").addEventListener("input", function () {
  kLHKLayer.setOpacity(parseFloat(this.value));
});

document.getElementById("projectsOpacity").addEventListener("input", function () {
  const val = parseFloat(this.value);
  allProjectLayers.forEach(item => {
    if (item.layer && item.layer.setStyle) {
      item.layer.setStyle({ fillOpacity: val });
    }
  });
});

// ===============================
// STYLE PROJECTS
// ===============================
function getProjectStyle(status) {
  const normalized = normalizeProjectStatus(status);
  const color = PROJECT_STATUS_COLORS[normalized] || stringToColor(normalized);
  const opacityInput = document.getElementById("projectsOpacity");
  const fillOpacity = opacityInput ? parseFloat(opacityInput.value) : 0.5;

  return {
    color,
    fillColor: color,
    fillOpacity,
    weight: 1
  };
}

function syncProjectLayers() {
  projectsLayerGroup.clearLayers();

  allProjectLayers.forEach(item => {
    const matchDropdown = activeProjectStatusFilter === "ALL" || item.status === activeProjectStatusFilter;
    const matchCheckbox = activeProjectStatuses.has(item.status);

    if (matchDropdown && matchCheckbox) {
      projectsLayerGroup.addLayer(item.layer);
    }
  });
}

function updateProjectStatusFilter() {
  const select = document.getElementById("projectStatusFilter");
  if (!select) return;

  select.innerHTML = `<option value="ALL">All Status</option>`;
  [...projectStatusSet].sort().forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = titleCaseStatus(status);
    select.appendChild(option);
  });
}

function updateProjectStatusCheckboxes() {
  const container = document.getElementById("projectStatusCheckboxes");
  if (!container) return;

  container.innerHTML = "";
  [...projectStatusSet].sort().forEach(status => {
    activeProjectStatuses.add(status);

    const label = document.createElement("label");
    label.className = "project-status-check";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.value = status;

    input.addEventListener("change", e => {
      if (e.target.checked) activeProjectStatuses.add(status);
      else activeProjectStatuses.delete(status);
      syncProjectLayers();
    });

    const swatch = document.createElement("span");
    swatch.className = "status-swatch";
    swatch.style.background = getProjectStyle(status).color;

    const text = document.createElement("span");
    text.textContent = titleCaseStatus(status);

    label.appendChild(input);
    label.appendChild(swatch);
    label.appendChild(text);
    container.appendChild(label);
  });
}

function updateProjectLegend() {
  const legend = document.getElementById("legendProjects");
  if (!legend) return;

  legend.innerHTML = "";
  [...projectStatusSet].sort().forEach(status => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<span class="box" style="background:${getProjectStyle(status).color};"></span>${titleCaseStatus(status)}`;
    legend.appendChild(item);
  });
}

// ===============================
// POPUP PROJECTS
// ===============================
function onEachProjectFeature(feature, layer) {
  let html = "<b>PROJECT</b><hr><table>";

  for (const key in feature.properties) {
    if (key !== "geom" && feature.properties[key] !== null) {
      html += `
        <tr>
          <td><b>${key}</b></td>
          <td>${feature.properties[key]}</td>
        </tr>`;
    }
  }

  html += "</table>";
  layer.bindPopup(html);

  layer.on({
  mouseover: e => {
    e.target.setStyle({
      weight: 3,
      fillOpacity: 0.8
    });
  },
  mouseout: e => {
    layer.setStyle(getProjectStyle(feature.properties.status));
  }
});
}

// === DRAG & DROP LAYER ORDER ===
const layerList = document.getElementById("layerList");
let draggingItem = null;

//Layer Arrangement
document.querySelector("#wiupCheck").onchange = e => {
    const handle = document.querySelector('[data-layer="wiup"] .drag-handle');
    handle.style.display = e.target.checked ? "inline-block" : "none";

    // === tambah ini agar layer ikut tersembunyi ===
    if (e.target.checked) {
        map.addLayer(wiupLayer);
    } else {
        map.removeLayer(wiupLayer);
    }
};

document.querySelector("#klhkCheck").onchange = e => {
    const handle = document.querySelector('[data-layer="klhk"] .drag-handle');
    handle.style.display = e.target.checked ? "inline-block" : "none";

    // === tambah ini agar layer ikut tersembunyi ===
    if (e.target.checked) {
        map.addLayer(kLHKLayer);
    } else {
        map.removeLayer(kLHKLayer);
    }
};

document.querySelector("#projectsCheck").onchange = e => {
    const handle = document.querySelector('[data-layer="projects"] .drag-handle');
    handle.style.display = e.target.checked ? "inline-block" : "none";

    if (e.target.checked) {
        map.addLayer(projectsLayerGroup);
    } else {
        map.removeLayer(projectsLayerGroup);
    }
};


// inisialisasi handle sesuai status awal
document.querySelectorAll(".drag-handle").forEach(handle => {
    handle.setAttribute("draggable", true);
});

// 1. mulai drag
layerList.addEventListener("dragstart", e => {
    const handle = e.target.closest(".drag-handle");

    // kalau bukan handle → tidak bisa drag
    if (!handle) {
        e.preventDefault();
        return;
    }

    const li = handle.closest(".layer-item");
    draggingItem = li;
    li.classList.add("dragging");

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
});

// 2. drag bergerak
layerList.addEventListener("dragover", e => {
  e.preventDefault();
  const dragging = document.querySelector(".layer-item.dragging");
  const after = getDragAfterElement(layerList, e.clientY);

  if (!after) layerList.appendChild(dragging);
  else layerList.insertBefore(dragging, after);
});

// helper
function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".layer-item:not(.dragging)")];

  let closest = null;
  let closestOffset = -Infinity;

  els.forEach(el => {
    const box = el.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);

    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = el;
    }
  });

  return closest;
}

// 3. drag selesai
layerList.addEventListener("dragend", () => {
  if (draggingItem) {
    draggingItem.classList.remove("dragging");
    draggingItem = null;
    updateLayerOrder();
  }
});

// 4. apply ke Leaflet
function updateLayerOrder() {
  const items = [...layerList.querySelectorAll(".layer-item")];

  // dari bawah ke atas = z-index benar
  for (let i = items.length - 1; i >= 0; i--) {
    const id = items[i].dataset.layer;

    if (id === "wiup" && map.hasLayer(wiupLayer)) wiupLayer.bringToFront();
    if (id === "klhk" && map.hasLayer(kLHKLayer)) kLHKLayer.bringToFront();
    if (id === "projects" && map.hasLayer(projectsLayerGroup)) {
        projectsLayerGroup.bringToFront();
    }
  }
}

// ===============================
// LOAD PROJECTS FROM SUPABASE
// ===============================
// Ganti URL dan publishable/anon key ini jika project Supabase berubah.
const SUPABASE_URL = "https://dxxrapotjatdiqgghhbw.supabase.co";
const SUPABASE_KEY = "sb_publishable__CLxhRUZDX2CY1hMn1LYrQ_o4m2JLOc";

// Data concession diambil dari SQL function get_concessions() di Supabase.
// Function tersebut mengubah kolom PostGIS `geom` menjadi GeoJSON FeatureCollection.
function normalizeSupabaseGeoJSON(payload) {
  // Normal: RPC returns a FeatureCollection object.
  if (payload && payload.type === "FeatureCollection") return payload;

  // Some clients/functions may return JSON as a string.
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && parsed.type === "FeatureCollection") return parsed;
    } catch (_) {}
  }

  // Defensive support for wrapped RPC results, e.g. [{ get_concessions: {...} }].
  if (Array.isArray(payload)) {
    if (payload[0] && payload[0].type === "FeatureCollection") return payload[0];
    if (payload[0] && payload[0].get_concessions) return normalizeSupabaseGeoJSON(payload[0].get_concessions);
  }

  if (payload && payload.get_concessions) return normalizeSupabaseGeoJSON(payload.get_concessions);

  return { type: "FeatureCollection", features: [] };
}

async function loadProjectsFromSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_concessions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: "{}"
    });

    const rawText = await response.text();
    let payload = null;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {
      throw new Error(`Response Supabase bukan JSON valid: ${rawText.slice(0, 200)}`);
    }

    if (!response.ok) {
      const message = payload?.message || payload?.hint || rawText || response.statusText;
      throw new Error(`Supabase request failed ${response.status}: ${message}`);
    }

    const geojson = normalizeSupabaseGeoJSON(payload);
    const features = Array.isArray(geojson.features) ? geojson.features : [];

    console.log("Supabase concessions FeatureCollection:", geojson);
    console.log("Jumlah Projects dari Supabase:", features.length);

    allProjectLayers.length = 0;
    projectStatusSet.clear();
    activeProjectStatuses.clear();
    projectsLayerGroup.clearLayers();

    const allBounds = L.latLngBounds();

    features.forEach(feature => {
      if (!feature || !feature.geometry) return;

      const props = feature.properties || {};
      const status = normalizeProjectStatus(props.status);

      const layer = L.geoJSON(feature, {
        pane: "projectsPane",
        style: getProjectStyle(status),
        onEachFeature: onEachProjectFeature
      });

      projectStatusSet.add(status);
      allProjectLayers.push({ status, layer });

      const bounds = layer.getBounds();
      if (bounds.isValid()) allBounds.extend(bounds);

      searchIndex.push({
        type: "PROJECT",
        code: props.code || "",
        name: props.company || "",
        layer: layer,
        bounds: bounds
      });
    });

    updateProjectStatusFilter();
    updateProjectStatusCheckboxes();
    updateProjectLegend();
    syncProjectLayers();

    if (document.getElementById("projectsCheck")?.checked && !map.hasLayer(projectsLayerGroup)) {
      projectsLayerGroup.addTo(map);
    }

    if (allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [30, 30], maxZoom: 10 });
    } else {
      console.warn("Projects Supabase berhasil dipanggil, tetapi tidak ada geometry valid.");
    }
  } catch (err) {
    console.error("Supabase error:", err);
    alert(`Gagal menampilkan layer Projects dari Supabase. Detail: ${err.message}`);
  }
}

loadProjectsFromSupabase();

// Layer Project dynamic status filter
document.getElementById("projectStatusFilter").addEventListener("change", e => {
  activeProjectStatusFilter = e.target.value;
  syncProjectLayers();
});

//Autocomplete Search Engine
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  searchResults.innerHTML = "";

  if (q.length < 2) {
    searchResults.style.display = "none";
    return;
  }

  const matches = searchIndex.filter(item =>
    (item.code && item.code.toLowerCase().includes(q)) ||
    (item.name && item.name.toLowerCase().includes(q))
  ).slice(0, 15);

  if (!matches.length) {
    searchResults.style.display = "none";
    return;
  }

  matches.forEach(item => {
    const div = document.createElement("div");
    div.className = "search-item";

    div.innerHTML = `
      <b>${item.name}</b><br>
      <span class="search-type">
        ${item.type}${item.code ? " | " + item.code : ""}
      </span>
    `;

    div.onclick = () => {
      searchResults.style.display = "none";
      searchInput.value = item.name;

      if (item.bounds) {
        map.fitBounds(item.bounds, { maxZoom: 12 });
        item.layer.setStyle?.({ weight: 4, color: "#000" });
      } else if (item.latlng) {
        map.setView(item.latlng, 12);
      }
    };

    searchResults.appendChild(div);
  });

  searchResults.style.display = "block";
});

//UX fix
document.addEventListener("click", e => {
  if (!searchInput.contains(e.target)) {
    searchResults.style.display = "none";
  }
});

//KML Layer
const kmlLayers = [];

document.getElementById("kmlInput").addEventListener("change", e => {
  Array.from(e.target.files).forEach(file => {
    loadKMLWithOmnivore(file);
  });
});

function loadKMLWithOmnivore(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const layer = omnivore.kml.parse(reader.result);

    layer.eachLayer(l => {
      l.bindPopup(file.name);
    });

    layer.addTo(map);
    map.fitBounds(layer.getBounds());

    kmlLayers.push({
      name: file.name,
      layer
    });

    updateKmlLayerList();
  };

  reader.readAsText(file);
}

// Geoman + Turf
map.pm.addControls({
  position: "topright",
  drawMarker: true,
  drawCircle: true,
  drawPolygon: true,
  drawPolyline: true,
  drawRectangle: true,
  editMode: true,
  dragMode: true,
  removalMode: true
});

// Turf.js Calculations
map.on("pm:create", (e) => {
  try {
    const layer = e.layer;
    const shape = e.shape;

    if (shape === "Polygon" || shape === "Rectangle") {
      const latlngs = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
      latlngs.push(latlngs[0]);
      const polygon = turf.polygon([latlngs]);
      const areaHa = turf.area(polygon) / 10000;
      layer.bindPopup(`📏 Luas: ${areaHa.toFixed(2)} ha`).openPopup();
    }

    if (shape === "Line") {
      const latlngs = layer.getLatLngs().map(ll => [ll.lng, ll.lat]);
      const length = turf.length(turf.lineString(latlngs), { units: "kilometers" });
      layer.bindPopup(`📐 Panjang: ${length.toFixed(2)} km`).openPopup();
    }

    if (shape === "Circle") {
      const r = layer.getRadius();
      const area = Math.PI * r * r / 10000;
      layer.bindPopup(`🔵 Radius: ${(r/1000).toFixed(2)} km<br>Luas: ${area.toFixed(2)} ha`).openPopup();
    }

    if (shape === "Marker") {
      const latlng = layer.getLatLng();
      const lat = latlng.lat.toFixed(7);
      const lng = latlng.lng.toFixed(7);

      const popupHTML = `
        <b>Koordinat Marker</b><br>
        Latitude: ${lat}<br>
        Longitude: ${lng}<br><br>
        <button class="copyCoordBtn"
          style="
            padding:6px 10px;
            background:#ff8c00;
            color:#111;
            border:none;
            border-radius:5px;
            cursor:pointer;">
          Salin Koordinat
        </button>
      `;

      layer.bindPopup(popupHTML).openPopup();

      map.on("popupopen", (ev) => {
        if (ev.popup._source !== layer) return; // Pastikan popup punya marker ini

        setTimeout(() => {
          const popupEl = ev.popup.getElement();
          if (!popupEl) return;

          const btn = popupEl.querySelector(".copyCoordBtn");
          if (!btn) return;

          btn.addEventListener("click", () => {
            navigator.clipboard.writeText(`${lat}, ${lng}`);

            btn.innerText = "Tersalin!";
            btn.style.background = "#4caf50";

            setTimeout(() => {
              btn.innerText = "Salin Koordinat";
              btn.style.background = "#ff8c00";
            }, 1200);
          });
        }, 50);
      });
    }

  } catch (err) {
    console.error("Turf.js error:", err);
  }
});