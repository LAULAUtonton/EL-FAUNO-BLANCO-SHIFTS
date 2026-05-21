import { useEffect, useMemo, useState } from "react";
import "./style.css";

const STORAGE = "fauno-blanco-v7-visual";
const SOCIOS_INICIALES = [
  { id: "socio1", nombre: "Socio 1", color: "#2563eb" },
  { id: "socio2", nombre: "Socio 2", color: "#f97316" },
];

const TURNOS_BASE = [
  { key: "manana", nombre: "Mañana", icono: "☀️", horas: 6, rango: "08:30–14:30" },
  { key: "tarde", nombre: "Tarde", icono: "🌤️", horas: 6, rango: "14:30–20:30" },
];
const TURNO_NOCHE = { key: "noche", nombre: "Noche", icono: "🌙", horas: 4, rango: "20:30–00:30" };
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function ymd(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
function claveTurno(diaId, turnoKey) {
  return `${diaId}__${turnoKey}`;
}
function fechaDeYmd(id) {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function turnosDelDia(fecha) {
  const dow = fecha.getDay();
  if (dow === 0) return [];
  const turnos = [...TURNOS_BASE];
  if (dow === 5 || dow === 6) turnos.push(TURNO_NOCHE);
  return turnos;
}
function crearDiasMes(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const total = Math.ceil((start.getDay() + last.getDate()) / 7) * 7;
  return Array.from({ length: Math.max(total, 35) }, (_, i) => {
    const f = new Date(start);
    f.setDate(start.getDate() + i);
    return f;
  });
}
function estadoInicial() {
  const hoy = new Date();
  return {
    paso: "disponibilidad",
    mes: { year: hoy.getFullYear(), month: hoy.getMonth() },
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
  const { paso, mes, socios, disponibilidad, preferencias, asignaciones } = state;
  const [toast, setToast] = useState("Primero marca cuándo puede trabajar cada socio.");

  const dias = useMemo(() => crearDiasMes(mes.year, mes.month), [mes]);
  const turnosMes = useMemo(() => dias
    .filter((f) => f.getMonth() === mes.month)
    .flatMap((fecha) => turnosDelDia(fecha).map((turno) => ({ ...turno, fecha, diaId: ymd(fecha), id: claveTurno(ymd(fecha), turno.key) }))), [dias, mes.month]);
  const resumen = useMemo(() => calcularResumen(socios, turnosMes, asignaciones, preferencias), [socios, turnosMes, asignaciones, preferencias]);

  useEffect(() => localStorage.setItem(STORAGE, JSON.stringify(state)), [state]);

  function setParcial(patch) {
    setState((prev) => ({ ...prev, ...patch }));
  }
  function cambiarMes(delta) {
    const f = new Date(mes.year, mes.month + delta, 1);
    setParcial({ mes: { year: f.getFullYear(), month: f.getMonth() } });
  }
  function cambiarSocio(id, campo, valor) {
    setParcial({ socios: socios.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)) });
  }
  function toggle(mapa, socioId, turnoId) {
    const nuevo = { ...mapa, [socioId]: { ...(mapa[socioId] || {}), [turnoId]: !mapa[socioId]?.[turnoId] } };
    return nuevo;
  }
  function generarAsignacion() {
    const horas = Object.fromEntries(socios.map((s) => [s.id, 0]));
    const turnos = Object.fromEntries(socios.map((s) => [s.id, 0]));
    const prefsDadas = Object.fromEntries(socios.map((s) => [s.id, 0]));
    const asignado = {};
    let sinCubrir = 0;

    for (const turno of turnosMes) {
      const candidatos = socios
        .filter((s) => disponibilidad[s.id]?.[turno.id])
        .map((s) => {
          const yaEseDia = Object.entries(asignado).some(([k, v]) => k.startsWith(`${turno.diaId}__`) && v === s.id);
          const quiere = preferencias[s.id]?.[turno.id] ? 1 : 0;
          return {
            ...s,
            quiere,
            score: horas[s.id] * 10 + turnos[s.id] * 2 + (yaEseDia ? 14 : 0) - quiere * 8 + prefsDadas[s.id] * 3,
          };
        })
        .sort((a, b) => a.score - b.score || b.quiere - a.quiere || horas[a.id] - horas[b.id]);

      if (!candidatos.length) {
        asignado[turno.id] = "sin-cubrir";
        sinCubrir += 1;
      } else {
        const elegido = candidatos[0];
        asignado[turno.id] = elegido.id;
        horas[elegido.id] += turno.horas;
        turnos[elegido.id] += 1;
        if (elegido.quiere) prefsDadas[elegido.id] += 1;
      }
    }
    setParcial({ asignaciones: asignado, paso: "asignacion" });
    const diff = Math.abs((horas[socios[0]?.id] || 0) - (horas[socios[1]?.id] || 0));
    setToast(sinCubrir ? `Hay ${sinCubrir} turnos sin cubrir. Revisa disponibilidad.` : `Asignación generada. Diferencia: ${diff} horas.`);
  }
  function limpiar() {
    setParcial({ disponibilidad: {}, preferencias: {}, asignaciones: {} });
    setToast("Datos del mes borrados. Puedes empezar de nuevo.");
  }

  return (
    <main className="phone-app">
      <header className="top-card">
        <div className="brand-line"><span>🦌</span><b>El Fauno Blanco</b></div>
        <h1>Turnos del mes</h1>
        <p>Calendario visual para repartir los turnos entre dos socios con equilibrio y preferencias.</p>
        <div className="month-bar">
          <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior">←</button>
          <strong>{MESES[mes.month]} {mes.year}</strong>
          <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente">→</button>
        </div>
      </header>

      <section className="people-panel">
        {socios.map((s) => (
          <div className="person" key={s.id} style={{ "--person": s.color }}>
            <span className="avatar">●</span>
            <input value={s.nombre} onChange={(e) => cambiarSocio(s.id, "nombre", e.target.value)} />
            <input type="color" value={s.color} onChange={(e) => cambiarSocio(s.id, "color", e.target.value)} aria-label={`Color de ${s.nombre}`} />
          </div>
        ))}
      </section>

      <nav className="stepper">
        <Step id="disponibilidad" paso={paso} n="1" icon="✅" title="Disponible" onClick={() => setParcial({ paso: "disponibilidad" })} />
        <Step id="preferencias" paso={paso} n="2" icon="⭐" title="Preferencias" onClick={() => setParcial({ paso: "preferencias" })} />
        <Step id="asignacion" paso={paso} n="3" icon="⚙️" title="Asignación" onClick={() => setParcial({ paso: "asignacion" })} />
      </nav>

      <section className="work-card">
        <div className="action-head">
          <div>
            <h2>{paso === "disponibilidad" ? "Marca disponibilidad" : paso === "preferencias" ? "Marca lo que prefiere cada socio" : "Resultado automático"}</h2>
            <p>{paso === "disponibilidad" ? "Pulsa el nombre del socio en cada turno en el que pueda trabajar." : paso === "preferencias" ? "Solo se puede preferir un turno si antes estaba disponible." : "La app prioriza equilibrio de horas y reparte algunas preferencias."}</p>
          </div>
          <button className="big-cta" onClick={generarAsignacion}>Asignar</button>
        </div>

        {paso === "asignacion" && <Resumen socios={socios} resumen={resumen} />}

        <Calendar
          dias={dias}
          mes={mes.month}
          socios={socios}
          paso={paso}
          disponibilidad={disponibilidad}
          preferencias={preferencias}
          asignaciones={asignaciones}
          onToggleDisponibilidad={(sid, tid) => setParcial({ disponibilidad: toggle(disponibilidad, sid, tid) })}
          onTogglePreferencia={(sid, tid) => setParcial({ preferencias: toggle(preferencias, sid, tid) })}
        />
      </section>

      <footer className="bottom-bar">
        <span>{toast}</span>
        <button onClick={limpiar}>Limpiar</button>
      </footer>
    </main>
  );
}

function Step({ id, paso, n, icon, title, onClick }) {
  return <button className={paso === id ? "step active" : "step"} onClick={onClick}><small>{n}</small><span>{icon}</span><b>{title}</b></button>;
}

function Calendar(props) {
  return (
    <div className="calendar-scroller">
      <div className="week-row">{DIAS.map((d) => <b key={d}>{d}</b>)}</div>
      <div className="month-grid">
        {props.dias.map((fecha) => <Day key={ymd(fecha)} fecha={fecha} {...props} />)}
      </div>
    </div>
  );
}

function Day({ fecha, mes, socios, paso, disponibilidad, preferencias, asignaciones, onToggleDisponibilidad, onTogglePreferencia }) {
  const fuera = fecha.getMonth() !== mes;
  const diaId = ymd(fecha);
  const turnos = turnosDelDia(fecha);
  return (
    <article className={`day ${fuera ? "outside" : ""} ${fecha.getDay() === 0 ? "sunday" : ""}`}>
      <header><strong>{fecha.getDate()}</strong><span>{DIAS[fecha.getDay()]}</span></header>
      {turnos.length === 0 ? <div className="closed">Cerrado</div> : turnos.map((turno) => {
        const id = claveTurno(diaId, turno.key);
        const socioAsignado = socios.find((s) => s.id === asignaciones[id]);
        return (
          <div className={`shift ${turno.key}`} key={id}>
            <div className="shift-main"><span>{turno.icono}</span><b>{turno.nombre}</b><em>{turno.horas} h</em></div>
            <small>{turno.rango}</small>
            {paso !== "asignacion" ? (
              <div className="person-buttons">
                {socios.map((s) => {
                  const selected = paso === "disponibilidad" ? disponibilidad[s.id]?.[id] : preferencias[s.id]?.[id];
                  const disabled = paso === "preferencias" && !disponibilidad[s.id]?.[id];
                  return <button key={s.id} disabled={disabled} className={selected ? "picked" : ""} style={selected ? { backgroundColor: s.color, borderColor: s.color } : {}} onClick={() => paso === "disponibilidad" ? onToggleDisponibilidad(s.id, id) : onTogglePreferencia(s.id, id)}>{s.nombre}</button>;
                })}
              </div>
            ) : (
              <div className="assignment" style={socioAsignado ? { backgroundColor: socioAsignado.color } : {}}>{socioAsignado ? socioAsignado.nombre : "Sin cubrir"}</div>
            )}
          </div>
        );
      })}
    </article>
  );
}

function calcularResumen(socios, turnos, asignaciones, preferencias) {
  const r = Object.fromEntries(socios.map((s) => [s.id, { horas: 0, turnos: 0, prefs: 0 }]));
  for (const t of turnos) {
    const sid = asignaciones[t.id];
    if (!r[sid]) continue;
    r[sid].horas += t.horas;
    r[sid].turnos += 1;
    if (preferencias[sid]?.[t.id]) r[sid].prefs += 1;
  }
  return r;
}
function Resumen({ socios, resumen }) {
  const diff = Math.abs((resumen[socios[0]?.id]?.horas || 0) - (resumen[socios[1]?.id]?.horas || 0));
  return <div className="summary">{socios.map((s) => <div className="summary-card" key={s.id} style={{ borderColor: s.color }}><b>{s.nombre}</b><strong>{resumen[s.id]?.horas || 0} h</strong><span>{resumen[s.id]?.turnos || 0} turnos · {resumen[s.id]?.prefs || 0} preferencias</span></div>)}<div className="summary-card fair"><b>Equidad</b><strong>{diff} h</strong><span>diferencia total</span></div></div>;
}
