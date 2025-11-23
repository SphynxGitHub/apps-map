;(() => {
  // ============================================================
  //  SIMPLE STORE (localStorage wrapper)
  // ============================================================
  const store = {
    get(key, defVal) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? defVal : JSON.parse(raw);
      } catch (e) {
        console.warn('store.get failed', key, e);
        return defVal;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        console.warn('store.set failed', key, e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('store.remove failed', key, e);
      }
    }
  };

  // ============================================================
  //  SMALL UTILITIES
  // ============================================================
  function uid() {
    return 'id_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dedupe(arr) {
    return Array.from(new Set(arr || []));
  }

  // basic debounce so autosave doesn’t spam
  function debounce(fn, ms) {
    let t;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ============================================================
  //  LETTER ICON GENERATION
  // ============================================================

  // Extract "CA" / "GS" / "WB" style initials
  function getInitials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';

    if (parts.length === 1) {
      const w = parts[0];
      if (w.length === 1) return w[0].toUpperCase();
      return (w[0] + w[1]).toUpperCase();
    }

    // multi-word → first two words’ initials
    const first = parts[0][0] || '';
    const second = parts[1][0] || '';
    return (first + second).toUpperCase();
  }

  // Simple hash string → 0..n
  function hashString(str) {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // Diverse color palette for auto-icons
  const ICON_COLORS = [
    '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#e11d48',
    '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#0284c7', '#6366f1', '#8b5cf6',
    '#ec4899', '#f43f5e', '#fb923c', '#facc15', '#a3e635',
    '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#a855f7',
    '#f472b6', '#fb7185', '#cbd5f5', '#94a3b8'
  ];

  function getAutoIconColor(name) {
    const h = hashString(name || '');
    return ICON_COLORS[h % ICON_COLORS.length];
  }

  function isColorLight(hex) {
    // hex like #rrggbb
    if (!/^#([0-9a-f]{6})$/i.test(hex)) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // relative luminance approximation
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return l > 190;
  }

  function buildLetterIconMeta(name) {
    const initials = getInitials(name || '?');
    const bg = getAutoIconColor(name || '');
    const fg = isColorLight(bg) ? '#111111' : '#ffffff';
    return { initials, bg, fg };
  }

  // ============================================================
  //  BASE STATE (SCHEMA, WITH LIGHT DEFAULTS)
  // ============================================================

  const defaultApps = [
    {
      id: uid(),
      name: 'Calendly',
      notes: 'Client scheduling links for prospect + review meetings.',
      needsFilter: true,
      functions: ['Scheduler'],
      icon: { type: 'emoji', value: '📅' },
      datapointMappings: [
        { id: uid(), datapoint: 'First Name', inbound: 'Invitee First', outbound: '' },
        { id: uid(), datapoint: 'Last Name',  inbound: 'Invitee Last',  outbound: '' },
        { id: uid(), datapoint: 'Email',      inbound: 'Invitee Email', outbound: '' }
      ]
    },
    {
      id: uid(),
      name: 'ScheduleOnce',
      notes: 'Legacy scheduler; may be deprecated.',
      needsFilter: true,
      functions: ['Scheduler'],
      icon: { type: 'emoji', value: '🗓' },
      datapointMappings: []
    },
    {
      id: uid(),
      name: 'Wealthbox',
      notes: '',
      needsFilter: false,
      functions: ['CRM', 'Pipeline Management', 'Task Management'],
      icon: { type: 'emoji', value: '📇' },
      datapointMappings: []
    }
  ];

  const FUNCTION_TYPES_SEED = [
    'Automation','Billing / Invoicing','Bookkeeping','Calendar','CRM','Custodian / TAMP',
    'Data Aggregation','Data Gathering','eSignature','Email','Email Marketing',
    'File Sharing / Document Storage','Financial Planning','Lead Generation','Mind Mapping',
    'Notes Storage','Office Suite','Other Financial','Password Manager','Phone / Text',
    'Pipeline Management','Project Management','Risk Tolerance','Scheduler','Task Management',
    'Tax Planning','Tax Prep','Time Tracking','Transcription','Video Conferencing',
    'Video Recording','Website','Other'
  ];

  // state object; modules will access via window.OL.state
  const state = {
    // core collections
    apps: store.get('apps', defaultApps),
    functions: store.get(
      'functions',
      FUNCTION_TYPES_SEED.map(t => ({ id: uid(), name: t, type: t }))
    ),
    functionAssignments: store.get('functionAssignments', []),
    integrationsMatrix: store.get('integrationsMatrix', []),
    integrationPatterns: store.get('integrationPatterns', []),

    // resources
    zaps: store.get('zaps', []),
    forms: store.get('forms', []),
    workflows: store.get('workflows', []),
    scheduling: store.get('scheduling', []),
    emailCampaigns: store.get('emailCampaigns', []),
    emailTemplates: store.get('emailTemplates', []),

    // settings
    teamMembers: store.get('teamMembers', [
      { id: uid(), name: 'Arielle', roleNotes: '', roles: ['Managing Partner'] }
    ]),
    roles: store.get('roles', ['Managing Partner', 'Advisor', 'Client Service Specialist']),
    segments: store.get('segments', ['Prospects', 'Paid AUM', 'Hourly', 'Pro Bono']),
    datapoints: store.get('datapoints', ['First Name','Last Name','Email','Domain','Household','householdName']),

    naming: store.get('naming', {
      household: {
        individual: '{Last}, {First}',
        jointSame: '{Last}, {First} & {PartnerFirst}',
        jointDifferent: '{Last}, {First} & {PartnerLast}, {PartnerFirst}'
      },
      folder: {
        individual: '{householdName}',
        jointSame: '{householdName}',
        jointDifferent: '{householdName}'
      }
    }),

    folderHierarchy: store.get('folderHierarchy',
`Clients/
  {householdName}/
    Meetings/
    Documents/
    Statements/`),

    folderPreviewSamples: store.get('folderPreviewSamples', {
      First: 'Alex', Last: 'Taylor', PartnerFirst: 'Jordan', PartnerLast: 'Taylor',
      householdName: 'Taylor, Alex & Jordan'
    }),

    stepTemplates: store.get('stepTemplates', [
      { id: uid(), type: 'Schedule Meeting',   title: 'Schedule {Meeting Type}',   notes: 'Send link; confirm agenda; share pre-reads', checklist: ['Send link','Confirm agenda','Attach docs'] },
      { id: uid(), type: 'Pre-Meeting Prep',   title: 'Prep for {Meeting Type}',   notes: 'Review CRM notes; prep questions; confirm objectives', checklist: ['Review notes','Prep questions','Confirm objectives'] },
      { id: uid(), type: 'Conduct Meeting',    title: 'Conduct {Meeting Type}',    notes: 'Run agenda; capture decisions; assign owners', checklist: ['Run agenda','Capture decisions','Assign owners'] },
      { id: uid(), type: 'Post-Meeting Prep',  title: 'Post-Meeting Prep',         notes: 'Clean notes; draft recap; create tasks', checklist: ['Clean notes','Draft recap','Create tasks'] },
      { id: uid(), type: 'Conduct Phone Call', title: 'Call: {Topic}',             notes: 'Short agenda; confirm outcomes; log notes', checklist: ['Agenda','Outcomes','Log notes'] },
      { id: uid(), type: 'Send Email',         title: 'Email: {Subject}',          notes: 'Draft subject; bullets; CTA', checklist: ['Subject','Bullets','CTA'] },
      { id: uid(), type: 'Send Text Message',  title: 'Text: {Context}',           notes: 'Short copy; include link if needed', checklist: ['Short copy','Optional link'] },
      { id: uid(), type: 'Request Item',       title: 'Request: {Item Name}',      notes: 'Specify format; due date; upload location', checklist: ['Format','Due date','Upload link'] },
      { id: uid(), type: 'Follow Up',          title: 'Follow Up: {Topic}',        notes: 'Reference context; restate ask; next step', checklist: ['Context','Ask','Next step'] },
      { id: uid(), type: 'Item Received',      title: 'Item Received: {Item}',     notes: 'Verify completeness; file docs; notify', checklist: ['Verify','File','Notify'] },
      { id: uid(), type: 'Task',               title: 'Task: {What}',              notes: 'Atomic action; definition of done; owner', checklist: ['Define done','Assign owner'] }
    ]),

    pricing: store.get('pricing', { zapStep: 80, emailStep: 80, schedulerPage: 125, otherHourly: 300 }),

    // view modes
    appsViewMode: store.get('appsViewMode', 'details'),
    functionsViewMode: store.get('functionsViewMode', 'details'),
    integrationsViewMode: store.get('integrationsViewMode', 'details'),

    // collapses / filters (these will be used by modules)
    functionsCollapsed: store.get('functionsCollapsed', false),
    functionsFilterAppId: store.get('functionsFilterAppId', ''),

    // transient cross-refs (rebuilt as needed)
    _refs: { resources: {}, datapoints: {} }
  };

  // ============================================================
  //  EVENT BUS (simple pub/sub for modules)
  // ============================================================
  const listeners = new Set();

  function on(event, fn) {
    if (!fn) return;
    listeners.add({ event, fn });
  }

  function off(fn) {
    for (const l of Array.from(listeners)) {
      if (l.fn === fn) listeners.delete(l);
    }
  }

  function emit(event, payload) {
    for (const l of listeners) {
      if (l.event === event) {
        try { l.fn(payload); } catch (e) { console.error('listener failed', e); }
      }
    }
  }

  // ============================================================
  //  PERSIST LAYERS
  // ============================================================
  function saveAllToStore() {
    store.set('apps', state.apps);
    store.set('functions', state.functions);
    store.set('functionAssignments', state.functionAssignments);
    store.set('integrationsMatrix', state.integrationsMatrix);
    store.set('integrationPatterns', state.integrationPatterns);

    store.set('zaps', state.zaps);
    store.set('forms', state.forms);
    store.set('workflows', state.workflows);
    store.set('scheduling', state.scheduling);
    store.set('emailCampaigns', state.emailCampaigns);
    store.set('emailTemplates', state.emailTemplates);

    store.set('teamMembers', state.teamMembers);
    store.set('roles', state.roles);
    store.set('segments', state.segments);
    store.set('datapoints', state.datapoints);

    store.set('naming', state.naming);
    store.set('folderHierarchy', state.folderHierarchy);
    store.set('folderPreviewSamples', state.folderPreviewSamples);
    store.set('stepTemplates', state.stepTemplates);
    store.set('pricing', state.pricing);

    store.set('appsViewMode', state.appsViewMode);
    store.set('functionsViewMode', state.functionsViewMode);
    store.set('integrationsViewMode', state.integrationsViewMode);

    store.set('functionsCollapsed', state.functionsCollapsed);
    store.set('functionsFilterAppId', state.functionsFilterAppId);
  }

  const persist = debounce(() => {
    saveAllToStore();
    emit('state:changed', state);
  }, 200);

  // ============================================================
  //  PUBLIC API (GLOBAL)
  // ============================================================
  const OL = {
    state,
    store,
    persist,
    on,
    off,
    emit,
    utils: {
      uid,
      esc,
      dedupe,
      getInitials,
      buildLetterIconMeta
    }
  };

  // expose globally
  window.OL = OL;
})();
