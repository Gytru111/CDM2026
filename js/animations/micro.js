import { getLenis } from './scroll.js';

// ── Loading Screen ──
export function initLoading(startExperience) {
  if (typeof gsap === 'undefined') {
    document.getElementById('loader')?.remove();
    startExperience();
    return;
  }
  const tl = gsap.timeline();
  tl.to('.loader-shield-path', { strokeDashoffset:0, duration:1.8, ease:'power3.inOut' });
  tl.fromTo('.loader-char', { y:40, opacity:0, rotateX:-90 }, { y:0, opacity:1, rotateX:0, duration:0.5, stagger:0.06, ease:'back.out(1.7)' }, '-=0.8');
  tl.call(() => {
    let p = 0;
    const bar = document.getElementById('loader-bar');
    const cnt = document.getElementById('loader-count');
    if (!bar) return;
    const iv = setInterval(() => {
      p += 1 + Math.random() * 4;
      if (p >= 100) {
        p = 100; clearInterval(iv);
        bar.style.width = '100%';
        if (cnt) cnt.textContent = '100%';
        setTimeout(() => {
          gsap.to('#loader', { y:'-100%', duration:0.9, ease:'power3.inOut', onComplete:()=>{ document.getElementById('loader')?.remove(); startExperience(); } });
        }, 350);
      }
      bar.style.width = p + '%';
      if (cnt) cnt.textContent = Math.floor(p) + '%';
    }, 80);
  }, null, '-=0.3');
}

// ── Custom Cursor ──
export function initCursor() {
  const ring = document.getElementById('cursor-ring');
  const dot = document.getElementById('cursor-dot');
  if ('ontouchstart' in window) {
    if (ring) ring.style.display = 'none';
    if (dot) dot.style.display = 'none';
    return;
  }
  document.documentElement.classList.add('no-cursor');
  let mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
  let rx = mouseX, ry = mouseY;
  let _tx = mouseX, _ty = mouseY;
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    _tx = mouseX; _ty = mouseY;
    if (dot) { dot.style.left = mouseX+'px'; dot.style.top = mouseY+'px'; }
  });
  function lerp(a,b,t) { return a+(b-a)*t; }
  function animCursor() {
    rx = lerp(rx, mouseX, 0.1); ry = lerp(ry, mouseY, 0.1);
    if (ring) { ring.style.left = rx+'px'; ring.style.top = ry+'px'; }
    requestAnimationFrame(animCursor);
  }
  animCursor();
  const hoverSel = 'a, button, .chip, .ntab, .pill, .btn, .lb-row, .pod, .gb-card, .ts-card, .tbl tbody tr, .sec-title, .grp-tab, .gm-s, .mini-stat, .pn-card, .magnetic-el';
  document.addEventListener('mouseover', e => {
    const t = e.target.closest(hoverSel);
    if (ring) {
      ring.style.transform = t ? 'scale(1.6)' : 'scale(1)';
      ring.style.borderColor = t ? 'var(--gold)' : 'var(--g3)';
      ring.style.background = t ? 'rgba(255,183,3,0.1)' : 'transparent';
      const rect = t?.getBoundingClientRect();
      if (rect) {
        const w = Math.max(rect.width, rect.height) * 0.4 + 24;
        ring.style.width = w + 'px';
        ring.style.height = w + 'px';
      } else {
        ring.style.width = '32px';
        ring.style.height = '32px';
      }
    }
  });
  document.addEventListener('click', () => {
    if (ring) { ring.style.transform='scale(0.6)'; ring.style.transition='transform 0.08s ease'; setTimeout(()=>{ ring.style.transform='scale(1)'; ring.style.transition='transform 0.3s ease'; },80); }
  });
  // Reset on mouse leave window
  document.addEventListener('mouseleave', () => {
    if (ring) { ring.style.opacity = '0'; }
  });
  document.addEventListener('mouseenter', () => {
    if (ring) { ring.style.opacity = '1'; }
  });
}

// ── Noise overlay ──
export function initNoise() {
  const canvas = document.getElementById('noise-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = Math.floor(window.innerWidth/2);
  let h = canvas.height = Math.floor(window.innerHeight/2);
  const idata = ctx.createImageData(w, h);
  const buf = new Uint32Array(idata.data.buffer);
  let _noiseTimer = null;
  let _hidden = false;
  function noise() {
    if (_hidden) return;
    for (let i=0;i<buf.length;i++) { buf[i] = (Math.random()*0x1000000+0xff000000)|0; }
    ctx.putImageData(idata,0,0);
  }
  noise();
  _noiseTimer = setInterval(noise, 100);
  document.addEventListener('visibilitychange', () => {
    _hidden = document.hidden;
    if (!_hidden) noise();
  });
  const onResize = () => { w=canvas.width=Math.floor(window.innerWidth/2); h=canvas.height=Math.floor(window.innerHeight/2); ctx.fillRect(0,0,w,h); };
  window.addEventListener('resize', onResize, { passive:true });
}

// ── Glow cards, nav indicator, header shrink ──
export function initMicroInteractions() {
  let glowRAF = null;
  document.addEventListener('mousemove', e => {
    if (glowRAF) return;
    glowRAF = requestAnimationFrame(() => {
      glowRAF = null;
      document.querySelectorAll('.glow-card').forEach(c => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX-r.left)+'px');
        c.style.setProperty('--my', (e.clientY-r.top)+'px');
      });
    });
  }, { passive:true });

  document.querySelectorAll('.ntab').forEach(t => {
    t.addEventListener('mouseenter', function() {
      const ind = document.getElementById('nav-indicator');
      if (ind && this.classList.contains('on')) { ind.style.transform='scaleX(1.15)'; ind.style.opacity='0.7'; }
    });
    t.addEventListener('mouseleave', function() {
      const ind = document.getElementById('nav-indicator');
      if (ind) { ind.style.transform='scaleX(1)'; ind.style.opacity='1'; }
    });
  });

  const em = document.querySelector('.hdr-emblem');
  if (em) {
    em.addEventListener('mouseenter', ()=>{ em.style.transform='scale(1.1) rotate(-5deg)'; em.style.transition='transform 0.3s cubic-bezier(.34,1.56,.64,1)'; });
    em.addEventListener('mouseleave', ()=>{ em.style.transform='scale(1) rotate(0)'; });
  }

  // Header shrink
  const hdr = document.querySelector('.hdr');
  if (hdr) {
    function updateHdr() {
      const lenis = getLenis();
      const scrollY = lenis ? (lenis.animatedScroll || lenis.targetScroll || 0) : window.scrollY;
      hdr.classList.toggle('scrolled', scrollY > 60);
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(() => { updateHdr(); ticking = false; }); ticking = true; }
    }, { passive:true });
    const lenis = getLenis();
    if (lenis) lenis.on('scroll', updateHdr);
  }

  // Nav indicator smooth follow
  const indicator = document.getElementById('nav-indicator');
  if (indicator) {
    function moveIndicator(tabEl) {
      if (!tabEl) return;
      const navRect = tabEl.closest('.nav-inner').getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      indicator.style.width = tabRect.width + 'px';
      indicator.style.left = (tabRect.left - navRect.left) + 'px';
      indicator.style.transition = 'width .3s cubic-bezier(.16,1,.3,1), left .3s cubic-bezier(.16,1,.3,1)';
    }
    const activeTab = document.querySelector('.ntab.on');
    if (activeTab) setTimeout(() => moveIndicator(activeTab), 100);
    document.querySelectorAll('.ntab').forEach(t => {
      t.addEventListener('click', function(){ moveIndicator(this); });
    });
  }
}

// ── Ripple effect ──
export function initRipple() {
  document.addEventListener('click', e => {
    const t = e.target.closest('.btn, .pill, .chip, .ntab, a');
    if (!t) return;
    const r = document.createElement('span');
    r.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,0.25);width:10px;height:10px;left:${e.clientX-t.getBoundingClientRect().left-5}px;top:${e.clientY-t.getBoundingClientRect().top-5}px;pointer-events:none;transform:scale(0);animation:ripple 0.6s ease-out forwards;`;
    t.style.position = 'relative'; t.style.overflow = 'hidden';
    t.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });
  if (!document.getElementById('ripple-style')) {
    const s = document.createElement('style');
    s.id = 'ripple-style';
    s.textContent = '@keyframes ripple{to{transform:scale(20);opacity:0}}';
    document.head.appendChild(s);
  }
}

// ── Dynamic shadow on cards ──
export function initDynamicShadow() {
  let shadowRAF = null;
  document.addEventListener('mousemove', e => {
    if (shadowRAF) return;
    shadowRAF = requestAnimationFrame(() => {
      shadowRAF = null;
      document.querySelectorAll('.dyn-shadow').forEach(el => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const sx = (x - 0.5) * 12;
        const sy = (y - 0.5) * 12;
        el.style.boxShadow = `${sx}px ${sy}px 24px rgba(0,0,0,0.3)`;
      });
    });
  }, { passive:true });
}

// ── Counters ──
export function initCounters() {
  document.querySelectorAll('[data-count-to]').forEach(el => {
    const target = parseFloat(el.dataset.countTo);
    if (isNaN(target)) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          obs.unobserve(el);
          if (typeof gsap !== 'undefined') {
            const isInt = Number.isInteger(target);
            gsap.from({ val: 0 }, { val: target, duration: 1.5, ease: 'power3.out', onUpdate: function() { el.textContent = isInt ? Math.floor(this.targets()[0].val) : this.targets()[0].val.toFixed(1); } });
          }
          el.style.color = 'var(--gold)';
        }
      });
    }, { threshold: 0.3 });
    obs.observe(el);
  });
}

// ── Tooltips ──
export function initTooltips() {
  document.querySelectorAll('[data-tip]').forEach(el => {
    const tipText = el.dataset.tip;
    if (!tipText) return;
    const tip = document.createElement('span');
    tip.className = 'tooltip-el';
    tip.textContent = tipText;
    tip.style.cssText = 'position:absolute;bottom:calc(100%+6px);left:50%;transform:translateX(-50%) translateY(4px);background:var(--c4);color:var(--t1);padding:4px 8px;border-radius:6px;font-size:.65rem;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease;z-index:100;';
    el.style.position = 'relative';
    el.appendChild(tip);
    let showTimer = null;
    el.addEventListener('mouseenter', () => {
      showTimer = setTimeout(() => { tip.style.opacity='1'; tip.style.transform='translateX(-50%) translateY(0)'; }, 300);
    });
    el.addEventListener('mouseleave', () => { clearTimeout(showTimer); tip.style.opacity='0'; tip.style.transform='translateX(-50%) translateY(4px)'; });
  });
}

// ── Text Scramble ──
export function initTextScramble() {
  document.querySelectorAll('[data-scramble]').forEach(el => {
    const orig = el.textContent;
    el.addEventListener('mouseenter', () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      let i = 0;
      const iv = setInterval(() => {
        let s = '';
        for (let j=0;j<orig.length;j++) {
          if (j < i) s += orig[j];
          else if (j === i) s += chars[Math.floor(Math.random()*chars.length)];
          else s += chars[Math.floor(Math.random()*chars.length)];
        }
        el.textContent = s;
        i++;
        if (i > orig.length) { clearInterval(iv); el.textContent = orig; }
      }, 30);
    });
  });
}

// ── Particle burst on click ──
export function initParticleBurst() {
  document.addEventListener('click', e => {
    const colors = ['#ffb703','#ff4d6d','#00b4d8','#9d4edd','#2dc653','#ffd60a'];
    for (let i=0;i<12;i++) {
      const p = document.createElement('div');
      const a = Math.random()*Math.PI*2;
      const d = 30+Math.random()*50;
      const c = colors[Math.floor(Math.random()*colors.length)];
      p.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:4px;height:4px;border-radius:50%;background:${c};pointer-events:none;z-index:99999;transition:all 0.8s cubic-bezier(.25,.46,.45,.94);`;
      document.body.appendChild(p);
      requestAnimationFrame(() => { p.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(0)`; p.style.opacity='0'; });
      setTimeout(() => p.remove(), 900);
    }
  });
}

// ── Sound effects ──
export function initSoundEffects() {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
    return ctx;
  }
  function play(freqStart, freqEnd, dur) {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freqStart, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime+dur);
      g.gain.setValueAtTime(0.03, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime+dur);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime+dur);
    } catch(e) {}
  }
  document.addEventListener('click', e => {
    if (e.target.closest('.btn, .pill, .chip, .ntab')) play(800,200,0.1);
  });
  document.addEventListener('mouseover', e => {
    if (e.target.closest('.btn, .pill, .chip, .ntab, a')) play(1200,800,0.05);
  });
}

// ── Scroll to top ──
export function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  function updateBtn() {
    const lenis = getLenis();
    const scrollY = lenis ? (lenis.animatedScroll || lenis.targetScroll || 0) : window.scrollY;
    btn.classList.toggle('show', scrollY > 400);
  }
  window.addEventListener('scroll', updateBtn, { passive:true });
  const lenis = getLenis();
  if (lenis) lenis.on('scroll', updateBtn);
  btn.addEventListener('click', () => {
    const l = getLenis();
    if (l) l.scrollTo(0, { duration:1.2, easing:[0.16,1,0.3,1] });
    else window.scrollTo({ top:0, behavior:'smooth' });
  });
}

// ── Image reveal ──
export function initImageReveal() {
  document.querySelectorAll('img.reveal').forEach(img => {
    if (img.complete) img.classList.add('revealed');
    else img.addEventListener('load', () => img.classList.add('revealed'), { once:true });
  });
}

// ── Confetti burst ──
export function burstConfetti(originX, originY, count) {
  if (count === undefined) count = 30;
  const colors = ['#ffb703','#ff4d6d','#00b4d8','#9d4edd','#2dc653','#ffd60a','#48cae4','#c77dff','#f72585','#4cc9f0'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;left:0;top:0;width:100%;height:100%;overflow:hidden';
  document.body.appendChild(container);
  for (let i=0;i<count;i++) {
    const p = document.createElement('div');
    const size = 4 + Math.random() * 6;
    const color = colors[Math.floor(Math.random()*colors.length)];
    const x = originX + (Math.random()-0.5)*60;
    const y = originY + (Math.random()-0.5)*40;
    const angle = Math.random() * Math.PI * 2;
    const velocity = 80 + Math.random() * 160;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 80;
    const rot = Math.random() * 720;
    const dur = 1 + Math.random() * 0.8;
    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size*0.6}px;border-radius:2px;background:${color};transform:rotate(0deg);opacity:1`;
    container.appendChild(p);
    if (typeof gsap !== 'undefined') {
      gsap.to(p, {
        x: tx, y: ty, rotation: rot, opacity: 0,
        duration: dur, ease: 'power2.out',
        onComplete: () => p.remove()
      });
    } else {
      p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${tx}px,${ty}px) rotate(${rot}deg)`, opacity: 0 }
      ], { duration: dur*1000, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' }).onfinish = () => p.remove();
    }
  }
  setTimeout(() => container.remove(), 2500);
}
