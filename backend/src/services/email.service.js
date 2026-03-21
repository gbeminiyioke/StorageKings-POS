import nodemailer from "nodemailer";

export const sendEmailWithAttachment = async ({
  to,
  subject,
  text,
  buffer,
  filename,
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    family: 4, //FORCE IPV4
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"StorageKings POS" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: buffer,
      },
    ],
  });
};
