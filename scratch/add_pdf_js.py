import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new JS function
new_pdf_func = """
function generarReportePDF(mode = 'download', aud_id = null, cb = null) {
    // 1. Gather Metadata
    const obraSelect = document.getElementById('audit_obra_id');
    const prevSelect = document.getElementById('audit_prevencionista_id');
    const plantillaSelect = document.getElementById('audit_plantilla_id');
    
    document.getElementById('pdf-auditoria-ref').innerText = `Ref: AUD-${aud_id || window.currentAuditoriaId || 'N/A'}`;
    document.getElementById('pdf-meta-obra').innerText = obraSelect.options[obraSelect.selectedIndex]?.text || '-';
    document.getElementById('pdf-meta-plantilla').innerText = plantillaSelect.options[plantillaSelect.selectedIndex]?.text || '-';
    document.getElementById('pdf-meta-prevencionista').innerText = prevSelect.options[prevSelect.selectedIndex]?.text || '-';
    document.getElementById('pdf-meta-fecha').innerText = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 2. Gather Data from DOM & Calculate stats
    const respuestas = collectAuditResponses();
    let totalCumple = 0, totalNoCumple = 0, totalNA = 0;
    
    const categories = [];
    document.querySelectorAll('.audit-category').forEach(catDiv => {
        const catName = catDiv.querySelector('h3').innerText;
        const qDivs = catDiv.querySelectorAll('.audit-question');
        const catQuestions = [];
        let catC = 0, catNC = 0, catNA = 0;
        
        qDivs.forEach(qDiv => {
            const qId = qDiv.dataset.id;
            const text = qDiv.querySelector('strong').innerText;
            const r = respuestas.find(x => String(x.pregunta_id) === String(qId));
            const estado = r ? r.estado : 'Sin responder';
            const obs = r ? r.observacion : '';
            
            if(estado === 'Cumple') { catC++; totalCumple++; }
            else if(estado === 'No Cumple') { catNC++; totalNoCumple++; }
            else if(estado === 'N/A') { catNA++; totalNA++; }
            
            catQuestions.push({ text, estado, obs });
        });
        
        const catTotal = catC + catNC;
        const catPct = catTotal > 0 ? Math.round((catC / catTotal) * 100) : 0;
        
        categories.push({ name: catName, questions: catQuestions, c: catC, nc: catNC, na: catNA, pct: catPct });
    });
    
    const totalCount = totalCumple + totalNoCumple;
    const totalPct = totalCount > 0 ? Math.round((totalCumple / totalCount) * 100) : 0;
    
    document.getElementById('pdf-meta-cumplimiento-pct').innerText = `${totalPct}%`;
    document.getElementById('pdf-meta-cumplimiento-stats').innerText = `${totalCumple} Cumple / ${totalNoCumple} No cumple / ${totalNA} N/A`;

    // 3. Render Chart
    const barsContainer = document.getElementById('pdf-chart-bars');
    let barsHtml = '';
    categories.forEach(cat => {
        let color = '#f39c12'; // orange
        if (cat.pct >= 90) color = '#2ecc71'; // green
        else if (cat.pct < 50) color = '#e74c3c'; // red
        
        barsHtml += `
            <div style="position: relative; height: 8px;">
                <div style="position: absolute; left: -110px; width: 100px; text-align: right; font-size: 8px; font-weight: bold; color: #2c3e50; top: -2px;">${cat.name}</div>
                <div style="height: 100%; width: ${cat.pct}%; background-color: ${color}; border-radius: 4px;"></div>
            </div>
        `;
    });
    barsContainer.innerHTML = barsHtml;

    // 4. Render Tables
    const tablesContainer = document.getElementById('pdf-tables-container');
    let tablesHtml = '';
    categories.forEach(cat => {
        let rowsHtml = '';
        cat.questions.forEach(q => {
            let color = '#34495e';
            if(q.estado === 'Cumple') color = '#27ae60';
            else if(q.estado === 'No Cumple') color = '#c0392b';
            
            rowsHtml += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #34495e;">${q.text}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; font-weight: bold; color: ${color}; text-align: center;">${q.estado}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #7f8c8d; font-style: italic;">${q.obs || '-'}</td>
                </tr>
            `;
        });
        
        tablesHtml += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4A47E3; margin: 0 0 5px 0; font-size: 12px;">${cat.name}</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f1f2f6;">
                            <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; text-align: left;">Pregunta / Requerimiento</th>
                            <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; width: 80px;">Evaluación</th>
                            <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; width: 150px;">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr style="background-color: #f8f9fa;">
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; font-weight: bold; color: #2c3e50;">CUMPLIMIENTO DEL NIVEL</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 11px; font-weight: bold; color: #f39c12; text-align: center;">${cat.pct}%</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 9px; color: #7f8c8d; text-align: center;">Cumple: ${cat.c} | No Cumple: ${cat.nc} | N/A: ${cat.na}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });
    tablesContainer.innerHTML = tablesHtml;

    // 5. Cierre Data
    if (document.getElementById('firma_coord_rut') && document.getElementById('firma_coord_rut').value) {
        document.getElementById('pdf-cierre-box').style.display = 'block';
        // Mock comments if we don't have them yet, or grab them if available
        document.getElementById('pdf-cierre-comentarios').innerText = "Cierre validado digitalmente por sistema.";
        document.getElementById('pdf-cierre-compromisos').innerText = "Revisar anexo de planes de acción (si aplica).";
        
        // Find names by RUT if we wanted to be perfectly accurate, but for now just show RUTs
        document.getElementById('pdf-firma-prev').innerText = document.getElementById('firma_prev_rut').value || '-';
        document.getElementById('pdf-firma-obra').innerText = document.getElementById('firma_coord_rut').value || '-';
    } else {
        document.getElementById('pdf-cierre-box').style.display = 'none';
        document.getElementById('pdf-firma-prev').innerText = prevSelect.options[prevSelect.selectedIndex]?.text || '-';
        document.getElementById('pdf-firma-obra').innerText = 'Representante Obra';
    }

    // 6. Planes de Accion (Page 3)
    // Render only if mode is 'planes' or there are planes requested
    const planesPage = document.getElementById('pdf-page-planes');
    const planesContainer = document.getElementById('pdf-planes-container');
    if (mode === 'blob_with_planes') {
        planesPage.style.display = 'block';
        const tbodyPlanes = document.getElementById('tabla-pendientes-plan-body');
        if (tbodyPlanes && tbodyPlanes.children.length > 0) {
            let planesHtml = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f2f6;">
                        <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; text-align: left;">Pregunta No Cumplida</th>
                        <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; text-align: left;">Plan de Acción Comprometido</th>
                        <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; width: 80px;">Plazo</th>
                    </tr>
                </thead>
                <tbody>
            `;
            Array.from(tbodyPlanes.querySelectorAll('tr')).forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if(tds.length >= 3) {
                    const preg = tds[0].innerText;
                    const planText = tr.querySelector('.plan-texto-input')?.value || '-';
                    const planDate = tr.querySelector('.plan-fecha-input')?.value || '-';
                    planesHtml += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #34495e;">${preg}</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #27ae60; font-weight: bold;">${planText}</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #e74c3c; text-align: center;">${planDate}</td>
                        </tr>
                    `;
                }
            });
            planesHtml += `</tbody></table>`;
            planesContainer.innerHTML = planesHtml;
        } else {
            planesContainer.innerHTML = '<p style="font-size: 12px; color: #7f8c8d;">No hay planes de acción comprometidos registrados en la tabla.</p>';
        }
    } else {
        planesPage.style.display = 'none';
    }

    // 7. Generate PDF
    const element = document.getElementById('pdf-export-content');
    element.parentElement.style.display = 'block'; // Make it visible temporarily for rendering
    
    const opt = {
        margin:       0,
        filename:     `Reporte_Auditoria_${aud_id || window.currentAuditoriaId || 'Preview'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    if (mode === 'download') {
        html2pdf().set(opt).from(element).save().then(() => {
            element.parentElement.style.display = 'none';
        });
    } else if (mode === 'blob' || mode === 'blob_with_planes') {
        html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
            element.parentElement.style.display = 'none';
            if (cb) cb(pdfBlob);
        });
    }
}
"""

# Now replace the old function descargarPDFAuditoria
old_descargar = r'function descargarPDFAuditoria\(\) \{.*?\n\}'
content = re.sub(old_descargar, 'function descargarPDFAuditoria() {\n    generarReportePDF("download");\n}', content, flags=re.DOTALL)

# Add the new function to the end of the file
content += "\n\n" + new_pdf_func

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added generarReportePDF to app.js")
