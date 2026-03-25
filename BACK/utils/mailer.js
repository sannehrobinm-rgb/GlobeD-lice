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
          From: { Email: process.env.MAILJET_FROM, Name: "Gourmandise" },
          To: [{ Email: email }],
          Subject: "Vérifiez votre email",
          HTMLPart: `<p>Cliquez ici pour vérifier votre compte : <a href="${url}">${url}</a></p>`,
        },
      ],
    });
    console.log("✅ Email envoyé à", email);
  } catch (err) {
    console.error("❌ ERREUR MAILER:", err.message);
    throw err;
  }
};

export const sendResetEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;
  await getClient().post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_FROM, Name: "Gourmandise" },
        To: [{ Email: email }],
        Subject: "Réinitialisation de mot de passe",
        HTMLPart: `<p>Cliquez ici pour réinitialiser votre mot de passe : <a href="${url}">${url}</a></p>`,
      },
    ],
  });
  
};