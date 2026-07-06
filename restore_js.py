def insert_functions():
    with open('static/app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    functions = """
async function loadGerentes() {
    const data = await fetchAPI('/api/gerentes');
    const tbody = document.getElementById('tabla-gerentes');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) data.forEach(i => tbody.innerHTML += `<tr><td>${i.empresa_id ? i.empresa_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('gerentes', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.empresa_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('gerentes', '${i.id}')">Eliminar</button></td></tr>`);
}

async function loadGerentesPrevencion() {
    const data = await fetchAPI('/api/gerentes-prevencion');
    const tbody = document.getElementById('tabla-gerentes-prevencion');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) data.forEach(i => tbody.innerHTML += `<tr><td>${i.empresa_id ? i.empresa_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('gerentes-prevencion', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.empresa_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('gerentes-prevencion', '${i.id}')">Eliminar</button></td></tr>`);
}

async function loadPrevencionistas() {
    const data = await fetchAPI('/api/prevencionistas');
    const tbody = document.getElementById('tabla-prevencionistas');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) data.forEach(i => tbody.innerHTML += `<tr><td>${i.obra_id ? i.obra_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('prevencionistas', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.obra_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('prevencionistas', '${i.id}')">Eliminar</button></td></tr>`);
}

async function loadJefesObra() {
    const data = await fetchAPI('/api/jefes-obra');
    const tbody = document.getElementById('tabla-jefes-obra');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) data.forEach(i => tbody.innerHTML += `<tr><td>${i.obra_id ? i.obra_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('jefes-obra', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.obra_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('jefes-obra', '${i.id}')">Eliminar</button></td></tr>`);
}

async function loadCoordinadoresPrevencion() {
    const data = await fetchAPI('/api/coordinadores-prevencion');
    const tbody = document.getElementById('tabla-coordinadores-prevencion');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) data.forEach(i => tbody.innerHTML += `<tr><td>${i.obra_id ? i.obra_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('coordinadores-prevencion', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.obra_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('coordinadores-prevencion', '${i.id}')">Eliminar</button></td></tr>`);
}
"""

    if 'async function loadGerentes()' not in content:
        content = content.replace('async function loadTrabajadores() {', functions + '\nasync function loadTrabajadores() {')
        with open('static/app.js', 'w', encoding='utf-8') as f:
            f.write(content)

insert_functions()
