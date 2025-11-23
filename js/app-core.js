// ===============================================
// APP CORE – shared helpers, bootstrap, derived state
// ===============================================

const AppCore = (() => {
  const state = AppState.getState();

  // ---------- CONSTANTS ----------
  const FUNCTION_TYPES_SEED = [
    "Automation","Billing / Invoicing","Bookkeeping","Calendar","CRM","Custodian / TAMP",
    "Data Aggregation","Data Gathering","eSignature","Email","Email Marketing",
    "File Sharing / Document Storage","Financial Planning","Lead Generation","Mind Mapping",
    "Notes Storage","Office Suite","Other Financial","Password Manager","Phone / Text",
    "Pipeline Management","Project Management","Risk Tolerance","Scheduler","Task Management",
    "Tax Planning","Tax Prep","Time Tracking","Transcription","Video Conferencing",
    "Video Recording","Website","Other"
  ];

  const FUNCTION_LEVELS = ["primary", "available", "evaluating"];

  const FN_LEVEL_COLORS = {
    primary:   "#a855f7", // purple
    available: "#ffffff", // white pill, border handled in UI
    evaluating:"#6b7280"  // grey
  };

  const INTEG_COLORS = {
    direct: "#3b82f6", // blue
    zapier: "#facc15", // yellow
    both:   "#22c55e"  // green
  };

  // ---------- UTILS ----------
  function $(sel, el = document) { return el.querySelector(sel); }
  function $all(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function dedupe(arr) {
    return Array.from(new Set(arr || []));
  }

  function findById(arr, id) {
    return (arr || []).find(x => x.id === id);
  }

  function tokensIn(text) {
    const out = [];
    String(text || "").replace(/\{([A-Za-z0-9_ ]+)\}/g, (_, k) => {
      out.push(k);
      return _;
    });
    return out;
  }

  // Wrap AppState UID so everything uses one generator
  function uid(prefix) {
    return AppState.uid(prefix);
  }

  // ---------- INITIAL SEED ----------
  function ensureInitialSeed() {
    if (!state._initialized) {
      // Default apps (same as your previous script)
      if (!Array.isArray(state.apps) || !state.apps.length) {
        state.apps = [
          {
            id: uid("app"),
            name: "Calendly",
            notes: "Client scheduling links for prospect + review meetings.",
            needsFilter: true,
            functions: ["Scheduler"],
            iconId: "", // icon assignment handled via icon UI
            datapointMappings: [
              { id: uid("map"), datapoint: "First Name", inbound: "Invitee First", outbound: "" },
              { id: uid("map"), datapoint: "Last Name",  inbound: "Invitee Last",  outbound: "" },
              { id: uid("map"), datapoint: "Email",      inbound: "Invitee Email", outbound: "" }
            ]
          },
          {
            id: uid("app"),
            name: "ScheduleOnce",
            notes: "Legacy scheduler; may be deprecated.",
            needsFilter: true,
            functions: ["Scheduler"],
            iconId: "",
            datapointMappings: []
          },
          {
            id: uid("app"),
            name: "Wealthbox",
            notes: "",
            needsFilter: false,
            functions: ["CRM","Pipeline Management","Task Management"],
            iconId: "",
            datapointMappings: []
          }
        ];
      }

      // Functions catalog
      if (!Array.isArray(state.functions) || !state.functions.length) {
        state.functions = FUNCTION_TYPES_SEED.map(t => ({
          id: uid("fn"),
          name: t,
          type: t
        }));
      }

      // Team
      if (!Array.isArray(state.teamMembers) || !state.teamMembers.length) {
        state.teamMembers = [
          { id: uid("tm"), name: "Arielle", roleNotes: "", roles: ["Managing Partner"] }
        ];
      }

      // Roles / segments / datapoints defaults
      if (!Array.isArray(state.roles) || !state.roles.length) {
        state.roles = ["Managing Partner", "Advisor", "Client Service Specialist"];
      }
      if (!Array.isArray(state.segments) || !state.segments.length) {
        state.segments = ["Prospects","Paid AUM","Hourly","Pro Bono"];
      }
      if (!Array.isArray(state.datapoints) || !state.datapoints.length) {
        state.datapoints = [
          "First Name","Last Name","Email","Domain","Household","householdName"
        ];
      }

      // Naming + folders
      if (!state.naming || typeof state.naming !== "object") {
        state.naming = {
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
        };
      }
      if (!state.folderHierarchy) {
        state.folderHierarchy =
`Clients/
  {householdName}/
    Meetings/
    Documents/
    Statements/`;
      }
      if (!state.folderPreviewSamples || typeof state.folderPreviewSamples !== "object") {
        state.folderPreviewSamples = {
          First: 'Alex',
          Last: 'Taylor',
          PartnerFirst: 'Jordan',
          PartnerLast: 'Taylor',
          householdName: 'Taylor, Alex & Jordan'
        };
      }

      // Step templates
      if (!Array.isArray(state.stepTemplates) || !state.stepTemplates.length) {
        state.stepTemplates = [
          { id: uid("st"), type:'Schedule Meeting',    title:'Schedule {Meeting Type}',    notes:'Send link; confirm agenda; share pre-reads', checklist:['Send link','Confirm agenda','Attach docs'] },
          { id: uid("st"), type:'Pre-Meeting Prep',    title:'Prep for {Meeting Type}',    notes:'Review CRM notes; prep questions; confirm objectives', checklist:['Review notes','Prep questions','Confirm objectives'] },
          { id: uid("st"), type:'Conduct Meeting',     title:'Conduct {Meeting Type}',     notes:'Run agenda; capture decisions; assign owners', checklist:['Run agenda','Capture decisions','Assign owners'] },
          { id: uid("st"), type:'Post-Meeting Prep',   title:'Post-Meeting Prep',          notes:'Clean notes; draft recap; create tasks', checklist:['Clean notes','Draft recap','Create tasks'] },
          { id: uid("st"), type:'Conduct Phone Call',  title:'Call: {Topic}',              notes:'Short agenda; confirm outcomes; log notes', checklist:['Agenda','Outcomes','Log notes'] },
          { id: uid("st"), type:'Send Email',          title:'Email: {Subject}',           notes:'Draft subject; bullets; CTA', checklist:['Subject','Bullets','CTA'] },
          { id: uid("st"), type:'Send Text Message',   title:'Text: {Context}',            notes:'Short copy; include link if needed', checklist:['Short copy','Optional link'] },
          { id: uid("st"), type:'Request Item',        title:'Request: {Item Name}',       notes:'Specify format; due date; upload location', checklist:['Format','Due date','Upload link'] },
          { id: uid("st"), type:'Follow Up',           title:'Follow Up: {Topic}',         notes:'Reference context; restate ask; next step', checklist:['Context','Ask','Next step'] },
          { id: uid("st"), type:'Item Received',       title:'Item Received: {Item}',      notes:'Verify completeness; file docs; notify', checklist:['Verify','File','Notify'] },
          { id: uid("st"), type:'Task',                title:'Task: {What}',               notes:'Atomic action; definition of done; owner', checklist:['Define done','Assign owner'] },
        ];
      }

      // View modes
      if (!state.appsViewMode) state.appsViewMode = "details";
      if (!state.functionsViewMode) state.functionsViewMode = "details";
      if (!state.integrationsViewMode) state.integrationsViewMode = "details";

      state._initialized = true;
    }
  }

  // ---------- Derived cross-refs ----------
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

        // datapoints from title/description
        tokensIn(st.title).forEach(tok => {
          (dpMap[tok] ||= []).push({
            wfId: wf.id,
            wfName: wf.name,
            stepId: st.id,
            field: "title"
          });
        });
        tokensIn(st.description).forEach(tok => {
          (dpMap[tok] ||= []).push({
            wfId: wf.id,
            wfName: wf.name,
            stepId: st.id,
            field: "description"
          });
        });
      });
    });

    state._refs = { resources: resMap, datapoints: dpMap };
  }

  // ---------- Persist wrapper ----------
  function persist() {
    rebuildCrossRefs();
    AppState.persist();
  }

  // ---------- Function helpers ----------
  function currentFunctionNames() {
    return dedupe((state.functions || []).map(f => f.name).filter(Boolean));
  }

  function getOrCreateFunctionByName(name) {
    name = (name || "").trim();
    if (!name) return null;
    let fn = (state.functions || []).find(f => f.name === name);
    if (!fn) {
      fn = { id: uid("fn"), name, type: "Other" };
      state.functions.push(fn);
    }
    return fn;
  }

  // ---------- Integrations helpers ----------
  function getIntegrationPair(appId1, appId2, createIfMissing = false) {
    if (!appId1 || !appId2 || appId1 === appId2) return null;
    const [a, b] = appId1 < appId2 ? [appId1, appId2] : [appId2, appId1];
    let pair = (state.integrationsMatrix || []).find(
      p => p.appAId === a && p.appBId === b
    );
    if (!pair && createIfMissing) {
      pair = {
        id: uid("int"),
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
    if (pair.hasDirect && pair.hasZapier) return "both";
    if (pair.hasDirect) return "direct";
    if (pair.hasZapier) return "zapier";
    return null;
  }

  // ---------- Resource lookup ----------
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

  // ---------- Bootstrap function assignments ----------
  function bootstrapFunctionAssignmentsFromApps() {
    if ((state.functionAssignments || []).length) return;
    (state.apps || []).forEach(app => {
      (app.functions || []).forEach(fnName => {
        const fn = getOrCreateFunctionByName(fnName);
        if (!fn) return;
        if (!state.functionAssignments.some(a => a.functionId === fn.id && a.appId === app.id)) {
          state.functionAssignments.push({
            id: uid("fa"),
            functionId: fn.id,
            appId: app.id,
            level: "available"
          });
        }
      });
    });
  }

  // ---------- Init core ----------
  ensureInitialSeed();
  bootstrapFunctionAssignmentsFromApps();
  rebuildCrossRefs();
  AppState.persist();

  // ---------- Export ----------
  const api = {
    state,
    persist,
    uid,
    $,
    $all,
    esc,
    dedupe,
    findById,
    tokensIn,
    FUNCTION_TYPES_SEED,
    FUNCTION_LEVELS,
    FN_LEVEL_COLORS,
    INTEG_COLORS,
    currentFunctionNames,
    getOrCreateFunctionByName,
    getIntegrationPair,
    integrationPairsForApp,
    integrationPairColor,
    resourceLookup
  };

  window.AppCore = api;
  return api;
})();
