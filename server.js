require('dotenv').config(); // Pindahkan ini ke paling atas

const { PrismaClient } = require('@prisma/client');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const app = express();
const prisma = new PrismaClient();

app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/oauth', oauthRoutes);

app.get('/', (req, res) => {
  res.send('Server is running! Use /auth/* for regular authentication and /oauth/* for OAuth flows.');
});

async function logError(error) {
  try {
    await prisma.errorLog.create({
      data: {
        errorMessage: error.message,
        stackTrace: error.stack,
      },
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}
   
app.use((err, req, res, next) => {
  logError(err).catch(console.error);
  res.status(500).send('An error occurred');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
 console.log(`Server is running on port ${PORT}.`);
})