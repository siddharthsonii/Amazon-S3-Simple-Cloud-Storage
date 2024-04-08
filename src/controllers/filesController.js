var db = require("../configs/mysql_db");
const path = require("path");
const fs = require('fs');
var File = db.file;
var Directory = db.directory;
var filePermission = db.permission;
var FileVersion = db.fileVersion;
var FileMetadata = db.fileMetadata;
var User = db.user;

/**
 * Uploads a file to the server.
 * 
 * Endpoint: POST /api/files/upload
 * 
 * @param {object} req - The request object containing file details.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
exports.uploadFile = async (req, res) => {
  try {
    // Extract file details from multer's req.file object
    const { folder_name, folder_path } = req.body;

    if((!folder_name || folder_name.trim().length == 0) || (!folder_path || folder_path.trim().length == 0)){
      return res.status(404).json({
        success: false,
        message: "Folder name or folder path is invalid"
      });
    }

    // Checing the folder name and folder path
    const folder_path_arr = folder_path.split("/");
    const main_folder_name = folder_path_arr[folder_path_arr.length - 1];
    
    if(folder_name === main_folder_name) {
      // Check if the directory exists, create if not
      let directory = await Directory.findOne({
        where: {
          directory_name: folder_name,
          directory_path: folder_path,
          user_id: req.user
        }
      });
      if (!directory) {
        directory = await Directory.create({
          directory_name: folder_name,
          directory_path: folder_path,
          user_id: req.user
        });
      }
  
      // Process each uploaded file
      const filesData = [];
      for (const file of req.files) {
        const { filename, size, mimetype } = file;
        const userId = req.user;
  
        // Construct the absolute path to the uploads folder
        const uploadsFolderPath = path.join(
          __dirname, "..", "..", "uploads", `user_${userId}`
        );
        const filePath = path.join(uploadsFolderPath, filename);

        //Find the index of the first hyphen 
        const firstHyphenIndex = filename.indexOf('-');
        const originalFilename = filename.substring(firstHyphenIndex + 1);
  
        // Check if a file with the same name already exists in the directory
        let existingFile = await File.findOne({
          where: { file_name: originalFilename, directory_id: directory.directory_id, user_id: userId }
        });

        if (existingFile && existingFile.length != 0) {
          // If a file with the same name exists, create a new version
          const versionNumber =
            (await FileVersion.max("version_number", {
              where: { file_id: existingFile.file_id }
            })) + 1 || 1;
          var newFilePath = filePath + "\\v" + versionNumber;

          // Upload the same file at same directory with new version
          const uploadedFile = await File.create({
            system_generated_file_name: filename,
            file_name: originalFilename,
            directory_id: directory.directory_id,
            user_id: req.user,
            file_size: size,
            upload_date: new Date(),
            file_type: mimetype,
            priority_version: true,
            file_path: newFilePath
          });

          await File.update(
            { priority_version: false, updatedAt: new Date() },
            { where: { file_id: existingFile.file_id }, 
            // logging: console.log 
          }
          );
  
          // Create a new version of the file
          const newFileVersion = await FileVersion.create({
            file_id: existingFile.file_id,
            version_number: versionNumber,
            file_path: newFilePath,
            upload_date: new Date()
          });

          // Check if a file permission already exists in the permission table
          let file_permission = await filePermission.findOne({
            where: {
              file_id: uploadedFile.file_id,
              user_id: req.user
            }
          });
  
          // Give private permission to the file
          if (!file_permission) {
            file_permission = await filePermission.create({
              file_id: uploadedFile.file_id,
              user_id: req.user
            });
          }

          // Store file data
          filesData.push({
            file: uploadedFile,
            fileVersion: newFileVersion
            // data_url: `http://localhost:3000/uploaded-file/${filename}`
          });
        } else {
          // If no file with the same name exists, upload as a new file
          const uploadedFile = await File.create({
            system_generated_file_name: filename,
            file_name: originalFilename,
            directory_id: directory.directory_id,
            user_id: req.user,
            file_size: size,
            upload_date: new Date(),
            file_type: mimetype,
            priority_version: true,
            file_path: filePath + "\\v1"
          });
  
          // Create the initial version of the file
          const initialFileVersion = await FileVersion.create({
            file_id: uploadedFile.file_id,
            version_number: 1,
            file_path: filePath + "\\v1",
            upload_date: new Date()
          });
  
          // Check if a file permission already exists in the permission table
          let file_permission = await filePermission.findOne({
            where: {
              file_id: uploadedFile.file_id,
              user_id: req.user
            }
          });
  
          // Give private permission to the file
          if (!file_permission) {
            file_permission = await filePermission.create({
              file_id: uploadedFile.file_id,
              user_id: req.user
            });
          }
  
          // Store file data
          filesData.push({
            file: uploadedFile,
            fileVersion: initialFileVersion
            // data_url: `http://localhost:3000/uploaded-file/${filename}`
          });
        }
      }
  
      // Respond with success message
      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        file: filesData
        // data_url: `http://localhost:3000/uploaded-file/${req.file.filename}`
      });
  
      console.log("File Uploaded Successfully");
    } else {
      for (const file of req.files) {
        const { filename } = file;
        const userUploadsFolder = `uploads/user_${req.user}/${filename}`;
        fs.unlink(userUploadsFolder, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
            return;
          }
        });
      }
      return res.status(404).json({
        success: false,
        message: "Folder name in folder path does not match"
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Downloads a file for the user.
 * 
 * Endpoint: GET /api/files/download/:fileId
 * 
 * @param {object} req - The request object containing the file ID and user details.
 * @param {object} res - The response object.
 * @returns {object} File download or error message.
 */
exports.downloadFile = async (req, res) => {
  try {
    // Retrieve fileId and user_id from request parameters
    const fileId = req.params.fileId;
    const userId = req.user;
    let requestedfile;

    // Find the file in the database by fileId and user_id (For current user)
    const file = await File.findOne({
      where: { file_id: fileId, user_id: userId }
    });

    // If the file does not exist or does not belong to the user
    if (!file) {
      // Find file by fileId
      requestedfile = await File.findOne({
        where: { file_id: fileId }
      });

      // Find Permission to the requested file
      const permissionDetails = await filePermission.findOne({
        attributes: ["permission_type", "shared_with"],
        where: { file_id: fileId }
      });

      if(!permissionDetails || typeof permissionDetails == null){
        return res.status(404).json({
          success: false,
          message:
            "File not found or user don't have permission to view this file"
        });
      }
      const permissionType = permissionDetails.permission_type;
      const permissionEmail = permissionDetails.shared_with.split(", ");

      // Allow file download to Public or Shared Permission Holders
      if (permissionType !== "Public" && (!permissionEmail || !permissionEmail.includes(req.email))) {
        return res.status(404).json({
          success: false,
          message:
            "File not found or user don't have permission to view this file"
        });
      }
    }

    // Construct the file path
    const filePath = file ? file.file_path : requestedfile.file_path;

    // Find the index of the last backslash
    const lastIndex = filePath.lastIndexOf("\\");

    // Extract the substring before the last backslash
    const realFilePath = filePath.substring(0, lastIndex);

    if(file) {
      file.download_count = file.download_count + 1;
      await file.save();
    }

    // Stream the file to the client for download
    res.download(realFilePath, file ? file.system_generated_file_name : requestedfile.file_name);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Retrieves a list of files uploaded by the user.
 * 
 * Endpoint: GET /api/files/list
 * 
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} List of files or error message.
 */
exports.listFiles = async (req, res) => {
  try {
    // Retrieve user_id from the verified token
    const userId = req.user;

    // Find all files uploaded by the user
    const files = await File.findAll({ where: { user_id: userId , priority_version: true} });

    if(!files) {
      return res.status(404).json({
        success: false,
        message: "Files not found"
      });
    }

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
      message: "Internal server error"
    });
  }
};

/**
 * Searches for files matching a keyword in filenames and metadata.
 * 
 * Endpoint: GET /api/files/search
 * 
 * @param {object} req - The request query parameter for search keyword.
 * @param {object} res - The response object.
 * @returns {object} List of matching files or error details.
 */
exports.searchFiles = async (req, res) => {
  try {
    // Retrieve user_id from the verified token
    const userId = req.user;

    // Extract search keyword from query parameters
    const { keyword } = req.query;

    // Search for files matching the keyword in filenames
    const filesByFilename = await File.findAll({
      where: {
        user_id: userId,
        priority_version: true,
        file_name: { [db.Sequelize.Op.like]: `%${keyword}%` }
      }
    });

    // Search for files matching the keyword in metadata
    const filesByMetadata = await FileMetadata.findAll({
      where: {
        metadata_value: { [db.Sequelize.Op.like]: `%${keyword}%` }
      },
      include: [{ model: File, as: "file", where: { user_id: userId, priority_version: true } }]
    });

    // Map the metadataFiles to include both the File model and the metadata object
    const filesWithMetadata = filesByMetadata.map((metadata) => {
      return {
        metadata: metadata // Include the metadata object itself
      };
    });

    // Combine the results from both searches
    const matchingFiles = [...filesByFilename, ...filesWithMetadata];

    if(matchingFiles.length == 0){
      res.status(404).json({
        success: false,
        message: 'No files found with the matching name'
      });
    } else {
      // Respond with the list of matching files
      res.status(200).json({
        success: true,
        totalCount: matchingFiles.length,
        files: matchingFiles
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Sets permissions for a specific file.
 * 
 * Endpoint: POST /api/files/:fileId/permissions
 * 
 * @param {object} req - The request object containing fileId in params and permission and shared_with_user in body.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
exports.setFilePermissions = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { permission, shared_with_user } = req.body;
    const currentUserEmail = req.email;

    let updatedPermissionStr = permission.charAt(0).toUpperCase() + permission.slice(1);

    if((!shared_with_user || shared_with_user.length == 0) || updatedPermissionStr.trim().length == 0){
      res.status(400).json({
        success: false,
        message: 'Incorrect body or field missing'
      });
    }

    let fileExistance = await File.findOne({where : { user_id: req.user, file_id: fileId }});
    if(!fileExistance || typeof fileExistance == null){
      res.status(404).json({
        status: false,
        message: "No file found with the provided fileId or file don't belongs to the user"
      });
    }
    
    // Update permissions for the file in the database
    var result = await updateFilePermissions(fileId, updatedPermissionStr, shared_with_user, currentUserEmail);

    if(result && result[0].length == 0 && result[1].length == 0){
      res.status(200).json({
        success: true,
        message: `Permissions updated successfully updated`
      });
    }

    // Respond with success message
    if (updatedPermissionStr === "Private" || updatedPermissionStr === "Public") {
      res.status(200).json({
        success: true,
        message: "Permissions updated successfully"
      });
    } else {
      res.status(200).json({
        success: true,
        message: `Permissions updated successfully for these emails - ${result[0]}`,
        email_not_found: `Permission not updated for these emails - ${result[1]}`
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Function to update permission for the file
const updateFilePermissions = async (fileId, permission, shared_with_user, currentUserEmail) => {
  try {
    const userEmails = shared_with_user;

    if (permission === "Shared") {
      // Find users matching the provided emails
      const usersData = await User.findAll({
        attributes: ["user_id", "email"],
        where: {
          email: {
            [db.Sequelize.Op.in]: userEmails
          }
        }
      });

      if(!usersData || usersData.length == 0){
        throw new Error(
          "No user found with the provided email address in the database"
        );
      }

      const existingEmails = usersData.map(user => user.email);
      const missingEmails = userEmails.filter(email => !existingEmails.includes(email));

      // Remove missing emails from shared_with_user
      const result = existingEmails.join(", ");
      const no_result = missingEmails.join(", ");

      // Remove email of current user if found
      emailString = result.replace(currentUserEmail + ", ", "");

      if(currentUserEmail.trim() == result.trim()){
        permission = "Private",
        emailString = "";
      }

      // Update file permissions
      await filePermission.update({
        permission_type: permission,
        shared_with: emailString
      }, {
        where: { file_id: fileId }
      });

      console.log("File permissions updated successfully");
      return [emailString, no_result];

    } else if (permission === "Public" || permission === "Private") {
      // Update file permissions
      await filePermission.update({
        permission_type: permission,
        shared_with: ""
      }, {
        where: { file_id: fileId }
      });
      console.log("File permissions updated successfully");

    } else {
      throw new Error(
        "Error updating file permissions: Invalid permission given"
      );
    }
  } catch (error) {
    console.error("Error updating file permissions:", error);
  }
};

/**
 * Retrieves all versions of a file from the database.
 * 
 * Endpoint: GET /api/files/:fileId/versions
 * 
 * @param {object} req - The request object containing the file ID parameter.
 * @param {object} res - The response object.
 * @returns {object} Array of file versions or error message.
 */
exports.getAllFileVersion = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Retrieve all versions of the file from the database
    const fileVersions = await FileVersion.findAll({
      where: { file_id: fileId },
      attributes: ["version_id", "version_number", "file_path", "upload_date"],
      order: [["upload_date", "DESC"]] // Order by upload date in descending order
    });

    if (!fileVersions || fileVersions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No versions found for the specified file or file not found"
      });
    }

    // Respond with the array of file versions
    res.status(200).json({
      success: true,
      message: "File versions retrieved successfully",
      totalCount: fileVersions.length,
      fileVersions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Retrieves a specific file version by fileId and versionId.
 * 
 * Endpoint: GET /api/files/:fileId/versions/:versionId
 * 
 * @param {object} req - The request object containing parameters fileId and versionId.
 * @param {object} res - The response object.
 * @returns {object} File version object or error message.
 */
exports.getFileVersion = async (req, res) => {
  try {
    const { fileId, versionId } = req.params;

    // Find the file version in the database by fileId and versionId
    const fileVersion = await FileVersion.findOne({
      where: { file_id: fileId, version_id: versionId }
    });

    // If the file version is not found, return a 404 Not Found response
    if (!fileVersion) {
      return res.status(404).json({
        success: false,
        message: "File version or file not found"
      });
    }

    // Respond with the file version object
    res.status(200).json({
      success: true,
      fileVersion
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Restores a file version.
 * 
 * Endpoint: PUT /api/files/:fileId/versions/:versionId/restore
 * 
 * @param {object} req - The request object containing parameters fileId and versionId.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
exports.restoreFileVersion = async (req, res) => {
  try {
    const { fileId, versionId } = req.params;

    // Find the file version in the database by fileId and versionId
    const fileVersion = await FileVersion.findOne({
      where: { file_id: fileId, version_id: versionId }
    });

    // If the file version is not found, return a 404 Not Found response
    if (!fileVersion) {
      return res.status(404).json({
        success: false,
        message: "File version or file not found "
      });
    }

    const fileDetail = await File.findOne({
      where: { file_id: fileId, user_id: req.user },
      attributes: ['file_name', 'file_path', 'directory_id']
    });

    const lastIndex = (fileDetail.file_path).lastIndexOf("\\");
    const realFilePath = fileDetail.file_path.substring(0, lastIndex);
    const replacedPath = realFilePath.replace(/\\/g, '\\\\');

    const files = await File.findAll({
      where: {
        file_name: fileDetail.file_name,
        directory_id: fileDetail.directory_id,
        user_id: req.user
      }, 
    });

    const goalFileVersion = await File.findOne({
      where: {
        file_path: fileVersion.file_path,
        user_id: req.user
      },
      attributes: ['file_id']
    });

    let allExistingFileIds = files.map(fileIds => fileIds.file_id);

    const index = allExistingFileIds.indexOf(goalFileVersion.file_id);
    allExistingFileIds.splice(index, 1);

    await File.update(
      { priority_version: false },
      { where: { file_id: allExistingFileIds }, 
    }
    );

    await File.update(
      { priority_version: true },
      { where: { file_id: goalFileVersion.file_id, user_id: req.user } }
    );

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "File version restored successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Adds metadata to a file.
 * 
 * Endpoint: POST /api/files/:fileId/metadata
 * 
 * @param {object} req - The request object containing fileId in params and metadata in JSON format in body.
 * @param {object} res - The response object.
 * @returns {object} Success message and added metadata or error details.
 */
exports.addFileMetadata = async (req, res) => {
  try {
    const { fileId } = req.params;
    const metadata = req.body;

    // Validate request
    if (!metadata || typeof metadata !== "object") {
      return res.status(400).json({ 
        success: false, 
        message: "Metadata should be a JSON object." 
      });
    }

    // Add metadata to the file
    const addedMetadata = [];
    for (const [key, value] of Object.entries(metadata)) {
      const newMetadata = await FileMetadata.create({
        file_id: fileId,
        metadata_key: key,
        metadata_value: value
      });
      addedMetadata.push(newMetadata);
    }

    res.status(200).json({
      success: true,
      message: "Metadata added successfully",
      addedMetadata
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Retrieves usage analytics data for the authenticated user.
 * 
 * Endpoint: GET /api/files/usage-analytics
 * 
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Usage analytics data including total storage used, file types, and file download frequency.
 */
exports.getUsageAnalytics = async (req, res) => {
  try {
    const userId = req.user;

    // Retrieve usage analytics data for the authenticated user
    const totalStorageUsed = await File.sum('file_size', { where: { user_id: userId } });

    // Retrieve type of files
    const fileTypesData = await File.findAll({
      attributes: ['file_type', [db.Sequelize.fn('COUNT', 'file_type'), 'count']],
      where: { user_id: userId, priority_version: true },
      group: ['file_type']
    });

    const fileTypes = {};
    fileTypesData.forEach(fileType => {
      fileTypes[fileType.file_type] = fileType.dataValues.count;
    });

    const fileAccessFrequencyData = await File.findAll({
      attributes: ['file_name', 'download_count'],
      where: { user_id: userId, priority_version: true },
    });

    const fileAccessFrequency = {};
    fileAccessFrequencyData.forEach(fileType => {
      fileAccessFrequency[fileType.file_name] = fileType.dataValues.download_count;
    });

    let total_data_size;
    // Convert to megabytes if total storage used is less than 1 GB
    if (totalStorageUsed < 1024 * 1024 * 1024) {
      total_data_size = `${(totalStorageUsed / (1024 * 1024)).toFixed(2)} MB`;
    } else {
        // Convert to gigabytes
        total_data_size = `${(totalStorageUsed / (1024 * 1024 * 1024)).toFixed(2)} MB`;
    }

    const usageAnalytics = {
      total_storage_used: total_data_size,
      file_types: fileTypes,
      file_download_frequency: fileAccessFrequency
    };

    res.status(200).json(usageAnalytics);
  } catch (error) {
    console.error('Error retrieving usage analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Deletes files or directories based on the provided type and IDs.
 * 
 * Endpoint: DELETE /api/files/delete
 * 
 * @param {object} req - The request object containing the type ('file' or 'directory') and IDs of files or directories to delete.
 * @param {object} res - The response object.
 * @returns {object} Success message or error details.
 */
exports.deleteFilesOrDirectories = async (req, res) => {
  try {
      const { type, ids } = req.body;
      let allFilesData;

      if (!type || !ids || !Array.isArray(ids)) {
          return res.status(400).json({ success: false, message: 'Invalid request body.' });
      }

      if (type.trim().toLowerCase() === 'file') {
        allFilesData = await File.findAll({ attributes: ["file_id", "file_name", "file_path"], where: {'file_id': ids} });

        if(allFilesData.length != 0){
          // Delete multiple files
          await File.destroy({ where: { file_id: ids } });
          await FileMetadata.destroy({ where: { file_id: ids } });
          await filePermission.destroy({ where: { file_id: ids } });
          await FileVersion.destroy({ where: { file_id: ids } });
          console.log("All files are deleted");
        } else {
          return res.status(404).json({ success: false, message: 'No files found.' });
        }
      } else if (type.trim().toLowerCase() === 'directory') {
        // Check whether directory exists or not
        directoryStatus = await Directory.findAll({ where: {directory_id: ids} });
        const parentDirectoryIdsArray = directoryStatus.map(directory => directory.parent_directory_id);
        const mergedIdsArray = [...ids, ...parentDirectoryIdsArray];

        // List of all files stored on the given directory IDs
        allFilesData = await File.findAll({ attributes: ["file_id", "file_name", "file_path"], where: { user_id: req.user, directory_id: mergedIdsArray }});

        if(directoryStatus.length != 0){
          // Delete multiple files in that directory and then delete directory
          const fileIdsArray = allFilesData.map(file => file.file_id);
          await File.destroy({ where: { file_id: fileIdsArray } });
          await FileMetadata.destroy({ where: { file_id: fileIdsArray } });
          await filePermission.destroy({ where: { file_id: fileIdsArray } });
          await FileVersion.destroy({ where: { file_id: fileIdsArray } });
          await Directory.destroy({ where: { directory_id: ids } });
          console.log("All Directories and their files are deleted.");
        } else {
          return res.status(404).json({ success: false, message: 'No directory found.' });
        }
      } else {
          return res.status(400).json({ success: false, message: 'Invalid type. Must be "file" or "directory".' });
      }
      const allFilesPath = allFilesData.map(file => file.file_path);
      
      // Assuming ids is an array containing the IDs of the files and directories to delete
      for (const path of allFilesPath) {
        // Construct the file path in the uploads folder
        const lastIndex = path.lastIndexOf("\\");
        const realFilePath = path.substring(0, lastIndex);

        // Check if the path exists
        if (fs.existsSync(realFilePath)) {
            const stats = fs.statSync(realFilePath);
            if (stats.isFile()) {
                // Delete the file
                fs.unlinkSync(realFilePath);
                console.log(`File ${realFilePath} deleted successfully.`);
            }
        }
      }

      return res.status(200).json({ success: true, message: 'Files or directories deleted successfully.' });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};