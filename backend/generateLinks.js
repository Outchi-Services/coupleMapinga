// generateLinks.js
import fs from "fs";
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS, // utilise juste process.env.DB_PASS
  port: process.env.DB_PORT || 5432,
});

const BASE_URL = "http://localhost:3000/coupleMapinga/frontend/";

async function generateLinks() {
  try {
    await pool.connect();
    console.log("✅ Connecté à la DB");

    const res = await pool.query("SELECT full_name, invitation_code FROM guest_pro");
    if (res.rows.length === 0) {
      console.log("⚠️ Aucun invité trouvé dans guest_pro");
      return;
    }

    const lines = res.rows.map(r => `${r.full_name}: ${BASE_URL}?code=${r.invitation_code}`);
    fs.writeFileSync("invites.txt", lines.join("\n"));
    console.log("✅ invites.txt généré !");

    await pool.end();
  } catch (err) {
    console.error("❌ Erreur generateLinks:", err.message);
  }
}

generateLinks();
