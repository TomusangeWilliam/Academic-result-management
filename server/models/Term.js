const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Term name is required'],
        unique: true,
        trim: true
    },
    startDate: Date,
    endDate: Date,
    isActive: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Term', termSchema);
