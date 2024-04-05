const express = require('express');
const users = require('../controllers/usersController');

const router = express.Router();

// Route for user registration
router.post('/register', users.registerUser);

// Route for user login
router.post('/login', users.loginUser);

// Route for user logout
router.post('/logout', users.logoutUser);

module.exports = router;