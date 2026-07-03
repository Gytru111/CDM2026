/**
 * CDM 2026 — Sync automatique des scores ESPN → Firebase
 * Tourne via GitHub Actions toutes les heures (et toutes les 5min pendant les matchs)
 */

const https = require('https');

// ─── CONFIG FIREBASE ───────────────────────────────────────────────
const FB_DB_URL = 'https://cdm-2026-77589-default-rtdb.europe-west1.firebasedatabase.app';
const FB_SECRET = process.env.FIREBASE_DB_SECRET;

if (!FB_SECRET) {
  console.error('FIREBASE_DB_SECRET manquant dans les variables d\'environnement');
  process.exit(1);
}

// ─── DONNÉES DE LA COMPÉTITION ─────────────────────────────────────
const GROUPS={"A":{"teams":["Mexique","Corée du Sud","Afrique du Sud","République tchèque"],"matches":[1,2,25,28,53,54]},"B":{"teams":["Canada","Suisse","Qatar","Bosnie-herzégovine"],"matches":[3,5,26,27,49,50]},"C":{"teams":["Brésil","Maroc","Écosse","Haïti"],"matches":[6,7,30,31,51,52]},"D":{"teams":["USA","Australie","Paraguay","Turquie"],"matches":[4,8,29,32,59,60]},"E":{"teams":["Allemagne","Équateur","Côte d'ivoire","Curaçao"],"matches":[9,11,34,35,55,56]},"F":{"teams":["Pays-Bas","Japon","Tunisie","Suède"],"matches":[10,12,33,36,57,58]},"G":{"teams":["Belgique","Iran","Égypte","Nouvelle-Zélande"],"matches":[14,16,38,40,65,66]},"H":{"teams":["Espagne","Uruguay","Arabie Saoudite","Cap-Vert"],"matches":[13,15,37,39,63,64]},"I":{"teams":["France","Sénégal","Norvège","Irak"],"matches":[17,18,42,43,61,62]},"J":{"teams":["Argentine","Autriche","Algérie","Jordanie"],"matches":[19,20,41,44,71,72]},"K":{"teams":["Portugal","Colombie","Ouzbékistan","RD Congo"],"matches":[21,24,45,48,69,70]},"L":{"teams":["Angleterre","Croatie","Panama","Ghana"],"matches":[22,23,46,47,67,68]}};

const KO_MATCH_IDS=[73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104];

const R32_FIXED=[
  {id:73,t1:{type:'r',g:'A'},  t2:{type:'r',g:'B'}},
  {id:75,t1:{type:'w',g:'F'},  t2:{type:'r',g:'C'}},
  {id:76,t1:{type:'w',g:'C'},  t2:{type:'r',g:'F'}},
  {id:78,t1:{type:'r',g:'E'},  t2:{type:'r',g:'I'}},
  {id:83,t1:{type:'r',g:'K'}, t2:{type:'r',g:'L'}},
  {id:84,t1:{type:'w',g:'H'}, t2:{type:'r',g:'J'}},
  {id:86,t1:{type:'w',g:'J'}, t2:{type:'r',g:'H'}},
  {id:88,t1:{type:'r',g:'D'}, t2:{type:'r',g:'G'}},
];

const R32_THIRD=[
  {id:74,wGroup:'E'},
  {id:77,wGroup:'I'},
  {id:79,wGroup:'A'},
  {id:80,wGroup:'L'},
  {id:81,wGroup:'D'},
  {id:82,wGroup:'G'},
  {id:85,wGroup:'B'},
  {id:87,wGroup:'K'},
];

const ANNEX_C={"EFGHIJKL":"EJIFHGLK","DFGHIJKL":"HGIDJFLK","DEGHIJKL":"EJIDHGLK","DEFHIJKL":"EJIDHFLK","DEFGIJKL":"EGIDJFLK","DEFGHJKL":"EGJDHFLK","DEFGHIKL":"EGIDHFLK","DEFGHIJL":"EGJDHFLI","DEFGHIJK":"EGJDHFIK","CFGHIJKL":"HGICJFLK","CEGHIJKL":"EJICHGLK","CEFHIJKL":"EJICHFLK","CEFGIJKL":"EGICJFLK","CEFGHJKL":"EGJCHFLK","CEFGHIKL":"EGICHFLK","CEFGHIJL":"EGJCHFLI","CEFGHIJK":"EGJCHFIK","CDGHIJKL":"HGICJDLK","CDFHIJKL":"CJIDHFLK","CDFGIJKL":"CGIDJFLK","CDFGHJKL":"CGJDHFLK","CDFGHIKL":"CGIDHFLK","CDFGHIJL":"CGJDHFLI","CDFGHIJK":"CGJDHFIK","CDEHIJKL":"EJICHDLK","CDEGIJKL":"EGICJDLK","CDEGHJKL":"EGJCHDLK","CDEGHIKL":"EGICHDLK","CDEGHIJL":"EGJCHDLI","CDEGHIJK":"EGJCHDIK","CDEFIJKL":"CJEDIFLK","CDEFHJKL":"CJEDHFLK","CDEFHIKL":"CEIDHFLK","CDEFHIJL":"CJEDHFLI","CDEFHIJK":"CJEDHFIK","CDEFGJKL":"CGEDJFLK","CDEFGIKL":"CGEDIFLK","CDEFGIJL":"CGEDJFLI","CDEFGIJK":"CGEDJFIK","CDEFGHKL":"CGEDHFLK","CDEFGHJL":"CGJDHFLE","CDEFGHJK":"CGJDHFEK","CDEFGHIL":"CGEDHFLI","CDEFGHIK":"CGEDHFIK","CDEFGHIJ":"CGJDHFEI","BFGHIJKL":"HJBFIGLK","BEGHIJKL":"EJIBHGLK","BEFHIJKL":"EJBFIHLK","BEFGIJKL":"EJBFIGLK","BEFGHJKL":"EJBFHGLK","BEFGHIKL":"EGBFIHLK","BEFGHIJL":"EJBFHGLI","BEFGHIJK":"EJBFHGIK","BDGHIJKL":"HJBDIGLK","BDFHIJKL":"HJBDIFLK","BDFGIJKL":"IGBDJFLK","BDFGHJKL":"HGBDJFLK","BDFGHIKL":"HGBDIFLK","BDFGHIJL":"HGBDJFLI","BDFGHIJK":"HGBDJFIK","BDEHIJKL":"EJBDIHLK","BDEGIJKL":"EJBDIGLK","BDEGHJKL":"EJBDHGLK","BDEGHIKL":"EGBDIHLK","BDEGHIJL":"EJBDHGLI","BDEGHIJK":"EJBDHGIK","BDEFIJKL":"EJBDIFLK","BDEFHJKL":"EJBDHFLK","BDEFHIKL":"EIBDHFLK","BDEFHIJL":"EJBDHFLI","BDEFHIJK":"EJBDHFIK","BDEFGJKL":"EGBDJFLK","BDEFGIKL":"EGBDIFLK","BDEFGIJL":"EGBDJFLI","BDEFGIJK":"EGBDJFIK","BDEFGHKL":"EGBDHFLK","BDEFGHJL":"HGBDJFLE","BDEFGHJK":"HGBDJFEK","BDEFGHIL":"EGBDHFLI","BDEFGHIK":"EGBDHFIK","BDEFGHIJ":"HGBDJFEI","BCGHIJKL":"HJBCIGLK","BCFHIJKL":"HJBCIFLK","BCFGIJKL":"IGBCJFLK","BCFGHJKL":"HGBCJFLK","BCFGHIKL":"HGBCIFLK","BCFGHIJL":"HGBCJFLI","BCFGHIJK":"HGBCJFIK","BCEHIJKL":"EJBCIHLK","BCEGIJKL":"EJBCIGLK","BCEGHJKL":"EJBCHGLK","BCEGHIKL":"EGBCIHLK","BCEGHIJL":"EJBCHGLI","BCEGHIJK":"EJBCHGIK","BCEFIJKL":"EJBCIFLK","BCEFHJKL":"EJBCHFLK","BCEFHIKL":"EIBCHFLK","BCEFHIJL":"EJBCHFLI","BCEFHIJK":"EJBCHFIK","BCEFGJKL":"EGBCJFLK","BCEFGIKL":"EGBCIFLK","BCEFGIJL":"EGBCJFLI","BCEFGIJK":"EGBCJFIK","BCEFGHKL":"EGBCHFLK","BCEFGHJL":"HGBCJFLE","BCEFGHJK":"HGBCJFEK","BCEFGHIL":"EGBCHFLI","BCEFGHIK":"EGBCHFIK","BCEFGHIJ":"HGBCJFEI","BCDHIJKL":"HJBCIDLK","BCDGIJKL":"IGBCJDLK","BCDGHJKL":"HGBCJDLK","BCDGHIKL":"HGBCIDLK","BCDGHIJL":"HGBCJDLI","BCDGHIJK":"HGBCJDIK","BCDFIJKL":"CJBDIFLK","BCDFHJKL":"CJBDHFLK","BCDFHIKL":"CIBDHFLK","BCDFHIJL":"CJBDHFLI","BCDFHIJK":"CJBDHFIK","BCDFGJKL":"CGBDJFLK","BCDFGIKL":"CGBDIFLK","BCDFGIJL":"CGBDJFLI","BCDFGIJK":"CGBDJFIK","BCDFGHKL":"CGBDHFLK","BCDFGHJL":"CGBDHFLJ","BCDFGHJK":"HGBCJFDK","BCDFGHIL":"CGBDHFLI","BCDFGHIK":"CGBDHFIK","BCDFGHIJ":"HGBCJFDI","BCDEIJKL":"EJBCIDLK","BCDEHJKL":"EJBCHDLK","BCDEHIKL":"EIBCHDLK","BCDEHIJL":"EJBCHDLI","BCDEHIJK":"EJBCHDIK","BCDEGJKL":"EGBCJDLK","BCDEGIKL":"EGBCIDLK","BCDEGIJL":"EGBCJDLI","BCDEGIJK":"EGBCJDIK","BCDEGHKL":"EGBCHDLK","BCDEGHJL":"HGBCJDLE","BCDEGHJK":"HGBCJDEK","BCDEGHIL":"EGBCHDLI","BCDEGHIK":"EGBCHDIK","BCDEGHIJ":"HGBCJDEI","BCDEFJKL":"CJBDEFLK","BCDEFIKL":"CEBDIFLK","BCDEFIJL":"CJBDEFLI","BCDEFIJK":"CJBDEFIK","BCDEFHKL":"CEBDHFLK","BCDEFHJL":"CJBDHFLE","BCDEFHJK":"CJBDHFEK","BCDEFHIL":"CEBDHFLI","BCDEFHIK":"CEBDHFIK","BCDEFHIJ":"CJBDHFEI","BCDEFGKL":"CGBDEFLK","BCDEFGJL":"CGBDJFLE","BCDEFGJK":"CGBDJFEK","BCDEFGIL":"CGBDEFLI","BCDEFGIK":"CGBDEFIK","BCDEFGIJ":"CGBDJFEI","BCDEFGHL":"CGBDHFLE","BCDEFGHK":"CGBDHFEK","BCDEFGHJ":"HGBCJFDE","BCDEFGHI":"CGBDHFEI","AFGHIJKL":"HJIFAGLK","AEGHIJKL":"EJIAHGLK","AEFHIJKL":"EJIFAHLK","AEFGIJKL":"EJIFAGLK","AEFGHJKL":"EGJFAHLK","AEFGHIKL":"EGIFAHLK","AEFGHIJL":"EGJFAHLI","AEFGHIJK":"EGJFAHIK","ADGHIJKL":"HJIDAGLK","ADFHIJKL":"HJIDAFLK","ADFGIJKL":"IGJDAFLK","ADFGHJKL":"HGJDAFLK","ADFGHIKL":"HGIDAFLK","ADFGHIJL":"HGJDAFLI","ADFGHIJK":"HGJDAFIK","ADEHIJKL":"EJIDAHLK","ADEGIJKL":"EJIDAGLK","ADEGHJKL":"EGJDAHLK","ADEGHIKL":"EGIDAHLK","ADEGHIJL":"EGJDAHLI","ADEGHIJK":"EGJDAHIK","ADEFIJKL":"EJIDAFLK","ADEFHJKL":"HJEDAFLK","ADEFHIKL":"HEIDAFLK","ADEFHIJL":"HJEDAFLI","ADEFHIJK":"HJEDAFIK","ADEFGJKL":"EGJDAFLK","ADEFGIKL":"EGIDAFLK","ADEFGIJL":"EGJDAFLI","ADEFGIJK":"EGJDAFIK","ADEFGHKL":"HGEDAFLK","ADEFGHJL":"HGJDAFLE","ADEFGHJK":"HGJDAFEK","ADEFGHIL":"HGEDAFLI","ADEFGHIK":"HGEDAFIK","ADEFGHIJ":"HGJDAFEI","ACGHIJKL":"HJICAGLK","ACFHIJKL":"HJICAFLK","ACFGIJKL":"IGJCAFLK","ACFGHJKL":"HGJCAFLK","ACFGHIKL":"HGICAFLK","ACFGHIJL":"HGJCAFLI","ACFGHIJK":"HGJCAFIK","ACEHIJKL":"EJICAHLK","ACEGIJKL":"EJICAGLK","ACEGHJKL":"EGJCAHLK","ACEGHIKL":"EGICAHLK","ACEGHIJL":"EGJCAHLI","ACEGHIJK":"EGJCAHIK","ACEFIJKL":"EJICAFLK","ACEFHJKL":"HJECAFLK","ACEFHIKL":"HEICAFLK","ACEFHIJL":"HJECAFLI","ACEFHIJK":"HJECAFIK","ACEFGJKL":"EGJCAFLK","ACEFGIKL":"EGICAFLK","ACEFGIJL":"EGJCAFLI","ACEFGIJK":"EGJCAFIK","ACEFGHKL":"HGECAFLK","ACEFGHJL":"HGJCAFLE","ACEFGHJK":"HGJCAFEK","ACEFGHIL":"HGECAFLI","ACEFGHIK":"HGECAFIK","ACEFGHIJ":"HGJCAFEI","ACDHIJKL":"HJICADLK","ACDGIJKL":"IGJCADLK","ACDGHJKL":"HGJCADLK","ACDGHIKL":"HGICADLK","ACDGHIJL":"HGJCADLI","ACDGHIJK":"HGJCADIK","ACDFIJKL":"CJIDAFLK","ACDFHJKL":"HJFCADLK","ACDFHIKL":"HFICADLK","ACDFHIJL":"HJFCADLI","ACDFHIJK":"HJFCADIK","ACDFGJKL":"CGJDAFLK","ACDFGIKL":"CGIDAFLK","ACDFGIJL":"CGJDAFLI","ACDFGIJK":"CGJDAFIK","ACDFGHKL":"HGFCADLK","ACDFGHJL":"CGJDAFLH","ACDFGHJK":"HGJCAFDK","ACDFGHIL":"HGFCADLI","ACDFGHIK":"HGFCADIK","ACDFGHIJ":"HGJCAFDI","ACDEIJKL":"EJICADLK","ACDEHJKL":"HJECADLK","ACDEHIKL":"HEICADLK","ACDEHIJL":"HJECADLI","ACDEHIJK":"HJECADIK","ACDEGJKL":"EGJCADLK","ACDEGIKL":"EGICADLK","ACDEGIJL":"EGJCADLI","ACDEGIJK":"EGJCADIK","ACDEGHKL":"HGECADLK","ACDEGHJL":"HGJCADLE","ACDEGHJK":"HGJCADEK","ACDEGHIL":"HGECADLI","ACDEGHIK":"HGECADIK","ACDEGHIJ":"HGJCADEI","ACDEFJKL":"CJEDAFLK","ACDEFIKL":"CEIDAFLK","ACDEFIJL":"CJEDAFLI","ACDEFIJK":"CJEDAFIK","ACDEFHKL":"HEFCADLK","ACDEFHJL":"HJFCADLE","ACDEFHJK":"HJECAFDK","ACDEFHIL":"HEFCADLI","ACDEFHIK":"HEFCADIK","ACDEFHIJ":"HJECAFDI","ACDEFGKL":"CGEDAFLK","ACDEFGJL":"CGJDAFLE","ACDEFGJK":"CGJDAFEK","ACDEFGIL":"CGEDAFLI","ACDEFGIK":"CGEDAFIK","ACDEFGIJ":"CGJDAFEI","ACDEFGHL":"HGFCADLE","ACDEFGHK":"HGECAFDK","ACDEFGHJ":"HGJCAFDE","ACDEFGHI":"HGECAFDI","ABGHIJKL":"HJBAIGLK","ABFHIJKL":"HJBAIFLK","ABFGIJKL":"IJBFAGLK","ABFGHJKL":"HJBFAGLK","ABFGHIKL":"HGBAIFLK","ABFGHIJL":"HJBFAGLI","ABFGHIJK":"HJBFAGIK","ABEHIJKL":"EJBAIHLK","ABEGIJKL":"EJBAIGLK","ABEGHJKL":"EJBAHGLK","ABEGHIKL":"EGBAIHLK","ABEGHIJL":"EJBAHGLI","ABEGHIJK":"EJBAHGIK","ABEFIJKL":"EJBAIFLK","ABEFHJKL":"EJBFAHLK","ABEFHIKL":"EIBFAHLK","ABEFHIJL":"EJBFAHLI","ABEFHIJK":"EJBFAHIK","ABEFGJKL":"EJBFAGLK","ABEFGIKL":"EGBAIFLK","ABEFGIJL":"EJBFAGLI","ABEFGIJK":"EJBFAGIK","ABEFGHKL":"EGBFAHLK","ABEFGHJL":"HJBFAGLE","ABEFGHJK":"HJBFAGEK","ABEFGHIL":"EGBFAHLI","ABEFGHIK":"EGBFAHIK","ABEFGHIJ":"HJBFAGEI","ABDHIJKL":"IJBDAHLK","ABDGIJKL":"IJBDAGLK","ABDGHJKL":"HJBDAGLK","ABDGHIKL":"IGBDAHLK","ABDGHIJL":"HJBDAGLI","ABDGHIJK":"HJBDAGIK","ABDFIJKL":"IJBDAFLK","ABDFHJKL":"HJBDAFLK","ABDFHIKL":"HIBDAFLK","ABDFHIJL":"HJBDAFLI","ABDFHIJK":"HJBDAFIK","ABDFGJKL":"FJBDAGLK","ABDFGIKL":"IGBDAFLK","ABDFGIJL":"FJBDAGLI","ABDFGIJK":"FJBDAGIK","ABDFGHKL":"HGBDAFLK","ABDFGHJL":"HGBDAFLJ","ABDFGHJK":"HGBDAFJK","ABDFGHIL":"HGBDAFLI","ABDFGHIK":"HGBDAFIK","ABDFGHIJ":"HGBDAFIJ","ABDEIJKL":"EJBAIDLK","ABDEHJKL":"EJBDAHLK","ABDEHIKL":"EIBDAHLK","ABDEHIJL":"EJBDAHLI","ABDEHIJK":"EJBDAHIK","ABDEGJKL":"EJBDAGLK","ABDEGIKL":"EGBAIDLK","ABDEGIJL":"EJBDAGLI","ABDEGIJK":"EJBDAGIK","ABDEGHKL":"EGBDAHLK","ABDEGHJL":"HJBDAGLE","ABDEGHJK":"HJBDAGEK","ABDEGHIL":"EGBDAHLI","ABDEGHIK":"EGBDAHIK","ABDEGHIJ":"HJBDAGEI","ABDEFJKL":"EJBDAFLK","ABDEFIKL":"EIBDAFLK","ABDEFIJL":"EJBDAFLI","ABDEFIJK":"EJBDAFIK","ABDEFHKL":"HEBDAFLK","ABDEFHJL":"HJBDAFLE","ABDEFHJK":"HJBDAFEK","ABDEFHIL":"HEBDAFLI","ABDEFHIK":"HEBDAFIK","ABDEFHIJ":"HJBDAFEI","ABDEFGKL":"EGBDAFLK","ABDEFGJL":"EGBDAFLJ","ABDEFGJK":"EGBDAFJK","ABDEFGIL":"EGBDAFLI","ABDEFGIK":"EGBDAFIK","ABDEFGIJ":"EGBDAFIJ","ABDEFGHL":"HGBDAFLE","ABDEFGHK":"HGBDAFEK","ABDEFGHJ":"HGBDAFEJ","ABDEFGHI":"HGBDAFEI","ABCHIJKL":"IJBCAHLK","ABCGIJKL":"IJBCAGLK","ABCGHJKL":"HJBCAGLK","ABCGHIKL":"IGBCAHLK","ABCGHIJL":"HJBCAGLI","ABCGHIJK":"HJBCAGIK","ABCFIJKL":"IJBCAFLK","ABCFHJKL":"HJBCAFLK","ABCFHIKL":"HIBCAFLK","ABCFHIJL":"HJBCAFLI","ABCFHIJK":"HJBCAFIK","ABCFGJKL":"CJBFAGLK","ABCFGIKL":"IGBCAFLK","ABCFGIJL":"CJBFAGLI","ABCFGIJK":"CJBFAGIK","ABCFGHKL":"HGBCAFLK","ABCFGHJL":"HGBCAFLJ","ABCFGHJK":"HGBCAFJK","ABCFGHIL":"HGBCAFLI","ABCFGHIK":"HGBCAFIK","ABCFGHIJ":"HGBCAFIJ","ABCEIJKL":"EJBAICLK","ABCEHJKL":"EJBCAHLK","ABCEHIKL":"EIBCAHLK","ABCEHIJL":"EJBCAHLI","ABCEHIJK":"EJBCAHIK","ABCEGJKL":"EJBCAGLK","ABCEGIKL":"EGBAICLK","ABCEGIJL":"EJBCAGLI","ABCEGIJK":"EJBCAGIK","ABCEGHKL":"EGBCAHLK","ABCEGHJL":"HJBCAGLE","ABCEGHJK":"HJBCAGEK","ABCEGHIL":"EGBCAHLI","ABCEGHIK":"EGBCAHIK","ABCEGHIJ":"HJBCAGEI","ABCEFJKL":"EJBCAFLK","ABCEFIKL":"EIBCAFLK","ABCEFIJL":"EJBCAFLI","ABCEFIJK":"EJBCAFIK","ABCEFHKL":"HEBCAFLK","ABCEFHJL":"HJBCAFLE","ABCEFHJK":"HJBCAFEK","ABCEFHIL":"HEBCAFLI","ABCEFHIK":"HEBCAFIK","ABCEFHIJ":"HJBCAFEI","ABCEFGKL":"EGBCAFLK","ABCEFGJL":"EGBCAFLJ","ABCEFGJK":"EGBCAFJK","ABCEFGIL":"EGBCAFLI","ABCEFGIK":"EGBCAFIK","ABCEFGIJ":"EGBCAFIJ","ABCEFGHL":"HGBCAFLE","ABCEFGHK":"HGBCAFEK","ABCEFGHJ":"HGBCAFEJ","ABCEFGHI":"HGBCAFEI","ABCDIJKL":"IJBCADLK","ABCDHJKL":"HJBCADLK","ABCDHIKL":"HIBCADLK","ABCDHIJL":"HJBCADLI","ABCDHIJK":"HJBCADIK","ABCDGJKL":"CJBDAGLK","ABCDGIKL":"IGBCADLK","ABCDGIJL":"CJBDAGLI","ABCDGIJK":"CJBDAGIK","ABCDGHKL":"HGBCADLK","ABCDGHJL":"HGBCADLJ","ABCDGHJK":"HGBCADJK","ABCDGHIL":"HGBCADLI","ABCDGHIK":"HGBCADIK","ABCDGHIJ":"HGBCADIJ","ABCDFJKL":"CJBDAFLK","ABCDFIKL":"CIBDAFLK","ABCDFIJL":"CJBDAFLI","ABCDFIJK":"CJBDAFIK","ABCDFHKL":"HFBCADLK","ABCDFHJL":"CJBDAFLH","ABCDFHJK":"HJBCAFDK","ABCDFHIL":"HFBCADLI","ABCDFHIK":"HFBCADIK","ABCDFHIJ":"HJBCAFDI","ABCDFGKL":"CGBDAFLK","ABCDFGJL":"CGBDAFLJ","ABCDFGJK":"CGBDAFJK","ABCDFGIL":"CGBDAFLI","ABCDFGIK":"CGBDAFIK","ABCDFGIJ":"CGBDAFIJ","ABCDFGHL":"CGBDAFLH","ABCDFGHK":"HGBCAFDK","ABCDFGHJ":"HGBCAFDJ","ABCDFGHI":"HGBCAFDI","ABCDEJKL":"EJBCADLK","ABCDEIKL":"EIBCADLK","ABCDEIJL":"EJBCADLI","ABCDEIJK":"EJBCADIK","ABCDEHKL":"HEBCADLK","ABCDEHJL":"HJBCADLE","ABCDEHJK":"HJBCADEK","ABCDEHIL":"HEBCADLI","ABCDEHIK":"HEBCADIK","ABCDEHIJ":"HJBCADEI","ABCDEGKL":"EGBCADLK","ABCDEGJL":"EGBCADLJ","ABCDEGJK":"EGBCADJK","ABCDEGIL":"EGBCADLI","ABCDEGIK":"EGBCADIK","ABCDEGIJ":"EGBCADIJ","ABCDEGHL":"HGBCADLE","ABCDEGHK":"HGBCADEK","ABCDEGHJ":"HGBCADEJ","ABCDEGHI":"HGBCADEI","ABCDEFKL":"CEBDAFLK","ABCDEFJL":"CJBDAFLE","ABCDEFJK":"CJBDAFEK","ABCDEFIL":"CEBDAFLI","ABCDEFIK":"CEBDAFIK","ABCDEFIJ":"CJBDAFEI","ABCDEFHL":"HFBCADLE","ABCDEFHK":"HEBCAFDK","ABCDEFHJ":"HJBCAFDE","ABCDEFHI":"HEBCAFDI","ABCDEFGL":"CGBDAFLE","ABCDEFGK":"CGBDAFEK","ABCDEFGJ":"CGBDAFEJ","ABCDEFGI":"CGBDAFEI","ABCDEFGH":"HGBCAFDE"};

// Matchs du R32 avec équipes fixées (hardcodées comme dans le bracket)
const R32_MATCHES=[
  {id:73,t1:"Afrique du Sud",t2:"Canada"},
  {id:74,t1:"Brésil",t2:"Japon"},
  {id:75,t1:"Allemagne",t2:"Paraguay"},
  {id:76,t1:"Pays-Bas",t2:"Maroc"},
  {id:77,t1:"Côte d'ivoire",t2:"Norvège"},
  {id:78,t1:"France",t2:"Suède"},
  {id:79,t1:"Mexique",t2:"Équateur"},
  {id:80,t1:"Angleterre",t2:"RD Congo"},
  {id:81,t1:"Belgique",t2:"Sénégal"},
  {id:82,t1:"USA",t2:"Bosnie-herzégovine"},
  {id:83,t1:"Espagne",t2:"Autriche"},
  {id:84,t1:"Portugal",t2:"Croatie"},
  {id:85,t1:"Suisse",t2:"Algérie"},
  {id:86,t1:"Australie",t2:"Égypte"},
  {id:87,t1:"Argentine",t2:"Cap-Vert"},
  {id:88,t1:"Colombie",t2:"Ghana"},
];

// Structure du bracket pour les tours suivants : chaque entrée donne
// comment déterminer les équipes d'un match KO à partir des tours précédents.
// type='w' → vainqueur du match d'ID donné ; type='l' → perdant du match d'ID donné
const BRACKET_R16 = [
  {id:89, src:[{id:75,type:'w'},{id:78,type:'w'}]},
  {id:90, src:[{id:73,type:'w'},{id:76,type:'w'}]},
  {id:91, src:[{id:74,type:'w'},{id:77,type:'w'}]},
  {id:92, src:[{id:79,type:'w'},{id:80,type:'w'}]},
  {id:93, src:[{id:84,type:'w'},{id:83,type:'w'}]},
  {id:94, src:[{id:82,type:'w'},{id:81,type:'w'}]},
  {id:95, src:[{id:87,type:'w'},{id:86,type:'w'}]},
  {id:96, src:[{id:85,type:'w'},{id:88,type:'w'}]},
];
const BRACKET_QF = [
  {id:97,  src:[{id:89,type:'w'},{id:90,type:'w'}]},
  {id:99,  src:[{id:91,type:'w'},{id:92,type:'w'}]},
  {id:98,  src:[{id:93,type:'w'},{id:94,type:'w'}]},
  {id:100, src:[{id:95,type:'w'},{id:96,type:'w'}]},
];
const BRACKET_SF = [
  {id:101, src:[{id:97,type:'w'},{id:99,type:'w'}]},
  {id:102, src:[{id:98,type:'w'},{id:100,type:'w'}]},
];
const BRACKET_P3 = {id:103, src:[{id:101,type:'l'},{id:102,type:'l'}]};
const BRACKET_FIN = {id:104, src:[{id:101,type:'w'},{id:102,type:'w'}]};

// ─── FONCTIONS BRACKET ─────────────────────────────────────────────
function computeGroup(gname, rs) {
  const g = GROUPS[gname];
  const teams = {};
  g.teams.forEach(t => { teams[t] = { name: t, j: 0, v: 0, n: 0, d: 0, gf: 0, ga: 0, pts: 0 }; });
  g.matches.forEach(mid => {
    const m = MATCHES.find(x => x[0] === mid);
    const r = rs[mid];
    if (!r || r[0] === null || r[1] === null) return;
    const h = m[1], a = m[2];
    if (!teams[h] || !teams[a]) return;
    teams[h].j++; teams[a].j++;
    teams[h].gf += r[0]; teams[h].ga += r[1];
    teams[a].gf += r[1]; teams[a].ga += r[0];
    if (r[0] > r[1]) { teams[h].v++; teams[h].pts += 3; teams[a].d++; }
    else if (r[0] < r[1]) { teams[a].v++; teams[a].pts += 3; teams[h].d++; }
    else { teams[h].n++; teams[a].n++; teams[h].pts++; teams[a].pts++; }
  });
  return Object.values(teams).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

function isGroupComplete(gname, rs) {
  return GROUPS[gname].matches.every(mid => rs[mid] && rs[mid][0] !== null && rs[mid][1] !== null);
}

function computeThirdPlaceRanking(rs) {
  const thirds = [];
  Object.keys(GROUPS).forEach(gname => {
    const st = computeGroup(gname, rs);
    const t = st[2];
    if (!t) return;
    thirds.push({ group: gname, name: t.name, pts: t.pts, gf: t.gf, ga: t.ga, diff: t.gf - t.ga });
  });
  thirds.sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.gf - a.gf);
  return thirds;
}

function matchWinner(mid, rs) {
  const r = rs[mid];
  if (!r) return null;
  if (r[0] != null && r[1] != null) {
    if (r[0] > r[1]) return 't1';
    if (r[1] > r[0]) return 't2';
    if (r[2] != null && r[3] != null) {
      if (r[2] > r[3]) return 't1';
      if (r[3] > r[2]) return 't2';
    }
  }
  if (r[4] === 't1' || r[4] === 't2') return r[4];
  return null;
}

function matchLoser(mid, rs) {
  const w = matchWinner(mid, rs);
  if (!w) return null;
  return w === 't1' ? 't2' : 't1';
}

function resolveBracketSlot(src, matchTeams, rs) {
  const m = matchTeams[src.id];
  if (!m || !m.t1 || !m.t2) return null;
  if (src.type === 'w') {
    const w = matchWinner(src.id, rs);
    if (!w) return null;
    return w === 't1' ? m.t1 : m.t2;
  }
  if (src.type === 'l') {
    const l = matchLoser(src.id, rs);
    if (!l) return null;
    return l === 't1' ? m.t1 : m.t2;
  }
  return null;
}

function buildKOMatches(rs) {
  const matchTeams = {}; // id -> {t1, t2}

  // R32 : équipes connues (hardcodées)
  R32_MATCHES.forEach(m => { matchTeams[m.id] = { t1: m.t1, t2: m.t2 }; });

  // Résoudre R16, QF, SF, P3, Finale
  BRACKET_R16.forEach(def => {
    const t1 = resolveBracketSlot(def.src[0], matchTeams, rs);
    const t2 = resolveBracketSlot(def.src[1], matchTeams, rs);
    if (t1 && t2) matchTeams[def.id] = { t1, t2 };
  });

  BRACKET_QF.forEach(def => {
    const t1 = resolveBracketSlot(def.src[0], matchTeams, rs);
    const t2 = resolveBracketSlot(def.src[1], matchTeams, rs);
    if (t1 && t2) matchTeams[def.id] = { t1, t2 };
  });

  BRACKET_SF.forEach(def => {
    const t1 = resolveBracketSlot(def.src[0], matchTeams, rs);
    const t2 = resolveBracketSlot(def.src[1], matchTeams, rs);
    if (t1 && t2) matchTeams[def.id] = { t1, t2 };
  });

  // Petite finale
  const p3t1 = resolveBracketSlot(BRACKET_P3.src[0], matchTeams, rs);
  const p3t2 = resolveBracketSlot(BRACKET_P3.src[1], matchTeams, rs);
  if (p3t1 && p3t2) matchTeams[BRACKET_P3.id] = { t1: p3t1, t2: p3t2 };

  // Finale
  const fint1 = resolveBracketSlot(BRACKET_FIN.src[0], matchTeams, rs);
  const fint2 = resolveBracketSlot(BRACKET_FIN.src[1], matchTeams, rs);
  if (fint1 && fint2) matchTeams[BRACKET_FIN.id] = { t1: fint1, t2: fint2 };

  // Convertir en tableau [id, t1, t2] pour le matching
  const result = [];
  KO_MATCH_IDS.forEach(id => {
    const m = matchTeams[id];
    if (m && m.t1 && m.t2) result.push([id, m.t1, m.t2]);
  });
  return { arr: result, map: matchTeams };
}

// ─── MATCHS GROUPES (ID → équipes) ─────────────────────────────────
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
  'DR Congo':'RD Congo','Congo DR':'RD Congo','Congo, DR':'RD Congo','Democratic Republic of the Congo':'RD Congo','DRC':'RD Congo',
  'Croatia':'Croatie','Ghana':'Ghana','Panama':'Panama','Uzbekistan':'Ouzbékistan',
  'Colombia':'Colombie','Ecuador':'Équateur',
  "Côte d'Ivoire":"Côte d'ivoire","Cote d'Ivoire":"Côte d'ivoire","Cote d'ivoire":"Côte d'ivoire",'Ivory Coast':"Côte d'ivoire",
  'Cape Verde Islands':'Cap-Vert','Islamic Republic of Iran':'Iran',
  'Costa Rica':'Costa Rica','Serbia':'Serbie',
  'Trinidad and Tobago':'Trinité-et-Tobago',
  'United Arab Emirates':'Émirats arabes unis',
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
function findMatch(hn, an, koArr) {
  let found = MATCHES.find(m => m[1] === hn && m[2] === an);
  let swapped = false;
  if (!found) { found = MATCHES.find(m => m[1] === an && m[2] === hn); swapped = true; }
  if (!found && koArr && koArr.length) {
    found = koArr.find(m => m[1] === hn && m[2] === an);
    if (found) swapped = false;
    if (!found) { found = koArr.find(m => m[1] === an && m[2] === hn); swapped = true; }
  }
  return { match: found, swapped };
}

async function fetchESPN(koArr) {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300';
  console.log('📡 Fetching ESPN scoreboard...');
  const data = await fetchJSON(url);
  const events = data.events || [];

  const DONE = ['STATUS_FULL_TIME'];
  const LIVE = ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME'];

  const updates = {};
  const eventMap = {};
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

    const { match: found, swapped } = findMatch(hn, an, koArr);

    if (found) {
      const s0 = swapped ? ga : gh;
      const s1 = swapped ? gh : ga;
      updates[found[0]] = [s0, s1];
      eventMap[found[0]] = { eventId: e.id, status, isLive: LIVE.includes(status) };
      if (LIVE.includes(status)) liveCount++;

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
      const phase = (koArr && koArr.length) ? '(ni groupes, ni KO)' : '(ni groupes)';
      console.warn(`  ⚠️  Pas de correspondance pour: "${hn}" vs "${an}" (${status}) ${phase}`);
    }
  }

  const liveState = {};
  Object.entries(eventMap).forEach(([matchId, info]) => {
    if (info.isLive) liveState[matchId] = true;
  });

  console.log(`  ✅ ESPN: ${Object.keys(updates).filter(k => !k.startsWith('__ae')).length} matchs terminés/en cours, ${liveCount} en direct`);
  return { updates, eventMap, liveState };
}

// ─── FETCH BACKUP worldcup26.ir ────────────────────────────────────
async function fetchWC26(koArr) {
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
      const { match: found } = findMatch(hn, an, koArr);
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

  // Forcer les résultats des matchs KO connus (penalties, etc.)
  // M75 Allemagne-Paraguay → Paraguay (t2) gagne TAB
  currentRS[75] = [1, 1, null, null, 't2'];
  // M76 Pays-Bas-Maroc → Maroc (t2) gagne TAB
  currentRS[76] = [1, 1, null, null, 't2'];
  // M86 Australie-Égypte → Égypte (t2) gagne TAB
  currentRS[86] = [1, 1, null, null, 't2'];
  // M81 Belgique-Sénégal → Belgique (t1) qualifiée
  if (!currentRS[81] || (currentRS[81][0] === null && currentRS[81][1] === null)) {
    currentRS[81] = [null, null, null, null, 't1'];
  }

  // Construire les matchs KO à partir des résultats de groupes connus
  const koResult = buildKOMatches(currentRS);
  const koArr = koResult.arr;
  if (koArr.length > 0) {
    console.log(`  🏆 KO matches résolus: ${koArr.length} (IDs: ${koArr.map(m => m[0]).join(',')})`);
  } else {
    console.log('  ⏳ Aucun match KO résolu pour le moment');
  }

  // 2. Fetch ESPN (source principale)
  let newScores = { ...currentRS };
  let aeUpdates = {};
  let liveState = {};
  let espnMatchIds = new Set();

  try {
    const { updates, eventMap, liveState: ls } = await fetchESPN(koArr);
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

  // 2b. Fetch backup worldcup26.ir
  try {
    const { updates: backupUpdates, liveState: backupLive } = await fetchWC26(koArr);
    let backupChanged = 0;
    for (const [k, v] of Object.entries(backupUpdates)) {
      const id = +k;
      const cur = newScores[id];
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

  // Recalculer les matchs KO maintenant que newScores peut avoir des résultats
  // R32 supplémentaires — utile pour la prochaine exécution (mais on le
  // stocke aussi dans Firebase pour le client)
  const updatedKoResult = buildKOMatches(newScores);
  const newKoTeams = {};
  Object.entries(updatedKoResult.map).forEach(([id, val]) => {
    if (val.t1 && val.t2) newKoTeams[+id] = [val.t1, val.t2];
  });
  if (Object.keys(newKoTeams).length > 0) {
    try {
      await firebasePut('ko', newKoTeams);
      console.log(`✅ Firebase KO teams mis à jour (${Object.keys(newKoTeams).length} matchs)`);
    } catch (e) {
      console.warn('⚠️  Écriture Firebase KO échouée:', e.message);
    }
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

  // 5. Écrire l'état "live"
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
