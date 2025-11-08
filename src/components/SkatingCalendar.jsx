import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useMemo, useRef, useState } from "react";
import AddLessonModal from "./AddLessonModal";
import EditLessonModal from "./EditLessonModal";
import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

/**
 * Coach colors: Silvia (blue), John (green), Sherry (rose).
 */
const colorMap = {
  Silvia: "#3b82f6", // blue-500
  John: "#22c55e",   // green-500
  Sherry: "#f43f5e", // rose-500
};

// 🔒 Hardcoded password (change to your original if different)
const EDIT_PASSWORD = "letmein";

/** Remove a leading "The " (case-insensitive) from rink names */
const stripThe = (s) => (typeof s === "string" ? s.replace(/^\s*the\s+/i, "") : s);

/** Normalize Firestore doc to FullCalendar event (also cleans rink/title) */
function normalizeLesson(snapshotDoc) {
  const id = snapshotDoc.id;
  const data = snapshotDoc.data() || {};
  const props = data.extendedProps || {};

  const student = props.student ?? data.student ?? "";
  const coach = props.coach ?? data.coach ?? "Silvia";
  const rinkRaw = props.rink ?? data.rink ?? "Den";
  const rink = stripThe(rinkRaw);

  const start =
    data.start && typeof data.start.toDate === "function"
      ? data.start.toDate()
      : new Date(data.start || Date.now());

  const end =
    data.end && typeof data.end.toDate === "function"
      ? data.end.toDate()
      : new Date(data.end || start.getTime() + 30 * 60 * 1000);

  // Build a clean title
  const title = `${student} - ${coach} (${rink})`;

  const coachColor = colorMap[coach] || "#6366f1"; // indigo-500 fallback

  return {
    id,
    title,
    start,
    end,
    extendedProps: { student, coach, rink }, // cleaned rink
    backgroundColor: coachColor,
    borderColor: coachColor,
  };
}

export default function SkatingCalendar() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);

  // Password-protected editing (locked by default)
  const [editingLocked, setEditingLocked] = useState(true);

  // Restore unlock state for this tab
  useEffect(() => {
    const wasUnlocked = sessionStorage.getItem("calendar_unlocked") === "1";
    if (wasUnlocked) setEditingLocked(false);
  }, []);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Live query
  useEffect(() => {
    const q = query(collection(db, "lessons"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map(normalizeLesson);
      setEvents(rows);
    });
    return () => unsubscribe();
  }, []);

  // Mobile detection — evaluate immediately on first render to avoid button/view mismatch
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Color safety if any events render without colors
  const eventDidMount = (info) => {
    const coach = info.event.extendedProps?.coach;
    const color = colorMap[coach];
    if (color) {
      info.el.style.backgroundColor = color;
      info.el.style.borderColor = color;
    }
  };

  // --- Password helpers ---
  const promptForPassword = (purpose = "unlock editing") => {
    const input = window.prompt(`Enter password to ${purpose}:`, "");
    return input;
  };

  const attemptUnlock = () => {
    const input = promptForPassword("unlock editing");
    if (input == null) return; // cancelled
    if (input === EDIT_PASSWORD) {
      setEditingLocked(false);
      sessionStorage.setItem("calendar_unlocked", "1");
    } else {
      alert("Incorrect password.");
    }
  };

  const relock = () => {
    setEditingLocked(true);
    sessionStorage.removeItem("calendar_unlocked");
  };

  // --- Coach filter ---
  const [coachFilter, setCoachFilter] = useState(() => {
    if (typeof window === "undefined") return "All";
    return localStorage.getItem("coach_filter") || "All";
  });
  useEffect(() => {
    localStorage.setItem("coach_filter", coachFilter);
  }, [coachFilter]);

  // --- Student filter (partial, case-insensitive) ---
  const [studentFilter, setStudentFilter] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("student_filter") || "";
  });
  useEffect(() => {
    localStorage.setItem("student_filter", studentFilter);
  }, [studentFilter]);

  // Build a suggestion list from current events
  const studentOptions = useMemo(() => {
    const set = new Set();
    for (const ev of events) {
      const s = ev.extendedProps?.student || "";
      if (s.trim()) set.add(s.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  // Apply BOTH filters
  const filteredEvents = useMemo(() => {
    const coachOk = (e) =>
      coachFilter === "All" ? true : e.extendedProps?.coach === coachFilter;

    const studentOk = (e) => {
      if (!studentFilter.trim()) return true;
      const name = (e.extendedProps?.student || "").toLowerCase();
      return name.includes(studentFilter.trim().toLowerCase());
    };

    return events.filter((e) => coachOk(e) && studentOk(e));
  }, [events, coachFilter, studentFilter]);

  // --- CRUD handlers (also clean rink before saving) ---
  const handleAddLesson = async (newLesson) => {
    const props = newLesson.extendedProps || {};
    const cleanRink = stripThe(props.rink);
    const newProps = { ...props, rink: cleanRink };
    const title = `${newProps.student} - ${newProps.coach} (${cleanRink})`;
    await addDoc(collection(db, "lessons"), {
      title,
      start: newLesson.start,
      end: newLesson.end,
      extendedProps: newProps,
    });
  };

  const handleEventClick = (clickInfo) => {
    if (editingLocked) {
      attemptUnlock();
      return;
    }
    const ev = clickInfo.event;
    setSelectedLesson({
      id: ev.id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      extendedProps: { ...ev.extendedProps },
    });
    setEditOpen(true);
  };

  const handleUpdateLesson = async (updated) => {
    const ref = doc(db, "lessons", updated.id);
    const props = updated.extendedProps || {};
    const cleanRink = stripThe(props.rink);
    const newProps = { ...props, rink: cleanRink };
    const title = `${newProps.student} - ${newProps.coach} (${cleanRink})`;
    await updateDoc(ref, {
      title,
      start: updated.start,
      end: updated.end,
      extendedProps: newProps,
    });
  };

  const handleDeleteLesson = async (id) => {
    const ref = doc(db, "lessons", id);
    await deleteDoc(ref);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Small-screen toolbar wrap fixes */}
      <style>{`
        @media (max-width: 640px) {
          .fc .fc-toolbar {
            flex-wrap: wrap;
            gap: .5rem;
          }
          .fc .fc-toolbar .fc-toolbar-chunk {
            display: flex;
            flex-wrap: wrap;
            gap: .5rem;
          }
          .fc .fc-button {
            padding: .5rem .75rem;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Skating Schedule</h1>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          {/* Filters block */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
            {/* Coach filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="coachFilter" className="text-sm text-gray-700 whitespace-nowrap">
                Coach:
              </label>
              <select
                id="coachFilter"
                value={coachFilter}
                onChange={(e) => setCoachFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
              >
                <option value="All">All</option>
                <option value="Silvia">Silvia</option>
                <option value="John">John</option>
                <option value="Sherry">Sherry</option>
              </select>
            </div>

            {/* Student filter (text with suggestions) */}
            <div className="flex items-center gap-2">
              <label htmlFor="studentFilter" className="text-sm text-gray-700 whitespace-nowrap">
                Student:
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="studentFilter"
                  list="studentOptions"
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  placeholder="Type to filter"
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-40"
                />
                <datalist id="studentOptions">
                  {studentOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {studentFilter ? (
                  <button
                    type="button"
                    onClick={() => setStudentFilter("")}
                    className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                    title="Clear student filter"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Lock / Add buttons */}
          <div className="flex flex-wrap gap-2">
            {editingLocked ? (
              <button
                type="button"
                onClick={attemptUnlock}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                title="Unlock editing"
              >
                Unlock (Password)
              </button>
            ) : (
              <button
                type="button"
                onClick={relock}
                className="px-3 py-2 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition"
                title="Lock editing"
              >
                Lock Editing
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (editingLocked) {
                  attemptUnlock();
                } else {
                  setAddOpen(true);
                }
              }}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              + Add Lesson
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-2 sm:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          headerToolbar={
            isMobile
              // Mobile shows Day · Week · Month
              ? { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth" }
              // Desktop keeps Month · Week · Day
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
          }
          events={filteredEvents}
          height={isMobile ? "auto" : "85vh"}
          contentHeight={isMobile ? "auto" : undefined}
          expandRows={true}
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="21:00:00"
          displayEventTime={false}
          eventClick={handleEventClick}
          eventDidMount={eventDidMount}
        />
      </div>

      {/* Legend (click to filter / click again to reset to All) */}
      <div className="flex justify-start sm:justify-center gap-6 mt-4 overflow-x-auto px-2">
        {Object.entries(colorMap).map(([c, color]) => {
          const active = coachFilter === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCoachFilter((prev) => (prev === c ? "All" : c))}
              className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                active ? "ring-2 ring-offset-2 ring-gray-300" : "hover:bg-gray-50"
              }`}
              title={active ? `Showing: ${c} (tap to show All)` : `Show only ${c}`}
            >
              <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-700">{c}</span>
            </button>
          );
        })}
        {/* Also include an All button for convenience */}
        <button
          type="button"
          onClick={() => setCoachFilter("All")}
          className={`flex items-center gap-2 px-2 py-1 rounded transition ${
            coachFilter === "All" ? "ring-2 ring-offset-2 ring-gray-300" : "hover:bg-gray-50"
          }`}
          title="Show all coaches"
        >
          <span className="inline-block w-4 h-4 rounded border border-gray-300" />
          <span className="text-sm text-gray-700">All</span>
        </button>
      </div>

      {/* Modals */}
      {addOpen && (
        <AddLessonModal
          onAdd={handleAddLesson}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editOpen && selectedLesson && (
        <EditLessonModal
          lesson={selectedLesson}
          onUpdate={handleUpdateLesson}
          onDelete={handleDeleteLesson}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
