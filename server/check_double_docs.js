const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Subject = require('./models/Subject');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkDuplicateGradeDocs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const math = await Subject.findOne({ name: 'Mathematics' });
    if (!math) {
        console.log('Math not found.');
        process.exit(0);
    }

    // Find students with more than one Grade document for Math in TERM 1 2026
    const pipeline = [
        { $match: { subject: math._id, term: 'TERM 1 2026' } },
        { $group: { _id: '$student', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
    ];

    const duplicates = await Grade.aggregate(pipeline);
    console.log(`Found ${duplicates.length} students with multiple Grade documents for Math.`);

    if (duplicates.length > 0) {
        console.log('Sample duplicate student ID:', duplicates[0]._id);
        const docs = await Grade.find({ _id: { $in: duplicates[0].docs } });
        console.log('Assessments in doc 1:', docs[0].assessments.length);
        console.log('Assessments in doc 2:', docs[1].assessments.length);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDuplicateGradeDocs();
