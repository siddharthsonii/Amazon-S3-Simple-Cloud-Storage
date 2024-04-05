var db = require("../configs/mysql_db");
const path = require("path");
var File = db.file; // Return the file model (Return Table Name i.e., files)
var Directory = db.directory; // Return the directory model (Return Table Name i.e., directories)
var filePermission = db.permission;
var FileVersion = db.fileVersion;
var FileMetadata = db.fileMetadata;
var User = db.user;

exports.uploadFile = async (req, res) => {
  try {
    // Extract file details from multer's req.file object
    const { folder_name, folder_path } = req.body;

    // Checing the folder name and folder path
    const folder_path_arr = folder_path.split("/");
    const main_folder_name = folder_path_arr[folder_path_arr.length - 1];

    if (folder_name !== main_folder_name) {
      return res.status(404).json({
        success: false,
        message: "Folder Name in Folder Path does not match"
      });
    }

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
      // const uploadsFolderPath = path.join(__dirname, '..', '..', 'uploads');
      const uploadsFolderPath = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        `user_${userId}`
      );
      const filePath = path.join(uploadsFolderPath, filename);
      // const filePath = `${uploadsFolderPath}\\${filename}`;

      // Check if a file with the same name already exists in the directory
      let existingFile = await File.findOne({
        where: { file_name: filename, directory_id: directory.directory_id }
      });

      if (existingFile) {
        // If a file with the same name exists, create a new version
        const versionNumber =
          (await FileVersion.max("version_number", {
            where: { file_id: existingFile.file_id }
          })) + 1 || 1;
        var newFilePath = filePath + "\\v" + versionNumber;
        // Create a new version of the file
        const newFileVersion = await FileVersion.create({
          file_id: existingFile.file_id,
          version_number: versionNumber,
          file_path: newFilePath,
          upload_date: new Date()
        });

        // If the file already exists, update its upload_date in File's Table
        existingFile.upload_date = new Date();
        await existingFile.save();

        // Store file data
        filesData.push({
          fileVersion: newFileVersion
        });
      } else {
        // Create the file entry in the database
        // If no file with the same name exists, upload as a new file
        const uploadedFile = await File.create({
          file_name: filename,
          directory_id: directory.directory_id,
          user_id: req.user,
          file_size: size,
          upload_date: new Date(),
          file_type: mimetype,
          is_deleted: false,
          file_path: filePath + "\\v1"
        });

        // Create the initial version of the file
        const initialFileVersion = await FileVersion.create({
          file_id: uploadedFile.file_id,
          version_number: 1,
          file_path: filePath + "\\v1",
          upload_date: new Date()
        });

        let file_permission = await filePermission.findOne({
          where: {
            file_id: uploadedFile.file_id,
            user_id: req.user
          }
        });

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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    // Retrieve fileId and user_id from request parameters
    const fileId = req.params.fileId;
    const userId = req.user;
    let requestedfile;

    // Find the file in the database by fileId and user_id
    const file = await File.findOne({
      where: { file_id: fileId, user_id: userId }
    });

    // If the file does not exist or does not belong to the user, return 404 Not Found
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

      const permissionType = permissionDetails.permission_type;
      const permissionEmail = permissionDetails.shared_with.split(", ");

      // Allow file download to Public or Shared Permission Holders
      // if((permissionType === "Public") || ((permissionType === 'Shared') && permissionEmail.includes(req.email))){
      if (
        permissionType !== "Public" &&
        (!permissionEmail || !permissionEmail.includes(req.email))
      ) {
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

    // Stream the file to the client for download
    res.download(realFilePath, file ? file.file_name : requestedfile.file_name);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.listFiles = async (req, res) => {
  try {
    // Retrieve user_id from the verified token
    const userId = req.user;

    // Find all files uploaded by the user
    const files = await File.findAll({ where: { user_id: userId } });

    // Respond with the list of files
    res.status(200).json({
      success: true,
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

// exports.searchFiles = async (req, res) => {
//   try {
//     // Retrieve user_id from the verified token
//     const userId = req.user;

//     // Extract search keyword from query parameters
//     const { keyword } = req.query;

//     // Find files matching the search keyword for the user
//     const files = await File.findAll({
//       where: {
//         user_id: userId,
//         [db.Sequelize.Op.or]: [
//           { file_name: { [db.Sequelize.Op.like]: `%${keyword}%` } }, // Search by filename
//         ]
//       },
//       include: [
//         {
//           model: FileMetadata,
//           where: {
//             metadata_value: { [db.Sequelize.Op.like]: `%${keyword}%` } // Search by metadata
//           }
//         }
//       ]
//     });

//     // Respond with the list of matching files
//     res.status(200).json({
//       success: true,
//       files: files
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// };

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
        file_name: { [db.Sequelize.Op.like]: `%${keyword}%` }
      }
    });
    console.log(filesByFilename);
    console.log("-----------------------------------");

    // Search for files matching the keyword in metadata
    const filesByMetadata = await FileMetadata.findAll({
      where: {
        metadata_value: { [db.Sequelize.Op.like]: `%${keyword}%` }
      },
      include: [{ model: File, as: "file", where: { user_id: userId } }]
    });
    console.log(filesByMetadata);

    // Map the metadataFiles to include both the File model and the metadata object
    const filesWithMetadata = filesByMetadata.map((metadata) => {
      return {
        // file: metadata.file,
        metadata: metadata // Include the metadata object itself
      };
    });

    // Combine the results from both searches
    // const matchingFiles = [...filesByFilename, ...filesByMetadata.map(metadata => metadata.file)];
    const matchingFiles = [...filesByFilename, ...filesWithMetadata];

    // Respond with the list of matching files
    res.status(200).json({
      success: true,
      files: matchingFiles
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// exports.setFilePermissions = async (req, res) => {
//   try {
//     const userId = req.user;
//     const fileId = req.params.fileId;
//     console.log(fileId);
//     console.log(userId)
//     // process.exit(1);

//     // Check if the user has permission to set permissions for the file (assuming you have some authorization logic)
//     // Only the owner of the file can set permissions
//     const file = await File.findOne({ where: { file_id: fileId, user_id: userId } });
//     // If the user does not have permission, return a 403 Forbidden response
//     if (!file) {
//       return res.status(403).json({ success: false, message: 'You do not have permission to set permissions for this file' });
//     }

//     // Extract user IDs and permission types from the request body
//     const { permission } = req.body;
//     // console.log('hy')
//     console.log(permission);
//     console.log(typeof permission)
//     // console.log(req);
//     // process.exit(1);

//     // Perform validation on permissions data (if needed)
//     if (!permission) {
//       return res.status(400).json({ success: false, message: 'Permissions data is missing or invalid' });
//     }

//     // Update permissions for the file in the database
//     // For simplicity, let's assume you have a function to update permissions in your database model
//     const success = await File.updatePermissions(fileId, permission); // Example function, adjust based on your actual implementation

//     if (success) {
//       // Permissions were successfully updated
//       res.status(200).json({
//         success: true,
//         message: 'File permissions updated successfully'
//       });
//     } else {
//       // Failed to update permissions
//       res.status(500).json({
//         success: false,
//         message: 'Failed to update file permissions'
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// };

exports.setFilePermissions = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { permission, shared_with_user } = req.body;

    let updatedPermissionStr = permission.charAt(0).toUpperCase() + permission.slice(1);
    
    // Update permissions for the file in the database
    var result = await updateFilePermissions(
      fileId,
      updatedPermissionStr,
      shared_with_user
    );

    // Respond with success message
    if (
      updatedPermissionStr === "Private" ||
      updatedPermissionStr === "Public"
    ) {
      res.status(200).json({
        success: true,
        message: "Permissions updated successfully"
      });
    } else {
      res.status(200).json({
        success: true,
        message: `Permissions updated successfully for these emails - ${result[0]}`,
        email_not_found: `Permission NOT updated for these emails - ${result[1]}`
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
// const updateFilePermissions = async (fileId, permission, shared_with_user) => {
//   const userEmails = shared_with_user;
//   const emailNotFound = [];
//   let result = "";
//   let no_result = "";

//   try {
//     if (permission === "Shared") {
//       // Find users matching the provided emails
//       const usersData = await User.findAll({
//         attributes: ["user_id", "email"],
//         where: {
//           email: {
//             [db.Sequelize.Op.in]: userEmails
//           }
//         }
//       });

//       // Iterate through the emails array
//       for (const email of userEmails) {
//         let emailExists = false;

//         // Check if the email exists in the usersData array
//         for (const userData of usersData) {
//           console.log(userData.email);
//           if (email === userData.email) {
//             emailExists = true;
//             break;
//           }
//         }

//         // If the email doesn't exist, remove it from the emails array and add it to emailNotFound
//         if (!emailExists) {
//           emailNotFound.push(email);
//           userEmails.splice(userEmails.indexOf(email), 1);
//         }
//       }

//       for (let i = 0; i < userEmails.length; i++) {
//         result += `${userEmails[i]}`;
//         if (i < userEmails.length - 1) {
//           result += ", ";
//         }
//       }

//       for (let i = 0; i < emailNotFound.length; i++) {
//         no_result += `${emailNotFound[i]}`;
//         if (i < emailNotFound.length - 1) {
//           no_result += ", ";
//         }
//       }

//       let existingPermission = await filePermission.findOne({
//         where: { file_id: fileId }
//       });
//       if (existingPermission) {
//         existingPermission.permission_type = permission;
//         existingPermission.shared_with = result;
//         await existingPermission.save();
//       }

//       console.log("File permissions updated successfully");
//       return [result, no_result];
//     } else if (permission === "Public" || permission === "Private") {
//       let existingPermission = await filePermission.findOne({
//         where: { file_id: fileId }
//       });
//       if (existingPermission) {
//         existingPermission.permission_type = permission;
//         existingPermission.shared_with = "";
//         await existingPermission.save();
//       }
//       console.log("File permissions updated successfully");
//     } else {
//       throw new Error(
//         "Error updating file permissions: Invalid permission given"
//       );
//     }
//   } catch (error) {
//     console.error("Error updating file permissions:", error);
//     // throw error;
//   }
// };

const updateFilePermissions = async (fileId, permission, shared_with_user) => {
  let result = "";
  let no_result = "";

  try {
    const userEmails = shared_with_user;
    const emailNotFound = [];

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

      const existingEmails = usersData.map(user => user.email);
      const missingEmails = userEmails.filter(email => !existingEmails.includes(email));

      // Remove missing emails from shared_with_user
      const result = existingEmails.join(", ");
      const no_result = missingEmails.join(", ");

      // Update file permissions
      await filePermission.update({
        permission_type: permission,
        shared_with: result
      }, {
        where: { file_id: fileId }
      });

      console.log("File permissions updated successfully");
      return [result, no_result];

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
    // throw error;
  }
};

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
        message: "No versions found for the specified file"
      });
    }

    // Respond with the array of file versions
    res.status(200).json({
      success: true,
      message: "File versions retrieved successfully",
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
        message: "File version not found"
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
        message: "File version not found"
      });
    }

    await File.update(
      { file_path: fileVersion.file_path },
      { where: { file_id: fileId } }
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

exports.addFileMetadata = async (req, res) => {
  try {
    const { fileId } = req.params;
    const metadata = req.body;

    // Validate request
    if (!metadata || typeof metadata !== "object") {
      return res
      .status(400)
      .json({ 
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

    // Respond with success message
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
