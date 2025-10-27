export class MarkerForm {
  constructor(map, { onSave, showToast }) {
    this.map = map;
    this.onSave = onSave;
    this.showToast = showToast;
    this.tempMarker = null;
    this.infoWindow = null;
  }

  show(position) {
    this.hide(); // Clean up any existing form

    this.tempMarker = this._createTempMarker(position);
    this.infoWindow = new google.maps.InfoWindow({
      content: this._buildFormHTML(),
      position: position,
    });

    this.infoWindow.open(this.map, this.tempMarker);
    this._attachEventListeners(position);
  }

  hide() {
    if (this.infoWindow) {
      this.infoWindow.close();
      this.infoWindow = null;
    }
    if (this.tempMarker) {
      this.tempMarker.setMap(null);
      this.tempMarker = null;
    }
  }

  _createTempMarker(position) {
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

    return new google.maps.marker.AdvancedMarkerElement({
      position: position,
      map: this.map,
      content: circle,
    });
  }

  _buildFormHTML() {
    return `
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
  }

  _attachEventListeners(position) {
    google.maps.event.addListener(this.infoWindow, "closeclick", () => {
      this.hide();
    });

    google.maps.event.addListenerOnce(this.infoWindow, "domready", () => {
      document.getElementById("save-marker").addEventListener("click", (e) => {
        this._handleSave(e, position);
      });

      document.getElementById("cancel-marker").addEventListener("click", () => {
        this.hide();
      });
    });
  }

  async _handleSave(event, position) {
    event.preventDefault();

    const stinkLevel = document.getElementById("stink-meter").value;
    const stinkDuration = document.getElementById("stink-duration").value;
    const userComment = document.getElementById("marker-notes").value.trim();

    this.hide();

    const lat =
      typeof position.lat === "function" ? position.lat() : position.lat;
    const lng =
      typeof position.lng === "function" ? position.lng() : position.lng;

    try {
      const blocked = await this.onSave(
        lat,
        lng,
        stinkLevel,
        stinkDuration,
        userComment
      );

      if (!blocked) {
        // Only create the colored marker when the save is allowed
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
          map: this.map,
          content: circle,
          title: stinkLevel,
        });

        this.showToast("Marker added successfully!");
      }
    } catch (error) {
      console.error("Error saving marker:", error);
    }
  }
}

export function getMarkerColor(stinkLevel) {
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
