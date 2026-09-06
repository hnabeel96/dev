// pineapp.win - Arcade Selector Interactivity
const arcadeSelector = document.querySelector('.arcade-selector');

if (arcadeSelector) {
  // 3D perspective tilt effect on mousemove
  arcadeSelector.addEventListener('mousemove', (e) => {
    const rect = arcadeSelector.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    arcadeSelector.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.012)`;
  });

  arcadeSelector.addEventListener('mouseleave', () => {
    arcadeSelector.style.transform = '';
  });

  // Keyboard accessibility
  arcadeSelector.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = arcadeSelector.getAttribute('href');
    }
  });
}
