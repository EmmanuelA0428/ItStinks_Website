function createLocationButton() {
  const locationButton = Object.assign(document.createElement("button"), {
    innerHTML: "📍 Add Stink To Current Location",
  });
  Object.assign(locationButton.style, {
    background: "white",
    color: "#007bff",
    fontWeight: "500",
    fontSize: "15px",
    padding: "10px 14px",
    border: "none",
    borderRadius: "6px",
    marginBottom: "4px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
  });
  locationButton.addEventListener("mouseenter", () => {
    locationButton.style.background = "#f0f0f0";
  });
  locationButton.addEventListener("mouseleave", () => {
    locationButton.style.background = "white";
  });
  return locationButton;
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
    textContent: " Show All Stinks",
  });
  const checkboxContainer = document.createElement("div");
  Object.assign(checkboxContainer.style, {
    marginTop: "6px",
    background: "white",
    padding: "8px 14px",
    borderRadius: "6px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
  });
  checkboxContainer.appendChild(displayMarkersCheckbox);
  checkboxContainer.appendChild(checkboxLabel);
  return { checkboxContainer, displayMarkersCheckbox };
}

export function addCustomControls(map) {
  const locationButton = createLocationButton();
  const { checkboxContainer, displayMarkersCheckbox } = createCheckbox();

  // Create container for both controls
  const topCenterContainer = document.createElement("div");
  topCenterContainer.style.display = "flex";
  topCenterContainer.style.flexDirection = "column";
  topCenterContainer.style.alignItems = "center";
  topCenterContainer.appendChild(locationButton);
  topCenterContainer.appendChild(checkboxContainer);

  map.controls[google.maps.ControlPosition.TOP_CENTER].push(topCenterContainer);

  // Return references for event binding in mainMap.js
  return { locationButton, displayMarkersCheckbox };
}

// Updated collapsible legend
export function addLegend() {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "6px";

  // Create toggle button
  const toggleButton = document.createElement("button");
  toggleButton.innerHTML = "📊 Legend";
  Object.assign(toggleButton.style, {
    background: "white",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });

  // Create legend content (initially hidden)
  const legend = document.createElement("div");
  legend.className = "legend";
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

  // Initially hide the legend content
  legend.style.display = "none";
  legend.style.transition = "all 0.3s ease";

  // Track expanded state
  let isExpanded = false;

  // Toggle functionality
  toggleButton.addEventListener("click", () => {
    isExpanded = !isExpanded;
    if (isExpanded) {
      legend.style.display = "block";
      toggleButton.innerHTML = " Legend ▼";
    } else {
      legend.style.display = "none";
      toggleButton.innerHTML = " Legend ▶";
    }
  });

  // Hover effect
  toggleButton.addEventListener("mouseenter", () => {
    toggleButton.style.background = "#f0f0f0";
  });
  toggleButton.addEventListener("mouseleave", () => {
    toggleButton.style.background = "white";
  });

  // Set initial state with arrow
  toggleButton.innerHTML = " Legend ▶";

  container.appendChild(toggleButton);
  container.appendChild(legend);
  return container;
}
