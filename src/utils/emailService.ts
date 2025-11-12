import nodemailer from 'nodemailer';

// Brevo Transporter Configuration (simplified - matching working SRI_EXPRESS config)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  // Check if required environment variables are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('[Email] ERROR: Missing required Brevo email configuration (SMTP_USER, SMTP_PASSWORD)');
    throw new Error('Email service is not configured');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Blue Feathers Gym" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Message sent via Brevo: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Error sending email via Brevo to ${to}:`, error);
    throw new Error(`Email could not be sent. Reason: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Blue Feathers Gym!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for joining Blue Feathers Gym. We're excited to have you as part of our fitness community!</p>

          <p><strong>Your account has been successfully created.</strong></p>

          <p>Here's what you can do next:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Choose a membership plan</li>
            <li>Start your fitness journey</li>
          </ul>

          <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>

          <p>If you have any questions, feel free to contact our support team.</p>

          <p>Best regards,<br>Blue Feathers Gym Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Blue Feathers Gym. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Welcome to Blue Feathers Gym!', html);
};

export const sendPasswordResetEmail = async (email: string, name: string, otp: string) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { text-align: center; margin: 30px 0; }
        .otp-code { display: inline-block; padding: 20px 40px; background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>You recently requested to reset your password for your Blue Feathers Gym account.</p>

          <p>Your One-Time Password (OTP) is:</p>

          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>

          <p>Enter this code on the password reset page to create a new password.</p>

          <div class="warning">
            <strong>Security Note:</strong>
            <ul>
              <li>This OTP will <strong>expire in 1 hour</strong></li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Never share this OTP with anyone</li>
              <li>Your password won't change until you complete the reset process</li>
            </ul>
          </div>

          <p>Best regards,<br>Blue Feathers Gym Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Blue Feathers Gym. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Password Reset OTP - Blue Feathers Gym', html);
};

export const sendMembershipActivationEmail = async (
  email: string,
  name: string,
  plan: string,
  startDate: Date,
  endDate: Date
) => {
  const planDetails = {
    basic: { price: '$29/month', color: '#3b82f6' },
    premium: { price: '$59/month', color: '#8b5cf6' },
    vip: { price: '$99/month', color: '#f59e0b' },
  }[plan.toLowerCase()] || { price: 'N/A', color: '#667eea' };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .plan-card { background: white; padding: 20px; border-left: 4px solid ${planDetails.color}; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Membership Activated!</h1>
        </div>
        <div class="content">
          <h2>Congratulations, ${name}!</h2>
          <p>Your membership has been activated. Welcome to the Blue Feathers Gym family!</p>

          <div class="plan-card">
            <h3 style="color: ${planDetails.color}; text-transform: capitalize;">${plan} Plan</h3>
            <p><strong>Price:</strong> ${planDetails.price}</p>
            <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: #10b981;">Active</span></p>
          </div>

          <p>You can now enjoy all the benefits of your ${plan} membership!</p>

          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Dashboard</a>

          <p>See you at the gym!</p>

          <p>Best regards,<br>Blue Feathers Gym Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Blue Feathers Gym. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, `Your ${plan.toUpperCase()} Membership is Now Active!`, html);
};

export default { sendEmail, sendWelcomeEmail, sendPasswordResetEmail, sendMembershipActivationEmail };
