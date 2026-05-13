import React, { useState, useEffect, useMemo } from 'react';
import subjectService from '../services/subjectService';
import assessmentTypeService from '../services/assessmentTypeService';
import offlineAssessmentService from '../services/offlineAssessmentService';
import authService from '../services/authService';
import userService from '../services/userService';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; 

import configService from '../services/configService';

const MONTHS = [
  "September", "October", "November", "December",
  "January", "February", "March", "April", "May", "June"
];

const AssessmentTypesPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const subjectFromLink = location.state?.subject || null;

  const [currentUser] = useState(authService.getCurrentUser());
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: 'Mid Term',
    totalMarks: 100,
    month: 'February',
    term: "TERM 1 2026",
    year: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [schoolConfig, setSchoolConfig] = useState(null);

  const STANDARD_NAMES = [
    "Beginning of Term",
    "Mid Term",
    "End of Term",
    "Monthly Test",
    "Mock Exam"
  ];

  // --- Load Config ---
  useEffect(() => {
    const fetchDefaults = async () => {
        try {
            const res = await configService.getConfig();
            if (res.data.data) {
                setSchoolConfig(res.data.data);
                setFormData(prev => ({
                    ...prev,
                    term: res.data.data.currentTerm,
                    year: res.data.data.currentAcademicYear
                }));
            }
        } catch (err) {
            console.error("Error fetching defaults:", err);
        }
    };
    fetchDefaults();
  }, []);

  // --- Pre-select subject ---
  useEffect(() => {
    if (subjectFromLink) {
      setSelectedSubject(subjectFromLink);
    }
  }, [subjectFromLink]);

  // --- Load subjects ---
  useEffect(() => {
    const loadSubjects = async () => {
      setError('');
      try {
        let subjectsList = [];
        if (currentUser.role === 'admin') {
          const res = await subjectService.getAllSubjects();
          subjectsList = res.data.data;
        } else if (currentUser.role === 'teacher') {
          const res = await userService.getProfile();
          subjectsList = res.data.subjectsTaught ? res.data.subjectsTaught.map(s => s.subject).filter(Boolean) : [];
        }
        setSubjects(subjectsList);
      } catch (err) {
        console.error("Error loading subjects:", err);
        setError(t('error') || 'Failed to load subjects.');
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, [currentUser.role, t]);

  const subjectsByGrade = useMemo(() => {
    const grouped = {};
    subjects.forEach(sub => {
      const className = sub.class?.className || 'Uncategorized';
      if (!grouped[className]) grouped[className] = [];
      grouped[className].push(sub);
    });
    return grouped;
  }, [subjects]);

  // --- Fetch assessments ---
  const fetchAssessments = async () => {
    if (!selectedSubject) return;
    setAssessmentsLoading(true);
    setError('');
    
    let onlineData = [];
    let offlineData = [];

    try {
        const res = await assessmentTypeService.getBySubject(selectedSubject._id);
        if (res.data && Array.isArray(res.data.data)) {
            onlineData = res.data.data;
        }
    } catch (err) {
        console.log("Using only offline items.", err);
    }

    const allLocal = offlineAssessmentService.getLocalAssessments();
    offlineData = allLocal.filter(a => a.subject === selectedSubject._id);

    const combined = [...onlineData, ...offlineData];
    const uniqueMap = new Map();
    combined.forEach(item => {
        const key = `${item.name}-${item.month}-${item.term}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
        }
    });
    const merged = Array.from(uniqueMap.values()).sort(
        (a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month)
    );
    
    setAssessmentTypes(merged);
    setAssessmentsLoading(false);
  };

  useEffect(() => {
    fetchAssessments();
  }, [selectedSubject]);

  // --- Duplicate Detection ---
  const isDuplicate = useMemo(() => {
    if (!formData.name || !formData.month || !formData.term) return false;
    return assessmentTypes.some(at => 
        at._id !== editingId &&
        at.name.toLowerCase().includes(formData.name.toLowerCase().split(' ')[0]) && // Match "Mid" in "Mid Term"
        at.month === formData.month &&
        at.term === formData.term
    );
  }, [formData, assessmentTypes, editingId]);

  // --- Form Handlers ---
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubject) return alert(t('select_class') || 'Select a subject first.');
    if (isDuplicate) return alert("An assessment for this period already exists.");
    
    setSaving(true);
    setError('');

    const payload = { 
        ...formData, 
        subjectId: selectedSubject._id, 
        classId: selectedSubject.class?._id || selectedSubject.class 
    };

    if (!navigator.onLine) {
        try {
            offlineAssessmentService.addLocalAssessment({ ...payload, subject: selectedSubject._id });
            alert("Offline: Assessment created locally!");
            await fetchAssessments(); 
            setFormData({ 
                name: 'Mid Term', 
                totalMarks: 100, 
                month: 'February', 
                term: schoolConfig?.currentTerm || "TERM 1 2026", 
                year: schoolConfig?.currentAcademicYear || '' 
            });
            setEditingId(null);
        } catch (err) {
            setError("Failed to save offline.");
        }
        setSaving(false);
        return;
    }

    try {
      if (editingId && !editingId.startsWith('TEMP_')) {
        await assessmentTypeService.update(editingId, payload);
      } else {
        await assessmentTypeService.create(payload);
      }
      await fetchAssessments();
      setFormData({ 
          name: 'Mid Term', 
          totalMarks: 100, 
          month: 'February', 
          term: schoolConfig?.currentTerm || "TERM 1 2026", 
          year: schoolConfig?.currentAcademicYear || '' 
      });
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (assessment) => {
    setEditingId(assessment._id);
    setFormData({
      name: assessment.name,
      totalMarks: assessment.totalMarks,
      month: assessment.month,
      term: assessment.term,
      year: assessment.year,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('delete') + '?')) return;
    try {
      await assessmentTypeService.remove(id);
      setAssessmentTypes(assessmentTypes.filter(at => at._id !== id));
    } catch {
      setError('Failed to delete. It may contain grades.');
    }
  };

  if (loading) return <p className="text-center mt-8">{t('loading')}</p>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('manage_assessments')}</h2>
          <p className="text-gray-500 mt-1">Configure grading rules and test periods for your classes.</p>
        </div>
        <div className="hidden md:block">
            <span className="bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-bold border border-pink-200">
                School Standard: 100 Marks
            </span>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* SUBJECT SELECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-gray-200 p-1 rounded">📚</span> Select Class & Subject
          </h3>
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.keys(subjectsByGrade).length > 0 ? (
              Object.keys(subjectsByGrade).sort().map(grade => (
                <div key={grade} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-3">{grade}</h4>
                  <div className="flex flex-col gap-2">
                    {subjectsByGrade[grade].map(sub => (
                      <button
                        key={sub._id}
                        onClick={() => setSelectedSubject(sub)}
                        className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                          selectedSubject?._id === sub._id
                            ? 'bg-pink-600 text-white shadow-lg shadow-pink-200 scale-[1.02]'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No subjects available.</p>
            )}
          </div>
        </div>

        {/* FORM & LIST */}
        <div className="lg:col-span-3 space-y-6">
          {selectedSubject ? (
            <>
              {/* FORM CARD */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{editingId ? 'Edit' : 'New'} Assessment</h3>
                    <p className="text-gray-400 text-sm">For {selectedSubject.name} | {selectedSubject.class?.className}</p>
                  </div>
                  {isDuplicate && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black animate-bounce">
                        DUPLICATE DETECTED
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 ml-1">Assessment Period</label>
                        <select 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            required 
                            className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl focus:border-pink-500 transition-colors font-bold text-gray-800"
                        >
                            {STANDARD_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 ml-1">Total Marks</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                name="totalMarks" 
                                value={formData.totalMarks} 
                                onChange={handleChange} 
                                min="1" 
                                required 
                                className={`w-full bg-gray-50 border-2 p-4 rounded-xl focus:border-pink-500 transition-colors font-bold ${formData.totalMarks < 100 ? 'border-orange-300 text-orange-600' : 'border-gray-100 text-gray-800'}`}
                            />
                            {formData.totalMarks < 100 && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500 uppercase">Below Standard</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 ml-1">Term</label>
                        <select name="term" value={formData.term} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl focus:border-pink-500 transition-colors font-bold text-gray-800">
                            <option value="TERM 1 2026">Term 1 2026</option>
                            <option value="TERM 2 2026">Term 2 2026</option>
                            <option value="TERM 3 2026">Term 3 2026</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 ml-1">Scheduled Month</label>
                        <select name="month" value={formData.month} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl focus:border-pink-500 transition-colors font-bold text-gray-800">
                            {MONTHS.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                        type="submit" 
                        disabled={saving || isDuplicate} 
                        className={`flex-1 py-4 rounded-2xl font-black text-white text-lg transition-all transform active:scale-95 shadow-lg ${
                            saving || isDuplicate 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700 shadow-green-100'
                        }`}
                    >
                        {saving ? 'Saving...' : editingId ? 'Update Assessment' : 'Confirm & Create'}
                    </button>
                    {editingId && (
                        <button 
                            type="button" 
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ name: 'Mid Term', totalMarks: 100, month: 'October', term: 'TERM 1 2026', year: schoolConfig?.currentAcademicYear || '' });
                            }} 
                            className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                    )}
                  </div>
                </form>
              </div>

              {/* LIST CARD */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                        <span className="bg-pink-100 p-1 rounded">📋</span> Configured Assessments
                    </h4>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                        {assessmentTypes.length} Total
                    </span>
                </div>

                {assessmentsLoading ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div></div>
                ) : assessmentTypes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessmentTypes.map(a => (
                      <div key={a._id} className="group relative bg-white p-5 rounded-2xl border-2 border-gray-50 hover:border-pink-200 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h5 className="font-black text-gray-900 group-hover:text-pink-600 transition-colors">{a.name}</h5>
                                <p className="text-xs font-bold text-gray-400 uppercase">{a.month} | {a.term}</p>
                            </div>
                            <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-black">
                                {a.totalMarks}
                            </div>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                            <Link
                                to="/grade-sheet"
                                state={{
                                    assessmentType: a,
                                    subject: { id: selectedSubject._id, name: selectedSubject.name, classId: selectedSubject.class?._id || selectedSubject.class }
                                }}
                                className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1"
                            >
                                GO TO GRADES →
                            </Link>
                            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(a)} className="text-blue-500 hover:text-blue-700 font-bold text-xs uppercase tracking-wider">Edit</button>
                                <button onClick={() => handleDelete(a._id)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-wider">Delete</button>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold italic">No assessments created for this subject yet.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 h-[500px] flex flex-col items-center justify-center text-center p-12">
                <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-6">👈</div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">Ready to Configure</h3>
                <p className="text-gray-400 max-w-sm">Please select a subject from the left panel to manage its assessment periods and grading rules.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentTypesPage;