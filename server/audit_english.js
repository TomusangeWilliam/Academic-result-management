const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Class = require('./models/Class');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function audit() {
  try {
    await mongoose.connect(MONGO_URI);
    const subjects = await Subject.find({ name: 'English' }).populate('class');
    subjects.forEach(s => {
        console.log(`${s._id} | ${s.name} | ${s.class ? s.class.className : 'NO CLASS'}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

audit();
