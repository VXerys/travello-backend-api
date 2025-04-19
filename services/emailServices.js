/**
 * Email Service Module
 * Provides functionality for sending various types of transactional emails
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Generates a secure random verification code
 * @param {number} length - Length of the code to generate (default: 6)
 * @returns {string} - The generated verification code
 */
const generateVerificationCode = (length = 6) => {
  // Use crypto.randomInt for more secure random number generation
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
};

/**
 * Generates a secure random reset token
 * @param {number} length - Length of the token to generate (default: 6)
 * @returns {string} - The generated reset token
 */
const generateResetToken = (length = 6) => {
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
};

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE === 'false' ? false : true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  socketTimeout: parseInt(process.env.EMAIL_TIMEOUT) || 20000,
};

// Create reusable transporter
const transporter = nodemailer.createTransport(emailConfig);

/**
 * Verify email configuration is working
 * @returns {Promise<boolean>} - True if verification succeeded
 */
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send emails');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} [options.text] - Optional plain text version
 * @returns {Promise<Object>} - Nodemailer info object
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'App Name'} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version if not provided
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`${subject} email sent successfully to ${to} (${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`Error sending ${subject} email:`, error);
    throw new Error(`Failed to send ${subject} email: ${error.message}`);
  }
};

/**
 * Send verification email
 * @param {string} to - Recipient email address
 * @param {string} verificationCode - The verification code
 * @param {string} [name] - Optional recipient name
 * @returns {Promise<Object>} - Nodemailer info object
 */
const sendVerificationEmail = async (to, verificationCode, name = '') => {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a4a4a;">Email Verification</h2>
      <p>${greeting}</p>
      <p>Thank you for registering! Please verify your email address to complete your registration.</p>
      <p>Your verification code is: <strong style="font-size: 18px; color: #007bff;">${verificationCode}</strong></p>
      <p>Please use this code to verify your email. The code will expire in 1 hour.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: 'Verify Your Email Address',
    html,
  });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetToken - The reset token
 * @param {string} [name] - Optional recipient name
 * @returns {Promise<Object>} - Nodemailer info object
 */
const sendResetPasswordEmail = async (to, resetToken, name = '') => {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a4a4a;">Password Reset</h2>
      <p>${greeting}</p>
      <p>We received a request to reset the password for your account.</p>
      <p>Your password reset code is: <strong style="font-size: 18px; color: #007bff;">${resetToken}</strong></p>
      <p>This code will expire in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: 'Reset Your Password',
    html,
  });
};

/**
 * Send welcome email after successful registration
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 * @returns {Promise<Object>} - Nodemailer info object
 */
const sendWelcomeEmail = async (to, name) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a4a4a;">Welcome to Our Platform!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for joining us! Your account has been successfully created and verified.</p>
      <p>You can now enjoy all the features our platform has to offer.</p>
      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: 'Welcome to Our Platform',
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendWelcomeEmail,
  generateVerificationCode,
  generateResetToken,
  verifyEmailConfig
};