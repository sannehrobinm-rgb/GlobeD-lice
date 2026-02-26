import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // indispensable pour lire req.body
const PORT = process.env.PORT || 4242;

// ------------------------
// GET : toutes les gourmandises
// ------------------------
app.get("/gourmandises", async (req, res) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT * FROM gourmandises`;
    const rows = result.map(r => r.row || r);
    res.json(rows);
  } catch (err) {
    console.error("DB error GET /gourmandises:", err);
    res.status(500).send("Erreur serveur");
  }
});

// ------------------------
// POST : ajouter une nouvelle pâtisserie
// ------------------------
app.post("/gourmandises", async (req, res) => {
  try {
    const { nom, categorie, origine, image, historique, recette } = req.body;
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      INSERT INTO gourmandises (nom, categorie, origine, image, historique, recette)
      VALUES (${nom}, ${categorie}, ${origine}, ${image}, ${historique}, ${recette})
      RETURNING *;
    `;

    const newRow = result[0]?.row || result[0];
    res.json(newRow);
  } catch (err) {
    console.error("Erreur POST /gourmandises :", err);
    res.status(500).json({ error: "Impossible d'ajouter la pâtisserie" });
  }
});

// ------------------------
// DELETE : supprimer une pâtisserie
// ------------------------
app.delete("/gourmandises/:id", async (req, res) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM gourmandises WHERE id = ${req.params.id}`;
    res.send("Supprimé avec succès");
  } catch (err) {
    console.error("Erreur DELETE /gourmandises/:id :", err);
    res.status(500).send("Impossible de supprimer");
  }
});

// ------------------------
// Lancement du serveur
// ------------------------
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});