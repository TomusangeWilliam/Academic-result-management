const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');
const Subject = require('./models/Subject');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function auditATSubjects() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const mathSubjects = await Subject.find({ name: 'Mathematics' });
    console.log(`Found ${mathSubjects.length} subjects named "Mathematics"`);

    for (const s of mathSubjects) {
        const atCount = await AssessmentType.countDocuments({ subject: s._id });
        console.log(`Subject ID ${s._id}: ${atCount} AssessmentTypes`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

auditATSubjects();
