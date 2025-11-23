// ===============================================
// APP STATE MANAGEMENT
// ===============================================

const AppState = (() => {

  // -----------------------------------------------
  // INTERNAL STATE (LIVE)
  // -----------------------------------------------
  let state = {
    apps: [],
    functions: [],
    datapoints: [],
    integrations: [],
    icons: [],     // NEW — global icon library
    version: 3     // increment when schema evolves
  };

  // -----------------------------------------------
  // STORAGE KEY
  // -----------------------------------------------
  const LS_KEY = "automationAppState";

  // -----------------------------------------------
  // LOAD STATE WITH MIGRATION + VALIDATION
  // -----------------------------------------------
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        console.warn("No existing state — creating fresh store.");
        persist();
        return;
      }
      const parsed = JSON.parse(raw);

      // Validate structure — fail safe
      if (!parsed.apps || !parsed.functions) {
        console.warn("Corrupt or incomplete state — resetting.");
        persist();
        return;
      }

      state = parsed;

      migrateIfNeeded();
    } catch (e) {
      console.error("State load error — resetting CLEAN.", e);
      persist();
    }
  }

  // -----------------------------------------------
  // MIGRATION HANDLER
  // -----------------------------------------------
  function migrateIfNeeded() {
    let changed = false;
    const v = state.version || 1;

    // MIGRATION: add iconId + brandColor to apps
    if (v < 2) {
      state.apps.forEach(app => {
        if (app.icon && typeof app.icon === "object") {
          const iconObj = normalizeLegacyIcon(app.icon);
          const newId = addIconToGlobalLibrary(iconObj);
          app.iconId = newId;
          delete app.icon;
          changed = true;
        } else if (!app.iconId) {
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

    // MIGRATION: normalize integrations for symmetric pairing
    if (v < 3) {
      state.integrations = normalizeIntegrations(state.integrations);
      state.version = 3;
      changed = true;
    }

    if (changed) persist();
  }

  // -----------------------------------------------
  // NORMALIZE LEGACY ICON FORMAT
  // -----------------------------------------------
  function normalizeLegacyIcon(icon) {
    if (!icon) return null;

    // old styles handled:
    // icon:{type:"emoji",value:"📅"}
    // icon:{url:"https:.."}
    // icon: "📅"

    if (typeof icon === "string") {
      if (icon.match(/^[\u2190-\u2BFF\u{1F300}-\u{1FAFF}]+$/u)) {
        return { type:"emoji", value:icon, label:"emoji" };
      }
      return { type:"image", value:icon, label:"imported" };
    }

    if (icon.type && icon.value)
      return { type:icon.type, value:icon.value, label:icon.label || "icon" };

    return null;
  }

  // -----------------------------------------------
  // ADD ICON TO GLOBAL LIBRARY — deduped
  // -----------------------------------------------
  function addIconToGlobalLibrary(iconObj) {
    if (!iconObj) return "";

    const existing = state.icons.find(i => i.type === iconObj.type && i.value === iconObj.value);
    if (existing) return existing.id;

    const id = uid("icon");
    state.icons.push({ id, ...iconObj });
    return id;
  }

  // -----------------------------------------------
  // NORMALIZE INTEGRATIONS TO SYMMETRIC
  // -----------------------------------------------
  function normalizeIntegrations(oldList = []) {
    const newList = [];
    const seen = new Set();

    oldList.forEach(int => {
      const A = int.appAId;
      const B = int.appBId;
      if (!A || !B || A === B) return;

      const key = A < B ? `${A}::${B}` : `${B}::${A}`;
      if (seen.has(key)) return;
      seen.add(key);

      newList.push({
        appAId: A < B ? A : B,
        appBId: A < B ? B : A,
        hasDirect: !!int.hasDirect,
        hasZapier: !!int.hasZapier,
        directNotes: int.directNotes || "",
        zapierNotes: int.zapierNotes || ""
      });
    });

    return newList;
  }

  // -----------------------------------------------
  // ID GENERATOR
  // -----------------------------------------------
  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
  }

  // -----------------------------------------------
  // SAVE STATE
  // -----------------------------------------------
  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("STATE SAVE FAILED — localStorage full?", e);
    }
  }

  // -----------------------------------------------
  // PUBLIC GETTERS
  // -----------------------------------------------
  function getState() {
    return state;
  }

  // -----------------------------------------------
  // PUBLIC UPDATERS
  // -----------------------------------------------
  function updateState(patchFn) {
    patchFn(state);
    persist();
  }

  // -----------------------------------------------
  // INIT
  // -----------------------------------------------
  load();

  // -----------------------------------------------
  // PUBLIC API
  // -----------------------------------------------
  return {
    getState,
    updateState,
    persist,
    uid,
    addIconToGlobalLibrary,
  };
})();
