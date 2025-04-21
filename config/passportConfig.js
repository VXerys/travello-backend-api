const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET_KEY;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://localhost:5000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: profile.emails[0].value },
      });

      if (existingUser) {
        return done(null, existingUser);
      }

      const newUser = await prisma.user.create({
        data: {
          username: profile.displayName,
          email: profile.emails[0].value,
          isVerified: true,
        },
      });

      return done(null, newUser);
    } catch (error) {
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
