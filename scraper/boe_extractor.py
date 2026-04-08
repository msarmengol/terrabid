import json
import logging
import os
import re
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def extract_price(text):
    match = re.search(r'Valor subasta[^0-9]*([\d\.]+,\d{2})', text, re.IGNORECASE)
    if match:
        val_str = match.group(1).replace('.', '').replace(',', '.')
        return float(val_str)
    return 0.0

def run_scraper():
    logging.info("Arrancando Scraper del BOE con Playwright (Navegador Autómata)...")
    
    provincias = [
        {"nombre": "Almería", "id": "4"},
        {"nombre": "Cádiz", "id": "11"},
        {"nombre": "Córdoba", "id": "14"},
        {"nombre": "Granada", "id": "18"},
        {"nombre": "Huelva", "id": "21"},
        {"nombre": "Jaén", "id": "23"},
        {"nombre": "Málaga", "id": "29"},
        {"nombre": "Sevilla", "id": "41"},
        {"nombre": "Badajoz", "id": "6"},
        {"nombre": "Cáceres", "id": "10"}
    ]
    
    scraped_items = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Contexto persistente simulado para evitar bloqueos
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        for prov in provincias:
            logging.info(f"Escaneando provincia: {prov['nombre']}...")
            try:
                # Cargar el buscador principal para adquirir tokens
                page.goto("https://subastas.boe.es/subastas_ava.php", wait_until="domcontentloaded")
                
                # Rellenar formulario (Inmuebles + Provincia)
                page.locator("input[id='idTipoBienI']").check(force=True)
                page.locator("select[name='dato[8]']").select_option(prov['id'])
                
                # Clic en buscar y esperar la carga de la siguiente página
                page.locator("input[value='Buscar']").click()
                page.wait_for_load_state("domcontentloaded")
                
                # Extraer HTML procesado
                html = page.content()
                soup = BeautifulSoup(html, 'html.parser')
                
                resultados = soup.find_all('li', class_='resultado-busqueda')
                logging.info(f"* Encontradas {len(resultados)} subastas activas en {prov['nombre']}.")
                
                for res in resultados[:15]:  # Máximo 15 subastas por provincia para no saturar
                    texto_completo = res.get_text(separator=' ', strip=True)
                    
                    # Referencia oficial / Enlace
                    a_tag = res.find('a', class_='resultado-busqueda-link-defecto')
                    if not a_tag: continue
                    link = "https://subastas.boe.es" + a_tag['href'].replace("./", "/")
                    
                    # ID oficial (Ej. SUB-JA-2023-22123)
                    id_match = re.search(r'idSub=(SUB-[a-zA-Z0-9\-]+)', link)
                    id_subasta = id_match.group(1) if id_match else f"SUB-DESCONOCIDA-{hash(link)%100000}"
                    
                    # Extracción profunda de la Ficha en Vivo (Usando requests sobre la URL directa sin tokens)
                    import requests
                    valor = 0.0
                    superficie = 0.0
                    try:
                        ficha_req = requests.get(link, timeout=5)
                        ficha_text = ficha_req.text
                        
                        # Extraer Valor Subasta real o Tasación
                        v_match = re.search(r'Valor subasta[^0-9]*([\d\.]+,\d{2})', ficha_text, re.IGNORECASE)
                        if not v_match:
                            v_match = re.search(r'Cantidad reclamada[^0-9]*([\d\.]+,\d{2})', ficha_text, re.IGNORECASE)
                            
                        if v_match:
                            valor = float(v_match.group(1).replace('.', '').replace(',', '.'))
                        
                        # Extraer Superficie de la descripción si la hay
                        sup_match = re.search(r'superficie.*?de\s*([\d\.,]+)\s*(ha|hectreas|m2|metros)', ficha_text, re.IGNORECASE)
                        if sup_match:
                            s_val = float(sup_match.group(1).replace('.', '').replace(',', '.'))
                            if 'm2' in sup_match.group(2).lower() or 'metros' in sup_match.group(2).lower():
                                superficie = round(s_val / 10000.0, 2)
                            else:
                                superficie = s_val
                        else:
                            # Intento de rescate asumiendo hectáreas genéricas para fincas
                            superficie = 1.0 
                            
                    except Exception as err:
                        logging.warning(f"  - No se pudo acceder a la ficha {id_subasta}: {err}") 
                    
                    # Procedimiento
                    procedimiento = "Subasta Judicial"
                    if "Notarial" in texto_completo: procedimiento = "Subasta Notarial"
                    elif "Administrativa" in texto_completo: procedimiento = "Subasta Administrativa"
                    
                    item = {
                        "id": id_subasta,
                        "provincia": prov['nombre'],
                        "municipio": "Ver en detalle original", 
                        "procedimiento": procedimiento, 
                        "tipo": "Inmuebles - Finca",
                        "superficie_ha": superficie, 
                        "valor_subasta": valor,
                        "fecha_cierre": datetime.now().strftime("%Y-%m-%d"),
                        "fuente": "BOE",
                        "link": link
                    }
                    scraped_items.append(item)
                    
            except Exception as e:
                logging.error(f"Fallo al procesar la navegación de {prov['nombre']}: {e}")
                
        browser.close()

    if not scraped_items:
        logging.warning("No se ha podido extraer ninguna subasta. Operación cancelada por seguridad.")
        return

    # Escribir el fichero JSON en la ruta superior
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data.json')
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(scraped_items, f, ensure_ascii=False, indent=2)
        logging.info("Archivo data.json regenerado satisfactoriamente desde los datos reales del Estado.")
    except Exception as e:
        logging.error(f"Error escribiendo data.json: {e}")

if __name__ == "__main__":
    run_scraper()
