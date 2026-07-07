import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the first part of generarReportePDF
pattern = re.compile(
    r'(function generarReportePDF\(mode = \'download\', aud_id = null, cb = null\) \{.*?)(\n    // 2\. Gather Data from DOM)',
    re.DOTALL
)

replacement = """function generarReportePDF(mode = 'download', aud_id = null, cb = null) {
    // 1. Gather Metadata
    const obraSelect = document.getElementById('audit_obra_id');
    const prevSelect = document.getElementById('audit_prevencionista_id');
    const plantillaSelect = document.getElementById('audit_plantilla_id');
    
    let obraNombre = '-';
    let prevNombre = '-';
    let plantillaNombre = '-';
    
    const d = window.currentAuditData;
    if (d && (aud_id === null || aud_id === d.id)) {
        // Try to get names from selects using IDs from backend
        if(obraSelect && d.obra_id) {
            const opt = Array.from(obraSelect.options).find(o => String(o.value) === String(d.obra_id));
            obraNombre = opt ? opt.text : d.obra_id;
        }
        if(prevSelect && d.prevencionista_id) {
            const opt = Array.from(prevSelect.options).find(o => String(o.value) === String(d.prevencionista_id));
            prevNombre = opt ? opt.text : d.prevencionista_id;
        }
        if(plantillaSelect && d.plantilla_id) {
            const opt = Array.from(plantillaSelect.options).find(o => String(o.value) === String(d.plantilla_id));
            plantillaNombre = opt ? opt.text : d.plantilla_id;
        }
    } else {
        obraNombre = obraSelect?.options[obraSelect.selectedIndex]?.text || '-';
        prevNombre = prevSelect?.options[prevSelect.selectedIndex]?.text || '-';
        plantillaNombre = plantillaSelect?.options[plantillaSelect.selectedIndex]?.text || '-';
    }
    
    document.getElementById('pdf-auditoria-ref').innerText = `Ref: AUD-${aud_id || window.currentAuditoriaId || 'N/A'}`;
    document.getElementById('pdf-meta-obra').innerText = obraNombre;
    document.getElementById('pdf-meta-plantilla').innerText = plantillaNombre;
    document.getElementById('pdf-meta-prevencionista').innerText = prevNombre;
    
    // Si viene de Planes Aprobados, mostrar la fecha actual como fecha de reporte o la fecha de la auditoria
    document.getElementById('pdf-meta-fecha').innerText = (d && d.date) ? d.date : new Date().toISOString().replace('T', ' ').substring(0, 19);"""

if pattern.search(content):
    content = re.sub(pattern, replacement, content)
    print("Replaced metadata logic in generarReportePDF")
else:
    print("Pattern not found for metadata logic")

# Now I will replace the signatures section (Cierre Data)
pattern2 = re.compile(
    r'(// 5\. Cierre Data.*?)(// 6\. Planes de Accion)',
    re.DOTALL
)

replacement2 = """// 5. Cierre Data
    if (d && (d.estado === 'Finalizada' || (d.estado && d.estado.toLowerCase() === 'planes aprobados') || d.estado_cierre === 'Cerrado' || document.getElementById('firma_coord_rut')?.value)) {
        document.getElementById('pdf-cierre-box').style.display = 'block';
        document.getElementById('pdf-cierre-comentarios').innerText = "Cierre validado digitalmente por sistema.";
        
        let complDate = "-";
        if (d && d.estado && d.estado.toLowerCase() === 'planes aprobados') {
            complDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
            document.getElementById('pdf-cierre-compromisos').innerText = `Planes de acción aprobados el ${complDate}`;
        } else {
            document.getElementById('pdf-cierre-compromisos').innerText = "Revisar anexo de planes de acción (si aplica).";
        }
        
        document.getElementById('pdf-firma-prev').innerText = prevNombre;
        document.getElementById('pdf-firma-obra').innerText = "Representante Obra";
    } else {
        document.getElementById('pdf-cierre-box').style.display = 'none';
        document.getElementById('pdf-firma-prev').innerText = prevNombre;
        document.getElementById('pdf-firma-obra').innerText = 'Representante Obra';
    }

    """

if pattern2.search(content):
    content = re.sub(pattern2, replacement2, content)
    print("Replaced closure logic in generarReportePDF")
else:
    print("Pattern not found for closure logic")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

