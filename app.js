// ============================================================
// BADMINTON TOURNAMENT BRACKET
// ============================================================

const EVENTS = {
  "doi-nam":    { title: "Đôi nam",      pairs: 6,  bracket: "A", color: "blue",   pairBg: "#eff6ff", pairBorder: "#93c5fd", labelColor: "#1e40af" },
  "doi-nu":     { title: "Đôi nữ",       pairs: 6,  bracket: "A", color: "rose",   pairBg: "#fff1f2", pairBorder: "#fda4af", labelColor: "#9f1239" },
  "doi-nam-nu": { title: "Đôi nam nữ",   pairs: 12, bracket: "B", color: "violet", pairBg: "#f5f3ff", pairBorder: "#c4b5fd", labelColor: "#6d28d9" }
};

const STORAGE_KEY = "badminton-tournament-v1";

const initialState = () => ({
  activeTab: "doi-nam",
  mode: "preview",
  events: {
    "doi-nam":    { players: Array(12).fill(""), results: {} },
    "doi-nu":     { players: Array(12).fill(""), results: {} },
    "doi-nam-nu": { players: Array(24).fill(""), results: {} }
  }
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    const base = initialState();
    return {
      ...base,
      activeTab: parsed.activeTab || base.activeTab,
      mode: parsed.mode || base.mode,
      events: {
        "doi-nam":    mergeEvent(base.events["doi-nam"], parsed.events?.["doi-nam"]),
        "doi-nu":     mergeEvent(base.events["doi-nu"], parsed.events?.["doi-nu"]),
        "doi-nam-nu": mergeEvent(base.events["doi-nam-nu"], parsed.events?.["doi-nam-nu"]),
      }
    };
  } catch (e) {
    console.warn("Load failed:", e);
    return initialState();
  }
}

function mergeEvent(base, loaded) {
  if (!loaded) return base;
  const players = [...base.players];
  if (Array.isArray(loaded.players)) {
    loaded.players.forEach((v, i) => { if (i < players.length && typeof v === "string") players[i] = v; });
  }
  return { players, results: loaded.results && typeof loaded.results === "object" ? loaded.results : {} };
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// ============================================================
// PAIR UTILITIES
// ============================================================

function getPairPlayers(eventKey, pairIdx) {
  const ev = state.events[eventKey];
  const a = pairIdx * 2, b = pairIdx * 2 + 1;
  const p1 = (ev.players[a] || "").trim();
  const p2 = (ev.players[b] || "").trim();
  return { p1, p2, idx1: a + 1, idx2: b + 1 };
}

function pairShortLabel(eventKey, pairIdx) {
  const { p1, p2, idx1, idx2 } = getPairPlayers(eventKey, pairIdx);
  const a = p1 || `N${idx1}`;
  const b = p2 || `N${idx2}`;
  return `${a} & ${b}`;
}

function pairFullName(eventKey, pairIdx) {
  if (pairIdx === null || pairIdx === undefined) return null;
  const { p1, p2 } = getPairPlayers(eventKey, pairIdx);
  const a = p1 || `Người ${pairIdx*2+1}`;
  const b = p2 || `Người ${pairIdx*2+2}`;
  return `Cặp ${pairIdx+1}: ${a} & ${b}`;
}

// ============================================================
// BRACKET A LOGIC (6 pairs)
// ============================================================

function aV1Winner(ev, m) {
  const r = state.events[ev].results.v1;
  if (!r || r[m] === undefined || r[m] === null) return null;
  return m * 2 + r[m];
}
function aV1Loser(ev, m) {
  const r = state.events[ev].results.v1;
  if (!r || r[m] === undefined || r[m] === null) return null;
  return m * 2 + (1 - r[m]);
}
function aV1Losers(ev) { return [0,1,2].map(i => aV1Loser(ev, i)); }
function aRevival(ev) {
  const rev = state.events[ev].results.revival;
  if (rev === undefined || rev === null) return null;
  const losers = aV1Losers(ev);
  return losers[rev] ?? null;
}
function aBKFeeders(ev, bk) {
  if (bk === 0) return [aV1Winner(ev, 0), aV1Winner(ev, 1)];
  return [aV1Winner(ev, 2), aRevival(ev)];
}
function aBKWinner(ev, bk) {
  const r = state.events[ev].results;
  const pick = bk === 0 ? r.bk1 : r.bk2;
  if (pick === undefined || pick === null) return null;
  return aBKFeeders(ev, bk)[pick];
}
function aFinalFeeders(ev) { return [aBKWinner(ev, 0), aBKWinner(ev, 1)]; }
function aChampion(ev) {
  const pick = state.events[ev].results.final;
  if (pick === undefined || pick === null) return null;
  return aFinalFeeders(ev)[pick];
}

// ============================================================
// BRACKET B LOGIC (12 pairs)
// ============================================================

function bV1Winner(ev, m) {
  const r = state.events[ev].results.v1;
  if (!r || r[m] === undefined || r[m] === null) return null;
  return m * 2 + r[m];
}
function bTKFeeders(ev, tk) { return [bV1Winner(ev, tk*2), bV1Winner(ev, tk*2+1)]; }
function bTKWinner(ev, tk) {
  const r = state.events[ev].results.v2;
  if (!r || r[tk] === undefined || r[tk] === null) return null;
  return bTKFeeders(ev, tk)[r[tk]];
}
function bTKLoser(ev, tk) {
  const r = state.events[ev].results.v2;
  if (!r || r[tk] === undefined || r[tk] === null) return null;
  return bTKFeeders(ev, tk)[1 - r[tk]];
}
function bTKLosers(ev) { return [0,1,2].map(i => bTKLoser(ev, i)); }
function bRevival(ev) {
  const rev = state.events[ev].results.revival;
  if (rev === undefined || rev === null) return null;
  return bTKLosers(ev)[rev] ?? null;
}
function bBKFeeders(ev, bk) {
  if (bk === 0) return [bTKWinner(ev, 0), bTKWinner(ev, 1)];
  return [bTKWinner(ev, 2), bRevival(ev)];
}
function bBKWinner(ev, bk) {
  const r = state.events[ev].results;
  const pick = bk === 0 ? r.bk1 : r.bk2;
  if (pick === undefined || pick === null) return null;
  return bBKFeeders(ev, bk)[pick];
}
function bFinalFeeders(ev) { return [bBKWinner(ev, 0), bBKWinner(ev, 1)]; }
function bChampion(ev) {
  const pick = state.events[ev].results.final;
  if (pick === undefined || pick === null) return null;
  return bFinalFeeders(ev)[pick];
}

// ============================================================
// RESULT MUTATIONS (pick clears downstream)
// ============================================================

function clearFromRound(ev, from) {
  const r = state.events[ev].results;
  const order = ["v1", "v2", "revival", "bk1", "bk2", "final"];
  const startIdx = order.indexOf(from);
  order.slice(startIdx).forEach(k => { delete r[k]; });
}

function pickV1(ev, match, choice) {
  const cfg = EVENTS[ev];
  const totalMatches = cfg.bracket === "A" ? 3 : 6;
  const r = state.events[ev].results;
  // preserve other v1 picks; clear revival + downstream
  if (!r.v1) r.v1 = Array(totalMatches).fill(null);
  while (r.v1.length < totalMatches) r.v1.push(null);
  r.v1[match] = choice;
  delete r.v2;
  delete r.revival;
  delete r.bk1; delete r.bk2; delete r.final;
}
function pickV2(ev, match, choice) {
  const r = state.events[ev].results;
  if (!r.v2) r.v2 = Array(3).fill(null);
  while (r.v2.length < 3) r.v2.push(null);
  r.v2[match] = choice;
  delete r.revival;
  delete r.bk1; delete r.bk2; delete r.final;
}
function pickRevival(ev, choice) {
  const r = state.events[ev].results;
  r.revival = choice;
  delete r.bk2;
  delete r.final;
}
function pickBK(ev, bk, choice) {
  const r = state.events[ev].results;
  if (bk === 0) r.bk1 = choice; else r.bk2 = choice;
  delete r.final;
}
function pickFinal(ev, choice) {
  state.events[ev].results.final = choice;
}

// ============================================================
// RENDERING
// ============================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function render() {
  renderTabs();
  renderModeButtons();
  renderBracket();
  renderPlayerList();
  document.body.classList.toggle("mode-edit", state.mode === "edit");
  document.body.classList.toggle("mode-preview", state.mode === "preview");
}

function winBadgeHTML(round, match) {
  const matchAttr = match !== undefined && match !== null ? ` data-match="${match}"` : "";
  return `<div class="win-badge"><span>WIN</span><button type="button" class="win-clear" data-action="clear-pick" data-round="${round}"${matchAttr} title="Hủy chọn">×</button></div>`;
}

function renderTabs() {
  $$(".event-tab").forEach(el => {
    el.classList.toggle("active", el.dataset.tab === state.activeTab);
  });
}

function renderModeButtons() {
  const isEdit = state.mode === "edit";
  $("#mode-preview").classList.toggle("active", !isEdit);
  $("#mode-edit").classList.toggle("active", isEdit);
  $("#mode-hint").textContent = isEdit
    ? "Click vào cặp để chọn đội thắng. Ô hồi sinh chọn từ dropdown."
    : "Chỉ xem sơ đồ · bật Nhập kết quả để chọn đội thắng.";
}

function renderBracket() {
  const ev = state.activeTab;
  const cfg = EVENTS[ev];
  const wrap = $("#bracket-area");
  wrap.innerHTML = cfg.bracket === "A" ? renderBracketA(ev) : renderBracketB(ev);
  // Draw connectors after layout settles
  requestAnimationFrame(drawConnectors);
}

function drawConnectors() {
  const grid = document.querySelector(".bracket-grid");
  if (!grid) return;

  grid.querySelectorAll(".connectors-svg").forEach(el => el.remove());

  const gridRect = grid.getBoundingClientRect();
  if (gridRect.width === 0) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "connectors-svg");
  svg.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  function cardAnchor(card, side) {
    const r = card.getBoundingClientRect();
    return {
      x: (side === "right" ? r.right : r.left) - gridRect.left,
      y: r.top + r.height / 2 - gridRect.top
    };
  }

  // For each source item with data-conn-out, find target and draw lines from all its cards
  grid.querySelectorAll("[data-conn-out]").forEach(srcItem => {
    const targetId = srcItem.dataset.connOut;
    const targetItem = grid.querySelector(`[data-conn-id="${targetId}"]`);
    if (!targetItem) return;

    const sourceCards = srcItem.querySelectorAll(".pair-card, .slot-card, .revival-card");
    const targetCard = targetItem.querySelector(".pair-card, .slot-card, .revival-card, .champion-card") || targetItem;
    const to = cardAnchor(targetCard, "left");

    sourceCards.forEach(card => {
      const from = cardAnchor(card, "right");
      const midX = (from.x + to.x) / 2;
      const isWinner = card.classList.contains("winner");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("class", "connector-path " + (isWinner ? "winner" : "loser"));
      path.setAttribute("d", `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`);
      svg.appendChild(path);
    });
  });

  grid.appendChild(svg);
}

// ---------- Pair Card ----------
function pairCardHTML(eventKey, pairIdx, opts = {}) {
  const cfg = EVENTS[eventKey];
  const { p1, p2, idx1, idx2 } = getPairPlayers(eventKey, pairIdx);
  const compact = opts.compact;
  const winStatus = opts.winStatus;
  const clickable = opts.clickable;
  const action = clickable ? (opts.action || "") : "";
  const winBadge = winStatus === "winner" && opts.round ? winBadgeHTML(opts.round, opts.match) : "";
  const classes = ["pair-card"];
  if (compact) classes.push("compact");
  if (winStatus === "winner") classes.push("winner");
  if (winStatus === "loser") classes.push("loser");
  if (clickable) classes.push("clickable");
  const style = `style="background:${compact ? cfg.pairBg : cfg.pairBg}; border-color:${cfg.pairBorder};"`;
  const labelStyle = `style="color:${cfg.labelColor};"`;

  if (compact) {
    const a = p1 || `N${idx1}`;
    const b = p2 || `N${idx2}`;
    return `
      <div class="${classes.join(' ')}" ${style} ${action}>
        ${winBadge}
        <div class="pair-label" ${labelStyle}>Cặp ${pairIdx+1}</div>
        <div class="pair-players">
          <div>${escapeHTML(a)}</div>
          <div>${escapeHTML(b)}</div>
        </div>
      </div>`;
  }
  return `
    <div class="${classes.join(' ')}" ${style} ${action}>
      ${winBadge}
      <div class="pair-label" ${labelStyle}>Cặp ${pairIdx+1}</div>
      <div class="pair-players">
        <div>${escapeHTML(p1 || '—')}</div>
        <div>${escapeHTML(p2 || '—')}</div>
      </div>
    </div>`;
}

// ---------- Slot Card (semifinal/final placeholder) ----------
function slotCardHTML(title, subtitle, opts = {}) {
  const classes = ["slot-card"];
  if (opts.final) classes.push("final");
  if (opts.filled) classes.push("filled");
  if (opts.winStatus === "winner") classes.push("winner", "filled");
  if (opts.winStatus === "loser") classes.push("loser");
  if (opts.clickable) classes.push("clickable");
  const action = opts.clickable ? (opts.action || "") : "";
  const winBadge = opts.winStatus === "winner" && opts.round ? winBadgeHTML(opts.round, opts.match) : "";
  return `
    <div class="${classes.join(' ')}" ${action}>
      ${winBadge}
      <div class="slot-title">${escapeHTML(title)}</div>
      <div class="slot-sub">${escapeHTML(subtitle)}</div>
    </div>`;
}

// ---------- Revival Slot (bottom slot of BK2, with embedded dropdown in edit mode) ----------
function revivalSlotHTML(eventKey, losers, clickOpts = {}) {
  const ev = eventKey;
  const isEdit = state.mode === "edit";
  const cfg = EVENTS[ev];
  const cur = state.events[ev].results.revival;
  const selectedPair = (cur !== undefined && cur !== null) ? losers[cur] : null;
  const sourceLabel = cfg.bracket === "A" ? "cặp thua V1" : "cặp thua Tứ kết";

  if (selectedPair !== null) {
    // Already chosen → render like a regular (filled) slot, clickable for BK2 pick if opts allow
    const classes = ["slot-card", "filled"];
    if (clickOpts.winStatus === "winner") classes.push("winner");
    if (clickOpts.winStatus === "loser") classes.push("loser");
    if (clickOpts.clickable) classes.push("clickable");
    const action = clickOpts.clickable ? (clickOpts.action || "") : "";
    const winBadge = clickOpts.winStatus === "winner" && clickOpts.round ? winBadgeHTML(clickOpts.round, clickOpts.match) : "";
    return `
      <div class="${classes.join(' ')}" style="border-color:#f59e0b;background:#fffbeb;" ${action}>
        ${winBadge}
        <div class="slot-title">🎯 ${escapeHTML(pairFullName(ev, selectedPair))}</div>
        <div class="slot-sub">Cặp hồi sinh · đã chọn</div>
      </div>`;
  }

  // Not yet chosen → dashed amber card, show dropdown in edit mode
  let body;
  if (isEdit) {
    const allReady = losers.every(l => l !== null && l !== undefined);
    if (!allReady) {
      body = `<div class="rev-sub">Cần hoàn tất vòng trước để chọn</div>`;
    } else {
      const options = losers.map((pIdx, i) =>
        `<option value="${i}" ${cur === i ? "selected" : ""}>${escapeHTML(pairFullName(ev, pIdx))}</option>`
      ).join("");
      body = `<select data-action="revival"><option value="">— Chọn 1 cặp —</option>${options}</select>`;
    }
  } else {
    body = `<div class="rev-sub">BTC chọn 1 ${sourceLabel} theo hiệu số</div>`;
  }

  return `
    <div class="revival-card">
      <div class="rev-title">🎯 CẶP HỒI SINH</div>
      ${body}
    </div>`;
}

// ============================================================
// BRACKET A RENDER (6 pairs)
// ============================================================

function renderBracketA(ev) {
  const r = state.events[ev].results;
  const isEdit = state.mode === "edit";

  // ===== V1: column 1, rows 1-3 = matches, row 4 = mechanism =====
  const v1Items = [0,1,2].map(m => {
    const top = m*2, bot = m*2+1;
    const w = r.v1?.[m];
    const topStatus = w === 0 ? "winner" : w === 1 ? "loser" : null;
    const botStatus = w === 1 ? "winner" : w === 0 ? "loser" : null;
    return `
      <div class="bg-item" style="grid-column:1; grid-row:${m+1};" data-conn-out="v2-r${m+1}">
        <div class="match-group with-title">
          <div class="match-title">Trận ${m+1}</div>
          ${pairCardHTML(ev, top, { winStatus: topStatus, round: "v1", match: m, clickable: isEdit, action: `data-action="pick-v1" data-match="${m}" data-choice="0"` })}
          <div class="vs-label">vs</div>
          ${pairCardHTML(ev, bot, { winStatus: botStatus, round: "v1", match: m, clickable: isEdit, action: `data-action="pick-v1" data-match="${m}" data-choice="1"` })}
        </div>
      </div>`;
  }).join("");

  const mechItem = `
    <div class="bg-item" style="grid-column:1; grid-row:4;">
      <div class="mechanism-box">
        <div class="mech-title">CƠ CHẾ HỒI SINH (Bảng A)</div>
        BTC chọn 1 trong 3 cặp thua Vòng 1 (theo hiệu số) → vào Bán kết 2.
      </div>
    </div>`;

  // ===== V2: column 2, 4 individual slot cards (1-to-1 with V1 rows) =====
  const losersA = aV1Losers(ev);
  const bk1F = aBKFeeders(ev, 0);
  const bk2F = aBKFeeders(ev, 1);
  const bk1P = r.bk1, bk2P = r.bk2;
  const bk1CanClick = isEdit && bk1F[0] !== null && bk1F[1] !== null;
  const bk2CanClick = isEdit && bk2F[0] !== null && bk2F[1] !== null;

  const mkV2 = (row, bkIdx, choice, fallback, feeder, canClick) => {
    const pick = bkIdx === 0 ? bk1P : bk2P;
    const status = pick === choice ? "winner" : pick !== undefined && pick !== null ? "loser" : null;
    const label = feeder !== null ? pairFullName(ev, feeder) : fallback;
    const connOut = bkIdx === 0 ? "v3-r1" : "v3-r2";
    return `
      <div class="bg-item" style="grid-column:2; grid-row:${row};" data-conn-id="v2-r${row}" data-conn-out="${connOut}">
        ${slotCardHTML(label, `Bán kết ${bkIdx+1}`, {
          winStatus: status,
          round: bkIdx === 0 ? "bk1" : "bk2",
          clickable: canClick,
          action: `data-action="pick-bk" data-match="${bkIdx}" data-choice="${choice}"`
        })}
      </div>`;
  };

  const v2Row1 = mkV2(1, 0, 0, "Thắng Trận 1", bk1F[0], bk1CanClick);
  const v2Row2 = mkV2(2, 0, 1, "Thắng Trận 2", bk1F[1], bk1CanClick);
  const v2Row3 = mkV2(3, 1, 0, "Thắng Trận 3", bk2F[0], bk2CanClick);
  const v2Row4 = `
    <div class="bg-item" style="grid-column:2; grid-row:4;" data-conn-id="v2-r4" data-conn-out="v3-r2">
      ${revivalSlotHTML(ev, losersA, {
        winStatus: bk2P === 1 ? "winner" : bk2P === 0 ? "loser" : null,
        round: "bk2",
        clickable: bk2CanClick,
        action: `data-action="pick-bk" data-match="1" data-choice="1"`
      })}
    </div>`;

  // ===== V3: column 3, 2 cards each spans 2 rows =====
  const finalF = aFinalFeeders(ev);
  const finalP = r.final;
  const finalCanClick = isEdit && finalF[0] !== null && finalF[1] !== null;
  const topFinalLabel = finalF[0] !== null ? pairFullName(ev, finalF[0]) : "Thắng BK 1";
  const botFinalLabel = finalF[1] !== null ? pairFullName(ev, finalF[1]) : "Thắng BK 2";
  const topFinalStatus = finalP === 0 ? "winner" : finalP === 1 ? "loser" : null;
  const botFinalStatus = finalP === 1 ? "winner" : finalP === 0 ? "loser" : null;

  const v3Top = `
    <div class="bg-item" style="grid-column:3; grid-row:1 / 3;" data-conn-id="v3-r1" data-conn-out="champion">
      ${slotCardHTML(topFinalLabel, "Cặp vào chung kết", { final: true, winStatus: topFinalStatus, round: "final", clickable: finalCanClick, action: `data-action="pick-final" data-choice="0"` })}
    </div>`;
  const v3Bot = `
    <div class="bg-item" style="grid-column:3; grid-row:3 / 5;" data-conn-id="v3-r2" data-conn-out="champion">
      ${slotCardHTML(botFinalLabel, "Cặp vào chung kết", { final: true, winStatus: botFinalStatus, round: "final", clickable: finalCanClick, action: `data-action="pick-final" data-choice="1"` })}
    </div>`;

  // ===== Champion: column 4, all rows =====
  const champPair = aChampion(ev);
  const champName = champPair !== null ? pairFullName(ev, champPair) : "";
  const championItem = `
    <div class="bg-item" style="grid-column:4; grid-row:1 / 5;" data-conn-id="champion">
      <div class="champion-card">
        <div class="champ-label">CHAMPION</div>
        <div class="trophy">🏆</div>
        <div class="champ-title">VÔ ĐỊCH</div>
        <div class="champ-name">${escapeHTML(champName || '—')}</div>
      </div>
    </div>`;

  const cfgA = EVENTS[ev];
  return `
    <div class="bracket-wrap bracket-a">
      <div class="bracket-export-title">
        <div class="bet-main">Sơ đồ giải đấu cầu lông · Nội dung</div>
        <div class="bet-event ${cfgA.color}">${escapeHTML(cfgA.title.toUpperCase())}</div>
      </div>
      <div class="bracket-header">
        <span>BẢNG A</span>
        <span class="text-xs font-normal opacity-90">6 cặp · 12 VĐV</span>
      </div>
      <div class="round-labels">
        <div class="round-label r1">VÒNG 1 · 3 trận</div>
        <div class="round-label r2">VÒNG 2 · BÁN KẾT</div>
        <div class="round-label r3">CHUNG KẾT</div>
        <div class="round-label r4">VÔ ĐỊCH</div>
      </div>
      <div class="bracket-grid">
        ${v1Items}${mechItem}
        ${v2Row1}${v2Row2}${v2Row3}${v2Row4}
        ${v3Top}${v3Bot}
        ${championItem}
      </div>
    </div>
  `;
}

// ============================================================
// BRACKET B RENDER (12 pairs)
// ============================================================

function renderBracketB(ev) {
  const r = state.events[ev].results;
  const isEdit = state.mode === "edit";

  // ===== V1: column 1, rows 1-6 = 6 matches (compact) =====
  const v1Items = [0,1,2,3,4,5].map(m => {
    const top = m*2, bot = m*2+1;
    const w = r.v1?.[m];
    const topStatus = w === 0 ? "winner" : w === 1 ? "loser" : null;
    const botStatus = w === 1 ? "winner" : w === 0 ? "loser" : null;
    return `
      <div class="bg-item" style="grid-column:1; grid-row:${m+1};" data-conn-out="v2-r${m+1}">
        <div class="match-group">
          ${pairCardHTML(ev, top, { compact: true, winStatus: topStatus, round: "v1", match: m, clickable: isEdit, action: `data-action="pick-v1" data-match="${m}" data-choice="0"` })}
          ${pairCardHTML(ev, bot, { compact: true, winStatus: botStatus, round: "v1", match: m, clickable: isEdit, action: `data-action="pick-v1" data-match="${m}" data-choice="1"` })}
        </div>
      </div>`;
  }).join("");

  // ===== V2 TK: column 2, 6 individual slot cards (1-to-1 with V1) =====
  const mkV2 = (row, tkIdx, choice, fallback, feeder) => {
    const tkF = bTKFeeders(ev, tkIdx);
    const pick = r.v2?.[tkIdx];
    const status = pick === choice ? "winner" : pick !== undefined && pick !== null ? "loser" : null;
    const label = feeder !== null ? pairFullName(ev, feeder) : fallback;
    const canClick = isEdit && tkF[0] !== null && tkF[1] !== null;
    const connOut = `v3-tk${tkIdx+1}`;
    return `
      <div class="bg-item" style="grid-column:2; grid-row:${row};" data-conn-id="v2-r${row}" data-conn-out="${connOut}">
        ${slotCardHTML(label, `Tứ kết ${tkIdx+1}`, {
          winStatus: status,
          round: "v2",
          match: tkIdx,
          clickable: canClick,
          action: `data-action="pick-v2" data-match="${tkIdx}" data-choice="${choice}"`
        })}
      </div>`;
  };

  const v2Items = [0,1,2].map(tk => {
    const f = bTKFeeders(ev, tk);
    return mkV2(tk*2+1, tk, 0, `Thắng Trận ${tk*2+1}`, f[0]) +
           mkV2(tk*2+2, tk, 1, `Thắng Trận ${tk*2+2}`, f[1]);
  }).join("");

  // ===== V3 BK: column 3, 4 items =====
  const losersB = bTKLosers(ev);
  const bk1F = bBKFeeders(ev, 0);
  const bk2F = bBKFeeders(ev, 1);
  const bk1P = r.bk1, bk2P = r.bk2;
  const bk1CanClick = isEdit && bk1F[0] !== null && bk1F[1] !== null;
  const bk2CanClick = isEdit && bk2F[0] !== null && bk2F[1] !== null;

  const mkV3 = (rowSpan, bkIdx, choice, fallback, feeder, canClick, connId) => {
    const pick = bkIdx === 0 ? bk1P : bk2P;
    const status = pick === choice ? "winner" : pick !== undefined && pick !== null ? "loser" : null;
    const label = feeder !== null ? pairFullName(ev, feeder) : fallback;
    const connOut = bkIdx === 0 ? "v4-bk1" : "v4-bk2";
    return `
      <div class="bg-item" style="grid-column:3; grid-row:${rowSpan};" data-conn-id="${connId}" data-conn-out="${connOut}">
        ${slotCardHTML(label, `Bán kết ${bkIdx+1}`, {
          winStatus: status,
          round: bkIdx === 0 ? "bk1" : "bk2",
          clickable: canClick,
          action: `data-action="pick-bk" data-match="${bkIdx}" data-choice="${choice}"`
        })}
      </div>`;
  };

  const v3TK1 = mkV3("1 / 3", 0, 0, "Thắng Tứ kết 1", bk1F[0], bk1CanClick, "v3-tk1");
  const v3TK2 = mkV3("3 / 5", 0, 1, "Thắng Tứ kết 2", bk1F[1], bk1CanClick, "v3-tk2");
  const v3TK3 = mkV3("5 / 7", 1, 0, "Thắng Tứ kết 3", bk2F[0], bk2CanClick, "v3-tk3");
  const v3Revival = `
    <div class="bg-item" style="grid-column:3; grid-row:7;" data-conn-id="v3-revival" data-conn-out="v4-bk2">
      ${revivalSlotHTML(ev, losersB, {
        winStatus: bk2P === 1 ? "winner" : bk2P === 0 ? "loser" : null,
        round: "bk2",
        clickable: bk2CanClick,
        action: `data-action="pick-bk" data-match="1" data-choice="1"`
      })}
    </div>`;

  // ===== V4 Final: column 4, 2 items =====
  const finalF = bFinalFeeders(ev);
  const finalP = r.final;
  const finalCanClick = isEdit && finalF[0] !== null && finalF[1] !== null;
  const topFinalLabel = finalF[0] !== null ? pairFullName(ev, finalF[0]) : "Thắng Bán kết 1";
  const botFinalLabel = finalF[1] !== null ? pairFullName(ev, finalF[1]) : "Thắng Bán kết 2";
  const topFinalStatus = finalP === 0 ? "winner" : finalP === 1 ? "loser" : null;
  const botFinalStatus = finalP === 1 ? "winner" : finalP === 0 ? "loser" : null;

  const v4Top = `
    <div class="bg-item" style="grid-column:4; grid-row:1 / 5;" data-conn-id="v4-bk1" data-conn-out="champion">
      ${slotCardHTML(topFinalLabel, "Vào chung kết", { final: true, winStatus: topFinalStatus, round: "final", clickable: finalCanClick, action: `data-action="pick-final" data-choice="0"` })}
    </div>`;
  const v4Bot = `
    <div class="bg-item" style="grid-column:4; grid-row:5 / 8;" data-conn-id="v4-bk2" data-conn-out="champion">
      ${slotCardHTML(botFinalLabel, "Vào chung kết", { final: true, winStatus: botFinalStatus, round: "final", clickable: finalCanClick, action: `data-action="pick-final" data-choice="1"` })}
    </div>`;

  // ===== Champion =====
  const champPair = bChampion(ev);
  const champName = champPair !== null ? pairFullName(ev, champPair) : "";
  const championItem = `
    <div class="bg-item" style="grid-column:5; grid-row:1 / 8;" data-conn-id="champion">
      <div class="champion-card">
        <div class="champ-label">CHAMPION</div>
        <div class="trophy">🏆</div>
        <div class="champ-title">VÔ ĐỊCH</div>
        <div class="champ-name">${escapeHTML(champName || '—')}</div>
      </div>
    </div>`;

  const cfgB = EVENTS[ev];
  return `
    <div class="bracket-wrap bracket-b">
      <div class="bracket-export-title">
        <div class="bet-main">Sơ đồ giải đấu cầu lông · Nội dung</div>
        <div class="bet-event ${cfgB.color}">${escapeHTML(cfgB.title.toUpperCase())}</div>
      </div>
      <div class="bracket-header bracket-b-header">
        <span>BẢNG B</span>
        <span class="text-xs font-normal opacity-90">12 cặp · 24 VĐV</span>
      </div>
      <div class="round-labels">
        <div class="round-label r1">VÒNG 1 · 6 trận</div>
        <div class="round-label r2">VÒNG 2 · TỨ KẾT</div>
        <div class="round-label r3">VÒNG 3 · BÁN KẾT</div>
        <div class="round-label r4">CHUNG KẾT</div>
        <div class="round-label r4" style="background:#fef3c7;color:#92400e;">VÔ ĐỊCH</div>
      </div>
      <div class="bracket-grid">
        ${v1Items}
        ${v2Items}
        ${v3TK1}${v3TK2}${v3TK3}${v3Revival}
        ${v4Top}${v4Bot}
        ${championItem}
      </div>
      <div class="mechanism-box" style="margin-top:0.75rem;max-width:720px;">
        <div class="mech-title">CƠ CHẾ HỒI SINH (Bảng B)</div>
        Sau Tứ kết, BTC chọn 1 trong 3 cặp thua (theo hiệu số) → thẳng vào Bán kết 2.
      </div>
    </div>
  `;
}

// ============================================================
// PLAYER LIST RENDER
// ============================================================

function renderPlayerList() {
  const ev = state.activeTab;
  const cfg = EVENTS[ev];
  const total = cfg.pairs * 2;
  const wrap = $("#player-list");

  const rowsPerCol = 2; // two input groups per row
  const rows = [];
  for (let pair = 0; pair < cfg.pairs; pair++) {
    const idx1 = pair*2, idx2 = pair*2+1;
    rows.push(`
      <div class="player-row">
        <div class="pair-chip" style="background:${cfg.pairBg};color:${cfg.labelColor};">Cặp ${pair+1}</div>
        <label>Người ${idx1+1}:</label>
        <input type="text" data-player-idx="${idx1}" value="${escapeAttr(state.events[ev].players[idx1] || "")}" placeholder="Nhập tên VĐV ${idx1+1}">
        <label>Người ${idx2+1}:</label>
        <input type="text" data-player-idx="${idx2}" value="${escapeAttr(state.events[ev].players[idx2] || "")}" placeholder="Nhập tên VĐV ${idx2+1}">
      </div>
    `);
  }

  wrap.innerHTML = `
    <div class="player-list-title">DANH SÁCH VẬN ĐỘNG VIÊN · ${cfg.title} (${total} người)</div>
    <div class="player-grid">${rows.join("")}</div>
  `;
}

// ============================================================
// EVENT HANDLERS
// ============================================================

function initEvents() {
  // Tabs
  $$(".event-tab").forEach(el => {
    el.addEventListener("click", () => {
      state.activeTab = el.dataset.tab;
      render();
    });
  });

  // Mode
  $("#mode-preview").addEventListener("click", () => { state.mode = "preview"; render(); });
  $("#mode-edit").addEventListener("click", () => { state.mode = "edit"; render(); });

  // Header actions
  $("#btn-save").addEventListener("click", () => { persist(); toast("✓ Đã lưu"); });
  $("#btn-reset").addEventListener("click", resetCurrentEvent);
  $("#btn-export").addEventListener("click", exportPNG);
  $("#btn-export-json").addEventListener("click", exportJSON);
  $("#btn-import-json").addEventListener("click", () => $("#file-input").click());
  $("#file-input").addEventListener("change", importJSON);

  // Bracket clicks (delegated)
  $("#bracket-area").addEventListener("click", onBracketClick);
  $("#bracket-area").addEventListener("change", onBracketChange);

  // Player input (delegated on player list)
  $("#player-list").addEventListener("input", (e) => {
    const target = e.target;
    if (target.matches("input[data-player-idx]")) {
      const idx = parseInt(target.dataset.playerIdx, 10);
      state.events[state.activeTab].players[idx] = target.value;
      renderBracket(); // update bracket names live (not player list to avoid focus loss)
    }
  });

  // Confirm modal
  $("#confirm-cancel").addEventListener("click", hideConfirm);
}

function onBracketClick(e) {
  if (state.mode !== "edit") return;
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const ev = state.activeTab;
  const match = target.dataset.match !== undefined ? parseInt(target.dataset.match, 10) : null;
  const choice = target.dataset.choice !== undefined ? parseInt(target.dataset.choice, 10) : null;

  if (action === "clear-pick") {
    e.stopPropagation();
    clearPick(ev, target.dataset.round, match);
  } else if (action === "pick-v1") pickV1(ev, match, choice);
  else if (action === "pick-v2") pickV2(ev, match, choice);
  else if (action === "pick-bk") pickBK(ev, match, choice);
  else if (action === "pick-final") pickFinal(ev, choice);
  else return;

  renderBracket();
}

function clearPick(ev, round, match) {
  const r = state.events[ev].results;
  if (round === "v1") {
    if (r.v1 && match !== null) r.v1[match] = null;
    delete r.v2;
    delete r.revival;
    delete r.bk1; delete r.bk2; delete r.final;
  } else if (round === "v2") {
    if (r.v2 && match !== null) r.v2[match] = null;
    delete r.revival;
    delete r.bk1; delete r.bk2; delete r.final;
  } else if (round === "bk1") {
    delete r.bk1;
    delete r.final;
  } else if (round === "bk2") {
    delete r.bk2;
    delete r.final;
  } else if (round === "final") {
    delete r.final;
  }
}

function onBracketChange(e) {
  if (state.mode !== "edit") return;
  const t = e.target;
  if (t.matches('select[data-action="revival"]')) {
    const ev = state.activeTab;
    const val = t.value;
    if (val === "") {
      delete state.events[ev].results.revival;
      delete state.events[ev].results.bk2;
      delete state.events[ev].results.final;
    } else {
      pickRevival(ev, parseInt(val, 10));
    }
    renderBracket();
  }
}

// ============================================================
// RESET / EXPORT / IMPORT
// ============================================================

function resetCurrentEvent() {
  const ev = state.activeTab;
  const title = EVENTS[ev].title;
  showConfirm({
    title: `Đặt lại ${title}?`,
    message: "Tên VĐV và toàn bộ kết quả của nội dung này sẽ bị xóa. Các nội dung khác vẫn giữ nguyên.",
    okLabel: "Đặt lại",
    onOk: () => {
      const base = initialState().events[ev];
      state.events[ev] = base;
      persist();
      render();
      toast("✓ Đã đặt lại");
    }
  });
}

function exportPNG() {
  const ev = state.activeTab;
  const target = $("#bracket-area");
  document.body.classList.add("exporting");

  const prevHidden = $$("[data-hide-on-export]").map(el => { const d = el.style.display; el.style.display = "none"; return { el, d }; });

  // Expand to full content size and remove overflow clipping
  const prevWidth = target.style.width;
  const prevOverflow = target.style.overflow;
  const prevMaxWidth = target.style.maxWidth;
  const fullWidth = target.scrollWidth;
  target.style.overflow = "visible";
  target.style.maxWidth = "none";
  target.style.width = fullWidth + "px";

  function restore() {
    target.style.width = prevWidth;
    target.style.overflow = prevOverflow;
    target.style.maxWidth = prevMaxWidth;
    prevHidden.forEach(({ el, d }) => el.style.display = d);
    document.body.classList.remove("exporting");
  }

  html2canvas(target, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    windowWidth: fullWidth,
    scrollX: 0,
    scrollY: -window.scrollY,
  }).then(canvas => {
    restore();
    const link = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    link.download = `so-do-${ev}-${ts}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast("✓ Đã xuất PNG");
  }).catch(err => {
    restore();
    console.error(err);
    toast("✗ Lỗi xuất ảnh");
  });
}

function exportJSON() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 10);
  link.download = `giai-dau-cau-long-${ts}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  toast("✓ Đã xuất JSON");
}

function importJSON(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.events) throw new Error("Invalid format");
      state = {
        ...initialState(),
        activeTab: parsed.activeTab || state.activeTab,
        mode: parsed.mode || state.mode,
        events: {
          "doi-nam":    mergeEvent(initialState().events["doi-nam"], parsed.events["doi-nam"]),
          "doi-nu":     mergeEvent(initialState().events["doi-nu"], parsed.events["doi-nu"]),
          "doi-nam-nu": mergeEvent(initialState().events["doi-nam-nu"], parsed.events["doi-nam-nu"]),
        }
      };
      persist();
      render();
      toast("✓ Đã nhập JSON");
    } catch (err) {
      console.error(err);
      toast("✗ File JSON không hợp lệ");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

// ============================================================
// UI HELPERS
// ============================================================

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function showConfirm({ title, message, okLabel, onOk }) {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  const okBtn = $("#confirm-ok");
  okBtn.textContent = okLabel || "OK";
  const modal = $("#confirm-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  const handler = () => {
    hideConfirm();
    okBtn.removeEventListener("click", handler);
    onOk && onOk();
  };
  okBtn.addEventListener("click", handler, { once: true });
}
function hideConfirm() {
  const modal = $("#confirm-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(str) { return escapeHTML(str); }

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  render();
  // Redraw connectors on resize
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawConnectors, 120);
  });
});
