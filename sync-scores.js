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
const MATCHES = [
  [73,"Afrique du Sud","Canada"],
  [74,"Brésil","Japon"],
  [75,"Allemagne","Paraguay"],
  [76,"Pays-Bas","Maroc"],
  [77,"Côte d'ivoire","Norvège"],
  [78,"France","Suède"],
  [79,"Mexique","Équateur"],
  [80,"Angleterre","RD Congo"],
  [81,"Belgique","Sénégal"],
  [82,"USA","Bosnie-herzégovine"],
  [83,"Espagne","Autriche"],
  [84,"Portugal","Croatie"],
  [85,"Suisse","Algérie"],
  [86,"Australie","Égypte"],
  [87,"Argentine","Cap-Vert"],
  [88,"Colombie","Ghana"]
];

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
  'DR Congo':'RD Congo','Congo, DR':'RD Congo','Congo DR':'RD Congo','Democratic Republic of the Congo':'RD Congo','DR Congo (DRC)':'RD Congo',
  'Croatia':'Croatie','Ghana':'Ghana','Panama':'Panama','Uzbekistan':'Ouzbékistan',
  'Colombia':'Colombie','Ecuador':'Équateur',
  "Côte d'Ivoire":"Côte d'ivoire","Cote d'Ivoire":"Côte d'ivoire",'Ivory Coast':"Côte d'ivoire",
};

// Normalise une chaîne pour comparaison souple : retire accents, met en
// minuscules, harmonise tirets/virgules/espaces multiples en un seul espace.
function looseKey(s) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toLowerCase()
    .replace(/['']/g, '')    // apostrophes (droites et typographiques) → rien
    .replace(/[-,]/g, ' ')   // tirets et virgules → espace
    .replace(/\s+/g, ' ')    // espaces multiples → un seul
    .trim();
}

// Index inversé : clé "souple" → nom français cible, construit une seule
// fois à partir de NAME_MAP + des noms français eux-mêmes (pour le cas où
// ESPN renvoie déjà un nom proche du nom français, juste sans accents).
const LOOSE_INDEX = {};
for (const [k, v] of Object.entries(NAME_MAP)) {
  LOOSE_INDEX[looseKey(k)] = v;
}
MATCHES.flatMap(m => [m[1], m[2]]).forEach(name => {
  LOOSE_INDEX[looseKey(name)] = name;
});

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
  // Dernier recours : comparaison tolérante (sans accents, tirets, casse).
  // Couvre les variantes ESPN imprévues (ex: "Congo DR" vs "DR Congo",
  // "Bosnia Herzegovina" sans tiret, "Cote dIvoire" sans apostrophe, etc.)
  const loose = looseKey(s);
  if (LOOSE_INDEX[loose]) return LOOSE_INDEX[loose];
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
            // Le 2e athlète impliqué dans un but est généralement le passeur
            // décisif (sauf pour un but contre son camp, où il n'y en a pas).
            const assist = (d.scoringPlay && !d.ownGoal)
              ? (d.athletesInvolved?.[1]?.displayName || '')
              : '';
            if (d.scoringPlay) {
              if (d.ownGoal) aeParsed.push({ type: 'owngoal', min, side, player });
              else if (d.penaltyKick) aeParsed.push({ type: 'pen', min, side, player, assist });
              else aeParsed.push({ type: 'goal', min, side, player, assist });
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
