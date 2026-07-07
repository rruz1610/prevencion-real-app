import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update cambiarEmpresaGlobal to update sidebar name
cambiar_empresa_old = r'(window\.currentEmpresaId = selector\.value \? selector\.value : null;)'
cambiar_empresa_new = r'\1\n    const sysName = document.getElementById("sidebar-system-name");\n    if (sysName) {\n        sysName.innerText = selector.options[selector.selectedIndex].text !== "Todas las Empresas" ? selector.options[selector.selectedIndex].text : "PrevenEASY";\n    }'
content = re.sub(cambiar_empresa_old, cambiar_empresa_new, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated cambiarEmpresaGlobal in app.js")
