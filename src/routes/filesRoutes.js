const express = require('express');
const files = require('../controllers/filesController');
const authJWT = require('../middlewares/authJWT');
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
    const userId = req.user;
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
    cb(null, file.originalname + '-' + Date.now());
  }
});

// Set up multer configuration with custom error message for exceeding file upload limit
const upload = multer({
  storage: storage,
  limits: {
    // fileSize: 10 * 1024 * 1024, // 10 MB file size limit
    files: 10, // Maximum 10 files allowed
  },
  fileFilter: function (req, file, cb) {
    // Custom file filter logic (if needed)
    cb(null, true);
  },
}).array('files');
// const upload = multer({ storage: storage });

// Middleware to handle file upload
const handleFileUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, message: 'Cannot upload more than 10 files at once.' });
      }
      // Handle other Multer errors (if needed)
    } else if (err) {
      // Handle other errors (if needed)
      console.error(err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
    // Proceed to the next middleware if no errors
    next();
  });
};

// Route for uploading a file to the user's storage space.
// router.post('/upload', verifyToken, upload.array('files', 10), files.uploadFile);
router.post('/upload', verifyToken, handleFileUpload, files.uploadFile);

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

// Route for retrieving usage analytics.
router.get('/usage-analytics', verifyToken, files.getUsageAnalytics);

// Route for deleting files or directories.
router.delete('/delete', verifyToken, files.deleteFilesOrDirectories);

module.exports = router;