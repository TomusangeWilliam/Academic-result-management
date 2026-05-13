const mongoose = require('mongoose');
const path = require('path');

const Term = require('./models/Term');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function resetTerms() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    console.log('Deleting all existing terms...');
    await Term.deleteMany({});

    const newTerms = [
      { name: 'TERM 1 2026', isActive: true },
      { name: 'TERM 2 2026', isActive: false },
      { name: 'TERM 3 2026', isActive: false }
    ];

    console.log('Inserting new terms...');
    await Term.insertMany(newTerms);

    console.log('✅ Success! Terms reset to TERM 1, 2, 3 2026.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting terms:', err);
    process.exit(1);
  }
}

resetTerms();
