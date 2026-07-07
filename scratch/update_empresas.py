import re

# Update main.py
path_main = r'c:\Users\rruz8\Desktop\prevencion-real\main.py'
with open(path_main, 'r', encoding='utf-8') as f:
    content = f.read()

# create_empresa endpoint
sig_create_old = r'(@app\.post\("/api/empresas"\)\s*async def create_empresa\(\s*rut: str = Form\(\.\.\.\),\s*nombre: str = Form\(\.\.\.\),\s*fecha_inicio: str = Form\(""\),\s*fecha_fin: str = Form\(""\),\s*correo_emisor: str = Form\(""\),\s*contrasena_app: str = Form\(""\),\s*logo: UploadFile = File\(None\)\s*\):)'
sig_create_new = r'@app.post("/api/empresas")\nasync def create_empresa(\n    rut: str = Form(...),\n    nombre: str = Form(...),\n    fecha_inicio: str = Form(""),\n    fecha_fin: str = Form(""),\n    correo_emisor: str = Form(""),\n    contrasena_app: str = Form(""),\n    anio_inicio: str = Form(""),\n    logo: UploadFile = File(None)\n):'
content = re.sub(sig_create_old, sig_create_new, content)

payload_create_old = r'("contrasena_app": contrasena_app,\n\s*"logo_url": logo_path)'
payload_create_new = r'\1,\n        "anio_inicio": anio_inicio'
content = re.sub(payload_create_old, payload_create_new, content)

# update_empresa endpoint
sig_update_old = r'(@app\.put\("/api/empresas/\{empresa_id\}"\)\s*async def update_empresa\(\s*empresa_id: str,\s*rut: str = Form\(\.\.\.\),\s*nombre: str = Form\(\.\.\.\),\s*fecha_inicio: str = Form\(""\),\s*fecha_fin: str = Form\(""\),\s*estado: str = Form\(""\),\s*correo_emisor: str = Form\(""\),\s*contrasena_app: str = Form\(""\),\s*logo: UploadFile = File\(None\)\s*\):)'
sig_update_new = r'@app.put("/api/empresas/{empresa_id}")\nasync def update_empresa(\n    empresa_id: str,\n    rut: str = Form(...),\n    nombre: str = Form(...),\n    fecha_inicio: str = Form(""),\n    fecha_fin: str = Form(""),\n    estado: str = Form(""),\n    correo_emisor: str = Form(""),\n    contrasena_app: str = Form(""),\n    anio_inicio: str = Form(""),\n    logo: UploadFile = File(None)\n):'
content = re.sub(sig_update_old, sig_update_new, content)

payload_update_old = r'(df\.loc\[idx\[0\], "correo_emisor"\] = correo_emisor\n\s*df\.loc\[idx\[0\], "contrasena_app"\] = contrasena_app)'
payload_update_new = r'\1\n        if "anio_inicio" not in df.columns:\n            df["anio_inicio"] = ""\n        df.loc[idx[0], "anio_inicio"] = anio_inicio'
content = re.sub(payload_update_old, payload_update_new, content)

with open(path_main, 'w', encoding='utf-8') as f:
    f.write(content)


# Update app.js
path_app = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path_app, 'r', encoding='utf-8') as f:
    content_app = f.read()

# Modal add input for anio_inicio
# In index.html this already exists: <input type="number" id="empresa_anio_inicio" name="anio_inicio" placeholder="Ej: 2024">
# We just need to add it to formData in saveEmpresa
save_empresa_old = r'(formData\.append\(\'correo_emisor\', document\.getElementById\(\'empresa_correo_emisor\'\)\.value\);\n\s*formData\.append\(\'contrasena_app\', document\.getElementById\(\'empresa_contrasena_app\'\)\.value\);)'
save_empresa_new = r'\1\n    const anioInicioInput = document.getElementById(\'empresa_anio_inicio\');\n    if(anioInicioInput) formData.append(\'anio_inicio\', anioInicioInput.value);'
content_app = re.sub(save_empresa_old, save_empresa_new, content_app)

with open(path_app, 'w', encoding='utf-8') as f:
    f.write(content_app)

print("Updated create and update empresa for anio_inicio.")
