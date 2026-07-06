import re

with open("c:/Users/rruz8/Desktop/prevencion-real/static/index.html", "r", encoding="utf-8") as f:
    content = f.read()

modals_html = """
    <!-- Modal Aprobar Cierre de Auditoria -->
    <div id="modal-aprobar-cierre" class="modal">
        <div class="modal-content glassmorphism" style="max-width: 500px;">
            <h2 style="color: var(--primary-color); margin-bottom: 20px;">Firma de Cierre Definitivo</h2>
            <p style="margin-bottom: 20px; font-size: 0.9rem;">Para cerrar la auditoría, se requieren las firmas electrónicas (contraseñas) de los responsables.</p>
            
            <div class="form-group">
                <label>RUT Coordinador / Gerente</label>
                <input type="text" id="firma_coord_rut" placeholder="Ej: 11222333-4">
            </div>
            <div class="form-group">
                <label>Contraseña Coordinador / Gerente</label>
                <input type="password" id="firma_coord_clave" placeholder="Contraseña">
            </div>
            <hr style="border-color: #444; margin: 20px 0;">
            <div class="form-group">
                <label>RUT Prevencionista</label>
                <input type="text" id="firma_prev_rut" placeholder="Ej: 11222333-4">
            </div>
            <div class="form-group">
                <label>Contraseña Prevencionista</label>
                <input type="password" id="firma_prev_clave" placeholder="Contraseña">
            </div>

            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn-secondary" onclick="cerrarModal('modal-aprobar-cierre')">Cancelar</button>
                <button type="button" class="btn-primary" onclick="confirmarCierreAuditoria()">Cerrar Auditoría</button>
            </div>
        </div>
    </div>

    <!-- Modal Aprobar Planes de Accion -->
    <div id="modal-aprobar-planes" class="modal">
        <div class="modal-content glassmorphism" style="max-width: 500px;">
            <h2 style="color: var(--primary-color); margin-bottom: 20px;">Aprobar Planes de Acción</h2>
            <p style="margin-bottom: 20px; font-size: 0.9rem;">Se ha enviado un código temporal al correo del Administrador de Obra. Ingréselo junto a la firma del Prevencionista para aprobar.</p>
            
            <div class="form-group">
                <label>Token del Administrador</label>
                <input type="text" id="firma_token_admin" placeholder="Código de 6 dígitos enviado por correo">
            </div>
            <hr style="border-color: #444; margin: 20px 0;">
            <div class="form-group">
                <label>RUT Prevencionista</label>
                <input type="text" id="firma_plan_prev_rut" placeholder="Ej: 11222333-4">
            </div>
            <div class="form-group">
                <label>Contraseña Prevencionista</label>
                <input type="password" id="firma_plan_prev_clave" placeholder="Contraseña">
            </div>

            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn-secondary" onclick="cerrarModal('modal-aprobar-planes')">Cancelar</button>
                <button type="button" class="btn-primary" onclick="confirmarAprobacionPlanes()">Aprobar y Enviar PDF</button>
            </div>
        </div>
    </div>
"""

content = content.replace("</body>\n</html>", modals_html + "\n</body>\n</html>")

with open("c:/Users/rruz8/Desktop/prevencion-real/static/index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.html")
