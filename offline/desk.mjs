// GO TOURNAMENT · โต๊ะจับคู่สำรอง (offline pairing desk).
// One HTML file the organiser downloads before the event. Runs with no internet: pair rounds with the same
// Swiss engine as the website, record results from paper score sheets, print, keep a backup file.
// When the internet is back, the backup file is uploaded on the organiser page and merged into the database.
// Built into public/offline/desk.js by scripts/build-offline-desk.mjs.
import { proposeSwissRound } from "../lib/swiss-round.mjs";
import { RESULT_OPTIONS, pairingPlayers, resultLabel, roundState, scoresFrom, waitingList } from "../lib/competition-day.mjs";
import { poolStandings } from "../lib/offline-standings.mjs";

const SEED = /** @type {any} */ (window).GT_OFFLINE_DATA;
const KEY = `gt-offline-desk:${SEED.tournament_id}`;
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pts = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));
const uid = () => "off-" + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const poolKey = (p) => p ?? "";
const pairKey = (a, b) => [a, b].sort().join("|");
const when = (iso) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");

/** @type {any} */ let S = load();
let ui = { div: S.divisions[0]?.id ?? null, pool: null, round: null, tab: "rounds", proposal: null, pick: null, toast: "" };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.tournament_id === SEED.tournament_id) {
      if (saved.snapshot_at === SEED.snapshot_at) return saved;
      if (saved.snapshot_at > SEED.snapshot_at) return saved;
      if (confirm(`เครื่องนี้มีงานที่ทำค้างไว้ (บันทึกล่าสุด ${when(saved.saved_at)})\nแต่ไฟล์นี้ดึงข้อมูลจากเว็บใหม่กว่า (${when(SEED.snapshot_at)})\n\nตกลง = ใช้ข้อมูลใหม่จากไฟล์นี้ · ยกเลิก = ทำต่อจากที่ค้างไว้`)) return structuredClone(SEED);
      return saved;
    }
  } catch { /* storage unavailable */ }
  return structuredClone(SEED);
}
function save(msg) {
  S.saved_at = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { msg = "⚠ บันทึกในเครื่องไม่ได้ — กด “บันทึกไฟล์สำรอง” ทันที"; }
  ui.toast = msg ?? "";
  render();
}

const division = () => S.divisions.find((d) => d.id === ui.div);
function poolData(d, pool) {
  const everyone = d.regs.filter((r) => poolKey(r.pool_label) === pool);
  return {
    everyone,
    regs: everyone.filter((r) => r.status !== "withdrawn"),
    matches: d.matches.filter((m) => poolKey(m.pool_label) === pool),
    byes: d.byes.filter((b) => poolKey(b.pool_label) === pool),
    byId: new Map(everyone.map((r) => [r.athlete_id, r])),
  };
}
const nameOf = (r) => r?.name ?? "ไม่ทราบชื่อ";

// ---------- actions ----------
const actions = {
  div(id) { ui = { ...ui, div: id, pool: null, round: null, proposal: null, pick: null, toast: "" }; render(); },
  pool(p) { ui = { ...ui, pool: p, round: null, proposal: null, pick: null, toast: "" }; render(); },
  tab(t) { ui.tab = t; ui.toast = ""; render(); },
  round(r) { ui.round = Number(r); render(); },
  pair() {
    const d = division(), pool = currentPool(d), P = poolData(d, pool), st = roundState(P.matches, P.byes, d.total_rounds);
    ui.proposal = { round: st.nextRound, seed: 1, ...propose(d, pool, P, st.nextRound, 1) }; ui.pick = null; render();
  },
  reshuffle() {
    const d = division(), pool = currentPool(d), P = poolData(d, pool), seed = ui.proposal.seed + 1;
    ui.proposal = { round: ui.proposal.round, seed, ...propose(d, pool, P, ui.proposal.round, seed) }; ui.pick = null; render();
  },
  closeProposal() { ui.proposal = null; ui.pick = null; render(); },
  colours(board) { const t = ui.proposal.tables.find((x) => x.board === Number(board)); [t.black, t.white] = [t.white, t.black]; render(); },
  slot(key) {
    if (!ui.pick) { ui.pick = key; return render(); }
    if (ui.pick === key) { ui.pick = null; return render(); }
    const get = (k) => (k === "bye" ? ui.proposal.bye : ui.proposal.tables.find((t) => t.board === Number(k.split(":")[0]))[k.split(":")[1]]);
    const set = (k, v) => { if (k === "bye") ui.proposal.bye = v; else ui.proposal.tables.find((t) => t.board === Number(k.split(":")[0]))[k.split(":")[1]] = v; };
    const a = get(ui.pick), b = get(key); set(ui.pick, b); set(key, a); ui.pick = null; render();
  },
  publish() {
    const d = division(), pool = currentPool(d), pr = ui.proposal;
    for (const t of pr.tables) d.matches.push({ id: uid(), round_number: pr.round, board_number: t.board, black_athlete_id: t.black, white_athlete_id: t.white,
      winner_athlete_id: null, result_code: null, result_margin: null, state: "pending", pool_label: pool || null });
    if (pr.bye) d.byes.push({ id: uid(), round_number: pr.round, athlete_id: pr.bye, pool_label: pool || null });
    ui.proposal = null; ui.round = pr.round;
    save(`ออกคู่รอบที่ ${pr.round} แล้ว · กด 🖨 พิมพ์ใบจับคู่ และ 💾 บันทึกไฟล์สำรอง`);
  },
  result(id, value) {
    const m = division().matches.find((x) => x.id === id);
    if (value === "") Object.assign(m, { state: "pending", result_code: null, result_margin: null, winner_athlete_id: null });
    else {
      const o = RESULT_OPTIONS[Number(value)];
      const win = o.code === "black_win" || o.code === "black_win_forfeit" ? m.black_athlete_id : o.code === "white_win" || o.code === "white_win_forfeit" ? m.white_athlete_id : null;
      Object.assign(m, { state: "verified", result_code: o.code, result_margin: o.margin, winner_athlete_id: win });
    }
    const d = division(), P = poolData(d, poolKey(m.pool_label)), st = roundState(P.matches, P.byes, d.total_rounds);
    save(st.pending === 0 ? `ลงผลรอบที่ ${st.lastRound} ครบแล้ว · 💾 บันทึกไฟล์สำรอง แล้วจับคู่รอบถัดไป` : "");
  },
  cancelRound() {
    const d = division(), pool = currentPool(d), P = poolData(d, pool), st = roundState(P.matches, P.byes, d.total_rounds);
    if (!confirm(`ยกเลิกคู่รอบที่ ${st.lastRound}?`)) return;
    d.matches = d.matches.filter((m) => !(poolKey(m.pool_label) === pool && m.round_number === st.lastRound));
    d.byes = d.byes.filter((b) => !(poolKey(b.pool_label) === pool && b.round_number === st.lastRound));
    ui.round = null; save("ยกเลิกคู่แล้ว");
  },
  withdraw(id) { const r = division().regs.find((x) => x.athlete_id === id); if (confirm(`ตัดชื่อ ${nameOf(r)}? (ไม่มาแข่งแน่)`)) { r.status = "withdrawn"; save(); } },
  reinstate(id) { division().regs.find((x) => x.athlete_id === id).status = "confirmed"; save("คืนชื่อแล้ว · เข้าคู่ตั้งแต่รอบถัดไป"); },
  present(id, round) { division().regs.find((x) => x.athlete_id === id).present_for_round = Number(round); save(); },
  rounds(value) { const n = Number(value); if (n >= 1 && n <= 15) { division().total_rounds = n; save(); } },
  async backup() {
    const text = JSON.stringify({ ...S, kind: "gt-offline-backup" }, null, 1);
    const stamp = new Date().toLocaleString("sv-SE").replace(/[: ]/g, "-").slice(0, 16);
    const name = `สำรอง-${S.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 40)}-${stamp}.json`;
    try {
      if (window.showSaveFilePicker) {
        // Chrome / Edge: the organiser picks the folder (a USB stick is a good place) and the name stays .json
        const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "ไฟล์สำรอง", accept: { "application/json": [".json"] } }] });
        const w = await h.createWritable(); await w.write(text); await w.close();
      } else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
        a.download = name; document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e) { if (e?.name === "AbortError") return; alert("บันทึกไฟล์ไม่สำเร็จ ลองอีกครั้ง"); return; }
    S.backup_at = new Date().toISOString(); save("บันทึกไฟล์สำรองแล้ว · เน็ตกลับมาแล้วนำไฟล์นี้ขึ้นระบบที่หน้ารายการบนเว็บ");
  },
  restore() { document.getElementById("restore").click(); },
  print(kind) { ui.print = kind; render(); setTimeout(() => { window.print(); ui.print = null; render(); }, 50); },
};
async function restoreFile(file) {
  try {
    const x = JSON.parse(await file.text());
    if (x.tournament_id !== SEED.tournament_id || !Array.isArray(x.divisions)) return alert("ไฟล์นี้ไม่ใช่ไฟล์สำรองของงานนี้");
    if (!confirm(`เปิดไฟล์สำรอง (บันทึก ${when(x.saved_at)}) แทนข้อมูลในเครื่องตอนนี้?`)) return;
    S = x; ui = { ...ui, div: S.divisions[0]?.id ?? null, pool: null, round: null, proposal: null }; save("เปิดไฟล์สำรองแล้ว");
  } catch { alert("อ่านไฟล์ไม่ได้"); }
}

function propose(d, pool, P, round, seed) {
  const players = pairingPlayers(P.regs.map((r) => ({ athlete_id: r.athlete_id, rank: r.rank, institution: r.institution, full_name: r.name })), P.matches, P.byes, `${d.id}-${pool}-${round}-${seed}`);
  const pr = proposeSwissRound({ players, previousMatches: P.matches, previousByes: P.byes });
  if (!pr.requiresManualReview) return { tables: pr.tables.map((t) => ({ board: t.board, black: t.blackAthleteId, white: t.whiteAthleteId })), bye: pr.byeAthleteId, stuck: false };
  if (pr.reason !== "search_limit_reached") return { tables: [], bye: null, stuck: true };
  const order = [...players].sort((a, b) => b.score - a.score || b.strength - a.strength).map((p) => p.id);
  const bye = order.length % 2 ? order.pop() : null, tables = [];
  for (let i = 0; i < order.length; i += 2) tables.push({ board: i / 2 + 1, black: order[i + 1], white: order[i] });
  return { tables, bye, stuck: false, manual: true };
}
const currentPool = (d) => { const pools = [...new Set(d.regs.map((r) => poolKey(r.pool_label)))].sort(); return pools.includes(ui.pool) ? ui.pool : pools[0] ?? ""; };

// ---------- views ----------
function render() {
  if (ui.print) return renderPrint();
  const d = division();
  const dirty = !S.backup_at || S.backup_at < S.saved_at;
  app.innerHTML = `
  <header class="top">
    <div><b>โต๊ะจับคู่สำรอง</b> · ${esc(S.title)}<br><small>ข้อมูลจากเว็บ ณ ${when(S.snapshot_at)} · บันทึกในเครื่อง ${when(S.saved_at)}</small></div>
    <div class="btns">
      <button data-act="backup" class="${dirty ? "warn" : ""}">💾 บันทึกไฟล์สำรอง${dirty ? " *" : ""}</button>
      <button data-act="restore">📂 เปิดไฟล์สำรอง</button>
    </div>
  </header>
  <p class="note">ไม่ต้องใช้อินเทอร์เน็ต · ข้อมูลเก็บในเครื่องนี้อัตโนมัติ · กด 💾 หลังทุกรอบ แล้วเมื่อเน็ตกลับมา ไปที่หน้ารายการบนเว็บ → “⬆ นำข้อมูลจากโต๊ะสำรองขึ้นระบบ”</p>
  ${ui.toast ? `<p class="toast">${esc(ui.toast)}</p>` : ""}
  <nav class="divs">${S.divisions.map((x) => `<button data-act="div" data-a="${x.id}" class="${x.id === ui.div ? "on" : ""}">${esc(x.name)}</button>`).join("")}</nav>
  ${d ? renderDivision(d) : "<p>ไม่มีรุ่น</p>"}`;
}

function renderDivision(d) {
  const pools = [...new Set(d.regs.map((r) => poolKey(r.pool_label)))].sort();
  const pool = currentPool(d);
  const P = poolData(d, pool);
  if (!d.regs.length) return `<p class="card">รุ่นนี้ยังไม่มีรายชื่อนักกีฬา</p>`;
  const tabs = `<nav class="tabs">${pools.length > 1 ? pools.map((p) => `<button data-act="pool" data-a="${esc(p)}" class="${p === pool ? "on" : ""}">${p ? `สาย ${esc(p)}` : "ทั้งรุ่น"}</button>`).join("") : ""}
    <span class="sp"></span><button data-act="tab" data-a="rounds" class="${ui.tab === "rounds" ? "on" : ""}">จับคู่ / ลงผล</button><button data-act="tab" data-a="standings" class="${ui.tab === "standings" ? "on" : ""}">ตารางคะแนน</button></nav>`;
  return tabs + (ui.tab === "standings" ? renderStandings(d, P) : renderRounds(d, pool, P));
}

function renderRounds(d, pool, P) {
  const st = roundState(P.matches, P.byes, d.total_rounds);
  const { score } = scoresFrom(P.everyone.map((r) => r.athlete_id), P.matches, P.byes);
  const waiting = st.lastRound ? waitingList(P.everyone.map((r) => ({ ...r, registration_status: r.status })), P.matches, st.lastRound).filter((w) => w.kind === "absent") : [];
  const withdrawn = P.everyone.filter((r) => r.status === "withdrawn");
  let html = `<section class="card row">ผู้เล่น <b>${P.regs.length}</b> คน${withdrawn.length ? ` (ตัดชื่อ ${withdrawn.length})` : ""} · ออกคู่แล้ว <b>${st.lastRound}</b> /
    <select data-change="rounds">${Array.from({ length: 15 }, (_, i) => `<option ${i + 1 === d.total_rounds ? "selected" : ""}>${i + 1}</option>`).join("")}</select> รอบ
    ${st.pending ? ` · <span class="warn-t">รอผล ${st.pending} โต๊ะ</span>` : ""}${st.complete ? ` · <b class="ok-t">แข่งครบแล้ว</b>` : ""}</section>`;

  if (waiting.length) html += `<section class="card warnbox"><b>รายชื่อพักรอ (ไม่มาแข่งรอบ ${st.lastRound})</b> — ตัดสินก่อนจับคู่รอบถัดไป
    ${waiting.map((w) => `<div class="row">${esc(nameOf(P.byId.get(w.athlete_id)))} <span class="sp"></span>
      <button data-act="present" data-a="${w.athlete_id}" data-b="${st.lastRound + 1}">มาแข่งรอบ ${st.lastRound + 1}</button>
      <button data-act="withdraw" data-a="${w.athlete_id}" class="bad">ตัดชื่อ</button></div>`).join("")}</section>`;

  if (ui.proposal) html += renderProposal(P, score);
  else if (st.nextRound && !waiting.length) html += `<button data-act="pair" class="big">จับคู่รอบที่ ${st.nextRound}</button>`;

  if (st.lastRound) {
    const shown = ui.round && ui.round <= st.lastRound ? ui.round : st.lastRound;
    const latest = shown === st.lastRound;
    const ms = P.matches.filter((m) => m.round_number === shown).sort((a, b) => (a.board_number ?? 0) - (b.board_number ?? 0));
    const bye = P.byes.find((b) => b.round_number === shown);
    const before = scoresFrom(P.everyone.map((r) => r.athlete_id), P.matches.filter((m) => m.round_number < shown), P.byes.filter((b) => b.round_number < shown)).score;
    const sel = (m) => {
      const idx = m.state === "verified" ? RESULT_OPTIONS.findIndex((o) => o.code === m.result_code && (o.margin ?? null) === (m.result_margin === "R" ? "R" : null)) : -1;
      if (!latest) return `<span>${esc(resultLabel(m))}</span>`;
      return `<select data-change="result" data-a="${m.id}" class="${m.state === "verified" ? "" : "pending"}"><option value="">— รอผล —</option>${RESULT_OPTIONS.map((o, i) => `<option value="${i}" ${i === idx ? "selected" : ""}>${o.label}</option>`).join("")}</select>`;
    };
    html += `<section class="card"><div class="row"><b>รอบที่ ${shown}</b><span class="sp"></span>
      ${Array.from({ length: st.lastRound }, (_, i) => `<button data-act="round" data-a="${i + 1}" class="num ${i + 1 === shown ? "on" : ""}">${i + 1}</button>`).join("")}
      <button data-act="print" data-a="pairs">🖨 พิมพ์ใบจับคู่</button></div>
      ${!latest ? `<p class="muted">รอบเก่า: ดูอย่างเดียว</p>` : ""}
      <table><thead><tr><th>โต๊ะ</th><th>⚫ ดำ</th><th>⚪ ขาว</th><th>ผล</th></tr></thead><tbody>
      ${ms.map((m) => `<tr><td class="c">${m.board_number ?? ""}</td><td>${person(P.byId.get(m.black_athlete_id), before)}</td><td>${person(P.byId.get(m.white_athlete_id), before)}</td><td>${sel(m)}</td></tr>`).join("")}
      ${bye ? `<tr><td class="c">บาย</td><td colspan="2">${person(P.byId.get(bye.athlete_id), before)}</td><td class="ok-t">ได้ 1 แต้ม</td></tr>` : ""}
      </tbody></table>
      ${latest && !ms.some((m) => m.state === "verified") ? `<button data-act="cancelRound" class="bad">ยกเลิกคู่รอบนี้</button>` : ""}</section>`;
  }
  const active = P.regs.filter((r) => !waiting.some((w) => w.athlete_id === r.athlete_id));
  html += `<details class="card"><summary>รายชื่อ (${P.everyone.length})</summary>
    ${active.map((r) => `<div class="row">${esc(r.name)} <small class="muted">${esc(r.institution)} · ${pts(score.get(r.athlete_id) ?? 0)} แต้ม</small><span class="sp"></span><button data-act="withdraw" data-a="${r.athlete_id}" class="bad sm">ตัดชื่อ</button></div>`).join("")}
    ${withdrawn.map((r) => `<div class="row muted">✕ ${esc(r.name)} (ตัดชื่อแล้ว)<span class="sp"></span><button data-act="reinstate" data-a="${r.athlete_id}" class="sm">คืนชื่อ</button></div>`).join("")}
  </details>`;
  return html;
}
const person = (r, score) => `<b>${esc(nameOf(r))}</b><br><small class="muted">${esc(r?.institution ?? "")}${score ? ` · ${pts(score.get(r?.athlete_id) ?? 0)} แต้ม` : ""}</small>`;

function renderProposal(P, score) {
  const pr = ui.proposal;
  if (pr.stuck) return `<section class="card warnbox"><b>จับคู่รอบที่ ${pr.round} ไม่ได้</b> — ผู้เล่นเจอกันครบทุกคู่แล้ว ถือว่าแข่งจบที่รอบ ${pr.round - 1} <button data-act="closeProposal">ปิด</button></section>`;
  const played = new Set(P.matches.map((m) => pairKey(m.black_athlete_id, m.white_athlete_id)));
  const slot = (k, id) => `<button data-act="slot" data-a="${k}" class="slot ${ui.pick === k ? "picked" : ""}">${person(P.byId.get(id), score)}</button>`;
  return `<section class="card gold"><div class="row"><b>ร่างคู่รอบที่ ${pr.round}</b><span class="sp"></span><button data-act="reshuffle">🔀 สุ่มใหม่</button><button data-act="closeProposal">ปิด</button></div>
    <p class="muted">แตะชื่อ 2 คนเพื่อสลับกัน · ⇄ สลับสีในโต๊ะ${pr.manual ? " · ระบบหาคู่ที่ดีที่สุดไม่ทัน กรุณาตรวจเอง" : ""}</p>
    <table><thead><tr><th>โต๊ะ</th><th>⚫ ดำ</th><th>⚪ ขาว</th><th></th></tr></thead><tbody>
    ${pr.tables.map((t) => `<tr class="${played.has(pairKey(t.black, t.white)) ? "rematch" : ""}"><td class="c">${t.board}</td><td>${slot(`${t.board}:black`, t.black)}</td><td>${slot(`${t.board}:white`, t.white)}</td>
      <td><button data-act="colours" data-a="${t.board}" title="สลับสี">⇄</button>${played.has(pairKey(t.black, t.white)) ? ` <b class="bad-t">เคยเจอกัน</b>` : ""}</td></tr>`).join("")}
    ${pr.bye ? `<tr><td class="c">บาย</td><td colspan="3">${slot("bye", pr.bye)}</td></tr>` : ""}
    </tbody></table>
    <button data-act="publish" class="big">ยืนยันออกคู่รอบที่ ${pr.round}</button></section>`;
}

function renderStandings(d, P) {
  const rows = poolStandings(P.everyone, P.matches, P.byes, S.bye_sos_mode);
  return `<section class="card"><div class="row"><b>ตารางคะแนน</b><span class="sp"></span><button data-act="print" data-a="standings">🖨 พิมพ์</button></div>${standingsTable(rows, P)}
    <p class="muted">คะแนน = ชนะ + บาย (+½ เสมอ) · เรียงตามคะแนน, SOS, SOSOS — กติกาเดียวกับเว็บ</p></section>`;
}
const standingsTable = (rows, P) => `<table><thead><tr><th>อันดับ</th><th>ชื่อ</th><th>ชนะ</th><th>แพ้</th><th>บาย</th><th>คะแนน</th><th>SOS</th><th>SOSOS</th></tr></thead><tbody>
  ${rows.map((x) => `<tr class="${x.withdrawn ? "muted" : ""}"><td class="c">${x.pos ?? "–"}</td><td>${person(P.byId.get(x.athlete_id))}${x.withdrawn ? " (ตัดชื่อ)" : ""}</td><td class="c">${x.wins}</td><td class="c">${x.losses}</td><td class="c">${x.byes}</td><td class="c"><b>${pts(x.score)}</b></td><td class="c">${pts(x.sos)}</td><td class="c">${pts(x.sosos)}</td></tr>`).join("")}</tbody></table>`;

function renderPrint() {
  const d = division(), pool = currentPool(d), P = poolData(d, pool), st = roundState(P.matches, P.byes, d.total_rounds);
  const head = `<h1>${esc(S.title)}</h1><h2>${esc(d.name)}${pool ? ` · สาย ${esc(pool)}` : ""}</h2>`;
  if (ui.print === "standings") { app.innerHTML = `<div class="print">${head}<h3>ตารางคะแนน หลังรอบที่ ${st.lastRound}</h3>${standingsTable(poolStandings(P.everyone, P.matches, P.byes, S.bye_sos_mode), P)}</div>`; return; }
  const shown = ui.round && ui.round <= st.lastRound ? ui.round : st.lastRound;
  const ms = P.matches.filter((m) => m.round_number === shown).sort((a, b) => (a.board_number ?? 0) - (b.board_number ?? 0));
  const bye = P.byes.find((b) => b.round_number === shown);
  const before = scoresFrom(P.everyone.map((r) => r.athlete_id), P.matches.filter((m) => m.round_number < shown), P.byes.filter((b) => b.round_number < shown)).score;
  app.innerHTML = `<div class="print">${head}<h3>ใบจับคู่ รอบที่ ${shown}</h3><table><thead><tr><th>โต๊ะ</th><th>⚫ ดำ</th><th>⚪ ขาว</th><th>ผล (กรรมการเขียน)</th></tr></thead><tbody>
    ${ms.map((m) => `<tr><td class="c">${m.board_number ?? ""}</td><td>${person(P.byId.get(m.black_athlete_id), before)}</td><td>${person(P.byId.get(m.white_athlete_id), before)}</td><td>${m.state === "verified" ? esc(resultLabel(m)) : "ดำชนะ ☐ &nbsp; ขาวชนะ ☐"}</td></tr>`).join("")}
    ${bye ? `<tr><td class="c">บาย</td><td colspan="3">${person(P.byId.get(bye.athlete_id), before)}</td></tr>` : ""}</tbody></table></div>`;
}

// ---------- events ----------
app.addEventListener("click", (e) => {
  const b = /** @type {HTMLElement} */ (e.target).closest("[data-act]");
  if (!b || b.tagName === "SELECT") return;
  const fn = actions[b.dataset.act]; if (fn) fn(b.dataset.a, b.dataset.b);
});
app.addEventListener("change", (e) => {
  const el = /** @type {HTMLSelectElement} */ (e.target);
  if (el.dataset.change === "result") actions.result(el.dataset.a, el.value);
  if (el.dataset.change === "rounds") actions.rounds(el.value);
});
document.getElementById("restore").addEventListener("change", (e) => { const f = e.target.files?.[0]; if (f) restoreFile(f); e.target.value = ""; });
window.addEventListener("beforeunload", (e) => { if (!S.backup_at || S.backup_at < S.saved_at) e.preventDefault(); });
render();
