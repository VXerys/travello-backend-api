const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../middlewares/jwtMiddleware');
const emailService = require('../services/emailServices');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */

const registerUser = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      if (!existingUser.isVerified) {
          const verificationCode = emailService.generateVerificationCode();

          await prisma.user.update({
               where: { id: existingUser.id },
               data: {
                    username,
                    password : await bcrypt.hash(password, SALT_ROUNDS),
                    verificationCode,
                    verficationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
               }
          });

          await emailService.sendVerificationEmail(email, verificationCode, username);
          return res.status(200).json({
               message: 'Email verfiication resent. Please check your email.',
               userId: existingUser.id
          });
      } else {
          return res.status(400).json({ error: 'Email is already registered and verified' });
      }
    }

    const verificationCode = emailService.generateVerificationCode();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
     data: {
          username,
          email,
          password: hashedPassword,
          verificationCode,
          verficationCodeExpires: new Date(Date.now() + 3600000),
          profile: {
               create: {
                    displayName: username,
               }
          }
     },
     include: {
          profile: true
     }
    });

    await emailService.sendVerificationEmail(email, verificationCode, username);

    res.status(201).json({
     message: 'Registration successful. Please check your email for verification.',
     userId: newUser.id
    });
  } catch (error) {
     console.error('Error in registerUser:', error);
     res.status(500).json({ error: 'Internal server error' });  
     }
}

/**
 * Verify a user's email with verification code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */

const verifyEmail = async (req, res) => {
  try {
    const { email ,verificationCode } = req.body;

    if(!email || !verificationCode) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if(!user) {
     return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
      return res.status(401).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    await prisma.user.update({
     where: { id: user.id },
     data: {
          isVerified: true,
          verificationCode: null,
          verficationCodeExpires: null
     }
    });

    await emailService.sendWelcomeEmail(email, user.username);

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
     console.error('Error in verifyEmail:', error);
     res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Resend verification code to user's email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    const newVerificationCode = emailService.generateVerificationCode();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: newVerificationCode,
        verificationCodeExpires: new Date(Date.now() + 3600000),
      },
    });

    await emailService.sendVerificationEmail(email, newVerificationCode, user.username);

    res.status(200).json({ message: 'Verification code resent. Please check your email.' });
  } catch (error) {
    console.error('Error in resendVerificationCode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Authenticate and login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if(!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
     return res.status(401).json({ 
          error: 'Email not verified', 
          needsVerification: true 
        });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date()
      }
    });

    // belum final
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ 
     token, 
     user: {
       id: user.id,
       username: user.username,
       email: user.email,
       profile: user.profile
     }
   });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Change user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */

const changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword, confirmPassword } = req.body;

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Email, current password, new password, and confirm password are required' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({ error: 'New password cannot be the same as the current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

