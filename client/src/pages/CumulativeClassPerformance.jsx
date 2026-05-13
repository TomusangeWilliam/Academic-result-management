import React, { useState, useRef } from "react";
import analyticsService from "../services/analyticsService";
import ClassStreamSelector from "../components/ClassStreamSelector";

const CumulativeClassPerformance = () => {
  const printRef = useRef(null);

  const [filters, setFilters] = useState({
    classId: "",
    term: "TERM 1 2026",
    academicYear: new Date().getFullYear().toString(),
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const fetchReport = async () => {
    if (!filters.classId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getCumulativeClassAnalytics(filters);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load cumulative report.");
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
          <title>Cumulative Class Performance</title>
          <style>
            body { font-family: sans-serif; font-size: 12px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
            th { background: #f3f4f6; }
            .subject-name { text-align: left; font-weight: bold; }
            .m { color: #2563eb; } .f { color: #db2777; }
            .range-hdr { background: #374151; color: white; }
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md min-h-screen">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Cumulative Class Performance</h2>
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">
                Sum of all Test Periods (BOT + MT + EOT)
            </p>
        </div>
        {result && (
          <button
            onClick={handlePrint}
            className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
          >
            🖨️ Print Cumulative
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6 bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100 items-end">
        <div className="flex-1">
          <ClassStreamSelector
            selectedClass={filters.classId}
            onClassChange={(id) => setFilters(p => ({ ...p, classId: id }))}
            showStream={false}
            required={true}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-[1.5]">
          <div>
            <label className="text-[10px] font-black text-indigo-400 uppercase mb-1 block ml-1">Term</label>
            <select
              name="term"
              value={filters.term}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border-2 border-indigo-200 font-bold text-slate-700"
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
              {loading ? "Calculating..." : "Generate Cumulative Analysis"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}

      {result && result.data && (
        <div className="animate-fade-in" ref={printRef}>
          <div className="mb-4">
             <h2 className="text-xl font-bold text-gray-800 underline decoration-indigo-200 underline-offset-4">
                Cumulative Analysis: {filters.term}
             </h2>
             <p className="text-sm text-gray-500 font-bold uppercase tracking-tight mt-1">
               Combined Results from BOT, Mid-Term, and End of Term
             </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-indigo-900 text-white">
                  <th className="border border-indigo-700 p-2 text-left" rowSpan={2}>Subject</th>
                  <th className="border border-indigo-700 p-2" colSpan={3}>Students Participated</th>
                  <th className="border border-indigo-700 p-2" colSpan={3}>Total Missed</th>
                  <th className="border border-indigo-700 p-2 bg-red-800" rowSpan={2}>&lt; 50%</th>
                  <th className="border border-indigo-700 p-2 bg-yellow-600" rowSpan={2}>50-74%</th>
                  <th className="border border-indigo-700 p-2 bg-blue-700" rowSpan={2}>75-89%</th>
                  <th className="border border-indigo-700 p-2 bg-green-700" rowSpan={2}>&ge; 90%</th>
                </tr>
                <tr className="bg-indigo-800 text-white text-[10px]">
                  <th className="border border-indigo-700 p-1">T</th>
                  <th className="border border-indigo-700 p-1 text-indigo-200">M</th>
                  <th className="border border-indigo-700 p-1 text-pink-200">F</th>
                  <th className="border border-indigo-700 p-1">T</th>
                  <th className="border border-indigo-700 p-1 text-indigo-200">M</th>
                  <th className="border border-indigo-700 p-1 text-pink-200">F</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((subject, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                    <td className="border border-gray-300 p-2 font-bold text-indigo-900">{subject.subject}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{subject.attended.total}</td>
                    <td className="border border-gray-300 p-2 text-center text-blue-600">{subject.attended.male}</td>
                    <td className="border border-gray-300 p-2 text-center text-pink-600">{subject.attended.female}</td>
                    <td className="border border-gray-300 p-2 text-center text-gray-400">{subject.missed.total}</td>
                    <td className="border border-gray-300 p-2 text-center text-blue-300">{subject.missed.male}</td>
                    <td className="border border-gray-300 p-2 text-center text-pink-300">{subject.missed.female}</td>
                    <td className="border border-gray-300 p-2 text-center bg-red-50 font-bold">{subject.below50.total}</td>
                    <td className="border border-gray-300 p-2 text-center bg-yellow-50 font-bold">{subject.below75.total}</td>
                    <td className="border border-gray-300 p-2 text-center bg-blue-50 font-bold">{subject.below90.total}</td>
                    <td className="border border-gray-300 p-2 text-center bg-green-50 font-bold text-green-700">{subject.above90.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
             <p className="text-[10px] text-indigo-700 font-bold leading-relaxed">
               ℹ️ <strong>Calculation Method:</strong> This report aggregates scores from all assessment types within the selected term. 
               The percentages are calculated based on the <strong>combined total possible marks</strong> (e.g., if BOT, MT, and EOT are each 100 marks, the total is 300).
               A student is counted as "Participated" if they have at least one score recorded in any of the test periods.
             </p>
          </div>
        </div>
      )}
      
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center mt-20 text-indigo-200">
           <span className="text-6xl mb-4 opacity-50">📑</span>
           <p className="font-bold uppercase tracking-widest text-sm text-indigo-300">Select a class to generate cumulative term analysis</p>
        </div>
      )}
    </div>
  );
};

export default CumulativeClassPerformance;
