const express = require('express');
const files = require('../controllers/filesController');
const authJWT = require('../middlewares/authJWT'); // Import the token verification middleware
const verifyToken = authJWT.verifyToken;
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');

const router = express.Router();
router.use(bodyParser.json());

// Set the path to the uploads folder
const uploadsFolder = 'uploads';

// Check if the uploads folder exists
if (!fs.existsSync(uploadsFolder)) {
  // If it doesn't exist, create it
  fs.mkdirSync(uploadsFolder);
}

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // cb(null, 'uploads/'); // Save files to the "uploads" directory
    // Get the user ID from the request object (assuming it's stored in req.user)
    const userId = req.user; // Assuming req.user contains user object with id property
    const userUploadsFolder = `${uploadsFolder}/user_${userId}`;

    // Check if the user's uploads folder exists
    if (!fs.existsSync(userUploadsFolder)) {
      // If it doesn't exist, create it
      fs.mkdirSync(userUploadsFolder);
    }

    // Set the destination to the user's uploads folder
    cb(null, userUploadsFolder);
  },
  filename: function (req, file, cb) {
    // cb(null, Date.now() + '-' + file.originalname); // Set filename to current timestamp + original filename
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Route for uploading a file to the user's storage space.
router.post('/upload', verifyToken, upload.array('files', 10), files.uploadFile);

// Route for downloading a file by its ID.
router.get('/download/:fileId', verifyToken, files.downloadFile); // Permission

// Route for retrieving a list of the user's uploaded files.
router.get('/list', verifyToken, files.listFiles);

// Route for searching for files based on filenames or metadata.
router.get('/search', verifyToken, files.searchFiles);

// Route for seting permissions for a specific file.
router.post('/:fileId/permissions', verifyToken, files.setFilePermissions);

// Route for retrieving all versions of a file identified by fileId.
router.get('/:fileId/versions', verifyToken, files.getAllFileVersion);

// Route for retrieving a specific version of a file identified by both fileId and versionId.
router.get('/:fileId/versions/:versionId', verifyToken, files.getFileVersion);

// Route for restoring a previous version of a file identified by both fileId and versionId.
router.put('/:fileId/versions/:versionId/restore', verifyToken, files.restoreFileVersion);

// Route for adding metadata to a file.
router.post('/:fileId/metadata', verifyToken, files.addFileMetadata);

module.exports = router;