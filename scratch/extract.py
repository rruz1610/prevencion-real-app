import re

with open(r'c:\Users\rruz8\Desktop\prevencion-real\main.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'@app\.(post|put|get)\(\"/api/(?:auditorias/[^/]+/cierre|planes-accion/aprobar|login)\"\)[\s\S]+?(?=@app)', re.IGNORECASE)
matches = pattern.finditer(content)
for m in matches:
    print(m.group(0))
