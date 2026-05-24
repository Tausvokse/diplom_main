import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_SLCrzRUt_KQMpFWkRP5KRphYqHprqR4yc');

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Система Поселення КАІ <noreply@mydormitory.tech>',
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
    });

    if (error) {
      throw error;
    }

    console.log(`Verification email sent to ${to} with code ${code}. ID: ${data?.id}`);
  } catch (error) {
    console.error('Error sending verification email via Resend:', error);
    // Fallback for dev mode
    console.log(`\n=================================================`);
    console.log(`[DEV MODE] Verification code for ${to} is: ${code}`);
    console.log(`=================================================\n`);
  }
};
