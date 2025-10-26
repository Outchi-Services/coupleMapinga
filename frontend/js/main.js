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

  /* =============================== Load guest info =============================== */
  const urlParams = new URLSearchParams(window.location.search);
  const invitation_code = urlParams.get("code"); 
  console.log("Invitation code from URL:", invitation_code);

  if (invitation_code) {
    try {
      const res = await fetch(`https://couplemapinga.onrender.com/invite/${invitation_code}`);
      console.log("Fetch /invite response status:", res.status);

      const data = await res.json();
      console.log("Data received from /invite:", data);

      const guestNameInput = document.getElementById("guestName");
      const tableInput = document.getElementById("tableNumber"); // hidden field
      const personalMsg = document.getElementById("personalMessage");

      if (data.full_name) {
        if (personalMsg) {
          personalMsg.innerHTML = `C’est avec une immense joie que nous vous adressons cette invitation, <br>
                                   <strong>Cher(e) ${data.full_name}</strong>.<br>
                                   Votre table : ${data.table_number || "inconnu"}`;
        }
        if (guestNameInput) {
          guestNameInput.value = data.full_name;
          guestNameInput.readOnly = true;
        }
        if (tableInput) tableInput.value = data.table_number || "inconnu";
      }
    } catch (err) {
      console.error("Erreur fetch invite:", err);
    }
  } else {
    console.warn("No invitation_code found in URL");
  }

  /* =============================== RSVP Form =============================== */
  const rsvpForm = document.getElementById("rsvpForm");
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const whatsapp_number = document.getElementById("whatsapp")?.value.trim() || "";
      const guestbook_message = document.getElementById("messageInput")?.value.trim() || "";
      const drinks = [];
      document.querySelectorAll('input[type=radio]:checked').forEach(el => drinks.push(el.value));

      if (!whatsapp_number) {
        alert("Veuillez remplir votre numéro WhatsApp.");
        return;
      }

      console.log("RSVP form submission data:", {
        invitation_code,
        whatsapp_number,
        drink_choice: drinks.join(", "),
        guestbook_message
      });

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

        const data = await response.json();
        console.log("RSVP POST response data:", data);

        if (data.success) {
          // Update table_number if it changed
          const tableInput = document.getElementById("tableNumber");
          if (tableInput) tableInput.value = data.table_number || "inconnu";

          alert(`✅ Merci ${data.guest_name} !\nVotre RSVP a été enregistré.\nTéléchargez votre QR ici : ${data.qr_download}`);

          // Fill QR modal
          const qrImage = document.getElementById("qrImage");
          const downloadLink = document.getElementById("downloadQR");
          if (qrImage) qrImage.src = data.qr_download;
          if (downloadLink) downloadLink.href = data.qr_download;

          // Show modal
          const qrModal = new bootstrap.Modal(document.getElementById("qrModal"));
          qrModal.show();

          rsvpForm.reset();
          const modal = bootstrap.Modal.getInstance(document.getElementById("rsvpModal"));
          if(modal) modal.hide();

        } else {
          console.error("RSVP submission error:", data.error);
          alert(`❌ Erreur : ${data.error}`);
        }
      } catch (err) {
        console.error("RSVP submission failed:", err);
        alert("Une erreur est survenue. Veuillez réessayer plus tard.");
      }
    });
  }
});
