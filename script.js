/* ===================================================================
   Popup Bagels Lead Manager
   Vanilla JS. State lives in `buildings`, persists to localStorage.

   Architecture:
   - STATE layer  : load/save, and mutators (add/update/delete/reset).
   - DERIVE layer : derive() takes the array and returns all computed
                    values (counts, totals, follow-up queue) so every
                    view reads from one source of truth.
   - RENDER layer : functions that wipe + rebuild DOM from state.
   - render()     : the single entry point called after every change.
   =================================================================== */

'use strict';

/* ---- Constants ---------------------------------------------------- */

// Pipeline stages, in order. Order also drives the dropdowns.
const STATUSES = [
  'Not Contacted',
  'Reached Out',
  'Followed Up',
  'Booked',
  'Declined',
];

// Map each status to its CSS modifier so badges/cards stay color-coded.
const STATUS_CLASS = {
  'Not Contacted': 'st-not',
  'Reached Out': 'st-reached',
  'Followed Up': 'st-followed',
  'Booked': 'st-booked',
  'Declined': 'st-declined',
};

const STORAGE_KEY = 'popupBagels.leads.v1';
const FOLLOWUP_DAYS = 7;   // a "Reached Out" lead this stale needs a nudge

/* ---- State ------------------------------------------------------- */

let buildings = [];   // the single source of truth
let nextId = 1;       // monotonically increasing id, restored on load
let currentFilter = 'All';

/** Load from localStorage, or seed on first ever load. */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    buildings = seedBuildings();
    saveState();
  } else {
    try {
      buildings = JSON.parse(raw);
      if (!Array.isArray(buildings)) buildings = [];
    } catch (e) {
      // Corrupt storage — start clean rather than crash.
      buildings = [];
    }
  }
  // Restore the id counter above any existing id so we never collide.
  nextId = buildings.reduce((max, b) => Math.max(max, b.id), 0) + 1;
}

/** Persist the array. Dates are stored as ISO strings (JSON-safe). */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
}

/** Add a new building from already-validated field values. */
function addBuilding(data) {
  buildings.push({
    id: nextId++,
    name: data.name,
    address: data.address,
    floors: data.floors,
    contact: data.contact,
    status: data.status,
    lastContacted: data.lastContacted, // ISO 'YYYY-MM-DD' or '' (never)
  });
  saveState();
}

/** Update an existing building in place. */
function updateBuilding(id, data) {
  const b = buildings.find((x) => x.id === id);
  if (!b) return;
  Object.assign(b, data);
  saveState();
}

/** Change only the status (used by the per-card dropdown). */
function setStatus(id, status) {
  const b = buildings.find((x) => x.id === id);
  if (!b) return;
  b.status = status;
  saveState();
}

/** Remove a building. */
function deleteBuilding(id) {
  buildings = buildings.filter((b) => b.id !== id);
  saveState();
}

/** Clear everything (called after confirmation). */
function resetState() {
  buildings = [];
  saveState();
}

/* ---- Derived values ---------------------------------------------- */

/**
 * The one place output is computed from state. Returns:
 *   total       — number of leads
 *   counts      — { status: n } for every status
 *   followUps   — leads that are "Reached Out" and stale (>= FOLLOWUP_DAYS)
 * Both the summary and the follow-up queue read from this, so the
 * numbers can never disagree with the list.
 */
function derive(list) {
  const counts = {};
  STATUSES.forEach((s) => (counts[s] = 0));

  const followUps = [];
  for (const b of list) {
    if (counts[b.status] !== undefined) counts[b.status]++;

    if (b.status === 'Reached Out') {
      const days = daysSince(b.lastContacted);
      // days === null means "never contacted" — also worth chasing.
      if (days === null || days >= FOLLOWUP_DAYS) {
        followUps.push({ building: b, days });
      }
    }
  }

  return { total: list.length, counts, followUps };
}

/**
 * Whole-day difference between today and an ISO date string.
 * Returns null when no date is set. Compares at date granularity
 * (midnight to midnight) to avoid off-by-one from clock time.
 */
function daysSince(isoDate) {
  if (!isoDate) return null;
  const then = new Date(isoDate + 'T00:00:00');
  if (isNaN(then.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.floor((today - then) / MS_PER_DAY);
}

/** Filter the list by status for display only (does not mutate state). */
function visibleBuildings() {
  if (currentFilter === 'All') return buildings;
  return buildings.filter((b) => b.status === currentFilter);
}

/* ---- Rendering --------------------------------------------------- */

/** Master render: rebuild every view from current state. */
function render() {
  const d = derive(buildings);
  renderSummary(d);
  renderFollowups(d);
  renderList();
}

function renderSummary(d) {
  const el = document.getElementById('summary-cards');
  el.innerHTML = '';

  el.appendChild(summaryCard('Total leads', d.total, 'total'));
  STATUSES.forEach((s) => {
    el.appendChild(summaryCard(s, d.counts[s], STATUS_CLASS[s]));
  });
}

function summaryCard(label, count, cls) {
  const card = document.createElement('div');
  card.className = 'summary-card ' + cls;
  card.innerHTML =
    '<div class="count"></div><div class="label"></div>';
  card.querySelector('.count').textContent = count;
  card.querySelector('.label').textContent = label;
  return card;
}

function renderFollowups(d) {
  const el = document.getElementById('followup-list');
  el.innerHTML = '';

  if (d.followUps.length === 0) {
    el.appendChild(emptyMsg('All clear — nobody reached out is overdue. 🎉'));
    return;
  }

  d.followUps.forEach(({ building, days }) => {
    const item = document.createElement('div');
    item.className = 'followup-item';

    const left = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = building.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = building.address;
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.className = 'stale';
    right.textContent =
      days === null ? 'Never logged a contact' : days + ' days since contact';

    item.appendChild(left);
    item.appendChild(right);
    el.appendChild(item);
  });
}

function renderList() {
  const el = document.getElementById('lead-list');
  el.innerHTML = '';

  const list = visibleBuildings();

  if (buildings.length === 0) {
    el.appendChild(emptyMsg('No leads yet. Add a building above to get started.'));
    return;
  }
  if (list.length === 0) {
    el.appendChild(emptyMsg('No leads match the "' + currentFilter + '" filter.'));
    return;
  }

  list.forEach((b) => el.appendChild(leadCard(b)));
}

/** Build one lead card. Uses textContent for all user data (no innerHTML
    injection of unescaped strings). */
function leadCard(b) {
  const card = document.createElement('div');
  card.className = 'lead-card';

  // Top: name + address on the left, color-coded badge on the right.
  const top = document.createElement('div');
  top.className = 'card-top';

  const titleWrap = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = b.name;
  const addr = document.createElement('p');
  addr.className = 'addr';
  addr.textContent = b.address;
  titleWrap.appendChild(h3);
  titleWrap.appendChild(addr);

  const badge = document.createElement('span');
  badge.className = 'badge ' + STATUS_CLASS[b.status];
  badge.textContent = b.status;

  top.appendChild(titleWrap);
  top.appendChild(badge);

  // Detail list: floors, contact, last contacted.
  const dl = document.createElement('dl');
  addDetail(dl, 'Floors', String(b.floors));
  addDetail(dl, 'Contact', b.contact ? b.contact : '—');
  addDetail(dl, 'Last contacted', formatDate(b.lastContacted));

  // Status dropdown — change moves the lead through the pipeline.
  const statusRow = document.createElement('div');
  statusRow.className = 'card-status-row';
  const select = buildStatusSelect(b.status);
  select.addEventListener('change', () => {
    setStatus(b.id, select.value);
    render();
  });
  statusRow.appendChild(select);

  // Edit + delete.
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn ghost small';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => startEdit(b.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn danger small';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => {
    if (confirm('Delete "' + b.name + '" from the lead list?')) {
      deleteBuilding(b.id);
      render();
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  statusRow.appendChild(actions);

  card.appendChild(top);
  card.appendChild(dl);
  card.appendChild(statusRow);
  return card;
}

function addDetail(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  dl.appendChild(dt);
  dl.appendChild(dd);
}

function emptyMsg(text) {
  const div = document.createElement('div');
  div.className = 'empty';
  div.textContent = text;
  return div;
}

/** Human-friendly date, or a clear placeholder. Never shows "Invalid Date". */
function formatDate(isoDate) {
  if (!isoDate) return 'Never';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ---- Dropdown builders ------------------------------------------- */

function buildStatusSelect(selected) {
  const select = document.createElement('select');
  STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === selected) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

/** Populate the form's starting-status select and the filter select. */
function populateStaticSelects() {
  const statusSel = document.getElementById('status');
  STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    statusSel.appendChild(opt);
  });

  const filterSel = document.getElementById('filter');
  ['All', ...STATUSES].forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    filterSel.appendChild(opt);
  });
}

/* ---- Form handling (add + edit) ---------------------------------- */

/**
 * Validate the form fields. Returns the cleaned data object on success,
 * or null after painting inline errors. Never uses alert().
 */
function readAndValidateForm() {
  const name = document.getElementById('name').value.trim();
  const address = document.getElementById('address').value.trim();
  const floorsRaw = document.getElementById('floors').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const status = document.getElementById('status').value;
  const lastContacted = document.getElementById('lastContacted').value; // '' or ISO

  // Clear previous errors first.
  setError('name', '');
  setError('address', '');
  setError('floors', '');

  let ok = true;

  if (name === '') {
    setError('name', 'Building name is required.');
    ok = false;
  }
  if (address === '') {
    setError('address', 'Address is required.');
    ok = false;
  }

  // floors must parse to a positive whole number.
  const floors = Number(floorsRaw);
  if (floorsRaw === '' || !Number.isFinite(floors) || floors <= 0 || !Number.isInteger(floors)) {
    setError('floors', 'Floors must be a positive whole number.');
    ok = false;
  }

  if (!ok) return null;
  return { name, address, floors, contact, status, lastContacted };
}

function setError(field, message) {
  document.getElementById(field + '-error').textContent = message;
  document.getElementById(field).classList.toggle('invalid', message !== '');
}

function handleSubmit(event) {
  event.preventDefault();
  const data = readAndValidateForm();
  if (!data) return; // errors already shown inline

  const editingId = document.getElementById('building-id').value;
  if (editingId === '') {
    addBuilding(data);
  } else {
    updateBuilding(Number(editingId), data);
  }

  resetForm();
  render();
}

/** Load a building's values into the form for editing. */
function startEdit(id) {
  const b = buildings.find((x) => x.id === id);
  if (!b) return;

  document.getElementById('building-id').value = String(b.id);
  document.getElementById('name').value = b.name;
  document.getElementById('address').value = b.address;
  document.getElementById('floors').value = b.floors;
  document.getElementById('contact').value = b.contact;
  document.getElementById('status').value = b.status;
  document.getElementById('lastContacted').value = b.lastContacted || '';

  document.getElementById('form-heading').textContent = 'Edit building';
  document.getElementById('submit-btn').textContent = 'Save changes';
  document.getElementById('cancel-edit-btn').hidden = false;

  // Bring the form into view so it's obvious we switched to edit mode.
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
}

/** Reset the form back to "add" mode and clear errors. */
function resetForm() {
  document.getElementById('building-form').reset();
  document.getElementById('building-id').value = '';
  setError('name', '');
  setError('address', '');
  setError('floors', '');
  document.getElementById('form-heading').textContent = 'Add a building';
  document.getElementById('submit-btn').textContent = 'Add building';
  document.getElementById('cancel-edit-btn').hidden = true;
}

/* ---- Seed data --------------------------------------------------- */

/**
 * 5–6 realistic Chicago office towers so the demo isn't empty.
 * lastContacted is computed relative to today so the follow-up queue
 * has something to show no matter when the page is first opened.
 */
function seedBuildings() {
  const seeds = [
    { name: 'Willis Tower', address: '233 S Wacker Dr', floors: 110,
      contact: 'Property mgmt — EQ Office front desk', status: 'Reached Out', daysAgo: 12 },
    { name: 'Aon Center', address: '200 E Randolph St', floors: 83,
      contact: 'Tenant services coordinator', status: 'Followed Up', daysAgo: 3 },
    { name: 'Franklin Center', address: '227 W Monroe St', floors: 60,
      contact: 'Lobby events lead, Tishman Speyer', status: 'Booked', daysAgo: 5 },
    { name: 'Chase Tower', address: '10 S Dearborn St', floors: 60,
      contact: '', status: 'Not Contacted', daysAgo: null },
    { name: '875 N Michigan Ave (Hancock)', address: '875 N Michigan Ave', floors: 100,
      contact: 'Observatory/retail liaison', status: 'Reached Out', daysAgo: 9 },
    { name: 'Two Prudential Plaza', address: '180 N Stetson Ave', floors: 64,
      contact: 'Declined — no food vendors policy', status: 'Declined', daysAgo: 20 },
  ];

  let id = 1;
  return seeds.map((s) => ({
    id: id++,
    name: s.name,
    address: s.address,
    floors: s.floors,
    contact: s.contact,
    status: s.status,
    lastContacted: s.daysAgo === null ? '' : isoDaysAgo(s.daysAgo),
  }));
}

/** ISO 'YYYY-MM-DD' for N days before today. */
function isoDaysAgo(n) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

/* ---- Wire-up ----------------------------------------------------- */

function init() {
  populateStaticSelects();
  loadState();

  document.getElementById('building-form').addEventListener('submit', handleSubmit);
  document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

  document.getElementById('filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderList(); // only the list depends on the filter
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (buildings.length === 0) return;
    if (confirm('Reset all leads? This permanently clears the list.')) {
      resetState();
      currentFilter = 'All';
      document.getElementById('filter').value = 'All';
      resetForm();
      render();
    }
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
