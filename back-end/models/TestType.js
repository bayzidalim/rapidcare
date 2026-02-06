const mongoose = require('mongoose');

const testTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  category: String
}, {
  timestamps: true
});

const TestType = mongoose.model('TestType', testTypeSchema);

module.exports = TestType;
