const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function auditATs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const totalATs = await AssessmentType.countDocuments();
    console.log(`Total AssessmentTypes: ${totalATs}`);

    const sample = await AssessmentType.find().limit(5).lean();
    console.log('Sample ATs:', JSON.stringify(sample, null, 2));

    const terms = await AssessmentType.distinct('term');
    console.log('Unique Terms in ATs:', terms);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

auditATs();
