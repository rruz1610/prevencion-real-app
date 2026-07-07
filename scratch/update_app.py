import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename PrevenSAAS
content = content.replace('PrevenSaaS', 'PrevenEASY')

# 2. Inject profile name and company name
# In verificarAuth()
old_name_injection = """        const uName = localStorage.getItem('nombre');
        if (uName && perfil) {
            const display = document.getElementById('user-name-display');
            if (display) display.innerText = `${uName} (${perfil})`;
        }"""
new_name_injection = """        const uName = localStorage.getItem('nombre');
        if (uName && perfil) {
            const display = document.getElementById('user-name-display');
            if (display) display.innerText = `${uName} (${perfil})`;
            const avatar = document.getElementById('user-profile-avatar');
            if (avatar) avatar.innerText = uName;
        }"""
content = content.replace(old_name_injection, new_name_injection)

# Also company name in sidebar. 
# Let's hook it into loadEmpresas where it fetches the list of companies, 
# or just change it dynamically when user logs in if not admin.
# Actually, the user profile has empresa_id, we can just update it when `loadEmpresas` finishes.
injection_load_empresas = """    try {
        const response = await fetch('/api/empresas');
        const data = await response.json();
        
        // --- ADDED ---
        const sysName = document.getElementById('sidebar-system-name');
        if (sysName && window.currentEmpresaId) {
            const emp = data.find(e => String(e.id) === String(window.currentEmpresaId));
            if (emp) sysName.innerText = emp.nombre;
        }
        // --- ADDED ---"""
content = content.replace('    try {\n        const response = await fetch(\'/api/empresas\');\n        const data = await response.json();', injection_load_empresas)

# 3. Action plan wrong password log out
# fetch('/api/planes-accion/aprobar')
# In btn.onclick inside the modal for planes-accion/aprobar
# I need to see how it's handled. Let's use regex to find fetch('/api/planes-accion/aprobar') block.
# Usually: 
# if (!response.ok) { alert(data.detail || "Error"); return; }
# Wait, if there's a global 401 interceptor, that's what causes the logout. Is there one?
# Let's look for response.status === 401
content = re.sub(
    r'(const response = await fetch\(\'/api/planes-accion/aprobar\'.*?\n\s+)(const data = await response.json\(\);)',
    r'\1if (response.status === 401 || response.status === 400) { const errData = await response.json(); alert(errData.detail || "Contraseña incorrecta"); return; }\n        \2',
    content,
    flags=re.DOTALL
)

# 4. Planes Aprobados detail view mode
# if (estado === 'Finalizada' || estado === 'Planes Aprobados' || estado === 'Cerrada')
content = content.replace("estado === 'Finalizada' || estado === 'Cerrada'", "estado === 'Finalizada' || estado === 'Cerrada' || estado === 'Planes Aprobados'")
content = content.replace("aud.estado === 'Finalizada' || aud.estado === 'Cerrada'", "aud.estado === 'Finalizada' || aud.estado === 'Cerrada' || aud.estado === 'Planes Aprobados'")
content = content.replace("auditoriaActual.estado === 'Finalizada'", "(auditoriaActual.estado === 'Finalizada' || auditoriaActual.estado === 'Planes Aprobados' || auditoriaActual.estado === 'Cerrada')")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js")
