async function cargarObrasMaquinaria() {
    const obraSelect = document.getElementById('maq-obra');
    if (!obraSelect) return;
    
    obraSelect.innerHTML = '<option value="">Cargando...</option>';
    let empId = window.currentEmpresaId || localStorage.getItem('empresa_id');
    let url = '/api/obras';
    if (empId) url += `?empresa_id=${empId}`;
    
    try {
        const data = await fetchAPI(url);
        obraSelect.innerHTML = '<option value="">Seleccione Obra...</option>';
        if (data) {
            data.forEach(o => {
                if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
                    let userObras = window.userObras || [];
                    if (userObras.includes(o.id) || o.id == window.currentObraId) {
                        obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                    }
                } else {
                    obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                }
            });
            if (window.currentObraId) {
                obraSelect.value = window.currentObraId;
            }
        }
    } catch (e) {
        obraSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
}

document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', () => {
        if(li.dataset.target === 'maquinaria-obra') {
            cargarObrasMaquinaria();
        }
    });
});
