
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const app = express();
const prisma = new PrismaClient();

app.use(bodyParser.json());

app.use('/auth', authRoutes);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
 console.log(`Server is running on port ${PORT}.`);
})