(function () {
  var MIN_H = 72;
  var MAX_H = minMaxHeight();
  var state = {
    items: [],
    weights: { likes: 0.4, comments: 0.6, shares: 0.5 },
    imageBase: ''
  };

  var scrollEl = document.getElementById('memory-scroll');
  var trackEl = document.getElementById('memory-track');
  var zoomEl = document.getElementById('memory-zoom');
  var zoomImg = document.getElementById('zoom-img');
  var zoomClose = document.getElementById('zoom-close');
  var progressFill = document.getElementById('progress-fill');

  var memoryNodes = [];
  var rafId = 0;
  var isDragging = false;
  var dragStartX = 0;
  var dragScrollLeft = 0;
  var didDrag = false;

  function minMaxHeight() {
    return Math.min(window.innerHeight * 0.72, 480);
  }

  function computeScale(item) {
    return (
      item.likes * state.weights.likes +
      item.comments * state.weights.comments +
      (item.shares || 0) * state.weights.shares
    );
  }

  function maxScale(items) {
    var max = 0;
    for (var i = 0; i < items.length; i++) {
      var s = computeScale(items[i]);
      if (s > max) max = s;
    }
    return max || 1;
  }

  function heightForScale(scale, max) {
    if (max <= 0) return MIN_H;
    var t = Math.sqrt(Math.min(1, scale / max));
    return MIN_H + t * (MAX_H - MIN_H);
  }

  function imageUrl(item) {
    return state.imageBase + encodeURI(item.image);
  }

  function renderTrack() {
    if (!trackEl) return;
    var max = maxScale(state.items);
    var list = state.items.slice().sort(function (a, b) {
      return computeScale(b) - computeScale(a);
    });

    trackEl.innerHTML = '';
    memoryNodes = [];

    for (var i = 0; i < list.length; i++) {
      (function (item, index) {
        var scale = computeScale(item);
        var height = Math.round(heightForScale(scale, max));
        var width = height;
        var card = document.createElement('div');
        card.className = 'im-memory';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.style.setProperty('--im-w', width + 'px');
        card.style.setProperty('--im-h', height + 'px');
        card.dataset.scale = scale.toFixed(1);

        card.innerHTML =
          '<div class="im-memory__inner">' +
            '<span class="im-memory__glow" aria-hidden="true"></span>' +
            '<div class="im-memory__frame">' +
              '<img class="im-memory__img" src="' + imageUrl(item) + '" alt="" width="' + width + '" height="' + height + '" loading="' + (index < 12 ? 'eager' : 'lazy') + '" decoding="async" draggable="false">' +
            '</div>' +
          '</div>';

        card.addEventListener('click', function () {
          if (didDrag) return;
          openZoom(imageUrl(item));
        });

        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openZoom(imageUrl(item));
          }
        });

        trackEl.appendChild(card);
        memoryNodes.push(card);
      })(list[i], i);
    }

    requestAnimationFrame(function () {
      memoryNodes.forEach(function (node, idx) {
        setTimeout(function () {
          node.classList.add('is-ready');
        }, idx * 10);
      });
      sizeTrack();
      if (scrollEl && scrollEl.scrollWidth > scrollEl.clientWidth) {
        scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) * 0.06;
      }
      updateFocus();
      updateProgress();
    });
  }

  function updateProgress() {
    if (!scrollEl || !progressFill) return;
    var max = scrollEl.scrollWidth - scrollEl.clientWidth;
    if (max <= 0) {
      progressFill.style.width = '100%';
      return;
    }
    progressFill.style.width = ((scrollEl.scrollLeft / max) * 100) + '%';
  }

  function sizeTrack() {
    if (!trackEl || !scrollEl) return;
    var total = 0;
    for (var i = 0; i < memoryNodes.length; i++) {
      var nodeStyle = window.getComputedStyle(memoryNodes[i]);
      total += memoryNodes[i].offsetWidth +
        parseFloat(nodeStyle.marginLeft) +
        parseFloat(nodeStyle.marginRight);
    }
    var style = window.getComputedStyle(trackEl);
    var pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    trackEl.style.width = (total + pad) + 'px';
  }

  function updateFocus() {
    if (!scrollEl || !memoryNodes.length) return;

    var rect = scrollEl.getBoundingClientRect();
    var center = rect.left + rect.width / 2;
    var closest = null;
    var closestDist = Infinity;

    for (var i = 0; i < memoryNodes.length; i++) {
      var node = memoryNodes[i];
      var nr = node.getBoundingClientRect();
      var nodeCenter = nr.left + nr.width / 2;
      var dist = Math.abs(center - nodeCenter);
      var focus = Math.max(0, 1 - dist / (rect.width * 0.42));
      node.style.setProperty('--im-focus', focus.toFixed(3));

      if (dist < closestDist) {
        closestDist = dist;
        closest = node;
      }
    }

    memoryNodes.forEach(function (node) {
      node.classList.toggle('is-hovered', node === closest && closestDist < rect.width * 0.28);
    });
  }

  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      updateFocus();
      updateProgress();
    });
  }

  function bindScroll() {
    if (!scrollEl) return;

    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    scrollEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      isDragging = true;
      didDrag = false;
      dragStartX = e.clientX;
      dragScrollLeft = scrollEl.scrollLeft;
      scrollEl.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 2) didDrag = true;
      scrollEl.scrollLeft = dragScrollLeft - dx;
      updateProgress();
    });

    window.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      scrollEl.classList.remove('is-dragging');
      setTimeout(function () { didDrag = false; }, 50);
    });

    document.addEventListener('wheel', function (e) {
      if (!scrollEl || (zoomEl && !zoomEl.hidden)) return;
      var max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max <= 0) return;

      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;

      e.preventDefault();
      scrollEl.scrollLeft = Math.max(0, Math.min(max, scrollEl.scrollLeft + delta));
      updateProgress();
    }, { passive: false });
  }

  function openZoom(src) {
    if (!zoomEl || !zoomImg) return;
    zoomImg.src = src;
    zoomEl.hidden = false;
    requestAnimationFrame(function () {
      zoomEl.classList.add('is-open');
    });
  }

  function closeZoom() {
    if (!zoomEl) return;
    zoomEl.classList.remove('is-open');
    setTimeout(function () {
      zoomEl.hidden = true;
      zoomImg.removeAttribute('src');
    }, 320);
  }

  function bindZoom() {
    if (zoomClose) zoomClose.addEventListener('click', closeZoom);
    if (zoomEl) {
      zoomEl.addEventListener('click', function (e) {
        if (e.target === zoomEl) closeZoom();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeZoom();
      if (!scrollEl || (zoomEl && !zoomEl.hidden)) return;
      if (e.key === 'ArrowRight') {
        scrollEl.scrollLeft += 120;
        updateProgress();
      }
      if (e.key === 'ArrowLeft') {
        scrollEl.scrollLeft -= 120;
        updateProgress();
      }
    });
  }

  window.addEventListener('resize', function () {
    MAX_H = minMaxHeight();
    renderTrack();
  });

  function init(data) {
    state.items = data.items;
    state.weights = data.weights;
    state.imageBase = data.imageBase;
    MAX_H = minMaxHeight();
    bindScroll();
    bindZoom();
    renderTrack();
  }

  if (!scrollEl || !trackEl) return;

  if (window.MEMORY_DATA) {
    init(window.MEMORY_DATA);
    return;
  }

  fetch('../assets/instagram-memory-data.json')
    .then(function (res) {
      if (!res.ok) throw new Error('fetch failed');
      return res.json();
    })
    .then(init)
    .catch(console.error);
})();
