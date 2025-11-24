;(() => {

  if (!window.OL) {
    console.error("ui-routing.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // ROUTE TABLE
  // ============================================================

  const routes = {
    "#/apps": {
      label: "/Apps",
      render: () => OL.renderApps && OL.renderApps()
    },

    "#/resources/zaps": {
      label: "/Resources / Zaps",
      render: () => setView(`<div>Zap Library (placeholder)</div>`)
    },
    "#/resources/forms": {
      label: "/Resources / Forms",
      render: () => setView(`<div>Forms Library (placeholder)</div>`)
    },
    "#/resources/workflows": {
      label: "/Resources / Workflows",
      render: () => setView(`<div>Workflows (placeholder)</div>`)
    },
    "#/resources/scheduling": {
      label: "/Resources / Scheduling",
      render: () => setView(`<div>Scheduling (placeholder)</div>`)
    },
    "#/resources/email-campaigns": {
      label: "/Resources / Email Campaigns",
      render: () => setView(`<div>Email Campaigns (placeholder)</div>`)
    },

    "#/settings/team": {
      label: "/Settings / Team",
      render: () => setView(`<div>Team Settings (placeholder)</div>`)
    },
    "#/settings/segments": {
      label: "/Settings / Segments",
      render: () => setView(`<div>Segments (placeholder)</div>`)
    },
    "#/settings/datapoints": {
      label: "/Settings / Datapoints",
      render: () => setView(`<div>Datapoint Settings (placeholder)</div>`)
    },
    "#/settings/folder-hierarchy": {
      label: "/Settings / Folder Hierarchy",
      render: () => setView(`<div>Folder Hierarchy (placeholder)</div>`)
    },
    "#/settings/naming-conventions": {
      label: "/Settings / Naming Conventions",
      render: () => setView(`<div>Naming Conventions (placeholder)</div>`)
    }
  };

  // ============================================================
  // MAIN ROUTER
  // ============================================================

  function handleRoute() {
    let hash = location.hash || "#/apps";
    let match = routes[hash];

    if (!match) {
      console.warn("Unknown route:", hash);
      hash = "#/apps";
      match = routes[hash];
      location.hash = hash;
    }

    // update breadcrumb
    OL.updateBreadcrumb(match.label);

    // update active navigation state
    setActiveNav(hash);

    // render view
    try {
      match.render();
    } catch (err) {
      console.error("Route render failed:", hash, err);
      setView(`<div style="color:#ff5d5d;">Error rendering ${hash}</div>`);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function setView(html) {
    const container = document.getElementById("view");
    if (container) container.innerHTML = html;
  }

  function setActiveNav(hash) {
    const links = document.querySelectorAll("[data-route]");
    links.forEach(a => {
      if (a.getAttribute("href") === hash) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  // ============================================================
  // EVENT
  // ============================================================

  window.addEventListener("hashchange", handleRoute);

  // initial route
  window.addEventListener("DOMContentLoaded", handleRoute);

})();
