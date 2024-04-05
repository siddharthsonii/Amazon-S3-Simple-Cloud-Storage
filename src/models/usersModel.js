module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "user",
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Username is required'
          },
          len: {
            args: [3, 255],
            msg: 'Username must be between 3 and 255 characters'
          }
        }
      },
      email:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Email is required'
          },
          isEmail: {
            msg: 'Please provide a valid email address'
          }
        },
        unique: true
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Password hash is required'
          }
        }
      },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
        // defaultValue: sequelize.literal('NOW()'),
      }
    },
    {
      timestamps: true,
      createdAt: false,
      // updatedAt: 'updateTimestamp'
    }
  );

  // `sequelize.define` also returns the model
  // console.log(User === sequelize.models.User); // true

  return User;
};