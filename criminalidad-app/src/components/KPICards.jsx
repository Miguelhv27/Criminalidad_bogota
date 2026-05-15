import { useState, useEffect, useRef } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

/* ─── Count-up hook ─── */
function useCountUp(target, duration = 1600, decimals = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals]);
  return value;
}

/* ─── Animated bar ─── */
function AnimatedBar({ pct, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
      <div style={{
        width: `${width}%`, height: 6, borderRadius: 6,
        background: color,
        transition: 'width 1.1s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 10px ${color}88`,
      }} />
    </div>
  );
}

/* ─── Popover ─── */
function Popover({ children, content }) {
  const [show, setShow] = useState(false);
  const [pos, setPos]   = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMove}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          left: pos.x + 14,
          top: pos.y - 10,
          zIndex: 500,
          minWidth: 220,
          background: 'rgba(6,20,12,0.92)',
          backdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12,
          padding: '14px 18px',
          boxShadow: '0 0 40px rgba(34,197,94,0.15), 0 16px 48px rgba(0,0,0,0.6)',
          animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(134,239,172,0.4), transparent)',
          }} />
          {content}
        </div>
      )}
    </div>
  );
}

/* ─── KPI Card con popover ─── */
function KPICard({ label, value, sub, type, delay, popoverContent }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const colorMap = {
    accent: '#4ade80',
    aqua:   '#4ade80',
    ok:     '#22c55e',
    warn:   '#f59e0b',
    berry:  '#60a5fa',
  };
  const color = colorMap[type] || '#4ade80';

  const card = (
    <div className={`kpi-card ${type}`} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      transition: 'opacity 0.55s ease, transform 0.55s ease',
      cursor: popoverContent ? 'help' : 'default',
    }}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
      <div className="accent-bar" />
      {/* Orbe decorativo */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        width: 30, height: 30, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22, transparent)`,
        border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px ${color}`,
          animation: 'pulse-green 2.5s ease-in-out infinite',
        }} />
      </div>
    </div>
  );

  if (!popoverContent) return card;
  return <Popover content={popoverContent}>{card}</Popover>;
}

/* ─── Carrusel de hallazgos ─── */
function HallazgosCarousel({ items }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const go = (next) => {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };

  const item = items[idx];

  return (
    <div>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
        {/* Slide */}
        <div
          key={idx}
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: '2rem 2.4rem',
            borderTop: `3px solid ${item.color}`,
            boxShadow: `0 0 40px ${item.color}18, 0 16px 48px rgba(0,0,0,0.5)`,
            animation: 'carouselIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shine top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${item.color}44, transparent)`,
          }} />
          {/* Orbe fondo */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${item.color}0a, transparent 65%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.6rem' }}>
            {/* Icono */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: `${item.color}14`,
              border: `1px solid ${item.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: `0 0 20px ${item.color}22`,
            }}>
              {item.icon}
            </div>
            {/* Texto */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.62rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                marginBottom: 6,
              }}>
                {item.label}
              </div>
              <div style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '1.3rem', fontWeight: 700,
                color: item.color, marginBottom: 8,
                textShadow: `0 0 20px ${item.color}44`,
              }}>
                {item.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', lineHeight: 1.6 }}>
                {item.detail}
              </div>
              {/* Tags extra */}
              {item.tags && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {item.tags.map((tag, i) => (
                    <span key={i} style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '0.63rem',
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: `${item.color}12`,
                      border: `1px solid ${item.color}28`,
                      color: item.color,
                    }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Progreso */}
          <div style={{
            marginTop: '1.4rem',
            height: 2, borderRadius: 2,
            background: 'rgba(34,197,94,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${((idx + 1) / items.length) * 100}%`,
              background: item.color,
              borderRadius: 2,
              transition: 'width 0.4s ease',
              boxShadow: `0 0 8px ${item.color}`,
            }} />
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="carousel-controls" style={{ marginTop: '1rem' }}>
        <button
          className="carousel-btn"
          onClick={() => go(idx - 1)}
          disabled={idx === 0}
        >
          ←
        </button>
        <div className="carousel-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot${i === idx ? ' active' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button
          className="carousel-btn"
          onClick={() => go(idx + 1)}
          disabled={idx === items.length - 1}
        >
          →
        </button>
      </div>
    </div>
  );
}

/* ─── Modal de localidad ─── */
function LocalidadModal({ row, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const riesgoColor = row.RF_riesgo_pred?.includes('Alto') ? 'var(--crimson-light)'
    : row.RF_riesgo_pred?.includes('Medio') ? 'var(--amber-light)'
    : 'var(--green-400)';

  const metrics = [
    { label: 'Hurto a personas',    value: row.TASA_HURTO_A_PERSONAS?.toFixed(1),       unit: '/100k' },
    { label: 'Hurto a comercio',    value: row.TASA_HURTO_A_COMERCIO?.toFixed(1),        unit: '/100k' },
    { label: 'Lesiones personales', value: row.TASA_LESIONES_PERSONALES?.toFixed(1),     unit: '/100k' },
    { label: 'Viol. intrafamiliar', value: row.TASA_VIOLENCIA_INTRAFAMILIAR?.toFixed(1), unit: '/100k' },
    { label: 'Homicidio',          value: row.TASA_HOMICIDIO?.toFixed(1),               unit: '/100k' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.62rem',
            color: 'var(--green-300)', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Análisis por Localidad
          </div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: '1.6rem',
            fontWeight: 700, color: 'var(--text)', marginBottom: 10,
          }}>
            {row.LOCALIDAD_GEO?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.65rem',
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              color: 'var(--green-300)',
            }}>
              Índice: {row.INDICE_CRIMEN?.toFixed(3)}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.65rem',
              padding: '4px 12px', borderRadius: 20,
              background: `${riesgoColor}18`,
              border: `1px solid ${riesgoColor}33`,
              color: riesgoColor,
            }}>
              {row.RF_riesgo_pred}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.65rem',
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.25)',
              color: '#93c5fd',
            }}>
              Zona: {row.LISA_cluster}
            </span>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {metrics.map((m, i) => {
            const val = parseFloat(m.value) || 0;
            const maxVal = 500;
            const pct = Math.min(100, (val / maxVal) * 100);
            const barColor = pct > 60 ? 'var(--crimson-light)'
              : pct > 30 ? 'var(--amber-light)'
              : 'var(--green-400)';
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{m.label}</span>
                  <span style={{
                    fontFamily: 'DM Mono, monospace', fontSize: '0.78rem',
                    fontWeight: 600, color: barColor,
                  }}>
                    {m.value}{m.unit}
                  </span>
                </div>
                <AnimatedBar pct={pct} color={barColor} delay={i * 80} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Sección header ─── */
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p className="section-title gradient-text">{title}</p>
      <p className="section-subtitle">{sub}</p>
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function KPICards({ metricas, graficos }) {
  const [modalRow, setModalRow] = useState(null);

  const moranSig   = metricas.moran_significativo;
  const top1       = graficos.top10_criminalidad[0];
  const riesgoAlto = graficos.riesgo_distribucion.find(r => r.riesgo === 'Riesgo Alto');
  const hhCluster  = graficos.lisa_distribucion.find(c => c.cluster === 'High-High');
  const totalLoc   = graficos.riesgo_distribucion.reduce((a, b) => a + b.n, 0);

  const accLOO     = useCountUp(metricas.rf_accuracy_loo * 100,     1800, 1);
  const accSpatial = useCountUp(metricas.rf_accuracy_spatial * 100, 2000, 1);
  const f1         = useCountUp(metricas.rf_f1_macro,               1600, 4);
  const silueta    = useCountUp(metricas.kmeans_silhouette,         1400, 4);

  const radarData = graficos.top10_criminalidad.slice(0, 6).map(r => ({
    localidad: r.LOCALIDAD_GEO.split(' ')[0],
    hurto:     Math.min(100, r.TASA_HURTO_A_PERSONAS / 15),
    lesiones:  Math.min(100, r.TASA_LESIONES_PERSONALES * 1.2),
    violencia: Math.min(100, r.TASA_VIOLENCIA_INTRAFAMILIAR * 5),
    comercio:  Math.min(100, r.TASA_HURTO_A_COMERCIO * 2),
    indice:    Math.min(100, r.INDICE_CRIMEN * 30),
  }));

  /* KPI cards con popovers */
  const cards = [
    {
      label: 'Localidades analizadas',
      value: metricas.n_localidades,
      sub: `Bogotá D.C. — ${metricas.anio}`,
      type: 'accent',
      popoverContent: (
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--green-300)', letterSpacing: '0.1em', marginBottom: 8 }}>COBERTURA</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
            Análisis completo de las <strong style={{ color: 'var(--green-300)' }}>{metricas.n_localidades} localidades</strong> oficiales de Bogotá D.C., con datos del sistema SIEDCO para el año {metricas.anio}.
          </div>
        </div>
      ),
    },
    {
      label: 'Zona más peligrosa',
      value: top1.LOCALIDAD_GEO.split(' ')[0],
      sub: `Índice: ${top1.INDICE_CRIMEN.toFixed(2)}`,
      type: 'warn',
      popoverContent: (
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--amber-light)', letterSpacing: '0.1em', marginBottom: 8 }}>MAYOR RIESGO</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--amber-light)' }}>{top1.LOCALIDAD_GEO}</strong> registra el índice compuesto de criminalidad más alto de Bogotá, concentrando tasas elevadas en múltiples categorías de delito.
          </div>
        </div>
      ),
    },
    {
      label: 'Delito más frecuente',
      value: metricas.variable_mas_importante.replace('TASA_', '').replace(/_/g, ' '),
      sub: 'Mayor impacto en la seguridad',
      type: 'accent',
      popoverContent: (
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--green-300)', letterSpacing: '0.1em', marginBottom: 8 }}>DELITO DOMINANTE</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
            Este tipo de delito es el que más contribuye al riesgo de cada localidad, siendo la principal amenaza para la seguridad ciudadana según los datos de {metricas.anio}.
          </div>
        </div>
      ),
    },
    {
      label: 'Zonas de alto riesgo',
      value: `${riesgoAlto ? riesgoAlto.n : 0}`,
      sub: `de ${totalLoc} localidades en riesgo alto`,
      type: 'warn',
      popoverContent: (
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--crimson-light)', letterSpacing: '0.1em', marginBottom: 8 }}>ALERTA</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
            El <strong style={{ color: 'var(--crimson-light)' }}>{((riesgoAlto?.n / totalLoc) * 100).toFixed(0)}% del territorio</strong> está clasificado en riesgo alto, requiriendo atención prioritaria en políticas de seguridad.
          </div>
        </div>
      ),
    },
    {
      label: 'Concentración criminal',
      value: hhCluster ? `${((hhCluster.n / totalLoc) * 100).toFixed(0)}%` : '0%',
      sub: 'Zonas calientes (High-High)',
      type: 'accent',
      popoverContent: (
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--crimson-light)', letterSpacing: '0.1em', marginBottom: 8 }}>ZONAS CALIENTES</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
            Localidades con criminalidad alta rodeadas de vecinos también con alta criminalidad — focos de riesgo concentrado que requieren intervención inmediata.
          </div>
        </div>
      ),
    },
    {
      label: 'Precisión del análisis',
      value: `${(metricas.rf_accuracy_loo * 100).toFixed(0)}%`,
      sub: 'Confiabilidad del modelo',
      type: 'ok',
      popoverContent: (
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: 'var(--green-300)', letterSpacing: '0.1em', marginBottom: 8 }}>CONFIABILIDAD</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
            El modelo de clasificación alcanza un {(metricas.rf_accuracy_loo * 100).toFixed(1)}% de precisión, identificando correctamente las zonas de riesgo alto, medio y bajo en Bogotá.
          </div>
        </div>
      ),
    },
  ];

  /* Carrusel de hallazgos */
  const hallazgos = [
    {
      icon: '🔴',
      color: 'var(--crimson-light)',
      label: 'Localidad más peligrosa',
      value: top1.LOCALIDAD_GEO.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      detail: `Con el índice de criminalidad más alto de Bogotá (${top1.INDICE_CRIMEN.toFixed(2)}), concentra las tasas más elevadas en múltiples categorías de delito, afectando directamente la seguridad de sus habitantes.`,
      tags: ['Índice Alto', 'Zona Crítica', 'Atención Prioritaria'],
    },
    {
      icon: '⚠️',
      color: 'var(--amber-light)',
      label: 'Zonas en riesgo alto',
      value: `${riesgoAlto ? riesgoAlto.n : 0} de ${totalLoc} localidades`,
      detail: `El ${((riesgoAlto?.n / totalLoc) * 100).toFixed(0)}% del territorio analizado está clasificado en riesgo alto, lo que significa que miles de ciudadanos están expuestos a mayores niveles de inseguridad.`,
      tags: ['Seguridad Ciudadana', 'Intervención Urgente', `${((riesgoAlto?.n / totalLoc) * 100).toFixed(0)}% del territorio`],
    },
    {
      icon: '📊',
      color: 'var(--green-400)',
      label: 'Delito más común',
      value: metricas.variable_mas_importante.replace('TASA_', '').replace(/_/g, ' '),
      detail: `Es el delito que más contribuye al riesgo en Bogotá. Su predominancia indica que las políticas de seguridad deberían priorizar la prevención y atención de este tipo de incidents.`,
      tags: ['Mayor Impacto', 'Prevención', 'Política Pública'],
    },
    {
      icon: '🗺️',
      color: 'var(--blue-light)',
      label: 'Patrones de criminalidad',
      value: `Los delitos se concentran en zonas`,
      detail: `El análisis espacial confirma que la criminalidad en Bogotá NO se distribuye aleatoriamente — existen zonas calientes donde los delitos se agrupan, lo que permite enfocar los recursos de seguridad de manera más efectiva.`,
      tags: ['Zonas Calientes', 'Análisis Espacial', 'Datos Reales'],
    },
    {
      icon: '🎯',
      color: '#c084fc',
      label: 'Perfiles de riesgo identificados',
      value: `${metricas.kmeans_k} grupos diferenciados`,
      detail: `Se identificaron ${metricas.kmeans_k} perfiles distintos de localidades según su comportamiento criminal, permitiendo estrategias de seguridad diferenciadas según las necesidades de cada zona.`,
      tags: [`k = ${metricas.kmeans_k}`, 'Clasificación', 'Estrategias Diferenciadas'],
    },
  ];

  return (
    <div>
      {/* Modal */}
      {modalRow && <LocalidadModal row={modalRow} onClose={() => setModalRow(null)} />}

      <SectionHeader
        title="Panorama de la Criminalidad"
        sub={`Datos reales de seguridad en Bogotá D.C. — ${metricas.anio} — ${metricas.n_localidades} localidades analizadas`}
      />

      {/* KPI Cards con popovers */}
      <div className="kpi-grid stagger">
        {cards.map((c, i) => (
          <KPICard key={i} {...c} delay={i * 80} />
        ))}
      </div>

      {/* Divider */}
      <div className="glow-divider" />

      {/* Accuracy + Distribución riesgo */}
      <div className="two-col" style={{ marginBottom: '1.2rem' }}>
        {/* Barras de modelo */}
        <div className="chart-box">
          <h3>Confiabilidad del análisis de riesgo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {[
              { label: 'Precisión general',          value: accLOO,     color: 'var(--green-400)', suffix: '%' },
              { label: 'Validación espacial',        value: accSpatial, color: '#60a5fa',           suffix: '%' },
              { label: 'Balance entre clases',       value: f1,         color: 'var(--amber-light)',suffix: '' },
              { label: 'Separación de grupos',       value: silueta,    color: 'var(--crimson-light)', suffix: '' },
            ].map((m, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{m.label}</span>
                  <span style={{
                    fontFamily: 'DM Mono, monospace', fontSize: '0.82rem',
                    fontWeight: 700, color: m.color,
                  }}>
                    {m.value}{m.suffix}
                  </span>
                </div>
                <AnimatedBar
                  pct={m.suffix === '%' ? m.value : m.value * 100}
                  color={m.color}
                  delay={400 + i * 150}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Distribución riesgo */}
        <div className="chart-box">
          <h3>Distribución del riesgo por localidad</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {graficos.riesgo_distribucion.map((r, i) => {
              const pct   = ((r.n / totalLoc) * 100).toFixed(1);
              const color = r.riesgo.includes('Alto') ? 'var(--crimson-light)'
                : r.riesgo.includes('Medio') ? 'var(--amber-light)'
                : 'var(--green-400)';
              const cls = r.riesgo.includes('Alto') ? 'alto'
                : r.riesgo.includes('Medio') ? 'medio' : 'bajo';
              return (
                <div key={i} style={{
                  padding: '1rem 1.2rem',
                  background: 'rgba(34,197,94,0.04)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 10,
                  borderLeft: `3px solid ${color}`,
                  transition: 'background 0.2s',
                  cursor: 'default',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.04)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className={`badge ${cls}`}>{r.riesgo}</span>
                    <span style={{
                      fontFamily: 'DM Mono, monospace', fontWeight: 700,
                      fontSize: '1rem', color,
                    }}>
                      {r.n} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>loc.</span>
                    </span>
                  </div>
                  <AnimatedBar pct={parseFloat(pct)} color={color} delay={300 + i * 200} />
                  <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glow-divider" />

      {/* LISA + Radar */}
      <div className="two-col" style={{ marginBottom: '1.2rem' }}>
        <div className="chart-box">
          <h3>Zonas calientes — Distribución espacial</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
            {graficos.lisa_distribucion.map((c, i) => {
              const total = graficos.lisa_distribucion.reduce((a, b) => a + b.n, 0);
              const pct   = ((c.n / total) * 100).toFixed(1);
              const color = c.cluster === 'High-High' ? 'var(--hh)'
                : c.cluster === 'Low-Low'  ? 'var(--ll)'
                : c.cluster === 'High-Low' ? 'var(--hl)'
                : c.cluster === 'Low-High' ? 'var(--lh)'
                : 'var(--ns)';
              const cls = c.cluster === 'High-High' ? 'hh'
                : c.cluster === 'Low-Low'  ? 'll'
                : c.cluster === 'High-Low' ? 'hl'
                : c.cluster === 'Low-High' ? 'lh' : 'ns';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className={`badge ${cls}`}>{c.cluster}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.n} — {pct}%</span>
                    </div>
                    <AnimatedBar pct={parseFloat(pct)} color={color} delay={200 + i * 150} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar */}
        <div className="chart-box">
          <h3>Perfil de criminalidad — Top localidades</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="rgba(34,197,94,0.1)" />
              <PolarAngleAxis dataKey="localidad" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Radar name="Hurto"  dataKey="hurto"  stroke="var(--crimson-light)" fill="var(--crimson-light)" fillOpacity={0.08} strokeWidth={1.5} />
              <Radar name="Índice" dataKey="indice" stroke="var(--green-400)"     fill="var(--green-400)"     fillOpacity={0.08} strokeWidth={1.5} />
              <Tooltip contentStyle={{
                background: 'rgba(6,20,12,0.95)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 10,
                fontSize: '0.75rem',
                color: 'var(--text)',
              }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glow-divider" />

      {/* Carrusel de hallazgos */}
      <div style={{ marginBottom: '1.2rem' }}>
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
          color: 'var(--green-300)', textTransform: 'uppercase',
          letterSpacing: '0.14em', marginBottom: '1rem', opacity: 0.8,
        }}>
          Hallazgos clave del análisis
        </div>
        <HallazgosCarousel items={hallazgos} />
      </div>

      <div className="glow-divider" />

      {/* Top localidades clickeables → modal */}
      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
        color: 'var(--green-300)', textTransform: 'uppercase',
        letterSpacing: '0.14em', marginBottom: '1rem', opacity: 0.8,
      }}>
        Top 3 localidades más afectadas — clic para ver detalle
      </div>
      <div className="three-col stagger">
        {graficos.top10_criminalidad.slice(0, 3).map((row, i) => {
          const medal = i === 0 ? 'var(--crimson-light)' : i === 1 ? 'var(--amber-light)' : 'var(--blue-light)';
          return (
            <div
              key={row.LOCALIDAD_GEO}
              className="chart-box"
              style={{ borderLeft: `3px solid ${medal}`, marginBottom: 0, cursor: 'pointer' }}
              onClick={() => setModalRow(row)}
            >
              <div style={{
                fontSize: '0.68rem', color: 'var(--text-muted)',
                textTransform: 'uppercase', marginBottom: 4,
                fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
              }}>
                #{i + 1} — Mayor criminalidad
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--text)' }}>
                {row.LOCALIDAD_GEO.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span>Índice: <strong style={{ color: medal }}>{row.INDICE_CRIMEN.toFixed(3)}</strong></span>
                <span>Hurto personas: <strong style={{ color: 'var(--text-soft)' }}>{row.TASA_HURTO_A_PERSONAS?.toFixed(1)}/100k</strong></span>
              </div>
              {/* Hint de click */}
              <div style={{
                position: 'absolute', bottom: 12, right: 14,
                fontSize: '0.6rem', color: 'var(--green-300)',
                fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
                opacity: 0.6,
              }}>
                ver análisis completo →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}