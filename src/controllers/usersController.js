const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var db = require("../configs/mysql_db");
var User = db.user; // Return the user model (Return Table Name i.e., users)
const verifyToken = require('../middlewares/authJWT'); // Import the token verification middleware
const blacklist = verifyToken.blacklist; // Import the blacklist array

var registerUser = async (req, res) => {
  try {
    // Extract user data from request body
    const { username, email, password } = req.body;
    // process.exit(1);

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

var loginUser = async (req, res) => {
  try {
    // Extract user data from request body
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

var logoutUser = (req, res) => {
  try {
    console.log(blacklist);

    // Blacklist the token
    blacklist.push(req.headers.authorization);
    console.log(blacklist);
    // process.exit(1);

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