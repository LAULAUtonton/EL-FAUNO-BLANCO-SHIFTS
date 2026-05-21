import { useEffect, useMemo, useState } from "react";
import "./style.css";

const STORAGE = "fauno-blanco-v10-perfiles-equidad";
const SOCIOS_INICIALES = [
  { id: "socio1", nombre: "Socio 1", color: "#2563eb" },
  { id: "socio2", nombre: "Socio 2", color: "#f97316" },
];

const TURNOS_BASE = [
  { key: "manana", nombre: "Mañana", horas: 6, rango: "08:30–14:30", icono: "☀️" },
  { key: "tarde", nombre: "Tarde", horas: 6, rango: "14:30–20:30", icono: "🌤️" },
];
const TURNO_NOCHE = { key: "noche", nombre: "Noche extra", horas: 4, rango: "20:30–00:30", icono: "🌙" };
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function ymd(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
function fechaDeYmd(id) {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function claveTurno(diaId, turnoKey) {
  return `${diaId}__${turnoKey}`;
}
function turnosDelDia(fecha) {
  const dow = fecha.getDay();
  if (dow === 0) return [];
  const turnos = [...TURNOS_BASE];
  if (dow === 5 || dow === 6) turnos.push(TURNO_NOCHE);
  return turnos;
}
function inicioSemana(fecha) {
  const f = new Date(fecha);
  const diff = f.getDay() === 0 ? -6 : 1 - f.getDay();
  f.setDate(f.getDate() + diff);
  f.setHours(0, 0, 0, 0);
  return f;
}
function crearSemana(base) {
  const start = inicioSemana(base);
  return Array.from({ length: 7 }, (_, i) => {
    const f = new Date(start);
    f.setDate(start.getDate() + i);
    return f;
  });
}
function estadoInicial() {
  return {
    paso: "disponibilidad",
    perfil: "socio1",
    semanaBase: ymd(new Date()),
    socios: SOCIOS_INICIALES,
    disponibilidad: {},
    preferencias: {},
    asignaciones: {},
  };
}
function cargar() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    return data ? { ...estadoInicial(), ...data } : estadoInicial();
  } catch {
    return estadoInicial();
  }
}

export default function App() {
  const [state, setState] = useState(cargar);
  const { paso, perfil, semanaBase, socios, disponibilidad, preferencias, asignaciones } = state;
  const [mensaje, setMensaje] = useState("Cada perfil ve lo que necesita: los socios marcan sus datos; el gestor revisa y genera el reparto.");

  const esGestor = perfil === "gestor";
  const socioActivo = socios.find((s) => s.id === perfil) || socios[0];
  const diasSemana = useMemo(() => crearSemana(fechaDeYmd(semanaBase)), [semanaBase]);
  const turnosSemana = useMemo(() => diasSemana.flatMap((fecha) => turnosDelDia(fecha).map((turno) => ({
    ...turno,
    fecha,
    diaId: ymd(fecha),
    id: claveTurno(ymd(fecha), turno.key),
  }))), [diasSemana]);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }, [state]);

  function patch(obj) {
    setState((prev) => ({ ...prev, ...obj }));
  }
  function cambiarSemana(delta) {
    const f = fechaDeYmd(semanaBase);
    f.setDate(f.getDate() + delta * 7);
    patch({ semanaBase: ymd(f) });
  }
  function actualizarSocio(id, campo, valor) {
    patch({ socios: socios.map((s) => s.id === id ? { ...s, [campo]: valor } : s) });
  }
  function toggleDisponibilidad(turnoId) {
    const actual = disponibilidad[perfil]?.[turnoId] === true;
    patch({
      disponibilidad: {
        ...disponibilidad,
        [perfil]: { ...(disponibilidad[perfil] || {}), [turnoId]: !actual }
      },
      asignaciones: {},
    });
  }
  function togglePreferencia(turnoId) {
    const actual = preferencias[perfil]?.[turnoId] === true;
    patch({
      preferencias: {
        ...preferencias,
        [perfil]: { ...(preferencias[perfil] || {}), [turnoId]: !actual }
      },
      asignaciones: {},
    });
  }
  function estaDisponible(socioId, turnoId) {
    return disponibilidad[socioId]?.[turnoId] === true;
  }
  function esPreferido(socioId, turnoId) {
    return preferencias[socioId]?.[turnoId] === true;
  }
  function generarAsignacion() {
    const horas = Object.fromEntries(socios.map((s) => [s.id, 0]));
    const prefs = Object.fromEntries(socios.map((s) => [s.id, 0]));
    const asign = {};

    const orden = [...turnosSemana].sort((a, b) => {
      const ca = socios.filter((s) => estaDisponible(s.id, a.id)).length;
      const cb = socios.filter((s) => estaDisponible(s.id, b.id)).length;
      return ca - cb || a.fecha - b.fecha;
    });

    for (const turno of orden) {
      const candidatos = socios.filter((s) => estaDisponible(s.id, turno.id));
      if (!candidatos.length) continue;
      candidatos.sort((a, b) => {
        const prefA = esPreferido(a.id, turno.id) ? 1 : 0;
        const prefB = esPreferido(b.id, turno.id) ? 1 : 0;
        const scoreA = horas[a.id] - prefA * 2 + prefs[a.id] * 0.6;
        const scoreB = horas[b.id] - prefB * 2 + prefs[b.id] * 0.6;
        return scoreA - scoreB;
      });
      const elegido = candidatos[0];
      asign[turno.id] = elegido.id;
      horas[elegido.id] += turno.horas;
      if (esPreferido(elegido.id, turno.id)) prefs[elegido.id] += 1;
    }
    patch({ asignaciones: asign, paso: "asignacion" });
    setMensaje("Asignación generada: se prioriza disponibilidad, equilibrio de horas y preferencias repartidas.");
  }
  function limpiarSemana() {
    const ids = new Set(turnosSemana.map((t) => t.id));
    const limpiarMapa = (mapa) => Object.fromEntries(Object.entries(mapa).map(([socio, valores]) => [socio, Object.fromEntries(Object.entries(valores || {}).filter(([id]) => !ids.has(id)))]));
    patch({ disponibilidad: limpiarMapa(disponibilidad), preferencias: limpiarMapa(preferencias), asignaciones: {} });
    setMensaje("Semana limpia. Cada socio puede volver a marcar sus datos.");
  }

  const resumen = socios.map((s) => {
    const asignados = turnosSemana.filter((t) => asignaciones[t.id] === s.id);
    return {
      ...s,
      horas: asignados.reduce((acc, t) => acc + t.horas, 0),
      turnos: asignados.length,
      preferencias: asignados.filter((t) => esPreferido(s.id, t.id)).length,
      disponibles: turnosSemana.filter((t) => estaDisponible(s.id, t.id)).length,
    };
  });

  const etiquetaSemana = `${diasSemana[0].getDate()} ${MESES[diasSemana[0].getMonth()]} – ${diasSemana[6].getDate()} ${MESES[diasSemana[6].getMonth()]}`;

  return <div className="app-shell" style={{ "--socio-activo": socioActivo.color }}>
    <header className="hero">
      <div>
        <div className="kicker">El Fauno Blanco · socios</div>
        <h1>Turnos claros</h1>
        <p>Una sola app con perfiles: Socio 1, Socio 2 y Gestor. Cada uno ve funciones distintas según su perfil.</p>
      </div>
      <div className="profile-card">
        <label>Estoy entrando como</label>
        <div className="profile-buttons three">
          {socios.map((s) => <button key={s.id} className={perfil === s.id ? "profile active" : "profile"} style={{ "--socio": s.color }} onClick={() => patch({ perfil: s.id, paso: "disponibilidad" })}>
            <span></span>{s.nombre}
          </button>)}
          <button className={perfil === "gestor" ? "profile active gestor" : "profile gestor"} style={{ "--socio": "#0f766e" }} onClick={() => patch({ perfil: "gestor", paso: "asignacion" })}>
            <span></span>Gestor
          </button>
        </div>
      </div>
    </header>

    <section className="socios-card">
      {socios.map((s) => <div className="socio-line" key={s.id} style={{ "--socio": s.color }}>
        <span></span>
        <input value={s.nombre} onChange={(e) => actualizarSocio(s.id, "nombre", e.target.value)} />
        <input type="color" value={s.color} onChange={(e) => actualizarSocio(s.id, "color", e.target.value)} />
      </div>)}
    </section>

    <nav className="steps">
      {!esGestor && <button className={paso === "disponibilidad" ? "step active" : "step"} onClick={() => patch({ paso: "disponibilidad" })}><b>1</b><span>Disponible</span><small>cuándo puedo</small></button>}
      {!esGestor && <button className={paso === "preferencias" ? "step active" : "step"} onClick={() => patch({ paso: "preferencias" })}><b>2</b><span>Preferencias</span><small>qué prefiero</small></button>}
      <button className={paso === "asignacion" ? "step active" : "step"} onClick={() => patch({ paso: "asignacion" })}><b>{esGestor ? "G" : "3"}</b><span>{esGestor ? "Panel gestor" : "Resultado"}</span><small>máquina</small></button>
    </nav>

    <main className="panel">
      <div className="panel-head">
        <div>
          <h2>{esGestor ? "Panel del gestor" : paso === "disponibilidad" ? `Disponibilidad de ${socioActivo.nombre}` : paso === "preferencias" ? `Preferencias de ${socioActivo.nombre}` : `Resultado para ${socioActivo.nombre}`}</h2>
          <p>{esGestor ? "Revisa disponibilidad y preferencias de ambos socios. La app genera la asignación buscando equilibrio de horas y respetando preferencias cuando sea posible." : paso === "disponibilidad" ? "Marca solo los turnos en los que realmente puedes trabajar." : paso === "preferencias" ? "Marca los turnos que te vienen mejor. La máquina intentará darte algunas preferencias sin romper la equidad." : "Consulta el reparto que genera la máquina para esta semana."}</p>
        </div>
        <div className="week-control"><button onClick={() => cambiarSemana(-1)}>‹</button><strong>{etiquetaSemana}</strong><button onClick={() => cambiarSemana(1)}>›</button></div>
      </div>

      {(paso === "asignacion" || esGestor) && <div className="summary">
        {resumen.map((r) => <div key={r.id} className="summary-card" style={{ "--socio": r.color }}><b>{r.nombre}</b><strong>{r.horas} h</strong><span>{r.turnos} turnos · {r.preferencias} preferencias</span></div>)}
        <div className="summary-card neutral"><b>Diferencia</b><strong>{Math.abs(resumen[0].horas - resumen[1].horas)} h</strong><span>objetivo: mínima diferencia</span></div>
      </div>}

      <div className="role-note">
        {esGestor ? "Vista gestor: puede generar el reparto y ver todos los datos." : `Vista socio: estás editando solo los datos de ${socioActivo.nombre}.`}
      </div>

      <div className="actions">
        <button className="secondary" onClick={limpiarSemana}>Limpiar semana</button>
        <button className="primary" onClick={generarAsignacion}>Generar asignación</button>
      </div>

      <section className="week-list">
        {diasSemana.map((fecha) => {
          const diaId = ymd(fecha);
          const turnos = turnosDelDia(fecha);
          return <article className={turnos.length ? "day-card" : "day-card closed-day"} key={diaId}>
            <header><div><strong>{DIAS[fecha.getDay()]} {fecha.getDate()}</strong><span>{MESES[fecha.getMonth()]}</span></div>{turnos.length ? <em>{turnos.length} turnos</em> : <em>Cerrado</em>}</header>
            {turnos.map((turno) => {
              const id = claveTurno(diaId, turno.key);
              const asignado = socios.find((s) => s.id === asignaciones[id]);
              const marcado = !esGestor && (paso === "disponibilidad" ? estaDisponible(perfil, id) : esPreferido(perfil, id));
              return <div className={`shift-card ${turno.key}`} key={id}>
                <div className="shift-title"><b>{turno.icono} {turno.nombre}</b><span>{turno.rango}</span><strong>{turno.horas} h</strong></div>
                {!esGestor && paso !== "asignacion" ? <button className={marcado ? "big-toggle on" : "big-toggle"} onClick={() => paso === "disponibilidad" ? toggleDisponibilidad(id) : togglePreferencia(id)} disabled={paso === "preferencias" && !estaDisponible(perfil, id)}>
                  {marcado ? "✓ Marcado" : paso === "disponibilidad" ? "Estoy disponible" : estaDisponible(perfil, id) ? "Lo prefiero" : "No disponible"}
                </button> : <div className="assigned" style={{ "--socio": asignado?.color || "#94a3b8" }}>{asignado ? asignado.nombre : "Sin cubrir"}</div>}
                {(paso === "asignacion" || esGestor) && <div className="mini-prefs">{socios.map((s) => <span key={s.id} style={{ "--socio": s.color }}>{estaDisponible(s.id, id) ? "●" : "○"} {s.nombre}{esPreferido(s.id, id) ? " ★" : ""}</span>)}</div>}
              </div>;
            })}
          </article>;
        })}
      </section>
    </main>
    <div className="status">{mensaje}</div>
  </div>;
}
