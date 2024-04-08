var db = require("../configs/mysql_db");
var File = db.file;
var Directory = db.directory;

/**
 * Creates a new directory.
 * 
 * Endpoint: POST /api/directories/create
 * 
 * @param {object} req - The request object containing folder_name, parent_directory_id, and folder_path in JSON format.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
exports.createDirectory = async (req, res) => {
  try {
    // Extract directory name, parent directory ID, and directory path from the request body
    const { folder_name, parent_directory_id, folder_path } = req.body;
    let parentDirectoryID;

    // Checking the folder name and folder path
    const folder_path_arr = folder_path.split("/");
    const main_folder_name = folder_path_arr[folder_path_arr.length - 1];

    if(folder_name === main_folder_name) {
      if(!parent_directory_id || typeof parent_directory_id !== 'number' || parent_directory_id.length == 0){
        parentDirectoryID = null;
      } else {
        parentDirectoryID = parseInt(parent_directory_id);
      }
  
      const parentDirectoryStatus = await Directory.findOne({ where: {directory_id: parentDirectoryID} });

      // If directory with same exists then throw error
      const sameDirectoryCheck = await Directory.findAll({where: {directory_path: folder_path, directory_name: folder_name} });
      if(sameDirectoryCheck.length != 0){
        res.status(404).json({
          success: false,
          message: 'Cannot create same directory with same name.'
        });
      }

      if(parentDirectoryStatus || parentDirectoryID == null){
        // Create the new directory
        const newDirectory = await Directory.create({
          directory_name: folder_name,
          parent_directory_id: parentDirectoryID,
          directory_path: folder_path,
          user_id: req.user
        });
  
        // Respond with success message
        res.status(200).json({
          success: true,
          message: 'Directory created successfully',
          directory: newDirectory
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Parent directory not found'
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: "Folder Name in Folder Path does not match"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Retrieves directories associated with the authenticated user.
 * 
 * Endpoint: GET /api/directories/list
 * 
 * @param {object} req - The request object containing user ID.
 * @param {object} res - The response object.
 * @returns {object} List of directories or error message.
 */
exports.getUserDirectories = async (req, res) => {
  try {
    // Get user ID from the token
    const userId = req.user;

    // Find directories associated with the user
    const directories = await Directory.findAll({ where: { user_id: userId } });

    // If no directories found, respond with an error message
    if (!directories || directories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No directories found for the user'
      });
    }

    // Respond with the list of directories
    res.status(200).json({
      success: true,
      totalCount: directories.length,
      directories: directories
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
 * Retrieves files within a directory belonging to the authenticated user.
 * 
 * Endpoint: GET /api/directories/:directoryId/files
 * 
 * @param {object} req - The request object containing the directory ID in the URL parameters.
 * @param {object} res - The response object.
 * @returns {object} List of files within the directory or error details.
 */
exports.getFilesInDirectory = async (req, res) => {
  try {
    // Extract directory ID from URL parameters
    const directoryId = req.params.directoryId;

    // Verify user ID from the token
    const userId = req.user;

    let folder = 'No external folders.';

    // Check if the directory belongs to the user
    const directory = await Directory.findOne({ where: { directory_id: directoryId, user_id: userId } });
    if (!directory) {
      return res.status(404).json({
        success: false,
        message: 'Directory not found or does not belong to the user'
      });
    }

    // Find files within the directory
    const files = await File.findAll({ where: { directory_id: directoryId, user_id: userId, priority_version: true } });

    let totalCount = files.length;

    // Find Folders within the directory
    const folders = await Directory.findOne({ where: {directory_id: directoryId, user_id: userId} })
    
    if(folders && folders.parent_directory_id){
      folder = folders.directory_name;
      totalCount = files.length + 1;
    }

    // Respond with the list of files
    res.status(200).json({
      success: true,
      totalCount: totalCount,
      files: files,
      folders: folder
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
 * Moves a file or directory to a new destination directory.
 * 
 * Endpoint: PUT /api/directories/:directoryId/move
 * 
 * @param {object} req - The request object containing itemType, itemId, and destinationDirectoryId.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
exports.moveFileOrDirectory = async (req, res) => {
  try {
      // Extract data from the request body
      const { itemType, itemId, destinationDirectoryId } = req.body;

      // Find the item (file or directory) by its ID
      let item;
      if (itemType.toLowerCase() === 'file') {
          item = await File.findOne({ where: { file_id: itemId, user_id: req.user } });
      } else if (itemType.toLowerCase() === 'directory') {
          item = await Directory.findOne({ where: { directory_id: itemId, user_id: req.user } });
      } else {
        return res.status(400).json({ success: false, message: 'Invalid type. Must be "file" or "directory".' });
      }

      if (!item) {
          return res.status(404).json({
              success: false,
              message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} not found`
          });
      }

      if (itemType.toLowerCase() === 'file') {
        // Update the item's directory_id with the new destinationDirectoryId
        item.directory_id = destinationDirectoryId;
      } else if (itemType.toLowerCase() === 'directory'){
        // Update the directory's parent_directory_id with the new destinationDirectoryId
        item.parent_directory_id = destinationDirectoryId;
      }
      await item.save();

      // Respond with success message
      res.status(200).json({
          success: true,
          message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} moved successfully`
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};