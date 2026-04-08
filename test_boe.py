import requests
from bs4 import BeautifulSoup

def test_scrape():
    s = requests.Session()
    # Peticion GET para obtener cookies reales
    s.get("https://subastas.boe.es/")
    
    # Peticion GET con query string
    url = "https://subastas.boe.es/subastas_ava.php?accion=Buscar&id_provincia=21&id_bien=1&origen_busq=ava"
    r = s.get(url)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    resultados = soup.find_all('li')
    print("Found total li tags:", len(resultados))
    for res in resultados[:10]:
        print("Class:", res.get('class'), "Text:", res.text.strip()[:40].replace('\n', ' '))
        a = res.find('a', class_='resultado-busqueda-link-defecto')
        print(a['href'] if a else "No link")
        print(res.text.strip()[:100].replace('\n', ' '))

test_scrape()
