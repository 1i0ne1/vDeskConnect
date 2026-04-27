import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
}) 

const send_mail = {

    async verification_code(code, email) {
        try {
            const mailOptions = {
                from: port.env.MAIL_USER,
                to: email,
                subject: 'Your vDeskConnect Verification Code',
                html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Verify Your vDeskConnect Account</h2>
          <p>Thank you for signing up for vDeskConnect. Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes. If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">vDeskConnect Team</p>
        </div>
      `
            };

            const result = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
            return result;

        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}

export default send_mail