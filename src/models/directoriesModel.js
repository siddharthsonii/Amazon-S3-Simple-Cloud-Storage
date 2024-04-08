module.exports = (sequelize, DataTypes) => {
  const Directory = sequelize.define(
    "directories",
    {
      directory_id: {
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
      parent_directory_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'directories',
          key: 'directory_id'
        }
      },
      directory_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Directory name is required'
          }
        }
      },
      directory_path: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Directory path is required'
          }
        }
      }
    },
    {
      timestamps: true,
      createdAt: false
    }
  );

  // Define associations
  Directory.hasMany(Directory, { as: 'subDirectories', foreignKey: 'parent_directory_id' });
  Directory.belongsTo(Directory, { as: 'parentDirectory', foreignKey: 'parent_directory_id' });

  return Directory;
};