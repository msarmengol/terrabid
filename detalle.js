document.addEventListener('DOMContentLoaded', initDetail);

async function initDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('id');

    if (!auctionId) {
        showError('No se especificó un ID de subasta válido.');
        return;
    }

    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const allAuctions = await response.json();
        const auction = allAuctions.find(a => a.id === auctionId);

        if (!auction) {
            showError('No se encontró la subasta solicitada en la base de datos.');
            return;
        }

        renderDetail(auction);

    } catch (error) {
        console.error('Error fetching data:', error);
        showError('Ocurrió un error al cargar los datos de la subasta.');
    }
}

function renderDetail(auction) {
    const container = document.getElementById('detail-container');
    const template = document.getElementById('detail-template');
    
    container.innerHTML = '';
    const clone = template.content.cloneNode(true);

    // Formateadores
    const fmtVal = new Intl.NumberFormat('es-ES').format(auction.valor_subasta);
    const fmtSup = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(auction.superficie_ha);
    
    // Asignar datos a los elementos
    clone.querySelector('[data-id]').textContent = auction.id;
    clone.querySelector('[data-provincia]').textContent = auction.provincia;
    clone.querySelector('[data-procedimiento]').textContent = auction.procedimiento;
    clone.querySelector('[data-municipio]').textContent = auction.municipio;
    clone.querySelector('[data-tipo]').textContent = auction.tipo;

    // Listas detalladas
    clone.querySelector('[data-provincia-text]').textContent = auction.provincia;
    clone.querySelector('[data-municipio-text]').textContent = auction.municipio;
    clone.querySelector('[data-tipo-text]').textContent = auction.tipo;
    clone.querySelector('[data-procedimiento-text]').textContent = auction.procedimiento;

    clone.querySelector('[data-cierre]').textContent = formatFecha(auction.fecha_cierre);
    clone.querySelector('[data-fuente]').textContent = auction.fuente;

    clone.querySelector('[data-superficie]').textContent = fmtSup;
    clone.querySelector('[data-valor]').textContent = fmtVal;

    // Enlace de acción principal
    const btnUrl = clone.querySelector('[data-link]');
    btnUrl.href = auction.link === '#' ? 'https://subastas.boe.es/index.php' : auction.link;

    container.appendChild(clone);
}

function formatFecha(dateString) {
    if(!dateString) return 'N/A';
    const split = dateString.split('-');
    if(split.length !== 3) return dateString;
    return `${split[2]}/${split[1]}/${split[0]}`;
}

function showError(msg) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
        <div class="empty-state" style="color: #ef4444; padding: 4rem;">
            <h3>Error</h3>
            <p>${msg}</p>
            <a href="index.html" class="btn-primary" style="margin-top: 1rem; width: auto;">Volver al directorio</a>
        </div>
    `;
}
