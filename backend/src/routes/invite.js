import express from "express";
import { pool } from "../config/database.js";

const router = express.Router();

router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      "SELECT full_name, table_number FROM guest_pro WHERE invitation_code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invité non trouvé" });
    }

    const guest = result.rows[0];

    res.json({
      full_name: guest.full_name,
      table_number: guest.table_number || "inconnu",
    });
  } catch (err) {
    console.error("Invite fetch error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
