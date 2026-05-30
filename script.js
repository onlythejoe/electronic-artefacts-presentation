// ===== CONFIG =====
const ANIM_DUR   = 850;   // ms — matches CSS --slide-dur
const PARALLAX_S = 12;    // max parallax offset in px
const PARALLAX_L = 0.055; // parallax lerp speed
const LIGHT_THEME_SLIDES = new Set(['vestiges', 'phases', 'continuum', 'positioning', 'advantage', 'currentstate', 'partnerships', 'businessmodel', 'howtouse', 'composition', 'next', 'open', 'closing', 'contact']);

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
let draggedGraphosColumnHandleEl = null;
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
let navActivityTimer = null;
let graphosMobileGesture = null;
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
let lastHoverProbeAt = 0;
let lastTextMotionX = NaN;
let lastTextMotionY = NaN;
let lastTextMotionHover = null;
let appAlive = true;
let mistBg = null;
const TEXT_MOTION_CACHE = new WeakMap();

function updateViewportMetrics() {
  const vv = window.visualViewport;
  const height = Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  const width = Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 0);
  document.documentElement.style.setProperty('--app-height', `${height}px`);
  document.documentElement.style.setProperty('--app-width', `${width}px`);
}

updateViewportMetrics();

const graphosWindowState = {
  x: null,
  y: null,
  width: null,
  height: null,
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
  startCenterX: 0,
  startCenterY: 0,
  startWidth: 0,
  startHeight: 0,
  mode: null,
  resizeEdge: null,
  resizing: false,
  dragging: false,
  pointerId: null,
};
const graphosColumnResizeState = {
  active: false,
  kind: null,
  pointerId: null,
  startX: 0,
  startNavWidth: 0,
  startTabsWidth: 0,
  explorerWidth: 0,
  inspectorWidth: 0,
};
const INTRO_TYPEWRITER_PHRASES = [
  'Most systems are isolated. VASTE is built to execute connected reality.',
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
  '.horizon-stage',
  '.build-grid',
  '.build-path',
  '.build-assets',
  '.graphos-window__header',
  '.graphos-window__chip',
  '.graphos-explorer__splitter',
  '.graphos-row',
  '.graphos-context-menu__item',
  '.graphos-context-menu__toggle',
  '.graphos-context-menu__swatch',
  '.graphos-color-picker canvas',
  '.uc-case',
].join(', ');
const TEXT_HOVER_SELECTOR = 'h2, h3, h4, h5, h6, p, a, .ea-wordmark, .phase-timeline, .continuum-flow, .infra-card, .infra-step, .horizon-stage';
const HAS_FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const REDUCED_MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  '.slide[data-slide="modules"] .slide-content',
  '.slide[data-slide="build"] .slide-content',
  '.slide[data-slide="infrastructure"] .slide-content',
  '.brief-layout',
  '.bridge-layout',
  '.onboarding-layout',
  '.composition-layout',
  '.graphos-window__chip',
  '.graphos-row',
  '#canvas-graphos',
  '.module-card',
  '.modules-feature',
  '.build-step',
  '.build-card',
  '.build-surface',
  '.build-assets',
  '.horizon-stage',
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
  '.slide[data-slide="modules"] .slide-content',
  '.slide[data-slide="build"] .slide-content',
  '.slide[data-slide="infrastructure"] .slide-content',
  '.slide[data-slide="horizon"] .slide-content',
  '.brief-layout',
  '.bridge-layout',
  '.onboarding-layout',
  '.composition-layout',
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
const slideCounterEl = document.getElementById('slide-counter');
const graphosWindowEl = document.querySelector('.graphos-window');
const graphosWindowHandleEl = document.querySelector('.graphos-window__header');
const graphosWindowModeEl = document.getElementById('graphos-window-mode');
const graphosWindowBodyEl = document.querySelector('.graphos-window__body');
const graphosWindowViewportEl = document.getElementById('graphos-window-viewport');
const graphosExplorerEl = document.querySelector('.graphos-explorer');
const graphosExplorerListEl = document.getElementById('graphos-explorer-list');
const graphosExplorerSelectionEl = document.getElementById('graphos-explorer-selection');
const graphosExplorerTabsEl = document.getElementById('graphos-explorer-tabs');
const graphosExplorerDetailEl = document.getElementById('graphos-explorer-detail');
const graphosExplorerPreviewCanvasEl = document.getElementById('graphos-explorer-preview');
const graphosExplorerSearchEl = document.getElementById('graphos-explorer-search');
const graphosFeedEl = graphosExplorerListEl;
const graphosWindowResizeHandles = graphosWindowEl ? [...graphosWindowEl.querySelectorAll('.graphos-window__resize-handle')] : [];
const graphosColumnResizeHandles = graphosExplorerEl ? [...graphosExplorerEl.querySelectorAll('[data-graphos-column-resize]')] : [];
const graphosNoteEl = document.querySelector('.graphos-note');
const bridgeQuestionEls = [...document.querySelectorAll('.bridge-question')];
const bridgeResponseEl = document.querySelector('.bridge-response');
const bridgeResponseTitleEl = bridgeResponseEl ? bridgeResponseEl.querySelector('.bridge-response__title') : null;
const bridgeResponseBodyEl = bridgeResponseEl ? bridgeResponseEl.querySelector('.bridge-response__body') : null;
const bridgeResponseMetaEl = bridgeResponseEl ? bridgeResponseEl.querySelector('.bridge-response__meta') : null;
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

const BRIDGE_ANSWER_MAP = {
  who: {
    title: 'For teams that need a runtime, not another app.',
    body: 'VASTE is built for organizations that already operate as connected systems and need one operational base instead of more disconnected tools.',
    meta: ['Teams', 'Operators', 'Builders'],
  },
  what: {
    title: 'An execution substrate.',
    body: 'It is a graph-native runtime with canonical primitives, modular capacities, and orchestration logic designed to keep connected systems executable.',
    meta: ['Substrate', 'Runtime', 'Primitives'],
  },
  where: {
    title: 'In the browser first, with deployment options behind it.',
    body: 'The primary access point is the browser, with enterprise deployment surfaces and later mobile or local extensions depending on the use case.',
    meta: ['Browser', 'Enterprise', 'Expandable'],
  },
  why: {
    title: 'Because current software is structurally fragmented.',
    body: 'Static architectures, incompatible tools, brittle integrations, and growing orchestration overhead make continuous adaptation too expensive in the current stack.',
    meta: ['Fragmentation', 'Adaptation', 'Orchestration'],
  },
  how: {
    title: 'Through a canonical graph and five primitives.',
    body: 'Vertex, Tie, Surface, Environment, and Actions form the grammar that keeps execution consistent while higher layers remain modular.',
    meta: ['Kernel', 'Five primitives', 'Grammar'],
  },
};

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
  return isElementTarget(target) ? target.closest('.graphos-window__body, .graphos-explorer') : null;
}
function getGraphosScrollableRegion(target) {
  if (!isElementTarget(target)) return null;
  return target.closest(
    '.graphos-explorer__tree, .graphos-explorer__detail, .graphos-explorer__extensions, ' +
    '.graphos-context-menu, .graphos-color-picker'
  );
}
function getScrollableAncestor(target) {
  if (!isElementTarget(target)) return null;
  return target.closest(
    '.graphos-explorer__tree, .graphos-explorer__detail, .graphos-explorer__extensions, ' +
    '.graphos-window__body, .graphos-context-menu, .graphos-color-picker, ' +
    '.slide[data-slide="modules"] .slide-content, ' +
    '.slide[data-slide="build"] .slide-content, ' +
    '.slide[data-slide="infrastructure"] .slide-content, ' +
    '.slide[data-slide="horizon"] .slide-content, ' +
    '.brief-layout, .bridge-layout, .onboarding-layout, .composition-layout'
  );
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
function isInsideGraphosExplorer(target) {
  return isElementTarget(target) && !!target.closest('.graphos-window, .graphos-explorer');
}
function stopGraphosWheel(e) {
  if (!isInsideGraphosExplorer(e.target)) return;
  const region = getGraphosScrollableRegion(e.target);
  if (region) {
    const canScroll = canElementScroll(region, e.deltaY);
    if (canScroll) {
      e.stopPropagation();
      return;
    }
  }
  e.preventDefault();
  e.stopPropagation();
}
function shouldLockKeyboardNav(target) {
  return targetMatchesSelector(target, KEYBOARD_NAV_LOCK_SELECTOR);
}
function shouldLockTouchNav(target) {
  const scrollable = getScrollableAncestor(target);
  if (scrollable) {
    return scrollable.scrollHeight > scrollable.clientHeight + 1;
  }
  return targetMatchesSelector(target, [
    '.graphos-note',
    '.graphos-window',
    '.graphos-context-menu__item',
    '.graphos-context-menu__toggle',
    '.graphos-context-menu__swatch',
    '.graphos-color-picker canvas',
    '#graphos-toggle-nodes',
    '#graphos-toggle-links',
    '#graphos-open-menu',
    '#graphos-type-filter',
  ].join(', '));
}
function shouldLockWheelNav(target) {
  return targetMatchesSelector(target, WHEEL_NAV_LOCK_SELECTOR);
}

function getSlideAccessibleTitle(slide) {
  if (!slide) return 'Slide';
  const heading = slide.querySelector('h1, h2, h3');
  const title = heading ? collapseText(heading.textContent || '') : '';
  return title || slide.dataset.slide || 'Slide';
}

function setupDocumentAccessibility() {
  slideEls.forEach((slide, index) => {
    const label = `${index + 1} / ${total} - ${getSlideAccessibleTitle(slide)}`;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', label);
    slide.setAttribute('tabindex', index === currentIndex ? '0' : '-1');
  });

  document.querySelectorAll('canvas.slide-canvas').forEach(canvas => {
    if (!canvas.hasAttribute('aria-label')) {
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('role', 'presentation');
    }
  });

  if (graphosWindowEl) {
    graphosWindowEl.setAttribute('role', 'region');
    graphosWindowEl.setAttribute('aria-label', 'GraphOS Explorer');
  }

  if (graphosWindowViewportEl) {
    graphosWindowViewportEl.setAttribute('role', 'region');
    graphosWindowViewportEl.setAttribute('aria-label', 'GraphOS Explorer viewport');
  }

  if (graphosExplorerListEl) {
    graphosExplorerListEl.setAttribute('role', 'tree');
    graphosExplorerListEl.setAttribute('aria-label', 'GraphOS nodes');
  }

  if (graphosExplorerSearchEl) {
    graphosExplorerSearchEl.setAttribute('aria-label', 'Filter GraphOS nodes');
  }

  graphosColumnResizeHandles.forEach(handle => {
    const kind = handle.dataset.graphosColumnResize || 'nav';
    const limits = getGraphosColumnResizeLimits(kind);
    handle.setAttribute('aria-valuemin', String(Math.round(limits.min)));
    handle.setAttribute('aria-valuemax', String(Math.round(limits.max)));
  });

  if (graphosNoteEl && graphosWindowEl) {
    if (!graphosWindowEl.id) graphosWindowEl.id = 'graphos-explorer-window';
    graphosNoteEl.setAttribute('aria-controls', graphosWindowEl.id);
  }
}

function renderBridgeAnswer(key) {
  const answer = BRIDGE_ANSWER_MAP[key] || BRIDGE_ANSWER_MAP.who;
  if (bridgeResponseTitleEl) bridgeResponseTitleEl.textContent = answer.title;
  if (bridgeResponseBodyEl) bridgeResponseBodyEl.textContent = answer.body;
  if (bridgeResponseMetaEl) {
    bridgeResponseMetaEl.innerHTML = answer.meta.map(label => `<span>${label}</span>`).join('');
  }
  bridgeQuestionEls.forEach(btn => {
    const active = btn.dataset.bridgeQuestion === key;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function initBridgeQuestions() {
  if (!bridgeQuestionEls.length || !bridgeResponseTitleEl || !bridgeResponseBodyEl || !bridgeResponseMetaEl) return;
  bridgeQuestionEls.forEach(btn => {
    btn.addEventListener('click', () => {
      renderBridgeAnswer(btn.dataset.bridgeQuestion || 'who');
    });
  });
  renderBridgeAnswer('who');
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
      kicker: 'Explorer',
      title: 'Move the explorer window',
      detail: 'Drag the header to reposition the explorer panel.',
      meta: 'Glass panel',
    };
  }

  const graphosChip = el.closest('.graphos-window__chip');
  if (graphosChip) {
    const isSelect = graphosChip.classList.contains('graphos-window__chip--select');
    const selectValue = graphosTypeFilterEl ? collapseText(graphosTypeFilterEl.selectedOptions?.[0]?.textContent || graphosTypeFilterEl.value) : '';
    const chipId = graphosChip.id || '';
    const chipTitleMap = {
      'graphos-toggle-nodes': 'Vertices',
      'graphos-toggle-links': 'Ties',
      'graphos-open-menu': 'Actions',
    };
    const chipDetailMap = {
      'graphos-toggle-nodes': 'Show or hide the vertex field.',
      'graphos-toggle-links': 'Reveal or hide connective ties.',
      'graphos-open-menu': 'Open the touch-safe actions menu.',
    };
    return {
      key: `graphos-chip:${collapseText(graphosChip.textContent)}`,
      kind: isSelect ? 'action' : 'action',
      kicker: 'VASTE',
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
      kicker: 'VASTE layer',
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
      kicker: 'VASTE',
      title: 'Live vertex field',
      detail: 'Drag vertices, edit ties, and use the canvas to explore the surface projection.',
      meta: 'Interactive canvas',
    };
  }

  const infraStep = el.closest('.infra-step');
  if (infraStep) {
    const layer = infraStep.dataset.layer || collapseText(infraStep.textContent).toLowerCase();
    const detailMap = {
      surface: 'Public projections and deployment surfaces.',
      context: 'Runtime state, policy, and governance.',
      intents: 'Native actions and execution flow.',
      modules: 'Included runtime and premium capacities.',
      core: 'Canonical graph: vertices and ties only.',
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
      surface: 'Studio deployment surface and visible projection.',
      programs: 'Deterministic runtime execution and event flow.',
      context: 'Governance, policy, and permissions.',
      nodes: 'Canonical graph and topology.',
      modules: 'Deployment modes and premium capacities.',
      assets: 'Domains, hosting, and published artifacts.',
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

  const horizonStage = el.closest('.horizon-stage');
  if (horizonStage) {
    const stage = horizonStage.dataset.horizonStage || 'today';
    const horizonMap = {
      today: {
        title: 'Enterprise operating systems',
        detail: 'CRM / CMS, AI-assisted workflows, semantic knowledge systems, and composable runtime environments.',
        meta: 'Current substrate',
      },
      next: {
        title: 'Orchestration systems',
        detail: 'Intelligent automation, simulation environments, distributed runtime infrastructures, and robotic coordination.',
        meta: 'Next layer',
      },
      longterm: {
        title: 'Autonomous infrastructure',
        detail: 'Factories, aerospace runtime systems, medical orchestration, transport, fleets, and scientific infrastructures.',
        meta: 'Long horizon',
      },
    };
    const data = horizonMap[stage] || horizonMap.today;
    return {
      key: `horizon-stage:${stage}`,
      kind: 'action',
      kicker: 'Horizon',
      title: data.title,
      detail: data.detail,
      meta: data.meta,
    };
  }

  const graphosContextMenuItem = el.closest('.graphos-context-menu__item');
  if (graphosContextMenuItem) {
    return {
      key: `graphos-menu:${collapseText(graphosContextMenuItem.textContent)}`,
      kind: 'action',
      kicker: 'VASTE',
      title: collapseText(graphosContextMenuItem.textContent),
      detail: 'Apply this action to the selected vertex.',
      meta: 'Environment menu',
    };
  }

  const graphosContextMenuToggle = el.closest('.graphos-context-menu__toggle');
  if (graphosContextMenuToggle) {
    return {
      key: `graphos-toggle:${collapseText(graphosContextMenuToggle.textContent)}`,
      kind: 'action',
      kicker: 'VASTE',
      title: collapseText(graphosContextMenuToggle.textContent),
      detail: 'Switch the canonical state for the active vertex.',
      meta: 'Core toggle',
    };
  }

  const graphosContextMenuSwatch = el.closest('.graphos-context-menu__swatch');
  if (graphosContextMenuSwatch) {
    return {
      key: 'graphos-swatch',
      kind: 'pick',
      kicker: 'VASTE',
      title: 'Vertex color',
      detail: 'Pick a color for the selected vertex.',
      meta: 'Palette',
    };
  }

  const graphosColorWheel = el.closest('.graphos-color-picker canvas');
  if (graphosColorWheel) {
    return {
      key: 'graphos-color-wheel',
      kind: 'pick',
      kicker: 'VASTE',
      title: 'Color wheel',
      detail: 'Drag to assign a new vertex color.',
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

  const ucCase = el.closest('.uc-case');
  if (ucCase) {
    const word = ucCase.dataset.word || collapseText(ucCase.textContent);
    const familyTitle = ucCase.dataset.familyTitle || 'VASTE';
    const familyKey   = ucCase.dataset.familyKey   || 'general';
    const detailMap = {
      operations: `Use VASTE to map ${word} as graph vertices — tracking status, ownership, and exceptions in a single source of truth.`,
      orchestration: `Use VASTE to model ${word} as composable capacities so integrations stay consistent across the graph.`,
      research:   `Use VASTE to connect ${word} data into a living structure where experiments, results, and signals stay linked.`,
      studio: `Use VASTE to publish ${word} as a living surface — a graph projection that readers can explore and interact with.`,
    };
    return {
      key: `uc:${word}`,
      kind: 'usecase',
      kicker: familyTitle,
      title: word,
      detail: detailMap[familyKey] || `Use VASTE to model ${word} as vertices, ties, and surfaces in a single system.`,
      meta: familyTitle,
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

function getTextMotionProfile(node) {
  if (!node) {
    return { scale: 0.7, duration: '0.78s', ease: 'cubic-bezier(0.22, 1, 0.36, 1)' };
  }

  const cached = TEXT_MOTION_CACHE.get(node);
  if (cached) return cached;

  let profile = { scale: 0.7, duration: '0.78s', ease: 'cubic-bezier(0.22, 1, 0.36, 1)' };

  if (node.matches('h1, h2, .intro-title')) {
    profile = { scale: 0.92, duration: '0.56s', ease: 'cubic-bezier(0.22, 1, 0.36, 1)' };
  } else if (node.matches('h3, h4, h5, h6, .bridge-response__title')) {
    profile = { scale: 0.78, duration: '0.68s', ease: 'cubic-bezier(0.2, 0.98, 0.28, 1)' };
  } else if (node.matches('p, a, .sub, .tagline')) {
    profile = { scale: 0.54, duration: '0.92s', ease: 'cubic-bezier(0.16, 1, 0.3, 1)' };
  } else if (node.matches('.phase-timeline, .continuum-flow, .infra-card, .infra-step, .horizon-stage')) {
    profile = { scale: 0.66, duration: '0.8s', ease: 'cubic-bezier(0.18, 1, 0.28, 1)' };
  }

  TEXT_MOTION_CACHE.set(node, profile);
  return profile;
}

function applyTextMotion() {
  if (!HAS_FINE_POINTER || !activeContentEl || activeTextNodes.length === 0) return;
  const roundedX = Math.round(mouseX);
  const roundedY = Math.round(mouseY);
  if (roundedX === lastTextMotionX && roundedY === lastTextMotionY && hoveredTextNode === lastTextMotionHover) return;
  lastTextMotionX = roundedX;
  lastTextMotionY = roundedY;
  lastTextMotionHover = hoveredTextNode;

  const nx = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
  const ny = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;

  activeTextNodes.forEach((node, index) => {
    const motion = getTextMotionProfile(node);
    const depth = 1 + Math.min(index, 3) * 0.06;
    const hoverBoost = hoveredTextNode && (node === hoveredTextNode || node.contains(hoveredTextNode)) ? 1.7 : 1;
    const tx = clamp(nx * 12 * motion.scale * depth * hoverBoost, -10, 10);
    const ty = clamp(ny * 10 * motion.scale * depth * hoverBoost, -8, 8);
    const rot = clamp(nx * motion.scale * depth * 1.1 * hoverBoost, -2.4, 2.4);
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
    ? [...activeContentEl.querySelectorAll('h2, h3, h4, h5, h6, p, a, .phase-timeline, .continuum-flow, .infra-card, .infra-step, .horizon-stage')]
    : [];
  activeTextNodes.forEach(node => {
    const motion = getTextMotionProfile(node);
    node.style.setProperty('--text-dur', motion.duration);
    node.style.setProperty('--text-ease', motion.ease);
  });
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
    const active = i === currentIndex;
    el.classList.remove('is-active', 'is-before', 'is-after');
    if      (active) el.classList.add('is-active');
    else if (i  <  currentIndex) el.classList.add('is-before');
    else                         el.classList.add('is-after');
    el.setAttribute('aria-hidden', active ? 'false' : 'true');
    el.setAttribute('tabindex', active ? '0' : '-1');
    if (active) {
      el.setAttribute('aria-current', 'step');
    } else {
      el.removeAttribute('aria-current');
    }
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
  track.setAttribute('role', 'slider');
  track.setAttribute('aria-label', 'Slide navigation');
  track.setAttribute('aria-orientation', 'vertical');
  track.setAttribute('aria-valuemin', '1');
  track.setAttribute('aria-valuemax', String(total));
  track.tabIndex = 0;
  track.innerHTML = '<div id="nav-indicator"></div>';
  navEl.appendChild(track);
  navTrackEl = track;
  navIndicatorEl = track.firstElementChild;
  navEl.classList.remove('is-active');
  track.addEventListener('pointerdown', onNavPointerDown);
  track.addEventListener('keydown', onNavTrackKeydown);
  updateUI();
}

function updateUI() {
  numCurEl.textContent = String(currentIndex + 1).padStart(2, '0');
  const slideTitle = getSlideAccessibleTitle(slideEls[currentIndex]);
  if (slideCounterEl) {
    slideCounterEl.setAttribute('aria-label', `Slide ${currentIndex + 1} of ${total}: ${slideTitle}`);
  }
  const progress = total > 1 ? currentIndex / (total - 1) : 1;
  progressEl.style.setProperty('--progress-scale', progress.toFixed(4));
  if (!navIndicatorEl || !navTrackEl) return;
  navTrackEl.setAttribute('aria-valuenow', String(currentIndex + 1));
  navTrackEl.setAttribute('aria-valuetext', slideTitle);
  const max = navTrackEl.offsetHeight - 14;
  navIndicatorEl.style.setProperty('--nav-y', (progress * max).toFixed(2) + 'px');
}

function onNavTrackKeydown(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault();
    goTo(currentIndex + 1);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    goTo(currentIndex - 1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    goTo(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    goTo(total - 1);
  }
}

function getNavIndexFromClientY(clientY) {
  if (!navTrackEl) return currentIndex;
  const rect = navTrackEl.getBoundingClientRect();
  const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
  return Math.round(ratio * (total - 1));
}

function setNavActivityState(active) {
  clearTimeout(navActivityTimer);
  navActivityTimer = null;
  if (!navEl || !navTrackEl) return;
  navEl.classList.toggle('is-active', !!active);
  navTrackEl.classList.toggle('is-active', !!active);
}

function scheduleNavActivityReset() {
  clearTimeout(navActivityTimer);
  navActivityTimer = setTimeout(() => {
    navActivityTimer = null;
    setNavActivityState(false);
  }, 900);
}

function onNavPointerDown(e) {
  if (e.button !== 0) return;
  const track = e.currentTarget;
  navDragActive = true;
  navDragPointerId = e.pointerId;
  setNavActivityState(true);
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
  scheduleNavActivityReset();
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
    if (REDUCED_MOTION_QUERY.matches) {
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
  const now = performance.now();
  if (!force && now - lastHoverProbeAt < 32) return;
  const x = Math.round(mouseX);
  const y = Math.round(mouseY);
  if (!force && x === hoverProbeX && y === hoverProbeY) return;

  lastHoverProbeAt = now;
  hoverProbeX = x;
  hoverProbeY = y;

  const el = document.elementFromPoint(x, y);
  const activeActionEl = el && el.closest ? el.closest(ACTION_HOVER_SELECTOR) : null;
  hoveredTextNode = activeContentEl && el && el.closest ? el.closest(TEXT_HOVER_SELECTOR) : null;
  hoveredInfraLayer = activeSlideEl && activeSlideEl.dataset.slide === 'infrastructure' && hoveredTextNode && hoveredTextNode.dataset
    ? hoveredTextNode.dataset.layer || null
    : null;
  hoveredGraphosLayer = activeSlideEl && activeSlideEl.dataset.slide === 'graphos' && el && el.closest
    ? (el.closest('.graphos-row, .graphos-tree__row')?.dataset.layer || (!selectedGraphosLayer && el.closest('.graphos-window') ? 'context' : null))
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
  const width = narrow ? Math.min(window.innerWidth * 0.9, 440) : Math.min(window.innerWidth * 0.48, 620);
  const height = narrow ? Math.min(window.innerHeight * 0.52, 460) : Math.min(window.innerHeight * 0.76, 590);
  return {
    x: (narrow ? window.innerWidth * 0.5 : window.innerWidth * 0.68) - width / 2,
    y: (narrow ? window.innerHeight * 0.38 : window.innerHeight * 0.48) - height / 2,
    width,
    height,
  };
}

function clampGraphosWindowSize(width, height) {
  const margin = 18;
  const minWidth = 360;
  const minHeight = 380;
  const maxWidth = Math.max(minWidth, window.innerWidth - margin * 2);
  const maxHeight = Math.max(minHeight, window.innerHeight - margin * 2);
  return {
    width: clamp(width, minWidth, maxWidth),
    height: clamp(height, minHeight, maxHeight),
  };
}

function clampGraphosWindowPosition(x, y, width, height) {
  const margin = 18;
  const minX = margin;
  const maxX = Math.max(minX, window.innerWidth - width - margin);
  const minY = margin;
  const maxY = Math.max(minY, window.innerHeight - height - margin);
  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

function syncGraphosWindowViewportScale() {
  if (!graphosWindowViewportEl || !activeGraphosWindowEl) return;
  const rect = activeGraphosWindowEl.getBoundingClientRect();
  const widthScale = rect.width / 640;
  const heightScale = rect.height / 560;
  const scale = clamp(Math.min(widthScale, heightScale), 0.88, 1);
  graphosWindowViewportEl.style.setProperty('--graphos-window-scale', scale.toFixed(3));
}

function syncGraphosWindowPosition(forceDefault = false) {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'graphos' || !activeGraphosWindowEl) return;

  const compactMobile = scenes.graphos && scenes.graphos._isCompactMobile();
  if (compactMobile) {
    activeGraphosWindowEl.style.removeProperty('width');
    activeGraphosWindowEl.style.removeProperty('height');
    return;
  }

  if (graphosWindowState.x == null || graphosWindowState.y == null || graphosWindowState.width == null || graphosWindowState.height == null || forceDefault) {
    const defaults = getGraphosWindowDefaults();
    if (defaults) {
      graphosWindowState.x = defaults.x;
      graphosWindowState.y = defaults.y;
      graphosWindowState.width = defaults.width;
      graphosWindowState.height = defaults.height;
    }
  }

  const size = clampGraphosWindowSize(
    graphosWindowState.width ?? activeGraphosWindowEl.getBoundingClientRect().width,
    graphosWindowState.height ?? activeGraphosWindowEl.getBoundingClientRect().height,
  );
  graphosWindowState.width = size.width;
  graphosWindowState.height = size.height;

  const pos = clampGraphosWindowPosition(
    graphosWindowState.x ?? window.innerWidth / 2,
    graphosWindowState.y ?? window.innerHeight / 2,
    size.width,
    size.height,
  );
  graphosWindowState.x = pos.x;
  graphosWindowState.y = pos.y;
  activeGraphosWindowEl.style.left = `${pos.x.toFixed(1)}px`;
  activeGraphosWindowEl.style.top = `${pos.y.toFixed(1)}px`;
  activeGraphosWindowEl.style.width = `${size.width.toFixed(1)}px`;
  activeGraphosWindowEl.style.height = `${size.height.toFixed(1)}px`;
  syncGraphosWindowViewportScale();
}

function getGraphosWindowEdgeFromPoint(e) {
  if (!activeGraphosWindowEl) return null;
  const rect = activeGraphosWindowEl.getBoundingClientRect();
  const edgeSize = 12;
  const cornerSize = 30;
  const nearLeft = Math.abs(e.clientX - rect.left) <= edgeSize;
  const nearRight = Math.abs(e.clientX - rect.right) <= edgeSize;
  const nearTop = Math.abs(e.clientY - rect.top) <= edgeSize;
  const nearBottom = Math.abs(e.clientY - rect.bottom) <= edgeSize;
  const inLeftCorner = e.clientX <= rect.left + cornerSize;
  const inRightCorner = e.clientX >= rect.right - cornerSize;
  const inTopCorner = e.clientY <= rect.top + cornerSize;
  const inBottomCorner = e.clientY >= rect.bottom - cornerSize;
  if (inLeftCorner && inTopCorner) return 'top-left';
  if (inRightCorner && inTopCorner) return 'top-right';
  if (inRightCorner && inBottomCorner) return 'bottom-right';
  if (inLeftCorner && inBottomCorner) return 'bottom-left';
  const insideX = e.clientX > rect.left + edgeSize && e.clientX < rect.right - edgeSize;
  const insideY = e.clientY > rect.top + edgeSize && e.clientY < rect.bottom - edgeSize;
  if (insideX && Math.abs(e.clientY - rect.top) <= edgeSize) return 'top';
  if (insideX && Math.abs(e.clientY - rect.bottom) <= edgeSize) return 'bottom';
  if (insideY && nearLeft) return 'left';
  if (insideY && nearRight) return 'right';
  if (nearTop) return 'top';
  if (nearBottom) return 'bottom';
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  return null;
}

function syncGraphosWindowHoverState(e) {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'graphos' || !activeGraphosWindowEl) return;
  if (scenes.graphos && scenes.graphos._isCompactMobile()) return;
  const edge = getGraphosWindowEdgeFromPoint(e);
  activeGraphosWindowEl.dataset.windowHover = edge || 'inside';
}

function clearGraphosWindowHoverState() {
  if (activeGraphosWindowEl) delete activeGraphosWindowEl.dataset.windowHover;
}

function shouldBeginGraphosWindowMove(target) {
  if (!target || !target.closest || !activeGraphosWindowEl) return false;
  const windowEl = target.closest('.graphos-window');
  if (!windowEl || windowEl !== activeGraphosWindowEl) return false;
  const reservedTarget = target.closest([
    '.graphos-window__resize-handle',
    '[data-graphos-column-resize]',
    '.graphos-tree__row',
    '.graphos-tree__toggle',
    '.graphos-tree__label',
    '.graphos-explorer__extension-toggle',
    '.graphos-explorer__runtime-item',
    '.graphos-explorer__extension-activate',
    '.graphos-explorer__dropzone',
    '.graphos-context-menu',
    '.graphos-color-picker',
    '#graphos-explorer-preview',
    'button',
    'input',
    'textarea',
    'select',
    'option',
    'a',
    '[role="button"]',
    '[contenteditable="true"]',
  ].join(', '));
  return !reservedTarget || !!target.closest('.graphos-window__header');
}

function beginGraphosWindowInteraction(e) {
  if (!activeSlideEl || activeSlideEl.dataset.slide !== 'graphos' || !activeGraphosWindowEl) return;
  if (scenes.graphos && scenes.graphos._isCompactMobile()) return;
  if (e.button !== 0) return;

  const edge = getGraphosWindowEdgeFromPoint(e);
  const shouldMove = shouldBeginGraphosWindowMove(e.target);
  if (!edge && !shouldMove) return;

  const rect = activeGraphosWindowEl.getBoundingClientRect();
  graphosWindowState.mode = edge ? 'resize' : 'move';
  graphosWindowState.resizeEdge = edge;
  graphosWindowState.dragging = !edge;
  graphosWindowState.resizing = !!edge;
  graphosWindowState.pointerId = e.pointerId;
  graphosWindowState.startX = e.clientX;
  graphosWindowState.startY = e.clientY;
  graphosWindowState.startCenterX = rect.left;
  graphosWindowState.startCenterY = rect.top;
  graphosWindowState.startWidth = rect.width;
  graphosWindowState.startHeight = rect.height;
  graphosWindowState.offsetX = e.clientX - rect.left;
  graphosWindowState.offsetY = e.clientY - rect.top;
  draggedGraphosWindowEl = activeGraphosWindowEl;
  draggedGraphosWindowEl.classList.toggle('is-dragging', !edge);
  draggedGraphosWindowEl.classList.toggle('is-resizing', !!edge);
  if (activeGraphosWindowEl.setPointerCapture) {
    activeGraphosWindowEl.setPointerCapture(e.pointerId);
  }
  e.preventDefault();
}

function updateGraphosWindowDrag(e) {
  const windowEl = draggedGraphosWindowEl || activeGraphosWindowEl;
  if ((!graphosWindowState.dragging && !graphosWindowState.resizing) || e.pointerId !== graphosWindowState.pointerId || !windowEl) return;

  if (graphosWindowState.mode === 'resize') {
    const dx = e.clientX - graphosWindowState.startX;
    const dy = e.clientY - graphosWindowState.startY;
    const margin = 18;
    const minWidth = 300;
    const minHeight = 380;
    const startLeft = graphosWindowState.startCenterX;
    const startTop = graphosWindowState.startCenterY;
    const startRight = startLeft + graphosWindowState.startWidth;
    const startBottom = startTop + graphosWindowState.startHeight;
    let left = startLeft;
    let top = startTop;
    let right = startRight;
    let bottom = startBottom;

    if (graphosWindowState.resizeEdge.includes('right')) {
      right = clamp(startRight + dx, startLeft + minWidth, window.innerWidth - margin);
    } else if (graphosWindowState.resizeEdge.includes('left')) {
      left = clamp(startLeft + dx, margin, startRight - minWidth);
    }
    if (graphosWindowState.resizeEdge.includes('bottom')) {
      bottom = clamp(startBottom + dy, startTop + minHeight, window.innerHeight - margin);
    } else if (graphosWindowState.resizeEdge.includes('top')) {
      top = clamp(startTop + dy, margin, startBottom - minHeight);
    }

    const size = clampGraphosWindowSize(right - left, bottom - top);
    if (graphosWindowState.resizeEdge.includes('left')) {
      left = right - size.width;
    } else if (graphosWindowState.resizeEdge.includes('right')) {
      right = left + size.width;
    }
    if (graphosWindowState.resizeEdge.includes('top')) {
      top = bottom - size.height;
    } else if (graphosWindowState.resizeEdge.includes('bottom')) {
      bottom = top + size.height;
    }

    graphosWindowState.width = size.width;
    graphosWindowState.height = size.height;
    graphosWindowState.x = left;
    graphosWindowState.y = top;
    syncGraphosWindowViewportScale();
  } else {
    graphosWindowState.x = e.clientX - graphosWindowState.offsetX;
    graphosWindowState.y = e.clientY - graphosWindowState.offsetY;
  }
  syncGraphosWindowPosition();
  if (graphosWindowState.resizing && scenes.graphos && scenes.graphos._scheduleRuntimePreviewResize) {
    scenes.graphos._scheduleRuntimePreviewResize();
  }
}

function endGraphosWindowDrag(e) {
  if (!graphosWindowState.dragging && !graphosWindowState.resizing) return;
  if (e && 'pointerId' in e && e.pointerId !== graphosWindowState.pointerId) return;
  graphosWindowState.dragging = false;
  graphosWindowState.resizing = false;
  graphosWindowState.mode = null;
  graphosWindowState.resizeEdge = null;
  graphosWindowState.pointerId = null;
  if (draggedGraphosWindowEl) draggedGraphosWindowEl.classList.remove('is-dragging');
  if (draggedGraphosWindowEl) draggedGraphosWindowEl.classList.remove('is-resizing');
  if (draggedGraphosWindowEl) delete draggedGraphosWindowEl.dataset.windowHover;
  if (draggedGraphosWindowEl && draggedGraphosWindowEl.hasPointerCapture && e && 'pointerId' in e && draggedGraphosWindowEl.hasPointerCapture(e.pointerId)) {
    draggedGraphosWindowEl.releasePointerCapture(e.pointerId);
  }
  draggedGraphosWindowEl = null;
}

function getGraphosColumnResizeLimits(kind) {
  if (kind === 'nav') {
    const width = graphosColumnResizeState.explorerWidth || graphosExplorerEl?.getBoundingClientRect().width || 640;
    return {
      min: Math.min(180, Math.max(132, width * 0.24)),
      max: Math.max(210, width - 300),
    };
  }

  const width = graphosColumnResizeState.inspectorWidth || graphosExplorerEl?.querySelector('.graphos-explorer__inspector')?.getBoundingClientRect().width || 360;
  return {
    min: Math.min(118, Math.max(82, width * 0.2)),
    max: Math.max(132, Math.min(width * 0.46, 220)),
  };
}

function setGraphosColumnWidth(kind, width) {
  if (!graphosExplorerEl) return;
  const limits = getGraphosColumnResizeLimits(kind);
  const next = clamp(width, limits.min, limits.max);
  if (kind === 'nav') {
    graphosExplorerEl.style.setProperty('--graphos-nav-col', `${next.toFixed(1)}px`);
    if (draggedGraphosColumnHandleEl) {
      draggedGraphosColumnHandleEl.setAttribute('aria-valuenow', String(Math.round(next)));
    }
  } else {
    graphosExplorerEl.style.setProperty('--graphos-extensions-col', `${next.toFixed(1)}px`);
    if (draggedGraphosColumnHandleEl) {
      draggedGraphosColumnHandleEl.setAttribute('aria-valuenow', String(Math.round(next)));
    }
  }
  if (scenes.graphos?.runtimePreview) {
    scenes.graphos.runtimePreview.dirty = true;
  }
}

function beginGraphosColumnResize(e) {
  const handle = e.target.closest?.('[data-graphos-column-resize]');
  if (!handle || !graphosExplorerEl || !activeSlideEl || activeSlideEl.dataset.slide !== 'graphos') return;
  if (scenes.graphos && scenes.graphos._isCompactMobile()) return;
  if (e.button !== 0) return;

  const inspectorEl = graphosExplorerEl.querySelector('.graphos-explorer__inspector');
  const navEl = graphosExplorerEl.querySelector('.graphos-explorer__nav');
  const kind = handle.dataset.graphosColumnResize;
  graphosColumnResizeState.active = true;
  graphosColumnResizeState.kind = kind;
  graphosColumnResizeState.pointerId = e.pointerId;
  graphosColumnResizeState.startX = e.clientX;
  graphosColumnResizeState.startNavWidth = navEl ? navEl.getBoundingClientRect().width : 0;
  graphosColumnResizeState.startTabsWidth = graphosExplorerTabsEl ? graphosExplorerTabsEl.getBoundingClientRect().width : 0;
  graphosColumnResizeState.explorerWidth = graphosExplorerEl.getBoundingClientRect().width;
  graphosColumnResizeState.inspectorWidth = inspectorEl ? inspectorEl.getBoundingClientRect().width : 0;
  draggedGraphosColumnHandleEl = handle;
  graphosExplorerEl.classList.add('is-column-resizing');
  graphosExplorerEl.dataset.columnResize = kind;
  handle.classList.add('is-resizing');
  handle.setPointerCapture(e.pointerId);
  e.preventDefault();
  e.stopPropagation();
}

function updateGraphosColumnResize(e) {
  if (!graphosColumnResizeState.active || e.pointerId !== graphosColumnResizeState.pointerId) return;
  const dx = e.clientX - graphosColumnResizeState.startX;
  if (graphosColumnResizeState.kind === 'nav') {
    setGraphosColumnWidth('nav', graphosColumnResizeState.startNavWidth + dx);
  } else {
    setGraphosColumnWidth('extensions', graphosColumnResizeState.startTabsWidth - dx);
  }
}

function endGraphosColumnResize(e) {
  if (!graphosColumnResizeState.active) return;
  if (e && 'pointerId' in e && e.pointerId !== graphosColumnResizeState.pointerId) return;
  graphosColumnResizeState.active = false;
  graphosColumnResizeState.kind = null;
  graphosColumnResizeState.pointerId = null;
  if (graphosExplorerEl) {
    graphosExplorerEl.classList.remove('is-column-resizing');
    delete graphosExplorerEl.dataset.columnResize;
  }
  if (draggedGraphosColumnHandleEl) {
    draggedGraphosColumnHandleEl.classList.remove('is-resizing');
    if (draggedGraphosColumnHandleEl.hasPointerCapture && e && 'pointerId' in e && draggedGraphosColumnHandleEl.hasPointerCapture(e.pointerId)) {
      draggedGraphosColumnHandleEl.releasePointerCapture(e.pointerId);
    }
  }
  draggedGraphosColumnHandleEl = null;
}

function onGraphosColumnKeydown(e) {
  const handle = e.target.closest?.('[data-graphos-column-resize]');
  if (!handle || !graphosExplorerEl) return;
  const kind = handle.dataset.graphosColumnResize;
  const computed = getComputedStyle(graphosExplorerEl);
  const current = kind === 'nav'
    ? parseFloat(computed.getPropertyValue('--graphos-nav-col')) || graphosExplorerEl.querySelector('.graphos-explorer__nav')?.getBoundingClientRect().width || 180
    : parseFloat(computed.getPropertyValue('--graphos-extensions-col')) || graphosExplorerTabsEl?.getBoundingClientRect().width || 130;
  const step = e.shiftKey ? 24 : 10;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    setGraphosColumnWidth(kind, kind === 'nav' ? current - step : current + step);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    setGraphosColumnWidth(kind, kind === 'nav' ? current + step : current - step);
  }
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
document.addEventListener('pointermove', updateGraphosColumnResize, { passive: true });
document.addEventListener('pointerup', endNavDrag);
document.addEventListener('pointerup', endGraphosWindowDrag);
document.addEventListener('pointerup', endGraphosColumnResize);
document.addEventListener('pointercancel', endNavDrag);
document.addEventListener('pointercancel', endGraphosWindowDrag);
document.addEventListener('pointercancel', endGraphosColumnResize);
document.addEventListener('mouseleave', () => {
  clearActionHoverState();
  if (mistBg) mistBg.onLeave();
});

if (graphosExplorerEl) {
  graphosExplorerEl.addEventListener('pointerdown', beginGraphosColumnResize);
  graphosExplorerEl.addEventListener('keydown', onGraphosColumnKeydown);
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
  if (document.hidden) {
    mainRafId = null;
    return;
  }

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
// Used for: VASTE (standard), VASTE graph demo (sparse), R&D (dense+trails), Physical (spread)
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
    this.dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.offsetWidth || 1;
    this.h = this.canvas.offsetHeight || 1;
    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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

    // Ties
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

    // Vertices
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
// SCENE: INQUIRY
// A question bridge between autonomy and VASTE.
// =============================================

class InquiryScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = {
      speed: opts.speed || 0.16,
      edgeAlpha: opts.edgeAlpha || 0.18,
    };
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.nodes = [];
    this._resize();
    this._init();
  }

  _resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.offsetWidth || 1;
    this.h = this.canvas.offsetHeight || 1;
    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.w * 0.67;
    this.cy = this.h * 0.48;
    this.orbit = Math.min(this.w, this.h) * 0.22;
    this.outer = Math.min(this.w, this.h) * 0.34;
  }

  _init() {
    this.nodes = [
      { kind: 'core', angle: 0, radius: 0, size: 7.2, spin: 0, wobble: 0, alpha: 1 },
      { kind: 'primary', angle: -2.55, radius: this.orbit * 0.84, size: 3.3, spin: 0.15, wobble: 4.5, alpha: 0.9 },
      { kind: 'primary', angle: -1.2, radius: this.orbit * 0.94, size: 3.0, spin: -0.11, wobble: 5.5, alpha: 0.84 },
      { kind: 'primary', angle: 0.22, radius: this.orbit * 0.86, size: 3.1, spin: 0.1, wobble: 4.2, alpha: 0.86 },
      { kind: 'primary', angle: 1.27, radius: this.orbit * 1.02, size: 3.05, spin: -0.13, wobble: 5.0, alpha: 0.82 },
      { kind: 'primary', angle: 2.48, radius: this.orbit * 0.92, size: 3.2, spin: 0.12, wobble: 4.8, alpha: 0.88 },
      { kind: 'secondary', angle: 3.05, radius: this.outer * 0.62, size: 2.5, spin: -0.08, wobble: 6.0, alpha: 0.52 },
    ];
  }

  start() {
    if (this.running) return;
    this.running = true;
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

  _nodePosition(node) {
    const wobble = node.kind === 'core' ? 0 : Math.sin(this.t * (1.1 + node.spin * 0.2) + node.angle * 1.7) * node.wobble;
    const radius = node.radius + wobble;
    const angle = node.angle + this.t * node.spin;
    return {
      x: this.cx + Math.cos(angle) * radius,
      y: this.cy + Math.sin(angle) * radius * 0.8,
      pulse: 0.6 + 0.4 * Math.sin(this.t * 1.5 + node.angle * 2.0),
    };
  }

  _draw() {
    const { ctx, w, h } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';

    const bg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.outer * 1.25);
    if (light) {
      bg.addColorStop(0, 'rgba(0,0,0,0.06)');
      bg.addColorStop(0.55, 'rgba(0,0,0,0.03)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      bg.addColorStop(0, 'rgba(255,255,255,0.07)');
      bg.addColorStop(0.55, 'rgba(255,255,255,0.03)');
      bg.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const nodes = this.nodes.map(node => ({ ...node, ...this._nodePosition(node) }));
    const core = nodes[0];
    const satellites = nodes.slice(1);

    ctx.strokeStyle = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.orbit * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    satellites.forEach((node, index) => {
      const strength = this.opts.edgeAlpha * node.alpha;
      const alpha = clamp(strength * (0.72 + node.pulse * 0.28), 0.03, 0.24);
      const grad = ctx.createLinearGradient(core.x, core.y, node.x, node.y);
      grad.addColorStop(0, light ? `rgba(0,0,0,${alpha * 0.65})` : `rgba(255,255,255,${alpha * 0.8})`);
      grad.addColorStop(1, light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(core.x, core.y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();

      const next = satellites[(index + 1) % satellites.length];
      const chainAlpha = alpha * 0.42;
      ctx.strokeStyle = light ? `rgba(0,0,0,${chainAlpha})` : `rgba(255,255,255,${chainAlpha})`;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    });

    const glow = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, this.orbit * 0.95);
    glow.addColorStop(0, light ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.2)');
    glow.addColorStop(0.4, light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(core.x, core.y, this.orbit * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 14 + core.pulse * 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(core.x, core.y, 5.5 + core.pulse * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = light ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.86)';
    ctx.fill();

    nodes.forEach(node => {
      const radius = node.kind === 'core'
        ? 5.5 + core.pulse * 1.2
        : node.size + node.pulse * (node.kind === 'primary' ? 0.9 : 0.55);
      const alpha = node.kind === 'core'
        ? 0.92
        : node.alpha * (0.72 + node.pulse * 0.2);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.kind === 'core'
        ? (light ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.92)')
        : (light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
      ctx.fill();

      if (node.kind !== 'core') {
        ctx.strokeStyle = light ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.globalCompositeOperation = 'source-over';
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
    this.isCombinationScene = canvas.id === 'canvas-combination';
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
    const compact = Math.min(this.w, this.h) < 700;
    const ultraCompact = compact && this.isCombinationScene;
    const cols = ultraCompact ? Math.min(this.opts.cols, 2) : (compact ? Math.min(this.opts.cols, 3) : this.opts.cols);
    const rows = ultraCompact ? Math.min(this.opts.rows, 2) : (compact ? Math.min(this.opts.rows, 2) : this.opts.rows);
    const gap = ultraCompact ? Math.max(9, Math.round(this.opts.gap * 0.38)) : (compact ? Math.max(14, Math.round(this.opts.gap * 0.58)) : this.opts.gap);
    const cx = this.opts.cx;
    const cy = ultraCompact ? Math.min(0.42, this.opts.cy) : (compact ? Math.min(0.46, this.opts.cy) : this.opts.cy);
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
        const d  = ultraCompact
          ? 56 + Math.random() * 70
          : (compact ? 96 + Math.random() * 96 : 160 + Math.random() * 200);
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
      const sz = this.isCombinationScene && Math.min(this.w, this.h) < 700 ? 1.5 : (Math.min(this.w, this.h) < 700 ? 2 : 2.5);
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
    this._setMobilePanelOpen(false);
    this._loop();
  }

  _setMobilePanelOpen(open) {
    this.mobilePanelOpen = !!open;
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
// Surface projects. Environment defines semantics.
// Actions move changes into a canonical core graph.
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
    const moduleLabels = ['Actor', 'Workspace', 'Assets', 'Program', 'Intelligence', 'Knowledge', 'Perception', 'Studio', 'Flow'];
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
      { key: 'metadata', value: 'graph environment' },
      { key: 'routing', value: 'edge path' },
      { key: 'linkage', value: 'node relation' },
      { key: 'semantics', value: 'registry layer' },
      { key: 'contracts', value: 'interface' },
    ];

    // Canonical core graph: a stable internal topology of vertices and ties.
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
    ctx.fillText('Environment', x + 16, y + 18);
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

    // Action spine: the action corridor from semantics into the core.
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

    this._drawTag('Actions', spineX, bandBottom + 18, 0.7, 'center');

    this.intents.forEach((intent, index) => {
      const module = this.modules[intent.moduleIndex];
      const target = coreNodes[intent.targetIndex];
      if (!module || !target) return;

      const start = {
        x: module.baseX,
        y: module.baseY + module.h * 0.55,
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

    // Internal canonical graph: only vertices and ties live here.
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

    // Tiny legend inside the core: vertices and ties define topology.
    ctx.save();
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    const legendX = x - r * 0.46;
    const legendY = y + r * 0.47;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(legendX, legendY, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('Vertex', legendX + 9, legendY + 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(legendX + 42, legendY);
    ctx.lineTo(legendX + 70, legendY);
    ctx.stroke();
    ctx.fillText('Tie', legendX + 76, legendY + 0.4);
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

    this._drawTag('Vertex', 10, 86, 0.58, 'center');
    this._drawTag('Tie', 46, 14, 0.42, 'center');

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

    // Environment sits between surface and core, carrying the global registry.
    this._drawContextBand(focusLayer);

    // Extensions are in the middle layer, same conceptual band as Environment.
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

    // Actions route through the semantic layer into the core graph.
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
      { label: 'Workspace', angle: -Math.PI * 0.50, delay: 0.0, lane: 0, color: '#8ee0d0', status: 'included' },
      { label: 'Actor', angle: -Math.PI * 0.20, delay: 0.18, lane: 1, color: '#7ca0ff', status: 'included' },
      { label: 'Assets', angle:  Math.PI * 0.06, delay: 0.36, lane: 2, color: '#e0b4ff', status: 'included' },
      { label: 'Surface', angle:  Math.PI * 0.30, delay: 0.54, lane: 0, color: '#9fe4ff', status: 'included' },
      { label: 'Realtime', angle:  Math.PI * 0.58, delay: 0.72, lane: 1, color: '#c9d0ff', status: 'included' },
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
    this.dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.offsetWidth || 1;
    this.h = this.canvas.offsetHeight || 1;
    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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

    // Vertices in black with slight bright halos.
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
// Living graph with draggable primitive window, stable groups, and surface projections.
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
      { text: 'Vertex', node: 0, dx: -36, dy: -30 },
      { text: 'Tie', node: 3, dx: 22, dy: -18 },
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

    // Ties.
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

    // Vertices.
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

    // Environment streams.
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
    this._drawLabel('Environment', this.w * 0.08, this.contextY - 8, 0.8, focusLayer);
  }
}


// =============================================
// SCENE: BUILD
// Studio, Program, Environment, canonical core,
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
      { key: 'metadata', value: 'graph environment' },
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

    const moduleLabels = ['Studio', 'Runtime', 'Cloud', 'Self-hosted', 'Governance', 'Flow', 'Program', 'Intelligence', 'Perception'];
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
    ctx.fillText('Studio', -w / 2 + 56, -h / 2 + 14);
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

    this._drawTag('Program', lerp(start.x, end.x, 0.34), lerp(start.y, end.y, 0.27), 0.78, 'center');
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
    ctx.fillText('Environment', x + 16, y + 18);
    ctx.fillStyle = focused ? 'rgba(255,255,255,0.54)' : 'rgba(255,255,255,0.42)';
    ctx.fillText('type in environment', x + w - 114, y + 18);

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
    ctx.fillText('Vertex', legendX + 9, legendY + 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(legendX + 42, legendY);
    ctx.lineTo(legendX + 70, legendY);
    ctx.stroke();
    ctx.fillText('Tie', legendX + 76, legendY + 0.4);
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

    this._drawTag('Extensions', x - this.core.r * 0.05, y + this.core.r + 28, 0.76, 'center');
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
// SCENE: USE CASES — Ambient atmosphere
// Color-reactive background for the drum/field layout.
// =============================================

class UseCasesScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.accent = [124, 160, 255];
    this.targetAccent = [124, 160, 255];
    this.particles = [];
    this.dpr = 1;
    this.w = 0;
    this.h = 0;
    this._resize();
    this._initParticles();
  }

  setAccent(rgb) {
    this.targetAccent = [...rgb];
  }

  _resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.offsetWidth || 1;
    this.h = this.canvas.offsetHeight || 1;
    this.canvas.width = Math.max(1, Math.floor(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _initParticles() {
    this.particles = Array.from({ length: 34 }, () => ({
      x: rand(0, this.w || 800),
      y: rand(0, this.h || 600),
      r: rand(0.6, 2.4),
      vx: rand(-0.22, 0.22),
      vy: rand(-0.48, -0.08),
      alpha: rand(0.03, 0.11),
      phase: rand(0, Math.PI * 2),
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
    this._initParticles();
  }

  _loop() {
    if (!this.running) return;
    this.t += 0.004;
    this.accent[0] = lerp(this.accent[0], this.targetAccent[0], 0.02);
    this.accent[1] = lerp(this.accent[1], this.targetAccent[1], 0.02);
    this.accent[2] = lerp(this.accent[2], this.targetAccent[2], 0.02);
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, w, h, t } = this;
    const [r, g, b] = this.accent;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgb(5,5,8)';
    ctx.fillRect(0, 0, w, h);

    // Ambient glow on the field side (right ~65%)
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.52);
    const gx = w * 0.68, gy = h * 0.5;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(w, h) * 0.86);
    gr.addColorStop(0, `rgba(${r},${g},${b},${0.072 + pulse * 0.022})`);
    gr.addColorStop(0.48, `rgba(${r},${g},${b},0.022)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);

    // Soft wash on the drum side (left ~32%)
    const gl = ctx.createLinearGradient(0, 0, w * 0.34, 0);
    gl.addColorStop(0, `rgba(${r},${g},${b},${0.038 + pulse * 0.008})`);
    gl.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w * 0.34, h);

    // Column divider trace
    ctx.save();
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.05 + pulse * 0.015})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 14]);
    ctx.beginPath();
    ctx.moveTo(w * 0.335, h * 0.1);
    ctx.lineTo(w * 0.335, h * 0.9);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Drifting particles (screen blend)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -8) { p.y = h + 8; p.x = rand(0, w); }
      if (p.x < -8) p.x = w + 8;
      if (p.x > w + 8) p.x = -8;
      const pa = p.alpha * (0.5 + 0.5 * Math.sin(t * 0.9 + p.phase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${pa})`;
      ctx.fill();
    });
    ctx.restore();

    // Tie vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}


// =============================================
// CONTROLLER: USE CASES — Drum + Field
// Manages category selector and case chips.
// =============================================

let ucController = null;

class UseCasesController {
  constructor(slideEl) {
    this.el = slideEl;
    this.activeIndex = 0;
    this.staggerTimers = [];
    this.families = [
      {
        key: 'operations',
        title: 'Operations',
        desc: 'Enterprise ops, logistics, support orchestration.',
        accent: [124, 160, 255],
        cases: ['CRM', 'Logistics', 'Finance', 'Retail', 'Marketplace', 'Support', 'Planning', 'Scheduling', 'Workflow', 'Governance', 'Infrastructure'],
      },
      {
        key: 'orchestration',
        title: 'Orchestration',
        desc: 'AI orchestration, agent systems, graph-native workflows.',
        accent: [93, 229, 214],
        cases: ['Agents', 'Automation', 'State', 'Protocol', 'Telemetry', 'Signals', 'Data', 'Graph', 'Routing', 'Policy', 'Composition', 'Runtime', 'Coordination', 'Interfaces'],
      },
      {
        key: 'research',
        title: 'Research',
        desc: 'Simulation, knowledge systems, lab environments.',
        accent: [180, 146, 255],
        cases: ['Simulation', 'Physics', 'Biology', 'Genome', 'Research', 'Education', 'Knowledge', 'Archive', 'Signals'],
      },
      {
        key: 'studio',
        title: 'Studio',
        desc: 'Websites, apps, domains, and hosted surfaces.',
        accent: [255, 194, 102],
        cases: ['Media', 'Music', 'Culture', 'Design', 'Publishing', 'Audience', 'Content', 'Collaboration', 'Strategy', 'Interfaces'],
      },
    ];
    this.drumItems = [];
    this.fieldInner = null;
    this._init();
  }

  _init() {
    this.drumItems = [...(this.el.querySelectorAll('.uc-drum__item') || [])];
    this.fieldInner = this.el.querySelector('#uc-field-inner');
    if (!this.drumItems.length || !this.fieldInner) return;

    // Set initial CSS accent
    this.el.style.setProperty('--uc-active', this.families[0].accent.join(','));

    // Drum item clicks
    this.drumItems.forEach((item, i) => {
      item.addEventListener('click', () => this.setActive(i));
      item.addEventListener('mouseenter', () => {
        if (i !== this.activeIndex) item.classList.add('is-hover');
      });
      item.addEventListener('mouseleave', () => item.classList.remove('is-hover'));
    });

    // Wheel on drum: cycle families
    const drum = this.el.querySelector('#uc-drum');
    if (drum) {
      let wAcc = 0, wTimer = null;
      drum.addEventListener('wheel', e => {
        e.preventDefault();
        e.stopPropagation();
        wAcc += e.deltaY;
        clearTimeout(wTimer);
        wTimer = setTimeout(() => {
          if (Math.abs(wAcc) > 10) {
            const next = (this.activeIndex + (wAcc > 0 ? 1 : -1) + this.families.length) % this.families.length;
            this.setActive(next);
          }
          wAcc = 0;
        }, 38);
      }, { passive: false });
    }

    // Populate initial field without animation
    this._renderField(0, false);
  }

  setActive(index) {
    if (index === this.activeIndex && this.fieldInner && this.fieldInner.querySelector('.uc-case')) return;
    const prev = this.activeIndex;
    this.activeIndex = index;

    // Update drum state
    this.drumItems.forEach((item, i) => {
      const on = i === index;
      item.classList.toggle('is-active', on);
      item.classList.remove('is-hover');
      item.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // Update CSS accent var
    const family = this.families[index];
    this.el.style.setProperty('--uc-active', family.accent.join(','));

    // Notify canvas scene to shift color
    if (scenes.usecases && scenes.usecases.setAccent) {
      scenes.usecases.setAccent(family.accent);
    }

    this._renderField(index, prev !== index);
  }

  _renderField(index, animate) {
    if (!this.fieldInner) return;
    this.staggerTimers.forEach(clearTimeout);
    this.staggerTimers = [];

    if (animate) {
      this.fieldInner.classList.add('is-exiting');
      const t1 = setTimeout(() => {
        this._buildField(index);
        this.fieldInner.classList.remove('is-exiting');
        this.fieldInner.classList.add('is-entering');
        const t2 = setTimeout(() => this.fieldInner.classList.remove('is-entering'), 440);
        this.staggerTimers.push(t2);
      }, 185);
      this.staggerTimers.push(t1);
    } else {
      this._buildField(index);
    }
  }

  _buildField(index) {
    const fam = this.families[index];
    const [r, g, b] = fam.accent;

    let html = `
      <div class="uc-field__header">
        <p class="uc-field__eyebrow" style="color:rgba(${r},${g},${b},0.82)">${fam.title}</p>
        <p class="uc-field__desc">${fam.desc}</p>
      </div>
      <div class="uc-field__grid">
    `;

    fam.cases.forEach((word, i) => {
      const tier = i < 3 ? 'primary' : i < 7 ? 'secondary' : 'tertiary';
      html += `<span class="uc-case uc-case--${tier}" data-word="${word}" data-family-title="${fam.title}" data-family-key="${fam.key}" style="--uc-a:${r},${g},${b};--uc-delay:${i * 24}ms">${word}</span>`;
    });

    html += `</div>`;
    this.fieldInner.innerHTML = html;

  }

  _detail(word, key) {
    const map = {
      operations: `Use VASTE to map ${word} as graph vertices - tracking status, ownership, and exceptions in a single operational base.`,
      orchestration: `Use VASTE to model ${word} as composable capacities so systems stay coordinated across the graph.`,
      research: `Use VASTE to connect ${word} data into a living structure where experiments, results, and signals stay linked.`,
      studio: `Use VASTE to publish ${word} as a living surface - a graph projection that people can explore and interact with.`,
    };
    return map[key] || `Use VASTE to model ${word} as vertices, ties, and surfaces in a single system.`;
  }

  destroy() {
    this.staggerTimers.forEach(clearTimeout);
    this.staggerTimers = [];
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
// SCENE: HORIZON
// A long-range systems projection: today becomes infrastructure.
// =============================================

class HorizonScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.raf = null;
    this.t = 0;
    this.stageDefs = [
      {
        key: 'today',
        label: 'Today',
        x: 0.66,
        y: 0.29,
        radius: 78,
        nodeCount: 20,
        nodeMin: 4.5,
        nodeMax: 11,
        hue: 210,
      },
      {
        key: 'next',
        label: 'Next',
        x: 0.70,
        y: 0.51,
        radius: 112,
        nodeCount: 28,
        nodeMin: 5,
        nodeMax: 13,
        hue: 225,
      },
      {
        key: 'longterm',
        label: 'Long term',
        x: 0.74,
        y: 0.73,
        radius: 150,
        nodeCount: 38,
        nodeMin: 5.5,
        nodeMax: 14,
        hue: 200,
      },
    ];
    this._resize();
    this._init();
  }

  _resize() {
    this.w = this.canvas.width = this.canvas.offsetWidth;
    this.h = this.canvas.height = this.canvas.offsetHeight;
    this.mouseInfluence = Math.max(this.w, this.h) * 0.018;
    this.anchors = this.stageDefs.map((stage, index) => ({
      ...stage,
      x: this.w * stage.x,
      y: this.h * stage.y,
      sway: index * 0.9,
    }));
  }

  _init() {
    this.clusters = this.stageDefs.map((stage, stageIndex) => {
      const nodes = Array.from({ length: stage.nodeCount }, (_, i) => ({
        angle: rand(0, Math.PI * 2),
        radius: rand(stage.radius * 0.34, stage.radius * 1.02),
        speed: rand(0.08, 0.18) * (0.8 + stageIndex * 0.18),
        wobble: rand(0.2, 1),
        size: rand(stage.nodeMin, stage.nodeMax),
        alpha: rand(0.45, 1),
        branch: i % 4 === 0,
      }));

      const links = [];
      for (let i = 0; i < nodes.length; i++) {
        links.push([i, (i + 1) % nodes.length]);
        if (i % 3 === 0) {
          links.push([i, (i + Math.floor(nodes.length / 2)) % nodes.length]);
        }
        if (i % 5 === 0) {
          links.push([i, (i + 7) % nodes.length]);
        }
      }

      return { ...stage, nodes, links };
    });

    this.pulses = Array.from({ length: 18 }, (_, i) => ({
      phase: rand(0, 1),
      speed: rand(0.065, 0.16),
      lane: i % 3,
      size: rand(1.5, 2.6),
      tint: i % 3,
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
    this.t += 0.0062;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _stageFocus(stageIndex) {
    const cycle = (this.t * 0.22) % 3;
    const dist = Math.min(
      Math.abs(cycle - stageIndex),
      3 - Math.abs(cycle - stageIndex),
    );
    return Math.max(0, 1 - dist);
  }

  _pathPoint(progress) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    if (progress <= 0.5) {
      const t = progress / 0.5;
      return {
        x: lerp(a.x, b.x, easeInOutCubic(t)),
        y: lerp(a.y, b.y, easeInOutCubic(t)),
      };
    }
    const t = (progress - 0.5) / 0.5;
    return {
      x: lerp(b.x, c.x, easeInOutCubic(t)),
      y: lerp(b.y, c.y, easeInOutCubic(t)),
    };
  }

  _drawBackground(light) {
    const { ctx } = this;
    const bg = ctx.createRadialGradient(this.w * 0.56, this.h * 0.44, 10, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.85);
    bg.addColorStop(0, light ? 'rgba(255,255,255,1)' : 'rgba(8,8,10,1)');
    bg.addColorStop(1, light ? 'rgba(240,239,234,1)' : 'rgba(2,2,3,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = this.h * (0.18 + i * 0.11);
      ctx.beginPath();
      ctx.moveTo(this.w * 0.06, y);
      ctx.lineTo(this.w * 0.94, y);
      ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const x = this.w * 0.5 + i * (this.w * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, this.h * 0.1);
      ctx.lineTo(x + this.w * 0.04, this.h * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawBackbone(light) {
    const { ctx } = this;
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const glow = ctx.createLinearGradient(a.x - 40, a.y, c.x + 80, c.y);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(0.24, light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
    glow.addColorStop(0.52, light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)');
    glow.addColorStop(0.8, light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.shadowColor = light ? 'rgba(0,0,0,0.12)' : 'rgba(124,160,255,0.14)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(a.x - 20, a.y - 10);
    ctx.bezierCurveTo(
      a.x + 90, a.y - 40,
      b.x - 30, b.y + 36,
      b.x + 16, b.y,
    );
    ctx.bezierCurveTo(
      b.x + 52, b.y - 28,
      c.x - 30, c.y + 18,
      c.x + 22, c.y - 6,
    );
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x - 20, a.y - 10);
    ctx.bezierCurveTo(
      a.x + 90, a.y - 40,
      b.x - 30, b.y + 36,
      b.x + 16, b.y,
    );
    ctx.bezierCurveTo(
      b.x + 52, b.y - 28,
      c.x - 30, c.y + 18,
      c.x + 22, c.y - 6,
    );
    ctx.stroke();

    ctx.restore();
  }

  _drawStage(stage, cluster, stageIndex, light) {
    const { ctx } = this;
    const anchor = this.anchors[stageIndex];
    const focus = this._stageFocus(stageIndex);
    const mouseXNorm = window.innerWidth ? (mouseX / window.innerWidth) - 0.5 : 0;
    const mouseYNorm = window.innerHeight ? (mouseY / window.innerHeight) - 0.5 : 0;
    const swayX = mouseXNorm * this.mouseInfluence * (0.8 + stageIndex * 0.15);
    const swayY = mouseYNorm * this.mouseInfluence * (0.6 + stageIndex * 0.12);

    ctx.save();
    ctx.translate(anchor.x + swayX, anchor.y + swayY);

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, stage.radius * (1.5 + focus * 0.7));
    halo.addColorStop(0, light ? `rgba(0,0,0,${0.12 + focus * 0.07})` : `rgba(255,255,255,${0.15 + focus * 0.12})`);
    halo.addColorStop(0.42, light ? `rgba(0,0,0,${0.05 + focus * 0.04})` : `rgba(255,255,255,${0.07 + focus * 0.06})`);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, stage.radius * (1.5 + focus * 0.7), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = light ? `rgba(0,0,0,${0.10 + focus * 0.08})` : `rgba(255,255,255,${0.10 + focus * 0.12})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, stage.radius * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, stage.radius * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'screen';
    cluster.links.forEach(([fromIndex, toIndex], linkIndex) => {
      const from = cluster.nodes[fromIndex];
      const to = cluster.nodes[toIndex];
      if (!from || !to) return;
      const p1 = this._clusterPoint(from, stageIndex, swayX, swayY);
      const p2 = this._clusterPoint(to, stageIndex, swayX, swayY);
      const alpha = 0.03 + focus * 0.08 + (linkIndex % 3) * 0.008;
      ctx.strokeStyle = light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = linkIndex % 5 === 0 ? 1.1 : 0.8;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    cluster.nodes.forEach((node, nodeIndex) => {
      const p = this._clusterPoint(node, stageIndex, swayX, swayY);
      const pulse = 0.5 + 0.5 * Math.sin(this.t * (0.8 + stageIndex * 0.18) + node.angle);
      const radius = node.size * (0.76 + pulse * 0.36 + focus * 0.12);
      const alpha = (0.06 + node.alpha * 0.12 + focus * 0.10) * (stageIndex === 2 ? 1.1 : 1);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(node.angle + this.t * 0.3) * 0.4);
      ctx.fillStyle = light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.strokeStyle = light ? `rgba(0,0,0,${alpha * 0.72})` : `rgba(255,255,255,${alpha * 0.72})`;
      ctx.lineWidth = 1;

      if (nodeIndex % 7 === 0) {
        roundRect(ctx, -radius * 0.7, -radius * 0.42, radius * 1.4, radius * 0.84, radius * 0.32);
        ctx.fill();
      } else if (nodeIndex % 5 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }

      if (node.branch) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
        ctx.strokeStyle = light ? `rgba(0,0,0,${alpha * 0.26})` : `rgba(255,255,255,${alpha * 0.28})`;
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  _clusterPoint(node, stageIndex, swayX, swayY) {
    const anchor = this.anchors[stageIndex];
    const clusterSpeed = 0.78 + stageIndex * 0.18;
    const x = anchor.x + swayX + Math.cos(node.angle + this.t * (node.speed * clusterSpeed)) * node.radius;
    const y = anchor.y + swayY + Math.sin(node.angle * 1.18 + this.t * (node.speed * clusterSpeed * 0.86)) * node.radius * 0.58;
    return { x, y };
  }

  _drawPulses(light) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.pulses.forEach((pulse, index) => {
      const progress = (this.t * pulse.speed + pulse.phase) % 1;
      const point = this._pathPoint(progress);
      const nextPoint = this._pathPoint((progress + 0.012) % 1);
      const dx = nextPoint.x - point.x;
      const dy = nextPoint.y - point.y;
      const angle = Math.atan2(dy, dx);
      const offset = Math.sin(this.t * 1.8 + index) * (14 + pulse.lane * 6);
      const size = pulse.size * (1 + pulse.lane * 0.22);
      const alpha = 0.12 + pulse.lane * 0.03 + Math.sin(this.t * 0.9 + pulse.phase * Math.PI * 2) * 0.02;
      const color = pulse.tint === 0
        ? `rgba(124,160,255,${alpha})`
        : pulse.tint === 1
          ? `rgba(255,255,255,${alpha})`
          : `rgba(159,228,255,${alpha})`;

      ctx.save();
      ctx.translate(point.x + Math.cos(angle + Math.PI / 2) * offset, point.y + Math.sin(angle + Math.PI / 2) * offset);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      roundRect(ctx, -size * 1.2, -size * 0.55, size * 2.4, size * 1.1, size);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  _draw() {
    const { ctx } = this;
    const light = isLightTheme();
    ctx.clearRect(0, 0, this.w, this.h);

    this._drawBackground(light);

    const centerGlow = ctx.createRadialGradient(this.w * 0.64, this.h * 0.48, 0, this.w * 0.64, this.h * 0.48, Math.max(this.w, this.h) * 0.5);
    centerGlow.addColorStop(0, light ? 'rgba(0,0,0,0.04)' : 'rgba(124,160,255,0.09)');
    centerGlow.addColorStop(0.35, light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)');
    centerGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, this.w, this.h);

    this._drawBackbone(light);

    this.clusters.forEach((cluster, index) => {
      this._drawStage(this.stageDefs[index], cluster, index, light);
    });

    this._drawPulses(light);
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

    // Vertices, with anchored points receiving an environment tether.
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

const GRAPHOS_EXTENSION_DEFS = [
  {
    key: 'assets',
    label: 'Assets',
    kind: 'asset',
    summary: 'File substrate for documents, media, models, archives, and any external object attached to the vertex.',
    empty: 'Drop any file into this vertex once Assets is active.',
  },
  {
    key: 'programs',
    label: 'Programs',
    kind: 'program',
    summary: 'Executable units, shell routines, routers, and local automation bound to this vertex.',
    empty: 'Attach a program or runtime command to make this vertex executable.',
  },
  {
    key: 'flow',
    label: 'Flow',
    kind: 'flow',
    summary: 'Routing, triggers, and ordered transitions between this vertex and the wider graph.',
    empty: 'No flow has been composed for this vertex yet.',
  },
  {
    key: 'perception',
    label: 'Perception',
    kind: 'perception',
    summary: 'Signals, sensors, observed state, and context channels that feed the vertex.',
    empty: 'No perception stream is attached yet.',
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    kind: 'knowledge',
    summary: 'Semantic memory, notes, embeddings, and governed knowledge linked to the vertex.',
    empty: 'No knowledge layer is attached yet.',
  },
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
    this.overlapCandidate = false;
    this.overlapFactor = 0;
    this.selected = false;
    this.isContainedPreview = false;
    this.createdAt = opts.createdAt ?? Date.now();
    this.name = opts.name ?? 'Vertex';
    this.color = opts.color ?? '#5a78ff';
    this.type = opts.type ?? null;
    this.bodyVisible = opts.bodyVisible ?? opts.showCore ?? true;
    this.showCore = opts.showCore ?? this.bodyVisible;
    this.assets = Array.isArray(opts.assets) ? opts.assets.slice() : [];
    this.programs = Array.isArray(opts.programs) ? opts.programs.slice() : [];
    this.flow = Array.isArray(opts.flow) ? opts.flow.slice() : [];
    this.perception = Array.isArray(opts.perception) ? opts.perception.slice() : [];
    this.knowledge = Array.isArray(opts.knowledge) ? opts.knowledge.slice() : [];
    this.extensions = Array.isArray(opts.extensions)
      ? opts.extensions.slice()
      : this._inferExtensions();
    this.permissions = Array.isArray(opts.permissions) ? opts.permissions.slice() : [];
    this.capabilities = Array.isArray(opts.capabilities) ? opts.capabilities.slice() : [];
    this.orbitAngle = opts.orbitAngle ?? Math.random() * Math.PI * 2;
    this.orbitSpeed = opts.orbitSpeed ?? (0.0015 + Math.random() * 0.003);
    this.orbitTilt = opts.orbitTilt ?? (0.6 + Math.random() * 0.4);
    this.depth = opts.depth ?? 0;
    this.displayRadius = this.r;
  }

  _inferExtensions() {
    const enabled = [];
    if (this.assets.length) enabled.push('assets');
    if (this.programs.length) enabled.push('programs');
    if (this.flow.length) enabled.push('flow');
    if (this.perception.length) enabled.push('perception');
    if (this.knowledge.length) enabled.push('knowledge');
    return enabled;
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
      bodyVisible: this.bodyVisible,
      showCore: this.showCore,
      type: this.type,
      assets: this.assets,
      programs: this.programs,
      flow: this.flow,
      perception: this.perception,
      knowledge: this.knowledge,
      extensions: this.extensions,
      permissions: this.permissions,
      capabilities: this.capabilities,
    };
  }

  update(scene) {
    const lerpFactor = this.parent ? GRAPHOS_LIVE.SIZE_LERP_CHILD : GRAPHOS_LIVE.SIZE_LERP;
    this.r += (this.targetR - this.r) * lerpFactor;

    const targetHover = this.hover ? 1 : 0;
    this.hoverFactor += (targetHover - this.hoverFactor) * 0.12;
    const targetOverlap = this.overlapCandidate ? 1 : 0;
    this.overlapFactor += (targetOverlap - this.overlapFactor) * 0.1;

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
    const minAllowedBase = this.bodyVisible ? innerCoreRadius + GRAPHOS_LIVE.CORE_PADDING : GRAPHOS_LIVE.CORE_PADDING;
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

      if (this.bodyVisible) {
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

  draw(ctx, focusLayer, scene) {
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

    if (this.overlapFactor > 0.01 && !this.hover && !this.selected) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = this.overlapFactor * 0.42;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius + 5 + this.overlapFactor * 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

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

    if (this.bodyVisible && this.color) {
      const coreRadius = displayRadius * GRAPHOS_LIVE.CORE_RATIO * (1 + this.hoverFactor * 0.15);
      const coreRgb = scene ? scene._hexToRgb(this.color) : [124, 160, 255];
      const corePulse = 0.5 + 0.5 * Math.sin((scene?.t || 0) * 1.8 + (this.createdAt % 997) * 0.01);
      const coreGradient = ctx.createRadialGradient(
        this.x - coreRadius * 0.36,
        this.y - coreRadius * 0.42,
        coreRadius * 0.08,
        this.x,
        this.y,
        coreRadius * 1.28,
      );
      coreGradient.addColorStop(0, 'rgba(255,255,255,0.98)');
      coreGradient.addColorStop(0.18, `rgba(${coreRgb[0]},${coreRgb[1]},${coreRgb[2]},0.98)`);
      coreGradient.addColorStop(0.62, `rgba(${coreRgb[0]},${coreRgb[1]},${coreRgb[2]},0.54)`);
      coreGradient.addColorStop(1, 'rgba(2,5,12,0.28)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowColor = `rgba(${coreRgb[0]},${coreRgb[1]},${coreRgb[2]},0.44)`;
      ctx.shadowBlur = 12 + corePulse * 8 + (this.selected ? 8 : 0);
      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius * (1.75 + corePulse * 0.18), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${coreRgb[0]},${coreRgb[1]},${coreRgb[2]},${0.16 + corePulse * 0.1})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius * 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.16 + this.hoverFactor * 0.2 + (this.selected ? 0.12 : 0)})`;
      ctx.lineWidth = 1.1 + this.hoverFactor * 0.8;
      ctx.stroke();

      ctx.save();
      ctx.globalAlpha = 0.28 + this.hoverFactor * 0.18 + (this.selected ? 0.12 : 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.74)';
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.moveTo(this.x - coreRadius * 0.58, this.y);
      ctx.lineTo(this.x + coreRadius * 0.58, this.y);
      ctx.moveTo(this.x, this.y - coreRadius * 0.58);
      ctx.lineTo(this.x, this.y + coreRadius * 0.58);
      ctx.stroke();
      ctx.restore();
    } else if (this.color) {
      const coreRadius = Math.max(2.4, displayRadius * GRAPHOS_LIVE.CORE_RATIO * 0.62);
      const coreRgb = scene ? scene._hexToRgb(this.color) : [124, 160, 255];
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius * 1.9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${coreRgb[0]},${coreRgb[1]},${coreRgb[2]},0.12)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${coreRgb[0]},${coreRgb[1]},${coreRgb[2]},0.34)`;
      ctx.fill();
      ctx.restore();
    }

    if (this.children.length > 0) {
      ctx.globalAlpha = 0.12 + this.hoverFactor * 0.08;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const shouldDrawLabel = this.selected || this.hover || this.depth <= 1 || (scene?.nodes?.length || 0) <= 14;
    if (shouldDrawLabel) {
      ctx.save();
      if (this.selected || this.hover) {
        ctx.shadowColor = 'rgba(255,255,255,0.18)';
        ctx.shadowBlur = 7;
      }
      ctx.fillStyle = this.selected || this.hover ? 'rgba(246,248,252,0.96)' : 'rgba(232,236,244,0.82)';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.name, this.x, this.y + displayRadius + 14);
      ctx.restore();
    }

    if (this.type && (this.selected || this.hover || this.depth === 0)) {
      ctx.save();
      if (this.selected || this.hover) {
        ctx.shadowColor = 'rgba(255,255,255,0.14)';
        ctx.shadowBlur = 5;
      }
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.fillText(this.type, this.x, this.y - displayRadius - 12);
      ctx.restore();
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
    this.explorer = {
      search: '',
      activeTab: 'contents',
      activeExtension: 'assets',
      openNodeIds: new Set(),
    };
    this.eventLog = [];
    this.runtimePreview = {
      rotationX: 0.24,
      rotationY: -0.48,
      targetRotationX: 0.24,
      targetRotationY: -0.48,
      targetZoom: 1,
      zoom: 1,
      dragging: false,
      pointerId: null,
      dragMoved: false,
      startX: 0,
      startY: 0,
      startRotationX: 0,
      startRotationY: 0,
      hoverKey: null,
      hoverLabel: '',
      hoverKind: null,
      hoverNode: null,
      lastCanvasRect: null,
      targetKey: null,
      selectedNodeId: null,
      transition: 1,
      dirty: true,
      lastDrawAt: 0,
      resizeRaf: null,
    };
    this.selectedNodes = new Set();
    this.selectedLink = null;
    this.hoveredNode = null;
    this.hoveredLink = null;
    this.hoveredNodeStack = [];
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
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCtx = this.backgroundCanvas.getContext('2d');
    this.backgroundCacheKey = '';
    this.linkFrameSkip = 0;
    this.coreNode = null;
    this.mobileExpanded = false;
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
      toggleMobilePanel: () => this._toggleMobilePanel(),
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
      explorerSearch: () => {
        this.explorer.search = graphosExplorerSearchEl ? graphosExplorerSearchEl.value.trim().toLowerCase() : '';
        this._refreshUi();
      },
      explorerTab: e => {
        const tab = e?.target?.closest?.('[data-explorer-tab]')?.dataset.explorerTab || null;
        if (!tab) return;
        this.explorer.activeTab = tab;
        this._refreshUi();
      },
      explorerNodeClick: e => this._onExplorerNodeClick(e),
      previewPointerDown: e => this._onExplorerPreviewPointerDown(e),
      previewPointerMove: e => this._onExplorerPreviewPointerMove(e),
      previewPointerUp: e => this._onExplorerPreviewPointerUp(e),
      previewPointerLeave: () => this._onExplorerPreviewPointerLeave(),
      previewWheel: e => this._onExplorerPreviewWheel(e),
      previewClick: e => this._onExplorerPreviewClick(e),
      previewDoubleClick: e => this._onExplorerPreviewDoubleClick(e),
      graphosWheel: e => stopGraphosWheel(e),
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

  _isCompactMobile() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches || window.innerWidth < 900;
  }

  _setMobilePanelOpen(open) {
    if (this._isCompactMobile()) {
      this.mobileExpanded = false;
      if (activeSlideEl && activeSlideEl.dataset.slide === 'graphos') {
        activeSlideEl.classList.remove('is-mobile-open');
      }
      if (graphosNoteEl) {
        graphosNoteEl.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    this.mobileExpanded = !!open;
    if (activeSlideEl && activeSlideEl.dataset.slide === 'graphos') {
      activeSlideEl.classList.toggle('is-mobile-open', this.mobileExpanded);
    }
    if (graphosNoteEl) {
      graphosNoteEl.setAttribute('aria-expanded', this.mobileExpanded ? 'true' : 'false');
    }
  }

  _syncMobilePanelState() {
    if (!this._isCompactMobile()) {
      this._setMobilePanelOpen(false);
      return;
    }
    this._setMobilePanelOpen(this.mobileExpanded);
  }

  _toggleMobilePanel(force) {
    if (!this._isCompactMobile()) return;
    const next = typeof force === 'boolean' ? force : !this.mobileExpanded;
    this._setMobilePanelOpen(next);
  }

  _bindUi() {
    const stopPropagation = e => e.stopPropagation();

    if (graphosNoteEl) {
      graphosNoteEl.setAttribute('role', 'button');
      graphosNoteEl.setAttribute('tabindex', '0');
      graphosNoteEl.setAttribute('aria-expanded', 'false');
      graphosNoteEl.addEventListener('click', this._bound.toggleMobilePanel);
      graphosNoteEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._bound.toggleMobilePanel();
        }
      });
    }

    if (graphosContextMenuEl) {
      graphosContextMenuEl.addEventListener('wheel', stopPropagation, { passive: true });
      graphosContextMenuEl.addEventListener('touchstart', stopPropagation, { passive: true });
      graphosContextMenuEl.addEventListener('touchmove', stopPropagation, { passive: true });
      graphosContextMenuEl.addEventListener('touchend', stopPropagation, { passive: true });
      graphosContextMenuEl.addEventListener('pointerdown', e => e.stopPropagation());
    }

    if (graphosColorPickerEl) {
      graphosColorPickerEl.addEventListener('wheel', stopPropagation, { passive: true });
      graphosColorPickerEl.addEventListener('touchstart', stopPropagation, { passive: true });
      graphosColorPickerEl.addEventListener('touchmove', stopPropagation, { passive: true });
      graphosColorPickerEl.addEventListener('touchend', stopPropagation, { passive: true });
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

    if (graphosExplorerSearchEl) {
      graphosExplorerSearchEl.addEventListener('input', this._bound.explorerSearch);
    }

    if (graphosExplorerTabsEl) {
      graphosExplorerTabsEl.addEventListener('click', this._bound.explorerTab);
    }

    if (graphosExplorerListEl) {
      graphosExplorerListEl.addEventListener('click', this._bound.explorerNodeClick);
    }

    if (graphosColorWheelEl) {
      graphosColorWheelEl.addEventListener('pointermove', this._bound.colorWheelMove);
      graphosColorWheelEl.addEventListener('pointerdown', this._bound.colorWheelDown);
    }

if (graphosWindowHandleEl) {
  graphosWindowHandleEl.addEventListener('click', e => {
    if (!this._isCompactMobile()) return;
    e.preventDefault();
    this._setMobilePanelOpen(false);
  });
}

if (graphosWindowEl) {
  graphosWindowEl.addEventListener('pointerdown', beginGraphosWindowInteraction);
  graphosWindowEl.addEventListener('pointermove', syncGraphosWindowHoverState, { passive: true });
  graphosWindowEl.addEventListener('pointerleave', clearGraphosWindowHoverState);
  graphosWindowEl.addEventListener('wheel', this._bound.graphosWheel, { passive: false });
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
    this._syncMobilePanelState();
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
      bodyVisible: true,
      maxRadius: 180,
      depth: 0,
      permissions: ['read', 'contain', 'link', 'inspect'],
      capabilities: ['Compose runtime', 'Host children', 'Emit relations'],
      extensions: ['programs', 'flow', 'knowledge'],
      programs: ['kernel-router', 'policy-shell'],
      flow: ['ownership-route', 'policy-gate', 'projection-sync'],
      knowledge: ['core-schema', 'admin-protocol'],
    });
    const publicNode = this.createNode(cx + 126, cy - 74, {
      name: 'Public',
      type: 'public',
      color: '#f4f7ff',
      baseR: 14,
      r: 14,
      bodyVisible: false,
      permissions: ['read'],
      extensions: ['flow'],
      flow: ['public-projection'],
    });
    const userNode = this.createNode(cx - 66, cy - 54, {
      name: 'User',
      type: 'user',
      color: '#9fe4ff',
      baseR: 13,
      r: 13,
      bodyVisible: false,
      permissions: ['read', 'navigate'],
      extensions: ['perception', 'knowledge'],
      perception: ['presence-signal', 'session-context'],
      knowledge: ['identity-profile'],
    });
    const workspaceNode = this.createNode(cx + 12, cy - 22, {
      name: 'Workspace',
      type: 'workspace',
      color: '#ffd18e',
      baseR: 12,
      r: 12,
      bodyVisible: true,
      assets: ['workspace-manifest', 'runtime-index'],
      programs: ['shell', 'router'],
      extensions: ['assets', 'programs', 'flow', 'knowledge'],
      flow: ['workspace-open', 'asset-routing'],
      knowledge: ['workspace-policy', 'project-memory'],
    });
    const surfaceNode = this.createNode(this.w * 0.82, this.h * 0.27, {
      name: 'Surface',
      type: 'surface',
      color: '#ffffff',
      baseR: 13,
      r: 13,
      bodyVisible: false,
      extensions: ['flow', 'perception'],
      flow: ['render-projection'],
      perception: ['viewport-state'],
    });
    const contextNode = this.createNode(this.w * 0.18, this.h * 0.29, {
      name: 'Environment',
      type: 'context',
      color: '#c3b2ff',
      baseR: 12,
      r: 12,
      bodyVisible: false,
      permissions: ['read', 'configure'],
      extensions: ['perception', 'knowledge'],
      perception: ['environment-scan', 'policy-context'],
      knowledge: ['semantic-registry'],
    });
    const intentNode = this.createNode(this.w * 0.50, this.h * 0.84, {
      name: 'Action',
      type: 'intent',
      color: '#9ae6c7',
      baseR: 11,
      r: 11,
      bodyVisible: true,
      programs: ['intent-pipeline'],
      extensions: ['programs', 'flow'],
      flow: ['intent-route', 'effect-dispatch'],
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
      bodyVisible: source.bodyVisible,
      showCore: source.showCore,
      orbitAngle: source.orbitAngle + 0.5,
      orbitSpeed: source.orbitSpeed,
      orbitTilt: source.orbitTilt,
      createdAt: source.createdAt,
      assets: Array.isArray(source.assets) ? source.assets.slice() : [],
      programs: Array.isArray(source.programs) ? source.programs.slice() : [],
      permissions: Array.isArray(source.permissions) ? source.permissions.slice() : [],
      capabilities: Array.isArray(source.capabilities) ? source.capabilities.slice() : [],
      extensions: Array.isArray(source.extensions) ? source.extensions.slice() : [],
      flow: Array.isArray(source.flow) ? source.flow.slice() : [],
      perception: Array.isArray(source.perception) ? source.perception.slice() : [],
      knowledge: Array.isArray(source.knowledge) ? source.knowledge.slice() : [],
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
        bodyVisible: item.bodyVisible ?? item.showCore ?? true,
        showCore: item.showCore ?? item.bodyVisible ?? true,
        type: item.type,
        assets: Array.isArray(item.assets) ? item.assets : [],
        programs: Array.isArray(item.programs) ? item.programs : [],
        flow: Array.isArray(item.flow) ? item.flow : [],
        perception: Array.isArray(item.perception) ? item.perception : [],
        knowledge: Array.isArray(item.knowledge) ? item.knowledge : [],
        extensions: Array.isArray(item.extensions) ? item.extensions : undefined,
        permissions: Array.isArray(item.permissions) ? item.permissions : [],
        capabilities: Array.isArray(item.capabilities) ? item.capabilities : [],
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
    const inspectorTarget = this._getInspectorTarget();
    const inspectorNode = inspectorTarget && inspectorTarget.a && inspectorTarget.b ? null : inspectorTarget;
    if (graphosWindowEl) {
      const rgb = this._hexToRgb(inspectorNode?.color || '#7ca0ff');
      graphosWindowEl.style.setProperty('--node-accent', inspectorNode?.color || '#7ca0ff');
      graphosWindowEl.style.setProperty('--node-accent-rgb', rgb.join(', '));
      graphosWindowEl.dataset.inspector = inspectorNode?.type || (inspectorTarget ? 'relation' : 'idle');
      graphosWindowEl.classList.toggle('is-inspecting', !!inspectorTarget);
    }

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
        graphosSelectionInfoEl.textContent = `${node.name || 'Vertex'} · ${node.type || 'untitled'}`;
      } else if (selectedCount > 1) {
        graphosSelectionInfoEl.textContent = `${selectedCount} selected`;
      } else if (this.selectedLink) {
        const label = `${this.selectedLink.a?.name || 'Vertex'} ↔ ${this.selectedLink.b?.name || 'Vertex'}`;
        graphosSelectionInfoEl.textContent = label;
      } else {
        graphosSelectionInfoEl.textContent = `${this.nodes.length} vertices · ${this.links.length} ties`;
      }
    }

    if (graphosTypeFilterEl) {
      graphosTypeFilterEl.value = this.view.activeType || '';
    }

    this._renderExplorer();
  }

  _getVisibleNodes() {
    const filtered = this.nodes.filter(node => !this.view.activeType || node.type === this.view.activeType);
    return [...filtered].sort((a, b) => {
      const selectedA = this.selectedNodes.has(a) ? 0 : 1;
      const selectedB = this.selectedNodes.has(b) ? 0 : 1;
      if (selectedA !== selectedB) return selectedA - selectedB;
      const typeA = a.type || '';
      const typeB = b.type || '';
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  _getInspectorTarget() {
    if (this.selectedNodes.size > 0) return [...this.selectedNodes][0];
    if (this.selectedLink) return this.selectedLink;
    return this.coreNode || this.nodes[0] || null;
  }

  _hexToRgb(hex) {
    const fallback = [124, 160, 255];
    if (!hex || typeof hex !== 'string') return fallback;
    const normalized = hex.trim().replace(/^#/, '');
    if (!/^[0-9a-fA-F]{3,8}$/.test(normalized)) return fallback;
    const expanded = normalized.length === 3
      ? normalized.split('').map(ch => ch + ch).join('')
      : normalized.slice(0, 6);
    const value = Number.parseInt(expanded, 16);
    if (!Number.isFinite(value)) return fallback;
    return [
      (value >> 16) & 255,
      (value >> 8) & 255,
      value & 255,
    ];
  }

  _createExplorerPill(text, className = 'graphos-explorer__chip') {
    const chip = document.createElement('span');
    chip.className = className;
    chip.textContent = text;
    return chip;
  }

  _createExplorerFact(label, value) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    return [dt, dd];
  }

  _createRuntimeHudItem(label, value, options = {}) {
    const item = document.createElement('div');
    item.className = 'graphos-explorer__runtime-metric';
    if (options.wide) item.classList.add('graphos-explorer__runtime-metric--wide');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    item.append(dt, dd);
    return item;
  }

  _getNodeBodyVisible(node) {
    return node?.bodyVisible ?? node?.showCore ?? true;
  }

  _getNodeScopeLabel(node, children, incoming, outgoing) {
    if (!node.parent) return 'Root';
    if ((node.type || '').toLowerCase() === 'core' || children.length > 2 || outgoing.length > 2) return 'Hub';
    if (!children.length && !incoming.length && !outgoing.length) return 'Isolated';
    if (!children.length) return 'Leaf';
    return 'Branch';
  }

  _normalizeRuntimeList(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  }

  _inferRuntimeKind(entry, fallback = 'vertex') {
    const label = typeof entry === 'string'
      ? entry
      : `${entry?.kind || ''} ${entry?.type || ''} ${entry?.name || ''} ${entry?.label || ''}`;
    const lower = label.toLowerCase();
    if (lower.includes('program') || lower.includes('shell') || lower.includes('router') || lower.includes('intent')) return 'program';
    if (lower.includes('asset') || lower.includes('image') || lower.includes('video') || lower.includes('audio') || lower.includes('document') || lower.includes('model') || lower.includes('file')) return 'asset';
    if (lower.includes('permission') || lower.includes('read') || lower.includes('write') || lower.includes('link') || lower.includes('navigate') || lower.includes('configure')) return 'permission';
    return fallback;
  }

  _describeRuntimeEntry(entry, index = 0) {
    if (typeof entry === 'string') {
      return {
        key: `${entry}-${index}`,
        label: entry,
        kind: this._inferRuntimeKind(entry),
        value: entry,
      };
    }
    const label = entry?.label || entry?.name || entry?.type || entry?.kind || `Item ${index + 1}`;
    const kind = this._inferRuntimeKind(entry, entry?.kind || 'vertex');
    return {
      key: entry?.id || `${label}-${index}`,
      label,
      kind,
      value: entry,
    };
  }

  _getNodeRuntimeModel(node, children, incoming, outgoing) {
    const childEntries = children.map((child, index) => this._describeRuntimeEntry({
      id: child.id,
      name: child.name || `Child ${index + 1}`,
      type: child.type || 'vertex',
      kind: 'vertex',
      color: child.color,
      node: child,
    }, index));
    const assetEntries = this._normalizeRuntimeList(node.assets).map((item, index) => this._describeRuntimeEntry(item, index));
    const programEntries = this._normalizeRuntimeList(node.programs).map((item, index) => this._describeRuntimeEntry(item, index));
    const flowEntries = this._normalizeRuntimeList(node.flow).map((item, index) => this._describeRuntimeEntry(item, index));
    const perceptionEntries = this._normalizeRuntimeList(node.perception).map((item, index) => this._describeRuntimeEntry(item, index));
    const knowledgeEntries = this._normalizeRuntimeList(node.knowledge).map((item, index) => this._describeRuntimeEntry(item, index));
    const permissionEntries = this._normalizeRuntimeList(node.permissions).map((item, index) => this._describeRuntimeEntry(item, index));
    const capabilityEntries = this._normalizeRuntimeList(node.capabilities).map((item, index) => this._describeRuntimeEntry(item, index));
    const extensionKeys = this._getEnabledExtensionKeys(node);
    const operationCount = childEntries.length + assetEntries.length + programEntries.length + flowEntries.length + perceptionEntries.length + knowledgeEntries.length + permissionEntries.length + capabilityEntries.length + incoming.length + outgoing.length;
    const continuity = Math.round(clamp(
      58
        + (this._getNodeBodyVisible(node) ? 10 : -4)
        + Math.min(16, children.length * 4)
        + Math.min(10, (incoming.length + outgoing.length) * 2)
        + Math.min(6, programEntries.length * 2),
      22,
      99,
    ));
    return {
      bodyVisible: this._getNodeBodyVisible(node),
      childEntries,
      assetEntries,
      programEntries,
      flowEntries,
      perceptionEntries,
      knowledgeEntries,
      permissionEntries,
      capabilityEntries,
      extensionKeys,
      incoming,
      outgoing,
      operationCount,
      continuity,
    };
  }

  _getNodeRuntimeSummary(node, children, incoming, outgoing) {
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);
    const hosted = model.childEntries.length + model.assetEntries.length + model.programEntries.length;
    const activeExtensions = model.extensionKeys
      .map(key => this._getExtensionDef(key).label)
      .filter(Boolean);
    const parentName = node.parent?.name || 'Root graph';
    const weight = model.operationCount + hosted + incoming.length + outgoing.length + (model.bodyVisible ? 2 : 0);
    return [
      ['Name', node.name || 'Vertex'],
      ['Type', node.type || 'Untyped'],
      ['Parent', parentName],
      ['Weight', `${weight} units`],
      ['Runtime', model.bodyVisible ? 'Core exposed' : 'Membrane only'],
      ['Links', `${incoming.length} in / ${outgoing.length} out`],
      ['Hosted', `${children.length} child${children.length === 1 ? '' : 'ren'} / ${model.assetEntries.length} assets / ${model.programEntries.length} programs`],
      ['Active extensions', activeExtensions.length ? activeExtensions.join(', ') : 'None'],
    ];
  }

  _getExtensionDef(key) {
    return GRAPHOS_EXTENSION_DEFS.find(def => def.key === key) || GRAPHOS_EXTENSION_DEFS[0];
  }

  _getEnabledExtensionKeys(node) {
    if (!node) return [];
    const enabled = new Set(Array.isArray(node.extensions) ? node.extensions : []);
    if (Array.isArray(node.assets) && node.assets.length) enabled.add('assets');
    if (Array.isArray(node.programs) && node.programs.length) enabled.add('programs');
    if (Array.isArray(node.flow) && node.flow.length) enabled.add('flow');
    if (Array.isArray(node.perception) && node.perception.length) enabled.add('perception');
    if (Array.isArray(node.knowledge) && node.knowledge.length) enabled.add('knowledge');
    return GRAPHOS_EXTENSION_DEFS.map(def => def.key).filter(key => enabled.has(key));
  }

  _isExtensionEnabled(node, key) {
    return this._getEnabledExtensionKeys(node).includes(key);
  }

  _setExtensionEnabled(node, key, enabled = true) {
    if (!node || !key) return;
    const set = new Set(Array.isArray(node.extensions) ? node.extensions : []);
    if (enabled) set.add(key);
    else set.delete(key);
    node.extensions = GRAPHOS_EXTENSION_DEFS.map(def => def.key).filter(item => set.has(item));
  }

  _getExtensionEntries(node, key) {
    if (!node) return [];
    const list = key === 'assets'
      ? node.assets
      : key === 'programs'
        ? node.programs
        : key === 'flow'
          ? node.flow
          : key === 'perception'
            ? node.perception
            : key === 'knowledge'
              ? node.knowledge
              : [];
    const def = this._getExtensionDef(key);
    return this._normalizeRuntimeList(list).map((item, index) => {
      if (typeof item === 'string') {
        return this._describeRuntimeEntry({ id: `${key}-${item}-${index}`, label: item, kind: def.kind }, index);
      }
      return this._describeRuntimeEntry({ ...item, kind: item?.kind || def.kind }, index);
    });
  }

  _toggleExplorerExtension(node, key) {
    if (!node || !key) return;
    const enabled = this._isExtensionEnabled(node, key);
    this.explorer.activeExtension = key;
    if (!enabled) {
      this._setExtensionEnabled(node, key, true);
      this._logExplorerEvent('extension-enabled', node, this._getExtensionDef(key).label);
      this.saveGraph();
    } else {
      const entries = this._getExtensionEntries(node, key);
      this._logExplorerEvent(entries.length ? 'extension-opened' : 'extension-ready', node, this._getExtensionDef(key).label);
    }
    this._refreshUi();
  }

  _getNodeExtensions(node, children, links) {
    const { bodyVisible } = this._getNodeRuntimeModel(node, children, [], links);
    const extensions = [
      bodyVisible ? 'Body active' : 'Membrane only',
      children.length ? 'Containment field' : 'Leaf membrane',
      links.length ? 'Live relation mesh' : 'Detached runtime',
      node.parent ? `Nested in ${node.parent.name || 'Vertex'}` : 'Root boundary',
    ];
    if (node.type) {
      extensions.push(`${node.type} adapter`);
    }
    if (node.selected) {
      extensions.push('Focus lock');
    }
    return extensions;
  }

  _getNodeAssets(node, children, links) {
    const model = this._getNodeRuntimeModel(node, children, [], links);
    const assets = [
      `${Math.round(node.r)} px shell`,
      `${Math.round(node.baseR)} px base`,
      `${model.childEntries.length} child${model.childEntries.length === 1 ? '' : 'ren'}`,
      `${model.assetEntries.length} asset${model.assetEntries.length === 1 ? '' : 's'}`,
      `${model.programEntries.length} program${model.programEntries.length === 1 ? '' : 's'}`,
    ];
    if (model.assetEntries.length) {
      assets.push(...model.assetEntries.slice(0, 4).map(item => item.label));
    }
    return assets;
  }

  _getNodeLinkBuckets(node, links) {
    const incoming = [];
    const outgoing = [];

    links.forEach(link => {
      if (link.a === node && link.b) {
        outgoing.push(link.b);
      } else if (link.b === node && link.a) {
        incoming.push(link.a);
      }
    });

    if (node.parent && !incoming.includes(node.parent)) {
      incoming.unshift(node.parent);
    }
    node.children.forEach(child => {
      if (!outgoing.includes(child)) outgoing.push(child);
    });

    const sortByName = (a, b) => (a?.name || '').localeCompare(b?.name || '');
    incoming.sort(sortByName);
    outgoing.sort(sortByName);
    return { incoming, outgoing };
  }

  _logExplorerEvent(kind, node = null, detail = '') {
    const entry = {
      kind,
      nodeId: node?.id || null,
      nodeName: node?.name || 'Vertex',
      detail,
      at: Date.now(),
    };
    this.eventLog.unshift(entry);
    this.eventLog = this.eventLog.slice(0, 40);
  }

  _getExplorerRoots() {
    return this.nodes
      .filter(node => !node.parent)
      .sort((a, b) => {
        const typeA = a.type || '';
        const typeB = b.type || '';
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return (a.name || '').localeCompare(b.name || '');
      });
  }

  _getExplorerSelectedNode() {
    return this.selectedNodes.size ? [...this.selectedNodes][0] : null;
  }

  _getExplorerSearchValue() {
    return (this.explorer.search || '').trim().toLowerCase();
  }

  _nodeMatchesExplorer(node, search, activeType) {
    if (activeType && node.type !== activeType) return false;
    if (!search) return true;
    const haystack = `${node.name || ''} ${node.type || ''} ${node.id || ''}`.toLowerCase();
    return haystack.includes(search);
  }

  _subtreeMatchesExplorer(node, search, activeType) {
    if (this._nodeMatchesExplorer(node, search, activeType)) return true;
    return node.children.some(child => this._subtreeMatchesExplorer(child, search, activeType));
  }

  _isAncestorNode(node, descendant) {
    let current = descendant;
    while (current) {
      if (current === node) return true;
      current = current.parent;
    }
    return false;
  }

  _openExplorerPath(node) {
    if (!node) return;
    if (node.children.length) this.explorer.openNodeIds.add(node.id);
    let current = node.parent;
    while (current) {
      this.explorer.openNodeIds.add(current.id);
      current = current.parent;
    }
  }

  _toggleExplorerNodeOpen(node) {
    if (!node || !node.children.length) return;
    if (this.explorer.openNodeIds.has(node.id)) {
      this.explorer.openNodeIds.delete(node.id);
    } else {
      this.explorer.openNodeIds.add(node.id);
    }
    this._refreshUi();
  }

  _getNodeCapabilities(node, children, incoming, outgoing) {
    const capabilities = [];
    capabilities.push('Inspect');
    capabilities.push('Retype');
    capabilities.push('Recolor');
    capabilities.push(this._getNodeBodyVisible(node) ? 'Compress body' : 'Expand body');
    capabilities.push(children.length ? 'Open descendants' : 'Create child');
    if (incoming.length || outgoing.length) capabilities.push('Trace relations');
    if (node.parent) capabilities.push('Reparent');
    capabilities.push(this._getNodeBodyVisible(node) ? 'Hide body' : 'Show body');
    capabilities.push('Duplicate');
    capabilities.push('Delete');
    return capabilities;
  }

  _getNodeProperties(node, children, incoming, outgoing) {
    const parentName = node.parent ? (node.parent.name || 'Vertex') : 'Root';
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);
    return [
      ['Name', node.name || 'Vertex'],
      ['Type', node.type || 'Untyped'],
      ['Scope', node.parent ? `Nested in ${parentName}` : 'Root node'],
      ['Status', model.bodyVisible ? 'Body visible' : 'Membrane only'],
      ['Children', String(children.length)],
      ['Incoming', String(incoming.length)],
      ['Outgoing', String(outgoing.length)],
      ['Assets', String(model.assetEntries.length)],
      ['Programs', String(model.programEntries.length)],
      ['Permissions', String(model.permissionEntries.length)],
      ['Radius', `${Math.round(node.r)} px`],
      ['Base', `${Math.round(node.baseR)} px`],
      ['Display', `${Math.round(node.displayRadius || node.r)} px`],
      ['Created', new Date(node.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
      ['ID', node.id.slice(0, 12)],
    ];
  }

  _getNodeHistory(node) {
    if (!node) return [];
    return this.eventLog.filter(entry => entry.nodeId === node.id).slice(0, 8);
  }

  _getGraphosFocusForNode(node) {
    const type = node?.type || '';
    if (type === 'surface' || type === 'public') return 'surface';
    if (type === 'environment' || type === 'user') return 'context';
    if (type === 'workspace') return 'group';
    if (type === 'action') return 'edge';
    return 'node';
  }

  _activateExplorerNode(node) {
    if (!node) return;
    this._selectSingle(node);
    this.explorer.activeTab = 'contents';
    const enabledExtensions = this._getEnabledExtensionKeys(node);
    if (enabledExtensions.length && !enabledExtensions.includes(this.explorer.activeExtension)) {
      this.explorer.activeExtension = enabledExtensions[0];
    }
    selectedGraphosLayer = this._getGraphosFocusForNode(node);
    syncGraphosFocusState();
  }

  _onExplorerNodeClick(e) {
    const row = e?.target?.closest?.('.graphos-tree__row');
    if (!row || !graphosExplorerListEl || !graphosExplorerListEl.contains(row)) return;
    if (e.target?.closest?.('.graphos-tree__toggle')) return;
    const node = this.nodes.find(item => item.id === row.dataset.nodeId);
    if (!node) return;
    e.preventDefault();
    this._activateExplorerNode(node);
  }

  _renderExplorerTreeNode(node, depth, search, activeType, selectedNode, fragment) {
    if (!this._subtreeMatchesExplorer(node, search, activeType)) return;

    const hasChildren = node.children.length > 0;
    const isOpen = this.explorer.openNodeIds.has(node.id) || this._isAncestorNode(node, selectedNode) || (search && hasChildren);
    const isSelected = selectedNode === node;

    const branch = document.createElement('div');
    branch.className = 'graphos-tree__branch';
    branch.style.setProperty('--tree-depth', String(depth));

    const row = document.createElement('div');
    row.className = 'graphos-tree__row';
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(depth + 1));
    row.setAttribute('aria-expanded', hasChildren ? (isOpen ? 'true' : 'false') : 'false');
    row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    row.dataset.selected = isSelected ? 'true' : 'false';
    row.dataset.open = isOpen ? 'true' : 'false';
    row.dataset.layer = node.type || 'node';
    row.dataset.nodeId = node.id;
    row.style.setProperty('--node-accent', node.color || '#7ca0ff');
    row.style.setProperty('--node-accent-rgb', this._hexToRgb(node.color || '#7ca0ff').join(', '));

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'graphos-tree__toggle';
    toggle.setAttribute('aria-label', hasChildren ? (isOpen ? 'Collapse node' : 'Expand node') : 'Leaf node');
    toggle.textContent = hasChildren ? (isOpen ? '▾' : '▸') : '•';
    toggle.disabled = !hasChildren;
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      this._toggleExplorerNodeOpen(node);
    });

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'graphos-tree__label';
    label.setAttribute('aria-label', `Select ${node.name || 'Vertex'}`);
    label.setAttribute('aria-current', isSelected ? 'true' : 'false');

    const name = document.createElement('strong');
    name.textContent = node.name || 'Vertex';

    const type = document.createElement('span');
    type.className = 'graphos-tree__type';
    const runtimeParts = [
      node.type || 'untitled',
      this._getNodeBodyVisible(node) ? 'core' : 'membrane',
      `${node.children.length} child${node.children.length === 1 ? '' : 'ren'}`,
    ];
    type.textContent = runtimeParts.join(' · ');

    label.append(name, type);
    label.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      this._activateExplorerNode(node);
    });

    const metrics = document.createElement('span');
    metrics.className = 'graphos-tree__metrics';
    metrics.textContent = `${node.programs?.length || 0}P/${node.assets?.length || 0}A`;
    metrics.title = 'Hosted programs / assets';

    row.append(toggle, label, metrics);
    branch.appendChild(row);
    fragment.appendChild(branch);

    if (hasChildren && isOpen) {
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'graphos-tree__children';
      node.children
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .forEach(child => this._renderExplorerTreeNode(child, depth + 1, search, activeType, selectedNode, childrenWrap));
      if (childrenWrap.childNodes.length) {
        branch.appendChild(childrenWrap);
      }
    }
  }

  _renderExplorerNodeList(nodes) {
    if (!graphosExplorerListEl) return;

    graphosExplorerListEl.innerHTML = '';
    const search = this._getExplorerSearchValue();
    const activeType = this.view.activeType;
    const selectedNode = this._getExplorerSelectedNode() || this.coreNode || null;
    if (selectedNode) this._openExplorerPath(selectedNode);
    if (!this.explorer.openNodeIds.size) {
      this._getExplorerRoots().forEach(root => this.explorer.openNodeIds.add(root.id));
    }

    const roots = this._getExplorerRoots();
    const visibleRoots = roots.filter(root => this._subtreeMatchesExplorer(root, search, activeType));
    if (!visibleRoots.length) {
      const empty = document.createElement('div');
      empty.className = 'graphos-explorer__empty';
      empty.textContent = search
        ? 'No vertices match the current search.'
        : (this.view.activeType ? `No vertices match "${this.view.activeType}".` : 'No vertices available.');
      graphosExplorerListEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    visibleRoots.forEach(root => this._renderExplorerTreeNode(root, 0, search, activeType, selectedNode, fragment));
    graphosExplorerListEl.appendChild(fragment);
  }

  _renderExplorerSelection(target) {
    if (!graphosExplorerSelectionEl) return;
    graphosExplorerSelectionEl.innerHTML = '';

    const node = target && target.a && target.b ? null : target;
    const links = node ? this.links.filter(link => link.a === node || link.b === node) : [];
    const children = node ? node.children.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [];
    const parentName = node?.parent ? (node.parent.name || 'Vertex') : 'Root';
    const rgb = this._hexToRgb(node?.color || '#7ca0ff');
    graphosExplorerSelectionEl.style.setProperty('--node-accent', node?.color || '#7ca0ff');
    graphosExplorerSelectionEl.style.setProperty('--node-accent-rgb', rgb.join(', '));

    const card = document.createElement('div');
    card.className = 'graphos-explorer__selection-card';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'graphos-explorer__eyebrow';
    eyebrow.textContent = node ? 'Selected Vertex' : 'Selected Relation';

    const title = document.createElement('h3');
    title.className = 'graphos-explorer__title';
    title.textContent = node ? (node.name || 'Vertex') : `${target?.a?.name || 'Vertex'} ↔ ${target?.b?.name || 'Vertex'}`;

    const body = document.createElement('p');
    body.className = 'graphos-explorer__body';
    body.textContent = node
      ? `${node.type || 'Untyped'} · ${node.parent ? `Nested in ${parentName}` : 'Root node'} · ${children.length} child${children.length === 1 ? '' : 'ren'} · ${links.length} relation${links.length === 1 ? '' : 's'}`
      : 'A direct relation between two vertices.';

    const chips = document.createElement('div');
    chips.className = 'graphos-explorer__chips graphos-explorer__chips--wrap';
    const telemetry = document.createElement('dl');
    telemetry.className = 'graphos-explorer__telemetry';
    if (node) {
      const { incoming, outgoing } = this._getNodeLinkBuckets(node, links);
      const summary = this._getNodeRuntimeSummary(node, children, incoming, outgoing);
      chips.append(
        this._createExplorerPill(node.type || 'untitled', 'graphos-explorer__chip graphos-explorer__chip--accent'),
        this._createExplorerPill(node.parent ? 'Nested' : 'Root', 'graphos-explorer__chip graphos-explorer__chip--muted'),
        this._createExplorerPill(this._getNodeBodyVisible(node) ? 'Body visible' : 'Membrane only'),
        this._createExplorerPill(`${children.length} child${children.length === 1 ? '' : 'ren'}`),
      );
      summary.slice(0, 4).forEach(([label, value]) => telemetry.append(...this._createExplorerFact(label, value)));
    } else {
      chips.append(
        this._createExplorerPill('Tie'),
        this._createExplorerPill('Relation'),
      );
      [
        ['From', target?.a?.name || 'Vertex'],
        ['To', target?.b?.name || 'Vertex'],
        ['Mode', 'Directed context'],
        ['State', 'Linked'],
      ].forEach(([label, value]) => telemetry.append(...this._createExplorerFact(label, value)));
    }
    card.append(eyebrow, title, body, chips, telemetry);
    graphosExplorerSelectionEl.appendChild(card);
  }

  _renderExplorerTabs(target) {
    if (!graphosExplorerTabsEl) return;
    graphosExplorerTabsEl.innerHTML = '';
    graphosExplorerTabsEl.className = 'graphos-explorer__tabs graphos-explorer__extensions';
    const node = target && target.a && target.b ? null : target;
    if (graphosWindowModeEl) {
      graphosWindowModeEl.textContent = node?.name || 'No vertex';
      graphosWindowModeEl.dataset.enabled = node ? 'true' : 'false';
    }
    const title = document.createElement('p');
    title.className = 'graphos-explorer__section-label graphos-explorer__extensions-title';
    title.textContent = 'Extensions';
    graphosExplorerTabsEl.appendChild(title);

    GRAPHOS_EXTENSION_DEFS.forEach(def => {
      const enabled = node ? this._isExtensionEnabled(node, def.key) : false;
      const entries = node ? this._getExtensionEntries(node, def.key) : [];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'graphos-explorer__tab graphos-explorer__extension-toggle';
      button.dataset.explorerExtension = def.key;
      button.dataset.enabled = enabled ? 'true' : 'false';
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.setAttribute('aria-selected', this.explorer.activeExtension === def.key ? 'true' : 'false');
      button.disabled = !node;
      const label = document.createElement('strong');
      label.textContent = def.label;
      const meta = document.createElement('span');
      meta.textContent = enabled ? (entries.length ? `${entries.length} item${entries.length === 1 ? '' : 's'}` : 'active') : 'off';
      button.append(label, meta);
      button.addEventListener('click', () => this._toggleExplorerExtension(node, def.key));
      graphosExplorerTabsEl.appendChild(button);
    });
  }

  _renderExplorerPanel(target) {
    if (!graphosExplorerDetailEl) return;
    graphosExplorerDetailEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__panel';
    panel.dataset.panelKey = target?.id || `${target?.a?.id || 'a'}-${target?.b?.id || 'b'}`;

    if (!target) {
      const empty = document.createElement('p');
      empty.className = 'graphos-explorer__empty';
      empty.textContent = 'Select a vertex to inspect its runtime state.';
      panel.appendChild(empty);
      graphosExplorerDetailEl.appendChild(panel);
      return;
    }

    if (target.a && target.b) {
      panel.append(this._renderExplorerRelationPanel(target));
      graphosExplorerDetailEl.appendChild(panel);
      return;
    }

    const node = target;
    const links = this.links.filter(link => link.a === node || link.b === node);
    const children = node.children.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const rgb = this._hexToRgb(node.color);
    const { incoming, outgoing } = this._getNodeLinkBuckets(node, links);
    const activeExtension = GRAPHOS_EXTENSION_DEFS.some(def => def.key === this.explorer.activeExtension)
      ? this.explorer.activeExtension
      : 'assets';
    this.explorer.activeExtension = activeExtension;

    graphosExplorerDetailEl.style.setProperty('--node-accent', node.color || '#7ca0ff');
    graphosExplorerDetailEl.style.setProperty('--node-accent-rgb', rgb.join(', '));

    const sectionLabel = document.createElement('p');
    sectionLabel.className = 'graphos-explorer__section-label';
    sectionLabel.textContent = 'Node runtime';
    panel.appendChild(sectionLabel);
    panel.append(this._renderExplorerContents(node, children, incoming, outgoing));
    panel.append(this._renderExtensionPanel(node, activeExtension));

    graphosExplorerDetailEl.appendChild(panel);
  }

  _renderExplorerRelationPanel(target) {
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__relation-card';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'graphos-explorer__eyebrow';
    eyebrow.textContent = 'Selected Relation';
    const title = document.createElement('h3');
    title.className = 'graphos-explorer__title';
    title.textContent = `${target.a?.name || 'Vertex'} ↔ ${target.b?.name || 'Vertex'}`;
    const body = document.createElement('p');
    body.className = 'graphos-explorer__body';
    body.textContent = 'This relation links two vertices in the runtime graph.';
    const facts = document.createElement('dl');
    facts.className = 'graphos-explorer__facts';
    [
      ['From', target.a?.name || 'Vertex'],
      ['To', target.b?.name || 'Vertex'],
      ['Type', 'Tie'],
    ].forEach(([label, value]) => facts.append(...this._createExplorerFact(label, value)));
    panel.append(eyebrow, title, body, facts);
    return panel;
  }

  _renderExplorerContents(node, children, incoming, outgoing) {
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);
    const wrapper = document.createElement('div');
    wrapper.className = 'graphos-explorer__stack graphos-explorer__contents';

    const previewShell = document.createElement('section');
    previewShell.className = 'graphos-explorer__preview-shell';

    const previewHeader = document.createElement('div');
    previewHeader.className = 'graphos-explorer__preview-header';
    const previewKicker = document.createElement('p');
    previewKicker.className = 'graphos-explorer__section-label';
    previewKicker.textContent = 'Containment View';
    const previewMeta = document.createElement('div');
    previewMeta.className = 'graphos-explorer__chips';
    previewMeta.append(
      this._createExplorerPill(model.bodyVisible ? 'Body visible' : 'Membrane only', 'graphos-explorer__chip graphos-explorer__chip--accent'),
      this._createExplorerPill(`${model.childEntries.length} child${model.childEntries.length === 1 ? '' : 'ren'}`, 'graphos-explorer__chip graphos-explorer__chip--muted'),
      this._createExplorerPill(`${incoming.length} in · ${outgoing.length} out`, 'graphos-explorer__chip graphos-explorer__chip--muted'),
    );
    previewHeader.append(previewKicker, previewMeta);

    const previewViewport = document.createElement('div');
    previewViewport.className = 'graphos-explorer__preview-viewport';
    const canvas = document.createElement('canvas');
    canvas.id = 'graphos-explorer-preview';
    canvas.className = 'graphos-explorer__preview-canvas';
    canvas.setAttribute('aria-label', 'Runtime containment preview');
    canvas.setAttribute('role', 'img');
    const tooltip = document.createElement('div');
    tooltip.className = 'graphos-explorer__preview-tooltip';
    tooltip.hidden = true;
    previewViewport.append(canvas, tooltip);
    previewShell.append(previewHeader, previewViewport);

    this.runtimePreviewCanvasEl = canvas;
    this.runtimePreviewTooltipEl = tooltip;
    this.runtimePreview.dirty = true;
    this.runtimePreview.lastDrawAt = 0;
    this._bindRuntimePreviewInteractions(canvas);

    const telemetry = document.createElement('dl');
    telemetry.className = 'graphos-explorer__runtime-hud';
    this._getNodeRuntimeSummary(node, children, incoming, outgoing)
      .forEach(([label, value]) => telemetry.appendChild(this._createRuntimeHudItem(
        label,
        value,
        { wide: label === 'Active extensions' || label === 'Hosted' },
      )));
    previewShell.appendChild(telemetry);

    wrapper.append(previewShell);
    return wrapper;
  }

  _renderExtensionPanel(node, extensionKey) {
    const def = this._getExtensionDef(extensionKey);
    const enabled = this._isExtensionEnabled(node, def.key);
    const entries = this._getExtensionEntries(node, def.key);
    const panel = document.createElement('section');
    panel.className = 'graphos-explorer__extension-panel';
    panel.dataset.extension = def.key;
    panel.dataset.enabled = enabled ? 'true' : 'false';

    const header = document.createElement('div');
    header.className = 'graphos-explorer__extension-head';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('p');
    kicker.className = 'graphos-explorer__section-label';
    kicker.textContent = enabled ? 'Extension active' : 'Extension available';
    const title = document.createElement('h4');
    title.className = 'graphos-explorer__extension-title';
    title.textContent = def.label;
    titleWrap.append(kicker, title);
    const status = this._createExplorerPill(enabled ? (entries.length ? `${entries.length} item${entries.length === 1 ? '' : 's'}` : 'Ready') : 'Click to activate', enabled ? 'graphos-explorer__chip graphos-explorer__chip--accent' : 'graphos-explorer__chip graphos-explorer__chip--muted');
    header.append(titleWrap, status);

    const body = document.createElement('p');
    body.className = 'graphos-explorer__body';
    body.textContent = def.summary;

    panel.append(header, body);

    if (!enabled) {
      const inactive = document.createElement('button');
      inactive.type = 'button';
      inactive.className = 'graphos-explorer__extension-activate';
      inactive.textContent = `Activate ${def.label}`;
      inactive.addEventListener('click', () => this._toggleExplorerExtension(node, def.key));
      panel.appendChild(inactive);
      return panel;
    }

    if (def.key === 'assets') {
      panel.appendChild(this._renderExtensionDropzone(entries.length ? 'Drop another file into this node' : def.empty, node));
    }

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'graphos-explorer__empty';
      empty.textContent = def.empty;
      panel.appendChild(empty);
      return panel;
    }

    panel.appendChild(this._renderRuntimeCollectionPanel(def.label, entries, def.empty, `graphos-explorer__contents-section--${def.key}`));
    return panel;
  }

  _renderExtensionDropzone(label, node) {
    const zone = document.createElement('div');
    zone.className = 'graphos-explorer__dropzone';
    zone.setAttribute('role', 'button');
    zone.setAttribute('aria-label', 'Drop files into this node');
    const dot = document.createElement('span');
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('strong');
    text.textContent = label;
    const meta = document.createElement('span');
    meta.textContent = 'Any file type · local node attachment';
    zone.append(dot, text, meta);
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.dataset.dragging = 'true';
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) delete zone.dataset.dragging;
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      delete zone.dataset.dragging;
      const files = [...(e.dataTransfer?.files || [])];
      if (!node || !files.length) return;
      node.assets = Array.isArray(node.assets) ? node.assets : [];
      const now = Date.now();
      files.forEach((file, index) => {
        node.assets.push({
          id: `asset-${now}-${index}`,
          label: file.name || `Asset ${node.assets.length + 1}`,
          type: file.type || 'file',
          kind: 'asset',
        });
      });
      this._setExtensionEnabled(node, 'assets', true);
      this.explorer.activeExtension = 'assets';
      this._logExplorerEvent('asset-attached', node, `${files.length} file${files.length === 1 ? '' : 's'}`);
      this.saveGraph();
      this._refreshUi();
    });
    return zone;
  }

  _renderRuntimeCollectionPanel(label, entries, emptyText, className = '') {
    const panel = document.createElement('section');
    panel.className = `graphos-explorer__contents-section ${className}`.trim();

    const heading = document.createElement('p');
    heading.className = 'graphos-explorer__section-label';
    heading.textContent = label;
    panel.appendChild(heading);

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'graphos-explorer__empty';
      empty.textContent = emptyText;
      panel.appendChild(empty);
      return panel;
    }

    const list = document.createElement('div');
    list.className = 'graphos-explorer__runtime-list';
    entries.slice(0, 12).forEach(entry => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `graphos-explorer__runtime-item graphos-explorer__runtime-item--${entry.kind || 'vertex'}`;
      const itemLabel = document.createElement('strong');
      itemLabel.textContent = entry.label;
      const itemMeta = document.createElement('span');
      itemMeta.textContent = entry.kind === 'vertex'
        ? (entry.value?.type || 'vertex')
        : (entry.kind || 'runtime');
      item.append(itemLabel, itemMeta);
      item.title = `${label}: ${entry.label}`;
      if (entry.kind === 'vertex' && entry.value?.node) {
        item.addEventListener('click', () => {
          this._selectSingle(entry.value.node);
          this._openExplorerPath(entry.value.node);
        });
      } else {
        item.addEventListener('click', () => {
          this._logExplorerEvent('inspect-item', this._getInspectorTarget(), `${label}: ${entry.label}`);
          this._refreshUi();
        });
      }
      list.appendChild(item);
    });
    panel.appendChild(list);
    return panel;
  }

  _renderExplorerPermissions(node, children, incoming, outgoing) {
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__stack';
    const facts = document.createElement('dl');
    facts.className = 'graphos-explorer__facts graphos-explorer__facts--compact';
    const permissions = model.permissionEntries.length
      ? model.permissionEntries.map(entry => entry.label)
      : [
          this._getNodeBodyVisible(node) ? 'body: visible' : 'body: hidden',
          node.parent ? 'can reparent' : 'can root',
          children.length ? 'can contain' : 'can host',
          incoming.length || outgoing.length ? 'can relate' : 'relation dormant',
        ];
    permissions.forEach((permission, index) => {
      facts.append(...this._createExplorerFact(index === 0 ? 'Primary' : `Rule ${index + 1}`, permission));
    });
    panel.appendChild(facts);
    return panel;
  }

  _renderExplorerPrograms(node, children, incoming, outgoing) {
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);
    return this._renderRuntimeCollectionPanel('Programs', model.programEntries, 'No programs are hosted here.');
  }

  _renderExplorerAssets(node, children, incoming, outgoing) {
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);
    return this._renderRuntimeCollectionPanel('Assets', model.assetEntries, 'No assets are attached here.');
  }

  _renderExplorerProperties(node, children, incoming, outgoing) {
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__stack';
    const facts = document.createElement('dl');
    facts.className = 'graphos-explorer__facts graphos-explorer__facts--compact';
    this._getNodeProperties(node, children, incoming, outgoing).forEach(([label, value]) => facts.append(...this._createExplorerFact(label, value)));
    panel.appendChild(facts);
    return panel;
  }

  _renderExplorerRelations(node, children, incoming, outgoing) {
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__stack';
    const map = document.createElement('div');
    map.className = 'graphos-explorer__relation-map';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'graphos-explorer__relation-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');

    const linkPaths = [
      'M50 50 L18 30',
      'M50 50 L82 30',
      'M50 50 L50 84',
    ];
    linkPaths.forEach(d => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'graphos-explorer__relation-link');
      svg.appendChild(path);
    });

    const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    orbit.setAttribute('cx', '50');
    orbit.setAttribute('cy', '50');
    orbit.setAttribute('r', '27');
    orbit.setAttribute('class', 'graphos-explorer__relation-orbit');
    svg.appendChild(orbit);

    const hub = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hub.setAttribute('cx', '50');
    hub.setAttribute('cy', '50');
    hub.setAttribute('r', '7');
    hub.setAttribute('class', 'graphos-explorer__relation-hub');
    svg.appendChild(hub);

    map.appendChild(svg);

    const center = document.createElement('div');
    center.className = 'graphos-explorer__relation-node graphos-explorer__relation-node--center';
    center.textContent = node.name || 'Vertex';
    map.appendChild(center);

    const addCluster = (items, label, side) => {
      const group = document.createElement('div');
      group.className = `graphos-explorer__relation-cluster graphos-explorer__relation-cluster--${side}`;
      const clusterLabel = document.createElement('p');
      clusterLabel.className = 'graphos-explorer__relation-label';
      clusterLabel.textContent = label;
      group.appendChild(clusterLabel);
      if (items.length) {
        const list = document.createElement('div');
        list.className = 'graphos-explorer__relation-list';
        items.slice(0, 6).forEach(item => {
          const chip = document.createElement('span');
          chip.className = 'graphos-explorer__relation-node';
          chip.textContent = item.name || 'Vertex';
          list.appendChild(chip);
        });
        group.appendChild(list);
      } else {
        const empty = document.createElement('p');
        empty.className = 'graphos-explorer__empty';
        empty.textContent = `No ${label.toLowerCase()} vertices.`;
        group.appendChild(empty);
      }
      map.appendChild(group);
    };

    addCluster(incoming, 'Incoming', 'left');
    addCluster(outgoing, 'Outgoing', 'right');
    addCluster(children, 'Children', 'bottom');

    panel.appendChild(map);
    return panel;
  }

  _renderExplorerEvents(node) {
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__stack';
    const events = this.eventLog.length ? this.eventLog : [{ kind: 'idle', nodeName: node?.name || 'Vertex', detail: 'No runtime events recorded yet.', at: Date.now() }];
    const list = document.createElement('div');
    list.className = 'graphos-explorer__event-list';
    events.slice(0, 8).forEach(entry => {
      const item = document.createElement('article');
      item.className = 'graphos-explorer__event';
      const title = document.createElement('p');
      title.className = 'graphos-explorer__event-title';
      title.textContent = `${entry.kind}`;
      const body = document.createElement('p');
      body.className = 'graphos-explorer__event-body';
      body.textContent = `${entry.nodeName}${entry.detail ? ` · ${entry.detail}` : ''}`;
      item.append(title, body);
      list.appendChild(item);
    });
    panel.appendChild(list);
    return panel;
  }

  _renderExplorerCapabilities(node, children, incoming, outgoing) {
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__stack';
    const chips = document.createElement('div');
    chips.className = 'graphos-explorer__chips graphos-explorer__chips--wrap';
    this._getNodeCapabilities(node, children, incoming, outgoing).forEach(capability => {
      chips.appendChild(this._createExplorerPill(capability, 'graphos-explorer__chip graphos-explorer__chip--accent'));
    });
    panel.appendChild(chips);
    return panel;
  }

  _renderExplorerHistory(node) {
    const panel = document.createElement('div');
    panel.className = 'graphos-explorer__stack';
    const history = this._getNodeHistory(node);
    if (!history.length) {
      const empty = document.createElement('p');
      empty.className = 'graphos-explorer__empty';
      empty.textContent = 'No history yet for this vertex.';
      panel.appendChild(empty);
      return panel;
    }
    const list = document.createElement('div');
    list.className = 'graphos-explorer__event-list';
    history.forEach(entry => {
      const item = document.createElement('article');
      item.className = 'graphos-explorer__event';
      const title = document.createElement('p');
      title.className = 'graphos-explorer__event-title';
      title.textContent = entry.kind;
      const body = document.createElement('p');
      body.className = 'graphos-explorer__event-body';
      body.textContent = entry.detail || new Date(entry.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      item.append(title, body);
      list.appendChild(item);
    });
    panel.appendChild(list);
    return panel;
  }

  _getRuntimePreviewHitTarget(x, y) {
    const targets = this.runtimePreview.targets || [];
    let best = null;
    let bestDistance = Infinity;
    targets.forEach(target => {
      const distance = Math.hypot(x - target.x, y - target.y);
      if (distance <= target.radius * 1.35 && distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    });
    return best;
  }

  _setRuntimePreviewHover(target) {
    const previousKey = this.runtimePreview.hoverKey;
    if (!target) {
      this.runtimePreview.hoverKey = null;
      this.runtimePreview.hoverLabel = '';
      this.runtimePreview.hoverKind = null;
      this.runtimePreview.hoverNode = null;
      if (previousKey !== null) this.runtimePreview.dirty = true;
      return;
    }
    this.runtimePreview.hoverKey = target.key;
    this.runtimePreview.hoverLabel = target.label || '';
    this.runtimePreview.hoverKind = target.kind || null;
    this.runtimePreview.hoverNode = target.node || null;
    if (previousKey !== target.key) this.runtimePreview.dirty = true;
  }

  _focusRuntimePreviewOnNode(node) {
    if (!node) return;
    const seed = this._hashRuntimeKey(node.id || node.name || 'vertex');
    this.runtimePreview.selectedNodeId = node.id;
    this.runtimePreview.targetRotationX = -0.14 + seed * 0.52;
    this.runtimePreview.targetRotationY = -0.86 + seed * 1.72;
    this.runtimePreview.targetZoom = this._getNodeBodyVisible(node) ? 1.12 : 0.96;
    this.runtimePreview.transition = 0;
    this.runtimePreview.dirty = true;
  }

  _onExplorerPreviewPointerDown(e) {
    const canvas = e.currentTarget;
    if (!canvas || e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const target = this._getRuntimePreviewHitTarget(x, y);
    this.runtimePreview.dragging = true;
    this.runtimePreview.pointerId = e.pointerId;
    this.runtimePreview.dragMoved = false;
    this.runtimePreview.startX = x;
    this.runtimePreview.startY = y;
    this.runtimePreview.startRotationX = this.runtimePreview.rotationX;
    this.runtimePreview.startRotationY = this.runtimePreview.rotationY;
    this.runtimePreview.targetKey = target ? target.key : null;
    this._setRuntimePreviewHover(target);
    canvas.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  _onExplorerPreviewPointerMove(e) {
    const canvas = e.currentTarget;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.runtimePreview.dragging && e.pointerId === this.runtimePreview.pointerId) {
      const dx = x - this.runtimePreview.startX;
      const dy = y - this.runtimePreview.startY;
      if (Math.hypot(dx, dy) > 3) {
        this.runtimePreview.dragMoved = true;
      }
      this.runtimePreview.rotationY = this.runtimePreview.startRotationY + dx * 0.008;
      this.runtimePreview.rotationX = clamp(this.runtimePreview.startRotationX + dy * 0.008, -1.2, 1.2);
      this.runtimePreview.dirty = true;
      this._setRuntimePreviewHover(this._getRuntimePreviewHitTarget(x, y));
      e.preventDefault();
      return;
    }

    this._setRuntimePreviewHover(this._getRuntimePreviewHitTarget(x, y));
  }

  _onExplorerPreviewPointerUp(e) {
    const canvas = e.currentTarget;
    if (this.runtimePreview.dragging && e.pointerId === this.runtimePreview.pointerId) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const target = this._getRuntimePreviewHitTarget(x, y);
      this.runtimePreview.dragging = false;
      this.runtimePreview.pointerId = null;
      if (!this.runtimePreview.dragMoved && target?.node) {
        this._selectSingle(target.node);
        this.explorer.activeTab = 'contents';
        this._openExplorerPath(target.node);
        this._refreshUi();
      }
      this._setRuntimePreviewHover(target);
      e.preventDefault();
    }
  }

  _onExplorerPreviewPointerLeave() {
    if (this.runtimePreview.dragging) return;
    this._setRuntimePreviewHover(null);
  }

  _onExplorerPreviewWheel(e) {
    if (!this.runtimePreviewCanvasEl) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 80 : 1;
    const normalizedDelta = clamp(e.deltaY * unit, -80, 80);
    const currentTarget = this.runtimePreview.targetZoom ?? this.runtimePreview.zoom;
    const delta = Math.exp(-normalizedDelta * 0.0012);
    this.runtimePreview.targetZoom = clamp(currentTarget * delta, 0.82, 1.42);
    this.runtimePreview.dirty = true;
    this.runtimePreview.lastDrawAt = 0;
  }

  _onExplorerPreviewClick(e) {
    if (this.runtimePreview.dragMoved) {
      this.runtimePreview.dragMoved = false;
      return;
    }
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const target = this._getRuntimePreviewHitTarget(e.clientX - rect.left, e.clientY - rect.top);
    if (target?.node) {
      this._selectSingle(target.node);
      this.explorer.activeTab = 'contents';
      this._openExplorerPath(target.node);
      this._refreshUi();
    }
  }

  _onExplorerPreviewDoubleClick(e) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const target = this._getRuntimePreviewHitTarget(e.clientX - rect.left, e.clientY - rect.top);
    if (target?.node) {
      this._selectSingle(target.node);
      this.explorer.activeTab = 'contents';
      this.runtimePreview.zoom = 1.08;
      this.runtimePreview.rotationX = 0.24;
      this.runtimePreview.rotationY = -0.48;
      this._openExplorerPath(target.node);
      this._refreshUi();
    }
  }

  _bindRuntimePreviewInteractions(canvas) {
    if (!canvas || canvas.dataset.runtimePreviewBound === 'true') return;
    canvas.dataset.runtimePreviewBound = 'true';
    canvas.addEventListener('pointerdown', this._bound.previewPointerDown);
    canvas.addEventListener('pointermove', this._bound.previewPointerMove);
    canvas.addEventListener('pointerup', this._bound.previewPointerUp);
    canvas.addEventListener('pointercancel', this._bound.previewPointerUp);
    canvas.addEventListener('pointerleave', this._bound.previewPointerLeave);
    canvas.addEventListener('wheel', this._bound.previewWheel, { passive: false });
    canvas.addEventListener('click', this._bound.previewClick);
    canvas.addEventListener('dblclick', this._bound.previewDoubleClick);
    if (this.runtimePreviewResizeObserver) {
      this.runtimePreviewResizeObserver.disconnect();
    }
    if ('ResizeObserver' in window) {
      this.runtimePreviewResizeObserver = new ResizeObserver(() => this._scheduleRuntimePreviewResize());
      this.runtimePreviewResizeObserver.observe(canvas);
      if (canvas.parentElement) this.runtimePreviewResizeObserver.observe(canvas.parentElement);
    }
    this._syncRuntimePreviewCanvasSize(canvas);
  }

  _syncRuntimePreviewCanvasSize(canvas = this.runtimePreviewCanvasEl) {
    if (!canvas || !canvas.isConnected) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    const changed = canvas.width !== width || canvas.height !== height;
    if (changed) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
    return changed;
  }

  _scheduleRuntimePreviewResize() {
    if (this.runtimePreview.resizeRaf != null) return;
    this.runtimePreview.resizeRaf = requestAnimationFrame(() => {
      this.runtimePreview.resizeRaf = null;
      this._syncRuntimePreviewCanvasSize();
      this.runtimePreview.dirty = true;
      this.runtimePreview.lastDrawAt = 0;
    });
  }

  _hashRuntimeKey(key) {
    const text = String(key || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  _projectRuntimePreviewPoint(vec3, cx, cy, radius, rotX, rotY, zoom, wobble = 0) {
    const [x0, y0, z0] = vec3;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x0 * cosY - z0 * sinY;
    const z1 = x0 * sinY + z0 * cosY;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;
    const perspective = Math.max(220, radius * 4.2);
    const depth = z2 * radius;
    const scale = perspective / Math.max(120, perspective - depth);
    return {
      x: cx + x1 * radius * zoom * scale,
      y: cy + y1 * radius * zoom * scale * 0.88 + wobble,
      z: z2,
      scale,
    };
  }

  _drawRuntimePreviewNode(ctx, entry, projected, radius, hovered = false) {
    const base = this._hexToRgb(entry.color || '#7ca0ff');
    const alpha = hovered ? 1 : 0.9;
    ctx.save();
    ctx.globalAlpha = Math.max(0.2, Math.min(1, alpha * (0.55 + projected.scale * 0.28)));

    if (entry.kind === 'asset') {
      const w = radius * (0.28 + projected.scale * 0.06);
      const h = w * 0.82;
      const folded = entry.label.toLowerCase().includes('document');
      ctx.translate(projected.x, projected.y);
      ctx.rotate(Math.sin(projected.z * 3.1) * 0.08);
      const fill = ctx.createLinearGradient(-w * 0.5, -h * 0.5, w * 0.5, h * 0.5);
      fill.addColorStop(0, `rgba(${base[0]},${base[1]},${base[2]},0.92)`);
      fill.addColorStop(1, 'rgba(255,255,255,0.18)');
      ctx.fillStyle = fill;
      roundRect(ctx, -w * 0.5, -h * 0.5, w, h, Math.max(3, w * 0.18));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.38)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (folded) {
        ctx.beginPath();
        ctx.moveTo(w * 0.12, -h * 0.5);
        ctx.lineTo(w * 0.5, -h * 0.12);
        ctx.lineTo(w * 0.5, -h * 0.5);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, h * 0.08);
      ctx.lineTo(w * 0.34, h * 0.08);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = Math.max(1, h * 0.04);
      ctx.stroke();
    } else if (entry.kind === 'program') {
      const r = radius * (0.085 + projected.scale * 0.025);
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.01 + this._hashRuntimeKey(entry.key) * Math.PI * 2);
      ctx.translate(projected.x, projected.y);
      ctx.rotate(Math.sin(projected.z * 2.4 + this.t * 0.01) * 0.2);
      ctx.strokeStyle = `rgba(${base[0]},${base[1]},${base[2]},${0.55 + pulse * 0.25})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-r * 1.25, 0);
      ctx.lineTo(0, -r * 0.82);
      ctx.lineTo(r * 1.25, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 1.25, 0);
      ctx.lineTo(0, r * 0.72);
      ctx.lineTo(r * 1.25, 0);
      ctx.stroke();
      ctx.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},0.84)`;
      [-r * 1.25, 0, r * 1.25].forEach((x, index) => {
        ctx.beginPath();
        ctx.arc(x, index === 1 ? -r * 0.82 : 0, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      const r = radius * (0.08 + projected.scale * 0.02);
      ctx.translate(projected.x, projected.y);
      ctx.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},0.85)`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.26)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (hovered) {
      ctx.shadowColor = `rgba(${base[0]},${base[1]},${base[2]},0.68)`;
      ctx.shadowBlur = 16;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${base[0]},${base[1]},${base[2]},0.92)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(8, radius * 0.09), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawExplorerPreview() {
    const canvas = this.runtimePreviewCanvasEl && this.runtimePreviewCanvasEl.isConnected ? this.runtimePreviewCanvasEl : null;
    if (!canvas) {
      if (this.runtimePreviewTooltipEl) this.runtimePreviewTooltipEl.hidden = true;
      return;
    }

    const now = performance.now();
    const previewState = this.runtimePreview;
    if (this._syncRuntimePreviewCanvasSize(canvas)) {
      previewState.dirty = true;
      previewState.lastDrawAt = 0;
    }
    const needsMotion = !!(
      previewState.dirty ||
      previewState.dragging ||
      previewState.hoverKey ||
      (previewState.transition ?? 1) < 1 ||
      Math.abs((previewState.targetRotationX ?? previewState.rotationX) - previewState.rotationX) > 0.003 ||
      Math.abs((previewState.targetRotationY ?? previewState.rotationY) - previewState.rotationY) > 0.003 ||
      Math.abs((previewState.targetZoom ?? previewState.zoom) - previewState.zoom) > 0.003
    );
    const minFrameMs = needsMotion ? 32 : 180;
    if (!needsMotion && now - (previewState.lastDrawAt || 0) < minFrameMs) return;
    if (needsMotion && now - (previewState.lastDrawAt || 0) < minFrameMs) return;

    const target = this._getInspectorTarget();
    const node = target && target.a && target.b ? (target.a || target.b) : target;
    if (!node) {
      this.runtimePreview.targets = [];
      if (this.runtimePreviewTooltipEl) this.runtimePreviewTooltipEl.hidden = true;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
      previewState.dirty = false;
      previewState.lastDrawAt = now;
      return;
    }

    const links = this.links.filter(link => link.a === node || link.b === node);
    const children = node.children.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const { incoming, outgoing } = this._getNodeLinkBuckets(node, links);
    const model = this._getNodeRuntimeModel(node, children, incoming, outgoing);

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.runtimePreview.lastCanvasRect = rect;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.clearRect(0, 0, rect.width, rect.height);

    const accent = this._hexToRgb(node.color || '#7ca0ff');
    ctx.save();
    ctx.globalAlpha = 0.34;
    const vignette = ctx.createRadialGradient(rect.width * 0.52, rect.height * 0.48, Math.min(rect.width, rect.height) * 0.08, rect.width * 0.5, rect.height * 0.5, Math.max(rect.width, rect.height) * 0.65);
    vignette.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},0.18)`);
    vignette.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    const minDim = Math.min(rect.width, rect.height);
    const centerX = rect.width * 0.5;
    const centerY = rect.height * 0.5;
    const baseRadius = minDim * 0.31;
    if (!previewState.dragging) {
      previewState.rotationX += ((previewState.targetRotationX ?? previewState.rotationX) - previewState.rotationX) * 0.055;
      previewState.rotationY += ((previewState.targetRotationY ?? previewState.rotationY) - previewState.rotationY) * 0.055;
      previewState.zoom += ((previewState.targetZoom ?? previewState.zoom) - previewState.zoom) * 0.045;
    }
    previewState.transition = Math.min(1, (previewState.transition ?? 1) + 0.035);
    const autoDriftX = Math.sin(this.t * 0.0007 + this._hashRuntimeKey(node.id) * Math.PI * 2) * 0.05;
    const autoDriftY = Math.cos(this.t * 0.0005 + this._hashRuntimeKey(node.id) * 5.1) * 0.035;
    const rotX = previewState.rotationX + autoDriftY;
    const rotY = previewState.rotationY + autoDriftX;
    const zoom = clamp(previewState.zoom, 0.78, 1.65);
    const membraneRadius = baseRadius * zoom;
    const entityRadius = membraneRadius * 0.92;
    const shellRadius = membraneRadius * 0.98;
    const sphereRadius = membraneRadius * 0.9;

    const bodyVisible = model.bodyVisible;
    const surfacePoint = (vec) => this._projectRuntimePreviewPoint(vec, centerX, centerY, sphereRadius, rotX, rotY, zoom, 0);

    const starCount = Math.max(18, Math.round(minDim / 14));
    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const seed = this._hashRuntimeKey(`${node.id}-star-${i}`);
      const x = rect.width * ((seed * 0.73 + i * 0.194) % 1);
      const y = rect.height * ((seed * 0.51 + i * 0.263) % 1);
      const size = 0.6 + (seed % 1) * 1.5;
      const alpha = 0.1 + (seed % 1) * 0.45;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();

    const atmosphere = ctx.createRadialGradient(centerX, centerY, sphereRadius * 0.72, centerX, centerY, sphereRadius * 1.34);
    atmosphere.addColorStop(0, 'rgba(255,255,255,0)');
    atmosphere.addColorStop(0.62, `rgba(${accent[0]},${accent[1]},${accent[2]},0.16)`);
    atmosphere.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = atmosphere;
    ctx.beginPath();
    ctx.arc(centerX, centerY, sphereRadius * 1.34, 0, Math.PI * 2);
    ctx.fill();

    if (bodyVisible) {
      const bodyGlow = ctx.createRadialGradient(centerX - sphereRadius * 0.35, centerY - sphereRadius * 0.33, sphereRadius * 0.06, centerX, centerY, sphereRadius);
      bodyGlow.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},0.78)`);
      bodyGlow.addColorStop(0.2, 'rgba(176,206,255,0.36)');
      bodyGlow.addColorStop(0.54, 'rgba(28,42,70,0.96)');
      bodyGlow.addColorStop(1, 'rgba(4,6,10,0.995)');
      ctx.fillStyle = bodyGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.clip();

      const wash = ctx.createRadialGradient(centerX - sphereRadius * 0.42, centerY - sphereRadius * 0.44, sphereRadius * 0.03, centerX - sphereRadius * 0.18, centerY - sphereRadius * 0.24, sphereRadius * 1.04);
      wash.addColorStop(0, 'rgba(255,255,255,0.18)');
      wash.addColorStop(0.22, `rgba(${accent[0]},${accent[1]},${accent[2]},0.14)`);
      wash.addColorStop(0.56, 'rgba(255,255,255,0.02)');
      wash.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = wash;
      ctx.fillRect(centerX - sphereRadius, centerY - sphereRadius, sphereRadius * 2, sphereRadius * 2);

      const drawGrid = (rings, segments, start, end, alphaBase, lineWidthBase) => {
        for (let ring = 0; ring < rings; ring++) {
          const t = rings === 1 ? 0.5 : ring / (rings - 1);
          const latitude = start + (end - start) * t;
          let prev = null;
          for (let seg = 0; seg <= segments; seg++) {
            const lon = (seg / segments) * Math.PI * 2;
            const x = Math.cos(latitude) * Math.cos(lon);
            const y = Math.sin(latitude);
            const z = Math.cos(latitude) * Math.sin(lon);
            const p = surfacePoint([x, y, z]);
            if (prev) {
              const depth = clamp((prev.z + p.z + 2) * 0.25, 0, 1);
              ctx.strokeStyle = `rgba(180,205,255,${alphaBase + depth * 0.12})`;
              ctx.lineWidth = lineWidthBase + depth * 0.55;
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
            prev = p;
          }
        }
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawGrid(5, 28, -1.0, 1.0, 0.022, 0.32);

      for (let m = 0; m < 7; m++) {
        const longitude = -Math.PI + (m / 6) * Math.PI * 2;
        let prev = null;
        for (let step = 0; step <= 26; step++) {
          const latitude = -1.05 + (step / 26) * 2.1;
          const x = Math.cos(latitude) * Math.cos(longitude);
          const y = Math.sin(latitude);
          const z = Math.cos(latitude) * Math.sin(longitude);
          const p = surfacePoint([x, y, z]);
          if (prev) {
            const depth = clamp((prev.z + p.z + 2) * 0.25, 0, 1);
            ctx.strokeStyle = `rgba(170,198,255,${0.02 + depth * 0.06})`;
            ctx.lineWidth = 0.26 + depth * 0.24;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
          prev = p;
        }
      }

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      const sparkles = 7;
      for (let i = 0; i < sparkles; i++) {
        const seed = this._hashRuntimeKey(`${node.id}-spark-${i}`);
        const angle = seed * Math.PI * 2;
        const dist = sphereRadius * (0.18 + ((seed * 7.3) % 1) * 0.52);
        const x = centerX + Math.cos(angle) * dist * 0.42;
        const y = centerY + Math.sin(angle * 1.08) * dist * 0.28;
        const r = 0.8 + ((seed * 13.7) % 1) * 1.5;
        ctx.globalAlpha = 0.08 + ((seed * 5.2) % 1) * 0.18;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const specular = ctx.createRadialGradient(centerX - sphereRadius * 0.46, centerY - sphereRadius * 0.44, sphereRadius * 0.02, centerX - sphereRadius * 0.2, centerY - sphereRadius * 0.2, sphereRadius * 1.08);
      specular.addColorStop(0, 'rgba(255,255,255,0.18)');
      specular.addColorStop(0.18, `rgba(255,255,255,${bodyVisible ? 0.06 : 0.02})`);
      specular.addColorStop(0.52, 'rgba(255,255,255,0.01)');
      specular.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = specular;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius * 1.02, 0, Math.PI * 2);
      ctx.fill();

      const coreRadius = sphereRadius * 0.18;
      const corePulse = 0.5 + 0.5 * Math.sin(this.t * 2.2 + this._hashRuntimeKey(node.id) * 8);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const cutaway = ctx.createRadialGradient(centerX - coreRadius * 0.24, centerY - coreRadius * 0.3, coreRadius * 0.08, centerX, centerY, coreRadius * 1.6);
      cutaway.addColorStop(0, 'rgba(255,255,255,0.92)');
      cutaway.addColorStop(0.26, `rgba(${accent[0]},${accent[1]},${accent[2]},0.84)`);
      cutaway.addColorStop(0.7, `rgba(${accent[0]},${accent[1]},${accent[2]},0.24)`);
      cutaway.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cutaway;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * (1.28 + corePulse * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.34 + corePulse * 0.16})`;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * (1.56 + corePulse * 0.16), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.32)`;
      ctx.lineWidth = 0.9;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, coreRadius * (1.9 + ring * 0.45), coreRadius * (0.44 + ring * 0.1), this.t * 0.38 + ring * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.sin(this.t * 0.0003 + this._hashRuntimeKey(node.id)) * 0.14);
    const shellGlow = ctx.createRadialGradient(0, 0, shellRadius * 0.16, 0, 0, shellRadius);
    shellGlow.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},${bodyVisible ? 0.16 : 0.08})`);
    shellGlow.addColorStop(0.52, `rgba(255,255,255,${bodyVisible ? 0.03 : 0.015})`);
    shellGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shellGlow;
    ctx.beginPath();
    ctx.arc(0, 0, shellRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${bodyVisible ? 0.42 : 0.34})`;
    ctx.lineWidth = 1.15;
    ctx.stroke();
    ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.2)`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, shellRadius * 0.975, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const entries = [
      ...model.childEntries.map(entry => ({ ...entry, kind: 'vertex', group: 'children', color: entry.value?.color || node.color })),
      ...model.programEntries.map(entry => ({ ...entry, kind: 'program', group: 'programs', color: node.color })),
      ...model.assetEntries.map(entry => ({ ...entry, kind: 'asset', group: 'assets', color: node.color })),
    ];
    const totalEntries = entries.length;
    const mode = totalEntries <= 20 ? 'individual' : totalEntries <= 100 ? 'cluster' : 'aggregate';
    const groupOrder = ['vertex', 'program', 'asset'];
    const groupCenters = {
      vertex: [-0.42, 0.12, 0.46],
      program: [0.38, -0.18, 0.55],
      asset: [0.08, 0.42, -0.48],
    };
    const groupSizes = {
      vertex: 0.48,
      program: 0.36,
      asset: 0.4,
    };
    const targets = [];

    const drawConnector = (items, direction = 1, kind = 'vertex') => {
      const count = Math.min(items.length, 8);
      if (!count) return;
      const strandColor = kind === 'program' ? `rgba(154,230,199,0.52)` : kind === 'asset' ? `rgba(255,209,142,0.42)` : `rgba(191,215,255,0.36)`;
      for (let i = 0; i < count; i++) {
        const item = items[i];
        const seed = this._hashRuntimeKey(item.key || item.label || `${kind}-${i}`);
        const angle = seed * Math.PI * 2;
        const shell = membraneRadius * (0.9 + seed * 0.08);
        const sx = centerX + Math.cos(angle) * shell * direction * 0.82;
        const sy = centerY + Math.sin(angle * 1.1) * shell * 0.72;
        const ex = centerX + Math.cos(angle + 0.6) * shell * 0.42;
        const ey = centerY + Math.sin(angle * 1.1 + 0.4) * shell * 0.36;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = strandColor;
        ctx.lineWidth = 1.35;
        ctx.shadowColor = kind === 'program' ? 'rgba(154,230,199,0.28)' : kind === 'asset' ? 'rgba(255,209,142,0.24)' : 'rgba(191,215,255,0.18)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) * 0.5, (sy + ey) * 0.5 - shell * 0.12, ex, ey);
        ctx.stroke();
        ctx.fillStyle = strandColor;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + (seed % 1) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, ey, 1.1 + (seed % 1) * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (items.length > 8) {
        const moreText = `+${items.length - 8}`;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.font = `500 ${Math.max(9, minDim * 0.026)}px Inter, sans-serif`;
        ctx.fillText(moreText, centerX + membraneRadius * (direction > 0 ? 0.94 : -0.98), centerY + membraneRadius * 0.6);
        ctx.restore();
      }
    };

    drawConnector(model.incoming.map((item, index) => ({
      key: item.id || item.name || `incoming-${index}`,
      label: item.name || 'Incoming',
      kind: 'vertex',
    })), -1, 'vertex');
    drawConnector(model.outgoing.map((item, index) => ({
      key: item.id || item.name || `outgoing-${index}`,
      label: item.name || 'Outgoing',
      kind: 'vertex',
    })), 1, 'vertex');

    const buildItemVector = (entry, index, count, groupKind = entry.kind) => {
      const seed = this._hashRuntimeKey(entry.key || entry.label || `${groupKind}-${index}`);
      const baseTheta = seed * Math.PI * 2;
      const basePhi = Math.acos(1 - 2 * ((index + 0.5) / Math.max(1, count)));
      const shell = groupKind === 'program' ? 0.42 : groupKind === 'asset' ? 0.62 : 0.52;
      const wobble = 0.12 * Math.sin(this.t * 0.0009 + seed * 17);
      const x = Math.sin(basePhi) * Math.cos(baseTheta);
      const y = Math.cos(basePhi);
      const z = Math.sin(basePhi) * Math.sin(baseTheta);
      return [x * shell, (y + wobble) * shell, z * shell];
    };

    if (mode === 'individual') {
      entries.forEach((entry, index) => {
        const vec = buildItemVector(entry, index, entries.length, entry.kind);
        const projected = this._projectRuntimePreviewPoint(vec, centerX, centerY, entityRadius, rotX, rotY, zoom, 0);
        const distanceToCenter = Math.hypot(projected.x - centerX, projected.y - centerY);
        const size = entry.kind === 'program' ? 10 : entry.kind === 'asset' ? 13 : 11;
        const key = entry.key || `${entry.kind}-${index}`;
        const hovered = this.runtimePreview.hoverKey === key;
        targets.push({ key, x: projected.x, y: projected.y, radius: size * projected.scale * 0.95, entry, kind: entry.kind, label: entry.label, node: entry.value?.node || null, group: entry.group });
        if (distanceToCenter < membraneRadius * 0.97) {
          this._drawRuntimePreviewNode(ctx, entry, projected, size * 2.4, hovered);
        }
      });
    } else {
      groupOrder.forEach((kind, groupIndex) => {
        const groupEntries = entries.filter(entry => entry.kind === kind);
        if (!groupEntries.length) return;
        const aggregateCount = groupEntries.length;
        const centerVec = groupCenters[kind] || [0, 0, 0.35];
        const drift = 0.06 * Math.sin(this.t * 0.0007 + groupIndex);
        const projected = this._projectRuntimePreviewPoint([
          centerVec[0] + drift,
          centerVec[1] + drift * 0.5,
          centerVec[2],
        ], centerX, centerY, entityRadius, rotX, rotY, zoom, 0);
        const size = kind === 'program' ? 18 : kind === 'asset' ? 20 : 19;
        const key = `${kind}-aggregate`;
        const hovered = this.runtimePreview.hoverKey === key;
        targets.push({ key, x: projected.x, y: projected.y, radius: size * projected.scale * 1.1, entry: groupEntries[0], kind, label: `${aggregateCount} ${kind}${aggregateCount === 1 ? '' : 's'}`, node: null, group: kind, count: aggregateCount });
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, size * projected.scale, 0, Math.PI * 2);
        ctx.fillStyle = kind === 'program' ? 'rgba(154,230,199,0.16)' : kind === 'asset' ? 'rgba(255,209,142,0.14)' : 'rgba(124,160,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = hovered ? `rgba(${accent[0]},${accent[1]},${accent[2]},0.9)` : 'rgba(255,255,255,0.28)';
        ctx.lineWidth = hovered ? 1.6 : 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = `600 ${Math.max(10, minDim * 0.027)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(aggregateCount), projected.x, projected.y);
        ctx.restore();
      });

      if (mode === 'cluster') {
        entries.slice(0, 12).forEach((entry, index) => {
          const groupIndex = groupOrder.indexOf(entry.kind);
          const centerVec = groupCenters[entry.kind] || [0, 0, 0.35];
          const offset = (index % 6) * 0.06;
          const vec = [
            centerVec[0] + Math.cos(index * 1.9) * offset,
            centerVec[1] + Math.sin(index * 1.3) * offset * 0.8,
            centerVec[2] + Math.sin(index * 0.7) * 0.06,
          ];
          const projected = this._projectRuntimePreviewPoint(vec, centerX, centerY, entityRadius, rotX, rotY, zoom, 0);
          const key = entry.key || `${entry.kind}-${index}`;
          const hovered = this.runtimePreview.hoverKey === key;
          targets.push({ key, x: projected.x, y: projected.y, radius: 12 * projected.scale, entry, kind: entry.kind, label: entry.label, node: entry.value?.node || null, group: entry.group });
          this._drawRuntimePreviewNode(ctx, entry, projected, 12, hovered);
        });
      }
    }

    this.runtimePreview.targets = targets;

    if (this.runtimePreviewTooltipEl) {
      const hovered = targets.find(target => target.key === this.runtimePreview.hoverKey);
      if (hovered) {
        this.runtimePreviewTooltipEl.hidden = false;
        const kindLabel = hovered.kind === 'vertex' ? 'Child' : hovered.kind === 'program' ? 'Program' : 'Asset';
        this.runtimePreviewTooltipEl.textContent = hovered.count ? `${kindLabel} cluster · ${hovered.label}` : `${kindLabel} · ${hovered.label}`;
        this.runtimePreviewTooltipEl.style.transform = `translate(${Math.round(hovered.x + 12)}px, ${Math.round(hovered.y + 12)}px)`;
      } else {
        this.runtimePreviewTooltipEl.hidden = true;
      }
    }
    previewState.dirty = false;
    previewState.lastDrawAt = now;
  }

  _renderExplorer() {
    const nodes = this._getVisibleNodes();
    if (graphosExplorerSearchEl && graphosExplorerSearchEl.value !== this.explorer.search) {
      graphosExplorerSearchEl.value = this.explorer.search || '';
    }
    if (graphosTypeFilterEl && graphosTypeFilterEl.value !== (this.view.activeType || '')) {
      graphosTypeFilterEl.value = this.view.activeType || '';
    }
    this._renderExplorerNodeList(nodes);
    const target = this._getInspectorTarget();
    this._renderExplorerSelection(target);
    this._renderExplorerTabs(target);
    this._renderExplorerPanel(target);
  }

  _setSelection(nodes = [], link = null) {
    this.selectedNodes.forEach(node => { node.selected = false; });
    this.selectedNodes.clear();
    nodes.filter(Boolean).forEach(node => {
      this.selectedNodes.add(node);
      node.selected = true;
    });
    this.selectedLink = link;
    const primaryNode = nodes[0] || null;
    if (primaryNode) {
      this.explorer.activeTab = 'contents';
      this._openExplorerPath(primaryNode);
      this._focusRuntimePreviewOnNode(primaryNode);
      this._logExplorerEvent('select', primaryNode, primaryNode.type || 'Vertex selected');
    } else if (link) {
      this.explorer.activeTab = 'relations';
      this._logExplorerEvent('select-link', link.a || link.b || null, `${link.a?.name || 'Vertex'} ↔ ${link.b?.name || 'Vertex'}`);
    }
    selectedGraphosLayer = primaryNode ? this._getGraphosFocusForNode(primaryNode) : null;
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
    if (link) {
      this._logExplorerEvent('select-link', link.a || link.b || null, `${link.a?.name || 'Vertex'} ↔ ${link.b?.name || 'Vertex'}`);
      this.explorer.activeTab = 'relations';
    }
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
      this._logExplorerEvent('deleted', node, node.type || 'Vertex');
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
    this._logExplorerEvent('link-deleted', link.a || link.b || null, `${link.a?.name || 'Vertex'} ↔ ${link.b?.name || 'Vertex'}`);
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
    if (node.bodyVisible ?? node.showCore) {
      return node.r * GRAPHOS_LIVE.CORE_RATIO * GRAPHOS_TOUCH_HIT_SCALE;
    }
    const display = node.displayRadius || node.r;
    return Math.max(display, node.r * 0.6) * GRAPHOS_TOUCH_HIT_SCALE;
  }

  _getNodeCoreAt(x, y, exclude = null) {
    return this._getNodeCoreCandidatesAt(x, y, exclude)[0]?.node || null;
  }

  _getNodeAt(x, y, exclude = null) {
    return this._getNodeCoreAt(x, y, exclude) || this._getContainingNodeAt(x, y, exclude);
  }

  _getNodeCoreCandidatesAt(x, y, exclude = null) {
    return this.nodes
      .map((node, index) => {
        if (node === exclude) return null;
        const hitRadius = this._getNodeHitRadius(node);
        const distance = this.dist(node.x, node.y, x, y);
        if (distance > hitRadius) return null;
        return {
          node,
          distance,
          score: (distance / Math.max(1, hitRadius)) + (node.depth || 0) * -0.08 + index * -0.0001,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
  }

  _getContainingNodeAt(x, y, exclude = null) {
    return this._getContainingNodeCandidatesAt(x, y, exclude)[0]?.node || null;
  }

  _getContainingNodeCandidatesAt(x, y, exclude = null) {
    return this.nodes.map((node, index) => {
      if (node === exclude) return false;
      let current = node;
      while (current) {
        if (current === exclude) return null;
        current = current.parent;
      }
      const distance = this.dist(node.x, node.y, x, y);
      if (distance > node.r) return null;
      return {
        node,
        distance,
        score: node.r + distance * 0.18 + (node.depth || 0) * -0.5 + index * -0.0001,
      };
    }).filter(Boolean).sort((a, b) => a.score - b.score);
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
    if (!other || (node.bodyVisible ?? node.showCore)) {
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
    this.hoveredNodeStack = [];
    this.nodes.forEach(node => {
      node.hover = false;
      node.overlapCandidate = false;
      node.isContainedPreview = false;
    });
  }

  _updateHover(x, y) {
    this._clearHoverState();
    const coreCandidates = this._getNodeCoreCandidatesAt(x, y);
    const containingCandidates = coreCandidates.length ? [] : this._getContainingNodeCandidatesAt(x, y);
    this.hoveredNodeStack = [...coreCandidates, ...containingCandidates].slice(0, 4).map(item => item.node);
    this.hoveredNode = this.hoveredNodeStack[0] || null;
    if (this.hoveredNode) {
      this.hoveredNode.hover = true;
      this.hoveredNodeStack.slice(1).forEach(node => { node.overlapCandidate = true; });
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
            const newType = prompt('Set vertex type:', node.type || '');
            node.type = newType || null;
            this._logExplorerEvent('type-changed', node, node.type || 'Untyped');
            this.saveGraph();
            this._refreshTypeFilter();
            this._refreshUi();
          },
        },
        {
          label: (node.bodyVisible ?? node.showCore) ? 'Hide body' : 'Show body',
          action: () => {
            const next = !(node.bodyVisible ?? node.showCore);
            node.bodyVisible = next;
            node.showCore = next;
            this._logExplorerEvent('body-toggled', node, next ? 'Body visible' : 'Membrane only');
            this.saveGraph();
            this._refreshUi();
          },
        },
        {
          label: 'Rename vertex',
          action: () => {
            const newName = prompt('Rename vertex:', node.name);
            if (newName) {
              node.name = newName;
              this._logExplorerEvent('renamed', node, newName);
              this.saveGraph();
              this._refreshUi();
            }
          },
        },
        {
          label: deleteSelection ? 'Delete selected vertices' : 'Delete vertex',
          action: () => {
            if (deleteSelection) {
              this._logExplorerEvent('delete', node, 'Selected vertices');
              this._deleteNodes(Array.from(this.selectedNodes));
            } else {
              this._logExplorerEvent('delete', node, 'Vertex');
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
          label: `Delete tie (${link.a?.name || 'Vertex'} ↔ ${link.b?.name || 'Vertex'})`,
          action: () => this._deleteLink(link),
        },
      ]);
      return;
    }

    const items = [];
    if (this.selectedNodes.size > 0) {
      items.push({
        label: this.selectedNodes.size > 1 ? 'Delete selected vertices' : 'Delete selected vertex',
        action: () => this._deleteNodes(Array.from(this.selectedNodes)),
      });
    }

    items.push({
      label: 'Create vertex',
      action: () => {
        const created = this.createNode(x, y, {
          name: 'Vertex',
          type: null,
          color: randChoice(GRAPHOS_LIVE_COLORS),
          baseR: 12,
          r: 12,
        });
        this._logExplorerEvent('created', created, 'Vertex');
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
      swatch.title = 'Change vertex color';
      swatch.addEventListener('pointerdown', e => {
        e.stopPropagation();
        this._openColorPicker(e.clientX, e.clientY);
      });

      const coreToggle = document.createElement('button');
      coreToggle.type = 'button';
      coreToggle.className = 'graphos-context-menu__toggle';
      coreToggle.textContent = (this.contextTarget.bodyVisible ?? this.contextTarget.showCore) ? 'Hide body' : 'Show body';
      coreToggle.addEventListener('click', e => {
        e.stopPropagation();
        const next = !(this.contextTarget.bodyVisible ?? this.contextTarget.showCore);
        this.contextTarget.bodyVisible = next;
        this.contextTarget.showCore = next;
        this.saveGraph();
        this._refreshUi();
        this._hideMenu();
      });

      const nameBlock = document.createElement('div');
      nameBlock.className = 'graphos-context-menu__name';
      nameBlock.textContent = this.contextTarget.name;
      nameBlock.title = 'Rename vertex';
      nameBlock.addEventListener('click', e => {
        e.stopPropagation();
        const newName = prompt('Rename vertex:', this.contextTarget.name);
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
    this._logExplorerEvent('color-changed', this.contextTarget, this.contextTarget.color);
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
          label: 'Link selected vertices',
          action: () => {
            const arr = Array.from(this.selectedNodes);
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                const a = arr[i];
                const b = arr[j];
                const exists = this.links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
                if (!exists) {
                  this.links.push({ a, b });
                  this._logExplorerEvent('link-created', a, `${a.name || 'Vertex'} ↔ ${b.name || 'Vertex'}`);
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
        label: this.selectedNodes.size > 1 ? 'Delete selected vertices' : 'Delete selected vertex',
        action: () => this._deleteNodes(Array.from(this.selectedNodes)),
      });
    }
    items.push({
      label: 'Create vertex',
      action: () => {
        const created = this.createNode(x, y, {
          name: 'Vertex',
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
    const compactMobile = this._isCompactMobile();

    if (compactMobile) {
      const tapCandidates = [
        ...this._getNodeCoreCandidatesAt(x, y).map(item => item.node),
        ...this._getContainingNodeCandidatesAt(x, y).map(item => item.node),
      ].filter((node, index, arr) => node && arr.indexOf(node) === index);
      this._hideMenu();
      this._endColorPick();
      graphosMobileGesture = {
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        kind: clickedNode ? 'node' : this._getLinkAt(x, y) ? 'link' : 'blank',
        node: clickedNode || null,
        candidates: tapCandidates,
        link: null,
        moved: false,
      };
    }

    if (e.altKey && clickedNode) {
      const duplicate = this.cloneNodeForDuplicate(clickedNode);
      if (duplicate) {
        clicked = duplicate;
        this._logExplorerEvent('duplicated', duplicate, duplicate.type || 'Vertex');
        this._refreshTypeFilter();
        this.saveGraph();
      }
    }

    const clickedLink = clicked ? null : this._getLinkAt(x, y);
    if (compactMobile && graphosMobileGesture) {
      graphosMobileGesture.link = clickedLink || null;
      graphosMobileGesture.kind = clickedNode ? 'node' : clickedLink ? 'link' : 'blank';
    }

    if (clickedLink) {
      this._setLinkSelection(clickedLink);
      if (compactMobile) {
        this._refreshUi();
        return;
      }
      return;
    }

    if (!compactMobile && !clicked && this._isPointInSurfacePreview(x, y)) {
      this._selectSingle(null);
      this._hideMenu();
      if (this._beginSurfacePreviewDrag(x, y, e, this._getSurfacePreviewPose())) {
        return;
      }
    }

    if (e.shiftKey && clicked) {
      this._toggleNodeSelection(clicked);
      if (compactMobile) {
        this._refreshUi();
        return;
      }
      return;
    }

    if (clicked) {
      this._selectSingle(clicked);
      this.draggedNode = clicked;
      this.dragPointerId = e.pointerId;
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;
      this.canvas.setPointerCapture?.(e.pointerId);
      if (compactMobile) {
        this._refreshUi();
      }
      return;
    }

    this._setSelection([]);
    this._hideMenu();
    if (compactMobile) {
      this._refreshUi();
    }
  }

  _onPointerMove(e) {
    if (!this._isActive()) return;
    const { x, y } = this._getCanvasPoint(e);

    if (graphosMobileGesture && e.pointerId === graphosMobileGesture.pointerId) {
      const moved = Math.hypot(x - graphosMobileGesture.startX, y - graphosMobileGesture.startY) > 8;
      graphosMobileGesture.moved = graphosMobileGesture.moved || moved;
    }

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
    const compactMobile = this._isCompactMobile();
    const gesture = graphosMobileGesture && e.pointerId === graphosMobileGesture.pointerId ? graphosMobileGesture : null;

    if (this.draggedSurfacePreview) {
      if (e.pointerId != null && e.pointerId !== this.surfaceDragPointerId) return;
      this._endSurfacePreviewDrag(e);
      this.surfacePreviewHover = false;
      this._refreshUi();
      return;
    }

    if (compactMobile && gesture && this.draggedNode && e.pointerId != null && e.pointerId === this.dragPointerId) {
      const { x, y } = this._getCanvasPoint(e);
      const target = this._getContainingNodeAt(x, y, this.draggedNode);
      if (gesture.kind === 'node' && !gesture.moved) {
        const candidates = Array.isArray(gesture.candidates) && gesture.candidates.length ? gesture.candidates : [gesture.node || this.draggedNode];
        const selected = candidates.findIndex(node => this.selectedNodes.has(node));
        const nextNode = selected >= 0 && candidates.length > 1 ? candidates[(selected + 1) % candidates.length] : candidates[0];
        this._selectSingle(nextNode);
        this._setMobilePanelOpen(true);
        this._beginContextMenu(nextNode, null, e.clientX, e.clientY, e);
        this.saveGraph();
        this.draggedNode.vx *= 0.2;
        this.draggedNode.vy *= 0.2;
        this.draggedNode = null;
        this.dragPointerId = null;
        graphosMobileGesture = null;
        this._syncCoreNode();
        this._refreshUi();
        return;
      }

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
      graphosMobileGesture = null;
      this._syncCoreNode();
      this._refreshUi();
      return;
    }

    if (compactMobile && gesture && !gesture.moved && gesture.kind === 'blank') {
      this._setMobilePanelOpen(true);
      this._beginContextMenu(null, null, e.clientX, e.clientY, e);
      graphosMobileGesture = null;
      return;
    }

    if (compactMobile && gesture && !gesture.moved && gesture.kind === 'link') {
      this._setMobilePanelOpen(true);
      this._beginContextMenu(null, gesture.link, e.clientX, e.clientY, e);
      graphosMobileGesture = null;
      return;
    }

    if (!this.draggedNode) {
      if (this.pickingColor) {
        this._endColorPick();
      }
      graphosMobileGesture = null;
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
    graphosMobileGesture = null;
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
    graphosMobileGesture = null;
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
    if (this._isCompactMobile()) {
      if (hoveredGraphosLayer) return hoveredGraphosLayer;
      if (selectedGraphosLayer) return selectedGraphosLayer;
      if (this.hoveredLink) return 'edge';
      if (this.hoveredNode) return 'node';
      return 'node';
    }
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
    const ctx = this.backgroundCtx || this.ctx;
    const cacheKey = `${this.w}x${this.h}:${focusLayer || 'none'}`;
    if (this.backgroundCtx && this.backgroundCacheKey === cacheKey) {
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
      return;
    }

    if (this.backgroundCanvas) {
      this.backgroundCanvas.width = Math.max(1, Math.round(this.w));
      this.backgroundCanvas.height = Math.max(1, Math.round(this.h));
    }

    const bg = ctx.createRadialGradient(
      this.w * 0.52,
      this.h * 0.44,
      0,
      this.w * 0.5,
      this.h * 0.48,
      Math.max(this.w, this.h) * 0.92,
    );
    bg.addColorStop(0, 'rgba(14,16,22,1)');
    bg.addColorStop(0.7, 'rgba(8,10,14,1)');
    bg.addColorStop(1, 'rgba(3,4,6,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    const gridAlpha = focusLayer === 'context' ? 0.07 : focusLayer === 'surface' ? 0.052 : 0.042;
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

    if (this.backgroundCtx) {
      this.backgroundCacheKey = cacheKey;
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
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
      ctx.shadowColor = 'rgba(255,255,255,0.18)';
      ctx.shadowBlur = 8;
      const alpha = 0.48 + (i % 2) * 0.08 + (focused ? 0.16 : 0);
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
    const thresholdSq = threshold * threshold;
    const edgeFocusBoost = focusLayer === 'edge' ? 1.35 : focusLayer === 'group' ? 1.12 : 1;
    const showFilter = this.view.activeType;
    const strokeWidth = focusLayer === 'edge' ? 1.25 : focusLayer === 'group' ? 1.05 : 0.86;
    const baseAlpha = focusLayer === 'edge' ? 0.34 : focusLayer === 'group' ? 0.26 : 0.2;

    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        if (showFilter && a.type !== showFilter && b.type !== showFilter) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < thresholdSq) {
          const proximity = 1 - distSq / thresholdSq;
          const alpha = proximity * baseAlpha * edgeFocusBoost;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  _drawNodes(focusLayer) {
    if (!this.view.showNodes) return;
    const filtered = this.nodes.filter(node => !this.view.activeType || node.type === this.view.activeType);
    const sortedNodes = [...filtered].sort((a, b) => (a.depth || 0) - (b.depth || 0));
    sortedNodes.forEach(node => {
      node.draw(this.ctx, focusLayer, this);
      if (this.selectedNodes.has(node)) {
        this.ctx.save();
        const rgb = this._hexToRgb(node.color || '#7ca0ff');
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.42)`;
        this.ctx.shadowBlur = 16;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, (node.displayRadius || node.r) + 5, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.42)`;
        this.ctx.lineWidth = 1.25;
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, (node.displayRadius || node.r) * 0.42, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.22)';
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
    if (!this._isCompactMobile()) {
      this._drawContextRibbon(focusLayer);
      this._drawIntentFlux(focusLayer);
    }
    this._drawLinks(focusLayer);
    this._drawNodes(focusLayer);
    this._drawExplorerPreview();
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
    this._setMobilePanelOpen(false);
    this.draggedNode = null;
    this.dragPointerId = null;
    this.draggedSurfacePreview = false;
    this.surfaceDragPointerId = null;
    this.surfaceDragOffsetX = 0;
    this.surfaceDragOffsetY = 0;
    this.surfacePreviewHover = false;
    this._hideMenu();
    this._endColorPick();
    this.backgroundCacheKey = '';
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  resize() {
    this._resize();
    this.backgroundCacheKey = '';
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
//   graph     → complexity, connection (VASTE / VASTE graph demo / R&D / Physical)
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

  // Inquiry — question bridge into VASTE
  bridge:      [InquiryScene,     { speed: 0.16, edgeAlpha: 0.18 }],

  // VASTE — standard graph, baseline visual language
  vaste:       [GraphScene,       { nodeCount: 22, speed: 0.45, thresh: 0.28,
                                    edgeAlpha: 0.22, nodeAlpha: [0.32, 0.48] }],

  // VASTE graph demo — primitives, draggable window, and surface projection
  graphos:     [GraphOSLiveScene, null],

  // Unification — gentle convergence
  unification: [ConvergenceScene, { cycleDur: 4.5, particles: 30, spread: 260, sharp: false }],

  // Extensions — core + capacities docking
  modules:     [ModulesScene,     null],

  // Vestiges — archival field with nodes and artifacts
  vestiges:    [VestigeScene,     null],

  // Infrastructure — surface, Environment, Actions, and canonical core
  infrastructure: [InfrastructureScene, null],

  // Build — construction system with studio, program, environment, vertices, extensions, and assets
  build:       [BuildScene,       null],

  // Combination — same system, larger grid, centered
  combination: [AssembleScene,    { cols: 5, rows: 4, gap: 26, cx: 0.5, cy: 0.5 }],

  // Physical layer — network meets perception
  physical:    [PhysicalLayerScene, { nodeCount: 22, speed: 0.24 }],

  // One system — standard convergence
  onesystem:   [ConvergenceScene, { cycleDur: 3.5, particles: 38, spread: 300, sharp: false }],

  // Rupture — sharp, fast convergence (discontinuity feeling)
  rupture:     [ConvergenceScene, { cycleDur: 2.4, particles: 45, spread: 340, sharp: true }],

  // Use cases — term cloud, many domains
  usecases:    [UseCasesScene,    null],

  // Next — acceleration cloud of plus signs
  next:        [NextScene,        null],

  // Horizon — long-term systems projection and evolution lattice
  horizon:     [HorizonScene,     null],

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
    bridge:      'canvas-bridge',
    vaste:       'canvas-vaste',
    graphos:     'canvas-graphos',
    unification: 'canvas-unification',
    vestiges:    'canvas-vestiges',
    infrastructure: 'canvas-infrastructure',
    modules:     'canvas-modules',
    build:       'canvas-build',
    combination: 'canvas-combination',
    usecases:    'canvas-usecases',
    next:        'canvas-next',
    horizon:     'canvas-horizon',
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

  // Use cases drum controller (HTML-driven)
  const ucSlide = document.querySelector('[data-slide="usecases"]');
  if (ucSlide) ucController = new UseCasesController(ucSlide);
}

function startScene(key) {
  if (document.hidden) return;
  if (scenes[key]) scenes[key].start();
}
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
  if (isInsideGraphosExplorer(e.target)) {
    wheelAcc = 0;
    clearTimeout(wheelTimer);
    if (!e.defaultPrevented) e.preventDefault();
    return;
  }
  if (shouldLockWheelNav(e.target)) {
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
let touchScrollableAncestor = null;
document.addEventListener('touchstart', e => {
  touchScrollableAncestor = getScrollableAncestor(e.target);
  touchNavLocked = shouldLockTouchNav(e.target);
  if (e.touches && e.touches[0]) {
    touchY0 = e.touches[0].clientY;
  }
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!e.changedTouches || !e.changedTouches[0]) {
    touchNavLocked = false;
    touchScrollableAncestor = null;
    return;
  }
  const diff = touchY0 - e.changedTouches[0].clientY;
  if (touchScrollableAncestor && canElementScroll(touchScrollableAncestor, diff)) {
    touchNavLocked = false;
    touchScrollableAncestor = null;
    return;
  }
  if (touchNavLocked) {
    touchNavLocked = false;
    touchScrollableAncestor = null;
    return;
  }
  if (Math.abs(diff) > 45) goTo(currentIndex + (diff > 0 ? 1 : -1));
  touchScrollableAncestor = null;
}, { passive: true });
document.addEventListener('touchcancel', () => {
  touchNavLocked = false;
  touchScrollableAncestor = null;
}, { passive: true });

window.addEventListener('resize', () => {
  updateViewportMetrics();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    Object.values(scenes).forEach(s => s.resize && s.resize());
    if (mistBg) mistBg.resize();
    syncGraphosWindowPosition();
    updateUI();
    resizeTimer = null;
  }, 120);
}, { passive: true });

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateViewportMetrics, { passive: true });
  window.visualViewport.addEventListener('scroll', updateViewportMetrics, { passive: true });
}

window.addEventListener('orientationchange', updateViewportMetrics, { passive: true });

document.addEventListener('visibilitychange', () => {
  const activeSlide = slideEls[currentIndex];
  if (!activeSlide) return;
  const key = activeSlide.dataset.slide;
  if (document.hidden) {
    stopScene(key);
    if (mainRafId != null) {
      cancelAnimationFrame(mainRafId);
      mainRafId = null;
    }
  } else {
    startScene(key);
    if (mainRafId == null) {
      mainRafId = requestAnimationFrame(animLoop);
    }
  }
});

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
    if (scenes.graphos.runtimePreviewResizeObserver) {
      scenes.graphos.runtimePreviewResizeObserver.disconnect();
    }
    if (scenes.graphos.runtimePreview?.resizeRaf != null) {
      cancelAnimationFrame(scenes.graphos.runtimePreview.resizeRaf);
      scenes.graphos.runtimePreview.resizeRaf = null;
    }
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
  setupDocumentAccessibility();
  initUI();
  initScenes();
  initBridgeQuestions();
  applyClasses();
  setThemeForSlide(slideEls[0].dataset.slide);
  startScene(slideEls[0].dataset.slide);
  if (mainRafId != null) cancelAnimationFrame(mainRafId);
  mainRafId = requestAnimationFrame(animLoop);
}

init();
