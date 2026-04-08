import requests
from bs4 import BeautifulSoup

url = "https://subastas.boe.es/subastas_ava.php?accion=Buscar"
payload = {
    'id_bien': '1', 
    'id_provincia': '21',
    'busq_ava': '1'
}
headers = {'User-Agent': 'Mozilla/5.0'}
session = requests.Session()
response = session.post(url, data=payload, headers=headers)
print(response.status_code)

soup = BeautifulSoup(response.text, 'html.parser')
res = soup.find_all('li')
for r in res[:5]:
    print(r.get('class'), r.text[:50])

with open("boe_debug.html", "w", encoding="utf-8") as f:
    f.write(response.text)
