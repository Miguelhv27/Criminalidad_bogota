import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
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

/* ─── Glass Tooltip ─── */
const GlassTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(6,20,12,0.95)',
      backdropFilter: 'blur(32px)',
      border: '1px solid rgba(34,197,94,0.25)',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 0 40px rgba(34,197,94,0.12), 0 16px 48px rgba(0,0,0,0.6)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(134,239,172,0.4),transparent)',
        borderRadius: '12px 12px 0 0',
      }} />
      <p style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.83rem', color: 'var(--text)' }}>{label}</p>
      {payload.map((p, i) => {
        const display = formatter ? formatter(p.value, p.name, p) : [p.value?.toFixed(4), p.name];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
            <span style={{ fontSize: '0.77rem', color: 'var(--text-soft)' }}>
              {display[1]}: <strong style={{ color: p.color }}>{display[0]}</strong>
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Modal centrado ─── */
function MetricaModal({ data, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ marginBottom: '1.6rem' }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
            color: 'var(--green-300)', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            {data.categoria}
          </div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: '1.5rem',
            fontWeight: 700, color: 'var(--text)', marginBottom: 10,
          }}>
            {data.titulo}
          </div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: '2.4rem',
            fontWeight: 800, color: data.color, lineHeight: 1,
            textShadow: `0 0 30px ${data.color}44`,
            marginBottom: 12,
          }}>
            {data.valor}
          </div>
        </div>

        <div style={{
          background: 'rgba(34,197,94,0.04)',
          border: '1px solid var(--glass-border)',
          borderRadius: 12, padding: '1.2rem',
          marginBottom: '1.2rem',
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', lineHeight: 1.8 }}>
            {data.descripcion}
          </div>
        </div>

        {data.detalles && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.detalles.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.label}</span>
                <span style={{
                  fontFamily: 'DM Mono, monospace', fontSize: '0.82rem',
                  fontWeight: 700, color: data.color,
                }}>{d.valor}</span>
              </div>
            ))}
          </div>
        )}

        {data.interpretacion && (
          <div style={{
            marginTop: '1.2rem',
            padding: '1rem 1.2rem',
            background: `${data.color}0d`,
            border: `1px solid ${data.color}28`,
            borderRadius: 10,
            fontSize: '0.78rem',
            color: 'var(--text-soft)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: data.color, fontWeight: 600 }}>Interpretacion: </span>
            {data.interpretacion}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── KPI Card clicable ─── */
function MLKPICard({ label, value, sub, type, delay, onClick }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const colorMap = {
    accent: 'var(--green-300)',
    ok:     'var(--green-400)',
    warn:   'var(--amber-light)',
    berry:  'var(--blue-light)',
  };
  const color = colorMap[type] || 'var(--green-300)';

  return (
    <div
      className={`kpi-card ${type}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: 'opacity 0.55s ease, transform 0.55s ease',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
      <div className="accent-bar" />
      {onClick && (
        <div style={{
          position: 'absolute', bottom: 12, right: 14,
          fontSize: '0.6rem', color,
          fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
          opacity: 0.55,
        }}>
          ver detalle →
        </div>
      )}
    </div>
  );
}

/* ─── Carrusel de hallazgos ML ─── */
function MLCarousel({ items }) {
  const [idx, setIdx] = useState(0);

  const item = items[idx];

  return (
    <div>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
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
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${item.color}44, transparent)`,
          }} />
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${item.color}0a, transparent 65%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.6rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: `${item.color}14`,
              border: `1px solid ${item.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${item.color}22`,
            }}>
              <div style={{
                width: 20, height: 20,
                background: item.color,
                borderRadius: item.iconShape || 4,
                opacity: 0.85,
                boxShadow: `0 0 12px ${item.color}`,
              }} />
            </div>

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
                fontSize: '1.25rem', fontWeight: 700,
                color: item.color, marginBottom: 8,
                textShadow: `0 0 20px ${item.color}44`,
              }}>
                {item.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', lineHeight: 1.65 }}>
                {item.detail}
              </div>
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

          <div style={{
            marginTop: '1.4rem', height: 2, borderRadius: 2,
            background: 'rgba(34,197,94,0.08)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${((idx + 1) / items.length) * 100}%`,
              background: item.color, borderRadius: 2,
              transition: 'width 0.4s ease',
              boxShadow: `0 0 8px ${item.color}`,
            }} />
          </div>
        </div>
      </div>

      <div className="carousel-controls" style={{ marginTop: '1rem' }}>
        <button className="carousel-btn" onClick={() => setIdx(i => i - 1)} disabled={idx === 0}>←</button>
        <div className="carousel-dots">
          {items.map((_, i) => (
            <button key={i} className={`carousel-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
        <button className="carousel-btn" onClick={() => setIdx(i => i + 1)} disabled={idx === items.length - 1}>→</button>
      </div>
    </div>
  );
}

/* ─── Section header ─── */
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
export default function ClusteringML({ graficos, metricas }) {
  const [modalData, setModalData] = useState(null);

  const accLOO     = useCountUp(metricas.rf_accuracy_loo * 100, 1800, 1);
  const accSpatial = useCountUp(metricas.rf_accuracy_spatial * 100, 2000, 1);
  const f1Macro    = useCountUp(metricas.rf_f1_macro, 1600, 4);
  const silueta    = useCountUp(metricas.kmeans_silhouette, 1400, 4);

  const diffAccuracy = (metricas.rf_accuracy_loo - metricas.rf_accuracy_spatial).toFixed(4);
  const robusto = Math.abs(metricas.rf_accuracy_loo - metricas.rf_accuracy_spatial) <= 0.05;

  const siluetaData = graficos.silueta_kmeans.map(d => ({
    k: `k=${d.k}`,
    silueta: d.silueta,
    optimo: d.k === metricas.kmeans_k,
  }));

  const importanciasData = [...graficos.importancias_rf]
    .sort((a, b) => a.importancia - b.importancia)
    .map(d => ({
      variable: d.variable.replace('TASA_', '').replace(/_/g, ' '),
      importancia: d.importancia,
      raw: d.variable,
    }));

  const moranData = graficos.moran_por_delito
    .filter(d => !isNaN(d.I))
    .map(d => ({
      delito: d.delito.charAt(0).toUpperCase() + d.delito.slice(1).toLowerCase(),
      I: d.I,
      p: d.p,
      significativo: d.significativo,
    }));

  /* KPI cards con modales */
  const kpiCards = [
    {
      label: 'Perfiles de zona',
      value: metricas.kmeans_k,
      sub: `Tipos de zonas identificadas`,
      type: 'accent',
      modal: {
        categoria: 'Análisis de patrones',
        titulo: 'Perfiles de zonas de riesgo',
        valor: `${metricas.kmeans_k} tipos de zonas`,
        color: 'var(--green-300)',
        descripcion: `El análisis identificó ${metricas.kmeans_k} perfiles distintos de zonas según su comportamiento criminal. Cada grupo requiere estrategias de seguridad diferentes.`,
        detalles: [
          { label: 'Coeficiente de calidad', valor: metricas.kmeans_silhouette.toFixed(4) },
          { label: 'Zonas evaluadas', valor: `${metricas.n_localidades} localidades` },
          { label: 'Método', valor: 'Análisis de patrones' },
        ],
        interpretacion: `Un coeficiente de ${metricas.kmeans_silhouette.toFixed(4)} indica ${metricas.kmeans_silhouette > 0.5 ? 'una separación clara entre los tipos de zonas' : 'zonas con cierta superposición, pero diferenciadas'}.`,
      },
    },
    {
      label: 'Precisión del análisis',
      value: `${(metricas.rf_accuracy_loo * 100).toFixed(1)}%`,
      sub: 'Confiabilidad general',
      type: 'ok',
      modal: {
        categoria: 'Validación',
        titulo: 'Precisión del modelo',
        valor: `${(metricas.rf_accuracy_loo * 100).toFixed(1)}%`,
        color: 'var(--green-400)',
        descripcion: 'El modelo de clasificación de riesgo alcanza esta precisión al identificar zonas de alto, medio y bajo riesgo, validado con técnicas rigurosas.',
        detalles: [
          { label: 'Precisión', valor: `${(metricas.rf_accuracy_loo * 100).toFixed(1)}%` },
          { label: 'Balance entre clases', valor: metricas.rf_f1_macro.toFixed(4) },
          { label: 'Método', valor: 'Clasificación inteligente' },
        ],
        interpretacion: 'Esta precisión permite confiar en las zonas de riesgo identificadas para la toma de decisiones en seguridad.',
      },
    },
    {
      label: 'Validación espacial',
      value: `${(metricas.rf_accuracy_spatial * 100).toFixed(1)}%`,
      sub: 'Considerando vecindad',
      type: 'ok',
      modal: {
        categoria: 'Validación geográfica',
        titulo: 'Precisión considerando zonas vecinas',
        valor: `${(metricas.rf_accuracy_spatial * 100).toFixed(1)}%`,
        color: 'var(--blue-light)',
        descripcion: 'Esta validación excluye las zonas vecinas durante el entrenamiento, asegurando que el modelo no se beneficie de la proximidad geográfica.',
        detalles: [
          { label: 'Precisión espacial', valor: `${(metricas.rf_accuracy_spatial * 100).toFixed(1)}%` },
          { label: 'Diferencia', valor: diffAccuracy },
          { label: 'Consideración', valor: 'Zonas vecinas excluidas' },
        ],
        interpretacion: robusto
          ? `Diferencia de ${diffAccuracy} — el modelo es robusto y no depende excesivamente de la ubicación vecinal.`
          : `Diferencia de ${diffAccuracy} — existe alguna dependencia de la proximidad geográfica.`,
      },
    },
    {
      label: 'Robustez del modelo',
      value: diffAccuracy,
      sub: robusto ? 'Confiable espacialmente' : 'Margen de mejora',
      type: robusto ? 'ok' : 'warn',
      modal: {
        categoria: 'Diagnóstico de calidad',
        titulo: 'Consistencia del análisis',
        valor: diffAccuracy,
        color: robusto ? 'var(--green-400)' : 'var(--amber-light)',
        descripcion: `La diferencia entre la validación tradicional (${(metricas.rf_accuracy_loo * 100).toFixed(1)}%) y la espacial (${(metricas.rf_accuracy_spatial * 100).toFixed(1)}%) revela qué tan consistente es el modelo en el espacio.`,
        detalles: [
          { label: 'Validación general', valor: `${(metricas.rf_accuracy_loo * 100).toFixed(1)}%` },
          { label: 'Validación espacial', valor: `${(metricas.rf_accuracy_spatial * 100).toFixed(1)}%` },
          { label: 'Umbral aceptable', valor: '5 puntos (0.05)' },
        ],
        interpretacion: robusto
          ? 'La diferencia está dentro del rango aceptable. El modelo es consistente en todo el territorio.'
          : 'La diferencia sugiere margen de mejora. Se podrían considerar variables adicionales.',
      },
    },
    {
      label: 'Balance entre clases',
      value: metricas.rf_f1_macro.toFixed(4),
      sub: 'Equilibrio alto/medio/bajo',
      type: 'ok',
      modal: {
        categoria: 'Métrica de calidad',
        titulo: 'Balance entre niveles de riesgo',
        valor: metricas.rf_f1_macro.toFixed(4),
        color: 'var(--green-400)',
        descripcion: 'Esta métrica mide qué tan bien el modelo identifica cada nivel de riesgo (alto, medio, bajo) sin favorecer uno sobre otro.',
        detalles: [
          { label: 'Balance', valor: metricas.rf_f1_macro.toFixed(4) },
          { label: 'Niveles', valor: 'Alto / Medio / Bajo' },
          { label: 'Tipo', valor: 'Sin favoritismo (macro)' },
        ],
        interpretacion: `Un balance de ${metricas.rf_f1_macro.toFixed(4)} indica ${metricas.rf_f1_macro > 0.75 ? 'buena identificación de todos los niveles de riesgo' : 'margen de mejora en algunos niveles de riesgo'}.`,
      },
    },
    {
      label: 'Factor de riesgo principal',
      value: metricas.variable_mas_importante.replace('TASA_', '').replace(/_/g, ' '),
      sub: 'Mayor poder predictivo',
      type: 'accent',
      modal: {
        categoria: 'Factor dominante',
        titulo: 'Delito con mayor impacto en el riesgo',
        valor: metricas.variable_mas_importante.replace('TASA_', '').replace(/_/g, ' '),
        color: 'var(--green-300)',
        descripcion: `Este tipo de delito es el que más determina si una zona es clasificada como de riesgo alto, medio o bajo, concentrando el mayor poder de discriminación.`,
        detalles: [
          { label: 'Delito', valor: metricas.variable_mas_importante.replace('TASA_', '').replace(/_/g, ' ') },
          { label: 'Criterio', valor: 'Poder predictivo' },
          { label: 'Modelo', valor: 'Clasificación' },
        ],
        interpretacion: 'Las políticas de seguridad deberían priorizar la intervención en este tipo de delito para tener el mayor impacto en la reducción del riesgo.',
      },
    },
  ];

  const hallazgos = [
    {
      label: 'Perfiles de zonas',
      value: `${metricas.kmeans_k} tipos de zonas criminales`,
      detail: `Se identificaron ${metricas.kmeans_k} perfiles diferenciados de zonas según su comportamiento criminal. Esto permite diseñar estrategias de seguridad específicas para cada tipo de zona.`,
      color: 'var(--green-400)',
      tags: [`k = ${metricas.kmeans_k}`, `Calidad: ${metricas.kmeans_silhouette.toFixed(4)}`, 'Patrones reales'],
      iconShape: '50%',
    },
    {
      label: 'Confiabilidad',
      value: `${(metricas.rf_accuracy_loo * 100).toFixed(1)}% precisión`,
      detail: `El modelo clasifica correctamente el nivel de riesgo con una brecha mínima (${diffAccuracy}) entre validación general y espacial, lo que indica ${robusto ? 'resultados confiables en todo el territorio' : 'margen de mejora en algunas zonas'}.`,
      color: robusto ? 'var(--blue-light)' : 'var(--amber-light)',
      tags: ['Validado', 'Confiable', 'Datos reales'],
      iconShape: 4,
    },
    {
      label: 'Factor clave de riesgo',
      value: metricas.variable_mas_importante.replace('TASA_', '').replace(/_/g, ' '),
      detail: `Este delito es el que más determina si una zona es de riesgo alto, medio o bajo. Priorizar su prevención tendría el mayor impacto en la seguridad de Bogotá.`,
      color: 'var(--crimson-light)',
      tags: ['Mayor impacto', 'Prevención', 'Política pública'],
      iconShape: 2,
    },
  ];

  return (
    <div>
      {modalData && <MetricaModal data={modalData} onClose={() => setModalData(null)} />}

      <SectionHeader
        title="Zonas de Riesgo Identificadas"
        sub={`Análisis inteligente de patrones criminales — ${metricas.n_localidades} localidades — Bogotá D.C. ${metricas.anio}`}
      />

      {/* KPI Grid */}
      <div className="kpi-grid stagger" style={{ marginBottom: '1.2rem' }}>
        {kpiCards.map((c, i) => (
          <MLKPICard
            key={i}
            label={c.label}
            value={c.value}
            sub={c.sub}
            type={c.type}
            delay={i * 80}
            onClick={() => setModalData(c.modal)}
          />
        ))}
      </div>

      <div className="glow-divider" />

      {/* Graficas principales */}
      <div className="two-col" style={{ marginBottom: '1.2rem' }}>

        {/* Silueta K-means */}
        <div className="chart-box">
          <h3>Calidad de la clasificación de zonas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={siluetaData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="var(--blue-light)"  />
                  <stop offset="100%" stopColor="var(--green-400)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.07)" />
              <XAxis dataKey="k" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'rgba(34,197,94,0.1)' }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<GlassTooltip />} />
              <ReferenceLine
                x={`k=${metricas.kmeans_k}`}
                stroke="var(--crimson-light)"
                strokeDasharray="4 2"
                label={{ value: 'optimo', fill: 'var(--crimson-light)', fontSize: 10, position: 'top' }}
              />
              <Line
                type="monotone"
                dataKey="silueta"
                name="Silueta"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      key={`dot-${props.index}`}
                      cx={cx} cy={cy}
                      r={payload.optimo ? 7 : 4}
                      fill={payload.optimo ? 'var(--crimson-light)' : 'var(--blue-light)'}
                      stroke={payload.optimo ? 'rgba(239,68,68,0.3)' : 'transparent'}
                      strokeWidth={payload.optimo ? 6 : 0}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
            Punto rojo = clasificación óptima seleccionada ({metricas.kmeans_k} tipos de zonas)
          </p>
        </div>

        {/* Importancia RF */}
        <div className="chart-box">
          <h3>Factores que determinan el riesgo — Delitos más influyentes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={importanciasData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 140, bottom: 4 }}
            >
              <defs>
                <linearGradient id="importGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="var(--blue-light)"  stopOpacity={0.8} />
                  <stop offset="100%" stopColor="var(--crimson-light)" stopOpacity={1}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.07)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => v.toFixed(2)} axisLine={false} tickLine={false} />
              <YAxis dataKey="variable" type="category" tick={{ fill: 'var(--text-soft)', fontSize: 10 }} width={140} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip formatter={(v) => [v.toFixed(4), 'Importancia Gini']} />} />
              <Bar dataKey="importancia" name="Importancia" radius={[0, 4, 4, 0]}>
                {importanciasData.map((entry, i) => {
                  const isTop = i === importanciasData.length - 1;
                  const isSec = i === importanciasData.length - 2;
                  return (
                    <Cell
                      key={i}
                      fill={isTop ? 'var(--crimson-light)' : isSec ? 'var(--amber-light)' : 'var(--blue-light)'}
                      fillOpacity={0.8 + (i / importanciasData.length) * 0.2}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
            Rojo = delito más influyente en la clasificación de riesgo
          </p>
        </div>
      </div>

      <div className="glow-divider" />

      {/* Moran por delito */}
      <div className="chart-box" style={{ marginBottom: '1.2rem' }}>
        <h3>Concentración espacial por tipo de delito</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={moranData} margin={{ top: 8, right: 24, left: 0, bottom: 55 }}>
            <defs>
              <linearGradient id="moranSig"    x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--crimson-light)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--crimson)"       stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="moranNoSig"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--blue-light)"  stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--blue)"        stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.07)" vertical={false} />
            <XAxis
              dataKey="delito"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              angle={-35} textAnchor="end" interval={0}
              axisLine={{ stroke: 'rgba(34,197,94,0.1)' }} tickLine={false}
            />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              content={<GlassTooltip formatter={(v, name, props) => [
                `${v.toFixed(4)} (p=${props.payload.p?.toFixed(3)})`,
                'I de Moran'
              ]} />}
            />
            <ReferenceLine y={0} stroke="rgba(34,197,94,0.2)" strokeDasharray="3 3" />
            <Bar dataKey="I" name="I de Moran" radius={[4, 4, 0, 0]}>
              {moranData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.significativo ? 'url(#moranSig)' : 'url(#moranNoSig)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {[
            { color: 'var(--crimson-light)', label: 'Significativo (p < 0.05)' },
            { color: 'var(--blue-light)',    label: 'No significativo' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparacion LOO */}
      <div className="chart-box" style={{ marginBottom: '1.2rem' }}>
        <h3>Comparación de validación — General vs Espacial</h3>
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { metodo: 'LOO Tradicional', accuracy: metricas.rf_accuracy_loo },
                  { metodo: 'LOO Espacial',    accuracy: metricas.rf_accuracy_spatial },
                ]}
                margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="looGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--green-400)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--green-600)" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="looGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={robusto ? 'var(--blue-light)' : 'var(--amber-light)'} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={robusto ? 'var(--blue)'       : 'var(--amber)'}       stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.07)" vertical={false} />
                <XAxis dataKey="metodo" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} axisLine={false} tickLine={false} />
                <Tooltip
                  content={<GlassTooltip formatter={(v) => [`${(v * 100).toFixed(1)}%`, 'Accuracy']} />}
                />
                <Bar dataKey="accuracy" name="Accuracy" radius={[5, 5, 0, 0]}>
                  <Cell fill="url(#looGrad1)" />
                  <Cell fill="url(#looGrad2)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Panel interpretacion */}
          <div style={{
            width: 220, flexShrink: 0,
            background: robusto ? 'rgba(34,197,94,0.04)' : 'rgba(217,119,6,0.06)',
            border: `1px solid ${robusto ? 'var(--glass-border)' : 'rgba(217,119,6,0.2)'}`,
            borderRadius: 12, padding: '1.2rem',
          }}>
            <div style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
              color: robusto ? 'var(--green-300)' : 'var(--amber-light)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
            }}>
              Resultado del análisis
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: robusto ? 'rgba(34,197,94,0.12)' : 'rgba(217,119,6,0.12)',
              border: `1px solid ${robusto ? 'var(--green-400)' : 'var(--amber-light)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: robusto ? 'var(--green-400)' : 'var(--amber-light)',
                boxShadow: `0 0 8px ${robusto ? 'var(--green-400)' : 'var(--amber-light)'}`,
              }} />
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {robusto ? 'Análisis confiable' : 'Margen de mejora'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {robusto
                ? `Diferencia de ${diffAccuracy} — dentro del umbral aceptable.`
                : `Diferencia de ${diffAccuracy} — supera el umbral de 0.05.`}
            </div>
          </div>
        </div>
      </div>

      <div className="glow-divider" />

      {/* Carrusel */}
      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
        color: 'var(--green-300)', textTransform: 'uppercase',
        letterSpacing: '0.14em', marginBottom: '1rem', opacity: 0.8,
      }}>
        Hallazgos del análisis de zonas
      </div>
      <MLCarousel items={hallazgos} />
    </div>
  );
}