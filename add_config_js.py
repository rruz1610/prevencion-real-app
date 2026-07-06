import re

js_code = """

// === CONFIGURACION EMPRESA ===
async function getCurrentEmpresaNameLocal() {
    const perfil = localStorage.getItem('perfil');
    if (perfil === 'admin') {
        const sel = document.getElementById('global_empresa_selector');
        if (sel && sel.value) return sel.options[sel.selectedIndex].text;
        return "-";
    } else {
        if (!window.currentEmpresaId) return "-";
        try {
            const data = await fetchAPI('/api/empresas');
            const emp = data.find(e => String(e.id) === String(window.currentEmpresaId));
            return emp ? emp.nombre : "-";
        } catch(e) {
            return "-";
        }
    }
}

async function loadConfigEmpresa() {
    const nombre = await getCurrentEmpresaNameLocal();
    document.getElementById('lbl-plazo-empresa-nombre').innerText = nombre;
    document.getElementById('lbl-term-empresa-nombre').innerText = nombre;
    document.getElementById('lbl-cerr-empresa-nombre').innerText = nombre;

    if (!window.currentEmpresaId) {
        document.getElementById('lbl-plazo-actual').innerText = "Seleccione una empresa primero.";
        document.getElementById('tabla-correos-terminada').innerHTML = '<tr><td colspan="2">Seleccione una empresa</td></tr>';
        document.getElementById('tabla-correos-cerrada').innerHTML = '<tr><td colspan="2">Seleccione una empresa</td></tr>';
        return;
    }
    
    // Plazo
    try {
        const plazos = await fetchAPI(`/api/plazos-cierre?empresa_id=${window.currentEmpresaId}`);
        if (plazos && plazos.length > 0) {
            document.getElementById('lbl-plazo-actual').innerText = plazos[0].plazo_dias + " Horas";
        } else {
            document.getElementById('lbl-plazo-actual').innerText = "Sin definir";
        }
    } catch(e) {}

    // Correos Terminada
    try {
        const ct = await fetchAPI(`/api/correos-terminada?empresa_id=${window.currentEmpresaId}`);
        const tbody = document.getElementById('tabla-correos-terminada');
        tbody.innerHTML = '';
        if(ct && ct.length > 0) {
            ct.forEach(c => {
                tbody.innerHTML += `<tr><td>${c.rol}</td><td><button class="btn-secondary" onclick="eliminarCorreoTerminada(${c.id})" style="padding: 4px 8px; font-size: 0.8rem; background-color: #e74c3c; border-color: #c0392b; color: white;">Eliminar</button></td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #777;">Sin notificaciones configuradas</td></tr>';
        }
    } catch(e) {}

    // Correos Cerrada
    try {
        const cc = await fetchAPI(`/api/correos-cerrada?empresa_id=${window.currentEmpresaId}`);
        const tbody = document.getElementById('tabla-correos-cerrada');
        tbody.innerHTML = '';
        if(cc && cc.length > 0) {
            cc.forEach(c => {
                tbody.innerHTML += `<tr><td>${c.rol}</td><td><button class="btn-secondary" onclick="eliminarCorreoCerrada(${c.id})" style="padding: 4px 8px; font-size: 0.8rem; background-color: #e74c3c; border-color: #c0392b; color: white;">Eliminar</button></td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #777;">Sin notificaciones configuradas</td></tr>';
        }
    } catch(e) {}
}

async function guardarPlazoCierre() {
    if (!window.currentEmpresaId) return alert('Seleccione una empresa activa primero.');
    const horas = document.getElementById('c_plazo_horas').value;
    if (!horas) return alert('Ingrese un plazo válido');
    
    const res = await fetchAPI('/api/plazos-cierre', {
        method: 'POST',
        body: JSON.stringify({ empresa_id: parseInt(window.currentEmpresaId), plazo_dias: parseInt(horas) })
    });
    if (res) {
        cerrarModal('modal-plazo');
        document.getElementById('c_plazo_horas').value = '';
        loadConfigEmpresa();
        alert('Plazo guardado con éxito');
    }
}

async function guardarCorreoTerminada() {
    if (!window.currentEmpresaId) return alert('Seleccione una empresa activa primero.');
    const rol = document.getElementById('ct_nombre').value;
    const res = await fetchAPI('/api/correos-terminada', {
        method: 'POST',
        body: JSON.stringify({ empresa_id: parseInt(window.currentEmpresaId), rol: rol })
    });
    if (res) {
        cerrarModal('modal-correo-terminada');
        document.getElementById('ct_nombre').value = '';
        document.getElementById('ct_correo').value = ''; // Just to clear it even though it\'s not saved to backend currently
        loadConfigEmpresa();
    }
}

async function guardarCorreoCerrada() {
    if (!window.currentEmpresaId) return alert('Seleccione una empresa activa primero.');
    const rol = document.getElementById('cc_nombre').value;
    const res = await fetchAPI('/api/correos-cerrada', {
        method: 'POST',
        body: JSON.stringify({ empresa_id: parseInt(window.currentEmpresaId), rol: rol })
    });
    if (res) {
        cerrarModal('modal-correo-cerrada');
        document.getElementById('cc_nombre').value = '';
        document.getElementById('cc_correo').value = ''; // Just to clear it
        loadConfigEmpresa();
    }
}

async function eliminarCorreoTerminada(id) {
    if(!confirm('¿Eliminar esta notificación?')) return;
    await fetchAPI(`/api/correos-terminada/${id}`, { method: 'DELETE' });
    loadConfigEmpresa();
}

async function eliminarCorreoCerrada(id) {
    if(!confirm('¿Eliminar esta notificación?')) return;
    await fetchAPI(`/api/correos-cerrada/${id}`, { method: 'DELETE' });
    loadConfigEmpresa();
}
"""

with open('static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add call to switchMantenedorTab
content = content.replace("if (tabId === 'coordinadores-prevencion') loadCoordinadoresPrevencion();", 
                          "if (tabId === 'coordinadores-prevencion') loadCoordinadoresPrevencion();\n    if (tabId === 'config-empresa') loadConfigEmpresa();")

# Inject code at the end
if "getCurrentEmpresaNameLocal" not in content:
    content += js_code

with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
