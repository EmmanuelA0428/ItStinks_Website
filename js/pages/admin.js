import { jsonp } from "../utils/jsonpHelper.js";
import { CONFIG } from "../utils/config.js";

// At the very top of admin.js
const urlParams = new URLSearchParams(window.location.search);
const accessKey = urlParams.get("key");

// Your secret token (keep it long and hard to guess)
const SECRET_KEY = "mySuperSecretKey12345";

if (accessKey !== SECRET_KEY) {
  document.body.innerHTML =
    "<h2>Access Denied</h2><p>You are not authorized to view this page.</p>";
  throw new Error("Unauthorized access to admin page");
}

let allMarkers = [];
let currentSort = { column: "createdAt", direction: "desc" };
let trendChart = null;
let endPointUrl = CONFIG.ENDPOINT_URL;
let isLoading = false;

// Store original column names to avoid icon accumulation
const columnNames = {
  stinkLevel: "Stink Level",
  stinkDuration: "Duration",
  createdAt: "Date & Time",
  comment: "Comment",
  lat: "Latitude",
  lng: "Longitude",
};

document.addEventListener("DOMContentLoaded", function () {
  loadMarkers();
  setupEventListeners();
  restoreChartPreferences();
});

async function loadMarkers() {
  if (isLoading) return;

  isLoading = true;
  setLoadingState(true);

  try {
    jsonp(endPointUrl, function (markers) {
      if (markers.success === false) {
        console.error("Failed to fetch markers:", markers.error);
        showNotification("Error loading markers: " + markers.error, "error");
        return;
      }

      allMarkers = markers;
      renderMarkersTable(allMarkers);
      updateTrends();
      updateStatistics();
      updateLastUpdated();
      showNotification("Data refreshed successfully", "success");
    });
  } catch (error) {
    console.error("Error loading markers:", error);
    showNotification("Error loading markers: " + error.message, "error");
  } finally {
    isLoading = false;
    setLoadingState(false);
  }
}

function setupEventListeners() {
  document
    .getElementById("search-input")
    .addEventListener("input", applyFilters);
  document
    .getElementById("stink-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("time-filter")
    .addEventListener("change", applyFilters);

  // Sort headers with keyboard support
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => sortTable(th.getAttribute("data-sort")));
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        sortTable(th.getAttribute("data-sort"));
      }
    });
    th.setAttribute("tabindex", "0");
    th.setAttribute("role", "button");
  });

  document.getElementById("refresh-btn").addEventListener("click", loadMarkers);
  document.getElementById("download-btn").addEventListener("click", () => {
    const filter = document.getElementById("download-filter").value;
    downloadCSV(filter);
  });

  // Chart date range selector
  document.getElementById("chart-range").addEventListener("change", (e) => {
    const value = e.target.value;
    if (value === "custom") {
      document.getElementById("custom-date-range").style.display = "block";
    } else {
      document.getElementById("custom-date-range").style.display = "none";
      localStorage.setItem("chartRange", value);
      updateTrends();
    }
  });

  document
    .getElementById("apply-custom-range")
    .addEventListener("click", () => {
      const startDate = document.getElementById("start-date").value;
      const endDate = document.getElementById("end-date").value;

      if (startDate && endDate) {
        if (new Date(startDate) <= new Date(endDate)) {
          localStorage.setItem("chartRange", "custom");
          localStorage.setItem("chartStartDate", startDate);
          localStorage.setItem("chartEndDate", endDate);
          updateTrends();
        } else {
          showNotification("Start date must be before end date", "error");
        }
      } else {
        showNotification("Please select both start and end dates", "error");
      }
    });
}

function renderMarkersTable(markers) {
  const tableBody = document.getElementById("markers-table-body");
  tableBody.innerHTML = "";

  if (markers.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding:20px;">No markers found</td></tr>';
    return;
  }

  markers.forEach((marker) => {
    const row = document.createElement("tr");
    const date = new Date(marker.createdAt);
    const formattedDate =
      date.toLocaleDateString() + " " + date.toLocaleTimeString();
    const stinkClass =
      "stink-" + marker.stinkLevel.toLowerCase().replace(" ", "-");

    row.innerHTML = `
  <td class="${stinkClass}">${marker.stinkLevel}</td>
  <td>${marker.stinkDuration || "-"}</td>
  <td>${formattedDate}</td>
  <td>${marker.comment || "-"}</td>
  <td>${marker.lat.toFixed(6)}</td>
  <td>${marker.lng.toFixed(6)}</td>
`;

    tableBody.appendChild(row);
  });

  updateSortIndicators();
}

function applyFilters() {
  const searchText = document
    .getElementById("search-input")
    .value.toLowerCase();
  const stinkFilter = document.getElementById("stink-filter").value;
  const timeFilter = document.getElementById("time-filter").value;

  const filtered = allMarkers.filter((m) => {
    if (
      searchText &&
      !(m.comment && m.comment.toLowerCase().includes(searchText))
    )
      return false;
    if (stinkFilter !== "all" && m.stinkLevel !== stinkFilter) return false;

    if (timeFilter !== "all") {
      const date = new Date(m.createdAt);
      const now = new Date();
      if (timeFilter === "today" && date.toDateString() !== now.toDateString())
        return false;
      if (timeFilter === "week" && date < new Date(now - 7 * 86400000))
        return false;
      if (timeFilter === "month" && date < new Date(now - 30 * 86400000))
        return false;
    }
    return true;
  });

  const sorted = sortMarkers(
    filtered,
    currentSort.column,
    currentSort.direction
  );
  renderMarkersTable(sorted);
}

function sortTable(column) {
  const direction =
    currentSort.column === column
      ? currentSort.direction === "asc"
        ? "desc"
        : "asc"
      : "asc";
  currentSort = { column, direction };
  applyFilters();
}

function sortMarkers(markers, column, direction) {
  return [...markers].sort((a, b) => {
    let A = a[column];
    let B = b[column];

    if (column === "lat" || column === "lng") {
      A = parseFloat(A);
      B = parseFloat(B);
    } else if (column === "createdAt") {
      A = new Date(A);
      B = new Date(B);
    } else if (column === "stinkDuration") {
      // Sort duration by logical order
      const durationOrder = {
        "Just started": 1,
        "Been a minute": 2,
        "All day": 3,
        "Never ending": 4,
      };
      A = durationOrder[A] || 0;
      B = durationOrder[B] || 0;
    } else {
      // Text comparison for other columns
      A = String(A || "").toLowerCase();
      B = String(B || "").toLowerCase();
      return direction === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    }

    return direction === "asc" ? A - B : B - A;
  });
}

function updateSortIndicators() {
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    const col = th.getAttribute("data-sort");
    const baseText = columnNames[col] || col;

    // Always use the stored base name, then add the appropriate icon
    if (col === currentSort.column) {
      th.innerHTML = baseText + (currentSort.direction === "asc" ? " ↑" : " ↓");
    } else {
      th.innerHTML = baseText + " ↕";
    }
  });
}

function updateTrends() {
  if (!allMarkers.length) return;

  const ctx = document.getElementById("trend-chart").getContext("2d");
  const chartRange = document.getElementById("chart-range").value;

  let dateRange;
  if (chartRange === "custom") {
    const startDate = localStorage.getItem("chartStartDate");
    const endDate = localStorage.getItem("chartEndDate");
    if (startDate && endDate) {
      dateRange = getCustomDateRange(new Date(startDate), new Date(endDate));
    } else {
      dateRange = getDateRange(7);
    }
  } else {
    dateRange = getDateRange(parseInt(chartRange));
  }

  const levels = ["A little", "A lot", "Really bad", "unbearable"];
  const counts = {
    all: [],
    "A little": [],
    "A lot": [],
    "Really bad": [],
    unbearable: [],
  };

  dateRange.forEach((day) => {
    const dayMarkers = allMarkers.filter(
      (m) => new Date(m.createdAt).toISOString().slice(0, 10) === day
    );
    counts.all.push(dayMarkers.length);
    levels.forEach((lvl) =>
      counts[lvl].push(dayMarkers.filter((m) => m.stinkLevel === lvl).length)
    );
  });

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dateRange.map(formatDateDisplay),
      datasets: [
        {
          label: "All",
          data: counts.all,
          borderColor: "#3b82f6",
          tension: 0.1,
        },
        {
          label: "A little",
          data: counts["A little"],
          borderColor: "#10b981",
          tension: 0.1,
        },
        {
          label: "A lot",
          data: counts["A lot"],
          borderColor: "#fbbf24",
          tension: 0.1,
        },
        {
          label: "Really bad",
          data: counts["Really bad"],
          borderColor: "#f97316",
          tension: 0.1,
        },
        {
          label: "Unbearable",
          data: counts.unbearable,
          borderColor: "#ef4444",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: `Odor Reports Trend (${
            chartRange === "custom" ? "Custom Range" : chartRange + " days"
          })`,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

function getDateRange(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function getCustomDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function updateStatistics() {
  const stats = {
    total: allMarkers.length,
    today: 0,
    todayMost: "-",
    overallMost: "-",
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayMarkers = allMarkers.filter((m) => m.createdAt.startsWith(today));
  stats.today = todayMarkers.length;

  const todayCounts = countStinkLevels(todayMarkers);
  const allCounts = countStinkLevels(allMarkers);

  if (todayMarkers.length) {
    const most = getMostCommonStinkLevel(todayCounts);
    document.getElementById("common-today").textContent = most;
    document.getElementById(
      "common-today-count"
    ).textContent = `Count: ${todayCounts[most]}`;
  }

  if (allMarkers.length) {
    const mostOverall = getMostCommonStinkLevel(allCounts);
    document.getElementById("overall-common").textContent = mostOverall;
    document.getElementById(
      "overall-common-count"
    ).textContent = `Count: ${allCounts[mostOverall]}`;
  }

  // Smooth update
  animateValue("total-markers", stats.total);
  animateValue("today-markers", stats.today);
}

function animateValue(elementId, newValue) {
  const element = document.getElementById(elementId);
  const currentValue = parseInt(element.textContent) || 0;

  if (currentValue === newValue) return;

  const duration = 500;
  const stepTime = 20;
  const steps = duration / stepTime;
  const increment = (newValue - currentValue) / steps;
  let current = currentValue;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current += increment;
    if (step >= steps) {
      element.textContent = newValue;
      clearInterval(timer);
    } else {
      element.textContent = Math.round(current);
    }
  }, stepTime);
}

function countStinkLevels(markers) {
  const counts = { "A little": 0, "A lot": 0, "Really bad": 0, unbearable: 0 };
  markers.forEach(
    (m) => (counts[m.stinkLevel] = (counts[m.stinkLevel] || 0) + 1)
  );
  return counts;
}

function getMostCommonStinkLevel(counts) {
  return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
}

function updateLastUpdated() {
  const now = new Date();
  document.getElementById(
    "last-updated"
  ).textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

function downloadCSV(filter) {
  let filtered = allMarkers;
  if (filter !== "all")
    filtered = allMarkers.filter((m) => m.stinkLevel === filter);

  let csv = "lat,lng,stinkLevel,stinkDuration,comment,createdAt\n";
  filtered.forEach(
    (m) =>
      (csv += `${m.lat},${m.lng},"${m.stinkLevel}","${
        m.stinkDuration || ""
      }","${m.comment || ""}",${m.createdAt}\n`)
  );

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stinks_${filter}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showNotification(`Downloaded ${filtered.length} records`, "success");
}

function formatDateDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function setLoadingState(loading) {
  const refreshBtn = document.getElementById("refresh-btn");
  if (loading) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Loading...";
  } else {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh Data";
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    background: ${
      type === "error" ? "#fee" : type === "success" ? "#efe" : "#eef"
    };
    border: 1px solid ${
      type === "error" ? "#fcc" : type === "success" ? "#cfc" : "#ccf"
    };
    color: ${type === "error" ? "#c33" : type === "success" ? "#3c3" : "#33c"};
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function restoreChartPreferences() {
  const savedRange = localStorage.getItem("chartRange") || "7";
  document.getElementById("chart-range").value = savedRange;

  if (savedRange === "custom") {
    document.getElementById("custom-date-range").style.display = "block";
    document.getElementById("start-date").value =
      localStorage.getItem("chartStartDate") || "";
    document.getElementById("end-date").value =
      localStorage.getItem("chartEndDate") || "";
  }
}
