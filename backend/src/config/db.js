const mongoose = require('mongoose');

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowboard';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: true
  });
}

module.exports = { connectToDatabase };


