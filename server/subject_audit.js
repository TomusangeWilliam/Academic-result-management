const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Subject = require('./models/Subject');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function subjectAudit() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const mathSubjects = await Subject.find({ name: 'Mathematics' });
    console.log(`Found ${mathSubjects.length} subjects named "Mathematics"`);

    for (const s of mathSubjects) {
        const gradeCount = await Grade.countDocuments({ subject: s._id });
        console.log(`Subject ID ${s._id}: ${gradeCount} grades`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

subjectAudit();
