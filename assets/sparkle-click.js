(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var PARTICLE_COUNT = 10;
  var SKIP = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

  var layer = document.createElement('div');
  layer.className = 'sparkle-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  document.addEventListener(
    'click',
    function (event) {
      if (event.button !== 0) return;
      if (event.target.closest(SKIP)) return;

      var burst = document.createElement('div');
      burst.className = 'sparkle-burst';
      burst.style.left = event.clientX + 'px';
      burst.style.top = event.clientY + 'px';

      for (var i = 0; i < PARTICLE_COUNT; i += 1) {
        var particle = document.createElement('span');
        particle.className = 'sparkle-particle';
        var angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.55;
        var distance = 16 + Math.random() * 30;
        particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
        particle.style.setProperty('--rot', Math.floor(Math.random() * 160 - 80) + 'deg');
        particle.style.setProperty('--size', 8 + Math.floor(Math.random() * 9) + 'px');
        particle.style.setProperty('--delay', Math.floor(Math.random() * 50) + 'ms');
        burst.appendChild(particle);
      }

      layer.appendChild(burst);
      window.setTimeout(function () {
        burst.remove();
      }, 820);
    },
    { passive: true }
  );
})();
