const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET_KEY;

if (!secretKey) {
  console.warn('JWT_SECRET_KEY is not defined. Please set it in your environment variables.');
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL || 'http://localhost:5000'}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: profile.emails[0].value },
        include: { profile: true },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { lastLogin: new Date() },
        })
        return done(null, existingUser);
      }

      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
          email: profile.emails[0].value,
          password: hashedPassword,
          isVerified: true,
          oauthProvider: 'google',
          oauthId: profile.id,
          profile: {
            create: {
              displayName: profile.displayName,
              avatar: profile.photos?.[0]?.value || null
            },
          },
        },
        include: { profile: true },
      });

      return done(null, newUser);
    } catch (error) {
      console.error('Error in Google authentication:', error);
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = {
  passport,
  secretKey
}
