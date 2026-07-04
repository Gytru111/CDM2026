import { scene, camera, renderer, ballGroup, setScrollProgress } from '../three/scene.js';

let lenis = null;
let _bgShapeUpdater = null;

export function getLenis() { return lenis; }

// ── Storytelling ──
const _lookTarget = new THREE.Vector3();
const _caColor = new THREE.Color();
const _cbColor = new THREE.Color();
const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _tgtA = new THREE.Vector3();
const _tgtB = new THREE.Vector3();

export const storytelling = {
  chapters: [
    { label:'cl', pos:[-1.5,0.8,5.2], tgt:[0,0,0], amb:0x303060, main:0xffd8a0, ballSpd:0.18, orbSpd:0.25, orbR:2.2 },
    { label:'ma', pos:[6.0,1.5,2.5], tgt:[0,-0.2,0], amb:0x203050, main:0xffccaa, ballSpd:0.28, orbSpd:0.35, orbR:3.0 },
    { label:'tb', pos:[-5.5,2.8,3.0], tgt:[0,0.3,0], amb:0x402050, main:0xddaaff, ballSpd:0.12, orbSpd:0.20, orbR:2.5 },
    { label:'gr', pos:[0.5,4.0,1.8], tgt:[0,-0.3,0], amb:0x203020, main:0xaaffaa, ballSpd:0.35, orbSpd:0.45, orbR:3.5 },
    { label:'bk', pos:[7.0,-0.8,3.0], tgt:[0,0.2,0], amb:0x202040, main:0xaaccff, ballSpd:0.20, orbSpd:0.25, orbR:2.8 },
    { label:'pn', pos:[-6.5,1.8,4.0], tgt:[0,-0.2,0], amb:0x402020, main:0xffaaaa, ballSpd:0.22, orbSpd:0.30, orbR:3.2 }
  ],
  current: 0,
  progress: 0,
  init() {
    const ch = this.chapters[0];
    if (camera && ch) {
      camera.position.set(ch.pos[0], ch.pos[1], ch.pos[2]);
      _lookTarget.set(ch.tgt[0], ch.tgt[1], ch.tgt[2]);
      camera.lookAt(_lookTarget);
    }
  },
  update(p) {
    this.progress = p;
    setScrollProgress(p);
    const total = this.chapters.length - 1;
    const raw = p * total;
    const idx = Math.min(Math.floor(raw), total - 1);
    const frac = raw - idx;
    const smoothstep = t => t*t*(3-2*t);
    const sf = smoothstep(frac);
    const ca = this.chapters[idx];
    const cb = this.chapters[Math.min(idx+1,total)];
    if (!ca || !cb || !camera) return;

    _posA.set(ca.pos[0], ca.pos[1], ca.pos[2]);
    _posB.set(cb.pos[0], cb.pos[1], cb.pos[2]);
    _tgtA.set(ca.tgt[0], ca.tgt[1], ca.tgt[2]);
    _tgtB.set(cb.tgt[0], cb.tgt[1], cb.tgt[2]);

    camera.position.lerpVectors(_posA, _posB, sf);
    _lookTarget.lerpVectors(_tgtA, _tgtB, sf);
    camera.lookAt(_lookTarget);

    if (scene) {
      const ambient = scene.children.find(c => c.isLight && c.type === 'AmbientLight');
      if (ambient) {
        _caColor.setHex(ca.amb);
        _cbColor.setHex(cb.amb);
        ambient.color.lerpColors(_caColor, _cbColor, sf);
      }
      const mainLight = scene.children.find(c => c.isLight && c.type === 'DirectionalLight');
      if (mainLight) {
        _caColor.setHex(ca.main);
        _cbColor.setHex(cb.main);
        mainLight.color.lerpColors(_caColor, _cbColor, sf);
      }
    }
  }
};

// ── Lenis ──
export function initLenis() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({ duration: 1.4, easing: t => Math.min(1,1-Math.pow(1-t,3)), orientation: 'vertical', gestureOrientation: 'vertical', wheelMultiplier: 1, smoothWheel: true });

  lenis.on('scroll', e => {
    storytelling.update(e.progress);
    if (_bgShapeUpdater) _bgShapeUpdater(e.animatedScroll || e.targetScroll || 0);
  });

  lenis.connect();
  if (typeof gsap !== 'undefined') {
    gsap.ticker.add(time => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  storytelling.init();
}

// ── showTab wrapper (page transitions) ──
export function wrapShowTab() {
  const orig = window.showTab;
  if (!orig) return;
  window.showTab = function(tab) {
    if (scene && scene.children) {
      const ambient = scene.children.find(c => c.isLight && c.type === 'AmbientLight');
      if (ambient && typeof gsap !== 'undefined') {
        const tabColors = { cl: 0x303060, ma: 0x203050, tb: 0x402050, gr: 0x203020, bk: 0x202040, pn: 0x402020 };
        const targetColor = tabColors[tab] || 0x303060;
        gsap.to(ambient.color, { r:((targetColor>>16)&255)/255, g:((targetColor>>8)&255)/255, b:(targetColor&255)/255, duration:0.6, ease:'power2.inOut' });
      }
    }
    const entrances = {
      cl: { y:30,scale:1.02,rot:-1,blur:0,stagger:'power1.out' },
      ma: { y:0,scale:0.92,rot:-3,blur:6,stagger:'power2.out' },
      tb: { x:-40,scale:0.88,rot:0,blur:8,stagger:'power1.inOut' },
      gr: { y:-25,scale:0.95,rot:4,blur:0,stagger:'power3.out' },
      bk: { x:60,scale:0.93,rot:0,blur:4,stagger:'power2.inOut' },
      pn: { y:40,scale:0.9,rot:2,blur:10,stagger:'power1.out' }
    };
    const e = entrances[tab] || { y:20,scale:0.95,rot:0,blur:0,stagger:'power2.out' };
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
      let hasActive = false;
      document.querySelectorAll('.page').forEach(p => {
        if (p.classList.contains('on')) {
          hasActive = true;
          const dir = { x: (Math.random()-0.5)*30, y: -12-Math.random()*8, rotation: (Math.random()-0.5)*6, scale:0.94, opacity:0, duration:0.25, ease:'power2.in' };
          tl.to(p, dir).call(() => {
            orig(tab);
            const np = document.getElementById('pg-'+tab);
            if (np) {
              gsap.set(np, { opacity:0, x:e.x||0, y:e.y||0, scale:e.scale, rotation:e.rot||0, filter:`blur(${e.blur||0}px)` });
              tl.to(np, { opacity:1, x:0, y:0, scale:1, rotation:0, filter:'blur(0)', duration:0.7, ease:'power3.out' });
              document.querySelectorAll(`#pg-${tab} .anim-stagger`).forEach((el,i) => {
                gsap.fromTo(el, { opacity:0, y:20, scale:0.95 }, { opacity:1, y:0, scale:1, duration:0.5, delay:0.1+i*0.04, ease:e.stagger });
              });
              setTimeout(initSectionAnims, 200);
            }
          }, null, '>-0.08');
        }
      });
      if (!hasActive) { orig(tab); setTimeout(initSectionAnims, 200); }
    } else orig(tab);
  };
}

// ── Section animations (GSAP ScrollTrigger + IntersectionObserver) ──
let _obsDynamic = null;
export function initSectionAnims() {
  if (typeof gsap !== 'undefined') {
    document.querySelectorAll('.sec-title-g').forEach(el => {
      const wrap = el.querySelector('.txt-reveal-wrap') || (()=>{ const w=document.createElement('div'); w.className='txt-reveal-wrap'; w.innerHTML=el.innerHTML; el.innerHTML=''; el.appendChild(w); return w; })();
      gsap.fromTo(wrap, { y:50, rotateX:-25, opacity:0 }, { y:0, rotateX:0, opacity:1, duration:0.9, ease:'power4.out', scrollTrigger:{ trigger:el.closest('.sec'), start:'top 85%', toggleActions:'play none none none' }});
    });

    document.querySelectorAll('.anim-parallax-up').forEach(el => {
      gsap.fromTo(el, { y:80, opacity:0 }, { y:0, opacity:1, duration:1, ease:'power3.out', scrollTrigger:{ trigger:el, start:'top 88%', toggleActions:'play none none none' }});
    });
  }

  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('on');
        obs.unobserve(e.target);
        if (typeof gsap !== 'undefined') {
          const delay = parseFloat(e.target.dataset.staggerDelay) || 0;
          gsap.fromTo(e.target, { scale:0.92, opacity:0, y:15 }, { scale:1, opacity:1, y:0, duration:0.7, delay, ease:'power3.out' });
        }
      }
    });
  }, { threshold:0.08, rootMargin:'0px 0px -40px 0px' });
  document.querySelectorAll('.premium-in, .premium-in-left, .premium-in-right, .premium-in-scale, .premium-in-rotate, .premium-in-blur, .anim-fade-up, .anim-scale').forEach(el=>obs.observe(el));

  function observeDynamic() {
    const ro = new IntersectionObserver(entries=>{
      entries.forEach((e,i)=>{
        if(e.isIntersecting){
          setTimeout(()=>e.target.classList.add('on'),i*60);
          ro.unobserve(e.target);
        }
      });
    }, { threshold:0.05 });
    const targets = document.querySelectorAll('.lb-row, .pod, .gb-card, .mini-stat, .bk-card, .ts-card, .tbl tbody tr, .podium-item, .anim-stagger');
    targets.forEach(el=>{
      if(!el.classList.contains('premium-in')){ el.classList.add('premium-in'); ro.observe(el); }
    });
  }
  observeDynamic();
  const dm = new MutationObserver(()=>observeDynamic());
  const wrap = document.querySelector('.wrap');
  dm.observe(wrap||document.body, { childList:true, subtree:true });
}

// ── ScrollTrigger reveals ──
export function initScrollTriggers() {
  if (typeof ScrollTrigger === 'undefined' || typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => { ScrollTrigger.update(); });
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('.sec-title-g, .sec-title, .fs-hero-title').forEach(el => {
    const wrap = el.querySelector('.txt-reveal-wrap') || (()=>{ const w=document.createElement('div'); w.className='txt-reveal-wrap'; w.innerHTML=el.innerHTML; el.innerHTML=''; el.appendChild(w); return w; })();
    gsap.fromTo(wrap, { y:50, rotateX:-25, opacity:0 }, { y:0, rotateX:0, opacity:1, duration:0.9, ease:'power4.out', scrollTrigger:{ trigger:el.closest('.sec') || el, start:'top 85%', toggleActions:'play none none none' }});
  });
  document.querySelectorAll('.section-glow').forEach(el => {
    gsap.fromTo(el, { opacity:0, scale:0.85 }, { opacity:1, scale:1, duration:1.4, ease:'power3.out', scrollTrigger:{ trigger:el, start:'top 80%', toggleActions:'play none none none' }});
  });
  document.querySelectorAll('.h-scroll-wrap').forEach(el => {
    gsap.fromTo(el, { x:80, opacity:0 }, { x:0, opacity:1, duration:0.8, ease:'power3.out', scrollTrigger:{ trigger:el, start:'top 78%', toggleActions:'play none none none' }});
  });
  document.querySelectorAll('.anim-reveal').forEach(el => {
    gsap.from(el, { y:40, opacity:0, duration:0.8, ease:'power2.out', scrollTrigger:{ trigger:el, start:'top 85%', toggleActions:'play none none none' }});
  });
}

// ── Horizontal scroll ──
export function initHorizontalScroll() {
  document.querySelectorAll('.h-scroll').forEach(el => {
    let isDown = false; let sx = 0; let sl = 0;
    el.addEventListener('mousedown', e => { isDown=true; sx=e.pageX-el.offsetLeft; sl=el.scrollLeft; el.style.cursor='grabbing'; });
    window.addEventListener('mouseup', () => { if(isDown){isDown=false; el.style.cursor='grab';} });
    el.addEventListener('mousemove', e => { if(!isDown)return; e.preventDefault(); const x=e.pageX-el.offsetLeft; el.scrollLeft=sl-(x-sx); });
    el.addEventListener('wheel', e => { el.scrollLeft+=e.deltaY*0.5; e.preventDefault(); }, { passive:false });
  });
  document.querySelectorAll('.h-sync').forEach(pair => {
    const [h,b] = [pair.querySelector('.h-sync-h'), pair.querySelector('.h-sync-b')];
    if(h&&b) b.addEventListener('scroll', ()=>{ h.scrollLeft=b.scrollLeft; });
  });
}

// ── SVG Morphing ──
export function initMorphing() {
  document.querySelectorAll('.morph-shape').forEach(el => {
    el.addEventListener('mouseenter', () => {
      const shapes = ['M0,100 C30,90 30,10 0,0 C90,30 90,70 100,100 C70,90 70,10 100,0 C10,30 10,70 0,100Z','M50,5 C60,30 90,30 95,50 C90,70 60,70 50,95 C40,70 10,70 5,50 C10,30 40,30 50,5Z','M50,0 L60,35 L95,35 L65,55 L75,95 L50,75 L25,95 L35,55 L5,35 L40,35Z'];
      const cur = parseInt(el.dataset.morph||'0');
      const next = (cur+1)%shapes.length;
      if(typeof gsap!=='undefined') gsap.to(el, { duration:0.4, attr:{d:shapes[next]}, ease:'power2.inOut' });
      el.dataset.morph=next;
    });
  });
}

// ── Bracket SVG draw ──
export function initBracketAnim() {
  document.querySelectorAll('.bk-svg path, .bk-svg line').forEach((el,i)=>{
    const len = el.getTotalLength ? el.getTotalLength() : 0;
    if(len) { el.style.strokeDasharray=len; el.style.strokeDashoffset=len; }
    if(typeof gsap!=='undefined') gsap.to(el, { strokeDashoffset:0, duration:0.8+Math.random()*0.4, delay:i*0.08, ease:'power2.out', scrollTrigger:{ trigger:el.closest('.bk-svg')||el, start:'top 90%', toggleActions:'play none none none' }});
  });
  const colorCycle = () => { const cols=['var(--gold)','var(--blu2)','var(--grn2)','var(--red2)','var(--pur2)']; document.querySelectorAll('.bk-svg path, .bk-svg line').forEach((el,i)=>{ el.style.stroke=cols[i%cols.length]; }); setTimeout(colorCycle, 4000); };
  setTimeout(colorCycle, 3000);
}

// ── Magnetic buttons ──
export function initMagnetic() {
  document.querySelectorAll('.btn, .chip, .pill').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top - r.height/2;
      el.style.transform = `translate(${x*0.25}px,${y*0.25}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform=''; });
  });
}

// ── 3D Tilt on cards ──
export function init3DTilt() {
  document.querySelectorAll('.tilt-card').forEach(el => {
    const maxTilt = 12;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const tiltX = (y - 0.5) * maxTilt;
      const tiltY = (x - 0.5) * -maxTilt;
      el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02,1.02,1.02)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform='perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)'; });
  });
}

// ── Background shapes parallax ──
export function initBgParallax() {
  const bgShapes = document.querySelector('.bg-shapes');
  if (!bgShapes) return;
  _bgShapeUpdater = (sy) => { bgShapes.style.transform = `translateY(${sy * 0.15}px)`; };
  window.addEventListener('scroll', ()=>{ if(lenis) _bgShapeUpdater(lenis.animatedScroll||lenis.targetScroll||window.scrollY); else _bgShapeUpdater(window.scrollY); }, {passive:true});
  if(lenis) lenis.on('scroll', ({animatedScroll})=>{ _bgShapeUpdater(animatedScroll); });
}
