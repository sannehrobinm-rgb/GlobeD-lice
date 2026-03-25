import Mailjet from "node-mailjet";

const getClient = () => new Mailjet({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_SECRET_KEY,
});

export const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email.html?token=${token}`;
  try {
    await getClient().post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: process.env.MAILJET_FROM, Name: "Globe Délice" },
          To: [{ Email: email }],
          Subject: "Vérifiez votre email — Globe Délice",
          HTMLPart: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #1a1108; color: #f0e6c8;">
              <h2 style="color: #ddaa20; font-weight: 300; margin-bottom: 16px;">Bienvenue sur Globe Délice</h2>
              <p style="color: rgba(240,230,200,0.7); line-height: 1.6;">Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.</p>
              <a href="${url}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; border: 1px solid #ddaa20; color: #ddaa20; text-decoration: none; letter-spacing: 0.1em; font-size: 13px; text-transform: uppercase;">Vérifier mon email</a>
              <p style="color: rgba(240,230,200,0.4); font-size: 12px;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
            </div>
          `,
        },
      ],
    });
    console.log("✅ Email de vérification envoyé à", email);
  } catch (err) {
    console.error("❌ ERREUR MAILER sendVerificationEmail:", err.message);
    throw err;
  }
};

export const sendResetEmail = async (email, token) => {
  // ✅ URL corrigée : reset-password.html (sans "world")
  const url = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;
  try {
    await getClient().post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: process.env.MAILJET_FROM, Name: "Globe Délice" },
          To: [{ Email: email }],
          Subject: "Réinitialisation de votre mot de passe — Globe Délice",
          HTMLPart: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #1a1108; color: #f0e6c8;">
              <h2 style="color: #ddaa20; font-weight: 300; margin-bottom: 16px;">Réinitialisation du mot de passe</h2>
              <p style="color: rgba(240,230,200,0.7); line-height: 1.6;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous. Ce lien est valable <strong style="color: #ddaa20;">1 heure</strong>.</p>
              <a href="${url}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; border: 1px solid #ddaa20; color: #ddaa20; text-decoration: none; letter-spacing: 0.1em; font-size: 13px; text-transform: uppercase;">Réinitialiser mon mot de passe</a>
              <p style="color: rgba(240,230,200,0.4); font-size: 12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.</p>
            </div>
          `,
        },
      ],
    });
    console.log("✅ Email de réinitialisation envoyé à", email);
  } catch (err) {
    console.error("❌ ERREUR MAILER sendResetEmail:", err.message);
    throw err;
  }
};
