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
        
        populateDynamicFilters();
        
        // Initial render without filters
        applyFilters();
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showError('No se pudieron cargar los datos. Verifica el archivo data.json o la conexión.');
    }
}

/**
 * Recopila todas las categorías que existen en la DB descargada y auto genera opciones de los desplegables laterales
 */
function populateDynamicFilters() {
    const uniqueProvincias = [...new Set(allAuctions.map(a => a.provincia))].sort();
    const uniqueProcedimientos = [...new Set(allAuctions.map(a => a.procedimiento))].sort();

    filterProvincia.innerHTML = '';
    uniqueProvincias.forEach(prov => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `<input type="checkbox" value="${prov}" checked> ${prov}`;
        
        // Asignar el event listener a cada checkbox directamente (ya que el viejo "change" estaba en el select padre)
        label.querySelector('input').addEventListener('change', applyFilters);
        
        filterProvincia.appendChild(label);
    });

    filterProcedimiento.innerHTML = '';
    uniqueProcedimientos.forEach(proc => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `<input type="checkbox" value="${proc}" checked> ${proc}`;
        
        label.querySelector('input').addEventListener('change', applyFilters);
        
        filterProcedimiento.appendChild(label);
    });
}

/**
 * Filtra los datos según el estado de los <select>
 */
function applyFilters() {
    const checkedProvincias = Array.from(document.querySelectorAll('#filter-provincia input:checked')).map(cb => cb.value);
    const checkedProcedimientos = Array.from(document.querySelectorAll('#filter-procedimiento input:checked')).map(cb => cb.value);

    filteredAuctions = allAuctions.filter(auction => {
        const matchProvincia = checkedProvincias.includes(auction.provincia);
        const matchProcedimiento = checkedProcedimientos.includes(auction.procedimiento);
        return matchProvincia && matchProcedimiento;
    });

    // Validar visualmente cuentas
    const resultCount = document.getElementById('result-count');
    if (resultCount) resultCount.textContent = filteredAuctions.length;

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

    // Generamos un gráfico basado en valor (€) y superficie (ha) 
    const points = data.map(item => {
        
        let sup = parseFloat(item.superficie_ha) || 0;
        let val = parseFloat(item.valor_subasta) || 0;

        return {
            x: sup,
            y: val,
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
                label: 'Oportunidades Inmobiliarias',
                data: points,
                backgroundColor: 'rgba(16, 185, 129, 0.6)', 
                borderColor: '#10b981',
                pointRadius: 6,
                pointHoverRadius: 9,
                borderWidth: 1,
                pointHoverBackgroundColor: '#FFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#10b981',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            const raw = context.raw.auctionData;
                            return [
                                `📌 ${raw.procedimiento} - ${raw.provincia}`,
                                `📐 Superficie: ${raw.superficie_ha} ha`,
                                `💰 Valor: €${parseFloat(raw.valor_subasta).toLocaleString()}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Superficie (Hectáreas)',
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Valor Tasación (€)',
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000) return '€' + (value / 1000) + 'K';
                            return '€' + value;
                        }
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const datasetId = elements[0].datasetIndex;
                    const ad = scatterChart.data.datasets[datasetId].data[idx].auctionData;
                    
                    window.location.href = `detalle.html?id=${encodeURIComponent(ad.id)}`;
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
