const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkTerms() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const gradeTerms = await Grade.distinct('term');
    console.log('\nTerms found in Grades:', gradeTerms);

    const atTerms = await AssessmentType.distinct('term');
    console.log('Terms found in AssessmentTypes:', atTerms);

    const atYears = await AssessmentType.distinct('year');
    console.log('Years found in AssessmentTypes:', atYears);

    // Count grades per term
    for (const term of gradeTerms) {
        const count = await Grade.countDocuments({ term });
        console.log(`Grade count for term "${term}": ${count}`);
    }

    // Count ATs per term
    for (const term of atTerms) {
        const count = await AssessmentType.countDocuments({ term });
        console.log(`AssessmentType count for term "${term}": ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTerms();
