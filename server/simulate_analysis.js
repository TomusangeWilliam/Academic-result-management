const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const Student = require('./models/Student');
const Subject = require('./models/Subject');
const AssessmentType = require('./models/AssessmentType');
const GradingScale = require('./models/GradingScale');
const Class = require('./models/Class');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function simulateAnalysis() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const classId = '69fa5728303f7e2d52804e8b'; // P7
    const testPeriod = 'Mid Term';
    const academicYear = '2026';
    const term = 'TERM 1 2026';

    const subjects = await Subject.find({ class: classId, name: 'English' });
    const students = await Student.find({ class: classId, status: 'Active' });
    const studentIds = students.map(s => s._id);
    const genderMap = {};
    students.forEach(s => genderMap[s._id.toString()] = s.gender);

    const gradingScale = await GradingScale.findOne({ applicableClasses: 'P7', isActive: true }) || await GradingScale.findOne({ isActive: true });
    
    const percentToGrade = (pct) => {
        const roundedPct = Math.round(pct);
        if (gradingScale && gradingScale.ranges) {
            const sortedRanges = [...gradingScale.ranges].sort((a, b) => b.minScore - a.minScore);
            for (const r of sortedRanges) {
                if (roundedPct >= r.minScore && roundedPct <= r.maxScore) return r.grade;
            }
        }
        if (roundedPct >= 90) return "D1";
        if (roundedPct >= 80) return "D2";
        if (roundedPct >= 70) return "C3";
        if (roundedPct >= 60) return "C4";
        if (roundedPct >= 50) return "C5";
        if (roundedPct >= 45) return "C6";
        if (roundedPct >= 40) return "P7";
        if (roundedPct >= 35) return "P8";
        return 'F9';
    };

    for (const subject of subjects) {
        const atQuery = {
            subject: subject._id,
            class: classId,
            name: { $regex: new RegExp(`^${testPeriod.trim()}(\\s*[-\u2013]?\\s*(BOT|MT|EOT))?$`, "i") },
            year: Number(academicYear),
            term
        };
        const assessmentTypes = await AssessmentType.find(atQuery);
        const atIdSet = new Set(assessmentTypes.map(a => a._id.toString()));
        const totalPossible = assessmentTypes.reduce((sum, a) => sum + a.totalMarks, 0);

        const grades = await Grade.find({ subject: subject._id, student: { $in: studentIds }, term, academicYear });
        
        const scoreByStudent = {};
        const hasSat = new Set();
        
        for (const g of grades) {
            const sid = g.student.toString();
            const seen = new Set();
            for (const a of g.assessments) {
                if (!a.assessmentType) continue;
                const atId = a.assessmentType.toString();
                if (atIdSet.has(atId) && !seen.has(atId)) {
                    seen.add(atId);
                    scoreByStudent[sid] = (scoreByStudent[sid] || 0) + (a.score || 0);
                    hasSat.add(sid);
                }
            }
        }

        console.log(`\nSubject: ${subject.name} (${subject._id})`);
        console.log(`Total Possible: ${totalPossible}`);
        
        const f9s = [];
        for (const s of students) {
            const sid = s._id.toString();
            if (hasSat.has(sid)) {
                const pct = totalPossible > 0 ? (scoreByStudent[sid] / totalPossible) * 100 : 0;
                const grade = percentToGrade(pct);
                if (grade === 'F9') {
                    f9s.push({ name: s.fullName, score: scoreByStudent[sid], pct: pct.toFixed(1) });
                }
            }
        }

        console.log(`Found ${f9s.length} F9s:`);
        f9s.forEach(f => console.log(`- ${f.name}: ${f.score}/${totalPossible} (${f.pct}%)`));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

simulateAnalysis();
