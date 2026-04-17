// ===== CONFIG =====
const ANIM_DUR   = 850;   // ms — matches CSS --slide-dur
const PARALLAX_S = 12;    // max parallax offset in px
const PARALLAX_L = 0.055; // parallax lerp speed
const LIGHT_THEME_SLIDES = new Set(['vestiges', 'phases', 'continuum', 'positioning', 'advantage', 'currentstate', 'partnerships', 'businessmodel', 'next', 'open', 'closing', 'contact']);

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
let activeBuildInteractiveEls = [];
let activeIntroTitleEl = null;
let draggedGraphosWindowEl = null;
let navTrackEl = null;
let navIndicatorEl = null;
let graphosToggleNodesEl = null;
let graphosToggleLinksEl = null;
let graphosTypeFilterEl = null;
let graphosOpenMenuEl = null;
let graphosSelectionInfoEl = null;
let graphosContextMenuEl = null;
let graphosColorPickerEl = null;
let graphosColorWheelEl = null;
let hoverHudEl = null;
let hoverHudKickerEl = null;
let hoverHudTitleEl = null;
let hoverHudDetailEl = null;
let hoverHudMetaEl = null;
let hoveredTextNode = null;
let hoveredInfraLayer = null;
let hoveredGraphosLayer = null;
let hoveredBuildLayer = null;
let selectedInfraLayer = null;
let selectedGraphosLayer = null;
let selectedBuildLayer = null;
let lastInfraFocus = null;
let lastInfraSelected = null;
let lastGraphosFocus = null;
let lastGraphosSelected = null;
let lastBuildFocus = null;
let lastBuildSelected = null;
let introTypewriter = null;
let hoverProbeX = NaN;
let hoverProbeY = NaN;
let lastHoverHudKey = null;
let appAlive = true;
let mistBg = null;
const graphosWindowState = {
  x: null,
  y: null,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  pointerId: null,
};
const INTRO_TYPEWRITER_PHRASES = [
  'Salut, merci de prendre un moment.',
];
const ACTION_HOVER_SELECTOR = [
  '#nav-track',
  'a',
  'button',
  'select',
  '[role="button"]',
  '#canvas-graphos',
  '.infra-card',
  '.infra-step',
  '.module-card',
  '.modules-feature',
  '.modules-grid',
  '.build-card',
  '.build-step',
  '.build-surface',
  '.build-grid',
  '.build-path',
  '.build-assets',
  '.graphos-window__header',
  '.graphos-window__chip',
  '.graphos-row',
  '.graphos-context-menu__item',
  '.graphos-context-menu__toggle',
  '.graphos-context-menu__swatch',
  '.graphos-color-picker canvas',
].join(', ');
const TEXT_HOVER_SELECTOR = 'h2, p, a, .ea-wordmark, .phase-timeline, .continuum-flow, .infra-card, .infra-step';
const HAS_FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const GRAPHOS_TOUCH_HIT_SCALE = HAS_FINE_POINTER ? 1 : 1.6;
const KEYBOARD_NAV_LOCK_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
const TOUCH_NAV_LOCK_SELECTOR = [
  '.graphos-window',
  '.graphos-window__body',
  '.graphos-context-menu',
  '.graphos-color-picker',
  '.graphos-window__chip',
  '.graphos-row',
  '#canvas-graphos',
  '.module-card',
  '.modules-feature',
  '.build-step',
  '.build-card',
  '.build-surface',
  '.build-assets',
  '.infra-card',
  '.infra-step',
  '.contact-cta',
  '.vestiges-social',
].join(', ');
const WHEEL_NAV_LOCK_SELECTOR = [
  '.graphos-window',
  '.graphos-window__body',
  '.graphos-context-menu',
  '.graphos-color-picker',
  '#canvas-graphos',
  'button',
  'input',
  'textarea',
  'select',
  'a',
  '[contenteditable="true"]',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ===== DOM =====
const slideEls   = [...document.querySelectorAll('.slide')];
const total      = slideEls.length;
const cursorEl   = document.getElementById('cursor');
const ringEl     = document.getElementById('cursor-ring');
const mistCanvasEl = document.getElementById('mist-bg');
const progressEl = document.getElementById('progress-bar');
const numCurEl   = document.getElementById('num-current');
const numTotEl   = document.getElementById('num-total');
const navEl      = document.getElementById('slide-nav');
const graphosWindowEl = document.querySelector('.graphos-window');
const graphosWindowHandleEl = document.querySelector('.graphos-window__header');
const graphosWindowBodyEl = document.querySelector('.graphos-window__body');
const graphosFeedEl = document.querySelector('.graphos-window__feed');
const graphosRowEls = graphosFeedEl ? [...graphosFeedEl.querySelectorAll('.graphos-row')] : [];
graphosToggleNodesEl = document.getElementById('graphos-toggle-nodes');
graphosToggleLinksEl = document.getElementById('graphos-toggle-links');
graphosTypeFilterEl = document.getElementById('graphos-type-filter');
graphosOpenMenuEl = document.getElementById('graphos-open-menu');
graphosSelectionInfoEl = document.getElementById('graphos-selection-info');
graphosContextMenuEl = document.getElementById('graphos-context-menu');
graphosColorPickerEl = document.getElementById('graphos-color-picker');
graphosColorWheelEl = document.getElementById('graphos-color-wheel');
hoverHudEl = document.getElementById('hover-hud');
hoverHudKickerEl = hoverHudEl ? hoverHudEl.querySelector('.hover-hud__kicker') : null;
hoverHudTitleEl = hoverHudEl ? hoverHudEl.querySelector('.hover-hud__title') : null;
hoverHudDetailEl = hoverHudEl ? hoverHudEl.querySelector('.hover-hud__detail') : null;
hoverHudMetaEl = hoverHudEl ? hoverHudEl.querySelector('.hover-hud__meta') : null;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(x) { return 1 - Math.pow(1 - clamp(x, 0, 1), 3); }
function easeInOutCubic(x) {
  x = clamp(x, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function rand(min, max) { return min + Math.random() * (max - min); }
function randChoice(items) { return items[(Math.random() * items.length) | 0]; }
function isElementTarget(target) { return target instanceof Element; }
function targetMatchesSelector(target, selector) {
  return isElementTarget(target) ? !!target.closest(selector) : false;
}
function getGraphosScrollBody(target) {
  return isElementTarget(target) ? target.closest('.graphos-window__body') : null;
}
function canElementScroll(el, deltaY = 0) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (!/(auto|scroll|overlay)/.test(style.overflowY)) return false;
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  if (deltaY < 0) return el.scrollTop > 0;
  return true;
}
function shouldLockKeyboardNav(target) {
  return targetMatchesSelector(target, KEYBOARD_NAV_LOCK_SELECTOR);
}
function shouldLockTouchNav(target) {
  const graphosBody = getGraphosScrollBody(target);
  if (graphosBody) {
    return graphosBody.scrollHeight > graphosBody.clientHeight + 1;
  }
  return targetMatchesSelector(target, TOUCH_NAV_LOCK_SELECTOR);
}
function shouldLockWheelNav(target) {
  return targetMatchesSelector(target, WHEEL_NAV_LOCK_SELECTOR);
}
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

function collapseText(value) {
  return value ? String(value).replace(/\s+/g, ' ').trim() : '';
}

function readText(root, selector) {
  return collapseText(root ? root.querySelector(selector)?.textContent : '');
}

function resolveHoverKind(el) {
  if (!isElementTarget(el)) return 'action';
  if (el.closest('#nav-track, .graphos-window__header')) return 'drag';
  if (el.closest('.graphos-context-menu__swatch, .graphos-color-picker canvas')) return 'pick';
  return 'action';
}

function buildHoverPayload(el) {
  if (!isElementTarget(el)) return null;

  const navTrack = el.closest('#nav-track');
  if (navTrack) {
    return {
      key: 'nav-track',
      kind: 'drag',
      kicker: 'Navigation',
      title: 'Slide rail',
      detail: 'Drag the rail, use the wheel, or press the arrow keys to move through the deck.',
      meta: `${String(currentIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    };
  }

  const graphosHeader = el.closest('.graphos-window__header');
  if (graphosHeader) {
    return {
      key: 'graphos-header',
      kind: 'drag',
      kicker: 'GraphOS',
      title: 'Move the context window',
      detail: 'Drag the header to reposition the live node demo.',
      meta: 'Glass panel',
    };
  }

  const graphosChip = el.closest('.graphos-window__chip');
  if (graphosChip) {
    const isSelect = graphosChip.classList.contains('graphos-window__chip--select');
    const selectValue = graphosTypeFilterEl ? collapseText(graphosTypeFilterEl.selectedOptions?.[0]?.textContent || graphosTypeFilterEl.value) : '';
    const chipId = graphosChip.id || '';
    const chipTitleMap = {
      'graphos-toggle-nodes': 'Nodes',
      'graphos-toggle-links': 'Links',
      'graphos-open-menu': 'Actions',
    };
    const chipDetailMap = {
      'graphos-toggle-nodes': 'Show or hide the node field.',
      'graphos-toggle-links': 'Reveal or hide connective paths.',
      'graphos-open-menu': 'Open the touch-safe actions menu.',
    };
    return {
      key: `graphos-chip:${collapseText(graphosChip.textContent)}`,
      kind: isSelect ? 'action' : 'action',
      kicker: 'GraphOS',
      title: isSelect ? 'Type filter' : chipTitleMap[chipId] || collapseText(graphosChip.textContent),
      detail: isSelect ? `Current filter: ${selectValue || 'All types'}` : chipDetailMap[chipId] || 'Toggle the corresponding graph control.',
      meta: isSelect ? 'Semantic filter' : 'Live control',
    };
  }

  const graphosRow = el.closest('.graphos-row');
  if (graphosRow) {
    return {
      key: `graphos-row:${graphosRow.dataset.layer || 'row'}`,
      kind: 'action',
      kicker: 'GraphOS layer',
      title: readText(graphosRow, 'strong') || collapseText(graphosRow.textContent),
      detail: readText(graphosRow, 'span'),
      meta: readText(graphosRow, 'small'),
    };
  }

  const graphosCanvas = el.closest('#canvas-graphos');
  if (graphosCanvas) {
    return {
      key: 'graphos-canvas',
      kind: 'drag',
      kicker: 'GraphOS',
      title: 'Live node field',
      detail: 'Drag nodes, edit relations, and use the canvas to explore the surface projection.',
      meta: 'Interactive canvas',
    };
  }

  const infraStep = el.closest('.infra-step');
  if (infraStep) {
    const layer = infraStep.dataset.layer || collapseText(infraStep.textContent).toLowerCase();
    const detailMap = {
      surface: 'Public view and projected output.',
      context: 'Registry, semantics, and policy.',
      intents: 'Actions routed into the graph.',
      modules: 'Capabilities enriching the middle layer.',
      core: 'Canonical topology: nodes and edges only.',
    };
    return {
      key: `infra-step:${layer}`,
      kind: 'action',
      kicker: 'Infrastructure',
      title: collapseText(infraStep.textContent),
      detail: detailMap[layer] || 'Layer of the system.',
      meta: 'Reading order',
    };
  }

  const infraCard = el.closest('.infra-card');
  if (infraCard) {
    return {
      key: `infra-card:${infraCard.dataset.layer || collapseText(infraCard.textContent)}`,
      kind: 'action',
      kicker: 'Infrastructure',
      title: readText(infraCard, 'strong'),
      detail: readText(infraCard, 'small'),
      meta: readText(infraCard, 'span'),
    };
  }

  const buildStep = el.closest('.build-step');
  if (buildStep) {
    const step = buildStep.dataset.layer || collapseText(buildStep.textContent).toLowerCase();
    const detailMap = {
      surface: 'Public surface and visible projection.',
      programs: 'Orchestrate flows, triggers, and routing.',
      context: 'Registry, semantics, and policy.',
      nodes: 'Topology and canonical relations.',
      modules: 'Capabilities that enrich the system.',
      assets: 'Any file type can land on a node.',
    };
    return {
      key: `build-step:${step}`,
      kind: 'action',
      kicker: 'Build',
      title: collapseText(buildStep.textContent),
      detail: detailMap[step] || 'Build layer.',
      meta: 'Construction path',
    };
  }

  const moduleCard = el.closest('.module-card');
  if (moduleCard) {
    return {
      key: `module-card:${moduleCard.dataset.module || collapseText(readText(moduleCard, 'strong'))}`,
      kind: 'action',
      kicker: 'Module',
      title: readText(moduleCard, 'strong'),
      detail: readText(moduleCard, 'p'),
      meta: `${readText(moduleCard, '.module-card__badge')} · ${readText(moduleCard, '.module-card__cta')}`.replace(/^ · | · $/g, ''),
    };
  }

  const modulesFeature = el.closest('.modules-feature');
  if (modulesFeature) {
    return {
      key: 'modules-feature',
      kind: 'action',
      kicker: 'Module store',
      title: readText(modulesFeature, 'strong'),
      detail: readText(modulesFeature, 'p'),
      meta: readText(modulesFeature, '.modules-feature__meta'),
    };
  }

  const buildSurface = el.closest('.build-surface');
  if (buildSurface) {
    return {
      key: `build-surface:${buildSurface.dataset.layer || 'surface'}`,
      kind: 'action',
      kicker: 'Build',
      title: readText(buildSurface, '.build-surface__hero strong'),
      detail: readText(buildSurface, '.build-surface__hero p'),
      meta: readText(buildSurface, '.build-surface__chips'),
    };
  }

  const buildCard = el.closest('.build-card');
  if (buildCard) {
    return {
      key: `build-card:${buildCard.dataset.layer || readText(buildCard, 'strong')}`,
      kind: 'action',
      kicker: 'Build',
      title: readText(buildCard, 'strong'),
      detail: readText(buildCard, 'p'),
      meta: readText(buildCard, '.build-card__foot'),
    };
  }

  const buildAssets = el.closest('.build-assets');
  if (buildAssets) {
    return {
      key: 'build-assets',
      kind: 'action',
      kicker: 'Build',
      title: readText(buildAssets, '.build-assets__lead strong'),
      detail: readText(buildAssets, '.build-assets__lead p'),
      meta: readText(buildAssets, '.build-assets__chips'),
    };
  }

  const graphosContextMenuItem = el.closest('.graphos-context-menu__item');
  if (graphosContextMenuItem) {
    return {
      key: `graphos-menu:${collapseText(graphosContextMenuItem.textContent)}`,
      kind: 'action',
      kicker: 'GraphOS',
      title: collapseText(graphosContextMenuItem.textContent),
      detail: 'Apply this action to the selected node.',
      meta: 'Context menu',
    };
  }

  const graphosContextMenuToggle = el.closest('.graphos-context-menu__toggle');
  if (graphosContextMenuToggle) {
    return {
      key: `graphos-toggle:${collapseText(graphosContextMenuToggle.textContent)}`,
      kind: 'action',
      kicker: 'GraphOS',
      title: collapseText(graphosContextMenuToggle.textContent),
      detail: 'Switch the canonical state for the active node.',
      meta: 'Core toggle',
    };
  }

  const graphosContextMenuSwatch = el.closest('.graphos-context-menu__swatch');
  if (graphosContextMenuSwatch) {
    return {
      key: 'graphos-swatch',
      kind: 'pick',
      kicker: 'GraphOS',
      title: 'Node color',
      detail: 'Pick a color for the selected node.',
      meta: 'Palette',
    };
  }

  const graphosColorWheel = el.closest('.graphos-color-picker canvas');
  if (graphosColorWheel) {
    return {
      key: 'graphos-color-wheel',
      kind: 'pick',
      kicker: 'GraphOS',
      title: 'Color wheel',
      detail: 'Drag to assign a new node color.',
      meta: 'Fine control',
    };
  }

  const contactCta = el.closest('.contact-cta');
  if (contactCta) {
    return {
      key: 'contact-cta',
      kind: 'action',
      kicker: 'Contact',
      title: collapseText(contactCta.textContent),
      detail: 'Open the mail client to continue the conversation.',
      meta: 'electronic-artefacts@gmail.com',
    };
  }

  return null;
}

function syncHoverHud(payload) {
  if (!hoverHudEl) return;
  if (!payload) {
    lastHoverHudKey = null;
    hoverHudEl.classList.remove('is-visible');
    document.body.classList.remove('has-hover-hud');
    delete document.body.dataset.hoverKind;
    if (hoverHudKickerEl) hoverHudKickerEl.textContent = 'Hover';
    if (hoverHudTitleEl) hoverHudTitleEl.textContent = '';
    if (hoverHudDetailEl) hoverHudDetailEl.textContent = '';
    if (hoverHudMetaEl) hoverHudMetaEl.textContent = '';
    return;
  }

  const key = [
    payload.key || '',
    payload.kicker || '',
    payload.title || '',
    payload.detail || '',
    payload.meta || '',
  ].join('|');
  document.body.classList.add('has-hover-hud');
  document.body.dataset.hoverKind = payload.kind || 'action';
  hoverHudEl.dataset.kind = payload.kind || 'action';
  hoverHudEl.classList.add('is-visible');

  if (key === lastHoverHudKey) return;
  lastHoverHudKey = key;

  if (hoverHudKickerEl) hoverHudKickerEl.textContent = payload.kicker || 'Hover';
  if (hoverHudTitleEl) hoverHudTitleEl.textContent = payload.title || '';
  if (hoverHudDetailEl) hoverHudDetailEl.textContent = payload.detail || '';
  if (hoverHudMetaEl) hoverHudMetaEl.textContent = payload.meta || '';
}

class MistBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = false;
    this.lastFrame = 0;
    this.ambientParticles = [];
    this.burstParticles = [];
    this.pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      vx: 0,
      vy: 0,
      lastMove: 0,
    };
    this._resize();
    this.setTheme(isLightTheme());
  }

  _resize() {
    this.w = this.canvas.offsetWidth || window.innerWidth || 1;
    this.h = this.canvas.offsetHeight || window.innerHeight || 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.baseCount = HAS_FINE_POINTER
      ? clamp(Math.round((this.w * this.h) / 16000), 110, 180)
      : clamp(Math.round((this.w * this.h) / 32000), 36, 72);

    if (this.ambientParticles.length < this.baseCount) {
      this._seedAmbient(this.baseCount - this.ambientParticles.length);
    } else if (this.ambientParticles.length > this.baseCount) {
      this.ambientParticles.length = this.baseCount;
    }
  }

  resize() {
    this._resize();
  }

  setTheme(light) {
    this.light = !!light;
  }

  dispose() {
    this.ambientParticles.length = 0;
    this.burstParticles.length = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  onPointerMove(x, y, now = performance.now()) {
    const px = this.pointer.x;
    const py = this.pointer.y;
    const dt = Math.max(1, now - (this.pointer.lastMove || now));
    this.pointer.vx = lerp(this.pointer.vx, ((x - px) / dt) * 16, 0.35);
    this.pointer.vy = lerp(this.pointer.vy, ((y - py) / dt) * 16, 0.35);
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.lastMove = now;

    if (HAS_FINE_POINTER && Math.random() < 0.28) {
      this._emitBurst(x, y, 1 + (Math.random() < 0.18 ? 1 : 0), {
        force: 0.82,
        sizeMul: 0.85,
        alphaMul: 0.92,
        lifeMul: 0.92,
        vx: this.pointer.vx,
        vy: this.pointer.vy,
      });
    }
  }

  onLeave() {
    this.pointer.vx = 0;
    this.pointer.vy = 0;
  }

  _seedAmbient(count) {
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push(this._makeAmbient());
    }
  }

  _makeAmbient() {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.018, 0.065);
    return {
      kind: 'ambient',
      x: rand(-20, this.w + 20),
      y: rand(-20, this.h + 20),
      vx: Math.cos(angle) * speed * 0.7,
      vy: Math.sin(angle) * speed * 0.55 - rand(0.012, 0.03),
      size: rand(0.45, 1.4),
      blur: rand(2.4, 7.5),
      alpha: rand(0.028, 0.085),
      drift: rand(0.45, 1.25),
      phase: rand(0, Math.PI * 2),
      life: rand(0, 2000),
    };
  }

  _makeBurst(x, y, opts = {}) {
    const angle = rand(-Math.PI, Math.PI);
    const speed = rand(0.10, 0.52) * (opts.force || 1);
    return {
      kind: 'burst',
      x: x + rand(-7, 7),
      y: y + rand(-7, 7),
      vx: Math.cos(angle) * speed + (opts.vx || 0) * 0.07,
      vy: Math.sin(angle) * speed + (opts.vy || 0) * 0.07 - rand(0.02, 0.12),
      size: rand(0.42, 1.45) * (opts.sizeMul || 1),
      blur: rand(3.5, 8.5),
      alpha: rand(0.045, 0.12) * (opts.alphaMul || 1),
      drift: rand(0.5, 1.0),
      phase: rand(0, Math.PI * 2),
      life: 0,
      ttl: rand(48, 118) * (opts.lifeMul || 1),
    };
  }

  _emitBurst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      if (this.burstParticles.length > 96) this.burstParticles.shift();
      this.burstParticles.push(this._makeBurst(x, y, opts));
    }
  }

  _drawParticle(p, time, rgb) {
    const ctx = this.ctx;
    const lifeT = p.kind === 'burst' ? clamp(p.life / p.ttl, 0, 1) : 0;
    const fade = p.kind === 'burst'
      ? Math.sin(Math.PI * Math.max(0, 1 - lifeT)) * (1 - lifeT)
      : 1;
    const alpha = p.alpha * (p.kind === 'burst' ? fade : 1);
    if (alpha <= 0.001) return;

    const pulse = p.kind === 'ambient'
      ? 0.92 + Math.sin(time * 0.00018 + p.phase) * 0.06
      : 0.94 + Math.sin(time * 0.0018 + p.phase) * 0.07;
    const radius = p.size * pulse;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius + p.blur);
    const innerAlpha = alpha * (this.light ? 1.22 : 1.05);
    const midAlpha = innerAlpha * 0.52;
    gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${innerAlpha})`);
    gradient.addColorStop(0.36, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${midAlpha})`);
    gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + p.blur, 0, Math.PI * 2);
    ctx.fill();
  }

  tick(time) {
    const ctx = this.ctx;
    const dt = this.lastFrame ? clamp((time - this.lastFrame) / 16.67, 0.5, 2.5) : 1;
    this.lastFrame = time;

    const idle = time - this.pointer.lastMove;
    const pointerActive = HAS_FINE_POINTER && idle < 1800;
    const rgb = this.light ? [0, 0, 0] : [255, 255, 255];

    if (pointerActive && Math.random() < 0.22 * dt) {
      this._emitBurst(this.pointer.x, this.pointer.y, 1, {
        force: 0.74,
        sizeMul: 0.8,
        alphaMul: 0.85,
        lifeMul: 0.9,
        vx: this.pointer.vx,
        vy: this.pointer.vy,
      });
    }

    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = this.light ? 'source-over' : 'screen';

    for (let i = 0; i < this.ambientParticles.length; i++) {
      const p = this.ambientParticles[i];
      p.life += dt;

      const dx = p.x - this.pointer.x;
      const dy = p.y - this.pointer.y;
      const dist = Math.hypot(dx, dy);
      if (pointerActive && dist < 240) {
        const falloff = 1 - dist / 240;
        const push = falloff * falloff * 0.14 * dt;
        const inv = dist > 0.001 ? 1 / dist : 0;
        p.vx += dx * inv * push;
        p.vy += dy * inv * push;
      }

      p.vx += Math.sin((time * 0.00028) + p.phase) * 0.0018 * p.drift * dt;
      p.vy += Math.cos((time * 0.00022) + p.phase) * 0.0012 * p.drift * dt - 0.0007 * dt;
      p.vx *= 0.993;
      p.vy *= 0.994;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const pad = 18;
      if (p.x < -pad) p.x = this.w + pad;
      if (p.x > this.w + pad) p.x = -pad;
      if (p.y < -pad) p.y = this.h + pad;
      if (p.y > this.h + pad) p.y = -pad;

      this._drawParticle(p, time, rgb);
    }

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life += dt;
      p.vx *= 0.985;
      p.vy *= 0.986;
      p.vy -= 0.0012 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life >= p.ttl) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      this._drawParticle(p, time, rgb);
    }

    if (pointerActive) {
      const glow = ctx.createRadialGradient(this.pointer.x, this.pointer.y, 0, this.pointer.x, this.pointer.y, 130);
      if (this.light) {
        glow.addColorStop(0, 'rgba(0,0,0,0.03)');
        glow.addColorStop(0.42, 'rgba(0,0,0,0.01)');
      } else {
        glow.addColorStop(0, 'rgba(255,255,255,0.06)');
        glow.addColorStop(0.42, 'rgba(255,255,255,0.02)');
      }
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 130, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

if (mistCanvasEl) {
  mistBg = new MistBackground(mistCanvasEl);
}

function setThemeForSlide(key) {
  const isLight = LIGHT_THEME_SLIDES.has(key);
  document.body.dataset.theme = isLight ? 'light' : 'dark';
  if (mistBg) mistBg.setTheme(isLight);
}

function isLightTheme() {
  return document.body.dataset.theme === 'light';
}

function applyTextMotion() {
  if (!HAS_FINE_POINTER || !activeContentEl || activeTextNodes.length === 0) return;

  const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
  const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
  const slideKey = activeSlideEl ? activeSlideEl.dataset.slide : '';
  const motionScale = slideKey === 'graphos'
    ? 0.45
    : slideKey === 'intro'
      ? 0.38
      : 1;

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
    ? [...activeContentEl.querySelectorAll('h2, p, a, .phase-timeline, .continuum-flow, .infra-card, .infra-step')]
    : [];
  activeIntroTitleEl = activeSlideEl && activeSlideKey === 'intro'
    ? activeSlideEl.querySelector('[data-intro-type]')
    : null;
  activeVestigeStageEl = activeSlideEl ? activeSlideEl.querySelector('#vestiges-stage, #continuum-stage') : null;
  activeVestigeFloatersEl = activeSlideEl ? activeSlideEl.querySelector('.vestiges-floaters') : null;
  activeGraphosWindowEl = activeSlideEl ? activeSlideEl.querySelector('.graphos-window') : null;
  activeBuildInteractiveEls = activeSlideEl && activeSlideKey === 'build'
    ? [...activeSlideEl.querySelectorAll('.build-step, .build-card, .build-surface, .build-assets')]
    : [];
  activeBuildInteractiveEls.forEach(el => {
    el.classList.remove('is-active');
    el.setAttribute('aria-pressed', 'false');
  });
  hoveredTextNode = null;
  hoveredInfraLayer = null;
  hoveredGraphosLayer = null;
  hoveredBuildLayer = null;
  selectedInfraLayer = null;
  selectedGraphosLayer = null;
  selectedBuildLayer = null;
  lastInfraFocus = null;
  lastInfraSelected = null;
  lastGraphosFocus = null;
  lastGraphosSelected = null;
  lastBuildFocus = null;
  lastBuildSelected = null;
  delete document.body.dataset.infraFocus;
  delete document.body.dataset.infraSelected;
  delete document.body.dataset.graphosFocus;
  delete document.body.dataset.graphosSelected;
  delete document.body.dataset.buildFocus;
  delete document.body.dataset.buildSelected;
  hoverProbeX = NaN;
  hoverProbeY = NaN;
  if (!activeIntroTitleEl && introTypewriter) {
    introTypewriter.stop();
  }
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

function syncIntroTypingState(slide) {
  if (!introTypewriter) {
    introTypewriter = new IntroTypewriter(INTRO_TYPEWRITER_PHRASES);
  }

  const introTitle = slide && slide.dataset.slide === 'intro'
    ? (activeIntroTitleEl || slide.querySelector('[data-intro-type]'))
    : null;
  introTypewriter.bind(introTitle);

  if (introTitle && slide === slideEls[currentIndex]) {
    introTypewriter.restart(performance.now());
  } else {
    introTypewriter.stop();
    if (introTitle) {
      introTitle.textContent = INTRO_TYPEWRITER_PHRASES[0];
    }
  }
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
  syncIntroTypingState(slideEls[currentIndex]);
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

function syncGraphosFocusState() {
  const focus = hoveredGraphosLayer || selectedGraphosLayer || null;
  if (focus !== lastGraphosFocus) {
    lastGraphosFocus = focus;
    if (focus) {
      document.body.dataset.graphosFocus = focus;
    } else {
      delete document.body.dataset.graphosFocus;
    }
  }

  if (selectedGraphosLayer !== lastGraphosSelected) {
    lastGraphosSelected = selectedGraphosLayer;
    if (selectedGraphosLayer) {
      document.body.dataset.graphosSelected = selectedGraphosLayer;
    } else {
      delete document.body.dataset.graphosSelected;
    }

    graphosRowEls.forEach(row => {
      row.setAttribute('aria-pressed', selectedGraphosLayer === row.dataset.layer ? 'true' : 'false');
    });
  }
}

function syncInfraFocusState() {
  const focus = hoveredInfraLayer || selectedInfraLayer || null;
  if (focus !== lastInfraFocus) {
    lastInfraFocus = focus;
    if (focus) {
      document.body.dataset.infraFocus = focus;
    } else {
      delete document.body.dataset.infraFocus;
    }
  }

  if (selectedInfraLayer !== lastInfraSelected) {
    lastInfraSelected = selectedInfraLayer;
    if (selectedInfraLayer) {
      document.body.dataset.infraSelected = selectedInfraLayer;
    } else {
      delete document.body.dataset.infraSelected;
    }
  }
}

function syncBuildFocusState() {
  const focus = hoveredBuildLayer || selectedBuildLayer || null;
  if (focus !== lastBuildFocus) {
    lastBuildFocus = focus;
    if (focus) {
      document.body.dataset.buildFocus = focus;
    } else {
      delete document.body.dataset.buildFocus;
    }
  }

  if (selectedBuildLayer !== lastBuildSelected) {
    lastBuildSelected = selectedBuildLayer;
    if (selectedBuildLayer) {
      document.body.dataset.buildSelected = selectedBuildLayer;
    } else {
      delete document.body.dataset.buildSelected;
    }

    activeBuildInteractiveEls.forEach(el => {
      el.setAttribute('aria-pressed', selectedBuildLayer === el.dataset.layer ? 'true' : 'false');
      el.classList.toggle('is-active', selectedBuildLayer === el.dataset.layer);
    });
  }
}

class IntroTypewriter {
  constructor(phrases) {
    this.phrases = phrases;
    this.el = null;
    this.active = false;
    this.index = 0;
    this.charIndex = 0;
    this.phase = 'idle';
    this.nextStepAt = 0;
  }

  bind(el) {
    this.el = el || null;
  }

  restart(now = performance.now()) {
    if (!this.el || !this.phrases.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.el.textContent = this.phrases[0];
      this.active = false;
      this.phase = 'idle';
      return;
    }

    this.active = true;
    this.index = 0;
    this.charIndex = 0;
    this.phase = 'typing';
    this.el.textContent = '';
    this.nextStepAt = now + 420;
  }

  stop() {
    this.active = false;
    this.phase = 'idle';
  }

  tick(now) {
    if (!this.active || !this.el || !this.phrases.length) return;
    if (now < this.nextStepAt) return;

    const phrase = this.phrases[this.index];
    if (this.phase === 'typing') {
      this.charIndex = Math.min(this.charIndex + 1, phrase.length);
      this.el.textContent = phrase.slice(0, this.charIndex);

      if (this.charIndex >= phrase.length) {
        this.phase = 'holding';
        this.nextStepAt = now + rand(2400, 3400);
      } else {
        const char = phrase[this.charIndex - 1];
        this.nextStepAt = now + this._typingDelay(char);
      }
      return;
    }

    if (this.phase === 'holding') {
      if (this.phrases.length === 1) {
        this.active = false;
        this.phase = 'idle';
        this.nextStepAt = 0;
        return;
      }
      this.phase = 'erasing';
      this.nextStepAt = now + 260;
      return;
    }

    if (this.phase === 'erasing') {
      this.charIndex = Math.max(0, this.charIndex - 1);
      this.el.textContent = phrase.slice(0, this.charIndex);

      if (this.charIndex <= 0) {
        this.index = (this.index + 1) % this.phrases.length;
        this.phase = 'typing';
        this.nextStepAt = now + 420;
      } else {
        const char = phrase[this.charIndex - 1];
        this.nextStepAt = now + this._eraseDelay(char);
      }
    }
  }

  _typingDelay(char) {
    if (!char) return 56;
    if (/\s/.test(char)) return 96;
    if (/[,.!?]/.test(char)) return 280;
    return rand(62, 108);
  }

  _eraseDelay(char) {
    if (!char) return 28;
    if (/\s/.test(char)) return 24;
    if (/[,.!?]/.test(char)) return 36;
    return 22;
  }
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
  hoveredInfraLayer = activeSlideEl && activeSlideEl.dataset.slide === 'infrastructure' && hoveredTextNode && hoveredTextNode.dataset
    ? hoveredTextNode.dataset.layer || null
    : null;
  hoveredGraphosLayer = activeSlideEl && activeSlideEl.dataset.slide === 'graphos' && el && el.closest
    ? (el.closest('.graphos-row')?.dataset.layer || (!selectedGraphosLayer && el.closest('.graphos-window') ? 'context' : null))
    : null;
  hoveredBuildLayer = activeSlideEl && activeSlideEl.dataset.slide === 'build' && el && el.closest
    ? (el.closest('.build-step, .build-card, .build-surface, .build-assets')?.dataset.layer || null)
    : null;
  const hoverPayload = buildHoverPayload(activeActionEl);
  const hoverKind = hoverPayload ? hoverPayload.kind : (activeActionEl ? resolveHoverKind(activeActionEl) : null);
  syncInfraFocusState();
  syncGraphosFocusState();
  syncBuildFocusState();
  syncHoverHud(hoverPayload);
  document.body.classList.toggle('is-action-hover', !!activeActionEl);
  if (hoverKind) {
    document.body.dataset.hoverKind = hoverKind;
  } else {
    delete document.body.dataset.hoverKind;
  }
}

function clearActionHoverState() {
  document.body.classList.remove('is-action-hover');
  syncHoverHud(null);
  hoveredTextNode = null;
  hoveredInfraLayer = null;
  hoveredGraphosLayer = null;
  hoveredBuildLayer = null;
  syncInfraFocusState();
  syncGraphosFocusState();
  syncBuildFocusState();
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

function toggleBuildSelection(target) {
  if (!target) return;
  const nextLayer = target.dataset.layer || null;
  if (!nextLayer) return;
  selectedBuildLayer = selectedBuildLayer === nextLayer ? null : nextLayer;
  syncBuildFocusState();
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
  if (mistBg) mistBg.onPointerMove(e.clientX, e.clientY, performance.now());
}, { passive: true });

document.addEventListener('pointermove', onNavPointerMove, { passive: true });
document.addEventListener('pointermove', updateGraphosWindowDrag, { passive: true });
document.addEventListener('pointerup', endNavDrag);
document.addEventListener('pointerup', endGraphosWindowDrag);
document.addEventListener('pointercancel', endNavDrag);
document.addEventListener('pointercancel', endGraphosWindowDrag);
document.addEventListener('mouseleave', () => {
  clearActionHoverState();
  if (mistBg) mistBg.onLeave();
});

if (graphosWindowHandleEl) {
  graphosWindowHandleEl.addEventListener('pointerdown', beginGraphosWindowDrag);
}

if (graphosFeedEl) {
  graphosFeedEl.addEventListener('click', e => {
    const row = e.target.closest('.graphos-row');
    if (!row || !graphosFeedEl.contains(row)) return;
    const nextLayer = row.dataset.layer || null;
    selectedGraphosLayer = selectedGraphosLayer === nextLayer ? null : nextLayer;
    syncGraphosFocusState();
  });
}

document.addEventListener('click', e => {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'infrastructure') return;
  const target = e.target.closest('.infra-card, .infra-step');
  if (!target || !activeSlideEl.contains(target)) return;
  const nextLayer = target.dataset.layer || null;
  selectedInfraLayer = selectedInfraLayer === nextLayer ? null : nextLayer;
  syncInfraFocusState();
});

document.addEventListener('keydown', e => {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'infrastructure') return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('.infra-card, .infra-step');
  if (!target || !activeSlideEl.contains(target)) return;
  e.preventDefault();
  const nextLayer = target.dataset.layer || null;
  selectedInfraLayer = selectedInfraLayer === nextLayer ? null : nextLayer;
  syncInfraFocusState();
});

document.addEventListener('click', e => {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'build') return;
  const target = e.target.closest('.build-step, .build-card, .build-surface, .build-assets');
  if (!target || !activeSlideEl.contains(target)) return;
  toggleBuildSelection(target);
});

document.addEventListener('keydown', e => {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'build') return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('.build-step, .build-card, .build-surface, .build-assets');
  if (!target || !activeSlideEl.contains(target)) return;
  e.preventDefault();
  toggleBuildSelection(target);
});

function animLoop(time) {
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
  if (introTypewriter) {
    introTypewriter.tick(time || performance.now());
  }
  applyTextMotion();
  updateVestigeMotion();
  if (mistBg) mistBg.tick(time || performance.now());

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

  _getFocusLayer() {
    if (hoveredGraphosLayer) return hoveredGraphosLayer;
    if (hoveredInfraLayer) return hoveredInfraLayer;
    if (selectedInfraLayer) return selectedInfraLayer;
    const ny = this.h ? mouseY / this.h : 0.5;
    const nx = this.w ? mouseX / this.w : 0.5;
    if (ny < 0.34) return 'node';
    if (nx > 0.68) return 'surface';
    if (ny > 0.70) return 'context';
    if (nx < 0.42) return 'group';
    return 'edge';
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

  _drawBackground(focusLayer) {
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

    const gridAlpha = focusLayer === 'core' ? 0.04 : focusLayer === 'surface' ? 0.03 : 0.028;
    ctx.strokeStyle = `rgba(255,255,255,${gridAlpha})`;
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

  _drawSurfaceWindow(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'surface';
    const drift = this._parallax(14);
    const wobbleX = Math.sin(this.t * 0.18 + this.surfaceWindow.phase) * 4;
    const wobbleY = Math.cos(this.t * 0.14 + this.surfaceWindow.phase) * 2.5;
    const x = this.surfaceWindow.x + drift.x * 0.25 + wobbleX;
    const y = this.surfaceWindow.y + drift.y * 0.18 + wobbleY;
    const w = this.surfaceWindow.w;
    const h = this.surfaceWindow.h;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.sin(this.t * 0.08 + this.surfaceWindow.phase) + (mouseX / this.w - 0.5)) * (focused ? 0.009 : 0.006));

    const fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fill.addColorStop(0, focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)');
    fill.addColorStop(0.35, focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)');
    fill.addColorStop(1, focused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fill;
    roundRect(ctx, -w / 2, -h / 2, w, h, 24);
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, 26, 20);
    ctx.fill();

    // Browser chrome.
    const chromeY = -h / 2 + 13;
    ['#fff', '#fff', '#fff'].forEach((_, i) => {
      ctx.beginPath();
      ctx.arc(-w / 2 + 16 + i * 10, chromeY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.45 - i * 0.08 + (focused ? 0.06 : 0)})`;
      ctx.fill();
    });
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.56)';
    ctx.fillText('public surface', -w / 2 + 58, chromeY + 0.4);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
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

    ctx.fillStyle = focused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)';
    roundRect(ctx, padX + 10, padY + 10, innerW * 0.58, 20, 10);
    ctx.fill();
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, padX + 10, padY + 38, innerW * 0.82, 9, 4.5);
    ctx.fill();
    roundRect(ctx, padX + 10, padY + 54, innerW * 0.52, 9, 4.5);
    ctx.fill();

    const cardY = padY + innerH - 50;
    for (let i = 0; i < 3; i++) {
      const cw = innerW * (0.28 - i * 0.02);
      const cx = padX + 10 + i * (cw + 10);
      const cy = cardY + Math.sin(this.t * 0.7 + this.surfaceWindow.phase + i) * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02 + (focused ? 0.03 : 0)})`;
      roundRect(ctx, cx, cy, cw, 26, 11);
      ctx.fill();
      ctx.fillStyle = focused ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.20)';
      roundRect(ctx, cx + 8, cy + 7, cw * 0.6, 4, 2);
      ctx.fill();
    }
    ctx.restore();

    this._drawTag('Surface', x, y + h / 2 + 22, 0.65, 'center');
    ctx.restore();
  }

  _drawContextBand(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'context' || focusLayer === 'intents';
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
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
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
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.72)';
    ctx.fillText('Context', x + 16, y + 18);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.56)' : 'rgba(255,255,255,0.42)';
    ctx.fillText('global registry', x + w - 96, y + 18);

    for (let i = -1; i < rows; i++) {
      const entryIndex = ((i + Math.floor(this.t * 1.5)) % this.contextEntries.length + this.contextEntries.length) % this.contextEntries.length;
      const entry = this.contextEntries[entryIndex];
      const rowY = y + 42 + i * rowH - scroll;
      if (rowY < y + 28 || rowY > y + h - 12) continue;
      const alpha = (focused ? 0.14 : 0.10) + 0.20 * (1 - Math.abs((rowY - (y + h / 2)) / (h / 2)));
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

  _drawIntents(coreNodes, focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'intents' || focusLayer === 'modules';
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
    spine.addColorStop(0.28, focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)');
    spine.addColorStop(0.75, focused ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.18)');
    spine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = spine;
    ctx.lineWidth = focused ? 1.2 : 1;
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
      glow.addColorStop(0, focused ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.22)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.strokeStyle = `rgba(255,255,255,${(focused ? 0.055 : 0.035) + index * 0.005})`;
      ctx.lineWidth = focused ? 1.0 : 0.8;
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
      ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.40 : 0.30) + 0.28 * Math.sin(intent.phase + pulse * Math.PI * 2) ** 2})`;
      ctx.fill();
    });

    ctx.restore();
  }

  _drawCore(coreNodes, focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'core';
    const drift = this._parallax(6);
    const x = this.core.x + drift.x * 0.1;
    const y = this.core.y + drift.y * 0.08;
    const r = this.core.r;

    const coreGlow = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r * 2.7);
    coreGlow.addColorStop(0, focused ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.12)');
    coreGlow.addColorStop(0.7, focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)');
    coreGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    roundRect(ctx, x - r, y - r, r * 2, r * 2, r * 1.2);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.048)' : 'rgba(255,255,255,0.035)';
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.21)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = focused ? 1.3 : 1.1;
    ctx.stroke();
    ctx.clip();

    // Internal canonical graph: only nodes and edges live here.
    const nodes = this.coreLayout.map((layout, index) => ({
      x: x + layout.ox * r * 0.80 + Math.sin(this.t * 0.7 + layout.ox * 9 + index) * layout.wobble * (focused ? 1.16 : 1),
      y: y + layout.oy * r * 0.80 + Math.cos(this.t * 0.64 + layout.oy * 7 + index) * layout.wobble * 0.78 * (focused ? 1.16 : 1),
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
      gradient.addColorStop(0.5, focused ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.12)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = focused ? 0.95 : 0.75;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
    });
    ctx.restore();

    nodes.forEach((node, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.4 + node.phase);
      const size = node.r * (0.86 + pulse * (focused ? 0.44 : 0.38));
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.22 : 0.18) + pulse * (focused ? 0.42 : 0.38)})`;
      ctx.fill();

      if (index === 0) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 5, 0, Math.PI * 2);
        ctx.strokeStyle = focused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
        ctx.lineWidth = focused ? 1.15 : 1;
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

  _drawSurfaceSchematic(focusLayer) {
    const { ctx } = this;
    const isCompact = this.w < 920;
    const focused = focusLayer === 'surface';
    const drift = this._parallax(18);
    const baseX = this.w * (isCompact ? 0.78 : 0.83) + drift.x * 0.16;
    const baseY = this.h * (isCompact ? 0.11 : 0.13) + drift.y * 0.16;
    const scale = (isCompact ? 0.85 : 1) * (focused ? 1.05 : 1);
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
    bg.addColorStop(0, `rgba(255,255,255,${(focused ? 0.14 : 0.10) + hover * 0.05})`);
    bg.addColorStop(0.65, focused ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.03)');
    bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    // Surface rail.
    ctx.strokeStyle = `rgba(255,255,255,${(focused ? 0.48 : 0.40) + hover * 0.20})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.lineTo(44, -10);
    ctx.stroke();

    // Surface label.
    this._drawTag('Surface', -2, -26, 0.95, 'center');

    // Surface node.
    ctx.beginPath();
    ctx.arc(56, -10, 3.4 + hover * 0.8 + (focused ? 0.4 : 0), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.84 : 0.78) + hover * 0.10})`;
    ctx.fill();

    // Link into the graph.
    const link = ctx.createLinearGradient(44, -10, 36, 32);
    link.addColorStop(0, `rgba(255,255,255,${(focused ? 0.40 : 0.34) + hover * 0.12})`);
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
      ctx.strokeStyle = `rgba(255,255,255,${(focused ? 0.28 : 0.22) + hover * 0.10})`;
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
      ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.48 : 0.42) + pulse * 0.20 + hover * 0.10})`;
      ctx.fill();
    });

    this._drawTag('Node', 10, 86, 0.58, 'center');
    this._drawTag('Edge', 46, 14, 0.42, 'center');

    // Tiny action hint: the diagram feels present but stays discreet.
    const beam = ctx.createLinearGradient(-18, 14, 62, 70);
    beam.addColorStop(0, 'rgba(255,255,255,0)');
    beam.addColorStop(0.5, `rgba(255,255,255,${(focused ? 0.12 : 0.08) + hover * 0.06})`);
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
    const focusLayer = this._getFocusLayer();
    ctx.clearRect(0, 0, this.w, this.h);

    this._drawBackground(focusLayer);

    // Surface projects the system.
    this._drawSurfaceWindow(focusLayer);

    // Context sits between surface and core, carrying the global registry.
    this._drawContextBand(focusLayer);

    // Modules are in the middle layer, same conceptual band as context.
    this.modules.forEach((module, index) => {
      const drift = this._parallax(12);
      const moduleBoost = focusLayer === 'modules' ? 1.14 : focusLayer === 'intents' ? 1.08 : 1;
      const isActive = this.activeModuleIndex === index;
      const hasActive = this.activeModuleIndex >= 0;
      const dim = hasActive && !isActive ? 0.70 : 1;
      const x = module.baseX + drift.x * module.depth * 0.18 + Math.sin(this.t * 0.7 + module.phase) * 3.2 * moduleBoost;
      const y = module.baseY + drift.y * module.depth * 0.14 + Math.cos(this.t * 0.6 + module.phase) * 2.2 * moduleBoost;
      const w = module.w;
      const h = module.h;

      ctx.save();
      ctx.globalAlpha = dim;
      ctx.translate(x, y);
      ctx.rotate((Math.sin(this.t * 0.15 + module.phase) + (mouseX / this.w - 0.5)) * (focusLayer === 'modules' ? 0.014 : 0.01) * (isActive ? 1.16 : 1));

      ctx.fillStyle = focusLayer === 'modules' ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)';
      if (isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
      }
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.24)' : focusLayer === 'modules' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isActive ? module.color : focusLayer === 'modules' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.20)';
      ctx.beginPath();
      ctx.arc(-w / 2 + 14, 0, isActive ? 2.2 : 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '500 10px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isActive ? 'rgba(255,255,255,0.92)' : focusLayer === 'modules' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.72)';
      ctx.fillText(module.label, -w / 2 + 24, 0.3);
      ctx.restore();

      // Faint tether into the context band.
      const tetherX = x;
      const tetherY1 = y + h / 2;
      const tetherY2 = this.contextBand.y + this.contextBand.h * 0.18;
      const tether = ctx.createLinearGradient(tetherX, tetherY1, tetherX, tetherY2);
      tether.addColorStop(0, isActive ? module.color : 'rgba(255,255,255,0.12)');
      tether.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = tether;
      ctx.lineWidth = isActive ? 1.05 : 0.8;
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
    this._drawIntents(coreNodes, focusLayer);

    // The canonical core graph remains the visual anchor.
    this._drawCore(coreNodes, focusLayer);

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
    this._drawSurfaceSchematic(focusLayer);
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
      { label: 'Identity',  angle: -Math.PI * 0.42, delay: 0.0, lane: 0, color: '#7ca0ff', status: 'included' },
      { label: 'Workspace', angle: -Math.PI * 0.12, delay: 0.18, lane: 1, color: '#9fe4ff', status: 'included' },
      { label: 'Assets',    angle:  Math.PI * 0.14, delay: 0.36, lane: 2, color: '#f4c26f', status: 'available' },
      { label: 'Programs',  angle:  Math.PI * 0.42, delay: 0.54, lane: 0, color: '#a8f0c7', status: 'available' },
      { label: 'Domotics',  angle:  Math.PI * 0.78, delay: 0.72, lane: 1, color: '#e0b4ff', status: 'bridge' },
      { label: 'Logistics', angle:  Math.PI * 1.06, delay: 0.90, lane: 2, color: '#ffc59d', status: 'available' },
      { label: 'Flux',      angle:  Math.PI * 1.38, delay: 1.08, lane: 1, color: '#c9d0ff', status: 'experimental' },
    ];
    this.cardEls = this.slideEl ? [...this.slideEl.querySelectorAll('.module-card')] : [];
    this.featureEl = this.slideEl ? this.slideEl.querySelector('.modules-feature') : null;
    this.activeModuleIndex = -1;
    this.pills = this.slideEl ? [...this.slideEl.querySelectorAll('.module-pill')] : [];
    this._applyModuleAccents();
    this._bindModuleCards();
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

  _applyModuleAccents() {
    this.pills.forEach((pill, index) => {
      const mod = this.modules[index];
      if (!pill || !mod) return;
      pill.style.setProperty('--module-accent', mod.color);
    });
  }

  _bindModuleCards() {
    this.cardEls.forEach((card, index) => {
      const activate = () => this._setActiveModule(index);
      const clear = () => {
        if (this.activeModuleIndex === index) {
          this._setActiveModule(-1);
        }
      };
      card.addEventListener('pointerenter', activate);
      card.addEventListener('pointerleave', clear);
      card.addEventListener('focus', activate);
      card.addEventListener('blur', clear);
      card.addEventListener('click', activate);
      card.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        activate();
      });
    });

    if (this.featureEl) {
      const reset = () => this._setActiveModule(-1);
      this.featureEl.addEventListener('pointerenter', reset);
      this.featureEl.addEventListener('pointerleave', reset);
      this.featureEl.addEventListener('click', reset);
      this.featureEl.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        reset();
      });
    }

    if (this.slideEl) {
      this.slideEl.addEventListener('pointerleave', () => this._setActiveModule(-1));
    }

    this._syncModuleState();
  }

  _setActiveModule(index) {
    const next = Number.isInteger(index) ? index : -1;
    if (this.activeModuleIndex === next) return;
    this.activeModuleIndex = next;
    this._syncModuleState();
  }

  _syncModuleState() {
    this.cardEls.forEach((card, index) => {
      card.classList.toggle('is-active', index === this.activeModuleIndex);
    });

    this.pills.forEach((pill, index) => {
      pill.classList.toggle('is-active', index === this.activeModuleIndex);
    });

    if (this.featureEl) {
      this.featureEl.classList.toggle('is-active', this.activeModuleIndex < 0);
    }
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
    this._setActiveModule(-1);
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

      const isActive = this.activeModuleIndex === i;
      const hasActive = this.activeModuleIndex >= 0;
      const p = easeOutCubic((this.t - mod.delay) / 1.05);
      const orbit = mod.angle + this.t * (0.18 + mod.lane * 0.018);
      const phaseLift = Math.sin(this.t * 1.45 + i * 0.8) * 10;
      const radius = lerp(this.orbitR * 2.05, this.orbitR * (1.02 + mod.lane * 0.07), p) + phaseLift;
      const x = this.cx + Math.cos(orbit) * radius + Math.sin(this.t * 0.9) * 6;
      const y = this.cy + Math.sin(orbit) * radius * 0.88 + Math.cos(orbit * 1.1) * 7;
      const bob = Math.sin(this.t * 1.1 + i) * 1.4;
      const lift = Math.cos(this.t * 0.8 + i) * 0.9;
      const scale = (0.96 + mod.lane * 0.025 + p * 0.02) * (isActive ? 1.06 : 1);
      const alpha = (0.12 + p * 0.72) * (hasActive && !isActive ? 0.72 : 1);

      pill.classList.toggle('is-active', isActive);
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

  _drawGroupShell(group, index, focusLayer) {
    const members = this.nodes.filter(n => n.group === index);
    if (!members.length) return;
    const focused = focusLayer === 'group' || focusLayer === 'context';

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
    this.ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.034 : 0.022) + index * 0.008})`;
    roundRect(this.ctx, x, y, w, h, 26);
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(255,255,255,${(focused ? 0.13 : 0.085) + index * 0.03})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.fillStyle = focused ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.48)';
    this.ctx.font = '500 11px Inter, sans-serif';
    this.ctx.fillText(group.name, x + 16, y + 18);
    this.ctx.restore();
  }

  _drawProjectionCard(card, index, focusLayer) {
    const focused = focusLayer === 'surface';
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.7 + card.phase);
    const x = card.x + Math.sin(this.t * 0.45 + card.phase) * 4;
    const y = card.y + Math.cos(this.t * 0.4 + card.phase) * 3;
    const alpha = (focused ? 0.22 : 0.16) + pulse * (focused ? 0.10 : 0.08);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.fillStyle = `rgba(0,0,0,${(focused ? 0.24 : 0.20) + index * 0.03})`;
    roundRect(this.ctx, -card.w / 2, -card.h / 2, card.w, card.h, 14);
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.22 : 0.16) + pulse * 0.04})`;
    roundRect(this.ctx, -card.w / 2 + 10, -card.h / 2 + 8, card.w - 20, 7, 4);
    this.ctx.fill();

    this.ctx.fillStyle = focused ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.72)';
    this.ctx.font = '500 10px Inter, sans-serif';
    this.ctx.fillText(card.title, -card.w / 2 + 10, -card.h / 2 + 28);

    for (let i = 0; i < card.lines; i++) {
      const lineY = -card.h / 2 + 36 + i * 9;
      this.ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.16 : 0.12) + i * 0.03})`;
      roundRect(this.ctx, -card.w / 2 + 10, lineY, card.w * (0.48 + i * 0.08), 3, 1.5);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  _drawLabel(text, x, y, accent, focusLayer) {
    const { ctx } = this;
    const focused = focusLayer && text.toLowerCase().includes(focusLayer);
    ctx.save();
    ctx.font = '500 12px Inter, sans-serif';
    const w = ctx.measureText(text).width + 18;
    const h = 24;
    ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.1 : 0.06) + accent * 0.08})`;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${(focused ? 0.16 : 0.10) + accent * 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.72 : 0.52) + accent * 0.24})`;
    ctx.fillText(text, x + 9, y + 16);
    ctx.restore();
  }

  _draw() {
    const { ctx, nodes, t } = this;
    const { edgeAlpha, nodeAlpha } = this.opts;
    const focusLayer = this._getFocusLayer();
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

    this.groups.forEach((group, index) => this._drawGroupShell(group, index, focusLayer));

    // Edges.
    const threshold = Math.min(this.w, this.h) * this.opts.thresh;
    const edgeFocusBoost = focusLayer === 'edge' ? 1.35 : focusLayer === 'group' ? 1.12 : 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          const a = (1 - dist / threshold) * edgeAlpha * edgeFocusBoost;
          const gradient = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
          gradient.addColorStop(0, `rgba(255,255,255,0)`);
          gradient.addColorStop(0.5, `rgba(255,255,255,${a})`);
          gradient.addColorStop(1, `rgba(255,255,255,0)`);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = focusLayer === 'edge' ? 0.95 : 0.7;
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
      const nodeBoost = focusLayer === 'node' ? 1.22 : focusLayer === 'group' ? 1.08 : 1;
      const alpha = (nodeAlpha[0] + nodeAlpha[1] * pulse) * nodeBoost;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.9 + pulse * 0.45) * nodeBoost, 0, Math.PI * 2);
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

    this.surfaceCards.forEach((card, index) => this._drawProjectionCard(card, index, focusLayer));

    // Labels placed relative to nodes.
    this.labels.forEach((label, index) => {
      const n = nodes[label.node % nodes.length];
      const drift = Math.sin(t * 0.9 + index) * 4;
      this._drawLabel(label.text, n.x + label.dx + drift, n.y + label.dy, 0.8, focusLayer);
    });

    // Context streams.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const streamBoost = focusLayer === 'context' ? 1.6 : focusLayer === 'surface' ? 0.9 : 1;
    this.streams.forEach((stream, i) => {
      const y = stream.y + Math.sin(t * 1.1 + stream.phase) * 2;
      const phase = (t * stream.speed + i * 60) % (this.w + 120);
      const grad = ctx.createLinearGradient(0, y, this.w, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, `rgba(255,255,255,${0.12 * streamBoost})`);
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
        ctx.fillStyle = `rgba(255,255,255,${(0.12 + j * 0.03) * streamBoost})`;
        ctx.fill();
      }
    });
    ctx.restore();

    // Surface label.
    this._drawLabel('Surface', this.w * 0.75, this.surfaceY - 40, 0.5, focusLayer);
    this._drawLabel('Context', this.w * 0.08, this.contextY - 8, 0.8, focusLayer);
  }
}


// =============================================
// SCENE: BUILD
// Surface Studio, programs, context, canonical core,
// modules, and assets as one construction system.
// =============================================

class BuildScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.surface = null;
    this.contextBand = null;
    this.core = null;
    this.registry = [];
    this.coreLayout = [];
    this.coreEdges = [];
    this.modules = [];
    this.programCaps = [];
    this.assetChips = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.surface = {
      x: this.w * 0.70,
      y: this.h * 0.18,
      w: clamp(this.w * 0.34, 280, 440),
      h: clamp(this.h * 0.22, 170, 226),
      phase: rand(0, Math.PI * 2),
    };
    this.contextBand = {
      x: this.w * 0.10,
      y: this.h * 0.44,
      w: this.w * 0.80,
      h: clamp(this.h * 0.16, 116, 168),
      phase: rand(0, Math.PI * 2),
    };
    this.core = {
      x: this.w * 0.53,
      y: this.h * 0.74,
      r: clamp(Math.min(this.w, this.h) * 0.15, 88, 156),
      phase: rand(0, Math.PI * 2),
    };
  }

  _init() {
    this.registry = [
      { key: 'type', value: 'node semantics' },
      { key: 'policy', value: 'shared rules' },
      { key: 'scope', value: 'module boundary' },
      { key: 'routing', value: 'relation path' },
      { key: 'state', value: 'live memory' },
      { key: 'semantics', value: 'global registry' },
      { key: 'intent', value: 'surface action' },
      { key: 'contracts', value: 'interface type' },
      { key: 'metadata', value: 'graph context' },
      { key: 'linkage', value: 'node relation' },
      { key: 'projection', value: 'surface output' },
    ];

    this.coreLayout = [
      { ox: 0.00, oy: 0.00, r: 4.9, wobble: 1.02 },
      { ox: -0.26, oy: -0.16, r: 2.9, wobble: 0.84 },
      { ox: 0.24, oy: -0.18, r: 2.8, wobble: 0.80 },
      { ox: -0.34, oy: 0.18, r: 2.5, wobble: 0.74 },
      { ox: 0.18, oy: 0.23, r: 2.6, wobble: 0.76 },
      { ox: 0.00, oy: -0.36, r: 2.2, wobble: 0.70 },
      { ox: 0.40, oy: 0.07, r: 2.2, wobble: 0.68 },
      { ox: -0.14, oy: 0.40, r: 2.1, wobble: 0.66 },
    ];
    this.coreEdges = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 5], [2, 5], [1, 3], [2, 4],
      [3, 7], [4, 6], [6, 7],
    ];

    const moduleLabels = ['Identity', 'Workspace', 'Domotics', 'Logistics', 'Flux'];
    this.modules = moduleLabels.map((label, index) => ({
      label,
      angle: (index / moduleLabels.length) * Math.PI * 2 - Math.PI / 2,
      radius: 108 + (index % 2) * 14,
      speed: 0.24 + index * 0.03,
      phase: rand(0, Math.PI * 2),
    }));

    this.programCaps = [
      { label: 'Compose', t: 0.18, phase: rand(0, Math.PI * 2) },
      { label: 'Route', t: 0.54, phase: rand(0, Math.PI * 2) },
      { label: 'Publish', t: 0.82, phase: rand(0, Math.PI * 2) },
    ];

    this.assetChips = [
      { label: '.glb', kind: '3D', x: this.w * 0.78, y: this.h * 0.75, w: 52, h: 26, phase: rand(0, Math.PI * 2) },
      { label: '.pdf', kind: 'Doc', x: this.w * 0.84, y: this.h * 0.70, w: 52, h: 26, phase: rand(0, Math.PI * 2) },
      { label: '.png', kind: 'Image', x: this.w * 0.72, y: this.h * 0.82, w: 56, h: 26, phase: rand(0, Math.PI * 2) },
      { label: '.mp4', kind: 'Video', x: this.w * 0.87, y: this.h * 0.80, w: 56, h: 26, phase: rand(0, Math.PI * 2) },
      { label: '.md', kind: 'Text', x: this.w * 0.76, y: this.h * 0.88, w: 48, h: 26, phase: rand(0, Math.PI * 2) },
      { label: '.csv', kind: 'Data', x: this.w * 0.84, y: this.h * 0.90, w: 50, h: 26, phase: rand(0, Math.PI * 2) },
    ];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t = 0;
    this._init();
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
    this.t += 0.0056;
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

  _getFocusLayer() {
    if (hoveredBuildLayer) return hoveredBuildLayer;
    if (selectedBuildLayer) return selectedBuildLayer;
    const ny = this.h ? mouseY / this.h : 0.5;
    const nx = this.w ? mouseX / this.w : 0.5;
    if (ny < 0.30) return 'surface';
    if (nx < 0.42 && ny < 0.56) return 'programs';
    if (ny < 0.60) return 'context';
    if (nx > 0.70 && ny > 0.56) return 'assets';
    if (ny > 0.70) return 'modules';
    return 'nodes';
  }

  _drawTag(text, x, y, accent = 0.5, align = 'left') {
    const { ctx } = this;
    ctx.save();
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    const padX = 10;
    const w = ctx.measureText(text).width + padX * 2;
    const h = 22;
    const px = align === 'center' ? x - w / 2 : x;
    const py = y - h / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.05 + accent * 0.06})`;
    roundRect(ctx, px, py, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + accent * 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.56 + accent * 0.24})`;
    ctx.fillText(text, px + padX, y + 0.4);
    ctx.restore();
  }

  _drawBackground(focusLayer) {
    const { ctx } = this;
    const bg = ctx.createRadialGradient(
      this.w * 0.58,
      this.h * 0.34,
      0,
      this.w * 0.5,
      this.h * 0.52,
      Math.max(this.w, this.h) * 0.95,
    );
    bg.addColorStop(0, 'rgba(8,8,10,1)');
    bg.addColorStop(0.68, 'rgba(4,4,6,1)');
    bg.addColorStop(1, 'rgba(2,2,3,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    const gridAlpha = focusLayer === 'nodes' ? 0.04 : focusLayer === 'surface' ? 0.036 : 0.028;
    ctx.strokeStyle = `rgba(255,255,255,${gridAlpha})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const yy = this.h * 0.14 + i * (this.h * 0.11);
      ctx.beginPath();
      ctx.moveTo(this.w * 0.06, yy);
      ctx.lineTo(this.w * 0.94, yy);
      ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const xx = this.w * 0.5 + i * (this.w * 0.12);
      ctx.beginPath();
      ctx.moveTo(xx, this.h * 0.14);
      ctx.lineTo(xx + this.w * 0.04, this.h * 0.86);
      ctx.stroke();
    }
  }

  _drawSurface(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'surface';
    const drift = this._parallax(14);
    const wobbleX = Math.sin(this.t * 0.2 + this.surface.phase) * 4.2;
    const wobbleY = Math.cos(this.t * 0.16 + this.surface.phase) * 2.8;
    const x = this.surface.x + drift.x * 0.26 + wobbleX;
    const y = this.surface.y + drift.y * 0.18 + wobbleY;
    const w = this.surface.w;
    const h = this.surface.h;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.sin(this.t * 0.08 + this.surface.phase) + (mouseX / this.w - 0.5)) * (focused ? 0.009 : 0.006));

    const fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fill.addColorStop(0, focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)');
    fill.addColorStop(0.35, focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)');
    fill.addColorStop(1, focused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fill;
    roundRect(ctx, -w / 2, -h / 2, w, h, 24);
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, 26, 20);
    ctx.fill();

    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.56)';
    ctx.fillText('Surface Studio', -w / 2 + 56, -h / 2 + 14);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
    roundRect(ctx, -w / 2 + 41, -h / 2 + 8, w - 58, 12, 6);
    ctx.fill();

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

    ctx.fillStyle = focused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)';
    roundRect(ctx, padX + 10, padY + 10, innerW * 0.58, 20, 10);
    ctx.fill();
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, padX + 10, padY + 38, innerW * 0.82, 9, 4.5);
    ctx.fill();
    roundRect(ctx, padX + 10, padY + 54, innerW * 0.52, 9, 4.5);
    ctx.fill();

    const cardY = padY + innerH - 50;
    for (let i = 0; i < 3; i++) {
      const cw = innerW * (0.28 - i * 0.02);
      const cx = padX + 10 + i * (cw + 10);
      const cy = cardY + Math.sin(this.t * 0.7 + this.surface.phase + i) * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02 + (focused ? 0.03 : 0)})`;
      roundRect(ctx, cx, cy, cw, 26, 11);
      ctx.fill();
      ctx.fillStyle = focused ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.20)';
      roundRect(ctx, cx + 8, cy + 7, cw * 0.6, 4, 2);
      ctx.fill();
    }
    ctx.restore();

    this._drawTag('Surface', x, y + h / 2 + 22, 0.62, 'center');
    ctx.restore();
  }

  _drawPrograms(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'programs' || focusLayer === 'relations';
    const drift = this._parallax(10);
    const start = {
      x: this.surface.x + drift.x * 0.2,
      y: this.surface.y + this.surface.h * 0.48 + drift.y * 0.12,
    };
    const end = {
      x: this.core.x + drift.x * 0.08,
      y: this.core.y - this.core.r * 1.02,
    };
    const control = {
      x: lerp(start.x, end.x, 0.5) + Math.sin(this.t * 0.7 + this.surface.phase) * 18,
      y: lerp(start.y, end.y, 0.48) - 28 + Math.cos(this.t * 0.6 + this.surface.phase) * 8,
    };

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spine = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    spine.addColorStop(0, 'rgba(255,255,255,0)');
    spine.addColorStop(0.2, focused ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.10)');
    spine.addColorStop(0.78, focused ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)');
    spine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = spine;
    ctx.lineWidth = focused ? 1.3 : 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
    ctx.stroke();

    this.programCaps.forEach((cap, index) => {
      const pulse = (this.t * 0.18 + cap.phase) % 1;
      const pt = this._quadPoint(start, control, end, pulse);
      const lw = 56 + index * 2;
      const lh = 22;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.fillStyle = `rgba(255,255,255,${focused ? 0.11 : 0.08})`;
      roundRect(ctx, -lw / 2, -lh / 2, lw, lh, lh / 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${focused ? 0.20 : 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = focused ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.66)';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(cap.label, -lw / 2 + 10, 0.2);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, focused ? 1.9 : 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${focused ? 0.38 : 0.24})`;
      ctx.fill();
    });

    this._drawTag('Programs', lerp(start.x, end.x, 0.34), lerp(start.y, end.y, 0.27), 0.78, 'center');
    ctx.restore();
  }

  _drawContextBand(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'context';
    const drift = this._parallax(10);
    const x = this.contextBand.x + drift.x * 0.16;
    const y = this.contextBand.y + drift.y * 0.10;
    const w = this.contextBand.w;
    const h = this.contextBand.h;
    const rowH = 18;
    const rows = Math.ceil(h / rowH) + 4;
    const scroll = (this.t * 18) % rowH;

    ctx.save();
    roundRect(ctx, x, y, w, h, 26);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.070)' : 'rgba(255,255,255,0.046)';
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    const fill = ctx.createLinearGradient(x, y, x + w, y + h);
    fill.addColorStop(0, 'rgba(255,255,255,0.02)');
    fill.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    fill.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y + h - 1, w, 1);

    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.72)';
    ctx.fillText('Context', x + 16, y + 18);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.54)' : 'rgba(255,255,255,0.42)';
    ctx.fillText('type in context', x + w - 108, y + 18);

    for (let i = -1; i < rows; i++) {
      const entryIndex = ((i + Math.floor(this.t * 1.6)) % this.registry.length + this.registry.length) % this.registry.length;
      const entry = this.registry[entryIndex];
      const rowY = y + 42 + i * rowH - scroll;
      if (rowY < y + 28 || rowY > y + h - 12) continue;
      const alpha = (focused ? 0.14 : 0.10) + 0.22 * (1 - Math.abs((rowY - (y + h / 2)) / (h / 2)));
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x + 16, rowY, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.62 + alpha * 0.72})`;
      ctx.fillText(entry.key.toUpperCase(), x + 28, rowY);
      ctx.fillStyle = `rgba(255,255,255,${0.34 + alpha * 0.55})`;
      ctx.fillText(entry.value, x + w * 0.48, rowY);
    }

    ctx.restore();
  }

  _drawCore(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'nodes' || focusLayer === 'relations';
    const drift = this._parallax(7);
    const x = this.core.x + drift.x * 0.1;
    const y = this.core.y + drift.y * 0.08;
    const r = this.core.r;

    const glow = ctx.createRadialGradient(x, y - r * 0.18, 0, x, y, r * 2.7);
    glow.addColorStop(0, focused ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.12)');
    glow.addColorStop(0.7, focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    roundRect(ctx, x - r, y - r, r * 2, r * 2, r * 1.2);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.050)' : 'rgba(255,255,255,0.036)';
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = focused ? 1.2 : 1;
    ctx.stroke();
    ctx.clip();

    const nodes = this.coreLayout.map((layout, index) => ({
      x: x + layout.ox * r * 0.80 + Math.sin(this.t * 0.7 + layout.ox * 9 + index) * layout.wobble * (focused ? 1.12 : 1),
      y: y + layout.oy * r * 0.80 + Math.cos(this.t * 0.64 + layout.oy * 7 + index) * layout.wobble * 0.78 * (focused ? 1.12 : 1),
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
      gradient.addColorStop(0.5, focused ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.12)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = focused ? 0.95 : 0.75;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
    });
    ctx.restore();

    nodes.forEach((node, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.35 + node.phase);
      const size = node.r * (0.88 + pulse * (focused ? 0.44 : 0.38));
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(focused ? 0.22 : 0.18) + pulse * (focused ? 0.42 : 0.38)})`;
      ctx.fill();

      if (index === 0) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 5, 0, Math.PI * 2);
        ctx.strokeStyle = focused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
        ctx.lineWidth = focused ? 1.15 : 1;
        ctx.stroke();
      }
    });

    ctx.restore();

    this._drawTag('Core', x, y - r - 28, 0.86, 'center');

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

  _drawModules(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'modules';
    const drift = this._parallax(6);
    const x = this.core.x + drift.x * 0.1;
    const y = this.core.y + drift.y * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.modules.forEach((module, index) => {
      const angle = module.angle + this.t * module.speed + module.phase * 0.1;
      const px = x + Math.cos(angle) * module.radius;
      const py = y + Math.sin(angle) * module.radius * 0.74;
      const w = 76 + module.label.length * 2.1;
      const h = 24;
      const alpha = focused ? 0.14 : 0.08;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(px, py);
      ctx.strokeStyle = `rgba(255,255,255,${alpha + index * 0.01})`;
      ctx.lineWidth = focused ? 1 : 0.75;
      ctx.stroke();

      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = `rgba(255,255,255,${focused ? 0.12 : 0.08})`;
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${focused ? 0.22 : 0.14})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = focused ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.64)';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(module.label, -w / 2 + 10, 0.2);
      ctx.restore();
    });
    ctx.restore();

    this._drawTag('Modules', x - this.core.r * 0.05, y + this.core.r + 28, 0.76, 'center');
  }

  _drawAssets(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'assets';
    const drift = this._parallax(12);
    const baseX = this.w * 0.78 + drift.x * 0.14;
    const baseY = this.h * 0.79 + drift.y * 0.12;
    const target = {
      x: this.core.x + drift.x * 0.08,
      y: this.core.y + this.core.r * 0.18,
    };

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.assetChips.forEach((chip, index) => {
      const x = chip.x + Math.sin(this.t * 0.55 + chip.phase + index) * 6 + drift.x * 0.04;
      const y = chip.y + Math.cos(this.t * 0.48 + chip.phase + index) * 4 + drift.y * 0.04;
      const alpha = focused ? 0.14 : 0.08;
      const line = ctx.createLinearGradient(target.x, target.y, x, y);
      line.addColorStop(0, 'rgba(255,255,255,0)');
      line.addColorStop(1, `rgba(255,255,255,${alpha})`);
      ctx.strokeStyle = line;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = `rgba(255,255,255,${focused ? 0.12 : 0.08})`;
      roundRect(ctx, -chip.w / 2, -chip.h / 2, chip.w, chip.h, 13);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${focused ? 0.22 : 0.14})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = focused ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.66)';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(chip.label, -chip.w / 2 + 9, 0.2);
      ctx.fillStyle = focused ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.34)';
      ctx.fillText(chip.kind, chip.w / 2 - 24, 0.2);
      ctx.restore();
    });
    ctx.restore();

    this._drawTag('Assets', baseX, baseY + 36, 0.78, 'center');
  }

  _draw() {
    const { ctx } = this;
    const focusLayer = this._getFocusLayer();
    ctx.clearRect(0, 0, this.w, this.h);

    this._drawBackground(focusLayer);

    // Surface and program spine live behind the core graph so the hierarchy reads top → bottom.
    this._drawSurface(focusLayer);
    this._drawContextBand(focusLayer);
    this._drawPrograms(focusLayer);
    this._drawCore(focusLayer);
    this._drawModules(focusLayer);
    this._drawAssets(focusLayer);
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
    this.isFinePointer = HAS_FINE_POINTER;
    this.wordBank = [
      'CRM', 'Logistics', 'Web', 'Domotics', 'Simulation', 'Physics', 'Biology', 'Genome',
      'Consciousness', 'Systems', 'Data', 'Infrastructure', 'Education', 'Retail', 'Media',
      'Robotics', 'Research', 'Marketplace', 'Operations', 'Energy', 'Finance', 'Health',
      'Navigation', 'Design', 'Music', 'Culture', 'Planning', 'Strategy', 'Computation',
      'Automation', 'Analytics', 'Archive', 'Workflow', 'Collaboration', 'Knowledge',
      'Publishing', 'Signals', 'Support', 'Sensors', 'Agents', 'Catalog', 'Content',
      'Experience', 'Protocol', 'Telemetry', 'Audience', 'Scheduling', 'Interfaces',
    ];
    this.useCasePalette = [
      { fill: [124, 160, 255], stroke: [209, 223, 255], glow: [124, 160, 255] },
      { fill: [93, 229, 214], stroke: [202, 255, 247], glow: [93, 229, 214] },
      { fill: [141, 204, 120], stroke: [221, 250, 212], glow: [141, 204, 120] },
      { fill: [255, 194, 102], stroke: [255, 233, 191], glow: [255, 194, 102] },
      { fill: [255, 145, 196], stroke: [255, 223, 238], glow: [255, 145, 196] },
      { fill: [180, 146, 255], stroke: [226, 210, 255], glow: [180, 146, 255] },
      { fill: [110, 214, 255], stroke: [214, 244, 255], glow: [110, 214, 255] },
      { fill: [255, 166, 122], stroke: [255, 228, 211], glow: [255, 166, 122] },
    ];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
  }

  _init() {
    const layers = this.isFinePointer ? [0.30, 0.48, 0.66, 0.84, 1] : [0.42, 0.64, 0.82, 1];
    const count = this.isFinePointer ? 44 : 30;
    this.words = Array.from({ length: count }, (_, i) => {
      const word = this.wordBank[i % this.wordBank.length];
      const layer = randChoice(layers);
      const color = this._pickUseCaseColor(word, i);
      const family = this._resolveUseCaseFamily(word);
      const baseX = rand(this.w * 0.08, this.w * 0.92);
      const baseY = rand(this.h * 0.10, this.h * 0.90);
      return {
        text: word,
        color,
        family,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        orbitX: rand(18, 82) * layer,
        orbitY: rand(10, 52) * layer,
        speed: rand(0.08, 0.24) + layer * 0.09,
        base: 9 + rand(0, 10) * layer + (layer > 0.9 ? 5 : layer > 0.8 ? 3 : 0),
        depth: layer,
        phase: rand(0, Math.PI * 2),
        alpha: rand(0.14, 0.30) + layer * 0.10,
        blur: layer < 0.45 ? rand(1.6, 3.4) : layer < 0.7 ? rand(0.8, 1.8) : rand(0.1, 0.85),
        wobble: rand(0.6, 1.8) + layer * 0.5,
        twist: rand(-0.018, 0.018),
        drift: rand(0.3, 1.2),
      };
    });
  }

  _resolveUseCaseFamily(word) {
    const key = word.toLowerCase();
    if (['crm', 'web', 'marketplace', 'finance', 'retail', 'data', 'content', 'catalog'].includes(key)) return 'enterprise';
    if (['logistics', 'operations', 'navigation', 'planning', 'infrastructure', 'scheduling', 'workflow'].includes(key)) return 'ops';
    if (['domotics', 'robotics', 'systems', 'consciousness', 'strategy', 'agents', 'interfaces'].includes(key)) return 'systems';
    if (['simulation', 'physics', 'research', 'computation', 'telemetry', 'protocol'].includes(key)) return 'science';
    if (['biology', 'genome', 'health', 'education', 'knowledge', 'signals'].includes(key)) return 'bio';
    if (['media', 'music', 'culture', 'design', 'experience', 'publishing', 'audience'].includes(key)) return 'culture';
    if (['automation', 'analytics', 'archive', 'collaboration', 'support'].includes(key)) return 'platform';
    return 'general';
  }

  _pickUseCaseColor(word, index) {
    const key = word.toLowerCase();
    const paletteIndex = (() => {
      if (['crm', 'web', 'marketplace', 'finance', 'retail', 'data', 'content', 'catalog'].includes(key)) return 0;
      if (['logistics', 'operations', 'navigation', 'planning', 'infrastructure', 'scheduling', 'workflow'].includes(key)) return 1;
      if (['domotics', 'robotics', 'systems', 'consciousness', 'strategy', 'agents', 'interfaces'].includes(key)) return 5;
      if (['simulation', 'physics', 'research', 'computation', 'telemetry', 'protocol'].includes(key)) return 3;
      if (['biology', 'genome', 'health', 'education', 'knowledge', 'signals'].includes(key)) return 2;
      if (['media', 'music', 'culture', 'design', 'experience', 'publishing', 'audience'].includes(key)) return 4;
      if (['automation', 'analytics', 'archive', 'collaboration', 'support'].includes(key)) return 6;
      const seed = [...word].reduce((acc, ch) => acc + ch.charCodeAt(0), index * 17);
      return seed % this.useCasePalette.length;
    })();

    return this.useCasePalette[paletteIndex];
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
    const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
    const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
    this.words.forEach((w, i) => {
      const orbit = this.t * w.speed + w.phase;
      const sway = Math.sin(orbit + i * 0.09);
      const lift = Math.cos(orbit * 0.92 + i * 0.07);
      const mousePullX = nx * 18 * w.depth;
      const mousePullY = ny * 16 * w.depth;
      w.x = w.baseX + sway * w.orbitX + mousePullX;
      w.y = w.baseY + lift * w.orbitY + mousePullY;
      if (!this.isFinePointer) {
        w.x += Math.sin(this.t * 0.32 + w.phase) * 1.4;
        w.y += Math.cos(this.t * 0.28 + w.phase) * 1.1;
      }
      if (i % 3 === 0) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.72 + w.phase);
        w.alpha = 0.12 + w.depth * 0.16 + pulse * (0.16 + w.depth * 0.08);
      }
    });
  }

  _draw() {
    const { ctx, words, t } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, this.w, this.h);

    const bg = ctx.createRadialGradient(this.w * 0.48, this.h * 0.42, 30, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.8);
    bg.addColorStop(0, 'rgba(10,10,12,1)');
    bg.addColorStop(1, 'rgba(3,3,4,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    words
      .slice()
      .sort((a, b) => a.depth - b.depth)
      .forEach((w, i) => {
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + w.phase);
        const far = clamp(1 - w.depth, 0, 1);
        const familyBoost = w.family === 'science' || w.family === 'systems' ? 0.05 : 0;
        const scale = 0.78 + far * 0.56 + pulse * 0.08 + familyBoost;
        const fillAlpha = clamp((0.14 + w.depth * 0.64) * (0.78 + pulse * 0.22), 0.05, 0.92);
        const strokeAlpha = clamp((0.08 + far * 0.36) * (0.68 + pulse * 0.32), 0.02, 0.48);
        const glowAlpha = clamp((0.05 + far * 0.24) * (0.72 + pulse * 0.28), 0.02, 0.34);
        const fillColor = w.color?.fill || [255, 255, 255];
        const strokeColor = w.color?.stroke || [255, 255, 255];
        const glowColor = w.color?.glow || [255, 255, 255];
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(Math.sin(t * 0.22 + w.phase) * (0.012 + w.depth * 0.02) + w.twist);
        ctx.scale(scale, scale);
        const weight = Math.round(420 + far * 360 + pulse * 40);
        ctx.font = `${weight} ${Math.round(w.base)}px Inter, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.35 + far * 1.35 + pulse * 0.08;
        const strokeBase = light
          ? [strokeColor[0] * 0.42, strokeColor[1] * 0.42, strokeColor[2] * 0.42]
          : strokeColor;
        ctx.strokeStyle = `rgba(${strokeBase.map(v => Math.round(v)).join(',')},${strokeAlpha})`;
        const blur = far > 0.72
          ? clamp(w.blur + far * 1.9 + Math.max(0, 0.7 - pulse) * 0.5, 0, 4.8)
          : far > 0.38
            ? clamp(w.blur * 0.48 + Math.max(0, 0.7 - pulse) * 0.18, 0, 1.2)
            : 0;
        ctx.filter = blur > 0.16 ? `blur(${blur.toFixed(2)}px)` : 'none';
        if (far > 0.18 || pulse > 0.72) {
          ctx.strokeText(w.text, 0, 0);
        }
        ctx.shadowBlur = far > 0.8 ? 10 : far > 0.55 ? 5 : far > 0.3 ? 2 : 0;
        ctx.shadowColor = `rgba(${glowColor.join(',')},${light ? 0.06 : 0.12})`;
        const fillBase = light
          ? [fillColor[0] * 0.42, fillColor[1] * 0.42, fillColor[2] * 0.42]
          : fillColor;
        ctx.fillStyle = `rgba(${fillBase.map(v => Math.round(v)).join(',')},${fillAlpha})`;
        ctx.fillText(w.text, 0, 0);
        if (far > 0.82) {
          ctx.filter = 'none';
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = `rgba(${strokeColor.join(',')},${Math.min(0.16, strokeAlpha * 0.7)})`;
          ctx.strokeText(w.text, 0, 0);
        }
        ctx.filter = 'none';
        ctx.shadowBlur = 0;
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
// SCENE: GRAPHOS LIVE
// Live node graph editor adapted for the deck.
// =============================================

const GRAPHOS_LIVE = {
  CORE_RATIO: 0.25,
  CORE_PADDING: 8,
  INNER_PADDING: 12,
  SIZE_LERP: 0.08,
  SIZE_LERP_CHILD: 0.1,
  MAX_RADIUS: 140,
  MIN_CHILD_RADIUS: 8,
  ARC_DENSITY: 0.6,
  LINK_HIT_RADIUS: 6,
  STORAGE_KEY: 'electronic-artefacts.graphos.live.v1',
};

const GRAPHOS_LIVE_COLORS = [
  '#7ca0ff',
  '#9fe4ff',
  '#f3f6ff',
  '#ffd18e',
  '#9ae6c7',
  '#c3b2ff',
  '#ff9bc8',
];

class GraphOSLiveNode {
  constructor(x, y, opts = {}) {
    this.id = opts.id || (crypto?.randomUUID?.() || `graphos-${Math.random().toString(36).slice(2)}`);
    this.x = x;
    this.y = y;
    this.r = opts.r ?? 10;
    this.targetR = opts.targetR ?? this.r;
    this.baseR = opts.baseR ?? this.r;
    this.maxRadius = opts.maxRadius ?? GRAPHOS_LIVE.MAX_RADIUS;
    this.innerPadding = opts.innerPadding ?? GRAPHOS_LIVE.INNER_PADDING;
    this.emptyPaddingBoost = opts.emptyPaddingBoost ?? 0;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? 0;
    this.maxSpeed = opts.maxSpeed ?? 6;
    this.friction = opts.friction ?? 0.88;
    this.children = [];
    this.parent = null;
    this.hover = false;
    this.hoverFactor = 0;
    this.selected = false;
    this.isContainedPreview = false;
    this.createdAt = opts.createdAt ?? Date.now();
    this.name = opts.name ?? 'Node';
    this.color = opts.color ?? '#5a78ff';
    this.type = opts.type ?? null;
    this.showCore = opts.showCore ?? true;
    this.orbitAngle = opts.orbitAngle ?? Math.random() * Math.PI * 2;
    this.orbitSpeed = opts.orbitSpeed ?? (0.0015 + Math.random() * 0.003);
    this.orbitTilt = opts.orbitTilt ?? (0.6 + Math.random() * 0.4);
    this.depth = opts.depth ?? 0;
    this.displayRadius = this.r;
  }

  addChild(node) {
    let current = this;
    while (current) {
      if (current === node) return;
      current = current.parent;
    }

    if (node.parent) {
      node.parent.removeChild(node);
    }

    node.parent = this;
    this.children.push(node);
  }

  removeChild(node) {
    this.children = this.children.filter(n => n !== node);
    node.parent = null;
  }

  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      r: this.r,
      baseR: this.baseR,
      createdAt: this.createdAt,
      parentId: this.parent ? this.parent.id : null,
      name: this.name,
      color: this.color,
      showCore: this.showCore,
      type: this.type,
    };
  }

  update(scene) {
    const lerpFactor = this.parent ? GRAPHOS_LIVE.SIZE_LERP_CHILD : GRAPHOS_LIVE.SIZE_LERP;
    this.r += (this.targetR - this.r) * lerpFactor;

    const targetHover = this.hover ? 1 : 0;
    this.hoverFactor += (targetHover - this.hoverFactor) * 0.06;

    if (this.children.length === 0) {
      this.targetR = this.baseR + this.emptyPaddingBoost;
    } else {
      let maxChildExtent = 0;
      this.children.forEach(child => {
        const childDist = scene.dist(child.x, child.y, this.x, this.y);
        maxChildExtent = Math.max(maxChildExtent, childDist + child.r);
      });

      const requiredRadius = maxChildExtent + this.innerPadding;
      this.targetR = Math.max(this.baseR, Math.min(requiredRadius, this.maxRadius));
    }

    if (this.selected && this.children.length > 0) {
      this.targetR *= 1.12;
    }

    this.x += this.vx;
    this.y += this.vy;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;

    const margin = this.r;
    if (this.x < margin) {
      this.x = margin;
      this.vx *= -0.3;
    }
    if (this.x > scene.w - margin) {
      this.x = scene.w - margin;
      this.vx *= -0.3;
    }
    if (this.y < margin) {
      this.y = margin;
      this.vy *= -0.3;
    }
    if (this.y > scene.h - margin) {
      this.y = scene.h - margin;
      this.vy *= -0.3;
    }

    if (!this.children.length) return;

    const innerCoreRadius = this.r * GRAPHOS_LIVE.CORE_RATIO;
    const minAllowedBase = this.showCore ? innerCoreRadius + GRAPHOS_LIVE.CORE_PADDING : GRAPHOS_LIVE.CORE_PADDING;
    const maxAllowedBase = Math.max(minAllowedBase + 8, this.r - this.innerPadding);
    const childCount = this.children.length;
    const clusterColumns = Math.max(1, Math.ceil(Math.sqrt(childCount || 1)));

    this.children.forEach((child, index) => {
      child.orbitAngle += child.orbitSpeed;

      const minAllowed = minAllowedBase + child.r;
      const maxAllowed = Math.max(minAllowed + 4, maxAllowedBase - child.r);
      const midRadius = (minAllowed + maxAllowed) * 0.5;
      const arcPerChild = (2 * Math.PI * Math.max(midRadius, 1)) / Math.max(1, childCount);
      const maxChildDiameter = arcPerChild * GRAPHOS_LIVE.ARC_DENSITY;
      child.targetR = Math.max(
        GRAPHOS_LIVE.MIN_CHILD_RADIUS,
        Math.min(child.baseR, maxChildDiameter * 0.5),
      );

      let targetX;
      let targetY;

      if (this.showCore) {
        child.depth = this.depth + 1;
        const targetRadius = Math.max(minAllowed, (minAllowed + maxAllowed) * 0.5);
        targetX = this.x + Math.cos(child.orbitAngle) * targetRadius;
        targetY = this.y + Math.sin(child.orbitAngle) * targetRadius * child.orbitTilt;
      } else {
        child.depth = this.depth + 1;
        const columns = clusterColumns;
        const rows = Math.max(1, Math.ceil(childCount / columns));
        const col = index % columns;
        const row = Math.floor(index / columns);
        const baseSpacing = Math.min(this.r * 0.35, Math.max(child.r * 2.5, 12));
        const maxSpan = Math.max(12, maxAllowed - minAllowed);
        const perSlot = columns <= 1 ? maxSpan : maxSpan / (columns - 1);
        const spacingCap = Math.min(this.r * 0.45, Math.max(6, perSlot));
        const clusterSpacing = Math.min(baseSpacing, spacingCap);
        const startX = this.x - ((columns - 1) * clusterSpacing) * 0.5;
        const startY = this.y - ((rows - 1) * clusterSpacing) * 0.5;
        targetX = startX + col * clusterSpacing;
        targetY = startY + row * clusterSpacing;
      }

      child.vx += (targetX - child.x) * 0.06;
      child.vy += (targetY - child.y) * 0.06;

      const d = scene.dist(child.x, child.y, this.x, this.y);
      if (d > 0) {
        const nx = (child.x - this.x) / d;
        const ny = (child.y - this.y) / d;

        if (d > maxAllowed) {
          const tx = this.x + nx * maxAllowed;
          const ty = this.y + ny * maxAllowed;
          child.vx += (tx - child.x) * 0.25;
          child.vy += (ty - child.y) * 0.25;
        }

        if (d < minAllowed) {
          const tx = this.x + nx * minAllowed;
          const ty = this.y + ny * minAllowed;
          child.vx += (tx - child.x) * 0.25;
          child.vy += (ty - child.y) * 0.25;
        }
      }
    });
  }

  draw(ctx, focusLayer) {
    ctx.save();

    const focusBoost = focusLayer === 'node' ? 1.18 : 1;
    ctx.globalAlpha = (0.56 + (this.depth + 1) * 0.16) * focusBoost;

    const selectionScale = this.selected
      ? (this.children.length > 0 ? 1.12 : 1.04)
      : 1;
    const hoverScale = (1 + this.hoverFactor * 0.08) * selectionScale;
    const dynamicRadius = this.r * hoverScale;
    const depthScale = 0.78 + (this.depth + 1) * 0.11;
    const adjustedRadius = dynamicRadius * depthScale;
    const outerRingFactor = this.children.length > 0 ? 1 : 0.72;
    const displayRadius = adjustedRadius * outerRingFactor;
    this.displayRadius = displayRadius;

    const glow = 0.5 + this.hoverFactor * 1.15 + (this.selected ? 0.45 : 0);
    ctx.shadowColor = 'rgba(255,255,255,0.18)';
    ctx.shadowBlur = glow;

    ctx.beginPath();
    ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 0.9 + this.hoverFactor * 0.55 + (this.selected ? 0.15 : 0);
    ctx.stroke();

    if (this.color) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius * 0.98, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = 0.14 + this.hoverFactor * 0.08 + (this.selected ? 0.06 : 0);
      ctx.lineWidth = 1.2 + this.hoverFactor * 0.35;
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;

    if (this.showCore && this.color) {
      const coreRadius = displayRadius * GRAPHOS_LIVE.CORE_RATIO * (1 + this.hoverFactor * 0.15);
      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius * 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + this.hoverFactor * 0.2 + (this.selected ? 0.08 : 0)})`;
      ctx.lineWidth = 1 + this.hoverFactor * 0.8;
      ctx.stroke();
    }

    if (this.children.length > 0) {
      ctx.globalAlpha = 0.12 + this.hoverFactor * 0.08;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(207, 216, 255, 0.9)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, this.x, this.y + displayRadius + 14);

    if (this.type) {
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText(this.type, this.x, this.y - displayRadius - 12);
    }

    ctx.restore();
  }
}

class GraphOSLiveScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.w = 0;
    this.h = 0;
    this.nodes = [];
    this.links = [];
    this.view = { showNodes: true, showLinks: true, activeType: null };
    this.selectedNodes = new Set();
    this.selectedLink = null;
    this.hoveredNode = null;
    this.hoveredLink = null;
    this.draggedNode = null;
    this.dragPointerId = null;
    this.contextTarget = null;
    this.pickingColor = false;
    this.surfacePreview = null;
    this.surfacePreviewHover = false;
    this.draggedSurfacePreview = false;
    this.surfaceDragPointerId = null;
    this.surfaceDragOffsetX = 0;
    this.surfaceDragOffsetY = 0;
    this.contextRibbon = null;
    this.intentLanes = [];
    this.coreNode = null;
    this._bound = {
      contextMenu: e => this._onContextMenu(e),
      bodyMouseDown: e => this._onBodyMouseDown(e),
      canvasDown: e => this._onPointerDown(e),
      canvasMove: e => this._onPointerMove(e),
      pointerUp: e => this._onPointerUp(e),
      pointerCancel: e => this._onPointerCancel(e),
      keyDown: e => this._onKeyDown(e),
      globalDown: e => this._onGlobalDown(e),
      colorWheelMove: e => this._onColorWheelMove(e),
      colorWheelDown: e => this._onColorWheelDown(e),
      colorWheelUp: () => this._endColorPick(),
      toggleNodes: () => {
        this.view.showNodes = !this.view.showNodes;
        this._refreshUi();
      },
      toggleLinks: () => {
        this.view.showLinks = !this.view.showLinks;
        this._refreshUi();
      },
      openMenu: () => this._openQuickActions(),
      typeFilter: () => {
        this.view.activeType = graphosTypeFilterEl && graphosTypeFilterEl.value ? graphosTypeFilterEl.value : null;
        this._refreshUi();
      },
    };

    this._bindUi();
    this._buildColorWheel();
    this._resize();
    this._loadGraph();
    if (!this.nodes.length) {
      this._seedGraph();
    }
    this._syncCoreNode();
    this._refreshTypeFilter();
    this._refreshUi();
    this._setSelection([]);
  }

  _isActive() {
    return activeSlideEl && activeSlideEl.dataset.slide === 'graphos';
  }

  _bindUi() {
    const stopPropagation = e => e.stopPropagation();
    const stopSlideGestures = el => {
      if (!el) return;
      el.addEventListener('wheel', stopPropagation, { passive: true });
      el.addEventListener('touchstart', stopPropagation, { passive: true });
      el.addEventListener('touchmove', stopPropagation, { passive: true });
      el.addEventListener('touchend', stopPropagation, { passive: true });
    };

    stopSlideGestures(graphosWindowEl);
    stopSlideGestures(graphosWindowBodyEl);
    stopSlideGestures(graphosContextMenuEl);
    stopSlideGestures(graphosColorPickerEl);
    stopSlideGestures(this.canvas);

    if (graphosContextMenuEl) {
      graphosContextMenuEl.addEventListener('pointerdown', e => e.stopPropagation());
    }

    if (graphosColorPickerEl) {
      graphosColorPickerEl.addEventListener('pointerdown', e => e.stopPropagation());
    }

    if (graphosToggleNodesEl) {
      graphosToggleNodesEl.addEventListener('click', this._bound.toggleNodes);
    }

    if (graphosToggleLinksEl) {
      graphosToggleLinksEl.addEventListener('click', this._bound.toggleLinks);
    }

    if (graphosOpenMenuEl) {
      graphosOpenMenuEl.addEventListener('click', this._bound.openMenu);
    }

    if (graphosTypeFilterEl) {
      graphosTypeFilterEl.addEventListener('change', this._bound.typeFilter);
    }

    if (graphosColorWheelEl) {
      graphosColorWheelEl.addEventListener('pointermove', this._bound.colorWheelMove);
      graphosColorWheelEl.addEventListener('pointerdown', this._bound.colorWheelDown);
    }

    document.addEventListener('contextmenu', this._bound.contextMenu, true);
    document.addEventListener('keydown', this._bound.keyDown);
    window.addEventListener('mousedown', this._bound.globalDown);
    window.addEventListener('mouseup', this._bound.pointerUp);
    window.addEventListener('mouseup', this._bound.colorWheelUp);
    window.addEventListener('pointerup', this._bound.pointerUp);
    window.addEventListener('pointercancel', this._bound.pointerCancel);
    this.canvas.addEventListener('pointerdown', this._bound.canvasDown);
    this.canvas.addEventListener('pointermove', this._bound.canvasMove);
    this.canvas.addEventListener('pointerleave', () => {
      if (!this.draggedSurfacePreview) {
        this.surfacePreviewHover = false;
      }
      if (!this.draggedNode) {
        this._clearHoverState();
      }
    });
  }

  _buildColorWheel() {
    if (!graphosColorWheelEl) return;
    const wheelCtx = graphosColorWheelEl.getContext('2d');
    const radius = 70;
    const image = wheelCtx.createImageData(140, 140);

    for (let y = 0; y < 140; y++) {
      for (let x = 0; x < 140; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const angle = Math.atan2(dy, dx);
          const hue = (angle * 180 / Math.PI + 360) % 360;
          const sat = dist / radius;
          const [r, g, b] = this._hslToRgb(hue / 360, sat, 0.5);
          const i = (y * 140 + x) * 4;
          image.data[i] = r;
          image.data[i + 1] = g;
          image.data[i + 2] = b;
          image.data[i + 3] = 255;
        }
      }
    }

    wheelCtx.putImageData(image, 0, 0);
  }

  _hslToRgb(h, s, l) {
    let r;
    let g;
    let b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  _rgbToHex(r, g, b) {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    const prevSurface = this.surfacePreview;
    const surfaceW = clamp(this.w * 0.19, 190, 280);
    const surfaceH = clamp(this.h * 0.18, 126, 170);
    this.surfacePreview = prevSurface ? {
      ...prevSurface,
      x: clamp(prevSurface.x, surfaceW * 0.5 + 24, this.w - surfaceW * 0.5 - 24),
      y: clamp(prevSurface.y, surfaceH * 0.5 + 24, this.h - surfaceH * 0.5 - 24),
      w: surfaceW,
      h: surfaceH,
    } : {
      x: this.w * 0.77,
      y: this.h * 0.24,
      w: surfaceW,
      h: surfaceH,
      phase: Math.random() * Math.PI * 2,
    };
    this.contextRibbon = {
      y: this.h * 0.82,
      phase: Math.random() * Math.PI * 2,
    };
    this.intentLanes = [
      { phase: Math.random() * Math.PI * 2, kind: 'surface' },
      { phase: Math.random() * Math.PI * 2, kind: 'context' },
      { phase: Math.random() * Math.PI * 2, kind: 'surface' },
      { phase: Math.random() * Math.PI * 2, kind: 'context' },
    ];
  }

  _syncCoreNode() {
    this.coreNode = this.nodes.find(node => node.type === 'core' && !node.parent) || this.nodes.find(node => node.type === 'core') || this.nodes[0] || null;
  }

  _seedGraph() {
    const cx = this.w * 0.52;
    const cy = this.h * 0.63;
    const core = this.createNode(cx, cy, {
      name: 'Core',
      type: 'core',
      color: '#7ca0ff',
      baseR: 28,
      r: 28,
      showCore: true,
      maxRadius: 180,
      depth: 0,
    });
    const publicNode = this.createNode(cx + 126, cy - 74, {
      name: 'Public',
      type: 'public',
      color: '#f4f7ff',
      baseR: 14,
      r: 14,
    });
    const userNode = this.createNode(cx - 66, cy - 54, {
      name: 'User',
      type: 'user',
      color: '#9fe4ff',
      baseR: 13,
      r: 13,
    });
    const workspaceNode = this.createNode(cx + 12, cy - 22, {
      name: 'Workspace',
      type: 'workspace',
      color: '#ffd18e',
      baseR: 12,
      r: 12,
    });
    const surfaceNode = this.createNode(this.w * 0.82, this.h * 0.27, {
      name: 'Surface',
      type: 'surface',
      color: '#ffffff',
      baseR: 13,
      r: 13,
      showCore: true,
    });
    const contextNode = this.createNode(this.w * 0.18, this.h * 0.29, {
      name: 'Context',
      type: 'context',
      color: '#c3b2ff',
      baseR: 12,
      r: 12,
    });
    const intentNode = this.createNode(this.w * 0.50, this.h * 0.84, {
      name: 'Intent',
      type: 'intent',
      color: '#9ae6c7',
      baseR: 11,
      r: 11,
    });

    core.addChild(publicNode);
    core.addChild(userNode);
    core.addChild(workspaceNode);

    this.links.push(
      { a: core, b: surfaceNode },
      { a: contextNode, b: core },
      { a: intentNode, b: core },
      { a: publicNode, b: surfaceNode },
      { a: userNode, b: contextNode },
    );

    this._syncCoreNode();
  }

  createNode(x, y, opts = {}) {
    const node = new GraphOSLiveNode(x, y, {
      color: opts.color || randChoice(GRAPHOS_LIVE_COLORS),
      ...opts,
    });
    this.nodes.push(node);
    return node;
  }

  cloneNodeForDuplicate(source) {
    if (!source) return null;
    const copy = this.createNode(source.x + 26, source.y + 18, {
      name: source.name,
      color: source.color,
      type: source.type,
      baseR: source.baseR,
      r: source.r,
      targetR: source.targetR,
      maxRadius: source.maxRadius,
      innerPadding: source.innerPadding,
      emptyPaddingBoost: source.emptyPaddingBoost,
      showCore: source.showCore,
      orbitAngle: source.orbitAngle + 0.5,
      orbitSpeed: source.orbitSpeed,
      orbitTilt: source.orbitTilt,
      createdAt: source.createdAt,
    });
    return copy;
  }

  serializeNodes() {
    return this.nodes.map(node => node.serialize());
  }

  serializeLinks() {
    return this.links.map(link => ({
      a: link.a?.id ?? null,
      b: link.b?.id ?? null,
    }));
  }

  saveGraph() {
    try {
      const payload = {
        nodes: this.serializeNodes(),
        links: this.serializeLinks(),
        surfacePreview: this.surfacePreview ? {
          x: this.surfacePreview.x,
          y: this.surfacePreview.y,
        } : null,
      };
      localStorage.setItem(GRAPHOS_LIVE.STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('GraphOS live persistence failed:', error);
    }
  }

  _loadGraph() {
    let raw = null;
    try {
      raw = localStorage.getItem(GRAPHOS_LIVE.STORAGE_KEY);
    } catch (error) {
      console.warn('GraphOS live storage read failed:', error);
      return;
    }

    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn('GraphOS live storage parse failed:', error);
      return;
    }

    const graphData = Array.isArray(parsed) ? { nodes: parsed, links: [] } : parsed;
    const nodeItems = Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const linkItems = Array.isArray(graphData.links) ? graphData.links : [];

    this.nodes.length = 0;
    this.links.length = 0;

    const byId = new Map();
    nodeItems.forEach(item => {
      const node = new GraphOSLiveNode(item.x ?? this.w * 0.5, item.y ?? this.h * 0.5, {
        id: item.id,
        x: item.x,
        y: item.y,
        r: item.r ?? item.baseR ?? 10,
        baseR: item.baseR ?? item.r ?? 10,
        createdAt: item.createdAt,
        name: item.name,
        color: item.color,
        showCore: item.showCore ?? true,
        type: item.type,
      });
      node.targetR = node.r;
      node.vx = 0;
      node.vy = 0;
      this.nodes.push(node);
      byId.set(node.id, node);
    });

    nodeItems.forEach(item => {
      if (!item.parentId) return;
      const child = byId.get(item.id);
      const parent = byId.get(item.parentId);
      if (!child || !parent || child === parent) return;
      parent.addChild(child);
    });

    linkItems.forEach(item => {
      const a = byId.get(item.a);
      const b = byId.get(item.b);
      if (!a || !b) return;
      this.links.push({ a, b });
    });

    if (graphData.surfacePreview && Number.isFinite(graphData.surfacePreview.x) && Number.isFinite(graphData.surfacePreview.y)) {
      this.surfacePreview.x = clamp(graphData.surfacePreview.x, this.surfacePreview.w * 0.5 + 24, this.w - this.surfacePreview.w * 0.5 - 24);
      this.surfacePreview.y = clamp(graphData.surfacePreview.y, this.surfacePreview.h * 0.5 + 24, this.h - this.surfacePreview.h * 0.5 - 24);
    }
  }

  _refreshTypeFilter() {
    if (!graphosTypeFilterEl) return;

    const types = new Set();
    this.nodes.forEach(node => {
      if (node.type) types.add(node.type);
    });

    const current = this.view.activeType;
    graphosTypeFilterEl.innerHTML = '';

    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All';
    graphosTypeFilterEl.appendChild(all);

    [...types].sort().forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      graphosTypeFilterEl.appendChild(option);
    });

    graphosTypeFilterEl.value = current || '';
  }

  _refreshUi() {
    if (graphosToggleNodesEl) {
      graphosToggleNodesEl.style.opacity = this.view.showNodes ? '1' : '0.38';
      graphosToggleNodesEl.setAttribute('aria-pressed', this.view.showNodes ? 'true' : 'false');
    }
    if (graphosToggleLinksEl) {
      graphosToggleLinksEl.style.opacity = this.view.showLinks ? '1' : '0.38';
      graphosToggleLinksEl.setAttribute('aria-pressed', this.view.showLinks ? 'true' : 'false');
    }
    if (graphosSelectionInfoEl) {
      const selectedCount = this.selectedNodes.size;
      if (selectedCount === 1) {
        const node = [...this.selectedNodes][0];
        graphosSelectionInfoEl.textContent = `${node.name || 'Node'} · 1 selected`;
      } else if (selectedCount > 1) {
        graphosSelectionInfoEl.textContent = `${selectedCount} selected`;
      } else if (this.selectedLink) {
        const label = `${this.selectedLink.a?.name || 'Node'} ↔ ${this.selectedLink.b?.name || 'Node'}`;
        graphosSelectionInfoEl.textContent = label;
      } else {
        graphosSelectionInfoEl.textContent = `${this.nodes.length} nodes · ${this.links.length} links`;
      }
    }

    if (graphosTypeFilterEl) {
      graphosTypeFilterEl.value = this.view.activeType || '';
    }
  }

  _setSelection(nodes = [], link = null) {
    this.selectedNodes.forEach(node => { node.selected = false; });
    this.selectedNodes.clear();
    nodes.filter(Boolean).forEach(node => {
      this.selectedNodes.add(node);
      node.selected = true;
    });
    this.selectedLink = link;
    this._refreshUi();
  }

  _toggleNodeSelection(node) {
    if (!node) return;
    if (this.selectedNodes.has(node)) {
      this.selectedNodes.delete(node);
      node.selected = false;
    } else {
      this.selectedNodes.add(node);
      node.selected = true;
    }
    this.selectedLink = null;
    this._refreshUi();
  }

  _selectSingle(node) {
    if (!node) {
      this._setSelection([]);
      return;
    }
    this._setSelection([node]);
  }

  _setLinkSelection(link) {
    this._setSelection([], link || null);
  }

  _removeLinksForNode(node) {
    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];
      if (link.a === node || link.b === node) {
        if (this.selectedLink === link) {
          this.selectedLink = null;
        }
        this.links.splice(i, 1);
      }
    }
  }

  _deleteNodes(nodesToDelete) {
    const targets = Array.from(nodesToDelete || []).filter(Boolean);
    if (!targets.length) return;

    targets.forEach(node => {
      this._removeLinksForNode(node);
      if (node.parent) {
        node.parent.removeChild(node);
      }
      node.children.slice().forEach(child => node.removeChild(child));
      node.selected = false;
      this.selectedNodes.delete(node);
      const index = this.nodes.indexOf(node);
      if (index !== -1) {
        this.nodes.splice(index, 1);
      }
    });

    this._syncCoreNode();
    this._refreshTypeFilter();
    this.saveGraph();
    this._refreshUi();
  }

  _deleteLink(link) {
    if (!link) return;
    const index = this.links.indexOf(link);
    if (index === -1) return;
    this.links.splice(index, 1);
    if (this.selectedLink === link) {
      this.selectedLink = null;
    }
    this.saveGraph();
    this._refreshUi();
  }

  _getCanvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.w / rect.width : 1;
    const scaleY = rect.height ? this.h / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  _getSurfacePreviewPose() {
    if (!this.surfacePreview) return null;
    const driftX = Math.sin(this.t * 0.18 + this.surfacePreview.phase) * 4;
    const driftY = Math.cos(this.t * 0.14 + this.surfacePreview.phase) * 2.5;
    return {
      x: this.surfacePreview.x + driftX,
      y: this.surfacePreview.y + driftY,
      w: this.surfacePreview.w,
      h: this.surfacePreview.h,
      driftX,
      driftY,
    };
  }

  _isPointInSurfacePreview(x, y) {
    const pose = this._getSurfacePreviewPose();
    if (!pose) return false;
    const paddingX = pose.w * 0.5;
    const paddingY = pose.h * 0.5;
    return Math.abs(x - pose.x) <= paddingX && Math.abs(y - pose.y) <= paddingY;
  }

  _beginSurfacePreviewDrag(x, y, e, pose) {
    if (!pose) return false;
    this.draggedSurfacePreview = true;
    this.surfaceDragPointerId = e.pointerId;
    this.surfaceDragOffsetX = x - pose.x;
    this.surfaceDragOffsetY = y - pose.y;
    this.canvas.setPointerCapture?.(e.pointerId);
    return true;
  }

  _updateSurfacePreviewDrag(e) {
    if (!this.draggedSurfacePreview || (e.pointerId != null && e.pointerId !== this.surfaceDragPointerId)) return;
    const { x, y } = this._getCanvasPoint(e);
    if (!this.surfacePreview) return;
    const halfW = this.surfacePreview.w * 0.5;
    const halfH = this.surfacePreview.h * 0.5;
    this.surfacePreview.x = clamp(x - this.surfaceDragOffsetX, halfW + 24, this.w - halfW - 24);
    this.surfacePreview.y = clamp(y - this.surfaceDragOffsetY, halfH + 24, this.h - halfH - 24);
  }

  _endSurfacePreviewDrag(e) {
    if (!this.draggedSurfacePreview) return false;
    if (e && 'pointerId' in e && e.pointerId !== this.surfaceDragPointerId) return false;
    this.draggedSurfacePreview = false;
    this.surfaceDragPointerId = null;
    this.surfaceDragOffsetX = 0;
    this.surfaceDragOffsetY = 0;
    this.saveGraph();
    return true;
  }

  dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  _getNodeHitRadius(node) {
    if (!node) return 0;
    if (node.showCore) {
      return node.r * GRAPHOS_LIVE.CORE_RATIO * GRAPHOS_TOUCH_HIT_SCALE;
    }
    const display = node.displayRadius || node.r;
    return Math.max(display, node.r * 0.6) * GRAPHOS_TOUCH_HIT_SCALE;
  }

  _getNodeCoreAt(x, y, exclude = null) {
    const ordered = [...this.nodes].reverse();
    return ordered.find(node => {
      if (node === exclude) return false;
      const hitRadius = this._getNodeHitRadius(node);
      return this.dist(node.x, node.y, x, y) < hitRadius;
    }) || null;
  }

  _getNodeAt(x, y, exclude = null) {
    return this._getNodeCoreAt(x, y, exclude) || this._getContainingNodeAt(x, y, exclude);
  }

  _getContainingNodeAt(x, y, exclude = null) {
    const ordered = [...this.nodes].sort((a, b) => a.r - b.r);
    return ordered.find(node => {
      if (node === exclude) return false;
      let current = node;
      while (current) {
        if (current === exclude) return false;
        current = current.parent;
      }
      return this.dist(node.x, node.y, x, y) < node.r;
    }) || null;
  }

  _pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      return this.dist(px, py, x1, y1);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + dx * t;
    const projY = y1 + dy * t;
    return this.dist(px, py, projX, projY);
  }

  _getLinkAt(x, y) {
    const hitRadius = GRAPHOS_LIVE.LINK_HIT_RADIUS * GRAPHOS_TOUCH_HIT_SCALE;
    return this.links.find(link => {
      if (!link || !link.a || !link.b) return false;
      if (!this.nodes.includes(link.a) || !this.nodes.includes(link.b)) return false;

      const minX = Math.min(link.a.x, link.b.x) - hitRadius;
      const maxX = Math.max(link.a.x, link.b.x) + hitRadius;
      if (x < minX || x > maxX) return false;

      const minY = Math.min(link.a.y, link.b.y) - hitRadius;
      const maxY = Math.max(link.a.y, link.b.y) + hitRadius;
      if (y < minY || y > maxY) return false;

      const distance = this._pointToSegmentDistance(x, y, link.a.x, link.a.y, link.b.x, link.b.y);
      return distance <= hitRadius;
    }) || null;
  }

  _getLinkEndpoint(node, other) {
    if (!node) return { x: 0, y: 0 };
    if (!other || node.showCore) {
      return { x: node.x, y: node.y };
    }
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    const distance = Math.hypot(dx, dy) || 0.0001;
    const radius = node.displayRadius || node.r || 0;
    const offset = Math.max(radius, 0);
    return {
      x: node.x + (dx / distance) * offset,
      y: node.y + (dy / distance) * offset,
    };
  }

  _clearHoverState() {
    this.hoveredNode = null;
    this.hoveredLink = null;
    this.nodes.forEach(node => { node.hover = false; node.isContainedPreview = false; });
  }

  _updateHover(x, y) {
    this._clearHoverState();
    this.hoveredNode = this._getNodeCoreAt(x, y) || this._getContainingNodeAt(x, y);
    if (this.hoveredNode) {
      this.hoveredNode.hover = true;
    } else {
      this.hoveredLink = this._getLinkAt(x, y);
    }
  }

  _detachIfOutsideParent(node) {
    if (!node || !node.parent) return;
    if (!this._isInsideMembrane(node, node.parent)) {
      node.parent.removeChild(node);
      this.saveGraph();
      this._syncCoreNode();
    }
  }

  _isInsideMembrane(node, parent) {
    const margin = 4;
    const maxDistance = Math.max(0, parent.r - 6);
    return this.dist(node.x, node.y, parent.x, parent.y) <= maxDistance;
  }

  _updateContainmentPreview(dragged = null) {
    this.nodes.forEach(node => { node.isContainedPreview = false; });
    if (!dragged) return;
    const target = this._getContainingNodeAt(dragged.x, dragged.y, dragged);
    if (target) target.isContainedPreview = true;
  }

  _beginContextMenu(node, link, x, y, e, extraItems = []) {
    this.contextTarget = node || null;
    if (node) {
      const deleteSelection = this.selectedNodes.size > 1 && this.selectedNodes.has(node);
      const items = [...extraItems];

      items.push(
        {
          label: node.type ? `Type: ${node.type}` : 'Set type',
          action: () => {
            const newType = prompt('Set node type:', node.type || '');
            node.type = newType || null;
            this.saveGraph();
            this._refreshTypeFilter();
            this._refreshUi();
          },
        },
        {
          label: node.showCore ? 'Hide core' : 'Show core',
          action: () => {
            node.showCore = !node.showCore;
            this.saveGraph();
            this._refreshUi();
          },
        },
        {
          label: 'Rename node',
          action: () => {
            const newName = prompt('Rename node:', node.name);
            if (newName) {
              node.name = newName;
              this.saveGraph();
              this._refreshUi();
            }
          },
        },
        {
          label: deleteSelection ? 'Delete selected nodes' : 'Delete node',
          action: () => {
            if (deleteSelection) {
              this._deleteNodes(Array.from(this.selectedNodes));
            } else {
              this._deleteNodes([node]);
            }
          },
        },
      );

      this._showMenu(e.clientX, e.clientY, items);
      return;
    }

    if (link) {
      this._showMenu(e.clientX, e.clientY, [
        {
          label: `Delete link (${link.a?.name || 'Node'} ↔ ${link.b?.name || 'Node'})`,
          action: () => this._deleteLink(link),
        },
      ]);
      return;
    }

    const items = [];
    if (this.selectedNodes.size > 0) {
      items.push({
        label: this.selectedNodes.size > 1 ? 'Delete selected nodes' : 'Delete selected node',
        action: () => this._deleteNodes(Array.from(this.selectedNodes)),
      });
    }

    items.push({
      label: 'Create node',
      action: () => {
        const created = this.createNode(x, y, {
          name: 'Node',
          type: null,
          color: randChoice(GRAPHOS_LIVE_COLORS),
          baseR: 12,
          r: 12,
        });
        this._selectSingle(created);
        this._refreshTypeFilter();
        this.saveGraph();
      },
    });

    this._showMenu(e.clientX, e.clientY, items);
  }

  _showMenu(x, y, items) {
    if (!graphosContextMenuEl) return;

    graphosContextMenuEl.innerHTML = '';

    if (this.contextTarget) {
      const header = document.createElement('div');
      header.className = 'graphos-context-menu__header';

      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'graphos-context-menu__swatch';
      swatch.style.background = this.contextTarget.color;
      swatch.title = 'Change node color';
      swatch.addEventListener('pointerdown', e => {
        e.stopPropagation();
        this._openColorPicker(e.clientX, e.clientY);
      });

      const coreToggle = document.createElement('button');
      coreToggle.type = 'button';
      coreToggle.className = 'graphos-context-menu__toggle';
      coreToggle.textContent = this.contextTarget.showCore ? 'Hide core' : 'Show core';
      coreToggle.addEventListener('click', e => {
        e.stopPropagation();
        this.contextTarget.showCore = !this.contextTarget.showCore;
        this.saveGraph();
        this._refreshUi();
        this._hideMenu();
      });

      const nameBlock = document.createElement('div');
      nameBlock.className = 'graphos-context-menu__name';
      nameBlock.textContent = this.contextTarget.name;
      nameBlock.title = 'Rename node';
      nameBlock.addEventListener('click', e => {
        e.stopPropagation();
        const newName = prompt('Rename node:', this.contextTarget.name);
        if (newName) {
          this.contextTarget.name = newName;
          this.saveGraph();
          this._refreshUi();
          this._hideMenu();
        }
      });

      header.appendChild(swatch);
      header.appendChild(coreToggle);
      header.appendChild(nameBlock);
      graphosContextMenuEl.appendChild(header);
    }

    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'graphos-context-menu__item';
      button.textContent = item.label;
      button.addEventListener('click', () => {
        item.action();
        this._hideMenu();
      });
      graphosContextMenuEl.appendChild(button);
    });

    graphosContextMenuEl.hidden = false;
    graphosContextMenuEl.style.left = `${x}px`;
    graphosContextMenuEl.style.top = `${y}px`;

    requestAnimationFrame(() => {
      const rect = graphosContextMenuEl.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        graphosContextMenuEl.style.left = `${Math.max(8, window.innerWidth - rect.width - 8)}px`;
      }
      if (rect.bottom > window.innerHeight) {
        graphosContextMenuEl.style.top = `${Math.max(8, window.innerHeight - rect.height - 8)}px`;
      }
    });
  }

  _hideMenu() {
    if (!graphosContextMenuEl) return;
    graphosContextMenuEl.hidden = true;
  }

  _openColorPicker(x, y) {
    if (!graphosColorPickerEl || !graphosColorWheelEl) return;
    this.pickingColor = true;
    graphosColorPickerEl.hidden = false;
    graphosColorPickerEl.style.left = `${x - 70}px`;
    graphosColorPickerEl.style.top = `${y - 70}px`;
  }

  _endColorPick() {
    if (!this.pickingColor) return;
    this.pickingColor = false;
    if (graphosColorPickerEl) {
      graphosColorPickerEl.hidden = true;
    }
    if (this.contextTarget) {
      this.saveGraph();
    }
  }

  _onColorWheelMove(e) {
    if (!this.pickingColor || !this.contextTarget || !graphosColorWheelEl) return;

    const rect = graphosColorWheelEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;

    const wheelCtx = graphosColorWheelEl.getContext('2d');
    const data = wheelCtx.getImageData(x, y, 1, 1).data;
    this.contextTarget.color = this._rgbToHex(data[0], data[1], data[2]);
    if (graphosContextMenuEl) {
      const swatch = graphosContextMenuEl.querySelector('.graphos-context-menu__swatch');
      if (swatch) swatch.style.background = this.contextTarget.color;
    }
  }

  _onColorWheelDown(e) {
    if (!this.pickingColor) return;
    this._onColorWheelMove(e);
    e.preventDefault();
  }

  _onBodyMouseDown(e) {
    if (graphosContextMenuEl && !graphosContextMenuEl.contains(e.target)) {
      this._hideMenu();
    }
    if (graphosColorPickerEl && !graphosColorPickerEl.contains(e.target)) {
      this._endColorPick();
    }
  }

  _onGlobalDown(e) {
    if (!graphosContextMenuEl) return;
    if (!graphosContextMenuEl.contains(e.target)) {
      this._hideMenu();
    }
    if (graphosColorPickerEl && !graphosColorPickerEl.contains(e.target)) {
      this._endColorPick();
    }
  }

  _openQuickActions() {
    const anchor = graphosOpenMenuEl || graphosWindowHandleEl || this.canvas;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const fakeEvent = {
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.bottom + 12,
    };
    const selectedNode = this.selectedNodes.size ? [...this.selectedNodes][0] : null;
    const link = selectedNode ? null : this.selectedLink;
    this._beginContextMenu(selectedNode, link, fakeEvent.clientX, fakeEvent.clientY, fakeEvent);
  }

  _onContextMenu(e) {
    if (!this._isActive()) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }

    const { x, y } = this._getCanvasPoint(e);
    const node = this._getNodeAt(x, y);
    const link = node ? null : this._getLinkAt(x, y);
    this.selectedLink = node ? null : link;
    this.contextTarget = node || null;

    if (node) {
      const extraItems = [];
      if (this.selectedNodes.size >= 2) {
        extraItems.push({
          label: 'Link selected nodes',
          action: () => {
            const arr = Array.from(this.selectedNodes);
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                const a = arr[i];
                const b = arr[j];
                const exists = this.links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
                if (!exists) {
                  this.links.push({ a, b });
                }
              }
            }
            this.saveGraph();
            this._refreshUi();
          },
        });
      }

      this._beginContextMenu(node, null, e.clientX, e.clientY, e, extraItems);
      return;
    }

    if (link) {
      this._beginContextMenu(null, link, e.clientX, e.clientY, e);
      return;
    }

    const items = [];
    if (this.selectedNodes.size > 0) {
      items.push({
        label: this.selectedNodes.size > 1 ? 'Delete selected nodes' : 'Delete selected node',
        action: () => this._deleteNodes(Array.from(this.selectedNodes)),
      });
    }
    items.push({
      label: 'Create node',
      action: () => {
        const created = this.createNode(x, y, {
          name: 'Node',
          type: null,
          color: randChoice(GRAPHOS_LIVE_COLORS),
          baseR: 12,
          r: 12,
        });
        this._selectSingle(created);
        this._refreshTypeFilter();
        this.saveGraph();
      },
    });
    this._showMenu(e.clientX, e.clientY, items);
  }

  _onPointerDown(e) {
    if (!this._isActive() || e.button === 2) return;
    const { x, y } = this._getCanvasPoint(e);
    const clickedNode = this._getNodeAt(x, y);
    let clicked = clickedNode;

    if (e.altKey && clickedNode) {
      const duplicate = this.cloneNodeForDuplicate(clickedNode);
      if (duplicate) {
        clicked = duplicate;
        this._refreshTypeFilter();
        this.saveGraph();
      }
    }

    const clickedLink = clicked ? null : this._getLinkAt(x, y);
    if (clickedLink) {
      this._setLinkSelection(clickedLink);
      return;
    }

    if (!clicked && this._isPointInSurfacePreview(x, y)) {
      this._selectSingle(null);
      this._hideMenu();
      if (this._beginSurfacePreviewDrag(x, y, e, this._getSurfacePreviewPose())) {
        return;
      }
    }

    if (e.shiftKey && clicked) {
      this._toggleNodeSelection(clicked);
      return;
    }

    if (clicked) {
      this._selectSingle(clicked);
      this.draggedNode = clicked;
      this.dragPointerId = e.pointerId;
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;
      this.canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    this._setSelection([]);
    this._hideMenu();
  }

  _onPointerMove(e) {
    if (!this._isActive()) return;
    const { x, y } = this._getCanvasPoint(e);

    this.surfacePreviewHover = this._isPointInSurfacePreview(x, y);

    if (this.draggedSurfacePreview) {
      if (e.pointerId != null && e.pointerId !== this.surfaceDragPointerId) return;
      this._updateSurfacePreviewDrag(e);
      this._updateHover(x, y);
      return;
    }

    if (this.draggedNode) {
      if (e.pointerId != null && e.pointerId !== this.dragPointerId) return;
      this.draggedNode.vx += (x - this.draggedNode.x) * 0.2;
      this.draggedNode.vy += (y - this.draggedNode.y) * 0.2;
      this._detachIfOutsideParent(this.draggedNode);
      this._updateContainmentPreview(this.draggedNode);
      this._updateHover(x, y);
      return;
    }

    this._updateHover(x, y);
  }

  _onPointerUp(e) {
    if (this.draggedSurfacePreview) {
      if (e.pointerId != null && e.pointerId !== this.surfaceDragPointerId) return;
      this._endSurfacePreviewDrag(e);
      this.surfacePreviewHover = false;
      this._refreshUi();
      return;
    }

    if (!this.draggedNode) {
      if (this.pickingColor) {
        this._endColorPick();
      }
      return;
    }

    if (e.pointerId != null && e.pointerId !== this.dragPointerId) return;

    const { x, y } = this._getCanvasPoint(e);
    const target = this._getContainingNodeAt(x, y, this.draggedNode);
    if (target && target !== this.draggedNode) {
      let current = target;
      let isCycle = false;
      while (current) {
        if (current === this.draggedNode) {
          isCycle = true;
          break;
        }
        current = current.parent;
      }

      if (!isCycle) {
        target.addChild(this.draggedNode);
      }
    }

    this.saveGraph();
    this.nodes.forEach(node => { node.isContainedPreview = false; });
    this.draggedNode.vx *= 0.2;
    this.draggedNode.vy *= 0.2;
    this.draggedNode = null;
    this.dragPointerId = null;
    this._syncCoreNode();
    this._refreshUi();
  }

  _onPointerCancel(e) {
    if (this.draggedSurfacePreview && e.pointerId != null && e.pointerId !== this.surfaceDragPointerId) return;
    if (this.draggedSurfacePreview) {
      this.draggedSurfacePreview = false;
      this.surfaceDragPointerId = null;
      this.surfaceDragOffsetX = 0;
      this.surfaceDragOffsetY = 0;
      this.surfacePreviewHover = false;
    }
    if (this.draggedNode && e.pointerId != null && e.pointerId !== this.dragPointerId) return;
    this.draggedNode = null;
    this.dragPointerId = null;
    this.nodes.forEach(node => { node.isContainedPreview = false; });
    this._hideMenu();
    this._endColorPick();
  }

  _onKeyDown(e) {
    if (!this._isActive()) return;

    if (this.selectedNodes.size > 0 && (e.key === 'Delete' || (!e.metaKey && !e.ctrlKey && e.key === 'Backspace'))) {
      e.preventDefault();
      this._deleteNodes(Array.from(this.selectedNodes));
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Backspace') {
      e.preventDefault();
      this.clearGraphStorage();
      this.nodes.length = 0;
      this.links.length = 0;
      this._seedGraph();
      this._syncCoreNode();
      this._refreshTypeFilter();
      this._refreshUi();
    }
  }

  clearGraphStorage() {
    try {
      localStorage.removeItem(GRAPHOS_LIVE.STORAGE_KEY);
    } catch (error) {
      console.warn('GraphOS live storage clear failed:', error);
    }
  }

  _getFocusLayer() {
    if (hoveredGraphosLayer) return hoveredGraphosLayer;
    if (selectedGraphosLayer) return selectedGraphosLayer;
    if (this.surfacePreviewHover || this.draggedSurfacePreview) return 'surface';
    if (this.hoveredLink) return 'edge';
    if (this.hoveredNode) return 'node';

    const ny = this.h ? mouseY / this.h : 0.5;
    const nx = this.w ? mouseX / this.w : 0.5;
    if (ny < 0.30) return 'surface';
    if (ny > 0.72) return 'context';
    if (nx < 0.38) return 'group';
    if (nx > 0.66) return 'edge';
    return 'node';
  }

  _drawBackground(focusLayer) {
    const { ctx } = this;
    const bg = ctx.createRadialGradient(
      this.w * 0.52,
      this.h * 0.44,
      0,
      this.w * 0.5,
      this.h * 0.48,
      Math.max(this.w, this.h) * 0.92,
    );
    bg.addColorStop(0, 'rgba(10,10,14,1)');
    bg.addColorStop(0.72, 'rgba(6,6,8,1)');
    bg.addColorStop(1, 'rgba(2,2,3,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    const gridAlpha = focusLayer === 'context' ? 0.045 : focusLayer === 'surface' ? 0.032 : 0.024;
    ctx.strokeStyle = `rgba(255,255,255,${gridAlpha})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const y = this.h * 0.18 + i * (this.h * 0.12);
      ctx.beginPath();
      ctx.moveTo(this.w * 0.06, y);
      ctx.lineTo(this.w * 0.94, y);
      ctx.stroke();
    }

    for (let i = -3; i <= 3; i++) {
      const x = this.w * 0.5 + i * (this.w * 0.11);
      ctx.beginPath();
      ctx.moveTo(x, this.h * 0.12);
      ctx.lineTo(x + this.w * 0.03, this.h * 0.84);
      ctx.stroke();
    }
  }

  _drawSurfacePreview(focusLayer) {
    const { ctx } = this;
    const pose = this._getSurfacePreviewPose();
    if (!pose) return;

    const focused = focusLayer === 'surface';
    const hovered = this.surfacePreviewHover;
    const dragging = this.draggedSurfacePreview;
    const x = pose.x;
    const y = pose.y;
    const w = pose.w;
    const h = pose.h;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.sin(this.t * 0.08 + this.surfacePreview.phase) + (mouseX / Math.max(this.w, 1) - 0.5)) * (focused ? 0.009 : 0.006));
    if (dragging) {
      ctx.scale(1.015, 1.015);
    } else if (hovered) {
      ctx.scale(1.008, 1.008);
    }

    const fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fill.addColorStop(0, dragging ? 'rgba(255,255,255,0.20)' : focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)');
    fill.addColorStop(0.35, dragging ? 'rgba(255,255,255,0.10)' : focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)');
    fill.addColorStop(1, dragging ? 'rgba(255,255,255,0.06)' : focused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fill;
    roundRect(ctx, -w / 2, -h / 2, w, h, 24);
    ctx.fill();
    ctx.strokeStyle = dragging ? 'rgba(124,160,255,0.30)' : focused ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = dragging ? 'rgba(124,160,255,0.15)' : focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, 26, 20);
    ctx.fill();

    ['#fff', '#fff', '#fff'].forEach((_, i) => {
      ctx.beginPath();
      ctx.arc(-w / 2 + 16 + i * 10, -h / 2 + 13, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.45 - i * 0.08 + (focused || hovered ? 0.06 : 0) + (dragging ? 0.03 : 0)})`;
      ctx.fill();
    });

    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dragging ? 'rgba(255,255,255,0.78)' : focused || hovered ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.56)';
    ctx.fillText('public surface', -w / 2 + 58, -h / 2 + 13.4);
    ctx.fillStyle = dragging ? 'rgba(124,160,255,0.22)' : focused || hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
    roundRect(ctx, -w / 2 + 42, -h / 2 + 8, w - 58, 12, 6);
    ctx.fill();

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

    ctx.fillStyle = dragging ? 'rgba(124,160,255,0.16)' : focused || hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)';
    roundRect(ctx, padX + 10, padY + 10, innerW * 0.58, 20, 10);
    ctx.fill();
    ctx.fillStyle = dragging ? 'rgba(124,160,255,0.10)' : focused || hovered ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, padX + 10, padY + 38, innerW * 0.82, 9, 4.5);
    ctx.fill();
    roundRect(ctx, padX + 10, padY + 54, innerW * 0.52, 9, 4.5);
    ctx.fill();

    const cardY = padY + innerH - 50;
    for (let i = 0; i < 3; i++) {
      const cw = innerW * (0.28 - i * 0.02);
      const cx = padX + 10 + i * (cw + 10);
      const cy = cardY + Math.sin(this.t * 0.7 + this.surfacePreview.phase + i) * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02 + (focused || hovered ? 0.03 : 0) + (dragging ? 0.02 : 0)})`;
      roundRect(ctx, cx, cy, cw, 26, 11);
      ctx.fill();
      ctx.fillStyle = dragging ? 'rgba(124,160,255,0.28)' : focused || hovered ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.20)';
      roundRect(ctx, cx + 8, cy + 7, cw * 0.6, 4, 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  _drawContextRibbon(focusLayer) {
    const { ctx } = this;
    const focused = focusLayer === 'context';
    const y = this.contextRibbon.y;
    const h = 52;

    ctx.save();
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.032)';
    roundRect(ctx, this.w * 0.1, y - h / 2, this.w * 0.8, h, 22);
    ctx.fill();
    ctx.strokeStyle = focused ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.10)';
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    const entries = [
      'registry',
      'ownership',
      'policy',
      'semantics',
      'intents',
      'projection',
      'routing',
      'memory',
    ];
    const span = this.w * 0.16;
    const shift = (this.t * (focused ? 22 : 16) + this.contextRibbon.phase * 80) % span;
    for (let i = -1; i < entries.length + 2; i++) {
      const text = entries[(i + entries.length) % entries.length];
      const x = this.w * 0.14 + i * span - shift;
      const alpha = 0.32 + (i % 2) * 0.08 + (focused ? 0.12 : 0);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillText(text, x, y);
    }
    ctx.restore();

    ctx.restore();
  }

  _drawIntentFlux(focusLayer) {
    if (!this.coreNode) return;
    const { ctx } = this;
    const focused = focusLayer === 'context' || focusLayer === 'surface';
    const core = this.coreNode;
    const coreTarget = { x: core.x, y: core.y };
    const surfacePose = this._getSurfacePreviewPose();
    const surfaceAnchor = {
      x: surfacePose ? surfacePose.x - surfacePose.w * 0.18 : this.w * 0.78,
      y: surfacePose ? surfacePose.y + surfacePose.h * 0.22 : this.h * 0.27,
    };
    const contextAnchor = {
      x: this.w * 0.16,
      y: this.contextRibbon.y - 18,
    };

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.intentLanes.forEach((lane, index) => {
      const source = lane.kind === 'surface' ? surfaceAnchor : contextAnchor;
      const phase = (this.t * (0.18 + index * 0.03) + lane.phase) % 1;
      const x = lerp(source.x, coreTarget.x, phase) + Math.sin(phase * Math.PI) * (lane.kind === 'surface' ? 38 : 18);
      const y = lerp(source.y, coreTarget.y, phase) + Math.cos(phase * Math.PI) * (lane.kind === 'surface' ? -18 : 10);
      const alpha = focused ? 0.28 : 0.18;
      ctx.fillStyle = lane.kind === 'surface' ? `rgba(124,160,255,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, lane.kind === 'surface' ? 2.3 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  _drawLinks(focusLayer) {
    if (!this.view.showLinks) return;
    const { ctx } = this;
    const threshold = Math.min(this.w, this.h) * 0.24;
    const edgeFocusBoost = focusLayer === 'edge' ? 1.35 : focusLayer === 'group' ? 1.12 : 1;
    const showFilter = this.view.activeType;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        if (showFilter && a.type !== showFilter && b.type !== showFilter) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          const alpha = (1 - dist / threshold) * 0.16 * edgeFocusBoost;
          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, 'rgba(255,255,255,0)');
          gradient.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = focusLayer === 'edge' ? 1.05 : 0.72;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  _drawNodes(focusLayer) {
    if (!this.view.showNodes) return;
    const filtered = this.nodes.filter(node => !this.view.activeType || node.type === this.view.activeType);
    const sortedNodes = [...filtered].sort((a, b) => (a.depth || 0) - (b.depth || 0));
    sortedNodes.forEach(node => {
      node.draw(this.ctx, focusLayer);
      if (this.selectedNodes.has(node)) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, (node.displayRadius || node.r) + 2, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, (node.displayRadius || node.r) * 0.42, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
      }
    });
  }

  _draw() {
    const focusLayer = this._getFocusLayer();
    this.ctx.clearRect(0, 0, this.w, this.h);
    this._drawBackground(focusLayer);
    this._drawSurfacePreview(focusLayer);
    this._drawContextRibbon(focusLayer);
    this._drawIntentFlux(focusLayer);
    this._drawLinks(focusLayer);
    this._drawNodes(focusLayer);
  }

  _tick() {
    this._syncCoreNode();
    this.nodes.forEach(node => node.update(this));
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.007;
    this._tick();
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
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
    this.draggedNode = null;
    this.dragPointerId = null;
    this.draggedSurfacePreview = false;
    this.surfaceDragPointerId = null;
    this.surfaceDragOffsetX = 0;
    this.surfaceDragOffsetY = 0;
    this.surfacePreviewHover = false;
    this._hideMenu();
    this._endColorPick();
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this.nodes.forEach(node => {
      node.x = clamp(node.x, node.r, this.w - node.r);
      node.y = clamp(node.y, node.r, this.h - node.r);
    });
    this._refreshUi();
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
  graphos:     [GraphOSLiveScene, null],

  // Unification — gentle convergence
  unification: [ConvergenceScene, { cycleDur: 4.5, particles: 30, spread: 260, sharp: false }],

  // Modules — core + capsules docking
  modules:     [ModulesScene,     null],

  // Vestiges — archival field with nodes and artifacts
  vestiges:    [VestigeScene,     null],

  // Infrastructure — surface, context, intents, and canonical core
  infrastructure: [InfrastructureScene, null],

  // Build — construction system with surface, context, nodes, modules, and assets
  build:       [BuildScene,       null],

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
  if (shouldLockKeyboardNav(e.target)) return;
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['ArrowDown', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault(); goTo(currentIndex + 1);
  }
  if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault(); goTo(currentIndex - 1);
  }
});

let wheelAcc = 0, wheelTimer;
document.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey) {
    wheelAcc = 0;
    clearTimeout(wheelTimer);
    return;
  }
  const graphosBody = getGraphosScrollBody(e.target);
  if (graphosBody && canElementScroll(graphosBody, e.deltaY)) {
    wheelAcc = 0;
    clearTimeout(wheelTimer);
    return;
  }
  if (shouldLockWheelNav(e.target) && !graphosBody) {
    wheelAcc = 0;
    clearTimeout(wheelTimer);
    return;
  }
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
let touchNavLocked = false;
document.addEventListener('touchstart', e => {
  touchNavLocked = shouldLockTouchNav(e.target);
  if (e.touches && e.touches[0]) {
    touchY0 = e.touches[0].clientY;
  }
}, { passive: true });
document.addEventListener('touchend', e => {
  if (touchNavLocked) {
    touchNavLocked = false;
    return;
  }
  if (!e.changedTouches || !e.changedTouches[0]) return;
  const diff = touchY0 - e.changedTouches[0].clientY;
  if (Math.abs(diff) > 45) goTo(currentIndex + (diff > 0 ? 1 : -1));
}, { passive: true });
document.addEventListener('touchcancel', () => {
  touchNavLocked = false;
}, { passive: true });

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    Object.values(scenes).forEach(s => s.resize && s.resize());
    if (mistBg) mistBg.resize();
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
  if (scenes.graphos) {
    scenes.graphos.draggedSurfacePreview = false;
    scenes.graphos.surfaceDragPointerId = null;
    scenes.graphos.surfaceDragOffsetX = 0;
    scenes.graphos.surfaceDragOffsetY = 0;
    scenes.graphos.surfacePreviewHover = false;
  }
  if (mistBg) mistBg.dispose();
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
