# =============================================================================
# ANÁLISIS ESPACIAL DE CRIMINALIDAD — BOGOTÁ D.C.
# Versión 2 — Corregida y robusta
#
# Metodología:
#   - Tasas estandarizadas de delitos por 100.000 hab
#   - Moran I global + LISA (hotspots)
#   - DBSCAN + K-means + Clustering jerárquico
#   - Random Forest para clasificación de riesgo
#   - Validación cruzada tradicional + espacial (spatial CV)
#   - Exportación a JSON para app web
#
# Datos: SIEDCO — Secretaría de Seguridad Bogotá
#
# USO:
#   1. Sube SIEDCO.csv y loca.json a Colab (icono carpeta → subir)
#   2. Ejecuta: python analisis_criminalidad_bogota_v2.py
# =============================================================================

# ── INSTALACIÓN (ejecutar una sola vez en Colab) ──────────────────────────────
# !pip install geopandas libpysal esda splot scikit-learn folium mapclassify -q

import warnings
warnings.filterwarnings('ignore')

import os
import json
import numpy  as np
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import folium
from pathlib import Path

# Análisis espacial
import libpysal
from libpysal.weights import Queen, KNN
import esda
from esda.moran import Moran, Moran_Local
from splot.esda import moran_scatterplot

# Machine Learning
from sklearn.preprocessing   import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.decomposition   import PCA
from sklearn.cluster         import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.ensemble        import RandomForestClassifier
from sklearn.model_selection import LeaveOneOut, cross_validate
from sklearn.metrics         import (classification_report, silhouette_score,
                                     accuracy_score)
from sklearn.neighbors       import NearestNeighbors
from scipy.cluster.hierarchy import dendrogram, linkage
from matplotlib.patches      import Patch

print('✅ Librerías cargadas correctamente')


# =============================================================================
# BLOQUE 1 — CARGA Y LIMPIEZA DE DATOS
# =============================================================================

# ── Leer SIEDCO.csv ───────────────────────────────────────────────────────────
df_raw = pd.read_csv(
    'SIEDCO.csv',
    sep        = ';',
    encoding   = 'utf-8-sig',
    low_memory = False
)

df_raw.columns = (
    df_raw.columns
    .str.strip().str.upper()
    .str.replace(' ', '_')
    .str.replace('Ï»¿', '', regex=False)
)

print(f'📊 Dimensiones: {df_raw.shape}')
print(f'\n📋 Columnas: {list(df_raw.columns)}')
print(df_raw.head(3).to_string())
print(f'\n📅 Años disponibles: {sorted(df_raw["ANIO"].unique())}')
print(f'\n🔴 Tipos de delito (top 20):')
print(df_raw['HECHO'].value_counts().head(20).to_string())


# ── Limpieza y normalización ──────────────────────────────────────────────────
df = df_raw.copy()

df['LOCALIDAD'] = (
    df['LOCALIDAD'].str.upper().str.strip()
    .str.normalize('NFKD')
    .str.encode('ascii', errors='ignore')
    .str.decode('ascii')
    .str.strip()
)

df['HECHO']    = df['HECHO'].str.upper().str.strip()
df['CANTIDAD'] = pd.to_numeric(df['CANTIDAD'], errors='coerce').fillna(1)

DELITOS_INTERES = [
    'HOMICIDIOS',
    'HURTO A PERSONAS',
    'HURTO A COMERCIO',
    'LESIONES PERSONALES',
    'VIOLENCIA INTRAFAMILIAR',
]

df_delitos = df[
    df['HECHO'].isin(DELITOS_INTERES) &
    df['LOCALIDAD'].notna() &
    (df['LOCALIDAD'] != '') &
    (df['LOCALIDAD'] != 'SIN DATO') &
    (df['LOCALIDAD'] != 'SUMAPAZ')
].copy()

print(f'\n✅ Registros después de filtrar: {len(df_delitos):,}')
print(f'\n📍 Localidades: {sorted(df_delitos["LOCALIDAD"].unique())}')
print(f'\n🔴 Delitos incluidos:')
print(df_delitos['HECHO'].value_counts().to_string())


# ── Agregar por localidad ─────────────────────────────────────────────────────
ANIO_ANALISIS = int(df_delitos['ANIO'].max())
print(f'\n📅 Año de análisis: {ANIO_ANALISIS}')

df_anio = df_delitos[df_delitos['ANIO'] == ANIO_ANALISIS]

pivot = (
    df_anio
    .groupby(['LOCALIDAD', 'HECHO'])['CANTIDAD']
    .sum()
    .unstack(fill_value=0)
    .reset_index()
)

for d in DELITOS_INTERES:
    if d not in pivot.columns:
        pivot[d] = 0

pivot.columns.name = None
print(f'\n📊 Tabla agregada por localidad:')
print(pivot[['LOCALIDAD'] + DELITOS_INTERES].to_string(index=False))


# ── Población y tasas por 100.000 hab ────────────────────────────────────────
POBLACION = {
    'USAQUEN':              581693,
    'CHAPINERO':            133593,
    'SANTA FE':              97436,
    'SAN CRISTOBAL':        388205,
    'USME':                 441441,
    'TUNJUELITO':           193348,
    'BOSA':                 778889,
    'KENNEDY':             1141671,
    'FONTIBON':             434877,
    'ENGATIVA':             895885,
    'SUBA':                1315509,
    'BARRIOS UNIDOS':       232671,
    'TEUSAQUILLO':          154237,
    'LOS MARTIRES':          94888,
    'ANTONIO NARIO':        109396,
    'PUENTE ARANDA':        258723,
    'LA CANDELARIA':         22592,
    'RAFAEL URIBE URIBE':   368688,
    'CIUDAD BOLIVAR':       734524,
}

pivot['POBLACION'] = pivot['LOCALIDAD'].map(POBLACION)
mediana_pob = np.nanmedian(list(POBLACION.values()))
pivot['POBLACION'] = pivot['POBLACION'].fillna(mediana_pob)

COLS_TASA = {}
for d in DELITOS_INTERES:
    col = f'TASA_{d.replace(" ", "_")}'
    pivot[col] = (pivot[d] / pivot['POBLACION'] * 100_000).round(2)
    COLS_TASA[d] = col

TASAS = list(COLS_TASA.values())
print('\n✅ Tasas calculadas por 100.000 hab:')
print(pivot[['LOCALIDAD'] + TASAS].sort_values(TASAS[0], ascending=False).to_string(index=False))


# =============================================================================
# BLOQUE 2 — CARTOGRAFÍA Y UNIÓN ESPACIAL
# =============================================================================

# ── Cargar cartografía desde loca.json ───────────────────────────────────────
# Asegúrate de tener loca.json en el mismo directorio (o en /content/ si usas Colab)
RUTA_LOCA = 'loca.json'  # cambia a '/content/loca.json' si usas Colab

gdf_loca = gpd.read_file(RUTA_LOCA).to_crs(epsg=4326)
print(f'\n✅ {len(gdf_loca)} localidades cargadas')
print(f'   Columnas: {list(gdf_loca.columns)}')

# Detectar columna de nombre automáticamente
posibles   = [c for c in gdf_loca.columns
              if any(x in c.lower() for x in ['nombre', 'name', 'loca', 'nomgeo'])]
COL_NOMBRE = posibles[0] if posibles else gdf_loca.columns[0]
print(f'   Columna de nombre usada: {COL_NOMBRE}')

# Normalizar nombres para el merge (sin tildes, mayúsculas)
gdf_loca['LOCALIDAD_GEO'] = (
    gdf_loca[COL_NOMBRE].str.upper().str.strip()
    .str.normalize('NFKD')
    .str.encode('ascii', errors='ignore')
    .str.decode('ascii')
    .str.strip()
)

print(f'\n📍 Localidades en GeoJSON:')
print(sorted(gdf_loca['LOCALIDAD_GEO'].tolist()))


# ── Unir crimen con cartografía ───────────────────────────────────────────────
pivot['LOC_KEY'] = pivot['LOCALIDAD'].str.strip()

gdf = gdf_loca.merge(
    pivot,
    left_on  = 'LOCALIDAD_GEO',
    right_on = 'LOC_KEY',
    how      = 'left'
)

for col in DELITOS_INTERES + TASAS + ['POBLACION']:
    if col in gdf.columns:
        gdf[col] = gdf[col].fillna(0)

# Excluir Sumapaz: localidad rural sin datos poblacionales confiables
# ni representatividad criminal urbana. Sesga normalización y clustering.
gdf = gdf[gdf['LOCALIDAD_GEO'] != 'SUMAPAZ'].copy()

# Centroides y área
gdf_proj          = gdf.to_crs(epsg=3116)
gdf['centroid_x'] = gdf_proj.geometry.centroid.x
gdf['centroid_y'] = gdf_proj.geometry.centroid.y
gdf['area_km2']   = (gdf_proj.geometry.area / 1e6).round(2)

def calcular_indice_pca(df, feature_cols, missing_threshold=0.5):
    """
    Calcula un índice compuesto usando PCA (primer componente principal).

    Pipeline:
    1. Validación: reemplaza inf con NaN. Si una fila supera
       missing_threshold de valores faltantes, se descarta.
       El resto se imputa con la mediana.
    2. Estandarización Z-score (StandardScaler) — obligatorio para PCA.
    3. PCA: extrae PC1.
    4. Umbral de varianza: advierte si PC1 < 50%.
    5. Corrección de direccionalidad: si la suma de cargas (loadings)
       es negativa, se invierte PC1 para que a mayor crimen → mayor índice.
       Esto asegura que el índice sea intuitivo: valores más altos
       representan mayor criminalidad.
    6. Normalización MinMax [0, 100].

    Parameters
    ----------
    df : pd.DataFrame
    feature_cols : list[str]
        Columnas numéricas a usar como features para PCA.
    missing_threshold : float (default 0.5)
        Fracción máxima de features faltantes por fila antes de descartar.

    Returns
    -------
    pd.DataFrame con nueva columna 'INDICE_CRIMEN' en escala [0, 100].
    """
    n_features = len(feature_cols)
    X = df[feature_cols].copy()

    X = X.replace([np.inf, -np.inf], np.nan)

    missing_frac = X.isna().sum(axis=1) / n_features
    drop_mask = missing_frac > missing_threshold
    if drop_mask.any():
        print(f'⚠️  {drop_mask.sum()} fila(s) descartada(s) '
              f'(missing > {missing_threshold*100:.0f}% de features)')
        X = X.loc[~drop_mask]
        df = df.loc[~drop_mask].copy()

    before_impute = X.isna().sum().sum()
    X = X.fillna(X.median())
    if before_impute > 0:
        print(f'🔧 {before_impute} NaN(s) imputado(s) con mediana')

    scaler_pca = StandardScaler()
    X_scaled = scaler_pca.fit_transform(X)

    pca = PCA(n_components=1)
    pc1 = pca.fit_transform(X_scaled).flatten()

    var_exp = pca.explained_variance_ratio_[0]
    print(f'📊 PCA — Varianza explicada por PC1: {var_exp:.4f} '
          f'({var_exp*100:.2f}%)')

    if var_exp < 0.5:
        print(f'⚠️  ADVERTENCIA: PC1 solo explica {var_exp*100:.2f}% '
              f'de la varianza total (< 50%). '
              f'El índice unidimensional puede no representar '
              f'adecuadamente los datos subyacentes.')

    loadings = pca.components_[0]
    if np.sum(loadings) < 0:
        pc1 = -pc1
        loadings = -loadings
        print('   🔄 PC1 invertido por direccionalidad: '
              'las cargas eran mayoritariamente negativas.')

    print('   Cargas (loadings) de PC1:')
    for col, loading in zip(feature_cols, loadings):
        print(f'     {col:.<40} {loading:+.4f}')

    pc1_2d = pc1.reshape(-1, 1)
    minmax = MinMaxScaler(feature_range=(0, 100))
    pc1_norm = minmax.fit_transform(pc1_2d).flatten()

    df['INDICE_CRIMEN'] = pc1_norm.round(4)
    return df

# ── Calcular índice PCA ───────────────────────────────────────────────────────
gdf = calcular_indice_pca(gdf, TASAS)

print(f'\n✅ GeoDataFrame final: {len(gdf)} localidades')
print(f'   Sin datos: {gdf[gdf[TASAS[0]]==0]["LOCALIDAD_GEO"].tolist()}')
print(gdf[['LOCALIDAD_GEO'] + TASAS + ['INDICE_CRIMEN']]
      .sort_values('INDICE_CRIMEN', ascending=False).to_string(index=False))


# =============================================================================
# BLOQUE 3 — ANÁLISIS ESPACIAL: MORAN I Y LISA
# =============================================================================

# ── Matriz de pesos espaciales (Queen) ───────────────────────────────────────
w = Queen.from_dataframe(gdf, silence_warnings=True)
w.transform = 'R'

print(f'\n✅ Matriz de pesos Queen:')
print(f'   N unidades:        {w.n}')
print(f'   Vecinos promedio:  {w.mean_neighbors:.2f}')
print(f'   Conectividad:      {w.pct_nonzero:.2f}%')

if w.islands:
    print(f'⚠️  Islas detectadas: {w.islands} — usando KNN k=4')
    w = KNN.from_dataframe(gdf, k=4, silence_warnings=True)
    w.transform = 'R'


# ── I de Moran Global ─────────────────────────────────────────────────────────
y = gdf['INDICE_CRIMEN'].values

moran_global = Moran(y, w, permutations=999)

print('\n' + '=' * 50)
print('RESULTADOS — I de Moran Global')
print('=' * 50)
print(f'  I de Moran:  {moran_global.I:.4f}')
print(f'  Esperado:    {moran_global.EI:.4f}')
print(f'  Valor p:     {moran_global.p_sim:.4f}')
print(f'  z-score:     {moran_global.z_sim:.4f}')
if moran_global.p_sim < 0.05:
    print('\n✅ Autocorrelación espacial POSITIVA significativa')
    print('   → Los delitos NO se distribuyen al azar en Bogotá.')
else:
    print('\n❌ No hay autocorrelación espacial significativa')
print('=' * 50)

# Moran por delito individual
print('\n📊 Moran I por tipo de delito:')
print(f'{"Delito":<30} {"I de Moran":>12} {"p-valor":>10} {"Significativo":>15}')
print('-' * 70)
moran_por_delito = {}
for d, col in COLS_TASA.items():
    y_d = gdf[col].values
    m   = Moran(y_d, w, permutations=999)
    sig = '✅ Sí' if m.p_sim < 0.05 else '❌ No'
    print(f'{d:<30} {m.I:>12.4f} {m.p_sim:>10.4f} {sig:>15}')
    moran_por_delito[d] = m

# Diagrama de dispersión de Moran
fig, ax = plt.subplots(1, 1, figsize=(7, 6))
moran_scatterplot(moran_global, ax=ax, aspect_equal=False)
ax.set_title('Diagrama de Moran — Índice de Criminalidad\nBogotá por localidad', fontsize=13)
ax.set_xlabel('Índice estandarizado')
ax.set_ylabel('Rezago espacial')
plt.tight_layout()
plt.savefig('moran_scatter.png', dpi=150, bbox_inches='tight')
plt.show()
print('💾 Guardado: moran_scatter.png')


# ── LISA — Moran Local ────────────────────────────────────────────────────────
lisa = Moran_Local(y, w, permutations=999, seed=42)

sig_mask    = lisa.p_sim < 0.05
quad_labels = {1: 'High-High', 2: 'Low-High', 3: 'Low-Low', 4: 'High-Low'}

gdf['LISA_quad']    = [quad_labels.get(q, 'ns') for q in lisa.q]
gdf['LISA_sig']     = sig_mask
gdf['LISA_Ii']      = lisa.Is
gdf['LISA_p']       = lisa.p_sim
gdf['LISA_cluster'] = gdf.apply(
    lambda r: r['LISA_quad'] if r['LISA_sig'] else 'No significativo', axis=1
)

colores_lisa = {
    'High-High':        '#d73027',
    'Low-Low':          '#4575b4',
    'High-Low':         '#fc8d59',
    'Low-High':         '#91bfdb',
    'No significativo': '#cccccc',
}

print('\n📊 Distribución de clusters LISA:')
print(gdf['LISA_cluster'].value_counts().to_string())

fig, axes = plt.subplots(1, 2, figsize=(16, 7))

gdf.plot(column='INDICE_CRIMEN', ax=axes[0],
         cmap='Reds', legend=True, edgecolor='white', linewidth=0.5)
axes[0].set_title(f'Índice Compuesto de Criminalidad\nBogotá {ANIO_ANALISIS}', fontsize=12)
axes[0].axis('off')

gdf['color_lisa'] = gdf['LISA_cluster'].map(colores_lisa)
gdf.plot(color=gdf['color_lisa'], ax=axes[1], edgecolor='white', linewidth=0.5)

legend_elems = [Patch(fc=c, label=l) for l, c in colores_lisa.items()]
axes[1].legend(handles=legend_elems, loc='lower left', fontsize=9)
axes[1].set_title('Clusters LISA (Moran Local)\np < 0.05', fontsize=12)
axes[1].axis('off')

for _, row in gdf.iterrows():
    if row.geometry.is_valid and not row.geometry.is_empty:
        cx, cy = row.geometry.centroid.x, row.geometry.centroid.y
        axes[1].annotate(str(row.get('LOCALIDAD_GEO', '')).title(),
                         xy=(cx, cy), fontsize=5.5, ha='center', va='center')

plt.suptitle('Análisis Espacial de Criminalidad — Bogotá D.C.', fontsize=14, y=1.01)
plt.tight_layout()
plt.savefig('mapa_lisa.png', dpi=150, bbox_inches='tight')
plt.show()
print('💾 Guardado: mapa_lisa.png')


# ── Mapa interactivo LISA con Folium ─────────────────────────────────────────
m_lisa = folium.Map(location=[4.651, -74.090], zoom_start=11,
                    tiles='CartoDB positron')

for _, row in gdf.iterrows():
    if row.geometry is None or row.geometry.is_empty:
        continue
    cluster = row['LISA_cluster']
    color   = colores_lisa.get(cluster, '#cccccc')
    nombre  = str(row.get('LOCALIDAD_GEO', 'N/D')).title()
    tooltip = (
        f"<b>{nombre}</b><br>"
        f"Cluster LISA: <b>{cluster}</b><br>"
        f"Índice: {row['INDICE_CRIMEN']:.3f}<br>"
        f"Ii={row['LISA_Ii']:.3f} (p={row['LISA_p']:.3f})"
    )
    folium.GeoJson(
        data=row.geometry.__geo_interface__,
        style_function=lambda x, c=color: {
            'fillColor': c, 'color': 'white', 'weight': 1.5, 'fillOpacity': 0.75
        },
        tooltip=folium.Tooltip(tooltip, sticky=True)
    ).add_to(m_lisa)

legend_html = '''
<div style="position:fixed;bottom:30px;left:30px;z-index:1000;
            background:white;padding:10px;border-radius:8px;
            border:1px solid #ccc;font-size:13px;">
  <b>Clusters LISA</b><br>
  <span style="background:#d73027;padding:2px 10px;margin-right:5px;">&nbsp;</span>High-High<br>
  <span style="background:#4575b4;padding:2px 10px;margin-right:5px;">&nbsp;</span>Low-Low<br>
  <span style="background:#fc8d59;padding:2px 10px;margin-right:5px;">&nbsp;</span>High-Low<br>
  <span style="background:#91bfdb;padding:2px 10px;margin-right:5px;">&nbsp;</span>Low-High<br>
  <span style="background:#cccccc;padding:2px 10px;margin-right:5px;">&nbsp;</span>No significativo
</div>'''
m_lisa.get_root().html.add_child(folium.Element(legend_html))
m_lisa.save('mapa_lisa_interactivo.html')
print('💾 Guardado: mapa_lisa_interactivo.html')


# =============================================================================
# BLOQUE 4 — CLUSTERING ESPACIAL (ML NO SUPERVISADO)
# =============================================================================

# ── Preparar features para clustering ────────────────────────────────────────
features_cols = TASAS + ['centroid_x', 'centroid_y']
X_raw         = gdf[features_cols].fillna(0).values
scaler_ml     = StandardScaler()
X_scaled      = scaler_ml.fit_transform(X_raw)

print(f'\n✅ Matrix de features: {X_scaled.shape}')
print(f'   Features: {features_cols}')


# ── K-means — elegir k óptimo con codo + silueta ─────────────────────────────
inercias = []
siluetas = []
rango_k  = range(2, 9)

for k in rango_k:
    km  = KMeans(n_clusters=k, random_state=42, n_init=10)
    lbl = km.fit_predict(X_scaled)
    inercias.append(km.inertia_)
    siluetas.append(silhouette_score(X_scaled, lbl))

fig, axes = plt.subplots(1, 2, figsize=(13, 5))

axes[0].plot(list(rango_k), inercias, 'bo-', linewidth=2, markersize=8)
axes[0].set_xlabel('Número de clusters k')
axes[0].set_ylabel('Inercia (WCSS)')
axes[0].set_title('Método del Codo — K-means')
axes[0].grid(True, alpha=0.3)

axes[1].plot(list(rango_k), siluetas, 'rs-', linewidth=2, markersize=8)
axes[1].set_xlabel('Número de clusters k')
axes[1].set_ylabel('Coeficiente de silueta')
axes[1].set_title('Coeficiente de Silueta — K-means')
axes[1].grid(True, alpha=0.3)

k_optimo = list(rango_k)[np.argmax(siluetas)]
k_optimo = max(k_optimo, 3)   # Forzar mínimo k=3 para 3 niveles de riesgo
axes[1].axvline(x=k_optimo, color='green', linestyle='--', label=f'k óptimo = {k_optimo}')
axes[1].legend()

plt.tight_layout()
plt.savefig('kmeans_elbow.png', dpi=150, bbox_inches='tight')
plt.show()

print(f'\n✅ k óptimo por silueta: {k_optimo}')
print(f'   Silueta máxima: {max(siluetas):.4f}')


# ── K-means — etiquetado ROBUSTO de riesgo ───────────────────────────────────
#
# CORRECCIÓN: Se asigna la etiqueta de riesgo ordenando los clusters
# por su índice de criminalidad PROMEDIO, de mayor a menor.
# Con k=3: cluster con mayor índice → Riesgo Alto
#          cluster con índice medio  → Riesgo Medio
#          cluster con menor índice  → Riesgo Bajo
# Esto garantiza que SIEMPRE haya exactamente k categorías distintas.

km_final              = KMeans(n_clusters=k_optimo, random_state=42, n_init=10)
gdf['KMEANS_cluster'] = km_final.fit_predict(X_scaled)

# Perfil de cada cluster
perfil_km = (
    gdf.groupby('KMEANS_cluster')[TASAS + ['INDICE_CRIMEN']]
    .mean().round(2)
)
print('\n📊 Perfil de clusters K-means (tasas por 100k hab):')
print(perfil_km.to_string())

# Ordenar clusters por INDICE_CRIMEN promedio (mayor → menor)
clusters_ordenados = (
    perfil_km['INDICE_CRIMEN']
    .sort_values(ascending=False)
    .index.tolist()
)

# Definir etiquetas según número de clusters
if k_optimo == 2:
    niveles = ['Riesgo Alto', 'Riesgo Bajo']
elif k_optimo == 3:
    niveles = ['Riesgo Alto', 'Riesgo Medio', 'Riesgo Bajo']
else:
    niveles = ['Riesgo Alto'] + ['Riesgo Medio'] * (k_optimo - 2) + ['Riesgo Bajo']

etiquetas_map        = {cid: nivel for cid, nivel in zip(clusters_ordenados, niveles)}
gdf['KMEANS_riesgo'] = gdf['KMEANS_cluster'].map(etiquetas_map)

print('\n🏷️  Mapeo cluster → riesgo:')
for cid, label in etiquetas_map.items():
    idx_promedio = perfil_km.loc[cid, 'INDICE_CRIMEN']
    print(f'   Cluster {cid} (índice medio={idx_promedio:.3f}) → {label}')

print('\n🏷️  Etiquetas por localidad:')
print(gdf[['LOCALIDAD_GEO', 'KMEANS_riesgo', 'INDICE_CRIMEN']]
      .sort_values('INDICE_CRIMEN', ascending=False)
      .to_string(index=False))

print('\n📊 Distribución de riesgo:')
print(gdf['KMEANS_riesgo'].value_counts().to_string())


# ── DBSCAN ───────────────────────────────────────────────────────────────────
nbrs         = NearestNeighbors(n_neighbors=3).fit(X_scaled)
dists, _     = nbrs.kneighbors(X_scaled)
kdist        = np.sort(dists[:, 2])[::-1]

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(kdist, linewidth=2)
ax.set_xlabel('Puntos ordenados')
ax.set_ylabel('3ra distancia vecina')
ax.set_title('Curva k-distancias para elegir eps (DBSCAN)')
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('dbscan_kdist.png', dpi=150)
plt.show()

print('\n📊 DBSCAN con distintos eps:')
for eps in [0.5, 0.8, 1.0, 1.2, 1.5]:
    db  = DBSCAN(eps=eps, min_samples=2).fit(X_scaled)
    n_c = len(set(db.labels_)) - (1 if -1 in db.labels_ else 0)
    n_r = np.sum(db.labels_ == -1)
    print(f'  eps={eps:.1f} → {n_c} clusters, {n_r} ruido')

eps_final             = 1.0
db_final              = DBSCAN(eps=eps_final, min_samples=2).fit(X_scaled)
gdf['DBSCAN_cluster'] = db_final.labels_

n_clusters_db = len(set(db_final.labels_)) - (1 if -1 in db_final.labels_ else 0)
print(f'\n✅ DBSCAN final (eps={eps_final}): {n_clusters_db} clusters')
print(gdf[['LOCALIDAD_GEO', 'DBSCAN_cluster']].sort_values('DBSCAN_cluster').to_string(index=False))


# ── Clustering jerárquico + dendrograma ──────────────────────────────────────
Z = linkage(X_scaled, method='ward')

fig, ax = plt.subplots(figsize=(14, 6))
nombres_loc = gdf['LOCALIDAD_GEO'].str.title().tolist()
dendrogram(Z, labels=nombres_loc, ax=ax,
           leaf_rotation=45, leaf_font_size=9,
           color_threshold=0.7 * max(Z[:, 2]))
ax.set_title('Dendrograma — Clustering Jerárquico (Ward)\nLocalidades de Bogotá', fontsize=13)
ax.set_ylabel('Distancia')
ax.axhline(y=0.7 * max(Z[:, 2]), color='red', linestyle='--', alpha=0.5, label='Corte sugerido')
ax.legend()
plt.tight_layout()
plt.savefig('dendrograma.png', dpi=150, bbox_inches='tight')
plt.show()

hc                   = AgglomerativeClustering(n_clusters=k_optimo, linkage='ward')
gdf['HIER_cluster']  = hc.fit_predict(X_scaled)
print(f'\n✅ Clustering jerárquico (k={k_optimo}):')
print(gdf['HIER_cluster'].value_counts().to_string())


# ── Mapa comparativo de los 3 métodos ────────────────────────────────────────
fig, axes    = plt.subplots(1, 3, figsize=(20, 7))
cmaps        = ['Set1', 'Set2', 'Set3']
titulos      = [
    f'K-means (k={k_optimo})',
    f'DBSCAN (eps={eps_final})',
    f'Jerárquico Ward (k={k_optimo})'
]
cols_cluster = ['KMEANS_cluster', 'DBSCAN_cluster', 'HIER_cluster']

for i, (col, titulo, cmap) in enumerate(zip(cols_cluster, titulos, cmaps)):
    gdf.plot(column=col, ax=axes[i], categorical=True,
             cmap=cmap, legend=True, edgecolor='white', linewidth=0.8)
    for _, row in gdf.iterrows():
        if row.geometry.is_valid:
            cx, cy = row.geometry.centroid.x, row.geometry.centroid.y
            axes[i].annotate(
                str(row.get('LOCALIDAD_GEO', ''))[:8],
                xy=(cx, cy), fontsize=4.5, ha='center', va='center'
            )
    axes[i].set_title(titulo, fontsize=11)
    axes[i].axis('off')

plt.suptitle('Comparación de métodos de clustering — Bogotá D.C.', fontsize=14)
plt.tight_layout()
plt.savefig('comparacion_clustering.png', dpi=150, bbox_inches='tight')
plt.show()
print('💾 comparacion_clustering.png')


# =============================================================================
# BLOQUE 5 — RANDOM FOREST: CLASIFICACIÓN DE RIESGO
# =============================================================================

# ── Preparar target ───────────────────────────────────────────────────────────
RF_FEATURES = TASAS + ['area_km2', 'INDICE_CRIMEN']
X_rf        = gdf[RF_FEATURES].fillna(0).values
y_rf        = gdf['KMEANS_riesgo'].values

le           = LabelEncoder()
y_rf_enc     = le.fit_transform(y_rf)
scaler_rf    = StandardScaler()
X_rf_sc      = scaler_rf.fit_transform(X_rf)

print(f'\n✅ X shape: {X_rf_sc.shape}')
print(f'   Clases: {le.classes_}')
print(f'   Distribución: {dict(zip(le.classes_, np.bincount(y_rf_enc)))}')

# Verificar que hay al menos 2 clases distintas
n_clases = len(np.unique(y_rf_enc))
if n_clases < 2:
    raise ValueError(
        f'❌ Solo hay {n_clases} clase(s). Revisa el K-means — '
        f'todas las localidades quedaron en la misma categoría.'
    )
print(f'   ✅ {n_clases} clases distintas — OK para RF')


# ── Validación cruzada tradicional (Leave-One-Out) ────────────────────────────
rf     = RandomForestClassifier(n_estimators=200, max_depth=5,
                                random_state=42, class_weight='balanced')
loo    = LeaveOneOut()
cv_res = cross_validate(rf, X_rf_sc, y_rf_enc, cv=loo,
                        scoring=['accuracy', 'f1_macro'],
                        return_train_score=True)

print('\n' + '=' * 55)
print('VALIDACIÓN CRUZADA TRADICIONAL (Leave-One-Out)')
print('=' * 55)
print(f'  Accuracy (test):  {cv_res["test_accuracy"].mean():.4f} ± {cv_res["test_accuracy"].std():.4f}')
print(f'  F1 macro (test):  {cv_res["test_f1_macro"].mean():.4f} ± {cv_res["test_f1_macro"].std():.4f}')
print(f'  Accuracy (train): {cv_res["train_accuracy"].mean():.4f}')
print('=' * 55)


# ── Validación espacial (Spatial CV) ─────────────────────────────────────────
gdf_reset = gdf.reset_index(drop=True)
w_spatial = Queen.from_dataframe(gdf_reset, silence_warnings=True)
if w_spatial.islands:
    w_spatial = KNN.from_dataframe(gdf_reset, k=4, silence_warnings=True)

accuracy_spatial = []

for test_idx in range(len(gdf_reset)):
    vecinos   = list(w_spatial.neighbors[test_idx])
    excluir   = set([test_idx] + vecinos)
    train_idx = [i for i in range(len(gdf_reset)) if i not in excluir]

    if len(train_idx) < 5 or len(set(y_rf_enc[train_idx])) < 2:
        continue

    rf_sp = RandomForestClassifier(n_estimators=100, max_depth=4,
                                   random_state=42, class_weight='balanced')
    rf_sp.fit(X_rf_sc[train_idx], y_rf_enc[train_idx])
    pred = rf_sp.predict(X_rf_sc[[test_idx]])
    accuracy_spatial.append(int(pred[0] == y_rf_enc[test_idx]))

print('\n' + '=' * 55)
print('VALIDACIÓN ESPACIAL (Spatial CV — Queen neighbors)')
print('=' * 55)
print(f'  Iteraciones completadas: {len(accuracy_spatial)}')
print(f'  Accuracy espacial:       {np.mean(accuracy_spatial):.4f}')
diff = cv_res['test_accuracy'].mean() - np.mean(accuracy_spatial)
print(f'\n📌 Comparación:')
print(f'  LOO tradicional: {cv_res["test_accuracy"].mean():.4f}')
print(f'  LOO espacial:    {np.mean(accuracy_spatial):.4f}')
if diff > 0.05:
    print(f'\n⚠️  Diferencia significativa ({diff:.3f}): modelo más optimista sin estructura espacial.')
else:
    print(f'\n✅ Sin diferencia importante ({diff:.3f}): modelo espacialmente robusto.')
print('=' * 55)


# ── Modelo final + importancia de variables ───────────────────────────────────
rf.fit(X_rf_sc, y_rf_enc)
gdf['RF_riesgo_pred'] = le.inverse_transform(rf.predict(X_rf_sc))

importancias = pd.Series(rf.feature_importances_, index=RF_FEATURES).sort_values(ascending=True)

fig, ax = plt.subplots(figsize=(8, 5))
importancias.plot(kind='barh', ax=ax, color='steelblue', edgecolor='white')
ax.set_title('Importancia de variables — Random Forest\nClasificación de riesgo por localidad', fontsize=12)
ax.set_xlabel('Importancia (Gini)')
ax.grid(True, alpha=0.3, axis='x')
plt.tight_layout()
plt.savefig('rf_importancias.png', dpi=150, bbox_inches='tight')
plt.show()

print('\n📊 Reporte de clasificación RF:')
print(classification_report(y_rf_enc, rf.predict(X_rf_sc), target_names=le.classes_))

# Mapa de riesgo RF
color_riesgo = {'Riesgo Alto': '#d73027', 'Riesgo Medio': '#fc8d59', 'Riesgo Bajo': '#1a9850'}
fig, ax      = plt.subplots(figsize=(9, 8))
gdf['color_rf'] = gdf['RF_riesgo_pred'].map(color_riesgo)
gdf.plot(color=gdf['color_rf'], ax=ax, edgecolor='white', linewidth=0.7)
legend_elems = [Patch(fc=c, label=l) for l, c in color_riesgo.items()]
ax.legend(handles=legend_elems, loc='lower left', fontsize=10)
for _, row in gdf.iterrows():
    if row.geometry.is_valid:
        cx, cy = row.geometry.centroid.x, row.geometry.centroid.y
        ax.annotate(str(row.get('LOCALIDAD_GEO', '')).title(),
                    xy=(cx, cy), fontsize=5.5, ha='center', va='center')
ax.set_title(f'Clasificación de Riesgo — Random Forest\nBogotá {ANIO_ANALISIS}', fontsize=13)
ax.axis('off')
plt.tight_layout()
plt.savefig('mapa_riesgo_rf.png', dpi=150, bbox_inches='tight')
plt.show()
print('💾 mapa_riesgo_rf.png')


# =============================================================================
# BLOQUE 6 — MAPA INTERACTIVO FINAL
# =============================================================================
from branca.colormap import LinearColormap

m_final  = folium.Map(location=[4.651, -74.090], zoom_start=11,
                      tiles='CartoDB positron')

cmap_idx = LinearColormap(
    ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'],
    vmin=gdf['INDICE_CRIMEN'].min(),
    vmax=gdf['INDICE_CRIMEN'].max(),
    caption='Índice de Criminalidad'
)

# Capa 1: Índice de criminalidad
grupo_indice = folium.FeatureGroup(name='Índice Criminalidad', show=True)
for _, row in gdf.iterrows():
    if row.geometry is None or row.geometry.is_empty:
        continue
    nombre  = str(row.get('LOCALIDAD_GEO', 'N/D')).title()
    tooltip = (
        f"<b>{nombre}</b><br>"
        + ''.join([f"{d}: {row.get(COLS_TASA[d], 0):.1f}/100k<br>" for d in DELITOS_INTERES])
        + f"<b>Índice: {row['INDICE_CRIMEN']:.3f}</b><br>"
        + f"LISA: {row['LISA_cluster']}<br>"
        + f"Riesgo RF: {row.get('RF_riesgo_pred', 'N/D')}"
    )
    folium.GeoJson(
        data=row.geometry.__geo_interface__,
        style_function=lambda x, c=cmap_idx(row['INDICE_CRIMEN']): {
            'fillColor': c, 'color': 'white', 'weight': 1.5, 'fillOpacity': 0.75
        },
        tooltip=folium.Tooltip(tooltip, sticky=True)
    ).add_to(grupo_indice)
grupo_indice.add_to(m_final)
cmap_idx.add_to(m_final)

# Capa 2: Clusters LISA
grupo_lisa = folium.FeatureGroup(name='Clusters LISA', show=False)
for _, row in gdf.iterrows():
    if row.geometry is None or row.geometry.is_empty:
        continue
    color = colores_lisa.get(row['LISA_cluster'], '#cccccc')
    folium.GeoJson(
        data=row.geometry.__geo_interface__,
        style_function=lambda x, c=color: {
            'fillColor': c, 'color': 'white', 'weight': 1.5, 'fillOpacity': 0.8
        },
        tooltip=folium.Tooltip(
            f"<b>{str(row.get('LOCALIDAD_GEO', '')).title()}</b><br>"
            f"Cluster: {row['LISA_cluster']}<br>"
            f"Ii={row['LISA_Ii']:.3f}, p={row['LISA_p']:.3f}",
            sticky=True
        )
    ).add_to(grupo_lisa)
grupo_lisa.add_to(m_final)

# Capa 3: Riesgo RF
grupo_rf = folium.FeatureGroup(name='Riesgo RF', show=False)
for _, row in gdf.iterrows():
    if row.geometry is None or row.geometry.is_empty:
        continue
    color = color_riesgo.get(row.get('RF_riesgo_pred', ''), '#cccccc')
    folium.GeoJson(
        data=row.geometry.__geo_interface__,
        style_function=lambda x, c=color: {
            'fillColor': c, 'color': 'white', 'weight': 1.5, 'fillOpacity': 0.8
        },
        tooltip=folium.Tooltip(
            f"<b>{str(row.get('LOCALIDAD_GEO', '')).title()}</b><br>"
            f"Riesgo: <b>{row.get('RF_riesgo_pred', 'N/D')}</b>",
            sticky=True
        )
    ).add_to(grupo_rf)
grupo_rf.add_to(m_final)

folium.LayerControl(collapsed=False).add_to(m_final)
m_final.save('mapa_final_bogota.html')
print('💾 mapa_final_bogota.html')


# =============================================================================
# BLOQUE 7 — RESUMEN EJECUTIVO + EXPORTAR JSON PARA APP WEB
# =============================================================================

print('\n' + '=' * 65)
print('RESUMEN EJECUTIVO — Análisis Espacial Criminalidad Bogotá')
print('=' * 65)
print(f'\n📅 Año analizado: {ANIO_ANALISIS}')
print(f'📍 Localidades incluidas: {len(gdf)}')

print(f'\n─── MORAN I GLOBAL ───')
print(f'  I = {moran_global.I:.4f}  |  p = {moran_global.p_sim:.4f}')
print(f'  → {"Autocorrelación espacial positiva SIGNIFICATIVA" if moran_global.p_sim < 0.05 else "Sin autocorrelación significativa"}')

print(f'\n─── CLUSTERS LISA ───')
for c, n in gdf['LISA_cluster'].value_counts().items():
    print(f'  {c}: {n} localidades')

print(f'\n─── CLUSTERING ML ───')
print(f'  K-means k óptimo: {k_optimo}  (silueta={max(siluetas):.3f})')
for r, locs in gdf.groupby('KMEANS_riesgo')['LOCALIDAD_GEO'].apply(list).items():
    print(f'  {r}: {", ".join([l.title() for l in locs])}')

print(f'\n─── RANDOM FOREST ───')
print(f'  Accuracy LOO tradicional: {cv_res["test_accuracy"].mean():.4f}')
print(f'  Accuracy LOO espacial:    {np.mean(accuracy_spatial):.4f}')
print(f'  Variable más importante:  {importancias.index[-1]}')

print(f'\n─── TOP 5 LOCALIDADES MÁS PELIGROSAS ───')
top5 = gdf.nlargest(5, 'INDICE_CRIMEN')[['LOCALIDAD_GEO', 'INDICE_CRIMEN', 'LISA_cluster', 'RF_riesgo_pred']]
print(top5.to_string(index=False))
print('=' * 65)


# ── Exportar resultados_bogota.json para la app web ──────────────────────────
cols_exportar = (
    ['LOCALIDAD_GEO']
    + DELITOS_INTERES
    + TASAS
    + ['POBLACION', 'area_km2', 'INDICE_CRIMEN',
       'LISA_cluster', 'LISA_Ii', 'LISA_p', 'LISA_sig',
       'KMEANS_cluster', 'KMEANS_riesgo',
       'DBSCAN_cluster', 'HIER_cluster',
       'RF_riesgo_pred']
)

gdf_export = gdf[cols_exportar + ['geometry']].copy()

# Limpiar NaN para serialización JSON
for col in gdf_export.columns:
    if col != 'geometry':
        gdf_export[col] = (
            gdf_export[col].fillna('N/D') if gdf_export[col].dtype == object
            else gdf_export[col].fillna(0)
        )

geojson_str  = gdf_export.to_json()
geojson_data = json.loads(geojson_str)

metricas = {
    'anio'                   : int(ANIO_ANALISIS),
    'n_localidades'          : int(len(gdf)),
    'moran_I'                : round(float(moran_global.I), 4),
    'moran_p'                : round(float(moran_global.p_sim), 4),
    'moran_z'                : round(float(moran_global.z_sim), 4),
    'moran_significativo'    : bool(moran_global.p_sim < 0.05),
    'rf_accuracy_loo'        : round(float(cv_res['test_accuracy'].mean()), 4),
    'rf_accuracy_spatial'    : round(float(np.mean(accuracy_spatial)), 4),
    'rf_f1_macro'            : round(float(cv_res['test_f1_macro'].mean()), 4),
    'kmeans_k'               : int(k_optimo),
    'kmeans_silhouette'      : round(float(max(siluetas)), 4),
    'variable_mas_importante': str(importancias.index[-1]),
}

graficos = {
    'silueta_kmeans': [
        {'k': int(k), 'silueta': round(float(s), 4)}
        for k, s in zip(rango_k, siluetas)
    ],
    'importancias_rf': [
        {'variable': str(feat), 'importancia': round(float(imp), 4)}
        for feat, imp in zip(importancias.index, importancias.values)
    ],
    'moran_por_delito': [
        {
            'delito'       : d,
            'I'            : round(float(m.I), 4),
            'p'            : round(float(m.p_sim), 4),
            'significativo': bool(m.p_sim < 0.05)
        }
        for d, m in moran_por_delito.items()
    ],
    'lisa_distribucion': [
        {'cluster': str(c), 'n': int(n)}
        for c, n in gdf['LISA_cluster'].value_counts().items()
    ],
    'riesgo_distribucion': [
        {'riesgo': str(r), 'n': int(n)}
        for r, n in gdf['KMEANS_riesgo'].value_counts().items()
    ],
    'top10_criminalidad': (
        gdf.nlargest(10, 'INDICE_CRIMEN')
        [['LOCALIDAD_GEO', 'INDICE_CRIMEN'] + TASAS]
        .round(3)
        .to_dict(orient='records')
    ),
}

output = {
    'geojson' : geojson_data,
    'metricas': metricas,
    'graficos': graficos,
}

with open('resultados_bogota.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

size_mb = Path('resultados_bogota.json').stat().st_size / 1024 / 1024
print(f'\n✅ resultados_bogota.json generado — {size_mb:.2f} MB')
print(f'   Contiene: geojson ({len(geojson_data["features"])} features), '
      f'metricas ({len(metricas)} campos), graficos ({len(graficos)} secciones)')

# Guardar también el GeoJSON final por separado
gdf.to_file('bogota_criminalidad_analisis_final.geojson', driver='GeoJSON')

print('\n✅ Archivos generados:')
archivos = [
    'moran_scatter.png', 'mapa_lisa.png', 'mapa_lisa_interactivo.html',
    'kmeans_elbow.png', 'dbscan_kdist.png', 'dendrograma.png',
    'comparacion_clustering.png', 'rf_importancias.png',
    'mapa_riesgo_rf.png', 'mapa_final_bogota.html',
    'resultados_bogota.json',                          # ← para la app web
    'bogota_criminalidad_analisis_final.geojson',
]
for a in archivos:
    status = '✅' if os.path.exists(a) else '❌'
    print(f'  {status} {a}')

# En Colab: descomentar para descargar todos los archivos
# from google.colab import files
# for a in archivos:
#     if os.path.exists(a):
#         files.download(a)

