/**
 * Bridge between parent window (Chrome extension) and JupyterLite.
 * Listens for postMessage to load notebook content into the app.
 */
(function () {
  window.addEventListener("message", async function (e) {
    if (!e.data) return;

    if (e.data.type === "notebook-content") {
      const notebook = e.data.content;
      const name = e.data.name || "Untitled.ipynb";

      // Wait for JupyterLite app to be ready
      function waitForApp() {
        return new Promise(function (resolve) {
          (function check() {
            var app = window.jupyterapp;
            if (app && app.serviceManager && app.serviceManager.contents) {
              resolve(app);
            } else {
              setTimeout(check, 200);
            }
          })();
        });
      }

      var app = await waitForApp();
      var contents = app.serviceManager.contents;

      // Save the notebook into JupyterLite's virtual filesystem
      await contents.save(name, {
        type: "notebook",
        format: "json",
        content: notebook,
      });

      // Open it
      app.commands.execute("docmanager:open", { path: name });
    }
  });

  // Tell the parent we're ready
  if (window.parent !== window) {
    window.parent.postMessage({ type: "jupyterlite-ready" }, "*");
  }
})();
