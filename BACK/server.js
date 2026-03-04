import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
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
    const { nom, categorie, origine, image, historique, recette, adresse, adresse_lat, adresse_lng } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      INSERT INTO gourmandises (nom, categorie, origine, image, historique, recette, adresse, adresse_lat, adresse_lng)
      VALUES (${nom}, ${categorie}, ${origine}, ${image}, ${historique}, ${recette}, ${adresse}, ${adresse_lat}, ${adresse_lng})
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
// PUT : modifier une pâtisserie existante (avec adresse)
// ------------------------
app.put("/gourmandises/:id", async (req, res) => {
  try {
    const { nom, origine, image, historique, recette, adresse, adresse_lat, adresse_lng } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      UPDATE gourmandises
      SET nom=${nom},
          origine=${origine},
          image=${image},
          historique=${historique},
          recette=${recette},
          adresse=${adresse},
          adresse_lat=${adresse_lat},
          adresse_lng=${adresse_lng}
      WHERE id=${req.params.id}
      RETURNING *;
    `;
    const updatedRow = result[0]?.row || result[0];
    res.json(updatedRow);
  } catch (err) {
    console.error("Erreur PUT /gourmandises/:id :", err);
    res.status(500).json({ error: "Impossible de modifier la pâtisserie" });
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
// GET : toutes les catégories custom
// ------------------------
app.get("/categories", async (req, res) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT * FROM categories ORDER BY created_at ASC`;
    const rows = result.map(r => r.row || r);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /categories :", err);
    res.status(500).json({ error: "Impossible de récupérer les catégories" });
  }
});

// ------------------------
// POST : ajouter une nouvelle catégorie
// ------------------------
app.post("/categories", async (req, res) => {
  try {
    const { nom } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      INSERT INTO categories (nom)
      VALUES (${nom})
      ON CONFLICT (nom) DO NOTHING
      RETURNING *;
    `;
    const newRow = result[0]?.row || result[0];
    res.json(newRow);
  } catch (err) {
    console.error("Erreur POST /categories :", err);
    res.status(500).json({ error: "Impossible d'ajouter la catégorie" });
  }
});

// ------------------------
// Lancement du serveur
// ------------------------
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
