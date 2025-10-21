// main.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('Wedding site loaded — Section 1 ready');
});

// Countdown Script
document.addEventListener("DOMContentLoaded", () => {
  const timerEl = document.getElementById("timer");

  // Set the wedding date here 👇
  const weddingDate = new Date("2025-11-22T00:00:00").getTime();

  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance <= 0) {
      timerEl.innerText = "C’est le grand jour ! 💍";
      clearInterval(interval);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    timerEl.innerText = `${days} j ${hours} h ${minutes} m ${seconds} s`;
  };

  // Update every second
  updateCountdown();
  const interval = setInterval(updateCountdown, 1000);
});

 // Reveal timeline items when in viewport
  const items = document.querySelectorAll('.timeline-item');

  const revealTimeline = () => {
    const triggerBottom = window.innerHeight * 0.85;
    items.forEach(item => {
      const top = item.getBoundingClientRect().top;
      if (top < triggerBottom) item.classList.add('show');
    });
  };

  window.addEventListener('scroll', revealTimeline);
  window.addEventListener('load', revealTimeline);