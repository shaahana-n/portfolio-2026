(function () {
  var modal = document.getElementById('nda-modal');
  if (!modal || typeof modal.showModal !== 'function') return;

  var closeButton = modal.querySelector('.nda-modal__close');
  var copyButton = modal.querySelector('.nda-modal__copy');
  var copyFeedback = modal.querySelector('.nda-modal__copy-feedback');
  var copyResetTimer;

  function openModal() {
    if (modal.open) return;
    modal.showModal();
  }

  function closeModal() {
    if (!modal.open) return;
    modal.close();
    resetCopyState();
  }

  function resetCopyState() {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    if (copyButton) copyButton.classList.remove('is-copied');
    if (copyFeedback) copyFeedback.textContent = '';
  }

  function copyEmail() {
    if (!copyButton) return;

    var email = copyButton.getAttribute('data-copy-email') || 'shaahananaufal@gmail.com';

    function showCopied() {
      copyButton.classList.add('is-copied');
      if (copyFeedback) copyFeedback.textContent = 'Copied to clipboard';
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(resetCopyState, 2200);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(showCopied).catch(fallbackCopy);
      return;
    }

    fallbackCopy();

    function fallbackCopy() {
      var textarea = document.createElement('textarea');
      textarea.value = email;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (document.execCommand('copy')) showCopied();
      } catch (error) {
        if (copyFeedback) copyFeedback.textContent = 'Could not copy email';
      }
      document.body.removeChild(textarea);
    }
  }

  document.querySelectorAll('[data-nda-modal]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      openModal();
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  if (copyButton) {
    copyButton.addEventListener('click', copyEmail);
  }

  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });

  modal.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeModal();
  });
})();
