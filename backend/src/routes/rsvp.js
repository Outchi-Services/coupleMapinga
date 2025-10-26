import express from "express";
import { pool } from "../config/database.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const router = express.Router();

// Assurez-vous que ces variables sont bien définies dans votre environnement
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

        // --- Préparation du QR Code ---
        const qrDir = path.resolve("qrcodes");
        if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

        const qrFileName = `${invitation_code}.png`;
        const qrPath = path.join(qrDir, qrFileName);
        const qrUrl = `${FRONTEND_URL}/qr.html?code=${invitation_code}`;

        let rsvp_status = "nouveau"; // État initial

        // 2️⃣ Vérifier si RSVP existe déjà
        const existingRsvpRes = await pool.query(
            "SELECT id FROM rsvp_responses WHERE guest_id = $1",
            [guest.id]
        );

        if (existingRsvpRes.rows.length > 0) {
            rsvp_status = "existant";
        } else {
            // 3️⃣ Enregistrer le NOUVEL RSVP
            await pool.query(
                `INSERT INTO rsvp_responses (guest_id, whatsapp_number, drink_choice, guestbook_message, responded_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [guest.id, whatsapp_number, drink_choice || null, guestbook_message || null]
            );
        }

        // 4️⃣ Logique de Génération et d'Insertion/Mise à jour du QR Code
        
        // Regarder si le QR existe en base de données.
        const qrDB = await pool.query(
            "SELECT id FROM qr_codes WHERE guest_id = $1",
            [guest.id]
        );

        // Si le QR n'existe pas ou si le RSVP est nouveau, on régénère le fichier (pour être sûr)
        if (qrDB.rows.length === 0 || rsvp_status === "nouveau") {
            // Générer le fichier QR code sur le disque
            await QRCode.toFile(qrPath, qrUrl, { width: 300 });

            // Insérer ou mettre à jour l'enregistrement dans la DB (Utilise ON CONFLICT)
            await pool.query(
                `INSERT INTO qr_codes (guest_id, qr_image_path, qr_redirect_url, created_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (guest_id) DO UPDATE SET 
                    qr_image_path = EXCLUDED.qr_image_path,
                    qr_redirect_url = EXCLUDED.qr_redirect_url,
                    created_at = NOW()`,
                [guest.id, qrPath, qrUrl]
            );
        }
        
        // 5️⃣ Réponse finale
        const message = rsvp_status === "existant" 
            ? "RSVP déjà soumis. QR code récupéré." 
            : "RSVP enregistré avec succès ! QR code généré.";

        return res.json({
            success: true,
            message: message,
            guest_name: guest.full_name,
            table_number: guest.table_number,
            qr_download: `${BACKEND_URL}/download/${qrFileName}`
        });

    } catch (err) {
        // En cas d'erreur liée au DB ou au système de fichiers
        console.error("RSVP error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
