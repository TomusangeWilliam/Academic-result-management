const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function findDuplicateATs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const duplicates = await AssessmentType.aggregate([
      {
        $group: {
          _id: {
            subject: '$subject',
            class: '$class',
            name: '$name',
            term: '$term',
            year: '$year'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          totalMarks: { $push: '$totalMarks' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Found ${duplicates.length} groups of duplicate AssessmentTypes.`);

    for (const group of duplicates) {
      console.log(`\nDuplicate Group: ${group._id.name} (${group._id.term} ${group._id.year})`);
      console.log(`Subject: ${group._id.subject}, Class: ${group._id.class}`);
      console.log(`Instances: ${group.count}, Marks found: ${group.totalMarks.join(', ')}`);
      
      // Keep the one with the highest total marks (usually 100)
      const sortedIds = group.ids.slice().sort((a, b) => {
          // This is a bit tricky, but let's just find the one with 100 marks if possible
          return 0; 
      });

      // Better: find the ID with the max marks in this group
      let maxMarks = -1;
      let idToKeep = group.ids[0];
      
      const allDocs = await AssessmentType.find({ _id: { $in: group.ids } });
      allDocs.forEach(doc => {
          if (doc.totalMarks > maxMarks) {
              maxMarks = doc.totalMarks;
              idToKeep = doc._id;
          }
      });

      const idsToDelete = group.ids.filter(id => id.toString() !== idToKeep.toString());
      console.log(`Keeping ID: ${idToKeep} (${maxMarks} marks). Deleting: ${idsToDelete.length} others.`);
      
      await AssessmentType.deleteMany({ _id: { $in: idsToDelete } });
    }

    console.log('\nCleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findDuplicateATs();
