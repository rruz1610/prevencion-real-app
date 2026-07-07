import re
import os

path = r'c:\Users\rruz8\Desktop\prevencion-real\main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add BackgroundTasks to imports
if 'from fastapi import BackgroundTasks' not in content:
    content = content.replace('from fastapi import FastAPI, HTTPException, File, UploadFile, Form', 
                              'from fastapi import FastAPI, HTTPException, File, UploadFile, Form, BackgroundTasks')

# 2. Modify endpoints to accept background_tasks: BackgroundTasks
# For /api/auditorias/cierre/{auditoria_id}
content = re.sub(
    r'(@app\.post\("/api/auditorias/cierre/\{auditoria_id\}"\)\s*def [^\(]+\(auditoria_id: str,.*?)(?=:\s)',
    r'\1, background_tasks: BackgroundTasks',
    content,
    flags=re.DOTALL
)

# Replace enviar_correo_real call inside cierre with background_tasks.add_task
content = re.sub(
    r'(enviar_correo_real\("cierre",\s*auditoria_id,\s*\["Administrador de Obra",\s*"Prevencionista de Terreno",\s*"Coordinador de Prevencion",\s*"Gerente de Prevencion"\](?:,\s*pdf_bytes=pdf_bytes,\s*pdf_filename=pdf_filename)?\))',
    r'background_tasks.add_task(enviar_correo_real, "cierre", auditoria_id, ["Administrador de Obra", "Prevencionista de Terreno", "Coordinador de Prevencion", "Gerente de Prevencion"], pdf_bytes=pdf_bytes, pdf_filename=pdf_filename)',
    content
)


# For /api/planes-accion/aprobar
content = re.sub(
    r'(async def aprobar_planes\(.*?)(pdf_file: UploadFile = File\(None\)\)):',
    r'\1\2, background_tasks: BackgroundTasks = None):',
    content
)

# Wait, we need to handle the fact that BackgroundTasks is injected by FastAPI if it is in the signature.
# Since it's an async function, we can do `background_tasks: BackgroundTasks`
content = re.sub(
    r'(async def aprobar_planes\(.*?)(pdf_file: UploadFile = File\(None\)\))(.*?):',
    r'\1\2, background_tasks: BackgroundTasks',
    content,
    flags=re.DOTALL
)
# Note: actually it's easier to just use string replace for the signature
sig_old = 'async def aprobar_planes(aud_id: str, token_admin: str = Form(...), prevencionista_id: str = Form(...), prevencionista_clave: str = Form(...), pdf_file: UploadFile = File(None)):'
sig_new = 'async def aprobar_planes(aud_id: str, token_admin: str = Form(...), prevencionista_id: str = Form(...), prevencionista_clave: str = Form(...), pdf_file: UploadFile = File(None), background_tasks: BackgroundTasks = None):'
content = content.replace(sig_old, sig_new)

content = content.replace(
    'enviar_correo_real("informativo_gerencia", aud_id, ["Gerente de Prevencion"], texto_correo=f"Se han comprometido planes de accion para la auditoria {aud_id}.\\n\\nObservaciones:\\n{obs_str}\\n\\nEl administrador ha validado con su token.")',
    'if background_tasks:\n                background_tasks.add_task(enviar_correo_real, "informativo_gerencia", aud_id, ["Gerente de Prevencion"], texto_correo=f"Se han comprometido planes de accion para la auditoria {aud_id}.\\n\\nObservaciones:\\n{obs_str}\\n\\nEl administrador ha validado con su token.")\n            else:\n                enviar_correo_real("informativo_gerencia", aud_id, ["Gerente de Prevencion"], texto_correo=f"Se han comprometido planes de accion para la auditoria {aud_id}.\\n\\nObservaciones:\\n{obs_str}\\n\\nEl administrador ha validado con su token.")'
)


# Also there might be other enviar_correo_real that cause slowness.
# Specifically /api/planes-accion (POST) which creates planes and sends token
sig_old_planes = 'def create_planes(data: PlanesCreate):'
sig_new_planes = 'def create_planes(data: PlanesCreate, background_tasks: BackgroundTasks):'
content = content.replace(sig_old_planes, sig_new_planes)

content = content.replace(
    'enviar_correo_real("sistema", data.auditoria_id, ["Administrador de Obra"], subject=f"Token para Aprobar Planes - Auditoria {data.auditoria_id}", mensaje=mensaje)',
    'background_tasks.add_task(enviar_correo_real, "sistema", data.auditoria_id, ["Administrador de Obra"], subject=f"Token para Aprobar Planes - Auditoria {data.auditoria_id}", mensaje=mensaje)'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Backend updated.")
