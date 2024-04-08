module.exports = (sequelize, DataTypes) => {
  const FilePermissions = sequelize.define('File_Permission', {
    permission_id: {
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    permission_type: {
      type: DataTypes.ENUM('Private', 'Public', 'Shared'),
      allowNull: false,
      defaultValue: 'Private'
    },
    shared_with: {
      type: DataTypes.STRING,
      defaultValue: ''
    }
  },{
    // Define unique constraint for combination of file_id and user_id
    indexes: [
      {
        unique: true,
        fields: ['file_id', 'user_id', 'shared_with']
      }
    ],
    timestamps: true
  });

  return FilePermissions;
};