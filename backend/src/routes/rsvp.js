import express from "express";
import { pool } from "../config/database.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    let { full_name, table_number, whatsapp_number, drink_choice, guestbook_message } = req.body;

    if (!full_name || !whatsapp_number) 
      return res.status(400).json({ error: "Nom et WhatsApp requis" });

    // 1️⃣ Vérifier doublons et ajouter _1, _2...
    const existing = await pool.query(
      "SELECT COUNT(*) FROM rsvp_responses WHERE full_name LIKE $1",
      [full_name + "%"]
    );
    const count = parseInt(existing.rows[0].count);
    if (count > 0) full_name = `${full_name}_${count}`;

    // 2️⃣ Chercher table_number et invitation_code depuis guest_pro
    const guestProRes = await pool.query(
      "SELECT table_number, invitation_code FROM guest_pro WHERE full_name = $1",
      [req.body.full_name]
    );
    if(guestProRes.rows.length > 0){
      table_number = guestProRes.rows[0].table_number || "inconnu";
    }

    const invitation_code = (guestProRes.rows[0]?.invitation_code || full_name.replace(/\s+/g,"").toLowerCase());

    // 3️⃣ Générer QR
    const redirectUrl = `http://localhost:3000/coupleMapinga/frontend/?code=${invitation_code}`;
    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);
    const qrPath = path.join(qrDir, `${invitation_code}.png`);
    await QRCode.toFile(qrPath, redirectUrl, { width: 300 });

    // 4️⃣ Ajouter dans rsvp_responses
    // Si besoin de créer un guest_id, on pourrait d'abord insérer dans guests ou guest_pro et récupérer id
    await pool.query(
      `INSERT INTO rsvp_responses (guest_id, whatsapp_number, drink_choice, guestbook_message)
       VALUES (
         DEFAULT, $1, $2, $3
       )`,
      [whatsapp_number, drink_choice, guestbook_message || null]
    );

    res.json({
      success: true,
      message: "RSVP enregistré avec succès !",
      qr_download: `http://localhost:4000/qrcodes/${invitation_code}.png`,
    });

  } catch (err) {
    console.error("RSVP error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
