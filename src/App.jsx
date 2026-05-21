import { useEffect, useMemo, useState } from "react";
import "./style.css";

const DIAS = [
  { id: "lunes", nombre: "Lunes", horas: 4 },
  { id: "martes", nombre: "Martes", horas: 6 },
  { id: "miercoles", nombre: "Miércoles", horas: 6 },
  { id: "jueves", nombre: "Jueves", horas: 6 },
  { id: "viernes", nombre: "Viernes", horas: 4 },
  { id: "sabado", nombre: "Sábado", horas: 4 },
];

const SOCIOS_INICIALES = [
  { id: "socio1", nombre: "Socio 1", maxHoras: 18 },
  { id: "socio2", nombre: "Socio 2", maxHoras: 18 },
];

const disponibilidadInicial = () =>
  SOCIOS_INICIALES.reduce((acc, socio) => {
    acc[socio.id] = DIAS.reduce((dias, dia) => {
      dias[dia.id] = true;
      return dias;
    }, {});
    return acc;
  }, {});

const preferenciasIniciales = () =>
  SOCIOS_INICIALES.reduce((acc, socio) => {
    acc[socio.id] = { favoritos: [], evitar: [], nota: "" };
    return acc;
  }, {});

function cargarEstado(clave, fallback) {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? JSON.parse(guardado) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [paso, setPaso] = useState("disponibilidad");
  const [socios, setSocios] = useState(() => cargarEstado("fauno-socios", SOCIOS_INICIALES));
  const [disponibilidad, setDisponibilidad] = useState(() =>
    cargarEstado("fauno-disponibilidad", disponibilidadInicial())
  );
  const [preferencias, setPreferencias] = useState(() =>
    cargarEstado("fauno-preferencias", preferenciasIniciales())
  );
  const [asignaciones, setAsignaciones] = useState(() => cargarEstado("fauno-asignaciones", {}));
  const [mensaje, setMensaje] = useState("Marca disponibilidad y pulsa asignar automáticamente.");

  useEffect(() => localStorage.setItem("fauno-socios", JSON.stringify(socios)), [socios]);
  useEffect(() => localStorage.setItem("fauno-disponibilidad", JSON.stringify(disponibilidad)), [disponibilidad]);
  useEffect(() => localStorage.setItem("fauno-preferencias", JSON.stringify(preferencias)), [preferencias]);
  useEffect(() => localStorage.setItem("fauno-asignaciones", JSON.stringify(asignaciones)), [asignaciones]);

  const resumen = useMemo(() => calcularResumen(asignaciones), [asignaciones]);

  function actualizarNombre(socioId, nombre) {
    setSocios((prev) => prev.map((s) => (s.id === socioId ? { ...s, nombre } : s)));
  }

  function cambiarDisponibilidad(socioId, diaId) {
    setDisponibilidad((prev) => ({
      ...prev,
      [socioId]: {
        ...prev[socioId],
        [diaId]: !prev[socioId]?.[diaId],
      },
    }));
  }

  function cambiarPreferencia(socioId, tipo, diaId) {
    setPreferencias((prev) => {
      const actual = prev[socioId]?.[tipo] || [];
      const nuevo = actual.includes(diaId) ? actual.filter((d) => d !== diaId) : [...actual, diaId];
      return { ...prev, [socioId]: { ...prev[socioId], [tipo]: nuevo } };
    });
  }

  function cambiarNota(socioId, nota) {
    setPreferencias((prev) => ({ ...prev, [socioId]: { ...prev[socioId], nota } }));
  }

  function asignarAutomaticamente() {
    const horas = Object.fromEntries(socios.map((s) => [s.id, 0]));
    const resultado = {};
    const avisos = [];

    DIAS.forEach((dia, index) => {
      const disponibles = socios.filter((s) => disponibilidad[s.id]?.[dia.id]);

      if (disponibles.length === 0) {
        resultado[dia.id] = { socioId: null, socioNombre: "Sin cubrir", horas: dia.horas, alerta: true };
        avisos.push(`${dia.nombre}: nadie disponible`);
        return;
      }

      const elegido = disponibles
        .map((s) => {
          const pref = preferencias[s.id] || { favoritos: [], evitar: [] };
          const diaAnterior = DIAS[index - 1]?.id;
          const hizoAyer = diaAnterior && resultado[diaAnterior]?.socioId === s.id;
          let puntuacion = horas[s.id] * 10;
          if (pref.favoritos?.includes(dia.id)) puntuacion -= 8;
          if (pref.evitar?.includes(dia.id)) puntuacion += 8;
          if (hizoAyer) puntuacion += 4;
          return { ...s, puntuacion };
        })
        .sort((a, b) => a.puntuacion - b.puntuacion)[0];

      resultado[dia.id] = { socioId: elegido.id, socioNombre: elegido.nombre, horas: dia.horas, alerta: false };
      horas[elegido.id] += dia.horas;
    });

    setAsignaciones(resultado);
    setPaso("asignacion");
    setMensaje(
      avisos.length ? `Asignación creada con avisos: ${avisos.join(" · ")}` : "Asignación automática creada y equilibrada."
    );
  }

  function limpiarSemana() {
    setAsignaciones({});
    setMensaje("Asignación borrada. Puedes volver a generar otra propuesta.");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">El Fauno Blanco</p>
          <h1>Turnos semanales</h1>
          <p className="subtitle">Dos socios marcan disponibilidad. La app reparte los días de forma equilibrada.</p>
        </div>
        <button className="primary big" onClick={asignarAutomaticamente}>Asignar turnos</button>
      </section>

      <nav className="tabs" aria-label="Secciones">
        <button className={paso === "disponibilidad" ? "active" : ""} onClick={() => setPaso("disponibilidad")}>1. Disponibilidad</button>
        <button className={paso === "preferencias" ? "active" : ""} onClick={() => setPaso("preferencias")}>2. Preferencias</button>
        <button className={paso === "asignacion" ? "active" : ""} onClick={() => setPaso("asignacion")}>3. Asignación</button>
      </nav>

      <div className="notice">{mensaje}</div>

      {paso === "disponibilidad" && (
        <section className="grid two">
          {socios.map((socio) => (
            <article className="card" key={socio.id}>
              <label className="label">Nombre</label>
              <input className="name-input" value={socio.nombre} onChange={(e) => actualizarNombre(socio.id, e.target.value)} />
              <h2>{socio.nombre}</h2>
              <p className="help">Toca los días en los que puede trabajar.</p>
              <div className="day-grid">
                {DIAS.map((dia) => {
                  const activo = disponibilidad[socio.id]?.[dia.id];
                  return (
                    <button key={dia.id} className={`day-pill ${activo ? "yes" : "no"}`} onClick={() => cambiarDisponibilidad(socio.id, dia.id)}>
                      <strong>{dia.nombre}</strong>
                      <span>{dia.horas} h</span>
                      <small>{activo ? "Disponible" : "No puede"}</small>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}

      {paso === "preferencias" && (
        <section className="grid two">
          {socios.map((socio) => (
            <article className="card" key={socio.id}>
              <h2>{socio.nombre}</h2>
              <p className="help">Opcional: marca días favoritos y días que prefiere evitar.</p>
              <h3>Prefiere trabajar</h3>
              <div className="mini-grid">
                {DIAS.map((dia) => (
                  <button key={dia.id} className={preferencias[socio.id]?.favoritos?.includes(dia.id) ? "choice on" : "choice"} onClick={() => cambiarPreferencia(socio.id, "favoritos", dia.id)}>{dia.nombre}</button>
                ))}
              </div>
              <h3>Mejor evitar</h3>
              <div className="mini-grid">
                {DIAS.map((dia) => (
                  <button key={dia.id} className={preferencias[socio.id]?.evitar?.includes(dia.id) ? "choice avoid" : "choice"} onClick={() => cambiarPreferencia(socio.id, "evitar", dia.id)}>{dia.nombre}</button>
                ))}
              </div>
              <label className="label">Nota rápida</label>
              <textarea value={preferencias[socio.id]?.nota || ""} onChange={(e) => cambiarNota(socio.id, e.target.value)} placeholder="Ej.: martes solo por la mañana, exámenes, familia..." />
            </article>
          ))}
        </section>
      )}

      {paso === "asignacion" && (
        <section className="card wide">
          <div className="section-head">
            <div>
              <h2>Propuesta de turnos</h2>
              <p className="help">Lunes, viernes y sábado duran 4 horas. Martes, miércoles y jueves duran 6 horas.</p>
            </div>
            <div className="actions">
              <button className="secondary" onClick={limpiarSemana}>Borrar</button>
              <button className="primary" onClick={asignarAutomaticamente}>Recalcular</button>
            </div>
          </div>

          <div className="schedule">
            {DIAS.map((dia) => {
              const asignado = asignaciones[dia.id];
              return (
                <div className={`shift-card ${asignado?.alerta ? "warning" : ""}`} key={dia.id}>
                  <span className="hours">{dia.horas} h</span>
                  <h3>{dia.nombre}</h3>
                  <p>{asignado ? asignado.socioNombre : "Sin asignar"}</p>
                </div>
              );
            })}
          </div>

          <div className="summary">
            {socios.map((s) => (
              <div className="summary-card" key={s.id}>
                <span>{s.nombre}</span>
                <strong>{resumen[s.id] || 0} h</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function calcularResumen(asignaciones) {
  return Object.values(asignaciones).reduce((acc, turno) => {
    if (!turno?.socioId) return acc;
    acc[turno.socioId] = (acc[turno.socioId] || 0) + turno.horas;
    return acc;
  }, {});
}

export default App;
