(function () {
  var photos = window.PIXELATOR_PHOTOS || [];
  var layout = window.PIXELATOR_LAYOUT || [];
  var grid = document.getElementById('pixelator-grid');
  var cityWrap = document.getElementById('pixelator-city');
  var cityLabel = document.getElementById('pixelator-city-label');
  var cityA = document.getElementById('pixelator-city-a');
  var cityB = document.getElementById('pixelator-city-b');
  var EAGER_COUNT = 16;

  var activeTile = null;
  var activeCity = '';
  var visibleCityEl = cityA;
  var hiddenCityEl = cityB;
  var tiles = [];
  var eagerLoaded = 0;
  var isShuffling = false;
  var fixedPositions = [];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!grid || !photos.length) return;

  function shuffleArray(items) {
    var list = items.slice();
    for (var i = list.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function mixPhotos(photoList) {
    var groups = {};
    var cities = [];

    photoList.forEach(function (photo) {
      if (!groups[photo.city]) {
        groups[photo.city] = [];
        cities.push(photo.city);
      }
      groups[photo.city].push(photo);
    });

    cities = shuffleArray(cities);
    cities.forEach(function (city) {
      groups[city] = shuffleArray(groups[city]);
    });

    var maxCount = 0;
    cities.forEach(function (city) {
      maxCount = Math.max(maxCount, groups[city].length);
    });

    var mixed = [];
    for (var i = 0; i < maxCount; i += 1) {
      cities.forEach(function (city) {
        if (groups[city][i]) mixed.push(groups[city][i]);
      });
    }

    return shuffleArray(mixed);
  }

  photos = mixPhotos(photos);

  function markLoaded(tile, img) {
    function reveal() {
      tile.classList.add('is-loaded');
    }
    if (img.complete && img.naturalWidth > 0) {
      reveal();
    } else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', reveal, { once: true });
    }
  }

  function setActiveTile(tile) {
    if (activeTile) activeTile.classList.remove('is-active');
    activeTile = tile;
    if (activeTile) activeTile.classList.add('is-active');
  }

  function createPhotoTile(photo) {
    var tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'pixelator__tile';
    tile.dataset.city = photo.city;
    tile.setAttribute('aria-label', photo.city);

    var frame = document.createElement('span');
    frame.className = 'pixelator__frame';

    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.width = 960;
    img.height = 960;
    if (eagerLoaded < EAGER_COUNT) {
      img.loading = 'eager';
      if (eagerLoaded < 6) img.setAttribute('fetchpriority', 'high');
      eagerLoaded += 1;
    } else {
      img.loading = 'lazy';
    }
    img.src = photo.src;

    frame.appendChild(img);
    tile.appendChild(frame);
    markLoaded(tile, img);

    return tile;
  }

  function placeTile(tile, position) {
    tile.style.setProperty('--col', String(position.c));
    tile.style.setProperty('--row', String(position.r));
  }

  function layoutSlotsFromMatrix(matrix) {
    var slots = [];
    matrix.forEach(function (row, rowIndex) {
      row.forEach(function (slot, colIndex) {
        if (slot === 'photo') {
          slots.push({ r: rowIndex + 1, c: colIndex + 1 });
        }
      });
    });
    return slots;
  }

  function applyLayout(orderedTiles, animate) {
    var assignments = orderedTiles.map(function (tile, index) {
      return { tile: tile, position: fixedPositions[index] };
    });

    if (!animate || reduceMotion) {
      assignments.forEach(function (item) {
        placeTile(item.tile, item.position);
      });
      return;
    }

    var firstRects = new Map();
    assignments.forEach(function (item) {
      firstRects.set(item.tile, item.tile.getBoundingClientRect());
    });

    assignments.forEach(function (item) {
      placeTile(item.tile, item.position);
    });

    assignments.forEach(function (item) {
      var tile = item.tile;
      var first = firstRects.get(tile);
      var last = tile.getBoundingClientRect();
      var dx = first.left - last.left;
      var dy = first.top - last.top;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      tile.style.transition = 'none';
      tile.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          tile.style.transition = '';
          tile.style.transform = '';
        });
      });
    });
  }

  function shufflePhotos() {
    if (isShuffling) return;

    isShuffling = true;
    setActiveTile(null);
    hideCity();
    applyLayout(shuffleArray(tiles), true);

    window.setTimeout(function () {
      isShuffling = false;
    }, reduceMotion ? 0 : 560);
  }

  photos.forEach(function (photo) {
    var tile = createPhotoTile(photo);
    tiles.push(tile);
    grid.appendChild(tile);
  });

  fixedPositions = layoutSlotsFromMatrix(layout).slice(0, tiles.length);
  applyLayout(shuffleArray(tiles), false);

  grid.addEventListener('click', function (e) {
    var tile = e.target.closest('.pixelator__tile');
    if (!tile || isShuffling) return;
    shufflePhotos();
  });

  grid.addEventListener('mouseover', function (e) {
    var tile = e.target.closest('.pixelator__tile');
    if (!tile || !tile.dataset.city) return;
    setActiveTile(tile);
    showCity(tile.dataset.city);
  });

  grid.addEventListener('mouseout', function (e) {
    var related = e.relatedTarget;
    if (related && grid.contains(related)) return;
    setActiveTile(null);
    hideCity();
  });

  grid.addEventListener('focusin', function (e) {
    var tile = e.target.closest('.pixelator__tile');
    if (!tile || !tile.dataset.city) return;
    setActiveTile(tile);
    showCity(tile.dataset.city);
  });

  grid.addEventListener('focusout', function (e) {
    var related = e.relatedTarget;
    if (related && grid.contains(related)) return;
    setActiveTile(null);
    hideCity();
  });

  function showCity(city) {
    if (!cityWrap || !cityLabel || !visibleCityEl || !hiddenCityEl) return;

    cityLabel.setAttribute('aria-hidden', 'false');
    cityWrap.classList.add('has-city');
    cityWrap.setAttribute('aria-label', city);

    if (city === activeCity) return;

    if (!activeCity) {
      cityWrap.classList.remove('is-switching');
      visibleCityEl.textContent = city;
      visibleCityEl.classList.add('is-shown');
      hiddenCityEl.classList.remove('is-shown');
      hiddenCityEl.textContent = '';
      activeCity = city;
      return;
    }

    cityWrap.classList.add('is-switching');
    hiddenCityEl.textContent = city;
    hiddenCityEl.classList.add('is-shown');
    visibleCityEl.classList.remove('is-shown');

    var swap = visibleCityEl;
    visibleCityEl = hiddenCityEl;
    hiddenCityEl = swap;
    activeCity = city;
  }

  function hideCity() {
    if (!cityWrap || !cityLabel || !visibleCityEl || !hiddenCityEl) return;

    cityLabel.setAttribute('aria-hidden', 'true');
    cityWrap.classList.remove('has-city', 'is-switching');
    cityWrap.removeAttribute('aria-label');
    visibleCityEl.classList.remove('is-shown');
    hiddenCityEl.classList.remove('is-shown');
    activeCity = '';
  }

  document.body.classList.add('is-ready');
})();
