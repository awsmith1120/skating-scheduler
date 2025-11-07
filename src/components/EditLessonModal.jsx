import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function EditLessonModal({ lesson, onUpdate, onDelete, onClose }) {
  const [student, setStudent] = useState("");
  const [students, setStudents] = useState([]);
  const [coach, setCoach] = useState("");
  const [rink, setRink] = useState("");
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());

  // 🧠 Load student list from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("students");
    if (saved) setStudents(JSON.parse(saved));
  }, []);

  // 🧩 Initialize modal with selected lesson info
  useEffect(() => {
    if (lesson) {
      setStudent(lesson.extendedProps?.student || "");
      setCoach(lesson.extendedProps?.coach || "");
      setRink(lesson.extendedProps?.rink || "");
      setStart(new Date(lesson.start));
      setEnd(new Date(lesson.end));
    }
  }, [lesson]);

  // 💾 Save updated student list if Silvia edits a new name
  const saveStudentName = (name) => {
    const trimmed = name.trim();
    if (trimmed && !students.includes(trimmed)) {
      const updated = [...students, trimmed];
      setStudents(updated);
      localStorage.setItem("students", JSON.stringify(updated));
    }
  };

  // ⏱ Adjust end time automatically to 30 min after start
  const handleStartChange = (date) => {
    if (!date) return;
    setStart(date);
    const newEnd = new Date(date.getTime() + 30 * 60000);
    setEnd(newEnd);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = student.trim();
    if (!trimmed) {
      alert("Please enter a student name");
      return;
    }

    saveStudentName(trimmed);

    const updatedLesson = {
      id: lesson.id,
      title: `${trimmed} - ${coach} (${rink})`,
      start,
      end,
      extendedProps: { student: trimmed, coach, rink },
    };

    onUpdate(updatedLesson);
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
        <h2 className="text-xl font-semibold text-center mb-2">Edit Lesson</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Student */}
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <input
              list="student-list"
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
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => onDelete(lesson.id)}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 transition"
            >
              Delete
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md bg-gray-200 text-sm hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
