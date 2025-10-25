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
    const { invitation_code, whatsapp_number, drink_choice, guestbook_message } = req.body;

    if ( !whatsapp_number) {
      return res.status(400).json({ error: " WhatsApp requis" });
    }

    // Find guest by invitation_code
    const guestRes = await pool.query(
      "SELECT id, full_name, table_number FROM guest_pro WHERE invitation_code = $1",
      [invitation_code]
    );

    if (guestRes.rows.length === 0) {
      return res.status(404).json({ error: "Code d'invitation invalide" });
    }

    const guest = guestRes.rows[0];

    // Check if guest already responded
    const existing = await pool.query(
      "SELECT COUNT(*) FROM rsvp_responses WHERE guest_id = $1",
      [guest.id]
    );

    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ error: "RSVP déjà soumis pour ce code" });
    }

    // -------------------------------
    // Generate QR code
    // -------------------------------
    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

    // Use invitation_code as filename
    const qrPath = path.join(qrDir, `${invitation_code}.png`);
    const qrUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/index.html?code=${invitation_code}`;

    await QRCode.toFile(qrPath, qrUrl, { width: 300 });

    // -------------------------------
    // Insert RSVP into rsvp_responses
    // -------------------------------
    await pool.query(
      `INSERT INTO rsvp_responses 
        (guest_id, whatsapp_number, drink_choice, guestbook_message, responded_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [guest.id, whatsapp_number, drink_choice, guestbook_message]
    );

    res.json({
      success: true,
      guest_name: guest.full_name,
      table_name: guest.table_number,
      qr_download: qrUrl
    });

  } catch (err) {
    console.error("RSVP endpoint error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================================
// Endpoint pour générer le frontend personnalisé
// ================================
app.get("/invite/:code", async (req, res) => {
  try {
    const code = req.params.code;

    const guest = await pool.query(
      "SELECT full_name, table_number FROM guest_pro WHERE invitation_code = $1",
      [code]
    );

    if (guest.rows.length > 0) {
      return res.json({
        full_name: guest.rows[0].full_name,
        table_number: guest.rows[0].table_number
      });
    }

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
