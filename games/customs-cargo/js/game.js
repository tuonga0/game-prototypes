// =====================================================================
// CARGO SORT — Game Engine
// =====================================================================

const AVATAR_BASE_URL = './avatars/';

// ============================================================
// STATE
// ============================================================
const G = {
  level: null,
  score: 0,
  timeLeft: 0,       // seconds remaining
  elapsed: 0,
  running: false,
  paused: false,
  lastTs: null,
  _shipId: 0,

  // Customs pool state
  customsQueue: [],  // requirements not yet assigned to a lane
  laneReqs: [],      // [laneIdx] = { req, progress } | null
  clearedReqs: 0,    // total reqs cleared this level
  totalReqs: 0,

  // Per-lane ship/spawn state
  lanes: [],         // [{ ships, spawnTimer, speed, interval, phaseIdx, cfg }]

  // Shared avatar pool (only from active requirements)
  pool: [],

  // Duplicate-spawn prevention
  inPlayIds:    new Set(),   // avatar IDs currently on any ship (not yet evaluated)
  completedIds: new Set(),   // avatar IDs that passed customs (never respawn)

  // Wave category throttle (max 3 per req-category per wave)
  waveCategoryCounts: {},    // reqId → count of avatars spawned this wave
  waveTimer: 0,              // counts down; resets to max lane interval each wave

  // Drag state
  drag: {
    active: false,
    srcSlot: null,     // { shipId, slotIdx }
    srcShipIdx: null,
    ghostEl: null,
    overShipId: null,
    overSlotIdx: null,
  },

  _pendingLevel: null,
};

// ============================================================
// ENTRY POINT
// ============================================================
function startLevel(levelData) {
  G.level      = levelData;
  G.score      = 0;
  G.elapsed    = 0;
  G.timeLeft   = levelData.timeLimit || 120;
  G.running    = false;
  G.lastTs     = null;
  G._shipId    = 0;
  G.clearedReqs        = 0;
  G.pool               = [];
  G.inPlayIds          = new Set();
  G.completedIds       = new Set();
  G.waveCategoryCounts = {};
  G.waveTimer          = 0;   // will be set after lanes init

  // Build customs queue from pool (shuffle for variety)
  const pool = shuffle([...(levelData.customsPool || [])]);
  G.totalReqs = pool.length;

  // Assign first N requirements to lanes (N = laneCount)
  const N = levelData.laneCount;
  G.laneReqs = [];
  for (let i = 0; i < N; i++) {
    const req = pool.shift() || null;
    G.laneReqs.push(req ? { req, progress: 0 } : null);
    if (req) refillPoolFromReq(req);
  }
  G.customsQueue = pool;

  // Init lane states
  G.lanes = levelData.lanes.map((cfg, i) => {
    const ph = cfg.phases && cfg.phases.length ? cfg.phases[0] : null;
    return {
      ships:       [],
      spawnTimer:  i * 0.6,
      phaseIdx:    0,
      speed:       ph ? ph.shipSpeed     : cfg.shipSpeed,
      interval:    ph ? ph.spawnInterval : cfg.spawnInterval,
      cfg,
    };
  });

  // Wave timer starts at the largest spawn interval across all lanes
  G.waveTimer = getMaxSpawnInterval();

  buildDOM();
  renderHUD();
  renderCustomsBooths();

  G.running = true;
  requestAnimationFrame(gameLoop);
}

// ============================================================
// POOL MANAGEMENT
// ============================================================
function refillPoolFromReq(req) {
  // Add enough instances to fill the requirement (2× buffer)
  const avatars = req.correctAvatars || [];
  if (!avatars.length) return;
  const needed = (req.count || 6) * 2;
  for (let i = 0; i < needed; i++) {
    const avt = AVATARS.find(a => a.id === avatars[i % avatars.length]);
    if (avt) G.pool.push({
      ...avt,
      _instanceId: avt.id + '_' + Math.random().toString(36).slice(2),
      _reqId: req.id,   // track which requirement this avatar belongs to
    });
  }
  G.pool = shuffle(G.pool);
}

const WAVE_CATEGORY_LIMIT = 3;

function pullFromPool() {
  // Skip avatars:
  //  1. Already on a ship or completed (no duplicates)
  //  2. Whose req-category already hit the wave limit (max 3 per category per wave)
  const idx = G.pool.findIndex(a => {
    if (G.inPlayIds.has(a.id) || G.completedIds.has(a.id)) return false;
    const catCount = G.waveCategoryCounts[a._reqId] || 0;
    return catCount < WAVE_CATEGORY_LIMIT;
  });
  if (idx === -1) return null;
  const avt = G.pool.splice(idx, 1)[0];
  G.inPlayIds.add(avt.id);
  // Increment this category's wave count
  G.waveCategoryCounts[avt._reqId] = (G.waveCategoryCounts[avt._reqId] || 0) + 1;
  return avt;
}

function returnToPool(avatar) {
  if (!avatar) return;
  G.inPlayIds.delete(avatar.id);  // no longer on a ship
  G.pool.push({ ...avatar, _instanceId: avatar.id + '_' + Math.random().toString(36).slice(2) });
  G.pool = shuffle(G.pool);
}

// Get active correct avatar IDs for a given lane
function getLaneCorrectSet(laneIdx) {
  const lr = G.laneReqs[laneIdx];
  return lr ? new Set(lr.req.correctAvatars || []) : new Set();
}

// ============================================================
// WAVE TIMER — resets category counts every maxInterval seconds
// ============================================================
function getMaxSpawnInterval() {
  if (!G.lanes || !G.lanes.length) return 4;
  return Math.max(...G.lanes.map(l => l.interval));
}

function updateWave(dt) {
  G.waveTimer -= dt;
  if (G.waveTimer <= 0) {
    G.waveCategoryCounts = {};              // new wave: clear per-category counts
    G.waveTimer = getMaxSpawnInterval();    // reset to current max interval
  }
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(ts) {
  if (!G.running) return;
  if (G.paused) { requestAnimationFrame(gameLoop); return; }

  const dt = G.lastTs ? Math.min((ts - G.lastTs) / 1000, 0.1) : 0;
  G.lastTs  = ts;
  G.elapsed += dt;

  // Countdown
  G.timeLeft = Math.max(0, G.timeLeft - dt);
  if (G.timeLeft <= 0) { endGame(false); return; }

  updateLanePhases();
  updateWave(dt);
  updateSpawns(dt);
  updateShipMovement(dt);
  updateCustomsCheck();
  renderShips();
  renderTimerHUD();

  requestAnimationFrame(gameLoop);
}

// ============================================================
// LANE PHASES
// ============================================================
function updateLanePhases() {
  G.lanes.forEach(lane => {
    const phases = lane.cfg.phases;
    if (!phases || !phases.length) return;
    let newIdx = 0;
    for (let p = 0; p < phases.length; p++) {
      if (G.elapsed >= phases[p].startTime) newIdx = p;
    }
    if (newIdx !== lane.phaseIdx) {
      lane.phaseIdx = newIdx;
      lane.speed    = phases[newIdx].shipSpeed;
      lane.interval = phases[newIdx].spawnInterval;
    }
  });
}

// ============================================================
// SPAWNING — only spawn avatars relevant to active reqs
// ============================================================
function updateSpawns(dt) {
  G.lanes.forEach((lane, laneIdx) => {
    lane.spawnTimer -= dt;
    if (lane.spawnTimer <= 0) {
      lane.spawnTimer = lane.interval;
      spawnShip(laneIdx);
    }
  });
}

function spawnShip(laneIdx) {
  const lCfg      = G.level.lanes[laneIdx];
  const slotCnt   = lCfg.slotCount || 1;
  const correctSet = getLaneCorrectSet(laneIdx);
  const slots     = [];

  for (let s = 0; s < slotCnt; s++) {
    let avt = pullFromPool();
    // 50% re-roll if this avatar belongs to this lane's correct set
    if (avt && correctSet.has(avt.id) && Math.random() < 0.5) {
      returnToPool(avt);
      avt = pullFromPool();
    }
    slots.push(avt);
  }

  const ship = {
    id:       G._shipId++,
    laneIdx,
    slots,
    y:        -getShipHeight(slotCnt),
    checked:  false,
  };
  G.lanes[laneIdx].ships.push(ship);
  createShipDOM(ship, laneIdx);
}

// ============================================================
// MOVEMENT
// ============================================================
function getCustomsY() {
  const gameH = window.innerHeight - 56;
  return gameH - window.innerHeight * 0.05;
}

function getShipHeight(slotCnt) {
  return 28 + slotCnt * 92; // bow(16) + stern(12) + slots
}

function updateShipMovement(dt) {
  G.lanes.forEach((lane, laneIdx) => {
    lane.ships.forEach(ship => { ship.y += lane.speed * dt; });
    lane.ships = lane.ships.filter(ship => {
      if (ship.y > window.innerHeight + 50) { removeShipDOM(ship); return false; }
      return true;
    });
  });
}

// ============================================================
// CUSTOMS EVALUATION
// ============================================================
function updateCustomsCheck() {
  const cy = getCustomsY();
  G.lanes.forEach((lane, laneIdx) => {
    lane.ships.forEach(ship => {
      if (ship.checked) return;
      const sh = getShipHeight(ship.slots.length);
      if (ship.y + sh * 0.5 >= cy) {
        ship.checked = true;
        evaluateShip(ship, laneIdx);
      }
    });
  });
  updateShipHighlights();
}

function evaluateShip(ship, laneIdx) {
  const lr = G.laneReqs[laneIdx];
  const avatarsOnShip = ship.slots.filter(Boolean);

  // No active req for this lane → ship passes freely
  if (!lr) return;

  const correctSet = new Set(lr.req.correctAvatars || []);
  const allCorrect = avatarsOnShip.length > 0 && avatarsOnShip.every(a => correctSet.has(a.id));

  if (allCorrect) {
    // Mark delivered avatars as completed — they will never spawn again
    avatarsOnShip.forEach(a => {
      G.completedIds.add(a.id);
      G.inPlayIds.delete(a.id);
    });

    lr.progress += avatarsOnShip.length;
    G.score     += avatarsOnShip.length;
    showCheckmark(ship);
    renderHUD();

    if (lr.progress >= lr.req.count) {
      clearLaneReq(laneIdx);
    } else {
      renderCustomsBooths();
    }
  } else {
    // Empty ship → pass freely, no penalty
    if (avatarsOnShip.length === 0) return;
    // Wrong cargo — fly back up + time penalty
    rejectShip(ship);
  }
}

function clearLaneReq(laneIdx) {
  G.clearedReqs++;
  showToast(`✅ Lane ${laneIdx + 1} complete! +${G.laneReqs[laneIdx].req.count}`, 'success');

  // Pull next requirement from queue
  const next = G.customsQueue.shift() || null;
  G.laneReqs[laneIdx] = next ? { req: next, progress: 0 } : null;
  if (next) refillPoolFromReq(next);

  renderCustomsBooths();

  // Check if ALL reqs cleared
  if (G.clearedReqs >= G.totalReqs) {
    setTimeout(() => endGame(true), 500);
  }
}

function rejectShip(ship) {
  // Penalty: -5 seconds
  G.timeLeft = Math.max(0, G.timeLeft - 5);
  showTimePenalty(ship);

  // Fly each cargo card to top-left corner of screen
  ship.slots.forEach((avt, si) => {
    if (!avt) return;
    const card = document.getElementById('avt-' + avt._instanceId);
    if (!card) return;

    const rect = card.getBoundingClientRect();

    // Create a flying clone attached to body
    const clone = document.createElement('div');
    clone.style.cssText = `
      position:fixed; left:${rect.left}px; top:${rect.top}px;
      width:${rect.width}px; height:${rect.height}px;
      border-radius:10px; overflow:hidden;
      pointer-events:none; z-index:9998;
      transition: left 0.55s cubic-bezier(.4,0,.2,1),
                  top  0.55s cubic-bezier(.4,0,.2,1),
                  opacity 0.2s ease 0.4s,
                  transform 0.55s ease;
    `;
    clone.innerHTML = card.outerHTML;
    document.body.appendChild(clone);

    // Hide original card immediately
    card.style.opacity = '0';

    // Trigger fly: to top-left corner with slight stagger per slot
    const delay = si * 60;
    setTimeout(() => {
      clone.style.left      = '16px';
      clone.style.top       = '16px';
      clone.style.transform = 'scale(0.35) rotate(-15deg)';
      clone.style.opacity   = '0';
    }, delay + 20);

    setTimeout(() => clone.remove(), delay + 650);
  });

  // After animation: return cargo to pool, clear ship
  setTimeout(() => {
    ship.slots.forEach(avt => returnToPool(avt));
    ship.slots = ship.slots.map(() => null);
    updateShipSlotDOM(ship);
    markShipRejected(ship);
  }, 480);
}

function showTimePenalty(ship) {
  const el = document.getElementById('ship-' + ship.id);
  const ref = el || document.getElementById('game-root');
  const rect = ref ? ref.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2 };

  const txt = document.createElement('div');
  txt.textContent = '-5s';
  txt.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width / 2}px;
    top:  ${rect.top  + (rect.height || 0) * 0.3}px;
    transform: translate(-50%, 0);
    font-family: 'Nunito', sans-serif;
    font-size: 28px; font-weight: 900;
    color: #ef4444;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    pointer-events: none; z-index: 9997;
    animation: penaltyFloat 0.9s ease forwards;
  `;
  document.body.appendChild(txt);
  setTimeout(() => txt.remove(), 950);
}

// ============================================================
// REAL-TIME HIGHLIGHTS
// ============================================================
function updateShipHighlights() {
  G.lanes.forEach((lane, laneIdx) => {
    const correctSet = getLaneCorrectSet(laneIdx);
    lane.ships.forEach(ship => {
      if (ship.checked) return;
      const el = document.getElementById('ship-' + ship.id);
      if (!el) return;
      el.classList.remove('valid', 'invalid');
      const avts = ship.slots.filter(Boolean);
      if (!avts.length || !G.laneReqs[laneIdx]) return;
      const ok = avts.every(a => correctSet.has(a.id));
      el.classList.add(ok ? 'valid' : 'invalid');
    });
  });
}

// ============================================================
// GAME END
// ============================================================
function endGame(won) {
  G.running = false;
  const total = G.totalReqs;
  const cleared = G.clearedReqs;
  const overlay = document.getElementById('overlay');
  const card    = document.getElementById('overlay-card');
  overlay.classList.remove('hidden');

  if (won) {
    card.innerHTML = `
      <h1>🎉 Complete!</h1>
      <p>All ${total} orders delivered!<br>Score: <strong>${G.score}</strong> items</p>
      <button class="btn btn-success" onclick="showLevelSelect()">Back to Levels</button>`;
  } else {
    card.innerHTML = `
      <h1>⏰ Time's Up!</h1>
      <p>Cleared <strong>${cleared}/${total}</strong> orders<br>Score: <strong>${G.score}</strong> items</p>
      <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
      &nbsp;
      <button class="btn btn-outline" style="border:2px solid #cbd5e1" onclick="showLevelSelect()">Levels</button>`;
  }
}

function showLevelSelect() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('level-select').classList.remove('hidden');
  G.running = false;
}

// ============================================================
// DOM: BUILD LAYOUT
// ============================================================
function buildDOM() {
  document.getElementById('lanes-container').innerHTML = '';
  const lanesContainer = document.getElementById('lanes-container');
  const laneCount = G.level.laneCount;

  const customsBar = document.getElementById('customs-bar');
  customsBar.style.top = (56 + getCustomsY()) + 'px';

  for (let i = 0; i < laneCount; i++) {
    const laneEl = document.createElement('div');
    laneEl.className = 'lane';
    laneEl.id = 'lane-' + i;
    lanesContainer.appendChild(laneEl);
  }
}

// ============================================================
// DOM: SHIPS
// ============================================================
function createShipDOM(ship, laneIdx) {
  const laneEl = document.getElementById('lane-' + laneIdx);
  if (!laneEl) return;

  const el = document.createElement('div');
  el.className = 'ship';
  el.id = 'ship-' + ship.id;
  el.dataset.shipId = ship.id;
  el.style.top  = ship.y + 'px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';

  el.innerHTML = `
    <div class="ship-bow"></div>
    <div class="ship-body">
      <div class="cargo-slots" id="slots-${ship.id}">
        ${ship.slots.map((avt, si) => createSlotHTML(ship, si, avt)).join('')}
      </div>
    </div>
    <div class="ship-stern"></div>`;

  laneEl.appendChild(el);
  attachSlotEvents(ship);
}

function createSlotHTML(ship, slotIdx, avt) {
  return `<div class="cargo-slot ${!avt ? 'empty' : ''}"
       id="slot-${ship.id}-${slotIdx}"
       data-ship-id="${ship.id}"
       data-slot-idx="${slotIdx}">
    ${avt ? createAvatarHTML(avt, ship.id, slotIdx) : ''}
  </div>`;
}

function createAvatarHTML(avt, shipId, slotIdx) {
  const src = AVATAR_BASE_URL + avt.file;
  return `<div class="avatar-card"
       id="avt-${avt._instanceId}"
       data-ship-id="${shipId}"
       data-slot-idx="${slotIdx}"
       data-avt-id="${avt.id}"
       data-instance-id="${avt._instanceId}">
    <img src="${src}" alt="${avt.id}" loading="lazy"
         onerror="this.parentElement.style.background='#ddd'">
  </div>`;
}

function removeShipDOM(ship) {
  document.getElementById('ship-' + ship.id)?.remove();
}

function updateShipSlotDOM(ship) {
  ship.slots.forEach((avt, si) => {
    const slotEl = document.getElementById(`slot-${ship.id}-${si}`);
    if (!slotEl) return;
    slotEl.innerHTML = avt ? createAvatarHTML(avt, ship.id, si) : '';
    slotEl.classList.toggle('empty', !avt);
    if (avt) {
      const card = slotEl.querySelector('.avatar-card');
      if (card) attachAvatarEvents(card, ship, si);
    }
  });
}

function markShipRejected(ship) {
  const el = document.getElementById('ship-' + ship.id);
  if (!el) return;
  el.classList.add('rejected');
  setTimeout(() => el.classList.remove('rejected'), 500);
}

function showCheckmark(ship) {
  const el = document.getElementById('ship-' + ship.id);
  if (!el) return;
  const body = el.querySelector('.ship-body');
  if (!body) return;
  const check = document.createElement('div');
  check.className = 'ship-checkmark';
  check.textContent = '✅';
  body.appendChild(check);
  setTimeout(() => check.remove(), 1200);
}

function renderShips() {
  G.lanes.forEach(lane => {
    lane.ships.forEach(ship => {
      const el = document.getElementById('ship-' + ship.id);
      if (el) el.style.top = ship.y + 'px';
    });
  });
}

// ============================================================
// DOM: HUD
// ============================================================
function renderHUD() {
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = '📦 ' + G.score;

  // Progress: reqs cleared
  const progressEl = document.getElementById('progress-display');
  if (progressEl) progressEl.textContent = `✅ ${G.clearedReqs}/${G.totalReqs}`;
}

function renderTimerHUD() {
  const timerEl = document.getElementById('timer-display');
  if (!timerEl) return;
  const mins = Math.floor(G.timeLeft / 60);
  const secs = Math.floor(G.timeLeft % 60);
  timerEl.textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
  // Urgent pulse when < 10s
  timerEl.classList.toggle('timer-urgent', G.timeLeft < 10);
}

// ============================================================
// DOM: CUSTOMS BOOTHS
// ============================================================
function renderCustomsBooths() {
  const container = document.getElementById('customs-booths');
  if (!container) return;
  container.innerHTML = '';

  G.laneReqs.forEach((lr, i) => {
    const booth = document.createElement('div');
    booth.className = 'customs-booth' + (!lr ? ' completed' : '');
    booth.id = 'booth-' + i;

    if (!lr) {
      booth.innerHTML = `<div class="booth-label">Lane ${i+1}</div><div style="font-size:22px">✅</div><div class="booth-progress">Done</div>`;
    } else {
      const hint = lr.req.displayHint || {};
      const reqTags = (hint.required || []).map(t => `<span class="tag-badge required">${t}</span>`).join('');
      const banTags = (hint.banned   || []).map(t => `<span class="tag-badge banned">🚫${t}</span>`).join('');
      const pct = Math.min(100, Math.round(lr.progress / lr.req.count * 100));
      booth.innerHTML = `
        <div class="booth-label">Lane ${i+1}</div>
        <div class="booth-hint">${reqTags}${banTags}</div>
        <div class="booth-progress">${lr.progress}/${lr.req.count}</div>
        <div class="booth-bar"><div class="booth-bar-fill" style="width:${pct}%"></div></div>`;
    }
    container.appendChild(booth);
  });
}

// ============================================================
// DRAG & DROP
// ============================================================
function attachSlotEvents(ship) {
  ship.slots.forEach((avt, si) => {
    if (avt) {
      const card = document.getElementById('avt-' + avt._instanceId);
      if (card) attachAvatarEvents(card, ship, si);
    }
  });
}

function attachAvatarEvents(card, ship, slotIdx) {
  card.addEventListener('pointerdown', e => onDragStart(e, ship.id, slotIdx));
}

function onDragStart(e, shipId, slotIdx) {
  e.preventDefault();
  const ship = findShipById(shipId);
  if (!ship) return;
  const avt  = ship.slots[slotIdx];
  if (!avt)  return;

  G.drag.active     = true;
  G.drag.srcSlot    = { shipId, slotIdx };
  G.drag.srcShipIdx = findShipIdxById(shipId);
  G.drag.overShipId = null;
  G.drag.overSlotIdx = null;

  const ghost = document.createElement('div');
  ghost.id = 'drag-ghost';
  ghost.innerHTML = `<img src="${AVATAR_BASE_URL + avt.file}" loading="lazy">`;
  document.body.appendChild(ghost);
  G.drag.ghostEl = ghost;
  moveDragGhost(e.clientX, e.clientY);

  document.getElementById('avt-' + avt._instanceId)?.classList.add('dragging');
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup',   onDragEnd);
}

function onDragMove(e) {
  if (!G.drag.active) return;
  moveDragGhost(e.clientX, e.clientY);
  checkHoverTarget(e.clientX, e.clientY);
}

function moveDragGhost(x, y) {
  if (G.drag.ghostEl) {
    G.drag.ghostEl.style.left = x + 'px';
    G.drag.ghostEl.style.top  = y + 'px';
  }
}

function checkHoverTarget(x, y) {
  clearDragHighlight();
  if (G.drag.ghostEl) G.drag.ghostEl.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  if (G.drag.ghostEl) G.drag.ghostEl.style.display = '';
  if (!el) return;

  const card = el.closest('.avatar-card');
  const slot = el.closest('.cargo-slot');
  const target = card || slot;
  if (!target) return;

  const tShipId  = parseInt(target.dataset.shipId);
  const tSlotIdx = parseInt(target.dataset.slotIdx);
  if (isNaN(tShipId) || isNaN(tSlotIdx)) return;
  if (tShipId === G.drag.srcSlot.shipId && tSlotIdx === G.drag.srcSlot.slotIdx) return;

  target.classList.add('swap-target');
  G.drag.overShipId  = tShipId;
  G.drag.overSlotIdx = tSlotIdx;
}

function clearDragHighlight() {
  document.querySelectorAll('.swap-target').forEach(el => el.classList.remove('swap-target'));
}

function onDragEnd(e) {
  if (!G.drag.active) return;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup',   onDragEnd);
  clearDragHighlight();
  G.drag.ghostEl?.remove(); G.drag.ghostEl = null;

  // Un-dim source
  const srcShip = findShipByIdx(G.drag.srcShipIdx);
  const srcAvt  = srcShip?.slots[G.drag.srcSlot.slotIdx];
  if (srcAvt) document.getElementById('avt-' + srcAvt._instanceId)?.classList.remove('dragging');

  if (G.drag.overShipId != null) {
    doSwap(G.drag.srcSlot.shipId, G.drag.srcSlot.slotIdx, G.drag.overShipId, G.drag.overSlotIdx);
  }

  G.drag.active = false;
  G.drag.overShipId = null;
}

function doSwap(shipIdA, slotA, shipIdB, slotB) {
  if (shipIdA === shipIdB && slotA === slotB) return;
  const sA = findShipById(shipIdA);
  const sB = findShipById(shipIdB);
  if (!sA || !sB || sA.checked || sB.checked) return;
  [sA.slots[slotA], sB.slots[slotB]] = [sB.slots[slotB], sA.slots[slotA]];
  updateShipSlotDOM(sA);
  updateShipSlotDOM(sB);
}

// ============================================================
// HELPERS
// ============================================================
function findShipById(id) {
  for (const lane of G.lanes) {
    const s = lane.ships.find(s => s.id === id);
    if (s) return s;
  }
  return null;
}
function findShipIdxById(shipId) {
  for (let li = 0; li < G.lanes.length; li++) {
    const si = G.lanes[li].ships.findIndex(s => s.id === shipId);
    if (si >= 0) return { laneIdx: li, shipIdx: si };
  }
  return null;
}
function findShipByIdx(ref) {
  if (!ref) return null;
  return G.lanes[ref.laneIdx]?.ships[ref.shipIdx] || null;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// TOASTS
// ============================================================
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
