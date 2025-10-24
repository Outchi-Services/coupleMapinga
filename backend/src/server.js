// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import rsvpRouter from "./routes/rsvp.js";
// import inviteRouter from "./routes/invite.js";


// dotenv.config();
// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use("/qrcodes", express.static("qrcodes")); // serve QR files

// app.use("/api/rsvp", rsvpRouter);
// app.use("/invite", inviteRouter);
// app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { pool } from "./config/database.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/qrcodes", express.static("qrcodes"));

// ================================
// 🎉 Endpoint RSVP
// ================================
app.post("/api/rsvp", async (req, res) => {
  try {
    let { full_name, table_number, whatsapp_number, drink_choice, guestbook_message } = req.body;

    if (!full_name || !whatsapp_number) return res.status(400).json({ error: "Nom et WhatsApp requis" });

    // Vérifier si nom existe déjà dans reservations
    const existing = await pool.query("SELECT COUNT(*) FROM reservations WHERE full_name = $1", [full_name]);
    if (parseInt(existing.rows[0].count) > 0) {
      // ajouter suffixe si nom dupliqué
      full_name = `${full_name}_${parseInt(existing.rows[0].count)}`;
    }

    // Si table_number n'est pas fourni, chercher dans guest_pro
    if (!table_number) {
      const guestPro = await pool.query("SELECT table_number FROM guest_pro WHERE full_name = $1", [full_name]);
      table_number = guestPro.rows[0]?.table_number || "inconnu";
    }

    // Créer QR code
    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

    const invitation_code = full_name.toLowerCase().replace(/\s+/g, ""); // ex: papa jacques → papajacques
    const qrPath = path.join(qrDir, `${invitation_code}.png`);
    const qrUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/index.html?code=${invitation_code}`;

    await QRCode.toFile(qrPath, qrUrl, { width: 300 });

    // Enregistrer la réservation
    await pool.query(
      `INSERT INTO reservations (full_name, table_number, whatsapp_number, drink_choice, guestbook_message, qr_image_path, qr_redirect_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [full_name, table_number, whatsapp_number, drink_choice, guestbook_message, qrPath, qrUrl]
    );

    res.json({
      success: true,
      qr_download: qrUrl,
    });

  } catch (err) {
    console.error("RSVP error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================================
// Endpoint pour générer le frontend personnalisé
// ================================
app.get("/invite/:code", async (req, res) => {
  try {
    const code = req.params.code;

    // Chercher dans guest_pro
    const guest = await pool.query("SELECT full_name, table_number FROM guest_pro WHERE invitation_code = $1", [code]);

    if (guest.rows.length > 0) {
      return res.json({
        full_name: guest.rows[0].full_name,
        table_number: guest.rows[0].table_number
      });
    }

    // Si pas trouvé → renvoyer juste le code comme nom + table inconnu
    res.json({
      full_name: code,
      table_number: "inconnu"
    });

  } catch (err) {
    console.error("Invite fetch error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
