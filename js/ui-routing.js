;(() => {

  const core = window.OL;

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("load", handleRoute);

  function handleRoute() {
    const view = document.getElementById("view");
    if (!view) return;

    const route = location.hash || "#/apps";

    switch (route) {

      // ========================
      // APPS
      // ========================
      case "#/apps":
        view.innerHTML = `
          <div class="appsView">
            <div class="appsViewHeader">
              <h2>Applications</h2>
              <div id="appFilter"></div>
            </div>
            <div id="appsContainer"></div>
          </div>
        `;
        core.appFilterUI.renderAppFilterDropdown();
        core.renderApps();
        break;

      // ========================
      // FUNCTIONS
      // ========================
      case "#/apps/functions":
      case "#/functions":
        view.innerHTML = `
          <div class="functionsView">
            <div class="appsViewHeader">
              <h2>Functions</h2>
              <div id="appFilter"></div>
            </div>
            <div id="functionsContainer"></div>
          </div>
        `;
        core.appFilterUI.renderAppFilterDropdown();
        core.renderFunctions();
        break;

      // ========================
      // INTEGRATIONS MATRIX
      // ========================
      case "#/apps/tech":
      case "#/integrations":
        view.innerHTML = `
          <div class="integrationsView">
            <div class="appsViewHeader">
              <h2>Integrations</h2>
              <div id="appFilter"></div>
            </div>
            <div id="integrationsContainer"></div>
          </div>
        `;
        core.appFilterUI.renderAppFilterDropdown();
        core.renderIntegrations();
        break;

      // ========================
      // FALLBACK
      // ========================
      default:
        view.innerHTML = `
          <div class="contentFallback">
            <h2>Unknown Page</h2>
            <p>No view exists for <b>${route}</b>.</p>
          </div>
        `;
        break;
    }

    core.updateBreadcrumb(route);
  }

  // Expose API
  core.handleRoute = handleRoute;

})();
