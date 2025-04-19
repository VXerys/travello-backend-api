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