(function () {
  var initialized = false;
  var scrollObserver = null;
  var contentObserver = null;
  var PAGE_ENTER_COUNT = 4;

  var SCROLL_SELECTORS = [
    '.coinbase-case-section',
    '.coinbase-problem-content',
    '.coinbase-trade-modes',
    '.coinbase-context-derivatives',
    '.coinbase-discoverability-mount',
    '.instagram-work-samples__item',
    '.instagram-tune-your-ads',
    '.site-case-tail'
  ].join(',');

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isVisibleNode(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hidden) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return el.getBoundingClientRect().height > 24;
  }

  function markVisible(el) {
    el.classList.add('cs-motion-visible');
  }

  function prepareEnter(el, index) {
    if (!el || el.dataset.csMotion) return;
    el.dataset.csMotion = 'enter';
    if (prefersReducedMotion()) {
      markVisible(el);
      return;
    }
    el.classList.add('cs-motion-enter', 'cs-motion-enter--' + Math.min(index, 5));
  }

  function prepareScroll(el, delayIndex) {
    if (!el || el.dataset.csMotion) return;
    el.dataset.csMotion = 'scroll';
    if (prefersReducedMotion()) {
      markVisible(el);
      return;
    }
    el.classList.add('cs-motion-scroll');
    if (scrollObserver) scrollObserver.observe(el);
  }

  function findHeroContainer() {
    return document.querySelector(
      '#main .framer-16v6uqd, #main [data-framer-name="Hero"], #main [data-framer-name="hero"]'
    );
  }

  function findSectionRoot(node) {
    var framerRoot = document.querySelector('#main [data-framer-root]');
    if (!framerRoot || !node) return null;

    var current = node;
    var best = node;

    while (current && current !== framerRoot) {
      if (current.parentElement === framerRoot) {
        best = current;
        break;
      }
      if (current.className && String(current.className).indexOf('framer-') !== -1) {
        best = current;
      }
      current = current.parentElement;
    }

    return best;
  }

  function collectContentSections() {
    var sections = [];
    var seen = new Set();
    var headings = document.querySelectorAll('#main h3');

    headings.forEach(function (heading) {
      var section = findSectionRoot(heading);
      if (!section || seen.has(section) || !isVisibleNode(section)) return;
      seen.add(section);
      sections.push(section);
    });

    if (sections.length) return sections;

    var root = document.querySelector('#main [data-framer-root]');
    if (!root) return [];
    return Array.prototype.filter.call(root.children, isVisibleNode);
  }

  function runPageEnter() {
    var nav = document.querySelector('.site-case-nav-wrap');
    if (nav) prepareEnter(nav, 0);

    var hero = findHeroContainer();
    if (hero) {
      hero.classList.add('cs-motion-hero');
      hero.dataset.csMotion = 'enter';
    }

    var sections = collectContentSections();
    sections.forEach(function (section, index) {
      var motionIndex = index + 1;
      if (index < PAGE_ENTER_COUNT) {
        prepareEnter(section, motionIndex);
      } else {
        prepareScroll(section, index - PAGE_ENTER_COUNT);
      }
    });
  }

  function scanScrollTargets() {
    document.querySelectorAll(SCROLL_SELECTORS).forEach(function (el, index) {
      if (!isVisibleNode(el)) return;
      prepareScroll(el, index % 6);
    });
  }

  function initScrollObserver() {
    if (!('IntersectionObserver' in window)) return;
    scrollObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        markVisible(entry.target);
        scrollObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px 8% 0px'
    });
  }

  function startContentObserver() {
    var main = document.getElementById('main');
    if (!main || !window.MutationObserver || contentObserver) return;
    contentObserver = new MutationObserver(function () {
      scanScrollTargets();
    });
    contentObserver.observe(main, { childList: true, subtree: true });
    contentObserver.observe(document.body, { childList: true, subtree: true });
  }

  function isCaseStudyReady() {
    return document.body.classList.contains('site-case-ready') ||
      !!document.querySelector('#main [data-framer-root]');
  }

  function initCaseStudyMotion() {
    if (!isCaseStudyReady()) return;

    if (!initialized) {
      initialized = true;
      initScrollObserver();
      startContentObserver();

      if (prefersReducedMotion()) {
        document.body.classList.add('cs-motion-ready');
        runPageEnter();
        scanScrollTargets();
        document.querySelectorAll('.cs-motion-scroll').forEach(markVisible);
        return;
      }

      var handoffDelay = document.body.classList.contains('site-case-ready') ? 160 : 0;
      window.setTimeout(function () {
        document.body.classList.add('cs-motion-ready');
        runPageEnter();
        scanScrollTargets();
      }, handoffDelay);
      return;
    }

    scanScrollTargets();
  }

  window.initCaseStudyMotion = initCaseStudyMotion;

  function tryAutoInit() {
    initCaseStudyMotion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAutoInit);
  } else {
    tryAutoInit();
  }

  window.addEventListener('load', tryAutoInit);

  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (document.body.classList.contains('site-case-ready')) {
        initCaseStudyMotion();
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    var main = document.getElementById('main');
    if (main) {
      new MutationObserver(function () {
        if (document.querySelector('#main [data-framer-root]')) {
          initCaseStudyMotion();
        }
      }).observe(main, { childList: true, subtree: false });
    }
  }

  var hydrationWatch = window.setInterval(function () {
    if (isCaseStudyReady()) {
      window.clearInterval(hydrationWatch);
      initCaseStudyMotion();
    }
  }, 250);

  window.setTimeout(function () {
    window.clearInterval(hydrationWatch);
  }, 15000);
})();
