(function () {
  var photos = window.PIXELATOR_PHOTOS || [];
  var layoutTemplate = window.PIXELATOR_LAYOUT || [];
  var grid = document.getElementById('pixelator-grid');
  var pixelatorEl = document.querySelector('.pixelator');
  var cityWrap = document.getElementById('pixelator-city');
  var cityLabel = document.getElementById('pixelator-city-label');
  var cityA = document.getElementById('pixelator-city-a');
  var cityB = document.getElementById('pixelator-city-b');
  var footerLogo = document.querySelector('.pixelator-footer__logo');
  var EAGER_COUNT = 40;
  var MIN_COLS = 4;
  var SWAP_COUNT_MIN = 2;
  var SWAP_COUNT_MAX = 4;
  var EASTER_EGG_CLICKS = 5;
  var EASTER_EGG_WINDOW = 450;
  var WORLD_TOUR_QUIPS = [
    'Bon voyage',
    'All aboard',
    'See you out there',
    'Pack light',
    'Next stop: everywhere'
  ];

  var activeTile = null;
  var activeCity = '';
  var visibleCityEl = cityA;
  var hiddenCityEl = cityB;
  var tiles = [];
  var eagerLoaded = 0;
  var isShuffling = false;
  var fixedPositions = [];
  var imageColorPool = [];
  var currentGridLayout = [];
  var emptyColorTimer = null;
  var burstLayer = null;
  var quipTimer = null;
  var logoClickCount = 0;
  var logoClickTimer = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var resizeTimer;

  if (!grid || !photos.length || !layoutTemplate.length) return;

  function getStageSize() {
    if (!pixelatorEl) {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return {
      width: pixelatorEl.clientWidth,
      height: pixelatorEl.clientHeight
    };
  }

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

  function getBurstLayer() {
    if (!burstLayer) {
      burstLayer = document.createElement('div');
      burstLayer.className = 'pixelator-burst-layer';
      burstLayer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(burstLayer);
    }
    return burstLayer;
  }

  function spawnPixelBurst(x, y, intensity) {
    if (reduceMotion) return;

    intensity = intensity || 1;
    var count = Math.round(12 * intensity);
    var layer = getBurstLayer();
    var burst = document.createElement('div');
    burst.className = 'pixelator-burst';
    burst.style.left = x + 'px';
    burst.style.top = y + 'px';

    for (var i = 0; i < count; i += 1) {
      var particle = document.createElement('span');
      particle.className = 'pixelator-burst__pixel';
      var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      var distance = (14 + Math.random() * 28) * intensity;
      particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
      particle.style.setProperty('--size', 4 + Math.floor(Math.random() * 5) + 'px');
      particle.style.setProperty('--delay', Math.floor(Math.random() * 40) + 'ms');
      burst.appendChild(particle);
    }

    layer.appendChild(burst);
    window.setTimeout(function () {
      burst.remove();
    }, 720);
  }

  function burstAtElement(el, intensity) {
    var rect = el.getBoundingClientRect();
    spawnPixelBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, intensity);
  }

  function countPhotoSlots(matrix) {
    var total = 0;
    matrix.forEach(function (row) {
      row.forEach(function (slot) {
        if (slot === 'photo') total += 1;
      });
    });
    return total;
  }

  function scaleLayoutRow(row, targetCols, sourceCols) {
    var scaled = Array(targetCols).fill('empty');
    row.forEach(function (slot, colIndex) {
      if (slot !== 'photo') return;
      var targetCol = Math.min(
        targetCols - 1,
        Math.floor(((colIndex + 0.5) / sourceCols) * targetCols)
      );
      while (targetCol < targetCols && scaled[targetCol] === 'photo') {
        targetCol += 1;
      }
      if (targetCol < targetCols) {
        scaled[targetCol] = 'photo';
        return;
      }
      for (var c = 0; c < targetCols; c += 1) {
        if (scaled[c] === 'empty') {
          scaled[c] = 'photo';
          break;
        }
      }
    });
    return scaled;
  }

  function buildLayoutForViewport() {
    var sourceCols = layoutTemplate[0].length;

    function makeMatrix(cols) {
      var matrix = layoutTemplate.map(function (row) {
        return scaleLayoutRow(row, cols, sourceCols);
      });
      var rowIndex = 0;
      while (countPhotoSlots(matrix) < photos.length) {
        var sourceRow = layoutTemplate[rowIndex % layoutTemplate.length];
        matrix.push(scaleLayoutRow(sourceRow, cols, sourceCols));
        rowIndex += 1;
      }
      return matrix;
    }

    var stage = getStageSize();
    var rows = layoutTemplate.length;
    var cellSize = stage.height / rows;
    var cols = Math.max(MIN_COLS, Math.floor(stage.width / cellSize));
    var matrix = makeMatrix(cols);

    rows = matrix.length;
    cellSize = stage.height / rows;
    cols = Math.max(MIN_COLS, Math.floor(stage.width / cellSize));
    matrix = makeMatrix(cols);
    rows = matrix.length;
    cellSize = stage.height / rows;

    return {
      matrix: matrix,
      cols: cols,
      rows: rows,
      cellSize: cellSize
    };
  }

  function rgbString(rgb) {
    return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
  }

  function averageFromImageData(data) {
    var r = 0;
    var g = 0;
    var b = 0;
    var count = 0;

    for (var i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }

    if (!count) return '';

    return rgbString({
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    });
  }

  function sampleDrawable(drawable, callback) {
    var canvas = document.createElement('canvas');
    var size = 12;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(drawable, 0, 0, size, size);
    var color = averageFromImageData(ctx.getImageData(0, 0, size, size).data);
    if (color) callback(color);
  }

  function sampleImageColor(img, callback) {
    if (!img.naturalWidth) return;

    try {
      sampleDrawable(img, callback);
    } catch (err) {
      if (!window.createImageBitmap || !window.fetch) return;

      fetch(img.src)
        .then(function (response) {
          if (!response.ok) throw new Error('fetch failed');
          return response.blob();
        })
        .then(function (blob) {
          return createImageBitmap(blob);
        })
        .then(function (bitmap) {
          sampleDrawable(bitmap, callback);
          bitmap.close();
        })
        .catch(function () {});
    }
  }

  function rememberImageColor(color) {
    if (!color || imageColorPool.indexOf(color) !== -1) return;
    imageColorPool.push(color);
  }

  function attachColorSampler(tile, img) {
    function store(color) {
      tile.dataset.color = color;
      rememberImageColor(color);
    }

    function sample() {
      sampleImageColor(img, store);
    }

    if (img.complete && img.naturalWidth > 0) {
      sample();
    } else {
      img.addEventListener('load', sample, { once: true });
    }
  }

  function paintEmptyCells() {
    grid.querySelectorAll('.pixelator__cell--empty').forEach(function (cell) {
      if (cell.classList.contains('is-poked')) return;
      cell.style.backgroundColor = '';
    });
  }

  function startEmptyCellColorCycle() {
    if (emptyColorTimer) {
      window.clearInterval(emptyColorTimer);
      emptyColorTimer = null;
    }
  }

  function pokeEmptyCell(cell) {
    if (reduceMotion || !cell) return;

    cell.classList.add('is-poked');
    cell.style.backgroundColor = '#f2ede6';
    burstAtElement(cell, 0.65);

    window.setTimeout(function () {
      cell.classList.remove('is-poked');
      cell.style.backgroundColor = '';
    }, 420);
  }

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

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function srgbToLinear(channel) {
    var c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb(channel) {
    var c = channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
  }

  function getCanvasSize(tile) {
    var rect = tile.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    var max = 280;

    if (Math.max(w, h) > max) {
      var scale = max / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    return { w: w, h: h };
  }

  function getDrawable(state) {
    return state.bitmap || state.source;
  }

  function loadSourceBitmap(tile, callback) {
    var state = tile._depixelate;
    if (state.bitmap) {
      callback(true);
      return;
    }

    var src = state.source.src || state.source.dataset.src;
    if (!src || !window.fetch || !window.createImageBitmap) {
      callback(true);
      return;
    }

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error('fetch failed');
        return response.blob();
      })
      .then(function (blob) {
        return createImageBitmap(blob);
      })
      .then(function (bitmap) {
        state.bitmap = bitmap;
        callback(true);
      })
      .catch(function () {
        callback(true);
      });
  }

  function beginPixelFade(tile) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tile.classList.add('is-pixel-fading');
      });
    });
  }

  function revealOriginalFallback(tile) {
    var state = tile._depixelate;
    if (!state || !state.original) return;

    cancelDepixelate(tile);

    function show() {
      if (activeTile !== tile) return;
      tile.classList.add('is-depixelating', 'is-original-fallback');
      beginPixelFade(tile);
      tile.classList.add('is-depixelated');
    }

    if (state.source.src) {
      state.original.src = state.source.src;
    } else if (!state.original.src && state.original.dataset.src) {
      state.original.src = state.original.dataset.src;
    }

    if (state.original.complete && state.original.naturalWidth > 0) {
      show();
    } else {
      state.original.addEventListener('load', show, { once: true });
      state.original.addEventListener('error', show, { once: true });
    }
  }

  function drawCoverImage(ctx, drawable, w, h) {
    var iw = drawable.naturalWidth || drawable.width;
    var ih = drawable.naturalHeight || drawable.height;
    var scale = Math.max(w / iw, h / ih);
    var sw = iw * scale;
    var sh = ih * scale;
    var sx = (w - sw) / 2;
    var sy = (h - sh) / 2;
    ctx.drawImage(drawable, sx, sy, sw, sh);
  }

  function drawMosaicCanvas(canvas, drawable, blockSize, tile) {
    var size = getCanvasSize(tile);
    canvas.width = size.w;
    canvas.height = size.h;

    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var iw = drawable.naturalWidth || drawable.width;
    if (!ctx || !iw) return false;

    if (blockSize <= 1) {
      drawCoverImage(ctx, drawable, size.w, size.h);
      return true;
    }

    var scratch = document.createElement('canvas');
    scratch.width = size.w;
    scratch.height = size.h;
    var sctx = scratch.getContext('2d', { willReadFrequently: true });
    drawCoverImage(sctx, drawable, size.w, size.h);

    var imageData;
    try {
      imageData = sctx.getImageData(0, 0, size.w, size.h);
    } catch (err) {
      drawCoverImage(ctx, drawable, size.w, size.h);
      return false;
    }

    var data = imageData.data;
    var w = size.w;
    var h = size.h;

    ctx.clearRect(0, 0, w, h);

    for (var y = 0; y < h; y += blockSize) {
      for (var x = 0; x < w; x += blockSize) {
        var bw = Math.min(blockSize, w - x);
        var bh = Math.min(blockSize, h - y);
        var lr = 0;
        var lg = 0;
        var lb = 0;
        var count = 0;

        for (var py = y; py < y + bh; py += 1) {
          for (var px = x; px < x + bw; px += 1) {
            var i = (py * w + px) * 4;
            lr += srgbToLinear(data[i]);
            lg += srgbToLinear(data[i + 1]);
            lb += srgbToLinear(data[i + 2]);
            count += 1;
          }
        }

        ctx.fillStyle = 'rgb(' +
          linearToSrgb(lr / count) + ',' +
          linearToSrgb(lg / count) + ',' +
          linearToSrgb(lb / count) + ')';
        ctx.fillRect(x, y, bw, bh);
      }
    }

    return true;
  }

  function getStartBlockSize(tile) {
    return Math.max(24, Math.round(tile.offsetWidth / 4));
  }

  function cancelDepixelate(tile) {
    if (!tile || !tile._depixelate) return;
    if (tile._depixelate.raf) {
      cancelAnimationFrame(tile._depixelate.raf);
      tile._depixelate.raf = null;
    }
    tile._depixelate.running = false;
  }

  function runDepixelateAnimation(tile, fromBlock, toBlock, duration) {
    var state = tile._depixelate;
    if (!state) return;

    cancelDepixelate(tile);
    state.running = true;
    state.canMosaic = state.canMosaic !== false;

    if (reduceMotion) {
      if (state.canMosaic) {
        drawMosaicCanvas(state.canvas, getDrawable(state), 1, tile);
        tile.classList.add('is-depixelating');
        beginPixelFade(tile);
        tile.classList.add('is-depixelated');
      } else {
        revealOriginalFallback(tile);
      }
      state.running = false;
      return;
    }

    var start = null;

    function frame(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min(1, (timestamp - start) / duration);
      var eased = easeOutCubic(progress);
      var blockSize = Math.max(1, Math.round(fromBlock + (toBlock - fromBlock) * eased));
      var drawable = getDrawable(state);
      var mosaicOk = true;

      if (state.canMosaic) {
        mosaicOk = drawMosaicCanvas(state.canvas, drawable, blockSize, tile);
        if (!mosaicOk) {
          state.canMosaic = false;
          revealOriginalFallback(tile);
          return;
        }
      }

      if (progress < 1) {
        state.raf = requestAnimationFrame(frame);
        return;
      }

      state.raf = null;
      state.running = false;
      tile.classList.add('is-depixelated');
      tile.classList.remove('is-depixelating');
    }

    tile.classList.add('is-depixelating');
    tile.classList.remove('is-depixelated', 'is-original-fallback', 'is-pixel-fading');
    beginPixelFade(tile);
    state.raf = requestAnimationFrame(frame);
  }

  function ensureSourceLoaded(tile, callback) {
    var state = tile._depixelate;
    if (!state || !state.source) return;

    var source = state.source;

    function afterSourceReady() {
      if (!source.naturalWidth) {
        callback(false);
        return;
      }
      loadSourceBitmap(tile, function () {
        callback(true);
      });
    }

    if (source.dataset.loaded === '1' && source.complete && source.naturalWidth > 0) {
      afterSourceReady();
      return;
    }

    if (source.dataset.loaded !== '1') {
      source.dataset.loaded = '1';
      source.addEventListener('load', afterSourceReady, { once: true });
      source.addEventListener('error', function () {
        callback(false);
      }, { once: true });
      source.src = source.dataset.src;
      return;
    }

    if (source.complete) {
      afterSourceReady();
    }
  }

  function startDepixelate(tile) {
    if (!tile || !tile._depixelate) return;
    if (tile.classList.contains('is-depixelated') || tile._depixelate.running) return;

    ensureSourceLoaded(tile, function (ok) {
      if (!ok) return;
      if (activeTile !== tile) return;

      var state = tile._depixelate;
      var drawable = getDrawable(state);
      var startBlock = getStartBlockSize(tile);
      var mosaicOk = drawMosaicCanvas(state.canvas, drawable, startBlock, tile);

      state.canMosaic = mosaicOk;
      if (!mosaicOk) {
        revealOriginalFallback(tile);
        return;
      }

      tile.classList.add('is-depixelating');
      runDepixelateAnimation(tile, startBlock, 1, 750);
    });
  }

  function stopDepixelate(tile) {
    if (!tile || !tile._depixelate) return;
    cancelDepixelate(tile);
    tile.classList.remove('is-depixelating', 'is-depixelated', 'is-original-fallback', 'is-pixel-fading');
  }

  function setActiveTile(tile) {
    if (activeTile && activeTile !== tile) {
      stopDepixelate(activeTile);
      activeTile.classList.remove('is-active');
    }
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

    var pixelImg = document.createElement('img');
    pixelImg.className = 'pixelator__img--pixel';
    pixelImg.alt = '';
    pixelImg.decoding = 'async';
    pixelImg.draggable = false;
    pixelImg.width = 960;
    pixelImg.height = 960;
    if (eagerLoaded < EAGER_COUNT) {
      pixelImg.loading = 'eager';
      if (eagerLoaded < 6) pixelImg.setAttribute('fetchpriority', 'high');
      eagerLoaded += 1;
    } else {
      pixelImg.loading = 'lazy';
    }
    pixelImg.src = photo.src;

    var canvas = document.createElement('canvas');
    canvas.className = 'pixelator__canvas';
    canvas.setAttribute('aria-hidden', 'true');

    var sourceImg = document.createElement('img');
    sourceImg.className = 'pixelator__img--source';
    sourceImg.alt = '';
    sourceImg.decoding = 'async';
    sourceImg.draggable = false;
    if (photo.original) {
      sourceImg.dataset.src = photo.original;
    }

    var originalImg = document.createElement('img');
    originalImg.className = 'pixelator__img--original';
    originalImg.alt = '';
    originalImg.decoding = 'async';
    originalImg.draggable = false;
    if (photo.original) {
      originalImg.dataset.src = photo.original;
    }

    frame.appendChild(pixelImg);
    frame.appendChild(canvas);
    frame.appendChild(sourceImg);
    frame.appendChild(originalImg);
    tile.appendChild(frame);
    tile._depixelate = {
      canvas: canvas,
      source: sourceImg,
      original: originalImg,
      bitmap: null,
      canMosaic: true,
      raf: null,
      running: false
    };
    markLoaded(tile, pixelImg);
    attachColorSampler(tile, pixelImg);

    return tile;
  }

  function createEmptyCell(position) {
    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'pixelator__cell--empty';
    cell.setAttribute('aria-label', 'Empty slot');
    placeTile(cell, position);
    return cell;
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

  function syncGridSize(gridSpec) {
    grid.style.setProperty('--grid-rows', String(gridSpec.rows));
    grid.style.setProperty('--grid-cols', String(gridSpec.cols));
    grid.style.setProperty('--cell-size', gridSpec.cellSize + 'px');
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

  function partialSwap(items) {
    var list = items.slice();
    var swaps = SWAP_COUNT_MIN + Math.floor(Math.random() * (SWAP_COUNT_MAX - SWAP_COUNT_MIN + 1));

    for (var s = 0; s < swaps; s += 1) {
      var a = Math.floor(Math.random() * list.length);
      var b = Math.floor(Math.random() * list.length);
      if (a === b) continue;
      var temp = list[a];
      list[a] = list[b];
      list[b] = temp;
    }

    return list;
  }

  function finishShuffle(delay) {
    window.setTimeout(function () {
      isShuffling = false;
      paintEmptyCells();
    }, reduceMotion ? 0 : delay);
  }

  function animateGrid(options) {
    options = options || {};
    if (isShuffling) return;

    isShuffling = true;
    if (!options.preserveHover) {
      setActiveTile(null);
      hideCity();
    }
    applyLayout(partialSwap(tiles), true);
    finishShuffle(560);
  }

  function animateGridFull() {
    if (isShuffling) return;

    isShuffling = true;
    setActiveTile(null);
    applyLayout(shuffleArray(tiles), true);
    finishShuffle(800);
  }

  function triggerWorldTour() {
    var quip = WORLD_TOUR_QUIPS[Math.floor(Math.random() * WORLD_TOUR_QUIPS.length)];
    var stage = pixelatorEl ? pixelatorEl.getBoundingClientRect() : null;
    var burstX = stage ? stage.left + stage.width / 2 : window.innerWidth / 2;
    var burstY = stage ? stage.top + stage.height / 2 : window.innerHeight / 2;
    animateGridFull();
    spawnPixelBurst(burstX, burstY, 2);
    showQuip(quip);
  }

  function renderGrid(preserveTiles) {
    var gridSpec = buildLayoutForViewport();
    var gridLayout = gridSpec.matrix;
    currentGridLayout = gridLayout;
    var slots = layoutSlotsFromMatrix(gridLayout);

    fixedPositions = slots.slice(0, photos.length);
    syncGridSize(gridSpec);

    if (!preserveTiles) {
      grid.innerHTML = '';
      tiles = [];

      gridLayout.forEach(function (row, rowIndex) {
        row.forEach(function (slot, colIndex) {
          if (slot !== 'empty') return;
          grid.appendChild(createEmptyCell({ r: rowIndex + 1, c: colIndex + 1 }));
        });
      });

      fixedPositions.forEach(function (position, index) {
        var tile = createPhotoTile(photos[index]);
        tiles.push(tile);
        grid.appendChild(tile);
      });

      applyLayout(shuffleArray(tiles), false);
      paintEmptyCells();
      startEmptyCellColorCycle();
      return;
    }

    grid.querySelectorAll('.pixelator__cell--empty').forEach(function (cell) {
      cell.remove();
    });

    gridLayout.forEach(function (row, rowIndex) {
      row.forEach(function (slot, colIndex) {
        if (slot !== 'empty') return;
        grid.appendChild(createEmptyCell({ r: rowIndex + 1, c: colIndex + 1 }));
      });
    });

    applyLayout(tiles, false);
    paintEmptyCells();
    startEmptyCellColorCycle();
  }

  renderGrid(false);

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (isShuffling) return;
      renderGrid(true);
    }, 150);
  });

  grid.addEventListener('click', function (e) {
    var emptyCell = e.target.closest('.pixelator__cell--empty');
    if (emptyCell) {
      pokeEmptyCell(emptyCell);
      return;
    }

    var tile = e.target.closest('.pixelator__tile');
    if (!tile || isShuffling) return;

    if (!reduceMotion) {
      burstAtElement(tile, 1);
      animateGrid({ preserveHover: !!activeTile });
      return;
    }

    animateGrid({ preserveHover: !!activeTile });
  });

  grid.addEventListener('mouseover', function (e) {
    var tile = e.target.closest('.pixelator__tile');
    if (!tile || !tile.dataset.city) return;
    if (quipTimer) return;
    setActiveTile(tile);
    startDepixelate(tile);
    showCity(tile.dataset.city);
  });

  grid.addEventListener('mouseout', function (e) {
    var related = e.relatedTarget;
    if (related && grid.contains(related)) return;
    if (quipTimer) return;
    setActiveTile(null);
    hideCity();
  });

  grid.addEventListener('focusin', function (e) {
    var tile = e.target.closest('.pixelator__tile');
    if (!tile || !tile.dataset.city) return;
    if (quipTimer) return;
    setActiveTile(tile);
    startDepixelate(tile);
    showCity(tile.dataset.city);
  });

  grid.addEventListener('focusout', function (e) {
    var related = e.relatedTarget;
    if (related && grid.contains(related)) return;
    if (quipTimer) return;
    setActiveTile(null);
    hideCity();
  });

  if (footerLogo) {
    footerLogo.addEventListener('click', function (e) {
      e.preventDefault();
      logoClickCount += 1;
      window.clearTimeout(logoClickTimer);

      if (logoClickCount >= EASTER_EGG_CLICKS) {
        logoClickCount = 0;
        triggerWorldTour();
        return;
      }

      logoClickTimer = window.setTimeout(function () {
        var clicks = logoClickCount;
        logoClickCount = 0;
        if (clicks === 1) {
          window.location.href = footerLogo.href;
        }
      }, EASTER_EGG_WINDOW);
    });
  }

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

  function showQuip(text) {
    if (!cityWrap || !cityLabel || !visibleCityEl || !hiddenCityEl) return;

    if (quipTimer) {
      window.clearTimeout(quipTimer);
      quipTimer = null;
    }

    cityWrap.classList.remove('is-switching');
    visibleCityEl.textContent = text;
    visibleCityEl.classList.add('is-shown');
    hiddenCityEl.classList.remove('is-shown');
    hiddenCityEl.textContent = '';
    activeCity = text;
    cityLabel.setAttribute('aria-hidden', 'false');
    cityWrap.classList.add('has-city');
    cityWrap.setAttribute('aria-label', text);

    quipTimer = window.setTimeout(function () {
      quipTimer = null;
      hideCity();
    }, 2800);
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
