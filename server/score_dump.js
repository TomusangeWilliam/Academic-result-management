const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');
const Subject = require('./models/Subject');
const Class = require('./models/Class');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function scoreDump() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const math = await Subject.findOne({ name: /Math/i });
    const p7 = await Class.findOne({ className: /P7/i });

    if (!math || !p7) {
        console.log('Math or P7 not found.');
        process.exit(0);
    }

    const students = await Student.find({ class: p7._id });
    const studentMap = {};
    students.forEach(s => studentMap[s._id.toString()] = s);

    const grades = await Grade.find({ 
        subject: math._id, 
        term: 'TERM 1 2026',
        student: { $in: students.map(s => s._id) }
    }).lean();

    console.log(`\n--- Score Dump for ${math.name} in ${p7.className} ---`);
    console.log(`Total students in class: ${students.length}`);
    console.log(`Total grades found: ${grades.length}`);

    // We need to calculate percentages like the backend does
    const AssessmentType = require('./models/AssessmentType');
    const assessmentTypes = await AssessmentType.find({
        subject: math._id,
        class: p7._id,
        term: 'TERM 1 2026'
    });
    const totalMarks = assessmentTypes.reduce((sum, a) => sum + a.totalMarks, 0);
    console.log(`Total possible marks: ${totalMarks}`);

    const counts = {};
    const results = grades.map(g => {
        const student = studentMap[g.student.toString()];
        const totalScore = g.assessments.reduce((sum, a) => sum + (a.score || 0), 0);
        const pct = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
        const rounded = Math.round(pct);
        
        let grade = 'F9';
        if (rounded >= 90) grade = 'D1';
        else if (rounded >= 80) grade = 'D2';
        else if (rounded >= 70) grade = 'C3';
        else if (rounded >= 60) grade = 'C4';
        else if (rounded >= 50) grade = 'C5';
        else if (rounded >= 45) grade = 'C6';
        else if (rounded >= 40) grade = 'P7';
        else if (rounded >= 35) grade = 'P8';

        counts[grade] = (counts[grade] || 0) + 1;

        return {
            name: student ? student.name : 'Unknown',
            gender: student ? student.gender : '?',
            score: totalScore,
            pct: pct.toFixed(1),
            grade
        };
    });

    console.log('\nGrade Distribution:');
    console.log(JSON.stringify(counts, null, 2));

    console.log('\nTop 10 samples:');
    console.log(results.slice(0, 10));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

scoreDump();
