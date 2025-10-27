export class Drawer {
  constructor() {
    this.allStinks = [];
    this.drawer = null;
    this.drawerToggle = null;
  }

  init() {
    this.drawer = document.getElementById("drawer");
    this.drawerToggle = document.getElementById("drawer-toggle");

    if (!this.drawer || !this.drawerToggle) {
      console.warn("Drawer elements not found in DOM");
      return;
    }

    this.drawerToggle.addEventListener("click", () => {
      this.toggle();
    });
  }

  toggle() {
    if (!this.drawer) return;

    console.log("Drawer toggle clicked");
    this.drawer.classList.toggle("open");

    if (this.drawer.classList.contains("open")) {
      this.updateTrends();
      this.updateMostCommonToday();
    }
  }

  setStinksData(stinks) {
    this.allStinks = stinks;
  }

  updateTrends() {
    if (!this.allStinks || this.allStinks.length === 0) return;

    const ctx = document.getElementById("trend-chart");
    if (!ctx) return;

    const context = ctx.getContext("2d");

    // Get last 7 days
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().slice(0, 10));
    }

    // Initialize counts for each level
    const levels = ["A little", "A lot", "Really bad", "unbearable"];
    const counts = {
      all: [],
      "A little": [],
      "A lot": [],
      "Really bad": [],
      unbearable: [],
    };

    last7Days.forEach((day) => {
      let dayStinks = this.allStinks.filter(
        (s) => new Date(s.createdAt).toISOString().slice(0, 10) === day
      );
      counts.all.push(dayStinks.length);

      levels.forEach((lvl) => {
        counts[lvl].push(dayStinks.filter((s) => s.stinkLevel === lvl).length);
      });
    });

    // Destroy previous chart if exists
    if (window.trendChart) window.trendChart.destroy();

    // Draw chart
    window.trendChart = new Chart(context, {
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
            label: "A little",
            data: counts["A little"],
            borderColor: "green",
            fill: false,
            tension: 0.1,
          },
          {
            label: "A lot",
            data: counts["A lot"],
            borderColor: "yellow",
            fill: false,
            tension: 0.1,
          },
          {
            label: "Really bad",
            data: counts["Really bad"],
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

  updateMostCommonToday() {
    const today = new Date().toISOString().slice(0, 10);
    const todayStinks = this.allStinks.filter((s) =>
      s.createdAt.startsWith(today)
    );

    const header = document.querySelector("#common-section h4");
    const commonTodayElement = document.getElementById("common-today");

    if (!header || !commonTodayElement) return;

    if (todayStinks.length === 0) {
      header.textContent = "Most Common Stink Today: None";
      commonTodayElement.textContent = "No reports today";
      return;
    }

    const counts = {};
    todayStinks.forEach((s) => {
      counts[s.stinkLevel] = (counts[s.stinkLevel] || 0) + 1;
    });

    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    header.textContent = `Most Common Stink Today: ${mostCommon}`;
    commonTodayElement.textContent = `Count: ${counts[mostCommon]}`;
  }
}
