const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkATUsageSpecific() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const masterId = '69faf102da2ea60b37b8bd7c';
    const ats = await AssessmentType.find({ subject: masterId, term: 'TERM 1 2026' });

    console.log(`\nUsage report for master Math (TERM 1 2026 only):`);
    for (const a of ats) {
        const count = await Grade.countDocuments({ 
            term: 'TERM 1 2026',
            'assessments.assessmentType': a._id 
        });
        console.log(`- ${a.name} (${a.totalMarks} marks): used in ${count} grade documents`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkATUsageSpecific();
