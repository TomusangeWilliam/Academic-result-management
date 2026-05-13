const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkOrphanedGrades() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const grades = await Grade.find().distinct('student');
    console.log(`Unique student IDs in Grades: ${grades.length}`);

    const students = await Student.find().distinct('_id');
    const studentIdSet = new Set(students.map(id => id.toString()));

    let orphaned = 0;
    for (const gid of grades) {
        if (!studentIdSet.has(gid.toString())) {
            orphaned++;
        }
    }

    console.log(`Orphaned student IDs in Grades: ${orphaned}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrphanedGrades();
