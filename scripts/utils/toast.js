(function () {
  const CONTAINER_ID = 'toastStack';
  const DEFAULTS = {
    success: { className: 'text-bg-success', delay: 2600, fallback: 'Acción realizada correctamente ✅' },
    error: { className: 'text-bg-danger', delay: 3200, fallback: 'Ocurrió un error ❌' },
    info: { className: 'text-bg-primary', delay: 2800, fallback: 'Información ℹ️' }
  };

  function ensureContainer() {
    let container = document.getElementById(CONTAINER_ID);
    if (container) return container;

    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');

    const append = () => {
      document.body.appendChild(container);
    };

    if (document.body) {
      append();
    } else {
      document.addEventListener('DOMContentLoaded', append, { once: true });
    }

    return container;
  }

  function showToast(message, type, customDelay) {
    const config = DEFAULTS[type] || DEFAULTS.info;
    const text = message || config.fallback;

    const bootstrapAvailable = typeof window !== 'undefined' && window.bootstrap && window.bootstrap.Toast;
    if (!bootstrapAvailable) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(text);
      }
      return;
    }

    const container = ensureContainer();
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${config.className} border-0 shadow`;
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${text}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>
    `;

    container.appendChild(toastEl);

    const toast = window.bootstrap.Toast.getOrCreateInstance(toastEl, {
      animation: true,
      autohide: true,
      delay: typeof customDelay === 'number' ? customDelay : config.delay
    });

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });

    toast.show();
  }

  window.toastOk = (message, delay) => {
    showToast(message, 'success', delay);
  };

  window.toastError = (message, delay) => {
    showToast(message, 'error', delay);
  };

  window.toastInfo = (message, delay) => {
    showToast(message, 'info', delay);
  };
})();

