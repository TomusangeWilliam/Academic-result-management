const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Class = require('./models/Class');
const AssessmentType = require('./models/AssessmentType');
const Grade = require('./models/Grade');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function removeSubjects() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const targetClasses = await Class.find({ className: { $in: ['P4', 'P5', 'P6', 'P7'] } });
    const classIds = targetClasses.map(c => c._id);
    
    const targetNames = ['Religious Education', 'Literacy 2', 'Literacy 1', 'Local Language'];

    console.log(`Searching for subjects to remove in P4-P7...`);
    
    const subjectsToRemove = await Subject.find({
        name: { $in: targetNames },
        class: { $in: classIds }
    });

    console.log(`Found ${subjectsToRemove.length} subject records to delete.`);
    
    const subjectIds = subjectsToRemove.map(s => s._id);

    if (subjectIds.length > 0) {
        // Delete Grades
        const gradeRes = await Grade.deleteMany({ subject: { $in: subjectIds } });
        console.log(`- Deleted ${gradeRes.deletedCount} grade records.`);

        // Delete AssessmentTypes
        const atRes = await AssessmentType.deleteMany({ subject: { $in: subjectIds } });
        console.log(`- Deleted ${atRes.deletedCount} assessment types.`);

        // Delete Subjects
        const subRes = await Subject.deleteMany({ _id: { $in: subjectIds } });
        console.log(`- Deleted ${subRes.deletedCount} subject records.`);
    }

    console.log('✅ Success! P4-P7 curriculum is now clean.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

removeSubjects();
