import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Dashboard cache busting
content = re.sub(
    r'(const data = await fetchAPI\(url\);)',
    r'const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;\n    \1'.replace('url', 'cacheUrl'),
    content
)

# Also apply cache busting to chart endpoints in dashboard
content = re.sub(
    r'(const planes = await fetchAPI\(planesUrl\);)',
    r'const cachePlanesUrl = planesUrl.includes("?") ? `${planesUrl}&_t=${Date.now()}` : `${planesUrl}?_t=${Date.now()}`;\n        const planes = await fetchAPI(cachePlanesUrl);',
    content
)

# 2. planes abiertos por obra chart fix
content = content.replace("p.fecha_cumplimiento && p.fecha_cumplimiento.trim() !== ''", "p.plazo && String(p.plazo).trim() !== ''")

# 3. Excel export
old_export = """function exportarResumenAnualExcel() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ao,Mes-Ao,Trabajadores,Das Perdidos\\n";
    
    const extractTable = (id, yearLabel) => {
        const tbody = document.getElementById(id);
        if(!tbody) return;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if(cols.length === 3) {
                const mes = cols[0].innerText;
                if(mes === '-' || mes.includes('Sin datos')) return;
                const trab = cols[1].innerText;
                const dias = cols[2].innerText;
                csvContent += `${yearLabel},${mes},${trab},${dias}\\n`;
            }
        });
    };
    
    extractTable('tabla-resumen-anio1', 'Ao 1 (Jul 2024 - Jun 2025)');
    extractTable('tabla-resumen-anio2', 'Ao 2 (Jul 2025 - Jun 2026)');
    extractTable('tabla-resumen-anio3', 'Ao 3 (Jul 2026 - Jun 2027)');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resumen_anual_reportabilidad.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}"""

# I'll use regex to replace it because of encoding issues with characters like Ao
pattern = re.compile(r'function exportarResumenAnualExcel\(\) \{.*?\n\}', re.DOTALL)
new_export = """function exportarResumenAnualExcel() {
    if (typeof XLSX === 'undefined') {
        alert("La librería para exportar a Excel no está cargada.");
        return;
    }
    const wb = XLSX.utils.book_new();
    
    const extractToSheet = (id, sheetName) => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        
        let data = [["Mes-Año", "Trabajadores", "Días Perdidos"]];
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if(cols.length === 3) {
                const mes = cols[0].innerText;
                if(mes === '-' || mes.includes('Sin datos')) return;
                data.push([mes, cols[1].innerText, cols[2].innerText]);
            }
        });
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        // Add styling if possible, but aoa_to_sheet is basic.
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };
    
    extractToSheet('tabla-resumen-anio1', 'Año 1');
    extractToSheet('tabla-resumen-anio2', 'Año 2');
    extractToSheet('tabla-resumen-anio3', 'Año 3');
    
    XLSX.writeFile(wb, "Resumen_Anual_Reportabilidad.xlsx");
}"""

if re.search(pattern, content):
    content = re.sub(pattern, new_export, content)
else:
    print("Warning: exportarResumenAnualExcel not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app.js with cache busting, chart fix and Excel export.")
