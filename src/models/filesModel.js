module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    "file",
    {
      file_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: "user_id"
        }
      },
      directory_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'directories',
          key: "directory_id"
        }
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'File name is required'
          }
        }
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'File path is required'
          }
        }
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'File size is required'
          }
        }
      },
      upload_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      file_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'File type is required'
          }
        }
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      timestamps: true,
      createdAt: false,
      // updatedAt: 'updateTimestamp'
    }
  );

  // `sequelize.define` also returns the model
  // console.log(File === sequelize.models.File); // true

  // File.updatePermissions = async (fileId, permission) => {
  //   try {
  //     console.log('yes');
  //     const Permission = require('../models/permissionsModel'); // Assuming you have defined the Permission model
  //     console.log(Permission);
  //     process.exit(1);

  //     // Check if permissions exist for the fileId
  //     const existingPermissions = await Permission.findOne({ where: { file_id: fileId } });

  //     if (existingPermissions) {
  //       // If permissions exist, update them
  //       await Permission.update(permission, { where: { file_id: fileId } });
  //     } else {
  //       // If permissions don't exist, create new permissions
  //       await Permission.create({ file_id: fileId, ...permission });
  //     }

  //     return true; // Return true indicating success
  //   } catch (error) {
  //     console.error(error);
  //     return false; // Return false indicating failure
  //   }
  // };

  return File;
};