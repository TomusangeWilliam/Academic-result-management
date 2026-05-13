const mongoose = require('mongoose');
const Student = require('./models/Student');
const Class = require('./models/Class');
const Stream = require('./models/Stream');
const Grade = require('./models/Grade');
const Subject = require('./models/Subject');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function investigateP7S() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Find the class and stream
    const classDoc = await Class.findOne({ className: /P\.?7/i });
    if (!classDoc) {
        console.log('Class P7 not found.');
        process.exit(0);
    }
    console.log(`Found Class: ${classDoc.className} (${classDoc._id})`);

    const streamDoc = await Stream.findOne({ streamName: /S/i, class: classDoc._id });
    if (streamDoc) {
        console.log(`Found Stream: ${streamDoc.streamName} (${streamDoc._id})`);
    }

    // 2. Count students
    const query = { class: classDoc._id };
    if (streamDoc) query.stream = streamDoc._id;
    const students = await Student.find(query);
    console.log(`Total students in this group: ${students.length}`);

    // 3. Sample a subject's grades
    const sampleGrade = await Grade.findOne({ term: 'TERM 1 2026' }).populate('subject');
    if (sampleGrade) {
        const subjectId = sampleGrade.subject._id;
        const subjectName = sampleGrade.subject.name;
        console.log(`\nAnalyzing Subject: ${subjectName}`);
        
        const grades = await Grade.find({ 
            subject: subjectId, 
            term: 'TERM 1 2026',
            student: { $in: students.map(s => s._id) }
        });
        console.log(`Total grades found for this subject: ${grades.length}`);

        // Check for duplicates
        const studentIds = grades.map(g => g.student.toString());
        const uniqueStudentIds = new Set(studentIds);
        console.log(`Unique students with grades: ${uniqueStudentIds.size}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

investigateP7S();
