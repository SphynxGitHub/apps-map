;(() => {

  // ============================================================
  // GLOBAL OBJECT (canonical namespace)
  // ============================================================
  const OL = {};
  window.OL = OL;

  // ============================================================
  //  STORE (localStorage)
  // ============================================================
  OL.store = {
    get(key, defVal) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? defVal : JSON.parse(raw);
      } catch {
        return defVal;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  };

  // ============================================================
  //  UTILS
  // ============================================================
  OL.utils = {
    uid() {
      return 'id_' + Math.random().toString(36).slice(2, 10);
    },
    esc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    debounce(fn, ms) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    },
    getInitials(name) {
      if (!name) return '?';
      const p = name.trim().split(/\s+/);
      if (p.length === 1) return p[0][0]?.toUpperCase() ?? '?';
      return (p[0][0] + p[1][0]).toUpperCase();
    }
  };

  const { uid } = OL.utils;

  // ============================================================
  // DEFAULT DATA
  // ============================================================
  const defaultApps = [
    { id: uid(), name: 'Calendly', notes: '', icon: null, functions: [], integrations: [], datapointMappings: [] },
    { id: uid(), name: 'Wealthbox', notes: '', icon: null, functions: [], integrations: [], datapointMappings: [] }
  ];

  const defaultFunctionTypes = [
    'CRM','Scheduler','Email','File Sharing / Document Storage','Automation','Pipeline Management','Financial Planning'
  ].map(name => ({ id: uid(), name }));

  // ============================================================
  // STATE
  // ============================================================
  OL.state = {
    apps: OL.store.get('apps', defaultApps),
    functions: OL.store.get('functions', defaultFunctionTypes),
    appsViewMode: OL.store.get('appsViewMode', 'details'),
    integrationsViewMode: OL.store.get('integrationsViewMode', 'flip')
  };

  // ============================================================
  // PERSIST
  // ============================================================
  OL.persist = OL.utils.debounce(() => {
    OL.store.set('apps', OL.state.apps);
    OL.store.set('functions', OL.state.functions);
    OL.store.set('appsViewMode', OL.state.appsViewMode);
    OL.store.set('integrationsViewMode', OL.state.integrationsViewMode);
  }, 200);

  // ============================================================
  // BREADCRUMB
  // ============================================================
  OL.updateBreadcrumb = function (label) {
    const el = document.getElementById("crumbs");
    if (el) el.textContent = label;
  };

})();
