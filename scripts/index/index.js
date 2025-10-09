if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('Service Worker registrado', reg))
      .catch(err => console.error('Error al registrar el Service Worker', err));
  });
}

const currentYearElement = document.getElementById('currentYear');

if (currentYearElement) {
  currentYearElement.textContent = new Date().getFullYear();
}

document.querySelectorAll('[data-scroll-target]').forEach(trigger => {
  const targetSelector = trigger.getAttribute('data-scroll-target');
  const targetElement = document.querySelector(targetSelector);

  if (!targetElement) {
    return;
  }

  trigger.addEventListener('click', event => {
    event.preventDefault();
    targetElement.scrollIntoView({ behavior: 'smooth' });
  });
});
