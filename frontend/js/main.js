document.addEventListener("DOMContentLoaded", async () => {
  console.log("Wedding site loaded — all sections initialized.");

  /* =============================== timeline tree =============================== */
  (function () {
    const items = document.querySelectorAll('.timeline-item');

    // Assign slide direction class initially (alternating).
    items.forEach((item, idx) => {
      // If you prefer explicit data-side attribute to decide, we check that first.
      const side = item.dataset.side || (idx % 2 === 0 ? 'left' : 'right');
      if (side === 'left') item.classList.add('slide-in-left');
      else item.classList.add('slide-in-right');
    });

    // IntersectionObserver options
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // add in-view to trigger animation; keep slide class so direction remains
          el.classList.add('in-view');
          // stop observing this element after it's animated
          obs.unobserve(el);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -10% 0px', // trigger slightly before bottom
      threshold: 0.18
    });

    items.forEach(i => io.observe(i));
  })();

  /* =============================== Countdown =============================== */
 
    // Set the event date - November 22, 2025 at 20:00 UTC
    const eventDate = new Date('November 22, 2025 19:00:00 UTC').getTime();
    
    // Elements
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const countdownContainer = document.getElementById('countdown');
    const reminderBtn = document.getElementById('reminder-btn');
    
    // Random flare animation
    function createFlares() {
      const container = document.querySelector('.container');
      const flareCount = 10;
      
      for (let i = 0; i < flareCount; i++) {
        const flare = document.createElement('div');
        flare.className = 'flare';
        
        // Random position
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        flare.style.left = `${posX}%`;
        flare.style.top = `${posY}%`;
        
        // Random delay
        flare.style.animationDelay = `${Math.random() * 5}s`;
        
        container.appendChild(flare);
      }
    }
    
    // Create flares
    createFlares();
    
    // Update countdown function
    function updateCountdown() {
      const now = new Date().getTime();
      const distance = eventDate - now;
      
      // Time calculations
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      // Add leading zeros
      const formatNumber = num => num < 10 ? `0${num}` : num;
      
      // Update DOM
      daysEl.textContent = formatNumber(days);
      hoursEl.textContent = formatNumber(hours);
      minutesEl.textContent = formatNumber(minutes);
      secondsEl.textContent = formatNumber(seconds);
      
      // Beat animation on seconds change
      secondsEl.classList.add('beat-animation');
      setTimeout(() => {
        secondsEl.classList.remove('beat-animation');
      }, 500);
      
      // When countdown is over
      if (distance < 0) {
        clearInterval(countdown);
        daysEl.textContent = "00";
        hoursEl.textContent = "00";
        minutesEl.textContent = "00";
        secondsEl.textContent = "00";
        
        // Add "LIVE NOW" message
        const eventDetails = document.querySelector('.event-details');
        const liveNow = document.createElement('div');
        liveNow.textContent = "LIVE NOW";
        liveNow.style.color = "var(--accent)";
        liveNow.style.fontSize = "2rem";
        liveNow.style.fontWeight = "900";
        liveNow.style.marginTop = "1rem";
        liveNow.style.animation = "beat 1s infinite";
        eventDetails.appendChild(liveNow);
      }
    }
    
    // Initial call
    updateCountdown();
    
    // Update every second
    const countdown = setInterval(updateCountdown, 1000);
    
    // Reminder button functionality
    reminderBtn.addEventListener('click', function() {
      this.textContent = "Reminder Set!";
      this.style.background = "linear-gradient(90deg, #0aff85, #00b2ff)";
      setTimeout(() => {
        this.textContent = "Set a Reminder";
        this.style.background = "linear-gradient(90deg, var(--primary), var(--secondary))";
      }, 3000);
      
      // Trigger more pulse rings on click
      const container = document.querySelector('.container');
      for (let i = 0; i < 3; i++) {
        const extraPulse = document.createElement('div');
        extraPulse.className = 'pulse-ring';
        extraPulse.style.animationDelay = `${i * 0.2}s`;
        extraPulse.style.animationDuration = '1s';
        container.appendChild(extraPulse);
        
        // Remove the extra pulse after animation
        setTimeout(() => {
          extraPulse.remove();
        }, 1000);
      }
    });
    
    // Make ticker content dynamic
    const tickerContent = document.querySelector('.ticker-content');
    const originalWidth = tickerContent.offsetWidth;
    tickerContent.style.animationDuration = `${originalWidth / 50}s`;

  /* =============================== Load personalized guest info =============================== */
  const urlParams = new URLSearchParams(window.location.search);
  const invitation_code = urlParams.get("code"); 
  console.log("Invitation code from URL:", invitation_code);

  if (invitation_code) {
    try {
      const res = await fetch(`https://couplemapinga.onrender.com/invite/${invitation_code}`);
      console.log("Fetch /invite response status:", res.status);
      
      const data = await res.json();
      console.log("Data received from /invite:", data);

      if (data.full_name) {
        const personalMsg = document.getElementById("personalMessage");
        if (personalMsg) {
          personalMsg.innerHTML = `C’est avec une immense joie que nous vous adressons cette invitation, <br>
                                   <strong>Cher(e) ${data.full_name}</strong>.<br>
                                   Votre table : ${data.table_number || "inconnu"}`;
          console.log("Personal message updated successfully");
        }

        const guestNameInput = document.getElementById("guestName");
        const tableInput = document.getElementById("tableNumber"); // hidden field
        if (guestNameInput) {
          guestNameInput.value = data.full_name;
          guestNameInput.readOnly = true;
          console.log("Guest name input prefilled:", data.full_name);
        }
        if (tableInput) {
          tableInput.value = data.table_number || "inconnu";
          console.log("Table input prefilled:", data.table_number);
        }
      } else {
        console.warn("No full_name received from /invite endpoint");
      }
    } catch (err) {
      console.error("Erreur fetch invite:", err);
    }
  } else {
    console.warn("No invitation_code found in URL");
  }

  /* =============================== RSVP Form Submission =============================== */
  const rsvpForm = document.getElementById("rsvpForm");
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const whatsapp_number = document.getElementById("whatsapp")?.value.trim() || "";
      const guestbook_message = document.getElementById("messageInput")?.value.trim() || "";
      const drinks = [];
      document.querySelectorAll('input[type=radio]:checked').forEach(el => drinks.push(el.value));

      console.log("RSVP form submission data:", {
        invitation_code,
        whatsapp_number,
        drink_choice: drinks.join(", "),
        guestbook_message
      });

      if (!whatsapp_number) {
        alert("Veuillez remplir votre numéro WhatsApp.");
        return;
      }

      try {
        const response = await fetch("https://couplemapinga.onrender.com/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitation_code,
            whatsapp_number,
            drink_choice: drinks.join(", "),
            guestbook_message
          })
        });

        console.log("RSVP POST response status:", response.status);

        const data = await response.json();
        console.log("RSVP POST response data:", data);

        if (data.success) {
          alert(`✅ Merci ${data.guest_name} !\nVotre RSVP a été enregistré.\nTéléchargez votre QR ici : ${data.qr_download || "N/A"}`);
          rsvpForm.reset();
          const modal = bootstrap.Modal.getInstance(document.getElementById("rsvpModal"));
          if(modal) modal.hide();
        } else {
          console.error("RSVP submission error:", data.error);
          alert(`❌ Erreur : ${data.error}`);
        }
              // Fill QR modal
        const qrImage = document.getElementById("qrImage");
        const downloadLink = document.getElementById("downloadQR");
        qrImage.src = data.qr_download;   // URL to QR image
        downloadLink.href = data.qr_download;

        // Show modal
        const qrModal = new bootstrap.Modal(document.getElementById("qrModal"));
        qrModal.show();
      } catch (err) {
        console.error("RSVP submission failed:", err);
        alert("Une erreur est survenue. Veuillez réessayer plus tard.");
      }
    });
  }
});
