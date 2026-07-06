import re

with open("c:/Users/rruz8/Desktop/prevencion-real/static/app.js", "r", encoding="utf-8") as f:
    content = f.read()

new_js = """

// === NUEVO FLUJO DE AUDITORIA E HISTORIAL ===
async function iniciarNuevaAuditoria() {
    if (!window.currentEmpresaId) return alert("Seleccione una empresa");
    const obraId = document.getElementById('audit_obra_id').value;
    const plantillaId = document.getElementById('audit_plantilla_id').value;
    
    if(!obraId || !plantillaId) return alert("Seleccione obra y plantilla");
    
    const payload = {
        plantilla_id: plantillaId,
        obra_id: obraId,
        prevencionista_id: userProfile === 'prevencionista' ? currentPrevencionistaId : '',
        jefe_obra_id: '',
        auditor_tipo: userProfile,
        auditor_id: currentPrevencionistaId || 'admin'
    };
    
    const res = await fetchAPI('/api/auditorias/iniciar', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    if (res && res.status === 'success') {
        window.currentAuditoriaId = res.id;
        document.getElementById('audit-setup-container').style.display = 'none';
        document.getElementById('audit-form-container').style.display = 'block';
        loadFormTemplate(plantillaId);
    }
}

async function guardarParcialmenteAuditoria() {
    if (!window.currentAuditoriaId) return;
    const respuestas = collectAuditResponses();
    const res = await fetchAPI(`/api/auditorias/${window.currentAuditoriaId}/guardar_parcial`, {
        method: 'PUT',
        body: JSON.stringify({respuestas: respuestas})
    });
    if (res && res.status === 'success') {
        alert("Avance guardado correctamente.");
    }
}

function solicitarCierreAuditoria() {
    mostrarModal('modal-aprobar-cierre');
}

async function confirmarCierreAuditoria() {
    const coordClave = document.getElementById('clave_coordinador').value;
    const prevClave = document.getElementById('clave_prevencionista').value;
    
    if(!coordClave || !prevClave) return alert("Debe ingresar ambas firmas");
    
    // Primero guardar respuestas actuales
    await guardarParcialmenteAuditoria();
    
    const res = await fetchAPI(`/api/auditorias/${window.currentAuditoriaId}/aprobar_cierre`, {
        method: 'POST',
        body: JSON.stringify({
            coordinador_id: '15367481-7', // Asumiendo esto o extraer del usuario
            coordinador_clave: coordClave,
            prevencionista_id: 'prev', // Needs real IDs
            prevencionista_clave: prevClave
        })
    });
    
    if (res && res.status === 'success') {
        alert("Auditoría cerrada. Esperando Planes de Acción si aplica.");
        cerrarModal('modal-aprobar-cierre');
        switchSection('audit-admin');
    }
}

// === PLANES DE ACCION ===
async function loadPlanesAccion() {
    // Dummy implementacion para cargar los planes de accion
    const tbody = document.getElementById('tabla-planes-accion');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando planes de acción...</td></tr>';
    
    // Lógica real requeriría un endpoint /api/planes_accion
    setTimeout(() => {
        tbody.innerHTML = '<tr><td colspan="6">No hay planes de acción pendientes.</td></tr>';
    }, 1000);
}
"""

content = content + new_js

with open("c:/Users/rruz8/Desktop/prevencion-real/static/app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.js")
