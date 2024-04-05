module.exports = (sequelize, DataTypes) => {
  const FileMetadata = sequelize.define('File_Metadata', {
    metadata_id: {
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
    metadata_key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    metadata_value: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    timestamps: true,
    createdAt: false,
  });

  return FileMetadata;
};