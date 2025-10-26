import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { pool } from "./config/database.js";

dotenv.config();
const app = express();

// ================================
// ✅ CONFIGURATION
// ================================
const FRONTEND_URL = process.env.FRONTEND_URL || "https://couplemapinga.netlify.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://couplemapinga.onrender.com";

// ================================
// ✅ MIDDLEWARE
// ================================
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Serve QR images
app.use("/qrcodes", express.static("qrcodes"));

// ================================
// 🎉 RSVP ENDPOINT
// ================================
app.post("/api/rsvp", async (req, res) => {
  try {
    const { invitation_code, whatsapp_number, drink_choice, guestbook_message } = req.body;

    if (!whatsapp_number) {
      return res.status(400).json({ error: "WhatsApp requis" });
    }

    // 🔎 Find guest by invitation_code
    const guestRes = await pool.query(
      "SELECT id, full_name, table_number FROM guest_pro WHERE invitation_code = $1",
      [invitation_code]
    );

    if (guestRes.rows.length === 0) {
      return res.status(404).json({ error: "Code d'invitation invalide" });
    }

    const guest = guestRes.rows[0];

    // ✅ Check if guest already responded
    const existing = await pool.query(
      "SELECT COUNT(*) FROM rsvp_responses WHERE guest_id = $1",
      [guest.id]
    );

    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ error: "RSVP déjà soumis pour ce code" });
    }

    // ===============================
    // 📸 Generate QR Code
    // ===============================
    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

    const qrPath = path.join(qrDir, `${invitation_code}.png`);
    // URL that QR redirects to → hosted frontend
    // const qrUrl = `${FRONTEND_URL}/?code=${invitation_code}`;
    const qrUrl = `${FRONTEND_URL}/qr.html?code=${invitation_code}`;

    await QRCode.toFile(qrPath, qrUrl, { width: 300 });

    // ===============================
    // 💾 Save RSVP response
    // ===============================
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
      qr_download: `${BACKEND_URL}/qrcodes/${invitation_code}.png`
    });

  } catch (err) {
    console.error("RSVP endpoint error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================================
// 🧭 Get Guest Info by Code
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

    res.json({ full_name: code, table_number: "inconnu" });
  } catch (err) {
    console.error("Invite fetch error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================================
// 📱 QR Info Endpoint
// ================================
app.get("/qr-info/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT g.full_name, g.table_number, r.drink_choice
       FROM guest_pro g
       LEFT JOIN rsvp_responses r ON g.id = r.guest_id
       WHERE g.invitation_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Invitation introuvable" });
    }

    const guest = result.rows[0];
    res.json({
      success: true,
      full_name: guest.full_name,
      table_number: guest.table_number,
      drink_choice: guest.drink_choice
    });
  } catch (err) {
    console.error("QR info fetch error:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ================================
// 🩺 Health Check
// ================================
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));

// ================================
// 🚀 Start Server
// ================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on ${BACKEND_URL} (port ${PORT})`);
});
