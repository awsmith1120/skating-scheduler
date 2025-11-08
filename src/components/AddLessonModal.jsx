import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/**
 * AddLessonModal
 * Bottom-sheet on mobile, card modal on desktop.
 * Restores: end time auto-sets to 30 minutes after selected start time.
 * Props:
 *  - onAdd(lesson)
 *  - onClose()
 */
export default function AddLessonModal({ onAdd, onClose }) {
  const roundToNearest15 = (date = new Date()) => {
    const ms = 1000 * 60 * 15;
    return new Date(Math.round(date.getTime() / ms) * ms);
  };

  const [student, setStudent] = useState("");
  const [students, setStudents] = useState([]);
  const [coach, setCoach] = useState("Silvia"); // Silvia, John, Sherry
  const [rink, setRink] = useState("Den"); // unified

  const initialStart = roundToNearest15();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(new Date(initialStart.getTime() + 30 * 60 * 1000));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("students");
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) setStudents(list);
      }
    } catch {}
  }, []);

  const saveStudentName = (name) => {
    try {
      const trimmed = name.trim();
      if (!trimmed) return;
      const set = new Set(students);
      set.add(trimmed);
      const next = Array.from(set).sort((a, b) => a.localeCompare(b));
      setStudents(next);
      localStorage.setItem("students", JSON.stringify(next));
    } catch {}
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = student.trim();
    if (!trimmed) {
      alert("Please enter a student name");
      return;
    }
    if (!(start instanceof Date) || isNaN(+start) || !(end instanceof Date) || isNaN(+end)) {
      alert("Please select valid start and end times");
      return;
    }
    if (end <= start) {
      alert("End time must be after start time");
      return;
    }

    saveStudentName(trimmed);

    const newLesson = {
      title: `${trimmed} - ${coach} (${rink})`,
      start,
      end,
      extendedProps: { student: trimmed, coach, rink },
    };

    onAdd?.(newLesson);
    onClose?.();
  };

  // Close on backdrop click
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-end sm:items-center justify-center
        bg-black/50 p-0 sm:p-4
      "
      onMouseDown={onBackdrop}
    >
      <div
        className="
          bg-white shadow-xl relative space-y-4
          w-screen h-[100dvh] rounded-none p-4
          sm:w-[28rem] sm:h-auto sm:rounded-2xl sm:p-6
        "
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          ×
        </button>

        <h2 className="text-xl sm:text-2xl font-semibold pr-8">Add Lesson</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Student</span>
              <input
                type="text"
                list="students"
                value={student}
                onChange={(e) => setStudent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-base"
                placeholder="Student name"
                autoFocus
              />
              <datalist id="students">
                {students.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Coach</span>
              <select
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-base"
              >
                <option>Silvia</option>
                <option>John</option>
                <option>Sherry</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Rink</span>
            <select
              value={rink}
              onChange={(e) => setRink(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-base"
            >
              <option value="Stadium">Stadium</option>
              <option value="Mezzanine">Mezzanine</option>
              <option value="Den">Den</option>
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Start</span>
              <DatePicker
                selected={start}
                onChange={(d) => {
                  if (!d) return;
                  setStart(d);
                  // snap end to +30 minutes from selected start
                  setEnd(new Date(d.getTime() + 30 * 60 * 1000));
                }}
                showTimeSelect
                withPortal
                timeIntervals={15}
                dateFormat="Pp"
                className="w-full border border-gray-300 rounded-lg p-2 text-base"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">End</span>
              <DatePicker
                selected={end}
                onChange={(d) => d && setEnd(d)}
                showTimeSelect
                withPortal
                timeIntervals={15}
                dateFormat="Pp"
                minDate={start}
                className="w-full border border-gray-300 rounded-lg p-2 text-base"
              />
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-11 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Save Lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
