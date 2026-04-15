// ===== CONFIG =====
const ANIM_DUR   = 850;   // ms — matches CSS --slide-dur
const PARALLAX_S = 12;    // max parallax offset in px
const PARALLAX_L = 0.055; // parallax lerp speed
const LIGHT_THEME_SLIDES = new Set(['vestige', 'vestiges', 'phases', 'continuum', 'positioning', 'advantage', 'next', 'open', 'closing', 'contact']);

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
const ACTION_HOVER_SELECTOR = '#nav-track, a, button, [role="button"]';

// ===== DOM =====
const slideEls   = [...document.querySelectorAll('.slide')];
const total      = slideEls.length;
const cursorEl   = document.getElementById('cursor');
const ringEl     = document.getElementById('cursor-ring');
const progressEl = document.getElementById('progress-bar');
const numCurEl   = document.getElementById('num-current');
const numTotEl   = document.getElementById('num-total');
const navEl      = document.getElementById('slide-nav');

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
  const activeSlide = slideEls[currentIndex];
  if (!activeSlide) return;

  const content = activeSlide.querySelector('.slide-content');
  if (!content) return;

  const nodes = content.querySelectorAll('h2, p, a, .ea-wordmark, .phase-timeline, .continuum-flow');
  const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
  const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;

  nodes.forEach((node, index) => {
    const depth = index + 1;
    const hoverBoost = node.matches(':hover') ? 1.7 : 1;
    const tx = clamp(nx * 12 * depth * 0.42 * hoverBoost, -10, 10);
    const ty = clamp(ny * 10 * depth * 0.36 * hoverBoost, -8, 8);
    const rot = clamp(nx * depth * 1.2 * hoverBoost, -2.4, 2.4);
    node.style.setProperty('--text-shift-x', tx.toFixed(2) + 'px');
    node.style.setProperty('--text-shift-y', ty.toFixed(2) + 'px');
    node.style.setProperty('--text-rot', rot.toFixed(2) + 'deg');
  });
}

function restartLogoAnimation(slide) {
  if (!slide) return;
  const logo = slide.querySelector('.ea-wordmark');
  if (!logo) return;

  logo.classList.remove('is-animated');
  void logo.offsetWidth;
  logo.classList.add('is-animated');
}

function updateVestigeMotion() {
  const activeSlide = slideEls[currentIndex];
  if (!activeSlide || !LIGHT_THEME_SLIDES.has(activeSlide.dataset.slide)) return;

  const stage = activeSlide.querySelector('#vestiges-stage, #continuum-stage');
  const floaters = activeSlide.querySelector('.vestiges-floaters');
  if (!stage) return;

  const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
  const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
  const x = clamp(nx * 16, -12, 12);
  const y = clamp(ny * 12, -10, 10);
  const scale = 1 + Math.abs(nx) * 0.012 + Math.abs(ny) * 0.01;
  const fx = clamp(nx * 10, -8, 8);
  const fy = clamp(ny * 8, -6, 6);

  stage.style.setProperty('--vestige-x', `${x.toFixed(2)}px`);
  stage.style.setProperty('--vestige-y', `${y.toFixed(2)}px`);
  stage.style.setProperty('--vestige-scale', scale.toFixed(4));

  if (floaters) {
    floaters.style.setProperty('--vestige-floaters-x', `${fx.toFixed(2)}px`);
    floaters.style.setProperty('--vestige-floaters-y', `${fy.toFixed(2)}px`);
    floaters.style.setProperty('--vestige-floaters-scale', (1 + Math.abs(ny) * 0.008).toFixed(4));
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
  restartLogoAnimation(slideEls[currentIndex]);
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
  track.addEventListener('pointerdown', onNavPointerDown);
  updateUI();
}

function updateUI() {
  numCurEl.textContent = String(currentIndex + 1).padStart(2, '0');
  progressEl.style.width = ((currentIndex / (total - 1)) * 100) + '%';
  const indicator = document.getElementById('nav-indicator');
  const track     = document.getElementById('nav-track');
  if (!indicator || !track) return;
  const max = track.offsetHeight - 14;
  indicator.style.top = ((currentIndex / (total - 1)) * max) + 'px';
}

function getNavIndexFromClientY(clientY) {
  const track = document.getElementById('nav-track');
  if (!track) return currentIndex;
  const rect = track.getBoundingClientRect();
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
  const track = document.getElementById('nav-track');
  navDragActive = false;
  navDragPointerId = null;
  if (track) track.classList.remove('is-dragging');
}

function updateActionHoverState() {
  const el = document.elementFromPoint(mouseX, mouseY);
  const active = !!(el && el.closest(ACTION_HOVER_SELECTOR));
  document.body.classList.toggle('is-action-hover', active);
}

function clearActionHoverState() {
  document.body.classList.remove('is-action-hover');
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
  updateActionHoverState();
});

document.addEventListener('pointermove', onNavPointerMove);
document.addEventListener('pointerup', endNavDrag);
document.addEventListener('pointercancel', endNavDrag);
document.addEventListener('mouseleave', clearActionHoverState);

function animLoop() {
  curX = lerp(curX, mouseX, 0.18);
  curY = lerp(curY, mouseY, 0.18);
  cursorEl.style.left = curX + 'px';
  cursorEl.style.top  = curY + 'px';

  ringX = lerp(ringX, mouseX, 0.09);
  ringY = lerp(ringY, mouseY, 0.09);
  ringEl.style.left = ringX + 'px';
  ringEl.style.top  = ringY + 'px';

  plxX = lerp(plxX, plxTX, PARALLAX_L);
  plxY = lerp(plxY, plxTY, PARALLAX_L);
  const activeContent = document.querySelector('.slide.is-active .slide-content');
  if (activeContent) {
    activeContent.style.transform = `translate(${plxX.toFixed(2)}px,${plxY.toFixed(2)}px)`;
  }

  applyTextMotion();
  updateVestigeMotion();

  requestAnimationFrame(animLoop);
}


// =============================================
// SHARED CANVAS HELPER
// =============================================

// Base class pattern — each scene extends this convention
function makeCanvas(el) {
  const ctx = el.getContext('2d');
  const resize = () => {
    el.width  = el.offsetWidth;
    el.height = el.offsetHeight;
  };
  resize();
  return { el, ctx, resize };
}


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
// SCENE: MODULES
// App-like capsules dock into a shared core.
// =============================================

class InfrastructureScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.layers = [
      { label: 'Core',     y: 0.22, alpha: 0.12 },
      { label: 'Surface',  y: 0.43, alpha: 0.10 },
      { label: 'Runtime',  y: 0.66, alpha: 0.08 },
    ];
    this.nodes = [];
    this.packets = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.cx = this.w * 0.51;
    this.spineTop = this.h * 0.16;
    this.spineBottom = this.h * 0.86;
  }

  _init() {
    const slots = [
      { layer: 0, x: 0.49, y: 0.21, label: 'Kernel' },
      { layer: 0, x: 0.58, y: 0.24, label: 'Identity' },
      { layer: 1, x: 0.41, y: 0.43, label: 'API' },
      { layer: 1, x: 0.64, y: 0.42, label: 'Surface' },
      { layer: 2, x: 0.35, y: 0.66, label: 'Modules' },
      { layer: 2, x: 0.61, y: 0.69, label: 'Context' },
    ];
    this.nodes = slots.map((slot, i) => ({
      label: slot.label,
      layer: slot.layer,
      baseX: this.w * slot.x,
      baseY: this.h * slot.y,
      driftX: rand(-8, 8),
      driftY: rand(-6, 6),
      size: 0.86 + (i % 2) * 0.06,
      accent: 0.35 + slot.layer * 0.08,
      phase: rand(0, Math.PI * 2),
    }));
    this.packets = Array.from({ length: 4 }, (_, i) => ({
      lane: i % 4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.26 + Math.random() * 0.12,
      offset: Math.random(),
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

  resize() { this._resize(); this._init(); }

  _loop() {
    if (!this.running) return;
    this.t += 0.008;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _drawCapsule(label, x, y, w, h, alpha) {
    const { ctx } = this;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = `rgba(255,255,255,${0.03 + alpha * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.06 + alpha * 0.10})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.46 + alpha * 0.18})`;
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
  }

  _draw() {
    const { ctx, nodes, packets, t, cx, spineTop, spineBottom } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(cx, this.h * 0.36, 20, cx, this.h * 0.5, Math.max(this.w, this.h) * 0.8);
    bg.addColorStop(0, 'rgba(8,8,10,1)');
    bg.addColorStop(0.7, 'rgba(4,4,6,1)');
    bg.addColorStop(1, 'rgba(2,2,3,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Subtle grid and architecture lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = this.h * 0.22 + i * 86;
      ctx.beginPath();
      ctx.moveTo(this.w * 0.07, y);
      ctx.lineTo(this.w * 0.93, y);
      ctx.stroke();
    }
    for (let i = -2; i <= 2; i++) {
      const x = cx + i * 130;
      ctx.beginPath();
      ctx.moveTo(x, this.h * 0.18);
      ctx.lineTo(x, this.h * 0.82);
      ctx.stroke();
    }

    // Layer bands.
    this.layers.forEach((layer, i) => {
      const y = this.h * layer.y;
      const band = ctx.createLinearGradient(0, y - 16, this.w, y + 16);
      band.addColorStop(0, `rgba(255,255,255,0)`);
      band.addColorStop(0.5, `rgba(255,255,255,${layer.alpha})`);
      band.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.fillStyle = band;
      ctx.fillRect(this.w * 0.12, y - 8, this.w * 0.76, 16);

      // Layer tag.
      this._drawCapsule(layer.label, this.w * 0.16, y, 72, 22, 0.6 - i * 0.06);
    });

    // Shared spine.
    const spine = ctx.createLinearGradient(cx, spineTop, cx, spineBottom);
    spine.addColorStop(0, 'rgba(255,255,255,0)');
    spine.addColorStop(0.25, 'rgba(255,255,255,0.15)');
    spine.addColorStop(0.75, 'rgba(255,255,255,0.18)');
    spine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = spine;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, spineTop);
    ctx.lineTo(cx, spineBottom);
    ctx.stroke();

    // Core node and glow.
    const corePulse = 0.5 + 0.5 * Math.sin(t * 1.8);
    const coreGlow = ctx.createRadialGradient(cx, this.h * 0.22, 0, cx, this.h * 0.22, 78);
    coreGlow.addColorStop(0, `rgba(255,255,255,${0.12 + corePulse * 0.10})`);
    coreGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(cx, this.h * 0.22, 78, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, this.h * 0.22, 13 + corePulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.72 + corePulse * 0.10})`;
    ctx.fill();

    // Nodes.
    nodes.forEach((node, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + node.phase);
      const x = node.baseX + Math.sin(t * 0.6 + node.phase) * node.driftX * 0.35;
      const y = node.baseY + Math.cos(t * 0.7 + node.phase) * node.driftY * 0.35;

      // tether to spine
      const anchorY = this.h * this.layers[node.layer].y;
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + pulse * 0.05})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx, anchorY);
      ctx.stroke();

      // attachment dot
      ctx.beginPath();
      ctx.arc(x, y, 1.8 + pulse * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.18 + pulse * 0.18})`;
      ctx.fill();

      const w = 78 + node.label.length * 3.0;
      const h = 24;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 0.18 + i) * 0.015);
      ctx.scale(node.size, node.size);
      this._drawCapsule(node.label, 0, 0, w, h, 0.46 + pulse * 0.10);
      ctx.restore();
    });

    // Flow packets running up and down the spine.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    packets.forEach((packet, i) => {
      const pos = (t * packet.speed + packet.offset) % 1;
      const travel = spineTop + pos * (spineBottom - spineTop);
      const sway = Math.sin(t * 1.2 + packet.phase) * 4;
      ctx.beginPath();
      ctx.arc(cx + sway, travel, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.08 * Math.sin(packet.phase + pos * Math.PI * 2) ** 2})`;
      ctx.fill();
    });
    ctx.restore();

    // Bottom concept rail, almost imperceptible.
    const railY = this.h * 0.86;
    const rail = ctx.createLinearGradient(this.w * 0.22, railY, this.w * 0.78, railY);
    rail.addColorStop(0, 'rgba(255,255,255,0)');
    rail.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    rail.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = rail;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(this.w * 0.22, railY);
    ctx.lineTo(this.w * 0.78, railY);
    ctx.stroke();
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
      { label: 'Identity',  angle: -Math.PI * 0.42, delay: 0.0, lane: 0, accent: 0.95 },
      { label: 'Workspace', angle: -Math.PI * 0.12, delay: 0.18, lane: 1, accent: 0.82 },
      { label: 'Assets',    angle:  Math.PI * 0.14, delay: 0.36, lane: 2, accent: 0.68 },
      { label: 'Programs',  angle:  Math.PI * 0.42, delay: 0.54, lane: 0, accent: 0.78 },
      { label: 'Domotics',  angle:  Math.PI * 0.78, delay: 0.72, lane: 1, accent: 0.62 },
      { label: 'Logistics', angle:  Math.PI * 1.06, delay: 0.90, lane: 2, accent: 0.74 },
      { label: 'Flux',      angle:  Math.PI * 1.38, delay: 1.08, lane: 1, accent: 0.90 },
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
      pill.style.borderColor = `rgba(255,255,255,${(0.06 + mod.accent * 0.05 + p * 0.05).toFixed(3)})`;
      pill.style.background = `rgba(255,255,255,${(0.025 + mod.accent * 0.01).toFixed(3)})`;
      pill.style.color = `rgba(255,255,255,${(0.50 + p * 0.16).toFixed(3)})`;
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
// Living graph with contextual labels and context streams.
// =============================================

class GraphOSScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = {
      nodeCount: opts.nodeCount || 20,
      speed: opts.speed || 0.25,
      edgeAlpha: opts.edgeAlpha || 0.18,
      nodeAlpha: opts.nodeAlpha || [0.2, 0.42],
    };
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.nodes = [];
    this.labels = [];
    this.streams = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.surfaceY = this.h * 0.66;
    this.contextY = this.h * 0.83;
  }

  _init() {
    this.nodes = Array.from({ length: this.opts.nodeCount }, (_, i) => ({
      x: this.w * 0.5 + (Math.random() - 0.5) * this.w * 0.48,
      y: this.h * 0.45 + (Math.random() - 0.5) * this.h * 0.44,
      vx: (Math.random() - 0.5) * this.opts.speed,
      vy: (Math.random() - 0.5) * this.opts.speed,
      r: 1.2 + Math.random() * 1.9,
      phase: Math.random() * Math.PI * 2,
    }));
    this.labels = [
      { text: 'Node', node: 0, dx: -36, dy: -30 },
      { text: 'Edge', node: 3, dx: 22, dy: -18 },
      { text: 'Context', node: 7, dx: -8, dy: 46 },
      { text: 'Surface', node: 12, dx: 30, dy: -12 },
    ];
    this.streams = Array.from({ length: 5 }, (_, i) => ({
      y: this.contextY + i * 9,
      phase: Math.random() * Math.PI * 2,
      speed: 18 + Math.random() * 14,
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
    this.t += 0.006;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const maxX = this.w;
    const maxY = this.surfaceY + 40;
    this.nodes.forEach((n, index) => {
      const anchor = this.nodes[(index * 7 + 3) % this.nodes.length];
      const ax = (anchor ? anchor.x : this.w * 0.5) - n.x;
      const ay = (anchor ? anchor.y : this.h * 0.5) - n.y;
      n.vx += ax * 0.000004 + Math.sin(this.t * 1.2 + n.phase) * 0.0012;
      n.vy += ay * 0.000004 + Math.cos(this.t * 1.1 + n.phase) * 0.0011;
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.995;
      n.vy *= 0.995;
      if (n.x < 0 || n.x > maxX) n.vx *= -1;
      if (n.y < 0 || n.y > maxY) n.vy *= -1;
      n.x = clamp(n.x, 0, maxX);
      n.y = clamp(n.y, 0, maxY);
    });
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

    // Edges.
    const threshold = Math.min(this.w, this.h) * 0.24;
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

  // GraphOS — primitives with labels and context stream
  graphos:     [GraphOSScene,     { nodeCount: 18, speed: 0.22, edgeAlpha: 0.18,
                                    nodeAlpha: [0.20, 0.42] }],

  // Unification — gentle convergence
  unification: [ConvergenceScene, { cycleDur: 4.5, particles: 30, spread: 260, sharp: false }],

  // Modules — core + capsules docking
  modules:     [ModulesScene,     null],

  // Vestiges — archival field with nodes and artifacts
  vestiges:    [VestigeScene,     null],

  // Infrastructure — layered runtime stack
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
  Object.values(scenes).forEach(s => s.resize && s.resize());
  updateUI();
});


// =============================================
// INIT
// =============================================

function init() {
  initUI();
  initScenes();
  applyClasses();
  setThemeForSlide(slideEls[0].dataset.slide);
  startScene(slideEls[0].dataset.slide);
  animLoop();
}

init();
