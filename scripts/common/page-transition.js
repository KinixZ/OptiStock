(function () {
  const TRANSITION_DURATION = 300;
  const styleContent = `
  body {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity ${TRANSITION_DURATION}ms ease, transform ${TRANSITION_DURATION}ms ease;
  }

  body.page-transition-visible {
    opacity: 1;
    transform: translateY(0);
  }

  body.page-transition-exiting {
    pointer-events: none;
  }

  .page-transition-spinner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(2px);
    z-index: 9999;
    opacity: 0;
    transition: opacity ${TRANSITION_DURATION}ms ease;
  }

  .page-transition-spinner.active {
    opacity: 1;
  }

  .page-transition-spinner::before {
    content: "";
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 4px solid rgba(255, 183, 77, 0.35);
    border-top-color: rgba(255, 183, 77, 0.9);
    animation: page-transition-spin 0.9s linear infinite;
  }

  @keyframes page-transition-spin {
    to {
      transform: rotate(360deg);
    }
  }
  `;

  function injectStyle() {
    if (document.getElementById('page-transition-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'page-transition-style';
    style.textContent = styleContent;
    document.head.appendChild(style);
  }

  function handleLinkClick(event) {
    const anchor = event.currentTarget;
    if (anchor.target && anchor.target !== '_self') {
      return;
    }
    if (anchor.hasAttribute('download')) {
      return;
    }
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) {
      return;
    }

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }

    event.preventDefault();
    startExitTransition(() => {
      window.location.href = url.href;
    });
  }

  function startExitTransition(callback) {
    document.body.classList.remove('page-transition-visible');
    document.body.classList.add('page-transition-exiting');

    const spinner = document.querySelector('.page-transition-spinner');
    if (spinner) {
      spinner.classList.add('active');
    }

    window.setTimeout(callback, TRANSITION_DURATION);
  }

  function markPageVisible() {
    document.body.classList.add('page-transition-visible');
    document.body.classList.remove('page-transition-exiting');

    const spinner = document.querySelector('.page-transition-spinner');
    if (spinner) {
      spinner.classList.remove('active');
    }
  }

  function setupTransition() {
    injectStyle();

    if (!document.querySelector('.page-transition-spinner')) {
      const spinner = document.createElement('div');
      spinner.className = 'page-transition-spinner';
      document.body.appendChild(spinner);
    }

    requestAnimationFrame(markPageVisible);

    const anchors = Array.from(document.querySelectorAll('a[href]'));
    anchors.forEach((anchor) => {
      if (anchor.dataset.transition === 'disabled') {
        return;
      }
      anchor.addEventListener('click', handleLinkClick);
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        markPageVisible();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTransition);
  } else {
    setupTransition();
  }
})();
