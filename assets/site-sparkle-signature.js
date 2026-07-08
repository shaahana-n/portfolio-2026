(function () {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getStartDelay() {
    var value = getComputedStyle(document.documentElement).getPropertyValue('--site-signature-start-delay');
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 1300;
  }

  function beginReveal(link, text) {
    if (link.classList.contains('is-revealed') || link.classList.contains('is-animating')) return;

    link.classList.add('is-animating');

    if (reducedMotion) {
      text.classList.remove('is-drawing');
      text.style.clipPath = 'inset(0 0 0 0)';
      link.classList.remove('is-animating');
      link.classList.add('is-revealed');
      return;
    }

    text.classList.remove('is-drawing');
    text.style.clipPath = 'inset(0 100% 0 0)';
    void text.offsetWidth;
    text.classList.add('is-drawing');
  }

  function finishReveal(link, text) {
    text.classList.remove('is-drawing');
    text.style.clipPath = 'inset(0 0 0 0)';
    link.classList.remove('is-animating');
    link.classList.add('is-revealed');
  }

  function playLandingSignatures() {
    setTimeout(function () {
      document.querySelectorAll('.site-sparkle').forEach(function (link) {
        var text = link.querySelector('.site-sparkle__signature-text');
        if (!text) return;
        beginReveal(link, text);
      });
    }, getStartDelay());
  }

  function initSparkleSignatures() {
    document.querySelectorAll('.site-sparkle').forEach(function (link) {
      var text = link.querySelector('.site-sparkle__signature-text');
      if (!text) return;

      text.style.clipPath = 'inset(0 100% 0 0)';

      text.addEventListener('animationend', function () {
        if (text.classList.contains('is-drawing')) {
          finishReveal(link, text);
        }
      });
    });

    if (document.body.classList.contains('loaded')) {
      playLandingSignatures();
      return;
    }

    var observer = new MutationObserver(function () {
      if (!document.body.classList.contains('loaded')) return;
      observer.disconnect();
      playLandingSignatures();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initSparkleSignatures).catch(initSparkleSignatures);
  } else {
    initSparkleSignatures();
  }
})();
