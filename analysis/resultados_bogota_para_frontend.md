# **JSON al Frontend — explicación para LLM**

Breve: este documento describe la estructura del JSON que produce el script de análisis y que consume el frontend, y explica las fórmulas matemáticas relevantes (tasas, índice compuesto, Moran I, LISA, clustering y validación ML).

## **Estructura General**
- **Top-level**: el archivo `resultados_bogota.json` contiene tres claves principales:
  - **`geojson`**: GeoJSON FeatureCollection con propiedades por localidad (se usa en el mapa y en detalles). Ver [criminalidad-app/public/resultados_bogota.json](criminalidad-app/public/resultados_bogota.json).
  - **`metricas`**: objeto con métricas globales del análisis (Moran I, accuracy RF, kmeans_k, etc.).
  - **`graficos`**: objetos/arrays preparados para las gráficas del frontend (silueta_kmeans, importancias_rf, moran_por_delito, top10_criminalidad, etc.).

## **`geojson.features[].properties` — campos clave**
- **`LOCALIDAD_GEO`**: string — nombre normalizado de la localidad.
- Conteos (raw): **`HOMICIDIO`**, **`HURTO A PERSONAS`**, **`HURTO A COMERCIO`**, **`LESIONES PERSONALES`**, **`VIOLENCIA INTRAFAMILIAR`** (numéricos; totales por localidad y año).
- Tasas (por 100000 hab): **`TASA_HOMICIDIO`**, **`TASA_HURTO_A_PERSONAS`**, **`TASA_HURTO_A_COMERCIO`**, **`TASA_LESIONES_PERSONALES`**, **`TASA_VIOLENCIA_INTRAFAMILIAR`** (float).
- **`POBLACION`**: entero (valor usado para normalizar; faltantes rellenados con mediana poblacional en el script).
- **`area_km2`**: área de la unidad (float).
- **`INDICE_CRIMEN`**: índice compuesto numérico (ver fórmula más abajo).
- LISA (Moran local): **`LISA_cluster`** ("High-High", "Low-Low", "High-Low", "Low-High" o "No significativo"), **`LISA_Ii`** (Ii local), **`LISA_p`** (p‑valor), **`LISA_sig`** (bool).
- Clustering: **`KMEANS_cluster`** (int), **`KMEANS_riesgo`** (label texto: "Riesgo Alto/Medio/Bajo"), **`DBSCAN_cluster`** (int, -1 = ruido), **`HIER_cluster`** (int).
- Random Forest: **`RF_riesgo_pred`**: predicción final de riesgo (texto).
- **`geometry`**: geometría GeoJSON de la localidad (polígono/ MultiPolygon).

> Nota: el frontend usa principalmente las tasas `TASA_...`, `INDICE_CRIMEN`, `LISA_*`, `KMEANS_riesgo` y `RF_riesgo_pred` para tooltips, leyendas y tablas.

## **`metricas` — campos y significado**
- **`anio`**: entero — año de análisis (último disponible en `SIEDCO.csv`).
- **`n_localidades`**: entero — número de unidades analizadas.
- **`moran_I`**, **`moran_p`**, **`moran_z`**: valores del I de Moran global y su test (p_sim y z-score).
- **`moran_significativo`**: booleano — `moran_p < 0.05`.
- **`rf_accuracy_loo`**: accuracy promedio del Random Forest con Leave‑One‑Out (LOO) tradicional.
- **`rf_accuracy_spatial`**: accuracy promedio de la validación espacial (excluye vecinos Queen de la unidad prueba).
- **`rf_f1_macro`**: F1 macro promedio (clasificación RF) usada en el reporte.
- **`kmeans_k`**: k seleccionado para K‑means (por coeficiente de silueta).
- **`kmeans_silhouette`**: coeficiente de silueta (valor máximo evaluado).
- **`variable_mas_importante`**: nombre de la variable con mayor importancia Gini en RF.

## **`graficos` — estructura y campos**
- **`silueta_kmeans`**: array de `{ k: int, silueta: float }` (criterio evaluado para varios k).
- **`importancias_rf`**: array de `{ variable: string, importancia: float }` (importancia Gini por feature).
- **`moran_por_delito`**: array de `{ delito: string, I: float, p: float, significativo: bool }`.
- **`lisa_distribucion`**: array de `{ cluster: string, n: int }` con recuento por tipo LISA.
- **`riesgo_distribucion`**: array de `{ riesgo: string, n: int }`.
- **`top10_criminalidad`**: array (hasta 10) de registros con claves como `LOCALIDAD_GEO`, `INDICE_CRIMEN`, y las `TASA_...` relevantes (se usa para tablas/ tarjetas).

## **Fórmulas y notas matemáticas**

**Tasa por 100.000 habitantes (por delito d, localidad i):**

$$TASA_{d,i} = \frac{C_{d,i}}{P_i} \times 100000$$

- donde $C_{d,i}$ = número de hechos del delito $d$ en la localidad $i$, y $P_i$ = población de la localidad.

**Índice compuesto de criminalidad (`INDICE_CRIMEN`)**

1. Se construye la matriz de tasas por localidad y por delito (vector $x_i = [TASA_{1,i}, TASA_{2,i}, ..., TASA_{m,i}]$).
2. Se aplica Min‑Max scaling por variable (cada delito) para obtener $x'_{i,j}$ con rango $[0,1]$:

$$x'_{i,j} = \frac{x_{i,j} - \min_j}{\max_j - \min_j}$$

(implementado con `sklearn.preprocessing.MinMaxScaler`).

3. El índice compuesto es la suma de las tasas escaladas:

$$INDICE_i = \sum_{j=1}^m x'_{i,j}\qquad(\text{se guarda redondeado})$$

> En el código: `gdf['INDICE_CRIMEN'] = scaler.fit_transform(tasas_vals).sum(axis=1)`.

**Moran I global** (estandar):

$$I = \frac{n}{S_0} \cdot \frac{\sum_{i}\sum_{j} w_{ij}(x_i-\bar{x})(x_j-\bar{x})}{\sum_{i}(x_i-\bar{x})^2}$$

- $n$ = número de unidades, $w_{ij}$ = peso espacial, $S_0 = \sum_i\sum_j w_{ij}$.
- En el script se usa `Queen` (contigüidad por vértices o lados) y luego `w.transform = 'R'` (row‑standardization):

$$w_{ij} \leftarrow \frac{w_{ij}}{\sum_j w_{ij}}$$

- El p‑valor se obtiene por test de permutación (`permutations=999`), `p_sim`.

**LISA (Moran Local)**
- Calcula $I_i$ por unidad y un p‑valor por permutación. El script clasifica cada unidad en una de las 4 cuadrantes (High‑High, Low‑Low, Low‑High, High‑Low) usando `lisa.q` y marca como "No significativo" cuando $p \ge 0.05$.

**Coeficiente de silueta (para obs. i):**

$$s(i) = \frac{b(i) - a(i)}{\max\{a(i),\, b(i)\}}$$

- $a(i)$ = distancia media dentro del mismo cluster, $b(i)$ = distancia mínima media al cluster vecino más cercano.
- Se usa la silueta promedio para evaluar k (rango evaluado en el script: 2..8).

**K‑means**
- Se entrena sobre features: `TASAS + centroid_x + centroid_y` normalizados con `StandardScaler`.
- `k_optimo` se elige por la silueta máxima; luego los clusters se ordenan por `INDICE_CRIMEN` promedio para asignar etiquetas `Riesgo Alto/Medio/Bajo`.

**DBSCAN**
- Se ejecuta sobre el mismo espacio escalado; parámetros finales en el script: `eps = 1.0`, `min_samples = 2`. Labels `-1` representan ruido.

**Random Forest (clasificador de riesgo)**
- Features usadas: `TASAS + ['area_km2', 'INDICE_CRIMEN']` (se estandarizan antes de entrenar).
- Target: `KMEANS_riesgo` (categorías etiquetadas y codificadas con `LabelEncoder`).
- CV tradicional: `LeaveOneOut()` (LOO). Métricas: accuracy y `f1_macro`.
- CV espacial: por cada unidad de prueba se excluye del entrenamiento la unidad y sus vecinos Queen; se entrena con el resto (si hay al menos 2 clases y >=5 muestras) y se calcula accuracy iterando sobre test_idx.
- Hyperparámetros usados en entrenamiento final: `n_estimators=200`, `max_depth=5` (en el flujo principal; algunos experimentos usan 100/4 en la validación espacial).

**Métricas definidas**
- **Accuracy:** $\text{accuracy} = \frac{1}{N} \sum_{i=1}^N \mathbf{1}(y_i = \hat{y}_i)$.
- **F1 macro:**

$$F1_{macro} = \frac{1}{C} \sum_{c=1}^C \frac{2\cdot \text{precision}_c \cdot \text{recall}_c}{\text{precision}_c + \text{recall}_c}$$

## **Mapping: qué usa cada componente del frontend**
- **Hook** `useResultados()` (en [criminalidad-app/src/hooks/useResultados.js](criminalidad-app/src/hooks/useResultados.js#L1)) carga `/resultados_bogota.json`.

- **`MapaInteractivo.jsx`** ([criminalidad-app/src/components/MapaInteractivo.jsx](criminalidad-app/src/components/MapaInteractivo.jsx#L1)) → usa `geojson.features[].properties`:
  - `INDICE_CRIMEN` (degradado), `LISA_cluster` (colores), `RF_riesgo_pred`, `LISA_Ii`, `LISA_p` y las `TASA_...` para tooltips y modales.

- **`GraficasDelitos.jsx`** ([criminalidad-app/src/components/GraficasDelitos.jsx](criminalidad-app/src/components/GraficasDelitos.jsx#L1)) → usa `graficos.moran_por_delito`, `geojson.features` y `graficos.top10_criminalidad` para barras, radar y badges.

- **`ClusteringML.jsx`** ([criminalidad-app/src/components/ClusteringML.jsx](criminalidad-app/src/components/ClusteringML.jsx#L1)) → usa `metricas` y `graficos` (`kmeans_silhouette`, `importancias_rf`, `moran_por_delito`, etc.) para KPIs y gráficas.

- **`KPICards.jsx`** ([criminalidad-app/src/components/KPICards.jsx](criminalidad-app/src/components/KPICards.jsx#L1)) → resume `metricas` y `graficos` (top10, distribuciones LISA/riesgo).

- **`TablaRanking.jsx`** ([criminalidad-app/src/components/TablaRanking.jsx](criminalidad-app/src/components/TablaRanking.jsx#L1)) → trabaja con `graficos.top10_criminalidad` como `top10` y muestra tasas / badges.

## **Ejemplo JSON mínimo (esquema simplificado)**

```json
{
  "geojson": { "type": "FeatureCollection", "features": [ { "type": "Feature", "properties": { "LOCALIDAD_GEO": "BOSA", "TASA_HURTO_A_PERSONAS": 123.4, "INDICE_CRIMEN": 1.234, "LISA_cluster": "High-High", "LISA_Ii": 0.45, "LISA_p": 0.01, "KMEANS_riesgo": "Riesgo Alto", "RF_riesgo_pred": "Riesgo Alto" }, "geometry": { /* ... */ } } ] },
  "metricas": { "anio": 2023, "n_localidades": 20, "moran_I": 0.32, "moran_p": 0.012, "rf_accuracy_loo": 0.85, "rf_accuracy_spatial": 0.79 },
  "graficos": { "silueta_kmeans": [ {"k":3, "silueta":0.42} ], "importancias_rf": [{"variable":"TASA_HURTO_A_PERSONAS","importancia":0.31}], "moran_por_delito": [{"delito":"HURTO A PERSONAS","I":0.28,"p":0.02,"significativo":true}], "top10_criminalidad": [ { "LOCALIDAD_GEO":"BOSA", "INDICE_CRIMEN":1.234, "TASA_HURTO_A_PERSONAS":123.4 } ] }
}
```

## **Recomendaciones al pasar esto a un LLM**
- Pasa tanto el archivo `resultados_bogota.json` real como este markdown; el JSON contiene los números y el markdown explica cómo fueron calculados.
- Pide al LLM que verifique fórmulas clave (TASA, INDICE_CRIMEN, Moran I, LISA) y que confirme si la interpretación estadística (p < 0.05, etc.) es correcta.
- Si quieres explicaciones matemáticas más formales, solicita al LLM derivar la varianza explicada o hacer una descomposición de importancias.

---

Archivo creado: `analysis/resultados_bogota_para_frontend.md` (en el repo). Si quieres, genero también un JSON Schema formal o un resumen por componente con la lista exacta de propiedades que usa cada archivo React.