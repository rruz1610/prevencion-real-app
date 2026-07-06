import re

with open("c:/Users/rruz8/Desktop/prevencion-real/main.py", "r", encoding="utf-8") as f:
    content = f.read()

planes_endpoints = """
# === PLANES DE ACCION ===
@app.get("/api/auditorias/planes_accion")
def get_planes_accion_pendientes(empresa_id: str = None, obra_id: str = None, prevencionista_id: str = None):
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    if "Auditorias" not in all_dfs or "Respuestas" not in all_dfs:
        return []
    
    df_aud = all_dfs["Auditorias"]
    df_resp = all_dfs["Respuestas"]
    
    # Filtrar auditorias cerradas esperando planes
    df_aud_planes = df_aud[df_aud["estado"] == "Cerrada - Esperando Planes"]
    if empresa_id:
        pass # To do: join with obras to filter by empresa_id if needed
    if obra_id:
        df_aud_planes = df_aud_planes[df_aud_planes["obra_id"] == int(obra_id)]
    if prevencionista_id:
        df_aud_planes = df_aud_planes[df_aud_planes["prevencionista_id"] == prevencionista_id]
        
    aud_ids = df_aud_planes["id"].tolist()
    if not aud_ids: return []
    
    # Filtrar respuestas que sean 'No Cumple'
    df_resp_nc = df_resp[(df_resp["auditoria_id"].isin(aud_ids)) & (df_resp["respuesta"] == "No Cumple")]
    
    # Check if Planes sheet exists
    if "PlanesAccion" in all_dfs:
        df_planes = all_dfs["PlanesAccion"]
    else:
        df_planes = pd.DataFrame(columns=["auditoria_id", "pregunta_id", "plan_texto", "fecha_cumplimiento"])
        
    results = []
    for _, row in df_resp_nc.iterrows():
        a_id = row["auditoria_id"]
        p_id = row["pregunta_id"]
        
        # Check if plan already exists
        plan_row = df_planes[(df_planes["auditoria_id"] == a_id) & (df_planes["pregunta_id"] == p_id)]
        
        results.append({
            "auditoria_id": a_id,
            "pregunta_id": p_id,
            "comentario_original": row.get("comentario", ""),
            "plan_texto": plan_row.iloc[0]["plan_texto"] if not plan_row.empty else "",
            "fecha_cumplimiento": plan_row.iloc[0]["fecha_cumplimiento"] if not plan_row.empty else ""
        })
        
    return results

class PlanItem(BaseModel):
    auditoria_id: str
    pregunta_id: int
    plan_texto: str
    fecha_cumplimiento: str

class PlanesSubmit(BaseModel):
    planes: list[PlanItem]

@app.post("/api/auditorias/guardar_planes")
def guardar_planes(data: PlanesSubmit):
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    if "PlanesAccion" in all_dfs:
        df_planes = all_dfs["PlanesAccion"]
    else:
        df_planes = pd.DataFrame(columns=["auditoria_id", "pregunta_id", "plan_texto", "fecha_cumplimiento"])
        
    for plan in data.planes:
        # Remover plan previo si existe
        df_planes = df_planes[~((df_planes["auditoria_id"] == plan.auditoria_id) & (df_planes["pregunta_id"] == plan.pregunta_id))]
        
        nuevo = pd.DataFrame([{
            "auditoria_id": plan.auditoria_id,
            "pregunta_id": plan.pregunta_id,
            "plan_texto": plan.plan_texto,
            "fecha_cumplimiento": plan.fecha_cumplimiento
        }])
        df_planes = pd.concat([df_planes, nuevo], ignore_index=True)
        
    all_dfs["PlanesAccion"] = df_planes
    with pd.ExcelWriter(RESPUESTAS_EXCEL) as writer:
        for s_name, s_df in all_dfs.items():
            s_df.to_excel(writer, sheet_name=s_name, index=False)
            
    # Trigger token email to Admin
    aud_id = data.planes[0].auditoria_id if data.planes else None
    if aud_id:
        df_aud = all_dfs["Auditorias"]
        idx = df_aud[df_aud["id"] == aud_id].index
        if len(idx) > 0:
            import random
            token = str(random.randint(100000, 999999))
            df_aud.loc[idx, "token_admin"] = token
            all_dfs["Auditorias"] = df_aud
            with pd.ExcelWriter(RESPUESTAS_EXCEL) as writer:
                for s_name, s_df in all_dfs.items():
                    s_df.to_excel(writer, sheet_name=s_name, index=False)
            # Enviar correo real al admin omitido por simplicidad, simulado con print
            print(f"Token para Admin {token} guardado para auditoria {aud_id}")
            
    return {"status": "success"}

class PlanesAprobar(BaseModel):
    token_admin: str
    prevencionista_id: str
    prevencionista_clave: str

@app.post("/api/auditorias/{auditoria_id}/aprobar_planes")
def aprobar_planes(auditoria_id: str, data: PlanesAprobar):
    df_usuarios = _sql_read("MANT_", "Usuarios")
    prev = df_usuarios[(df_usuarios["rut"] == data.prevencionista_id) & (df_usuarios["clave"] == data.prevencionista_clave)]
    if prev.empty:
        raise HTTPException(status_code=400, detail="Clave de prevencionista incorrecta")
        
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    df_aud = all_dfs["Auditorias"]
    idx = df_aud[df_aud["id"] == auditoria_id].index
    if len(idx) == 0:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
        
    saved_token = str(df_aud.loc[idx[0], "token_admin"]).strip()
    if data.token_admin.strip() != saved_token:
        raise HTTPException(status_code=400, detail="Token de Administrador incorrecto")
        
    df_aud.loc[idx, "estado"] = "Completada"
    df_aud.loc[idx, "fecha_cierre_planes"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    all_dfs["Auditorias"] = df_aud
    with pd.ExcelWriter(RESPUESTAS_EXCEL) as writer:
        for s_name, s_df in all_dfs.items():
            s_df.to_excel(writer, sheet_name=s_name, index=False)
            
    return {"status": "success"}
"""

content = content.replace('if __name__ == "__main__":', planes_endpoints + '\n\nif __name__ == "__main__":')

with open("c:/Users/rruz8/Desktop/prevencion-real/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated main.py with planes endpoints")
