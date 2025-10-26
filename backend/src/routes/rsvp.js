import express from "express";
import { pool } from "../config/database.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const router = express.Router();

const FRONTEND_URL = "https://couplemapinga.netlify.app";
const BACKEND_URL = "https://couplemapinga.onrender.com";

router.post("/", async (req, res) => {
  try {
    let { full_name, whatsapp_number, drink_choice, guestbook_message } = req.body;

    if (!full_name || !whatsapp_number)
      return res.status(400).json({ error: "Nom et WhatsApp requis" });

    //1. Find guest
    const guestRes = await pool.query(
      "SELECT id, table_number, invitation_code FROM guest_pro WHERE full_name = $1",
      [full_name]
    );

    if (guestRes.rows.length === 0)
      return res.status(404).json({ error: "Invité non trouvé" });

    const guest = guestRes.rows[0];
    const invitation_code =
      guest.invitation_code || full_name.replace(/\s+/g, "").toLowerCase();

    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

    const qrFileName = `${invitation_code}.png`;
    const qrPath = path.join(qrDir, qrFileName);
    const redirectUrl = `${FRONTEND_URL}/qr.html?code=${invitation_code}`;

    // 2. Check existing RSVP
    const existingRSVP = await pool.query(
      "SELECT id FROM rsvp_responses WHERE guest_id = $1 OR whatsapp_number = $2",
      [guest.id, whatsapp_number]
    );

    // 3. Check if QR entry already exists
    const existingQR = await pool.query(
      "SELECT id, qr_image_path FROM qr_codes WHERE guest_id = $1",
      [guest.id]
    );

    // Case 1: Guest already RSVP’d
    if (existingRSVP.rows.length > 0) {
      // if QR record exists but file missing, regenerate
      if (existingQR.rows.length > 0) {
        const qrRecord = existingQR.rows[0];
        if (!fs.existsSync(qrRecord.qr_image_path)) {
          await QRCode.toFile(qrPath, redirectUrl, { width: 300 });
          await pool.query(
            "UPDATE qr_codes SET qr_image_path = $1, qr_redirect_url = $2, created_at = NOW() WHERE id = $3",
            [qrPath, redirectUrl, qrRecord.id]
          );
          console.log(`QR regeneré pour ${invitation_code}`);
        }
      } else {
        // if QR record missing, recreate and insert
        await QRCode.toFile(qrPath, redirectUrl, { width: 300 });
        await pool.query(
          `INSERT INTO qr_codes (guest_id, qr_image_path, qr_redirect_url, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [guest.id, qrPath, redirectUrl]
        );
        console.log(`QR ajouté pour ${invitation_code}`);
      }

      return res.json({
        success: true,
        message: "RSVP déjà soumis. QR récupéré depuis la base.",
        qr_download: `${BACKEND_URL}/download/${qrFileName}`,
      });
    }

    // ✅ Case 2: New RSVP
    await QRCode.toFile(qrPath, redirectUrl, { width: 300 });

    // Insert / Update QR in qr_codes
    await pool.query(
      `INSERT INTO qr_codes (guest_id, qr_image_path, qr_redirect_url, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (guest_id)
       DO UPDATE SET qr_image_path = EXCLUDED.qr_image_path,
                     qr_redirect_url = EXCLUDED.qr_redirect_url,
                     created_at = NOW()`,
      [guest.id, qrPath, redirectUrl]
    );

    // Insert RSVP
    await pool.query(
      `INSERT INTO rsvp_responses (guest_id, full_name, whatsapp_number, drink_choice, guestbook_message, responded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [guest.id, full_name, whatsapp_number, drink_choice, guestbook_message || null]
    );

    res.json({
      success: true,
      message: "RSVP enregistré avec succès !",
      qr_download: `${BACKEND_URL}/download/${qrFileName}`,
    });
  } catch (err) {
    console.error("RSVP error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
