const mongoose = require('mongoose');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function auditStudents() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const total = await Student.countDocuments();
    console.log(`Total students in DB: ${total}`);

    const statuses = await Student.distinct('status');
    console.log('Statuses found:', statuses);

    for (const s of statuses) {
        const count = await Student.countDocuments({ status: s });
        console.log(`Count for status "${s}": ${count}`);
    }

    const noClass = await Student.countDocuments({ class: { $exists: false } });
    console.log(`Students with no class: ${noClass}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

auditStudents();
