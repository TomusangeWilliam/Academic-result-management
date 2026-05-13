const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');
const AssessmentType = require('./models/AssessmentType');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function checkAllEnglishScores() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const subjectId = '69faf102da2ea60b37b8bd7f'; // English P7
    const term = 'TERM 1 2026';
    const classId = '69fa5728303f7e2d52804e8b'; // P7

    const ats = await AssessmentType.find({ subject: subjectId, term });
    const atIds = ats.map(a => a._id.toString());
    const totalPossible = ats.reduce((sum, a) => sum + a.totalMarks, 0);

    const students = await Student.find({ class: classId, status: 'Active' }).sort('fullName');
    const studentIds = students.map(s => s._id);

    const grades = await Grade.find({ subject: subjectId, student: { $in: studentIds }, term });
    const gradeMap = {};
    grades.forEach(g => {
        gradeMap[g.student.toString()] = g;
    });

    console.log(`Auditing ${students.length} students for English P7...`);
    
    const results = [];

    for (const s of students) {
        const sid = s._id.toString();
        const g = gradeMap[sid];
        
        let score = 0;
        let hasSat = false;

        if (g) {
            g.assessments.forEach(a => {
                if (atIds.includes(a.assessmentType.toString())) {
                    score += a.score;
                    hasSat = true;
                }
            });
        }

        results.push({
            name: s.fullName,
            score,
            hasSat,
            pct: totalPossible > 0 ? (score / totalPossible) * 100 : 0
        });
    }

    // Sort by percentage ascending to see F9s and "-"
    results.sort((a, b) => a.pct - b.pct);

    results.forEach(r => {
        const bucket = !r.hasSat ? '-' : (r.pct < 35 ? 'F9' : 'Other');
        if (bucket !== 'Other') {
            console.log(`[${bucket}] ${r.name}: ${r.score}/${totalPossible} (${r.pct}%)`);
        }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAllEnglishScores();
