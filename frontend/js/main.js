document.addEventListener("DOMContentLoaded", async () => {
  console.log("Wedding site loaded — all sections initialized.");

  /* =============================== Countdown =============================== */
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
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
  }

  /* =============================== Load personalized guest info =============================== */
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code"); 

  if (code) {
    try {
      const res = await fetch(`http://localhost:4000/invite/${code}`);
      const data = await res.json();

      if (data.full_name) {
        // Pré-remplir le message
        const personalMsg = document.getElementById("personalMessage");
        if(personalMsg) personalMsg.innerHTML = `C’est avec une immense joie que nous vous adressons cette invitation, <br>
                                  <strong>Cher(e) ${data.full_name}</strong>.<br>
                                  Votre table : ${data.table_number || "inconnu"}`;

        // Pré-remplir le formulaire
        const guestNameInput = document.getElementById("guestName");
        const tableInput = document.getElementById("tableNumber");
        if(guestNameInput) {
          guestNameInput.value = data.full_name;
          guestNameInput.readOnly = true;
        }
        if(tableInput) tableInput.value = data.table_number || "inconnu";
      }
    } catch (err) {
      console.error("Erreur fetch invite:", err);
    }
  }

  /* =============================== RSVP Form Submission =============================== */
  const rsvpForm = document.getElementById("rsvpForm");
  if(rsvpForm) {
    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const full_name = document.getElementById("guestName").value.trim();
      const table_number = document.getElementById("tableNumber").value.trim();
      const whatsapp_number = document.getElementById("whatsapp").value.trim();
      const guestbook_message = document.getElementById("messageInput").value.trim();

      const drinks = [];
      document.querySelectorAll('input[type=checkbox]:checked').forEach(el => drinks.push(el.value));

      if (!whatsapp_number) {
        alert("Veuillez remplir votre numéro WhatsApp.");
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name, // correspond au backend
            table_number,
            whatsapp_number,
            drink_choice: drinks.join(", "),
            guestbook_message
          })
        });

        const data = await response.json();

        if (data.success) {
          alert(`✅ Merci ${full_name} !\nVotre RSVP a été enregistré.\nTéléchargez votre QR ici : ${data.qr_download}`);
          rsvpForm.reset();
          const modal = bootstrap.Modal.getInstance(document.getElementById("rsvpModal"));
          if(modal) modal.hide();
        } else {
          alert(`❌ Erreur : ${data.error}`);
        }
      } catch (err) {
        console.error(err);
        alert("Une erreur est survenue. Veuillez réessayer plus tard.");
      }
    });
  }
});
