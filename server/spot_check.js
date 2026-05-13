const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');
const Subject = require('./models/Subject');
const Class = require('./models/Class');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function spotCheck() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const sampleGrade = await Grade.findOne({ term: 'TERM 1 2026' }).populate('subject').populate('student');
    if (sampleGrade) {
        console.log(`Grade Subject: ${sampleGrade.subject.name} (Class ID: ${sampleGrade.subject.class})`);
        console.log(`Student: ${sampleGrade.student.name} (Class ID: ${sampleGrade.student.class})`);
        
        const sClass = await Class.findById(sampleGrade.subject.class);
        const stClass = await Class.findById(sampleGrade.student.class);
        
        console.log(`Subject Class Name: ${sClass ? sClass.className : 'N/A'}`);
        console.log(`Student Class Name: ${stClass ? stClass.className : 'N/A'}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

spotCheck();
