import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rsvpRouter from "./routes/rsvp.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/qrcodes", express.static("qrcodes")); // serve QR files

app.use("/api/rsvp", rsvpRouter);

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
