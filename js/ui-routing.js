;(() => {

  if (!window.OL) {
    console.error("ui-routing.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // VIEW MAP – matches route → element ID + render function
  // ============================================================
  const views = {
    "#/apps": {
      label: "/Apps",
      id: "view-apps",
      render: () => OL.renderApps && OL.renderApps()
    },

    "#/resources/zaps": {
      label: "/Resources / Zaps",
      id: "view-zaps",
      render: () => setHTML("view-zaps", "<div>Zap Library (placeholder)</div>")
    },

    "#/resources/forms": {
      label: "/Resources / Forms",
      id: "view-forms",
      render: () => setHTML("view-forms", "<div>Forms Library (placeholder)</div>")
    },

    "#/resources/workflows": {
      label: "/Resources / Workflows",
      id: "view-workflows",
      render: () => setHTML("view-workflows", "<div>Workflows (placeholder)</div>")
    },

    "#/resources/scheduling": {
      label: "/Resources / Scheduling",
      id: "view-scheduling",
      render: () => setHTML("view-scheduling", "<div>Scheduling (placeholder)</div>")
    },

    "#/resources/email-campaigns": {
      label: "/Resources / Email Campaigns",
      id: "view-email",
      render: () => setHTML("view-email", "<div>Email Campaigns (placeholder)</div>")
    },

    "#/settings/team": {
      label: "/Settings / Team",
      id: "view-team",
      render: () => setHTML("view-team", "<div>Team Settings (placeholder)</div>")
    },

    "#/settings/segments": {
      label: "/Settings / Segments",
      id: "view-segments",
      render: () => setHTML("view-segments", "<div>Segments (placeholder)</div>")
    },

    "#/settings/datapoints": {
      label: "/Settings / Datapoints",
      id: "view-datapoints",
      render: () => setHTML("view-datapoints", "<div>Datapoint Settings (placeholder)</div>")
    },

    "#/settings/folder-hierarchy": {
      label: "/Settings / Folder Hierarchy",
      id: "view-folders",
      render: () => setHTML("view-folders", "<div>Folder Hierarchy (placeholder)</div>")
    },

    "#/settings/naming-conventions": {
      label: "/Settings / Naming Conventions",
      id: "view-naming",
      render: () => setHTML("view-naming", "<div>Naming Conventions (placeholder)</div>")
    }
  };

  // ============================================================
  // HANDLE ROUTES
  // ============================================================
  function handleRoute() {
    let hash = location.hash || "#/apps";
    let view = views[hash];

    if (!view) {
      console.warn("Unknown route:", hash);
      hash = "#/apps";
      view = views[hash];
      location.hash = hash;
    }

    // Update breadcrumb
    OL.updateBreadcrumb(view.label);

    // Update active navigation state
    setActiveNav(hash);

    // Swap visible views
    showView(view.id);

    // Render into the specific view container
    try {
      view.render();
    } catch (err) {
      console.error("Route render failed:", hash, err);
      setHTML(view.id, `<div style="color:#ff5d5d;">Error rendering ${hash}</div>`);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function showView(idToShow) {
    document.querySelectorAll(".view").forEach(v => {
      v.style.display = v.id === idToShow ? "block" : "none";
    });
  }

  function setActiveNav(hash) {
    const links = document.querySelectorAll("[data-route]");
    links.forEach(a => {
      a.classList.toggle("active", a.getAttribute("href") === hash);
    });
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("DOMContentLoaded", handleRoute);

})();
