// ===============================================
// APP STATE MANAGEMENT (PERSISTENCE + MIGRATION)
// ===============================================

const AppState = (() => {
  const LS_KEY = "operationsLibraryState_v1";

  // Base shape – keep every field your app expects
  let state = {
    apps: [],
    functions: [],
    functionAssignments: [],
    integrationsMatrix: [],
    integrationPatterns: [],
    zaps: [],
    forms: [],
    workflows: [],
    scheduling: [],
    emailCampaigns: [],
    emailTemplates: [],
    teamMembers: [],
    roles: [],
    segments: [],
    datapoints: [],
    naming: {},
    folderHierarchy: "",
    folderPreviewSamples: {},
    stepTemplates: [],
    pricing: { zapStep: 80, emailStep: 80, schedulerPage: 125, otherHourly: 300 },
    appsViewMode: "details",
    functionsViewMode: "details",
    integrationsViewMode: "details",
    _refs: { resources: {}, datapoints: {} },

    // NEW
    icons: [],        // global icon library {id,type,value,label}
    _initialized: false,
    version: 3
  };

  // ---------- UID ----------
  function uid(prefix = "id") {
    return (
      prefix +
      "_" +
      Math.random().toString(36).substring(2, 8) +
      Date.now().toString(36)
    );
  }

  // ---------- Helpers ----------
  function safeParse(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // ---------- Legacy loader (old multi-key storage) ----------
  function loadFromLegacyKeys() {
    // If your old script wrote to these keys, we import them once
    const legacyApps = safeParse("apps");
    const legacyFunctions = safeParse("functions");
    const legacyFunctionAssignments = safeParse("functionAssignments");
    const legacyIntegrations = safeParse("integrationsMatrix");
    const legacyIntegrationPatterns = safeParse("integrationPatterns");
    const legacyZaps = safeParse("zaps");
    const legacyForms = safeParse("forms");
    const legacyWorkflows = safeParse("workflows");
    const legacyScheduling = safeParse("scheduling");
    const legacyEmailCampaigns = safeParse("emailCampaigns");
    const legacyEmailTemplates = safeParse("emailTemplates");
    const legacyTeamMembers = safeParse("teamMembers");
    const legacyRoles = safeParse("roles");
    const legacySegments = safeParse("segments");
    const legacyDatapoints = safeParse("datapoints");
    const legacyNaming = safeParse("naming");
    const legacyFolderHierarchy = localStorage.getItem("folderHierarchy");
    const legacyFolderPreviewSamples = safeParse("folderPreviewSamples");
    const legacyStepTemplates = safeParse("stepTemplates");
    const legacyAppsViewMode = localStorage.getItem("appsViewMode");
    const legacyFunctionsViewMode = localStorage.getItem("functionsViewMode");
    const legacyIntegrationsViewMode = localStorage.getItem("integrationsViewMode");

    if (legacyApps) state.apps = legacyApps;
    if (legacyFunctions) state.functions = legacyFunctions;
    if (legacyFunctionAssignments) state.functionAssignments = legacyFunctionAssignments;
    if (legacyIntegrations) state.integrationsMatrix = legacyIntegrations;
    if (legacyIntegrationPatterns) state.integrationPatterns = legacyIntegrationPatterns;
    if (legacyZaps) state.zaps = legacyZaps;
    if (legacyForms) state.forms = legacyForms;
    if (legacyWorkflows) state.workflows = legacyWorkflows;
    if (legacyScheduling) state.scheduling = legacyScheduling;
    if (legacyEmailCampaigns) state.emailCampaigns = legacyEmailCampaigns;
    if (legacyEmailTemplates) state.emailTemplates = legacyEmailTemplates;
    if (legacyTeamMembers) state.teamMembers = legacyTeamMembers;
    if (legacyRoles) state.roles = legacyRoles;
    if (legacySegments) state.segments = legacySegments;
    if (legacyDatapoints) state.datapoints = legacyDatapoints;
    if (legacyNaming) state.naming = legacyNaming;
    if (legacyFolderHierarchy) state.folderHierarchy = legacyFolderHierarchy;
    if (legacyFolderPreviewSamples) state.folderPreviewSamples = legacyFolderPreviewSamples;
    if (legacyStepTemplates) state.stepTemplates = legacyStepTemplates;
    if (legacyAppsViewMode) state.appsViewMode = legacyAppsViewMode;
    if (legacyFunctionsViewMode) state.functionsViewMode = legacyFunctionsViewMode;
    if (legacyIntegrationsViewMode) state.integrationsViewMode = legacyIntegrationsViewMode;
  }

  // ---------- Load ----------
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        // No bundled state yet – try to import from old per-key storage
        loadFromLegacyKeys();
        migrateIfNeeded();
        persist();
        return;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        console.warn("Invalid state payload, resetting.");
        persist();
        return;
      }

      // Preserve base shape and overlay parsed
      state = Object.assign({}, state, parsed);
      migrateIfNeeded();
    } catch (e) {
      console.error("State load error — resetting clean.", e);
      persist();
    }
  }

  // ---------- Migration ----------
  function migrateIfNeeded() {
    let changed = false;
    const v = state.version || 1;

    // v1 → v2: add iconId + brandColor stub to apps, build icons library
    if (v < 2) {
      if (!Array.isArray(state.icons)) state.icons = [];
      (state.apps || []).forEach(app => {
        if (app.icon && typeof app.icon === "object") {
          const normalized = normalizeLegacyIcon(app.icon);
          if (normalized) {
            const iconId = addIconToLibrary(normalized);
            app.iconId = iconId;
          } else {
            app.iconId = "";
          }
          delete app.icon;
          changed = true;
        } else if (typeof app.iconId === "undefined") {
          app.iconId = "";
          changed = true;
        }
        if (typeof app.brandColor === "undefined") {
          app.brandColor = null;
          changed = true;
        }
      });
      state.version = 2;
    }

    // v2 → v3: normalize integrations as symmetric pairs
    if (v < 3) {
      if (!Array.isArray(state.integrationsMatrix)) {
        state.integrationsMatrix = [];
      } else {
        state.integrationsMatrix = normalizeIntegrations(state.integrationsMatrix);
      }
      state.version = 3;
      changed = true;
    }

    if (!state._refs || typeof state._refs !== "object") {
      state._refs = { resources: {}, datapoints: {} };
      changed = true;
    }

    if (changed) persist();
  }

  // ---------- Icon migration helper ----------
  function normalizeLegacyIcon(icon) {
    if (!icon) return null;

    // Old shape: { type:'emoji'|'image', value: '...' }
    if (icon.type && icon.value) {
      return {
        type: icon.type,
        value: icon.value,
        label: icon.label || "legacy"
      };
    }

    if (typeof icon === "string") {
      // crude emoji detection
      const emojiRegex = /^[\u2190-\u2BFF\u{1F300}-\u{1FAFF}]+$/u;
      if (emojiRegex.test(icon)) {
        return { type: "emoji", value: icon, label: "legacy-emoji" };
      }
      return { type: "image", value: icon, label: "legacy-image" };
    }

    return null;
  }

  function addIconToLibrary(iconObj) {
    if (!iconObj) return "";
    const existing = (state.icons || []).find(
      i => i.type === iconObj.type && i.value === iconObj.value
    );
    if (existing) return existing.id;
    const id = uid("icon");
    state.icons.push({ id, ...iconObj });
    return id;
  }

  // ---------- Integrations normalization ----------
  function normalizeIntegrations(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    const seen = new Set();

    list.forEach(pair => {
      const appAId = pair.appAId || pair.app1 || pair.app_a || pair.a;
      const appBId = pair.appBId || pair.app2 || pair.app_b || pair.b;
      if (!appAId || !appBId || appAId === appBId) return;

      const [A, B] = appAId < appBId ? [appAId, appBId] : [appBId, appAId];
      const key = `${A}::${B}`;
      if (seen.has(key)) return;
      seen.add(key);

      out.push({
        id: pair.id || uid("int"),
        appAId: A,
        appBId: B,
        hasDirect: !!pair.hasDirect,
        hasZapier: !!pair.hasZapier,
        directNotes: Array.isArray(pair.directNotes) ? pair.directNotes : [],
        zapierNotes: Array.isArray(pair.zapierNotes) ? pair.zapierNotes : []
      });
    });

    return out;
  }

  // ---------- Persist ----------
  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("STATE SAVE FAILED — possible localStorage limit.", e);
    }
  }

  // ---------- Public API ----------
  function getState() {
    return state;
  }

  function updateState(updater) {
    if (typeof updater === "function") {
      updater(state);
      persist();
    }
  }

  // Initialize immediately
  load();

  return {
    getState,
    updateState,
    persist,
    uid,
    addIconToLibrary
  };
})();
