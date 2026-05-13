const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function listATs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const masterId = '69faf102da2ea60b37b8bd7c';
    const ats = await AssessmentType.find({ subject: masterId, term: 'TERM 1 2026' });
    console.log(`Found ${ats.length} ATs for master Math:`);
    ats.forEach(a => {
        console.log(`- ${a.name} (${a.totalMarks} marks), Class: ${a.class}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listATs();
