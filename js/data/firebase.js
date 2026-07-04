let _ready = false;
let _db = null;
let _refs = {};

const _fbCfg = {
  apiKey: "AIzaSyC9BwSbVmp2KamWmgXCFkoqzOQPuMO2oFE",
  authDomain: "cdm-2026-77589.firebaseapp.com",
  databaseURL: "https://cdm-2026-77589-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cdm-2026-77589",
  storageBucket: "cdm-2026-77589.firebasestorage.app"
};

export function isReady() { return _ready; }

export function getRef(name) { return _refs[name]; }

export async function init() {
  if (_ready) return;
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
    s.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js';
      s2.onload = () => {
        firebase.initializeApp(_fbCfg);
        _db = firebase.database();
        _refs = {
          rs: _db.ref('rs'),
          me: _db.ref('me'),
          ms: _db.ref('ms'),
          ae: _db.ref('ae'),
          live: _db.ref('live')
        };
        _ready = true;
        resolve();
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  });
}

export function saveRS(data) {
  try { localStorage.setItem('cdm26_rs', JSON.stringify(data)); } catch (e) {}
  if (_ready && _refs.rs) {
    const clean = JSON.parse(JSON.stringify(data));
    delete clean[81]; delete clean[75]; delete clean[76];
    _refs.rs.set(clean).catch(e => console.warn('FB write RS:', e));
  }
}

export function saveME(data) {
  try { localStorage.setItem('cdm26_me', JSON.stringify(data)); } catch (e) {}
  if (_ready && _refs.me) {
    const clean = JSON.parse(JSON.stringify(data));
    _refs.me.set(clean).catch(e => console.warn('FB write ME:', e));
  }
}

export function saveAE(data) {
  try { localStorage.setItem('cdm26_ae', JSON.stringify(data)); } catch (e) {}
  if (_ready && _refs.ae) {
    const clean = JSON.parse(JSON.stringify(data));
    _refs.ae.set(clean).catch(e => console.warn('FB write AE:', e));
  }
}

export function saveLive(data) {
  if (_ready && _refs.live) {
    const clean = JSON.parse(JSON.stringify(data));
    _refs.live.set(clean).catch(e => console.warn('FB write LIVE:', e));
  }
}

export function loadRS() {
  try { const v = localStorage.getItem('cdm26_rs'); return v ? JSON.parse(v) : {}; } catch (e) { return {}; }
}

export function loadME() {
  try { const v = localStorage.getItem('cdm26_me'); return v ? JSON.parse(v) : {}; } catch (e) { return {}; }
}

export function loadAE() {
  try { const v = localStorage.getItem('cdm26_ae'); return v ? JSON.parse(v) : {}; } catch (e) { return {}; }
}

export function loadMS() {
  try { const v = localStorage.getItem('cdm26ms'); return v ? JSON.parse(v) : {}; } catch (e) { return {}; }
}
