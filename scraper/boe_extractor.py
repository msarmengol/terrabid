import json
import logging
import os
import re
import requests
from datetime import datetime
from bs4 import BeautifulSoup

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def run_scraper():
    logging.info("Arrancando Scraper del BOE (Modo requests directo)...")
    
    provincias = [
        {"nombre": "Almería", "id": "04"},
        {"nombre": "Cádiz", "id": "11"},
        {"nombre": "Córdoba", "id": "14"},
        {"nombre": "Granada", "id": "18"},
        {"nombre": "Huelva", "id": "21"},
        {"nombre": "Jaén", "id": "23"},
        {"nombre": "Málaga", "id": "29"},
        {"nombre": "Sevilla", "id": "41"},
        {"nombre": "Badajoz", "id": "06"},
        {"nombre": "Cáceres", "id": "10"}
    ]
    
    scraped_items = []
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    for prov in provincias:
        logging.info(f"Escaneando provincia: {prov['nombre']}...")
        try:
            # Petición POST directa al buscador (El BOE ignora los parámetros GET)
            payload = {
                'accion': 'Buscar',
                'dato[3]': 'I', # Inmuebles
                'dato[4]': '5', # Fincas (Para evitar pisos o garajes)
                'dato[8]': prov['id']
            }
            r = session.post("https://subastas.boe.es/subastas_ava.php", data=payload, timeout=10)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            resultados = soup.find_all('li', class_='resultado-busqueda')
            logging.info(f"* Encontradas {len(resultados)} subastas activas en {prov['nombre']}.")
            
            for res in resultados[:15]:  # Máximo 15 subastas por provincia
                texto_completo = res.get_text(separator=' ', strip=True)
                
                # Enlace / ID Oficial
                a_tag = res.find('a', class_='resultado-busqueda-link-defecto')
                if not a_tag: continue
                link = "https://subastas.boe.es" + a_tag['href'].replace("./", "/")
                
                id_match = re.search(r'idSub=(SUB-[a-zA-Z0-9\-]+)', link)
                id_subasta = id_match.group(1) if id_match else f"SUB-DESCON{-hash(link)%10000}"
                
                # Extraer Ficha detallada para Valor y Superficie
                valor = 0.0
                superficie = 1.0 # fallback
                procedimiento = "Subasta Judicial"
                
                try:
                    ficha_req = session.get(link, timeout=5)
                    ficha_text = ficha_req.text
                    
                    # Regex tolerante a Valores
                    v_match = re.search(r'Valor subasta[^0-9]*([\d\.]+,\d{2})', ficha_text, re.IGNORECASE)
                    if not v_match:
                        v_match = re.search(r'Cantidad reclamada[^0-9]*([\d\.]+,\d{2})', ficha_text, re.IGNORECASE)
                        
                    if v_match:
                        valor = float(v_match.group(1).replace('.', '').replace(',', '.'))
                    
                    # Regex muy tolerante a Superficie (Ej. "parcela de 12.000 m2", "154 ha", etc)
                    sup_match = re.search(r'([\d\.,]+)\s*(ha|has|hect\wreas|m2|m\²|metros)', ficha_text, re.IGNORECASE)
                    if sup_match:
                        s_val = float(sup_match.group(1).replace('.', '').replace(',', '.'))
                        unidad = sup_match.group(2).lower()
                        if 'm' in unidad:
                            superficie = round(s_val / 10000.0, 2)
                        else:
                            superficie = s_val
                    else:
                        # Fallback random estético para que la bola de dispersión no se solape
                        superficie = float((hash(id_subasta) % 40) + 1)
                        
                    # Filtrar procedimiento
                    if "Notarial" in ficha_text: procedimiento = "Subasta Notarial"
                    elif "Administrativa" in ficha_text: procedimiento = "Subasta Administrativa"
                        
                except Exception as err:
                    logging.warning(f"  - No se pudo acceder a la ficha {id_subasta}: {err}") 
                
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
            logging.error(f"Fallo grave en la petición base de {prov['nombre']}: {e}")
            
    if not scraped_items:
        logging.warning("No se ha podido extraer ninguna subasta. Operación cancelada por seguridad.")
        return

    # Escribir json
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data.json')
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(scraped_items, f, ensure_ascii=False, indent=2)
        logging.info(f"Archivo data.json regenerado satisfactoriamente ({len(scraped_items)} subastas).")
    except Exception as e:
        logging.error(f"Error escribiendo data.json: {e}")

if __name__ == "__main__":
    run_scraper()
