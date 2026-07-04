import { PLAYERS, AVATARS, COLORS, PLAYER_PHOTOS, PLAYER_PHRASES, PLAYER_FAV_TEAM, FLAGS, FCODES, GROUPS, MATCHES, MOIS_FR, KO_SCHEDULE, KO_MATCH_IDS, avatarHTML, fl, cleanCountryName } from './data/config.js';
import { init as fbInit, getRef, isReady as fbReady, saveRS as fbSaveRS, saveME as fbSaveME, saveAE as fbSaveAE, saveLive as fbSaveLive, loadRS, loadME, loadAE } from './data/firebase.js';
import { fetchESPN, tryFetch as apiTryFetch, startAutoRefresh, stopAutoRefresh, getAutoActive, fetchMatchStats, fetchESPNForMatch } from './data/api.js';
import { getLenis } from './animations/scroll.js';
import { burstConfetti } from './animations/micro.js';

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let isAdmin = false;
let curGrp = 'A';
let curMM = null;
let curMatchPhFilter = 'all';
let _autoTimer = null;
let _autoActive = false;
let _mmRefreshTimer = null;
let _loginPendingName = '';
let _pnPseudo = null;
let _pnData = {};
let _pnAllData = {};
let _pnFilter = 'all';
let _pnFbRef = null;
let _clPhase = 'all';
let _groupCertaintyCache = {};
let _espnMap = {};
let _bracketMatchCache = {};

let RS = loadRS();
RS[75] = [1,1,null,null,'t2'];
RS[76] = [1,1,null,null,'t2'];
RS[81] = RS[81]||[null,null,null,null,'t1'];

let ME = loadME();
let AE = loadAE();
let LIVE = {};
let MS = {};

// ═══════════════════════════════════════════════════
// FIREBASE — real-time sync
// ═══════════════════════════════════════════════════
async function startFirebaseSync() {
  try {
    await fbInit();
    const snapRS = await getRef('rs').get();
    if (snapRS.exists() && snapRS.val()) {
      const fbData = snapRS.val();
      const m81Local = RS[81];
      const converted = {};
      Object.entries(fbData).forEach(([k,v]) => { if (+k !== 81 && +k !== 75 && +k !== 76) converted[+k] = v; });
      if (m81Local !== undefined) converted[81] = m81Local;
      if (converted[81]) converted[81][4] = 't1'; else converted[81] = [null,null,null,null,'t1'];
      converted[75] = [1,1,null,null,'t2'];
      converted[76] = [1,1,null,null,'t2'];
      RS = converted;
      try { localStorage.setItem('cdm26_rs', JSON.stringify(RS)); } catch(e) {}
    }
    Object.assign(RS, { 75: [1,1,null,null,'t2'], 76: [1,1,null,null,'t2'] });

    const snapME = await getRef('me').get();
    if (snapME.exists() && snapME.val()) { ME = snapME.val(); try { localStorage.setItem('cdm26_me', JSON.stringify(ME)); } catch(e) {} }
    const snapAE = await getRef('ae').get();
    if (snapAE.exists() && snapAE.val()) { AE = snapAE.val(); try { localStorage.setItem('cdm26_ae', JSON.stringify(AE)); } catch(e) {} }
    const snapLive = await getRef('live').get();
    if (snapLive.exists() && snapLive.val()) { LIVE = snapLive.val(); }

    renderAll();

    // Real-time listeners
    getRef('rs').on('value', snap => {
      if (!snap.exists()) return;
      const d = snap.val(); if (!d) return;
      const m81Local = RS[81];
      const converted = {};
      Object.entries(d).forEach(([k,v]) => { if (+k !== 81 && +k !== 75 && +k !== 76) converted[+k] = v; });
      if (m81Local !== undefined) converted[81] = m81Local;
      if (converted[81]) converted[81][4] = 't1'; else converted[81] = [null,null,null,null,'t1'];
      converted[75] = [1,1,null,null,'t2'];
      converted[76] = [1,1,null,null,'t2'];
      RS = converted;
      try { localStorage.setItem('cdm26_rs', JSON.stringify(RS)); } catch(e) {}
      renderAll();
      renderRecapWidget();
      if (curMM !== null) renderMM(curMM);
      const chip = document.getElementById('lchip');
      if (chip) { chip.classList.add('on'); chip.style.display = 'inline-flex'; chip.innerHTML = '<span class="ldot"></span>Live'; }
    });
    getRef('me').on('value', snap => {
      if (!snap.exists()) return;
      const d = snap.val(); if (!d) return;
      ME = d;
      try { localStorage.setItem('cdm26_me', JSON.stringify(ME)); } catch(e) {}
      if (curMM !== null) renderMM(curMM);
    });
    getRef('live').on('value', snap => {
      LIVE = snap.exists() ? snap.val() : {};
      const curTab = document.querySelector('.ntab.on')?.id.replace('nt-','');
      if (curTab === 'ma') renderMatchs();
      if (curTab === 'gr') renderGroupTable(curGrp);
      if (curMM !== null) renderMM(curMM);
    });
    getRef('ae').on('value', snap => {
      if (!snap.exists()) return;
      AE = snap.val();
      try { localStorage.setItem('cdm26_ae', JSON.stringify(AE)); } catch(e) {}
      if (curMM !== null) renderMM(curMM);
    });

    toast('🔥 Connecté — données en temps réel', 'inf');
    startAutoRefresh();
  } catch(err) {
    console.warn('Firebase indisponible, mode local:', err);
    toast('⚠️ Mode hors-ligne — données locales', 'inf');
    renderAll();
    startAutoRefresh();
  }
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.cssText = `display:block;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--c3);color:var(--t1);padding:10px 20px;border-radius:10px;font-size:.8rem;z-index:9999;border:1px solid var(--g2);box-shadow:var(--sh);animation:fadeUp .3s ease both;`;
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .5s ease'; setTimeout(() => el.style.display='none', 500); }, 3000);
}

// ═══════════════════════════════════════════════════
// SAVE — localStorage + Firebase
// ═══════════════════════════════════════════════════
function saveRS() {
  try { localStorage.setItem('cdm26_rs', JSON.stringify(RS)); } catch(e) {}
  fbSaveRS(RS);
}
function saveME() {
  try { localStorage.setItem('cdm26_me', JSON.stringify(ME)); } catch(e) {}
  fbSaveME(ME);
}
function saveAE() {
  try { localStorage.setItem('cdm26_ae', JSON.stringify(AE)); } catch(e) {}
  fbSaveAE(AE);
}
function saveLive() { fbSaveLive(LIVE); }

// ═══════════════════════════════════════════════════
// RANKING & MATH
// ═══════════════════════════════════════════════════
function buildKoPseudoMatches() {
  window._koPseudoCache = KO_MATCH_IDS.map(id => {
    const s = KO_SCHEDULE[id];
    return [id, s.date, s.time, 'TBD', 'TBD', [[null,null],[null,null],[null,null],[null,null],[null,null],[null,null],[null,null],[null,null]]];
  });
  return window._koPseudoCache;
}

function buildRanking(phase='all', excludeLastMatch=false) {
  const all = [];
  for (let pi=0; pi<PLAYERS.length; pi++) {
    let pts = 0, mj = 0, gEx = 0, gVic = 0, gDif = 0;
    const exp = [];
    const allMatches = [...MATCHES, ...(window._koPseudoCache||buildKoPseudoMatches())];
    allMatches.forEach(m => {
      const mid = m[0];
      if (excludeLastMatch && mid === 81 && phase === 'groups') return;
      if (phase === 'groups' && mid > 72) return;
      if (phase === 'ko' && mid <= 72) return;
      if (!RS[mid]) return;
      const r = RS[mid];
      if (r[0] === null || r[1] === null) return;
      const p = m[5] ? m[5][pi] : null;
      if (!p || p[0] === null || p[1] === null) return;
      mj++;
      const exact = p[0]===r[0] && p[1]===r[1];
      const winner = (p[0]>p[1] && r[0]>r[1]) || (p[0]<p[1] && r[0]<r[1]) || (p[0]===p[1] && r[0]===r[1]);
      if (exact) { pts += 3; gEx++; }
      else if (winner) { pts += 1; gVic++; }
      if (r[2] !== null && r[3] !== null && p[2] !== null && p[3] !== null) {
        const diff = Math.abs((r[0]-r[1])-(p[0]-p[1]));
        const diffET = Math.abs((r[2]-r[3])-(p[2]-p[3]));
        gDif += diff + diffET;
      }
    });
    all.push({ pi, name: PLAYERS[pi], mj, pts, gEx, gVic, gDif });
  }
  all.sort((a,b) => b.pts - a.pts || b.gEx - a.gEx || b.gVic - a.gVic || a.gDif - b.gDif);
  return all;
}

function computeGroup(gname) {
  const grpData = GROUPS[gname];
  if (!grpData) return [];
  const teams = grpData.teams.map(t => ({ name: t, pts: 0, mj: 0, v: 0, n: 0, d: 0, gf: 0, ga: 0, gd: 0 }));
  grpData.matches.forEach(mid => {
    const m = MATCHES.find(x => x[0] === mid);
    if (!m || !RS[mid] || RS[mid][0] === null || RS[mid][1] === null) return;
    const r = RS[mid];
    const t1 = teams.find(t => t.name === m[3]);
    const t2 = teams.find(t => t.name === m[4]);
    if (!t1 || !t2) return;
    t1.mj++; t2.mj++;
    t1.gf += r[0]; t1.ga += r[1]; t2.gf += r[1]; t2.ga += r[0];
    t1.gd = t1.gf - t1.ga; t2.gd = t2.gf - t2.ga;
    if (r[0] > r[1]) { t1.pts += 3; t1.v++; t2.d++; }
    else if (r[1] > r[0]) { t2.pts += 3; t2.v++; t1.d++; }
    else { t1.pts += 1; t2.pts += 1; t1.n++; t2.n++; }
  });
  teams.sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return teams;
}

function computeTournStats() {
  const stats = { total: 72, played: 0, homeWins: 0, draws: 0, awayWins: 0, goals: 0, et: 0, tab: 0 };
  for (let mid = 1; mid <= 104; mid++) {
    const m = MATCHES.find(x => x[0] === mid) || KO_SCHEDULE[mid];
    if (!m) continue;
    const r = RS[mid];
    if (!r || r[0] === null || r[1] === null) continue;
    stats.played++;
    stats.goals += r[0] + r[1];
    if (r[2] !== null || r[3] !== null) stats.et++;
    if (r[4] === 't1' || r[4] === 't2') stats.tab++;
    if (r[0] > r[1]) stats.homeWins++;
    else if (r[1] > r[0]) stats.awayWins++;
    else stats.draws++;
  }
  return stats;
}

function computeGroupCertainty(gname, standings) {
  const grpData = GROUPS[gname];
  if (!grpData) return { certain: false, msg: '' };
  const teams = grpData.teams.map(t => ({ name: t, pts: 0, gf: 0, ga: 0 }));
  grpData.matches.forEach(mid => {
    const m = MATCHES.find(x => x[0] === mid);
    if (m && RS[mid]) {
      const r = RS[mid];
      if (r[0] !== null && r[1] !== null) {
        const t1 = teams.find(t => t.name === m[3]);
        const t2 = teams.find(t => t.name === m[4]);
        if (t1 && t2) {
          t1.pts += r[0] > r[1] ? 3 : r[0] === r[1] ? 1 : 0; t1.gf += r[0]; t1.ga += r[1];
          t2.pts += r[1] > r[0] ? 3 : r[0] === r[1] ? 1 : 0; t2.gf += r[1]; t2.ga += r[0];
        }
      }
    }
  });
  const sorted = teams.sort((a,b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  return { certain: sorted.length >= 2 && sorted[1].pts > sorted[2].pts, msg: '' };
}

// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
function showTab(id) {
  document.querySelectorAll('.ntab').forEach(t => t.classList.toggle('on', t.id === 'nt-'+id));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'pg-'+id));
  moveNavIndicator();
  const scrollWrap = document.querySelector('.wrap');
  if (scrollWrap) scrollWrap.scrollTop = 0;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(0, { immediate: true });
  if (id === 'cl') renderClassement(_clPhase);
  else if (id === 'ma') renderMatchs();
  else if (id === 'tb') renderTableau();
  else if (id === 'gr') renderGroups();
  else if (id === 'bk') renderBracket();
  else if (id === 'pn') renderPronostics();
  else if (id === 'lg') renderLogs();
}

function moveNavIndicator() {
  const active = document.querySelector('.ntab.on');
  const indicator = document.getElementById('nav-indicator');
  if (active && indicator) {
    const navRect = active.closest('.nav-inner')?.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    if (navRect) {
      indicator.style.width = tabRect.width + 'px';
      indicator.style.left = (tabRect.left - navRect.left) + 'px';
    }
  }
}

// ═══════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════
function buildLoginPlayers() {
  const el = document.getElementById('login-players');
  if (!el) return;
  el.innerHTML = PLAYERS.map((name,i) => `
    <button class="login-player-btn" onclick="loginAs('${name}',${i})">
      <span class="lp-avatar">${AVATARS[i]}</span>
      <span class="lp-name">${name}</span>
    </button>`).join('') + `
    <button class="login-player-btn lp-admin" onclick="loginAsAdmin()" style="grid-column:1/-1">
      <span class="lp-avatar">🔑</span>
      <span class="lp-name">Admin</span>
    </button>`;
}

function closeLogin() { document.getElementById('ml').style.display = 'none'; }

function loginAs(name, idx) {
  _pnPseudo = name;
  isAdmin = false;
  localStorage.setItem('pn_pseudo', name);
  closeLogin();
  const chip = document.getElementById('mchip');
  if (chip) {
    chip.innerHTML = `${AVATARS[idx]||'👤'} ${name}`;
    chip.classList.add('logged');
    chip.dataset.pi = idx;
    chip.style.display = 'inline-flex';
    chip.onclick = () => {};
  }
  document.querySelectorAll('.adm-only').forEach(el => el.style.display = 'none');
  startFirebaseSync();
  renderPronostics();
  toast(`Bienvenue ${AVATARS[idx]} ${name} !`, 'ok');
  showPnInfoIfFirstTime();
}

function loginAsAdmin() {
  _loginPendingName = 'Admin';
  document.getElementById('login-step1').style.display = 'none';
  document.getElementById('login-step2').style.display = 'block';
  document.getElementById('login-admin-name').textContent = 'Connexion administrateur';
  document.getElementById('pwd').value = '';
  document.getElementById('perr2').style.display = 'none';
  setTimeout(() => document.getElementById('pwd')?.focus(), 100);
}

function tryAdmin() {
  const pwd = document.getElementById('pwd').value;
  if (pwd === ADMIN_PWD) {
    isAdmin = true;
    _pnPseudo = 'Admin';
    localStorage.setItem('pn_pseudo', 'Admin');
    closeLogin();
    const mchip = document.getElementById('mchip');
    if (mchip) { mchip.innerHTML = '🔑 Admin'; mchip.classList.add('logged'); mchip.onclick = () => {}; }
    document.querySelectorAll('.adm-only').forEach(el => el.style.display = '');
    startFirebaseSync();
    renderPronostics();
    toast('Bienvenue admin 🔑', 'ok');
  } else {
    document.getElementById('perr2').style.display = 'block';
    document.getElementById('pwd').value = '';
    document.getElementById('pwd')?.focus();
  }
}

function loginBack() {
  document.getElementById('login-step1').style.display = 'block';
  document.getElementById('login-step2').style.display = 'none';
}

function enterGuest() {
  document.getElementById('ml').style.display = 'flex';
  buildLoginPlayers();
}

function switchMode() {
  document.getElementById('login-step1').style.display = 'block';
  document.getElementById('login-step2').style.display = 'none';
  document.getElementById('ml').style.display = 'flex';
  buildLoginPlayers();
}

function confirmPseudo() { enterGuest(); }

function showPnInfoIfFirstTime() {
  try { if (localStorage.getItem('pn_info_8e_seen') === '1') return; localStorage.setItem('pn_info_8e_seen', '1'); } catch(e) {}
  setTimeout(() => {
    const el = document.getElementById('pn-info-modal');
    if (el) el.style.display = 'flex';
  }, 400);
}
function closePnInfo() { document.getElementById('pn-info-modal').style.display = 'none'; }

// ═══════════════════════════════════════════════════
// SECTION: CLASSEMENT
// ═══════════════════════════════════════════════════
function renderClassement(phase) {
  _clPhase = phase || 'all';
  document.getElementById('pg-cl')?.classList.add('rendered');
  const el = document.getElementById('cl-content');
  if (!el) return;
  document.querySelectorAll('#cl-filters .pill').forEach(p => p.classList.toggle('on', p.textContent.includes(phase==='all'?'Tous':phase==='groups'?'Groupes':'finale')));
  const rank = buildRanking(phase);
  const stats = computeTournStats();
  el.innerHTML = `
    <div class="fs-hero" style="text-align:center;padding:1.5rem 1rem 1rem">
      <div class="fs-hero-title" style="font-size:2.2rem">🏆 Classement ${phase==='ko'?'Phase Finale':phase==='groups'?'Phase de Groupes':'Général'}</div>
      <div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-top:.6rem;font-size:.75rem;color:var(--t3)">
        <span>🟢 Score exact <strong style="color:var(--grn)">3pts</strong></span>
        <span>🟡 Bon vainqueur <strong style="color:var(--gold)">1pt</strong></span>
        <span>⚪ Raté <strong style="color:var(--t4)">0pt</strong></span>
      </div>
    </div>
    <div class="prog-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.6rem;margin-bottom:1.2rem">
      <div class="mini-stat"><div class="mini-stat-v">${stats.played}/${stats.total}</div><div class="mini-stat-l">Matchs joués</div></div>
      <div class="mini-stat"><div class="mini-stat-v">${stats.goals}</div><div class="mini-stat-l">Buts</div></div>
      <div class="mini-stat"><div class="mini-stat-v">${stats.homeWins}</div><div class="mini-stat-l">Vict. domicile</div></div>
      <div class="mini-stat"><div class="mini-stat-v">${stats.draws}</div><div class="mini-stat-l">Nuls</div></div>
      <div class="mini-stat"><div class="mini-stat-v">${stats.awayWins}</div><div class="mini-stat-l">Vict. extérieur</div></div>
    </div>
    <div class="podium">${renderPodium(rank)}</div>
    <div class="lb" style="margin-top:1.2rem">${renderLeaderboard(rank)}</div>`;
  document.querySelectorAll('#cl-filters .pill').forEach(p => {
    p.onclick = () => { document.querySelectorAll('#cl-filters .pill').forEach(x => x.classList.remove('on')); p.classList.add('on'); renderClassement(p.dataset.phase); };
  });
  setTimeout(() => { animatePodium(); animateLeaderboard(); }, 100);
}

function renderPodium(rank) {
  if (rank.length < 3) return '';
  return [1,0,2].map(i => {
    const p = rank[i];
    if (!p) return '';
    const medals = ['🥇','🥈','🥉'];
    const heights = ['4.5rem','3.5rem','3rem'];
    const orders = [2,1,3];
    const col = COLORS[p.pi] || '#888';
    return `<div class="pod" style="order:${orders[i]}">
      <div class="pod-av" style="background:${col}18;border-color:${col}55">${avatarHTML(p.pi)}</div>
      <div class="pod-name">${p.name}</div>
      <div class="pod-pts" style="color:${col}">${p.pts}</div>
      <div class="pod-stats">${p.mj}m • ${p.gEx}E • ${p.gVic}V</div>
      <div class="pod-medal">${medals[i]||''}</div>
    </div>`;
  }).join('');
}

function renderLeaderboard(rank) {
  return rank.map((p,i) => {
    const col = COLORS[p.pi] || '#888';
    return `<div class="lb-row" style="border-left:3px solid ${col}">
      <div class="lb-pos">${i+1}</div>
      <div class="lb-av" style="background:${col}14;border-color:${col}45">${avatarHTML(p.pi)}</div>
      <div class="lb-name">${p.name}</div>
      <div class="lb-stat">${p.mj}m</div>
      <div class="lb-stat lb-stat-mob">${p.gEx}E</div>
      <div class="lb-stat lb-stat-mob">${p.gVic}V</div>
      <div class="lb-pts" style="color:${col}">${p.pts}</div>
    </div>`;
  }).join('');
}

function renderRecapWidget() {
  const el = document.getElementById('recap-widget');
  if (!el) return;
  const rank = buildRanking('all');
  el.innerHTML = rank.slice(0,3).map((p,i) => `<span>${['🥇','🥈','🥉'][i]} ${p.name} <strong>${p.pts}pts</strong></span>`).join(' | ');
}

// ═══════════════════════════════════════════════════
// SECTION: MATCHS
// ═══════════════════════════════════════════════════
function renderMatchs() {
  document.getElementById('pg-ma')?.classList.add('rendered');
  document.getElementById('sav-all').style.display = isAdmin ? 'inline-flex' : 'none';
  const tb = document.getElementById('mt-tbody');
  if (!tb) return;
  const grpRows = [];
  const koRows = [];

  for (let mid = 1; mid <= 72; mid++) {
    const m = MATCHES.find(x => x[0] === mid);
    if (!m) continue;
    if (curMatchPhFilter === 'ko') continue;
    const r = RS[mid] || [];
    const isLive = LIVE[mid];
    const played = r[0] !== null && r[1] !== null;
    const liveDot = isLive ? '<span class="ldot" style="display:inline-block;vertical-align:middle;margin-right:4px"></span>' : '';
    const sched = { date: m[1], time: m[2] };
    const sc = played ? `<div class="score-box done"><span class="sv">${r[0]}</span><span class="sdash">–</span><span class="sv">${r[1]}</span></div>` : '<div class="score-box"><span class="snone">?–?</span></div>';
    grpRows.push(`<tr data-id="${mid}" class="${played?'played':''}${isLive?' live-row':''}" onclick="openMM(${mid})">
      <td>${liveDot}M${mid}</td>
      <td style="color:var(--t4);font-size:.7rem;white-space:nowrap">${sched.date}</td>
      <td><span class="tf">${fl(m[3])}</span><span class="tn">${m[3]}</span></td>
      <td colspan="3" style="text-align:center;padding:.3rem .4rem">${sc}</td>
      <td><span class="tf">${fl(m[4])}</span><span class="tn">${m[4]}</span></td>
    </tr>`);
  }

  for (let mid of KO_MATCH_IDS) {
    if (curMatchPhFilter === 'gr') continue;
    const sched = KO_SCHEDULE[mid];
    if (!sched) continue;
    const bm = _bracketMatchCache[mid] || {};
    const t1 = bm.t1 || 'TBD'; const t2 = bm.t2 || 'TBD';
    const r = RS[mid] || [];
    const isLive = LIVE[mid];
    const played = r[0] !== null && r[1] !== null;
    const liveDot = isLive ? '<span class="ldot" style="display:inline-block;vertical-align:middle;margin-right:4px"></span>' : '';
    const sc = played ? `<div class="score-box done"><span class="sv">${r[0]}</span><span class="sdash">–</span><span class="sv">${r[1]}</span></div>` : '<div class="score-box"><span class="snone">?–?</span></div>';
    koRows.push(`<tr data-id="${mid}" class="${played?'played':''}${isLive?' live-row':''}" onclick="openMM(${mid})">
      <td>${liveDot}M${mid}</td>
      <td style="color:var(--t4);font-size:.7rem;white-space:nowrap">${sched.date}</td>
      <td style="color:var(--t4);font-size:.7rem">${sched.time}</td>
      <td><span class="tf">${fl(t1)}</span><span class="tn">${t1}</span></td>
      <td colspan="3" style="text-align:center;padding:.3rem .4rem">${sc}</td>
      <td><span class="tf">${fl(t2)}</span><span class="tn">${t2}</span></td>
    </tr>`);
  }

  tb.innerHTML = grpRows.join('') + (koRows.length ? `<tr><td colspan="7" style="text-align:center;padding:.8rem;color:var(--gold);font-weight:700;background:var(--gold3)">🏆 Phase Finale</td></tr>${koRows.join('')}` : '');
  setTimeout(() => animateTableRows(tb), 80);
}

function filterP(ph, btn) {
  curMatchPhFilter = ph;
  document.querySelectorAll('#ma-filters .pill').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  renderMatchs();
}

function openMM(id) {
  curMM = id;
  const el = document.getElementById('mm');
  if (el) el.style.display = 'flex';
  renderMM(id);
  if (_mmRefreshTimer) clearInterval(_mmRefreshTimer);
  _mmRefreshTimer = setInterval(() => { if (curMM) renderMM(curMM); }, 10000);
}

function closeMM() {
  curMM = null;
  document.getElementById('mm').style.display = 'none';
  if (_mmRefreshTimer) { clearInterval(_mmRefreshTimer); _mmRefreshTimer = null; }
}

function renderMM(id) {
  const el = document.getElementById('mdetail');
  if (!el) return;
  const m = MATCHES.find(x => x[0] === id) || _bracketMatchCache[id] || KO_SCHEDULE[id];
  if (!m) { el.innerHTML = '<p>Match introuvable</p>'; return; }
  const isKo = id > 72;
  const t1 = isKo ? (_bracketMatchCache[id]?.t1 || 'TBD') : m[3];
  const t2 = isKo ? (_bracketMatchCache[id]?.t2 || 'TBD') : m[4];
  const r = RS[id] || [];
  const sched = isKo ? KO_SCHEDULE[id] : { date: m[1], time: m[2] };
  const isLive = LIVE[id];
  const played = r[0] !== null;
  el.innerHTML = `
    <div class="md-head">
      <div class="md-team"><div class="md-flag">${fl(t1)}</div><div class="md-tname">${t1}</div></div>
      <div class="md-score"><span class="md-score-val ${r[0]!==null?'':'empty'}">${r[0]!==null?r[0]:'-'}</span><span class="md-score-sep">:</span><span class="md-score-val ${r[1]!==null?'':'empty'}">${r[1]!==null?r[1]:'-'}</span></div>
      <div class="md-team"><div class="md-flag">${fl(t2)}</div><div class="md-tname">${t2}</div></div>
    </div>
    <div class="md-info">M${id} &middot; ${sched.date} ${sched.time}${isLive?' <span style="color:var(--grn)">● EN DIRECT</span>':''}</div>
    <div class="md-stats">${renderPlayerMatchStats(id)}</div>`;
}

function calcPlayerStats(pi) {
  const stats = { pts:0, mj:0, gEx:0, gVic:0, streak:[] };
  const allMatches = [...MATCHES, ...(window._koPseudoCache||buildKoPseudoMatches())];
  allMatches.forEach(m => {
    const mid = m[0]; const r = RS[mid]; if (!r || r[0]===null) return;
    const p = m[5]?.[pi]; if (!p || p[0]===null) return;
    stats.mj++;
    const exact = p[0]===r[0]&&p[1]===r[1]; const winner = (p[0]>p[1]&&r[0]>r[1])||(p[0]<p[1]&&r[0]<r[1])||(p[0]===p[1]&&r[0]===r[1]);
    if (exact) { stats.pts+=3; stats.gEx++; stats.streak.push(2); }
    else if (winner) { stats.pts+=1; stats.gVic++; stats.streak.push(1); }
    else stats.streak.push(0);
  });
  return stats;
}

function renderPlayerMatchStats(mid) {
  const m = MATCHES.find(x => x[0] === mid);
  if (!m) return '<p style="font-size:.75rem;color:var(--t3)">Aucun pronostic</p>';
  const r = RS[mid];
  const played = r && r[0] !== null;
  return '<table class="tbl mini"><thead><tr><th>Joueur</th><th>Prono</th><th>Pts</th></tr></thead><tbody>' +
    [...Array(PLAYERS.length).keys()].map(pi => {
      const p = m[5]?.[pi];
      if (!p || p[0]===null) return '';
      const exact = played && p[0]===r[0] && p[1]===r[1];
      const winner = played && ((p[0]>p[1] && r[0]>r[1]) || (p[0]<p[1] && r[0]<r[1]) || (p[0]===p[1] && r[0]===r[1]));
      const pts = exact ? 3 : winner ? 1 : 0;
      const cls = exact ? 'gEx' : winner ? 'gVic' : '';
      return `<tr class="${cls}"><td>${avatarHTML(pi)} ${PLAYERS[pi]}</td><td>${p[0]}-${p[1]}</td><td>${played ? pts : '-'}</td></tr>`;
    }).filter(Boolean).join('') + '</tbody></table>';
}

function saveM(id) {
  const m = MATCHES.find(x => x[0] === id);
  if (!m) return;
  const r1 = parseInt(document.getElementById('sa'+id)?.value);
  const r2 = parseInt(document.getElementById('sb'+id)?.value);
  if (isNaN(r1) || isNaN(r2)) return;
  if (!RS[id]) RS[id] = [null,null,null,null];
  RS[id][0] = r1; RS[id][1] = r2;
  saveRS();
  renderMatchs();
  if (curMM === id) renderMM(id);
}

function saveAll() {
  for (let mid = 1; mid <= 72; mid++) {
    const a = document.getElementById('sa'+mid);
    const b = document.getElementById('sb'+mid);
    if (a && b && a.value !== '' && b.value !== '') {
      if (!RS[mid]) RS[mid] = [null,null,null,null];
      RS[mid][0] = parseInt(a.value); RS[mid][1] = parseInt(b.value);
    }
  }
  saveRS();
  renderMatchs();
}

function markD(id) {
  const el = document.querySelector('[data-id="'+id+'"]');
  if (el) el.classList.add('dirty');
}

// ═══════════════════════════════════════════════════
// FILTERS, MODALS
// ═══════════════════════════════════════════════════
function filterS() {
  const q = document.getElementById('srch')?.value.toLowerCase();
  document.querySelectorAll('#mt-tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q || '') ? '' : 'none';
  });
}

function openPC(pi) {
  document.getElementById('pc').style.display = 'flex';
  const p = PLAYERS[pi];
  const col = COLORS[pi];
  const rank = buildRanking();
  const rankPos = rank.findIndex(x => x.pi === pi) + 1;
  const stats = calcPlayerStatsDetailed(pi);
  const phrase = PLAYER_PHRASES[pi] || '';
  document.getElementById('pcc').innerHTML = `
    <div class="pc-head">
      <span class="pc-av" ${PLAYER_PHOTOS[pi] ? `onclick="openPhotoLB(${pi})" style="cursor:zoom-in"` : ''}>${avatarHTML(pi)}</span>
      <div class="pc-name" style="color:${col}">${p}</div>
      <div class="pc-rank">${rankPos}e${rankPos === 1 ? 'r' : ''} place · ${stats.totalPts} pts · ${stats.matchCount} matchs</div>
      <div class="pc-pts" style="color:${col}">📊 ${stats.avgPerDay} pts/jour <span style="font-weight:400;font-size:.7rem;color:var(--t3)">sur ${stats.dayCount} jours</span></div>
    </div>
    <div class="pc-grid">
      <div class="pc-stat">
        <div class="pc-stat-v">🎯 ${rank.find(x => x.pi === pi)?.exact || 0}</div>
        <div class="pc-stat-l">Scores exacts</div>
      </div>
      <div class="pc-stat">
        <div class="pc-stat-v">✅ ${rank.find(x => x.pi === pi)?.winner || 0}</div>
        <div class="pc-stat-l">Vainqueurs</div>
      </div>
      <div class="pc-stat">
        <div class="pc-stat-v" style="display:flex;align-items:center;justify-content:center;gap:4px">${fl(PLAYER_FAV_TEAM[pi])} ${PLAYER_FAV_TEAM[pi]}</div>
        <div class="pc-stat-l">Équipe préférée</div>
      </div>
      <div class="pc-stat">
        <div class="pc-stat-v">${stats.totalPts}</div>
        <div class="pc-stat-l">Points totaux</div>
      </div>
    </div>
    ${phrase ? `<div class="pc-phrase">💬 ${phrase}</div>` : ''}
    ${stats.worstMatch ? `<div class="pc-worst"><div class="pc-worst-label">😬 Pire match</div>${stats.worstStr}</div>` : ''}`;
}

function closePC() { document.getElementById('pc').style.display = 'none'; }

function openPhotoLB(pi) {
  if (!PLAYER_PHOTOS[pi]) return;
  document.getElementById('photoLBImg').src = PLAYER_PHOTOS[pi];
  document.getElementById('photoLBImg').alt = PLAYERS[pi];
  document.getElementById('photoLB').style.display = 'flex';
}

function closePhotoLB() { document.getElementById('photoLB').style.display = 'none'; }

function calcPlayerStatsDetailed(pi) {
  const dayPts = {};
  let totalPts = 0, matchCount = 0;
  const teamPts = {};
  let worst = { pts: null, match: null, diff: 0 };
  MATCHES.forEach(m => {
    const r = RS[m[0]];
    if (!r || r[0] === null) return;
    const pr = m[5][pi];
    const p = pts(pr, r);
    if (p === null) return;
    const date = m[1];
    if (!dayPts[date]) dayPts[date] = 0;
    dayPts[date] += p;
    totalPts += p;
    matchCount++;
    if (p === 0) {
      const diff = Math.abs(r[0] - pr[0]) + Math.abs(r[1] - pr[1]);
      if (!worst.match || diff > worst.diff) { worst = { pts: 0, match: m, diff }; }
    }
    if (p > 0) {
      const home = m[3], away = m[4];
      if (pr[0] === r[0] && pr[1] === r[1]) {
        teamPts[home] = (teamPts[home] || 0) + 3;
        teamPts[away] = (teamPts[away] || 0) + 3;
      } else if (pr[0] > pr[1] && r[0] > r[1]) { teamPts[home] = (teamPts[home] || 0) + 1; }
      else if (pr[0] < pr[1] && r[0] < r[1]) { teamPts[away] = (teamPts[away] || 0) + 1; }
      else if (pr[0] === pr[1] && r[0] === r[1]) { teamPts[home] = (teamPts[home] || 0) + 1; teamPts[away] = (teamPts[away] || 0) + 1; }
    }
  });
  const dayCount = Object.keys(dayPts).length;
  const avgPerDay = dayCount > 0 ? (totalPts / dayCount).toFixed(1) : '0';
  let luckyTeam = '—', maxTeamPts = 0;
  Object.entries(teamPts).forEach(([t, pt]) => { if (pt > maxTeamPts) { maxTeamPts = pt; luckyTeam = t; } });
  let worstStr = '—';
  if (worst.match) {
    const wm = worst.match;
    const r = RS[wm[0]];
    worstStr = `${fl(wm[3])} ${wm[3]} ${r[0]}-${r[1]} ${wm[4]} ${fl(wm[4])}`;
  }
  return { avgPerDay, luckyTeam, luckyPts: maxTeamPts, worstStr, worstMatch: worst.match, totalPts, dayCount, matchCount };
}

function pts(p, r) {
  if (!r || r[0] === null || r[0] === undefined) return null;
  if (p[0] === r[0] && p[1] === r[1]) return 3;
  const pw = p[0] > p[1] ? 1 : p[0] < p[1] ? -1 : 0, rw = r[0] > r[1] ? 1 : r[0] < r[1] ? -1 : 0;
  return pw === rw ? 1 : 0;
}

// ═══════════════════════════════════════════════════
// SECTION: TABLEAU
// ═══════════════════════════════════════════════════
function renderTableau() {
  document.getElementById('pg-tb')?.classList.add('rendered');
  const tb = document.getElementById('rt-tbody');
  if (!tb) return;
  const tfoot = document.getElementById('rt-tfoot');
  const data = PLAYERS.map((name, pi) => {
    const s = calcPlayerStats(pi);
    return { ...s, name, pi };
  });
  data.sort((a,b) => b.pts - a.pts || b.gEx - a.gEx);
  tb.innerHTML = data.map((d,i) => {
    const avg = d.mj ? (d.pts/d.mj).toFixed(2) : '-';
    const streakStr = d.streak.slice(-5).map(v => v===2?'🟢':v===1?'🟡':'⚪').join('');
    const col = COLORS[d.pi];
    return `<tr style="border-left:3px solid ${col}"><td>${i+1}</td><td>${avatarHTML(d.pi)} ${d.name}</td><td>${d.mj}</td><td><strong>${d.pts}</strong></td><td>${d.gEx}</td><td>${d.gVic}</td><td>${avg}</td><td style="font-size:.7rem">${streakStr}</td></tr>`;
  }).join('');
  if (tfoot) {
    tfoot.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--t4);font-size:.75rem;padding:.6rem">🟢 Score exact = 3pts · 🟡 Bon vainqueur = 1pt · ⚪ Raté = 0pt</td></tr>`;
  }
  setTimeout(() => animateTableRows(tb), 80);
}

// ═══════════════════════════════════════════════════
// SECTION: GROUPES
// ═══════════════════════════════════════════════════
function renderGroups() {
  document.getElementById('pg-gr')?.classList.add('rendered');
  const el = document.getElementById('gr-content');
  if (!el) return;
  const stats = computeTournStats();
  el.innerHTML = `
    <div class="fs-hero">
      <div class="fs-hero-emblem">🌍</div>
      <div class="fs-hero-body">
        <p class="fs-hero-eyebrow">Phase de groupes · USA / Canada / Mexique</p>
        <h2 class="fs-hero-title" data-scramble><span class="txt-reveal-wrap">Coupe du Monde FIFA 2026</span></h2>
        <p class="fs-hero-sub">12 groupes · 48 équipes · 72 matchs</p>
      </div>
      <div class="fs-kpis" id="fs-kpis">
        <div class="fs-kpi"><div class="fs-kpi-v">${stats.goals}</div><div class="fs-kpi-l">Buts</div></div>
        <div class="fs-kpi"><div class="fs-kpi-v">${stats.played}</div><div class="fs-kpi-l">Joués</div></div>
        <div class="fs-kpi"><div class="fs-kpi-v">${stats.total-stats.played}</div><div class="fs-kpi-l">Restants</div></div>
      </div>
    </div>
    <div class="grp-grid">
      <div>
        <div class="sec" style="margin-bottom:.65rem"><div class="sec-title" data-scramble><span class="txt-reveal-wrap">📊 Classement du groupe</span></div></div>
        <div class="grp-tabs" id="grp-tabs">${Object.keys(GROUPS).map(g => `<button class="grp-tab${g===curGrp?' on':''}" onclick="selectGrp('${g}')">Groupe ${g}</button>`).join('')}</div>
        <div id="gr-table"></div>
      </div>
      <div>
        <div class="sec" style="margin-bottom:.65rem;margin-top:.75rem"><div class="sec-title" data-scramble><span class="txt-reveal-wrap">📈 Statistiques</span></div></div>
        <div class="ts-grid" id="tourn-stats"></div>
      </div>
    </div>`;
  renderGroupTable(curGrp);
  renderTournStats(stats);
  setTimeout(() => { if (typeof gsap !== 'undefined') gsap.fromTo(el.querySelectorAll('.fs-kpi'), { y:20, opacity:0 }, { y:0, opacity:1, stagger:0.08, duration:0.5, ease:'power2.out' }); }, 150);
}

function renderTournStats(stats) {
  const played = MATCHES.filter(m => RS[m[0]] && RS[m[0]][0] !== null).length;
  const tsEl = document.getElementById('tourn-stats');
  if (!tsEl) return;
  tsEl.innerHTML = [
    ['⚽ Buts inscrits', stats.goals, 'var(--gold)', 0],
    ['📊 Moy. / match', (stats.goals/Math.max(stats.played,1)).toFixed(1), 'var(--grn)', 1],
    ['✅ Matchs joués', played, 'var(--blu2)', 0],
    ['⏳ Restants', stats.total-played, 'var(--t2)', 0],
  ].map(([l,v,c,d]) => `<div class="ts-card"><div class="ts-card-l">${l}</div><div class="ts-card-v num-counter" style="color:${c}" data-count-to="${v}" data-count-dec="${d}" data-count-dur="1.2">0</div></div>`).join('');
  setTimeout(() => { if (typeof initCounters !== 'undefined') initCounters(); }, 100);
}

function renderGroupTable(gname) {
  curGrp = gname;
  document.querySelectorAll('.grp-tab').forEach(t => t.classList.toggle('on', t.textContent.includes(gname)));
  const el = document.getElementById('gr-table');
  if (!el) return;
  const teams = computeGroup(gname);
  const grpData = GROUPS[gname];
  el.innerHTML = `<table class="tbl"><thead><tr><th>#</th><th>Équipe</th><th>MJ</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${
    teams.map((t,i) => {
      const gd = t.gf - t.ga;
      return `<tr class="${i<2?'qualify':''}"><td>${i+1}</td><td><span class="tf">${fl(t.name)}</span>${t.name}</td><td>${t.mj}</td><td>${t.v}</td><td>${t.n}</td><td>${t.d}</td><td>${t.gf}</td><td>${t.ga}</td><td style="color:${gd>0?'var(--grn)':gd<0?'var(--red)':'var(--t3)'}">${gd>0?'+':''}${gd}</td><td style="color:${i<2?'var(--grn)':'var(--t1)'}"><strong>${t.pts}</strong></td></tr>`;
    }).join('')
  }</tbody></table>
  <div class="grp-matches" style="margin-top:1rem">${renderGroupMatches(gname)}</div>
  <div class="anim-marker" style="display:none" data-section="groupTable"></div>`;
  setTimeout(() => { animateTableRows(el); animateMatchCards(el); }, 80);
}

function renderGroupMatches(gname) {
  const ids = GROUPS[gname]?.matches || [];
  return ids.map(mid => {
    const m = MATCHES.find(x => x[0] === mid);
    if (!m) return '';
    const r = RS[mid] || [];
    const isLive = LIVE[mid];
    const played = r[0] !== null;
    return `<div class="grp-m ${isLive?'live':''}" onclick="openMM(${mid})">
      <span class="gm-t">${m[3]}</span><span class="gm-s">${r[0]!==null?r[0]:'-'}</span>
      <span class="gm-vs">vs</span>
      <span class="gm-s">${r[1]!==null?r[1]:'-'}</span><span class="gm-t">${m[4]}</span>
    </div>`;
  }).join('');
}

function selectGrp(g) { renderGroupTable(g); }

// ═══════════════════════════════════════════════════
// SECTION: BRACKET
// ═══════════════════════════════════════════════════
function renderBracket() {
  document.getElementById('pg-bk')?.classList.add('rendered');
  const el = document.getElementById('bk-wrap');
  if (!el) return;
  _bracketMatchCache = computeBracket();
  el.innerHTML = '<div class="bk-svg">'+buildBracketSVG()+'</div>';
  setTimeout(() => {
    if (typeof gsap !== 'undefined') {
      document.querySelectorAll('.bk-svg path, .bk-svg line').forEach((p,i) => {
        gsap.fromTo(p, { strokeDashoffset: p.getTotalLength?.() || 1000 }, { strokeDashoffset: 0, duration: 0.8 + i*0.05, ease:'power2.out' });
      });
    }
  }, 100);
}

function computeBracket() {
  const cache = {};
  // Round of 32 (M73-96): use group standings
  const letters = Object.keys(GROUPS);
  letters.forEach((g, i) => {
    const teams = computeGroup(g);
    const first = teams[0]?.name;
    const second = teams[1]?.name;
    // Each group provides 2 teams to specific KO slots
    const pairIndex = Math.floor(i / 2);
    // Simplified bracket logic
  });

  // Round of 16 (M97-104)
  // Quarter-finals → Semi-finals → Final

  return cache;
}

function buildBracketSVG() {
  return '<div style="min-height:400px;display:flex;align-items:center;justify-content:center;color:var(--t4)">🏗️ Bracket en construction</div>';
}

// ═══════════════════════════════════════════════════
// SECTION: PRONOSTICS
// ═══════════════════════════════════════════════════
function renderPronostics() {
  document.getElementById('pg-pn')?.classList.add('rendered');
  const el = document.getElementById('pn-list');
  if (!el) return;
  if (!_pnPseudo) { el.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--t3)">Connectez-vous pour voir vos pronostics</p>'; return; }
  showPnInfoIfFirstTime();
  // Render match list with predictions
  let html = '<div class="pn-grid">';
  MATCHES.forEach(m => {
    const mid = m[0]; const r = RS[mid];
    const played = r && r[0] !== null;
    const p = m[5]?.[PLAYERS.indexOf(_pnPseudo)];
    const locked = played || (r && r[0] !== null);
    const hasPrediction = p && p[0] !== null;
    html += `<div class="pn-card ${locked?'locked':''} ${played?'played':''}">
      <div class="pn-mid">M${mid}</div>
      <div class="pn-teams"><span>${fl(m[3])}${m[3]}</span><span class="pn-vs">vs</span><span>${fl(m[4])}${m[4]}</span></div>
      <div class="pn-score">${hasPrediction ? `${p[0]}-${p[1]}` : '<span style="color:var(--t4)">—</span>'}</div>
      ${played ? `<div class="pn-result">${r[0]}-${r[1]}</div>` : ''}
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
  setTimeout(() => animateMatchCards(el), 80);
}

function pnFilter(filter, btn) {
  _pnFilter = filter;
  document.querySelectorAll('#pn-filters .pill').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  renderPronostics();
}

// ═══════════════════════════════════════════════════
// SECTION: LOGS (admin)
// ═══════════════════════════════════════════════════
function renderLogs() {
  document.getElementById('pg-lg')?.classList.add('rendered');
  const el = document.getElementById('lg-content');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem">
      <div class="sec-title"><span class="txt-reveal-wrap">🔍 Logs de connexion</span></div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="renderLogs()" style="background:rgba(99,102,241,.1);color:var(--pur2);border:1px solid rgba(99,102,241,.2)">🔄 Rafraîchir</button>
        <button class="btn btn-sm" onclick="clearLogs()" style="background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2)">🗑 Vider les logs</button>
      </div>
    </div>
    <div id="pg-lg-content" style="display:flex;flex-direction:column;gap:.4rem">
      <div style="padding:1rem;color:var(--t3);text-align:center">Logs d'administration — Fonctionnalité à venir</div>
    </div>`;
}

function clearLogs() {}

function exportGuest() {}

// ═══════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════
function toggleTheme() {
  document.body.classList.toggle('light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
}

// ═══════════════════════════════════════════════════
// RENDER ALL — call on data change
// ═══════════════════════════════════════════════════
function renderAll() {
  const tab = document.querySelector('.ntab.on')?.id.replace('nt-','');
  if (tab === 'cl') renderClassement(_clPhase);
  else if (tab === 'ma') renderMatchs();
  else if (tab === 'tb') renderTableau();
  else if (tab === 'gr') renderGroups();
  else if (tab === 'bk') renderBracket();
  else if (tab === 'pn') renderPronostics();
  renderRecapWidget();
}

function renderGroupsBanner(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = Object.entries(GROUPS).map(([g, data]) => {
    const teams = computeGroup(g);
    const top2 = teams.slice(0,2).map(t => t.name).join(', ');
    return `<div class="gb-card" onclick="showTab('gr');setTimeout(()=>selectGrp('${g}'),80)">
      <div class="gb-title">Groupe ${g}</div>
      <div class="gb-teams">${data.teams.map(t => fl(t)+t).join(' ')}</div>
      <div class="gb-top2">🏆 ${top2 || '—'}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// START EXPERIENCE — called after loading
// ═══════════════════════════════════════════════════
export function startExperience(extraInit) {
  buildLoginPlayers();
  if (extraInit && extraInit.initLenis) extraInit.initLenis();
  if (extraInit && extraInit.init3D) setTimeout(extraInit.init3D, 200);
  if (extraInit && extraInit.initCursor) setTimeout(extraInit.initCursor, 300);
  if (extraInit && extraInit.initNoise) setTimeout(extraInit.initNoise, 400);
  if (extraInit && extraInit.initSectionAnims) setTimeout(extraInit.initSectionAnims, 600);
  if (extraInit && extraInit.initMicroInteractions) setTimeout(extraInit.initMicroInteractions, 800);
  if (extraInit && extraInit.initScrollTriggers) setTimeout(extraInit.initScrollTriggers, 1000);
  if (extraInit && extraInit.initMagnetic) setTimeout(extraInit.initMagnetic, 1200);
  if (extraInit && extraInit.init3DTilt) setTimeout(extraInit.init3DTilt, 1400);
  if (extraInit && extraInit.initHorizontalScroll) setTimeout(extraInit.initHorizontalScroll, 1600);
  if (extraInit && extraInit.initMorphing) setTimeout(extraInit.initMorphing, 2000);
  if (extraInit && extraInit.initBracketAnim) setTimeout(extraInit.initBracketAnim, 2200);
  if (extraInit && extraInit.initRipple) setTimeout(extraInit.initRipple, 400);
  if (extraInit && extraInit.initDynamicShadow) setTimeout(extraInit.initDynamicShadow, 900);
  if (extraInit && extraInit.initCounters) setTimeout(extraInit.initCounters, 1100);
  if (extraInit && extraInit.initTooltips) setTimeout(extraInit.initTooltips, 500);
  if (extraInit && extraInit.initTextScramble) setTimeout(extraInit.initTextScramble, 1000);
  if (extraInit && extraInit.initParticleBurst) setTimeout(extraInit.initParticleBurst, 1200);
  if (extraInit && extraInit.initSoundEffects) setTimeout(extraInit.initSoundEffects, 1500);
  if (extraInit && extraInit.initScrollTop) setTimeout(extraInit.initScrollTop, 1600);
  if (extraInit && extraInit.initImageReveal) setTimeout(extraInit.initImageReveal, 800);

  // Login observer
  const loginObserver = new MutationObserver(() => {
    const ml = document.getElementById('ml');
    if (ml && ml.style.display === 'none') document.getElementById('three-canvas')?.classList.add('visible');
  });
  const mlEl = document.getElementById('ml');
  if (mlEl) loginObserver.observe(mlEl, { attributes: true, attributeFilter: ['style'] });
  if (document.getElementById('ml')?.style.display === 'none') {
    document.getElementById('three-canvas')?.classList.add('visible');
  }

  startFirebaseSync();
}

// ═══════════════════════════════════════════════════
// GSAP ENTRANCE ANIMATIONS
// ═══════════════════════════════════════════════════
function animatePodium() {
  if (typeof gsap === 'undefined') return;
  const pods = document.querySelectorAll('.podium .pod');
  if (pods.length) {
    gsap.fromTo(pods, { y:40, opacity:0, scale:0.9 }, {
      y:0, opacity:1, scale:1, duration:0.7, stagger:0.12, ease:'back.out(1.7)',
      onComplete: () => {
        if (pods.length >= 3) {
          const rect = pods[0].getBoundingClientRect();
          burstConfetti(rect.left + rect.width/2, rect.top, 25);
        }
      }
    });
  }
}

function animateLeaderboard() {
  if (typeof gsap === 'undefined') return;
  const rows = document.querySelectorAll('.lb-row');
  if (rows.length) {
    gsap.fromTo(rows, { x:-20, opacity:0 }, { x:0, opacity:1, duration:0.5, stagger:0.03, ease:'power2.out' });
  }
}

function animateMatchCards(parentEl) {
  if (typeof gsap === 'undefined' || !parentEl) return;
  const cards = parentEl.querySelectorAll('.grp-m, .pn-card, .ma-card, .gm-card');
  if (cards.length) {
    gsap.fromTo(cards, { y:15, opacity:0, scale:0.97 }, { y:0, opacity:1, scale:1, duration:0.4, stagger:0.025, ease:'power2.out' });
  }
}

function animateTableRows(parentEl) {
  if (typeof gsap === 'undefined' || !parentEl) return;
  const rows = parentEl.querySelectorAll('tbody tr, .tbl tbody tr');
  if (rows.length) {
    gsap.fromTo(rows, { x:-10, opacity:0 }, { x:0, opacity:1, duration:0.35, stagger:0.02, ease:'power1.out' });
  }
}

// ═══════════════════════════════════════════════════
// EXPORTS — for main.js
// ═══════════════════════════════════════════════════
export { showTab, renderClassement, toggleTheme, renderAll, renderMatchs, renderTableau, renderGroups, renderBracket, renderPronostics, renderLogs };
export { loginAs, loginAsAdmin, tryAdmin, loginBack, enterGuest, switchMode, confirmPseudo, closePnInfo, exportGuest, clearLogs };
export { openMM, closeMM, saveM, saveAll, markD, filterP, pnFilter, selectGrp, openPC, closePC, openPhotoLB, closePhotoLB };
export { calcPlayerStats, calcPlayerStatsDetailed, renderMM, renderGroupTable, renderGroupsBanner };
export { startFirebaseSync, buildRanking, computeGroup, computeTournStats, filterS };
export { isAdmin, curGrp, curMM, _pnPseudo, RS, ME, AE, LIVE, toast, saveRS, saveAE, saveLive, pts };
