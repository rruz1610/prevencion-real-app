import re

with open("c:/Users/rruz8/Desktop/prevencion-real/main.py", "r", encoding="utf-8") as f:
    content = f.read()

new_code = """
# === NUEVO FLUJO DE AUDITORÍA ===

class AuditoriaIniciar(BaseModel):
    plantilla_id: str
    obra_id: str
    prevencionista_id: str
    jefe_obra_id: str
    auditor_tipo: str
    auditor_id: str
    
@app.post("/api/auditorias/iniciar")
def iniciar_auditoria(data: AuditoriaIniciar):
    init_respuestas_excel()
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    df_aud = all_dfs["Auditorias"]
    
    new_aud_id = f"AUD-{int(datetime.now().timestamp())}"
    
    # Asegurar columnas nuevas
    for col in ["estado", "fecha_aprobacion", "fecha_cierre_planes", "token_admin"]:
        if col not in df_aud.columns:
            df_aud[col] = ""
            
    nueva_aud = pd.DataFrame([{
        "id": new_aud_id,
        "plantilla_id": data.plantilla_id,
        "obra_id": data.obra_id,
        "prevencionista_id": data.prevencionista_id,
        "jefe_obra_id": data.jefe_obra_id,
        "auditor_tipo": data.auditor_tipo,
        "auditor_id": data.auditor_id,
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "fecha_inicio": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "fecha_fin": "",
        "comentarios": "",
        "compromisos": "",
        "estado": "En Progreso",
        "fecha_aprobacion": "",
        "fecha_cierre_planes": "",
        "token_admin": ""
    }])
    
    all_dfs["Auditorias"] = pd.concat([df_aud, nueva_aud], ignore_index=True)
    with pd.ExcelWriter(RESPUESTAS_EXCEL) as writer:
        for s_name, s_df in all_dfs.items():
            s_df.to_excel(writer, sheet_name=s_name, index=False)
            
    return {"status": "success", "id": new_aud_id}


class AuditoriaParcial(BaseModel):
    respuestas: list[dict]
    
@app.put("/api/auditorias/{auditoria_id}/guardar_parcial")
def guardar_parcial(auditoria_id: str, data: AuditoriaParcial):
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    df_resp = all_dfs["Respuestas"]
    
    # Remover respuestas anteriores para las mismas preguntas actualizadas
    q_ids = [r["pregunta_id"] for r in data.respuestas]
    df_resp = df_resp[~((df_resp["auditoria_id"] == auditoria_id) & (df_resp["pregunta_id"].isin(q_ids)))]
    
    nuevas_resp = pd.DataFrame([{
        "auditoria_id": auditoria_id,
        "pregunta_id": r["pregunta_id"],
        "respuesta": r.get("respuesta", ""),
        "comentario": r.get("comentario", ""),
        "foto": r.get("foto", "")
    } for r in data.respuestas])
    
    all_dfs["Respuestas"] = pd.concat([df_resp, nuevas_resp], ignore_index=True)
    
    with pd.ExcelWriter(RESPUESTAS_EXCEL) as writer:
        for s_name, s_df in all_dfs.items():
            s_df.to_excel(writer, sheet_name=s_name, index=False)
            
    return {"status": "success"}

class AuditoriaAprobar(BaseModel):
    coordinador_id: str
    coordinador_clave: str
    prevencionista_id: str
    prevencionista_clave: str

@app.post("/api/auditorias/{auditoria_id}/aprobar_cierre")
def aprobar_cierre_auditoria(auditoria_id: str, data: AuditoriaAprobar):
    # Validar claves
    df_usuarios = _sql_read("MANT_", "Usuarios")
    
    coord = df_usuarios[(df_usuarios["rut"] == data.coordinador_id) & (df_usuarios["clave"] == data.coordinador_clave)]
    if coord.empty:
        raise HTTPException(status_code=400, detail="Clave de coordinador incorrecta")
        
    prev = df_usuarios[(df_usuarios["rut"] == data.prevencionista_id) & (df_usuarios["clave"] == data.prevencionista_clave)]
    if prev.empty:
        raise HTTPException(status_code=400, detail="Clave de prevencionista incorrecta")
        
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    df_aud = all_dfs["Auditorias"]
    idx = df_aud[df_aud["id"] == auditoria_id].index
    if len(idx) == 0:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
        
    df_aud.loc[idx, "estado"] = "Cerrada - Esperando Planes"
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    df_aud.loc[idx, "fecha_aprobacion"] = fecha
    
    # Generar token para administrador
    import random
    token = str(random.randint(100000, 999999))
    df_aud.loc[idx, "token_admin"] = token
    
    all_dfs["Auditorias"] = df_aud
    with pd.ExcelWriter(RESPUESTAS_EXCEL) as writer:
        for s_name, s_df in all_dfs.items():
            s_df.to_excel(writer, sheet_name=s_name, index=False)
            
    # Aquí se enviaría el correo (simplificado por ahora)
    # email logic can be called using _enviar_correo_individual
    
    return {"status": "success", "fecha_aprobacion": fecha}

# Modificar el generar_pdf real
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

@app.get("/api/auditorias/descargar_pdf/{audit_id}")
def descargar_pdf(audit_id: str):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, f"Reporte de Auditoría: {audit_id}")
    c.drawString(100, 730, "Generado por Sistema de Prevención")
    # To do: add more details fetching from DB
    c.save()
    
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=auditoria_{audit_id}.pdf"})

"""

content = content.replace('if __name__ == "__main__":', new_code + '\n\nif __name__ == "__main__":')

with open("c:/Users/rruz8/Desktop/prevencion-real/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated main.py")
