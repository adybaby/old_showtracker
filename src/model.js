const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema({
  id: {
    type: String,
    required: 'Id is required',
  },
  name: {
    type: String,
    required: 'Name is required',
  },
  Created_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('showtracker', schema);
