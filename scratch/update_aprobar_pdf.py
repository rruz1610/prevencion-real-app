import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r'(// Generar PDF primero y luego mandarlo al backend\s*const element = document\.createElement.*?html2pdf\(\)\.set\(\{.*?\}\)\.from\(element\)\.outputPdf\(\'blob\'\)\.then\(async function\(pdfBlob\) \{)',
    re.DOTALL
)

replacement = """// Generar PDF primero y luego mandarlo al backend utilizando la nueva plantilla
    generarReportePDF('blob_with_planes', aud_id, async function(pdfBlob) {"""

if pattern.search(content):
    content = re.sub(pattern, replacement, content)
    print("Replaced PDF logic in aprobarPlanesAccionDefinitivo")
else:
    print("Pattern not found!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

