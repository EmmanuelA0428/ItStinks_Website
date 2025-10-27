import { jsonp } from "../utils/jsonpHelper.js";
import { CONFIG } from "../utils/config.js";
import { addCustomControls } from "../components/mapCustomControls.js";
import { MarkerForm } from "../components/markerForm.js";
import { Drawer } from "../components/drawer.js";
import { addLegend } from "../components/mapCustomControls.js";

let map;
let markerForm;
let drawer;
let allStinks;
let allStinkMarkers = [];
let userBlocked;
let nextAddPinTime = null;
let endPointUrl = CONFIG.ENDPOINT_URL;

async function initMap() {
  const position = { lat: 42.8694, lng: -76.9856 };
  const newYorkBounds = {
    north: 45.0,
    south: 40.0,
    west: -80.0,
    east: -71.0,
  };
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
    "marker"
  );

  // Creating the map
  map = new Map(document.getElementById("map"), {
    center: position,
    zoom: 14.5,
    mapId: "demo",
    mapTypeControl: false,
    streetViewControl: false,
    restriction: {
      latLngBounds: newYorkBounds,
      strictBounds: true,
    },
  });

  allStinkMarkers = [];

  // Creating the marker form
  markerForm = new MarkerForm(map, {
    onSave: saveMarker,
    showToast: showToast,
  });

  // Initializing the Drawer
  drawer = new Drawer();
  drawer.init();

  // Adding the custom controls
  customControls();

  // Event listener for the map
  map.addListener("click", (event) => {
    markerForm.show(event.latLng);
  });
}

function customControls() {
  const { locationButton, displayMarkersCheckbox } = addCustomControls(map);
  let isLoading = false;

  // Checkbox event listener
  displayMarkersCheckbox.addEventListener("change", async () => {
    if (displayMarkersCheckbox.checked) {
      if (allStinkMarkers.length === 0 && !isLoading) {
        isLoading = true;
        const checkboxLabel = document.querySelector(
          'label[for="show-markers-checkbox"]'
        );
        const originalText = checkboxLabel.textContent;
        checkboxLabel.textContent = " Loading stinks...";
        displayMarkersCheckbox.disabled = true;
        showToast("Loading stinks...");

        try {
          const markers = await getAllStinks();
          markers.forEach((marker) => marker.setMap(map));
          // Update drawer with stinks data
          drawer.setStinksData(allStinks);
          showToast(`Loaded ${markers.length} stinks successfully!`);
        } catch (error) {
          console.error("Error loading stinks:", error);
          showToast("Failed to load stinks" + error);
          displayMarkersCheckbox.checked = false;
        } finally {
          checkboxLabel.textContent = originalText;
          displayMarkersCheckbox.disabled = false;
          isLoading = false;
        }
      } else {
        allStinkMarkers.forEach((marker) => marker.setMap(map));
      }
    } else {
      allStinkMarkers.forEach((marker) => marker.setMap(null));
    }
  });

  // Event Listener for location button
  locationButton.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const currentPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          markerForm.show(currentPosition);
        },
        (error) => {
          let errorMsg = "Unable to get your location. ";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg += "Please enable location permissions.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg += "Location information is unavailable.";
          } else {
            errorMsg += "Location request timed out.";
          }
          showToast(errorMsg);
        }
      );
    } else {
      showToast("Geolocation is not supported by this browser.");
    }
  });

  // Adding the legend
  const legendContainer = addLegend();
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legendContainer);
}

/* Async Functions - Save and Fetch Markers*/
async function saveMarker(lat, lng, stinkLevel, stinkDuration, comment) {
  const currentDate = new Date();
  if (nextAddPinTime === null || currentDate > nextAddPinTime) {
    try {
      userBlocked = false;
      const createdAt = new Date().toISOString();
      const params = new URLSearchParams({
        lat: lat,
        lng: lng,
        stinkLevel: stinkLevel,
        stinkDuration: stinkDuration,
        comment: comment,
        createdAt: createdAt,
      });

      const url = endPointUrl + "?" + params.toString();
      jsonp(url, function (data) {
        console.log("Stink added successfully:", data);
      });

      nextAddPinTime = new Date(currentDate.getTime() + 3 * 60 * 1000);
      return false;
    } catch (error) {
      console.error("Error adding stink:", error);
      throw error;
    }
  } else {
    userBlocked = true;
    alert(
      "Stink already added. Please wait 3 minutes before adding another one."
    );
    return true;
  }
}

// Grammar mapping for stink levels
function getStinkLevelText(stinkLevel) {
  const mapping = {
    "A little": {
      text: "a slight odor",
      color: "#10b981",
    },
    "A lot": {
      text: "a strong odor",
      color: "#f59e0b",
    },
    "Really bad": {
      text: "a really bad smell",
      color: "#f97316",
    },
    unbearable: {
      text: "an unbearable stench",
      color: "#ef4444",
    },
  };
  return mapping[stinkLevel] || { text: "an odor", color: "#6b7280" };
}

// ✅ Updated grammar mapping for correct durations
function getDurationText(duration) {
  const mapping = {
    "Just started": "that just started",
    "Been a minute": "that's been going for a bit",
    "All day": "that's been going all day",
    "Never ending": "that seems never-ending",
  };
  return mapping[duration] || "for some time";
}

async function getAllStinks() {
  return new Promise((resolve, reject) => {
    jsonp(endPointUrl, function (stinks) {
      if (stinks.success === false) {
        console.error("Failed to fetch stinks:", stinks.error);
        reject(new Error(stinks.error));
        return;
      }

      allStinks = stinks;
      allStinkMarkers = [];

      stinks.forEach((s) => {
        const timeOpacity = getMarkerOpacity(s.createdAt);
        const circle = document.createElement("div");
        Object.assign(circle.style, {
          width: "20px", // ✅ Reduced to 20px
          height: "20px", // ✅ Reduced to 20px
          borderRadius: "50%",
          background: getMarkerColor(s.stinkLevel),
          border: "2px solid black",
          boxSizing: "border-box",
          boxShadow: "0 0 6px rgba(0,0,0,0.3)",
          opacity: timeOpacity,
        });

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: s.lat, lng: s.lng },
          map: null,
          content: circle,
        });

        marker.addListener("click", () => {
          const stinkInfo = getStinkLevelText(s.stinkLevel);
          const durationText = getDurationText(s.stinkDuration);
          const timeAgo = timeSince(s.createdAt) || "recently";

          const content = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; max-width: 260px; line-height: 1.6;">
              <p style="margin: 0; font-size: 14px; color: #333;">
                Someone reported <strong style="color: ${stinkInfo.color};">${stinkInfo.text}</strong> 
                <span style="color: #64748b;">${durationText}</span>, 
                <em style="color: #666;">${timeAgo}</em>.
              </p>
            </div>
          `;

          const infoWindow = new google.maps.InfoWindow({
            content: content,
          });
          infoWindow.open(map, marker);
        });

        allStinkMarkers.push(marker);
      });

      resolve(allStinkMarkers);
    });
  });
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

initMap();

// Prevent double-tap zoom on the entire page
document.addEventListener(
  "dblclick",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

// Prevent iOS-specific zoom gestures
document.addEventListener("gesturestart", (e) => {
  e.preventDefault();
});

document.addEventListener("gesturechange", (e) => {
  e.preventDefault();
});

document.addEventListener("gestureend", (e) => {
  e.preventDefault();
});
