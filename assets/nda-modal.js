(function () {
  function initModalCopy(modal) {
    if (!modal) return;

    var copyButton = modal.querySelector('.nda-modal__copy[data-copy-email]');
    if (!copyButton) return;

    var emailBox = copyButton.closest('.nda-modal__email-box');
    var copyFeedback = emailBox ? emailBox.querySelector('.nda-modal__copy-feedback') : null;
    var copyResetTimer;

    function resetCopyState() {
      if (copyResetTimer) {
        clearTimeout(copyResetTimer);
        copyResetTimer = null;
      }
      if (copyFeedback) copyFeedback.hidden = true;
    }

    function showCopied() {
      if (copyFeedback) copyFeedback.hidden = false;
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(resetCopyState, 2200);
    }

    function copyEmail() {
      var email = copyButton.getAttribute('data-copy-email') || 'shaahananaufal@gmail.com';

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
          /* silent */
        }
        document.body.removeChild(textarea);
      }
    }

    copyButton.addEventListener('click', copyEmail);
    modal.addEventListener('close', resetCopyState);
  }

  var modal = document.getElementById('nda-modal');
  if (modal && typeof modal.showModal === 'function') {
    var closeButton = modal.querySelector('.nda-modal__close');

    function openModal() {
      if (modal.open) return;
      modal.showModal();
    }

    function closeModal() {
      if (!modal.open) return;
      modal.close();
    }

    document.querySelectorAll('[data-nda-modal]').forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        openModal();
      });
    });

    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal();
    });

    modal.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeModal();
    });

    initModalCopy(modal);
  }
})();
