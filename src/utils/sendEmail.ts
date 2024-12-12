import nodemailer from "nodemailer";

export const sendEmail = async ({
  to,
  subject,
  text,
  isHtml = false,
}: {
  to: string;
  subject: string;
  text: string;
  isHtml?: boolean;
}) => {
  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_USER,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  if (isHtml) {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: text,
    });
  } else {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  }
};
