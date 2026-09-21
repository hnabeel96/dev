// pineapp.win - Arcade Carousel & Interactivity
(function () {
  'use strict';

  const track = document.getElementById('arcade-track');
  const prevBtn = document.getElementById('arcade-prev');
  const nextBtn = document.getElementById('arcade-next');
  const dots = document.querySelectorAll('.arcade-dot');
  const frame = document.querySelector('.arcade-selector-frame');

  if (track && prevBtn && nextBtn) {
    function getCardWidth() {
      const card = track.querySelector('.arcade-card');
      return card ? card.offsetWidth : track.clientWidth;
    }

    function updateActiveState() {
      const scrollLeft = track.scrollLeft;
      const width = getCardWidth();
      const maxScroll = track.scrollWidth - track.clientWidth;
      const activeIndex = Math.min(dots.length - 1, Math.max(0, Math.round(scrollLeft / width)));

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
      });

      // Update popping button states
      prevBtn.disabled = scrollLeft <= 8;
      nextBtn.disabled = scrollLeft >= maxScroll - 8;
    }

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const width = getCardWidth();
      track.scrollBy({ left: -width, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const width = getCardWidth();
      track.scrollBy({ left: width, behavior: 'smooth' });
    });

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(dot.getAttribute('data-index'), 10);
        track.scrollTo({ left: idx * getCardWidth(), behavior: 'smooth' });
      });
    });

    // Keyboard navigation for desktop web accessibility
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        track.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        track.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
      }
    });

    let ticking = false;
    track.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveState();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', updateActiveState);

    // Initial state: Default to Chrono Pendulum (index 0)
    track.scrollTo({ left: 0 });
    updateActiveState();
  }

  // 3D perspective tilt effect on arcade frame (only on devices with fine pointer and hover support)
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (frame && supportsHover) {
    frame.addEventListener('mousemove', (e) => {
      // Avoid tilting if hovering directly over scroll buttons
      if (e.target.closest('.arcade-scroll-btn') || e.target.closest('.arcade-indicators')) {
        frame.style.transform = '';
        return;
      }

      const rect = frame.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      frame.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px) scale(1.008)`;
    });

    frame.addEventListener('mouseleave', () => {
      frame.style.transform = '';
    });
  }
})();
