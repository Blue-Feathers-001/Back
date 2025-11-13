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
  price: number,
  startDate: Date,
  endDate: Date
) => {
  const planColors = {
    basic: '#3b82f6',
    premium: '#8b5cf6',
    vip: '#f59e0b',
  };

  const planColor = planColors[plan.toLowerCase() as keyof typeof planColors] || '#667eea';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .plan-card { background: white; padding: 20px; border-left: 4px solid ${planColor}; margin: 20px 0; border-radius: 5px; }
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
            <h3 style="color: ${planColor}; text-transform: capitalize;">${plan} Plan</h3>
            <p><strong>Price:</strong> LKR ${price}</p>
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

// Send membership expiry reminder (7, 3, or 1 day before)
export const sendMembershipExpiryReminder = async (
  email: string,
  name: string,
  packageName: string,
  endDate: Date,
  daysRemaining: number
) => {
  const urgencyColors = {
    7: '#3b82f6', // Blue
    3: '#f59e0b', // Amber
    1: '#ef4444', // Red
  };

  const urgencyColor = urgencyColors[daysRemaining as keyof typeof urgencyColors] || '#f59e0b';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: white; padding: 20px; border-left: 4px solid ${urgencyColor}; margin: 20px 0; border-radius: 5px; }
        .countdown { text-align: center; font-size: 48px; font-weight: bold; color: ${urgencyColor}; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Membership Expiring Soon</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>This is a friendly reminder that your membership is expiring soon.</p>

          <div class="alert-box">
            <h3 style="color: ${urgencyColor}; margin-top: 0;">Your ${packageName} Membership</h3>
            <p><strong>Expires On:</strong> ${new Date(endDate).toLocaleDateString()}</p>
            <div class="countdown">${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Left</div>
          </div>

          <p><strong>Don't let your fitness journey stop!</strong></p>
          <p>Renew your membership now to continue enjoying all the benefits without any interruption.</p>

          <a href="${process.env.FRONTEND_URL}/dashboard/renew" class="button">Renew Now</a>

          <p>If you have any questions or need assistance, please contact our support team.</p>

          <p>Best regards,<br>Blue Feathers Gym Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Blue Feathers Gym. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, `⚠️ Your Membership Expires in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}!`, html);
};

// Send membership expired notification
export const sendMembershipExpiredEmail = async (
  email: string,
  name: string,
  packageName: string,
  endDate: Date
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .expired-box { background: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 5px; }
        .grace-period { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Membership Expired</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Your membership has expired.</p>

          <div class="expired-box">
            <h3 style="color: #ef4444; margin-top: 0;">${packageName} Membership</h3>
            <p><strong>Expired On:</strong> ${new Date(endDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: #ef4444;">Expired</span></p>
          </div>

          <div class="grace-period">
            <h3 style="margin-top: 0;">🎁 5-Day Grace Period Available!</h3>
            <p>You have <strong>5 days</strong> to renew your membership and continue without interruption. After this period, your account will be suspended.</p>
          </div>

          <p><strong>Renew now to keep your fitness momentum going!</strong></p>

          <a href="${process.env.FRONTEND_URL}/dashboard/renew" class="button">Renew Membership</a>

          <p>Questions? Our support team is here to help!</p>

          <p>Best regards,<br>Blue Feathers Gym Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Blue Feathers Gym. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, '❌ Your Gym Membership Has Expired', html);
};

// Send grace period expiring soon notification
export const sendGracePeriodReminderEmail = async (
  email: string,
  name: string,
  packageName: string,
  gracePeriodEndDate: Date
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Final Reminder: Grace Period Ending</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>This is your final reminder about your expired membership.</p>

          <div class="warning-box">
            <h3 style="color: #f59e0b; margin-top: 0;">⚠️ Action Required!</h3>
            <p>Your <strong>${packageName}</strong> membership's grace period ends on:</p>
            <p style="font-size: 20px; font-weight: bold; color: #d97706;">${new Date(gracePeriodEndDate).toLocaleDateString()}</p>
            <p>After this date, your account will be suspended and you will lose access to all membership benefits.</p>
          </div>

          <p><strong>Renew today to avoid suspension!</strong></p>

          <a href="${process.env.FRONTEND_URL}/dashboard/renew" class="button">Renew Now</a>

          <p>Don't miss out on your fitness goals. We're here to support you!</p>

          <p>Best regards,<br>Blue Feathers Gym Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Blue Feathers Gym. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, '⏰ Final Reminder: Grace Period Ending Soon', html);
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMembershipActivationEmail,
  sendMembershipExpiryReminder,
  sendMembershipExpiredEmail,
  sendGracePeriodReminderEmail,
};
