const mongoose = require('mongoose');

const globalConfigSchema = new mongoose.Schema({
    currentAcademicYear: {
        type: String,
        default: '2026'
    },
    currentTerm: {
        type: String,
        default: "TERM 1 2026"
    },
    schoolName: {
        type: String,
        default: 'My School'
    }
}, { timestamps: true });

module.exports = mongoose.model('GlobalConfig', globalConfigSchema);
