let scene = null;
let camera = null;
let renderer = null;
let ballGroup = null;
let particleSystem = null;
let is3DReady = false;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let _ballTexture = null;
let _cachedRings = null;
let _cachedFloatRefs = null;
let _scrollProgress = 0;
let _targetScrollProgress = 0;
let _orbitPhase = 0;

function buildBallTexture() {
  _ballTexture = null;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1c20'; ctx.fillRect(0,0,256,256);
  ctx.strokeStyle = '#2a2e35'; ctx.lineWidth = 2;
  for (let i=0;i<12;i++) {
    ctx.beginPath();
    ctx.arc(128+Math.sin(i*0.7)*60,128+Math.cos(i*1.1)*60,20+Math.random()*30,0,Math.PI*2);
    ctx.stroke(); ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fill();
  }
  ctx.fillStyle = '#ffb703'; ctx.font = 'bold 80px Bebas Neue, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('26',128,132);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('CDM 2026',128,196);
  _ballTexture = new THREE.CanvasTexture(c);
  return _ballTexture;
}

function init3D() {
  if (typeof THREE === 'undefined') return;
  if (!_ballTexture) buildBallTexture();

  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.info.autoReset = false;
  canvas.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 1.2, 4.8);
  camera.lookAt(0, 0, 0);

  // HDRI env via procedural gradient
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 1; envCanvas.height = 128;
  const ectx = envCanvas.getContext('2d');
  const grad = ectx.createLinearGradient(0,0,0,128);
  grad.addColorStop(0,'#0a0c14'); grad.addColorStop(0.3,'#141822'); grad.addColorStop(0.6,'#1a1e2a'); grad.addColorStop(1,'#0a0c10');
  ectx.fillStyle = grad; ectx.fillRect(0,0,1,128);
  const envTexture = new THREE.CanvasTexture(envCanvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envRenderTarget = pmremGenerator.fromEquirectangular(envTexture);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  // Lights
  const ambient = new THREE.AmbientLight(0x404060, 0.8);
  scene.add(ambient);
  const mainLight = new THREE.DirectionalLight(0xffd8a0, 1.2);
  mainLight.position.set(5,8,6);
  scene.add(mainLight);
  scene.add(new THREE.DirectionalLight(0x6080ff, 0.3).position.set(-4,2,-5));

  const pointColors = [0xffb703, 0x00b4d8, 0xff4d6d, 0x9d4edd];
  const dynamo = pointColors.map((col,i) => {
    const pl = new THREE.PointLight(col, 0.6, 12);
    const angle = (i/4)*Math.PI*2 + 0.3;
    pl.position.set(Math.cos(angle)*4, Math.sin(i*1.2)*0.8+1, Math.sin(angle)*4);
    scene.add(pl);
    return pl;
  });

  // Ball group
  ballGroup = new THREE.Group();
  scene.add(ballGroup);

  const ballMat = new THREE.MeshPhysicalMaterial({
    map: _ballTexture, metalness: 0.1, roughness: 0.4, clearcoat: 0.15,
    envMap: scene.environment, envMapIntensity: 0.6
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1,48,36), ballMat);
  ball.castShadow = false; ball.receiveShadow = false;
  ballGroup.add(ball);

  // Glass sphere
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff, metalness: 0.05, roughness: 0.05, transparent: true, opacity: 0.18,
    clearcoat: 0.3, envMap: scene.environment, envMapIntensity: 0.8
  });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.35,32,24), glassMat);
  ballGroup.add(glass);

  // Torus knot
  const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0xffb703, metalness: 0.8, roughness: 0.15, envMap: scene.environment, envMapIntensity: 1.2
  });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55,0.18,32,12), knotMat);
  knot.rotation.x = 0.5; knot.rotation.y = 0.3;
  ballGroup.add(knot);

  // Icosahedron wireframe
  const icoMat = new THREE.MeshPhysicalMaterial({
    color: 0x48cae4, wireframe: true, transparent: true, opacity: 0.3,
    envMap: scene.environment, envMapIntensity: 0.4
  });
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6,0), icoMat);
  ballGroup.add(ico);

  // Torus rings
  const ringMat1 = new THREE.MeshPhysicalMaterial({ color: 0xffb703, transparent: true, opacity: 0.15, envMap: scene.environment });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.8,0.03,8,48), ringMat1);
  ring1.rotation.x = Math.PI/2; ballGroup.add(ring1);
  const ringMat2 = new THREE.MeshPhysicalMaterial({ color: 0x00b4d8, transparent: true, opacity: 0.12, envMap: scene.environment });
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.9,0.025,8,48), ringMat2);
  ring2.rotation.z = Math.PI/3; ring2.rotation.x = Math.PI/3; ballGroup.add(ring2);
  _cachedRings = [ring1, ring2];

  // Orbital Crystals (InstancedMesh)
  const orbCount = 8;
  const orbGeom = new THREE.OctahedronGeometry(0.12,0);
  const orbMat = new THREE.MeshPhysicalMaterial({
    color: 0xffb703, metalness: 0.3, roughness: 0.2, envMap: scene.environment, transparent: true, opacity: 0.7
  });
  const orbMesh = new THREE.InstancedMesh(orbGeom, orbMat, orbCount);
  orbMesh.castShadow = false; orbMesh.receiveShadow = false;
  const dummy = new THREE.Object3D();
  const orbColors = [0xffb703, 0x00b4d8, 0xff4d6d, 0x9d4edd, 0x2dc653, 0xffd60a, 0x48cae4, 0xc77dff];
  for (let i=0;i<orbCount;i++) {
    const a = (i/orbCount)*Math.PI*2; const r = 2.2 + Math.sin(i*1.5)*0.3;
    dummy.position.set(Math.cos(a)*r, Math.sin(a*2)*0.4, Math.sin(a)*r);
    dummy.scale.setScalar(0.8+Math.sin(i*0.7)*0.3); dummy.updateMatrix();
    orbMesh.setMatrixAt(i,dummy.matrix);
    const c = new THREE.Color(orbColors[i%orbColors.length]);
    orbMesh.setColorAt(i,c);
  }
  orbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  orbMesh.instanceColor.needsUpdate = true;
  orbMesh.userData.orbData = orbCount;
  scene.add(orbMesh);
  _cachedFloatRefs = { refs: [] };
  const orbDummy = new THREE.Object3D();
  scene.userData = { ambient, dynamo, mainLight, _orbMesh: orbMesh, _orbColors: orbColors, _orbDummy: orbDummy, _floaters: _cachedFloatRefs };

  // Floating Stars (InstancedMesh)
  const starCount = 40;
  const starGeom = new THREE.OctahedronGeometry(0.04,0);
  const starMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.1, envMap: scene.environment, transparent: true, opacity: 0.6
  });
  const starMesh = new THREE.InstancedMesh(starGeom, starMat, starCount);
  starMesh.castShadow = false; starMesh.receiveShadow = false;
  const starDummy = new THREE.Object3D();
  const starPositions = [];
  for (let i=0;i<starCount;i++) {
    const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1); const r = 6+Math.random()*8;
    starDummy.position.set(r*Math.sin(phi)*Math.cos(theta), (Math.random()-0.5)*6, r*Math.sin(phi)*Math.sin(theta));
    starDummy.scale.setScalar(0.3+Math.random()*0.7); starDummy.updateMatrix();
    starMesh.setMatrixAt(i,starDummy.matrix);
    const sc = new THREE.Color().setHSL(0.1+Math.random()*0.1,0.6,0.6+Math.random()*0.3);
    starMesh.setColorAt(i,sc);
    starPositions.push({ theta, phi, r, speed: 0.05+Math.random()*0.08, phase: Math.random()*Math.PI*2 });
  }
  starMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  starMesh.instanceColor.needsUpdate = true;

  starMesh.userData.starPositions = starPositions;
  starMesh.userData.starCount = starCount;
  scene.add(starMesh);

  // Particles
  const pCount = 350;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(pCount*3);
  const pc = new Float32Array(pCount*3);
  const ps = new Float32Array(pCount);
  const pv = new Float32Array(pCount*3);
  for (let i=0;i<pCount;i++) {
    pp[i*3]=(Math.random()-0.5)*16; pp[i*3+1]=(Math.random()-0.5)*10; pp[i*3+2]=(Math.random()-0.5)*16;
    pc[i*3]=0.9+Math.random()*0.1; pc[i*3+1]=0.3+Math.random()*0.5; pc[i*3+2]=0.1+Math.random()*0.4;
    ps[i]=0.01+Math.random()*0.035;
    pv[i*3]=(Math.random()-0.5)*0.01; pv[i*3+1]=(Math.random()-0.5)*0.01; pv[i*3+2]=(Math.random()-0.5)*0.01;
  }
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
  pg.setAttribute('size',new THREE.BufferAttribute(ps,1));
  const pMat = new THREE.PointsMaterial({
    size: 0.04, vertexColors: true, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  particleSystem = new THREE.Points(pg,pMat);
  particleSystem.userData.velocities = pv;
  particleSystem.userData.positions = pp;
  particleSystem.userData.pCount = pCount;
  scene.add(particleSystem);

  is3DReady = true;
  animate3D();
}

function animate3D() {
  requestAnimationFrame(animate3D);
  if (!is3DReady || !scene || !renderer) return;

  const time = Date.now() * 0.001;

  _scrollProgress += (_targetScrollProgress - _scrollProgress) * 0.02;
  const sp = _scrollProgress;
  _orbitPhase += 0.003;

  if (ballGroup) {
    const speedMult = 0.2 + sp * 0.3;
    ballGroup.rotation.y = time * speedMult + _orbitPhase;
    ballGroup.rotation.x = Math.sin(time * 0.1) * (0.03 + sp * 0.05);
    const ball = ballGroup.children[0];
    if (ball) { ball.position.y = Math.sin(time * 0.6) * (0.06 + sp * 0.06); }
    ballGroup.position.y = Math.sin(_orbitPhase * 2) * 0.15 * sp;
  }

  if (_cachedRings) {
    _cachedRings[0].rotation.z = time * 0.15;
    _cachedRings[1].rotation.y = time * 0.12;
  }

  const sceneData = scene.userData;
  if (sceneData && sceneData._orbMesh) {
    const om = sceneData._orbMesh;
    const oc = om.userData.orbData || 8;
    const dummy = sceneData._orbDummy;
    const orbSpeed = 0.25 + sp * 0.4;
    const orbRadius = 2.2 + sp * 1.2;
    for (let i=0;i<oc;i++) {
      const a = (i/oc)*Math.PI*2 + time * orbSpeed;
      const r = orbRadius + Math.sin(i*1.5 + time*0.3)*0.3;
      dummy.position.set(Math.cos(a)*r, Math.sin(a*2+time*0.2)*(0.4 + sp*0.6), Math.sin(a)*r);
      dummy.scale.setScalar(0.8+Math.sin(i*0.7+time*0.5)*0.3);
      dummy.updateMatrix();
      om.setMatrixAt(i,dummy.matrix);
    }
    om.instanceMatrix.needsUpdate = true;
  }

  if (sceneData && sceneData._floaters) {
    const frefs = sceneData._floaters;
    for (let k=0;k<frefs.refs.length;k++) {
      const f = frefs.refs[k];
      if (f && f.parent) { f.position.y += Math.sin(time*f.data.speed+f.data.phase)*0.003; f.rotation.x += 0.01; f.rotation.y += 0.02; }
    }
  }

  if (particleSystem && particleSystem.userData) {
    if (Math.floor(time*60)&1) {
      const pp = particleSystem.userData.positions;
      const pv = particleSystem.userData.velocities;
      const pc2 = particleSystem.geometry.attributes.color.array;
      const pCount = particleSystem.userData.pCount;
      for (let i=0;i<pCount;i++) {
        pp[i*3] += pv[i*3]; pp[i*3+1] += pv[i*3+1]; pp[i*3+2] += pv[i*3+2];
        if (pp[i*3] > 8||pp[i*3] < -8) pv[i*3] *= -1;
        if (pp[i*3+1] > 5||pp[i*3+1] < -5) pv[i*3+1] *= -1;
        if (pp[i*3+2] > 8||pp[i*3+2] < -8) pv[i*3+2] *= -1;
        const dx = mouseX/window.innerWidth*2-1; const dy = -(mouseY/window.innerHeight*2-1);
        pp[i*3] += dx*0.003; pp[i*3+1] += dy*0.003;
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  if (sceneData && sceneData.dynamo) {
    sceneData.dynamo.forEach((pl,i) => {
      const speed = 0.3 + sp * 0.4;
      const radius = 4 + sp * 2;
      const a = (i/4)*Math.PI*2 + time*speed;
      pl.position.x = Math.cos(a)*radius;
      pl.position.z = Math.sin(a)*radius;
      pl.position.y = Math.sin(time*0.5+i)*(0.8 + sp*0.8)+1;
      pl.intensity = 0.4 + Math.sin(time*0.6+i*1.2)*0.15 + sp*0.3;
    });
  }

  if (renderer && scene) {
    renderer.resetState();
    renderer.render(scene, camera);
  }
}

export function setScrollProgress(p) { _targetScrollProgress = Math.max(0, Math.min(1, p)); }

export { scene, camera, renderer, ballGroup, particleSystem, is3DReady, mouseX, mouseY, init3D, animate3D, buildBallTexture };
