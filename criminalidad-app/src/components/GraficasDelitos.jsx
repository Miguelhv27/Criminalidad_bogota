import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from 'recharts';

/* ─── Constantes ─── */
const DELITOS = [
  { key: 'TASA_HURTO_A_PERSONAS',       label: 'Hurto Personas',     color: '#ef4444', short: 'Hurto P.' },
  { key: 'TASA_HURTO_A_COMERCIO',        label: 'Hurto Comercio',     color: '#f59e0b', short: 'Hurto C.' },
  { key: 'TASA_LESIONES_PERSONALES',     label: 'Lesiones',           color: '#a78bfa', short: 'Lesiones' },
  { key: 'TASA_VIOLENCIA_INTRAFAMILIAR', label: 'Viol. Intrafamiliar',color: '#60a5fa', short: 'V. Intraf.' },
];

function toTitle(str) {
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/* ─── Tooltip glass ─── */
const GlassTooltip = ({ active, payload, label, unit = '/100k' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(6,20,12,0.95)',
      backdropFilter: 'blur(32px)',
      border: '1px solid rgba(34,197,94,0.25)',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 0 40px rgba(34,197,94,0.12), 0 16px 48px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(134,239,172,0.4),transparent)',
      }} />
      <p style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.83rem', color: 'var(--text)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ fontSize: '0.77rem', color: 'var(--text-soft)' }}>
            {p.name}: <strong style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Selector de delito ─── */
function DelitoSelector({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.2rem' }}>
      {DELITOS.map(d => (
        <button
          key={d.key}
          onClick={() => onChange(d.key)}
          style={{
            background:   selected === d.key ? `${d.color}18` : 'rgba(34,197,94,0.04)',
            border:       `1px solid ${selected === d.key ? d.color : 'rgba(34,197,94,0.15)'}`,
            borderRadius: 20,
            padding:      '6px 16px',
            color:        selected === d.key ? d.color : 'var(--text-muted)',
            fontSize:     '0.78rem',
            fontWeight:   selected === d.key ? 700 : 400,
            cursor:       'pointer',
            transition:   'all 0.25s cubic-bezier(0.22,1,0.36,1)',
            boxShadow:    selected === d.key ? `0 0 16px ${d.color}30` : 'none',
            backdropFilter: 'blur(12px)',
          }}
        >
          {d.short}
        </button>
      ))}
    </div>
  );
}

/* ─── Badge Moran ─── */
function MoranBadge({ significativo, I, p }) {
  const color = significativo ? '#ef4444' : 'var(--text-muted)';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: significativo ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.04)',
      border: `1px solid ${significativo ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.12)'}`,
      borderRadius: 20, padding: '5px 14px', fontSize: '0.72rem',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color,
        boxShadow: significativo ? `0 0 8px ${color}` : 'none',
        animation: significativo ? 'pulse-green 2s infinite' : 'none',
      }} />
      <span style={{ color, fontFamily: 'DM Mono, monospace' }}>
        I = {isNaN(I) ? 'N/A' : I?.toFixed(4)} — p = {p?.toFixed(3)} — {significativo ? 'Significativo' : 'No significativo'}
      </span>
    </div>
  );
}

/* ─── Drawer de localidad ─── */
function LocalidadDrawer({ feature, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const p = feature.properties;
  const name = toTitle(p.LOCALIDAD_GEO);
  const riesgoColor = p.RF_riesgo_pred?.includes('Alto') ? '#ef4444'
    : p.RF_riesgo_pred?.includes('Medio') ? '#f59e0b'
    : '#4ade80';

  const delitosBars = DELITOS.map(d => ({
    label: d.label,
    value: p[d.key] || 0,
    color: d.color,
  }));
  const maxVal = Math.max(...delitosBars.map(d => d.value));

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: '1.2rem', right: '1.2rem' }}>
          ✕
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.8rem', paddingRight: '2.5rem' }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
            color: 'var(--green-300)', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Perfil de Seguridad — Localidad
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            {name}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.63rem',
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: 'var(--green-300)',
            }}>
              Índice: {p.INDICE_CRIMEN?.toFixed(3)}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.63rem',
              padding: '4px 12px', borderRadius: 20,
              background: `${riesgoColor}18`, border: `1px solid ${riesgoColor}33`,
              color: riesgoColor,
            }}>
              {p.RF_riesgo_pred}
            </span>
          </div>
        </div>

        {/* Barras de delitos */}
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: '0.62rem',
          color: 'var(--green-300)', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: '1rem', opacity: 0.8,
        }}>
          Tasas por 100.000 hab.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.8rem' }}>
          {delitosBars.map((d, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{d.label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', fontWeight: 600, color: d.color }}>
                  {d.value.toFixed(1)}
                </span>
              </div>
              <BarAnimated value={d.value} max={maxVal} color={d.color} delay={i * 100} />
            </div>
          ))}
        </div>

        {/* Cluster info */}
        <div style={{
          background: 'rgba(34,197,94,0.04)',
          border: '1px solid var(--glass-border)',
          borderRadius: 12, padding: '1rem 1.2rem',
        }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
            color: 'var(--green-300)', letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Zona y nivel de riesgo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
              LISA: <strong style={{ color: 'var(--text)' }}>{p.LISA_cluster}</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
              Riesgo RF: <strong style={{ color: riesgoColor }}>{p.RF_riesgo_pred}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Barra animada para el drawer ─── */
function BarAnimated({ value, max, color, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(max > 0 ? (value / max) * 100 : 0), delay + 100);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
      <div style={{
        width: `${w}%`, height: '100%', borderRadius: 6,
        background: color,
        transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 10px ${color}88`,
      }} />
    </div>
  );
}

/* ─── Glow Divider ─── */
function GlowDivider() {
  return <div className="glow-divider" />;
}

/* ─── Section Header ─── */
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p className="section-title gradient-text">{title}</p>
      <p className="section-subtitle">{sub}</p>
    </div>
  );
}

/* ─── Carrusel de cards Moran ─── */
function MoranCarousel({ items }) {
  const [idx, setIdx] = useState(0);
  const visibles = 3;
  const total = items.length;
  const maxIdx = Math.max(0, total - visibles);

  return (
    <div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${total}, calc(33.33% - 8px))`,
          gap: 12,
          transform: `translateX(calc(-${idx} * (33.33% + 4px)))`,
          transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}>
          {items.map((m, i) => {
            const sig   = m.significativo;
            const color = sig ? '#ef4444' : 'var(--text-muted)';
            return (
              <div
                key={i}
                className="chart-box"
                style={{
                  marginBottom: 0,
                  borderTop: `2px solid ${sig ? '#ef4444' : 'var(--glass-border)'}`,
                  minWidth: 0,
                }}
              >
                <div style={{
                  fontSize: '0.66rem', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                  fontFamily: 'DM Mono, monospace',
                }}>
                  {m.delito.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '1.4rem', color, marginBottom: 2,
                  textShadow: sig ? `0 0 20px ${color}44` : 'none',
                }}>
                  {isNaN(m.I) || m.I === null ? 'N/A' : m.I.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'DM Mono, monospace' }}>
                  p = {m.p.toFixed(3)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: color,
                    boxShadow: sig ? `0 0 8px ${color}` : 'none',
                  }} />
                  <span style={{ fontSize: '0.7rem', color }}>{sig ? 'Significativo' : 'No significativo'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controles */}
      {total > visibles && (
        <div className="carousel-controls" style={{ marginTop: '1rem' }}>
          <button className="carousel-btn" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>←</button>
          <div className="carousel-dots">
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button key={i} className={`carousel-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
            ))}
          </div>
          <button className="carousel-btn" onClick={() => setIdx(i => Math.min(maxIdx, i + 1))} disabled={idx === maxIdx}>→</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function GraficasDelitos({ graficos, geojson }) {
  const [delitoActivo, setDelitoActivo]   = useState('TASA_HURTO_A_PERSONAS');
  const [drawerFeature, setDrawerFeature] = useState(null);

  const features   = geojson.features;
  const delitoInfo = DELITOS.find(d => d.key === delitoActivo);

  const dataLocalidades = features
    .map(f => ({
      name: toTitle(f.properties.LOCALIDAD_GEO),
      ...Object.fromEntries(DELITOS.map(d => [d.key, f.properties[d.key] || 0])),
      INDICE_CRIMEN: f.properties.INDICE_CRIMEN || 0,
      LISA: f.properties.LISA_cluster,
      RIESGO: f.properties.RF_riesgo_pred,
      _feature: f,
    }))
    .sort((a, b) => b[delitoActivo] - a[delitoActivo]);

  const dataArea = features
    .map(f => ({
      name: toTitle(f.properties.LOCALIDAD_GEO),
      ...Object.fromEntries(DELITOS.map(d => [d.label, f.properties[d.key] || 0])),
    }))
    .sort((a, b) => b['Hurto Personas'] - a['Hurto Personas'])
    .slice(0, 10);

  const radarData = features.slice(0, 8).map(f => ({
    localidad: f.properties.LOCALIDAD_GEO.split(' ')[0],
    ...Object.fromEntries(DELITOS.map(d => [d.short, Math.min(100, (f.properties[d.key] || 0) / 10)])),
  }));

  const moranActivo = graficos.moran_por_delito.find(
    m => `TASA_${m.delito.replace(/ /g, '_')}` === delitoActivo
  );

  const maxVal = Math.max(...dataLocalidades.map(d => d[delitoActivo]));

  return (
    <div>
      {/* Drawer */}
      {drawerFeature && (
        <LocalidadDrawer feature={drawerFeature} onClose={() => setDrawerFeature(null)} />
      )}

      <SectionHeader
        title="Tipos de Delito en Bogotá"
        sub="Tasas por cada 100.000 habitantes — comparación entre localidades según tipo de delito"
      />

      {/* Explorador principal */}
      <div className="chart-box" style={{ marginBottom: '1.2rem' }}>
        <h3>Explorador por tipo de delito — clic en una barra para ver el perfil de esa localidad</h3>
        <DelitoSelector selected={delitoActivo} onChange={setDelitoActivo} />

        {moranActivo && (
          <div style={{ marginBottom: '1rem' }}>
            <MoranBadge significativo={moranActivo.significativo} I={moranActivo.I} p={moranActivo.p} />
          </div>
        )}

        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={dataLocalidades}
            margin={{ top: 8, right: 16, left: 0, bottom: 90 }}
            onClick={(data) => {
              if (data?.activePayload) {
                const name = data.activePayload[0]?.payload?.name;
                const feat = features.find(f => toTitle(f.properties.LOCALIDAD_GEO) === name);
                if (feat) setDrawerFeature(feat);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={delitoInfo?.color} stopOpacity={1} />
                <stop offset="100%" stopColor={delitoInfo?.color} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              angle={-45} textAnchor="end" interval={0}
              axisLine={{ stroke: 'rgba(34,197,94,0.1)' }} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
            <Bar dataKey={delitoActivo} name={delitoInfo?.label} radius={[4, 4, 0, 0]}>
              {dataLocalidades.map((entry, i) => {
                const intensity = entry[delitoActivo] / maxVal;
                return (
                  <Cell
                    key={i}
                    fill={delitoInfo?.color}
                    fillOpacity={0.25 + intensity * 0.75}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div style={{
          fontSize: '0.7rem', color: 'var(--text-muted)',
          marginTop: 8, fontFamily: 'DM Mono, monospace',
        }}>
          Haz clic en cualquier barra para ver el perfil completo de delitos de esa localidad
        </div>
      </div>

      <GlowDivider />

      {/* Area chart */}
      <div className="chart-box" style={{ marginBottom: '1.2rem' }}>
        <h3>Comparación de todos los delitos — Top 10 localidades más afectadas</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={dataArea} margin={{ top: 8, right: 16, left: 0, bottom: 90 }}>
            <defs>
              {DELITOS.map(d => (
                <linearGradient key={d.key} id={`grad_${d.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={d.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={d.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              angle={-45} textAnchor="end" interval={0}
              axisLine={{ stroke: 'rgba(34,197,94,0.1)' }} tickLine={false}
            />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(34,197,94,0.15)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: '0.74rem', color: 'var(--text-muted)', paddingTop: 16 }} />
            {DELITOS.map(d => (
              <Area
                key={d.key}
                type="monotone"
                dataKey={d.label}
                stroke={d.color}
                strokeWidth={2}
                fill={`url(#grad_${d.key})`}
                dot={false}
                activeDot={{ r: 4, fill: d.color, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <GlowDivider />

      {/* Indice compuesto + Radar */}
      <div className="two-col">
        <div className="chart-box">
          <h3>Índice compuesto de criminalidad — ranking por localidad</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={[...dataLocalidades].sort((a, b) => b.INDICE_CRIMEN - a.INDICE_CRIMEN)}
              layout="vertical"
              margin={{ top: 4, right: 50, left: 110, bottom: 4 }}
              onClick={(data) => {
                if (data?.activePayload) {
                  const name = data.activePayload[0]?.payload?.name;
                  const feat = features.find(f => toTitle(f.properties.LOCALIDAD_GEO) === name);
                  if (feat) setDrawerFeature(feat);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="indiceGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-soft)', fontSize: 10 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => (
                  <GlassTooltip active={active} payload={payload} label={label} unit="" />
                )}
                cursor={{ fill: 'rgba(34,197,94,0.04)' }}
              />
              <Bar dataKey="INDICE_CRIMEN" radius={[0, 4, 4, 0]}>
                {[...dataLocalidades]
                  .sort((a, b) => b.INDICE_CRIMEN - a.INDICE_CRIMEN)
                  .map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.INDICE_CRIMEN > 1.5 ? '#ef4444'
                          : entry.INDICE_CRIMEN > 0.8 ? '#f59e0b'
                          : '#4ade80'}
                      fillOpacity={0.85}
                    />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="chart-box">
          <h3>Perfil de criminalidad por localidad</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
              <PolarGrid stroke="rgba(34,197,94,0.1)" />
              <PolarAngleAxis dataKey="localidad" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              {DELITOS.map(d => (
                <Radar
                  key={d.key}
                  name={d.short}
                  dataKey={d.short}
                  stroke={d.color}
                  fill={d.color}
                  fillOpacity={0.06}
                  strokeWidth={1.5}
                  dot={{ fill: d.color, r: 2, strokeWidth: 0 }}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{
                background: 'rgba(6,20,12,0.95)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 10, fontSize: '0.75rem',
              }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <GlowDivider />

      {/* Carrusel Moran */}
      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
        color: 'var(--green-300)', textTransform: 'uppercase',
        letterSpacing: '0.14em', marginBottom: '1rem', opacity: 0.8,
      }}>
        Concentración espacial por tipo de delito
      </div>
      <MoranCarousel items={graficos.moran_por_delito} />
    </div>
  );
}