// main.js

document.addEventListener('DOMContentLoaded', () => {
  console.log('Wedding site loaded — all sections initialized.');

  /* ===============================
     🎉 Countdown Script
  =============================== */
  const timerEl = document.getElementById("timer");
  if (timerEl) {
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
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      timerEl.innerText = `${days} j ${hours} h ${minutes} m ${seconds} s`;
    };

    // Update every second
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
  }

  /* ===============================
     🌸 Timeline Animation on Scroll
  =============================== */
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

  /* ===============================
     💌 RSVP Form Handling
  =============================== */
  const rsvpForm = document.getElementById('rsvpForm');
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('guestName').value.trim();
      const whatsapp = document.getElementById('whatsapp').value.trim();
      const message = document.getElementById('message').value.trim();

      // Collect selected drinks
      const drinks = [];
      document.querySelectorAll('input[type=checkbox]:checked').forEach(el => drinks.push(el.value));

      // Confirmation message
      alert(
        `Merci ${name} ❤️\n` +
        `Votre réservation a été enregistrée.\n` +
        `Boissons: ${drinks.join(', ') || 'aucune'}\n` +
        `Message: ${message}`
      );

      // Reset form
      e.target.reset();

      // Close modal
      const modalElement = document.getElementById('rsvpModal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    });
  }
});
