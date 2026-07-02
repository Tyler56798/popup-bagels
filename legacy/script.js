/* ===================================================================
   PopUp Bagels Lead Manager — CRM logic (vanilla JS)

   Layers, kept separate:
     STATE   : load/save (localStorage) + mutations
     DERIVE  : derive() -> stats; applyView() -> filtered+sorted list
     DISPLAY : label dictionary + value expanders (no raw codes ever)
     RENDER  : build DOM from state
   Data comes from window.POPUP_BAGELS_DATA (data.js).
   =================================================================== */

'use strict';

/* ===================== Constants & dictionaries ==================== */

const STAGES = ['Not Contacted', 'Reached Out', 'Followed Up', 'Booked', 'Declined'];

const STAGE_CLASS = {
  'Not Contacted': 'stage-not',
  'Reached Out': 'stage-reached',
  'Followed Up': 'stage-followed',
  'Booked': 'stage-booked',
  'Declined': 'stage-declined',
};

// Human labels for every field shown in the detail panel.
const LABELS = {
  buildingName: 'Building Name', alsoKnownAs: 'Also Known As',
  streetAddress: 'Street Address', zip: 'ZIP Code', submarket: 'Submarket',
  classRating: 'Building Class', classRatingSource: 'Class Rating Source',
  yearBuiltOrRenovated: 'Year Built / Renovated', yearBuilt: 'Year Built',
  officeOrMixedUse: 'Property Type', multiTenantOffice: 'Multi-Tenant Office',
  rentableSf: 'Rentable Square Feet', numFloors: 'Number of Floors',
  lobbyType: 'Lobby Type', estDaytimePopulation: 'Estimated Daytime Population',
  estDaytimePopulationBasis: 'Daytime Population Basis',
  ownerEntity: 'Ownership Entity', ownerSourceUrl: 'Ownership Source',
  ownerVerifiedDate: 'Ownership Verified Date', recentOwnershipChange: 'Recent Ownership Change',
  propertyManagerFirm: 'Property Manager', inHouseManagement: 'In-House Management',
  leasingBrokerage: 'Leasing Brokerage', buildingWebsite: 'Building Website',
  tenantApp: 'Tenant App', tenantExperienceProgramName: 'Tenant Experience Program',
  popUpLobbyViability: 'Pop-Up Lobby Viability', popUpLobbyViabilityRationale: 'Pop-Up Viability Rationale',
  buildingStatus: 'Building Status', magMileCohort: 'Magnificent Mile Cohort',
  confidence1c: 'Data Confidence', lastVerifiedDate1c: 'Last Verified',
  mainManagementPhone: 'Main Management Phone', generalInfoEmail: 'General Info Email',
  leasingContactEmail: 'Leasing Contact Email',
  lobbyActivationHistory: 'Lobby Activation History', lobbyActivationEvidence: 'Activation Evidence',
  knownFoodVendorsOnsite: 'Known Food Vendors On-Site', recentLeasingActivity: 'Recent Leasing Activity',
  recentLeasingEvidence: 'Recent Leasing Evidence',
  anchorTenantsTop5: 'Anchor Tenants', industryMixSummary: 'Industry Mix',
  softCriteriaCount: 'Soft Criteria Met (out of 4)', leadScore: 'Lead Score',
  leadScoreRationale: 'Lead Score Rationale', wave: 'Outreach Wave',
  outreachStatus: 'Outreach Status', magMilePlay: 'Magnificent Mile Strategy',
  notes: 'Notes',
};

// Detail-panel sections (Contacts is rendered specially).
const SECTIONS = [
  { title: 'Building Overview', keys: ['alsoKnownAs', 'streetAddress', 'zip', 'submarket', 'classRating', 'classRatingSource', 'yearBuiltOrRenovated', 'officeOrMixedUse', 'multiTenantOffice', 'rentableSf', 'numFloors', 'lobbyType', 'estDaytimePopulation', 'estDaytimePopulationBasis', 'buildingStatus', 'buildingWebsite'] },
  { title: 'Ownership & Management', keys: ['ownerEntity', 'ownerSourceUrl', 'ownerVerifiedDate', 'recentOwnershipChange', 'propertyManagerFirm', 'inHouseManagement', 'leasingBrokerage', 'mainManagementPhone', 'generalInfoEmail', 'leasingContactEmail'] },
  { title: 'Tenant Experience & Activation', keys: ['tenantApp', 'tenantExperienceProgramName', 'lobbyActivationHistory', 'lobbyActivationEvidence', 'knownFoodVendorsOnsite', 'recentLeasingActivity', 'recentLeasingEvidence'] },
  { title: 'Contacts', contacts: true },
  { title: 'Tenants & Industry', keys: ['anchorTenantsTop5', 'industryMixSummary'] },
  { title: 'Pop-Up Viability', keys: ['popUpLobbyViability', 'popUpLobbyViabilityRationale'] },
  { title: 'Lead Scoring & Strategy', keys: ['leadScore', 'leadScoreRationale', 'softCriteriaCount', 'wave', 'outreachStatus', 'magMileCohort', 'magMilePlay', 'confidence1c', 'lastVerifiedDate1c', 'notes'] },
];

// Value expansion maps (never show a raw code).
const LOBBY_MAP = { security_gated: 'Security-Gated', open_public: 'Open to the Public', hybrid: 'Hybrid (public + secured)' };
const STATUS_MAP = { operating_normal: 'Operating Normally', operating_with_vacancy: 'Operating with Vacancy', recently_delivered: 'Recently Delivered' };
const VIA_MAP = { strong: 'Strong', acceptable: 'Acceptable', weak: 'Weak', not_viable: 'Not Viable' };
const VIA_CLASS = { strong: 'via-strong', acceptable: 'via-acceptable', weak: 'via-weak', not_viable: 'via-not_viable' };
const MAGMILE_MAP = { primary: 'Primary (lead contact)', secondary: 'Secondary (warm intro)', parallel: 'Parallel (pitch separately)' };
const EMAIL_STATUS_MAP = { verified: 'Verified', pattern_unverified: 'Pattern (unverified)', not_found: 'Not found' };
const PROPTYPE_MAP = { office: 'Office', mixed_use: 'Mixed-Use' };

const URL_KEYS = new Set(['buildingWebsite', 'ownerSourceUrl', 'txLinkedinUrl', 'gmLinkedinUrl', 'opsLinkedinUrl']);
const YESNO_KEYS = new Set(['multiTenantOffice', 'magMileCohort', 'recentOwnershipChange', 'inHouseManagement', 'lobbyActivationHistory', 'recentLeasingActivity']);

const STORAGE_KEY = 'popupBagels.crm.v2';

/* ===================== Display helpers ============================ */

function cap(s) { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function titleCaseCode(s) {
  return String(s || '').trim().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }

// yes/no, preserving any parenthetical qualifier in the source.
function yesNo(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low.startsWith('yes')) return 'Yes' + s.slice(3);
  if (low.startsWith('no')) return 'No' + s.slice(2);
  if (low === 'unknown') return 'Unknown';
  return cap(s);
}

// The one place a raw stored value becomes display text. Returns '' to skip.
function formatValue(key, b) {
  const v = b[key];
  if (key === 'notes') {
    return [b.notes, b.notes1b, b.notes1c]
      .map((x) => String(x || '').trim()).filter(Boolean)
      .filter((x, i, arr) => arr.indexOf(x) === i).join('  •  ');
  }
  const raw = String(v == null ? '' : v).trim();
  if (raw === '') return '';

  switch (key) {
    case 'rentableSf': return fmtNum(b.rentableSfNum) + ' sq ft';
    case 'estDaytimePopulation': return fmtNum(b.estDaytimePopulationNum) + ' people';
    case 'lobbyType': return LOBBY_MAP[raw] || titleCaseCode(raw);
    case 'buildingStatus': return STATUS_MAP[raw] || titleCaseCode(raw);
    case 'officeOrMixedUse': return PROPTYPE_MAP[raw] || titleCaseCode(raw);
    case 'popUpLobbyViability': return VIA_MAP[raw] || cap(raw);
    case 'magMilePlay': return MAGMILE_MAP[raw] || titleCaseCode(raw);
    case 'confidence1c': return cap(raw);
    case 'softCriteriaCount': return (b.softCriteriaCountNum || 0) + ' of 4';
    case 'wave': return /^\d+$/.test(raw) ? 'Wave ' + raw : titleCaseCode(raw);
    case 'txEmailStatus': case 'gmEmailStatus': case 'opsEmailStatus':
      return EMAIL_STATUS_MAP[raw] || titleCaseCode(raw);
    default:
      if (YESNO_KEYS.has(key)) return yesNo(raw);
      return raw;
  }
}

function viabilityDisplay(raw) { return VIA_MAP[raw] || cap(raw) || '—'; }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } }

/* ===================== Tiny DOM helpers =========================== */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function link(url, label) {
  const a = el('a', null, label || url);
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}

/* ===================== State ====================================== */

let buildings = [];
const view = { stage: 'All', submarket: 'All', viability: 'All', wave: 'All', magMile: false, search: '', sort: 'score-desc' };
let selectedId = null;

function freshFromData() {
  // Deep clone so edits never mutate the seed in data.js.
  return JSON.parse(JSON.stringify(window.POPUP_BAGELS_DATA || []));
}
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      buildings = Array.isArray(parsed) ? parsed : freshFromData();
    } catch (e) { buildings = freshFromData(); }
  } else {
    buildings = freshFromData();
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings)); }

function setStage(id, stage) {
  const b = buildings.find((x) => x.id === id);
  if (b) { b.outreachStatus = stage; saveState(); }
}
function deleteBuilding(id) { buildings = buildings.filter((b) => b.id !== id); saveState(); }
function resetToOriginal() { buildings = freshFromData(); localStorage.removeItem(STORAGE_KEY); }

/* ===================== Derived values ============================= */

// All stat-bar numbers derive from state here.
function derive(list) {
  const counts = {};
  STAGES.forEach((s) => (counts[s] = 0));
  let strong = 0, pop = 0;
  for (const b of list) {
    if (counts[b.outreachStatus] !== undefined) counts[b.outreachStatus]++;
    if (b.popUpLobbyViability === 'strong') strong++;
    pop += b.estDaytimePopulationNum || 0;
  }
  return { total: list.length, counts, strong, pop };
}

// Filtered + sorted list for the table (derived, never mutates state).
function applyView() {
  let list = buildings.filter((b) => {
    if (view.stage !== 'All' && b.outreachStatus !== view.stage) return false;
    if (view.submarket !== 'All' && b.submarket !== view.submarket) return false;
    if (view.viability !== 'All' && b.popUpLobbyViability !== view.viability) return false;
    if (view.wave !== 'All' && String(b.wave) !== view.wave) return false;
    if (view.magMile && String(b.magMileCohort).toLowerCase() !== 'yes') return false;
    if (view.search) {
      const hay = (b.buildingName + ' ' + (b.alsoKnownAs || '')).toLowerCase();
      if (!hay.includes(view.search.toLowerCase())) return false;
    }
    return true;
  });

  const by = view.sort;
  list.sort((a, b) => {
    if (by === 'score-desc') return (b.leadScoreNum - a.leadScoreNum) || (b.estDaytimePopulationNum - a.estDaytimePopulationNum);
    if (by === 'pop-desc') return b.estDaytimePopulationNum - a.estDaytimePopulationNum;
    if (by === 'name-asc') return a.buildingName.localeCompare(b.buildingName);
    return 0;
  });
  return list;
}

/* ===================== Rendering ================================== */

function render() {
  renderStats(derive(buildings));
  renderTable(applyView());
}

function renderStats(d) {
  const bar = document.getElementById('statbar');
  bar.innerHTML = '';

  bar.appendChild(statCard(d.total, 'Total buildings', 'accent'));
  STAGES.forEach((s) => {
    const card = statCard(d.counts[s], s);
    const dot = el('span', 'dot');
    dot.style.background = `var(--${cssVarForStage(s)})`;
    card.querySelector('.k').prepend(dot);
    bar.appendChild(card);
  });
  bar.appendChild(statCard(d.strong, 'Strong viability'));
  bar.appendChild(statCard(fmtNum(d.pop), 'Daytime population'));
}
function cssVarForStage(s) {
  return { 'Not Contacted': 'st-not', 'Reached Out': 'st-reached', 'Followed Up': 'st-followed', 'Booked': 'st-booked', 'Declined': 'st-declined' }[s];
}
function statCard(value, label, extra) {
  const c = el('div', 'stat' + (extra ? ' ' + extra : ''));
  c.appendChild(el('div', 'v', String(value)));
  c.appendChild(el('div', 'k', label));
  return c;
}

function renderTable(list) {
  const body = document.getElementById('leads-body');
  const empty = document.getElementById('empty-state');
  body.innerHTML = '';

  document.getElementById('result-count').innerHTML =
    'Buildings <span>· ' + list.length + ' of ' + buildings.length + '</span>';

  if (list.length === 0) {
    empty.hidden = false;
    empty.textContent = buildings.length === 0
      ? 'No buildings. Use “Reset data” to reload the dataset.'
      : 'No buildings match the current filters.';
    return;
  }
  empty.hidden = true;

  list.forEach((b) => body.appendChild(leadRow(b)));
}

function leadRow(b) {
  const tr = el('tr');
  tr.tabIndex = 0;
  tr.setAttribute('role', 'button');
  tr.setAttribute('aria-label', 'Open ' + b.buildingName);

  // Name + also-known-as
  const name = el('td', 'cell-name');
  name.appendChild(document.createTextNode(b.buildingName));
  if (b.alsoKnownAs) name.appendChild(el('small', null, b.alsoKnownAs));
  tr.appendChild(name);

  tr.appendChild(el('td', null, b.submarket || '—'));
  tr.appendChild(el('td', null, b.classRating ? 'Class ' + b.classRating : '—'));

  // Lead score chip
  const scoreTd = el('td', 'cell-score');
  const chip = el('span', 'score score-' + (b.leadScoreNum || 0), String(b.leadScoreNum || 0));
  scoreTd.appendChild(chip);
  tr.appendChild(scoreTd);

  // Viability badge
  const viaTd = el('td');
  const via = el('span', 'badge ' + (VIA_CLASS[b.popUpLobbyViability] || 'via-not_viable'), viabilityDisplay(b.popUpLobbyViability));
  viaTd.appendChild(via);
  tr.appendChild(viaTd);

  // Inline stage select (does not open the panel)
  const stageTd = el('td');
  const wrap = el('span', 'row-stage');
  const sel = stageSelect(b.outreachStatus);
  sel.name = 'stage-' + b.id;
  sel.setAttribute('aria-label', 'Outreach stage for ' + b.buildingName);
  sel.classList.add(STAGE_CLASS[b.outreachStatus]);
  sel.addEventListener('click', (e) => e.stopPropagation());
  sel.addEventListener('change', () => { setStage(b.id, sel.value); render(); if (selectedId === b.id) openDetail(b.id); });
  wrap.appendChild(sel);
  stageTd.appendChild(wrap);
  tr.appendChild(stageTd);

  tr.addEventListener('click', () => openDetail(b.id));
  tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(b.id); } });
  return tr;
}

function stageSelect(current) {
  const sel = el('select');
  STAGES.forEach((s) => {
    const o = el('option', null, s); o.value = s;
    if (s === current) o.selected = true;
    sel.appendChild(o);
  });
  return sel;
}

/* ---------- Detail slide-in panel ---------- */

function openDetail(id) {
  const b = buildings.find((x) => x.id === id);
  if (!b) return;
  selectedId = id;

  document.getElementById('detail-title').textContent = b.buildingName;
  const sub = [b.submarket, b.classRating ? 'Class ' + b.classRating : '', b.streetAddress].filter(Boolean).join('  ·  ');
  document.getElementById('detail-sub').textContent = sub;

  // Stage dropdown in the panel
  const stageWrap = document.getElementById('detail-stage');
  stageWrap.innerHTML = '';
  STAGES.forEach((s) => { const o = el('option', null, s); o.value = s; if (s === b.outreachStatus) o.selected = true; stageWrap.appendChild(o); });

  const body = document.getElementById('detail-body');
  body.innerHTML = '';
  SECTIONS.forEach((sec) => {
    if (sec.contacts) { const node = contactsSection(b); if (node) body.appendChild(node); return; }
    const node = kvSection(sec, b);
    if (node) body.appendChild(node);
  });

  const panel = document.getElementById('detail-panel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('panel-overlay').hidden = false;
  requestAnimationFrame(() => document.getElementById('panel-overlay').classList.add('show'));
}

function kvSection(sec, b) {
  const dl = el('dl', 'kv');
  let any = false;
  sec.keys.forEach((key) => {
    const val = formatValue(key, b);
    if (!val) return;
    any = true;
    dl.appendChild(el('dt', null, LABELS[key] || titleCaseCode(key)));
    const dd = el('dd');
    if (URL_KEYS.has(key)) {
      const label = key === 'buildingWebsite' ? hostname(val) : (key === 'ownerSourceUrl' ? 'View source' : 'LinkedIn');
      dd.appendChild(/^https?:\/\//.test(val) ? link(val, label) : document.createTextNode(val));
    } else {
      dd.textContent = val;
    }
    dl.appendChild(dd);
  });
  if (!any) return null;
  const section = el('div', 'section');
  section.appendChild(el('h3', null, sec.title));
  section.appendChild(dl);
  return section;
}

function contactsSection(b) {
  const defs = [
    { role: 'Tenant Experience', p: 'tx' },
    { role: 'General Manager', p: 'gm' },
    { role: 'Operations', p: 'ops' },
  ];
  const section = el('div', 'section');
  section.appendChild(el('h3', null, 'Contacts'));
  let any = false;

  defs.forEach((d) => {
    const name = b[d.p + 'Name'], title = b[d.p + 'Title'];
    const email = b[d.p + 'Email'], phone = b[d.p + 'Phone'];
    const status = b[d.p + 'EmailStatus'], linkedin = b[d.p + 'LinkedinUrl'], source = b[d.p + 'Source'];
    if (!name && !title) return; // no person on file for this role
    any = true;

    const card = el('div', 'contact-card');
    card.appendChild(el('div', 'cc-role', d.role));
    card.appendChild(el('div', 'cc-name', name || '—'));
    if (title) card.appendChild(el('div', 'cc-title', title));

    if (email) {
      const line = el('div', 'cc-line');
      line.appendChild(el('span', null, 'Email: '));
      line.appendChild(document.createTextNode(email));
      if (status) line.appendChild(document.createTextNode('  (' + (EMAIL_STATUS_MAP[status] || titleCaseCode(status)) + ')'));
      card.appendChild(line);
    } else if (status) {
      // Email itself is masked/absent, but the pattern status is still useful.
      const line = el('div', 'cc-line');
      line.appendChild(el('span', null, 'Email status: '));
      line.appendChild(document.createTextNode(EMAIL_STATUS_MAP[status] || titleCaseCode(status)));
      card.appendChild(line);
    }
    if (phone) {
      const line = el('div', 'cc-line');
      line.appendChild(el('span', null, 'Phone: '));
      line.appendChild(document.createTextNode(phone));
      card.appendChild(line);
    }
    if (linkedin && /^https?:\/\//.test(linkedin)) {
      const line = el('div', 'cc-line');
      line.appendChild(link(linkedin, 'LinkedIn profile'));
      card.appendChild(line);
    }
    if (!email && !phone) card.appendChild(el('div', 'cc-none', 'Direct email/phone not shown in this public dataset.'));
    if (source) card.appendChild(el('div', 'cc-none', 'Source: ' + source));
    section.appendChild(card);
  });

  if (!any) return null;
  return section;
}

function closeDetail() {
  const panel = document.getElementById('detail-panel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  const ov = document.getElementById('panel-overlay');
  ov.classList.remove('show');
  setTimeout(() => { ov.hidden = true; }, 200);
  selectedId = null;
}

/* ===================== Filters & sort wiring ===================== */

function populateFilters() {
  const stageSel = document.getElementById('filter-stage');
  fillSelect(stageSel, ['All', ...STAGES]);

  const submarkets = [...new Set(buildings.map((b) => b.submarket).filter(Boolean))].sort();
  fillSelect(document.getElementById('filter-submarket'), ['All', ...submarkets]);

  fillSelect(document.getElementById('filter-viability'),
    [['All', 'All'], ['strong', 'Strong'], ['acceptable', 'Acceptable'], ['weak', 'Weak'], ['not_viable', 'Not Viable']]);

  const waves = [...new Set(buildings.map((b) => String(b.wave)).filter((w) => /^\d+$/.test(w)))].sort();
  fillSelect(document.getElementById('filter-wave'),
    [['All', 'All'], ...waves.map((w) => [w, 'Wave ' + w])]);

  // Edit-modal stage select
  fillSelect(document.getElementById('edit-stage'), STAGES);
}
function fillSelect(sel, items) {
  sel.innerHTML = '';
  items.forEach((it) => {
    const [val, label] = Array.isArray(it) ? it : [it, it];
    const o = el('option', null, label); o.value = val;
    sel.appendChild(o);
  });
}

/* ===================== Edit / Add modal ========================== */

function openEdit(id) {
  const isNew = !id;
  const b = isNew ? null : buildings.find((x) => x.id === id);
  document.getElementById('modal-title').textContent = isNew ? 'Add building' : 'Edit building';
  document.getElementById('edit-id').value = isNew ? '' : id;
  document.getElementById('edit-name').value = b ? b.buildingName : '';
  document.getElementById('edit-address').value = b ? b.streetAddress : '';
  document.getElementById('edit-submarket').value = b ? b.submarket : '';
  document.getElementById('edit-class').value = b ? b.classRating : '';
  document.getElementById('edit-floors').value = b ? (b.numFloorsNum || '') : '';
  document.getElementById('edit-score').value = b ? (b.leadScoreNum || '') : '';
  document.getElementById('edit-viability').value = b ? (b.popUpLobbyViability || 'acceptable') : 'acceptable';
  document.getElementById('edit-stage').value = b ? b.outreachStatus : 'Not Contacted';
  document.getElementById('edit-tx').value = b ? (b.txName || '') : '';
  document.getElementById('edit-notes').value = b ? (b.notes || '') : '';
  ['name', 'address', 'floors', 'score'].forEach((f) => setErr(f, ''));
  document.getElementById('modal-overlay').hidden = false;
  document.getElementById('edit-name').focus();
}
function closeEdit() { document.getElementById('modal-overlay').hidden = true; }
function setErr(f, msg) {
  document.getElementById('err-' + f).textContent = msg;
  document.getElementById('edit-' + f).classList.toggle('invalid', !!msg);
}

function submitEdit(e) {
  e.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const floorsRaw = document.getElementById('edit-floors').value.trim();
  const scoreRaw = document.getElementById('edit-score').value.trim();
  ['name', 'address', 'floors', 'score'].forEach((f) => setErr(f, ''));

  let ok = true;
  if (!name) { setErr('name', 'Building name is required.'); ok = false; }
  if (!address) { setErr('address', 'Street address is required.'); ok = false; }
  const floors = Number(floorsRaw);
  if (floorsRaw && (!Number.isInteger(floors) || floors <= 0)) { setErr('floors', 'Floors must be a positive whole number.'); ok = false; }
  const score = Number(scoreRaw);
  if (scoreRaw && (!Number.isInteger(score) || score < 0 || score > 5)) { setErr('score', 'Score must be 0–5.'); ok = false; }
  if (!ok) return;

  const data = {
    buildingName: name, streetAddress: address,
    submarket: document.getElementById('edit-submarket').value.trim(),
    classRating: document.getElementById('edit-class').value.trim(),
    numFloors: floorsRaw, numFloorsNum: floorsRaw ? floors : 0,
    leadScore: scoreRaw, leadScoreNum: scoreRaw ? score : 0,
    popUpLobbyViability: document.getElementById('edit-viability').value,
    outreachStatus: document.getElementById('edit-stage').value,
    txName: document.getElementById('edit-tx').value.trim(),
    notes: document.getElementById('edit-notes').value.trim(),
  };

  const id = document.getElementById('edit-id').value;
  if (id) {
    Object.assign(buildings.find((x) => x.id === id), data);
  } else {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newB = Object.assign(blankBuilding(), data, { id: 'custom-' + slug + '-' + (buildings.length + 1) });
    buildings.push(newB);
  }
  saveState();
  closeEdit();
  render();
  if (id) openDetail(id);
}

// A building object with all expected keys, so the detail panel never breaks.
function blankBuilding() {
  const o = {};
  Object.keys(LABELS).forEach((k) => (o[k] = ''));
  Object.assign(o, {
    notes1b: '', notes1c: '', rentableSfNum: 0, estDaytimePopulationNum: 0,
    numFloorsNum: 0, leadScoreNum: 0, softCriteriaCountNum: 0,
    txName: '', txTitle: '', txEmail: '', txPhone: '', txEmailStatus: '', txLinkedinUrl: '', txSource: '',
    gmName: '', gmTitle: '', gmEmail: '', gmPhone: '', gmEmailStatus: '', gmLinkedinUrl: '', gmSource: '',
    opsName: '', opsTitle: '', opsEmail: '', opsPhone: '', opsEmailStatus: '', opsLinkedinUrl: '', opsSource: '',
    outreachStatus: 'Not Contacted', popUpLobbyViability: 'acceptable', wave: '',
  });
  return o;
}

/* ===================== Confirm dialog ============================ */

let confirmCb = null;
function askConfirm(message, cb) {
  document.getElementById('confirm-msg').textContent = message;
  document.getElementById('confirm-overlay').hidden = false;
  confirmCb = cb;
}
function closeConfirm() { document.getElementById('confirm-overlay').hidden = true; confirmCb = null; }

/* ===================== Wire-up =================================== */

function init() {
  loadState();
  populateFilters();
  render();

  // Search
  document.getElementById('search').addEventListener('input', (e) => { view.search = e.target.value; renderTable(applyView()); });

  // Filters
  document.getElementById('filter-stage').addEventListener('change', (e) => { view.stage = e.target.value; renderTable(applyView()); });
  document.getElementById('filter-submarket').addEventListener('change', (e) => { view.submarket = e.target.value; renderTable(applyView()); });
  document.getElementById('filter-viability').addEventListener('change', (e) => { view.viability = e.target.value; renderTable(applyView()); });
  document.getElementById('filter-wave').addEventListener('change', (e) => { view.wave = e.target.value; renderTable(applyView()); });
  document.getElementById('filter-magmile').addEventListener('change', (e) => { view.magMile = e.target.checked; renderTable(applyView()); });
  document.getElementById('sort').addEventListener('change', (e) => { view.sort = e.target.value; renderTable(applyView()); });

  document.getElementById('clear-filters').addEventListener('click', () => {
    Object.assign(view, { stage: 'All', submarket: 'All', viability: 'All', wave: 'All', magMile: false, search: '' });
    document.getElementById('filter-stage').value = 'All';
    document.getElementById('filter-submarket').value = 'All';
    document.getElementById('filter-viability').value = 'All';
    document.getElementById('filter-wave').value = 'All';
    document.getElementById('filter-magmile').checked = false;
    document.getElementById('search').value = '';
    renderTable(applyView());
  });

  // Detail panel
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('panel-overlay').addEventListener('click', closeDetail);
  document.getElementById('detail-stage').addEventListener('change', (e) => {
    if (selectedId) { setStage(selectedId, e.target.value); render(); }
  });
  document.getElementById('detail-edit').addEventListener('click', () => { if (selectedId) openEdit(selectedId); });
  document.getElementById('detail-delete').addEventListener('click', () => {
    if (!selectedId) return;
    const b = buildings.find((x) => x.id === selectedId);
    askConfirm('Delete “' + (b ? b.buildingName : 'this building') + '” from the pipeline?', () => {
      deleteBuilding(selectedId); closeDetail(); render();
    });
  });

  // Add / edit modal
  document.getElementById('add-btn').addEventListener('click', () => openEdit(null));
  document.getElementById('modal-close').addEventListener('click', closeEdit);
  document.getElementById('modal-cancel').addEventListener('click', closeEdit);
  document.getElementById('edit-form').addEventListener('submit', submitEdit);

  // Reset
  document.getElementById('reset-btn').addEventListener('click', () => {
    askConfirm('Reset all leads to the original 88-building dataset? This discards your changes.', () => {
      resetToOriginal();
      Object.assign(view, { stage: 'All', submarket: 'All', viability: 'All', wave: 'All', magMile: false, search: '', sort: 'score-desc' });
      ['filter-stage', 'filter-submarket', 'filter-viability', 'filter-wave'].forEach((id) => (document.getElementById(id).value = 'All'));
      document.getElementById('filter-magmile').checked = false;
      document.getElementById('search').value = '';
      document.getElementById('sort').value = 'score-desc';
      closeDetail();
      render();
    });
  });

  // Confirm dialog
  document.getElementById('confirm-yes').addEventListener('click', () => { const cb = confirmCb; closeConfirm(); if (cb) cb(); });
  document.getElementById('confirm-no').addEventListener('click', closeConfirm);

  // Escape closes panels/modals
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('confirm-overlay').hidden) closeConfirm();
    else if (!document.getElementById('modal-overlay').hidden) closeEdit();
    else if (document.getElementById('detail-panel').classList.contains('open')) closeDetail();
  });
}

document.addEventListener('DOMContentLoaded', init);
