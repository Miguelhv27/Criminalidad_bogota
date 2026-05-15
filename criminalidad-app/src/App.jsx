import { useState, useEffect, useCallback } from 'react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useResultados } from './hooks/useResultados';
import KPICards from './components/KPICards';
import GraficasDelitos from './components/GraficasDelitos';
import ClusteringML from './components/ClusteringML';
import MapaInteractivo from './components/MapaInteractivo';
import TablaRanking from './components/TablaRanking';
import './App.css';

/* ── Iconos nav ── */
const IcoResumen    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IcoMapa       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>;
const IcoDelitos    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoClustering = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/><line x1="12" y1="9" x2="17" y2="7"/><line x1="12" y1="9" x2="7" y2="7"/><line x1="12" y1="15" x2="17" y2="17"/><line x1="12" y1="15" x2="7" y2="17"/></svg>;
const IcoRanking    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

const TABS = [
  { id: 'resumen',    label: 'Panorama',      Icon: IcoResumen },
  { id: 'mapa',       label: 'Mapa',          Icon: IcoMapa },
  { id: 'delitos',    label: 'Delitos',       Icon: IcoDelitos },
  { id: 'clustering', label: 'Zonas Riesgo',  Icon: IcoClustering },
  { id: 'ranking',    label: 'Ranking',       Icon: IcoRanking },
];

/* ── Count-up hook ── */
function useCountUp(target, duration = 1800, decimals = 0, started = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started || !target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals, started]);
  return value;
}

/* ── Hero stats ── */
function HeroStats({ metricas, graficos }) {
  const totalDelitos = graficos?.top10_criminalidad?.reduce((sum, loc) =>
    sum + (loc.TASA_HURTO_A_PERSONAS || 0) + (loc.TASA_HURTO_A_COMERCIO || 0) +
         (loc.TASA_LESIONES_PERSONALES || 0) + (loc.TASA_VIOLENCIA_INTRAFAMILIAR || 0) +
         (loc.TASA_HOMICIDIO || 0), 0) || 0;

  const topLoc = graficos?.top10_criminalidad?.[0]?.LOCALIDAD_GEO?.split(' ')[0] || '';
  const hurtoRate = graficos?.top10_criminalidad?.[0]?.TASA_HURTO_A_PERSONAS?.toFixed(0) || '0';
  const localidades = useCountUp(metricas.n_localidades, 1200, 0, true);

  return (
    <div className="hero-stats">
      {[
        { value: localidades,              label: 'Localidades' },
        { value: `${hurtoRate}/100k`,       label: 'Tasa hurtos (top)' },
        { value: topLoc,                    label: 'Zona más afectada' },
        { value: metricas.anio,             label: 'Año analizado' },
      ].map(({ value, label }) => (
        <div className="hero-stat" key={label}>
          <div className="hero-stat-value">{value}</div>
          <div className="hero-stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Hero section ── */
function Hero({ metricas, graficos, onEnter }) {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const particlesOptions = {
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    particles: {
      number: { value: 55, density: { enable: true, area: 900 } },
      color: { value: ['#93e1d8', '#ddfff7', '#aa4465', '#ffa69e'] },
      opacity: {
        value: { min: 0.04, max: 0.35 },
        animation: { enable: true, speed: 0.6, minimumValue: 0.04 },
      },
      size: {
        value: { min: 0.4, max: 2 },
        animation: { enable: true, speed: 1.2, minimumValue: 0.4 },
      },
      links: {
        enable: true,
        distance: 120,
        color: '#93e1d8',
        opacity: 0.06,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.4,
        direction: 'none',
        random: true,
        outModes: { default: 'out' },
      },
    },
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'grab' },
        onClick: { enable: true, mode: 'push' },
      },
      modes: {
        grab: { distance: 160, links: { opacity: 0.2 } },
        push: { quantity: 3 },
      },
    },
    detectRetina: true,
  };

  return (
    <section className="hero">
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />
      <div className="hero-grid" />

      {/* Líneas SVG decorativas */}
      <div className="hero-lines">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <line x1="0" y1="200" x2="1200" y2="200"
            stroke="rgba(147,225,216,0.04)" strokeWidth="1"
            strokeDasharray="4 8"
          />
          <line x1="0" y1="600" x2="1200" y2="600"
            stroke="rgba(170,68,101,0.04)" strokeWidth="1"
            strokeDasharray="4 8"
          />
          <line x1="200" y1="0" x2="200" y2="800"
            stroke="rgba(147,225,216,0.03)" strokeWidth="1"
            strokeDasharray="4 12"
          />
          <line x1="1000" y1="0" x2="1000" y2="800"
            stroke="rgba(147,225,216,0.03)" strokeWidth="1"
            strokeDasharray="4 12"
          />
        </svg>
      </div>

      <Particles
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        init={particlesInit}
        options={particlesOptions}
      />

      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          Análisis de Seguridad Ciudadana — Bogotá D.C.
        </div>

        <h1 className="hero-title">
          <span className="gradient-text">Criminalidad</span>
          <span className="hero-title-line2"><br />en Bogotá D.C.</span>
        </h1>

        <p className="hero-desc">
          Cada día, miles de bogotanos son víctimas de hurtos, violencia y delitos que afectan
          su vida cotidiana. Este análisis identifica las zonas de mayor riesgo y los patrones
          de criminalidad para apoyar la toma de decisiones.
        </p>

        <HeroStats metricas={metricas} graficos={graficos} />

        <button className="hero-cta" onClick={onEnter}>
          Explorar los datos
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <div className="hero-scroll">
        <div className="hero-scroll-line" />
        scroll
      </div>
    </section>
  );
}

/* ── App principal ── */
export default function App() {
  const { data, loading, error } = useResultados();
  const [showDashboard, setShowDashboard] = useState(false);
  const [tab, setTab] = useState('resumen');

  if (loading) return (
    <div className="loading">
      <div className="loading-ring" />
      <p className="loading-text">Cargando análisis</p>
    </div>
  );

  if (error) return (
    <div className="loading">
      <p style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace', fontSize: '0.8rem' }}>
        Error: {error}
      </p>
    </div>
  );

  const { metricas, graficos, geojson } = data;

  if (!showDashboard) {
    return <Hero metricas={metricas} graficos={graficos} onEnter={() => setShowDashboard(true)} />;
  }

  return (
    <div className="app animate-fade">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">BS</div>
          <div>
            <h1>Bogotá Segura</h1>
            <span>Análisis de Criminalidad · {metricas.anio}</span>
          </div>
        </div>
        <div className="header-right">
          <span className="header-pill">{metricas.n_localidades} localidades</span>
          <div className="header-status">
            <div className="header-dot" />
            Datos actualizados
          </div>
        </div>
      </header>

      <nav className="nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-btn${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <main className="main">
        <div key={tab} className="tab-panel">
          {tab === 'resumen'    && <KPICards       metricas={metricas} graficos={graficos} />}
          {tab === 'mapa'       && <MapaInteractivo geojson={geojson} />}
          {tab === 'delitos'    && <GraficasDelitos  graficos={graficos} geojson={geojson} />}
          {tab === 'clustering' && <ClusteringML     graficos={graficos} metricas={metricas} />}
          {tab === 'ranking'    && <TablaRanking      graficos={graficos} />}
        </div>
      </main>
    </div>
  );
}