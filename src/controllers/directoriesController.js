var db = require("../configs/mysql_db");
var File = db.file;
var Directory = db.directory;

exports.createDirectory = async (req, res) => {
  try {
    // Extract directory name, parent directory ID, and directory path from the request body
    const { folder_name, parent_directory_id, folder_path } = req.body;

    // Create the new directory
    const newDirectory = await Directory.create({
      directory_name: folder_name,
      // parent_directory_id: parent_directory_id,
      directory_path: folder_path,
      user_id: req.user // Assuming you have a user ID in the request object after token verification
    });

    // Respond with success message
    res.status(200).json({
      success: true,
      message: 'Directory created successfully',
      directory: newDirectory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getUserDirectories = async (req, res) => {
  try {
    // Get user ID from the token
    const userId = req.user;
    console.log(userId)

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

exports.getFilesInDirectory = async (req, res) => {
  try {
    // Extract directory ID from URL parameters
    const directoryId = req.params.directoryId;

    // Verify user ID from the token
    const userId = req.user;

    // Check if the directory belongs to the user
    const directory = await Directory.findOne({ where: { directory_id: directoryId, user_id: userId } });
    if (!directory) {
      return res.status(404).json({
        success: false,
        message: 'Directory not found or does not belong to the user'
      });
    }

    // Find files within the directory
    const files = await File.findAll({ where: { directory_id: directoryId, user_id: userId } });

    // Respond with the list of files
    res.status(200).json({
      success: true,
      totalCount: files.length,
      files: files
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

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
      }
      console.log(item);
      // process.exit(1);
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