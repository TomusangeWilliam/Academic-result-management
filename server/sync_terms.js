const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function syncTerms() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Update AssessmentTypes to use TERM 1 2026 instead of Term 1
    const atResult = await AssessmentType.updateMany(
        { term: 'Term 1' },
        { $set: { term: 'TERM 1 2026' } }
    );
    console.log(`Updated ${atResult.modifiedCount} AssessmentTypes from "Term 1" to "TERM 1 2026".`);

    // 2. Do the same for other potential mismatches
    await AssessmentType.updateMany({ term: 'Term 2' }, { $set: { term: 'TERM 2 2026' } });
    await AssessmentType.updateMany({ term: 'Term 3' }, { $set: { term: 'TERM 3 2026' } });

    // 3. Check for any Grade documents with partial term names
    const gResult = await Grade.updateMany(
        { term: 'Term 1' },
        { $set: { term: 'TERM 1 2026' } }
    );
    console.log(`Updated ${gResult.modifiedCount} Grades from "Term 1" to "TERM 1 2026".`);

    console.log('\nSync complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncTerms();
