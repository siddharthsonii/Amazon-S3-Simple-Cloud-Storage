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
      priority_version: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      download_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    },
    {
      timestamps: true,
      createdAt: false
    }
  );

  return File;
};