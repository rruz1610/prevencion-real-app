// --- MAQUINARIA EN OBRA ---

function toggleFechasMaquinaria() {
    const maqPermiso = document.getElementById('maq-permiso').checked;
    const fechasContainer = document.getElementById('maq-fechas-container');
    if (maqPermiso) {
        fechasContainer.style.display = 'flex';
    } else {
        fechasContainer.style.display = 'none';
        document.getElementById('maq-vigencia-permiso').value = '';
        document.getElementById('maq-vigencia-licencia').value = '';
        document.getElementById('maq-vigencia-examen').value = '';
        document.getElementById('maq-rut-conductor').value = '';
        document.getElementById('maq-nombre-conductor').value = '';
    }
}

async function guardarMaquinaria(e) {
    if(e) e.preventDefault();
    
    const empresa_id = document.getElementById('maq-empresa').value || null;
    const obra_id = document.getElementById('maq-obra').value || null;
    const maquinaria = document.getElementById('maq-nombre').value;
    const marca = document.getElementById('maq-marca').value;
    const modelo = document.getElementById('maq-modelo').value;
    const patente = document.getElementById('maq-patente').value;
    const permiso = document.getElementById('maq-permiso').checked;
    const vigencia_permiso = document.getElementById('maq-vigencia-permiso').value;
    const vigencia_licencia = document.getElementById('maq-vigencia-licencia').value;
    const vigencia_examen = document.getElementById('maq-vigencia-examen').value;
    const rut_conductor = document.getElementById('maq-rut-conductor').value;
    const nombre_conductor = document.getElementById('maq-nombre-conductor').value;

    if(!maquinaria) {
        alert('Debe ingresar el nombre de la maquinaria');
        return;
    }

    const payload = {
        empresa_id: empresa_id,
        obra_id: obra_id,
        maquinaria: maquinaria,
        marca: marca,
        modelo: modelo,
        patente_codigo: patente,
        requiere_permiso: permiso,
        vigencia_permiso: permiso ? vigencia_permiso : null,
        vigencia_licencia: permiso ? vigencia_licencia : null,
        vigencia_examen: permiso ? vigencia_examen : null,
        rut_conductor: permiso ? rut_conductor : null,
        nombre_conductor: permiso ? nombre_conductor : null
    };

    try {
        const res = await fetchAPI('/api/maquinaria', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if(res && res.status === 'success') {
            alert('Maquinaria guardada exitosamente');
            // Reset form
            document.getElementById('maq-nombre').value = '';
            document.getElementById('maq-marca').value = '';
            document.getElementById('maq-modelo').value = '';
            document.getElementById('maq-patente').value = '';
            document.getElementById('maq-permiso').checked = false;
            toggleFechasMaquinaria();
            cargarMaquinaria();
        } else {
            alert('Error al guardar maquinaria');
        }
    } catch(err) {
        console.error(err);
        alert('Error al guardar maquinaria');
    }
}

async function cargarMaquinaria() {
    const tbody = document.getElementById('tabla-maquinaria');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Cargando...</td></tr>';
    
    try {
        const maquinarias = await fetchAPI('/api/maquinaria');
        if(maquinarias && maquinarias.length > 0) {
            tbody.innerHTML = maquinarias.map(m => `
                <tr>
                    <td>${m.maquinaria || ''}</td>
                    <td>${m.marca || ''}</td>
                    <td>${m.modelo || ''}</td>
                    <td>${m.patente_codigo || ''}</td>
                    <td>${m.requiere_permiso ? 'Sí' : 'No'}</td>
                    <td>${m.vigencia_permiso || ''}</td>
                    <td>${m.vigencia_licencia || ''}</td>
                    <td>${m.vigencia_examen || ''}</td>
                    <td>${m.rut_conductor || ''}</td>
                    <td>${m.nombre_conductor || ''}</td>
                    <td>
                        <button class="btn-danger btn-sm" onclick="eliminarMaquinaria(${m.id})">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No hay maquinarias registradas.</td></tr>';
        }
    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">Error al cargar maquinarias.</td></tr>';
    }
}

async function eliminarMaquinaria(id) {
    if(confirm('¿Está seguro de eliminar esta maquinaria?')) {
        try {
            const res = await fetchAPI('/api/maquinaria/' + id, { method: 'DELETE' });
            if(res && res.status === 'success') {
                cargarMaquinaria();
            } else {
                alert('Error al eliminar');
            }
        } catch(err) {
            alert('Error al eliminar');
        }
    }
}

// Escuchar cambios de vista para cargar maquinarias si se abre su tab
document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', () => {
        if(li.dataset.target === 'maquinaria-obra') {
            cargarMaquinaria();
        }
    });
});
