// import express from "express";
// import { pool } from "../config/database.js";

// const router = express.Router();

// router.get("/:invitation_code", async (req, res) => {
//   try {
//     const { invitation_code } = req.params;

//     const result = await pool.query(
//       `SELECT g.full_name, g.table_number, r.drink_choice
//        FROM guests g
//        LEFT JOIN rsvp_responses r ON g.id = r.guest_id
//        WHERE g.invitation_code = $1`,
//       [invitation_code]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).send("Invitation non trouvée.");
//     }

//     const guest = result.rows[0];

//     res.send(`
//       <html>
//       <head>
//         <title>Invitation de ${guest.full_name}</title>
//         <style>
//           body { font-family: sans-serif; text-align: center; padding: 50px; }
//           h1 { color: #8b3b3b; }
//           p { font-size: 1.2rem; }
//         </style>
//       </head>
//       <body>
//         <h1>Monica & Christ 💞</h1>
//         <p>Bonjour <strong>${guest.full_name}</strong>,</p>
//         <p>Table assignée: <strong>${guest.table_number || "non assignée"}</strong></p>
//         <p>Boisson choisie: <strong>${guest.drink_choice || "non sélectionnée"}</strong></p>
//         <p>Nous avons hâte de vous voir le 22 Novembre 2025 ! 💍</p>
//       </body>
//       </html>
//     `);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Erreur interne du serveur.");
//   }
// });

// export default router;


// routes/invite.js
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
