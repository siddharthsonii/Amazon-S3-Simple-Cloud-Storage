module.exports = (sequelize, DataTypes) => {
  const FileVersion = sequelize.define('File_Version', {
    version_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    file_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'files',
        key: 'file_id'
      }
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    upload_date: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
      timestamps: true,
      createdAt: false,
  });

  return FileVersion;
};