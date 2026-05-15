import { useState, useEffect, useRef } from 'react';

const DELITOS_COLS = [
  { key: 'TASA_HURTO_A_PERSONAS',       label: 'Hurto Personas',  color: 'var(--crimson-light)' },
  { key: 'TASA_HURTO_A_COMERCIO',        label: 'Hurto Comercio',  color: 'var(--amber-light)'   },
  { key: 'TASA_LESIONES_PERSONALES',     label: 'Lesiones',        color: '#a78bfa'               },
  { key: 'TASA_VIOLENCIA_INTRAFAMILIAR', label: 'Viol. Intrafam.', color: 'var(--blue-light)'    },
  { key: 'TASA_HOMICIDIO',               label: 'Homicidio',       color: '#f87171'               },
];

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/* ─── Animated bar ─── */
function AnimatedBar({ pct, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ background: 'rgba(34,197,94,0.07)', borderRadius: 4, height: 4, overflow: 'hidden', marginTop: 4 }}>
      <div style={{
        width: `${width}%`, height: 4, borderRadius: 4,
        background: color,
        transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 6px ${color}88`,
      }} />
    </div>
  );
}

/* ─── HeatCell ─── */
function HeatCell({ value, max, color }) {
  const t  = max > 0 ? Math.min(1, value / max) : 0;
  const bg = t > 0.66
    ? `${color}28`
    : t > 0.33
    ? `${color}14`
    : 'transparent';
  return (
    <td style={{
      background: bg,
      padding: '10px 12px',
      textAlign: 'right',
      transition: 'background 0.2s',
      fontFamily: 'DM Mono, monospace',
      fontSize: '0.78rem',
      color: t > 0.5 ? color : 'var(--text-soft)',
      fontWeight: t > 0.66 ? 700 : 400,
    }}>
      {value.toFixed(1)}
    </td>
  );
}

/* ─── Badge helpers ─── */
function BadgeRiesgo({ riesgo }) {
  if (!riesgo) return null;
  const cls = riesgo.includes('Alto') ? 'alto'
    : riesgo.includes('Medio') ? 'medio' : 'bajo';
  return <span className={`badge ${cls}`}>{riesgo}</span>;
}

function BadgeLISA({ cluster }) {
  if (!cluster) return null;
  const cls = cluster === 'High-High' ? 'hh'
    : cluster === 'Low-Low'  ? 'll'
    : cluster === 'High-Low' ? 'hl'
    : cluster === 'Low-High' ? 'lh'
    : 'ns';
  return <span className={`badge ${cls}`}>{cluster}</span>;
}

/* ─── Modal de localidad (centrado) ─── */
function LocalidadModal({ row, maximos, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const riesgoColor = row.RF_riesgo_pred?.includes('Alto') ? 'var(--crimson-light)'
    : row.RF_riesgo_pred?.includes('Medio') ? 'var(--amber-light)'
    : 'var(--green-400)';

  const lisaColorMap = {
    'High-High': 'var(--crimson-light)',
    'Low-Low':   'var(--blue-light)',
    'High-Low':  'var(--amber-light)',
    'Low-High':  'var(--green-400)',
  };
  const lisaColor = lisaColorMap[row.LISA_cluster] || 'var(--text-muted)';

  /* Carrusel de delitos dentro del modal */
  const [delitoIdx, setDelitoIdx] = useState(0);
  const delitoActivo = DELITOS_COLS[delitoIdx];
  const delitoVal    = row[delitoActivo.key] || 0;
  const delitoPct    = Math.min(100, (delitoVal / (maximos[delitoActivo.key] || 1)) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
            color: 'var(--green-300)', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Perfil de Criminalidad
          </div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: '1.6rem',
            fontWeight: 700, color: 'var(--text)', marginBottom: 12,
          }}>
            {toTitleCase(row.LOCALIDAD_GEO)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: 'var(--green-300)',
            }}>
              Indice: {row.INDICE_CRIMEN?.toFixed(3)}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
              padding: '4px 12px', borderRadius: 20,
              background: `${riesgoColor}18`, border: `1px solid ${riesgoColor}33`,
              color: riesgoColor,
            }}>
              {row.RF_riesgo_pred}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
              padding: '4px 12px', borderRadius: 20,
              background: `${lisaColor}18`, border: `1px solid ${lisaColor}33`,
              color: lisaColor,
            }}>
              LISA: {row.LISA_cluster}
            </span>
          </div>
        </div>

        {/* Tasas — todas */}
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
          color: 'var(--green-300)', textTransform: 'uppercase',
          letterSpacing: '0.12em', marginBottom: '1rem', opacity: 0.8,
        }}>
          Tasas por 100.000 habitantes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.6rem' }}>
          {DELITOS_COLS.map((d, i) => {
            const val = row[d.key] || 0;
            const pct = Math.min(100, (val / (maximos[d.key] || 1)) * 100);
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{d.label}</span>
                  <span style={{
                    fontFamily: 'DM Mono, monospace', fontSize: '0.78rem',
                    fontWeight: 700, color: d.color,
                  }}>
                    {val.toFixed(1)}/100k
                  </span>
                </div>
                <AnimatedBar pct={pct} color={d.color} delay={i * 80} />
              </div>
            );
          })}
        </div>

        {/* Carrusel de delito destacado */}
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
          color: 'var(--green-300)', textTransform: 'uppercase',
          letterSpacing: '0.12em', marginBottom: '0.8rem', opacity: 0.8,
        }}>
          Comparación con la localidad más afectada
        </div>
        <div style={{
          background: `${delitoActivo.color}0a`,
          border: `1px solid ${delitoActivo.color}22`,
          borderRadius: 12, padding: '1.2rem',
          transition: 'all 0.3s ease',
          marginBottom: '0.8rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
              {delitoActivo.label}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '1.1rem',
              fontWeight: 700, color: delitoActivo.color,
              textShadow: `0 0 16px ${delitoActivo.color}44`,
            }}>
              {delitoVal.toFixed(1)}
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <AnimatedBar pct={delitoPct} color={delitoActivo.color} delay={100} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            {delitoPct.toFixed(1)}% del maximo en el ranking ({maximos[delitoActivo.key]?.toFixed(1)})
          </div>
        </div>

        {/* Controles carrusel interno */}
        <div className="carousel-controls" style={{ marginTop: 0 }}>
          <button className="carousel-btn" onClick={() => setDelitoIdx(i => i - 1)} disabled={delitoIdx === 0}>←</button>
          <div className="carousel-dots">
            {DELITOS_COLS.map((_, i) => (
              <button key={i} className={`carousel-dot${i === delitoIdx ? ' active' : ''}`} onClick={() => setDelitoIdx(i)} />
            ))}
          </div>
          <button className="carousel-btn" onClick={() => setDelitoIdx(i => i + 1)} disabled={delitoIdx === DELITOS_COLS.length - 1}>→</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sort icon ─── */
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <span style={{ color: 'var(--border-2)', marginLeft: 4, fontSize: '0.7rem' }}>↕</span>;
  return <span style={{ color: 'var(--green-300)', marginLeft: 4, fontSize: '0.7rem' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

/* ─── Row con animacion ─── */
function TableRow({ row, index, maximos, onClick, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const indiceColor = row.INDICE_CRIMEN > 1.5 ? 'var(--crimson-light)'
    : row.INDICE_CRIMEN > 0.8 ? 'var(--amber-light)'
    : 'var(--green-400)';

  return (
    <tr
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease, background 0.2s',
        cursor: 'pointer',
      }}
      onClick={() => onClick(row)}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ textAlign: 'center', padding: '11px 10px' }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: index === 0 ? 'rgba(239,68,68,0.15)'
            : index === 1 ? 'rgba(249,115,22,0.12)'
            : index === 2 ? 'rgba(96,165,250,0.1)'
            : 'rgba(34,197,94,0.06)',
          border: `1px solid ${index === 0 ? 'rgba(239,68,68,0.3)' : index === 1 ? 'rgba(249,115,22,0.25)' : index === 2 ? 'rgba(96,165,250,0.2)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
          fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', fontWeight: 700,
          color: index === 0 ? 'var(--crimson-light)' : index === 1 ? 'var(--amber-light)' : index === 2 ? 'var(--blue-light)' : 'var(--text-muted)',
        }}>
          {index + 1}
        </div>
      </td>
      <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--text)', fontSize: '0.82rem' }}>
        {toTitleCase(row.LOCALIDAD_GEO)}
      </td>
      <td style={{ textAlign: 'right', padding: '11px 16px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: indiceColor, fontSize: '0.82rem' }}>
        {row.INDICE_CRIMEN?.toFixed(3)}
      </td>
      {DELITOS_COLS.map(d => (
        <HeatCell
          key={d.key}
          value={row[d.key] || 0}
          max={maximos[d.key]}
          color={d.color}
        />
      ))}
      <td style={{ textAlign: 'center', padding: '11px 12px' }}>
        <BadgeLISA cluster={row.LISA_cluster} />
      </td>
      <td style={{ textAlign: 'center', padding: '11px 12px' }}>
        <BadgeRiesgo riesgo={row.RF_riesgo_pred} />
      </td>
      <td style={{ textAlign: 'center', padding: '11px 10px' }}>
        <div style={{
          fontSize: '0.6rem', color: 'var(--green-300)',
          fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
          opacity: 0.55,
        }}>
          ver →
        </div>
      </td>
    </tr>
  );
}

/* ─── Cards resumen top 3 ─── */
function TopCard({ row, rank, maximos, onClick }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), rank * 120);
    return () => clearTimeout(t);
  }, [rank]);

  const medal = rank === 0 ? 'var(--crimson-light)' : rank === 1 ? 'var(--amber-light)' : 'var(--blue-light)';
  const medalBg = rank === 0 ? 'rgba(239,68,68,0.06)' : rank === 1 ? 'rgba(249,115,22,0.06)' : 'rgba(96,165,250,0.06)';

  const maxDelito = DELITOS_COLS.reduce((best, d) => {
    return (row[d.key] || 0) > (row[best.key] || 0) ? d : best;
  }, DELITOS_COLS[0]);

  return (
    <div
      className="chart-box"
      style={{
        borderTop: `2px solid ${medal}`,
        marginBottom: 0, cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        background: medalBg,
      }}
      onClick={() => onClick(row)}
    >
      {/* Rank badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Posicion #{rank + 1}
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `${medal}15`, border: `1px solid ${medal}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.78rem',
          color: medal,
        }}>
          {rank + 1}
        </div>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)', marginBottom: 8 }}>
        {toTitleCase(row.LOCALIDAD_GEO)}
      </div>

      {/* Indice grande */}
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '1.8rem', color: medal, lineHeight: 1,
        textShadow: `0 0 24px ${medal}44`,
        marginBottom: 4,
      }}>
        {row.INDICE_CRIMEN?.toFixed(3)}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>
        nivel compuesto de criminalidad
      </div>

      {/* Delito dominante */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Delito dominante</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: maxDelito.color, fontWeight: 700 }}>
            {(row[maxDelito.key] || 0).toFixed(1)}
          </span>
        </div>
        <AnimatedBar
          pct={Math.min(100, ((row[maxDelito.key] || 0) / (maximos[maxDelito.key] || 1)) * 100)}
          color={maxDelito.color}
          delay={rank * 120 + 300}
        />
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>{maxDelito.label}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <BadgeRiesgo riesgo={row.RF_riesgo_pred} />
        <BadgeLISA cluster={row.LISA_cluster} />
      </div>

      <div style={{
        position: 'absolute', bottom: 12, right: 14,
        fontSize: '0.6rem', color: 'var(--green-300)',
        fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
        opacity: 0.55,
      }}>
        ver análisis →
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function TablaRanking({ graficos }) {
  const [sortKey, setSortKey] = useState('INDICE_CRIMEN');
  const [sortDir, setSortDir] = useState('desc');
  const [filtro, setFiltro]   = useState('');
  const [modalRow, setModalRow] = useState(null);
  const [filterFocus, setFilterFocus] = useState(false);
  const inputRef = useRef(null);

  const top10 = graficos.top10_criminalidad;

  const maximos = Object.fromEntries(
    DELITOS_COLS.map(d => [
      d.key,
      Math.max(...top10.map(r => r[d.key] || 0))
    ])
  );
  maximos['INDICE_CRIMEN'] = Math.max(...top10.map(r => r.INDICE_CRIMEN || 0));

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const datos = [...top10]
    .filter(r => r.LOCALIDAD_GEO.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => {
      const va = typeof a[sortKey] === 'string' ? a[sortKey] : (a[sortKey] ?? 0);
      const vb = typeof b[sortKey] === 'string' ? b[sortKey] : (b[sortKey] ?? 0);
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const thStyle = {
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    transition: 'color 0.2s',
  };

  return (
    <div>
      {modalRow && (
        <LocalidadModal
          row={modalRow}
          maximos={maximos}
          onClose={() => setModalRow(null)}
        />
      )}

      <div style={{ marginBottom: '2rem' }}>
        <p className="section-title gradient-text">Ranking de Localidades</p>
        <p className="section-subtitle">
          Clasificación por nivel de criminalidad — clic en cualquier fila para ver el perfil completo de seguridad
        </p>
      </div>

      {/* Cards top 3 */}
      <div className="three-col" style={{ marginBottom: '1.6rem' }}>
        {top10.slice(0, 3).map((row, i) => (
          <TopCard
            key={row.LOCALIDAD_GEO}
            row={row}
            rank={i}
            maximos={maximos}
            onClick={setModalRow}
          />
        ))}
      </div>

      <div className="glow-divider" />

      {/* Buscador */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute', left: 12,
            width: 14, height: 14,
            borderRadius: '50%',
            border: `1.5px solid ${filterFocus ? 'var(--green-400)' : 'var(--text-muted)'}`,
            transition: 'border-color 0.2s',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', left: 21, bottom: 9,
            width: 5, height: 1.5,
            background: filterFocus ? 'var(--green-400)' : 'var(--text-muted)',
            borderRadius: 2,
            transform: 'rotate(45deg)',
            transition: 'background 0.2s',
            pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar localidad..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            onFocus={() => setFilterFocus(true)}
            onBlur={() => setFilterFocus(false)}
            style={{
              background:     filterFocus ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.03)',
              border:         `1px solid ${filterFocus ? 'var(--glass-border-2)' : 'var(--glass-border)'}`,
              borderRadius:   20,
              padding:        '8px 16px 8px 36px',
              color:          'var(--text)',
              fontSize:       '0.82rem',
              width:          260,
              outline:        'none',
              transition:     'all 0.25s ease',
              boxShadow:      filterFocus ? '0 0 16px rgba(34,197,94,0.12)' : 'none',
              backdropFilter: 'blur(12px)',
              fontFamily:     'DM Sans, sans-serif',
            }}
          />
        </div>
        {filtro && (
          <button
            onClick={() => setFiltro('')}
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 20, padding: '6px 14px',
              color: 'var(--crimson-light)', fontSize: '0.75rem',
              cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            limpiar
          </button>
        )}
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'DM Mono, monospace', fontSize: '0.65rem',
          color: 'var(--text-muted)',
        }}>
          {datos.length} / {top10.length} localidades
        </div>
      </div>

      {/* Tabla */}
      <div className="chart-box" style={{ padding: '1.2rem' }}>
        <h3>Ranking por nivel de criminalidad — tasas por 100.000 hab. — clic en fila para ver análisis</h3>
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: 44 }}>#</th>
                <th style={thStyle} onClick={() => handleSort('LOCALIDAD_GEO')}>
                  Localidad <SortIcon col="LOCALIDAD_GEO" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('INDICE_CRIMEN')}>
                  Indice <SortIcon col="INDICE_CRIMEN" sortKey={sortKey} sortDir={sortDir} />
                </th>
                {DELITOS_COLS.map(d => (
                  <th
                    key={d.key}
                    style={{ ...thStyle, textAlign: 'right' }}
                    onClick={() => handleSort(d.key)}
                  >
                    {d.label} <SortIcon col={d.key} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>LISA</th>
                <th style={{ textAlign: 'center' }}>Riesgo RF</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {datos.length === 0 ? (
                <tr>
                  <td colSpan={DELITOS_COLS.length + 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.78rem' }}>
                    Sin resultados para "{filtro}"
                  </td>
                </tr>
              ) : (
                datos.map((row, i) => (
                  <TableRow
                    key={row.LOCALIDAD_GEO}
                    row={row}
                    index={i}
                    maximos={maximos}
                    onClick={setModalRow}
                    delay={i * 55}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Leyenda heat */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            Intensidad de celda:
          </span>
          {[
            { label: 'Bajo', bg: 'transparent', border: 'var(--border)' },
            { label: 'Medio', bg: 'rgba(249,115,22,0.14)', border: 'transparent' },
            { label: 'Alto', bg: 'rgba(239,68,68,0.28)', border: 'transparent' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 10, borderRadius: 2, background: l.bg, border: `1px solid ${l.border || 'transparent'}` }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}