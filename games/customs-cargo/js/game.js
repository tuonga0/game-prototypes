// =====================================================================
// CUSTOMS CARGO — Game Engine
// =====================================================================

const AVATAR_BASE_URL = './avatars/'; // Change to your CDN / asset path

// ============================================================
// STATE
// ============================================================
const G = {
  level: null,
  lives: 3,
  score: 0,
  elapsed: 0,           // seconds since level start
  running: false,
  paused: false,
  lastTs: null,

  // per-lane state
  lanes: [],            // [{ ships: [], spawnTimer, phaseIdx, speed, interval }]

  // customs state
  customs: [],          // [{ phaseIdx, count, done }]

  // drag state
  drag: {
    active: false,
    avatarId: null,     // id of avatar being dragged
    srcShipIdx: null,
    srcSlotIdx: null,
    ghostEl: null,
    overShipIdx: null,
    overSlotIdx: null,
  },

  // ship id counter
  _shipId: 0,

  // pool: array of avatar objects (shared)
  pool: [],
};

// ============================================================
// MAIN ENTRY
// ============================================================
function startLevel(levelData) {
  G.level   = levelData;
  G.lives   = 3;
  G.score   = 0;
  G.elapsed = 0;
  G.running = false;
  G.lastTs  = null;
  G._shipId = 0;

  // Build shared pool (flatten all correctAvatars from all customs lanes)
  G.pool = buildPool(levelData);

  // Init lane states
  G.lanes = levelData.lanes.map((lCfg, i) => {
    const phase0 = lCfg.phases && lCfg.phases.length ? lCfg.phases[0] : null;
    return {
      ships:        [],
      spawnTimer:   0,
      phaseIdx:     0,
      speed:        phase0 ? phase0.shipSpeed    : lCfg.shipSpeed,
      interval:     phase0 ? phase0.spawnInterval: lCfg.spawnInterval,
      cfg:          lCfg,
    };
  });

  // Init customs states
  G.customs = levelData.customs.map(c => ({
    phaseIdx: 0,
    count:    0,
    done:     false,
    cfg:      c,
  }));

  buildDOM();
  renderHUD();
  renderCustoms();

  G.running = true;
  requestAnimationFrame(gameLoop);
}

// ============================================================
// POOL
// ============================================================
function buildPool(levelData) {
  const pool = [];
  levelData.customs.forEach(c => {
    (c.correctAvatars || []).forEach(id => {
      const avt = AVATARS.find(a => a.id === id);
      if (avt) pool.push({ ...avt, _instanceId: id + '_' + Math.random().toString(36).slice(2) });
    });
  });
  return shuffle(pool);
}

function pullFromPool() {
  if (G.pool.length === 0) return null;
  return G.pool.splice(0, 1)[0];
}

function returnToPool(avatar) {
  if (!avatar) return;
  // re-generate instanceId so it counts as a "new" spawn
  G.pool.push({ ...avatar, _instanceId: avatar.id + '_' + Math.random().toString(36).slice(2) });
  G.pool = shuffle(G.pool);
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(ts) {
  if (!G.running) return;
  if (G.paused)   { requestAnimationFrame(gameLoop); return; }

  const dt = G.lastTs ? Math.min((ts - G.lastTs) / 1000, 0.1) : 0;
  G.lastTs  = ts;
  G.elapsed += dt;

  updateLanePhases();
  updateSpawns(dt);
  updateShipMovement(dt);
  updateCustomsCheck();
  renderShips();

  requestAnimationFrame(gameLoop);
}

// ============================================================
// LANE PHASES (speed / interval changes over time)
// ============================================================
function updateLanePhases() {
  G.lanes.forEach((lane, i) => {
    const phases = lane.cfg.phases;
    if (!phases || phases.length === 0) return;
    // advance phase index based on elapsed time
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
// SPAWNING
// ============================================================
function updateSpawns(dt) {
  G.lanes.forEach((lane, laneIdx) => {
    if (lane.cfg.paused) return;
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
  const correctSet = new Set(G.level.customs[laneIdx]?.correctAvatars || []);
  const slots     = [];

  for (let s = 0; s < slotCnt; s++) {
    let avt = pullFromPool();
    // 50% re-roll if avatar is a correct answer for THIS lane
    // (makes it harder to get lucky, player has to sort actively)
    if (avt && correctSet.has(avt.id) && Math.random() < 0.5) {
      returnToPool(avt);
      avt = pullFromPool(); // accept result regardless (avoid infinite loop)
    }
    slots.push(avt);
  }

  const ship = {
    id:       G._shipId++,
    laneIdx,
    slots,
    y:        -getShipHeight(slotCnt),
    checked:  false,
    rejected: false,
  };
  G.lanes[laneIdx].ships.push(ship);
  createShipDOM(ship, laneIdx);
}

// ============================================================
// SHIP MOVEMENT
// ============================================================
function getCustomsY() {
  // 5% margin from bottom edge of screen
  const gameH = window.innerHeight - 56;
  return gameH - window.innerHeight * 0.05;
}

function getShipHeight(slotCnt) {
  return 28 + slotCnt * 94; // bow(16) + stern(12) + slots*94
}

function updateShipMovement(dt) {
  G.lanes.forEach((lane, laneIdx) => {
    lane.ships.forEach(ship => {
      ship.y += lane.speed * 60 * dt;
    });

    // Remove ships that have left the screen
    lane.ships = lane.ships.filter(ship => {
      if (ship.y > window.innerHeight - 56 + 50) {
        removeShipDOM(ship);
        return false;
      }
      return true;
    });
  });
}

// ============================================================
// CUSTOMS CHECK
// ============================================================
function updateCustomsCheck() {
  const customsY = getCustomsY();

  G.lanes.forEach((lane, laneIdx) => {
    lane.ships.forEach(ship => {
      if (ship.checked) return;

      // Ship crosses customs line when its bottom reaches customsY
      const shipHeight = getShipHeight(ship.slots.length);
      const shipBottom = ship.y + shipHeight;

      if (ship.y + shipHeight * 0.5 >= customsY) {
        ship.checked = true;
        evaluateShip(ship, laneIdx);
      }
    });
  });

  // Realtime highlight (valid/invalid) before crossing
  updateShipHighlights();
}

function evaluateShip(ship, laneIdx) {
  const customsState = G.customs[laneIdx];
  if (!customsState || customsState.done) return;

  const correctSet = new Set(G.level.customs[laneIdx].correctAvatars || []);
  const avatarsOnShip = ship.slots.filter(Boolean);

  // Empty ship fails if customs has active requirement
  if (avatarsOnShip.length === 0) {
    rejectShip(ship, laneIdx);
    return;
  }

  // All avatars must be in correctAvatars for this lane
  const allCorrect = avatarsOnShip.every(a => correctSet.has(a.id));

  if (allCorrect) {
    // Count items towards customs progress
    const phase = G.level.customs[laneIdx].phases[customsState.phaseIdx];
    customsState.count += avatarsOnShip.length;
    G.score += avatarsOnShip.length;
    renderHUD();
    showCheckmark(ship); // ✅ green checkmark animation

    if (customsState.count >= phase.count) {
      const nextPhase = customsState.phaseIdx + 1;
      if (nextPhase >= G.level.customs[laneIdx].phases.length) {
        customsState.done = true;
        showToast(`Lane ${laneIdx + 1} cleared! ✅`, 'success');
        checkLevelComplete();
      } else {
        customsState.phaseIdx = nextPhase;
        customsState.count = 0;
        showToast(`New requirement for Lane ${laneIdx + 1}!`, 'success');
      }
      renderCustoms();
    } else {
      renderCustoms();
    }
  } else {
    rejectShip(ship, laneIdx);
  }
}

function rejectShip(ship, laneIdx) {
  // Animate cargo flying upward first
  ship.slots.forEach((avt, si) => {
    if (!avt) return;
    const card = document.getElementById('avt-' + avt._instanceId);
    if (card) card.classList.add('flying-up');
  });

  // After animation: return cargo to pool, lose life
  setTimeout(() => {
    ship.slots.forEach(avt => returnToPool(avt));
    ship.slots = ship.slots.map(() => null);
    updateShipSlotDOM(ship);
    loseLife();
    markShipRejected(ship);
  }, 420);
}

function showCheckmark(ship) {
  const el = document.getElementById('ship-' + ship.id);
  if (!el) return;
  const check = document.createElement('div');
  check.className = 'ship-checkmark';
  check.textContent = '✅';
  // position relative to ship-body
  const body = el.querySelector('.ship-body');
  if (body) {
    body.style.position = 'relative';
    body.appendChild(check);
    setTimeout(() => check.remove(), 1200);
  }
}

function updateShipHighlights() {
  G.lanes.forEach((lane, laneIdx) => {
    const customsState = G.customs[laneIdx];
    const correctSet = customsState && !customsState.done
      ? new Set(G.level.customs[laneIdx].correctAvatars || [])
      : null;

    lane.ships.forEach(ship => {
      if (ship.checked) return;
      const el = document.getElementById('ship-' + ship.id);
      if (!el) return;

      el.classList.remove('valid', 'invalid');
      if (!correctSet) return;

      const avatarsOnShip = ship.slots.filter(Boolean);
      if (avatarsOnShip.length === 0) return;

      const allCorrect = avatarsOnShip.every(a => correctSet.has(a.id));
      el.classList.add(allCorrect ? 'valid' : 'invalid');
    });
  });
}

// ============================================================
// LIVES
// ============================================================
function loseLife() {
  G.lives = Math.max(0, G.lives - 1);
  renderHUD();
  if (G.lives === 0) {
    setTimeout(() => gameOver(), 500);
  }
}

function gameOver() {
  G.running = false;
  showOverlay('game-over');
}

function checkLevelComplete() {
  if (G.customs.every(c => c.done)) {
    G.running = false;
    setTimeout(() => showOverlay('level-complete'), 600);
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
  el.dataset.laneIdx = laneIdx;
  el.style.top = ship.y + 'px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';

  el.innerHTML = `
    <div class="ship-bow"></div>
    <div class="ship-body">
      <div class="cargo-slots" id="slots-${ship.id}">
        ${ship.slots.map((avt, si) => createSlotHTML(ship, si, avt)).join('')}
      </div>
    </div>
    <div class="ship-stern"></div>
  `;

  laneEl.appendChild(el);
  attachSlotEvents(ship);
}

function createSlotHTML(ship, slotIdx, avt) {
  const isEmpty = !avt;
  return `
    <div class="cargo-slot ${isEmpty ? 'empty' : ''}"
         id="slot-${ship.id}-${slotIdx}"
         data-ship-id="${ship.id}"
         data-slot-idx="${slotIdx}">
      ${avt ? createAvatarHTML(avt, ship.id, slotIdx) : ''}
    </div>`;
}

function createAvatarHTML(avt, shipId, slotIdx) {
  const imgUrl = avt.imageUrl || (AVATAR_BASE_URL + avt.file);
  return `
    <div class="avatar-card"
         id="avt-${avt._instanceId}"
         data-ship-id="${shipId}"
         data-slot-idx="${slotIdx}"
         data-avt-id="${avt.id}"
         data-instance-id="${avt._instanceId}">
      <img src="${imgUrl}" alt="${avt.id}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect width=%2280%22 height=%2280%22 fill=%22%23ddd%22/><text x=%2240%22 y=%2245%22 text-anchor=%22middle%22 font-size=%228%22>${avt.id}</text></svg>'">
    </div>`;
}

function removeShipDOM(ship) {
  const el = document.getElementById('ship-' + ship.id);
  if (el) el.remove();
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

// ============================================================
// DOM: RENDER LOOP (positions)
// ============================================================
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
  const heartsEl = document.getElementById('hearts-display');
  if (heartsEl) {
    heartsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'heart';
      span.id = 'heart-' + i;
      span.textContent = i < G.lives ? '❤️' : '🖤';
      heartsEl.appendChild(span);
    }
  }
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = '📦 ' + G.score;
}

// ============================================================
// DOM: CUSTOMS
// ============================================================
function renderCustoms() {
  const container = document.getElementById('customs-booths');
  if (!container) return;

  container.innerHTML = '';
  G.level.customs.forEach((cCfg, i) => {
    const state = G.customs[i];
    const phase = cCfg.phases[state.phaseIdx] || {};
    const count = phase.count || 0;
    const done  = state.done;

    const booth = document.createElement('div');
    booth.className = 'customs-booth' + (done ? ' completed' : '');
    booth.id = 'booth-' + i;

    let hintHTML = '';
    if (cCfg.displayHint) {
      (cCfg.displayHint.required || []).forEach(t => {
        hintHTML += `<span class="tag-badge required">${t}</span>`;
      });
      (cCfg.displayHint.banned || []).forEach(t => {
        hintHTML += `<span class="tag-badge banned">🚫${t}</span>`;
      });
    }

    booth.innerHTML = done
      ? `<div class="booth-label">Lane ${i + 1}</div><div style="font-size:24px">✅</div><div class="booth-progress">Done!</div>`
      : `<div class="booth-label">Lane ${i + 1}</div>
         <div class="booth-hint">${hintHTML}</div>
         <div class="booth-progress">${state.count} / ${count}</div>`;

    container.appendChild(booth);
  });
}

// ============================================================
// DOM: BUILD MAIN LAYOUT
// ============================================================
function buildDOM() {
  const root = document.getElementById('game-root');

  // Clear previous game state
  document.getElementById('lanes-container').innerHTML = '';

  const lanesContainer = document.getElementById('lanes-container');
  const laneCount = G.level.laneCount;

  // Calculate customs bar position
  const customsY = getCustomsY();
  const customsBar = document.getElementById('customs-bar');
  customsBar.style.top = (56 + customsY) + 'px';

  // Build lanes
  for (let i = 0; i < laneCount; i++) {
    const laneEl = document.createElement('div');
    laneEl.className = 'lane';
    laneEl.id = 'lane-' + i;
    lanesContainer.appendChild(laneEl);
  }

  // Reset spawn timers (stagger slightly)
  G.lanes.forEach((lane, i) => {
    lane.spawnTimer = i * 0.5; // stagger first spawns
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
  const avt = ship.slots[slotIdx];
  if (!avt) return;

  G.drag.active      = true;
  G.drag.avatarId    = avt._instanceId;
  G.drag.srcShipIdx  = findShipIdxById(shipId);
  G.drag.srcSlot     = { shipId, slotIdx };
  G.drag.overShipIdx = null;
  G.drag.overSlotIdx = null;

  // Show ghost
  const ghost = document.createElement('div');
  ghost.id = 'drag-ghost';
  ghost.innerHTML = `<img src="${avt.imageUrl || (AVATAR_BASE_URL + avt.file)}" loading="lazy">`;
  document.body.appendChild(ghost);
  G.drag.ghostEl = ghost;
  moveDragGhost(e.clientX, e.clientY);

  // Dim source card
  const card = document.getElementById('avt-' + avt._instanceId);
  if (card) card.classList.add('dragging');

  // Listen globally
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
  // Clear previous highlight
  clearDragHighlight();

  // Find element under cursor (skip ghost)
  if (G.drag.ghostEl) G.drag.ghostEl.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  if (G.drag.ghostEl) G.drag.ghostEl.style.display = '';

  if (!el) return;

  // Find avatar-card or cargo-slot
  const card = el.closest('.avatar-card');
  const slot = el.closest('.cargo-slot');

  if (card) {
    const targetShipId  = parseInt(card.dataset.shipId);
    const targetSlotIdx = parseInt(card.dataset.slotIdx);
    if (targetShipId !== G.drag.srcSlot.shipId || targetSlotIdx !== G.drag.srcSlot.slotIdx) {
      card.classList.add('swap-target');
      G.drag.overShipId  = targetShipId;
      G.drag.overSlotIdx = targetSlotIdx;
    }
  } else if (slot) {
    const targetShipId  = parseInt(slot.dataset.shipId);
    const targetSlotIdx = parseInt(slot.dataset.slotIdx);
    if (targetShipId !== G.drag.srcSlot.shipId || targetSlotIdx !== G.drag.srcSlot.slotIdx) {
      slot.classList.add('swap-target');
      G.drag.overShipId  = targetShipId;
      G.drag.overSlotIdx = targetSlotIdx;
    }
  }
}

function clearDragHighlight() {
  document.querySelectorAll('.swap-target').forEach(el => el.classList.remove('swap-target'));
}

function onDragEnd(e) {
  if (!G.drag.active) return;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup',   onDragEnd);

  clearDragHighlight();

  // Remove ghost
  if (G.drag.ghostEl) { G.drag.ghostEl.remove(); G.drag.ghostEl = null; }

  // Un-dim source
  const srcShip = findShipByIdx(G.drag.srcShipIdx);
  const srcAvt  = srcShip && srcShip.slots[G.drag.srcSlot.slotIdx];
  if (srcAvt) {
    const card = document.getElementById('avt-' + srcAvt._instanceId);
    if (card) card.classList.remove('dragging');
  }

  // Perform swap if valid target
  if (G.drag.overShipId !== undefined && G.drag.overShipId !== null) {
    doSwap(
      G.drag.srcSlot.shipId,  G.drag.srcSlot.slotIdx,
      G.drag.overShipId,      G.drag.overSlotIdx
    );
  }

  G.drag.active      = false;
  G.drag.overShipId  = null;
  G.drag.overSlotIdx = null;
}

function doSwap(shipIdA, slotIdxA, shipIdB, slotIdxB) {
  if (shipIdA === shipIdB && slotIdxA === slotIdxB) return;

  const shipA = findShipById(shipIdA);
  const shipB = findShipById(shipIdB);
  if (!shipA || !shipB) return;
  if (shipA.checked || shipB.checked) return; // Can't move cargo on ships that already passed

  // Swap
  const tmp           = shipA.slots[slotIdxA];
  shipA.slots[slotIdxA] = shipB.slots[slotIdxB];
  shipB.slots[slotIdxB] = tmp;

  // Update DOM
  updateShipSlotDOM(shipA);
  updateShipSlotDOM(shipB);
}

// ============================================================
// HELPERS
// ============================================================
function findShipById(shipId) {
  for (const lane of G.lanes) {
    const s = lane.ships.find(s => s.id === shipId);
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
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// ============================================================
// OVERLAY (Game Over / Level Complete)
// ============================================================
function showOverlay(type) {
  const overlay = document.getElementById('overlay');
  const card    = document.getElementById('overlay-card');
  overlay.classList.remove('hidden');

  if (type === 'game-over') {
    card.innerHTML = `
      <h1>💀 Game Over</h1>
      <p>Score: ${G.score} items delivered</p>
      <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
      &nbsp;
      <button class="btn btn-danger" onclick="showLevelSelect()">Levels</button>`;
  } else {
    card.innerHTML = `
      <h1>🎉 Level Clear!</h1>
      <p>Score: ${G.score} items delivered<br>Lives remaining: ${'❤️'.repeat(G.lives)}</p>
      <button class="btn btn-success" onclick="showLevelSelect()">Back to Levels</button>`;
  }
}

function showLevelSelect() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('level-select').classList.remove('hidden');
  G.running = false;
}
