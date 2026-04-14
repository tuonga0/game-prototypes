// =====================================================================
// CUSTOMS CARGO — Level Editor
// =====================================================================

// Data — injected by data/avatars.js and data/tags.js script tags
// Fallback to empty arrays if not loaded
const AVATARS        = window.AVATARS_DATA        || [];
const AVAILABLE_TAGS = window.AVAILABLE_TAGS_DATA || [];

// State
const E = {
  level: null,
  activeTab: 'settings',
  avatarSearchQuery: '',
  avatarTagFilter: '',
  assignTarget: null,  // { customsIdx } — which customs lane is being assigned to
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  populateTagFilter();
  populateAvatarGrid();
  newLevel();
  renderTabs();
});

// ============================================================
// LEVEL MANAGEMENT
// ============================================================
function newLevel() {
  E.level = {
    id:         'level_' + Date.now(),
    name:       'New Level',
    laneCount:  2,
    lanes: [
      defaultLane(),
      defaultLane(),
    ],
    customs: [
      defaultCustoms(0),
      defaultCustoms(1),
    ],
  };
  renderAll();
}

function defaultLane() {
  return {
    spawnInterval: 4,
    shipSpeed:     2,
    slotCount:     2,
    phases:        [],
  };
}

function defaultCustoms(laneIndex) {
  return {
    laneIndex,
    correctAvatars: [],
    displayHint: { required: [], banned: [] },
    phases: [{ count: 6 }],
  };
}

// ============================================================
// SAVE / LOAD / EXPORT
// ============================================================
function saveLevel() {
  const stored = getSavedLevels();
  stored[E.level.id] = E.level;
  localStorage.setItem('customsCargo_levels', JSON.stringify(stored));
  showEditorToast('Level saved! 💾');
}

function getSavedLevels() {
  try { return JSON.parse(localStorage.getItem('customsCargo_levels') || '{}'); }
  catch { return {}; }
}

function exportLevel() {
  const json = JSON.stringify(E.level, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (E.level.name || 'level').replace(/\s+/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importLevel() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file   = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        E.level = data;
        renderAll();
        showEditorToast('Level imported! ✅');
      } catch {
        showEditorToast('Invalid JSON file ❌', 'danger');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function loadSavedLevel(id) {
  const stored = getSavedLevels();
  if (stored[id]) {
    E.level = stored[id];
    renderAll();
    showEditorToast('Level loaded!');
  }
}

function deleteSavedLevel(id) {
  if (!confirm('Delete this level?')) return;
  const stored = getSavedLevels();
  delete stored[id];
  localStorage.setItem('customsCargo_levels', JSON.stringify(stored));
  renderSavedLevelsList();
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  renderSettings();
  renderLanes();
  renderCustoms();
  renderSavedLevelsList();
}

// ============================================================
// TABS
// ============================================================
function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === E.activeTab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== 'tab-' + E.activeTab);
  });
}

function switchTab(tab) {
  E.activeTab = tab;
  renderTabs();
}

// ============================================================
// TAB 1: SETTINGS
// ============================================================
function renderSettings() {
  document.getElementById('level-name').value = E.level.name || '';
  document.getElementById('lane-count').value = E.level.laneCount;
  renderSavedLevelsList();
}

function renderSavedLevelsList() {
  const stored = getSavedLevels();
  const list   = document.getElementById('saved-levels-list');
  const ids    = Object.keys(stored);
  if (ids.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved levels yet</div>';
    return;
  }
  list.innerHTML = ids.map(id => {
    const lvl = stored[id];
    return `<div class="saved-level-item">
      <span class="saved-level-name">${lvl.name || id}</span>
      <div class="saved-level-actions">
        <button class="btn-sm btn-load" onclick="loadSavedLevel('${id}')">Load</button>
        <button class="btn-sm btn-del"  onclick="deleteSavedLevel('${id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function onLaneCountChange(val) {
  const n = parseInt(val);
  if (n < 2 || n > 4) return;

  // Adjust lanes array
  while (E.level.lanes.length < n) E.level.lanes.push(defaultLane());
  while (E.level.lanes.length > n) E.level.lanes.pop();

  // Adjust customs array
  while (E.level.customs.length < n) E.level.customs.push(defaultCustoms(E.level.customs.length));
  while (E.level.customs.length > n) E.level.customs.pop();

  E.level.laneCount = n;
  renderAll();
}

// ============================================================
// TAB 2: LANES
// ============================================================
function renderLanes() {
  const container = document.getElementById('lanes-config');
  container.innerHTML = '';

  E.level.lanes.forEach((lane, i) => {
    const div = document.createElement('div');
    div.className = 'config-card';
    div.innerHTML = `
      <h3>🚢 Lane ${i + 1}</h3>
      <div class="field-row">
        <label>Spawn Interval (s)</label>
        <input type="number" min="0.5" step="0.5" value="${lane.spawnInterval}"
               onchange="updateLane(${i}, 'spawnInterval', +this.value)">
      </div>
      <div class="field-row">
        <label>Ship Speed (px/s)</label>
        <input type="number" min="0.5" step="0.5" value="${lane.shipSpeed}"
               onchange="updateLane(${i}, 'shipSpeed', +this.value)">
      </div>
      <div class="field-row">
        <label>Slot Count</label>
        <select onchange="updateLane(${i}, 'slotCount', +this.value)">
          ${[1,2,3].map(v => `<option value="${v}" ${lane.slotCount===v?'selected':''}>${v} slot${v>1?'s':''}</option>`).join('')}
        </select>
      </div>

      <div class="phases-section">
        <div class="phases-header">
          <span>⏱ Speed/Interval Phases</span>
          <button class="btn-sm btn-add" onclick="addLanePhase(${i})">+ Add Phase</button>
        </div>
        <div id="lane-phases-${i}">
          ${lane.phases.map((p, pi) => renderLanePhaseHTML(i, pi, p)).join('')}
        </div>
      </div>`;
    container.appendChild(div);
  });
}

function renderLanePhaseHTML(laneIdx, phaseIdx, phase) {
  return `<div class="phase-row">
    <input type="number" placeholder="Start time (s)" value="${phase.startTime || 0}" min="0" step="1"
           onchange="updateLanePhase(${laneIdx},${phaseIdx},'startTime',+this.value)">
    <input type="number" placeholder="Interval" value="${phase.spawnInterval || ''}" min="0.5" step="0.5"
           onchange="updateLanePhase(${laneIdx},${phaseIdx},'spawnInterval',+this.value)">
    <input type="number" placeholder="Speed" value="${phase.shipSpeed || ''}" min="0.5" step="0.5"
           onchange="updateLanePhase(${laneIdx},${phaseIdx},'shipSpeed',+this.value)">
    <button class="btn-sm btn-del" onclick="removeLanePhase(${laneIdx},${phaseIdx})">✕</button>
  </div>`;
}

function updateLane(idx, key, val) {
  E.level.lanes[idx][key] = val;
}
function addLanePhase(laneIdx) {
  E.level.lanes[laneIdx].phases.push({ startTime: 20, spawnInterval: 2, shipSpeed: 3 });
  renderLanes();
}
function removeLanePhase(laneIdx, phaseIdx) {
  E.level.lanes[laneIdx].phases.splice(phaseIdx, 1);
  renderLanes();
}
function updateLanePhase(laneIdx, phaseIdx, key, val) {
  E.level.lanes[laneIdx].phases[phaseIdx][key] = val;
}

// ============================================================
// TAB 3: CUSTOMS
// ============================================================
function renderCustoms() {
  const container = document.getElementById('customs-config');
  container.innerHTML = '';

  E.level.customs.forEach((c, ci) => {
    const div = document.createElement('div');
    div.className = 'config-card';

    const required = (c.displayHint?.required || []).join(', ');
    const banned   = (c.displayHint?.banned   || []).join(', ');

    div.innerHTML = `
      <h3>🛃 Customs — Lane ${ci + 1}</h3>

      <div class="field-row">
        <label>Hint: Required tags (display only)</label>
        <input type="text" placeholder="e.g. Milk, Food" value="${required}"
               onchange="updateCustomsHint(${ci},'required',this.value)">
      </div>
      <div class="field-row">
        <label>Hint: Banned tags (display only)</label>
        <input type="text" placeholder="e.g. Bug, Angry" value="${banned}"
               onchange="updateCustomsHint(${ci},'banned',this.value)">
      </div>

      <div class="phases-section">
        <div class="phases-header">
          <span>📋 Phases</span>
          <button class="btn-sm btn-add" onclick="addCustomsPhase(${ci})">+ Add Phase</button>
        </div>
        <div id="customs-phases-${ci}">
          ${c.phases.map((p, pi) => renderCustomsPhaseHTML(ci, pi, p)).join('')}
        </div>
      </div>

      <div class="assign-section">
        <div class="phases-header">
          <span>✅ Correct Avatars (${c.correctAvatars.length})</span>
          <button class="btn-sm btn-add" onclick="openAvatarAssign(${ci})">+ Assign Avatars</button>
        </div>
        <div class="assigned-avatars" id="assigned-${ci}">
          ${renderAssignedAvatars(ci)}
        </div>
        ${poolWarning(ci)}
      </div>`;
    container.appendChild(div);
  });
}

function renderCustomsPhaseHTML(customsIdx, phaseIdx, phase) {
  return `<div class="phase-row">
    <label style="font-size:12px">Count required:</label>
    <input type="number" placeholder="Items needed" value="${phase.count || 0}" min="1"
           onchange="updateCustomsPhase(${customsIdx},${phaseIdx},'count',+this.value)">
    <button class="btn-sm btn-del" onclick="removeCustomsPhase(${customsIdx},${phaseIdx})">✕</button>
  </div>`;
}

function renderAssignedAvatars(ci) {
  const ids = E.level.customs[ci].correctAvatars;
  if (ids.length === 0) return '<div class="empty-state">No avatars assigned yet</div>';
  return `<div class="mini-avatar-grid">` + ids.map((id, aidx) => {
    const avt = AVATARS.find(a => a.id === id);
    if (!avt) return '';
    return `<div class="mini-avatar" title="${id}&#10;${avt.tags.join(', ')}">
      <img src="./avatars/${avt.file}" onerror="this.style.background='#ddd';this.src=''">
      <button class="mini-remove" onclick="removeAssignedAvatar(${ci},${aidx})">✕</button>
    </div>`;
  }).join('') + `</div>`;
}

function poolWarning(ci) {
  const needed = E.level.customs[ci].phases.reduce((s, p) => s + (p.count || 0), 0);
  const has    = E.level.customs[ci].correctAvatars.length;
  if (has === 0) return '';
  if (has < needed) {
    return `<div class="warn-box">⚠️ Pool has ${has} avatars but needs ${needed}. Add more!</div>`;
  }
  return `<div class="ok-box">✅ Pool OK: ${has} avatars / ${needed} needed</div>`;
}

function updateCustomsHint(ci, key, val) {
  E.level.customs[ci].displayHint = E.level.customs[ci].displayHint || {};
  E.level.customs[ci].displayHint[key] = val.split(',').map(s => s.trim()).filter(Boolean);
}
function addCustomsPhase(ci) {
  E.level.customs[ci].phases.push({ count: 6 });
  renderCustoms();
}
function removeCustomsPhase(ci, pi) {
  E.level.customs[ci].phases.splice(pi, 1);
  renderCustoms();
}
function updateCustomsPhase(ci, pi, key, val) {
  E.level.customs[ci].phases[pi][key] = val;
  renderCustoms();
}
function removeAssignedAvatar(ci, aidx) {
  E.level.customs[ci].correctAvatars.splice(aidx, 1);
  document.getElementById('assigned-' + ci).innerHTML = renderAssignedAvatars(ci);
}

// ============================================================
// AVATAR ASSIGN MODAL
// ============================================================
function openAvatarAssign(ci) {
  E.assignTarget = ci;
  document.getElementById('avatar-modal').classList.remove('hidden');
  document.getElementById('modal-lane-label').textContent = `Assigning to Lane ${ci + 1}`;
  renderModalAvatarGrid();
}

function closeAvatarModal() {
  document.getElementById('avatar-modal').classList.add('hidden');
  E.assignTarget = null;
  renderCustoms();
}

function renderModalAvatarGrid() {
  const q   = (E.avatarSearchQuery || '').toLowerCase();
  const tag = E.avatarTagFilter;

  const filtered = AVATARS.filter(a => {
    const matchQ   = !q   || a.id.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q));
    const matchTag = !tag || a.tags.includes(tag);
    return matchQ && matchTag;
  });

  const grid    = document.getElementById('modal-avatar-grid');
  const alreadyAssigned = new Set(
    E.level.customs.flatMap(c => c.correctAvatars)
  );
  const laneAssigned = new Set(
    E.assignTarget !== null ? (E.level.customs[E.assignTarget].correctAvatars || []) : []
  );

  grid.innerHTML = filtered.slice(0, 200).map(avt => {
    const inLane    = laneAssigned.has(avt.id);
    const inOther   = !inLane && alreadyAssigned.has(avt.id);
    const cls       = inLane ? 'modal-avatar in-lane' : (inOther ? 'modal-avatar in-other' : 'modal-avatar');
    return `<div class="${cls}" onclick="toggleAssignAvatar('${avt.id}')" title="${avt.id}&#10;${avt.tags.join(', ')}">
      <img src="./avatars/${avt.file}" loading="lazy" onerror="this.style.background='#ddd'">
      ${inLane ? '<div class="modal-check">✓</div>' : ''}
      ${inOther ? '<div class="modal-other">●</div>' : ''}
    </div>`;
  }).join('');

  document.getElementById('modal-count').textContent = `Showing ${Math.min(filtered.length, 200)} / ${filtered.length}`;
}

function toggleAssignAvatar(avatarId) {
  if (E.assignTarget === null) return;
  const arr = E.level.customs[E.assignTarget].correctAvatars;
  const idx = arr.indexOf(avatarId);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(avatarId);
  renderModalAvatarGrid();
}

function populateTagFilter() {
  const sel = document.getElementById('modal-tag-filter');
  sel.innerHTML = '<option value="">All tags</option>';
  // use AVAILABLE_TAGS if loaded
  const tags = typeof AVAILABLE_TAGS !== 'undefined' ? AVAILABLE_TAGS : [];
  tags.sort().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

function onModalSearch(val) {
  E.avatarSearchQuery = val;
  renderModalAvatarGrid();
}

function onModalTagFilter(val) {
  E.avatarTagFilter = val;
  renderModalAvatarGrid();
}

// Dummy populate for non-modal grid (not used in editor)
function populateAvatarGrid() {}

// ============================================================
// TOAST
// ============================================================
function showEditorToast(msg, type = 'success') {
  const c = document.getElementById('editor-toast');
  c.textContent = msg;
  c.className = 'editor-toast show ' + type;
  setTimeout(() => c.classList.remove('show'), 2200);
}
