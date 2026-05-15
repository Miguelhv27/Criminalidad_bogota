import { useEffect, useRef, useState } from 'react';

const CAPAS = [
  { id: 'indice',  label: 'Nivel de Peligrosidad' },
  { id: 'lisa',    label: 'Zonas Calientes' },
  { id: 'riesgo',  label: 'Predicción de Riesgo' },
];

const COLORES_LISA = {
  'High-High':        '#ef4444',
  'Low-Low':          '#60a5fa',
  'High-Low':         '#f59e0b',
  'Low-High':         '#4ade80',
  'No significativo': 'rgba(100,120,110,0.6)',
};

const COLORES_RIESGO = {
  'Riesgo Alto':  '#ef4444',
  'Riesgo Medio': '#f59e0b',
  'Riesgo Bajo':  '#22c55e',
};

function interpolateColor(value, min, max) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const colors = [
    [34,  197, 94],
    [74,  222, 128],
    [253, 224, 71],
    [249, 115, 22],
    [239, 68,  68],
  ];
  const idx = t * (colors.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.min(colors.length - 1, lo + 1);
  const f   = idx - lo;
  const r   = Math.round(colors[lo][0] + f * (colors[hi][0] - colors[lo][0]));
  const g   = Math.round(colors[lo][1] + f * (colors[hi][1] - colors[lo][1]));
  const b   = Math.round(colors[lo][2] + f * (colors[hi][2] - colors[lo][2]));
  return `rgb(${r},${g},${b})`;
}

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
    <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 6, height: 5, overflow: 'hidden' }}>
      <div style={{
        width: `${width}%`, height: 5, borderRadius: 6,
        background: color,
        transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  );
}

/* ─── Modal centrado de localidad ─── */
function LocalidadModal({ feature, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const p = feature.properties;
  const name = toTitleCase(p.LOCALIDAD_GEO);

  const riesgoColor = p.RF_riesgo_pred?.includes('Alto') ? 'var(--crimson-light)'
    : p.RF_riesgo_pred?.includes('Medio') ? 'var(--amber-light)'
    : 'var(--green-400)';

  const lisaColor = COLORES_LISA[p.LISA_cluster] || 'var(--text-muted)';

  const tasas = [
    { label: 'Hurto a personas',      value: p.TASA_HURTO_A_PERSONAS,       color: 'var(--crimson-light)', max: 600 },
    { label: 'Hurto a comercio',       value: p.TASA_HURTO_A_COMERCIO,        color: 'var(--amber-light)',   max: 300 },
    { label: 'Lesiones personales',    value: p.TASA_LESIONES_PERSONALES,     color: '#a78bfa',              max: 300 },
    { label: 'Violencia intrafamiliar',value: p.TASA_VIOLENCIA_INTRAFAMILIAR, color: 'var(--blue-light)',    max: 200 },
    { label: 'Homicidio',              value: p.TASA_HOMICIDIO,               color: '#f87171',              max: 30  },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
            color: 'var(--green-300)', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Perfil de Seguridad
          </div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: '1.65rem',
            fontWeight: 700, color: 'var(--text)', marginBottom: 12,
          }}>
            {name}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: 'var(--green-300)',
            }}>
              Indice: {p.INDICE_CRIMEN?.toFixed(3)}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
              padding: '4px 12px', borderRadius: 20,
              background: `${riesgoColor}18`, border: `1px solid ${riesgoColor}33`,
              color: riesgoColor,
            }}>
              {p.RF_riesgo_pred}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.64rem',
              padding: '4px 12px', borderRadius: 20,
              background: `${lisaColor}18`, border: `1px solid ${lisaColor}33`,
              color: lisaColor,
            }}>
              Zona: {p.LISA_cluster}
            </span>
          </div>
        </div>

        {/* Tasas */}
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
          color: 'var(--green-300)', textTransform: 'uppercase',
          letterSpacing: '0.12em', marginBottom: '1rem', opacity: 0.8,
        }}>
          Tasas por 100.000 habitantes
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.4rem' }}>
          {tasas.map((t, i) => {
            const val = t.value || 0;
            const pct = Math.min(100, (val / t.max) * 100);
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>{t.label}</span>
                  <span style={{
                    fontFamily: 'DM Mono, monospace', fontSize: '0.78rem',
                    fontWeight: 700, color: t.color,
                  }}>
                    {val.toFixed(1)}/100k
                  </span>
                </div>
                <AnimatedBar pct={pct} color={t.color} delay={i * 90} />
              </div>
            );
          })}
        </div>

        {/* Clasificacion */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          {[
            { label: 'Cluster LISA', value: p.LISA_cluster, color: lisaColor },
            { label: 'Nivel de riesgo RF', value: p.RF_riesgo_pred, color: riesgoColor },
          ].map((item, i) => (
            <div key={i} style={{
              background: `${item.color}08`,
              border: `1px solid ${item.color}22`,
              borderRadius: 10, padding: '0.9rem 1rem',
            }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 700, color: item.color, fontSize: '0.88rem' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Leyenda degradado ─── */
function LeyendaDegradado({ min, max }) {
  const steps = 5;
  return (
    <div>
      <div style={{
        height: 8, borderRadius: 4, marginBottom: 6,
        background: `linear-gradient(to right, rgb(34,197,94), rgb(74,222,128), rgb(253,224,71), rgb(249,115,22), rgb(239,68,68))`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {Array.from({ length: steps }).map((_, i) => {
          const val = min + (i / (steps - 1)) * (max - min);
          return (
            <span key={i} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              {val.toFixed(2)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function MapaInteractivo({ geojson }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const layerRef    = useRef(null);
  const [capa, setCapa]             = useState('indice');
  const [tooltip, setTooltip]       = useState(null);
  const [modalFeature, setModal]    = useState(null);
  const [loaded, setLoaded]         = useState(false);
  const [capaVisible, setCapaVisible] = useState(true);

  const indices = geojson.features.map(f => f.properties.INDICE_CRIMEN);
  const minIdx  = Math.min(...indices);
  const maxIdx  = Math.max(...indices);

  /* Carga Leaflet */
  useEffect(() => {
    if (leafletRef.current) return;

    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [4.651, -74.090],
        zoom: 11,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ prefix: false })
        .addAttribution('© OpenStreetMap © CARTO')
        .addTo(map);

      leafletRef.current = map;
      setLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  /* Actualiza capa GeoJSON */
  useEffect(() => {
    if (!loaded || !leafletRef.current) return;
    const L   = window.L;
    const map = leafletRef.current;

    setCapaVisible(false);
    setTimeout(() => {
      if (layerRef.current) layerRef.current.remove();

      const layer = L.geoJSON(geojson, {
        style: (feature) => {
          const p = feature.properties;
          let fillColor = 'rgba(100,120,110,0.5)';

          if (capa === 'indice') {
            fillColor = interpolateColor(p.INDICE_CRIMEN, minIdx, maxIdx);
          } else if (capa === 'lisa') {
            fillColor = COLORES_LISA[p.LISA_cluster] || 'rgba(100,120,110,0.5)';
          } else if (capa === 'riesgo') {
            fillColor = COLORES_RIESGO[p.RF_riesgo_pred] || 'rgba(100,120,110,0.5)';
          }

          return {
            fillColor,
            fillOpacity: 0.72,
            color: 'rgba(3,13,6,0.9)',
            weight: 1.5,
          };
        },
        onEachFeature: (feature, lyr) => {
          lyr.on({
            mouseover: (e) => {
              e.target.setStyle({ fillOpacity: 0.95, weight: 2.5, color: 'rgba(134,239,172,0.7)' });
              const rect = mapRef.current.getBoundingClientRect();
              setTooltip({
                x: e.originalEvent.clientX - rect.left,
                y: e.originalEvent.clientY - rect.top,
                props: feature.properties,
              });
            },
            mouseout: (e) => {
              lyr.setStyle({ fillOpacity: 0.72, weight: 1.5, color: 'rgba(3,13,6,0.9)' });
              setTooltip(null);
            },
            mousemove: (e) => {
              const rect = mapRef.current.getBoundingClientRect();
              setTooltip(prev => prev ? {
                ...prev,
                x: e.originalEvent.clientX - rect.left,
                y: e.originalEvent.clientY - rect.top,
              } : null);
            },
            click: () => {
              setModal(feature);
            },
          });
        },
      }).addTo(map);

      layerRef.current = layer;
      setCapaVisible(true);
    }, 180);
  }, [loaded, capa, geojson]);

  const getLeyenda = () => {
    if (capa === 'lisa')   return Object.entries(COLORES_LISA);
    if (capa === 'riesgo') return Object.entries(COLORES_RIESGO);
    return null;
  };
  const leyenda = getLeyenda();

  return (
    <div>
      {modalFeature && (
        <LocalidadModal feature={modalFeature} onClose={() => setModal(null)} />
      )}

      <div style={{ marginBottom: '2rem' }}>
        <p className="section-title gradient-text">Mapa del Crimen — Bogotá D.C.</p>
        <p className="section-subtitle">
          Visualización geográfica de la criminalidad por localidad — selecciona una capa para ver diferentes perspectivas de seguridad
        </p>
      </div>

      {/* Selector de capa */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        {CAPAS.map(c => (
          <button
            key={c.id}
            onClick={() => setCapa(c.id)}
            style={{
              background:     capa === c.id ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.04)',
              border:         `1px solid ${capa === c.id ? 'rgba(34,197,94,0.45)' : 'rgba(34,197,94,0.14)'}`,
              borderRadius:   20,
              padding:        '7px 18px',
              color:          capa === c.id ? 'var(--green-300)' : 'var(--text-muted)',
              fontSize:       '0.8rem',
              fontWeight:     capa === c.id ? 700 : 400,
              cursor:         'pointer',
              transition:     'all 0.25s cubic-bezier(0.22,1,0.36,1)',
              boxShadow:      capa === c.id ? '0 0 16px rgba(34,197,94,0.2)' : 'none',
              backdropFilter: 'blur(12px)',
              letterSpacing:  '0.03em',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Contenedor del mapa */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        border: '1px solid var(--glass-border-2)',
        boxShadow: 'var(--shadow-lg), var(--glow-green)',
        opacity: capaVisible ? 1 : 0.6,
        transition: 'opacity 0.3s ease',
      }}>
        <div ref={mapRef} className="map-wrap" />

        {/* Tooltip flotante */}
        {tooltip && (
          <div style={{
            position:      'absolute',
            left:          Math.min(tooltip.x + 14, (mapRef.current?.offsetWidth || 600) - 240),
            top:           Math.max(10, tooltip.y - 10),
            background:    'rgba(6,20,12,0.95)',
            backdropFilter:'blur(32px) saturate(180%)',
            border:        '1px solid rgba(34,197,94,0.28)',
            borderRadius:  12,
            padding:       '12px 16px',
            fontSize:      '0.78rem',
            pointerEvents: 'none',
            zIndex:        1000,
            minWidth:      210,
            boxShadow:     '0 0 40px rgba(34,197,94,0.15), 0 16px 48px rgba(0,0,0,0.6)',
            animation:     'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg,transparent,rgba(134,239,172,0.4),transparent)',
              borderRadius: '12px 12px 0 0',
            }} />
            <p style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.88rem', color: 'var(--text)' }}>
              {toTitleCase(tooltip.props.LOCALIDAD_GEO)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Indice',  value: tooltip.props.INDICE_CRIMEN?.toFixed(3),              color: 'var(--green-300)' },
                { label: 'LISA',    value: tooltip.props.LISA_cluster,                            color: COLORES_LISA[tooltip.props.LISA_cluster] || 'var(--text-muted)' },
                { label: 'Riesgo', value: tooltip.props.RF_riesgo_pred,                          color: tooltip.props.RF_riesgo_pred?.includes('Alto') ? 'var(--crimson-light)' : tooltip.props.RF_riesgo_pred?.includes('Medio') ? 'var(--amber-light)' : 'var(--green-400)' },
                { label: 'Hurto p.',value: `${tooltip.props.TASA_HURTO_A_PERSONAS?.toFixed(1)}/100k`, color: 'var(--text-soft)' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{row.label}</span>
                  <strong style={{ color: row.color, fontSize: '0.75rem' }}>{row.value}</strong>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 10, paddingTop: 8,
              borderTop: '1px solid rgba(34,197,94,0.1)',
              fontSize: '0.62rem', color: 'var(--green-300)',
              fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
            }}>
              clic para ver análisis completo
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div style={{
          position:      'absolute',
          bottom:        20,
          right:         10,
          background:    'rgba(3,13,6,0.88)',
          backdropFilter:'blur(24px) saturate(160%)',
          border:        '1px solid var(--glass-border-2)',
          borderRadius:  12,
          padding:       '12px 16px',
          zIndex:        999,
          fontSize:      '0.75rem',
          minWidth:      180,
          boxShadow:     'var(--shadow-md)',
        }}>
          <div style={{
            fontFamily: 'DM Mono, monospace', fontSize: '0.6rem',
            color: 'var(--green-300)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 10, opacity: 0.8,
          }}>
            {CAPAS.find(c => c.id === capa)?.label}
          </div>

          {leyenda ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leyenda.map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: color, flexShrink: 0,
                    boxShadow: `0 0 6px ${color}88`,
                  }} />
                  <span style={{ color: 'var(--text-soft)', fontSize: '0.72rem' }}>{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <LeyendaDegradado min={minIdx} max={maxIdx} />
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 12, fontFamily: 'DM Mono, monospace' }}>
        Pasa el cursor sobre una localidad para vista rápida — clic para ver el perfil completo con tasas y clasificación
      </p>
    </div>
  );
}