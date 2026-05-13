const mongoose = require('mongoose');
const GradingScale = require('./models/GradingScale');

const MONGO_URI = 'mongodb://localhost:27017/school_management';

async function createP7Scale() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const p7Scale = {
      name: "Primary P4-P7 Standard",
      schoolLevel: "primary",
      applicableClasses: ["P4", "P5", "P6", "P7"],
      ranges: [
        { grade: "D1", minScore: 90, maxScore: 100 },
        { grade: "D2", minScore: 80, maxScore: 89 },
        { grade: "C3", minScore: 70, maxScore: 79 },
        { grade: "C4", minScore: 60, maxScore: 69 },
        { grade: "C5", minScore: 50, maxScore: 59 },
        { grade: "C6", minScore: 45, maxScore: 49 },
        { grade: "P7", minScore: 40, maxScore: 44 },
        { grade: "P8", minScore: 35, maxScore: 39 },
        { grade: "F9", minScore: 0, maxScore: 34 }
      ],
      isActive: true
    };

    await GradingScale.create(p7Scale);
    console.log('✅ Success! Created P7 Grading Scale (P8 = 35-39).');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createP7Scale();
