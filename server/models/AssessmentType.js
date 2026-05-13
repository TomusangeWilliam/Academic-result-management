// backend/models/AssessmentType.js
const mongoose = require('mongoose');

const MONTHS = [
    "September", "October", "November", "December", 
    "January", "February", "March", "April", "May", "June"
];

const assessmentTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    totalMarks: {
        type: Number,
        required: true,
        min: 1
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    month: {
        type: String,
        required: [true, 'Please specify the month for this assessment'],
        enum: MONTHS
    },
    term: {
        type: String,
        required: [true, 'Please specify the term for this assessment']
    },
    year: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

assessmentTypeSchema.index(
    { name: 1, subject: 1, class: 1, term: 1, month: 1 },
    { unique: true }
);

module.exports = mongoose.model('AssessmentType', assessmentTypeSchema);