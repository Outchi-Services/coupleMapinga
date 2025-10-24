import express from "express";
import { pool } from "../config/database.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, g.full_name, r.whatsapp_number, r.drink_choice, r.guestbook_message, r.responded_at
      FROM rsvp_responses r
      JOIN guests g ON r.guest_id = g.id
      ORDER BY r.responded_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB query failed" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { full_name, whatsapp_number, drink_choice, guestbook_message } = req.body;

    // 1️⃣ Find guest
    const guestResult = await pool.query(
      "SELECT id, invitation_code FROM guests WHERE full_name = $1",
      [full_name]
    );

    if (guestResult.rows.length === 0)
      return res.status(404).json({ error: "Guest not found" });

    const guest = guestResult.rows[0];

    // 2️⃣ Save RSVP
    await pool.query(
      `INSERT INTO rsvp_responses (guest_id, whatsapp_number, drink_choice, guestbook_message)
       VALUES ($1, $2, $3, $4)`,
      [guest.id, whatsapp_number, drink_choice, guestbook_message || null]
    );

    // 3️⃣ Generate QR
    const redirectUrl = `https://yourdomain.com/invite/${guest.invitation_code}`;
    const qrDir = path.resolve("qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

    const qrPath = path.join(qrDir, `${guest.invitation_code}.png`);
    await QRCode.toFile(qrPath, redirectUrl, { width: 300 });

    // 4️⃣ Save QR record
    await pool.query(
      `INSERT INTO qr_codes (guest_id, qr_image_path, qr_redirect_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (guest_id)
       DO UPDATE SET qr_image_path = EXCLUDED.qr_image_path, qr_redirect_url = EXCLUDED.qr_redirect_url`,
      [guest.id, qrPath, redirectUrl]
    );

    res.json({
      success: true,
      message: "RSVP saved successfully!",
      qr_download: `http://localhost:4000/qrcodes/${guest.invitation_code}.png`,
    });
  } catch (err) {
    console.error("RSVP error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
