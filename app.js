;(() => {
  // ---------- Simple key/value store helpers ----------
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
  };

  // ---------- Constants ----------
  const FUNCTION_TYPES_SEED = [
    "Automation","Billing / Invoicing","Bookkeeping","Calendar","CRM","Custodian / TAMP",
    "Data Aggregation","Data Gathering","eSignature","Email","Email Marketing",
    "File Sharing / Document Storage","Financial Planning","Lead Generation","Mind Mapping",
    "Notes Storage","Office Suite","Other Financial","Password Manager","Phone / Text",
    "Pipeline Management","Project Management","Risk Tolerance","Scheduler","Task Management",
    "Tax Planning","Tax Prep","Time Tracking","Transcription","Video Conferencing",
    "Video Recording","Website","Other"
  ];

  const FUNCTION_LEVELS = ["primary","available","evaluating"];

  // Color helpers for functions
  const FN_LEVEL_COLORS = {
    primary:   "#a855f7", // purple
    available: "#0f172a", // near black
    evaluating:"#6b7280" // grey
  };

  // Color helpers for integrations
  const INTEG_COLORS = {
    direct: "#3b82f6", // blue
    zapier: "#facc15", // yellow
    both:   "#22c55e"  // green
  };

  // ---------- Utils ----------
  function $(sel, el = document) { return el.querySelector(sel); }
  function $all(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }
  function uid() { return 'id_' + Math.random().toString(36).slice(2, 9); }
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  function dedupe(arr) { return Array.from(new Set(arr)); }
  function findById(arr, id) { return (arr || []).find(x => x.id === id); }
  function tokensIn(text) {
    const out = [];
    String(text || '').replace(/\{([A-Za-z0-9_ ]+)\}/g, (_, k) => { out.push(k); return _; });
    return out;
  }

  // ---------- State ----------
  let state = {
    apps: store.get('apps', [
      {
        id: uid(),
        name:'Calendly',
        notes:'Client scheduling links for prospect + review meetings.',
        needsFilter:true,
        functions:["Scheduler"],
        icon:{ type:'emoji', value:'📅' },
        datapointMappings:[
          { id: uid(), datapoint:'First Name', inbound:'Invitee First', outbound:'' },
          { id: uid(), datapoint:'Last Name',  inbound:'Invitee Last',  outbound:'' },
          { id: uid(), datapoint:'Email',      inbound:'Invitee Email', outbound:'' }
        ]
      },
      {
        id: uid(),
        name:'ScheduleOnce',
        notes:'Legacy scheduler; may be deprecated.',
        needsFilter:true,
        functions:["Scheduler"],
        icon:{ type:'emoji', value:'🗓' },
        datapointMappings:[]
      },
      {
        id: uid(),
        name:'Wealthbox',
        notes:'',
        needsFilter:false,
        functions:["CRM","Pipeline Management","Task Management"],
        icon:{ type:'emoji', value:'📇' },
        datapointMappings:[]
      },
    ]),

    // Functions catalog – we now only care about name; type is legacy
    functions: store.get(
      'functions',
      FUNCTION_TYPES_SEED.map(t => ({ id: uid(), name: t, type: t }))
    ),

    // Function ↔ App level assignments
    // each: { id, functionId, appId, level: 'primary'|'available'|'evaluating' }
    functionAssignments: store.get('functionAssignments', []),

    // Integrations Matrix: app pair relationships
    // each: { id, appAId, appBId, hasDirect, hasZapier, directNotes:[], zapierNotes:[] }
    integrationsMatrix: store.get('integrationsMatrix', []),

    // Reusable integration descriptions
    integrationPatterns: store.get('integrationPatterns', []), // [{id,text}]

    // Resources
    zaps: store.get('zaps', []),
    forms: store.get('forms', []),
    workflows: store.get('workflows', []),
    scheduling: store.get('scheduling', []),
    emailCampaigns: store.get('emailCampaigns', []),
    emailTemplates: store.get('emailTemplates', []),

    // Settings
    teamMembers: store.get('teamMembers', [
      { id: uid(), name:'Arielle', roleNotes:'', roles: ['Managing Partner'] }
    ]),
    roles: store.get('roles', ['Managing Partner','Advisor','Client Service Specialist']),
    segments: store.get('segments', ['Prospects','Paid AUM','Hourly','Pro Bono']),
    // For now datapoints are simple strings; we’ll treat them flexibly
    datapoints: store.get('datapoints', ['First Name','Last Name','Email','Domain','Household','householdName']),

    naming: store.get('naming', {
      household: {
        individual: '{Last}, {First}',
        jointSame: '{Last}, {First} & {PartnerFirst}',
        jointDifferent: '{Last}, {First} & {PartnerLast}, {PartnerFirst}',
      },
      folder: {
        individual: '{householdName}',
        jointSame: '{householdName}',
        jointDifferent: '{householdName}',
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
      { id: uid(), type:'Schedule Meeting',    title:'Schedule {Meeting Type}',    notes:'Send link; confirm agenda; share pre-reads', checklist:['Send link','Confirm agenda','Attach docs'] },
      { id: uid(), type:'Pre-Meeting Prep',    title:'Prep for {Meeting Type}',    notes:'Review CRM notes; prep questions; confirm objectives', checklist:['Review notes','Prep questions','Confirm objectives'] },
      { id: uid(), type:'Conduct Meeting',     title:'Conduct {Meeting Type}',     notes:'Run agenda; capture decisions; assign owners', checklist:['Run agenda','Capture decisions','Assign owners'] },
      { id: uid(), type:'Post-Meeting Prep',   title:'Post-Meeting Prep',          notes:'Clean notes; draft recap; create tasks', checklist:['Clean notes','Draft recap','Create tasks'] },
      { id: uid(), type:'Conduct Phone Call',  title:'Call: {Topic}',              notes:'Short agenda; confirm outcomes; log notes', checklist:['Agenda','Outcomes','Log notes'] },
      { id: uid(), type:'Send Email',          title:'Email: {Subject}',           notes:'Draft subject; bullets; CTA', checklist:['Subject','Bullets','CTA'] },
      { id: uid(), type:'Send Text Message',   title:'Text: {Context}',            notes:'Short copy; include link if needed', checklist:['Short copy','Optional link'] },
      { id: uid(), type:'Request Item',        title:'Request: {Item Name}',       notes:'Specify format; due date; upload location', checklist:['Format','Due date','Upload link'] },
      { id: uid(), type:'Follow Up',           title:'Follow Up: {Topic}',         notes:'Reference context; restate ask; next step', checklist:['Context','Ask','Next step'] },
      { id: uid(), type:'Item Received',       title:'Item Received: {Item}',      notes:'Verify completeness; file docs; notify', checklist:['Verify','File','Notify'] },
      { id: uid(), type:'Task',                title:'Task: {What}',               notes:'Atomic action; definition of done; owner', checklist:['Define done','Assign owner'] },
    ]),

    pricing: { zapStep:80, emailStep:80, schedulerPage:125, otherHourly:300 },

    appsViewMode: store.get('appsViewMode', 'details'),
    functionsViewMode: store.get('functionsViewMode', 'details'),
    integrationsViewMode: store.get('integrationsViewMode', 'details'),

    // volatile cross-ref cache
    _refs: { resources:{}, datapoints:{} }
  };

  // ---------- Legacy workflow migration ----------
  if (Array.isArray(state.workflows) && state.workflows.length && !state.workflows[0]?.steps) {
    state.workflows = [{
      id: uid(),
      name: 'General',
      notes: '',
      steps: state.workflows.map(s => ({
        id: uid(),
        type: s.type || 'Task',
        title: s.step || s.title || 'Step',
        description: s.notes || '',
        assigneeId: '',
        dueOffsetDays: Number(s.dueOffsetDays || 0),
        milestone: !!s.milestone,
        outcomes: Array.isArray(s.outcomes) ? s.outcomes : [],
        resources: Array.isArray(s.resources) ? s.resources : [],
        checklist: Array.isArray(s.checklist) ? s.checklist.slice() : [],
        _open: false
      }))
    }];
  }

  // ---------- Cross-refs (workflows → resources/datapoints) ----------
  function rebuildCrossRefs() {
    const resMap = {};
    const dpMap  = {};

    (state.workflows || []).forEach(wf => {
      (wf.steps || []).forEach(st => {
        // resources
        (st.resources || []).forEach(r => {
          const key = `${r.kind}:${r.id}`;
          (resMap[key] ||= []).push({
            wfId: wf.id,
            wfName: wf.name,
            stepId: st.id,
            stepTitle: st.title
          });
        });

        // datapoints in title / description
        tokensIn(st.title).forEach(tok => {
          (dpMap[tok] ||= []).push({
            wfId: wf.id,
            wfName: wf.name,
            stepId: st.id,
            field:'title'
          });
        });
        tokensIn(st.description).forEach(tok => {
          (dpMap[tok] ||= []).push({
            wfId: wf.id,
            wfName: wf.name,
            stepId: st.id,
            field:'description'
          });
        });
      });
    });

    state._refs = { resources: resMap, datapoints: dpMap };
  }

  // ---------- Persist ----------
  function persist() {
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

    store.set('appsViewMode', state.appsViewMode);
    store.set('functionsViewMode', state.functionsViewMode);
    store.set('integrationsViewMode', state.integrationsViewMode);

    rebuildCrossRefs();
  }

  // ---------- Helpers derived from state ----------
  function currentFunctionNames() {
    return dedupe((state.functions || []).map(f => f.name).filter(Boolean));
  }

  function getOrCreateFunctionByName(name) {
    name = (name || '').trim();
    if (!name) return null;
    let fn = (state.functions || []).find(f => f.name === name);
    if (!fn) {
      fn = { id: uid(), name, type: 'Other' };
      state.functions.push(fn);
    }
    return fn;
  }

  // App icon HTML
  function appIconHTML(app) {
    const icon = app && app.icon;
    if (icon && icon.type === 'emoji' && icon.value) {
      return `<span class="app-icon-emoji">${esc(icon.value)}</span>`;
    }
    if (icon && icon.type === 'image' && icon.value) {
      return `<img src="${esc(icon.value)}" alt="">`;
    }
    const initials = (app?.name || '?')
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return `<span class="app-icon-emoji">${esc(initials || '?')}</span>`;
  }

  // ---------- Integrations helpers ----------
  function getIntegrationPair(appId1, appId2, createIfMissing = false) {
    if (!appId1 || !appId2 || appId1 === appId2) return null;
    const [a, b] = appId1 < appId2 ? [appId1, appId2] : [appId2, appId1];
    let pair = (state.integrationsMatrix || []).find(p => p.appAId === a && p.appBId === b);
    if (!pair && createIfMissing) {
      pair = {
        id: uid(),
        appAId: a,
        appBId: b,
        hasDirect: false,
        hasZapier: false,
        directNotes: [],
        zapierNotes: []
      };
      state.integrationsMatrix.push(pair);
    }
    return pair;
  }

  function integrationPairsForApp(appId) {
    return (state.integrationsMatrix || []).filter(
      p => p.appAId === appId || p.appBId === appId
    );
  }

  function integrationPairColor(pair) {
    if (pair.hasDirect && pair.hasZapier) return 'both';
    if (pair.hasDirect) return 'direct';
    if (pair.hasZapier) return 'zapier';
    return null;
  }

  // ---------- Resource helpers (for "used in resources") ----------
  function resourceLookup(kind, id) {
    const dict = {
      zap: state.zaps,
      form: state.forms,
      scheduler: state.scheduling,
      emailCampaign: state.emailCampaigns,
      emailTemplate: state.emailTemplates
    };
    const row = findById(dict[kind] || [], id);
    if (!row) return { name: `(${kind}:${id})` };
    return { name: row.title || row.name || row.campaign || row.event || row.id };
  }

  // ---------- Initial functionAssignments bootstrap ----------
  function bootstrapFunctionAssignmentsFromApps() {
    if ((state.functionAssignments || []).length) return;
    (state.apps || []).forEach(app => {
      (app.functions || []).forEach(fnName => {
        const fn = getOrCreateFunctionByName(fnName);
        if (!fn) return;
        if (!state.functionAssignments.some(a => a.functionId === fn.id && a.appId === app.id)) {
          state.functionAssignments.push({
            id: uid(),
            functionId: fn.id,
            appId: app.id,
            level: 'available'
          });
        }
      });
    });
  }

  bootstrapFunctionAssignmentsFromApps();
  persist();

  // ---------- Routing ----------
  const routes = {
    // Combined Apps page
    '/apps': renderAppsPage,
    '/apps/functions': renderAppsPage, // back-compat
    '/apps/tech': renderTechComparison,

    // Resources
    '/resources': renderWorkflows,
    '/resources/workflows': renderWorkflows,
    '/resources/zaps': renderZaps,
    '/resources/forms': renderForms,
    '/resources/scheduling': renderScheduling,
    '/resources/email-campaigns': renderEmailCampaigns,

    // Settings
    '/settings': renderSettingsHome,
    '/settings/team': renderTeam,
    '/settings/segments': renderSegments,
    '/settings/datapoints': renderDatapoints,
    '/settings/folder-hierarchy': renderFolderHierarchy,
    '/settings/naming-conventions': renderNaming,
  };

  function currentPath() {
    const h = (location.hash || '#/apps').slice(1);
    return h || '/apps';
  }

  function navigate() {
    const path = currentPath();
    const view = $('#view');
    const fn = routes[path] || renderNotFound;

    $all('[data-route]').forEach(a => {
      if (a.getAttribute('href') === '#' + path) a.classList.add('active');
      else a.classList.remove('active');
    });

    const crumbs = $('#crumbs');
    if (crumbs) {
      crumbs.textContent = path.split('/').filter(Boolean).join(' / ');
    }

    view.innerHTML = '';
    fn(view, path);
  }

  window.addEventListener('hashchange', navigate);
  window.addEventListener('load', navigate);

  // ---------- Topbar actions ----------
  const exportBtn = $('#exportAll');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const payload = JSON.stringify(state, null, 2);
      const blob = new Blob([payload], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'operations-library.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    });
  }

  const importBtn = $('#importAll');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json';
      inp.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        const fr = new FileReader();
        fr.onload = () => {
          try {
            const obj = JSON.parse(fr.result);
            Object.assign(state, obj);
            persist();
            navigate();
          } catch {
            alert('Invalid JSON');
          }
        };
        fr.readAsText(f);
      };
      inp.click();
    });
  }

  const resetBtn = $('#resetAll');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all data?')) return;
      localStorage.clear();
      location.reload();
    });
  }

  // ---------- Generic pages ----------
  function renderNotFound(el) {
    el.innerHTML = `
      <div class="card">
        <h2>Not Found</h2>
        <div class="muted">No route for ${esc(currentPath())}</div>
      </div>`;
  }

  // ======================================================================
  //  TECH COMPARISON
  // ======================================================================
  function renderTechComparison(el) {
    el.innerHTML = `
      <div class="card sticky">
        <h2>Tech Comparison</h2>
        <div class="row">
          <div class="muted">Pick apps to compare, add criteria & weights, then score.</div>
          <div class="spacer"></div>
        </div>
      </div>

      <div class="card">
        <div class="row" style="margin-bottom:8px">
          <label style="min-width:120px">Compare Apps</label>
          <select id="tcApps" multiple size="6" style="min-width:280px">
            ${(state.apps || [])
              .map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`)
              .join('')}
          </select>
        </div>

        <div class="row" style="margin:10px 0">
          <button class="btn small" id="addCriterion">Add Criterion</button>
        </div>

        <table id="tcTable">
          <thead>
            <tr><th>Criterion</th><th>Weight (0–5)</th><th>Notes</th><th></th></tr>
          </thead>
          <tbody></tbody>
        </table>

        <div class="row" style="margin-top:12px">
          <button class="btn primary small" id="calcScores">Run Analysis</button>
          <div class="spacer"></div>
          <div id="tcResult" class="pill">No results yet</div>
        </div>
      </div>
    `;

    const page = { criteria: [] };
    const tbody = el.querySelector('#tcTable tbody');

    function drawCriteria() {
      tbody.innerHTML = '';
      page.criteria.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" value="${esc(c.name || '')}" placeholder="e.g., Compliance fit"></td>
          <td><input type="number" min="0" max="5" step="0.5" value="${Number(c.weight || 0)}"></td>
          <td><input type="text" value="${esc(c.notes || '')}" placeholder="Scoring notes"></td>
          <td><button class="btn small" data-act="del">Delete</button></td>
        `;
        const [nameInp, weightInp, notesInp] = tr.querySelectorAll('input');
        nameInp.addEventListener('input', () => c.name = nameInp.value);
        weightInp.addEventListener('input', () => c.weight = Number(weightInp.value || 0));
        notesInp.addEventListener('input', () => c.notes = notesInp.value);
        tr.querySelector('[data-act="del"]').addEventListener('click', () => {
          page.criteria = page.criteria.filter(x => x !== c);
          drawCriteria();
        });
        tbody.appendChild(tr);
      });
    }

    el.querySelector('#addCriterion').addEventListener('click', () => {
      page.criteria.push({ name:'', weight:0, notes:'' });
      drawCriteria();
    });

    el.querySelector('#calcScores').addEventListener('click', () => {
      const selApps = Array.from(el.querySelector('#tcApps').selectedOptions).map(o => o.value);
      if (!selApps.length) { alert('Pick at least one app.'); return; }
      if (!page.criteria.length) { alert('Add at least one criterion.'); return; }

      const totalWeight = page.criteria.reduce((s, c) => s + Number(c.weight || 0), 0) || 1;
      const result = selApps.map(id => {
        const app = (state.apps || []).find(a => a.id === id);
        const score = totalWeight; // placeholder for now
        return { id, name: app?.name || id, score };
      }).sort((a, b) => b.score - a.score);

      el.querySelector('#tcResult').textContent =
        `Rank: ${result.map(r => `${r.name} (${r.score})`).join('  ·  ')}`;
    });

    drawCriteria();
  }

  // ======================================================================
  //  APPS PAGE (Applications + Functions + Integrations Matrix)
  // ======================================================================
  function renderAppsPage(el) {
    renderAppsSection(el);
    renderFunctionsSection(el);
    renderIntegrationsMatrixSection(el);
  }

  // ----------------------------------------------------------------------
  //  APPS SECTION
  // ----------------------------------------------------------------------
  function renderAppsSection(el) {
    const card = document.createElement('div');
    card.className = 'card sticky';
    card.innerHTML = `
      <h2>Applications</h2>
      <div class="row">
        <button class="btn small" id="appsIcons">Icons</button>
        <button class="btn small" id="appsDetails">Details</button>
        <div class="spacer"></div>
        <select id="appsFilter" style="min-width:160px">
          <option value="">All Functions</option>
          ${currentFunctionNames().map(f => `<option>${esc(f)}</option>`).join('')}
        </select>
      </div>
    `;
    el.appendChild(card);

    $('#appsIcons').onclick = () => { state.appsViewMode = 'icons'; persist(); navigate(); };
    $('#appsDetails').onclick = () => { state.appsViewMode = 'details'; persist(); navigate(); };

    const filterSel = $('#appsFilter');
    filterSel.onchange = () => navigate();
    const showFilter = filterSel.value.trim();

    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = 'repeat(auto-fill,minmax(280px,1fr))';
    wrap.style.gridGap = '12px';
    wrap.style.marginTop = '8px';
    el.appendChild(wrap);

    (state.apps || []).forEach(app => {
      if (showFilter) {
        const fns = app.functions || [];
        if (!fns.includes(showFilter)) return;
      }
      wrap.appendChild(renderAppCard(app));
    });
  }

  function renderAppCard(app) {
    const d = document.createElement('div');
    d.className = 'card';
    d.style.cursor = 'pointer';

    const iconHTML = appIconHTML(app);

    if (state.appsViewMode === 'details') {
      d.innerHTML = `
        <div class="row">
          <div style="font-size:20px">${iconHTML}</div>
          <div style="font-weight:600">${esc(app.name)}</div>
        </div>
        <div class="muted" style="margin:6px 0">${esc(app.notes || '')}</div>
        <label>Functions</label>
        <div class="row" style="flex-wrap:wrap; gap:4px">
          ${
            (app.functions || []).map(fn => (
              `<span class="pill" style="color:${FN_LEVEL_COLORS.available}">${esc(fn)}</span>`
            )).join('')
          }
        </div>
        <label style="margin-top:10px">Integrations</label>
        <div class="row" style="margin-top:4px; flex-wrap:wrap; gap:6px">
          ${renderAppIntegrationsIcons(app)}
        </div>
      `;
    } else {
      d.innerHTML = `
        <div class="row">
          <div style="font-size:22px">${iconHTML}</div>
          <div>${esc(app.name)}</div>
        </div>
        <div class="row" style="flex-wrap:wrap; margin-top:6px; gap:4px;">
          ${
            (app.functions || []).map(fn => (
              `<span class="pill" style="color:${FN_LEVEL_COLORS.available}; font-size:11px">${esc(fn)}</span>`
            )).join('')
          }
        </div>
      `;
    }

    d.onclick = () => openAppModal(app.id);
    return d;
  }

  function renderAppIntegrationsIcons(app) {
    const pairs = integrationPairsForApp(app.id) || [];
    if (!pairs.length) return `<span class="muted">No integrations yet</span>`;
    return pairs.map(pair => {
      const otherId = (pair.appAId === app.id) ? pair.appBId : pair.appAId;
      const otherApp = findById(state.apps, otherId);
      const colorKey = integrationPairColor(pair);
      if (!colorKey) {
        return `<span class="pill">${esc(otherApp?.name || '?')}</span>`;
      }
      const color = INTEG_COLORS[colorKey];
      return `<span class="pill" style="border:1px solid ${color}">${esc(otherApp?.name || '?')}</span>`;
    }).join('');
  }

  // ----------------------------------------------------------------------
  //  FUNCTIONS SECTION
  // ----------------------------------------------------------------------
  function renderFunctionsSection(el) {
    const cap = document.createElement('div');
    cap.className = 'card sticky';
    cap.style.marginTop = '28px';
    cap.innerHTML = `
      <h2>Functions</h2>
      <div class="row">
        <button class="btn small" id="fIcons">Icons</button>
        <button class="btn small" id="fDetails">Details</button>
        <div class="spacer"></div>
        <button class="btn small" id="addFunction">+ Add New</button>
      </div>
    `;
    el.appendChild(cap);

    $('#fIcons').onclick = () => { state.functionsViewMode = 'icons'; persist(); navigate(); };
    $('#fDetails').onclick = () => { state.functionsViewMode = 'details'; persist(); navigate(); };
    $('#addFunction').onclick = () => newFunction();

    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = 'repeat(auto-fill,minmax(260px,1fr))';
    wrap.style.gridGap = '12px';
    wrap.style.marginTop = '12px';
    el.appendChild(wrap);

    (state.functions || []).forEach(fn => {
      wrap.appendChild(renderFunctionCard(fn));
    });
  }

  function renderFunctionCard(fn) {
    const appsAssigned = (state.functionAssignments || [])
      .filter(a => a.functionId === fn.id)
      .map(a => ({ app: findById(state.apps, a.appId), level: a.level }));

    const d = document.createElement('div');
    d.className = 'card';
    d.style.cursor = 'pointer';

    if (state.functionsViewMode === 'details') {
      d.innerHTML = `
        <div style="font-weight:600; margin-bottom:6px">${esc(fn.name)}</div>
        ${
          appsAssigned.length
            ? appsAssigned.map(a => {
                const border = FN_LEVEL_COLORS[a.level] || '#666';
                return `<div class="pill" style="border:1px solid ${border};">${esc(a.app?.name || '?')}</div>`;
              }).join(' ')
            : `<span class="muted">No apps assigned</span>`
        }
      `;
    } else {
      d.innerHTML = `
        <div style="font-weight:600; margin-bottom:4px; font-size:13px">${esc(fn.name)}</div>
        <div style="display:flex; flex-wrap:wrap; gap:4px">
          ${appsAssigned.map(a => {
            const border = FN_LEVEL_COLORS[a.level] || '#666';
            const icon = appIconHTML(a.app);
            return `<div class="pill" style="border:1px solid ${border}">${icon}</div>`;
          }).join('')}
        </div>
      `;
    }

    d.onclick = () => openFunctionModal(fn.id);
    return d;
  }

  function newFunction() {
    const name = prompt('Name of function?');
    if (!name) return;
    getOrCreateFunctionByName(name);
    persist();
    navigate();
  }

  // ----------------------------------------------------------------------
  //  INTEGRATIONS MATRIX SECTION
  // ----------------------------------------------------------------------
  function renderIntegrationsMatrixSection(el) {
    const cap = document.createElement('div');
    cap.className = 'card sticky';
    cap.style.marginTop = '28px';
    cap.innerHTML = `
      <h2>Integrations Matrix</h2>
      <div class="row">
        <button class="btn small" id="iIcons">Icons</button>
        <button class="btn small" id="iDetails">Details</button>
      </div>
    `;
    el.appendChild(cap);

    $('#iIcons').onclick = () => { state.integrationsViewMode = 'icons'; persist(); navigate(); };
    $('#iDetails').onclick = () => { state.integrationsViewMode = 'details'; persist(); navigate(); };

    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = 'repeat(auto-fill,minmax(280px,1fr))';
    wrap.style.gridGap = '12px';
    wrap.style.marginTop = '12px';
    el.appendChild(wrap);

    const pairs = state.integrationsMatrix || [];
    pairs.forEach(pair => {
      if (!pair.hasDirect && !pair.hasZapier) return; // only show real relationships
      wrap.appendChild(renderIntegrationCard(pair));
    });
  }

  function renderIntegrationCard(pair) {
    const d = document.createElement('div');
    d.className = 'card';
    d.style.cursor = 'pointer';

    const a = findById(state.apps, pair.appAId);
    const b = findById(state.apps, pair.appBId);

    if (state.integrationsViewMode === 'details') {
      d.innerHTML = `
        <div style="font-weight:600; margin-bottom:6px">
          ${esc(a?.name || '?')} ↔ ${esc(b?.name || '?')}
        </div>
        <div style="margin-bottom:6px;">
          ${pair.hasDirect ? `<span class="pill" style="border:1px solid ${INTEG_COLORS.direct}">Direct</span>` : ''}
          ${pair.hasZapier ? `<span class="pill" style="border:1px solid ${INTEG_COLORS.zapier}">Zapier</span>` : ''}
        </div>
        ${
          (pair.directNotes.length || pair.zapierNotes.length)
            ? `<div style="margin-top:4px; font-size:12px; line-height:1.3">
                ${pair.directNotes.map(n => `<div>• ${esc(n)}</div>`).join('')}
                ${pair.zapierNotes.map(n => `<div>• ${esc(n)}</div>`).join('')}
              </div>`
            : `<div class="muted" style="margin-top:8px">No description yet</div>`
        }
      `;
    } else {
      const colorKey = integrationPairColor(pair);
      const borderColor = colorKey ? INTEG_COLORS[colorKey] : '#4b5563';
      d.style.border = `2px solid ${borderColor}`;
      d.innerHTML = `
        <div class="row" style="align-items:center; justify-content:center; gap:8px;">
          <div style="font-size:18px">${appIconHTML(a)}</div>
          <div style="font-size:18px">↔</div>
          <div style="font-size:18px">${appIconHTML(b)}</div>
        </div>
      `;
    }

    d.onclick = () => openIntegrationModal(pair.id);
    return d;
  }

  // ----------------------------------------------------------------------
  //  MODALS: APP / FUNCTION / INTEGRATION
  // ----------------------------------------------------------------------
  function showModal(draw) {
    let m = $('#modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'modal';
      m.innerHTML = `<div id="modalInner"></div>`;
      Object.assign(m.style, {
        position:'fixed',
        inset:'0',
        background:'rgba(0,0,0,.5)',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        zIndex:999
      });
      document.body.appendChild(m);
    }
    const inner = $('#modalInner');
    Object.assign(inner.style, {
      background:'var(--panel)',
      border:'1px solid var(--line)',
      borderRadius:'10px',
      minWidth:'460px',
      maxWidth:'900px',
      maxHeight:'90vh',
      overflow:'auto'
    });
    draw(inner);
    m.style.display = 'flex';
  }

  function hideModal() {
    const m = $('#modal');
    if (m) m.style.display = 'none';
  }

  // ----- APP MODAL -----
  function openAppModal(appId) {
    const app = findById(state.apps, appId);
    if (!app) return;

    showModal(mod => {
      mod.innerHTML = `
        <div class="modal-head">
          <div style="font-size:24px;display:flex;align-items:center;gap:10px;">
            <div>${appIconHTML(app)}</div>
            <span contenteditable="true" id="appEditName">${esc(app.name)}</span>
          </div>
          <div class="modal-close" id="xClose">×</div>
        </div>
        <div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:22px;">
          <section>
            <h3>Functions</h3>
            <div class="row" style="flex-wrap:wrap; gap:6px">
              ${(app.functions || []).map(fn => `<span class="pill">${esc(fn)}</span>`).join('')}
            </div>
          </section>

          <section>
            <h3>Datapoints</h3>
            ${renderAppDatapointsTable(app)}
          </section>

          <section>
            <h3>Used In Resources</h3>
            <div>${renderAppUsedInResources(appId)}</div>
          </section>

          <section>
            <h3>Integrations</h3>
            <div style="font-size:12px; margin-bottom:6px;">
              <span class="pill" style="border:1px solid ${INTEG_COLORS.direct}">Direct</span>
              <span class="pill" style="border:1px solid ${INTEG_COLORS.zapier}">Zapier</span>
              <span class="pill" style="border:1px solid ${INTEG_COLORS.both}">Both</span>
            </div>
            <div class="row" style="flex-wrap:wrap; gap:6px">
              ${renderAppIntegrationsIcons(app)}
            </div>
          </section>
        </div>
      `;

      $('#xClose').onclick = hideModal;
      $('#appEditName').onblur = () => {
        app.name = $('#appEditName').innerText.trim();
        persist();
        navigate();
      };
    });
  }

  function renderAppDatapointsTable(app) {
    const rows = app.datapointMappings || [];
    if (!rows.length) return `<div class="muted">No datapoints yet</div>`;
    let out = `
      <table style="font-size:13px; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:4px;">Master</th>
            <th style="text-align:left; padding:4px;">Inbound Merge Tag</th>
            <th style="text-align:left; padding:4px;">Outbound Merge Tag</th>
          </tr>
        </thead>
        <tbody>
    `;
    rows.forEach(r => {
      out += `
        <tr>
          <td style="padding:4px;">${esc(r.datapoint)}</td>
          <td style="padding:4px;">${esc(r.inbound)}</td>
          <td style="padding:4px;">${esc(r.outbound)}</td>
        </tr>
      `;
    });
    out += '</tbody></table>';
    return out;
  }

  function renderAppUsedInResources(appId) {
    const app = findById(state.apps, appId);
    if (!app) return `<div class="muted">No references</div>`;
    let out = '';
    const name = app.name || '';
    for (const refs of Object.values(state._refs.resources)) {
      refs.forEach(ref => {
        const wf = findById(state.workflows, ref.wfId);
        if (!wf) return;
        const step = findById(wf.steps, ref.stepId) || {};
        if (!String(step.title || '').includes(name)) return;
        out += `<div><a href="#/resources/workflows" style="color:#72a0ff">${esc(wf.name)}</a>: ${esc(step.title)}</div>`;
      });
    }
    return out || `<div class="muted">No references</div>`;
  }

  // ----- FUNCTION MODAL -----
  function openFunctionModal(fnId) {
    const fn = findById(state.functions, fnId);
    if (!fn) return;

    showModal(mod => {
      const apps = listFunctionAppsForModal(fnId);

      mod.innerHTML = `
        <div class="modal-head">
          <span contenteditable="true" id="fnEditName">${esc(fn.name)}</span>
          <div id="xClose" class="modal-close">×</div>
        </div>
        <div class="modal-body" style="padding:20px;">
          <section>
            <h3>Apps</h3>
            <div class="row" style="flex-wrap:wrap; gap:6px;" id="fnAppsWrap">
              ${
                apps.length
                  ? apps.map(a => renderFunctionAppPillHTML(a)).join('')
                  : `<span class="muted">No apps assigned</span>`
              }
            </div>
            <div style="margin-top:12px;">
              <button class="btn small" id="assignApp">Assign App</button>
            </div>
          </section>
        </div>
      `;

      $('#xClose').onclick = hideModal;

      $('#fnEditName').onblur = () => {
        fn.name = $('#fnEditName').innerText.trim();
        persist();
        navigate();
      };

      $('#assignApp').onclick = () => openAssignAppToFunction(fnId);

      // wire click handlers for level change
      const wrap = $('#fnAppsWrap');
      $all('[data-assign-id]', wrap).forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          openSetFnAppLevel(el.getAttribute('data-assign-id'));
        });
      });
    });
  }

  function listFunctionAppsForModal(fnId) {
    return (state.functionAssignments || [])
      .filter(a => a.functionId === fnId)
      .map(a => ({
        app: findById(state.apps, a.appId),
        level: a.level,
        assign: a
      }));
  }

  function renderFunctionAppPillHTML(a) {
    const border = FN_LEVEL_COLORS[a.level] || '#666';
    return `
      <span class="pill"
            data-assign-id="${esc(a.assign.id)}"
            style="border:2px solid ${border}; cursor:pointer;">
        ${esc(a.app?.name || '?')}
      </span>
    `;
  }

  function openAssignAppToFunction(fnId) {
    const fn = findById(state.functions, fnId);
    if (!fn) return;

    const allApps = state.apps || [];
    const assigned = (state.functionAssignments || [])
      .filter(a => a.functionId === fnId)
      .map(a => a.appId);

    const candidates = allApps.filter(a => !assigned.includes(a.id));
    if (!candidates.length) {
      alert('All apps already assigned.');
      return;
    }

    const choices = candidates.map(a => a.name).join('\n');
    const name = prompt(`Assign functional ownership to which app?\n${choices}`);
    if (!name) return;

    const match = allApps.find(a => a.name === name);
    if (!match) {
      alert('No such app');
      return;
    }

    state.functionAssignments.push({
      id: uid(),
      functionId: fnId,
      appId: match.id,
      level: 'available'
    });
    persist();
    navigate();
  }

  function openSetFnAppLevel(assignId) {
    const as = findById(state.functionAssignments, assignId);
    if (!as) return;
    const cur = as.level;
    const next = prompt('Set level for this assignment (primary / available / evaluating)', cur);
    if (!next) return;
    if (!FUNCTION_LEVELS.includes(next)) {
      alert('Invalid');
      return;
    }
    as.level = next;
    persist();
    navigate();
  }

  // expose for inline (if you keep any older inline handlers)
  window.openSetFnAppLevel = openSetFnAppLevel;

  // ----- INTEGRATION MODAL -----
  function openIntegrationModal(pairId) {
    const pair = findById(state.integrationsMatrix, pairId);
    if (!pair) return;
    const a = findById(state.apps, pair.appAId);
    const b = findById(state.apps, pair.appBId);

    showModal(mod => {
      mod.innerHTML = `
        <div class="modal-head">
          <div style="font-size:20px">${esc(a?.name || '?')} ↔ ${esc(b?.name || '?')}</div>
          <div id="xClose" class="modal-close">×</div>
        </div>
        <div class="modal-body" style="padding:20px; display:flex;gap:16px;">
          <section style="flex:1;">
            <h3>Direct</h3>
            <div id="directList">
              ${pair.directNotes.map(n => `<div>• ${esc(n)}</div>`).join('') || '<div class="muted">None yet</div>'}
            </div>
            <button class="btn small" id="addDirect" style="margin-top:8px;">+ Add</button>
          </section>
          <section style="flex:1;">
            <h3>Zapier</h3>
            <div id="zapList">
              ${pair.zapierNotes.map(n => `<div>• ${esc(n)}</div>`).join('') || '<div class="muted">None yet</div>'}
            </div>
            <button class="btn small" id="addZap" style="margin-top:8px;">+ Add</button>
          </section>
        </div>
      `;

      $('#xClose').onclick = hideModal;

      $('#addDirect').onclick = () => {
        const val = prompt('Describe direct integration');
        if (!val) return;
        pair.hasDirect = true;
        pair.directNotes.push(val);
        persist();
        openIntegrationModal(pairId);
      };

      $('#addZap').onclick = () => {
        const val = prompt('Describe Zapier integration');
        if (!val) return;
        pair.hasZapier = true;
        pair.zapierNotes.push(val);
        persist();
        openIntegrationModal(pairId);
      };
    });
  }

  // ======================================================================
  //  WORKFLOWS (basic, mostly unchanged)
  // ======================================================================
  function renderWorkflows(el) {
    const cap = document.createElement('div');
    cap.className = 'card sticky';
    cap.innerHTML = `
      <h2>Workflows</h2>
      <div class="row">
        <button class="btn small" id="wfAdd">+ Add Workflow</button>
      </div>
    `;
    el.appendChild(cap);

    $('#wfAdd').onclick = newWorkflow;

    (state.workflows || []).forEach(wf => {
      const d = document.createElement('div');
      d.className = 'card';
      d.style.cursor = 'pointer';
      d.style.marginTop = '10px';
      d.innerHTML = `
        <div style="font-weight:600">${esc(wf.name)}</div>
        <div class="muted" style="font-size:12px">${(wf.steps || []).length} steps</div>
      `;
      d.onclick = () => openWorkflow(wf.id);
      el.appendChild(d);
    });
  }

  function newWorkflow() {
    const name = prompt('Workflow name?');
    if (!name) return;
    state.workflows.push({ id: uid(), name, steps: [] });
    persist();
    navigate();
  }

  function openWorkflow(wfId) {
    const wf = findById(state.workflows, wfId);
    if (!wf) return;

    showModal(mod => {
      mod.innerHTML = `
        <div class="modal-head">
          <span contenteditable="true" id="wfEditName">${esc(wf.name)}</span>
          <div id="xClose" class="modal-close">×</div>
        </div>
        <div class="modal-body" style="padding:20px; max-height:80vh; overflow:auto;">
          ${renderWorkflowSteps(wf)}
        </div>
      `;

      $('#xClose').onclick = hideModal;

      $('#wfEditName').onblur = () => {
        wf.name = $('#wfEditName').innerText.trim();
        persist();
        navigate();
      };
    });
  }

  function renderWorkflowSteps(wf) {
    const stepsHtml = (wf.steps || []).map((s, i) => renderWorkflowStepCard(wf, s, i)).join('');
    return `
      <div>
        ${stepsHtml}
        <button class="btn small" data-wf-id="${esc(wf.id)}" id="addStepBtn">+ Add Step</button>
      </div>
    `;
  }

  function renderWorkflowStepCard(wf, step, idx) {
    return `
      <div class="card" style="margin-bottom:10px;">
        <div style="font-weight:600; font-size:15px">
          <span contenteditable="true"
                onblur="renameStep('${wf.id}','${step.id}',this.innerText)">
            ${esc(step.title)}
          </span>
        </div>
        <div class="muted" style="font-size:12px">${esc(step.description || '')}</div>
        <div class="row" style="margin-top:8px; gap:4px;">
          <button class="btn small" onclick="moveStep('${wf.id}','${step.id}',-1)">↑</button>
          <button class="btn small" onclick="moveStep('${wf.id}','${step.id}',1)">↓</button>
          <button class="btn small" onclick="deleteStep('${wf.id}','${step.id}')">Delete</button>
        </div>
      </div>
    `;
  }

  function renameStep(wfId, stepId, title) {
    const wf = findById(state.workflows, wfId);
    if (!wf) return;
    const st = findById(wf.steps, stepId);
    if (!st) return;
    st.title = title;
    persist();
  }

  function addWorkflowStep(wfId) {
    const wf = findById(state.workflows, wfId);
    if (!wf) return;
    const title = prompt('Step title?');
    if (!title) return;
    (wf.steps ||= []).push({ id: uid(), title, description: '' });
    persist();
    openWorkflow(wfId);
  }

  function moveStep(wfId, stepId, dir) {
    const wf = findById(state.workflows, wfId);
    if (!wf) return;
    const idx = (wf.steps || []).findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= wf.steps.length) return;
    const tmp = wf.steps[idx];
    wf.steps[idx] = wf.steps[newIdx];
    wf.steps[newIdx] = tmp;
    persist();
    openWorkflow(wfId);
  }

  function deleteStep(wfId, stepId) {
    const wf = findById(state.workflows, wfId);
    if (!wf) return;
    wf.steps = (wf.steps || []).filter(s => s.id !== stepId);
    persist();
    openWorkflow(wfId);
  }

  // expose for inline handlers used in workflow HTML
  window.renameStep = renameStep;
  window.addWorkflowStep = addWorkflowStep;
  window.moveStep = moveStep;
  window.deleteStep = deleteStep;

  // ======================================================================
  //  RESOURCES (stubs)
  // ======================================================================
  function renderZaps(el) { renderPlaceholder(el, 'Zaps (coming soon)'); }
  function renderForms(el) { renderPlaceholder(el, 'Forms (coming soon)'); }
  function renderScheduling(el) { renderPlaceholder(el, 'Scheduling (coming soon)'); }
  function renderEmailCampaigns(el) { renderPlaceholder(el, 'Email Campaigns (coming soon)'); }

  function renderPlaceholder(el, text) {
    const c = document.createElement('div');
    c.className = 'card';
    c.style.marginTop = '20px';
    c.innerHTML = `<div style="font-size:16px;">${esc(text)}</div>`;
    el.appendChild(c);
  }
  function renderEmailCampaigns(el){
  el.innerHTML = `
    <div class="card sticky">
      <h2>Email Campaigns</h2>
      <div class="row"><div class="pill">Pricing: $${state.pricing.emailStep}/step</div></div>
    </div>
    <div class="card">
      <table id="ecTable">
        <thead><tr><th>Campaign</th><th>Steps</th><th>Assets/Notes</th><th>Price</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
      <div class="row" style="margin-top:10px">
        <button class="btn small" id="addEC">Add Campaign</button>
        <div class="spacer"></div>
        <div>Total: <b id="ecTotal">$0.00</b></div>
      </div>
    </div>
  `;

  function rowPrice(steps){ return (Number(steps||0) * state.pricing.emailStep); }

  function draw(){
    const tb = $('#ecTable tbody', el); tb.innerHTML='';
    (state.emailCampaigns||[]).forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" value="${esc(c.name||'')}" data-f="name"></td>
        <td><input type="number" value="${Number(c.steps||0)}" data-f="steps"></td>
        <td><input type="text" value="${esc(c.notes||'')}" data-f="notes"></td>
        <td>${money(rowPrice(c.steps))}</td>
        <td><button class="btn small" data-act="del">Delete</button></td>
      `;
      tr.querySelectorAll('[data-f]').forEach(inp=>{
        inp.addEventListener('input', ()=>{
          const f = inp.getAttribute('data-f');
          c[f] = inp.type==='number' ? Number(inp.value||0) : inp.value;
          persist(); totals();
        });
      });
      tr.querySelector('[data-act="del"]').addEventListener('click', ()=>{
        if(!confirm('Delete campaign?')) return;
        state.emailCampaigns = state.emailCampaigns.filter(x=>x.id!==c.id); persist(); draw(); totals();
      });
      tb.appendChild(tr);
    });
  }

  function totals(){
    const total = (state.emailCampaigns||[]).reduce((sum,c)=> sum + rowPrice(c.steps), 0);
    $('#ecTotal', el).textContent = money(total);
  }

  $('#addEC', el).addEventListener('click', ()=>{
    state.emailCampaigns.unshift({ id:uid(), name:'', steps:0, notes:'' }); persist(); draw(); totals();
  });

  draw(); totals();
}


  // ======================================================================
  //  SETTINGS
  // ======================================================================
  function renderSettingsHome(el) {
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `
      <h2>Settings</h2>
      <ul style="margin-top:8px; line-height:1.6;">
        <li><a href="#/settings/team">Team</a></li>
        <li><a href="#/settings/segments">Segments</a></li>
        <li><a href="#/settings/datapoints">Datapoints</a></li>
        <li><a href="#/settings/folder-hierarchy">Folder Hierarchy</a></li>
        <li><a href="#/settings/naming-conventions">Naming Conventions</a></li>
      </ul>
    `;
    el.appendChild(c);
  }

  function renderTeam(el) {
    const cap = document.createElement('div');
    cap.className = 'card sticky';
    cap.innerHTML = `
      <h2>Team</h2>
      <div class="row">
        <button class="btn small" id="tmAdd">+ Add Member</button>
      </div>
    `;
    el.appendChild(cap);

    $('#tmAdd').onclick = newTeamMember;

    (state.teamMembers || []).forEach(m => {
      const d = document.createElement('div');
      d.className = 'card';
      d.style.marginTop = '10px';
      d.innerHTML = `
        <div contenteditable="true"
             onblur="renameTeam('${m.id}',this.innerText)"
             style="font-weight:600; font-size:15px">${esc(m.name)}</div>
      `;
      el.appendChild(d);
    });
  }

  function newTeamMember() {
    const name = prompt('Team member name?');
    if (!name) return;
    state.teamMembers.push({ id: uid(), name });
    persist();
    navigate();
  }

  function renameTeam(id, name) {
    const m = (state.teamMembers || []).find(x => x.id === id);
    if (!m) return;
    m.name = name;
    persist();
  }

  window.renameTeam = renameTeam;

  function renderSegments(el) {
    const cap = document.createElement('div');
    cap.className = 'card sticky';
    cap.innerHTML = `
      <h2>Segments</h2>
      <div class="row">
        <button class="btn small" id="segAdd">+ Add Segment</button>
      </div>
    `;
    el.appendChild(cap);

    $('#segAdd').onclick = () => {
      const val = prompt('Add segment value:');
      if (!val) return;
      (state.segments || []).push(val);
      persist();
      navigate();
    };

    (state.segments || []).forEach(seg => {
      const d = document.createElement('div');
      d.className = 'card';
      d.style.marginTop = '10px';
      d.innerHTML = `
        <div contenteditable="true"
             onblur="editSegment('${esc(seg)}',this.innerText)"
             style="font-size:14px">${esc(seg)}</div>
      `;
      el.appendChild(d);
    });
  }

  function editSegment(oldVal, newVal) {
    const idx = (state.segments || []).indexOf(oldVal);
    if (idx === -1) return;
    state.segments[idx] = newVal;
    persist();
  }

  window.editSegment = editSegment;

  function renderDatapoints(el) {
    const cap = document.createElement('div');
    cap.className = 'card sticky';
    cap.innerHTML = `
      <h2>Datapoints</h2>
      <div class="row">
        <button class="btn small" id="dpAdd">+ Add Datapoint</button>
      </div>
    `;
    el.appendChild(cap);

    $('#dpAdd').onclick = newDatapoint;

    (state.datapoints || []).forEach(dp => {
      const name = (typeof dp === 'string') ? dp : dp.name;
      const desc = (typeof dp === 'string') ? '' : (dp.description || '');
      const d = document.createElement('div');
      d.className = 'card';
      d.style.marginTop = '10px';
      d.innerHTML = `
        <div style="font-weight:600">${esc(name)}</div>
        <div class="muted">${esc(desc)}</div>
      `;
      el.appendChild(d);
    });
  }

  function newDatapoint() {
    const name = prompt('Datapoint name?');
    if (!name) return;
    (state.datapoints || []).push(name);
    persist();
    navigate();
  }

  function renderFolderHierarchy(el) {
    renderPlaceholder(el, 'Folder Hierarchy (visual builder coming)');
  }

  function renderNaming(el) {
    renderPlaceholder(el, 'Naming Conventions (coming)');
  }

  // kick things off
  // (load is already implied via store.get at top; just navigate)
  navigate();
})();
