import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState, useEffect } from "react";
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

export default function SkatingCalendar() {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessKey, setAccessKey] = useState("");

  // 🔒 Static password
  const ADMIN_PASSWORD = "silviarocks";

  // ✅ Handles password form submission
  const handleUnlock = (e) => {
    e.preventDefault();
    if (accessKey === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      localStorage.setItem("silviaAuth", "true");
    } else {
      alert("Incorrect key — remaining in view-only mode.");
      setAccessKey("");
    }
  };

  const handleLockEditing = () => {
    localStorage.removeItem("silviaAuth");
    setIsAuthorized(false);
    setAccessKey("");
    setShowModal(false);
    setShowEditModal(false);
  };

  useEffect(() => {
    if (localStorage.getItem("silviaAuth") === "true") {
      setIsAuthorized(true);
    }
  }, []);

  // 🎨 Coach color map
  const colorMap = {
    Silvia: "#3b82f6",
    John: "#10b981",
    Sherry: "#f97316",
  };

  // 🧩 Normalize lesson data from Firestore
  const normalizeLesson = (docSnap) => {
    const raw = docSnap.data();
    const toJSDate = (v) =>
      v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v);
    const student = raw.student ?? raw?.extendedProps?.student ?? "Unknown";
    const coach = raw.coach ?? raw?.extendedProps?.coach ?? "Unknown";
    const rink = raw.rink ?? raw?.extendedProps?.rink ?? "Unknown";
    const color = colorMap[coach] || "#6b7280";

    return {
      id: docSnap.id,
      title: `${student} - ${coach} (${rink.replace(/^The\s+/i, "")})`,
      start: toJSDate(raw.start),
      end: toJSDate(raw.end),
      backgroundColor: color,
      borderColor: color,
      textColor: "#fff",
      extendedProps: { student, coach, rink },
    };
  };

  // 🔄 Live Firestore sync
  useEffect(() => {
    const q = query(collection(db, "lessons"));
    const unsubscribe = onSnapshot(q, (snapshot) =>
      setEvents(snapshot.docs.map(normalizeLesson))
    );
    return () => unsubscribe();
  }, []);

  // 🕓 Conflict detection helper
  const timesOverlap = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

  // ➕ Add lesson
  const handleAddLesson = async (newLesson) => {
    try {
      const props = newLesson.extendedProps || {};
      const student = props.student || newLesson.student || "Unknown";
      const coach = props.coach || newLesson.coach || "Unknown";
      const rink = props.rink || newLesson.rink || "Unknown";
      const start = newLesson.start instanceof Date ? newLesson.start : new Date(newLesson.start);
      const end = newLesson.end instanceof Date ? newLesson.end : new Date(newLesson.end);

      const conflict = events.find((e) => {
        const sameStudent = e.extendedProps.student === student;
        const sameCoach = e.extendedProps.coach === coach;
        return (
          (sameStudent || sameCoach) &&
          timesOverlap(start, end, new Date(e.start), new Date(e.end))
        );
      });

      if (conflict) {
        alert(
          `⚠️ Conflict detected!\n\n${
            conflict.extendedProps.student === student
              ? `Student "${student}" already has a lesson.`
              : `Coach "${coach}" already has a lesson.`
          }\n\nConflicting lesson:\n${conflict.title}`
        );
        return;
      }

      const color = colorMap[coach] || "#6b7280";
      await addDoc(collection(db, "lessons"), {
        student,
        coach,
        rink,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
      });
      setShowModal(false);
    } catch (err) {
      console.error("❌ Error saving lesson:", err);
      alert("Failed to save lesson — check console for details.");
    }
  };

  // 📝 Edit lesson
  const handleEventClick = (clickInfo) => {
    if (!isAuthorized) return;
    setSelectedLesson(clickInfo.event);
    setShowEditModal(true);
  };

  const handleUpdateLesson = async (updated) => {
    try {
      const id = updated.id ?? selectedLesson?.id;
      if (!id) return;
      const ref = doc(db, "lessons", id);
      const coach =
        updated.extendedProps?.coach ?? selectedLesson?.extendedProps?.coach;
      const student =
        updated.extendedProps?.student ?? selectedLesson?.extendedProps?.student;
      const rink =
        updated.extendedProps?.rink ?? selectedLesson?.extendedProps?.rink;
      const start =
        updated.start instanceof Date ? updated.start : new Date(updated.start);
      const end =
        updated.end instanceof Date ? updated.end : new Date(updated.end);
      const color = colorMap[coach] || "#6b7280";

      await updateDoc(ref, {
        student,
        coach,
        rink,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
      });

      setShowEditModal(false);
      setSelectedLesson(null);
    } catch (err) {
      console.error("❌ Error updating lesson:", err);
      alert("Failed to update lesson.");
    }
  };

  // 🗑️ Delete
  const handleDeleteLesson = async (id) => {
    try {
      await deleteDoc(doc(db, "lessons", id));
      setShowEditModal(false);
      setSelectedLesson(null);
    } catch (err) {
      console.error("❌ Error deleting lesson:", err);
      alert("Failed to delete lesson.");
    }
  };

  // 💬 Tooltip (hover info)
  const tooltipHandlers = {
    eventMouseEnter: (info) => {
      const { student, coach, rink } = info.event.extendedProps;
      const start = new Date(info.event.start).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const end = new Date(info.event.end).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const tooltip = document.createElement("div");
      tooltip.className =
        "absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none shadow-md";
      tooltip.style.position = "absolute";
      tooltip.style.top = `${info.jsEvent.pageY + 10}px`;
      tooltip.style.left = `${info.jsEvent.pageX + 10}px`;
      tooltip.textContent = `${student} (${coach}) @ ${rink}\n${start}–${end}`;
      tooltip.id = "fc-tooltip";
      document.body.appendChild(tooltip);
    },
    eventMouseLeave: () => {
      const tooltip = document.getElementById("fc-tooltip");
      if (tooltip) tooltip.remove();
    },
  };

  // 👀 View-only mode
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-semibold mb-4">
          Skating Schedule (View Only)
        </h1>
        <form
          onSubmit={handleUnlock}
          className="space-y-3 text-center mb-6"
          autoComplete="off"
        >
          {/* 🕵️ Hidden fake username input to block password popups */}
          <input
            type="text"
            name="fakeuser"
            id="fakeuser"
            autoComplete="off"
            style={{ display: "none" }}
          />

          <p className="text-gray-600 text-sm">
            Enter Silvia’s access key to unlock editing:
          </p>
          <input
            type="text"
            name="access_key"
            autoComplete="off"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter access key"
          />
          <div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition"
            >
              Unlock
            </button>
          </div>
        </form>

        <div className="w-full max-w-screen-2xl px-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            height="80vh"
            allDaySlot={false}
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            displayEventTime={false}
            {...tooltipHandlers}
          />
        </div>
      </div>
    );
  }

  // ✏️ Edit mode
  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Skating Lesson Calendar</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLockEditing}
            className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-300"
          >
            Lock Editing
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Lesson
          </button>
        </div>
      </div>

      <div className="w-full">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          height="85vh"
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="21:00:00"
          displayEventTime={false}
          eventClick={handleEventClick}
          {...tooltipHandlers}
        />
      </div>

      {showModal && (
        <AddLessonModal
          onAdd={handleAddLesson}
          onClose={() => setShowModal(false)}
        />
      )}

      {showEditModal && selectedLesson && (
        <EditLessonModal
          lesson={selectedLesson}
          onUpdate={handleUpdateLesson}
          onDelete={() => handleDeleteLesson(selectedLesson.id)}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLesson(null);
          }}
        />
      )}

      <div className="flex justify-center gap-6 mt-4">
        {Object.entries(colorMap).map(([coach, color]) => (
          <div key={coach} className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            ></span>
            <span className="text-sm text-gray-700">{coach}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
