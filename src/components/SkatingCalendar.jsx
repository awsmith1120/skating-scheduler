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
 * Helper to normalize Firestore doc to FullCalendar event.
 * Coach colors: Silvia (blue), John (green), Sherry (rose).
 */
const colorMap = {
  Silvia: "#3b82f6",  // blue-500
  John: "#22c55e",    // green-500
  Sherry: "#f43f5e",  // rose-500
};

function normalizeLesson(snapshotDoc) {
  const id = snapshotDoc.id;
  const data = snapshotDoc.data() || {};
  // Support both flattened fields and extendedProps
  const props = data.extendedProps || {};
  const student = props.student ?? data.student ?? "";
  const coach = props.coach ?? data.coach ?? "Silvia";
  const rink = props.rink ?? data.rink ?? "Den";

  const start =
    data.start && typeof data.start.toDate === "function"
      ? data.start.toDate()
      : new Date(data.start || Date.now());

  const end =
    data.end && typeof data.end.toDate === "function"
      ? data.end.toDate()
      : new Date(data.end || start.getTime() + 30 * 60 * 1000);

  const title = data.title || `${student} - ${coach} (${rink})`;

  const coachColor = colorMap[coach] || "#6366f1"; // indigo-500 fallback

  return {
    id,
    title,
    start,
    end,
    extendedProps: { student, coach, rink },
    backgroundColor: coachColor,
    borderColor: coachColor,
  };
}

export default function SkatingCalendar() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [editingLocked, setEditingLocked] = useState(false);

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

  // Responsive: detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Event coloring hook (for safety if event objects lack backgroundColor)
  const eventDidMount = (info) => {
    const coach = info.event.extendedProps?.coach;
    const color = colorMap[coach];
    if (color) {
      info.el.style.backgroundColor = color;
      info.el.style.borderColor = color;
    }
  };

  // CRUD handlers
  const handleAddLesson = async (newLesson) => {
    const props = newLesson.extendedProps || {};
    const title = `${props.student} - ${props.coach} (${props.rink})`;
    await addDoc(collection(db, "lessons"), {
      title,
      start: newLesson.start,
      end: newLesson.end,
      extendedProps: props,
    });
  };

  const handleEventClick = (clickInfo) => {
    if (editingLocked) return;
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
    const title = `${props.student} - ${props.coach} (${props.rink})`;
    await updateDoc(ref, {
      title,
      start: updated.start,
      end: updated.end,
      extendedProps: props,
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditingLocked((v) => !v)}
            className={`px-3 py-2 rounded-lg border transition ${
              editingLocked
                ? "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title={editingLocked ? "Unlock editing" : "Lock editing"}
          >
            {editingLocked ? "Unlock Editing" : "Lock Editing"}
          </button>

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            + Add Lesson
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-2 sm:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          headerToolbar={
            isMobile
              ? { left: "prev,next today", center: "title", right: "timeGridDay,dayGridMonth" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
          }
          events={events}
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

      {/* Legend */}
      <div className="flex justify-start sm:justify-center gap-6 mt-4 overflow-x-auto px-2">
        {Object.entries(colorMap).map(([c, color]) => (
          <div key={c} className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: color }} />
            <span className="text-sm text-gray-700">{c}</span>
          </div>
        ))}
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
