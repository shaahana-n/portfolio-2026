(function () {
  var PASSWORD = 'Instagram-TYA-2026';
  var STORAGE_KEY = 'instagram-case-study-unlocked';

  function getTuneSection() {
    return document.getElementById('instagram-tune-your-ads');
  }

  function persistUnlock() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (error) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch (localError) {}
    }

    var section = getTuneSection();
    if (section) {
      section.dataset.unlocked = 'true';
    }
  }

  function isUnlocked() {
    var section = getTuneSection();
    if (section && section.dataset.unlocked === 'true') {
      return true;
    }

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        return true;
      }
    } catch (error) {}

    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        return true;
      }
    } catch (error) {}

    return false;
  }

  function applyUnlockState() {
    var unlocked = isUnlocked();
    var section = getTuneSection();

    document.body.classList.toggle('instagram-case-unlocked', unlocked);

    if (section) {
      if (unlocked) {
        section.classList.add('is-unlocked');
      } else {
        section.classList.remove('is-unlocked');
      }
    }
  }

  function unlockSection() {
    var section = getTuneSection();

    persistUnlock();

    if (section) {
      section.classList.add('is-unlocked');
    }
    document.body.classList.add('instagram-case-unlocked');
  }

  function handlePasswordAttempt(rawValue) {
    var value = (rawValue || '').trim();
    var error = document.getElementById('instagram-tune-your-ads-error');
    var input = document.getElementById('instagram-tune-your-ads-password');
    var matched = value === PASSWORD;

    if (error) {
      error.hidden = true;
      error.textContent = '';
    }

    if (!value) {
      if (error) {
        error.textContent = 'Enter a password to view this work.';
        error.hidden = false;
      }
      if (input) input.focus();
      return false;
    }

    if (matched) {
      unlockSection();
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
      if (!form || form.id !== 'instagram-tune-your-ads-form') return;

      event.preventDefault();
      event.stopPropagation();

      var input = form.querySelector('#instagram-tune-your-ads-password');
      handlePasswordAttempt(input && input.value);
    }, true);

    document.addEventListener('click', function (event) {
      var button = event.target.closest('.instagram-tune-your-ads__submit');
      if (!button) return;

      var form = button.closest('#instagram-tune-your-ads-form');
      if (!form) return;

      event.preventDefault();
      event.stopPropagation();

      var input = form.querySelector('#instagram-tune-your-ads-password');
      handlePasswordAttempt(input && input.value);
    }, true);
  }

  function initInstagramGate() {
    bindInstagramGate();
    applyUnlockState();
  }

  window.initInstagramGate = initInstagramGate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstagramGate);
  } else {
    initInstagramGate();
  }
})();
