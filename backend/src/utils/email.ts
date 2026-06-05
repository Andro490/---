import nodemailer from 'nodemailer';

export const sendSupportNotificationEmail = async (userEmail: string, userName: string, messageText: string) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'emelnasr@gmail.com', // fallback or actual email
        pass: process.env.EMAIL_PASS || '', // Admin needs to put app password in .env
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'emelnasr@gmail.com',
      to: 'emelnasr@gmail.com', // Admin's email
      subject: `رسالة دعم جديدة من ${userName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
          <h2 style="color: #7c3aed;">رسالة دعم جديدة (المنصة التعليمية)</h2>
          <p><strong>اسم المرسل:</strong> ${userName}</p>
          <p><strong>البريد الإلكتروني للمرسل:</strong> ${userEmail}</p>
          <hr style="border: none; border-top: 1px solid #ccc; margin: 15px 0;"/>
          <p><strong>نص الرسالة:</strong></p>
          <p style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${messageText}</p>
          <br />
          <p style="font-size: 12px; color: #888;">يمكنك الرد على هذه الرسالة من خلال لوحة تحكم الإدارة في الموقع.</p>
        </div>
      `,
    };

    if (process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log('Support notification email sent successfully.');
    } else {
      console.log('No EMAIL_PASS configured in .env, skipping email notification.');
    }
  } catch (error) {
    console.error('Error sending support email:', error);
  }
};
