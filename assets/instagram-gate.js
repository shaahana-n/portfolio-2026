(function () {
  var PASSWORD = 'Instagram-TYA-2026';
  var STORAGE_KEY = 'instagram-case-study-unlocked';

  function getPageGate() {
    return document.getElementById('instagram-page-gate');
  }

  function persistUnlock() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (error) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch (localError) {}
    }
  }

  function isUnlocked() {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return true;
    } catch (error) {}

    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return true;
    } catch (error) {}

    return false;
  }

  function unlockTuneSection() {
    var section = document.getElementById('instagram-tune-your-ads');
    if (section) {
      section.classList.add('is-unlocked');
      section.dataset.unlocked = 'true';
    }
  }

  function applyUnlockState() {
    var unlocked = isUnlocked();
    var gate = getPageGate();
    var loadingEl = document.getElementById('site-case-loading');

    document.body.classList.toggle('instagram-case-unlocked', unlocked);

    if (gate) {
      gate.hidden = unlocked;
      gate.setAttribute('aria-hidden', unlocked ? 'true' : 'false');
    }

    if (loadingEl && !unlocked) {
      loadingEl.hidden = true;
      loadingEl.setAttribute('aria-busy', 'false');
    }

    if (unlocked) {
      unlockTuneSection();
    }
  }

  function unlockPage() {
    persistUnlock();
    document.body.classList.add('instagram-case-unlocked');

    var gate = getPageGate();
    if (gate) {
      gate.hidden = true;
      gate.setAttribute('aria-hidden', 'true');
    }

    unlockTuneSection();

    if (typeof window.__onInstagramCaseUnlocked === 'function') {
      window.__onInstagramCaseUnlocked();
    }
  }

  function handlePasswordAttempt(rawValue) {
    var value = (rawValue || '').trim();
    var error = document.getElementById('instagram-page-error');
    var input = document.getElementById('instagram-page-password');

    if (error) {
      error.hidden = true;
      error.textContent = '';
    }

    if (!value) {
      if (error) {
        error.textContent = 'Enter a password to view this case study.';
        error.hidden = false;
      }
      if (input) input.focus();
      return false;
    }

    if (value === PASSWORD) {
      unlockPage();
      if (input) input.value = '';
      return true;
    }

    if (error) {
      error.textContent = 'Incorrect password. Try again or email for access.';
      error.hidden = false;
    }
    if (input) {
      input.focus();
      input.select();
    }
    return false;
  }

  function bindInstagramGate() {
    if (document.body.dataset.instagramGateBound === 'true') return;
    document.body.dataset.instagramGateBound = 'true';

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || form.id !== 'instagram-page-gate-form') return;

      event.preventDefault();
      event.stopPropagation();

      var input = form.querySelector('#instagram-page-password');
      handlePasswordAttempt(input && input.value);
    }, true);

    document.addEventListener('click', function (event) {
      var button = event.target.closest('.instagram-page-gate__submit');
      if (!button) return;

      var form = button.closest('#instagram-page-gate-form');
      if (!form) return;

      event.preventDefault();
      event.stopPropagation();

      var input = form.querySelector('#instagram-page-password');
      handlePasswordAttempt(input && input.value);
    }, true);
  }

  function initInstagramGate() {
    bindInstagramGate();
    applyUnlockState();

    if (!isUnlocked()) {
      var input = document.getElementById('instagram-page-password');
      if (input) {
        window.setTimeout(function () {
          input.focus();
        }, 120);
      }
    } else if (typeof window.__onInstagramCaseUnlocked === 'function') {
      window.__onInstagramCaseUnlocked();
    }
  }

  window.initInstagramGate = initInstagramGate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstagramGate);
  } else {
    initInstagramGate();
  }
})();
