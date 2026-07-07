import re
import os

html_path = r'c:\Users\rruz8\Desktop\prevencion-real\static\index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1, 2, 3: Replace PrevenSaaS
content = content.replace('PrevenSaaS', 'PrevenEASY')

# 4: Sidebar system name ID
content = content.replace('<h2>PrevenEASY</h2>', '<h2 id="sidebar-system-name">PrevenEASY</h2>')

# 5: Profile avatar ID
content = content.replace('<div class="avatar">Admin</div>', '<div class="avatar" id="user-profile-avatar">Admin</div>')

# 6: Reorder Sidebar
new_sidebar = """<ul class="nav-links">
<li data-target="inspecciones" id="nav-inspecciones">Auditoria</li>
<li data-target="planaccion" id="nav-planaccion">Planes de Acción</li>
<li data-target="reportabilidad" id="nav-reportabilidad">Reportabilidad Mensual</li>
<li data-target="maquinaria-obra" id="nav-maquinaria-obra">Maquinaria en Obra</li>
<li data-target="reportes" id="nav-reportes">Gráficos Auditoria</li>
<li data-target="graficos-reportabilidad" id="nav-graficos-reportabilidad">Gráficos Reportabilidad</li>
<li class="active" data-target="mantenedores" id="nav-mantenedores">Mantenedores</li>
<li data-target="pagos" id="nav-pagos" style="background-color: #2c3e50; font-weight: bold; margin-top: 10px;">Control de Pagos (Admin)</li>
<li data-target="trabajadores" id="nav-trabajadores">Trabajadores (ODI)</li>
<li data-target="epp" id="nav-epp">Stock EPP</li>
<li data-target="karin" id="nav-karin">Ley Karin</li>
</ul>"""

# Replace the existing ul.nav-links block
pattern = re.compile(r'<ul class="nav-links">.*?</ul>', re.DOTALL)
content = pattern.sub(new_sidebar, content)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html")
