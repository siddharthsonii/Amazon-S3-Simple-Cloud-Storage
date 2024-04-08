const express = require('express');
const directories = require('../controllers/directoriesController');
const authJWT = require('../middlewares/authJWT');
const verifyToken = authJWT.verifyToken;

const router = express.Router();

// Route for creating a new directory.
router.post('/create', verifyToken, directories.createDirectory);

// Route for retrieving a list of user's directories.
router.get('/list', verifyToken, directories.getUserDirectories);

// Route for retrieving files within a directory.
router.get('/:directoryId/files', verifyToken, directories.getFilesInDirectory);

// Route for moving a file or directory to another directory.
router.put('/move', verifyToken, directories.moveFileOrDirectory);

module.exports = router;