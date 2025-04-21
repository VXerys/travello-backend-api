const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/jwtMiddleware');

const {
     registerUser,
     loginUser,
     changePassword,
     forgotPassword,
     resetPassword,
     resendVerificationCode,
     verifyEmail
     
     
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-verification-code', resendVerificationCode);
router.post('/verify-email', verifyEmail);


module.exports = router;
