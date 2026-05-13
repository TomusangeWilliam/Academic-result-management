const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function migrateATFields() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Rename 'semester' to 'term' for documents that still have 'semester'
    // Also update values to 'TERM 1 2026'
    const result = await AssessmentType.updateMany(
      { semester: { $exists: true } },
      [
        {
          $set: {
            term: {
              $switch: {
                branches: [
                  { case: { $eq: ['$semester', 'TERM 1'] }, then: 'TERM 1 2026' },
                  { case: { $eq: ['$semester', 'TERM 2'] }, then: 'TERM 2 2026' },
                  { case: { $eq: ['$semester', 'TERM 3'] }, then: 'TERM 3 2026' }
                ],
                default: '$semester'
              }
            }
          }
        },
        { $unset: 'semester' }
      ]
    );

    console.log(`Migrated ${result.modifiedCount} AssessmentTypes (Renamed 'semester' -> 'term' and updated values).`);

    // 2. Double check any that already have 'term' but wrong value
    const result2 = await AssessmentType.updateMany({ term: 'TERM 1' }, { term: 'TERM 1 2026' });
    const result3 = await AssessmentType.updateMany({ term: 'TERM 2' }, { term: 'TERM 2 2026' });
    const result4 = await AssessmentType.updateMany({ term: 'TERM 3' }, { term: 'TERM 3 2026' });
    
    console.log(`Updated additional ${result2.modifiedCount + result3.modifiedCount + result4.modifiedCount} records for naming consistency.`);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateATFields();
