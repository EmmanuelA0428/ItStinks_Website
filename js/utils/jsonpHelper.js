export function jsonp(url, callback) {
  const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
  const script = document.createElement("script");

  // ✅ Add callback + unique timestamp to avoid Safari caching
  const separator = url.includes("?") ? "&" : "?";
  script.src = `${url}${separator}callback=${callbackName}&t=${Date.now()}`;

  // ✅ Define global callback
  window[callbackName] = function (data) {
    try {
      callback(data);
    } finally {
      // Cleanup safely
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
  };

  // ✅ Handle script loading errors
  script.onerror = function () {
    console.error("JSONP request failed:", script.src);
    callback({ success: false, error: "Failed to load JSONP response" });
    delete window[callbackName];
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  };

  // ✅ Append script to DOM
  document.body.appendChild(script);
}
