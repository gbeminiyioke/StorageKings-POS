import nodemailer from "nodemailer";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  family: 4, //FORCE IPV4
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP CONFIG ERROR:", err);
  } else {
    console.log("SMTP server is ready");
  }
});

export const sendResetEmail = async (to, link) => {
  await transporter.sendMail({
    from: `"StorageKings POS" <${process.env.SMTP_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <p>You requested a password reset.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${link}" style="
        display:inline-block;
        padding:10px 16px;
        background:#3182ce;
        color:white;
        text-decoration:none;
        border-radius:4px;
      ">
      Reset Password
      </a>
      <p>This link expires in 30 minutes.</p>
      `,
  });
};
