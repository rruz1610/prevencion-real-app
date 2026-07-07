import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'function exportarResumenAnualExcel\(\) \{.*?\n\}', re.DOTALL)
new_export = """function exportarResumenAnualExcel() {
    if (typeof XLSX === 'undefined') {
        alert("La librería para exportar a Excel no está cargada.");
        return;
    }
    const wb = XLSX.utils.book_new();
    let data = [["Período", "Mes-Año", "Trabajadores", "Días Perdidos"]];
    
    const extractToData = (id, yearLabel) => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if(cols.length === 3) {
                const mes = cols[0].innerText;
                if(mes === '-' || mes.includes('Sin datos')) return;
                data.push([yearLabel, mes, cols[1].innerText, cols[2].innerText]);
            }
        });
    };
    
    extractToData('tabla-resumen-anio1', 'Año 1 (Jul 2024 - Jun 2025)');
    data.push(["", "", "", ""]); // Fila vacía de separación
    extractToData('tabla-resumen-anio2', 'Año 2 (Jul 2025 - Jun 2026)');
    data.push(["", "", "", ""]);
    extractToData('tabla-resumen-anio3', 'Año 3 (Jul 2026 - Jun 2027)');
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Anual");
    XLSX.writeFile(wb, "Resumen_Anual_Reportabilidad.xlsx");
}"""

if re.search(pattern, content):
    content = re.sub(pattern, new_export, content)
else:
    print("Warning: exportarResumenAnualExcel not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated exportarResumenAnualExcel for single sheet export.")
