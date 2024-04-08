const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var db = require("../configs/mysql_db");
const verifyToken = require('../middlewares/authJWT');
const blacklist = verifyToken.blacklist;
var User = db.user;

/**
 * Registers a new user.
 * 
 * Endpoint: POST /api/auth/register
 * 
 * @param {object} req - The request object containing username, email, and password in JSON format.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
var registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username contains spaces
    if (username.includes(' ')) {
      return res.status(400).json({
        success: false,
        message: 'Username should not contain spaces'
      });
    }

    // Check if password contains spaces
    if (password.includes(' ') || password.length == 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password, try using another password'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user record in the database
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword
    });

    // Respond with success message and new user details
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: newUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Logs in an existing user.
 * 
 * Endpoint: POST /api/auth/login
 * 
 * @param {object} req - The request object containing email and password in JSON format.
 * @param {object} res - The response object.
 * @returns {object} Success message with a JWT token if login is successful, or error details.
 */
var loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ where: { email } });

    // If user not found, respond with error
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    // If passwords don't match, respond with error
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respond with success message and token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Logs out a user by blacklisting their token.
 * 
 * Endpoint: POST /api/auth/logout
 * 
 * @param {object} req - The request object containing the token in the authorization header.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
var logoutUser = (req, res) => {
  try {
    // Blacklist the token
    blacklist.push(req.headers.authorization);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser
};