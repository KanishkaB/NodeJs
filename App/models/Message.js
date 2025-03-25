const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    user: {
        name: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema); 