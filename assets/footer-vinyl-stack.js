(function () {
  var ARTISTS = [
    'Olivia Dean',
    'Gracie Abrams',
    'Rex Orange County',
    'Noah Kahan',
    'Taylor Swift'
  ];
  var INTERVAL_MS = 4000;

  var index = 0;

  function init() {
    var artistEl = document.getElementById('footer-listening');
    if (!artistEl) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    window.setInterval(function () {
      artistEl.classList.add('is-fading');
      window.setTimeout(function () {
        index = (index + 1) % ARTISTS.length;
        artistEl.textContent = ARTISTS[index];
        artistEl.classList.remove('is-fading');
      }, 220);
    }, INTERVAL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
