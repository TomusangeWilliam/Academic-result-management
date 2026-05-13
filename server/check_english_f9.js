const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkEnglishGrades() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const subjectId = '69faf102da2ea60b37b8bd7f'; // English P7
    const term = 'TERM 1 2026';

    const ats = await AssessmentType.find({ subject: subjectId, term });
    const atIds = ats.map(a => a._id.toString());
    const totalPossible = ats.reduce((sum, a) => sum + a.totalMarks, 0);

    console.log(`English P7 assessments: ${ats.map(a => a.name).join(', ')} (Total: ${totalPossible})`);

    const grades = await Grade.find({ subject: subjectId, term }).populate('student', 'fullName');
    
    const distribution = {};
    const f9Students = [];

    for (const g of grades) {
        if (!g.student) continue;
        const sid = g.student._id.toString();
        
        let score = 0;
        g.assessments.forEach(a => {
            if (atIds.includes(a.assessmentType.toString())) {
                score += a.score;
            }
        });

        const pct = (score / totalPossible) * 100;
        // Simple F9 check (< 35)
        if (pct < 35) {
            f9Students.push({
                name: g.student.fullName,
                score,
                pct: pct.toFixed(1)
            });
        }
    }

    console.log(`\nFound ${f9Students.length} students in F9 range (<35%):`);
    f9Students.forEach(s => console.log(`- ${s.name}: ${s.score}/${totalPossible} (${s.pct}%)`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEnglishGrades();
