import express from "express";
import { pool } from "../config/database.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://couplemapinga.netlify.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://couplemapinga.onrender.com";

router.post("/", async (req, res) => {
  try {
    const { invitation_code, whatsapp_number, drink_choice, guestbook_message } = req.body;

    if (!invitation_code || !whatsapp_number)
      return res.status(400).json({ error: "Code invitation et WhatsApp requis" });

    // 1️⃣ Chercher l'invité
    const guestRes = await pool.query(
      "SELECT id, full_name, table_number FROM guest_pro WHERE invitation_code = $1",
      [invitation_code]
    );

    if (guestRes.rows.length === 0)
      return res.status(404).json({ error: "Invité non trouvé" });

    const guest = guestRes.rows[0];

    // 2️⃣ Vérifier si RSVP déjà soumis
    const rsvpRes = await pool.query(
      "SELECT id FROM rsvp_responses WHERE guest_id = $1 OR whatsapp_number = $2",
      [guest.id, whatsapp_number]
    );

    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

    const qrFileName = `${invitation_code}.png`;
    const qrPath = path.join(qrDir, qrFileName);
    const qrUrl = `${FRONTEND_URL}/qr.html?code=${invitation_code}`;

    // 3️⃣ Vérifier si QR existe dans la DB
    const qrDB = await pool.query(
      "SELECT id, qr_image_path FROM qr_codes WHERE guest_id = $1",
      [guest.id]
    );

    if (rsvpRes.rows.length > 0) {
      // ✅ RSVP déjà soumis
      if (qrDB.rows.length > 0) {
        const qrRecord = qrDB.rows[0];
        // Si fichier QR supprimé, régénérer
        if (!fs.existsSync(qrRecord.qr_image_path)) {
          await QRCode.toFile(qrPath, qrUrl, { width: 300 });
          await pool.query(
            "UPDATE qr_codes SET qr_image_path = $1, qr_redirect_url = $2, created_at = NOW() WHERE id = $3",
            [qrPath, qrUrl, qrRecord.id]
          );
        }
      } else {
        // QR manquant, créer et insérer
        await QRCode.toFile(qrPath, qrUrl, { width: 300 });
        await pool.query(
          `INSERT INTO qr_codes (guest_id, qr_image_path, qr_redirect_url, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [guest.id, qrPath, qrUrl]
        );
      }

      return res.json({
        success: true,
        message: "RSVP déjà soumis. QR récupéré.",
        guest_name: guest.full_name,
        table_number: guest.table_number,
        qr_download: `${BACKEND_URL}/download/${qrFileName}`
      });
    }

    // 4️⃣ Nouveau RSVP
    // Générer QR
    await QRCode.toFile(qrPath, qrUrl, { width: 300 });

    // Insérer ou mettre à jour QR dans DB
    await pool.query(
      `INSERT INTO qr_codes (guest_id, qr_image_path, qr_redirect_url, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (guest_id)
       DO UPDATE SET qr_image_path = EXCLUDED.qr_image_path,
                     qr_redirect_url = EXCLUDED.qr_redirect_url,
                     created_at = NOW()`,
      [guest.id, qrPath, qrUrl]
    );

    // Insérer RSVP
    await pool.query(
      `INSERT INTO rsvp_responses (guest_id, whatsapp_number, drink_choice, guestbook_message, responded_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [guest.id, whatsapp_number, drink_choice || null, guestbook_message || null]
    );

    return res.json({
      success: true,
      message: "RSVP enregistré avec succès !",
      guest_name: guest.full_name,
      table_number: guest.table_number,
      qr_download: `${BACKEND_URL}/download/${qrFileName}`
    });
  } catch (err) {
    console.error("RSVP error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;