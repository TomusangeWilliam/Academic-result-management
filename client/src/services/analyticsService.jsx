import api from "./api";

const getAnalysis = (
  subjectId,
  testPeriod,
  selectedClass,
  selectedStream,
  academicYear,
  term,
) => {
  return api.get("/analytics/assessment", {
    params: {
      subjectId,
      testPeriod,
      selectedClass,
      selectedStream,
      academicYear,
      term,
    },
  });
};
const getSubjectPerformance = (filters) => {
  return api.get("analytics/aGradeAnalysis", {
    params: {
      classId: filters.classId,
      streamId: filters.streamId,
      testPeriod: filters.testPeriod,
      term: filters.term,
      academicYear: filters.academicYear,
    },
  });
};

const getClassAnalytics = (filters) => {
  return api.get(`analytics/class-analytics`, {
    params: {
      classId: filters.classId,
      assessmentName: filters.assessmentName,
      term: filters.term,
      academicYear: filters.academicYear,
    },
  });
};

const getAtRiskStudents = (filters) => {
  return api.get("/analytics/at-risk", { params: filters });
};

const getGradeDistribution = (filters) => {
  return api.get("analytics/grade-distribution", { params: filters });
};

const getCumulativeClassAnalytics = (filters) => {
  return api.get(`analytics/cumulative-class-analytics`, {
    params: {
      classId: filters.classId,
      term: filters.term,
      academicYear: filters.academicYear,
    },
  });
};

const getStreamSummary = (filters) => {
  return api.get(`analytics/stream-summary`, {
    params: {
      classId: filters.classId,
      term: filters.term,
      academicYear: filters.academicYear,
    },
  });
};

export default {
  getAnalysis,
  getSubjectPerformance,
  getClassAnalytics,
  getCumulativeClassAnalytics,
  getStreamSummary,
  getAtRiskStudents,
  getGradeDistribution,
};
