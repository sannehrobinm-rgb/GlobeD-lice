import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { sendVerificationEmail, sendResetEmail } from "../utils/mailer.js";

export const register = async (req, res) => {
  console.log("📩 REGISTER appelé avec:", req.body);
  const { email, password } = req.body;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (existing.length > 0)
      return res.status(400).json({ message: "Email déjà utilisé" });

    const hashed = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");

    await sql`
      INSERT INTO users (email, password, verification_token, is_verified)
      VALUES (${email}, ${hashed}, ${token}, TRUE)
    `;

    res.status(201).json({ message: "Inscription réussie ✅" });
  } catch (err) {
    console.error("ERREUR REGISTER:", err.message);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

/* export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT * FROM users WHERE verification_token = ${token}`;
    if (result.length === 0)
      return res.status(400).json({ message: "Token invalide" });

    await sql`
      UPDATE users SET is_verified = TRUE, verification_token = NULL
      WHERE verification_token = ${token}
    `;
    res.json({ message: "Email vérifié avec succès ✅" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}; */

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("🔑 LOGIN appelé avec:", email);
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = result[0];

    if (!user) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    if (!user.is_verified) return res.status(403).json({ message: "Vérifiez votre email d'abord" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("ERREUR LOGIN:", err.message);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (result.length === 0)
      return res.status(404).json({ message: "Email introuvable" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    await sql`
      UPDATE users SET reset_token = ${token}, reset_token_expires = ${expires}
      WHERE email = ${email}
    `;

    await sendResetEmail(email, token);
    res.json({ message: "Email de réinitialisation envoyé 📧" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      SELECT * FROM users
      WHERE reset_token = ${token} AND reset_token_expires > NOW()
    `;
    if (result.length === 0)
      return res.status(400).json({ message: "Token invalide ou expiré" });

    const hashed = await bcrypt.hash(password, 10);
    await sql`
      UPDATE users
      SET password = ${hashed}, reset_token = NULL, reset_token_expires = NULL
      WHERE reset_token = ${token}
    `;

    res.json({ message: "Mot de passe réinitialisé avec succès 🔐" });
  } catch (err) {
     console.error("ERREUR REGISTER:", err.message);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};