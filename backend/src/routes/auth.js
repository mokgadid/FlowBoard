const express = require('express');
const router = express.Router();
const { register, login, updateProfile } = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.put('/update', authRequired, updateProfile);

module.exports = router;


