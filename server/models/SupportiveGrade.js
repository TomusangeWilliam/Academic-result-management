const mongoose = require('mongoose');

const supportiveGradeSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportiveSubject',
        required: true
    },
    academicYear: {
        type: String,
        required: true
    },
    term: {
        type: String,
        enum: ["TERM 1 2026", "TERM 2 2026"],
        required: true
    },
    score: {
        type: String, // Stores "A", "B", "VG", "E"
        required: true
    }
}, { timestamps: true });

// Ensure a student gets only one grade per subject per term
supportiveGradeSchema.index({ student: 1, subject: 1, term: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('SupportiveGrade', supportiveGradeSchema);