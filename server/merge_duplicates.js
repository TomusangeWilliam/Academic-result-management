const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Grade = require('./models/Grade');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function mergeSubjects() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const allSubjects = await Subject.find().lean();
    const subjectGroups = {};
    allSubjects.forEach(s => {
      const name = s.name.trim();
      if (!subjectGroups[name]) subjectGroups[name] = [];
      subjectGroups[name].push(s);
    });

    for (const name in subjectGroups) {
      const group = subjectGroups[name];
      if (group.length > 1) {
        console.log(`Merging ${group.length} duplicates for "${name}"...`);
        let master = group[0];
        let maxGrades = -1;
        for (const s of group) {
            const count = await Grade.countDocuments({ subject: s._id });
            if (count > maxGrades) { maxGrades = count; master = s; }
        }

        const others = group.filter(s => s._id.toString() !== master._id.toString());
        const otherIds = others.map(s => s._id);

        await Grade.updateMany({ subject: { $in: otherIds } }, { $set: { subject: master._id } });

        const otherATs = await AssessmentType.find({ subject: { $in: otherIds } });
        for (const at of otherATs) {
            try {
                await AssessmentType.updateOne({ _id: at._id }, { $set: { subject: master._id } });
            } catch (err) {
                if (err.code === 11000) {
                    // It's a duplicate. Find the existing one in master.
                    const query = { subject: master._id, name: at.name, class: at.class, month: at.month };
                    // Try to match other fields if they exist
                    if (at.term) query.term = at.term;
                    if (at.semester) query.semester = at.semester;
                    if (at.gradeLevel) query.gradeLevel = at.gradeLevel;
                    
                    const existing = await AssessmentType.findOne(query);
                    if (existing) {
                        await Grade.updateMany(
                            { 'assessments.assessmentType': at._id },
                            { $set: { 'assessments.$[elem].assessmentType': existing._id } },
                            { arrayFilters: [{ 'elem.assessmentType': at._id }] }
                        );
                    }
                    await AssessmentType.deleteOne({ _id: at._id });
                } else throw err;
            }
        }
        await Subject.deleteMany({ _id: { $in: otherIds } });
        console.log(`- Merged "${name}" into ${master._id}`);
      }
    }

    console.log('\nMerge complete.');
    process.exit(0);
  } catch (err) {
    console.error('Merge error:', err);
    process.exit(1);
  }
}

mergeSubjects();
