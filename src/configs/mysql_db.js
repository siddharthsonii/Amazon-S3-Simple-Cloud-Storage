const { Sequelize, DataTypes } = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize("scs", process.env.MYSQL_USERNAME, process.env.MYSQL_PASSWORD, {
  host: "localhost",
  logging: false,
  dialect: "mysql",
  // logging: console.log
});

try {
  sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require("../models/usersModel")(sequelize, DataTypes);
db.file = require("../models/filesModel")(sequelize, DataTypes);
db.directory = require("../models/directoriesModel")(sequelize, DataTypes);
db.permission = require("../models/permissionsModel")(sequelize, DataTypes);
db.fileVersion = require("../models/fileVersionModel")(sequelize, DataTypes);
db.fileMetadata = require("../models/fileMetadataModel")(sequelize, DataTypes);

// Table's associations
db.file.belongsTo(db.user, { foreignKey: "user_id" });
db.file.belongsTo(db.directory, { foreignKey: "directory_id" });

db.directory.belongsTo(db.user, { foreignKey: "user_id" });

db.file.hasMany(db.permission, { foreignKey: 'file_id' });
db.user.hasMany(db.permission, { foreignKey: 'user_id' });

db.file.hasMany(db.fileVersion, { foreignKey: 'file_id' });
db.fileVersion.belongsTo(db.file, { foreignKey: 'file_id' });

db.file.hasMany(db.fileMetadata, { foreignKey: 'file_id' });
db.fileMetadata.belongsTo(db.file, { foreignKey: 'file_id' });

db.sequelize.sync({ force: false });
module.exports = db;
