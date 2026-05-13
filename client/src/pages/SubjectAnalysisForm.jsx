import React, { useState } from "react";
import assessmentTypeService from "../services/assessmentTypeService";
import { useNavigate } from "react-router-dom";
//get this year
const ThisYear = ()=>{
    const date = new Date().getFullYear();
    if(date > 8){
        let newyear = null;
        return newyear = date - 7;
    }
    let newyear = null;

    return newyear = date - 8;
}

function SubjectAnalysisForm() {
  const Navigate = useNavigate()
  const [gradeLevel, setGradeLevel] = useState("");
  const [term,setTerm] = useState("TERM 1 2026")
  const [year, setYear] = useState(ThisYear());
  const [error,setError] = useState(null)

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null)
    try {
        const res = await assessmentTypeService.getAllAssessments(year,term)
        if(res?.data.length > 0){
          Navigate('/subject-analysis', { state: { assessmentTypes: res.data, gradeLevel, year, term } });
        }else{
          setError("No Assessment type is for this requirement!")
        }
    } catch (error) {
      setError(error.message)      
    }
  };

  const inputStyle = "w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div className="max-w-xl mx-auto bg-white shadow p-6 rounded-lg mt-10">
      <h1 className="text-2xl text-center text-pink-600 font-bold mb-6 text-gray-800">
        Subject Analysis Generator
      </h1>

      <form onSubmit={handleGenerate} className="space-y-6">
        
        {/* Select Grade Level */}
        <div>
          <label className="block font-semibold mb-1 text-gray-700">
            Select Grade Level
          </label>
          <input 
            type="text" 
            placeholder="Grade 2A"
            className={inputStyle} 
            value={gradeLevel} 
            onChange={(e)=>setGradeLevel(e.target.value)}
            required
          /> 
        </div>

        <div>
          <label className="block font-semibold mb-1 text-gray-700">Term</label>
          <select name="term" className={inputStyle} onChange={(e)=>setTerm(e.target.value)}>
            <option value="TERM 1 2026">First Term</option>
            <option value="TERM 2 2026">Second Term</option>
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block font-semibold mb-1 text-gray-700">Year</label>
          <input
            type="text"
            placeholder="2024"
            className={inputStyle}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-center">{error}</p>}

        {/* Generate Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
        >
          Generate All Subject Analysis
        </button>
      </form>
    </div>
  );
}

export default SubjectAnalysisForm;
