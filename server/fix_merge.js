const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');
const Subject = require('./models/Subject');
const Class = require('./models/Class');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function fixSubjectMerge() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Find all subjects
    const subjects = await Subject.find().populate('class');
    const uniqueNames = [...new Set(subjects.map(s => s.name))];
    const classes = await Class.find();

    for (const name of uniqueNames) {
        for (const cls of classes) {
            let subjectForClass = await Subject.findOne({ name, class: cls._id });
            if (!subjectForClass) {
                console.log(`- Creating missing "${name}" for ${cls.className}`);
                subjectForClass = await Subject.create({
                    name,
                    code: name.substring(0, 3).toUpperCase(),
                    class: cls._id,
                    sessionsPerWeek: 5
                });
            }
        }
    }

    console.log('\nRunning refined grade redistribution...');
    const allGrades = await Grade.find().populate('subject').populate('student');
    let moved = 0;

    for (const g of allGrades) {
        if (!g.subject || !g.student) continue;

        const sClassId = g.subject.class?.toString();
        const stClassId = g.student.class?.toString();

        if (sClassId !== stClassId) {
            const correctSubject = await Subject.findOne({ 
                name: g.subject.name, 
                class: g.student.class 
            });

            if (correctSubject) {
                g.subject = correctSubject._id;
                await g.save();
                moved++;
            }
        }
    }

    console.log(`\n✅ Success! Moved ${moved} grades back to their correct class-specific subjects.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixSubjectMerge();
