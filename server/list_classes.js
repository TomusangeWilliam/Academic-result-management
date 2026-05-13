const mongoose = require('mongoose');
const Class = require('./models/Class');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function listClasses() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const classes = await Class.find();
    console.log(`\nFound ${classes.length} classes:`);
    for (const c of classes) {
        const studentCount = await Student.countDocuments({ class: c._id });
        console.log(`- ${c.className} (ID: ${c._id}): ${studentCount} students`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listClasses();
