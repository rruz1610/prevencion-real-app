import re

with open("c:/Users/rruz8/Desktop/prevencion-real/main.py", "r", encoding="utf-8") as f:
    content = f.read()

pdf_logic = """
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io
import os

@app.get("/api/auditorias/descargar_pdf/{audit_id}")
def descargar_pdf(audit_id: str):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []
    styles = getSampleStyleSheet()
    
    # Intentar cargar logo
    logo_path = os.path.join("static", "logo_empresa.png")
    if os.path.exists(logo_path):
        img = Image(logo_path, width=100, height=50)
        elements.append(img)
        elements.append(Spacer(1, 10))
        
    elements.append(Paragraph(f"<b>PLANILLA AUDITORIA SST</b> - ID: {audit_id}", styles['Title']))
    elements.append(Spacer(1, 20))
    
    all_dfs = pd.read_excel(RESPUESTAS_EXCEL, sheet_name=None, keep_default_na=False)
    if "Auditorias" not in all_dfs:
        raise HTTPException(404, "No hay auditorias")
    df_aud = all_dfs["Auditorias"]
    idx = df_aud[df_aud["id"] == audit_id].index
    if len(idx) == 0:
        raise HTTPException(404, "Auditoria no encontrada")
        
    aud_data = df_aud.loc[idx[0]]
    
    # Encabezados
    header_data = [
        ["Obra/Proyecto:", str(aud_data.get("obra_id", "")), "Fecha Auditoría:", str(aud_data.get("fecha", ""))],
        ["Prevencionista:", str(aud_data.get("prevencionista_id", "")), "Estado:", str(aud_data.get("estado", ""))]
    ]
    t_header = Table(header_data, colWidths=[100, 250, 100, 250])
    t_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('BACKGROUND', (2, 0), (2, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 20))
    
    # Tabla de Respuestas
    data = [["ID Preg", "Respuesta", "Comentario / Observación", "Plan de Acción (Si No Cumple)", "Fecha Plan"]]
    
    df_resp = all_dfs.get("Respuestas", pd.DataFrame())
    df_resp_filt = df_resp[df_resp["auditoria_id"] == audit_id]
    
    df_planes = all_dfs.get("PlanesAccion", pd.DataFrame())
    if not df_planes.empty:
        df_planes_filt = df_planes[df_planes["auditoria_id"] == audit_id]
    else:
        df_planes_filt = pd.DataFrame()
        
    for _, row in df_resp_filt.iterrows():
        p_id = row["pregunta_id"]
        plan_text = ""
        fecha_plan = ""
        if not df_planes_filt.empty:
            p_row = df_planes_filt[df_planes_filt["pregunta_id"] == p_id]
            if not p_row.empty:
                plan_text = str(p_row.iloc[0]["plan_texto"])
                fecha_plan = str(p_row.iloc[0]["fecha_cumplimiento"])
                
        data.append([
            str(p_id),
            str(row["respuesta"]),
            Paragraph(str(row.get("comentario", "")), styles['Normal']),
            Paragraph(plan_text, styles['Normal']),
            fecha_plan
        ])
        
    t_resp = Table(data, colWidths=[50, 80, 250, 250, 100])
    t_resp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2C3E50")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(t_resp)
    
    elements.append(Spacer(1, 40))
    
    # Firmas
    f_aprobacion = str(aud_data.get("fecha_aprobacion", ""))
    f_cierre_planes = str(aud_data.get("fecha_cierre_planes", ""))
    
    firmas_data = [
        ["Firma Coordinador / Gerente", "Firma Prevencionista", "Aprobación Administrador (Planes)"],
        ["Firmado digitalmente", "Firmado digitalmente", "Firmado con Token (Admin)"],
        [f"Fecha: {f_aprobacion}", f"Fecha: {f_aprobacion}", f"Fecha: {f_cierre_planes}"]
    ]
    t_firmas = Table(firmas_data, colWidths=[240, 240, 240])
    t_firmas.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.black),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
    ]))
    elements.append(t_firmas)

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Auditoria_{audit_id}.pdf"})
"""

# Eliminar dummy anterior 
content = re.sub(r'@app.get\("/api/auditorias/descargar_pdf/\{audit_id\}"\).*?return StreamingResponse.*?pdf"\}\)', '', content, flags=re.DOTALL)

# Insertar el nuevo al final
content = content.replace('if __name__ == "__main__":', pdf_logic + '\n\nif __name__ == "__main__":')

with open("c:/Users/rruz8/Desktop/prevencion-real/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated main.py with Reportlab PDF")
