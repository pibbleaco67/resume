// Tabbed 3D viewer for the SolidWorks jet-engine models.
// Without JavaScript or WebGL, the captions under the tabs still read as plain text.
// three.js (resolved by the import map in index.html) loads only when the viewer nears the screen.

const root = document.querySelector('[data-cad]');
if (root) setup(root);

function setup(root) {
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const overlay = root.querySelector('.cad-overlay');
  const hint = root.querySelector('.cad-hint');
  let active = -1;
  let viewer = null;
  let booting = null;

  root.classList.add('is-enhanced');
  if (matchMedia('(pointer: coarse)').matches) hint.textContent = 'Swipe sideways to rotate · Pinch to zoom';

  function setOverlay(message, isError = false) {
    overlay.hidden = !message;
    overlay.textContent = message || '';
    overlay.classList.toggle('is-error', isError);
  }

  function select(i, focus = false) {
    if (i === active) return;
    active = i;
    tabs.forEach((tab, j) => {
      tab.setAttribute('aria-selected', String(j === i));
      tab.tabIndex = j === i ? 0 : -1;
      panels[j].hidden = j !== i;
    });
    if (focus) tabs[i].focus();
    if (viewer) viewer.show(panels[i]);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => { select(i); boot(); });
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(next, true);
    });
  });
  select(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));

  function boot() {
    booting ??= (async () => {
      setOverlay('Loading 3D viewer…');
      try {
        viewer = createViewer(await loadLibraries(), root, setOverlay);
        await viewer.show(panels[active]);
      } catch (err) {
        console.error(err);
        setOverlay(err.userMessage || 'The 3D viewer couldn’t start in this browser.', true);
      }
    })();
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); boot(); }
    }, { rootMargin: '600px 0px' });
    io.observe(root);
  } else {
    boot();
  }
}

async function loadLibraries() {
  const [THREE, { OrbitControls }, { GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]);
  return { THREE, OrbitControls, GLTFLoader, MeshoptDecoder, RoomEnvironment };
}

function createViewer({ THREE, OrbitControls, GLTFLoader, MeshoptDecoder, RoomEnvironment }, root, setOverlay) {
  const view = root.querySelector('.cad-view');
  const canvas = root.querySelector('.cad-canvas');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    throw Object.assign(new Error('WebGL unavailable'), {
      userMessage: 'This browser can’t show 3D graphics (WebGL is off or unsupported).',
    });
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(0.5, 1, 0.35); // rides with the camera, like a CAD headlight
  camera.add(keyLight);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.autoRotateSpeed = 1.2;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  canvas.style.touchAction = 'pan-y'; // vertical swipes keep scrolling the page

  // Plain scrolling over the model scrolls the page; Ctrl/⌘ + scroll (or a trackpad pinch) zooms.
  view.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true });

  // Shared materials, colored from the page's CSS tokens so the model follows the theme.
  const materials = {
    part: new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    hardware: new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    edge: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 }),
  };
  function applyTheme() {
    const cs = getComputedStyle(root);
    const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    materials.part.color.set(get('--cad-metal', '#9aa3ab'));
    materials.hardware.color.set(get('--cad-hardware', '#6e7780'));
    materials.edge.color.set(get('--cad-edge', '#1e2328'));
  }
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Each model is turned so its long axis lies horizontal, then spun about the vertical.
  const AXIS_TO_X = { y: new THREE.Euler(0, 0, -Math.PI / 2), z: new THREE.Euler(0, Math.PI / 2, 0) };
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();

  function load(panel) {
    const url = panel.dataset.model;
    if (!cache.has(url)) {
      const promise = loader
        .loadAsync(url, (e) => {
          if (e.lengthComputable && e.total) setOverlay(`Loading model… ${Math.round((e.loaded / e.total) * 100)}%`);
        })
        .then((gltf) => prepare(gltf.scene, panel.dataset.axis));
      promise.catch(() => cache.delete(url));
      cache.set(url, promise);
    }
    return cache.get(url);
  }

  function prepare(object, axis) {
    object.traverse((o) => {
      if (o.isLineSegments || o.isLine) { o.material = materials.edge; return; }
      if (!o.isMesh) return;
      let kind = 'part';
      for (let p = o; p; p = p.parent) if (p.userData.kind) { kind = p.userData.kind; break; }
      o.material = kind === 'hardware' ? materials.hardware : materials.part;
    });
    const pivot = new THREE.Group();
    pivot.add(object);
    if (AXIS_TO_X[axis]) pivot.rotation.copy(AXIS_TO_X[axis]);
    const holder = new THREE.Group();
    holder.add(pivot);
    holder.updateMatrixWorld(true);
    pivot.position.sub(new THREE.Box3().setFromObject(holder).getCenter(new THREE.Vector3()));
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
    // How far the model reaches from the vertical spin axis, and its half-height.
    const reach = Math.max(...[box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => Math.hypot(x, z)))) || radius;
    const halfHeight = (box.max.y - box.min.y) / 2;
    return { holder, radius, reach, halfHeight };
  }

  let current = null;
  let token = 0;
  const ELEVATION = Math.asin(new THREE.Vector3(1, 0.55, 1.35).normalize().y);

  function fit() {
    const { radius: r, reach, halfHeight } = current;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    // Frame the silhouette the model sweeps while spinning, not its bounding sphere.
    const across = reach / Math.sin(hFov / 2);
    const tall = (halfHeight * Math.cos(ELEVATION) + reach * Math.sin(ELEVATION)) / Math.sin(vFov / 2);
    const dist = Math.max(across, tall) * 1.12;
    camera.near = dist / 100;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();
    camera.position.set(1, 0.55, 1.35).normalize().multiplyScalar(dist);
    controls.target.set(0, 0, 0);
    controls.minDistance = r * 0.6;
    controls.maxDistance = dist * 3;
    controls.autoRotate = !reducedMotion.matches;
    controls.update();
  }
  canvas.addEventListener('dblclick', () => { if (current) fit(); });

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Render continuously only while the viewer is on screen.
  let visible = true;
  let raf = 0;
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); }).observe(view);
  document.addEventListener('visibilitychange', start);

  async function show(panel) {
    const t = ++token;
    setOverlay('Loading model…');
    let model;
    try {
      model = await load(panel);
    } catch (err) {
      console.error(err);
      if (t === token) {
        setOverlay(location.protocol === 'file:'
          ? 'Open the site through a local web server to see the 3D models (see README).'
          : 'Couldn’t load this model. Check your connection and reload the page.', true);
      }
      return;
    }
    if (t !== token) return;
    if (current) scene.remove(current.holder);
    current = model;
    scene.add(model.holder);
    fit();
    canvas.setAttribute('aria-label', `3D model of the ${panel.dataset.title}. Drag to rotate.`);
    setOverlay(null);
    start();
  }

  return { show };
}
