import { startExperience, showTab, renderClassement, toggleTheme, renderAll, renderMatchs, loginAs, loginAsAdmin, tryAdmin, loginBack, enterGuest, switchMode, confirmPseudo, closePnInfo, openMM, closeMM, saveM, saveAll, markD, filterP, pnFilter, selectGrp, openPC, closePC, openPhotoLB, closePhotoLB, exportGuest, clearLogs, renderLogs, renderTableau, renderGroups, renderBracket, renderPronostics, filterS, RS, ME, AE, LIVE, toast, saveRS, saveAE, saveLive } from './app.js';
import { init3D, buildBallTexture } from './three/scene.js';
import { initLenis, wrapShowTab, initSectionAnims, initScrollTriggers, initHorizontalScroll, initMorphing, initBracketAnim, initMagnetic, init3DTilt } from './animations/scroll.js';
import { initLoading, initCursor, initNoise, initMicroInteractions, initRipple, initDynamicShadow, initCounters, initTooltips, initTextScramble, initParticleBurst, initSoundEffects, initScrollTop, initImageReveal } from './animations/micro.js';
import { tryFetch as apiTryFetch, debugAPI, fetchESPNForMatch, startAutoRefresh, stopAutoRefresh } from './data/api.js';

// ── Expose window globals for onclick handlers + api.js access ──
Object.assign(window, {
  showTab, renderClassement, toggleTheme, renderAll, renderMatchs,
  loginAs, loginAsAdmin, tryAdmin, loginBack, enterGuest, switchMode,
  confirmPseudo, closePnInfo, openMM, closeMM, saveM, saveAll, markD,
  filterP, pnFilter, selectGrp, openPC, closePC, openPhotoLB, closePhotoLB,
  exportGuest, clearLogs, renderLogs, renderTableau, renderGroups,
  renderBracket, renderPronostics, filterS,
  tryFetch: apiTryFetch, debugAPI,
  fetchESPNForMatch, startAutoRefresh, stopAutoRefresh, autoFetchStats: fetchESPNForMatch,
  RS, ME, AE, LIVE, toast, saveRS, saveAE, saveLive
});

// ── Wire scene tab transitions ──
wrapShowTab();

// ── Bootstrap ──
function init() {
  if (typeof gsap !== 'undefined') {
    initLoading(() => startExperience({
      init3D, initLenis, initCursor, initNoise, initSectionAnims,
      initMicroInteractions, initScrollTriggers, initMagnetic, init3DTilt,
      initHorizontalScroll, initMorphing, initBracketAnim, initRipple,
      initDynamicShadow, initCounters, initTooltips, initTextScramble,
      initParticleBurst, initSoundEffects, initScrollTop, initImageReveal
    }));
  } else {
    startExperience({
      init3D, initLenis, initCursor, initNoise, initSectionAnims,
      initMicroInteractions, initScrollTriggers, initMagnetic, init3DTilt,
      initHorizontalScroll, initMorphing, initBracketAnim, initRipple,
      initDynamicShadow, initCounters, initTooltips, initTextScramble,
      initParticleBurst, initSoundEffects, initScrollTop, initImageReveal
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
