let map;
let tempMarker = null;
let infoWindow = null;

let allMarkers;
let allMarkerObjects = [];

let nextAddPinTime = null;
let endPointUrl =
  "https://script.google.com/macros/s/AKfycbw_iDotkHmq5tdyk-GpSW4RgX1vMU7kBQzYPN4DRsTZfYmV22bNftl5Wo7YVVKdhYTl/exec";

async function initMap() {
  const position = { lat: 42.913364, lng: -76.84198 }; // Intitial position
  const newYorkBounds = {
    north: 45.0,
    south: 40.0,
    west: -80.0,
    east: -71.0,
  };
  const { Map } = await google.maps.importLibrary("maps"); // import Map
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
    "marker"
  );

  map = new Map(document.getElementById("map"), {
    center: position,
    zoom: 15,
    mapId: "demo",
    mapTypeControl: false, // hides the Map/Satellite toggle
    restriction: {
      latLngBounds: newYorkBounds,
      strictBounds: true,
    },
  });
  allMarkerObjects = []; // Start with empty marker objects

  addCustomControls(map);
  addLegend(map);
  createDrawer();

  // Add marker on map click
  map.addListener("click", (event) => {
    createMarkerWithForm(event.latLng, map);
  });

  document.getElementById("home-btn").addEventListener("click", () => {
    window.location.href = "index.html?force=true";
  });
}

function addCustomControls(map) {
  const Locationbutton = createLocationButton();
  const { checkboxContainer, displayMarkersCheckbox } = createCheckbox();

  // Create a container for both controls to stack them
  const topCenterContainer = document.createElement("div");
  topCenterContainer.style.display = "flex";
  topCenterContainer.style.flexDirection = "column";
  topCenterContainer.style.alignItems = "center";
  topCenterContainer.appendChild(Locationbutton);
  topCenterContainer.appendChild(checkboxContainer);

  map.controls[google.maps.ControlPosition.TOP_CENTER].push(topCenterContainer);

  // Show/hide markers
  displayMarkersCheckbox.addEventListener("change", () => {
    if (displayMarkersCheckbox.checked) {
      if (allMarkerObjects.length === 0) {
        getAllMarkers().then((markers) => {
          markers.forEach((marker) => marker.setMap(map));
        });
      } else {
        allMarkerObjects.forEach((marker) => marker.setMap(map));
      }
    } else {
      allMarkerObjects.forEach((marker) => marker.setMap(null));
    }
  });

  // Add marker at user location
  Locationbutton.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const currentPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        createMarkerWithForm(currentPosition, map);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  });
}

function createDrawer() {
  const drawer = document.getElementById("drawer");
  const drawerToggle = document.getElementById("drawer-toggle");

  drawerToggle.addEventListener("click", () => {
    console.log("Drawer toggle clicked");
    drawer.classList.toggle("open");
    if (drawer.classList.contains("open")) {
      updateTrends();
      updateMostCommonToday();
    }
  });
}

function createMarkerWithForm(position, map) {
  if (infoWindow) {
    infoWindow.close();
    infoWindow = null;
  }
  if (tempMarker) {
    tempMarker.setMap(null);
    tempMarker = null;
  }
  // Create a simple circular div as marker
  const circle = document.createElement("div");
  Object.assign(circle.style, {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "grey",
    border: "2px solid black",
    boxSizing: "border-box",
    boxShadow: "0 0 6px rgba(0,0,0,0.3)",
  });

  tempMarker = new google.maps.marker.AdvancedMarkerElement({
    position: position,
    map: map,
    content: circle,
  });

  const formHtml = `
  <div style="width: 100%; max-width: 260px; font-family: Arial, sans-serif; font-size: 12px; box-sizing: border-box; overflow-x:hidden;">
    <label style="font-weight: bold; display:block; margin-bottom:3px;">How bad does it stink?</label>
    <select id="stink-meter" style="width: 100%; margin-bottom: 6px; padding:3px; border-radius:4px; border:1px solid #ccc; font-size:11px;">
      <option value="A little">A little</option>
      <option value="A lot">A lot</option>
      <option value="Really bad">Really bad</option>
      <option value="unbearable">Unbearable</option>
    </select>

    <label style="font-weight: bold; display:block; margin-bottom:3px;">How long has it been stinking?</label>
    <select id="stink-duration" style="width: 100%; margin-bottom: 6px; padding:3px; border-radius:4px; border:1px solid #ccc; font-size:11px;">
      <option value="Just started">Just started</option>
      <option value="Been a minute">Been a minute</option>
      <option value="All day">All day</option>
      <option value="Never ending">Never ending</option>
    </select>

    <label style="font-weight: bold; display:block; margin-bottom:3px;">Additional Info (Optional):</label>
    <textarea id="marker-notes" placeholder="Add extra details (optional)..." 
      style="width: 100%; max-width: 100%; height: 55px; margin-bottom: 8px; resize: vertical; padding:4px; border-radius:4px; border:1px solid #ccc; font-size:11px; box-sizing:border-box;"></textarea>

    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
      <button id="save-marker" type="button" 
        style="flex:1; background-color:#28a745; color:white; padding:5px; font-size:11px; border:none; border-radius:4px; cursor:pointer;">
        Save
      </button>
      <button id="cancel-marker" type="button" 
        style="flex:1; background-color:#dc3545; color:white; padding:5px; font-size:11px; border:none; border-radius:4px; cursor:pointer;">
        Cancel
      </button>
    </div>
  </div>
`;

  infoWindow = new google.maps.InfoWindow({
    content: formHtml,
    position: position,
  });

  infoWindow.open(map, tempMarker);

  google.maps.event.addListener(infoWindow, "closeclick", () => {
    if (tempMarker) {
      tempMarker.setMap(null);
      tempMarker = null;
    }
    infoWindow = null;
  });

  google.maps.event.addListenerOnce(infoWindow, "domready", () => {
    document
      .getElementById("save-marker")
      .addEventListener("click", async (event) => {
        event.preventDefault();
        const stinkLevel = document.getElementById("stink-meter").value;
        const stinkDuration = document.getElementById("stink-duration").value;
        const userComment = document
          .getElementById("marker-notes")
          .value.trim();

        infoWindow.close();
        tempMarker.setMap(null);
        tempMarker = null;

        // Create a colored circle for marker
        const circle = document.createElement("div");
        Object.assign(circle.style, {
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: getMarkerColor(stinkLevel),
          border: "2px solid black",
          boxSizing: "border-box",
          boxShadow: "0 0 6px rgba(0,0,0,0.3)",
        });
        new google.maps.marker.AdvancedMarkerElement({
          position: position,
          map: map,
          content: circle,
          title: stinkLevel,
        });

        const lat =
          typeof position.lat === "function" ? position.lat() : position.lat;
        const lng =
          typeof position.lng === "function" ? position.lng() : position.lng;

        try {
          await saveMarker(lat, lng, stinkLevel, stinkDuration, userComment);
          alert(
            `Marker added successfully at Lat: ${lat}, Lng: ${lng}, Stink Level: ${stinkLevel}, Duration: ${stinkDuration}, Comment: ${userComment}`
          );
          showToast("Marker added successfully!");
        } catch (error) {
          console.error("Error saving marker:", error);
        }
      });

    document.getElementById("cancel-marker").addEventListener("click", () => {
      infoWindow.close();
      infoWindow = null;
      tempMarker.setMap(null);
      tempMarker = null;
    });
  });
}

// ------------------------------- Requests -------------------------------
// JSONP helper function
function jsonp(url, callback) {
  const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());

  // Add callback parameter to URL
  url += (url.indexOf("?") >= 0 ? "&" : "?") + "callback=" + callbackName;

  // Create script element
  const script = document.createElement("script");
  script.src = url;

  // Create global callback
  window[callbackName] = function (data) {
    callback(data);
    // Cleanup
    delete window[callbackName];
    document.body.removeChild(script);
  };

  // Handle errors
  script.onerror = function () {
    callback({ success: false, error: "Failed to load" });
    delete window[callbackName];
    document.body.removeChild(script);
  };

  document.body.appendChild(script);
}

async function saveMarker(lat, lng, stinkLevel, stinkDuration, comment) {
  const currentDate = new Date();
  if (nextAddPinTime === null || currentDate > nextAddPinTime) {
    try {
      createdAt = new Date().toISOString();

      // Build URL with parameters (JSONP can't send POST body)
      const params = new URLSearchParams({
        lat: lat,
        lng: lng,
        stinkLevel: stinkLevel,
        stinkDuration: stinkDuration,
        comment: comment,
        createdAt: createdAt,
      });

      const url = endPointUrl + "?" + params.toString();

      // Use JSONP for the request
      jsonp(url, function (data) {
        console.log("Marker added successfully:", data);
      });

      // Update the next allowed time (3 minutes from now)
      nextAddPinTime = new Date(currentDate.getTime() + 3 * 60 * 1000);
    } catch (error) {
      console.error("Error adding marker:", error);
    }
  } else {
    alert(
      "Marker already added. Please wait 3 minutes before adding another one."
    );
  }
}

async function getAllMarkers() {
  return new Promise((resolve, reject) => {
    jsonp(endPointUrl, function (markers) {
      if (markers.success === false) {
        console.error("Failed to fetch markers:", markers.error);
        reject(new Error(markers.error));
        return;
      }

      allMarkers = markers;
      allMarkerObjects = [];
      markers.forEach((m) => {
        const timeOpacity = getMarkerOpacity(m.createdAt);
        // Create a colored circle for marker
        const circle = document.createElement("div");
        Object.assign(circle.style, {
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: getMarkerColor(m.stinkLevel),
          border: "2px solid black",
          boxSizing: "border-box",
          boxShadow: "0 0 6px rgba(0,0,0,0.3)",
          opacity: timeOpacity,
        });
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: m.lat, lng: m.lng },
          map: null,
          content: circle,
        });
        marker.addListener("click", () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `
                  <div style="font-family: Arial, sans-serif">
                    <strong>Stink Level:</strong> ${m.stinkLevel} <br/>
                    <strong>Stink Duration:</strong> ${m.stinkDuration} <br/>
                    <strong>Added:</strong> ${
                      timeSince(m.createdAt) || "Unknown"
                    }
                  </div>
                `,
          });
          infoWindow.open(map, marker);
        });
        allMarkerObjects.push(marker);
      });
      resolve(allMarkerObjects);
    });
  });
}

function getMarkerColor(stinkLevel) {
  switch (stinkLevel) {
    case "A little":
      return "green";
    case "A lot":
      return "yellow";
    case "Really bad":
      return "orange";
    case "unbearable":
      return "red";
    default:
      return "blue";
  }
}

function getMarkerOpacity(createdAt) {
  const now = Date.now();
  const markerTime = new Date(createdAt).getTime();
  const hours = (now - markerTime) / (1000 * 60 * 60);

  if (hours < 24) return 1.0;
  if (hours < 24 * 7) return 0.8;
  if (hours < 24 * 30) return 0.6;
  if (hours < 72 * 365) return 0.4;
  return 0.2;
}

function timeSince(createdAt) {
  const now = new Date();
  const markerTime = new Date(createdAt);

  const diff = now.getTime() - markerTime.getTime();

  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins} min(s) ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr(s) ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day(s) ago`;
}

function createCheckbox() {
  const displayMarkersCheckbox = Object.assign(
    document.createElement("input"),
    {
      type: "checkbox",
      id: "show-markers-checkbox",
    }
  );

  const checkboxLabel = Object.assign(document.createElement("label"), {
    htmlFor: "show-markers-checkbox",
    textContent: " Show All Markers",
  });

  const checkboxContainer = document.createElement("div");
  Object.assign(checkboxContainer.style, {
    marginTop: "6px",
    background: "white",
    padding: "6px 12px",
    borderRadius: "6px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    fontFamily: "Arial, sans-serif",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
  });

  checkboxContainer.appendChild(displayMarkersCheckbox);
  checkboxContainer.appendChild(checkboxLabel);
  return { checkboxContainer, displayMarkersCheckbox };
}

function createLocationButton() {
  const Locationbutton = Object.assign(document.createElement("button"), {
    innerHTML: "📍 Add Marker To Current Location",
  });

  Object.assign(Locationbutton.style, {
    background: "white",
    color: "#007bff",
    fontWeight: "500",
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    marginBottom: "4px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  });

  Locationbutton.addEventListener("mouseenter", () => {
    Locationbutton.style.background = "#f0f0f0";
  });
  Locationbutton.addEventListener("mouseleave", () => {
    Locationbutton.style.background = "white";
  });

  return Locationbutton;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#4caf50",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.3)",
    zIndex: 1000,
    fontFamily: "Arial, sans-serif",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function addLegend(map) {
  const legend = document.createElement("div");
  legend.className = "legend";

  // Opacity legend 1 - fresh  (within the last day) .8 - within the week .6 - within the month .4 - within the year .2 - older than a year
  legend.innerHTML = `
        <strong>Legend</strong><br/>
        <div><span style="display:inline-block;width:14px;height:14px;background:green;margin-right:4px;"></span> A little</div>
        <div><span style="display:inline-block;width:14px;height:14px;background:yellow;margin-right:4px;"></span> A lot</div>
        <div><span style="display:inline-block;width:14px;height:14px;background:orange;margin-right:4px;"></span> Really bad</div>
        <div><span style="display:inline-block;width:14px;height:14px;background:red;margin-right:4px;"></span> Unbearable</div>
        <hr/>

        <strong>Added within the last: </strong><br/>

        <div><span style="opacity:1;">●</span> day </div>
        <div><span style="opacity:0.8;">●</span> week </div>
        <div><span style="opacity:0.6;">●</span> month </div>
        <div><span style="opacity:0.4;">●</span> year </div>
<div><span style="opacity:0.2;">●</span> Older than a year</div>  

      `;

  // Only add the legend to the container and map controls
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "6px";

  container.appendChild(legend);

  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(container);
}

// --------------- Drawer features --------------- //

function updateTrends() {
  if (!allMarkers || allMarkers.length === 0) return;

  const ctx = document.getElementById("trend-chart").getContext("2d");

  // Get last 7 days
  const today = new Date();
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().slice(0, 10));
  }

  // Initialize counts for each level
  const levels = ["low", "medium", "high", "unbearable"];
  const counts = { all: [], low: [], medium: [], high: [], unbearable: [] };

  last7Days.forEach((day) => {
    let dayMarkers = allMarkers.filter(
      (m) => new Date(m.createdAt).toISOString().slice(0, 10) === day
    );

    counts.all.push(dayMarkers.length);
    levels.forEach((lvl) => {
      counts[lvl].push(dayMarkers.filter((m) => m.stinkLevel === lvl).length);
    });
  });

  // Destroy previous chart if exists
  if (window.trendChart) window.trendChart.destroy();

  // Draw chart
  window.trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: last7Days,
      datasets: [
        {
          label: "All",
          data: counts.all,
          borderColor: "blue",
          fill: false,
          tension: 0.1,
        },
        {
          label: "Low",
          data: counts.low,
          borderColor: "green",
          fill: false,
          tension: 0.1,
        },
        {
          label: "Medium",
          data: counts.medium,
          borderColor: "yellow",
          fill: false,
          tension: 0.1,
        },
        {
          label: "High",
          data: counts.high,
          borderColor: "orange",
          fill: false,
          tension: 0.1,
        },
        {
          label: "Unbearable",
          data: counts.unbearable,
          borderColor: "red",
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
      plugins: {
        legend: {
          display: true,
        },
      },
    },
  });
}
function updateMostCommonToday() {
  const today = new Date().toISOString().slice(0, 10);
  const todayMarkers = allMarkers.filter((m) => m.createdAt.startsWith(today));
  const header = document.querySelector("#common-section h4");

  if (todayMarkers.length === 0) {
    header.textContent = "Most Common Stink Today: None";
    document.getElementById("common-today").textContent = "No reports today";
    return;
  }

  const counts = {};
  todayMarkers.forEach((m) => {
    counts[m.stinkLevel] = (counts[m.stinkLevel] || 0) + 1;
  });

  const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  header.textContent = `Most Common Stink Today: ${mostCommon}`;
  document.getElementById(
    "common-today"
  ).textContent = `Count: ${counts[mostCommon]}`;
}

initMap();
