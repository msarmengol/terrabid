# TerraBid 🌱 - Directorio de Subastas Rústicas

Un panel interactivo ("Dashboard") diseñado para la visualización, el análisis y el seguimiento de oportunidades reales de subastas de bienes agrícolas y fincas rústicas en Huelva y Cáceres.

## Características Principales

*   **⚡ Interfaz Reactiva Estática**: Desarrollado con una arquitectura _serverless_ (sin backend), todo el procesamiento de las búsquedas se resuelve al instante en el lado del cliente (Frontend).
*   **🔍 Filtros Dinámicos Combinados**: Permite acotar el directorio por **Provincia** y **Tipo de Procedimiento** de forma interactiva en la barra lateral.
*   **📊 Exploración Visual (Nube de Puntos)**: Contiene un gráfico de dispersión (_Scatter Plot_ de Chart.js) integrado donde se añaden posiciones con ruido de visualización (_Jitter_) paramostrar las varianzas cualitativas. Al hacer clic sobre cualquier punto, la web te lleva a la ficha de datos oficial del mismo.
*   **📥 Descarga de Registros Activos (CSV)**: Generación y exportación a vuelo de formato compatible (CSV) de cualquier consulta en progreso para conectar con Excel, PowerBI o similar.
*   **🎨 Diseño Premium Glassmorphism**: Utiliza diseño moderno con componentes sobre el efecto _Dark Glass_ acentuados en tonos Esmeralda, garantizando el confort visual.
*   **🧾 Páginas de Detalle**: Incluye plantillas en profundidad (`detalle.html`) con los parámetros técnicos de cada finca y un puente directo a la propia ordenación de la fuente (ej. BOE o Portal de la Junta de Andalucía).

## Arquitectura Técnica

Se trata de un proyecto construido bajo tecnologías puras y librerías importadas por red para evitar los procesos de _build_ o renderizados complejos:
*   **Estructura y Estilos:** HTML5, CSS3.
*   **Lógica Funcional:** JavaScript Moderno (Vanilla ES6+).
*   **Visualización de Datos:** Chart.js V4.x a través de CDN.
*   **Almacenamiento (Base de Datos):** Basado un origen estático desde un objeto estructurado (`data.json`).

## Modelo de Datos (Extracción) 

Dado que existen severas políticas CORS implantadas por los navegadores en portales oficiales, la extracción de datos debe hacerse asíncronamente con un lenguaje independiente (como Python usando BeaultifulSoup, Selenium u otros _scrapers_ de API). 

Dicho código recogerá todos los datos externos y los convertirá a formato estricto JSON sobre-escribiendo el archivo físico en el _core_ `/data.json`.
La API del frontend consultará silenciosamente a este sistema y renderizará la web con la información fresca sin que nadie sufra tiempos de carga excesivos.

Formato requerido de objeto interno JSON:

```json
  {
    "id": "SUB-1029",
    "provincia": "Huelva",
    "municipio": "Almonte",
    "procedimiento": "Subasta Judicial",
    "tipo": "Finca Rústica",
    "superficie_ha": 12.5,
    "valor_subasta": 150000,
    "fecha_cierre": "2026-05-15",
    "fuente": "BOE",
    "link": "https://url-original-de-la-subasta"
  }
```

## Ejecución en Local (Pruebas)

Al no tener Backend, la plataforma utiliza `fetch()` para solicitar los recursos. Muchos navegadores como Chrome deshabilitan el _sandbox fetch_ cuando lanzas un archivo index.html por su ruta file local (`file:///`).

Para usar en pruebas lanza un pequeño webserver estático:
```bash
python -m http.server 8000
```
Y visita `http://localhost:8000/`.

---
*Diseñado bajo entorno de innovación analítica para el control patrimonial agronómico (2026).*
