require('dotenv').config();
const app = require('./app');
const db = require('./db/models');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test DB connection
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
