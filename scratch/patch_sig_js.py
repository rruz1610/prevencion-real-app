import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r'(// 5\. Cierre Data.*?)(\s+// 6\. Planes de Accion)',
    re.DOTALL
)

replacement = """// 5. Cierre Data
    if (d && (d.estado === 'Finalizada' || (d.estado && d.estado.toLowerCase() === 'planes aprobados') || d.estado_cierre === 'Cerrado' || document.getElementById('firma_coord_rut')?.value)) {
        document.getElementById('pdf-cierre-box').style.display = 'block';
        document.getElementById('pdf-cierre-comentarios').innerText = "Cierre validado digitalmente por sistema.";
        
        let complDate = "";
        if (d && d.estado && d.estado.toLowerCase() === 'planes aprobados') {
            complDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
            document.getElementById('pdf-cierre-compromisos').innerText = `Planes de acción aprobados.`;
            document.getElementById('pdf-fecha-firma-prev').innerText = complDate;
            document.getElementById('pdf-fecha-firma-obra').innerText = complDate;
        } else {
            document.getElementById('pdf-cierre-compromisos').innerText = "Revisar anexo de planes de acción (si aplica).";
            document.getElementById('pdf-fecha-firma-prev').innerText = "";
            document.getElementById('pdf-fecha-firma-obra').innerText = "";
        }
        
        document.getElementById('pdf-firma-prev').innerText = prevNombre;
        document.getElementById('pdf-firma-obra').innerText = "Representante Obra";
    } else {
        document.getElementById('pdf-cierre-box').style.display = 'none';
        document.getElementById('pdf-fecha-firma-prev').innerText = "";
        document.getElementById('pdf-fecha-firma-obra').innerText = "";
        document.getElementById('pdf-firma-prev').innerText = prevNombre;
        document.getElementById('pdf-firma-obra').innerText = 'Representante Obra';
    }"""

if pattern.search(content):
    content = re.sub(pattern, replacement + r'\2', content)
    print("Replaced closure logic in generarReportePDF for signatures")
else:
    print("Pattern not found for closure logic")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
