import nodemailer from "nodemailer";

interface ResetMailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: ResetMailParams) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "no-reply@repa.local";

  const transport = smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

  const info = await transport.sendMail({
    from: smtpFrom,
    to,
    subject: "Reset Password Akun REPA",
    text: `Halo ${name},\n\nKlik tautan berikut untuk reset password Anda:\n${resetUrl}\n\nTautan berlaku 1 jam.\n\nJika Anda tidak meminta reset password, abaikan email ini.`,
    html: `<p>Halo <strong>${name}</strong>,</p><p>Klik tautan berikut untuk reset password Anda:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Tautan berlaku 1 jam.</p><p>Jika Anda tidak meminta reset password, abaikan email ini.</p>`,
  });

  if (!smtpHost) {
    console.log("[MAIL PREVIEW] Reset email generated:", info.message);
  }

  return info;
}
