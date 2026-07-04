export const ADMIN_PWD='cdm2026';
export const PLAYERS=["Arthur","Eddy","Nathan","Jonathan","Thomas","Mike","Greg","Jérôme"];
export const AVATARS=["🐒","🤡","🤸","💜","🦍","😤","⚔️","🛡️"];
export const COLORS=["#f5a623","#ff4d6d","#4f8ef7","#9333ea","#0fd990","#fb923c","#e879f9","#38bdf8"];
export const PLAYER_PHOTOS=[];
export const PLAYER_PHRASES={};
export const PLAYER_FAV_TEAM=["Belgique","Belgique","Belgique","Belgique","Portugal","France","Curaçao","Belgique"];

export function avatarHTML(pi){
  return PLAYER_PHOTOS[pi]?`<img src="${PLAYER_PHOTOS[pi]}" alt="${PLAYERS[pi]}">`:AVATARS[pi];
}

export const FLAGS={"Mexique":"🇲🇽","Afrique du Sud":"🇿🇦","Corée du Sud":"🇰🇷","République tchèque":"🇨🇿","Canada":"🇨🇦","Bosnie-herzégovine":"🇧🇦","États-Unis":"🇺🇸","USA":"🇺🇸","Paraguay":"🇵🇾","Qatar":"🇶🇦","Suisse":"🇨🇭","Brésil":"🇧🇷","Maroc":"🇲🇦","Haïti":"🇭🇹","Écosse":"🏴","Australie":"🇦🇺","Turquie":"🇹🇷","Allemagne":"🇩🇪","Curaçao":"🇨🇼","Pays-Bas":"🇳🇱","Japon":"🇯🇵","Côte d'ivoire":"🇨🇮","Équateur":"🇪🇨","Suède":"🇸🇪","Tunisie":"🇹🇳","Espagne":"🇪🇸","Cap-Vert":"🇨🇻","Belgique":"🇧🇪","Égypte":"🇪🇬","Arabie Saoudite":"🇸🇦","Uruguay":"🇺🇾","Iran":"🇮🇷","Nouvelle-Zélande":"🇳🇿","France":"🇫🇷","Sénégal":"🇸🇳","Irak":"🇮🇶","Norvège":"🇳🇴","Argentine":"🇦🇷","Algérie":"🇩🇿","Autriche":"🇦🇹","Jordanie":"🇯🇴","Portugal":"🇵🇹","RD Congo":"🇨🇩","Angleterre":"🏴","Croatie":"🇭🇷","Ghana":"🇬🇭","Panama":"🇵🇦","Ouzbékistan":"🇺🇿","Colombie":"🇨🇴"};
export const FCODES={"Mexique":"mx","Afrique du Sud":"za","Corée du Sud":"kr","République tchèque":"cz","Canada":"ca","Bosnie-herzégovine":"ba","États-Unis":"us","USA":"us","Paraguay":"py","Qatar":"qa","Suisse":"ch","Brésil":"br","Maroc":"ma","Haïti":"ht","Écosse":"gb-sct","Australie":"au","Turquie":"tr","Allemagne":"de","Curaçao":"cw","Pays-Bas":"nl","Japon":"jp","Côte d'ivoire":"ci","Équateur":"ec","Suède":"se","Tunisie":"tn","Espagne":"es","Cap-Vert":"cv","Belgique":"be","Égypte":"eg","Arabie Saoudite":"sa","Uruguay":"uy","Iran":"ir","Nouvelle-Zélande":"nz","France":"fr","Sénégal":"sn","Irak":"iq","Norvège":"no","Argentine":"ar","Algérie":"dz","Autriche":"at","Jordanie":"jo","Portugal":"pt","RD Congo":"cd","Angleterre":"gb-eng","Croatie":"hr","Ghana":"gh","Panama":"pa","Ouzbékistan":"uz","Colombie":"co"};

export const GROUPS={"A":{"teams":["Mexique","Corée du Sud","Afrique du Sud","République tchèque"],"matches":[1,2,25,28,53,54]},"B":{"teams":["Canada","Suisse","Qatar","Bosnie-herzégovine"],"matches":[3,5,26,27,49,50]},"C":{"teams":["Brésil","Maroc","Écosse","Haïti"],"matches":[6,7,30,31,51,52]},"D":{"teams":["USA","Australie","Paraguay","Turquie"],"matches":[4,8,29,32,59,60]},"E":{"teams":["Allemagne","Équateur","Côte d'ivoire","Curaçao"],"matches":[9,11,34,35,55,56]},"F":{"teams":["Pays-Bas","Japon","Tunisie","Suède"],"matches":[10,12,33,36,57,58]},"G":{"teams":["Belgique","Iran","Égypte","Nouvelle-Zélande"],"matches":[14,16,38,40,65,66]},"H":{"teams":["Espagne","Uruguay","Arabie Saoudite","Cap-Vert"],"matches":[13,15,37,39,63,64]},"I":{"teams":["France","Sénégal","Norvège","Irak"],"matches":[17,18,42,43,61,62]},"J":{"teams":["Argentine","Autriche","Algérie","Jordanie"],"matches":[19,20,41,44,71,72]},"K":{"teams":["Portugal","Colombie","Ouzbékistan","RD Congo"],"matches":[21,24,45,48,69,70]},"L":{"teams":["Angleterre","Croatie","Panama","Ghana"],"matches":[22,23,46,47,67,68]}};

export const MATCHES=[];

export const MOIS_FR={'janv':1,'jan':1,'fevr':2,'fev':2,'mars':3,'avr':4,'mai':5,'juin':6,'juil':7,'aout':8,'sept':9,'oct':10,'nov':11,'dec':12};

export function matchDateToESPN(dateStr){
  const parts=(dateStr||'').split('-');
  if(parts.length<2)return null;
  const day=parseInt(parts[0]);
  const moisRaw=parts[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let month=null;
  for(const[k,v]of Object.entries(MOIS_FR)){
    if(moisRaw.startsWith(k)){month=v;break;}
  }
  if(!day||!month)return null;
  return `2026${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`;
}

export function matchESPNDates(m){
  const base=matchDateToESPN(m[1]);
  if(!base)return[];
  const d=new Date(`${base.slice(0,4)}-${base.slice(4,6)}-${base.slice(6,8)}T00:00:00Z`);
  const fmt=dt=>`${dt.getUTCFullYear()}${String(dt.getUTCMonth()+1).padStart(2,'0')}${String(dt.getUTCDate()).padStart(2,'0')}`;
  return[fmt(new Date(d.getTime()-86400000)),fmt(d),fmt(new Date(d.getTime()+86400000))];
}

export function normName(s){
  if(!s)return'';
  let n=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const extra={'u.s.':'usa','united states':'usa','korea republic':'corée du sud',"côte d'ivoire":'côte d\'ivoire','bosnia-herzegovina':'bosnie-herzégovine','türkiye':'turquie','czechia':'république tchèque','czech republic':'république tchèque'};
  return extra[n]||n;
}

export const KO_SCHEDULE={};
export const KO_MATCH_IDS=[];

export function koDateTimeMs(id){
  const s=KO_SCHEDULE[id];
  if(!s)return Infinity;
  const d=s.date.split('-');
  const h=s.time.match(/(\d+)h(\d+)/);
  const monthMap={juin:6,juillet:7};
  return new Date(2026,monthMap[d[1]]-1,parseInt(d[0]),h?parseInt(h[1]):0,h?parseInt(h[2])||0:0).getTime();
}

export function koSortedIds(ids){
  return[...ids].sort((a,b)=>koDateTimeMs(a)-koDateTimeMs(b));
}

export function frDateTimeMs(dateStr,timeStr){
  const d=dateStr.split('-');
  const h=timeStr.match(/(\d+)h(\d+)/);
  const monthMap={juin:6,juillet:7};
  return new Date(2026,monthMap[d[1]]-1,parseInt(d[0]),h?parseInt(h[1]):0,h?parseInt(h[2])||0:0).getTime();
}

export function hasKickedOff(dateStr,timeStr){
  return frDateTimeMs(dateStr,timeStr)<Date.now();
}

export function buildKoPseudoMatches(){
  return KO_MATCH_IDS.map(id=>{
    const s=KO_SCHEDULE[id];
    return[id,s.date,s.time,'TBD','TBD',[[null,null],[null,null],[null,null],[null,null],[null,null],[null,null],[null,null],[null,null]]];
  });
}

export function fl(country){
  return FCODES[country]?`<span class="tf fi fi-${FCODES[country]}"></span>`:'';
}

export function cleanCountryName(name){
  if(name==='États-Unis'||name==='USA')return'USA';
  if(name==='Angleterre')return'Angleterre';
  if(name==='Écosse')return'Écosse';
  return name;
}

export const ESPN_URL='https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300';
export const WC26_URL='https://worldcup26.ir/get/games';
