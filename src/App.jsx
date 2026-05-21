import { useState } from "react";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const SHIFTS = {
  morning: "Mañana · 6h",
  afternoon: "Tarde · 6h",
  night: "Noche · 4h",
};

export default function App() {
  const [profile, setProfile] = useState("Socio 1");

  const [availability, setAvailability] = useState({});
  const [preferences, setPreferences] = useState({});
  const [schedule, setSchedule] = useState([]);

  const toggleAvailability = (day, shift) => {
    const key = `${day}-${shift}`;

    setAvailability((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setPreference = (day, shift, value) => {
    const key = `${day}-${shift}`;

    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const generateSchedule = () => {
    const generated = [];

    DAYS.forEach((day) => {
      const dayShifts =
        day === "Viernes" || day === "Sábado"
          ? ["morning", "afternoon", "night"]
          : ["morning", "afternoon"];

      dayShifts.forEach((shift) => {
        const key = `${day}-${shift}`;

        const available = availability[key];

        generated.push({
          day,
          shift,
          assigned: available ? profile : "Pendiente",
        });
      });
    });

    setSchedule(generated);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>EL FAUNO BLANCO</h1>
        <p>Gestión inteligente de turnos</p>
      </header>

      <section className="profile-card">
        <h2>Perfil</h2>

        <div className="profile-buttons">
          <button
            className={profile === "Socio 1" ? "active" : ""}
            onClick={() => setProfile("Socio 1")}
          >
            Socio 1
          </button>

          <button
            className={profile === "Socio 2" ? "active" : ""}
            onClick={() => setProfile("Socio 2")}
          >
            Socio 2
          </button>

          <button
            className={profile === "Gestor" ? "active" : ""}
            onClick={() => setProfile("Gestor")}
          >
            Gestor
          </button>
        </div>
      </section>

      <section className="step-card">
        <h2>1 · Disponibilidad</h2>

        {DAYS.map((day) => {
          const shifts =
            day === "Viernes" || day === "Sábado"
              ? ["morning", "afternoon", "night"]
              : ["morning", "afternoon"];

          return (
            <div key={day} className="day-block">
              <h3>{day}</h3>

              <div className="shift-row">
                {shifts.map((shift) => {
                  const key = `${day}-${shift}`;

                  return (
                    <button
                      key={key}
                      className={
                        availability[key]
                          ? "shift-btn selected"
                          : "shift-btn"
                      }
                      onClick={() =>
                        toggleAvailability(day, shift)
                      }
                    >
                      {SHIFTS[shift]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="step-card">
        <h2>2 · Preferencias</h2>

        {DAYS.map((day) => {
          const shifts =
            day === "Viernes" || day === "Sábado"
              ? ["morning", "afternoon", "night"]
              : ["morning", "afternoon"];

          return (
            <div key={day} className="day-block">
              <h3>{day}</h3>

              {shifts.map((shift) => {
                const key = `${day}-${shift}`;

                return (
                  <div key={key} className="preference-row">
                    <span>{SHIFTS[shift]}</span>

                    <select
                      value={preferences[key] || "normal"}
                      onChange={(e) =>
                        setPreference(
                          day,
                          shift,
                          e.target.value
                        )
                      }
                    >
                      <option value="love">
                        Me gusta mucho
                      </option>

                      <option value="normal">
                        Me da igual
                      </option>

                      <option value="avoid">
                        Prefiero evitar
                      </option>
                    </select>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="step-card">
        <h2>3 · Asignación automática</h2>

        <button
          className="generate-btn"
          onClick={generateSchedule}
        >
          Generar turnos
        </button>

        <div className="schedule-grid">
          {schedule.map((item, index) => (
            <div key={index} className="schedule-card">
              <h3>{item.day}</h3>

              <p>{SHIFTS[item.shift]}</p>

              <strong>{item.assigned}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
