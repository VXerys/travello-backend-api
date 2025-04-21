const jwt = require('jsonwebtoken');
const { secretKey } = require('../config/passportConfig'); 

console.log('JWT Secret available:', !!secretKey); 

const generateToken = (userId) => {
  if (!secretKey) {
    throw new Error('JWT Secret key is undefined. Check your environment variables.');
  }
  return jwt.sign({ userId }, secretKey, {});
};

const verifyToken = (token) => {
  return jwt.verify(token, secretKey);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
      const token = authHeader.split(' ')[1]; 
      try {
          const decoded = verifyToken(token);
          req.userId = decoded.userId;
          next();
      } catch (error) {
          console.error(error);
          return res.status(401).json({ error: 'Invalid token' });
      }
  } else {
      return res.status(401).json({ error: 'Token not provided' });
  }
};


module.exports = { generateToken, verifyToken, authenticateToken };
