import React, { useMemo, useState } from "react";
import {
  CalendarDays, CheckCircle2, Clock, ClipboardList,
  Plus, Trash2, User, BarChart3, Lock, LogOut
} from "lucide-react";

const SOCIOS = [
  { id: "socio1", nombre: "Socio 1", pin: "1234" },
  { id: "socio2", nombre: "Socio 2", pin: "5678" },
];

const HORARIOS_BASE = {
  1: { label: "Lunes", apertura: "08:30", cierre: "20:30" },
  2: { label: "Martes", apertura: "08:30", cierre: "20:30" },
  3: { label: "Miércoles", apertura: "08:30", cierre: "20:30" },
  4: { label: "Jueves", apertura: "08:30", cierre: "20:30" },
  5: { label: "Viernes", apertura: "08:30", cierre: "00:00" },
  6: { label: "Sábado", apertura: "08:30", cierre: "00:00" },
  0: { label: "Domingo", cerrado: true },
};

const TAREAS_BASE = [
  "Abrir caja",
  "Revisar cambio",
  "Reponer neveras",
  "Reponer golosinas",
  "Limpiar mostrador",
  "Revisar caducidades",
  "Cerrar caja",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(start = todayISO()) {
  const d = new Date(start + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const monday = d.toISOString().slice(0, 10);
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
}

function dayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return HORARIOS_BASE[d.getDay()]?.label || "Día";
}

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hoursBetween(start, end) {
  let a = toMinutes(start);
  let b = toMinutes(end);
  if (b <= a) b += 24 * 60;
  return Math.max(0, (b - a) / 60);
}

function cls(...v) {
  return v.filter(Boolean).join(" ");
}

export default function App() {
  const [activeUser, setActiveUser] = useState(null);
  const [loginUser, setLoginUser] = useState("socio1");
  const [pin, setPin] = useState("");
  const [weekStart, setWeekStart] = useState(todayISO());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [availability, setAvailability] = useState({});
  const [shifts, setShifts] = useState({});
  const [tasks, setTasks] = useState({});
  const [newTask, setNewTask] = useState("");

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const stats = useMemo(() => {
    const result = { socio1: 0, socio2: 0 };
    Object.values(shifts).flat().forEach((s) => {
      result[s.socio] += hoursBetween(s.inicio, s.fin);
    });
    return result;
  }, [shifts]);

  const selectedDayInfo =
    HORARIOS_BASE[new Date(selectedDate + "T12:00:00").getDay()];

  const selectedAvailability = availability[selectedDate] || {};
  const selectedShifts = shifts[selectedDate] || [];

  const selectedTasks =
    tasks[selectedDate] ||
    TAREAS_BASE.map((text, idx) => ({
      id: `base-${idx}`,
      text,
      done: false,
    }));

  function login() {
    const user = SOCIOS.find((s) => s.id === loginUser && s.pin === pin);
    if (user) {
      setActiveUser(user);
      setPin("");
    } else {
      alert("Contraseña incorrecta. Demo: Socio 1 = 1234 / Socio 2 = 5678");
    }
  }

  function toggleAvailability(socioId, tramo) {
    setAvailability((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [socioId]: {
          ...((prev[selectedDate] || {})[socioId] || {}),
          [tramo]: !((prev[selectedDate] || {})[socioId] || {})[tramo],
        },
      },
    }));
  }

  function addShift(socio, inicio, fin) {
    setShifts((prev) => ({
      ...prev,
      [selectedDate]: [
        ...(prev[selectedDate] || []),
        { id: crypto.randomUUID(), socio, inicio, fin },
      ],
    }));
  }

  function deleteShift(id) {
    setShifts((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter((s) => s.id !== id),
    }));
  }

  function toggleTask(id) {
    setTasks((prev) => ({
      ...prev,
      [selectedDate]: selectedTasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      ),
    }));
  }

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((prev) => ({
      ...prev,
      [selectedDate]: [
        ...selectedTasks,
        { id: crypto.randomUUID(), text: newTask.trim(), done: false },
      ],
    }));
    setNewTask("");
  }

  function autoSuggest() {
    if (!selectedDayInfo || selectedDayInfo.cerrado) return;

    const morning =
      selectedDayInfo.cierre === "00:00"
        ? ["08:30", "16:30"]
        : ["08:30", "14:30"];

    const evening =
      selectedDayInfo.cierre === "00:00"
        ? ["16:30", "00:00"]
        : ["14:30", "20:30"];

    const a1 = selectedAvailability.socio1 || {};
    const a2 = selectedAvailability.socio2 || {};

    let first = stats.socio1 <= stats.socio2 ? "socio1" : "socio2";
    let second = first === "socio1" ? "socio2" : "socio1";

    const newShifts = [];

    if (
      (selectedAvailability[first]?.manana || selectedAvailability[first]?.todo) &&
      (selectedAvailability[second]?.tarde || selectedAvailability[second]?.todo)
    ) {
      newShifts.push({
        id: crypto.randomUUID(),
        socio: first,
        inicio: morning[0],
        fin: morning[1],
      });
      newShifts.push({
        id: crypto.randomUUID(),
        socio: second,
        inicio: evening[0],
        fin: evening[1],
      });
    } else if ((a1.manana || a1.todo) && (a2.tarde || a2.todo)) {
      newShifts.push({
        id: crypto.randomUUID(),
        socio: "socio1",
        inicio: morning[0],
        fin: morning[1],
      });
      newShifts.push({
        id: crypto.randomUUID(),
        socio: "socio2",
        inicio: evening[0],
        fin: evening[1],
      });
    } else if ((a2.manana || a2.todo) && (a1.tarde || a1.todo)) {
      newShifts.push({
        id: crypto.randomUUID(),
        socio: "socio2",
        inicio: morning[0],
        fin: morning[1],
      });
      newShifts.push({
        id: crypto.randomUUID(),
        socio: "socio1",
        inicio: evening[0],
        fin: evening[1],
      });
    } else {
      alert("No hay disponibilidad suficiente marcada.");
      return;
    }

    setShifts((prev) => ({ ...prev, [selectedDate]: newShifts }));
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 rounded-3xl p-6 shadow-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-400 text-slate-950 rounded-2xl p-3">
              <Lock />
            </div>
            <div>
              <h1 className="text-2xl font-bold">El Fauno Blanco</h1>
              <p className="text-slate-300">Turnos y tareas</p>
            </div>
          </div>

          <label className="text-sm text-slate-300">Usuario</label>
          <select
            className="w-full mt-1 mb-4 p-3 rounded-xl bg-slate-900 border border-white/10"
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
          >
            {SOCIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>

          <label className="text-sm text-slate-300">Contraseña</label>
          <input
            className="w-full mt-1 mb-4 p-3 rounded-xl bg-slate-900 border border-white/10"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
          />

          <button
            onClick={login}
            className="w-full bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl"
          >
            Entrar
          </button>

          <p className="text-xs text-slate-400 mt-4">
            Demo: Socio 1 = 1234 · Socio 2 = 5678
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24">
      <header className="sticky top-0 z-20 bg-slate-950 text-white p-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">El Fauno Blanco</h1>
            <p className="text-sm text-slate-300">
              {activeUser.nombre} · planificación flexible
            </p>
          </div>
          <button
            onClick={() => setActiveUser(null)}
            className="bg-white/10 p-3 rounded-2xl"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black flex items-center gap-2">
              <CalendarDays /> Calendario semanal
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setWeekStart(addDays(weekDates[0], -7))}
                className="px-3 py-2 bg-slate-100 rounded-xl"
              >
                ←
              </button>
              <button
                onClick={() => setWeekStart(addDays(weekDates[0], 7))}
                className="px-3 py-2 bg-slate-100 rounded-xl"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {weekDates.map((date) => {
              const dShifts = shifts[date] || [];
              const total = dShifts.reduce(
                (sum, s) => sum + hoursBetween(s.inicio, s.fin),
                0
              );

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cls(
                    "text-left rounded-2xl p-4 border-2",
                    selectedDate === date
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 bg-slate-50"
                  )}
                >
                  <div className="font-black">{dayName(date)}</div>
                  <div className="text-sm text-slate-500">{date}</div>
                  <div className="mt-3 text-sm font-semibold">
                    {dShifts.length} turnos · {total.toFixed(1)} h
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-3xl p-4 shadow-sm">
          <h2 className="font-black flex items-center gap-2 mb-4">
            <BarChart3 /> Equilibrio semanal
          </h2>

          {SOCIOS.map((s) => (
            <div key={s.id} className="mb-4">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span>{s.nombre}</span>
                <span>{stats[s.id].toFixed(1)} h</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${Math.min(100, stats[s.id] * 5)}%` }}
                />
              </div>
            </div>
          ))}

          <p className="text-sm text-slate-500">
            La app prioriza al socio con menos horas al proponer turnos.
          </p>
        </section>

        <section className="lg:col-span-2 bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-black text-lg">
                {dayName(selectedDate)} · {selectedDate}
              </h2>
              <p className="text-sm text-slate-500">
                Horario: {selectedDayInfo?.apertura} - {selectedDayInfo?.cierre}
              </p>
            </div>

            <button
              onClick={autoSuggest}
              className="bg-slate-950 text-white px-4 py-3 rounded-2xl font-bold"
            >
              Proponer turnos
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {SOCIOS.map((s) => (
              <div
                key={s.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
              >
                <h3 className="font-black flex items-center gap-2 mb-3">
                  <User size={18} /> {s.nombre}
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {["manana", "tarde", "todo"].map((tramo) => (
                    <button
                      key={tramo}
                      onClick={() => toggleAvailability(s.id, tramo)}
                      className={cls(
                        "py-2 rounded-xl text-sm font-bold",
                        selectedAvailability[s.id]?.[tramo]
                          ? "bg-emerald-400"
                          : "bg-white border"
                      )}
                    >
                      {tramo === "manana"
                        ? "Mañana"
                        : tramo === "tarde"
                        ? "Tarde"
                        : "Todo"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() =>
                      addShift(
                        s.id,
                        "08:30",
                        selectedDayInfo?.cierre === "00:00" ? "16:30" : "14:30"
                      )
                    }
                    className="bg-white border rounded-xl p-2 text-sm"
                  >
                    + Mañana
                  </button>

                  <button
                    onClick={() =>
                      addShift(
                        s.id,
                        selectedDayInfo?.cierre === "00:00" ? "16:30" : "14:30",
                        selectedDayInfo?.cierre || "20:30"
                      )
                    }
                    className="bg-white border rounded-xl p-2 text-sm"
                  >
                    + Tarde
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-black flex items-center gap-2 mb-3">
            <Clock /> Turnos asignados
          </h3>

          <div className="space-y-2">
            {selectedShifts.length === 0 && (
              <p className="text-slate-500 bg-slate-50 p-4 rounded-2xl">
                Todavía no hay turnos asignados para este día.
              </p>
            )}

            {selectedShifts.map((s) => {
              const socio = SOCIOS.find((x) => x.id === s.socio);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-slate-50 rounded-2xl p-3"
                >
                  <div>
                    <b>{socio?.nombre}</b>
                    <div className="text-sm text-slate-500">
                      {s.inicio} - {s.fin} ·{" "}
                      {hoursBetween(s.inicio, s.fin).toFixed(1)} h
                    </div>
                  </div>
                  <button
                    onClick={() => deleteShift(s.id)}
                    className="text-red-500 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-3xl p-4 shadow-sm">
          <h2 className="font-black flex items-center gap-2 mb-4">
            <ClipboardList /> Tareas del día
          </h2>

          <div className="space-y-2 mb-4">
            {selectedTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className={cls(
                  "w-full flex items-center gap-2 text-left p-3 rounded-2xl",
                  t.done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50"
                )}
              >
                <CheckCircle2
                  size={20}
                  className={t.done ? "text-emerald-500" : "text-slate-300"}
                />
                <span className={t.done ? "line-through" : ""}>{t.text}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nueva tarea"
              className="min-w-0 flex-1 p-3 rounded-xl bg-slate-50 border"
            />
            <button
              onClick={addTask}
              className="bg-slate-950 text-white p-3 rounded-xl"
            >
              <Plus />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
