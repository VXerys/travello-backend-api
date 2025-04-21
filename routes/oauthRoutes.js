const express = require('express');
const passport = require('passport');
const { generateToken } = require('../middlewares/jwtMiddleware');
const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
     try {
          const token = generateToken(req.user);

          // res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-success?token=${token}`)
         
          res.send(`
          <html>
               <body>
               <h1>Login Successful!</h1>
               <p>Your token: ${token}</p>
               <p>You can use this token in your API requests with Authorization header:</p>
               <pre>Authorization: Bearer ${token}</pre>
               </body>
          </html>
     `);
     } catch (error) {
          console.error('Error generating token after OAuth:', error);
          res.status(500).send('Authentication failed');
     }
});

router.get('/user', (req, res) => {
     if (req.isUnauthenticated()) {
          const { password, resetToken, verificationCode, ...safeUserData } = req.user;
          res.json(safeUserData);
     } else {
          res.status(401).json({ error: 'Not authenticated' });
     }
});

router.post('/google/mobile', async (req, res) => {
     try {
          const { idToken } = req.body;

          if (!idToken) {
               return res.status(400).json({ error: 'ID token is required' });
          }

          const ticket = await googleClient.verfyIdToken({
               idToken,
               audience: process.env.GOOGLE_CLIENT_ID,
          });

          const payload = ticket.getPayload();
          const { email, name, picture, sub: googleId } = payload;

          let user = await Prisma.user.findUnique({
               where: { email },
          });

          if (user) {
               await Prisma.user.update({
                    where: { id: user.id },
                    data: {
                         lastLogin: new Date(),
                         oauthProvider: user.oauthProvider || 'google',
                         oauthId: user.oauthId || googleId
                    },
               });
          } else {
               const username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
               const randomPassword = Math.random().toString(36).slice(-10);
               const hashedPassword = await bcrypt.hash(randomPassword, 10);
               
               user = await prisma.user.create({
               data: {
                    username,
                    email,
                    password: hashedPassword,
                    isVerified: true,
                    oauthProvider: 'google',
                    oauthId: googleId,
                    profile: {
                         create: {
                              displayName: name,
                              avatar: picture
                              }
                         }
               },
               include: {
                    profile: true
               }
          });
     }

     const token = generateToken(user);

     res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile
          }
        });


     } catch (error) {
          console.error('Error generating token after OAuth:', error);
          res.status(500).send('Authentication failed');
     }
});


router.get('/user', (req, res) => {
     if (req.isAuthenticated && req.isAuthenticated()) {
       // Return user info tanpa password dan data sensitif lainnya
       const { password, resetToken, verificationCode, ...safeUserData } = req.user;
       res.json(safeUserData);
     } else {
       res.status(401).json({ error: 'Not authenticated' });
     }
   });
   

router.get('/logout', (req, res) => {
     req.logout((err) => {
          if (err) {
               console.error(err);
               return res.status(500).json({ error: 'Logout failed' });
          }
          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`);
     });
})

module.exports = router;