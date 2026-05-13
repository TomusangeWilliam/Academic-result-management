const mongoose = require('mongoose');
const AssessmentType = require('./models/AssessmentType');
const Grade = require('./models/Grade');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function purgeSub100ATs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const sub100 = await AssessmentType.find({ totalMarks: { $lt: 100 } });
    console.log(`Found ${sub100.length} AssessmentTypes with less than 100 marks.`);

    let deleted = 0;
    let gradesReassigned = 0;

    for (const at of sub100) {
        // Find a replacement 100-mark AT for the same period/subject/class/term
        const replacement = await AssessmentType.findOne({
            subject: at.subject,
            class: at.class,
            term: at.term,
            year: at.year,
            totalMarks: 100,
            name: { $regex: new RegExp(at.name.split(/[- ]/)[0], 'i') } // Try to match "Mid" from "Mid Term-MT"
        });

        if (replacement) {
            // Reassign grades to the 100-mark one
            const res = await Grade.updateMany(
                { 'assessments.assessmentType': at._id },
                { $set: { 'assessments.$[elem].assessmentType': replacement._id } },
                { arrayFilters: [{ 'elem.assessmentType': at._id }] }
            );
            gradesReassigned += res.modifiedCount;
            await AssessmentType.deleteOne({ _id: at._id });
            deleted++;
        } else {
            // No 100-mark replacement found. 
            // If it has NO grades, we can just delete it.
            const count = await Grade.countDocuments({ 'assessments.assessmentType': at._id });
            if (count === 0) {
                await AssessmentType.deleteOne({ _id: at._id });
                deleted++;
            } else {
                console.log(`WARNING: AT "${at.name}" (${at.totalMarks} marks) has ${count} grades but no 100-mark replacement. Skipping delete.`);
            }
        }
    }

    console.log(`\nCleanup Summary:`);
    console.log(`- Deleted ${deleted} sub-100 mark assessment types.`);
    console.log(`- Reassigned ${gradesReassigned} grade entries to 100-mark assessments.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

purgeSub100ATs();
