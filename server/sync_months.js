const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function syncMonths() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const term1ATs = await AssessmentType.find({ term: 'TERM 1 2026' });
    console.log(`Updating ${term1ATs.length} assessments for Term 1...`);

    let updated = 0;
    for (const at of term1ATs) {
        let newMonth = at.month;
        const name = at.name.toLowerCase();

        if (name.includes('beginning') || name.includes('bot')) {
            newMonth = 'February';
        } else if (name.includes('mid')) {
            newMonth = 'March';
        } else if (name.includes('end') || name.includes('eot')) {
            newMonth = 'April';
        }

        if (newMonth !== at.month) {
            await AssessmentType.updateOne({ _id: at._id }, { $set: { month: newMonth } });
            updated++;
        }
    }

    console.log(`✅ Success! Updated months for ${updated} assessments.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncMonths();
