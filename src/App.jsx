import { useState } from 'react'
import "./style.css"

function App() {
  const [socios, setSocios] = useState([
    { id: 1, nombre: 'Socio 1', disponibilidad: 'disponible', horas: 0 },
    { id: 2, nombre: 'Socio 2', disponibilidad: 'disponible', horas: 0 }
  ])

  const [turnos, setTurnos] = useState({})
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)

  const diasSemana = [
    { nombre: 'Lunes', fecha: '2026-05-18' },
    { nombre: 'Martes', fecha: '2026-05-19' },
    { nombre: 'Miércoles', fecha: '2026-05-20' },
    { nombre: 'Jueves', fecha: '2026-05-21' },
    { nombre: 'Viernes', fecha: '2026-05-22' },
    { nombre: 'Sábado', fecha: '2026-05-23' }
  ]

  const tareasDiarias = [
    'Abrir caja', 'Revisar cambio', 'Reponer neveras', 
    'Reponer golosinas', 'Limpiar mostrador', 'Revisar caducidades', 'Cerrar caja'
  ]

  const asignarTurno = (dia, socioId) => {
    const socio = socios.find(s => s.id === socioId)
    if (socio.disponibilidad !== 'disponible') return

    const nuevoTurno = {
      socioId,
      socioNombre: socio.nombre,
      dia,
      horas: 4 // horas por turno estándar
    }

    setTurnos(prev => {
      const existing = prev[dia] || []
      // Si ya tiene turno ese socio ese día, no duplicar
      if (existing.some(t => t.socioId === socioId)) return prev
      return { ...prev, [dia]: [...existing, nuevoTurno] }
    })

    // Actualizar horas del socio
    setSocios(prev => prev.map(s => 
      s.id === socioId ? { ...s, horas: s.horas + 4 } : s
    ))
  }

  const getHorasPorDia = (dia) => {
    const turnosDia = turnos[dia] || []
    return turnosDia.reduce((total, t) => total + t.horas, 0)
  }

  const getSocioRecomendado = () => {
    return socios.reduce((min, s) => s.horas < min.horas ? s : min, socios[0])
  }

  const cambiarDisponibilidad = (socioId, estado) => {
    setSocios(prev => prev.map(s => 
      s.id === socioId ? { ...s, disponibilidad: estado } : s
    ))
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🦌 El Fauno Blanco</h1>
        <p className="subtitle">Planificación flexible de turnos</p>
      </header>

      {/* Stepper visual de 3 pasos */}
      <div className="stepper">
        <div className="step active">1. Marca disponibilidad</div>
        <div className="step">2. Asigna turnos</div>
        <div className="step">3. Revisa equilibrio</div>
      </div>

      <div className="main-container">
        {/* Panel izquierdo: Socios y disponibilidad */}
        <div className="left-panel">
          <div className="card">
            <h2>Estado de socios</h2>
            {socios.map(socio => (
              <div key={socio.id} className="socio-card">
                <div className="socio-header">
                  <span className={`status-badge ${socio.disponibilidad}`}>
                    {socio.disponibilidad === 'disponible' ? '✅' : '⛔'} {socio.disponibilidad}
                  </span>
                  <strong>{socio.nombre}</strong>
                  <span className="horas">{socio.horas}h</span>
                </div>
                <div className="dispo-buttons">
                  <button onClick={() => cambiarDisponibilidad(socio.id, 'disponible')} className="btn-dispo">Disponible</button>
                  <button onClick={() => cambiarDisponibilidad(socio.id, 'no-disponible')} className="btn-dispo">No disponible</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Equilibrio semanal</h2>
            <div className="balance-bars">
              {socios.map(socio => (
                <div key={socio.id} className="balance-item">
                  <span>{socio.nombre}</span>
                  <div className="bar-bg">
                    <div className="bar-fill" style={{ width: `${(socio.horas / 40) * 100}%` }}></div>
                  </div>
                  <span>{socio.horas}h</span>
                </div>
              ))}
            </div>
            <div className="recomendacion">
              🎯 Recomendado: {getSocioRecomendado().nombre} ({getSocioRecomendado().horas}h)
            </div>
          </div>
        </div>

        {/* Panel derecho: Calendario */}
        <div className="right-panel">
          <div className="calendario-grid">
            {diasSemana.map(dia => {
              const horasDia = getHorasPorDia(dia.fecha)
              const turnosDia = turnos[dia.fecha] || []
              const recomendado = getSocioRecomendado()
              
              return (
                <div key={dia.fecha} className="day-card" onClick={() => setDiaSeleccionado(dia.fecha)}>
                  <h3>{dia.nombre}</h3>
                  <div className="fecha">{dia.fecha}</div>
                  <div className="turnos-info">
                    <span className="turnos-count">{turnosDia.length} turnos</span>
                    <span className="horas-count">{horasDia}h</span>
                  </div>
                  <div className="asignar-turnos">
                    {socios.map(socio => {
                      const yaAsignado = turnosDia.some(t => t.socioId === socio.id)
                      return (
                        <button
                          key={socio.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            asignarTurno(dia.fecha, socio.id)
                          }}
                          disabled={yaAsignado || socio.disponibilidad !== 'disponible'}
                          className={`btn-asignar ${yaAsignado ? 'asignado' : ''}`}
                        >
                          {socio.nombre}
                        </button>
                      )
                    })}
                  </div>
                  {recomendado && turnosDia.length === 0 && (
                    <div className="recomendacion-dia">✨ Recomendado: {recomendado.nombre}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal de tareas del día (al hacer clic en un día) */}
      {diaSeleccionado && (
        <div className="modal" onClick={() => setDiaSeleccionado(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Tareas para {diaSeleccionado}</h2>
            <ul className="tareas-lista">
              {tareasDiarias.map((tarea, i) => (
                <li key={i}>
                  <input type="checkbox" id={`tarea-${i}`} />
                  <label htmlFor={`tarea-${i}`}>{tarea}</label>
                </li>
              ))}
            </ul>
            <button onClick={() => setDiaSeleccionado(null)} className="btn-cerrar">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
