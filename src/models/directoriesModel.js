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
        allowNull: true, // Nullable as the root directory won't have a parent
        references: {
          model: 'directories', // Referencing the same model
          key: 'directory_id' // Referencing the primary key of the Directory model
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
      createdAt: false,
      // updatedAt: 'updateTimestamp'
    }
  );

  // Define associations
  Directory.hasMany(Directory, { as: 'subDirectories', foreignKey: 'parent_directory_id' });
  Directory.belongsTo(Directory, { as: 'parentDirectory', foreignKey: 'parent_directory_id' });

  // `sequelize.define` also returns the model
  // console.log(Directory === sequelize.models.Directory); // true

  return Directory;
};