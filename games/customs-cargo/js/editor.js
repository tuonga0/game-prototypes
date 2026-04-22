// =====================================================================
// CARGO SORT — Level Editor
// =====================================================================

const AVATARS        = window.AVATARS_DATA        || [];
const AVAILABLE_TAGS = window.AVAILABLE_TAGS_DATA || [];

const E = {
  level:            null,
  activeTab:        'settings',
  avatarSearchQuery:'',
  avatarTagFilter:  '',
  assignTarget:     null,  // index into customsPool being assigned
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  populateTagFilter();
  newLevel();
  renderTabs();
});

// ============================================================
// LEVEL MANAGEMENT
// ============================================================
function newLevel() {
  E.level = {
    id:          'level_' + Date.now(),
    name:        'New Level',
    laneCount:   2,
    timeLimit:   120,
    lanes:       [defaultLane(), defaultLane()],
    customsPool: [defaultReq(), defaultReq(), defaultReq(), defaultReq()],
  };
  renderAll();
}

function defaultLane() {
  return { spawnInterval: 4, shipSpeed: 60, slotCount: 2, phases: [] };
}

function defaultReq() {
  return {
    id:             'req_' + Math.random().toString(36).slice(2, 7),
    correctAvatars: [],
    displayHint:    { required: [], banned: [] },
    count:          6,
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
  a.href = url;
  a.download = (E.level.name || 'level').replace(/\s+/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importLevel() {
  const input   = document.createElement('input');
  input.type    = 'file';
  input.accept  = '.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        E.level = JSON.parse(ev.target.result);
        // Migrate old format: if has 'customs' array, convert to customsPool
        if (E.level.customs && !E.level.customsPool) {
          E.level.customsPool = E.level.customs.map(c => ({
            id:             c.id || 'req_' + Math.random().toString(36).slice(2,7),
            correctAvatars: c.correctAvatars || [],
            displayHint:    c.displayHint || { required:[], banned:[] },
            count:          (c.phases && c.phases[0] && c.phases[0].count) || 6,
          }));
          delete E.level.customs;
        }
        renderAll();
        showEditorToast('Level imported! ✅');
      } catch { showEditorToast('Invalid JSON ❌', 'danger'); }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function loadSavedLevel(id) {
  const stored = getSavedLevels();
  if (stored[id]) { E.level = stored[id]; renderAll(); showEditorToast('Loaded!'); }
}

function deleteSavedLevel(id) {
  if (!confirm('Delete this level?')) return;
  const stored = getSavedLevels();
  delete stored[id];
  localStorage.setItem('customsCargo_levels', JSON.stringify(stored));
  renderSavedLevelsList();
}

// ============================================================
// PUBLISH
// ============================================================
function slugify(str) {
  return (str||'level').toLowerCase().trim().replace(/[^\w\s-]/g,'').replace(/[\s_-]+/g,'_') || 'level';
}
function getPublishQueue() {
  try { return JSON.parse(localStorage.getItem('customsCargo_publishQueue') || '[]'); }
  catch { return []; }
}
function setPublishQueue(arr) {
  localStorage.setItem('customsCargo_publishQueue', JSON.stringify(arr));
}

function openPublishModal() {
  let queue = getPublishQueue();
  if (!queue.length) { queue = Object.values(getSavedLevels()); setPublishQueue(queue); }
  renderPublishList();
  document.getElementById('publish-modal').classList.remove('hidden');
}

function addCurrentToPublish() {
  saveLevel();
  const queue = getPublishQueue();
  const idx   = queue.findIndex(l => l.id === E.level.id);
  if (idx >= 0) queue[idx] = E.level; else queue.push(E.level);
  setPublishQueue(queue);
  renderPublishList();
  showEditorToast('Added to publish queue!');
}

function removeFromPublish(id) {
  setPublishQueue(getPublishQueue().filter(l => l.id !== id));
  renderPublishList();
}

function renderPublishList() {
  const list  = document.getElementById('publish-level-list');
  const queue = getPublishQueue();
  if (!list) return;
  if (!queue.length) {
    list.innerHTML = '<div style="color:#94a3b8;font-size:13px;font-style:italic">No levels yet. Click "+ Add current"</div>';
    return;
  }
  list.innerHTML = queue.map(lvl => {
    const v = slugify(lvl.id || lvl.name);
    return `<div style="display:flex;align-items:center;justify-content:space-between;background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;gap:8px;">
      <div>
        <div style="font-weight:700;font-size:14px">${lvl.name||lvl.id}</div>
        <div style="font-size:11px;color:#94a3b8;font-family:monospace">data/levels/${v}.js</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn-sm btn-load" onclick="downloadSingleLevel('${lvl.id}')">⬇️</button>
        <button class="btn-sm btn-del"  onclick="removeFromPublish('${lvl.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function downloadSingleLevel(id) {
  const lvl = getPublishQueue().find(l => l.id === id);
  if (!lvl) return;
  const v = slugify(lvl.id || lvl.name);
  downloadText(
    `// Level: ${lvl.name||id}\nwindow.LEVEL_DATA = window.LEVEL_DATA || {};\nwindow.LEVEL_DATA['${v}'] = ` +
    JSON.stringify(lvl, null, 2) + ';\n',
    `${v}.js`, 'application/javascript');
}

function downloadLevelsJs() {
  const queue = getPublishQueue();
  if (!queue.length) { showEditorToast('No levels!', 'danger'); return; }
  const names = queue.map(l => slugify(l.id || l.name));
  downloadText(
    `// CARGO SORT — Level Manifest\nwindow.LEVEL_MANIFEST = [\n${names.map(n=>`  '${n}',`).join('\n')}\n];\n`,
    'manifest.js', 'application/javascript');
  showEditorToast('manifest.js downloaded!');
}

function downloadAll() {
  const queue = getPublishQueue();
  if (!queue.length) { showEditorToast('No levels!', 'danger'); return; }
  queue.forEach(lvl => downloadSingleLevel(lvl.id));
  setTimeout(downloadLevelsJs, 300);
  showEditorToast(`Downloaded ${queue.length} files + manifest.js`);
}

function downloadText(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  renderSettings();
  renderLanes();
  renderCustomsPool();
  renderSavedLevelsList();
}

// ============================================================
// TABS
// ============================================================
function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === E.activeTab));
  document.querySelectorAll('.tab-panel').forEach(panel =>
    panel.classList.toggle('hidden', panel.id !== 'tab-' + E.activeTab));
}
function switchTab(tab) { E.activeTab = tab; renderTabs(); }

// ============================================================
// TAB 1: SETTINGS
// ============================================================
function renderSettings() {
  document.getElementById('level-name').value  = E.level.name || '';
  document.getElementById('lane-count').value  = E.level.laneCount;
  document.getElementById('time-limit').value  = E.level.timeLimit || 120;
  renderSavedLevelsList();
}

function renderSavedLevelsList() {
  const stored = getSavedLevels();
  const list   = document.getElementById('saved-levels-list');
  const ids    = Object.keys(stored);
  list.innerHTML = ids.length === 0
    ? '<div class="empty-state">No saved levels yet</div>'
    : ids.map(id => {
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
  while (E.level.lanes.length < n) E.level.lanes.push(defaultLane());
  while (E.level.lanes.length > n) E.level.lanes.pop();
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
      <h3>🚢 Lane ${i+1}</h3>
      <div class="field-row">
        <label>Spawn Interval (s)</label>
        <input type="number" min="0.5" step="0.5" value="${lane.spawnInterval}"
               onchange="updateLane(${i},'spawnInterval',+this.value)">
      </div>
      <div class="field-row">
        <label>Ship Speed (px/s)</label>
        <input type="number" min="10" step="5" value="${lane.shipSpeed}"
               onchange="updateLane(${i},'shipSpeed',+this.value)">
      </div>
      <div class="field-row">
        <label>Slot Count</label>
        <select onchange="updateLane(${i},'slotCount',+this.value)">
          ${[1,2,3].map(v=>`<option value="${v}" ${lane.slotCount===v?'selected':''}>${v} slot${v>1?'s':''}</option>`).join('')}
        </select>
      </div>
      <div class="phases-section">
        <div class="phases-header">
          <span>⏱ Speed/Interval Phases</span>
          <button class="btn-sm btn-add" onclick="addLanePhase(${i})">+ Add</button>
        </div>
        <div id="lane-phases-${i}">
          ${lane.phases.map((p,pi) => `<div class="phase-row">
            <input type="number" placeholder="Start(s)" value="${p.startTime||0}" min="0"
                   onchange="updateLanePhase(${i},${pi},'startTime',+this.value)">
            <input type="number" placeholder="Interval" value="${p.spawnInterval||''}" min="0.5" step="0.5"
                   onchange="updateLanePhase(${i},${pi},'spawnInterval',+this.value)">
            <input type="number" placeholder="Speed" value="${p.shipSpeed||''}" min="10" step="5"
                   onchange="updateLanePhase(${i},${pi},'shipSpeed',+this.value)">
            <button class="btn-sm btn-del" onclick="removeLanePhase(${i},${pi})">✕</button>
          </div>`).join('')}
        </div>
      </div>`;
    container.appendChild(div);
  });
}

function updateLane(i,k,v)              { E.level.lanes[i][k] = v; }
function addLanePhase(i)                { E.level.lanes[i].phases.push({startTime:20,spawnInterval:2,shipSpeed:80}); renderLanes(); }
function removeLanePhase(i,pi)          { E.level.lanes[i].phases.splice(pi,1); renderLanes(); }
function updateLanePhase(i,pi,k,v)      { E.level.lanes[i].phases[pi][k] = v; }

// ============================================================
// TAB 3: CUSTOMS POOL
// ============================================================
function renderCustomsPool() {
  const container = document.getElementById('customs-config');
  container.innerHTML = '';
  const pool = E.level.customsPool || [];

  // Summary header
  const summary = document.createElement('div');
  summary.className = 'config-card';
  summary.innerHTML = `
    <h3>📦 Customs Requirements Pool</h3>
    <p style="font-size:13px;color:#64748b;margin-bottom:12px;line-height:1.5">
      Pool gồm <strong>${pool.length}</strong> yêu cầu cho <strong>${E.level.laneCount}</strong> lane.
      Game gán <strong>${E.level.laneCount}</strong> yêu cầu đầu vào lane, sau khi clear sẽ lấy tiếp từ pool.
      Pool nên có ≥ laneCount requirements.
    </p>
    <button class="btn-sm btn-add" onclick="addRequirement()" style="margin-bottom:4px">+ Add Requirement</button>`;
  container.appendChild(summary);

  pool.forEach((req, ri) => {
    const div = document.createElement('div');
    div.className = 'config-card';

    const reqTags = (req.displayHint?.required||[]).join(', ');
    const banTags = (req.displayHint?.banned  ||[]).join(', ');
    const needed  = req.count || 0;
    const has     = (req.correctAvatars||[]).length;
    const warningHTML = has === 0
      ? '<div class="warn-box">⚠️ No avatars assigned yet</div>'
      : has < needed
        ? `<div class="warn-box">⚠️ ${has} avatars / ${needed} needed (aim for ${needed * 2} for buffer)</div>`
        : `<div class="ok-box">✅ ${has} avatars / ${needed} needed</div>`;

    div.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="margin:0">📋 Requirement #${ri+1}</h3>
        <button class="btn-sm btn-del" onclick="removeRequirement(${ri})">Remove</button>
      </div>
      <div class="field-row">
        <label>Items needed to clear</label>
        <input type="number" min="1" value="${req.count||6}"
               onchange="updateReq(${ri},'count',+this.value)">
      </div>
      <div class="field-row">
        <label>Hint: Required tags</label>
        <input type="text" placeholder="Happy, Woman..." value="${reqTags}"
               onchange="updateReqHint(${ri},'required',this.value)">
      </div>
      <div class="field-row">
        <label>Hint: Banned tags</label>
        <input type="text" placeholder="Old, Angry..." value="${banTags}"
               onchange="updateReqHint(${ri},'banned',this.value)">
      </div>
      <div class="assign-section">
        <div class="phases-header">
          <span>✅ Correct Avatars (${has})</span>
          <button class="btn-sm btn-add" onclick="openAvatarAssign(${ri})">+ Assign</button>
        </div>
        <div class="assigned-avatars" id="assigned-${ri}">
          ${renderAssignedAvatars(ri)}
        </div>
        ${warningHTML}
      </div>`;
    container.appendChild(div);
  });
}

function addRequirement()      { E.level.customsPool.push(defaultReq()); renderCustomsPool(); }
function removeRequirement(ri) { E.level.customsPool.splice(ri,1); renderCustomsPool(); }
function updateReq(ri,k,v)     { E.level.customsPool[ri][k] = v; renderCustomsPool(); }
function updateReqHint(ri,key,val) {
  E.level.customsPool[ri].displayHint = E.level.customsPool[ri].displayHint || {};
  E.level.customsPool[ri].displayHint[key] = val.split(',').map(s=>s.trim()).filter(Boolean);
}

function renderAssignedAvatars(ri) {
  const ids = E.level.customsPool[ri]?.correctAvatars || [];
  if (!ids.length) return '<div class="empty-state">No avatars assigned</div>';
  return `<div class="mini-avatar-grid">${ids.map((id,aidx) => {
    const avt = AVATARS.find(a => a.id === id);
    if (!avt) return '';
    return `<div class="mini-avatar" title="${id}">
      <img src="./avatars/${avt.file}" onerror="this.style.background='#ddd'">
      <button class="mini-remove" onclick="removeAssignedAvatar(${ri},${aidx})">✕</button>
    </div>`;
  }).join('')}</div>`;
}

function removeAssignedAvatar(ri, aidx) {
  E.level.customsPool[ri].correctAvatars.splice(aidx, 1);
  document.getElementById('assigned-' + ri).innerHTML = renderAssignedAvatars(ri);
}

// ============================================================
// AVATAR ASSIGN MODAL
// ============================================================
function openAvatarAssign(ri) {
  E.assignTarget = ri;
  document.getElementById('modal-lane-label').textContent = `Req #${ri+1}`;
  document.getElementById('avatar-modal').classList.remove('hidden');
  renderModalAvatarGrid();
}

function closeAvatarModal() {
  document.getElementById('avatar-modal').classList.add('hidden');
  E.assignTarget = null;
  renderCustomsPool();
}

function renderModalAvatarGrid() {
  const q   = (E.avatarSearchQuery || '').toLowerCase();
  const tag = E.avatarTagFilter;
  const filtered = AVATARS.filter(a =>
    (!q   || a.id.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q))) &&
    (!tag || a.tags.includes(tag))
  );

  const thisAssigned = new Set((E.assignTarget !== null ? E.level.customsPool[E.assignTarget]?.correctAvatars : []) || []);
  const allAssigned  = new Set(E.level.customsPool.flatMap(r => r.correctAvatars || []));

  document.getElementById('modal-avatar-grid').innerHTML = filtered.slice(0, 200).map(avt => {
    const inThis  = thisAssigned.has(avt.id);
    const inOther = !inThis && allAssigned.has(avt.id);
    const cls = inThis ? 'modal-avatar in-lane' : (inOther ? 'modal-avatar in-other' : 'modal-avatar');
    return `<div class="${cls}" onclick="toggleAssignAvatar('${avt.id}')" title="${avt.id}\n${avt.tags.join(', ')}">
      <img src="./avatars/${avt.file}" loading="lazy" onerror="this.style.background='#ddd'">
      ${inThis  ? '<div class="modal-check">✓</div>' : ''}
      ${inOther ? '<div class="modal-other">●</div>' : ''}
    </div>`;
  }).join('');
  document.getElementById('modal-count').textContent = `${Math.min(filtered.length,200)} / ${filtered.length} avatars`;
}

function toggleAssignAvatar(id) {
  if (E.assignTarget === null) return;
  const arr = E.level.customsPool[E.assignTarget].correctAvatars;
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
  renderModalAvatarGrid();
}

function populateTagFilter() {
  const sel = document.getElementById('modal-tag-filter');
  if (!sel) return;
  sel.innerHTML = '<option value="">All tags</option>';
  [...AVAILABLE_TAGS].sort().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
}

function onModalSearch(val) { E.avatarSearchQuery = val; renderModalAvatarGrid(); }
function onModalTagFilter(val) { E.avatarTagFilter = val; renderModalAvatarGrid(); }

// ============================================================
// TOAST
// ============================================================
function showEditorToast(msg, type='success') {
  const c = document.getElementById('editor-toast');
  c.textContent = msg;
  c.className = 'editor-toast show ' + type;
  setTimeout(() => c.classList.remove('show'), 2200);
}

function populateAvatarGrid() {} // unused stub
