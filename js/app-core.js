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
    },
  
    // ADD THIS LINE
    buildLetterIconMeta(name) {
      const initials = OL.utils.getInitials(name);
  
      const palette = [
        "#1fd3bd", "#2563eb", "#4f46e5", "#7c3aed",
        "#db2777", "#f97316", "#84cc16", "#22c55e",
        "#06b6d4", "#0ea5e9", "#0284c7"
      ];
  
      let h = 0;
      for (let i = 0; i < initials.length; i++) {
        h = (h << 5) - h + initials.charCodeAt(i);
        h |= 0;
      }
  
      const bg = palette[Math.abs(h) % palette.length];
  
      const r = parseInt(bg.slice(1,3),16);
      const g = parseInt(bg.slice(3,5),16);
      const b = parseInt(bg.slice(5,7),16);
      const lum = 0.2126*r + 0.7152*g + 0.0722*b;
      const fg = lum > 160 ? "#111" : "#fff";
  
      return { initials, bg, fg };
    }
  };

  buildLetterIconMeta(name) {
    const initials = OL.utils.getInitials(name);
  
    const palette = [
      "#1fd3bd", "#2563eb", "#4f46e5", "#7c3aed",
      "#db2777", "#f97316", "#84cc16", "#22c55e",
      "#06b6d4", "#0ea5e9", "#0284c7"
    ];
  
    // create numeric hash
    let h = 0;
    for (let i = 0; i < initials.length; i++) {
      h = (h << 5) - h + initials.charCodeAt(i);
      h |= 0;
    }
  
    const bg = palette[Math.abs(h) % palette.length];
  
    // contrast eval for white or black text
    const r = parseInt(bg.slice(1,3),16);
    const g = parseInt(bg.slice(3,5),16);
    const b = parseInt(bg.slice(5,7),16);
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    const fg = lum > 160 ? "#111" : "#fff";
  
    return { initials, bg, fg };
  }

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
