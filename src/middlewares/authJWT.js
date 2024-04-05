const jwt = require('jsonwebtoken');
const blacklist = [];
const userID = [];

const verifyToken = (req, res, next) => {
  if (req.headers && req.headers.authorization) {
    // const token = req.headers.authorization.split(' ')[1]; // Extract the token from the Authorization header
    const token = req.headers.authorization;

    if (blacklist.includes(token)) {
      // Token is blacklisted, deny access
      return res.status(401).json({
        success: false,
        message: 'Token is blacklisted'
      });
    }

    jwt.verify(req.headers.authorization, process.env.JWT_SECRET, function(err, decode) {
        if(err) {
            req.user = null;
            req.message = "Header verification failed, some issue with the token";
            next();
        } else {
            userID.push(decode.user_id);
            req.user = decode.user_id;
            req.email = decode.email
            req.message = "User found successfully";
            next();
        }
    });
  } else {
    req.user = null;
    req.message = "Authorization header not found";
    next();
  }
}

module.exports = { verifyToken, blacklist, userID };
