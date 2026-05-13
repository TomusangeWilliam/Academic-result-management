import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import analyticsService from "../services/analyticsService";
import ClassStreamSelector from "../components/ClassStreamSelector";

const ClassPerformance = () => {
  const { t } = useTranslation();
  const printRef = useRef(null);

  const [filters, setFilters] = useState({
    classId: "",
    assessmentName: "Beginning of Term",
    term: "TERM 1 2026",
    academicYear: new Date().getFullYear().toString(),
  });

  const [result, setResult] = useState(null);
  const [streamSummary, setStreamSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const TEST_PERIODS = [
    { label: "Beginning of Term (BOT)", value: "Beginning of Term" },
    { label: "Mid Term (MT)", value: "MID Term" },
    { label: "End of Term (EOT)", value: "End of Term" },
  ];

  const handleChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const fetchReport = async () => {
    if (!filters.classId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        classId: filters.classId,
        assessmentName: filters.assessmentName,
        term: filters.term,
        academicYear: filters.academicYear,
      };
      
      // Fetch both reports in parallel
      const [res, summaryRes] = await Promise.all([
        analyticsService.getClassAnalytics(payload),
        analyticsService.getStreamSummary(payload)
      ]);
      
      setResult(res.data);
      setStreamSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=1200,height=900");
    win.document.write(`
      <html>
        <head>
          <title>Class Performance Analysis</title>
          <style>
            body { font-family: sans-serif; font-size: 10px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; }
            th { background: #eee; font-weight: bold; text-transform: uppercase; }
            .subject-name { text-align: left; font-weight: bold; }
            .m { color: #2563eb; } .f { color: #db2777; }
            .summary-hdr { background: #000; color: #fff; font-weight: bold; }
            h2, h3 { margin: 5px 0; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const GRADE_LABELS = ["D1", "D2", "C3", "C4", "C5", "C6", "P7", "P8", "F9"];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md min-h-screen">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Class Performance Analysis</h2>
        {result && (
          <button
            onClick={handlePrint}
            className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
          >
            🖨️ Print Full Report
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6 bg-gray-50 p-5 rounded-2xl border-2 border-slate-100 items-end">
        <div className="flex-1">
          <ClassStreamSelector
            selectedClass={filters.classId}
            onClassChange={(id) => setFilters(p => ({ ...p, classId: id }))}
            showStream={false}
            required={true}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-[2]">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Test Period (For Table 1)</label>
            <select
              name="assessmentName"
              value={filters.assessmentName}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700"
            >
              {TEST_PERIODS.map(tp => (
                <option key={tp.value} value={tp.value}>{tp.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Term</label>
            <select
              name="term"
              value={filters.term}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700"
            >
              <option value="TERM 1 2026">TERM 1 2026</option>
              <option value="TERM 2 2026">TERM 2 2026</option>
              <option value="TERM 3 2026">TERM 3 2026</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading || !filters.classId}
              className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Analysis"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}

      {result && result.data && (
        <div className="animate-fade-in" ref={printRef}>
          <div className="mb-8">
             <h3 className="text-lg font-bold text-gray-800 border-l-4 border-indigo-500 pl-3 mb-4 uppercase tracking-tighter">
               1. Subject Breakdown ({result.meta?.assessmentName})
             </h3>
             <div className="overflow-x-auto">
               <table className="w-full border-collapse border border-gray-300 text-xs">
                 <thead>
                   <tr className="bg-gray-800 text-white">
                     <th className="border border-gray-600 p-2 text-left" rowSpan={2}>Subject</th>
                     <th className="border border-gray-600 p-2" colSpan={3}>Students Sat</th>
                     <th className="border border-gray-600 p-2" colSpan={3}>Missed</th>
                     <th className="border border-gray-600 p-2 bg-red-900" rowSpan={2}>&lt; 50%</th>
                     <th className="border border-gray-600 p-2 bg-yellow-700" rowSpan={2}>50-74%</th>
                     <th className="border border-gray-600 p-2 bg-blue-800" rowSpan={2}>75-89%</th>
                     <th className="border border-gray-600 p-2 bg-green-800" rowSpan={2}>&ge; 90%</th>
                   </tr>
                   <tr className="bg-gray-700 text-white text-[9px]">
                     <th className="border border-gray-600 p-1">T</th>
                     <th className="border border-gray-600 p-1 text-blue-300">M</th>
                     <th className="border border-gray-600 p-1 text-pink-300">F</th>
                     <th className="border border-gray-600 p-1">T</th>
                     <th className="border border-gray-600 p-1 text-blue-300">M</th>
                     <th className="border border-gray-600 p-1 text-pink-300">F</th>
                   </tr>
                 </thead>
                 <tbody>
                   {result.data.map((subject, idx) => (
                     <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                       <td className="border border-gray-300 p-2 font-bold text-gray-800">{subject.subject}</td>
                       <td className="border border-gray-300 p-2 text-center font-bold">{subject.attended.total}</td>
                       <td className="border border-gray-300 p-2 text-center text-blue-600">{subject.attended.male}</td>
                       <td className="border border-gray-300 p-2 text-center text-pink-600">{subject.attended.female}</td>
                       <td className="border border-gray-300 p-2 text-center text-gray-400">{subject.missed.total}</td>
                       <td className="border border-gray-300 p-2 text-center text-blue-400">{subject.missed.male}</td>
                       <td className="border border-gray-300 p-2 text-center text-pink-400">{subject.missed.female}</td>
                       <td className="border border-gray-300 p-2 text-center bg-red-50 font-bold">{subject.below50.total}</td>
                       <td className="border border-gray-300 p-2 text-center bg-yellow-50 font-bold">{subject.below75.total}</td>
                       <td className="border border-gray-300 p-2 text-center bg-blue-50 font-bold">{subject.below90.total}</td>
                       <td className="border border-gray-300 p-2 text-center bg-green-50 font-bold text-green-700">{subject.above90.total}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          {streamSummary && streamSummary.data && (
            <div className="mb-8 mt-12">
               <h3 className="text-lg font-bold text-gray-800 border-l-4 border-indigo-500 pl-3 mb-4 uppercase tracking-tighter">
                 2. Stream Performance Summary (Analysis)
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full border-collapse border border-gray-400 text-xs text-center font-sans">
                   <thead>
                     <tr className="bg-gray-100 uppercase text-[10px]">
                       <th className="border border-gray-400 p-2">Class</th>
                       <th className="border border-gray-400 p-2">Stream</th>
                       <th className="border border-gray-400 p-2">Test Period</th>
                       {GRADE_LABELS.map(g => (
                         <th key={g} className="border border-gray-400 p-2 bg-slate-50">{g}</th>
                       ))}
                       <th className="border border-gray-400 p-2 bg-indigo-50">tt</th>
                       <th className="border border-gray-400 p-2 bg-indigo-50">%</th>
                       <th className="border border-gray-400 p-2 bg-indigo-50">Rank</th>
                     </tr>
                   </thead>
                   <tbody>
                     {streamSummary.data.map((stream, sIdx) => {
                       // Rank logic: sort periods across all streams by pass rate?
                       // For simplicity, we'll just show the pass rate for now.
                       return stream.periods.map((period, pIdx) => (
                         <tr key={`${sIdx}-${pIdx}`} className="hover:bg-gray-50 transition-colors">
                           {pIdx === 0 && (
                             <td className="border border-gray-400 p-2 font-bold bg-slate-50" rowSpan={3}>
                               {stream.parentClassName}
                             </td>
                           )}
                           {pIdx === 0 && (
                             <td className="border border-gray-400 p-2 font-bold text-indigo-600 bg-indigo-50/20" rowSpan={3}>
                               {stream.streamName}
                             </td>
                           )}
                           <td className="border border-gray-400 p-2 font-black text-gray-600 uppercase text-[9px] bg-slate-50/50">
                             {period.name}
                           </td>
                           {GRADE_LABELS.map(g => (
                             <td key={g} className={`border border-gray-400 p-2 ${period.grades[g] > 0 ? "font-bold text-gray-900" : "text-gray-300"}`}>
                               {period.grades[g]}
                             </td>
                           ))}
                           <td className="border border-gray-400 p-2 font-bold bg-indigo-50/30">{period.total}</td>
                           <td className="border border-gray-400 p-2 font-black text-indigo-700 bg-indigo-50/50">
                             {period.passRate}%
                           </td>
                           <td className="border border-gray-400 p-2 font-bold">-</td>
                         </tr>
                       ));
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
          
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl no-print">
             <p className="text-[10px] text-blue-700 font-bold">
               💡 <strong>Legend:</strong> [tt] = Total Subject Grades awarded. [%] = Percentage of grades that are D1 to P8 (Pass Rate). 
               The Analysis table provides a holistic view of stream performance across the entire term.
             </p>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
             <p className="text-xs text-gray-600 font-bold italic">
               💡 <strong>Note:</strong> "Sat" refers to students who have scores recorded for the selected test period. "Missed" refers to students who are active in the class but have no recorded score.
             </p>
          </div>
        </div>
      )}
      
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
           <span className="text-6xl mb-4">📊</span>
           <p className="font-bold uppercase tracking-widest text-sm">Select a class and test period to generate performance analysis</p>
        </div>
      )}
    </div>
  );
};

export default ClassPerformance;
