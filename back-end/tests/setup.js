const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to the in-memory database before running tests.
 */
const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Disconnect any existing connections first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
};

/**
 * Drop the database, close the connection, and stop the server.
 */
const closeDatabase = async () => {
  if (mongoServer) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
};

/**
 * Remove all data from all collections (for test isolation).
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  connect,
  closeDatabase,
  clearDatabase
};
