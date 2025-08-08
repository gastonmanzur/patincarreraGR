// utils/enviarEmailConfirmacion.js
import nodemailer from 'nodemailer';

const enviarEmailConfirmacion = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const url = `${process.env.FRONTEND_URL}/confirmar/${token}`;

  await transporter.sendMail({
    from: '"Mi Proyecto" <no-reply@miweb.com>',
    to: email,
    subject: 'Confirmá tu cuenta',
    html: `<p>Hacé clic en el siguiente enlace para confirmar tu cuenta:</p><a href="${url}">${url}</a>`
  });
};

export default enviarEmailConfirmacion;
