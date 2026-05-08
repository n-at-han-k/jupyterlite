(function () {
  console.log("[bridge] loaded, parent:", window.parent !== window);
  if (window.parent === window) return;
  var params = new URLSearchParams(window.location.search);
  console.log("[bridge] path param:", params.get("path"));
  if (params.get("path")) return;

  window.addEventListener("message", function handler(e) {
    console.log("[bridge] message received:", e.data?.type);
    if (!e.data || e.data.type !== "notebook-content") return;
    window.removeEventListener("message", handler);

    var notebook = e.data.content;
    var name = e.data.name || "Untitled.ipynb";
    var now = new Date().toISOString();
    var raw = JSON.stringify(notebook);
    console.log("[bridge] saving notebook:", name, "size:", raw.length);

    var model = {
      name: name,
      path: name,
      last_modified: now,
      created: now,
      format: "json",
      mimetype: "application/x-ipynb+json",
      content: notebook,
      size: raw.length,
      type: "notebook",
      writable: true
    };

    var basePath = window.location.pathname.replace(/\/(notebooks|lab|tree)\/?.*$/, "/");
    var dbName = "JupyterLite Storage - " + basePath;
    console.log("[bridge] DB name:", dbName);

    function tryWrite() {
      var req = indexedDB.open(dbName);
      req.onsuccess = function (ev) {
        var db = ev.target.result;
        console.log("[bridge] DB opened, stores:", Array.from(db.objectStoreNames));
        if (!db.objectStoreNames.contains("keyvaluepairs")) {
          console.log("[bridge] keyvaluepairs not found, retrying...");
          db.close();
          setTimeout(tryWrite, 300);
          return;
        }
        var tx = db.transaction("keyvaluepairs", "readwrite");
        var store = tx.objectStore("keyvaluepairs");
        store.put(model, name);
        tx.oncomplete = function () {
          console.log("[bridge] saved! redirecting to ?path=" + name);
          db.close();
          window.location.search = "?path=" + encodeURIComponent(name);
        };
        tx.onerror = function (err) {
          console.error("[bridge] tx error:", err);
        };
      };
      req.onerror = function (err) {
        console.error("[bridge] DB open error:", err);
        setTimeout(tryWrite, 300);
      };
    }

    tryWrite();
  });

  console.log("[bridge] sending jupyterlite-ready");
  window.parent.postMessage({ type: "jupyterlite-ready" }, "*");
})();
