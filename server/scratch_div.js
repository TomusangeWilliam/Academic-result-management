const mongoose = require('mongoose');
const Grade = require('./models/Grade');
const AssessmentType = require('./models/AssessmentType');

mongoose.connect('mongodb://localhost:27017/academic-result-management')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Hardcoded parameters based on the UI filters we know
    const term = 'TERM 1 2026';
    const academicYear = '2026';
    
    const grades = await Grade.find({ term, academicYear }).populate('student').populate('subject').lean();
    console.log(`Found ${grades.length} grade documents`);

    // Group by student
    const studentGrades = {};
    for (const g of grades) {
      if (!g.student || !g.subject) continue;
      const sid = g.student._id.toString();
      if (!studentGrades[sid]) {
        studentGrades[sid] = { name: g.student.firstName + ' ' + g.student.lastName, grades: [] };
      }
      
      let score = 0;
      for (const a of (g.assessments || [])) {
        if (a.score) score += a.score;
      }
      // Assuming out of 100
      let pct = score; 
      let gradeStr = 'F9';
      if (pct >= 90) gradeStr = "D1";
      else if (pct >= 80) gradeStr = "D2";
      else if (pct >= 70) gradeStr = "C3";
      else if (pct >= 60) gradeStr = "C4";
      else if (pct >= 50) gradeStr = "C5";
      else if (pct >= 45) gradeStr = "C6";
      else if (pct >= 40) gradeStr = "P7";
      else if (pct >= 35) gradeStr = "P8";

      studentGrades[sid].grades.push(gradeStr);
    }

    // Now calculate aggregate and see who has F9s or P8s
    let myDiv1 = 0, myDiv2 = 0, myDiv3 = 0, myDiv4 = 0, myDivU = 0, myDivX = 0;
    
    for (const sid in studentGrades) {
      const student = studentGrades[sid];
      if (student.grades.length < 4) {
        myDivX++;
        continue;
      }
      let agg = 0;
      let hasF9 = false;
      let hasP8 = false;
      for (const g of student.grades) {
        let num = parseInt(g.replace(/\D/g, ''));
        if (isNaN(num)) num = 9;
        if (num === 9) hasF9 = true;
        if (num === 8) hasP8 = true;
        agg += num;
      }

      let div = "Div X";
      if (agg <= 12) div = "Div 1";
      else if (agg <= 24) div = "Div 2";
      else if (agg <= 29) div = "Div 3";
      else if (agg <= 33) div = "Div 4";
      else div = "Div U";

      if (div === "Div 2" && hasF9) {
          console.log(`Student ${student.name} got Div 2 with aggregate ${agg} but has F9. Grades: ${student.grades.join(', ')}`);
      }
      if (div === "Div 1" && hasF9) {
          console.log(`Student ${student.name} got Div 1 with aggregate ${agg} but has F9. Grades: ${student.grades.join(', ')}`);
      }

      if (div === "Div 1") myDiv1++;
      if (div === "Div 2") myDiv2++;
      if (div === "Div 3") myDiv3++;
      if (div === "Div 4") myDiv4++;
      if (div === "Div U") myDivU++;
    }

    console.log(`Div 1: ${myDiv1}, Div 2: ${myDiv2}, Div 3: ${myDiv3}`);
    process.exit(0);
  })
  .catch(err => console.error(err));
