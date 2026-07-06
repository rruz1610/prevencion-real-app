import re

with open("c:/Users/rruz8/Desktop/prevencion-real/static/app.js", "r", encoding="utf-8") as f:
    content = f.read()

planes_js = """
// Reemplazar loadPlanesAccion dummy anterior
async function loadPlanesAccion() {
    const tbody = document.getElementById('tabla-planes-accion');
    if (!tbody) return;
    
    // Obtener filtros actuales
    const empId = document.getElementById('filtro_empresa_planes')?.value || '';
    const obraId = document.getElementById('filtro_obra_planes')?.value || '';
    const prevId = document.getElementById('filtro_prevencionista_planes')?.value || '';
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando planes pendientes...</td></tr>';
    
    const queryParams = new URLSearchParams();
    if(empId) queryParams.append('empresa_id', empId);
    if(obraId) queryParams.append('obra_id', obraId);
    if(prevId) queryParams.append('prevencionista_id', prevId);
    
    const planes = await fetchAPI(`/api/auditorias/planes_accion?${queryParams}`);
    
    if(!planes || planes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #aaa;">No hay preguntas "No Cumple" pendientes de planes de acción para esta selección.</td></tr>';
        return;
    }
    
    let html = '';
    // Agrupar por auditoria
    const porAuditoria = planes.reduce((acc, p) => {
        if(!acc[p.auditoria_id]) acc[p.auditoria_id] = [];
        acc[p.auditoria_id].push(p);
        return acc;
    }, {});
    
    Object.keys(porAuditoria).forEach(aud_id => {
        html += `<tr style="background: rgba(255,255,255,0.05); font-weight: bold;"><td colspan="5">Auditoría: ${aud_id}</td></tr>`;
        
        porAuditoria[aud_id].forEach(p => {
            html += `
            <tr data-auditoria="${p.auditoria_id}" data-pregunta="${p.pregunta_id}">
                <td>${p.pregunta_id}</td>
                <td style="color: #e74c3c;">No Cumple</td>
                <td>${p.comentario_original || '-'}</td>
                <td><textarea class="plan-texto" style="width: 100%; min-height: 40px; background: transparent; color: white; border: 1px solid #555; padding: 5px;">${p.plan_texto || ''}</textarea></td>
                <td><input type="date" class="plan-fecha" value="${p.fecha_cumplimiento || ''}" style="background: transparent; color: white; border: 1px solid #555; padding: 5px;"></td>
            </tr>`;
        });
        
        // Agregar botón de guardar y enviar de esta auditoría
        html += `
        <tr>
            <td colspan="5" style="text-align: right; padding-top: 10px; padding-bottom: 20px;">
                <button class="btn-secondary" onclick="guardarPlanesAuditoria('${aud_id}', false)">Guardar Avance</button>
                <button class="btn-primary" onclick="iniciarCierrePlanes('${aud_id}')" style="margin-left: 10px;">Enviar a Aprobación</button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

async function guardarPlanesAuditoria(aud_id, silent = false) {
    const tbody = document.getElementById('tabla-planes-accion');
    const filas = tbody.querySelectorAll(`tr[data-auditoria="${aud_id}"]`);
    
    const planesData = [];
    filas.forEach(tr => {
        planesData.push({
            auditoria_id: aud_id,
            pregunta_id: parseInt(tr.getAttribute('data-pregunta')),
            plan_texto: tr.querySelector('.plan-texto').value,
            fecha_cumplimiento: tr.querySelector('.plan-fecha').value
        });
    });
    
    const res = await fetchAPI(`/api/auditorias/guardar_planes`, {
        method: 'POST',
        body: JSON.stringify({ planes: planesData })
    });
    
    if(res && res.status === 'success' && !silent) {
        alert("Planes guardados correctamente. Se generó un nuevo token para el Administrador de Obra.");
    }
}

function iniciarCierrePlanes(aud_id) {
    window.currentPlanAuditoriaId = aud_id;
    // Primero guardamos para asegurar que el token se genére/refresque
    guardarPlanesAuditoria(aud_id, true).then(() => {
        mostrarModal('modal-aprobar-planes');
    });
}

async function confirmarAprobacionPlanes() {
    const aud_id = window.currentPlanAuditoriaId;
    if(!aud_id) return;
    
    const token = document.getElementById('firma_token_admin').value;
    const rutPrev = document.getElementById('firma_plan_prev_rut').value;
    const clavePrev = document.getElementById('firma_plan_prev_clave').value;
    
    if(!token || !rutPrev || !clavePrev) return alert("Debe completar todos los campos");
    
    const res = await fetchAPI(`/api/auditorias/${aud_id}/aprobar_planes`, {
        method: 'POST',
        body: JSON.stringify({
            token_admin: token,
            prevencionista_id: rutPrev,
            prevencionista_clave: clavePrev
        })
    });
    
    if(res && res.status === 'success') {
        alert("¡Planes aprobados! La auditoría ha sido COMPLETADA y se generará el PDF final.");
        cerrarModal('modal-aprobar-planes');
        loadPlanesAccion(); // recargar
    }
}
"""

content = content + planes_js
with open("c:/Users/rruz8/Desktop/prevencion-real/static/app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.js with planes JS")
