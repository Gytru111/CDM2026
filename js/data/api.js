import { MATCHES, KO_SCHEDULE, normName, matchESPNDates, ESPN_URL, WC26_URL } from './config.js';

let _autoTimer = null;
let _autoActive = false;

function getAutoActive() { return _autoActive; }

async function fetchESPN() {
  try {
    const res = await fetch(ESPN_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('ESPN ' + res.status);
    const data = await res.json();
    const events = data.events || [];
    let updated = 0;
    let liveChanged = false;
    events.forEach(e => {
      const comp = e.competitions?.[0];
      if (!comp) return;
      const status = comp.status?.type?.name;
      const statusState = comp.status?.type?.state;
      const isLive = statusState === 'in' || statusState === 'halftime' || [
        'STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD',
        'STATUS_FIRST_HALF', 'STATUS_SECOND_HALF', 'STATUS_EXTRA_TIME',
        'STATUS_PENALTIES', 'STATUS_OVERTIME'
      ].includes(status);
      const isFinalRaw = statusState === 'post' || ['STATUS_FULL_TIME', 'STATUS_FINAL', 'STATUS_FULL_PEN'].includes(status);
      window._espnFinalCount = window._espnFinalCount || {};
      const fkey = e.id || '?';
      if (isFinalRaw) { window._espnFinalCount[fkey] = (window._espnFinalCount[fkey] || 0) + 1; }
      else { window._espnFinalCount[fkey] = 0; }
      const isFinal = isFinalRaw && (window._espnFinalCount[fkey] >= 2);
      if (statusState === 'pre' && !isLive) return;
      if (['STATUS_CANCELED', 'STATUS_CANCELLED', 'STATUS_POSTPONED'].includes(status)) return;
      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      if (!home || !away) return;
      const hn = normName(home.team?.displayName || home.team?.name || '');
      const an = normName(away.team?.displayName || away.team?.name || '');
      const gh = parseInt(home.score) || 0;
      const ga = parseInt(away.score) || 0;
      const koCache = window._bracketMatchCache || {};
      const ALL_FINDABLE = [
        ...MATCHES.map(m => [m[0], m[3], m[4]]),
        ...Object.entries(koCache)
          .filter(([, bm]) => bm.t1 && bm.t2)
          .map(([id, bm]) => [+id, bm.t1, bm.t2]),
      ];
      let found = ALL_FINDABLE.find(m => m[1] === hn && m[2] === an);
      let swapped = false;
      if (!found) { found = ALL_FINDABLE.find(m => m[1] === an && m[2] === hn); swapped = true; }
      if (found) {
        const RS = window.RS || {};
        const score0 = swapped ? ga : gh;
        const score1 = swapped ? gh : ga;
        const cur = RS[found[0]];
        const adminOverride = cur && (cur[2] != null || cur[3] != null || cur[4] != null);
        if (found[0] === 81 || found[0] === 75 || found[0] === 76) { return; }
        else if (!adminOverride && (!cur || cur[0] !== score0 || cur[1] !== score1)) {
          RS[found[0]] = [score0, score1]; updated++;
        }
        const LIVE = window.LIVE || {};
        const prevLive = !!LIVE[found[0]];
        if (isLive) {
          if (!prevLive) liveChanged = true;
          LIVE[found[0]] = true;
        } else if (isFinal) {
          if (prevLive) liveChanged = true;
          delete LIVE[found[0]];
        }
        window._espnMap = window._espnMap || {};
        window._espnMap[found[0]] = {
          eventId: e.id, status, isLive,
          clock: comp.status?.displayClock,
          period: comp.status?.period,
          details: comp.details || []
        };
        const curMM = window.curMM;
        const AE = window.AE || {};
        if (!(curMM === found[0] && AE[found[0]]?.length > 0)) {
          const rawDetails = comp.details || [];
          if (rawDetails.length > 0) {
            const homeTeamId = home?.team?.id;
            const awayTeamId = away?.team?.id;
            if (homeTeamId && awayTeamId) {
              const aeParsed = [];
              rawDetails.forEach(d => {
                const minTxt = d.clock?.displayValue || '';
                const min = parseInt(minTxt) || 0;
                if (!min || !d.type?.text) return;
                const isHome = d.team?.id === homeTeamId;
                const side = swapped ? (isHome ? 'a' : 'h') : (isHome ? 'h' : 'a');
                const player = d.athletesInvolved?.[0]?.displayName || '';
                if (d.scoringPlay) {
                  const assistPlayer = (!d.ownGoal && !d.penaltyKick) ? (d.athletesInvolved?.[1]?.displayName || '') : '';
                  if (d.ownGoal) aeParsed.push({ type: 'owngoal', min, side, player });
                  else if (d.penaltyKick) aeParsed.push({ type: 'pen', min, side, player });
                  else {
                    const goalEvt = { type: 'goal', min, side, player };
                    if (assistPlayer) goalEvt.assist = assistPlayer;
                    aeParsed.push(goalEvt);
                  }
                } else if (d.yellowCard) {
                  aeParsed.push({ type: 'yellow', min, side, player });
                } else if (d.redCard) {
                  aeParsed.push({ type: 'red', min, side, player });
                } else if (d.substitution) {
                  const pOut = d.athletesInvolved?.[0]?.displayName || '';
                  const pIn = d.athletesInvolved?.[1]?.displayName || '';
                  if (pOut && pIn) aeParsed.push({ type: 'sub', min, side, playerOut: pOut, playerIn: pIn });
                }
              });
              if (aeParsed.length > 0) {
                AE[found[0]] = aeParsed;
                if (window.saveAE) window.saveAE();
              }
            }
          }
        }
      } else {
        console.warn(`[fetchESPN] Match ESPN sans correspondance: "${hn}" vs "${an}" (statut ${status})`);
      }
    });
    if (updated > 0) { if (window.saveRS) window.saveRS(); if (window.renderAll) window.renderAll(); if (window.toast) window.toast(`🔄 ${updated} score(s) ESPN mis à jour`, 'inf'); }
    else if (Object.keys(window.LIVE || {}).length > 0) { if (window.renderAll) window.renderAll(); }
    if (liveChanged) { if (window.saveLive) window.saveLive(); }
    return updated;
  } catch (e) {
    console.warn('ESPN fetch error:', e);
    return -1;
  }
}

async function fetchWC26() {
  try {
    const res = await fetch(WC26_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('WC26 ' + res.status);
    const data = await res.json();
    const games = data.games || data || [];
    let updated = 0;
    const RS = window.RS || {};
    games.forEach(g => {
      if (!g.finished && !g.live) return;
      const hn = normName(g.home_team?.name || g.homeTeam || '');
      const an = normName(g.away_team?.name || g.awayTeam || '');
      const gh = parseInt(g.home_score ?? g.homeScore) || 0;
      const ga = parseInt(g.away_score ?? g.awayScore) || 0;
      const found = MATCHES.find(m => m[3] === hn && m[4] === an);
      if (found) {
        if (found[0] === 81 || found[0] === 75 || found[0] === 76) { return; }
        else {
          const cur = RS[found[0]];
          const adminOverride = cur && (cur[2] != null || cur[3] != null || cur[4] != null);
          if (!adminOverride && (!cur || cur[0] !== gh || cur[1] !== ga)) {
            RS[found[0]] = [gh, ga]; updated++;
          }
        }
      }
    });
    if (updated > 0) { if (window.saveRS) window.saveRS(); if (window.renderAll) window.renderAll(); if (window.toast) window.toast(`🔄 ${updated} score(s) WC26 mis à jour`, 'inf'); }
    return updated;
  } catch (e) {
    console.warn('WC26 fetch error:', e);
    return -1;
  }
}

window._espnStatsCache = window._espnStatsCache || {};
async function fetchMatchStats(matchId) {
  const info = (window._espnMap || {})[matchId];
  if (!info || !info.eventId) return null;
  if (window._espnStatsCache[info.eventId]) return window._espnStatsCache[info.eventId];
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${info.eventId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('ESPN summary ' + res.status);
    const data = await res.json();
    const teams = data.boxscore?.teams || [];
    const details = data.header?.competitions?.[0]?.details || info.details || [];
    const result = { teams, details };
    window._espnStatsCache[info.eventId] = result;
    return result;
  } catch (e) {
    console.warn('fetchMatchStats error:', e);
    return null;
  }
}

async function fetchESPNForMatch(matchId) {
  let m = MATCHES.find(x => x[0] === matchId);
  if (!m) {
    const bm = (window._bracketMatchCache || {})[matchId];
    const sched = KO_SCHEDULE[matchId];
    if (bm && bm.t1 && bm.t2 && sched) {
      m = [matchId, sched.date, sched.time, bm.t1, bm.t2];
    } else {
      return false;
    }
  }
  const dates = matchESPNDates(m);
  for (const dt of dates) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dt}&limit=50`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events || [];
      for (const e of events) {
        const comp = e.competitions?.[0];
        if (!comp) continue;
        const home = comp.competitors?.find(c => c.homeAway === 'home');
        const away = comp.competitors?.find(c => c.homeAway === 'away');
        if (!home || !away) continue;
        const hn = normName(home.team?.displayName || home.team?.name || '');
        const an = normName(away.team?.displayName || away.team?.name || '');
        const matches = (hn === m[3] && an === m[4]) || (hn === m[4] && an === m[3]);
        if (matches) {
          const status = comp.status?.type?.name;
          const statusState = comp.status?.type?.state;
          const isLive = statusState === 'in' || ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD', 'STATUS_FIRST_HALF', 'STATUS_SECOND_HALF', 'STATUS_EXTRA_TIME', 'STATUS_PENALTIES'].includes(status);
          window._espnMap = window._espnMap || {};
          window._espnMap[matchId] = {
            eventId: e.id, status, isLive,
            clock: comp.status?.displayClock,
            period: comp.status?.period,
            details: comp.details || []
          };
          return true;
        }
      }
    } catch (e) { console.warn('fetchESPNForMatch', dt, e.message); }
  }
  return false;
}

async function fetchAll() {
  try {
    const n = await fetchESPN();
    if (n === -1) { await fetchWC26(); }
  } catch (e) {
    console.warn('[CDM26] fetchAll erreur:', e);
  }
}

async function tryFetch() {
  const btn = event?.currentTarget;
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
  await fetchAll();
  if (btn) { btn.textContent = '🔄 Actualiser'; btn.disabled = false; }
  startAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();
  _autoActive = true;
  const chip = document.getElementById('lchip');
  if (chip) { chip.style.display = 'inline-flex'; chip.classList.add('on'); chip.innerHTML = '<span class="ldot"></span>Live'; }
  fetchAll();
  const intervalMs = () => {
    const base = Object.keys(window.LIVE || {}).length > 0 ? 30000 : 300000;
    const jitter = (Math.random() - 0.5) * 10000;
    return Math.max(10000, base + jitter);
  };
  const tick = async () => {
    if (!_autoActive) return;
    try { await fetchAll(); } catch (e) { console.warn('[CDM26] tick() erreur:', e); }
    finally {
      if (_autoActive) {
        clearTimeout(_autoTimer);
        _autoTimer = setTimeout(tick, intervalMs());
      }
    }
  };
  _autoTimer = setTimeout(tick, intervalMs());
}

function stopAutoRefresh() {
  if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
  _autoActive = false;
  const chip = document.getElementById('lchip');
  if (chip) { chip.style.display = 'none'; chip.classList.remove('on'); }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
  } else {
    if (_autoActive) {
      fetchAll().then(() => {
        if (_autoActive) {
          clearTimeout(_autoTimer);
          const intervalMs = Object.keys(window.LIVE || {}).length > 0 ? 30000 : 300000;
          _autoTimer = setTimeout(function tick() {
            if (!_autoActive) return;
            fetchAll().finally(() => {
              if (_autoActive) {
                clearTimeout(_autoTimer);
                const ms = Object.keys(window.LIVE || {}).length > 0 ? 30000 : 300000;
                _autoTimer = setTimeout(tick, ms);
              }
            });
          }, intervalMs);
        }
      });
    }
  }
});

window.addEventListener('focus', () => {
  if (_autoActive && !_autoTimer) { fetchAll(); startAutoRefresh(); }
});

async function debugAPI() {
  if (window.toast) window.toast('🔍 Test ESPN en cours...', 'inf');
  try {
    const res = await fetch(ESPN_URL, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const events = data.events || [];
    const finStatus = ['STATUS_FULL_TIME', 'STATUS_FINAL'];
    const liveStatus = ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD', 'STATUS_FIRST_HALF', 'STATUS_SECOND_HALF', 'STATUS_EXTRA_TIME', 'STATUS_PENALTIES'];
    const finished = events.filter(e => finStatus.includes(e.competitions?.[0]?.status?.type?.name));
    const live = events.filter(e => {
      const c = e.competitions?.[0];
      return c?.status?.type?.state === 'in' || liveStatus.includes(c?.status?.type?.name);
    });
    const allStatuses = [...new Set(events.map(e => e.competitions?.[0]?.status?.type?.name))];
    console.info('[CDM26 debug] Tous les statuts vus aujourd\'hui:', allStatuses);
    console.info('[CDM26 debug] Tous les matchs reçus:', events.map(e => {
      const c = e.competitions?.[0];
      const h = c?.competitors?.find(x => x.homeAway === 'home');
      const a = c?.competitors?.find(x => x.homeAway === 'away');
      return `${h?.team?.displayName} ${h?.score}-${a?.score} ${a?.team?.displayName} [${c?.status?.type?.name} / state=${c?.status?.type?.state}]`;
    }));
    alert(`✅ ESPN API OK!\n\nTotal matchs: ${events.length}\nTerminés: ${finished.length}\nEn direct: ${live.length}\nStatuts vus: ${allStatuses.join(', ')}\n${live.length > 0 ? 'En direct:\n' + live.map(l => l.name).join('\n') : ''}\n\n👉 Détail complet dans la console (F12)`);
  } catch (e) {
    alert('❌ ESPN: ' + e.message + '\n\nEssai backup worldcup26.ir...');
    try {
      const r = await fetch(WC26_URL, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      alert('✅ WC26 backup OK!\nMatchs: ' + (d.games || d || []).length);
    } catch (e2) {
      alert('❌ Backup aussi échoué: ' + e2.message);
    }
  }
}

export { fetchESPN, fetchWC26, fetchMatchStats, fetchESPNForMatch, fetchAll, tryFetch, startAutoRefresh, stopAutoRefresh, getAutoActive, debugAPI };
