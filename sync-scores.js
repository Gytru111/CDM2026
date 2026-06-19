/**
 * CDM 2026 — Sync automatique des scores ESPN → Firebase
 * Tourne via GitHub Actions toutes les heures (et toutes les 5min pendant les matchs)
 */

const https = require('https');

// ─── CONFIG FIREBASE ───────────────────────────────────────────────
const FB_DB_URL = 'https://cdm-2026-77589-default-rtdb.europe-west1.firebasedatabase.app';
// La clé Firebase DB secret doit être dans les secrets GitHub : FIREBASE_DB_SECRET
const FB_SECRET = process.env.FIREBASE_DB_SECRET;

if (!FB_SECRET) {
  console.error('❌ FIREBASE_DB_SECRET manquant dans les variables d\'environnement');
  console.error('   → Ajouter le secret dans GitHub : Settings > Secrets > Actions');
  process.exit(1);
}

// ─── MATCHS CDM 2026 (correspondance ID interne ↔ équipes) ─────────
const MATCHES = [[1,"Mexique","Afrique du Sud"],[2,"Corée du Sud","République tchèque"],[3,"Canada","Bosnie-herzégovine"],[4,"USA","Paraguay"],[5,"Qatar","Suisse"],[6,"Brésil","Maroc"],[7,"Haïti","Écosse"],[8,"Australie","Turquie"],[9,"Allemagne","Curaçao"],[10,"Pays-Bas","Japon"],[11,"Côte d'ivoire","Équateur"],[12,"Suède","Tunisie"],[13,"Espagne","Cap-Vert"],[14,"Belgique","Égypte"],[15,"Arabie Saoudite","Uruguay"],[16,"Iran","Nouvelle-Zélande"],[17,"France","Sénégal"],[18,"Irak","Norvège"],[19,"Argentine","Algérie"],[20,"Autriche","Jordanie"],[21,"Portugal","RD Congo"],[22,"Angleterre","Croatie"],[23,"Ghana","Panama"],[24,"Ouzbékistan","Colombie"],[25,"République tchèque","Afrique du Sud"],[26,"Suisse","Bosnie-herzégovine"],[27,"Canada","Qatar"],[28,"Mexique","Corée du Sud"],[29,"USA","Australie"],[30,"Écosse","Maroc"],[31,"Brésil","Haïti"],[32,"Turquie","Paraguay"],[33,"Pays-Bas","Suède"],[34,"Allemagne","Côte d'ivoire"],[35,"Équateur","Curaçao"],[36,"Tunisie","Japon"],[37,"Espagne","Arabie Saoudite"],[38,"Belgique","Iran"],[39,"Uruguay","Cap-Vert"],[40,"Nouvelle-Zélande","Égypte"],[41,"Argentine","Autriche"],[42,"France","Irak"],[43,"Norvège","Sénégal"],[44,"Jordanie","Algérie"],[45,"Portugal","Ouzbékistan"],[46,"Angleterre","Ghana"],[47,"Panama","Croatie"],[48,"Colombie","RD Congo"],[49,"Suisse","Canada"],[50,"Bosnie-herzégovine","Qatar"],[51,"Écosse","Brésil"],[52,"Maroc","Haïti"],[53,"République tchèque","Mexique"],[54,"Afrique du Sud","Corée du Sud"],[55,"Équateur","Allemagne"],[56,"Curaçao","Côte d'ivoire"],[57,"Japon","Suède"],[58,"Tunisie","Pays-Bas"],[59,"Turquie","USA"],[60,"Paraguay","Australie"],[61,"Norvège","France"],[62,"Sénégal","Irak"],[63,"Cap-Vert","Arabie Saoudite"],[64,"Uruguay","Espagne"],[65,"Égypte","Iran"],[66,"Nouvelle-Zélande","Belgique"],[67,"Panama","Angleterre"],[68,"Croatie","Ghana"],[69,"Colombie","Portugal"],[70,"RD Congo","Ouzbékistan"],[71,"Algérie","Autriche"],[72,"Jordanie","Argentine"]];

// ─── CORRESPONDANCE NOMS ESPN → NOMS FRANÇAIS ──────────────────────
const NAME_MAP = {
  'Mexico':'Mexique','South Africa':'Afrique du Sud',
  'South Korea':'Corée du Sud','Korea Republic':'Corée du Sud','Korea, South':'Corée du Sud','Republic of Korea':'Corée du Sud',
  'Czech Republic':'République tchèque','Czechia':'République tchèque',
  'Canada':'Canada','Bosnia and Herzegovina':'Bosnie-herzégovine','Bosnia-Herzegovina':'Bosnie-herzégovine','Bosnia & Herzegovina':'Bosnie-herzégovine',
  'Qatar':'Qatar','Switzerland':'Suisse','USA':'USA','United States':'USA','United States of America':'USA',
  'Paraguay':'Paraguay','Australia':'Australie','Turkey':'Turquie','Türkiye':'Turquie','Turkiye':'Turquie',
  'Brazil':'Brésil','Morocco':'Maroc','Haiti':'Haïti','Scotland':'Écosse',
  'Germany':'Allemagne','Curaçao':'Curaçao','Curacao':'Curaçao',
  'Netherlands':'Pays-Bas','Japan':'Japon','Sweden':'Suède','Tunisia':'Tunisie',
  'Spain':'Espagne','Cape Verde':'Cap-Vert','Cabo Verde':'Cap-Vert',
  'Saudi Arabia':'Arabie Saoudite','Uruguay':'Uruguay',
  'Belgium':'Belgique','Egypt':'Égypte',
  'Iran':'Iran','IR Iran':'Iran',
  'New Zealand':'Nouvelle-Zélande',
  'France':'France','Senegal':'Sénégal','Iraq':'Irak','Norway':'Norvège',
  'Argentina':'Argentine','Algeria':'Algérie','Austria':'Autriche','Jordan':'Jordanie',
  'Portugal':'Portugal','England':'Angleterre',
  'DR Congo':'RD Congo','Congo, DR':'RD Congo','Democratic Republic of the Congo':'RD Congo',
  'Croatia':'Croatie','Ghana':'Ghana','Panama':'Panama','Uzbekistan':'Ouzbékistan',
  'Colombia':'Colombie','Ecuador':'Équateur',
  "Côte d'Ivoire":"Côte d'ivoire","Cote d'Ivoire":"Côte d'ivoire",'Ivory Coast':"Côte d'ivoire",
};

function normName(s) {
  if (!s) return '';
  s = s.trim();
  if (NAME_MAP[s]) return NAME_MAP[s];
  const lower = s.toLowerCase();
  for (const [k, v] of Object.entries(NAME_MAP)) {
    if (lower === k.toLowerCase()) return v;
  }
  // Vérifier si c'est déjà un nom français
  const allTeams = new Set(MATCHES.flatMap(m => [m[1], m[2]]));
  if (allTeams.has(s)) return s;
  return s;
}

// ─── UTILS HTTP ─────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'CDM2026-Sync/1.0' },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function firebasePut(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(`${FB_DB_URL}/${path}.json?auth=${FB_SECRET}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data || 'null'));
        else reject(new Error(`Firebase PUT ${path} → HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Firebase timeout')); });
    req.write(body);
    req.end();
  });
}

function firebaseGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${FB_DB_URL}/${path}.json?auth=${FB_SECRET}`;
    fetchJSON(url).then(resolve).catch(reject);
  });
}

// ─── FETCH ESPN SCOREBOARD ──────────────────────────────────────────
async function fetchESPN() {
  // IMPORTANT: ESPN exige le format YYYYMMDD-YYYYMMDD pour une plage de dates.
  // 'dates=2026' seul n'est pas valide et ne renvoie pas les bons matchs/détails.
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300';
  console.log('📡 Fetching ESPN scoreboard...');
  const data = await fetchJSON(url);
  const events = data.events || [];

  const DONE = ['STATUS_FULL_TIME', 'STATUS_FINAL'];
  const LIVE = ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME'];

  const updates = {};
  const eventMap = {}; // matchId → ESPN eventId (pour les détails buts)
  let liveCount = 0;

  for (const e of events) {
    const comp = e.competitions?.[0];
    if (!comp) continue;
    const status = comp.status?.type?.name;
    if (![...DONE, ...LIVE].includes(status)) continue;

    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    if (!home || !away) continue;

    const hn = normName(home.team?.displayName || home.team?.name || '');
    const an = normName(away.team?.displayName || away.team?.name || '');
    const gh = parseInt(home.score) || 0;
    const ga = parseInt(away.score) || 0;

    let found = MATCHES.find(m => m[1] === hn && m[2] === an);
    let swapped = false;
    if (!found) { found = MATCHES.find(m => m[1] === an && m[2] === hn); swapped = true; }

    if (found) {
      const s0 = swapped ? ga : gh;
      const s1 = swapped ? gh : ga;
      updates[found[0]] = [s0, s1];
      eventMap[found[0]] = { eventId: e.id, status, isLive: LIVE.includes(status) };
      if (LIVE.includes(status)) liveCount++;

      // Extraire événements buts depuis comp.details
      const rawDetails = comp.details || [];
      if (rawDetails.length > 0) {
        const homeTeamId = home?.team?.id;
        const awayTeamId = away?.team?.id;
        if (homeTeamId && awayTeamId) {
          const aeParsed = [];
          for (const d of rawDetails) {
            const min = parseInt(d.clock?.displayValue) || 0;
            if (!min || !d.type?.text) continue;
            const isHome = d.team?.id === homeTeamId;
            const side = swapped ? (isHome ? 'a' : 'h') : (isHome ? 'h' : 'a');
            const player = d.athletesInvolved?.[0]?.displayName || '';
            if (d.scoringPlay) {
              if (d.ownGoal) aeParsed.push({ type: 'owngoal', min, side, player });
              else if (d.penaltyKick) aeParsed.push({ type: 'pen', min, side, player });
              else aeParsed.push({ type: 'goal', min, side, player });
            } else if (d.yellowCard) {
              aeParsed.push({ type: 'yellow', min, side, player });
            } else if (d.redCard) {
              aeParsed.push({ type: 'red', min, side, player });
            }
          }
          if (aeParsed.length > 0) {
            updates[`__ae_${found[0]}`] = aeParsed;
          }
        }
      }
    } else {
      console.warn(`  ⚠️  Pas de correspondance pour: "${hn}" vs "${an}" (${status})`);
    }
  }

  // Construire l'état live à partir de eventMap (true uniquement pour les matchs en cours)
  const liveState = {};
  Object.entries(eventMap).forEach(([matchId, info]) => {
    if (info.isLive) liveState[matchId] = true;
  });

  console.log(`  ✅ ESPN: ${Object.keys(updates).filter(k => !k.startsWith('__ae')).length} matchs terminés/en cours, ${liveCount} en direct`);
  return { updates, eventMap, liveState };
}

// ─── FETCH BACKUP worldcup26.ir ────────────────────────────────────
// Retourne { updates, liveState } pour pouvoir combler les trous laissés
// par un éventuel cache figé côté ESPN (statuts/scores non rafraîchis).
async function fetchWC26() {
  try {
    console.log('📡 Fetching backup worldcup26.ir...');
    const data = await fetchJSON('https://worldcup26.ir/get/games');
    const games = data.games || data || [];
    const updates = {};
    const liveState = {};
    for (const g of games) {
      if (!g.finished && !g.live) continue;
      const hn = normName(g.home_team?.name || g.homeTeam || '');
      const an = normName(g.away_team?.name || g.awayTeam || '');
      const gh = parseInt(g.home_score ?? g.homeScore) || 0;
      const ga = parseInt(g.away_score ?? g.awayScore) || 0;
      const found = MATCHES.find(m => m[1] === hn && m[2] === an);
      if (found) {
        updates[found[0]] = [gh, ga];
        if (g.live) liveState[found[0]] = true;
      }
    }
    console.log(`  ✅ WC26 backup: ${Object.keys(updates).length} matchs, ${Object.keys(liveState).length} en direct`);
    return { updates, liveState };
  } catch (e) {
    console.warn(`  ⚠️  WC26 backup échoué: ${e.message}`);
    return { updates: {}, liveState: {} };
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 CDM 2026 Sync — ${new Date().toISOString()}`);
  console.log('═'.repeat(50));

  // 1. Lire les scores actuels dans Firebase
  let currentRS = {};
  try {
    const fb = await firebaseGet('rs');
    if (fb) {
      for (const [k, v] of Object.entries(fb)) currentRS[+k] = v;
      console.log(`📖 Firebase: ${Object.keys(currentRS).length} scores existants`);
    }
  } catch (e) {
    console.warn('⚠️  Lecture Firebase échouée:', e.message);
  }

  // 2. Fetch ESPN (source principale)
  let newScores = { ...currentRS };
  let aeUpdates = {};
  let liveState = {};
  let espnMatchIds = new Set();

  try {
    const { updates, eventMap, liveState: ls } = await fetchESPN();
    liveState = ls || {};
    espnMatchIds = new Set(Object.keys(updates).filter(k => !k.startsWith('__ae_')).map(Number));
    let changed = 0;
    for (const [k, v] of Object.entries(updates)) {
      if (k.startsWith('__ae_')) {
        aeUpdates[k.replace('__ae_', '')] = v;
        continue;
      }
      const id = +k;
      const cur = newScores[id];
      if (!cur || cur[0] !== v[0] || cur[1] !== v[1]) {
        newScores[id] = v;
        changed++;
        console.log(`  🔄 Match #${id}: ${v[0]}-${v[1]}`);
      }
    }
    if (changed === 0) console.log('  ✓ Aucun changement de score (ESPN)');
  } catch (e) {
    console.warn('⚠️  ESPN échoué:', e.message);
  }

  // 2b. Fetch backup worldcup26.ir — toujours interrogé, en complément d'ESPN.
  //     Comble les trous si ESPN renvoie un cache figé (match absent ou
  //     statut/score non rafraîchi pour un match qu'on n'a pas vu chez ESPN).
  try {
    const { updates: backupUpdates, liveState: backupLive } = await fetchWC26();
    let backupChanged = 0;
    for (const [k, v] of Object.entries(backupUpdates)) {
      const id = +k;
      const cur = newScores[id];
      // On ne laisse le backup écraser que s'ESPN n'a rien dit sur ce match
      // (cache figé) OU si le score diffère de ce qu'on a déjà.
      if (!espnMatchIds.has(id) && (!cur || cur[0] !== v[0] || cur[1] !== v[1])) {
        newScores[id] = v;
        backupChanged++;
        console.log(`  🔄 [backup] Match #${id}: ${v[0]}-${v[1]}`);
      }
    }
    for (const [k, isLive] of Object.entries(backupLive)) {
      const id = +k;
      if (!espnMatchIds.has(id) && isLive) liveState[id] = true;
    }
    if (backupChanged === 0) console.log('  ✓ Aucun complément nécessaire depuis le backup');
  } catch (e) {
    console.warn('⚠️  Backup échoué:', e.message);
  }

  // 3. Écrire dans Firebase
  try {
    await firebasePut('rs', newScores);
    console.log(`✅ Firebase RS mis à jour (${Object.keys(newScores).length} scores)`);
  } catch (e) {
    console.error('❌ Écriture Firebase RS échouée:', e.message);
    process.exit(1);
  }

  // 4. Écrire les événements buts dans Firebase
  if (Object.keys(aeUpdates).length > 0) {
    try {
      // Lire AE existant pour merger
      let currentAE = {};
      try {
        const fbAE = await firebaseGet('ae');
        if (fbAE) for (const [k, v] of Object.entries(fbAE)) currentAE[+k] = v;
      } catch (_) {}

      for (const [matchId, events] of Object.entries(aeUpdates)) {
        currentAE[+matchId] = events;
      }
      await firebasePut('ae', currentAE);
      console.log(`✅ Firebase AE mis à jour (${Object.keys(aeUpdates).length} matchs avec événements)`);
    } catch (e) {
      console.warn('⚠️  Écriture Firebase AE échouée:', e.message);
    }
  }

  // 5. Écrire l'état "live" dans Firebase (toujours écrasé, reflète l'état ESPN actuel)
  try {
    await firebasePut('live', liveState);
    const liveIds = Object.keys(liveState);
    if (liveIds.length > 0) {
      console.log(`✅ Firebase LIVE mis à jour — match(s) en direct: ${liveIds.join(', ')}`);
    } else {
      console.log('✅ Firebase LIVE mis à jour — aucun match en direct actuellement');
    }
  } catch (e) {
    console.warn('⚠️  Écriture Firebase LIVE échouée:', e.message);
  }

  console.log('\n🏁 Sync terminé avec succès');
}

main().catch(e => {
  console.error('💥 Erreur fatale:', e);
  process.exit(1);
});
