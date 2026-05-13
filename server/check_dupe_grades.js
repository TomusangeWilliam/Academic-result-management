const mongoose = require('mongoose');
const Grade = require('./models/Grade');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkDuplicates() {
  try {
    await mongoose.connect(MONGO_URI);
    const g = await Grade.aggregate([
      { $match: { subject: new mongoose.Types.ObjectId('69faf102da2ea60b37b8bd7f'), term: 'TERM 1 2026' } },
      { $group: { _id: '$student', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    console.log(JSON.stringify(g, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDuplicates();
