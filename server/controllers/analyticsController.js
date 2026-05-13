const mongoose = require("mongoose");
const Grade = require("../models/Grade");
const Student = require("../models/Student");
const AssessmentType = require("../models/AssessmentType");
const Subject = require("../models/Subject");
const Class = require("../models/Class");
const GradingScale = require("../models/GradingScale");
// Controller to get assessment analysis

exports.getAssessmentAnalysis = async (req, res) => {
  const {
    subjectId,
    testPeriod,
    selectedClass: classId,
    selectedStream: streamId,
    academicYear,
    term,
  } = req.query;

  if (!subjectId || !testPeriod) {
    return res
      .status(400)
      .json({ message: "subjectId and testPeriod are required." });
  }
  if (!classId) {
    return res.status(400).json({ message: "Class is required." });
  }

  try {
    // 1️⃣ Find all AssessmentTypes matching the test period name for this subject+class
    const atQuery = {
      subject: subjectId,
      class: classId,
      name: { $regex: new RegExp(`^${testPeriod.trim()}(\\s*[-\u2013]?\\s*(BOT|MT|EOT))?$`, "i") },
      year: Number(academicYear),
    };
    if (term) atQuery.term = term;

    const assessmentTypes = await AssessmentType.find(atQuery);

    const totalMarks = assessmentTypes.reduce(
      (sum, a) => sum + (a.totalMarks || 0),
      0,
    );
    const atIdSet = new Set(assessmentTypes.map((a) => a._id.toString()));

    // Build a meta object compatible with the existing response shape
    const assessmentType = {
      name: testPeriod,
      month: assessmentTypes[0]?.month || "-",
      term: assessmentTypes[0]?.term || "-",
      totalMarks,
    };

    // 2️⃣ Get students (optionally filtered by stream)
    const studentQuery = { class: classId };
    if (streamId && streamId !== "all") studentQuery.stream = streamId;
    const allStudents = await Student.find(studentQuery);
    const studentIds = allStudents.map((s) => s._id);
    const totalStudents = allStudents.length;

    if (totalStudents === 0) {
      return res.status(200).json({
        message: "No students found.",
        assessmentType,
        analysis: null,
      });
    }

    // 3️⃣ Fetch grade docs for this subject, then sum scores for matching ATs per student
    const gradeQuery = { subject: subjectId, student: { $in: studentIds } };
    if (academicYear) gradeQuery.academicYear = academicYear;
    if (term) gradeQuery.term = term;

    const grades = await Grade.find(gradeQuery).populate(
      "student",
      "fullName gender",
    );

    // Map to aggregate scores by student ID (prevents duplicates across multiple Grade documents)
    const analysisMap = {};
    const seenAssessments = new Set(); // Global seen set: "studentId-assessmentTypeId"

    for (const g of grades) {
      if (!g.student) continue;
      const sid = g.student._id.toString();

      const relevant = (g.assessments || []).filter(
        (a) => {
          if (!a.assessmentType) return false;
          const atId = a.assessmentType.toString();
          const uniqueKey = `${sid}-${atId}`;
          if (atIdSet.has(atId) && !seenAssessments.has(uniqueKey)) {
            seenAssessments.add(uniqueKey);
            return true;
          }
          return false;
        }
      );
      if (relevant.length === 0) continue;

      const score = relevant.reduce((s, a) => s + (a.score || 0), 0);

      if (!analysisMap[sid]) {
        analysisMap[sid] = {
          studentName: g.student.fullName,
          gender: g.student.gender,
          score: 0,
        };
      }
      analysisMap[sid].score += score;
    }

    const analysis = Object.values(analysisMap).map((item) => ({
      ...item,
      normalizedScore: totalMarks > 0 ? (item.score / totalMarks) * 100 : 0,
    }));

    if (analysis.length === 0) {
      return res.status(200).json({
        message: "No students have taken this assessment yet.",
        assessmentType,
        analysis: null,
      });
    }

    // 3️⃣ Participation info
    const studentsWhoTookAssessment = analysis.length;
    const studentsWhoMissedAssessment =
      totalStudents - studentsWhoTookAssessment;
    const maleStudents = analysis.filter((s) => s.gender === "Male").length;
    const femaleStudents = analysis.filter((s) => s.gender === "Female").length;

    // 4️⃣ Score stats
    const scores = analysis.map((s) => s.score);
    const normalizedScores = analysis.map((s) => s.normalizedScore);

    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const averageScore = (
      scores.reduce((a, b) => a + b, 0) / scores.length
    ).toFixed(2);

    const highestPercent = Math.max(...normalizedScores).toFixed(2);
    const lowestPercent = Math.min(...normalizedScores).toFixed(2);
    const averagePercent = (
      normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length
    ).toFixed(2);

    const passCount = normalizedScores.filter((s) => s >= 50).length;
    const failCount = normalizedScores.filter((s) => s < 50).length;
    const passPercentage = (
      (passCount / studentsWhoTookAssessment) *
      100
    ).toFixed(1);
    const failPercentage = (
      (failCount / studentsWhoTookAssessment) *
      100
    ).toFixed(1);

    // 5️⃣ Distribution buckets
    const buckets = [
      { label: "under50", min: 0, max: 50 },
      { label: "between50and75", min: 50, max: 75 },
      { label: "between75and90", min: 75, max: 90 },
      { label: "over90", min: 90, max: 101 },
    ];

    const processedDistribution = {};
    for (const { label, min, max } of buckets) {
      const group = analysis.filter(
        (a) => a.normalizedScore >= min && a.normalizedScore < max,
      );
      const femaleCount = group.filter((s) => s.gender === "Female").length;
      const maleCount = group.filter((s) => s.gender === "Male").length;
      const totalCount = group.length;
      const percentage =
        studentsWhoTookAssessment > 0
          ? (totalCount / studentsWhoTookAssessment) * 100
          : 0;

      processedDistribution[label] = {
        F: femaleCount,
        M: maleCount,
        T: totalCount,
        P: percentage.toFixed(1),
      };
    }

    const finalAnalysis = {
      general: {
        totalStudents,
        studentsWhoTookAssessment,
        studentsWhoMissedAssessment,
        maleStudents,
        femaleStudents,
      },
      scoreStats: {
        highestScore,
        lowestScore,
        averageScore,
        highestPercent,
        lowestPercent,
        averagePercent,
        passCount,
        failCount,
        passPercentage,
        failPercentage,
      },
      distribution: processedDistribution,
      scores: analysis,
    };

    res.status(200).json({ assessmentType, analysis: finalAnalysis });
  } catch (err) {
    console.error("Error in assessment analysis:", err);
    res.status(500).json({ message: "Server Error", details: err.message });
  }
};

// @desc    Get Class Analysis (Gender, Ranges, Participation) for an Assessment Name across all Subjects
// @route   GET /api/grades/analysis/class-analytics
// @query   gradeLevel, assessmentName, term, academicYear
exports.getClassAnalytics = async (req, res) => {
  const { classId, assessmentName, term, academicYear } = req.query;

  if (!classId || !assessmentName || !term || !academicYear) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // 1. Fetch ALL Active Students in this Class
    const students = await Student.find({ class: classId, status: "Active" });

    // Create a fast lookup map for Student Gender: { "studentId": "Male", ... }
    const studentMap = {};
    let totalMalesInClass = 0;
    let totalFemalesInClass = 0;

    students.forEach((s) => {
      studentMap[s._id.toString()] = s.gender;
      if (s.gender === "Male") totalMalesInClass++;
      else totalFemalesInClass++;
    });

    const totalStudentsInClass = students.length;

    // 2. Find the Assessment Types (The Subjects) that match the name (e.g., "Test 1")
    const assessmentTypes = await AssessmentType.find({
      class: classId,
      name: { $regex: new RegExp(`^${assessmentName.trim()}$`, "i") },
      term,
      year: academicYear,
    }).populate("subject", "name");

    if (assessmentTypes.length === 0) {
      return res.status(404).json({
        message: `No assessments found with name '${assessmentName}' for this class.`,
      });
    }

    // 3. Prepare the Analysis Array
    const analysisResults = [];

    // 4. Iterate through each Subject (AssessmentType)
    for (const type of assessmentTypes) {
      const subjectName = type.subject ? type.subject.name : "Unknown Subject";
      const totalMarks = type.totalMarks;

      // Fetch all grades for this specific assessment type
      const grades = await Grade.find({
        "assessments.assessmentType": type._id,
        student: { $in: students.map((s) => s._id) }, // Only active students
      });

      // Initialize Counters
      const stats = {
        subject: subjectName,
        totalMarks: totalMarks,
        students: {
          total: totalStudentsInClass,
          male: totalMalesInClass,
          female: totalFemalesInClass,
        },
        attended: { total: 0, male: 0, female: 0 },
        missed: { total: 0, male: 0, female: 0 },
        below50: { total: 0, male: 0, female: 0 }, // < 50%
        below75: { total: 0, male: 0, female: 0 }, // 50% - 74%
        below90: { total: 0, male: 0, female: 0 }, // 75% - 89%
        above90: { total: 0, male: 0, female: 0 }, // >= 90%
      };

      // Process Grades - Aggregate by student ID first
      const studentAnalysis = {};
      const seenAssessments = new Set(); // Set of "studentId-assessmentTypeId"

      grades.forEach((gradeDoc) => {
        const sid = gradeDoc.student.toString();

        const relevantAssessments = (gradeDoc.assessments || []).filter(a => {
          if (!a.assessmentType) return false;
          const atId = a.assessmentType.toString();
          const uniqueKey = `${sid}-${atId}`;
          if (atId.toString() === type._id.toString() && !seenAssessments.has(uniqueKey)) {
            seenAssessments.add(uniqueKey);
            return true;
          }
          return false;
        });

        relevantAssessments.forEach(assessmentData => {
          if (assessmentData.score !== null && assessmentData.score !== undefined) {
            if (!studentAnalysis[sid]) studentAnalysis[sid] = 0;
            studentAnalysis[sid] += assessmentData.score;
          }
        });
      });

      // Now iterate through aggregated student scores
      Object.keys(studentAnalysis).forEach((sid) => {
        const score = studentAnalysis[sid];
        const studentGender = studentMap[sid] || "Male";
        const genderKey = studentGender.toLowerCase() === 'm' || studentGender.toLowerCase() === 'male' ? 'male' : 'female';
        const percentage = (score / totalMarks) * 100;

        // Increment Attended
        stats.attended.total++;
        stats.attended[genderKey]++;

        // Classify into ranges
        if (percentage < 50) {
          stats.below50.total++;
          stats.below50[genderKey]++;
        } else if (percentage < 75) {
          stats.below75.total++;
          stats.below75[genderKey]++;
        } else if (percentage < 90) {
          stats.below90.total++;
          stats.below90[genderKey]++;
        } else {
          stats.above90.total++;
          stats.above90[genderKey]++;
        }
      });

      // Calculate Missed (Total Class - Attended)
      stats.missed.total = stats.students.total - stats.attended.total;
      stats.missed.male = stats.students.male - stats.attended.male;
      stats.missed.female = stats.students.female - stats.attended.female;

      analysisResults.push(stats);
    }

    res.status(200).json({
      success: true,
      meta: {
        classId,
        assessmentName,
        term,
        academicYear,
      },
      data: analysisResults,
    });
  } catch (error) {
    console.error("Class Analytics Error:", error);
    res.status(500).json({ message: "Server error generating analytics." });
  }
};

// backend/controllers/gradeController.js

exports.getSubjectPerformanceAnalysis = async (req, res) => {
  const { classId, streamId, testPeriod, term, academicYear } = req.query;

  if (!classId || !academicYear) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const subjects = await Subject.find({ class: classId }).sort({ name: 1 });

    // Filter students by stream if provided
    const studentQuery = { class: classId, status: "Active" };
    if (streamId && streamId !== "all") studentQuery.stream = streamId;
    const students = await Student.find(studentQuery).select("_id gender");
    const studentIds = students.map((s) => s._id);

    const analysis = [];

    for (const subject of subjects) {
      // 1. Find assessment types — by testPeriod name and/or term
      const atQuery = {
        subject: subject._id,
        class: classId,
        year: Number(academicYear),
      };
      if (testPeriod)
        atQuery.name = { $regex: new RegExp(`^${testPeriod.trim()}(\\s*[-\u2013]?\\s*(BOT|MT|EOT))?$`, "i") };
      if (term) atQuery.term = term;
      const assessmentTypes = await AssessmentType.find(atQuery);

      const atIdSet = new Set(assessmentTypes.map((a) => a._id.toString()));
      const totalPossible = assessmentTypes.reduce(
        (sum, a) => sum + a.totalMarks,
        0,
      );

      // 2. Fetch grades with student gender
      const gradeQuery = {
        subject: subject._id,
        student: { $in: studentIds },
        academicYear,
      };
      if (term) gradeQuery.term = term;
      const grades = await Grade.find(gradeQuery).populate("student", "gender");

      let totalScore = 0;
      let highest = 0;
      let lowest = totalPossible || 100;
      let passedCount = 0;
      let count = 0;

      const initRange = () => ({ total: 0, m: 0, f: 0 });
      const ranges = {
        below50: initRange(),
        below75: initRange(),
        below90: initRange(),
        above90: initRange(),
      };

      const studentAnalysis = {};
      const seenAssessments = new Set(); // Set of "studentId-assessmentTypeId"

      grades.forEach((g) => {
        if (!g.student) return;
        const sid = g.student._id.toString();

        // Use specific test-period score when testPeriod is given
        let score = 0;
        let hasScore = false;

        if (testPeriod && atIdSet.size > 0) {
          const relevant = (g.assessments || []).filter((a) => {
            if (!a.assessmentType) return false;
            const atId = a.assessmentType.toString();
            const uniqueKey = `${sid}-${atId}`;
            if (atIdSet.has(atId) && !seenAssessments.has(uniqueKey)) {
              seenAssessments.add(uniqueKey);
              return true;
            }
            return false;
          });
          if (relevant.length > 0) {
            score = relevant.reduce((s, a) => s + (a.score || 0), 0);
            hasScore = true;
          }
        } else {
          if (g.finalScore !== undefined && g.finalScore !== null) {
            score = g.finalScore;
            hasScore = true;
          }
        }

        if (hasScore) {
          if (!studentAnalysis[sid]) {
            studentAnalysis[sid] = {
              score: 0,
              gender: g.student.gender
            };
          }
          studentAnalysis[sid].score += score;
        }
      });

      // Now process aggregated student scores
      Object.values(studentAnalysis).forEach((item) => {
        const { score, gender } = item;
        const isMale = gender === "Male" || gender === "M";

        totalScore += score;
        if (score > highest) highest = score;
        if (score < lowest) lowest = score;

        const passMark = totalPossible / 2;
        if (score >= passMark) passedCount++;
        count++;

        const percentage =
          totalPossible > 0 ? (score / totalPossible) * 100 : 0;
        const inc = (bucket) => {
          bucket.total++;
          if (isMale) bucket.m++;
          else bucket.f++;
        };

        if (percentage < 50) inc(ranges.below50);
        else if (percentage < 75) inc(ranges.below75);
        else if (percentage < 90) inc(ranges.below90);
        else inc(ranges.above90);
      });

      if (count === 0) lowest = 0;
      const avg = count > 0 ? parseFloat((totalScore / count).toFixed(2)) : 0;
      const passRate =
        count > 0 ? parseFloat(((passedCount / count) * 100).toFixed(1)) : 0;

      analysis.push({
        subjectName: subject.name,
        submittedGrades: count,
        averageScore: avg,
        highestScore: highest,
        lowestScore: lowest,
        passRate: passRate + "%",
        ranges,
        totalPossibleScore: totalPossible,
      });
    }

    analysis.sort((a, b) => b.averageScore - a.averageScore);
    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Get students scoring below 60% per subject
// @route   GET /api/grades/analysis/at-risk
exports.getAtRiskStudents = async (req, res) => {
  const { classId, term, academicYear } = req.query;

  if (!classId || !term || !academicYear) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const subjects = await Subject.find({ class: classId }).sort({ name: 1 });
    const students = await Student.find({
      class: classId,
      status: "Active",
    }).select("_id fullName studentId");
    const studentIds = students.map((s) => s._id);

    const report = [];

    for (const subject of subjects) {
      // 1. Calculate Total Marks for this Subject
      const assessmentTypes = await AssessmentType.find({
        subject: subject._id,
        class: classId,
        term,
        year: Number(academicYear),
      });
      const totalPossible = assessmentTypes.reduce(
        (sum, a) => sum + a.totalMarks,
        0,
      );

      if (totalPossible === 0) continue; // Skip if no assessments defined

      const cutoffScore = totalPossible * 0.6;

      // 3. Find Grades below cutoff and aggregate by student
      const rawGrades = await Grade.find({
        subject: subject._id,
        student: { $in: studentIds },
        term,
        academicYear,
      }).populate("student", "fullName studentId gender");

      const studentAnalysis = {};

      rawGrades.forEach((g) => {
        if (!g.student) return;
        const sid = g.student._id.toString();
        const score = g.finalScore || 0;

        if (!studentAnalysis[sid]) {
          studentAnalysis[sid] = {
            student: g.student,
            score: 0
          };
        }
        studentAnalysis[sid].score += score;
      });

      const atRiskList = Object.values(studentAnalysis)
        .filter(item => item.score < cutoffScore)
        .map((item) => ({
          id: item.student._id,
          name: item.student.fullName,
          studentId: item.student.studentId,
          gender: item.student.gender,
          score: item.score,
          percentage: ((item.score / totalPossible) * 100).toFixed(1),
        }))
        .sort((a, b) => a.score - b.score);

      if (atRiskList.length > 0) {
        report.push({
          subjectName: subject.name,
          totalPossible: totalPossible,
          cutoff: cutoffScore,
          students: atRiskList,
        });
      }
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error("At Risk Error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get per-subject grade distribution using the school grading scale
//          with male / female breakdown.
// @route   GET /api/analytics/grade-distribution
// @query   classId, streamId ('all' or a specific stream ObjectId),
//          testPeriod (e.g. 'Beginning of Term'), term, academicYear
// ─────────────────────────────────────────────────────────────────────────────
exports.getGradeDistributionAnalysis = async (req, res) => {
  const { classId, streamId, testPeriod, term, academicYear } = req.query;

  // ── 1. Validate required params ──────────────────────────────────────────
  if (!classId || !testPeriod || !academicYear) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: classId, testPeriod, academicYear.",
    });
  }

  try {
    // ── 2. Resolve the grading scale for this class ──────────────────────
    //   First try to find one whose applicableClasses contains the className;
    //   fall back to the first active scale if none matches.
    const classDoc = await Class.findById(classId).select("className");
    if (!classDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found." });
    }

    // ── 2. Get Grading Scale ─────────────────────────────────────────────
    // Try exact class name first, then try the prefix (e.g. "P7" for "P7S")
    let gradingScale = await GradingScale.findOne({
      applicableClasses: classDoc.className,
      isActive: true,
    });

    if (!gradingScale) {
      const classPrefix =
        classDoc.className.match(/^[a-zA-Z]+\d+/)?.[0] || classDoc.className;
      gradingScale = await GradingScale.findOne({
        applicableClasses: classPrefix,
        isActive: true,
      });
    }

    if (!gradingScale) {
      gradingScale = await GradingScale.findOne({ isActive: true });
    }

    if (!gradingScale) {
      return res.status(404).json({
        success: false,
        message: "No active grading scale found.",
      });
    }

    // Canonical grade order (stored order in the schema defaults to D1 → F9)
    const GRADE_ORDER = ["D1", "D2", "C3", "C4", "C5", "C6", "P7", "P8", "F9"];
    const gradeLabels = [...GRADE_ORDER, "-"];

    // Build a quick lookup: grade letter → { minScore, maxScore }
    const scaleMap = {};
    for (const r of gradingScale.ranges) {
      scaleMap[r.grade] = { min: r.minScore, max: r.maxScore };
    }

    // Helper: map a percentage (0-100) → grade letter using the scale.
    const percentToGrade = (pct) => {
      const roundedPct = Math.round(pct);

      // Use the actual ranges from the grading scale if available
      if (gradingScale && gradingScale.ranges && gradingScale.ranges.length > 0) {
        // Sort ranges by minScore descending to find the highest match first
        const sortedRanges = [...gradingScale.ranges].sort(
          (a, b) => b.minScore - a.minScore,
        );
        for (const r of sortedRanges) {
          if (roundedPct >= r.minScore && roundedPct <= r.maxScore) {
            return r.grade;
          }
        }
      }

      // Fallback to hardcoded Ugandan standard if scale is missing or doesn't match
      if (roundedPct >= 90) return "D1";
      if (roundedPct >= 80) return "D2";
      if (roundedPct >= 70) return "C3";
      if (roundedPct >= 60) return "C4";
      if (roundedPct >= 50) return "C5";
      if (roundedPct >= 45) return "C6";
      if (roundedPct >= 40) return "P7";
      if (roundedPct >= 35) return "P8";
      return "F9";
    };

    // ── 3. Fetch subjects and students ───────────────────────────────────
    const subjects = await Subject.find({ class: classId }).sort({ name: 1 });

    // Build student query – filter by stream only when a specific one is given
    const studentQuery = { class: classId, status: "Active" };
    const isAllStreams = !streamId || streamId === "all";
    if (!isAllStreams) {
      studentQuery.stream = streamId;
    }

    const students = await Student.find(studentQuery).select("_id gender");
    const studentIds = students.map((s) => s._id);
    const totalStudents = students.length;

    // Fast gender lookup: studentId string → 'Male' | 'Female'
    const genderMap = {};
    for (const s of students) {
      genderMap[s._id.toString()] = s.gender;
    }

    // ── 4. Build zero-initialised grade-count template ───────────────────
    const emptyGradeCounts = () => {
      const counts = {};
      for (const label of gradeLabels) {
        counts[label] = { m: 0, f: 0, total: 0 };
      }
      return counts;
    };

    // ── 5. Iterate each subject ──────────────────────────────────────────
    const data = [];

    for (const subject of subjects) {
      // 5a. Find AssessmentTypes matching the test period name (case-insensitive)
      //     optionally also filtered by term if provided
      const atQuery = {
        subject: subject._id,
        class: classId,
        name: { $regex: new RegExp(`^${testPeriod.trim()}(\\s*[-\u2013]?\\s*(BOT|MT|EOT))?$`, "i") },
        year: Number(academicYear),
      };
      if (term) atQuery.term = term;

      const assessmentTypes = await AssessmentType.find(atQuery);

      // Collect the AT _id set and total marks for this test period
      const atIdSet = new Set(assessmentTypes.map((a) => a._id.toString()));
      const totalPossibleScore = assessmentTypes.reduce(
        (sum, a) => sum + (a.totalMarks || 0),
        0,
      );

      // 5b. Fetch grade docs for this subject / term / year
      //     (no term filter if not provided — pick up all grades for subject)
      const gradeQuery = {
        subject: subject._id,
        student: { $in: studentIds },
        academicYear,
      };
      if (term) gradeQuery.term = term;

      const grades = await Grade.find(gradeQuery).select("student assessments");

      // Map studentId → sum of scores for the matching test-period ATs only
      const scoreByStudent = {};
      const hasSat = new Set();
      const seenAssessments = new Set(); // Set of "studentId-assessmentTypeId"

      for (const g of grades) {
        const sid = g.student.toString();
        const relevantAssessments = (g.assessments || []).filter((a) => {
          if (!a.assessmentType) return false;
          const atId = a.assessmentType.toString();
          const uniqueKey = `${sid}-${atId}`;
          if (atIdSet.has(atId) && !seenAssessments.has(uniqueKey)) {
            seenAssessments.add(uniqueKey);
            return true;
          }
          return false;
        });

        if (relevantAssessments.length > 0) {
          const score = relevantAssessments.reduce(
            (sum, a) => sum + (a.score || 0),
            0,
          );
          scoreByStudent[sid] = (scoreByStudent[sid] || 0) + score;
          hasSat.add(sid);
        }
      }

      // 5c. Tally every student into a grade bucket
      const gradeCounts = emptyGradeCounts();
      let submittedGrades = 0;

      for (const student of students) {
        const sid = student._id.toString();
        const isMale = genderMap[sid] === "Male" || genderMap[sid] === "M";
        const score = scoreByStudent[sid];

        let bucket;

        if (!hasSat.has(sid)) {
          // No matching assessments found for this student for this period
          bucket = "-";
        } else if (totalPossibleScore === 0) {
          bucket = "-";
        } else {
          submittedGrades++;
          const pct = (score / totalPossibleScore) * 100;
          bucket = percentToGrade(pct);
        }

        gradeCounts[bucket].total++;
        if (isMale) gradeCounts[bucket].m++;
        else gradeCounts[bucket].f++;
      }

      data.push({
        subjectName: subject.name,
        gradeCounts,
        submittedGrades,
        totalPossibleScore,
      });
    }

    // ── 6. Respond ───────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      gradeLabels,
      totalStudents,
      data,
    });
  } catch (error) {
    console.error("Grade Distribution Analysis Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating grade distribution.",
    });
  }
};

exports.getCumulativeClassAnalytics = async (req, res) => {
  const { classId, term, academicYear } = req.query;

  if (!classId || !term || !academicYear) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const students = await Student.find({ class: classId, status: "Active" });
    const studentMap = {};
    let totalMalesInClass = 0;
    let totalFemalesInClass = 0;

    students.forEach((s) => {
      const g = s.gender || "Male";
      studentMap[s._id.toString()] = g;
      if (g === "Male" || g === "M") totalMalesInClass++;
      else totalFemalesInClass++;
    });

    const totalStudentsInClass = students.length;

    const assessmentTypes = await AssessmentType.find({
      class: classId,
      term,
      year: academicYear,
    }).populate("subject", "name");

    const subjectGroups = {};
    assessmentTypes.forEach((at) => {
      const subId = at.subject?._id.toString();
      if (!subId) return;
      if (!subjectGroups[subId]) {
        subjectGroups[subId] = {
          name: at.subject.name,
          assessments: [],
          totalMarks: 0,
        };
      }
      subjectGroups[subId].assessments.push(at._id.toString());
      subjectGroups[subId].totalMarks += at.totalMarks;
    });

    const analysisResults = [];

    for (const subId of Object.keys(subjectGroups)) {
      const group = subjectGroups[subId];
      const grades = await Grade.find({
        "assessments.assessmentType": { $in: group.assessments },
        student: { $in: students.map((s) => s._id) },
      });

      const stats = {
        subject: group.name,
        totalMarks: group.totalMarks,
        students: {
          total: totalStudentsInClass,
          male: totalMalesInClass,
          female: totalFemalesInClass,
        },
        attended: { total: 0, male: 0, female: 0 },
        missed: { total: 0, male: 0, female: 0 },
        below50: { total: 0, male: 0, female: 0 },
        below75: { total: 0, male: 0, female: 0 },
        below90: { total: 0, male: 0, female: 0 },
        above90: { total: 0, male: 0, female: 0 },
      };

      const studentScores = {};
      const studentParticipated = new Set();

      grades.forEach((gradeDoc) => {
        const sid = gradeDoc.student.toString();
        (gradeDoc.assessments || []).forEach((a) => {
          if (
            a.assessmentType &&
            group.assessments.includes(a.assessmentType.toString())
          ) {
            if (a.score !== null && a.score !== undefined) {
              studentScores[sid] = (studentScores[sid] || 0) + a.score;
              studentParticipated.add(sid);
            }
          }
        });
      });

      studentParticipated.forEach((sid) => {
        const score = studentScores[sid] || 0;
        const gender = studentMap[sid] || "Male";
        const genderKey =
          gender === "Male" || gender === "M" ? "male" : "female";
        const percentage = (score / group.totalMarks) * 100;

        stats.attended.total++;
        stats.attended[genderKey]++;

        if (percentage < 50) {
          stats.below50.total++;
          stats.below50[genderKey]++;
        } else if (percentage < 75) {
          stats.below75.total++;
          stats.below75[genderKey]++;
        } else if (percentage < 90) {
          stats.below90.total++;
          stats.below90[genderKey]++;
        } else {
          stats.above90.total++;
          stats.above90[genderKey]++;
        }
      });

      stats.missed.total = stats.students.total - stats.attended.total;
      stats.missed.male = stats.students.male - stats.attended.male;
      stats.missed.female = stats.students.female - stats.attended.female;

      analysisResults.push(stats);
    }

    res.status(200).json({
      success: true,
      meta: { classId, term, academicYear },
      data: analysisResults,
    });
  } catch (error) {
    console.error("Cumulative Analytics Error:", error);
    res.status(500).json({ message: "Server error generating cumulative analytics." });
  }
};

exports.getStreamAnalysisSummary = async (req, res) => {
  const { classId, term, academicYear } = req.query;

  if (!classId || !term || !academicYear) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const Stream = require("../models/Stream");
    const Division = require("../models/Division");

    const GRADE_LABELS = ["D1", "D2", "C3", "C4", "C5", "C6", "P7", "P8", "F9"];
    const TEST_PERIODS = [
      { key: "BOT", regex: /^beginning of term$/i },
      { key: "MID", regex: /^mid\s*term$/i },
      { key: "EOT", regex: /^end of term$/i },
    ];

    // ── 1. Resolve grading scale & division scale ──────────────────────────
    const classDoc = await Class.findById(classId).select("className");
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found." });
    }

    let gradingScale = await GradingScale.findOne({
      applicableClasses: classDoc.className,
      isActive: true,
    });
    if (!gradingScale) {
      const prefix = classDoc.className.match(/^[a-zA-Z]+\d+/)?.[0] || classDoc.className;
      gradingScale = await GradingScale.findOne({ applicableClasses: prefix, isActive: true });
    }
    if (!gradingScale) {
      gradingScale = await GradingScale.findOne({ isActive: true });
    }

    let divisionScale = await Division.findOne({
      applicableClasses: classDoc.className,
      isActive: true,
    });
    if (!divisionScale) {
      const prefix = classDoc.className.match(/^[a-zA-Z]+\d+/)?.[0] || classDoc.className;
      divisionScale = await Division.findOne({ applicableClasses: prefix, isActive: true });
    }
    if (!divisionScale) {
      divisionScale = await Division.findOne({ isActive: true });
    }

    // Helper: percentage → grade letter
    const pctToGrade = (pct) => {
      const p = Math.round(pct);
      if (gradingScale?.ranges?.length) {
        const sorted = [...gradingScale.ranges].sort((a, b) => b.minScore - a.minScore);
        for (const r of sorted) {
          if (p >= r.minScore && p <= r.maxScore) return r.grade;
        }
      }
      if (p >= 90) return "D1";
      if (p >= 80) return "D2";
      if (p >= 70) return "C3";
      if (p >= 60) return "C4";
      if (p >= 50) return "C5";
      if (p >= 45) return "C6";
      if (p >= 40) return "P7";
      if (p >= 35) return "P8";
      return "F9";
    };

    // Helper: aggregate sum → division
    const aggToDivision = (agg) => {
      if (divisionScale?.ranges?.length) {
        for (const r of divisionScale.ranges) {
          if (agg >= r.minScore && agg <= r.maxScore) return r.division;
        }
      }
      if (agg <= 12) return "Div 1";
      if (agg <= 24) return "Div 2";
      if (agg <= 29) return "Div 3";
      if (agg <= 33) return "Div 4";
      return "Div U";
    };

    // ── 2. Fetch all streams for this class ───────────────────────────────
    const streams = await Stream.find({ classId }).lean();

    // If no streams configured, treat the whole class as one "General" stream
    const streamList = streams.length > 0
      ? streams.map(s => ({ _id: s._id, streamName: s.streamName }))
      : [{ _id: null, streamName: "General" }];

    // ── 3. Pre-fetch all AssessmentTypes for this class / term / year ─────
    const allATs = await AssessmentType.find({
      class: classId,
      term,
      year: Number(academicYear),
    }).lean();

    // Group by test period key
    const atsByPeriod = { BOT: [], MID: [], EOT: [] };
    for (const at of allATs) {
      for (const tp of TEST_PERIODS) {
        if (tp.regex.test(at.name.trim())) {
          atsByPeriod[tp.key].push(at);
          break;
        }
      }
    }

    // ── 4. Build summary per stream ───────────────────────────────────────
    const streamSummaries = [];

    for (const stream of streamList) {
      // Students in this stream
      const studentQuery = { class: classId, status: "Active" };
      if (stream._id) studentQuery.stream = stream._id;
      const students = await Student.find(studentQuery).select("_id").lean();
      const studentIds = students.map(s => s._id);

      const streamData = {
        parentClassName: classDoc.className,
        streamName: stream.streamName,
        periods: [],
      };

      for (const tp of TEST_PERIODS) {
        const periodStats = {
          name: tp.key,
          grades: { D1: 0, D2: 0, C3: 0, C4: 0, C5: 0, C6: 0, P7: 0, P8: 0, F9: 0 },
          total: 0,
          passRate: 0,
          divisions: { "Div 1": 0, "Div 2": 0, "Div 3": 0, "Div 4": 0, "Div U": 0, "Div X": 0 },
          divisionTotal: 0,
          divisionPassRate: 0,
          divisionRank: 0
        };

        const ats = atsByPeriod[tp.key];
        if (ats.length > 0 && studentIds.length > 0) {
          // Group ATs by subject so we can compute a per-student percentage per subject
          const atBySubject = {};
          for (const at of ats) {
            const subId = at.subject.toString();
            if (!atBySubject[subId]) atBySubject[subId] = { totalMarks: 0, atIds: [] };
            atBySubject[subId].totalMarks += at.totalMarks;
            atBySubject[subId].atIds.push(at._id.toString());
          }

          const allAtIds = ats.map(a => a._id);

          // Fetch grades for these students + these ATs
          const gradesDocs = await Grade.find({
            student: { $in: studentIds },
            term,
            academicYear,
            "assessments.assessmentType": { $in: allAtIds },
          }).select("student subject assessments").lean();

          // For each grade doc, sum score per subject per student
          // Then convert to grade letter and tally
          // studentSubjectScore: { "studentId:subjectId" -> score }
          const studentSubjectScore = {};
          const seenKeys = new Set();

          for (const g of gradesDocs) {
            const sid = g.student.toString();
            const subId = g.subject.toString();
            if (!atBySubject[subId]) continue;

            for (const a of (g.assessments || [])) {
              if (!a.assessmentType) continue;
              const atId = a.assessmentType.toString();
              const uniqueKey = `${sid}-${atId}`;
              if (!atBySubject[subId].atIds.includes(atId)) continue;
              if (seenKeys.has(uniqueKey)) continue;
              seenKeys.add(uniqueKey);

              const key = `${sid}:${subId}`;
              studentSubjectScore[key] = (studentSubjectScore[key] || 0) + (a.score || 0);
            }
          }

          const studentAggregates = {}; // { sid: { count: 0, sum: 0 } }

          // Tally grade letters
          for (const [key, score] of Object.entries(studentSubjectScore)) {
            const [sid, subId] = key.split(":");
            const totalMarks = atBySubject[subId]?.totalMarks || 0;
            if (totalMarks === 0) continue;
            const pct = (score / totalMarks) * 100;
            const grade = pctToGrade(pct);

            if (GRADE_LABELS.includes(grade)) {
              periodStats.grades[grade]++;
              periodStats.total++;
            }

            let agg = parseInt(grade.replace(/\D/g, ''));
            if (isNaN(agg)) agg = 9;

            if (!studentAggregates[sid]) studentAggregates[sid] = { count: 0, sum: 0 };
            studentAggregates[sid].count++;
            studentAggregates[sid].sum += agg;
          }

          const totalSubjects = Object.keys(atBySubject).length;

          // Tally divisions
          for (const sid of studentIds) {
            const data = studentAggregates[sid];
            if (!data || data.count < totalSubjects) {
              periodStats.divisions["Div X"]++;
            } else {
              const div = aggToDivision(data.sum);
              if (periodStats.divisions[div] !== undefined) {
                periodStats.divisions[div]++;
              }
            }
            periodStats.divisionTotal++;
          }
        }

        // Pass rate: sum of D1 to C6
        const passes =
          periodStats.grades.D1 +
          periodStats.grades.D2 +
          periodStats.grades.C3 +
          periodStats.grades.C4 +
          periodStats.grades.C5 +
          periodStats.grades.C6;
        periodStats.passRate = periodStats.total > 0
          ? Math.round((passes / periodStats.total) * 100)
          : 0;

        // Division pass rate: Div 1-3 are passes
        const divPasses =
          periodStats.divisions["Div 1"] +
          periodStats.divisions["Div 2"] +
          periodStats.divisions["Div 3"];
        periodStats.divisionPassRate = periodStats.divisionTotal > 0
          ? Math.round((divPasses / periodStats.divisionTotal) * 100)
          : 0;

        streamData.periods.push(periodStats);
      }

      streamSummaries.push(streamData);
    }

    // ── 5. Rank streams per test period by pass rate ──────────────────────
    for (const tp of TEST_PERIODS) {
      const rows = streamSummaries
        .map(s => s.periods.find(p => p.name === tp.key))
        .filter(Boolean);

      // Rank by Grade pass rate
      rows.sort((a, b) => b.passRate - a.passRate);
      rows.forEach((row, i) => { row.rank = i + 1; });

      // Rank by Division pass rate
      rows.sort((a, b) => b.divisionPassRate - a.divisionPassRate);
      rows.forEach((row, i) => { row.divisionRank = i + 1; });
    }

    res.status(200).json({ success: true, data: streamSummaries });

  } catch (error) {
    console.error("Stream Summary Error MESSAGE:", error.message);
    console.error("Stream Summary Error STACK:", error.stack);
    res.status(500).json({ message: error.message || "Server error generating stream summary." });
  }
};
