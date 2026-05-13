const mongoose = require('mongoose');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkGenders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const genders = await Student.distinct('gender');
    console.log('Unique Genders in Students:', genders);

    for (const g of genders) {
        const count = await Student.countDocuments({ gender: g });
        console.log(`Count for gender "${g}": ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkGenders();
