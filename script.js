// ===== CONFIG =====
const ANIM_DUR   = 850;   // ms — matches CSS --slide-dur
const PARALLAX_S = 12;    // max parallax offset in px
const PARALLAX_L = 0.055; // parallax lerp speed
const LIGHT_THEME_SLIDES = new Set(['vestiges', 'phases', 'continuum', 'positioning', 'advantage', 'next', 'open', 'closing', 'contact']);

// ===== STATE =====
let currentIndex = 0;
let isAnimating  = false;
let mouseX = 0, mouseY = 0;
let curX = 0, curY = 0;     // cursor dot  (fast lerp)
let ringX = 0, ringY = 0;   // cursor ring (slow lerp)
let plxX = 0, plxY = 0;     // parallax current
let plxTX = 0, plxTY = 0;   // parallax target
let navDragActive = false;
let navDragPointerId = null;
let sceneStartTimer = null;
let sceneUnlockTimer = null;
let resizeTimer = null;
let mainRafId = null;
let activeSlideEl = null;
let activeContentEl = null;
let activeTextNodes = [];
let activeVestigeStageEl = null;
let activeVestigeFloatersEl = null;
let activeGraphosWindowEl = null;
let draggedGraphosWindowEl = null;
let navTrackEl = null;
let navIndicatorEl = null;
let hoveredTextNode = null;
let hoverProbeX = NaN;
let hoverProbeY = NaN;
let appAlive = true;
const graphosWindowState = {
  x: null,
  y: null,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  pointerId: null,
};
const ACTION_HOVER_SELECTOR = '#nav-track, a, button, [role="button"]';
const TEXT_HOVER_SELECTOR = 'h2, p, a, .ea-wordmark, .phase-timeline, .continuum-flow';
const HAS_FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ===== DOM =====
const slideEls   = [...document.querySelectorAll('.slide')];
const total      = slideEls.length;
const cursorEl   = document.getElementById('cursor');
const ringEl     = document.getElementById('cursor-ring');
const progressEl = document.getElementById('progress-bar');
const numCurEl   = document.getElementById('num-current');
const numTotEl   = document.getElementById('num-total');
const navEl      = document.getElementById('slide-nav');
const graphosWindowHandleEl = document.querySelector('.graphos-window__header');

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(x) { return 1 - Math.pow(1 - clamp(x, 0, 1), 3); }
function easeInOutCubic(x) {
  x = clamp(x, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function rand(min, max) { return min + Math.random() * (max - min); }
function randChoice(items) { return items[(Math.random() * items.length) | 0]; }
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setThemeForSlide(key) {
  document.body.dataset.theme = LIGHT_THEME_SLIDES.has(key) ? 'light' : 'dark';
}

function isLightTheme() {
  return document.body.dataset.theme === 'light';
}

function applyTextMotion() {
  if (!HAS_FINE_POINTER || !activeContentEl || activeTextNodes.length === 0) return;

  const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
  const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
  const slideKey = activeSlideEl ? activeSlideEl.dataset.slide : '';
  const motionScale = slideKey === 'graphos' ? 0.45 : 1;

  activeTextNodes.forEach((node, index) => {
    const depth = index + 1;
    const hoverBoost = hoveredTextNode && (node === hoveredTextNode || node.contains(hoveredTextNode)) ? 1.7 : 1;
    const tx = clamp(nx * 12 * depth * 0.42 * hoverBoost * motionScale, -10, 10);
    const ty = clamp(ny * 10 * depth * 0.36 * hoverBoost * motionScale, -8, 8);
    const rot = clamp(nx * depth * 1.2 * hoverBoost * motionScale, -2.4, 2.4);
    node.style.setProperty('--text-shift-x', tx.toFixed(2) + 'px');
    node.style.setProperty('--text-shift-y', ty.toFixed(2) + 'px');
    node.style.setProperty('--text-rot', rot.toFixed(2) + 'deg');
  });
}

function refreshActiveSlideCache() {
  activeSlideEl = slideEls[currentIndex] || null;
  activeContentEl = activeSlideEl ? activeSlideEl.querySelector('.slide-content') : null;
  const activeSlideKey = activeSlideEl ? activeSlideEl.dataset.slide : '';
  activeTextNodes = activeContentEl && activeSlideKey !== 'founder'
    ? [...activeContentEl.querySelectorAll('h2, p, a, .phase-timeline, .continuum-flow')]
    : [];
  activeVestigeStageEl = activeSlideEl ? activeSlideEl.querySelector('#vestiges-stage, #continuum-stage') : null;
  activeVestigeFloatersEl = activeSlideEl ? activeSlideEl.querySelector('.vestiges-floaters') : null;
  activeGraphosWindowEl = activeSlideEl ? activeSlideEl.querySelector('.graphos-window') : null;
  hoveredTextNode = null;
  hoverProbeX = NaN;
  hoverProbeY = NaN;
}

function restartLogoAnimation(slide) {
  if (!slide) return;
  const logo = slide.querySelector('.ea-wordmark');
  if (!logo) return;

  logo.classList.remove('is-animated');
  requestAnimationFrame(() => {
    if (slide === slideEls[currentIndex]) {
      logo.classList.add('is-animated');
    }
  });
}

function updateVestigeMotion() {
  if (!HAS_FINE_POINTER || !activeSlideEl || !LIGHT_THEME_SLIDES.has(activeSlideEl.dataset.slide) || !activeVestigeStageEl) return;

  const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
  const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
  const x = clamp(nx * 16, -12, 12);
  const y = clamp(ny * 12, -10, 10);
  const scale = 1 + Math.abs(nx) * 0.012 + Math.abs(ny) * 0.01;
  const fx = clamp(nx * 10, -8, 8);
  const fy = clamp(ny * 8, -6, 6);

  activeVestigeStageEl.style.setProperty('--vestige-x', `${x.toFixed(2)}px`);
  activeVestigeStageEl.style.setProperty('--vestige-y', `${y.toFixed(2)}px`);
  activeVestigeStageEl.style.setProperty('--vestige-scale', scale.toFixed(4));

  if (activeVestigeFloatersEl) {
    activeVestigeFloatersEl.style.setProperty('--vestige-floaters-x', `${fx.toFixed(2)}px`);
    activeVestigeFloatersEl.style.setProperty('--vestige-floaters-y', `${fy.toFixed(2)}px`);
    activeVestigeFloatersEl.style.setProperty('--vestige-floaters-scale', (1 + Math.abs(ny) * 0.008).toFixed(4));
  }
}

// =============================================
// SLIDE ENGINE
// =============================================

function goTo(index, opts = {}) {
  const force = opts === true || opts.force === true;
  if ((isAnimating && !force) || index === currentIndex) return;
  if (index < 0 || index >= total) return;

  if (force) {
    isAnimating = false;
    clearTimeout(sceneStartTimer);
    clearTimeout(sceneUnlockTimer);
  }

  isAnimating = true;
  endGraphosWindowDrag();

  stopScene(slideEls[currentIndex].dataset.slide);

  currentIndex = index;
  applyClasses();
  updateUI();
  setThemeForSlide(slideEls[currentIndex].dataset.slide);

  // Reset parallax so new slide starts centered
  plxTX = 0; plxTY = 0;

  // Small delay before starting scene so the slide is visible first
  clearTimeout(sceneStartTimer);
  clearTimeout(sceneUnlockTimer);
  sceneStartTimer = setTimeout(() => startScene(slideEls[currentIndex].dataset.slide), 180);
  sceneUnlockTimer = setTimeout(() => { isAnimating = false; }, ANIM_DUR);
}

function applyClasses() {
  slideEls.forEach((el, i) => {
    el.classList.remove('is-active', 'is-before', 'is-after');
    if      (i === currentIndex) el.classList.add('is-active');
    else if (i  <  currentIndex) el.classList.add('is-before');
    else                         el.classList.add('is-after');
  });
  refreshActiveSlideCache();
  restartLogoAnimation(slideEls[currentIndex]);
  syncGraphosWindowPosition();
}


// =============================================
// UI: COUNTER + PROGRESS + NAV INDICATOR
// =============================================

function initUI() {
  numTotEl.textContent = String(total).padStart(2, '0');
  const track = document.createElement('div');
  track.id = 'nav-track';
  track.innerHTML = '<div id="nav-indicator"></div>';
  navEl.appendChild(track);
  navTrackEl = track;
  navIndicatorEl = track.firstElementChild;
  track.addEventListener('pointerdown', onNavPointerDown);
  updateUI();
}

function updateUI() {
  numCurEl.textContent = String(currentIndex + 1).padStart(2, '0');
  const progress = total > 1 ? currentIndex / (total - 1) : 1;
  progressEl.style.setProperty('--progress-scale', progress.toFixed(4));
  if (!navIndicatorEl || !navTrackEl) return;
  const max = navTrackEl.offsetHeight - 14;
  navIndicatorEl.style.setProperty('--nav-y', (progress * max).toFixed(2) + 'px');
}

function getNavIndexFromClientY(clientY) {
  if (!navTrackEl) return currentIndex;
  const rect = navTrackEl.getBoundingClientRect();
  const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
  return Math.round(ratio * (total - 1));
}

function onNavPointerDown(e) {
  if (e.button !== 0) return;
  const track = e.currentTarget;
  navDragActive = true;
  navDragPointerId = e.pointerId;
  track.classList.add('is-dragging');
  track.setPointerCapture(e.pointerId);
  e.preventDefault();
  goTo(getNavIndexFromClientY(e.clientY), { force: true });
}

function onNavPointerMove(e) {
  if (!navDragActive || e.pointerId !== navDragPointerId) return;
  const nextIndex = getNavIndexFromClientY(e.clientY);
  if (nextIndex !== currentIndex) {
    goTo(nextIndex, { force: true });
  }
}

function endNavDrag(e) {
  if (!navDragActive || (e.pointerId != null && e.pointerId !== navDragPointerId)) return;
  navDragActive = false;
  navDragPointerId = null;
  if (navTrackEl) navTrackEl.classList.remove('is-dragging');
}

function updateHoverTargets(force = false) {
  const x = Math.round(mouseX);
  const y = Math.round(mouseY);
  if (!force && x === hoverProbeX && y === hoverProbeY) return;

  hoverProbeX = x;
  hoverProbeY = y;

  const el = document.elementFromPoint(x, y);
  const activeActionEl = el && el.closest ? el.closest(ACTION_HOVER_SELECTOR) : null;
  hoveredTextNode = activeContentEl && el && el.closest ? el.closest(TEXT_HOVER_SELECTOR) : null;
  document.body.classList.toggle('is-action-hover', !!activeActionEl);
}

function clearActionHoverState() {
  document.body.classList.remove('is-action-hover');
  hoveredTextNode = null;
  hoverProbeX = NaN;
  hoverProbeY = NaN;
}

function getGraphosWindowDefaults() {
  if (!activeGraphosWindowEl) return null;
  const narrow = window.innerWidth < 900;
  return {
    x: narrow ? window.innerWidth * 0.5 : window.innerWidth * 0.72,
    y: narrow ? window.innerHeight * 0.38 : window.innerHeight * 0.30,
  };
}

function clampGraphosWindowPosition(x, y, el = activeGraphosWindowEl) {
  if (!el) return { x, y };
  const rect = el.getBoundingClientRect();
  const minX = rect.width / 2 + 18;
  const maxX = Math.max(minX, window.innerWidth - rect.width / 2 - 18);
  const minY = rect.height / 2 + 18;
  const maxY = Math.max(minY, window.innerHeight - rect.height / 2 - 18);
  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

function syncGraphosWindowPosition(forceDefault = false) {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'graphos' || !activeGraphosWindowEl) return;

  if (graphosWindowState.x == null || graphosWindowState.y == null || forceDefault) {
    const defaults = getGraphosWindowDefaults();
    if (defaults) {
      graphosWindowState.x = defaults.x;
      graphosWindowState.y = defaults.y;
    }
  }

  const pos = clampGraphosWindowPosition(graphosWindowState.x, graphosWindowState.y);
  graphosWindowState.x = pos.x;
  graphosWindowState.y = pos.y;
  activeGraphosWindowEl.style.setProperty('--graphos-x', `${pos.x.toFixed(1)}px`);
  activeGraphosWindowEl.style.setProperty('--graphos-y', `${pos.y.toFixed(1)}px`);
}

function beginGraphosWindowDrag(e) {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'graphos' || !activeGraphosWindowEl) return;
  if (e.button !== 0) return;

  const rect = activeGraphosWindowEl.getBoundingClientRect();
  graphosWindowState.dragging = true;
  graphosWindowState.pointerId = e.pointerId;
  graphosWindowState.offsetX = e.clientX - (rect.left + rect.width / 2);
  graphosWindowState.offsetY = e.clientY - (rect.top + rect.height / 2);
  draggedGraphosWindowEl = activeGraphosWindowEl;
  draggedGraphosWindowEl.classList.add('is-dragging');
  if (graphosWindowHandleEl && graphosWindowHandleEl.setPointerCapture) {
    graphosWindowHandleEl.setPointerCapture(e.pointerId);
  }
  e.preventDefault();
}

function updateGraphosWindowDrag(e) {
  const windowEl = draggedGraphosWindowEl || activeGraphosWindowEl;
  if (!graphosWindowState.dragging || e.pointerId !== graphosWindowState.pointerId || !windowEl) return;
  graphosWindowState.x = e.clientX - graphosWindowState.offsetX;
  graphosWindowState.y = e.clientY - graphosWindowState.offsetY;
  syncGraphosWindowPosition();
}

function endGraphosWindowDrag(e) {
  if (!graphosWindowState.dragging) return;
  if (e && 'pointerId' in e && e.pointerId !== graphosWindowState.pointerId) return;
  graphosWindowState.dragging = false;
  graphosWindowState.pointerId = null;
  if (draggedGraphosWindowEl) draggedGraphosWindowEl.classList.remove('is-dragging');
  draggedGraphosWindowEl = null;
}


// =============================================
// CURSOR + PARALLAX LOOP
// =============================================

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  plxTX = ((e.clientX - cx) / cx) * PARALLAX_S;
  plxTY = ((e.clientY - cy) / cy) * PARALLAX_S;
}, { passive: true });

document.addEventListener('pointermove', onNavPointerMove, { passive: true });
document.addEventListener('pointermove', updateGraphosWindowDrag, { passive: true });
document.addEventListener('pointerup', endNavDrag);
document.addEventListener('pointerup', endGraphosWindowDrag);
document.addEventListener('pointercancel', endNavDrag);
document.addEventListener('pointercancel', endGraphosWindowDrag);
document.addEventListener('mouseleave', clearActionHoverState);

if (graphosWindowHandleEl) {
  graphosWindowHandleEl.addEventListener('pointerdown', beginGraphosWindowDrag);
}

function animLoop() {
  if (!appAlive) return;

  if (HAS_FINE_POINTER) {
    curX = lerp(curX, mouseX, 0.18);
    curY = lerp(curY, mouseY, 0.18);
    cursorEl.style.left = curX + 'px';
    cursorEl.style.top  = curY + 'px';

    ringX = lerp(ringX, mouseX, 0.09);
    ringY = lerp(ringY, mouseY, 0.09);
    ringEl.style.left = ringX + 'px';
    ringEl.style.top  = ringY + 'px';
  }

  plxX = lerp(plxX, plxTX, PARALLAX_L);
  plxY = lerp(plxY, plxTY, PARALLAX_L);
  if (activeContentEl) {
    if (activeSlideEl && activeSlideEl.dataset.slide === 'founder') {
      activeContentEl.style.transform = 'translate3d(0px, 0px, 0px)';
    } else if (HAS_FINE_POINTER) {
      activeContentEl.style.transform = `translate(${plxX.toFixed(2)}px,${plxY.toFixed(2)}px)`;
    } else {
      activeContentEl.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  }

  if (HAS_FINE_POINTER) {
    updateHoverTargets();
  } else {
    document.body.classList.remove('is-action-hover');
  }
  applyTextMotion();
  updateVestigeMotion();

  mainRafId = requestAnimationFrame(animLoop);
}


// =============================================
// SHARED CANVAS HELPER
// =============================================

// =============================================
// SCENE: GRAPH
// Configurable organic node graph.
// Used for: SPACE (standard), GraphOS (sparse), R&D (dense+trails), Physical (spread)
// =============================================

class GraphScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.opts   = {
      nodeCount: opts.nodeCount || 22,
      speed:     opts.speed     || 0.45,
      thresh:    opts.thresh    || 0.28,    // fraction of min(w,h)
      trails:    opts.trails    || false,   // motion-blur trail effect
      edgeAlpha: opts.edgeAlpha || 0.16,
      nodeAlpha: opts.nodeAlpha || [0.28, 0.42],
    };
    this.nodes   = [];
    this.running = false;
    this.raf     = null;
    this.t       = 0;
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width  = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  _init() {
    const { nodeCount, speed } = this.opts;
    this.nodes = Array.from({ length: nodeCount }, () => ({
      x:     Math.random() * this.w,
      y:     Math.random() * this.h,
      vx:    (Math.random() - 0.5) * speed,
      vy:    (Math.random() - 0.5) * speed,
      r:     1.4 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    // Clear canvas on stop so it doesn't show stale frames
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() { this._resize(); }

  _loop() {
    if (!this.running) return;
    this.t += 0.01;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const { w, h } = this;
    this.nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) { n.vx *= -1; n.x = Math.max(0, Math.min(w, n.x)); }
      if (n.y < 0 || n.y > h) { n.vy *= -1; n.y = Math.max(0, Math.min(h, n.y)); }
    });
  }

  _draw() {
    const { ctx, w, h, nodes, t } = this;
    const { thresh, trails, edgeAlpha, nodeAlpha } = this.opts;

    // Trails mode: instead of clearing, paint semi-transparent overlay
    // Creates a "motion blur" that evokes active computation
    if (trails) {
      ctx.fillStyle = 'rgba(4,4,4,0.18)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    const d = Math.min(w, h) * thresh;

    // Edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[j].x - nodes[i].x;
        const dy   = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < d) {
          ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / d) * edgeAlpha})`;
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach(n => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + n.phase);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.75 + 0.45 * pulse), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${nodeAlpha[0] + nodeAlpha[1] * pulse})`;
      ctx.fill();
    });
  }
}


// =============================================
// SCENE: PULSE
// Expanding concentric rings from a point.
// Used for: Intro (gentle), Autonomy (focused), Closing (calm)
// =============================================

class PulseScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.opts   = {
      maxR:     opts.maxR     || 340,
      interval: opts.interval || 2400,   // ms between ring spawns
      maxAlpha: opts.maxAlpha || 0.10,
      cx:       opts.cx       || 0.5,    // relative center (0–1)
      cy:       opts.cy       || 0.5,
      speed:    opts.speed    || 0.7,    // ring expansion speed
    };
    this.rings   = [];
    this.running = false;
    this.raf     = null;
    this.elapsed = 0;
    this.lastSpawn = -9999;
    this._resize();
  }

  _resize() {
    this.w = this.canvas.width  = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  start() {
    if (this.running) return;
    this.running   = true;
    this.elapsed   = 0;
    this.lastSpawn = -9999;
    this.rings     = [];
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() { this._resize(); }

  _loop() {
    if (!this.running) return;
    this.elapsed += 16;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const { interval, maxR, speed } = this.opts;
    if (this.elapsed - this.lastSpawn >= interval) {
      this.rings.push({ r: 0 });
      this.lastSpawn = this.elapsed;
    }
    this.rings.forEach(ring => { ring.r += speed; });
    this.rings = this.rings.filter(ring => ring.r < maxR);
  }

  _draw() {
    const { ctx, w, h } = this;
    const { maxR, maxAlpha, cx, cy } = this.opts;
    const px = cx * w;
    const py = cy * h;
    const light = isLightTheme();

    ctx.clearRect(0, 0, w, h);
    if (light) {
      const bg = ctx.createRadialGradient(px, py, 0, px, py, Math.max(w, h) * 0.75);
      bg.addColorStop(0, 'rgba(255,255,255,1)');
      bg.addColorStop(1, 'rgba(244,244,242,1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }

    this.rings.forEach(ring => {
      const p     = ring.r / maxR;
      // Envelope: rises quickly, falls slowly — like a breath
      const alpha = maxAlpha * (1 - p) * Math.sin(p * Math.PI * 0.9);
      if (alpha < 0.002) return;
      ctx.beginPath();
      ctx.arc(px, py, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = light ? `rgba(0,0,0,${alpha * 0.9})` : `rgba(255,255,255,${alpha})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    });
  }
}


// =============================================
// SCENE: ASSEMBLE
// Scattered nodes snap into a grid structure, then dissolve.
// Used for: Build, Combination
// =============================================

class AssembleScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.opts   = {
      cols:   opts.cols   || 4,
      rows:   opts.rows   || 3,
      gap:    opts.gap    || 30,
      speed:  opts.speed  || 0.007,
      cx:     opts.cx     || 0.5,    // 0–1 relative
      cy:     opts.cy     || 0.5,
    };
    this.blocks  = [];
    this.running = false;
    this.raf     = null;
    this.t       = 0;
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width  = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  _init() {
    const { cols, rows, gap, cx, cy } = this.opts;
    const gw = (cols - 1) * gap;
    const gh = (rows - 1) * gap;
    const ox = this.w * cx - gw / 2;
    const oy = this.h * cy - gh / 2;

    this.blocks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = ox + c * gap;
        const ty = oy + r * gap;
        const a  = Math.random() * Math.PI * 2;
        const d  = 160 + Math.random() * 200;
        this.blocks.push({
          x:     this.w * cx + Math.cos(a) * d,
          y:     this.h * cy + Math.sin(a) * d,
          tx, ty,
          delay: (r * cols + c) * 0.035,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._init();   // re-scatter blocks on each activation
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() { this._resize(); this._init(); }

  _loop() {
    if (!this.running) return;
    this.t += this.opts.speed;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _ease(x) { return 1 - Math.pow(1 - Math.min(x, 1), 3); }

  _draw() {
    const { ctx, blocks, t } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    // Cycle: 5s — scatter → assemble → hold → scatter
    const cyc     = t % 5;
    let assemble;
    if      (cyc < 2)   assemble = cyc / 2;
    else if (cyc < 3.5) assemble = 1;
    else                assemble = 1 - (cyc - 3.5) / 1.5;

    // Draw connections between assembled blocks
    if (assemble > 0.5) {
      const fa = (assemble - 0.5) / 0.5;
      blocks.forEach((b, i) => {
        const col = i % this.opts.cols;
        const row = Math.floor(i / this.opts.cols);
        // Connect right neighbor
        if (col < this.opts.cols - 1) {
          const nb = blocks[i + 1];
          ctx.strokeStyle = `rgba(255,255,255,${fa * 0.12})`;
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(b.tx, b.ty);
          ctx.lineTo(nb.tx, nb.ty);
          ctx.stroke();
        }
        // Connect bottom neighbor
        if (row < this.opts.rows - 1) {
          const nb = blocks[i + this.opts.cols];
          ctx.strokeStyle = `rgba(255,255,255,${fa * 0.12})`;
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(b.tx, b.ty);
          ctx.lineTo(nb.tx, nb.ty);
          ctx.stroke();
        }
      });
    }

    // Draw blocks
    blocks.forEach(b => {
      const p  = this._ease(Math.max(0, assemble - b.delay));
      const x  = b.x + (b.tx - b.x) * p;
      const y  = b.y + (b.ty - b.y) * p;
      const a  = 0.12 + 0.55 * p;
      const sz = 2.5;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x - sz, y - sz, sz * 2, sz * 2);
    });
  }
}


// =============================================
// SCENE: CONVERGENCE
// Particles converge to a central node, then expand.
// Configurable speed for different conceptual weights.
// Used for: Unification (gentle), One system (standard), Rupture (fast/sharp)
// =============================================

class ConvergenceScene {
  constructor(canvas, opts = {}) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.opts      = {
      cycleDur:   opts.cycleDur   || 3.5,   // total cycle length (seconds-equivalent)
      particles:  opts.particles  || 38,
      spread:     opts.spread     || 300,   // max initial distance from center
      sharp:      opts.sharp      || false, // sharp convergence (rupture mode)
    };
    this.particles = [];
    this.running   = false;
    this.raf       = null;
    this.t         = 0;
    this._resize();
    this._init();
  }

  _resize() {
    this.w  = this.canvas.width  = this.canvas.offsetWidth;
    this.h  = this.canvas.height = this.canvas.offsetHeight;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
  }

  _init() {
    const { particles, spread } = this.opts;
    this.particles = Array.from({ length: particles }, () => {
      const a = Math.random() * Math.PI * 2;
      const d = 80 + Math.random() * (spread - 80);
      return {
        sx: Math.cos(a) * d,
        sy: Math.sin(a) * d,
        phase: Math.random() * Math.PI * 2,
        spd:   0.4 + Math.random() * 0.5,
      };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() { this._resize(); }

  _loop() {
    if (!this.running) return;
    this.t += 0.007;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, cx, cy, particles, t } = this;
    const { cycleDur, sharp } = this.opts;
    ctx.clearRect(0, 0, this.w, this.h);

    const cycle = t % cycleDur;
    const c1 = cycleDur * 0.4;  // converge ends
    const c2 = cycleDur * 0.57; // hold ends
    const c3 = cycleDur * 0.8;  // expand ends

    let prog;
    if      (cycle < c1) prog = cycle / c1;
    else if (cycle < c2) prog = 1;
    else if (cycle < c3) prog = 1 - (cycle - c2) / (c3 - c2);
    else                 prog = 0;

    // Sharp mode: steeper easing (rupture feeling)
    const e = sharp
      ? 1 - Math.pow(1 - prog, 4)
      : 1 - Math.pow(1 - prog, 2.5);

    particles.forEach(p => {
      const wobble = Math.sin(t * p.spd + p.phase) * 9;
      const x = cx + p.sx * (1 - e) + wobble;
      const y = cy + p.sy * (1 - e) + wobble * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 1 + e * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.07 + e * 0.22})`;
      ctx.fill();
    });

    // Central node
    if (prog > 0.55) {
      const ca = (prog - 0.55) / 0.45;
      const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28 * ca);
      g.addColorStop(0, `rgba(255,255,255,${ca * 0.18})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 28 * ca, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, ca * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${ca * 0.85})`;
      ctx.fill();
    }
  }
}


// =============================================
// SCENE: INFRASTRUCTURE
// Surface projects. Context defines semantics.
// Intents move changes into a canonical core graph.
// =============================================

class InfrastructureScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.surfaceWindow = null;
    this.contextBand = null;
    this.core = null;
    this.modules = [];
    this.contextEntries = [];
    this.coreLayout = [];
    this.coreEdges = [];
    this.intents = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.surfaceWindow = {
      x: this.w * 0.5,
      y: this.h * 0.18,
      w: clamp(this.w * 0.40, 300, 500),
      h: clamp(this.h * 0.19, 136, 188),
      phase: rand(0, Math.PI * 2),
    };
    this.contextBand = {
      x: this.w * 0.10,
      y: this.h * 0.43,
      w: this.w * 0.80,
      h: clamp(this.h * 0.18, 130, 178),
    };
    this.core = {
      x: this.w * 0.52,
      y: this.h * 0.74,
      r: clamp(Math.min(this.w, this.h) * 0.18, 96, 180),
    };
  }

  _init() {
    const moduleLabels = ['Identity', 'Workspace', 'Assets', 'Programs', 'Domotics', 'Logistics', 'Flux'];
    const moduleTargets = [1, 2, 4, 6, 3, 7, 5];
    const moduleStartX = this.w * 0.18;
    const moduleEndX = this.w * 0.82;
    const moduleStep = (moduleEndX - moduleStartX) / Math.max(1, moduleLabels.length - 1);
    const moduleY = this.contextBand.y - 26;

    this.modules = moduleLabels.map((label, index) => ({
      label,
      baseX: moduleStartX + moduleStep * index,
      baseY: moduleY + (index % 2 === 0 ? -3 : 9),
      w: 88 + label.length * 2.9,
      h: 25,
      phase: rand(0, Math.PI * 2),
      depth: 0.42 + (index % 3) * 0.08,
      targetIndex: moduleTargets[index],
      intentSpeed: 0.14 + Math.random() * 0.07,
    }));

    this.contextEntries = [
      { key: 'registry', value: 'global meaning' },
      { key: 'ownership', value: 'canonical' },
      { key: 'policy', value: 'shared rules' },
      { key: 'state', value: 'live memory' },
      { key: 'intent', value: 'surface action' },
      { key: 'projection', value: 'surface output' },
      { key: 'scope', value: 'module boundary' },
      { key: 'metadata', value: 'graph context' },
      { key: 'routing', value: 'edge path' },
      { key: 'linkage', value: 'node relation' },
      { key: 'semantics', value: 'registry layer' },
      { key: 'contracts', value: 'interface' },
    ];

    // Canonical core graph: a stable internal topology of nodes and edges.
    this.coreLayout = [
      { ox: 0.00, oy: 0.00, r: 4.8, wobble: 1.0 },
      { ox: -0.26, oy: -0.18, r: 2.9, wobble: 0.85 },
      { ox: 0.26, oy: -0.15, r: 2.8, wobble: 0.80 },
      { ox: -0.34, oy: 0.16, r: 2.4, wobble: 0.72 },
      { ox: 0.18, oy: 0.24, r: 2.5, wobble: 0.75 },
      { ox: 0.00, oy: -0.35, r: 2.2, wobble: 0.70 },
      { ox: 0.40, oy: 0.06, r: 2.2, wobble: 0.68 },
      { ox: -0.14, oy: 0.40, r: 2.1, wobble: 0.66 },
    ];
    this.coreEdges = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 5], [2, 5], [1, 3], [2, 4],
      [3, 7], [4, 6], [6, 7],
    ];

    this.intents = this.modules.map((module, index) => ({
      moduleIndex: index,
      targetIndex: module.targetIndex,
      phase: rand(0, Math.PI * 2),
      speed: module.intentSpeed,
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.007;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _parallax(depth) {
    const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
    const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
    return { x: nx * depth, y: ny * depth };
  }

  _quadPoint(a, b, c, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * a.x + 2 * mt * t * b.x + t * t * c.x,
      y: mt * mt * a.y + 2 * mt * t * b.y + t * t * c.y,
    };
  }

  _drawTag(text, x, y, accent = 0.5, align = 'left') {
    const { ctx } = this;
    ctx.save();
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    const padX = 10;
    const padY = 7;
    const textW = ctx.measureText(text).width;
    const w = textW + padX * 2;
    const h = 22;
    const px = align === 'center' ? x - w / 2 : x;
    const py = y - h / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.045 + accent * 0.06})`;
    roundRect(ctx, px, py, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + accent * 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.54 + accent * 0.24})`;
    ctx.fillText(text, px + padX, y + 0.5);
    ctx.restore();
  }

  _drawBackground() {
    const { ctx } = this;
    const bg = ctx.createRadialGradient(
      this.w * 0.5,
      this.core.y - this.core.r * 0.45,
      0,
      this.w * 0.5,
      this.core.y - this.core.r * 0.25,
      Math.max(this.w, this.h) * 0.85,
    );
    bg.addColorStop(0, 'rgba(9,9,11,1)');
    bg.addColorStop(0.7, 'rgba(5,5,7,1)');
    bg.addColorStop(1, 'rgba(2,2,3,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.028)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = this.h * 0.18 + i * (this.h * 0.11);
      ctx.beginPath();
      ctx.moveTo(this.w * 0.06, y);
      ctx.lineTo(this.w * 0.94, y);
      ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const x = this.w * 0.5 + i * (this.w * 0.11);
      ctx.beginPath();
      ctx.moveTo(x, this.h * 0.16);
      ctx.lineTo(x + this.w * 0.03, this.h * 0.84);
      ctx.stroke();
    }
  }

  _drawSurfaceWindow() {
    const { ctx } = this;
    const drift = this._parallax(14);
    const wobbleX = Math.sin(this.t * 0.18 + this.surfaceWindow.phase) * 4;
    const wobbleY = Math.cos(this.t * 0.14 + this.surfaceWindow.phase) * 2.5;
    const x = this.surfaceWindow.x + drift.x * 0.25 + wobbleX;
    const y = this.surfaceWindow.y + drift.y * 0.18 + wobbleY;
    const w = this.surfaceWindow.w;
    const h = this.surfaceWindow.h;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.sin(this.t * 0.08 + this.surfaceWindow.phase) + (mouseX / this.w - 0.5)) * 0.006);

    const fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fill.addColorStop(0, 'rgba(255,255,255,0.12)');
    fill.addColorStop(0.35, 'rgba(255,255,255,0.06)');
    fill.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fill;
    roundRect(ctx, -w / 2, -h / 2, w, h, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, 26, 20);
    ctx.fill();

    // Browser chrome.
    const chromeY = -h / 2 + 13;
    ['#fff', '#fff', '#fff'].forEach((_, i) => {
      ctx.beginPath();
      ctx.arc(-w / 2 + 16 + i * 10, chromeY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.45 - i * 0.08})`;
      ctx.fill();
    });
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.56)';
    ctx.fillText('public surface', -w / 2 + 58, chromeY + 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, -w / 2 + 42, -h / 2 + 8, w - 58, 12, 6);
    ctx.fill();

    // Public surface preview.
    const padX = -w / 2 + 16;
    const padY = -h / 2 + 34;
    const innerW = w - 32;
    const innerH = h - 48;
    ctx.save();
    roundRect(ctx, padX, padY, innerW, innerH, 18);
    ctx.clip();

    const hero = ctx.createLinearGradient(padX, padY, padX + innerW, padY + innerH);
    hero.addColorStop(0, 'rgba(255,255,255,0.08)');
    hero.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = hero;
    ctx.fillRect(padX, padY, innerW, innerH);

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, padX + 10, padY + 10, innerW * 0.58, 20, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, padX + 10, padY + 38, innerW * 0.82, 9, 4.5);
    ctx.fill();
    roundRect(ctx, padX + 10, padY + 54, innerW * 0.52, 9, 4.5);
    ctx.fill();

    const cardY = padY + innerH - 50;
    for (let i = 0; i < 3; i++) {
      const cw = innerW * (0.28 - i * 0.02);
      const cx = padX + 10 + i * (cw + 10);
      const cy = cardY + Math.sin(this.t * 0.7 + this.surfaceWindow.phase + i) * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02})`;
      roundRect(ctx, cx, cy, cw, 26, 11);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,0.20)`;
      roundRect(ctx, cx + 8, cy + 7, cw * 0.6, 4, 2);
      ctx.fill();
    }
    ctx.restore();

    this._drawTag('Surface', x, y + h / 2 + 22, 0.65, 'center');
    ctx.restore();
  }

  _drawContextBand() {
    const { ctx } = this;
    const drift = this._parallax(10);
    const x = this.contextBand.x + drift.x * 0.2;
    const y = this.contextBand.y + drift.y * 0.12;
    const w = this.contextBand.w;
    const h = this.contextBand.h;
    const rowH = 18;
    const rows = Math.ceil(h / rowH) + 4;
    const scroll = (this.t * 20) % rowH;

    ctx.save();
    roundRect(ctx, x, y, w, h, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    const fill = ctx.createLinearGradient(x, y, x + w, y + h);
    fill.addColorStop(0, 'rgba(255,255,255,0.02)');
    fill.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    fill.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y + h - 1, w, 1);

    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText('Context', x + 16, y + 18);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillText('global registry', x + w - 96, y + 18);

    for (let i = -1; i < rows; i++) {
      const entryIndex = ((i + Math.floor(this.t * 1.5)) % this.contextEntries.length + this.contextEntries.length) % this.contextEntries.length;
      const entry = this.contextEntries[entryIndex];
      const rowY = y + 42 + i * rowH - scroll;
      if (rowY < y + 28 || rowY > y + h - 12) continue;
      const alpha = 0.10 + 0.20 * (1 - Math.abs((rowY - (y + h / 2)) / (h / 2)));
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x + 16, rowY, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.62 + alpha * 0.7})`;
      ctx.fillText(entry.key.toUpperCase(), x + 28, rowY);
      ctx.fillStyle = `rgba(255,255,255,${0.34 + alpha * 0.55})`;
      ctx.fillText(entry.value, x + w * 0.48, rowY);
    }

    ctx.restore();
  }

  _drawIntents(coreNodes) {
    const { ctx } = this;
    const drift = this._parallax(8);
    const bandY = this.contextBand.y + drift.y * 0.12;
    const bandBottom = bandY + this.contextBand.h;
    const spineX = this.core.x + drift.x * 0.08;
    const spineTop = bandBottom + 8;
    const spineBottom = this.core.y - this.core.r * 1.02;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Intent spine: the action corridor from semantics into the core.
    const spine = ctx.createLinearGradient(spineX, spineTop, spineX, spineBottom);
    spine.addColorStop(0, 'rgba(255,255,255,0)');
    spine.addColorStop(0.28, 'rgba(255,255,255,0.12)');
    spine.addColorStop(0.75, 'rgba(255,255,255,0.18)');
    spine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = spine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(spineX, spineTop);
    ctx.lineTo(spineX, spineBottom);
    ctx.stroke();

    this._drawTag('Intents', spineX, bandBottom + 18, 0.7, 'center');

    this.intents.forEach((intent, index) => {
      const module = this.modules[intent.moduleIndex];
      const target = coreNodes[intent.targetIndex];
      if (!module || !target) return;

      const start = {
        x: module.x,
        y: module.y + module.h * 0.55,
      };
      const control = {
        x: lerp(start.x, spineX, 0.45) + Math.sin(this.t * 0.9 + intent.phase) * 16,
        y: bandBottom + 16 + Math.cos(this.t * 0.7 + intent.phase) * 5,
      };
      const end = {
        x: target.x,
        y: target.y,
      };

      const pulse = (this.t * intent.speed + intent.phase) % 1;
      const pt = this._quadPoint(start, control, end, pulse);
      const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 22);
      glow.addColorStop(0, 'rgba(255,255,255,0.22)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.strokeStyle = `rgba(255,255,255,${0.035 + index * 0.005})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
      ctx.stroke();

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.30 + 0.28 * Math.sin(intent.phase + pulse * Math.PI * 2) ** 2})`;
      ctx.fill();
    });

    ctx.restore();
  }

  _drawCore(coreNodes) {
    const { ctx } = this;
    const drift = this._parallax(6);
    const x = this.core.x + drift.x * 0.1;
    const y = this.core.y + drift.y * 0.08;
    const r = this.core.r;

    const coreGlow = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r * 2.7);
    coreGlow.addColorStop(0, 'rgba(255,255,255,0.12)');
    coreGlow.addColorStop(0.7, 'rgba(255,255,255,0.04)');
    coreGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    roundRect(ctx, x - r, y - r, r * 2, r * 2, r * 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.clip();

    // Internal canonical graph: only nodes and edges live here.
    const nodes = this.coreLayout.map((layout, index) => ({
      x: x + layout.ox * r * 0.80 + Math.sin(this.t * 0.7 + layout.ox * 9 + index) * layout.wobble,
      y: y + layout.oy * r * 0.80 + Math.cos(this.t * 0.64 + layout.oy * 7 + index) * layout.wobble * 0.78,
      r: layout.r,
      phase: index * 0.7,
    }));

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.coreEdges.forEach(([a, b]) => {
      const na = nodes[a];
      const nb = nodes[b];
      if (!na || !nb) return;
      const gradient = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
    });
    ctx.restore();

    nodes.forEach((node, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.4 + node.phase);
      const size = node.r * (0.86 + pulse * 0.38);
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.18 + pulse * 0.38})`;
      ctx.fill();

      if (index === 0) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.restore();

    this._drawTag('Core', x, y - r - 28, 0.9, 'center');

    // Tiny legend inside the core: nodes and edges define topology.
    ctx.save();
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    const legendX = x - r * 0.46;
    const legendY = y + r * 0.47;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(legendX, legendY, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('Node', legendX + 9, legendY + 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(legendX + 42, legendY);
    ctx.lineTo(legendX + 70, legendY);
    ctx.stroke();
    ctx.fillText('Edge', legendX + 76, legendY + 0.4);
    ctx.restore();
  }

  _drawSurfaceSchematic() {
    const { ctx } = this;
    const isCompact = this.w < 920;
    const drift = this._parallax(18);
    const baseX = this.w * (isCompact ? 0.78 : 0.83) + drift.x * 0.16;
    const baseY = this.h * (isCompact ? 0.11 : 0.13) + drift.y * 0.16;
    const scale = isCompact ? 0.85 : 1;
    const hoverDx = mouseX - baseX;
    const hoverDy = mouseY - baseY;
    const hover = clamp(1 - Math.hypot(hoverDx, hoverDy) / 240, 0, 1);

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate((Math.sin(this.t * 0.09) * 0.02) + hover * 0.01);
    ctx.scale(scale + hover * 0.04, scale + hover * 0.04);
    ctx.globalCompositeOperation = 'screen';

    // Very light floating field behind the diagram.
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
    bg.addColorStop(0, `rgba(255,255,255,${0.10 + hover * 0.05})`);
    bg.addColorStop(0.65, 'rgba(255,255,255,0.03)');
    bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    // Surface rail.
    ctx.strokeStyle = `rgba(255,255,255,${0.40 + hover * 0.20})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.lineTo(44, -10);
    ctx.stroke();

    // Surface label.
    this._drawTag('Surface', -2, -26, 0.95, 'center');

    // Surface node.
    ctx.beginPath();
    ctx.arc(56, -10, 3.4 + hover * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.78 + hover * 0.10})`;
    ctx.fill();

    // Link into the graph.
    const link = ctx.createLinearGradient(44, -10, 36, 32);
    link.addColorStop(0, `rgba(255,255,255,${0.34 + hover * 0.12})`);
    link.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = link;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(44, -10);
    ctx.lineTo(38, 12);
    ctx.lineTo(34, 30);
    ctx.stroke();

    // Minimal graph cluster.
    const nodes = [
      { x: 34, y: 30, r: 2.8 },
      { x: 14, y: 46, r: 2.1 },
      { x: 52, y: 48, r: 2.0 },
      { x: 29, y: 66, r: 2.2 },
    ];
    const edges = [[0, 1], [0, 2], [1, 3], [2, 3]];
    edges.forEach(([a, b]) => {
      const na = nodes[a];
      const nb = nodes[b];
      ctx.strokeStyle = `rgba(255,255,255,${0.22 + hover * 0.10})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
    });
    nodes.forEach((node, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.4 + index * 0.8);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + pulse * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.42 + pulse * 0.20 + hover * 0.10})`;
      ctx.fill();
    });

    this._drawTag('Node', 10, 86, 0.58, 'center');
    this._drawTag('Edge', 46, 14, 0.42, 'center');

    // Tiny action hint: the diagram feels present but stays discreet.
    const beam = ctx.createLinearGradient(-18, 14, 62, 70);
    beam.addColorStop(0, 'rgba(255,255,255,0)');
    beam.addColorStop(0.5, `rgba(255,255,255,${0.08 + hover * 0.06})`);
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = beam;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.lineTo(62, 70);
    ctx.stroke();

    ctx.restore();
  }

  _draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    this._drawBackground();

    // Surface projects the system.
    this._drawSurfaceWindow();

    // Context sits between surface and core, carrying the global registry.
    this._drawContextBand();

    // Modules are in the middle layer, same conceptual band as context.
    this.modules.forEach((module, index) => {
      const drift = this._parallax(12);
      const x = module.baseX + drift.x * module.depth * 0.18 + Math.sin(this.t * 0.7 + module.phase) * 3.2;
      const y = module.baseY + drift.y * module.depth * 0.14 + Math.cos(this.t * 0.6 + module.phase) * 2.2;
      const w = module.w;
      const h = module.h;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.sin(this.t * 0.15 + module.phase) + (mouseX / this.w - 0.5)) * 0.01);

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.beginPath();
      ctx.arc(-w / 2 + 14, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '500 10px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(module.label, -w / 2 + 24, 0.3);
      ctx.restore();

      // Faint tether into the context band.
      const tetherX = x;
      const tetherY1 = y + h / 2;
      const tetherY2 = this.contextBand.y + this.contextBand.h * 0.18;
      const tether = ctx.createLinearGradient(tetherX, tetherY1, tetherX, tetherY2);
      tether.addColorStop(0, 'rgba(255,255,255,0.12)');
      tether.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = tether;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(tetherX, tetherY1);
      ctx.lineTo(tetherX, tetherY2);
      ctx.stroke();
    });

    const coreNodes = this.coreLayout.map((layout, index) => ({
      x: this.core.x + layout.ox * this.core.r * 0.80 + Math.sin(this.t * 0.7 + layout.ox * 9 + index) * layout.wobble,
      y: this.core.y + layout.oy * this.core.r * 0.80 + Math.cos(this.t * 0.64 + layout.oy * 7 + index) * layout.wobble * 0.78,
      r: layout.r,
    }));

    // Intents route through the semantic layer into the core graph.
    this._drawIntents(coreNodes);

    // The canonical core graph remains the visual anchor.
    this._drawCore(coreNodes);

    // Subtle surface-to-context projection beam.
    const surfaceBeamX = this.surfaceWindow.x;
    const surfaceBeamTop = this.surfaceWindow.y + this.surfaceWindow.h * 0.52;
    const surfaceBeamBottom = this.contextBand.y - 8;
    const beam = ctx.createLinearGradient(surfaceBeamX, surfaceBeamTop, surfaceBeamX, surfaceBeamBottom);
    beam.addColorStop(0, 'rgba(255,255,255,0.10)');
    beam.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = beam;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(surfaceBeamX, surfaceBeamTop);
    ctx.lineTo(surfaceBeamX, surfaceBeamBottom);
    ctx.stroke();

    // Foreground schematic: a tiny public surface → node → edge diagram.
    this._drawSurfaceSchematic();
  }
}

class ModulesScene {
  constructor(canvas) {
    this.canvas  = canvas;
    this.slideEl = canvas.closest('.slide');
    this.ctx     = canvas.getContext('2d');
    this.running = false;
    this.raf     = null;
    this.t       = 0;
    this.modules = [
      { label: 'Identity',  angle: -Math.PI * 0.42, delay: 0.0, lane: 0 },
      { label: 'Workspace', angle: -Math.PI * 0.12, delay: 0.18, lane: 1 },
      { label: 'Assets',    angle:  Math.PI * 0.14, delay: 0.36, lane: 2 },
      { label: 'Programs',  angle:  Math.PI * 0.42, delay: 0.54, lane: 0 },
      { label: 'Domotics',  angle:  Math.PI * 0.78, delay: 0.72, lane: 1 },
      { label: 'Logistics', angle:  Math.PI * 1.06, delay: 0.90, lane: 2 },
      { label: 'Flux',      angle:  Math.PI * 1.38, delay: 1.08, lane: 1 },
    ];
    this.pills = this.slideEl ? [...this.slideEl.querySelectorAll('.module-pill')] : [];
    this._resize();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.cx = this.w * 0.50;
    this.cy = this.h * 0.53;
    this.coreR = Math.min(this.w, this.h) * 0.075;
    this.orbitR = Math.min(this.w, this.h) * 0.20;
    this.outerR = Math.min(this.w, this.h) * 0.28;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() { this._resize(); }

  _loop() {
    if (!this.running) return;
    this.t += 0.008;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, cx, cy, coreR, orbitR, outerR, t } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    const arrival = easeOutCubic(t / 1.1);
    const drift = Math.sin(t * 0.9) * 10;
    const lifecycle = (t * 0.18) % 1;

    // Background structure: a nested field gives the slide a clearer architecture.
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR * 2.7);
    bg.addColorStop(0, 'rgba(9,9,11,1)');
    bg.addColorStop(0.75, 'rgba(5,5,7,1)');
    bg.addColorStop(1, 'rgba(2,2,3,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      const y = cy + i * 28;
      ctx.beginPath();
      ctx.moveTo(cx - outerR * 1.9, y);
      ctx.lineTo(cx + outerR * 1.9, y);
      ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * 74;
      ctx.beginPath();
      ctx.moveTo(x, cy - outerR * 1.1);
      ctx.lineTo(x, cy + outerR * 1.1);
      ctx.stroke();
    }

    // Core glow.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4.4);
    glow.addColorStop(0, `rgba(255,255,255,${0.14 + arrival * 0.18})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 4.4, 0, Math.PI * 2);
    ctx.fill();

    // Outer shared orbit ring.
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Shared core.
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * (1.0 + 0.08 * Math.sin(t * 2.4)), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.90})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fill();

    // Subtle orbit ring for composability.
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR * 1.03, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    ctx.stroke();

    this.modules.forEach((mod, i) => {
      const p = easeOutCubic((t - mod.delay) / 1.05);
      const orbit = mod.angle + t * (0.18 + mod.lane * 0.018);
      const phaseLift = Math.sin(t * 1.45 + i * 0.8) * 10;
      const radius = lerp(orbitR * 2.05, orbitR * (1.02 + mod.lane * 0.07), p) + phaseLift;
      const x = cx + Math.cos(orbit) * radius + drift * 0.10;
      const y = cy + Math.sin(orbit) * radius * 0.88 + Math.cos(orbit * 1.1) * 7;

      // Attachment line from core to capsule.
      const attachPulse = 0.5 + 0.5 * Math.sin(t * 2.6 + mod.delay * 8);
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + p * 0.16})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Pulse traveling through the connection.
      const pulseX = lerp(cx, x, 0.58 + attachPulse * 0.16);
      const pulseY = lerp(cy, y, 0.58 + attachPulse * 0.16);
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 1.1 + attachPulse * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.14 + attachPulse * 0.24})`;
      ctx.fill();

      // Tiny attachment node.
      ctx.beginPath();
      ctx.arc(x, y, 2.4 + p * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.36 + p * 0.40})`;
      ctx.fill();
    });

    // Bottom flow bar: signals that modules are part of one runtime.
    const barY = this.h * 0.86;
    const bar = ctx.createLinearGradient(this.w * 0.18, barY, this.w * 0.82, barY);
    bar.addColorStop(0, 'rgba(255,255,255,0)');
    bar.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    bar.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = bar;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.w * 0.18, barY);
    ctx.lineTo(this.w * 0.82, barY);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const x = this.w * 0.24 + ((t * 58 + i * 132) % (this.w * 0.52));
      ctx.beginPath();
      ctx.arc(x, barY, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.04 * ((i + lifecycle) % 1)})`;
      ctx.fill();
    }

    this._positionPills();
  }

  _positionPills() {
    if (!this.pills.length) return;

    this.pills.forEach((pill, i) => {
      const mod = this.modules[i];
      if (!mod) return;

      const p = easeOutCubic((this.t - mod.delay) / 1.05);
      const orbit = mod.angle + this.t * (0.18 + mod.lane * 0.018);
      const phaseLift = Math.sin(this.t * 1.45 + i * 0.8) * 10;
      const radius = lerp(this.orbitR * 2.05, this.orbitR * (1.02 + mod.lane * 0.07), p) + phaseLift;
      const x = this.cx + Math.cos(orbit) * radius + Math.sin(this.t * 0.9) * 6;
      const y = this.cy + Math.sin(orbit) * radius * 0.88 + Math.cos(orbit * 1.1) * 7;
      const bob = Math.sin(this.t * 1.1 + i) * 1.4;
      const lift = Math.cos(this.t * 0.8 + i) * 0.9;
      const scale = 0.96 + mod.lane * 0.025 + p * 0.02;
      const alpha = 0.12 + p * 0.72;

      pill.style.left = `${x}px`;
      pill.style.top = `${y}px`;
      pill.style.opacity = alpha.toFixed(3);
      pill.style.transform = `translate(-50%, -50%) translate(${bob.toFixed(2)}px, ${lift.toFixed(2)}px) scale(${scale.toFixed(3)})`;
    });
  }
}


// =============================================
// SCENE: VESTIGES
// White field with black nodes, fine traces, specks, and floating artifacts.
// =============================================

class VestigeScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.nodes = [];
    this.artifacts = [];
    this.specks = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  _init() {
    const kinds = ['tile', 'ring', 'shard', 'dot'];
    this.nodes = Array.from({ length: 18 }, (_, i) => ({
      x: this.w * 0.5 + (Math.random() - 0.5) * this.w * 0.58,
      y: this.h * 0.46 + (Math.random() - 0.5) * this.h * 0.42,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      r: 1.6 + Math.random() * 2.8,
      phase: Math.random() * Math.PI * 2,
      anchor: i < 5,
    }));
    this.artifacts = Array.from({ length: 26 }, (_, i) => ({
      x: this.w * 0.5 + (Math.random() - 0.5) * this.w * 0.72,
      y: this.h * 0.5 + (Math.random() - 0.5) * this.h * 0.52,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.006,
      size: 9 + Math.random() * 20,
      curated: i < 7,
      kind: kinds[i % kinds.length],
      phase: Math.random() * Math.PI * 2,
    }));
    this.specks = Array.from({ length: 240 }, (_, i) => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: 0.35 + Math.random() * 1.25,
      vx: rand(-0.03, 0.03),
      vy: rand(-0.025, 0.025),
      alpha: rand(0.05, 0.14),
      tone: i % 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.007;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const insetX = this.w * 0.12;
    const insetY = this.h * 0.14;
    const maxX = this.w - insetX;
    const maxY = this.h - insetY;
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;

    this.nodes.forEach((n, i) => {
      const ax = (Math.sin(this.t * 0.9 + n.phase) * 0.06) + ((cx - n.x) * 0.000008);
      const ay = (Math.cos(this.t * 0.8 + n.phase) * 0.05) + ((cy - n.y) * 0.000008);
      n.vx = lerp(n.vx, ax, 0.06);
      n.vy = lerp(n.vy, ay, 0.06);
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < insetX || n.x > maxX) n.vx *= -1;
      if (n.y < insetY || n.y > maxY) n.vy *= -1;
      if (n.anchor) {
        n.x += Math.sin(this.t * 1.2 + i) * 0.08;
        n.y += Math.cos(this.t * 1.05 + i) * 0.08;
      }
    });

    this.artifacts.forEach((a, i) => {
      const pull = a.curated ? 0.00003 : 0.000015;
      a.vx += (cx - a.x) * pull + Math.sin(this.t * 0.75 + a.phase) * 0.0012;
      a.vy += (cy - a.y) * pull + Math.cos(this.t * 0.68 + a.phase) * 0.001;
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.vr;
      if (a.x < insetX || a.x > maxX) a.vx *= -1;
      if (a.y < insetY || a.y > maxY) a.vy *= -1;
      a.vx *= 0.992;
      a.vy *= 0.992;
    });

    this.specks.forEach((s, i) => {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -10) s.x = this.w + 10;
      if (s.x > this.w + 10) s.x = -10;
      if (s.y < -10) s.y = this.h + 10;
      if (s.y > this.h + 10) s.y = -10;
      if ((i + Math.floor(this.t * 12)) % 53 === 0) {
        s.alpha = 0.04 + Math.random() * 0.12;
      }
    });
  }

  _draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(this.w * 0.5, this.h * 0.42, 20, this.w * 0.5, this.h * 0.52, Math.max(this.w, this.h) * 0.72);
    bg.addColorStop(0, 'rgba(255,255,255,1)');
    bg.addColorStop(0.7, 'rgba(247,247,245,1)');
    bg.addColorStop(1, 'rgba(241,241,239,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Soft paper grain and dual-tone points.
    this.specks.forEach((s, i) => {
      const pulse = 0.65 + 0.35 * Math.sin(this.t * 0.6 + s.phase);
      const r = s.r * (0.8 + 0.35 * pulse);
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      if (s.tone === 0) {
        ctx.fillStyle = `rgba(0,0,0,${s.alpha * (0.7 + 0.3 * pulse)})`;
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.25 * pulse})`;
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = `rgba(0,0,0,${s.alpha * 0.35})`;
        ctx.stroke();
      }
    });

    // Thin traces between nearby nodes.
    const threshold = Math.min(this.w, this.h) * 0.20;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          const alpha = (1 - dist / threshold) * 0.18;
          ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Nodes in black with slight bright halos.
    this.nodes.forEach((n, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.7 + n.phase);
      const radius = n.r * (0.95 + 0.2 * pulse);
      if (n.anchor) {
        ctx.strokeStyle = `rgba(0,0,0,${0.08 + 0.08 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n.x, this.h * 0.84);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${0.22 + 0.34 * pulse})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius + 1.4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.30 + 0.18 * pulse})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });

    // Floating artifacts, monochrome and slightly luminous.
    this.artifacts.forEach((a, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.1 + a.phase);
      const alpha = a.curated ? 0.82 : 0.52;
      const size = a.size * (a.curated ? 1.0 : 0.88);

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.globalCompositeOperation = 'multiply';

      if (a.kind === 'tile') {
        ctx.fillStyle = `rgba(0,0,0,${0.28 * alpha})`;
        ctx.strokeStyle = `rgba(0,0,0,${0.42 * alpha})`;
        roundRect(ctx, -size * 0.56, -size * 0.42, size * 1.12, size * 0.84, 3);
        ctx.fill();
        ctx.stroke();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(255,255,255,${0.45 * alpha})`;
        ctx.lineWidth = 0.9;
        roundRect(ctx, -size * 0.44, -size * 0.30, size * 0.88, size * 0.60, 3);
        ctx.stroke();
      } else if (a.kind === 'ring') {
        ctx.strokeStyle = `rgba(0,0,0,${0.46 * alpha})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * alpha})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.kind === 'shard') {
        ctx.fillStyle = `rgba(0,0,0,${0.30 * alpha})`;
        ctx.strokeStyle = `rgba(0,0,0,${0.48 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-size * 0.50, size * 0.16);
        ctx.lineTo(-size * 0.08, -size * 0.42);
        ctx.lineTo(size * 0.42, size * 0.10);
        ctx.lineTo(-size * 0.12, size * 0.36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(0,0,0,${0.42 * alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.18 + (a.curated ? 1.2 : 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.55 * alpha})`;
        ctx.beginPath();
        ctx.arc(size * 0.12, -size * 0.08, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      if (a.curated) {
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(255,255,255,${0.16 + 0.12 * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.74, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Faint structural axis, now black on white.
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.w * 0.18, this.h * 0.74);
    ctx.lineTo(this.w * 0.82, this.h * 0.26);
    ctx.stroke();
  }
}


// =============================================
// SCENE: GRAPH OS
// Living graph with draggable context window, stable groups, and surface projections.
// =============================================

class GraphOSScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = {
      nodeCount: opts.nodeCount || 20,
      speed: opts.speed || 0.25,
      thresh: opts.thresh || 0.22,
      edgeAlpha: opts.edgeAlpha || 0.18,
      nodeAlpha: opts.nodeAlpha || [0.2, 0.42],
    };
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.nodes = [];
    this.groups = [];
    this.labels = [];
    this.streams = [];
    this.surfaceCards = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.surfaceY = this.h * 0.68;
    this.contextY = this.h * 0.84;
  }

  _init() {
    this.groups = [
      {
        name: 'Core',
        baseX: this.w * 0.26,
        baseY: this.h * 0.34,
        x: this.w * 0.26,
        y: this.h * 0.34,
        spreadX: this.w * 0.15,
        spreadY: this.h * 0.10,
        phase: Math.random() * Math.PI * 2,
      },
      {
        name: 'Bridge',
        baseX: this.w * 0.51,
        baseY: this.h * 0.45,
        x: this.w * 0.51,
        y: this.h * 0.45,
        spreadX: this.w * 0.19,
        spreadY: this.h * 0.13,
        phase: Math.random() * Math.PI * 2,
      },
      {
        name: 'Public',
        baseX: this.w * 0.76,
        baseY: this.h * 0.31,
        x: this.w * 0.76,
        y: this.h * 0.31,
        spreadX: this.w * 0.14,
        spreadY: this.h * 0.10,
        phase: Math.random() * Math.PI * 2,
      },
    ];

    this.nodes = Array.from({ length: this.opts.nodeCount }, (_, i) => {
      const group = i < 6 ? 0 : (i < 12 ? 1 : 2);
      const anchor = this.groups[group];
      const angle = Math.random() * Math.PI * 2;
      const rx = anchor.spreadX * (0.25 + Math.random() * 0.7);
      const ry = anchor.spreadY * (0.25 + Math.random() * 0.7);
      return {
        group,
        x: anchor.x + Math.cos(angle) * rx,
        y: anchor.y + Math.sin(angle) * ry,
        vx: (Math.random() - 0.5) * this.opts.speed * 0.7,
        vy: (Math.random() - 0.5) * this.opts.speed * 0.7,
        r: 1.25 + Math.random() * 1.85,
        phase: Math.random() * Math.PI * 2,
      };
    });
    this.labels = [
      { text: 'Node', node: 0, dx: -36, dy: -30 },
      { text: 'Edge', node: 3, dx: 22, dy: -18 },
      { text: 'Groups', node: 7, dx: -14, dy: 44 },
      { text: 'Surface', node: 12, dx: 30, dy: -12 },
    ];
    this.streams = Array.from({ length: 5 }, (_, i) => ({
      y: this.contextY + i * 9,
      phase: Math.random() * Math.PI * 2,
      speed: 18 + Math.random() * 14,
    }));
    this.surfaceCards = [
      { x: this.w * 0.58, y: this.surfaceY + 14, w: 112, h: 60, title: 'Public view', lines: 3, phase: Math.random() * Math.PI * 2 },
      { x: this.w * 0.72, y: this.surfaceY + 20, w: 98, h: 52, title: 'Display', lines: 2, phase: Math.random() * Math.PI * 2 },
      { x: this.w * 0.84, y: this.surfaceY + 9, w: 82, h: 46, title: 'Output', lines: 2, phase: Math.random() * Math.PI * 2 },
    ];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.006;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const maxX = this.w;
    const maxY = this.surfaceY + 42;
    this.groups.forEach(group => {
      group.x = group.baseX + Math.sin(this.t * 0.32 + group.phase) * 12;
      group.y = group.baseY + Math.cos(this.t * 0.28 + group.phase) * 9;
      group.x = clamp(group.x, this.w * 0.14, this.w * 0.86);
      group.y = clamp(group.y, this.h * 0.20, this.surfaceY - 52);
    });
    this.nodes.forEach((n, index) => {
      const group = this.groups[n.group];
      const ax = group.x - n.x;
      const ay = group.y - n.y;
      n.vx += ax * 0.00002 + Math.sin(this.t * 1.05 + n.phase) * 0.0011;
      n.vy += ay * 0.00002 + Math.cos(this.t * 0.95 + n.phase) * 0.0010;
      const driftScale = 0.26 + n.group * 0.04;
      n.vx += Math.cos(this.t * 0.45 + index) * 0.0006 * driftScale;
      n.vy += Math.sin(this.t * 0.38 + index) * 0.0005 * driftScale;
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.989;
      n.vy *= 0.989;
      if (n.x < 0 || n.x > maxX) n.vx *= -1;
      if (n.y < 0 || n.y > maxY) n.vy *= -1;
      n.x = clamp(n.x, 0, maxX);
      n.y = clamp(n.y, 0, maxY);
    });
  }

  _drawGroupShell(group, index) {
    const members = this.nodes.filter(n => n.group === index);
    if (!members.length) return;

    const xs = members.map(n => n.x);
    const ys = members.map(n => n.y);
    const padX = 28;
    const padY = 24;
    const minX = Math.min(...xs) - padX;
    const maxX = Math.max(...xs) + padX;
    const minY = Math.min(...ys) - padY;
    const maxY = Math.max(...ys) + padY;
    const x = clamp(minX, 0, this.w - 80);
    const y = clamp(minY, 18, this.surfaceY - 36);
    const availableW = Math.max(40, this.w - x - 18);
    const availableH = Math.max(36, this.surfaceY - y - 18);
    const w = Math.min(Math.max(maxX - minX, 120), availableW);
    const h = Math.min(Math.max(maxY - minY, 84), availableH);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(255,255,255,${0.022 + index * 0.008})`;
    roundRect(this.ctx, x, y, w, h, 26);
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(255,255,255,${0.085 + index * 0.03})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.fillStyle = 'rgba(255,255,255,0.48)';
    this.ctx.font = '500 11px Inter, sans-serif';
    this.ctx.fillText(group.name, x + 16, y + 18);
    this.ctx.restore();
  }

  _drawProjectionCard(card, index) {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.7 + card.phase);
    const x = card.x + Math.sin(this.t * 0.45 + card.phase) * 4;
    const y = card.y + Math.cos(this.t * 0.4 + card.phase) * 3;
    const alpha = 0.16 + pulse * 0.08;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.fillStyle = `rgba(0,0,0,${0.20 + index * 0.03})`;
    roundRect(this.ctx, -card.w / 2, -card.h / 2, card.w, card.h, 14);
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = `rgba(255,255,255,${0.16 + pulse * 0.04})`;
    roundRect(this.ctx, -card.w / 2 + 10, -card.h / 2 + 8, card.w - 20, 7, 4);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.72)';
    this.ctx.font = '500 10px Inter, sans-serif';
    this.ctx.fillText(card.title, -card.w / 2 + 10, -card.h / 2 + 28);

    for (let i = 0; i < card.lines; i++) {
      const lineY = -card.h / 2 + 36 + i * 9;
      this.ctx.fillStyle = `rgba(255,255,255,${0.12 + i * 0.03})`;
      roundRect(this.ctx, -card.w / 2 + 10, lineY, card.w * (0.48 + i * 0.08), 3, 1.5);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  _drawLabel(text, x, y, accent) {
    const { ctx } = this;
    ctx.save();
    ctx.font = '500 12px Inter, sans-serif';
    const w = ctx.measureText(text).width + 18;
    const h = 24;
    ctx.fillStyle = `rgba(255,255,255,${0.06 + accent * 0.08})`;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.10 + accent * 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.52 + accent * 0.24})`;
    ctx.fillText(text, x + 9, y + 16);
    ctx.restore();
  }

  _draw() {
    const { ctx, nodes, t } = this;
    const { edgeAlpha, nodeAlpha } = this.opts;
    ctx.clearRect(0, 0, this.w, this.h);

    const base = ctx.createLinearGradient(0, 0, 0, this.h);
    base.addColorStop(0, 'rgba(8,8,10,1)');
    base.addColorStop(0.6, 'rgba(6,6,8,1)');
    base.addColorStop(1, 'rgba(3,3,5,1)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, this.w, this.h);

    // Background grid/surface plane.
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const yy = this.surfaceY - 74 + i * 24;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(this.w, yy);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 8; i++) {
      const xx = (this.w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(xx, this.surfaceY - 90);
      ctx.lineTo(xx + this.w * 0.08, this.h);
      ctx.stroke();
    }

    // Surface band and projection layer.
    const band = ctx.createLinearGradient(0, this.surfaceY - 20, 0, this.surfaceY + 40);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, this.surfaceY - 24, this.w, 64);
    ctx.beginPath();
    ctx.moveTo(0, this.surfaceY);
    ctx.lineTo(this.w, this.surfaceY);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.stroke();

    this.groups.forEach((group, index) => this._drawGroupShell(group, index));

    // Edges.
    const threshold = Math.min(this.w, this.h) * this.opts.thresh;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          const a = (1 - dist / threshold) * edgeAlpha;
          const gradient = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
          gradient.addColorStop(0, `rgba(255,255,255,0)`);
          gradient.addColorStop(0.5, `rgba(255,255,255,${a})`);
          gradient.addColorStop(1, `rgba(255,255,255,0)`);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes.
    nodes.forEach(n => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + n.phase);
      const alpha = nodeAlpha[0] + nodeAlpha[1] * pulse;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.9 + pulse * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.075)';
    ctx.lineWidth = 0.8;
    this.surfaceCards.forEach(card => {
      const x = card.x + Math.sin(this.t * 0.45 + card.phase) * 4;
      const y = card.y + Math.cos(this.t * 0.4 + card.phase) * 3;
      const target = nodes.reduce((best, n) => {
        const dist = Math.abs(n.x - x) + Math.abs(n.y - y);
        if (!best || dist < best.dist) return { node: n, dist };
        return best;
      }, null);
      if (!target) return;
      ctx.beginPath();
      ctx.moveTo(target.node.x, target.node.y);
      ctx.lineTo(x, y - card.h / 2);
      ctx.stroke();
    });
    ctx.restore();

    this.surfaceCards.forEach((card, index) => this._drawProjectionCard(card, index));

    // Labels placed relative to nodes.
    this.labels.forEach((label, index) => {
      const n = nodes[label.node % nodes.length];
      const drift = Math.sin(t * 0.9 + index) * 4;
      this._drawLabel(label.text, n.x + label.dx + drift, n.y + label.dy, 0.8);
    });

    // Context streams.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.streams.forEach((stream, i) => {
      const y = stream.y + Math.sin(t * 1.1 + stream.phase) * 2;
      const phase = (t * stream.speed + i * 60) % (this.w + 120);
      const grad = ctx.createLinearGradient(0, y, this.w, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();

      for (let j = 0; j < 4; j++) {
        const x = (phase + j * 160) % (this.w + 120) - 60;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + j * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.12 + j * 0.03})`;
        ctx.fill();
      }
    });
    ctx.restore();

    // Surface label.
    this._drawLabel('Surface', this.w * 0.75, this.surfaceY - 40, 0.5);
    this._drawLabel('Context', this.w * 0.08, this.contextY - 8, 0.8);
  }
}


// =============================================
// SCENE: USE CASES
// Cloud of drifting terms showing combinatorial potential.
// =============================================

class UseCasesScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.words = [];
    this.wordBank = [
      'CRM', 'Logistics', 'Web', 'Domotics', 'Simulation', 'Physics', 'Biology', 'Genome',
      'Consciousness', 'Systems', 'Data', 'Infrastructure', 'Education', 'Retail', 'Media',
      'Robotics', 'Research', 'Marketplace', 'Operations', 'Energy', 'Finance', 'Health',
      'Navigation', 'Design', 'Music', 'Culture', 'Planning', 'Strategy', 'Computation',
    ];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  _init() {
    const layers = [0.45, 0.75, 1];
    this.words = Array.from({ length: 30 }, (_, i) => {
      const word = this.wordBank[i % this.wordBank.length];
      const layer = randChoice(layers);
      return {
        text: word,
        x: rand(this.w * 0.06, this.w * 0.94),
        y: rand(this.h * 0.08, this.h * 0.9),
        vx: rand(-0.2, 0.2) * layer,
        vy: rand(-0.12, 0.12) * layer,
        base: 11 + rand(0, 10) * layer,
        layer,
        phase: rand(0, Math.PI * 2),
        alpha: rand(0.18, 0.42),
      };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.006;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    this.words.forEach((w, i) => {
      w.x += w.vx + Math.sin(this.t * 1.1 + w.phase) * 0.10 * w.layer;
      w.y += w.vy + Math.cos(this.t * 0.9 + w.phase) * 0.08 * w.layer;
      if (w.x < -80) w.x = this.w + 80;
      if (w.x > this.w + 80) w.x = -80;
      if (w.y < -40) w.y = this.h + 40;
      if (w.y > this.h + 40) w.y = -40;
      if (i % 3 === 0) {
        w.alpha = 0.14 + 0.25 * (0.5 + 0.5 * Math.sin(this.t * 0.7 + w.phase));
      }
    });
  }

  _draw() {
    const { ctx, words, t } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(this.w * 0.48, this.h * 0.42, 30, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.8);
    bg.addColorStop(0, 'rgba(10,10,12,1)');
    bg.addColorStop(1, 'rgba(3,3,4,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    words
      .slice()
      .sort((a, b) => a.layer - b.layer)
      .forEach((w, i) => {
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + w.phase);
        const scale = 0.85 + w.layer * 0.4 + pulse * 0.08;
        const alpha = w.alpha * (0.65 + 0.35 * pulse);
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(Math.sin(t * 0.3 + w.phase) * 0.03);
        ctx.font = `500 ${Math.round(w.base * scale)}px Inter, sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillText(w.text, 0, 0);
        if (w.layer > 0.9) {
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.08})`;
          ctx.lineWidth = 1;
          ctx.strokeText(w.text, 0, 0);
        }
        ctx.restore();
      });
    ctx.restore();

    // Soft depth veil to keep the cloud legible.
    const veil = ctx.createLinearGradient(0, 0, 0, this.h);
    veil.addColorStop(0, 'rgba(0,0,0,0.18)');
    veil.addColorStop(0.4, 'rgba(0,0,0,0)');
    veil.addColorStop(0.8, 'rgba(0,0,0,0.10)');
    veil.addColorStop(1, 'rgba(0,0,0,0.24)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}


// =============================================
// SCENE: CONTINUUM
// Knowledge → Desire → Acquisition as a flow.
// =============================================

class SequenceScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.steps = ['Knowledge', 'Desire', 'Acquisition'];
    this.particles = [];
    this.fragments = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.anchorY = this.h * 0.52;
    this.anchors = [0.32, 0.5, 0.68].map(x => ({ x: this.w * x, y: this.anchorY }));
  }

  _init() {
    this.particles = Array.from({ length: 72 }, (_, i) => ({
      seed: Math.random(),
      phase: Math.random() * Math.PI * 2,
      lane: i % 3,
    }));
    this.fragments = Array.from({ length: 18 }, (_, i) => ({
      seed: Math.random(),
      lane: i % 3,
      kind: ['orb', 'ring', 'shard', 'tablet'][i % 4],
      size: rand(8, 22),
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.007;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _drawWord(word, x, y, alpha, scale) {
    const { ctx } = this;
    const light = isLightTheme();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = '500 46px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }

  _draw() {
    const { ctx } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(this.w * 0.5, this.h * 0.46, 10, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.7);
    if (light) {
      bg.addColorStop(0, 'rgba(255,255,255,1)');
      bg.addColorStop(1, 'rgba(244,244,242,1)');
    } else {
      bg.addColorStop(0, 'rgba(7,7,9,1)');
      bg.addColorStop(1, 'rgba(2,2,3,1)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    const segment = 1.6;
    const cycle = this.t % (segment * 3);
    const stageFloat = cycle / segment;
    const stage = Math.floor(stageFloat) % 3;
    const nextStage = (stage + 1) % 3;
    const local = stageFloat - stage;
    const inEase = easeInOutCubic(local);

    // Flow lanes.
    ctx.save();
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    this.anchors.forEach((anchor, i) => {
      const next = this.anchors[Math.min(i + 1, this.anchors.length - 1)];
      const laneBlend = 1 - Math.min(1, Math.abs(stageFloat - i));
      const alpha = 0.12 + laneBlend * 0.22;
      const y = anchor.y + (i - 1) * 24 + Math.sin(this.t * 0.9 + i) * 1.2;
      const grad = ctx.createLinearGradient(anchor.x - 180, y, next.x + 180, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(anchor.x - 180, y);
      ctx.lineTo(next.x + 180, y);
      ctx.stroke();
    });

    this.particles.forEach((p, i) => {
      const start = this.anchors[p.lane];
      const end = this.anchors[Math.min(p.lane + 1, this.anchors.length - 1)];
      const progression = (this.t * 0.14 + p.seed * 2.4 + p.lane * 0.2) % 1;
      const drift = easeInOutCubic((stageFloat - p.lane + 1.5) % 1);
      const x = lerp(start.x, end.x, progression);
      const y = lerp(start.y, end.y, progression) + Math.sin(this.t * 1.9 + p.phase) * (7 + drift * 6);
      ctx.beginPath();
      ctx.arc(x, y, 0.9 + p.lane * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = light
        ? `rgba(0,0,0,${0.08 + 0.10 * (1 - Math.abs(stageFloat - p.lane))})`
        : `rgba(255,255,255,${0.10 + 0.10 * (1 - Math.abs(stageFloat - p.lane))})`;
      ctx.fill();
    });

    this.fragments.forEach((f, i) => {
      const anchor = this.anchors[f.lane];
      const next = this.anchors[Math.min(f.lane + 1, this.anchors.length - 1)];
      const orbit = (this.t * 0.6 + f.seed * Math.PI * 2 + i * 0.15);
      const mix = (Math.sin(orbit) + 1) * 0.5;
      const x = lerp(anchor.x, next.x, mix);
      const y = anchor.y + Math.sin(this.t * 1.8 + f.seed * 10 + i) * (34 + f.lane * 6);
      const active = 1 - Math.min(1, Math.abs(stageFloat - f.lane));
      const alpha = 0.08 + active * 0.18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(orbit * 0.7) * 0.3);
      ctx.fillStyle = light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.strokeStyle = light ? `rgba(0,0,0,${alpha * 0.72})` : `rgba(255,255,255,${alpha * 0.72})`;
      ctx.lineWidth = 1;

      if (f.kind === 'orb') {
        ctx.beginPath();
        ctx.arc(0, 0, f.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.kind === 'ring') {
        ctx.beginPath();
        ctx.arc(0, 0, f.size * 0.58, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.kind === 'tablet') {
        roundRect(ctx, -f.size * 0.5, -f.size * 0.34, f.size, f.size * 0.68, f.size * 0.24);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.45, f.size * 0.28);
        ctx.lineTo(-f.size * 0.12, -f.size * 0.28);
        ctx.lineTo(f.size * 0.48, -f.size * 0.08);
        ctx.lineTo(f.size * 0.12, f.size * 0.42);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();

    // Stage words with transformation.
    const wordsX = [this.w * 0.31, this.w * 0.50, this.w * 0.69];
    this.steps.forEach((word, i) => {
      const dist = Math.min(Math.abs(stageFloat - i), Math.abs(stageFloat - i + 3), Math.abs(stageFloat - i - 3));
      const activeWeight = Math.max(0, 1 - dist);
      const settleWeight = Math.max(0, 1 - Math.abs(stageFloat - nextStage));
      const alpha = 0.16 + activeWeight * 0.76;
      const scale = 0.92 + activeWeight * 0.14 + (i === stage ? inEase * 0.04 : 0);
      const y = this.anchorY + (i - 1) * 18 + Math.sin(this.t * 1.7 + i) * (2.8 + activeWeight * 3.6);
      const offset = i < stageFloat ? -18 * (1 - activeWeight) : 18 * (1 - activeWeight);
      const x = wordsX[i] + offset * (0.5 + settleWeight * 0.5);
      this._drawWord(word, x, y, alpha, scale);
    });

    // Transformation knot at the active stage.
    const progressX = lerp(wordsX[stage], wordsX[nextStage], inEase);
    const px = progressX;
    const py = this.anchorY;
    ctx.save();
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    const glow = ctx.createRadialGradient(px, py, 0, px, py, 90);
    glow.addColorStop(0, light ? `rgba(0,0,0,${0.08 + inEase * 0.12})` : `rgba(255,255,255,${0.16 + inEase * 0.18})`);
    glow.addColorStop(0.35, light ? `rgba(0,0,0,${0.04 + inEase * 0.05})` : `rgba(255,255,255,${0.06 + inEase * 0.08})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


// =============================================
// SCENE: NEXT
// Cloud of cross-shaped marks that breathe in and out.
// =============================================

class NextScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.pluses = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  _init() {
    const count = Math.max(56, Math.round((this.w * this.h) / 17000));
    const layers = [0.45, 0.68, 1];
    this.pluses = Array.from({ length: count }, (_, i) => {
      const depth = randChoice(layers);
      const isLarge = i % 7 === 0 || i % 11 === 0;
      const baseSize = isLarge ? rand(24, 52) : rand(8, 28);
      return {
        x: rand(this.w * 0.04, this.w * 0.96),
        y: rand(this.h * 0.08, this.h * 0.92),
        vx: rand(-0.16, 0.16) * depth,
        vy: rand(-0.12, 0.12) * depth,
        size: baseSize,
        thickness: rand(0.8, 1.8) + depth * rand(0.65, 1.35),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.42, 1.08),
        depth,
        angle: rand(-0.18, 0.18),
      };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.0065;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
    const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
    this.pluses.forEach((plus, index) => {
      plus.x += plus.vx + Math.sin(this.t * 0.7 + plus.phase) * 0.12 * plus.depth + nx * 0.08 * plus.depth;
      plus.y += plus.vy + Math.cos(this.t * 0.6 + plus.phase) * 0.10 * plus.depth + ny * 0.06 * plus.depth;
      plus.phase += 0.0012 + index * 0.00001;

      if (plus.x < -80) plus.x = this.w + 80;
      if (plus.x > this.w + 80) plus.x = -80;
      if (plus.y < -80) plus.y = this.h + 80;
      if (plus.y > this.h + 80) plus.y = -80;
    });
  }

  _drawPlus(x, y, size, thickness, alpha, angle, light) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
    ctx.restore();
  }

  _draw() {
    const { ctx } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(this.w * 0.52, this.h * 0.42, 30, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.8);
    if (light) {
      bg.addColorStop(0, 'rgba(255,255,255,1)');
      bg.addColorStop(1, 'rgba(245,243,238,1)');
    } else {
      bg.addColorStop(0, 'rgba(8,8,10,1)');
      bg.addColorStop(1, 'rgba(2,2,3,1)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    this.pluses
      .slice()
      .sort((a, b) => a.depth - b.depth)
      .forEach((plus, index) => {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * plus.speed + plus.phase);
        const breathe = Math.pow(pulse, 1.5);
        const size = plus.size * (0.52 + breathe * 0.98);
        const alpha = (0.06 + breathe * (0.38 + plus.depth * 0.12)) * (0.84 + plus.depth * 0.16);
        const thickness = plus.thickness * (0.68 + breathe * 0.82);
        const drift = Math.sin(this.t * 0.4 + plus.phase + index * 0.15) * 0.22;
        const x = plus.x + drift * 14 * plus.depth;
        const y = plus.y + Math.cos(this.t * 0.35 + plus.phase) * 10 * plus.depth;
        const angle = plus.angle + Math.sin(this.t * 0.23 + plus.phase) * 0.08;

        if (breathe > 0.72) {
          this._drawPlus(x, y, size * 1.05, thickness * 1.7, alpha * 0.08, angle, light);
        }
        this._drawPlus(x, y, size, thickness, alpha, angle, light);
      });
    ctx.restore();

    // Soft mist so the cloud feels layered rather than purely random.
    const veil = ctx.createRadialGradient(this.w * 0.58, this.h * 0.46, 0, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.76);
    veil.addColorStop(0, light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)');
    veil.addColorStop(0.55, 'rgba(255,255,255,0)');
    veil.addColorStop(1, light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}


// =============================================
// SCENE: POSITIONING
// A convergence climax: system collapses into a single realization point.
// =============================================

class ClimaxScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.points = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.cx = this.w * 0.5;
    this.cy = this.h * 0.5;
  }

  _init() {
    this.points = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      return {
        angle: a,
        radius: rand(this.w * 0.18, Math.min(this.w, this.h) * 0.48),
        speed: rand(0.015, 0.03),
        phase: rand(0, Math.PI * 2),
      };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.008;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, cx, cy, points, t } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(this.w, this.h) * 0.7);
    if (light) {
      bg.addColorStop(0, 'rgba(255,255,255,1)');
      bg.addColorStop(1, 'rgba(244,244,242,1)');
    } else {
      bg.addColorStop(0, 'rgba(9,9,11,1)');
      bg.addColorStop(1, 'rgba(1,1,2,1)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    const cycle = t % 4.8;
    let p;
    if (cycle < 1.6) p = cycle / 1.6;
    else if (cycle < 2.3) p = 1;
    else if (cycle < 3.4) p = 1 - (cycle - 2.3) / 1.1;
    else p = 0;
    const collapse = easeOutCubic(p);

    // Perspective grid that pulls toward the center.
    ctx.save();
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const yy = this.h * 0.25 + i * (this.h * 0.055);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(this.w, yy);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i++) {
      const x = cx + i * this.w * 0.08;
      ctx.beginPath();
      ctx.moveTo(x, this.h);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.restore();

    // Collapsing point field.
    ctx.save();
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    points.forEach((pt, i) => {
      const theta = pt.angle + t * pt.speed;
      const target = 18 + Math.sin(pt.phase + t * 2.3) * 4;
      const radius = lerp(pt.radius, target, collapse);
      const x = cx + Math.cos(theta) * radius;
      const y = cy + Math.sin(theta) * radius * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 1 + collapse * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = light
        ? `rgba(0,0,0,${0.10 + collapse * 0.22})`
        : `rgba(255,255,255,${0.08 + collapse * 0.24})`;
      ctx.fill();
    });
    ctx.restore();

    // Core flash and concentric realization rings.
    const core = 18 + collapse * 24;
    const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 5.5);
    coreGlow.addColorStop(0, light ? `rgba(0,0,0,${0.12 + collapse * 0.18})` : `rgba(255,255,255,${0.18 + collapse * 0.24})`);
    coreGlow.addColorStop(0.22, light ? `rgba(0,0,0,${0.06 + collapse * 0.10})` : `rgba(255,255,255,${0.10 + collapse * 0.14})`);
    coreGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, core * 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = light ? `rgba(0,0,0,${0.12 + collapse * 0.16})` : `rgba(255,255,255,${0.16 + collapse * 0.18})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, 48 + collapse * 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, core, 0, Math.PI * 2);
    ctx.fillStyle = light ? `rgba(0,0,0,${0.82 + collapse * 0.12})` : `rgba(255,255,255,${0.78 + collapse * 0.18})`;
    ctx.fill();

    // Crosshair-like realization marks.
    const arm = 60 + collapse * 90;
    ctx.strokeStyle = light ? `rgba(0,0,0,${0.07 + collapse * 0.10})` : `rgba(255,255,255,${0.08 + collapse * 0.14})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy);
    ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm);
    ctx.lineTo(cx, cy + arm);
    ctx.stroke();
  }
}


// =============================================
// SCENE: PHYSICAL LAYER
// Network expands into a spatial grid and anchors into the environment.
// =============================================

class PhysicalLayerScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = {
      nodeCount: opts.nodeCount || 22,
      speed: opts.speed || 0.24,
    };
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.nodes = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.horizon = this.h * 0.58;
  }

  _init() {
    this.nodes = Array.from({ length: this.opts.nodeCount }, (_, i) => ({
      x: this.w * 0.5 + rand(-this.w * 0.28, this.w * 0.28),
      y: this.horizon + rand(-this.h * 0.22, this.h * 0.18),
      vx: rand(-0.12, 0.12) * this.opts.speed,
      vy: rand(-0.10, 0.10) * this.opts.speed,
      r: 1.4 + Math.random() * 1.8,
      phase: rand(0, Math.PI * 2),
      anchor: i < 5,
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this._init();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.007;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    this.nodes.forEach((n, i) => {
      const pull = (n.y - this.horizon) * 0.0014;
      n.vx += Math.sin(this.t * 1.3 + n.phase) * 0.001 + pull * 0.02;
      n.vy += Math.cos(this.t * 1.1 + n.phase) * 0.001 - pull * 0.03;
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.994;
      n.vy *= 0.994;
      if (n.x < 0 || n.x > this.w) n.vx *= -1;
      if (n.y < this.horizon - 120 || n.y > this.h) n.vy *= -1;
      n.x = clamp(n.x, 0, this.w);
      n.y = clamp(n.y, this.horizon - 120, this.h);
    });
  }

  _draw() {
    const { ctx, nodes, t } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    if (light) {
      bg.addColorStop(0, 'rgba(255,255,255,1)');
      bg.addColorStop(0.55, 'rgba(247,247,245,1)');
      bg.addColorStop(1, 'rgba(241,241,239,1)');
    } else {
      bg.addColorStop(0, 'rgba(5,5,7,1)');
      bg.addColorStop(0.55, 'rgba(4,4,5,1)');
      bg.addColorStop(1, 'rgba(2,2,3,1)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Spatial grid.
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = this.horizon + i * 28;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }
    for (let i = -7; i <= 7; i++) {
      const x = this.w * 0.5 + i * 80;
      ctx.beginPath();
      ctx.moveTo(x, this.h);
      ctx.lineTo(this.w * 0.5, this.horizon);
      ctx.stroke();
    }

    // Environmental anchor band.
    const env = ctx.createLinearGradient(0, this.horizon - 18, 0, this.horizon + 42);
    env.addColorStop(0, 'rgba(255,255,255,0)');
    env.addColorStop(0.5, light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)');
    env.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = env;
    ctx.fillRect(0, this.horizon - 18, this.w, 60);
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, this.horizon);
    ctx.lineTo(this.w, this.horizon);
    ctx.stroke();

    // Network edges.
    const threshold = Math.min(this.w, this.h) * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          ctx.strokeStyle = light
            ? `rgba(0,0,0,${(1 - dist / threshold) * 0.11})`
            : `rgba(255,255,255,${(1 - dist / threshold) * 0.13})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Nodes, with anchored points receiving an environment tether.
    nodes.forEach((n, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + n.phase);
      const alpha = n.anchor ? 0.34 + 0.18 * pulse : 0.16 + 0.16 * pulse;
      if (n.anchor) {
        ctx.strokeStyle = light ? `rgba(0,0,0,${alpha * 0.25})` : `rgba(255,255,255,${alpha * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n.x, this.horizon);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.9 + pulse * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    // A faint structural halo where digital becomes physical.
    const halo = ctx.createRadialGradient(this.w * 0.5, this.horizon, 0, this.w * 0.5, this.horizon, 140);
    halo.addColorStop(0, light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(this.w * 0.5, this.horizon, 140, 0, Math.PI * 2);
    ctx.fill();
  }
}


// =============================================
// SCENE REGISTRY
// Maps slide data-slide keys → [SceneClass, options]
// Visual vocabulary per concept:
//   pulse     → open, potential, breath (intro / autonomy / closing)
//   graph     → complexity, connection (SPACE / GraphOS / R&D / Physical)
//   modules   → composability, docking
//   assemble  → construction, combination
//   converge  → unification (gentle → dramatic based on opts.sharp)
//   vestige   → curation, value distillation
// =============================================

const SCENE_MAP = {
  // Open — slow, very faint expanding rings
  intro:       [PulseScene,       { maxR: 380, interval: 2600, maxAlpha: 0.08, speed: 0.55 }],

  // R&D — dense graph with motion-trail: evokes active simulation
  rd:          [GraphScene,       { nodeCount: 28, speed: 0.62, thresh: 0.32, trails: true,
                                    edgeAlpha: 0.20, nodeAlpha: [0.22, 0.50] }],

  // Focused autonomy — single slow ring, very minimal
  autonomy:    [PulseScene,       { maxR: 220, interval: 3400, maxAlpha: 0.09, speed: 0.45 }],

  // SPACE — standard graph, baseline visual language
  space:       [GraphScene,       { nodeCount: 22, speed: 0.45, thresh: 0.28,
                                    edgeAlpha: 0.16, nodeAlpha: [0.28, 0.42] }],

  // GraphOS — primitives, draggable context window, groups, and surface projection
  graphos:     [GraphOSScene,     { nodeCount: 18, speed: 0.18, thresh: 0.20, edgeAlpha: 0.14,
                                    nodeAlpha: [0.16, 0.34] }],

  // Unification — gentle convergence
  unification: [ConvergenceScene, { cycleDur: 4.5, particles: 30, spread: 260, sharp: false }],

  // Modules — core + capsules docking
  modules:     [ModulesScene,     null],

  // Vestiges — archival field with nodes and artifacts
  vestiges:    [VestigeScene,     null],

  // Infrastructure — surface, context, intents, and canonical core
  infrastructure: [InfrastructureScene, null],

  // Build — scattered blocks snapping to grid
  build:       [AssembleScene,    { cols: 4, rows: 3, gap: 30, cx: 0.72, cy: 0.5 }],

  // Combination — same system, larger grid, centered
  combination: [AssembleScene,    { cols: 5, rows: 4, gap: 26, cx: 0.5, cy: 0.5 }],

  // Physical layer — network meets environment
  physical:    [PhysicalLayerScene, { nodeCount: 22, speed: 0.24 }],

  // One system — standard convergence
  onesystem:   [ConvergenceScene, { cycleDur: 3.5, particles: 38, spread: 300, sharp: false }],

  // Rupture — sharp, fast convergence (discontinuity feeling)
  rupture:     [ConvergenceScene, { cycleDur: 2.4, particles: 45, spread: 340, sharp: true }],

  // Use cases — term cloud, many domains
  usecases:    [UseCasesScene,    null],

  // Next — acceleration cloud of plus signs
  next:        [NextScene,        null],

  // Continuum — knowledge / desire / acquisition progression
  continuum:   [SequenceScene,    null],

  // Positioning — realization climax
  positioning: [ClimaxScene,      null],

  // Closing — calm, stable, slow pulse
  closing:     [PulseScene,       { maxR: 300, interval: 4200, maxAlpha: 0.07, speed: 0.45 }],
};

// Instantiated scenes (lazy — only created when canvas is found)
const scenes = {};

function initScenes() {
  const canvasIds = {
    intro:       'canvas-intro',
    rd:          'canvas-rd',
    autonomy:    'canvas-autonomy',
    space:       'canvas-space',
    graphos:     'canvas-graphos',
    unification: 'canvas-unification',
    vestiges:    'canvas-vestiges',
    infrastructure: 'canvas-infrastructure',
    modules:     'canvas-modules',
    build:       'canvas-build',
    combination: 'canvas-combination',
    usecases:    'canvas-usecases',
    next:        'canvas-next',
    physical:    'canvas-physical',
    onesystem:   'canvas-onesystem',
    rupture:     'canvas-rupture',
    continuum:   'canvas-continuum',
    positioning: 'canvas-positioning',
    closing:     'canvas-closing',
  };

  Object.entries(SCENE_MAP).forEach(([key, [Cls, opts]]) => {
    const el = document.getElementById(canvasIds[key]);
    if (!el) return;
    scenes[key] = opts ? new Cls(el, opts) : new Cls(el);
  });
}

function startScene(key) { if (scenes[key]) scenes[key].start(); }
function stopScene(key)  { if (scenes[key]) scenes[key].stop();  }


// =============================================
// EVENTS
// =============================================

document.addEventListener('keydown', e => {
  if (['ArrowDown', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault(); goTo(currentIndex + 1);
  }
  if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault(); goTo(currentIndex - 1);
  }
});

let wheelAcc = 0, wheelTimer;
document.addEventListener('wheel', e => {
  e.preventDefault();
  if (isAnimating) return;
  wheelAcc += e.deltaY;
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    if (Math.abs(wheelAcc) > 15) goTo(currentIndex + (wheelAcc > 0 ? 1 : -1));
    wheelAcc = 0;
  }, 50);
}, { passive: false });

let touchY0 = 0;
document.addEventListener('touchstart', e => { touchY0 = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', e => {
  const diff = touchY0 - e.changedTouches[0].clientY;
  if (Math.abs(diff) > 45) goTo(currentIndex + (diff > 0 ? 1 : -1));
}, { passive: true });

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    Object.values(scenes).forEach(s => s.resize && s.resize());
    syncGraphosWindowPosition();
    updateUI();
    resizeTimer = null;
  }, 120);
}, { passive: true });

function cleanup() {
  appAlive = false;
  if (mainRafId != null) {
    cancelAnimationFrame(mainRafId);
    mainRafId = null;
  }
  clearTimeout(sceneStartTimer);
  clearTimeout(sceneUnlockTimer);
  clearTimeout(resizeTimer);
  sceneStartTimer = null;
  sceneUnlockTimer = null;
  resizeTimer = null;
  draggedGraphosWindowEl = null;
  graphosWindowState.dragging = false;
  graphosWindowState.pointerId = null;
  Object.values(scenes).forEach(scene => scene.stop && scene.stop());
}

window.addEventListener('beforeunload', cleanup);


// =============================================
// INIT
// =============================================

function init() {
  initUI();
  initScenes();
  applyClasses();
  setThemeForSlide(slideEls[0].dataset.slide);
  startScene(slideEls[0].dataset.slide);
  if (mainRafId != null) cancelAnimationFrame(mainRafId);
  mainRafId = requestAnimationFrame(animLoop);
}

init();
