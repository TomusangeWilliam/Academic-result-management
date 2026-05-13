import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import analyticsService from "../services/analyticsService";
import ClassStreamSelector from "../components/ClassStreamSelector";

/* ─── tiny helper ──────────────────────────────────────────────────────────── */
const pct = (val, total) =>
  total > 0 ? `${Math.round((val / total) * 100)}%` : "0%";

/* ── Grading Scale Config ─────────────────────────────────────────────────── */
const GRADING_SCALE = [
  { label: "D1", min: 90, max: 100, cls: "bg-emerald-100 text-emerald-800", border: "border-emerald-200" },
  { label: "D2", min: 80, max: 89,  cls: "bg-green-100 text-green-800",   border: "border-green-200" },
  { label: "C3", min: 70, max: 79,  cls: "bg-lime-100 text-lime-800",     border: "border-lime-200" },
  { label: "C4", min: 60, max: 69,  cls: "bg-yellow-100 text-yellow-800", border: "border-yellow-200" },
  { label: "C5", min: 50, max: 59,  cls: "bg-orange-100 text-orange-800", border: "border-orange-200" },
  { label: "C6", min: 45, max: 49,  cls: "bg-orange-200 text-orange-900", border: "border-orange-300" },
  { label: "P7", min: 40, max: 44,  cls: "bg-red-100 text-red-800",      border: "border-red-200" },
  { label: "P8", min: 35, max: 39,  cls: "bg-red-200 text-red-900",      border: "border-red-300" },
  { label: "F9", min: 0,  max: 34,  cls: "bg-red-300 text-red-900",      border: "border-red-400" },
];

/* ─── Range cell for the perf table ──────────────────────────────────────── */
const RangeCol = ({ bucket, total, bg }) => {
  const p = total > 0 ? Math.round((bucket.total / total) * 100) : 0;
  const empty = bucket.total === 0;
  return (
    <td
      className={`border border-gray-300 px-1 py-1 text-center align-top ${bg} ${empty ? "text-gray-300" : ""}`}
    >
      <div
        className={`font-bold text-[11px] ${empty ? "text-gray-300" : "text-gray-800"}`}
      >
        {bucket.total > 0 ? `${bucket.total} (${p}%)` : "0"}
      </div>
      <div className="flex justify-center gap-1 text-[9px]">
        <span className="text-blue-500">M{bucket.m}</span>
        <span className="text-pink-500">F{bucket.f}</span>
      </div>
    </td>
  );
};

/* ─── Subject Performance Summary Table ─────────────────────────────────── */
const PerfTable = ({ perfData }) => {
  if (!perfData || perfData.length === 0) return null;

  const rows = perfData; // show all subjects

  return (
    <div className="mt-10">
      <h3 className="text-lg font-bold text-gray-800 mb-2 border-b-2 border-gray-700 pb-1">
        Subject Performance Summary
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({rows.length} subject{rows.length !== 1 ? "s" : ""} —
          <span className="text-green-600 font-bold"> green</span> = avg ≥ 50%,
          <span className="text-red-500 font-bold"> red</span> = below 50%)
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="border-collapse border border-gray-600 text-xs w-full">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th
                className="border border-gray-600 px-2 py-2 text-center w-8"
                rowSpan={3}
              >
                #
              </th>
              <th
                className="border border-gray-600 px-2 py-2 text-left"
                style={{ minWidth: 120 }}
                rowSpan={3}
              >
                Subject
              </th>
              <th
                className="border border-gray-600 px-2 py-2 text-center"
                style={{ minWidth: 60 }}
                rowSpan={3}
              >
                Avg %
              </th>
              <th
                className="border border-gray-600 px-2 py-2 text-center"
                style={{ minWidth: 60 }}
                rowSpan={3}
              >
                Pass Rate
              </th>
              <th
                className="border border-gray-600 px-1 py-2 text-center"
                rowSpan={3}
              >
                Sat
              </th>
              <th
                colSpan={4}
                className="border border-gray-600 px-2 py-1 text-center bg-gray-700"
              >
                Score Distribution
              </th>
            </tr>
            <tr className="text-white text-[10px] uppercase">
              <th className="border border-gray-500 py-1 bg-red-900">
                &lt; 50%
              </th>
              <th className="border border-gray-500 py-1 bg-yellow-700">
                50–75%
              </th>
              <th className="border border-gray-500 py-1 bg-blue-800">
                75–90%
              </th>
              <th className="border border-gray-500 py-1 bg-green-800">
                &gt; 90%
              </th>
            </tr>
            <tr className="bg-gray-200 text-gray-700 text-[9px] font-bold">
              {["bg-red-50", "bg-yellow-50", "bg-blue-50", "bg-green-50"].map(
                (bg, i) => (
                  <th key={i} className={`border border-gray-300 py-1 ${bg}`}>
                    <div className="flex justify-center gap-1">
                      <span className="text-blue-600">M</span>
                      <span className="text-pink-600">F</span>
                    </div>
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const avgPct =
                row.totalPossibleScore > 0
                  ? (row.averageScore / row.totalPossibleScore) * 100
                  : 0;
              const passNum = parseFloat(row.passRate);
              const avgBg =
                avgPct >= 75
                  ? "bg-green-50"
                  : avgPct >= 50
                    ? "bg-yellow-50"
                    : "bg-red-50";
              const avgTxt =
                avgPct >= 75
                  ? "text-green-700 font-black"
                  : avgPct >= 50
                    ? "text-yellow-700 font-black"
                    : "text-red-600 font-black";
              const passBg = passNum >= 50 ? "bg-green-50" : "bg-red-50";
              const passTxt =
                passNum >= 50
                  ? "text-green-700 font-bold"
                  : "text-red-600 font-bold";
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 text-center text-gray-500 font-bold px-1 py-1">
                    #{i + 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 font-bold text-gray-800 whitespace-nowrap">
                    {row.subjectName}
                    <span className="text-gray-400 text-[9px] font-normal ml-1">
                      /{row.totalPossibleScore}
                    </span>
                  </td>
                  <td
                    className={`border border-gray-300 text-center px-1 py-1 ${avgBg}`}
                  >
                    <span className={avgTxt}>{avgPct.toFixed(1)}%</span>
                    <div className="text-[9px] text-gray-400">
                      {row.averageScore}
                    </div>
                  </td>
                  <td
                    className={`border border-gray-300 text-center px-1 py-1 ${passBg}`}
                  >
                    <span className={passTxt}>{row.passRate}</span>
                  </td>
                  <td className="border border-gray-300 text-center px-1 py-1 text-gray-600">
                    {row.submittedGrades}
                  </td>
                  <RangeCol
                    bucket={row.ranges.below50}
                    total={row.submittedGrades}
                    bg="bg-red-50"
                  />
                  <RangeCol
                    bucket={row.ranges.below75}
                    total={row.submittedGrades}
                    bg="bg-yellow-50"
                  />
                  <RangeCol
                    bucket={row.ranges.below90}
                    total={row.submittedGrades}
                    bg="bg-blue-50"
                  />
                  <RangeCol
                    bucket={row.ranges.above90}
                    total={row.submittedGrades}
                    bg="bg-green-50"
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── one "grade column" inside a subject row ─────────────────────────────── */
const GradeCell = ({ counts, total, isLast }) => {
  const colPct = pct(counts.total, total);
  const isEmpty = counts.total === 0;
  return (
    <>
      {/* header-row version rendered in <thead> separately */}
      {/* data cells: count(%) / M | F */}
      <td
        className={`border border-gray-400 text-center text-[10px] px-0.5 py-0.5 align-top ${
          isLast ? "bg-red-50" : ""
        } ${isEmpty ? "text-gray-300" : ""}`}
        style={{ minWidth: 38 }}
      >
        <div
          className={`font-bold text-[11px] ${isEmpty ? "text-gray-300" : "text-gray-800"}`}
        >
          {counts.total > 0 ? `${counts.total} (${colPct})` : "0"}
        </div>
        <div className="flex justify-center gap-1 text-[9px]">
          <span className="text-blue-600">M{counts.m}</span>
          <span className="text-pink-600">F{counts.f}</span>
        </div>
      </td>
    </>
  );
};

/* ─── printable table component ───────────────────────────────────────────── */
const SubjectAnalysisTable = ({
  gradeLabels,
  data,
  totalStudents,
  filters,
  schoolName,
}) => {
  /* compute column totals */
  const totals = { sat: 0 };
  gradeLabels.forEach((g) => {
    totals[g] = { m: 0, f: 0, total: 0 };
  });
  data.forEach((row) => {
    totals.sat += row.submittedGrades || 0;
    gradeLabels.forEach((g) => {
      totals[g].m += row.gradeCounts[g]?.m ?? 0;
      totals[g].f += row.gradeCounts[g]?.f ?? 0;
      totals[g].total += row.gradeCounts[g]?.total ?? 0;
    });
  });

  const GRADE_COLORS = {
    D1: "bg-emerald-100",
    D2: "bg-green-100",
    C3: "bg-lime-100",
    C4: "bg-yellow-100",
    C5: "bg-orange-100",
    C6: "bg-orange-200",
    P7: "bg-red-100",
    P8: "bg-red-200",
    F9: "bg-red-300",
    "-": "bg-gray-100",
  };

  return (
    <div className="overflow-x-auto">
      <table
        className="border-collapse border border-gray-700 text-xs w-full"
        style={{ tableLayout: "auto" }}
      >
        {/* ── THEAD ─────────────────────────────────────────── */}
        <thead>
          <tr className="bg-gray-800 text-white">
            <th
              className="border border-gray-600 px-2 py-2 text-left font-bold text-xs"
              style={{ minWidth: 110 }}
              rowSpan={2}
            >
              Subject
            </th>
            <th
              className="border border-gray-600 px-2 py-2 text-center font-bold text-xs bg-gray-700"
              style={{ minWidth: 40 }}
              rowSpan={2}
            >
              Sat
            </th>
            {gradeLabels.map((g) => (
              <th
                key={g}
                className={`border border-gray-600 px-1 py-2 text-center font-bold text-xs ${GRADE_COLORS[g] ?? ""} text-gray-800`}
                style={{ minWidth: 38 }}
              >
                {g}
              </th>
            ))}
          </tr>
          <tr className="bg-gray-700 text-white text-[9px]">
            {gradeLabels.map((g) => (
              <th
                key={g}
                className={`border border-gray-500 px-0 py-0.5 text-center ${GRADE_COLORS[g] ?? ""} text-gray-700`}
              >
                <div className="flex justify-center gap-1">
                  <span className="text-blue-700 font-bold">M</span>
                  <span className="text-pink-700 font-bold">F</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── TBODY ─────────────────────────────────────────── */}
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-gray-400 px-2 py-1 font-bold text-gray-800 text-xs whitespace-nowrap">
                {row.subjectName}
              </td>
              <td className="border border-gray-400 px-1 py-1 text-center font-bold text-gray-600 bg-gray-50">
                {row.submittedGrades}
              </td>
              {gradeLabels.map((g, gi) => {
                const counts = row.gradeCounts[g] ?? { m: 0, f: 0, total: 0 };
                const isEmpty = counts.total === 0;

                // Use satCount for grade percentages, totalStudents for missed (-)
                const denominator = g === "-" ? totalStudents : row.submittedGrades;

                return (
                  <td
                    key={g}
                    className={`border border-gray-400 text-center px-0.5 py-0.5 align-top ${GRADE_COLORS[g] ?? ""} ${isEmpty ? "text-gray-300" : ""}`}
                  >
                    <div
                      className={`font-bold text-[11px] ${isEmpty ? "text-gray-300" : "text-gray-800"}`}
                    >
                      {counts.total > 0
                        ? `${counts.total} (${pct(counts.total, denominator)})`
                        : "0"}
                    </div>
                    <div className="flex justify-center gap-1 text-[9px]">
                      <span className="text-blue-600">M{counts.m}</span>
                      <span className="text-pink-600">F{counts.f}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="bg-gray-800 text-white font-bold">
            <td className="border border-gray-600 px-2 py-1 text-xs text-center">
              TOTAL
            </td>
            <td className="border border-gray-600 px-1 py-1 text-center bg-gray-900">
              {totals.sat}
            </td>
            {gradeLabels.map((g) => {
              const c = totals[g];
              const isEmpty = c.total === 0;
              return (
                <td
                  key={g}
                  className={`border border-gray-600 text-center px-0.5 py-1 ${GRADE_COLORS[g] ?? ""} ${isEmpty ? "text-gray-400" : "text-gray-900"}`}
                >
                  <div className="font-black text-[11px]">{c.total}</div>
                  <div className="flex justify-center gap-1 text-[9px]">
                    <span className="text-blue-700">M{c.m}</span>
                    <span className="text-pink-700">F{c.f}</span>
                  </div>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/* ─── MAIN PAGE ────────────────────────────────────────────────────────────── */
const SubjectPerformance = () => {
  const { t } = useTranslation();
  const printRef = useRef(null);

  const TEST_PERIODS = [
    { label: "Beginning of Term (BOT)", value: "Beginning of Term" },
    { label: "Mid Term (MT)", value: "MID Term" },
    { label: "End of Term (EOT)", value: "End of Term" },
  ];

  const [filters, setFilters] = useState({
    classId: "",
    streamId: "all",
    testPeriod: "Beginning of Term",
    term: "",
    academicYear: new Date().getFullYear().toString(),
  });

  const [result, setResult] = useState(null);
  const [perfResult, setPerfResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [className, setClassName] = useState("");

  const handleChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const fetchReport = async () => {
    if (!filters.classId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPerfResult(null);
    try {
      // Run both requests independently so one failing doesn't kill the other
      const [distRes, perfRes] = await Promise.allSettled([
        analyticsService.getGradeDistribution(filters),
        analyticsService.getSubjectPerformance(filters),
      ]);
      if (distRes.status === "fulfilled") setResult(distRes.value.data);
      else
        setError(
          distRes.reason?.response?.data?.message ||
            "Failed to load grade distribution.",
        );
      if (perfRes.status === "fulfilled") setPerfResult(perfRes.value.data);
      else console.error("Perf table error:", perfRes.reason);
    } catch (err) {
      console.error(err);
      setError("Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  /* ── print handler ────────────────────────────────────────────────────── */
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=1200,height=900");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subject Analysis</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 16px; }
            h2 { font-size: 15px; font-weight: bold; margin-bottom: 4px; }
            h3 { font-size: 12px; font-weight: bold; margin: 16px 0 6px; border-bottom: 2px solid #374151; padding-bottom: 4px; }
            p.meta { font-size: 10px; color: #555; margin-bottom: 12px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
            th, td { border: 1px solid #666; padding: 3px 4px; text-align: center; font-size: 10px; }
            th { background: #e5e7eb; font-weight: bold; }
            th.subject-th { text-align: left; background: #1f2937; color: white; }
            td.subject-td { text-align: left; font-weight: bold; }
            tr.total-row td { background: #374151; color: white; font-weight: bold; }
            tr.total-row td.subject-td { background: #111827; }
            .grade-D1 { background: #d1fae5; } .grade-D2 { background: #dcfce7; }
            .grade-C3 { background: #ecfccb; } .grade-C4 { background: #fef9c3; }
            .grade-C5 { background: #ffedd5; } .grade-C6 { background: #fed7aa; }
            .grade-P7 { background: #fee2e2; } .grade-P8 { background: #fecaca; }
            .grade-F9 { background: #fca5a5; } .grade-- { background: #f3f4f6; }
            .mf { font-size: 9px; color: #555; }
            .mf .m { color: #2563eb; } .mf .f { color: #db2777; }
            /* perf table */
            th.perf-hdr { background: #1e3a5f; color: white; }
            th.perf-range { background: #374151; color: white; }
            td.avg-good  { background: #d1fae5; font-weight: bold; color: #065f46; }
            td.avg-ok    { background: #fef9c3; font-weight: bold; color: #713f12; }
            td.avg-bad   { background: #fee2e2; font-weight: bold; color: #991b1b; }
            td.pass-good { background: #d1fae5; color: #065f46; font-weight: bold; }
            td.pass-bad  { background: #fee2e2; color: #991b1b; font-weight: bold; }
            .r-below50 { background: #fee2e2; } .r-below75 { background: #fef9c3; }
            .r-below90 { background: #dbeafe; } .r-above90 { background: #d1fae5; }
            @media print { body { padding: 8px; } }
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

  /* ── derived data ────────────────────────────────────────────────────── */
  const gradeLabels = result?.gradeLabels ?? [];
  const data = result?.data ?? [];
  const totalStudents = result?.totalStudents ?? 0;

  /* ── totals for the PDF-renderable hidden section ─────────────────────── */
  const totals = {};
  gradeLabels.forEach((g) => {
    totals[g] = { m: 0, f: 0, total: 0 };
  });
  data.forEach((row) => {
    gradeLabels.forEach((g) => {
      totals[g].m += row.gradeCounts[g]?.m ?? 0;
      totals[g].f += row.gradeCounts[g]?.f ?? 0;
      totals[g].total += row.gradeCounts[g]?.total ?? 0;
    });
  });

  const GRADE_COLORS = {
    D1: "bg-emerald-100",
    D2: "bg-green-100",
    C3: "bg-lime-100",
    C4: "bg-yellow-100",
    C5: "bg-orange-100",
    C6: "bg-orange-200",
    P7: "bg-red-100",
    P8: "bg-red-200",
    F9: "bg-red-300",
    "-": "bg-gray-100",
  };
  const PDF_GRADE_CLASS = {
    D1: "grade-D1",
    D2: "grade-D2",
    C3: "grade-C3",
    C4: "grade-C4",
    C5: "grade-C5",
    C6: "grade-C6",
    P7: "grade-P7",
    P8: "grade-P8",
    F9: "grade-F9",
    "-": "grade--",
  };

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="bg-white p-6 rounded-lg shadow-md min-h-screen">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Subject Analysis</h2>
        {result && (
          <button
            onClick={handlePrint}
            className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
          >
            🖨️ Print / PDF
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6 bg-gray-50 p-5 rounded-2xl border-2 border-slate-100 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ClassStreamSelector
            selectedClass={filters.classId}
            onClassChange={(id) => {
              setFilters((prev) => ({ ...prev, classId: id }));
            }}
            selectedStream={filters.streamId}
            onStreamChange={(id) =>
              setFilters((prev) => ({ ...prev, streamId: id || "all" }))
            }
            required={true}
            showAllStreamsOption={true}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">
              Test Period
            </label>
            <select
              name="testPeriod"
              value={filters.testPeriod}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700"
            >
              {TEST_PERIODS.map((tp) => (
                <option key={tp.value} value={tp.value}>
                  {tp.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">
              Term <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              name="term"
              value={filters.term}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700"
            >
              <option value="">All Terms</option>
              <option value="TERM 1 2026">TERM 1 2026</option>
              <option value="TERM 2 2026">TERM 2 2026</option>
              <option value="TERM 3 2026">TERM 3 2026</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">
              Academic Year
            </label>
            <input
              type="text"
              name="academicYear"
              value={filters.academicYear}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading || !filters.classId}
              className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded p-4 mb-4">
          {error}
        </div>
      )}

      {/* ── ON-SCREEN TABLE ─────────────────────────────────────────────── */}
      {result && data.length > 0 && (
        <div className="animate-fade-in">
          {/* meta info */}
          <div className="mb-3 text-sm text-gray-500">
            <span className="font-bold text-gray-700">
              {TEST_PERIODS.find((tp) => tp.value === filters.testPeriod)
                ?.label || filters.testPeriod}
            </span>
            {filters.term && (
              <>
                {" "}
                ·{" "}
                <span className="font-bold text-gray-700">
                  {filters.term}
                </span>
              </>
            )}
            {" · "}
            <span className="font-bold text-gray-700">
              {filters.academicYear}
            </span>
            {" · "}
            <span>{totalStudents} students</span>
          </div>

          <SubjectAnalysisTable
            gradeLabels={gradeLabels}
            data={data}
            totalStudents={totalStudents}
            filters={filters}
          />

          {/* ── Legend ─────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
            {gradeLabels.map((g) => (
              <span
                key={g}
                className={`px-2 py-0.5 rounded font-bold border border-gray-300 ${GRADE_COLORS[g]}`}
              >
                {g}
              </span>
            ))}
            <span className="text-gray-500 ml-3 self-center font-bold bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
              Format: count (%) &nbsp;|&nbsp;{" "}
              <span className="text-blue-600 font-black">M</span>=Male &nbsp;
              <span className="text-pink-600 font-black">F</span>=Female
            </span>
          </div>
        </div>
      )}

      {result && data.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-10">
          No data found for selected filters.
        </p>
      )}

      {/* ── SECOND TABLE ─────────────────────────────────────────────── */}
      <PerfTable perfData={perfResult?.data} />

      {/* ── SCREEN GRADING SCALE ────────────────────────────────────────── */}
      {result && data.length > 0 && (
        <div className="mt-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-6 h-px bg-gray-200"></span>
            Grading Scale Reference
            <span className="flex-1 h-px bg-gray-200"></span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            {GRADING_SCALE.map((g) => (
              <div
                key={g.label}
                className={`${g.cls} border ${g.border} p-3 rounded-2xl text-center shadow-sm hover:shadow-md transition-shadow`}
              >
                <span className="block text-xl font-black mb-0.5">
                  {g.label}
                </span>
                <span className="text-[10px] opacity-70 font-black tracking-tight">
                  {g.min}
                  {g.max === 100 ? "+" : ` – ${g.max}`}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HIDDEN PRINTABLE CONTENT ────────────────────────────────────── */}
      <div ref={printRef} style={{ display: "none" }}>
        <h2>Subject Analysis</h2>
        <p className="meta">
          {TEST_PERIODS.find((tp) => tp.value === filters.testPeriod)?.label ||
            filters.testPeriod}
          {filters.term && ` | ${filters.term}`}
          &nbsp;|&nbsp; Academic Year: {filters.academicYear}
          &nbsp;|&nbsp; Total Students: {totalStudents}
        </p>

        {data.length > 0 && (
          <>
            <h3>Subject Analysis — Grade Distribution</h3>
            <table>
              <thead>
                <tr>
                  <th
                    className="subject-th"
                    rowSpan={2}
                    style={{ textAlign: "left" }}
                  >
                    Subject
                  </th>
                  <th className="subject-th" rowSpan={2}>
                    Sat
                  </th>
                  {gradeLabels.map((g) => (
                    <th key={g} className={PDF_GRADE_CLASS[g]}>
                      {g}
                    </th>
                  ))}
                </tr>
                <tr>
                  {gradeLabels.map((g) => (
                    <th key={g} className={PDF_GRADE_CLASS[g]}>
                      <span className="mf">
                        <span className="m">M</span>{" "}
                        <span className="f">F</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td className="subject-td">{row.subjectName}</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {row.submittedGrades}
                    </td>
                    {gradeLabels.map((g) => {
                      const c = row.gradeCounts[g] ?? { m: 0, f: 0, total: 0 };
                      const denominator =
                        g === "-" ? totalStudents : row.submittedGrades;
                      return (
                        <td key={g} className={PDF_GRADE_CLASS[g]}>
                          {c.total > 0 ? (
                            <>
                              <strong>{c.total}</strong> (
                              {pct(c.total, denominator)})
                            </>
                          ) : (
                            0
                          )}
                          <br />
                          <span className="mf">
                            <span className="m">M{c.m}</span>{" "}
                            <span className="f">F{c.f}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td className="subject-td">TOTAL</td>
                  <td style={{ textAlign: "center" }}>{totals.sat}</td>
                  {gradeLabels.map((g) => {
                    const c = totals[g];
                    return (
                      <td key={g} className={PDF_GRADE_CLASS[g]}>
                        <strong>{c.total}</strong>
                        <br />
                        <span className="mf">
                          <span className="m">M{c.m}</span>{" "}
                          <span className="f">F{c.f}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
            <p style={{ fontSize: "9px", color: "#555", marginTop: "2px", marginBottom: "15px", fontWeight: "bold" }}>
              Format: count (%) | M=Male F=Female
            </p>

            {/* perf table in PDF */}
            {perfResult &&
              perfResult.data &&
              (() => {
                const perfRows = perfResult.data || [];
                if (!perfRows.length) return null;
                return (
                  <>
                    <h3>Subject Performance Summary</h3>
                    <table>
                      <thead>
                        <tr>
                          <th
                            className="perf-hdr"
                            rowSpan={3}
                            style={{ textAlign: "left" }}
                          >
                            #
                          </th>
                          <th
                            className="perf-hdr"
                            rowSpan={3}
                            style={{ textAlign: "left" }}
                          >
                            Subject
                          </th>
                          <th className="perf-hdr" rowSpan={3}>
                            Avg %
                          </th>
                          <th className="perf-hdr" rowSpan={3}>
                            Pass Rate
                          </th>
                          <th className="perf-hdr" rowSpan={3}>
                            Sat
                          </th>
                          <th colSpan={4} className="perf-range">
                            Score Distribution
                          </th>
                        </tr>
                        <tr>
                          <th className="perf-range">&lt; 50%</th>
                          <th className="perf-range">50–75%</th>
                          <th className="perf-range">75–90%</th>
                          <th className="perf-range">&gt; 90%</th>
                        </tr>
                        <tr>
                          <th className="r-below50">
                            <span className="mf">
                              <span className="m">M</span>{" "}
                              <span className="f">F</span>
                            </span>
                          </th>
                          <th className="r-below75">
                            <span className="mf">
                              <span className="m">M</span>{" "}
                              <span className="f">F</span>
                            </span>
                          </th>
                          <th className="r-below90">
                            <span className="mf">
                              <span className="m">M</span>{" "}
                              <span className="f">F</span>
                            </span>
                          </th>
                          <th className="r-above90">
                            <span className="mf">
                              <span className="m">M</span>{" "}
                              <span className="f">F</span>
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {perfRows.map((row, i) => {
                          const avgPct =
                            row.totalPossibleScore > 0
                              ? (
                                  (row.averageScore / row.totalPossibleScore) *
                                  100
                                ).toFixed(1)
                              : "0.0";
                          const passNum = parseFloat(row.passRate);
                          const PdfRangeCell = ({ bucket, total, cls }) => {
                            const p =
                              total > 0
                                ? Math.round((bucket.total / total) * 100)
                                : 0;
                            return (
                              <td className={cls}>
                                {bucket.total > 0 ? (
                                  <>
                                    <strong>{bucket.total}</strong> ({p}%)
                                  </>
                                ) : (
                                  0
                                )}
                                <br />
                                <span className="mf">
                                  <span className="m">M{bucket.m}</span>{" "}
                                  <span className="f">F{bucket.f}</span>
                                </span>
                              </td>
                            );
                          };
                          return (
                            <tr key={i}>
                              <td className="subject-td">#{i + 1}</td>
                              <td className="subject-td">
                                {row.subjectName}{" "}
                                <span
                                  style={{
                                    color: "#999",
                                    fontWeight: "normal",
                                  }}
                                >
                                  /{row.totalPossibleScore}
                                </span>
                              </td>
                              <td
                                className={
                                  parseFloat(avgPct) >= 75
                                    ? "avg-good"
                                    : parseFloat(avgPct) >= 50
                                      ? "avg-ok"
                                      : "avg-bad"
                                }
                              >
                                {avgPct}%<br />
                                <span
                                  style={{ fontSize: "8px", color: "#555" }}
                                >
                                  {row.averageScore}
                                </span>
                              </td>
                              <td
                                className={
                                  passNum >= 50 ? "pass-good" : "pass-bad"
                                }
                              >
                                {row.passRate}
                              </td>
                              <td>{row.submittedGrades}</td>
                              <PdfRangeCell
                                bucket={row.ranges.below50}
                                total={row.submittedGrades}
                                cls="r-below50"
                              />
                              <PdfRangeCell
                                bucket={row.ranges.below75}
                                total={row.submittedGrades}
                                cls="r-below75"
                              />
                              <PdfRangeCell
                                bucket={row.ranges.below90}
                                total={row.submittedGrades}
                                cls="r-below90"
                              />
                              <PdfRangeCell
                                bucket={row.ranges.above90}
                                total={row.submittedGrades}
                                cls="r-above90"
                              />
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            {/* ── PDF GRADING SCALE ────────────────────────────────────── */}
            <div style={{ marginTop: "30px", breakInside: "avoid" }}>
              <h4 style={{ fontSize: "12px", borderBottom: "2px solid #333", paddingBottom: "4px", marginBottom: "10px", color: "#1f2937", textTransform: "uppercase", letterSpacing: "1px" }}>
                Grading Scale Reference
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                    <tr>
                        {GRADING_SCALE.map(g => (
                            <th key={g.label} style={{ border: "1px solid #888", padding: "6px 2px", fontSize: "11px", background: "#374151", color: "#fff" }}>
                                {g.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {GRADING_SCALE.map(g => (
                            <td key={g.label} style={{ border: "1px solid #888", padding: "6px 2px", fontSize: "10px", textAlign: "center", fontWeight: "bold", background: "#f9fafb" }}>
                                {g.min}{g.max === 100 ? '+' : `-${g.max}`}%
                            </td>
                        ))}
                    </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectPerformance;
