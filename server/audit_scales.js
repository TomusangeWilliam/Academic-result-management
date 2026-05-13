const mongoose = require('mongoose');
const GradingScale = require('./models/GradingScale');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function auditScales() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const scales = await GradingScale.find().lean();
    console.log(`Found ${scales.length} grading scales in DB:`);
    console.log(JSON.stringify(scales, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

auditScales();
