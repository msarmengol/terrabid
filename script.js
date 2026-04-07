// Global state to hold auction data
let allAuctions = [];
let filteredAuctions = [];

// DOM Elements
const container = document.getElementById('results-container');
const template = document.getElementById('card-template');
const filterProvincia = document.getElementById('filter-provincia');
const filterProcedimiento = document.getElementById('filter-procedimiento');
const exportBtn = document.getElementById('export-csv');
const countElement = document.getElementById('count-results');

// Initialization
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await fetchData();
}

/**
 * Agrega eventos a los filtros y botones
 */
function setupEventListeners() {
    filterProvincia.addEventListener('change', applyFilters);
    filterProcedimiento.addEventListener('change', applyFilters);
    exportBtn.addEventListener('click', exportToCSV);
}

/**
 * Carga los datos desde JSON. En producción, podría ser un endpoint.
 */
async function fetchData() {
    try {
        // Mostramos un loader o vaciamos el grid (actualmente simulado en CSS si está vacío)
        container.innerHTML = '';
        
        const response = await fetch('data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allAuctions = await response.json();
        
        // Initial render without filters
        applyFilters();
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showError('No se pudieron cargar los datos. Verifica el archivo data.json o la conexión.');
    }
}

/**
 * Filtra los datos según el estado de los <select>
 */
function applyFilters() {
    const prov = filterProvincia.value;
    const proc = filterProcedimiento.value;

    filteredAuctions = allAuctions.filter(auction => {
        const matchProvincia = prov === 'all' || auction.provincia === prov;
        const matchProcedimiento = proc === 'all' || auction.procedimiento === proc;
        return matchProvincia && matchProcedimiento;
    });

    renderCards(filteredAuctions);
    renderChart(filteredAuctions);
}

// Variable global para nuestro Chart
let scatterChart = null;

/**
 * Renderiza la Nube de Puntos usando Chart.js
 */
function renderChart(data) {
    const canvas = document.getElementById('scatterChart');
    if (!canvas) return;
    
    if (scatterChart) {
        scatterChart.destroy();
    }
    
    if (data.length === 0) return;

    // Ejes definidos
    const provincias = ["Huelva", "Cáceres"];
    const procedimientos = ["Subasta Judicial", "Subasta Administrativa", "Concurso de Acreedores"];

    // Mapear los datos añadiendo "jitter" (ruido visual) para que no se superpongan exactamente
    const points = data.map(item => {
        let xBase = procedimientos.indexOf(item.procedimiento);
        let yBase = provincias.indexOf(item.provincia);
        
        // Si no está en el listado mapeado lo mandamos a un índice extra (o -1)
        if (xBase === -1) xBase = procedimientos.length;
        if (yBase === -1) yBase = provincias.length;

        // Ruido para dispersar visualmente y que parezca una nube real
        const jitterX = (Math.random() - 0.5) * 0.4;
        const jitterY = (Math.random() - 0.5) * 0.4;

        return {
            x: xBase + jitterX,
            y: yBase + jitterY,
            auctionData: item
        };
    });

    const ctx = canvas.getContext('2d');
    
    // Configurar color defaults de Chart.js orientados a modo oscuro
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Propiedades',
                data: points,
                backgroundColor: 'rgba(16, 185, 129, 0.6)', 
                borderColor: '#10b981',
                pointRadius: 7,
                pointHoverRadius: 10,
                borderWidth: 2,
                pointHoverBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const auc = context.raw.auctionData;
                            const formatPrice = new Intl.NumberFormat('es-ES').format(auc.valor_subasta);
                            return [
                                `Ref: ${auc.id} - ${auc.municipio}`,
                                `Procedimiento: ${auc.procedimiento}`,
                                `Precio: ${formatPrice} €`
                            ];
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                // Al hacer clic redirige al detalle.html
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const auc = points[idx].auctionData;
                    window.location.href = `detalle.html?id=${auc.id}`;
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            scales: {
                x: {
                    min: -0.5,
                    max: procedimientos.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return procedimientos[Math.round(value)] || '';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    min: -0.5,
                    max: provincias.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return provincias[Math.round(value)] || '';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

/**
 * Renderiza el DOM a partir de los datos pasados
 * @param {Array} data - Array de subastas a pintar
 */
function renderCards(data) {
    container.innerHTML = ''; // Limpiar contenedor
    
    // Actualizar Contador
    countElement.textContent = data.length;

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <h3>Sin resultados</h3>
                <p>No se encontraron subastas con estos filtros.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((auction, index) => {
        // Clonar el contenido del template
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.auction-card');
        
        // Stagger animation delay
        card.style.animationDelay = `${index * 0.05}s`;

        // Llenar datos
        clone.querySelector('[data-id]').textContent = auction.id;
        clone.querySelector('[data-provincia]').textContent = auction.provincia;
        clone.querySelector('[data-procedimiento]').textContent = auction.procedimiento;
        clone.querySelector('[data-municipio]').textContent = auction.municipio;
        clone.querySelector('[data-tipo]').textContent = auction.tipo;
        
        // Formateador de números
        const fmtVal = new Intl.NumberFormat('es-ES').format(auction.valor_subasta);
        const fmtSup = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(auction.superficie_ha);
        
        clone.querySelector('[data-superficie]').textContent = fmtSup;
        clone.querySelector('[data-valor]').textContent = fmtVal;
        
        // Fecha y Fuente
        clone.querySelector('[data-cierre]').textContent = formatFecha(auction.fecha_cierre);
        clone.querySelector('[data-fuente]').textContent = `Origen: ${auction.fuente}`;
        
        // Link del footer icon
        clone.querySelector('.btn-icon').href = `detalle.html?id=${auction.id}`;

        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
}

/**
 * Descarga el contenido actual filtrado como un archivo CSV
 */
function exportToCSV() {
    if (filteredAuctions.length === 0) {
        alert("No hay datos para exportar");
        return;
    }

    // Cabeceras del CSV
    const headers = ["ID", "Provincia", "Municipio", "Procedimiento", "Tipo", "Superficie (ha)", "Valor subasta (EUR)", "Fecha cierre", "Fuente", "Enlace"];
    
    // Mapear los datos a filas JSON
    const rows = filteredAuctions.map(a => [
        a.id,
        a.provincia,
        a.municipio,
        a.procedimiento,
        a.tipo,
        a.superficie_ha,
        a.valor_subasta,
        a.fecha_cierre,
        a.fuente,
        a.link
    ]);

    // Combinar en string CSV
    let csvContent = headers.join(",") + "\n" 
                   + rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",")).join("\n");

    // Crear un blob y desencadenar descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `subastas_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Formatear fecha simple (YYYY-MM-DD -> DD/MM/YYYY)
 */
function formatFecha(dateString) {
    if(!dateString) return 'N/A';
    const split = dateString.split('-');
    if(split.length !== 3) return dateString;
    return `${split[2]}/${split[1]}/${split[0]}`;
}

/**
 * Mostrar mensaje de error general
 */
function showError(msg) {
    container.innerHTML = `
        <div class="empty-state" style="color: #ef4444;">
            <h3>Error</h3>
            <p>${msg}</p>
        </div>
    `;
}
