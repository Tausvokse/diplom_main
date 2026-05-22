import nodemailer from 'nodemailer';

// Create a transporter using config or some default for dev
// Note: In a real app, use environment variables (e.g. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password',
  },
});

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    const mailOptions = {
      from: `"Система Поселення КАІ" <${process.env.SMTP_USER || 'noreply@kai.edu.ua'}>`,
      to,
      subject: 'Код підтвердження реєстрації',
      text: `Ваш код підтвердження: ${code}\nКод дійсний протягом 10 хвилин.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Підтвердження реєстрації</h2>
          <p style="color: #555; font-size: 16px;">Вітаємо! Для завершення реєстрації в системі поселення, будь ласка, використайте наступний код:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #000;">${code}</span>
          </div>
          <p style="color: #777; font-size: 14px; text-align: center;">Код дійсний протягом 10 хвилин.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to} with code ${code}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // If SMTP is not configured or fails, we DO NOT throw the error 
    // so that local development/testing can continue using the console log.
    console.log(`\n=================================================`);
    console.log(`[DEV MODE] Verification code for ${to} is: ${code}`);
    console.log(`=================================================\n`);
    
    // In production, if you strictly need emails to work, you could throw:
    // if (process.env.NODE_ENV === 'production') throw error;
  }
};
