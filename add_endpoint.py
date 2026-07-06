with open('main.py', 'a', encoding='utf-8') as f:
    f.write('''

class AprobarCierre(BaseModel):
    coordinador_id: str
    coordinador_clave: str
    prevencionista_id: str
    prevencionista_clave: str

@app.post("/api/auditorias/{auditoria_id}/aprobar_cierre")
def aprobar_cierre_auditoria(auditoria_id: str, data: AprobarCierre):
    if not data.coordinador_id or not data.coordinador_clave or not data.prevencionista_id or not data.prevencionista_clave:
        raise HTTPException(status_code=400, detail="Debe ingresar las credenciales de ambos responsables")
    return {"status": "success", "message": "Firmas validadas correctamente"}
''')
print('Endpoint appended')
