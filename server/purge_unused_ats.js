const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function purgeUnusedATs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const allATs = await AssessmentType.find();
    console.log(`Auditing ${allATs.length} AssessmentTypes...`);

    let purged = 0;
    for (const at of allATs) {
        // Check if this AT is used in ANY grade document (not just current term)
        const count = await Grade.countDocuments({ 'assessments.assessmentType': at._id });
        if (count === 0) {
            await AssessmentType.deleteOne({ _id: at._id });
            purged++;
        }
    }

    console.log(`✅ Success! Purged ${purged} unused AssessmentType records.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

purgeUnusedATs();
