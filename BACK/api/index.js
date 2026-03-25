import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import authRoutes from "../routes/auth.routes.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/auth", authRoutes);

// ------------------------
// GET : toutes les gourmandises (public)
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
// POST : ajouter une pâtisserie (protégé)
// ------------------------
app.post("/gourmandises", authMiddleware, async (req, res) => {
  try {
    const { nom, categorie, origine, image, historique, recette, adresse, adresse_lat, adresse_lng } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      INSERT INTO gourmandises (nom, categorie, origine, image, historique, recette, adresse, adresse_lat, adresse_lng)
      VALUES (${nom}, ${categorie}, ${origine}, ${image}, ${historique}, ${recette}, ${adresse}, ${adresse_lat}, ${adresse_lng})
      RETURNING *;
    `;
    res.json(result[0]?.row || result[0]);
  } catch (err) {
    console.error("Erreur POST /gourmandises :", err);
    res.status(500).json({ error: "Impossible d'ajouter la pâtisserie" });
  }
});

// ------------------------
// PUT : modifier une pâtisserie (protégé)
// ------------------------
app.put("/gourmandises/:id", authMiddleware, async (req, res) => {
  try {
    const { nom, origine, image, historique, recette, adresse, adresse_lat, adresse_lng } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      UPDATE gourmandises
      SET nom=${nom}, origine=${origine}, image=${image}, historique=${historique},
          recette=${recette}, adresse=${adresse}, adresse_lat=${adresse_lat}, adresse_lng=${adresse_lng}
      WHERE id=${req.params.id}
      RETURNING *;
    `;
    res.json(result[0]?.row || result[0]);
  } catch (err) {
    console.error("Erreur PUT /gourmandises/:id :", err);
    res.status(500).json({ error: "Impossible de modifier la pâtisserie" });
  }
});

// ------------------------
// DELETE : supprimer une pâtisserie (protégé)
// ------------------------
app.delete("/gourmandises/:id", authMiddleware, async (req, res) => {
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
// GET : catégories (public)
// ------------------------
app.get("/categories", async (req, res) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT * FROM categories ORDER BY created_at ASC`;
    res.json(result.map(r => r.row || r));
  } catch (err) {
    res.status(500).json({ error: "Impossible de récupérer les catégories" });
  }
});

// ------------------------
// POST : ajouter une catégorie (protégé)
// ------------------------
app.post("/categories", authMiddleware, async (req, res) => {
  try {
    const { nom } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      INSERT INTO categories (nom) VALUES (${nom})
      ON CONFLICT (nom) DO NOTHING
      RETURNING *;
    `;
    res.json(result[0]?.row || result[0]);
  } catch (err) {
    res.status(500).json({ error: "Impossible d'ajouter la catégorie" });
  }
});

// Export pour Vercel — pas de app.listen()
export default app;
