import { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AddLessonModal({ onAdd, onClose }) {
  const roundToNearest15 = (date = new Date()) => {
    const ms = 1000 * 60 * 15;
    return new Date(Math.round(date.getTime() / ms) * ms);
  };

  const [student, setStudent] = useState("");
  const [students, setStudents] = useState([]);
  const [coach, setCoach] = useState("Silvia");
  const [rink, setRink] = useState("The Den");

  const [start, setStart] = useState(roundToNearest15());
  const [end, setEnd] = useState(
    new Date(roundToNearest15().getTime() + 30 * 60000)
  );

  const studentRef = useRef(null);

  // 🧠 Load saved students from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("students");
    if (saved) setStudents(JSON.parse(saved));
    if (studentRef.current) studentRef.current.focus();
  }, []);

  // 🕒 Auto-set end time 30 min later
  const handleStartChange = (date) => {
    if (!date) return;
    setStart(date);
    const newEnd = new Date(date.getTime() + 30 * 60000);
    setEnd(newEnd);
  };

  // 🧹 Clear saved students list
  const handleClearStudents = () => {
    if (window.confirm("Clear all saved student names?")) {
      setStudents([]);
      localStorage.removeItem("students");
    }
  };

  // 💾 Save and submit new lesson
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = student.trim();
    if (!trimmed) {
      alert("Please enter a student name");
      return;
    }

    if (
      !(start instanceof Date) ||
      isNaN(start) ||
      !(end instanceof Date) ||
      isNaN(end)
    ) {
      alert("Please select valid start and end times");
      return;
    }

    // ✅ Save new student immediately to localStorage
    let updatedStudents = [...students];
    if (!updatedStudents.includes(trimmed)) {
      updatedStudents.push(trimmed);
      setStudents(updatedStudents);
      localStorage.setItem("students", JSON.stringify(updatedStudents));
    }

    const lesson = {
      title: `${trimmed} - ${coach} (${rink})`,
      start: new Date(start),
      end: new Date(end),
      extendedProps: { coach, rink, student: trimmed },
    };

    console.log("✅ Saving lesson:", lesson);
    onAdd(lesson);

    // ✅ Close after a small delay to ensure list saves
    setTimeout(onClose, 100);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4 relative z-60"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-center mb-2">Add Lesson</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Student */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Student</label>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearStudents}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  🗑 Clear List
                </button>
              )}
            </div>

            <input
              list="student-list"
              ref={studentRef}
              type="text"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter or select a student"
            />
            <datalist id="student-list">
              {students.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          {/* Coach */}
          <div>
            <label className="block text-sm font-medium mb-1">Coach</label>
            <select
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option>Silvia</option>
              <option>John</option>
              <option>Sherry</option>
            </select>
          </div>

          {/* Rink */}
          <div>
            <label className="block text-sm font-medium mb-1">Rink</label>
            <select
              value={rink}
              onChange={(e) => setRink(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option>Den</option>
              <option>Stadium</option>
              <option>Mezzanine</option>
            </select>
          </div>

          {/* Start time */}
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <DatePicker
              selected={start}
              onChange={handleStartChange}
              showTimeSelect
              timeIntervals={15}
              dateFormat="Pp"
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>

          {/* End time */}
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <DatePicker
              selected={end}
              onChange={(date) => setEnd(date)}
              showTimeSelect
              timeIntervals={15}
              dateFormat="Pp"
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
