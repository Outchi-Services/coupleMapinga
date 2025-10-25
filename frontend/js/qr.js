document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const invitation_code = params.get("code");
  const guestInfoEl = document.getElementById("guestInfo");

  if (!invitation_code) {
    guestInfoEl.innerHTML = "<p class='text-danger'>❌ Code d’invitation manquant.</p>";
    return;
  }

  try {
    const res = await fetch(`http://localhost:4000/qr-info/${invitation_code}`);
    const data = await res.json();

    if (res.ok && data.success) {
      guestInfoEl.innerHTML = `
        <p class="guest">👤 <strong>${data.full_name}</strong></p>
        <p class="drink">🍹 <strong>Boisson:</strong> ${data.drink_choice || "Non spécifiée"}</p>
        <p class="table">💺 <strong>Table:</strong> ${data.table_number || "Inconnue"}</p>
      `;
    } else {
      guestInfoEl.innerHTML = "<p class='text-danger'>❌ Invitation introuvable ou non confirmée.</p>";
    }
  } catch (err) {
    console.error("QR Fetch error:", err);
    guestInfoEl.innerHTML = "<p class='text-danger'>⚠️ Erreur lors du chargement des informations.</p>";
  }
});
