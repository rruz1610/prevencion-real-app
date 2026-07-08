// === UTILITIES ===
let userProfile = '';
let currentPrevencionistaId = '';
let currentObraId = '';
window.currentEmpresaId = null;

async function fetchAPI(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            options.headers = options.headers || {};
            if (!(options.body instanceof FormData)) {
                options.headers['Content-Type'] = 'application/json';
            }
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(endpoint, options);
        
        if (response.status === 401) {
            localStorage.clear();
            verificarAuth();
            return null;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            let errorMsg = "Error en la operación";
            if (data.detail) {
                if (Array.isArray(data.detail)) {
                    // Errores de validación Pydantic: [{loc:[...], msg:"...", type:"..."}]
                    errorMsg = data.detail.map(e => {
                        const campo = e.loc ? e.loc.slice(1).join(' → ') : '';
                        return campo ? `${campo}: ${e.msg}` : e.msg;
                    }).join('\n');
                } else if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                } else {
                    errorMsg = JSON.stringify(data.detail);
                }
            } else if (data.message) {
                errorMsg = data.message;
            }
            alert(errorMsg);
            return null;
        }
        
        return data;
    } catch (e) {
        console.error("Fetch error:", e);
        alert("Error de conexión con el servidor");
        return null;
    }
}

async function mostrarDetalleBrecha(filteredAudits) {
    let preguntasMap = window.preguntasCache;
    if (!preguntasMap) {
        const pregs = await fetchAPI('/api/preguntas');
        preguntasMap = {};
        if(pregs) pregs.forEach(p => preguntasMap[p.id] = p.texto);
        window.preguntasCache = preguntasMap;
    }
    
    const tbody = document.getElementById('tabla-detalle-brecha');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // Group by obra
    const grouped = {};
    filteredAudits.forEach(a => {
        if(a.respuestas && a.respuestas.length > 0) {
            const hasNoCumple = a.respuestas.some(r => r.estado === "No Cumple");
            if (hasNoCumple) {
                const obraName = a.project || "Obra Desconocida";
                if (!grouped[obraName]) grouped[obraName] = [];
                grouped[obraName].push(a);
            }
        }
    });

    let html = '';
    const obras = Object.keys(grouped);
    
    if (obras.length === 0) {
        html = '<tr><td colspan="4" style="text-align: center;">No se encontraron preguntas con "No Cumple"</td></tr>';
    } else {
        obras.forEach(obra => {
            // Group Title
            html += `<tr style="background: rgba(255,255,255,0.05);"><td colspan="4" style="font-weight: bold; color: var(--primary-color); padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 1.05rem;">👷‍♂️ Obra: ${obra}</td></tr>`;
            
            // Items for this obra
            grouped[obra].forEach(a => {
                const fecha = a.date || "N/A";
                a.respuestas.forEach(r => {
                    if (r.estado === "No Cumple") {
                        const texto = preguntasMap[r.pregunta_id] || "Pregunta " + r.pregunta_id;
                        const obs = r.observacion || "Sin observación";
                        html += `<tr>
                            <td>${a.id}</td>
                            <td>${fecha}</td>
                            <td>${texto}</td>
                            <td>${obs}</td>
                        </tr>`;
                    }
                });
            });
        });
    }
    
    tbody.innerHTML = html;
    document.getElementById('modal-detalle-brecha').style.display = 'flex';
}

let chartCumplimientoObraInstance = null;
function parseDateToMes(dateStr) {
    if (!dateStr) return null;
    let m = dateStr.substring(0, 7);
    if (dateStr.indexOf('-') === 2) {
        const parts = dateStr.substring(0, 10).split('-');
        if (parts.length === 3) m = parts[2] + '-' + parts[1];
    } else if (dateStr.indexOf('/') === 2) {
        const parts = dateStr.substring(0, 10).split('/');
        if (parts.length === 3) m = parts[2] + '-' + parts[1];
    }
    return m;
}

function mostrarModalCumplimientoObraMes(mesLabel, filteredAudits) {
    const mesAuditorias = filteredAudits.filter(a => parseDateToMes(a.date) === mesLabel);
    
    const grouped = {};
    mesAuditorias.forEach(a => {
        const obra = a.project || "Obra Desconocida";
        if (!grouped[obra]) {
            grouped[obra] = { sum: 0, count: 0 };
        }
        grouped[obra].sum += parseFloat(a.cumplimiento || 0);
        grouped[obra].count++;
    });
    
    const labels = [];
    const percentages = [];
    const colors = [];
    
    for (const obra in grouped) {
        labels.push(obra);
        const st = grouped[obra];
        const pct = st.count > 0 ? (st.sum / st.count) : 0;
        percentages.push(parseFloat(pct.toFixed(1)));
        colors.push(pct < (window.umbralCritico || 80) ? '#dc3545' : '#198754');
    }
    
    // Si no hay datos, mostrar mensaje
    if (labels.length === 0) {
        labels.push('Sin datos para este mes');
        percentages.push(0);
        colors.push('#6c757d');
    }
    
    document.getElementById('titulo-modal-cumplimiento-obra').textContent = `Cumplimiento por Obra - ${mesLabel}`;
    
    if (chartCumplimientoObraInstance) {
        chartCumplimientoObraInstance.destroy();
    }
    
    const ctx = document.getElementById('chart-cumplimiento-obra').getContext('2d');
    chartCumplimientoObraInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Cumplimiento',
                data: percentages,
                backgroundColor: colors,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#e0e0e0' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#e0e0e0' }
                }
            }
        }
    });
    
    document.getElementById('modal-cumplimiento-obra').style.display = 'flex';
}

function validarRut(rut) {
    if (!rut) return false;
    let clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 8 || clean.length > 9) return false;

    let body = clean.slice(0, -1);
    let dv = clean.slice(-1);

    if (!/^\d+$/.test(body)) return false;

    let sum = 0;
    let mult = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body.charAt(i)) * mult;
        mult = mult === 7 ? 2 : mult + 1;
    }

    let rem = sum % 11;
    let compDv = 11 - rem;
    let expectedDv = '';
    if (compDv === 11) expectedDv = '0';
    else if (compDv === 10) expectedDv = 'K';
    else expectedDv = compDv.toString();

    return dv === expectedDv;
}

function formatearRut(rut) {
    if (!rut) return "";
    let clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length <= 1) return clean;
    let result = clean.slice(-1);
    let body = clean.slice(0, -1);
    let formattedBody = "";
    while (body.length > 3) {
        formattedBody = "." + body.slice(-3) + formattedBody;
        body = body.slice(0, -3);
    }
    formattedBody = body + formattedBody;
    return formattedBody + "-" + result;
}

function formatRutStr(rut) {
    return formatearRut(rut);
}

// === AUTHENTICATION ===
function verificarAuth() {
    const token = localStorage.getItem('token');
    const perfil = localStorage.getItem('perfil');
    if (!token) {
        const loginSection = document.getElementById('profile-selector-screen');
        if (loginSection) loginSection.style.display = 'flex';
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
        const mainContent = document.querySelector('.app-container');
        if (mainContent) mainContent.style.display = 'none';
    } else {
        const loginSection = document.getElementById('profile-selector-screen');
        if (loginSection) loginSection.style.display = 'none';
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'block';
        const mainContent = document.querySelector('.app-container');
        if (mainContent) mainContent.style.display = 'flex';
        
        userProfile = perfil;
        window.userProfile = perfil;
        window.currentEmpresaId = localStorage.getItem('empresa_id');
        currentPrevencionistaId = localStorage.getItem('user_id');
        currentObraId = localStorage.getItem('obra_id');
        
        const uName = localStorage.getItem('nombre');
        if (uName && perfil) {
            const display = document.getElementById('user-name-display');
            if (display) display.innerText = `${uName} (${perfil})`;
            const avatar = document.getElementById('user-profile-avatar');
            if (avatar) avatar.innerText = uName;
        }
        
        // Esconder todos los nav-links primero
        document.querySelectorAll('.nav-links li').forEach(li => li.style.display = 'none');
        
        // RBAC Matrix
        if (perfil === 'admin') {
            document.body.classList.remove('non-admin');
            document.querySelectorAll('.nav-links li').forEach(li => li.style.display = 'block');
            
            const selector = document.getElementById('global_empresa_selector');
            if (selector) {
                selector.style.display = 'block';
                const adminContainer = document.getElementById('admin-company-selector');
                if (adminContainer) adminContainer.style.display = 'flex';
                cargarSelectorEmpresasGlobal();
            }
        } else {
            document.body.classList.add('non-admin');
            
            if (perfil === 'gerente_prevencion' || perfil === 'coordinador_prevencion' || perfil === 'coordinador') {
                ['nav-mantenedores', 'nav-inspecciones', 'nav-reportes', 'nav-reportabilidad', 'nav-graficos-reportabilidad', 'nav-planaccion', 'nav-maquinaria-obra'].forEach(id => {
                    if(document.getElementById(id)) document.getElementById(id).style.display = 'block';
                });
            } else if (perfil === 'prevencionista') {
                ['nav-inspecciones', 'nav-reportes', 'nav-reportabilidad', 'nav-graficos-reportabilidad', 'nav-planaccion', 'nav-maquinaria-obra'].forEach(id => {
                    if(document.getElementById(id)) document.getElementById(id).style.display = 'block';
                });
            } else if (perfil === 'gerente_empresa' || perfil === 'gerente') {
                ['nav-reportes', 'nav-graficos-reportabilidad'].forEach(id => {
                    if(document.getElementById(id)) document.getElementById(id).style.display = 'block';
                });
            }
        }
    }
}

async function cargarSelectorEmpresasGlobal() {
    const selector = document.getElementById('global_empresa_selector');
    if (!selector) return;
    
    const data = await fetchAPI('/api/empresas');
    if (data) {
        selector.innerHTML = '<option value="">(Todas las empresas)</option>';
        data.forEach(e => {
            selector.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
        });
        if (window.currentEmpresaId) {
            selector.value = window.currentEmpresaId;
        }
    }
}

function getEmpresaNameGlobal() {
    const sel = document.getElementById('global_empresa_selector');
    if (sel && sel.value) {
        return sel.options[sel.selectedIndex].text;
    }
    return "Todas";
}

function cambiarEmpresaGlobal() {
    const selector = document.getElementById('global_empresa_selector');
    window.currentEmpresaId = selector.value ? selector.value : null;
    const sysName = document.getElementById("sidebar-system-name");
    if (sysName) {
        sysName.innerText = selector.options[selector.selectedIndex].text !== "Todas las Empresas" ? selector.options[selector.selectedIndex].text : "PrevenEASY";
    }
    
    // Recargar vista actual
    const activeNav = document.querySelector('.nav-links li.active');
    if (activeNav) {
        switchSection(activeNav.getAttribute('data-target'));
    }
}

function logout() {
    localStorage.clear();
    window.location.reload();
}

async function performLogin() {
    const rut = document.getElementById('login_rut').value;
    const clave = document.getElementById('login_clave').value;
    const errorDiv = document.getElementById('login-error');
    const btn = document.getElementById('btn-ingresar');
    
    if (errorDiv) { errorDiv.style.display = 'none'; errorDiv.innerText = ''; }
    
    if (!rut || !clave) {
        if (errorDiv) { errorDiv.style.display = 'block'; errorDiv.innerText = 'Por favor ingrese RUT y contraseña'; }
        return;
    }
    
    try {
        if (btn) { btn.innerText = 'Ingresando...'; btn.disabled = true; }
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rut: rut, clave: clave })
        });
        
        // Use text() first to catch HTML error pages (e.g., 500 Internal Server Error)
        const textData = await response.text();
        let data;
        try {
            data = JSON.parse(textData);
        } catch (err) {
            console.error("No JSON response:", textData);
            if (errorDiv) { errorDiv.style.display = 'block'; errorDiv.innerText = 'Error de conexión con el servidor (500)'; }
            if (btn) { btn.innerText = 'Ingresar'; btn.disabled = false; }
            return;
        }
        
        if (response.ok && data.status === 'success') {
            localStorage.setItem('token', data.token);
            localStorage.setItem('perfil', data.perfil);
            localStorage.setItem('user_id', data.user_id || '');
            localStorage.setItem('nombre', data.nombre || 'Usuario');
            localStorage.setItem('empresa_id', data.empresa_id || '');
            localStorage.setItem('obra_id', data.obra_id || '');
            
            userProfile = data.perfil;
            currentPrevencionistaId = data.user_id;
            currentObraId = data.obra_id;
            window.currentEmpresaId = data.empresa_id;
            
            // Adjust UI by profile
            if (userProfile === 'admin' || userProfile === 'gerente_prevencion') {
                const navMantenedores = document.getElementById('nav-mantenedores');
                if (navMantenedores) navMantenedores.click();
            } else if (userProfile === 'prevencionista') {
                const navInspecciones = document.getElementById('nav-inspecciones');
                if (navInspecciones) navInspecciones.click();
            } else if (userProfile === 'gerente_empresa') {
                const navReportes = document.getElementById('nav-reportes');
                if (navReportes) navReportes.click();
            } else {
                const navIns = document.getElementById('nav-inspecciones');
                if (navIns) navIns.click();
            }
            verificarAuth();
            if (btn) { btn.innerText = 'Ingresar'; btn.disabled = false; }
            
        } else if (response.ok && data.status === 'force_change') {
            if (document.getElementById('cc_rut')) {
                document.getElementById('cc_rut').value = data.rut;
            }
            if (btn) { btn.innerText = 'Ingresar'; btn.disabled = false; }
            mostrarModal('modal-cambiar-clave');
        } else {
            if (errorDiv) { errorDiv.style.display = 'block'; errorDiv.innerText = data.detail || data.message || 'RUT o contraseña incorrectos'; }
            if (btn) { btn.innerText = 'Ingresar'; btn.disabled = false; }
        }
    } catch (e) {
        console.error("Login error:", e);
        if (errorDiv) { errorDiv.style.display = 'block'; errorDiv.innerText = 'Error conectando al servidor: ' + e.message; }
        if (btn) { btn.innerText = 'Ingresar'; btn.disabled = false; }
    }
}

function mostrarRecuperarClave() {
    const loginRut = document.getElementById('login_rut');
    if(loginRut) {
        document.getElementById('rc_correo').value = "";
    }
    mostrarModal('modal-recuperar-clave');
}

async function solicitarRecuperacion() {
    const correo = document.getElementById('rc_correo').value;
    if(!correo || !correo.includes('@')) { alert("Correo inválido"); return; }
    
    const btn = document.getElementById('btn-recuperar');
    btn.innerText = "Enviando...";
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/recuperar-clave', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({correo})
        });
        const result = await res.json();
        if (result.status === 'success') {
            alert("Se ha enviado una clave temporal a tu correo.");
            cerrarModal('modal-recuperar-clave');
        } else {
            alert(result.message || "Error al recuperar clave.");
        }
    } catch(e) {
        alert("Error de conexión");
    }
    btn.innerText = "Enviar Correo";
    btn.disabled = false;
}

async function guardarNuevaClave() {
    const nueva = document.getElementById('cc_nueva').value;
    const confirmar = document.getElementById('cc_confirmar').value;
    
    if (nueva !== confirmar) {
        alert("Las contraseñas no coinciden");
        return;
    }
    if (nueva.length < 4) {
        alert("La contraseña debe tener al menos 4 caracteres");
        return;
    }
    
    const rut = document.getElementById('cc_rut').value;
    try {
        const res = await fetch('/api/cambiar-clave', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({rut, nueva_clave: nueva})
        });
        const result = await res.json();
        if (result.status === 'success') {
            alert("Contraseña actualizada exitosamente. Ingresando al sistema...");
            cerrarModal('modal-cambiar-clave');
            document.getElementById('login_clave').value = nueva;
            performLogin(); 
        } else {
            alert(result.message || "Error al cambiar la clave");
        }
    } catch(e) {
        alert("Error de conexión");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarAuth();
    
    // Sidebar Navigation
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            const target = li.getAttribute('data-target');
            if (target) switchSection(target);
        });
    });

    // Mantenedores Tabs
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const onclick = btn.getAttribute('onclick');
            if (onclick) {
                const target = onclick.match(/'([^']+)'/)[1];
                switchMantenedorTab(target);
            }
        });
    });

    // Login Form Submit
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performLogin();
        });
    }
});


// === NAVIGATION LOGIC ===
function switchSection(target) {
    // Esconder todas las secciones main
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    // Quitar active class del sidebar
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
    });

    const targetSection = document.getElementById(target);
    if (targetSection) targetSection.style.display = 'block';

    const navItem = document.querySelector(`.nav-links li[data-target="${target}"]`);
    if (navItem) navItem.classList.add('active');

    // Manejar lógica condicional según sección
    if (target === 'mantenedores') {
        const perfil = localStorage.getItem('perfil');
        if (perfil === 'admin') {
            switchMantenedorTab('empresas');
        } else {
            switchMantenedorTab('gerentes-prevencion');
        }
    } else if (target === 'pagos') {
        if (typeof loadPagos === 'function') loadPagos();
    } else if (target === 'trabajadores') {
        if (typeof loadTrabajadores === 'function') loadTrabajadores();
    } else if (target === 'inspecciones') {
        if (typeof loadInspecciones === 'function') loadInspecciones();
    } else if (target === 'reportes') {
        if (typeof cargarFiltrosAuditoriasGraficos === 'function') cargarFiltrosAuditoriasGraficos();
        if (typeof loadDashboard === 'function') loadDashboard();
    } else if (target === 'epp') {
        if (typeof loadEppSection === 'function') loadEppSection();
    } else if (target === 'karin') {
        if (typeof loadKarinSection === 'function') loadKarinSection();
    } else if (target === 'dashboard') {
        if (typeof loadDashboard === 'function') loadDashboard();
    } else if (target === 'planaccion') {
        if (typeof loadPlanesAccion === 'function') loadPlanesAccion();
    } else if (target === 'maquinaria-obra') {
        if (typeof cargarMaquinaria === 'function') cargarMaquinaria();
        if (typeof cargarObrasMaquinaria === 'function') cargarObrasMaquinaria();
    }
}

function switchMantenedorTab(tabId) {
    const perfil = localStorage.getItem('perfil');

    document.querySelectorAll('.mantenedor-tab').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active', 'btn-primary'));
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.add('btn-secondary'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.style.display = 'block';

    const btn = Array.from(document.querySelectorAll('.tabs .tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
    if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary', 'active');
    }

    if (perfil !== 'admin') {
        const btnEmpresa = document.getElementById('btn-nueva-empresa');
        if (btnEmpresa) btnEmpresa.style.display = 'none';
        
        const btnObra = document.getElementById('btn-nueva-obra');
        if (btnObra) btnObra.style.display = 'none';
    }

    // Load data
    if (tabId === 'empresas') loadEmpresas(perfil);
    if (tabId === 'obras') loadObras(perfil);
    if (tabId === 'gerentes') loadGerentes(perfil);
    if (tabId === 'gerentes-prevencion') loadGerentesPrevencion(perfil);
    if (tabId === 'prevencionistas') loadPrevencionistas(perfil);
    if (tabId === 'jefes-obra') loadJefesObra(perfil);
    if (tabId === 'coordinadores-prevencion') loadCoordinadoresPrevencion(perfil);
    if (tabId === 'config-empresa') loadConfigEmpresa(perfil);
    if (tabId === 'anio-empresas') loadAnioEmpresas();
}

// =============================================
// DASHBOARD - Auditorías Pendientes de Plan
// =============================================
async function loadDashboard() {
    const tbody = document.getElementById('tabla-pendientes-cierre');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Cargando...</td></tr>';

    const perfil = localStorage.getItem('perfil');
    const obraId = localStorage.getItem('obra_id');
    const empresaId = window.currentEmpresaId || localStorage.getItem('empresa_id');

    let url = '/api/auditorias/pendientes-plan?';

    // Prevencionista / jefe_obra → solo su obra
    if (perfil === 'prevencionista' || perfil === 'prevencionista_terreno' || perfil === 'jefe_obra') {
        if (obraId && obraId !== 'None' && obraId !== 'nan') {
            url += `obra_id=${obraId}`;
        }
    } else if (empresaId && empresaId !== 'None' && empresaId !== 'nan') {
        url += `empresa_id=${empresaId}`;
    }

    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#27ae60;">✅ No hay auditorías con planes de acción pendientes.</td></tr>';
        return;
    }

    let html = '';
    data.forEach(row => {
        let estadoBadge = '';
        let rowStyle = '';

        if (row.vencido) {
            estadoBadge = '<span style="background:#dc3545; color:white; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">🔴 VENCIDO</span>';
            rowStyle = 'background: rgba(220,53,69,0.08);';
        } else if (row.horas_restantes <= 24) {
            estadoBadge = `<span style="background:#e67e22; color:white; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">🟠 ${row.horas_restantes.toFixed(0)}h restantes</span>`;
            rowStyle = 'background: rgba(230,126,34,0.08);';
        } else {
            const horas = row.horas_restantes;
            estadoBadge = `<span style="background:#f0ad4e; color:#111; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">🟡 ${horas.toFixed(0)}h restantes</span>`;
        }

        html += `
        <tr style="${rowStyle}">
            <td><strong>${row.obra}</strong></td>
            <td>${row.plantilla}</td>
            <td>${row.fecha_cierre || '—'}</td>
            <td style="text-align:center;">${row.plazo_horas}</td>
            <td>${row.deadline || '—'}</td>
            <td style="text-align:center;">
                <span style="background:rgba(220,53,69,0.2); color:#e74c3c; padding:2px 8px; border-radius:8px; font-weight:600;">
                    ${row.preguntas_sin_plan} / ${row.total_nc}
                </span>
            </td>
            <td>${estadoBadge}</td>
        </tr>`;
    });

    tbody.innerHTML = html;

    // === Gráfico: Planes de Acción Abiertos por Obra ===
    const ctxPlanes = document.getElementById('chartPlanesAccionObra');
    if (ctxPlanes) {
        let planesUrl = '/api/planes_accion?';
        if (empresaId && empresaId !== 'None' && empresaId !== 'nan') planesUrl += `empresa_id=${empresaId}&`;
        if (perfil === 'prevencionista' || perfil === 'prevencionista_terreno' || perfil === 'jefe_obra') {
            if (obraId && obraId !== 'None' && obraId !== 'nan') planesUrl += `obra_id=${obraId}&`;
        }
        
        try {
            const cachePlanesUrl = planesUrl.includes("?") ? `${planesUrl}&_t=${Date.now()}` : `${planesUrl}?_t=${Date.now()}`;
        const planes = await fetchAPI(cachePlanesUrl);
            if (planes && planes.length > 0) {
                // Solo planes abiertos con fecha de cumplimiento
                const abiertos = planes.filter(p => {
                    const estado = (p.estado || 'Abierto').toLowerCase();
                    return estado !== 'cerrado' && p.plazo && String(p.plazo).trim() !== '';
                });
                
                const agrupado = {};
                const hoy = new Date();
                hoy.setHours(0,0,0,0);
                
                abiertos.forEach(p => {
                    const obra = p.obra_nombre || 'Sin Obra';
                    if (!agrupado[obra]) {
                        agrupado[obra] = { en_fecha: 0, vencidos: 0 };
                    }
                    const meta = new Date(p.fecha_cumplimiento);
                    if (meta < hoy) {
                        agrupado[obra].vencidos++;
                    } else {
                        agrupado[obra].en_fecha++;
                    }
                });
                
                const labelsObra = Object.keys(agrupado);
                const dataEnFecha = labelsObra.map(o => agrupado[o].en_fecha);
                const dataVencidos = labelsObra.map(o => agrupado[o].vencidos);
                
                if (window.chartPlanes) window.chartPlanes.destroy();
                window.chartPlanes = new Chart(ctxPlanes.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: labelsObra,
                        datasets: [
                            {
                                label: 'En Fecha',
                                data: dataEnFecha,
                                backgroundColor: '#2ecc71'
                            },
                            {
                                label: 'Fuera de Plazo',
                                data: dataVencidos,
                                backgroundColor: '#e74c3c'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                        }
                    }
                });
            }
        } catch(e) {
            console.error("Error al graficar planes de accion", e);
        }
    }
}

// === GENERIC MODALS ===
function mostrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    
    // Auto-populate selects based on modal
    if (modalId === 'modal-obra' || modalId === 'modal-gerente' || modalId === 'modal-gerente-prevencion') {
        const selectId = modalId === 'modal-obra' ? 'o_empresa_id' : (modalId === 'modal-gerente' ? 'g_empresa_id' : 'gp_empresa_id');
        populateSelect('/api/empresas', selectId, 'nombre');
    }
    if (['modal-prevencionista', 'modal-jefe-obra', 'modal-coordinador-prevencion'].includes(modalId)) {
        const selectId = modalId === 'modal-prevencionista' ? 'p_obra_id' : (modalId === 'modal-jefe-obra' ? 'jo_obra_id' : 'cp_obra_id');
        populateSelect('/api/obras', selectId, 'nombre');
    }
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

async function populateSelect(endpoint, selectId, textKey, forceEmpresaFilter = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    let url = endpoint;
    if (forceEmpresaFilter && window.currentEmpresaId) {
        url += url.includes('?') ? `&empresa_id=${window.currentEmpresaId}` : `?empresa_id=${window.currentEmpresaId}`;
    }
    
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    if (data) {
        data.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = i[textKey];
            select.appendChild(opt);
        });
    }
}

// Generic Submit
async function submitForm(endpoint, data, modalId, reloadFn, method = 'POST') {
    const res = await fetchAPI(endpoint, {
        method: method,
        body: data instanceof FormData ? data : JSON.stringify(data)
    });
    if (res && res.status === 'success') {
        cerrarModal(modalId);
        if (typeof reloadFn === 'function') reloadFn();
    }
}


// === DATA LOADING (MANTENEDORES) ===
async function toggleBloqueoEmpresa(id, estado) {
    if(!confirm(estado === 1 ? '¿Está seguro de BLOQUEAR esta empresa? Nadie podrá ingresar.' : '¿Desbloquear esta empresa?')) return;
    const formData = new FormData();
    formData.append('estado', estado);
    const res = await fetch(`/api/empresas/${id}/bloquear`, { method: 'POST', body: formData });
    if (res.ok) loadEmpresas();
}

async function loadEmpresas(perfil) {
    const data = await fetchAPI('/api/empresas');
    const tbody = document.getElementById('tabla-empresas');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(e => {
            const vigencia = e.fecha_inicio && e.fecha_fin ? `${e.fecha_inicio} a ${e.fecha_fin}` : 'Sin definir';
            let estadoHtml = '';
            if (e.bloqueada && String(e.bloqueada) === '1') {
                estadoHtml = `<span style="color:red; font-weight:bold;">BLOQUEADA</span>`;
                if (perfil === 'admin') estadoHtml += ` <button class="btn-primary btn-sm" style="margin-left:10px;" onclick="toggleBloqueoEmpresa('${e.id}', 0)">Desbloquear</button>`;
            } else {
                estadoHtml = `<span style="color:green; font-weight:bold;">ACTIVA</span>`;
                if (perfil === 'admin') estadoHtml += ` <button class="btn-danger btn-sm" style="margin-left:10px;" onclick="toggleBloqueoEmpresa('${e.id}', 1)">Bloquear</button>`;
            }
            if (perfil === 'admin') {
                estadoHtml += ` <button class="btn-primary btn-sm" style="margin-left:10px;" onclick="openEditEmpresa('${e.id}', '${e.rut}', '${e.nombre}', '${e.fecha_inicio}', '${e.fecha_fin}', '${e.correo_emisor || ''}', '${e.contrasena_app || ''}')">Editar</button>`;
                estadoHtml += ` <button class="btn-secondary btn-sm" style="margin-left:10px; background-color:#28a745; color:white;" onclick="exportarEmpresa('${e.id}')">Exportar</button>`;
                estadoHtml += ` <button class="btn-danger btn-sm" style="margin-left:10px; background-color:#dc3545; color:white;" onclick="wipeEmpresa('${e.id}')">WIPE DATA</button>`;
            }
            
            tbody.innerHTML += `<tr><td>${formatearRut(e.rut)}</td><td>${(e.nombre || '').toString().toUpperCase()}</td><td>${vigencia}</td><td>${estadoHtml}</td></tr>`;
        });
    }
}

async function loadObras() {
    const data = await fetchAPI('/api/obras');
    const tbody = document.getElementById('tabla-obras');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(o => {
            tbody.innerHTML += `<tr><td>${o.empresa_id ? o.empresa_id.substring(0,4).toUpperCase() : ''}</td><td>${(o.nombre || '').toString().toUpperCase()}</td><td>${(o.ubicacion || '').toString().toUpperCase()}</td></tr>`;
        });
    }
}

async function loadGerentes() {
    const data = await fetchAPI('/api/gerentes');
    const tbody = document.getElementById('tabla-gerentes');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(i => tbody.innerHTML += `<tr><td>${i.empresa_id ? i.empresa_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('gerentes', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.empresa_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('gerentes', '${i.id}')">Eliminar</button></td></tr>`);
    }
}

async function loadGerentesPrevencion() {
    const data = await fetchAPI('/api/gerentes-prevencion');
    const tbody = document.getElementById('tabla-gerentes-prevencion');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(i => tbody.innerHTML += `<tr><td>${i.empresa_id ? i.empresa_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('gerentes-prevencion', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.empresa_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('gerentes-prevencion', '${i.id}')">Eliminar</button></td></tr>`);
    }
}

async function loadPrevencionistas() {
    const data = await fetchAPI('/api/prevencionistas');
    const tbody = document.getElementById('tabla-prevencionistas');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(i => tbody.innerHTML += `<tr><td>${i.obra_id ? i.obra_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('prevencionistas', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.obra_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('prevencionistas', '${i.id}')">Eliminar</button></td></tr>`);
    }
}

async function loadJefesObra() {
    const data = await fetchAPI('/api/jefes-obra');
    const tbody = document.getElementById('tabla-jefes-obra');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(i => tbody.innerHTML += `<tr><td>${i.obra_id ? i.obra_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('jefes-obra', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.obra_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('jefes-obra', '${i.id}')">Eliminar</button></td></tr>`);
    }
}

async function loadCoordinadoresPrevencion() {
    const data = await fetchAPI('/api/coordinadores-prevencion');
    const tbody = document.getElementById('tabla-coordinadores-prevencion');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(i => tbody.innerHTML += `<tr><td>${i.obra_id ? i.obra_id.substring(0,4).toUpperCase() : ''}</td><td>${formatearRut(i.rut)}</td><td>${(i.nombre || '').toString().toUpperCase()}</td><td>${i.correo}</td><td><button class="btn-primary btn-sm" onclick="openEditUser('coordinadores-prevencion', '${i.id}', '${i.rut}', '${i.nombre}', '${i.correo}', '${i.obra_id}')">Editar</button> <button class="btn-danger btn-sm" onclick="deleteUser('coordinadores-prevencion', '${i.id}')">Eliminar</button></td></tr>`);
    }
}

// === AÑO INICIO EMPRESAS ===
async function loadAnioEmpresas() {
    const tbody = document.getElementById('tabla-anio-empresas');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Cargando...</td></tr>';

    const perfil = localStorage.getItem('perfil');
    const empresaId = window.currentEmpresaId;

    let data = await fetchAPI('/api/empresas');
    if (!data) { tbody.innerHTML = ''; return; }

    // Filtrar por empresa si el perfil no es admin
    if (perfil !== 'admin' && empresaId) {
        data = data.filter(e => String(e.id) === String(empresaId));
    }

    tbody.innerHTML = '';
    data.forEach(e => {
        const anio = e.anio_inicio || '';
        tbody.innerHTML += `
            <tr>
                <td><strong>${(e.nombre || '').toUpperCase()}</strong></td>
                <td>
                    <input type="number" id="anio_input_${e.id}" value="${anio}"
                        min="2000" max="2100" placeholder="Ej: 2024"
                        style="width:120px; padding:6px; border:1px solid #ccc; border-radius:6px;"
                    />
                </td>
                <td>
                    <button class="btn-primary btn-sm" onclick="guardarAnioEmpresa('${e.id}')">
                        Guardar
                    </button>
                </td>
            </tr>`;
    });
}

async function guardarAnioEmpresa(empresaId) {
    const input = document.getElementById(`anio_input_${empresaId}`);
    if (!input) return;
    const anio = input.value.trim();
    if (!anio || isNaN(anio) || anio.length !== 4) {
        alert('Ingrese un año válido de 4 dígitos (ej: 2024)');
        return;
    }
    const formData = new FormData();
    formData.append('anio_inicio', anio);
    try {
        const res = await fetch(`/api/empresas/${empresaId}/anio`, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.status === 'success') {
            // Visual feedback
            input.style.borderColor = '#27ae60';
            setTimeout(() => { input.style.borderColor = '#ccc'; }, 2000);
        } else {
            alert(result.message || 'Error al guardar');
        }
    } catch(e) {
        alert('Error de conexión');
    }
}

async function loadTrabajadores() {
    let url = '/api/trabajadores';
    if (currentObraId && currentObraId !== "None" && currentObraId !== "nan") url += `?obra_id=${currentObraId}`; else if (window.currentEmpresaId) url += `?empresa_id=${window.currentEmpresaId}`;
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    const tbody = document.getElementById('tabla-trabajadores');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (data) {
        data.forEach(t => {
            const badgeClass = t.odi_firmado ? 'badge-success' : 'badge-danger';
            const badgeText = t.odi_firmado ? 'Firmado' : 'Pendiente';
            let actionBtn = '';
            if (!t.odi_firmado) {
                actionBtn = `<button class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="iniciarFirmaOdi(${t.id}, '${t.nombre}')">Firmar ODI</button>`;
            } else {
                actionBtn = `<span class="badge-success" style="font-size: 0.8rem; padding: 2px 6px;">Completado</span>`;
            }
            tbody.innerHTML += `<tr>
                <td>${formatearRut(t.rut)}</td>
                <td>${t.nombre}</td>
                <td>${t.cargo}</td>
                <td>${t.obra_nombre || t.obra_id || 'N/A'}</td>
                <td><span class="${badgeClass}">${badgeText}</span></td>
                <td>${actionBtn}</td>
            </tr>`;
        });
    }
}

async function iniciarFirmaOdi(trabajadorId, nombre) {
    const metodo = prompt(`El trabajador ${nombre} debe firmar el ODI.\n¿Enviar código OTP por 'email' o 'telefono'?`, 'email');
    if (!metodo) return;
    if (metodo !== 'email' && metodo !== 'telefono') {
        alert("Método inválido. Debe ser 'email' o 'telefono'");
        return;
    }
    
    const res = await fetchAPI('/api/entregas/solicitar-codigo', {
        method: 'POST',
        body: JSON.stringify({
            trabajador_id: trabajadorId,
            tipo_documento: 'ODI',
            descripcion: 'Obligación de Informar (ODI) 2026',
            metodo_envio: metodo,
            empresa_id: window.currentEmpresaId
        })
    });
    if (res && res.status === 'success') {
        abrirModalVerificarOtp(res.entrega_id);
    }
}

function abrirModalVerificarOtp(entregaId) {
    document.getElementById('otp_entrega_id').value = entregaId;
    document.getElementById('otp_codigo').value = '';
    mostrarModal('modal-firma-otp');
}


// === FORM EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('form-empresa')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rutVal = document.getElementById('e_rut').value;
        if (!validarRut(rutVal)) {
            alert("RUT inválido"); return;
        }
        const formData = new FormData();
        formData.append('rut', formatearRut(rutVal));
        formData.append('nombre', document.getElementById('e_nombre').value);
        const logo = document.getElementById('e_logo').files[0];
        if (logo) formData.append('logo', logo);
        const correo = document.getElementById('e_correo').value;
        const pwd = document.getElementById('e_contrasena').value;
        if (correo) formData.append('correo_emisor', correo);
        if (pwd) formData.append('contrasena_app', pwd);
        formData.append('fecha_inicio', document.getElementById('e_fecha_inicio').value);
        formData.append('fecha_fin', document.getElementById('e_fecha_fin').value);
        
        const editId = document.getElementById('edit_empresa_id').value;
        const url = editId ? `/api/empresas/${editId}` : '/api/empresas';
        const method = editId ? 'PUT' : 'POST';

        const res = await fetch(url, { method: method, body: formData });
        if(res.ok) { 
            cerrarModal('modal-empresa'); 
            const perfil = localStorage.getItem('perfil');
            loadEmpresas(perfil); 
        } else {
            const data = await res.json();
            alert(data.detail || "Error al guardar la empresa");
        }
    });

    document.getElementById('form-obra')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            empresa_id: document.getElementById('o_empresa_id').value,
            nombre: document.getElementById('o_nombre').value,
            ubicacion: document.getElementById('o_ubicacion').value
        };
        submitForm('/api/obras', data, 'modal-obra', loadObras);
    });

    document.getElementById('form-gerente')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            empresa_id: document.getElementById('g_empresa_id').value,
            rut: formatearRut(document.getElementById('g_rut').value),
            nombre: document.getElementById('g_nombre').value,
            correo: document.getElementById('g_correo').value
        };
        submitForm('/api/gerentes', data, 'modal-gerente', loadGerentes);
    });

    document.getElementById('form-gerente-prevencion')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            empresa_id: document.getElementById('gp_empresa_id').value,
            rut: formatearRut(document.getElementById('gp_rut').value),
            nombre: document.getElementById('gp_nombre').value,
            correo: document.getElementById('gp_correo').value
        };
        submitForm('/api/gerentes-prevencion', data, 'modal-gerente-prevencion', loadGerentesPrevencion);
    });

    document.getElementById('form-prevencionista')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            obra_id: document.getElementById('p_obra_id').value,
            rut: formatearRut(document.getElementById('p_rut').value),
            nombre: document.getElementById('p_nombre').value,
            correo: document.getElementById('p_correo').value
        };
        submitForm('/api/prevencionistas', data, 'modal-prevencionista', loadPrevencionistas);
    });

    document.getElementById('form-jefe-obra')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            obra_id: document.getElementById('jo_obra_id').value,
            rut: formatearRut(document.getElementById('jo_rut').value),
            nombre: document.getElementById('jo_nombre').value,
            correo: document.getElementById('jo_correo').value
        };
        submitForm('/api/jefes-obra', data, 'modal-jefe-obra', loadJefesObra);
    });
    
    document.getElementById('form-coordinador-prevencion')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const cp_select = document.getElementById('cp_obra_id');
        const selectedObras = Array.from(cp_select.selectedOptions).map(opt => opt.value).join(',');
        const data = {
            obra_id: selectedObras,
            rut: formatearRut(document.getElementById('cp_rut').value),
            nombre: document.getElementById('cp_nombre').value,
            correo: document.getElementById('cp_correo').value
        };
        submitForm('/api/coordinadores-prevencion', data, 'modal-coordinador-prevencion', loadCoordinadoresPrevencion);
    });

    document.getElementById('form-trabajador')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            rut: formatearRut(document.getElementById('t_rut').value),
            nombre: document.getElementById('t_nombre').value,
            cargo: document.getElementById('t_cargo').value,
            obra_id: document.getElementById('t_obra_id').value,
            email: document.getElementById('t_email').value || null,
            telefono: document.getElementById('t_telefono').value,
            empresa_id: window.currentEmpresaId || null
        };
        submitForm('/api/trabajadores', data, 'modal-trabajador', loadTrabajadores);
    });

    document.getElementById('form-pago')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.currentEmpresaId) return;
        const data = {
            empresa_id: window.currentEmpresaId,
            numero_factura: document.getElementById('p_numero_factura').value,
            monto: document.getElementById('p_monto').value,
            fecha_pago: document.getElementById('p_fecha_pago').value
        };
        submitForm('/api/pagos', data, 'modal-pago', loadPagos);
    });
    
    document.getElementById('form-firma-otp')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entregaId = document.getElementById('otp_entrega_id').value;
        const codigo = document.getElementById('otp_codigo').value.trim();
        
        const res = await fetchAPI('/api/entregas/validar-codigo', {
            method: 'POST',
            body: JSON.stringify({ entrega_id: entregaId, codigo: codigo })
        });
        
        if (res && res.status === 'success') {
            alert("Firma electrónica simple validada correctamente.");
            cerrarModal('modal-firma-otp');
            if (typeof loadTrabajadores === 'function') loadTrabajadores();
            if (typeof loadEppSection === 'function') loadEppSection();
        }
    });
});

// Helper para formatear todos los RUTs ingresados on the fly
document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.id.includes('rut')) {
        let val = e.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
        if(val.length > 1) {
            e.target.value = formatearRut(val);
        }
    }
});


// === MODULES: EPP, KARIN, INSPECCIONES, REPORTES ===

async function loadEppSection() {
    const tbody = document.getElementById('tabla-epp');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando EPP...</td></tr>';
    
    const url = window.currentEmpresaId ? `/api/epp/stock?empresa_id=${window.currentEmpresaId}` : '/api/epp/stock';
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    tbody.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(e => {
            tbody.innerHTML += `<tr>
                <td>${e.id}</td>
                <td>${e.nombre}</td>
                <td>${e.tipo}</td>
                <td>${e.talla || 'N/A'}</td>
                <td>${e.stock_disponible}</td>
                <td>
                    <button class="btn-primary" onclick="mostrarModal('modal-epp-stock')">Ajustar Stock</button>
                </td>
            </tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay EPP registrados.</td></tr>';
    }
}

async function loadInspecciones() {
    toggleView('audit-history');
}

function toggleView(viewName) {
    const perfil = localStorage.getItem('perfil');
    if ((perfil === 'prevencionista' || perfil === 'jefe_obra') && (viewName === 'audit-execute' || viewName === 'audit-builder')) {
        alert("No tiene permisos para acceder a este módulo.");
        return;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        if(!btn.classList.contains('btn-secondary')) btn.classList.add('btn-secondary');
    });
    
    // Ocultar botones si no tienen permisos
    if (perfil === 'prevencionista' || perfil === 'jefe_obra') {
        const btnExecute = document.getElementById('btn-view-execute');
        if (btnExecute) btnExecute.style.display = 'none';
        const btnBuilder = document.getElementById('btn-view-builder');
        if (btnBuilder) btnBuilder.style.display = 'none';
    }

    const activeBtn = document.getElementById(`btn-view-${viewName.replace('audit-', '')}`);
    if (activeBtn) {
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add('btn-primary', 'active');
    }
    
    document.getElementById('view-audit-history').style.display = 'none';
    document.getElementById('view-audit-execute').style.display = 'none';
    document.getElementById('view-audit-builder').style.display = 'none';
    
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.style.display = 'block';
    
    if (viewName === 'audit-history') {
        loadHistorialAuditorias();
    } else if (viewName === 'audit-execute') {
        populateSelect('/api/obras', 'audit_obra_id', 'nombre');
        populateSelect('/api/auditorias/plantillas', 'audit_plantilla_id', 'nombre');
    } else if (viewName === 'audit-builder') {
        if (typeof loadExistingTemplatesEditor === 'function') {
            loadExistingTemplatesEditor();
        }
    }
}

async function loadHistorialAuditorias() {
    let url = '/api/auditorias/historial';
    if (currentObraId && currentObraId !== "None" && currentObraId !== "nan") url += `?obra_id=${currentObraId}`; else if (window.currentEmpresaId) url += `?empresa_id=${window.currentEmpresaId}`;
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    const tbody = document.getElementById('tabla-historial-auditorias');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay auditorías registradas</td></tr>';
        return;
    }
    
    data.forEach(a => {
        const c = a.cumple || 0;
        const n = a.no_cumple || 0;
        const na = a.na || 0;
        const total = c + n; // Se excluyen las 'N/A' del total
        const pct = total > 0 ? Math.round((c / total) * 100) : 0;
        
        let actionButtons = `<button class="btn-primary" onclick="verDetalleAuditoria('${a.id}', '${a.estado}')">Ver Detalles</button>`;
        if (a.estado === 'Finalizada' && n > 0) {
            actionButtons += ` <button class="btn-secondary" style="background-color: #f39c12; color: white; border: none; margin-left: 5px;" onclick="abrirIngresoPlanes('${a.id}')">Planes</button>`;
        }
        
        tbody.innerHTML += `<tr>
            <td>${a.date || 'N/A'}</td>
            <td>${a.project || a.obra_id || 'N/A'}</td>
            <td>${a.plantilla_nombre || 'N/A'}</td>
            <td>${pct}%</td>
            <td>C: ${c} | N: ${n} | NA: ${na}</td>
            <td>${a.estado || 'EN CURSO'}</td>
            <td>${actionButtons}</td>
        </tr>`;
    });
}

async function verDetalleAuditoria(id, estadoArg) {
    const data = await fetchAPI(`/api/auditorias/historial/${id}`);
    if (!data) return;
    
    // Configurar estado global
    window.currentAuditoriaId = data.id;
    window.currentAuditData = data;

    const btnFirmar = document.getElementById('btn-proceder-firmar');
    if (btnFirmar) btnFirmar.style.display = 'block';

    if (estadoArg === 'Finalizada' || data.estado === 'Finalizada' || data.estado_cierre === 'Cerrado' || (estadoArg && estadoArg.toLowerCase() === 'planes aprobados') || (data.estado && data.estado.toLowerCase() === 'planes aprobados')) {
        const metaContainer = document.getElementById('review-audit-metadata');
        metaContainer.innerHTML = `
            <div><strong>Obra ID:</strong> ${data.obra_id}</div>
            <div><strong>Prevencionista ID:</strong> ${data.prevencionista_id || 'N/A'}</div>
            <div><strong>Total Respuestas:</strong> ${data.respuestas ? data.respuestas.length : 0}</div>
            <div><strong>Estado:</strong> ${data.estado || 'Finalizada'}</div>
        `;
        
        const qContainer = document.getElementById('review-audit-questions');
        let qHtml = '';
        if (data.respuestas) {
            data.respuestas.forEach(r => {
                let color = 'var(--text-color)';
                if (r.estado === 'Cumple') color = '#27ae60';
                if (r.estado === 'No Cumple') color = '#c0392b';
                if (r.estado === 'N/A') color = '#7f8c8d';
                
                qHtml += `
                    <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                        <p style="margin: 0 0 5px 0;"><strong>Pregunta ID: ${r.pregunta_id}</strong></p>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold; color: ${color};">${r.estado}</span>
                            <span style="color: var(--text-color); font-style: italic;">${r.observacion || 'Sin observaciones'}</span>
                        </div>
                    </div>
                `;
            });
        }
        qContainer.innerHTML = qHtml;
        
        if (btnFirmar) btnFirmar.style.display = 'none';
        
        mostrarModal('modal-revisar-auditoria');
        return;
    }

    
    // Poblar selects (opcional, pero útil si se requiere enviar de nuevo)
    populateSelect('/api/obras', 'audit_obra_id', 'nombre').then(() => {
        document.getElementById('audit_obra_id').value = data.obra_id;
    });
    populateSelect('/api/auditorias/plantillas', 'audit_plantilla_id', 'nombre').then(() => {
        document.getElementById('audit_plantilla_id').value = data.plantilla_id;
    });
    
    const prevField = document.getElementById('audit_prevencionista_id');
    if (prevField && data.prevencionista_id) prevField.value = data.prevencionista_id;
    
    // Cambiar vista manualmente a form
    document.getElementById('view-audit-history').style.display = 'none';
    document.getElementById('view-audit-execute').style.display = 'block';
    document.getElementById('view-audit-builder').style.display = 'none';
    
    document.getElementById('audit-setup-container').style.display = 'none';
    document.getElementById('audit-form-container').style.display = 'block';
    
    await loadFormTemplate(data.plantilla_id);
    
    // Poblar las respuestas previas
    if (data.respuestas && data.respuestas.length > 0) {
        const questions = document.querySelectorAll('.audit-question');
        questions.forEach(q => {
            const pregId = q.dataset.id;
            const resp = data.respuestas.find(r => String(r.pregunta_id) === String(pregId));
            if (resp) {
                const select = q.querySelector('.pregunta-estado');
                const input = q.querySelector('.pregunta-obs');
                if (select) select.value = resp.estado || '';
                if (input) input.value = resp.observacion || '';
            }
        });
    }
}

async function loadKarinSection() {
    const tbody = document.getElementById('tabla-karin');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando Denuncias...</td></tr>';
    
    let url = '/api/denuncias-karin';
    if (currentObraId && currentObraId !== "None" && currentObraId !== "nan") url += `?obra_id=${currentObraId}`; else if (window.currentEmpresaId) url += `?empresa_id=${window.currentEmpresaId}`;
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    tbody.innerHTML = '';
    
    if (data && data.length > 0) {
        data.forEach(k => {
            const estadoHtml = k.estado === 'CERRADA' ? `<span class="badge-success">Cerrada</span>` : `<span class="badge-danger">${k.estado}</span>`;
            tbody.innerHTML += `<tr>
                <td>${k.id}</td>
                <td>${k.fecha_denuncia}</td>
                <td>${k.denunciante_nombre || 'Anónimo'}</td>
                <td>${estadoHtml}</td>
                <td><button class="btn-primary" onclick="alert('Ver detalles de denuncia ${k.id}')">Ver Detalles</button></td>
            </tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay denuncias Ley Karin registradas.</td></tr>';
    }
}

// === Carga Inicial y Config ===
document.addEventListener('DOMContentLoaded', () => {
    // Cargar empresas al inicio si estamos en mantenedores
    if (document.getElementById('mantenedores') && document.getElementById('mantenedores').style.display !== 'none') {
        cargarSelectorEmpresasGlobal();
    }

});


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
        body: JSON.stringify({ empresa_id: window.currentEmpresaId, plazo_dias: parseInt(horas) })
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
        body: JSON.stringify({ empresa_id: window.currentEmpresaId, rol: rol })
    });
    if (res) {
        cerrarModal('modal-correo-terminada');
        document.getElementById('ct_nombre').value = '';
        loadConfigEmpresa();
    }
}

async function guardarCorreoCerrada() {
    if (!window.currentEmpresaId) return alert('Seleccione una empresa activa primero.');
    const rol = document.getElementById('cc_nombre').value;
    const res = await fetchAPI('/api/correos-cerrada', {
        method: 'POST',
        body: JSON.stringify({ empresa_id: window.currentEmpresaId, rol: rol })
    });
    if (res) {
        cerrarModal('modal-correo-cerrada');
        document.getElementById('cc_nombre').value = '';
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

// Soft Delete & Edit Logic
async function deleteUser(type, id) {
    if (!confirm('¿Estás seguro de desactivar/eliminar a este usuario?')) return;
    const res = await fetchAPI(`/api/${type}/${id}`, { method: 'DELETE' });
    if (res && res.status === 'success') {
        alert('Usuario eliminado lógicamente.');
        if (type === 'gerentes') loadGerentes();
        if (type === 'gerentes-prevencion') loadGerentesPrevencion();
        if (type === 'prevencionistas') loadPrevencionistas();
        if (type === 'jefes-obra') loadJefesObra();
        if (type === 'coordinadores-prevencion') loadCoordinadoresPrevencion();
    }
}

function exportarEmpresa(id) {
    window.open(`/api/empresas/${id}/exportar`, '_blank');
}

async function wipeEmpresa(id) {
    const confirmation = prompt('PELIGRO: Estás a punto de borrar TODOS los datos operativos, obras, usuarios y auditorías de esta empresa. Esta acción es IRREVERSIBLE. Escribe CONFIRMAR para proceder:');
    if (confirmation === 'CONFIRMAR') {
        const res = await fetch(`/api/empresas/${id}/wipe`, { method: 'DELETE' });
        if (res.ok) {
            alert('Datos eliminados correctamente.');
            loadEmpresas('admin');
        } else {
            alert('Error al eliminar los datos.');
        }
    } else {
        alert('Operación cancelada.');
    }
}


function openEditEmpresa(id, rut, nombre, fecha_inicio, fecha_fin, correo_emisor, contrasena_app) {
    document.getElementById('modal-empresa-title').innerText = "Editar Empresa";
    document.getElementById('edit_empresa_id').value = id;
    document.getElementById('e_rut').value = rut;
    document.getElementById('e_nombre').value = nombre;
    document.getElementById('e_fecha_inicio').value = fecha_inicio;
    document.getElementById('e_fecha_fin').value = fecha_fin;
    document.getElementById('e_correo').value = correo_emisor !== 'undefined' ? correo_emisor : '';
    document.getElementById('e_contrasena').value = ''; // Don't pre-fill password for security, let them type a new one if they want to change it
    mostrarModal('modal-empresa');
}

async function openEditUser(type, id, rut, nombre, correo, ref_id) {
    document.getElementById('edit_user_id').value = id;
    document.getElementById('edit_user_type').value = type;
    document.getElementById('edit_rut').value = rut;
    document.getElementById('edit_nombre').value = nombre;
    document.getElementById('edit_correo').value = correo;
    
    document.getElementById('edit_obra_group').style.display = 'none';
    document.getElementById('edit_empresa_group').style.display = 'none';
    
    if (type === 'gerentes' || type === 'gerentes-prevencion') {
        document.getElementById('edit_empresa_group').style.display = 'block';
        const select = document.getElementById('edit_empresa_id');
        const data = await fetchAPI('/api/empresas');
        select.innerHTML = '';
        if (data) data.forEach(e => select.innerHTML += `<option value="${e.id}">${e.nombre}</option>`);
        select.value = ref_id;
    } else {
        document.getElementById('edit_obra_group').style.display = 'block';
        const select = document.getElementById('edit_obra_id');
        let endpoint = '/api/obras';
        if (window.currentEmpresaId) endpoint += `?empresa_id=${window.currentEmpresaId}`;
        const data = await fetchAPI(endpoint);
        select.innerHTML = '';
        if (data) data.forEach(o => select.innerHTML += `<option value="${o.id}">${o.nombre}</option>`);
        select.value = ref_id;
    }
    
    mostrarModal('modal-edit-user');
}

document.getElementById('form-edit-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('edit_user_type').value;
    const id = document.getElementById('edit_user_id').value;
    
    const data = {
        rut: document.getElementById('edit_rut').value,
        nombre: document.getElementById('edit_nombre').value,
        correo: document.getElementById('edit_correo').value,
    };
    
    if (type === 'gerentes' || type === 'gerentes-prevencion') {
        data.empresa_id = document.getElementById('edit_empresa_id').value;
    } else {
        data.obra_id = document.getElementById('edit_obra_id').value;
    }
    
    const res = await fetchAPI(`/api/${type}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    
    if (res && res.status === 'success') {
        cerrarModal('modal-edit-user');
        if (type === 'gerentes') loadGerentes();
        if (type === 'gerentes-prevencion') loadGerentesPrevencion();
        if (type === 'prevencionistas') loadPrevencionistas();
        if (type === 'jefes-obra') loadJefesObra();
        if (type === 'coordinadores-prevencion') loadCoordinadoresPrevencion();
    }
});

// === CREADOR DE FORMULARIOS (BUILDER) ===
let builderCategoryCounter = 0;
let builderQuestionCounter = 0;

function addBuilderCategory() {
    builderCategoryCounter++;
    const catId = `cat-${builderCategoryCounter}`;
    const html = `
        <div id="${catId}" style="border: 1px solid #444; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: rgba(255,255,255,0.02);">
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <input type="text" placeholder="Nombre de Categoría (Ej: Nivel 1)" style="flex: 1; padding: 8px;" class="cat-name input-dark">
                <button type="button" class="btn-danger" onclick="document.getElementById('${catId}').remove()">Eliminar Nivel</button>
            </div>
            <div class="questions-container" style="margin-left: 20px; display: flex; flex-direction: column; gap: 5px;"></div>
            <button type="button" class="btn-secondary" style="margin-top: 10px; margin-left: 20px; font-size: 0.8rem;" onclick="addBuilderQuestion('${catId}')">+ Agregar Pregunta</button>
        </div>
    `;
    document.getElementById('builder-categories').insertAdjacentHTML('beforeend', html);
}

function addBuilderQuestion(catId) {
    builderQuestionCounter++;
    const qId = `q-${builderQuestionCounter}`;
    const container = document.querySelector(`#${catId} .questions-container`);
    const html = `
        <div id="${qId}" style="display: flex; gap: 10px; align-items: center;">
            <span style="color: #888;">Pregunta:</span>
            <input type="text" placeholder="Texto de la pregunta..." style="flex: 1; padding: 6px;" class="q-text input-dark">
            <button type="button" class="btn-danger" style="padding: 5px 10px;" onclick="document.getElementById('${qId}').remove()">X</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

async function guardarPlantilla() {
    const idPlantilla = document.getElementById('builder_plantilla_id').value;
    const nombre = document.getElementById('builder_nombre').value;
    if (!nombre) return alert("Ingrese un nombre para la plantilla");
    
    const categorias = [];
    document.querySelectorAll('#builder-categories > div').forEach((catDiv, idx) => {
        const catName = catDiv.querySelector('.cat-name').value || `Nivel ${idx+1}`;
        const preguntas = [];
        catDiv.querySelectorAll('.questions-container > div').forEach((qDiv, qIdx) => {
            const qText = qDiv.querySelector('.q-text').value;
            if (qText) {
                preguntas.push({ texto: qText, orden: qIdx+1, tipo: 'opcion_multiple' });
            }
        });
        categorias.push({ nombre: catName, orden: idx+1, preguntas: preguntas });
    });
    
    if (categorias.length === 0) return alert("Agregue al menos una categoría con preguntas.");
    
    const payload = {
        empresa_id: window.currentEmpresaId,
        nombre: nombre,
        categorias: categorias
    };
    
    let url = '/api/auditorias/plantillas';
    let method = 'POST';
    if (idPlantilla) {
        url = `/api/auditorias/plantillas/${idPlantilla}`;
        method = 'PUT';
    }
    
    const res = await fetchAPI(url, {
        method: method,
        body: JSON.stringify(payload)
    });
    
    if (res && res.status === 'success') {
        alert("Plantilla guardada correctamente.");
        cancelarEdicionPlantilla();
        loadExistingTemplatesEditor();
    }
}

function cancelarEdicionPlantilla() {
    document.getElementById('builder_plantilla_id').value = '';
    document.getElementById('builder_nombre').value = '';
    document.getElementById('builder-categories').innerHTML = '';
    builderCategoryCounter = 0;
    builderQuestionCounter = 0;
    // Evitar que la pantalla se vuelva negra:
    document.getElementById('builder-title').scrollIntoView({ behavior: 'smooth' });
}








// === NUEVO FLUJO DE AUDITORIA E HISTORIAL ===
async function iniciarAuditoria() {
    if (!window.currentEmpresaId) return alert("Seleccione una empresa");
    const obraId = document.getElementById('audit_obra_id').value;
    const plantillaId = document.getElementById('audit_plantilla_id').value;
    const prevencionistaId = document.getElementById('audit_prevencionista_id').value;
    const jefeObraId = document.getElementById('audit_jefe_obra_id').value;
    
    if(!obraId || !plantillaId) return alert("Seleccione obra y plantilla");
    if(!prevencionistaId) return alert("Seleccione al Prevencionista a auditar");
    if(!jefeObraId) return alert("Seleccione al Administrador de Obra a auditar");
    
    const payload = {
        empresa_id: window.currentEmpresaId,
        plantilla_id: plantillaId,
        obra_id: obraId,
        prevencionista_id: prevencionistaId,
        jefe_obra_id: jefeObraId,
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

async function loadFormTemplate(plantillaId) {
    const data = await fetchAPI(`/api/auditorias/plantillas/${plantillaId}`);
    if (!data) return;
    
    const titleEl = document.getElementById('audit-title');
    if (titleEl) titleEl.textContent = `Ejecutando Auditoría: ${data.nombre}`;
    
    const container = document.getElementById('audit-categories');
    if (!container) return;
    container.innerHTML = '';
    
    if (!data.categorias || data.categorias.length === 0) {
        container.innerHTML = '<p>No hay preguntas en esta plantilla.</p>';
        return;
    }
    
    data.categorias.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'audit-category';
        catDiv.style.marginBottom = '20px';
        catDiv.innerHTML = `<h3 style="background: var(--bg-card); padding: 10px; border-radius: 4px; color: var(--primary-color);">${cat.nombre}</h3>`;
        
        if (cat.preguntas && cat.preguntas.length > 0) {
            cat.preguntas.forEach(preg => {
                const pregDiv = document.createElement('div');
                pregDiv.className = 'audit-question';
                pregDiv.style.padding = '15px';
                pregDiv.style.borderBottom = '1px solid var(--bg-hover)';
                pregDiv.dataset.id = preg.id;
                
                pregDiv.innerHTML = `
                    <p style="margin-bottom: 8px;"><strong>${preg.texto}</strong></p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <select class="pregunta-estado input-field" required style="width: 150px;">
                            <option value="">Seleccione estado...</option>
                            <option value="Cumple">Cumple</option>
                            <option value="No Cumple">No Cumple</option>
                            <option value="N/A">N/A</option>
                        </select>
                        <input type="text" class="pregunta-obs input-field" placeholder="Observaciones..." style="flex: 1; min-width: 200px;" />
                    </div>
                `;
                catDiv.appendChild(pregDiv);
            });
        }
        container.appendChild(catDiv);
    });
}

function collectAuditResponses() {
    const respuestas = [];
    const questions = document.querySelectorAll('.audit-question');
    questions.forEach(q => {
        const id = q.dataset.id;
        const estado = q.querySelector('.pregunta-estado').value;
        const obs = q.querySelector('.pregunta-obs').value;
        if (estado) {
            respuestas.push({
                pregunta_id: id,
                estado: estado,
                observacion: obs
            });
        }
    });
    return respuestas;
}

function cancelarAuditoria() {
    if(confirm('¿Está seguro que desea cancelar? Se perderá el progreso no guardado.')) {
        document.getElementById('audit-form-container').style.display = 'none';
        document.getElementById('audit-setup-container').style.display = 'block';
        window.currentAuditoriaId = null;
    }
}

async function guardarAuditoriaEnProceso() {
    await guardarParcialmenteAuditoria();
    document.getElementById('audit-form-container').style.display = 'none';
    document.getElementById('audit-setup-container').style.display = 'block';
    window.currentAuditoriaId = null;
    toggleView('audit-history');
}

async function guardarParcialmenteAuditoria() {
    if (!window.currentAuditoriaId) return;
    const respuestas = collectAuditResponses();
    const payload = {
        auditoria_id: window.currentAuditoriaId,
        plantilla_id: document.getElementById('audit_plantilla_id').value,
        obra_id: document.getElementById('audit_obra_id').value,
        prevencionista_id: document.getElementById('audit_prevencionista_id').value,
        jefe_obra_id: document.getElementById('audit_jefe_obra_id').value,
        auditor_tipo: userProfile,
        auditor_id: currentPrevencionistaId || 'admin',
        estado: "EN CURSO",
        respuestas: respuestas
    };
    const res = await fetchAPI('/api/auditorias/respuestas', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (res && res.status === 'success') {
        alert("Avance guardado correctamente.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-auditoria');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            mostrarRevisionAuditoria();
        });
    }
});

function mostrarRevisionAuditoria() {
    const respuestas = collectAuditResponses();
    const questions = document.querySelectorAll('.audit-question');
    
    // Inject metadata
    const metaContainer = document.getElementById('review-audit-metadata');
    const obraSelect = document.getElementById('audit_obra_id');
    const prevSelect = document.getElementById('audit_prevencionista_id');
    
    let obraNombre = obraSelect.options[obraSelect.selectedIndex]?.text || '';
    let prevNombre = prevSelect.options[prevSelect.selectedIndex]?.text || '';
    
    metaContainer.innerHTML = `
        <div><strong>Obra:</strong> ${obraNombre}</div>
        <div><strong>Prevencionista a auditar:</strong> ${prevNombre}</div>
        <div><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</div>
        <div><strong>Total Respuestas:</strong> ${respuestas.length}</div>
    `;
    
    // Inject questions
    const qContainer = document.getElementById('review-audit-questions');
    let qHtml = '';
    
    respuestas.forEach(r => {
        // Find the question text
        const qDiv = Array.from(questions).find(div => div.dataset.id === String(r.pregunta_id));
        const text = qDiv ? qDiv.querySelector('strong').innerText : 'Pregunta desconocida';
        
        let color = 'var(--text-color)';
        if (r.estado === 'Cumple') color = '#27ae60';
        if (r.estado === 'No Cumple') color = '#c0392b';
        if (r.estado === 'N/A') color = '#7f8c8d';
        
        qHtml += `
            <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                <p style="margin: 0 0 5px 0;"><strong>${text}</strong></p>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: bold; color: ${color};">${r.estado}</span>
                    <span style="color: var(--text-color); font-style: italic;">${r.observacion || 'Sin observaciones'}</span>
                </div>
            </div>
        `;
    });
    
    qContainer.innerHTML = qHtml;
    
    mostrarModal('modal-revisar-auditoria');
}

function descargarPDFAuditoria() {
    generarReportePDF("download");
}

function abrirFirmaAuditoria() {
    cerrarModal('modal-revisar-auditoria');
    mostrarModal('modal-aprobar-cierre');
}

function solicitarCierreAuditoria() {
    mostrarModal('modal-aprobar-cierre');
}

async function confirmarCierreAuditoria() {
    const coordRut = document.getElementById('firma_coord_rut').value;
    const coordClave = document.getElementById('firma_coord_clave').value;
    const prevRut = document.getElementById('firma_prev_rut').value;
    const prevClave = document.getElementById('firma_prev_clave').value;
    
    if(!coordRut || !coordClave || !prevRut || !prevClave) return alert("Debe ingresar RUT y clave de ambos responsables");
    
    // Enviar las respuestas definitivas primero
    const respuestas = collectAuditResponses();
    const payload = {
        auditoria_id: window.currentAuditoriaId,
        plantilla_id: document.getElementById('audit_plantilla_id').value,
        obra_id: document.getElementById('audit_obra_id').value,
        prevencionista_id: document.getElementById('audit_prevencionista_id').value,
        jefe_obra_id: document.getElementById('audit_jefe_obra_id').value,
        auditor_tipo: userProfile,
        auditor_id: currentPrevencionistaId || 'admin',
        estado: "Finalizada",
        respuestas: respuestas
    };
    
    // Primero intentamos aprobar el cierre con las firmas (esto debería validarlo el backend)
    const resAprobar = await fetchAPI(`/api/auditorias/${window.currentAuditoriaId}/aprobar_cierre`, {
        method: 'POST',
        body: JSON.stringify({
            coordinador_id: coordRut,
            coordinador_clave: coordClave,
            prevencionista_id: prevRut,
            prevencionista_clave: prevClave
        })
    });
    
    if (resAprobar && resAprobar.status === 'success') {
        // Si las firmas son válidas, enviamos las respuestas finales
        const resRespuestas = await fetchAPI('/api/auditorias/respuestas', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (resRespuestas && resRespuestas.status === 'success') {
            alert("Auditoría firmada y cerrada exitosamente.");
            cerrarModal('modal-aprobar-cierre');
            document.getElementById('audit-form-container').style.display = 'none';
            document.getElementById('audit-setup-container').style.display = 'block';
            window.currentAuditoriaId = null;
            toggleView('audit-history');
        }
    }
}

// === PLANES DE ACCION ===
async function loadPlanesAccion() {
    const tbody = document.getElementById('tabla-planes-accion');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando planes...</td></tr>';

    const empId = document.getElementById('filtro_empresa_planes')?.value || '';
    const obraId = document.getElementById('filtro_obra_planes')?.value || '';
    const prevId = document.getElementById('filtro_prevencionista_planes')?.value || '';

    const queryParams = new URLSearchParams();
    if (empId) queryParams.append('empresa_id', empId);
    if (obraId) queryParams.append('obra_id', obraId);
    if (prevId) queryParams.append('prevencionista_id', prevId);

    const todos = await fetchAPI(`/api/planes_accion?${queryParams}`);

    if (!todos || todos.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;">No hay planes de acción registrados.</td></tr>';
        renderGanttPlanes([]);
        return;
    }

    // Filtrar solo los abiertos para el Gantt
    const abiertos = todos.filter(p => (p.estado || 'Abierto').toLowerCase() !== 'cerrado');

    // Render tabla (todos)
    if (tbody) {
        let html = '';
        todos.forEach(p => {
            const estado = p.estado || 'Abierto';
            const estadoColor = estado === 'Cerrado' ? '#2ecc71' : '#e74c3c';
            const fechaImpl = p.fecha_cumplimiento || '';
            let diasRestantes = '-';
            let urgenciaStyle = '';
            if (fechaImpl && estado !== 'Cerrado') {
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const meta = new Date(fechaImpl);
                const diff = Math.ceil((meta - hoy) / 86400000);
                diasRestantes = diff < 0 ? `Vencido (${Math.abs(diff)} días)` : `${diff} días`;
                urgenciaStyle = diff < 0 ? 'color:#e74c3c;font-weight:bold;' : diff <= 7 ? 'color:#f39c12;font-weight:bold;' : 'color:#2ecc71;';
            }
            const perfil = localStorage.getItem('perfil') || '';
            let accionesHtml = '-';
            
            // Texto seguro para pasar por onclick (escapar comillas)
            const planTextoSeguro = (p.plan || p.plan_texto || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const evidenciaTextoSegura = (p.evidencia_texto || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const pdfPathsSeguro = (p.evidencia_pdf_path || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

            if (perfil === 'prevencionista_terreno' || perfil === 'prevencionista') {
                if (estado !== 'Cerrado') {
                    accionesHtml = `
                        <div style="display:flex; gap: 5px; justify-content:center;">
                            <button class="btn-primary" style="background:#f39c12; padding: 4px 8px; font-size:0.75rem;" onclick="abrirModalEditarPlan('${p.id}', '${planTextoSeguro}')">Editar</button>
                            <button class="btn-primary" style="background:#2ecc71; padding: 4px 8px; font-size:0.75rem;" onclick="abrirModalCerrarPlan('${p.id}')">Cerrar</button>
                        </div>
                    `;
                } else {
                    accionesHtml = `-`;
                }
            } else if (perfil === 'gerente' || perfil === 'coordinador' || perfil === 'admin') {
                if (estado !== 'Cerrado') {
                    accionesHtml = `
                        <div style="display:flex; gap: 5px; justify-content:center;">
                            <button class="btn-primary" style="background:#f39c12; padding: 4px 8px; font-size:0.75rem;" onclick="abrirModalEditarPlan('${p.id}', '${planTextoSeguro}')">Editar</button>
                        </div>
                    `;
                } else {
                    accionesHtml = `
                        <div style="display:flex; gap: 5px; justify-content:center;">
                            <button class="btn-primary" style="background:#3498db; padding: 4px 8px; font-size:0.75rem;" onclick="abrirModalRevisarPlan('${p.id}', '${evidenciaTextoSegura}', '${pdfPathsSeguro}')">Revisar</button>
                        </div>
                    `;
                }
            }

            html += `<tr>
                <td>${p.fecha_auditoria || '-'}</td>
                <td>${p.obra_nombre || p.audit_id || '-'}</td>
                <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">${p.pregunta_texto || p.pregunta_id || '-'}</td>
                <td style="max-width:200px;">${p.plan || p.plan_texto || '-'}</td>
                <td>${fechaImpl}</td>
                <td><span style="color:${estadoColor};font-weight:bold;">${estado}</span></td>
                <td style="${urgenciaStyle}">${diasRestantes}</td>
                <td style="text-align:center; vertical-align:middle;">${accionesHtml}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }

    renderGanttPlanes(abiertos);
}

function renderGanttPlanes(planes) {
    const container = document.getElementById('chart_div_gantt');
    if (!container) return;

    if (!planes || planes.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#aaa;">No hay planes abiertos para mostrar en el Gantt.</p>';
        return;
    }

    // Solo planes con fecha válida (fecha_cumplimiento = plazo de implementación)
    const conFecha = planes.filter(p => p.plazo && String(p.plazo).trim() !== '');
    if (conFecha.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#aaa;">Los planes abiertos no tienen fecha de implementación definida.</p>';
        return;
    }

    const hoy = new Date(); hoy.setHours(0,0,0,0);

    // Determinar rango de fechas
    const fechasPlazo = conFecha.map(p => new Date(p.fecha_cumplimiento));
    let minFecha = new Date(hoy);
    let maxFecha = new Date(Math.max(...fechasPlazo));
    // Dar al menos 5 días de margen al final
    maxFecha.setDate(maxFecha.getDate() + 5);
    const totalDias = Math.ceil((maxFecha - minFecha) / 86400000);

    // Agrupar por obra
    const porObra = {};
    conFecha.forEach(p => {
        const obraKey = p.obra_nombre || p.audit_id || 'Sin Obra';
        if (!porObra[obraKey]) porObra[obraKey] = [];
        porObra[obraKey].push(p);
    });

    // Config visual
    const ROW_H = 36;
    const LABEL_W = 260;
    const HEADER_H = 50;
    const PADDING = 10;
    const OBRA_HEADER_H = 28;

    // Calcular filas totales
    let totalRows = 0;
    Object.values(porObra).forEach(arr => { totalRows += 1 + arr.length; }); // 1 header obra + N planes

    const canvasH = HEADER_H + totalRows * ROW_H + PADDING * 2;
    const canvasW = container.clientWidth || 800;
    const CHART_W = canvasW - LABEL_W - PADDING;

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = '100%';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Fondo
    ctx.fillStyle = '#1a1f36';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // ---- HEADER eje tiempo ----
    ctx.fillStyle = '#2d3461';
    ctx.fillRect(LABEL_W, 0, CHART_W, HEADER_H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, LABEL_W, HEADER_H);

    // Líneas de meses en el header
    ctx.fillStyle = '#a0aec0';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';

    const mesesNombre = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    let cursorMes = new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
    while (cursorMes <= maxFecha) {
        const xPos = LABEL_W + Math.round((cursorMes - minFecha) / 86400000 / totalDias * CHART_W);
        if (xPos >= LABEL_W && xPos <= canvasW) {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(xPos, 0); ctx.lineTo(xPos, canvasH); ctx.stroke();
            ctx.fillStyle = '#a0aec0';
            ctx.fillText(`${mesesNombre[cursorMes.getMonth()]} ${cursorMes.getFullYear()}`, xPos + 30, HEADER_H / 2 + 4);
        }
        cursorMes.setMonth(cursorMes.getMonth() + 1);
    }

    // Línea "HOY"
    const hoyX = LABEL_W + Math.round((hoy - minFecha) / 86400000 / totalDias * CHART_W);
    ctx.strokeStyle = '#f6c90e';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(hoyX, 0); ctx.lineTo(hoyX, canvasH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f6c90e';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOY', hoyX, HEADER_H - 6);

    // ---- FILAS ----
    let rowIdx = 0;
    Object.entries(porObra).forEach(([obraName, planesObra]) => {
        // Header de obra
        const obraY = HEADER_H + rowIdx * ROW_H;
        ctx.fillStyle = '#3a4080';
        ctx.fillRect(0, obraY, canvasW, ROW_H);
        ctx.fillStyle = '#7c83d6';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`📁 ${obraName}`, 12, obraY + ROW_H / 2 + 5);
        rowIdx++;

        planesObra.forEach(p => {
            const rowY = HEADER_H + rowIdx * ROW_H;

            // Fondo fila alternado
            ctx.fillStyle = rowIdx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)';
            ctx.fillRect(0, rowY, canvasW, ROW_H);

            // Label pregunta
            const labelText = (p.pregunta_texto || `Pregunta #${p.pregunta_id}`).substring(0, 40) + ((p.pregunta_texto || '').length > 40 ? '...' : '');
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(labelText, 12, rowY + ROW_H / 2 + 4);

            // Separador label
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(LABEL_W, rowY); ctx.lineTo(LABEL_W, rowY + ROW_H); ctx.stroke();

            // Barra Gantt: desde HOY hasta fecha plazo (fecha_cumplimiento)
            const plazoFecha = new Date(p.fecha_cumplimiento);
            const barStart = hoyX;
            const barEnd = LABEL_W + Math.round((plazoFecha - minFecha) / 86400000 / totalDias * CHART_W);
            const barW = Math.max(barEnd - barStart, 4);
            const barY = rowY + 8;
            const barH = ROW_H - 16;

            // Color por urgencia
            const diasRestantes = Math.ceil((plazoFecha - hoy) / 86400000);
            let barColor;
            if (diasRestantes < 0) barColor = '#e74c3c';        // Vencido - rojo
            else if (diasRestantes <= 7) barColor = '#f39c12';   // Urgente - naranja
            else if (diasRestantes <= 30) barColor = '#f1c40f';  // Próximo - amarillo
            else barColor = '#2ecc71';                            // OK - verde

            // Dibujar barra
            ctx.fillStyle = barColor;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(barStart, barY, barW, barH);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = barColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(barStart, barY, barW, barH);

            // Texto días dentro de la barra
            const diasLabel = diasRestantes < 0 ? `¡Vencido! ${Math.abs(diasRestantes)}d` : `${diasRestantes} días`;
            ctx.fillStyle = barColor;
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(diasLabel, barStart + 4, rowY + ROW_H / 2 + 4);

            // Punto en fecha plazo
            ctx.fillStyle = barColor;
            ctx.beginPath(); ctx.arc(barEnd, rowY + ROW_H / 2, 5, 0, Math.PI * 2); ctx.fill();

            rowIdx++;
        });
    });

    // Leyenda
    const legendY = canvasH - 16;
    const legendItems = [
        { color: '#2ecc71', label: 'Más de 30 días' },
        { color: '#f1c40f', label: '8-30 días' },
        { color: '#f39c12', label: '1-7 días' },
        { color: '#e74c3c', label: 'Vencido' },
        { color: '#f6c90e', label: 'Hoy' }
    ];
    let lx = LABEL_W + 10;
    ctx.font = '10px Inter, sans-serif';
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(lx, legendY - 10, 12, 10);
        ctx.fillStyle = '#a0aec0';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, lx + 16, legendY);
        lx += ctx.measureText(item.label).width + 32;
    });
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
    
    // Generar PDF primero y luego mandarlo al backend utilizando la nueva plantilla
    generarReportePDF('blob_with_planes', aud_id, async function(pdfBlob) {
        
        const formData = new FormData();
        formData.append('token_admin', token);
        formData.append('prevencionista_id', rutPrev);
        formData.append('prevencionista_clave', clavePrev);
        formData.append('pdf_file', pdfBlob, `Planes_Auditoria_${aud_id}.pdf`);
        
        const res = await fetchAPI(`/api/auditorias/${aud_id}/aprobar_planes`, {
            method: 'POST',
            body: formData
        });
        
        if(res && res.status === 'success') {
            alert("Planes aprobados! La auditoria ha sido COMPLETADA y el PDF fue enviado por correo a los mantenedores definidos.");
            cerrarModal('modal-aprobar-planes');
            
            // Descargar tambien localmente
            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Planes_Auditoria_${aud_id}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            if (typeof loadPlanesAccion === 'function') loadPlanesAccion();
            if (typeof loadHistorialAuditorias === 'function') loadHistorialAuditorias();
        } else {
            alert(res.detail || "Error al aprobar los planes. Verifique credenciales.");
        }
    });
}

// === NUEVAS FUNCIONES PARA PLANTILLAS ===
async function subirFormatoExcel() {
    const fileInput = document.getElementById('import_file');
    const nombre = document.getElementById('import_nombre').value;
    
    if (!fileInput.files.length || !nombre) {
        return alert("Por favor complete el nombre y seleccione un archivo.");
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('nombre', nombre);
    formData.append('empresa_id', window.currentEmpresaId || '');
    
    // UI feedback
    const btnSubmit = document.querySelector('#form-importar-excel button[type="submit"]');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = 'Subiendo...';
    btnSubmit.disabled = true;
    
    try {
        const res = await fetch('/api/auditorias/upload-excel', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            alert("Formulario importado exitosamente con ID: " + data.plantilla_id);
            document.getElementById('import_file').value = '';
            document.getElementById('import_nombre').value = '';
            loadExistingTemplatesEditor();
        } else {
            alert(data.detail || "Error al subir el archivo.");
        }
    } catch (e) {
        alert("Ocurrió un error en la conexión.");
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
}

async function loadExistingTemplatesEditor() {
    const listContainer = document.getElementById('builder-existing-templates-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<span style="color:#aaa;">Cargando plantillas...</span>';
    try {
        const data = await fetchAPI(`/api/auditorias/plantillas?empresa_id=${window.currentEmpresaId || ''}`);
        listContainer.innerHTML = '';
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<span style="color:#aaa;">No hay plantillas creadas todavía.</span>';
            return;
        }
        
        data.forEach(p => {
            listContainer.innerHTML += `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 8px; padding: 15px; min-width: 200px;">
                <h4 style="margin-top:0; color: white;">${p.nombre}</h4>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-primary" style="flex:1; font-size: 0.8rem;" onclick="editPlantilla('${p.id}')">Editar</button>
                    <button class="btn-danger" style="flex:1; font-size: 0.8rem;" onclick="deletePlantilla('${p.id}')">Inhabilitar</button>
                </div>
            </div>`;
        });
    } catch(e) {
        listContainer.innerHTML = '<span style="color:red;">Error al cargar plantillas</span>';
    }
}

async function deletePlantilla(id) {
    if (!confirm("¿Está seguro que desea inhabilitar esta plantilla? Dejará de estar disponible para nuevas auditorías, pero se conservará el histórico.")) return;
    const res = await fetchAPI(`/api/auditorias/plantillas/${id}`, { method: 'DELETE' });
    if (res && res.status === 'success') {
        alert("Plantilla inhabilitada correctamente.");
        loadExistingTemplatesEditor();
    }
}

async function editPlantilla(id) {
    try {
        const data = await fetchAPI(`/api/auditorias/plantillas/${id}`);
        if (!data) return;
        
        document.getElementById('builder_plantilla_id').value = data.id;
        document.getElementById('builder_nombre').value = data.nombre;
        
        const catContainer = document.getElementById('builder-categories');
        catContainer.innerHTML = '';
        builderCategoryCounter = 0;
        builderQuestionCounter = 0;
        
        if (data.categorias && data.categorias.length > 0) {
            data.categorias.forEach(cat => {
                builderCategoryCounter++;
                const catId = `cat-${builderCategoryCounter}`;
                
                let questionsHtml = '';
                if (cat.preguntas) {
                    cat.preguntas.forEach(q => {
                        builderQuestionCounter++;
                        const qId = `q-${builderQuestionCounter}`;
                        questionsHtml += `
                            <div id="${qId}" style="display: flex; gap: 10px; align-items: center;">
                                <span style="color: #888;">Pregunta:</span>
                                <input type="text" placeholder="Texto de la pregunta..." style="flex: 1; padding: 6px;" class="q-text input-dark" value="${q.texto.replace(/"/g, '&quot;')}">
                                <button type="button" class="btn-danger" style="padding: 5px 10px;" onclick="document.getElementById('${qId}').remove()">X</button>
                            </div>
                        `;
                    });
                }
                
                const catHtml = `
                    <div id="${catId}" style="border: 1px solid #444; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: rgba(255,255,255,0.02);">
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                            <input type="text" placeholder="Nombre de Categoría (Ej: Nivel 1)" style="flex: 1; padding: 8px;" class="cat-name input-dark" value="${cat.nombre.replace(/"/g, '&quot;')}">
                            <button type="button" class="btn-danger" onclick="document.getElementById('${catId}').remove()">Eliminar Nivel</button>
                        </div>
                        <div class="questions-container" style="margin-left: 20px; display: flex; flex-direction: column; gap: 5px;">
                            ${questionsHtml}
                        </div>
                        <button type="button" class="btn-secondary" style="margin-top: 10px; margin-left: 20px; font-size: 0.8rem;" onclick="addBuilderQuestion('${catId}')">+ Agregar Pregunta</button>
                    </div>
                `;
                catContainer.insertAdjacentHTML('beforeend', catHtml);
            });
        }
        
        document.getElementById('builder-title').scrollIntoView({ behavior: 'smooth' });
    } catch(e) {
        alert("Error al cargar la plantilla.");
    }
}

// === EVENTO SELECT OBRA EN AUDITORIA ===
document.addEventListener('DOMContentLoaded', () => {
    const auditObraSelect = document.getElementById('audit_obra_id');
    if (auditObraSelect) {
        auditObraSelect.addEventListener('change', async (e) => {
            const obraId = e.target.value;
            const prevSelect = document.getElementById('audit_prevencionista_id');
            const jefeSelect = document.getElementById('audit_jefe_obra_id');
            
            if (!obraId) {
                prevSelect.innerHTML = '<option value="">Seleccione una Obra primero...</option>';
                jefeSelect.innerHTML = '<option value="">Seleccione una Obra primero...</option>';
                return;
            }
            
            prevSelect.innerHTML = '<option value="">Cargando...</option>';
            jefeSelect.innerHTML = '<option value="">Cargando...</option>';
            
            try {
                const [prevs, jefes] = await Promise.all([
                    fetchAPI('/api/prevencionistas'),
                    fetchAPI('/api/jefes-obra')
                ]);
                
                prevSelect.innerHTML = '<option value="">Seleccione Prevencionista...</option>';
                if (prevs) {
                    const filteredPrevs = prevs.filter(p => String(p.obra_id) === String(obraId));
                    filteredPrevs.forEach(p => {
                        prevSelect.innerHTML += `<option value="${p.id}">${p.nombre} (${p.rut})</option>`;
                    });
                    if (filteredPrevs.length === 0) prevSelect.innerHTML = '<option value="">Sin prevencionistas asignados</option>';
                }
                
                jefeSelect.innerHTML = '<option value="">Seleccione Administrador...</option>';
                if (jefes) {
                    const filteredJefes = jefes.filter(j => String(j.obra_id) === String(obraId));
                    filteredJefes.forEach(j => {
                        jefeSelect.innerHTML += `<option value="${j.id}">${j.nombre} (${j.rut})</option>`;
                    });
                    if (filteredJefes.length === 0) jefeSelect.innerHTML = '<option value="">Sin administrador asignado</option>';
                }
            } catch(err) {
                prevSelect.innerHTML = '<option value="">Error al cargar</option>';
                jefeSelect.innerHTML = '<option value="">Error al cargar</option>';
            }
        });
    }
});

// === REPORTABILIDAD MENSUAL ===

async function actualizarFiltrosReportabilidad() {
    const empresaIdEl = document.getElementById('filtro_empresa_rep');
    let empresaId = empresaIdEl ? empresaIdEl.value : '';
    if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId && !empresaId) {
        empresaId = window.currentEmpresaId;
    }
    const obraSelect = document.getElementById('filtro_obra_rep');
    if (!obraSelect) return;
    obraSelect.innerHTML = '<option value="">Cargando...</option>';
    let url = '/api/obras';
    if (empresaId) url += `?empresa_id=${empresaId}`;
    const obras = await fetchAPI(url);
    obraSelect.innerHTML = '<option value="">Seleccione Obra...</option>';
    if (obras) {
        obras.forEach(o => {
            if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
                 let userObras = window.userObras || [];
                 if (userObras.includes(o.id) || o.id == currentObraId) {
                     obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                 }
            } else {
                 obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
            }
        });
        
        if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
            if (obraSelect.options.length === 2) {
                obraSelect.selectedIndex = 1;
            } else if (currentObraId) {
                const match = Array.from(obraSelect.options).find(opt => opt.value == currentObraId);
                if (match) obraSelect.value = currentObraId;
            }
        }
    }
    loadReportabilidad();
}

async function loadReportabilidad() {
    const empresaIdEl = document.getElementById('filtro_empresa_rep');
    let empresaId = empresaIdEl ? empresaIdEl.value : '';
    if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId && !empresaId) {
        empresaId = window.currentEmpresaId;
    }
    const obraId = document.getElementById('filtro_obra_rep') ? document.getElementById('filtro_obra_rep').value : '';
    const anio = document.getElementById('filtro_anio_rep') ? document.getElementById('filtro_anio_rep').value : '';
    const mes = document.getElementById('filtro_mes_rep') ? document.getElementById('filtro_mes_rep').value : '';
    
    let url = '/api/reportabilidad-mensual/historial?';
    if (empresaId) url += `empresa_id=${empresaId}&`;
    if (obraId) url += `obra_id=${obraId}&`;
    if (anio) url += `anio=${anio}&`;
    
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    const tbody = document.getElementById('tabla-reportabilidad');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: #aaa;">Sin registros</td></tr>';
        return;
    }
    
    data.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${r.anio || ''}</td>
                <td>${r.mes || ''}</td>
                <td>${r.total_trabajadores ?? 0}</td>
                <td>${r.trabajadores_vigilancia ?? 0}</td>
                <td>${r.horas_trabajadas ?? 0}</td>
                <td>${r.enfermedades_profesionales ?? 0}</td>
                <td>${r.jornadas_perdidas_ep ?? 0}</td>
                <td>${r.accidentes_con_baja ?? 0}</td>
                <td>${r.jornadas_perdidas ?? 0}</td>
            </tr>
        `;
    });
}

async function guardarReportabilidad(e) {
    if (e) e.preventDefault();
    const empresaId = document.getElementById('filtro_empresa_rep') ? document.getElementById('filtro_empresa_rep').value : '';
    const obraId = document.getElementById('filtro_obra_rep') ? document.getElementById('filtro_obra_rep').value : '';
    const anio = document.getElementById('filtro_anio_rep') ? document.getElementById('filtro_anio_rep').value : '';
    const mes = document.getElementById('filtro_mes_rep') ? document.getElementById('filtro_mes_rep').value : '';
    
    if (!empresaId || !obraId || !anio || !mes) {
        alert('Por favor seleccione Empresa, Obra, Año y Mes antes de guardar.');
        return;
    }
    
    const hombres = parseInt(document.getElementById('rep_hombres').value || '0');
    const mujeres = parseInt(document.getElementById('rep_mujeres').value || '0');
    const total = parseInt(document.getElementById('rep_total').value || '0');
    const vigilancia = parseInt(document.getElementById('rep_trabajadores_vigilancia').value || '0');
    const horas = parseFloat(document.getElementById('rep_horas_trabajadas').value || '0');
    const ep = parseInt(document.getElementById('rep_enfermedades_profesionales').value || '0');
    const jornadasEp = parseInt(document.getElementById('rep_jornadas_perdidas_ep').value || '0');
    const accidentes = parseInt(document.getElementById('rep_accidentes_con_baja').value || '0');
    const jornadas = parseInt(document.getElementById('rep_jornadas_perdidas').value || '0');
    
    const payload = {
        empresa_id: empresaId,
        obra_id: obraId,
        anio: anio,
        mes: mes,
        hombres: hombres,
        mujeres: mujeres,
        total_trabajadores: total,
        trabajadores_vigilancia: vigilancia,
        horas_trabajadas: horas,
        enfermedades_profesionales: ep,
        jornadas_perdidas_ep: jornadasEp,
        accidentes_con_baja: accidentes,
        jornadas_perdidas: jornadas
    };
    
    const res = await fetchAPI('/api/reportabilidad-mensual', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    if (res && res.status === 'success') {
        alert('Registro guardado exitosamente.');
        loadReportabilidad();
    }
}

function calcularTotalTrabajadoresRep() {
    const hombres = parseInt(document.getElementById('rep_hombres').value || '0');
    const mujeres = parseInt(document.getElementById('rep_mujeres').value || '0');
    const totalEl = document.getElementById('rep_total');
    if (totalEl) totalEl.value = hombres + mujeres;
}


async function actualizarFiltroObrasGr() {
    const empresaIdEl = document.getElementById('filtro_empresa_gr');
    let empresaId = empresaIdEl ? empresaIdEl.value : '';
    if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId && !empresaId) {
        empresaId = window.currentEmpresaId;
    }
    const obraSelect = document.getElementById('filtro_obra_gr');
    if (!obraSelect) return;
    obraSelect.innerHTML = '<option value="">Cargando...</option>';
    let url = '/api/obras';
    if (empresaId) url += `?empresa_id=${empresaId}`;
    const obras = await fetchAPI(url);
    obraSelect.innerHTML = '<option value="">Todas las Obras</option>';
    if (obras) {
        obras.forEach(o => {
            if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
                 let userObras = window.userObras || [];
                 if (userObras.includes(o.id) || o.id == currentObraId) {
                     obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                 }
            } else {
                 obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
            }
        });
        
        if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
            if (obraSelect.options.length === 2) {
                obraSelect.selectedIndex = 1;
            } else if (currentObraId) {
                const match = Array.from(obraSelect.options).find(opt => opt.value == currentObraId);
                if (match) obraSelect.value = currentObraId;
            }
        }
    }
    cargarGraficosReportabilidad();
}

async function cargarGraficosReportabilidad() {
    const empresaIdEl = document.getElementById('filtro_empresa_gr');
    let empresaId = empresaIdEl ? empresaIdEl.value : '';
    if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId && !empresaId) {
        empresaId = window.currentEmpresaId;
    }
    const obraId = document.getElementById('filtro_obra_gr') ? document.getElementById('filtro_obra_gr').value : '';
    const anio = document.getElementById('filtro_anio_gr') ? document.getElementById('filtro_anio_gr').value : '';
    
    let url = '/api/reportabilidad-mensual/historial?';
    if (empresaId) url += `empresa_id=${empresaId}&`;
    if (obraId) url += `obra_id=${obraId}&`;
    if (anio) url += `anio=${anio}&`;
    
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    if (!data || data.length === 0) {
        alert('No hay datos para mostrar en los gráficos.');
        return;
    }
    
    let dataAsc = [...data].reverse();
    
    const groupedDataMap = new Map();
    dataAsc.forEach(r => {
        const key = `${r.anio}-${r.mes}`;
        if (!groupedDataMap.has(key)) {
            groupedDataMap.set(key, {
                anio: r.anio,
                mes: r.mes,
                total_trabajadores: 0,
                trabajadores_vigilancia: 0,
                accidentes_con_baja: 0,
                enfermedades_profesionales: 0,
                jornadas_perdidas: 0,
                jornadas_perdidas_ep: 0,
                horas_trabajadas: 0,
                hombres: 0,
                mujeres: 0
            });
        }
        const g = groupedDataMap.get(key);
        g.total_trabajadores += parseFloat(r.total_trabajadores || 0);
        g.trabajadores_vigilancia += parseFloat(r.trabajadores_vigilancia || 0);
        g.accidentes_con_baja += parseFloat(r.accidentes_con_baja || 0);
        g.enfermedades_profesionales += parseFloat(r.enfermedades_profesionales || 0);
        g.jornadas_perdidas += parseFloat(r.jornadas_perdidas || 0);
        g.jornadas_perdidas_ep += parseFloat(r.jornadas_perdidas_ep || 0);
        g.horas_trabajadas += parseFloat(r.horas_trabajadas || 0);
        g.hombres += parseFloat(r.hombres || 0);
        g.mujeres += parseFloat(r.mujeres || 0);
    });
    dataAsc = Array.from(groupedDataMap.values());
    
    const meses = dataAsc.map(r => `${r.anio}-${r.mes}`);
    const totalTrab = dataAsc.map(r => r.total_trabajadores || 0);
    const trabVig = dataAsc.map(r => r.trabajadores_vigilancia || 0);
    const accidentes = dataAsc.map(r => r.accidentes_con_baja || 0);
    const ep = dataAsc.map(r => r.enfermedades_profesionales || 0);
    const jornadas = dataAsc.map(r => (r.jornadas_perdidas || 0) + (r.jornadas_perdidas_ep || 0));
    const horas = dataAsc.map(r => r.horas_trabajadas || 0);

    const sumHombres = dataAsc.reduce((acc, r) => acc + (r.hombres || 0), 0);
    const sumMujeres = dataAsc.reduce((acc, r) => acc + (r.mujeres || 0), 0);
    
    // 1. chartEvolucionTrabajadores
    const canvasEv = document.getElementById('chartEvolucionTrabajadores');
    if (canvasEv) {
        if (window._chartEv) window._chartEv.destroy();
        window._chartEv = new Chart(canvasEv, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    { label: 'Total Trabajadores', data: totalTrab, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.2)', fill: true, tension: 0.1 },
                    { label: 'Vigilancia Médica', data: trabVig, borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.2)', fill: true, tension: 0.1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    }

    // 2. chartSiniestralidad
    const canvasSin = document.getElementById('chartSiniestralidad');
    if (canvasSin) {
        if (window._chartSin) window._chartSin.destroy();
        window._chartSin = new Chart(canvasSin, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [
                    { label: 'Accidentes CTP', data: accidentes, backgroundColor: '#f1c40f' },
                    { label: 'Enfermedades Prof.', data: ep, backgroundColor: '#e67e22' },
                    { label: 'Jornadas Perdidas', data: jornadas, backgroundColor: '#c0392b' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    }

    // 3. chartGenero
    const canvasGen = document.getElementById('chartGenero');
    if (canvasGen) {
        if (window._chartGen) window._chartGen.destroy();
        window._chartGen = new Chart(canvasGen, {
            type: 'doughnut',
            data: {
                labels: ['Hombres', 'Mujeres'],
                datasets: [{ data: [sumHombres, sumMujeres], backgroundColor: ['#3498db', '#9b59b6'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 4. chartHoras
    const canvasHoras = document.getElementById('chartHoras');
    if (canvasHoras) {
        if (window._chartHoras) window._chartHoras.destroy();
        window._chartHoras = new Chart(canvasHoras, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{ label: 'Horas Trabajadas', data: horas, backgroundColor: '#2ecc71' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    }

    renderTablasResumenAnual(dataAsc);
}

function renderTablasResumenAnual(data) {
    const anio1Data = [];
    const anio2Data = [];
    const anio3Data = [];

    data.forEach(r => {
        const val = parseInt(r.anio) * 100 + parseInt(r.mes);
        const item = {
            mesAnio: `${r.mes}-${r.anio}`,
            trabajadores: r.total_trabajadores || 0,
            diasPerdidos: (r.jornadas_perdidas || 0) + (r.jornadas_perdidas_ep || 0),
            val: val
        };
        if (val >= 202407 && val <= 202506) anio1Data.push(item);
        if (val >= 202507 && val <= 202606) anio2Data.push(item);
        if (val >= 202607 && val <= 202706) anio3Data.push(item);
    });

    const populate = (id, arr) => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        tbody.innerHTML = '';
        if (arr.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sin datos</td></tr>';
            return;
        }
        arr.sort((a,b) => a.val - b.val).forEach(item => {
            tbody.innerHTML += `<tr>
                <td>${item.mesAnio}</td>
                <td>${item.trabajadores}</td>
                <td>${item.diasPerdidos}</td>
            </tr>`;
        });
    };

    populate('tabla-resumen-anio1', anio1Data);
    populate('tabla-resumen-anio2', anio2Data);
    populate('tabla-resumen-anio3', anio3Data);
}

function exportarResumenAnualExcel() {
    if (typeof XLSX === 'undefined') {
        alert("La librería para exportar a Excel no está cargada.");
        return;
    }
    const wb = XLSX.utils.book_new();
    let data = [["Período", "Mes-Año", "Trabajadores", "Días Perdidos"]];
    
    const extractToData = (id, yearLabel) => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if(cols.length === 3) {
                const mes = cols[0].innerText;
                if(mes === '-' || mes.includes('Sin datos')) return;
                data.push([yearLabel, mes, cols[1].innerText, cols[2].innerText]);
            }
        });
    };
    
    extractToData('tabla-resumen-anio1', 'Año 1 (Jul 2024 - Jun 2025)');
    data.push(["", "", "", ""]); // Fila vacía de separación
    extractToData('tabla-resumen-anio2', 'Año 2 (Jul 2025 - Jun 2026)');
    data.push(["", "", "", ""]);
    extractToData('tabla-resumen-anio3', 'Año 3 (Jul 2026 - Jun 2027)');
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Anual");
    XLSX.writeFile(wb, "Resumen_Anual_Reportabilidad.xlsx");
}

function descargarReporteMensualPDF() {
    const empresaIdEl = document.getElementById('filtro_empresa_rep');
    let empresaId = empresaIdEl ? empresaIdEl.value : '';
    if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId && !empresaId) {
        empresaId = window.currentEmpresaId;
    }
    const obraId = document.getElementById('filtro_obra_rep') ? document.getElementById('filtro_obra_rep').value : '';
    const anio = document.getElementById('filtro_anio_rep') ? document.getElementById('filtro_anio_rep').value : '';
    
    if (!empresaId || !anio) {
        alert('Seleccione Empresa y Año para descargar el reporte.');
        return;
    }
    
    window.open(`/api/reportabilidad-mensual/historial?empresa_id=${empresaId}&obra_id=${obraId || ''}&anio=${anio}`, '_blank');
}

// Inicializar formulario de reportabilidad al cambiar sección
document.addEventListener('DOMContentLoaded', () => {
    // Conectar submit del formulario de reportabilidad
    const formRep = document.getElementById('form-reportabilidad');
    if (formRep) {
        formRep.addEventListener('submit', guardarReportabilidad);
    }
    
    // Llenar empresas en los selectores de reportabilidad
    async function cargarEmpresasRep() {
        const selectorEmpRep = document.getElementById('filtro_empresa_rep');
        const selectorEmpGr = document.getElementById('filtro_empresa_gr');
        const data = await fetchAPI('/api/empresas');
        if (data) {
            [selectorEmpRep, selectorEmpGr].forEach(sel => {
                if (!sel) return;
                sel.innerHTML = '<option value="">Seleccione Empresa...</option>';
                data.forEach(e => {
                    sel.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
                });
                // Pre-seleccionar empresa del contexto global si existe
                if (window.currentEmpresaId) {
                    sel.value = window.currentEmpresaId;
                    if (window.userProfile === 'gerente_prevencion') {
                        sel.disabled = true; // Bloquear si es gerente_prevencion
                    }
                }
            });
        }
    }
    
    // Escuchar cuando se navega a la sección reportabilidad
    const navRep = document.getElementById('nav-reportabilidad');
    if (navRep) {
        navRep.addEventListener('click', () => {
            cargarEmpresasRep();
            actualizarFiltrosReportabilidad();
        });
    }
    
    const navGr = document.getElementById('nav-graficos-reportabilidad');
    if (navGr) {
        navGr.addEventListener('click', () => {
            cargarEmpresasRep();
            actualizarFiltroObrasGr();
        });
    }
});


// === GRÁFICOS AUDITORIA ===
async function cargarFiltrosAuditoriasGraficos() {
    const selEmpresa = document.getElementById('filtro_empresa');
    if(selEmpresa) {
        selEmpresa.innerHTML = '<option value="">Todas las Empresas</option>';
        let url = '/api/empresas';
        const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
        if(data) {
            data.forEach(e => {
                selEmpresa.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
            });
            if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId) {
                selEmpresa.value = window.currentEmpresaId;
                selEmpresa.disabled = true; // Optional: lock it to their company
            }
        }
    }
    await actualizarFiltroObras();
    
    const selPlantilla = document.getElementById('filtro_plantilla');
    if(selPlantilla) {
        selPlantilla.innerHTML = '<option value="">Todas las Plantillas</option>';
        const pData = await fetchAPI('/api/auditorias/plantillas');
        if(pData) {
            pData.forEach(p => {
                selPlantilla.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            });
        }
    }
    
    cargarGraficos();
}

async function actualizarFiltroObras() {
    const selObra = document.getElementById('filtro_obra');
    if(!selObra) return;
    selObra.innerHTML = '<option value="">Todas las Obras</option>';
    
    // Al estar oculta la empresa, tomamos directamente la empresa global si aplica
    let empId = window.currentEmpresaId;
    
    let url = '/api/obras';
    if (empId) url += `?empresa_id=${empId}`;
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    if(data) {
        data.forEach(o => {
            // Validar perfil
            if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
                 let userObras = window.userObras || [];
                 // Solo agregamos si la obra actual le corresponde
                 if (userObras.includes(o.id) || o.id == currentObraId) {
                     selObra.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                 }
            } else {
                 selObra.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
            }
        });

        // Si es admin_obra o prevencionista, autoseleccionar y bloquear
        if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
            if (selObra.options.length === 2) {
                selObra.selectedIndex = 1;
            } else if (currentObraId) {
                const match = Array.from(selObra.options).find(opt => opt.value == currentObraId);
                if (match) selObra.value = currentObraId;
            }
        }
    }
    await actualizarFiltroPrevencionistas();
}

async function actualizarFiltroPrevencionistas() {
    const selObra = document.getElementById('filtro_obra');
    const selPrev = document.getElementById('filtro_prevencionista');
    if(!selPrev) return;
    selPrev.innerHTML = '<option value="">Todos los Prevencionistas</option>';
    
    const data = await fetchAPI('/api/prevencionistas');
    if(data) {
        const obraId = selObra ? selObra.value : '';
        data.forEach(p => {
            if (!obraId || p.obra_id == obraId) {
                selPrev.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            }
        });
    }
}

let chartCumplimiento = null;
window.chartMes = null; window.chartNiveles = null;

async function cargarGraficos() {
    const empIdEl = document.getElementById('filtro_empresa');
    const obraIdEl = document.getElementById('filtro_obra');
    const planIdEl = document.getElementById('filtro_plantilla');
    const prevIdEl = document.getElementById('filtro_prevencionista');
    const mesIdEl = document.getElementById('filtro_mes');
    const anioIdEl = document.getElementById('filtro_anio');

    let empId = empIdEl ? empIdEl.value : '';
    if(window.userProfile === 'gerente_prevencion' && window.currentEmpresaId && !empId) {
        empId = window.currentEmpresaId;
    }

    const obraId = obraIdEl ? obraIdEl.value : '';
    const planId = planIdEl ? planIdEl.value : '';
    const prevId = prevIdEl ? prevIdEl.value : '';
    const mes = mesIdEl ? mesIdEl.value : '';
    const anio = anioIdEl ? anioIdEl.value : '';

    let url = '/api/auditorias/historial?';
    if (empId) url += `empresa_id=${empId}&`;
    if (obraId) url += `obra_id=${obraId}&`;
    
    const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const data = await fetchAPI(cacheUrl);
    if (!data) return;

    let filtered = data.filter(a => a.estado !== "EN CURSO");
    if (planId) filtered = filtered.filter(a => String(a.plantilla_id) === String(planId));
    if (prevId) filtered = filtered.filter(a => String(a.prevencionista_id) === String(prevId));
    if (anio) filtered = filtered.filter(a => {
        if(!a.date) return false;
        let d = a.date.substring(0, 10);
        if (d.indexOf('-') === 2 || d.indexOf('/') === 2) {
            return d.substring(6, 10) === anio;
        }
        return a.date.substring(0, 4) === anio;
    });
    if (mes) filtered = filtered.filter(a => {
        if(!a.date) return false;
        let d = a.date.substring(0, 10);
        if (d.indexOf('-') === 2 || d.indexOf('/') === 2) {
            return d.substring(3, 5) === mes;
        }
        return a.date.substring(5, 7) === mes;
    });

    let avgCumplimiento = 0;
    if (filtered.length > 0) {
        const sum = filtered.reduce((acc, curr) => {
            let val = parseFloat(curr.cumplimiento || 0);
            return acc + val;
        }, 0);
        avgCumplimiento = sum / filtered.length;
    }

    const ctxCumpl = document.getElementById('chartCumplimiento');
    if (ctxCumpl) {
        if (chartCumplimiento) chartCumplimiento.destroy();
        chartCumplimiento = new Chart(ctxCumpl.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Cumplimiento', 'Brecha'],
                datasets: [{
                    data: [avgCumplimiento, 100 - avgCumplimiento],
                    backgroundColor: ['#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e, activeEls) => {
                    if (activeEls.length > 0) {
                        const index = activeEls[0].index;
                        if (index === 1) { // Brecha
                            mostrarDetalleBrecha(filtered);
                        }
                    }
                },
                plugins: {
                    title: { display: true, text: `Cumplimiento Promedio: ${avgCumplimiento.toFixed(1)}%` },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed.toFixed(1) + '%';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    const mesesMap = {};
    filtered.forEach(a => {
        if (!a.date) return;
        const m = parseDateToMes(a.date);
        if (!m) return;
        if (!mesesMap[m]) mesesMap[m] = { sum: 0, count: 0 };
        mesesMap[m].sum += parseFloat(a.cumplimiento || 0);
        mesesMap[m].count++;
    });

    const labelsMes = Object.keys(mesesMap).sort();
    const dataMes = labelsMes.map(m => mesesMap[m].sum / mesesMap[m].count);

    const ctxMes = document.getElementById('chartCumplimientoPorMes');
    if (ctxMes) {
        if (window.chartMes) window.chartMes.destroy();
        window.chartMes = new Chart(ctxMes.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labelsMes.length ? labelsMes : ['Sin Datos'],
                datasets: [{
                    label: 'Cumplimiento Promedio (%)',
                    data: labelsMes.length ? dataMes : [0],
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                },
                onClick: (evt, activeElements) => {
                    if (activeElements.length > 0) {
                        const idx = activeElements[0].index;
                        const mesLabel = labelsMes[idx];
                        mostrarModalCumplimientoObraMes(mesLabel, filtered);
                    }
                }
            }
        });
    }

    // Chart Cumplimiento por Niveles
    let urlNiveles = '/api/auditorias/historial/niveles?';
    if (empId) urlNiveles += `empresa_id=${empId}&`;
    if (obraId) urlNiveles += `obra_id=${obraId}&`;
    
    const dataNiveles = await fetchAPI(urlNiveles);
    const ctxNiveles = document.getElementById('chartCumplimientoNiveles');
    if (ctxNiveles && dataNiveles) {
        const labelsNiveles = Object.keys(dataNiveles);
        const valuesNiveles = Object.values(dataNiveles);
        
        if (window.chartNiveles) window.chartNiveles.destroy();
        window.chartNiveles = new Chart(ctxNiveles.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labelsNiveles.length ? labelsNiveles : ['Sin Datos'],
                datasets: [{
                    label: 'Cumplimiento por Nivel (%)',
                    data: labelsNiveles.length ? valuesNiveles : [0],
                    backgroundColor: '#17a2b8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bar chart
                scales: {
                    x: { beginAtZero: true, max: 100 }
                }
            }
        });
    }
}


// === INGRESO DEDICADO DE PLANES ===
async function abrirIngresoPlanes(aud_id) {
    window.currentPlanAuditoriaId = aud_id;
    const tbody = document.getElementById('tabla-ingreso-planes');
    tbody.innerHTML = '<tr><td colspan="4">Cargando preguntas...</td></tr>';
    mostrarModal('modal-ingreso-planes');
    
    // Obtenemos todos los planes (no cumple) para esta auditoria
    const res = await fetchAPI(`/api/auditorias/planes_accion`);
    if (!res) {
        tbody.innerHTML = '<tr><td colspan="4">Error al cargar preguntas.</td></tr>';
        return;
    }
    
    // Filtrar solo los de esta auditoría
    const planesAuditoria = res.filter(p => p.auditoria_id === aud_id);
    
    if (planesAuditoria.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No hay preguntas "No Cumple" pendientes.</td></tr>';
        return;
    }
    
    let html = '';
    planesAuditoria.forEach(p => {
        html += `
        <tr data-pregunta="${p.pregunta_id}">
            <td style="max-width: 200px; word-wrap: break-word;">${p.pregunta_texto || p.pregunta_id}</td>
            <td>${p.comentario_original || '-'}</td>
            <td><textarea class="plan-texto" style="width:100%; min-height:60px; background:transparent; color:white; border:1px solid #555; padding:5px;">${p.plan_texto || ''}</textarea></td>
            <td><input type="date" class="plan-fecha" value="${p.fecha_cumplimiento || ''}" style="background:transparent; color:white; border:1px solid #555; padding:5px;"></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

async function guardarYFirmarPlanes() {
    const aud_id = window.currentPlanAuditoriaId;
    const tbody = document.getElementById('tabla-ingreso-planes');
    const filas = tbody.querySelectorAll('tr[data-pregunta]');
    
    const planesData = [];
    filas.forEach(tr => {
        planesData.push({
            auditoria_id: aud_id,
            pregunta_id: parseInt(tr.getAttribute('data-pregunta')),
            plan_texto: tr.querySelector('.plan-texto').value,
            fecha_cumplimiento: tr.querySelector('.plan-fecha').value
        });
    });
    
    // Validar vacíos
    for (let p of planesData) {
        if (!p.plan_texto.trim() || !p.fecha_cumplimiento) {
            alert('Debe completar el texto y la fecha para todos los planes antes de proceder a firmar.');
            return;
        }
    }
    
    // Guardar
    const res = await fetchAPI(`/api/auditorias/guardar_planes`, {
        method: 'POST',
        body: JSON.stringify({ planes: planesData })
    });
    
    if(res && res.status === 'success') {
        alert("Planes guardados correctamente. Se generó un nuevo código (token) enviado al Administrador de Obra.");
        cerrarModal('modal-ingreso-planes');
        mostrarModal('modal-aprobar-planes');
        
        // Simular que llenamos la tabla de seguimiento para que cuando el PDF se genere en el próximo paso
        // tenga los datos correctos si el usuario no pasó por la pestaña general.
        const fallbackTable = document.getElementById('tabla-planes-accion');
        if(fallbackTable) {
            let html = '';
            planesData.forEach(p => {
                html += `<tr>
                    <td>${p.pregunta_id}</td>
                    <td style="color: #e74c3c;">No Cumple</td>
                    <td>-</td>
                    <td>${p.plan_texto}</td>
                    <td>${p.fecha_cumplimiento}</td>
                </tr>`;
            });
            fallbackTable.innerHTML = html;
        }
        
    } else {
        alert('Error al guardar planes.');
    }
}



// === FUNCIONES MODALES PLANES DE ACCION ===

function abrirModalEditarPlan(planId, textoActual) {
    document.getElementById('edit_plan_id').value = planId;
    document.getElementById('edit_plan_texto').value = textoActual;
    mostrarModal('modal-editar-plan');
}

async function submitEditarPlan() {
    const planId = document.getElementById('edit_plan_id').value;
    const planTexto = document.getElementById('edit_plan_texto').value;
    
    if (!planTexto.trim()) {
        alert('El texto del plan no puede estar vacío');
        return;
    }
    
    const res = await fetchAPI('/api/planes_accion/' + planId, {
        method: 'PUT',
        body: JSON.stringify({ plan_texto: planTexto })
    });
    
    if (res && res.status === 'success') {
        cerrarModal('modal-editar-plan');
        loadPlanesAccion();
    } else {
        alert('Error al editar el plan');
    }
}

function abrirModalCerrarPlan(planId) {
    document.getElementById('cerrar_plan_id').value = planId;
    document.getElementById('cerrar_plan_evidencia_texto').value = '';
    document.getElementById('cerrar_plan_archivos').value = '';
    mostrarModal('modal-cerrar-plan');
}

async function submitCerrarPlan() {
    const planId = document.getElementById('cerrar_plan_id').value;
    const evidenciaTexto = document.getElementById('cerrar_plan_evidencia_texto').value;
    const fileInput = document.getElementById('cerrar_plan_archivos');
    
    if (!evidenciaTexto.trim()) {
        alert('Debe ingresar un texto explicativo como evidencia.');
        return;
    }
    
    if (fileInput.files.length === 0) {
        alert('Debe adjuntar al menos un archivo PDF como evidencia.');
        return;
    }
    
    const formData = new FormData();
    formData.append('evidencia_texto', evidenciaTexto);
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('evidencia_files', fileInput.files[i]);
    }
    
    try {
        const response = await fetch('/api/planes_accion/' + planId + '/cerrar', {
            method: 'POST',
            body: formData
        });
        const res = await response.json();
        
        if (res && res.status === 'success') {
            cerrarModal('modal-cerrar-plan');
            loadPlanesAccion();
        } else {
            alert('Error al cerrar el plan: ' + (res.detail || res.message || ''));
        }
    } catch(e) {
        console.error(e);
        alert('Error de red al cerrar el plan.');
    }
}

function abrirModalRevisarPlan(planId, evidenciaTexto, pdfPathsStr) {
    document.getElementById('revisar_plan_id').value = planId;
    document.getElementById('revisar_evidencia_texto').innerText = evidenciaTexto || 'Sin texto de evidencia';
    
    const divArchivos = document.getElementById('revisar_evidencia_archivos');
    divArchivos.innerHTML = '';
    
    try {
        const pdfPaths = JSON.parse(pdfPathsStr.replace(/&quot;/g, '\"'));
        if (Array.isArray(pdfPaths) && pdfPaths.length > 0) {
            pdfPaths.forEach((path, index) => {
                const a = document.createElement('a');
                a.href = path;
                a.target = '_blank';
                a.style.color = '#3498db';
                a.innerText = 'Ver Archivo PDF ' + (index + 1);
                divArchivos.appendChild(a);
            });
        } else {
            divArchivos.innerText = 'No hay archivos adjuntos';
        }
    } catch (e) {
        divArchivos.innerText = 'Error leyendo rutas o no hay archivos';
        if (pdfPathsStr && pdfPathsStr.trim() !== '') {
            const a = document.createElement('a');
            a.href = pdfPathsStr.replace(/&quot;/g, '\"');
            a.target = '_blank';
            a.style.color = '#3498db';
            a.innerText = 'Ver Archivo PDF (Antiguo formato)';
            divArchivos.innerHTML = '';
            divArchivos.appendChild(a);
        }
    }
    
    ocultarSeccionRechazo();
    mostrarModal('modal-revisar-plan');
}

function mostrarSeccionRechazo() {
    document.getElementById('rechazo-section').style.display = 'block';
    document.getElementById('revisar-actions').style.display = 'none';
}

function ocultarSeccionRechazo() {
    document.getElementById('rechazo-section').style.display = 'none';
    document.getElementById('revisar-actions').style.display = 'flex';
    document.getElementById('revisar_plan_motivo').value = '';
}

async function submitRechazarPlan() {
    const planId = document.getElementById('revisar_plan_id').value;
    const motivo = document.getElementById('revisar_plan_motivo').value;
    
    if (!motivo.trim()) {
        alert('Debe ingresar un motivo para el rechazo.');
        return;
    }
    
    const res = await fetchAPI('/api/planes_accion/' + planId + '/rechazar', {
        method: 'POST',
        body: JSON.stringify({ motivo: motivo })
    });
    
    if (res && res.status === 'success') {
        cerrarModal('modal-revisar-plan');
        loadPlanesAccion();
    } else {
        alert('Error al rechazar el plan.');
    }
}



function generarReportePDF(mode = 'download', aud_id = null, cb = null) {
    // 1. Gather Metadata
    const obraSelect = document.getElementById('audit_obra_id');
    const prevSelect = document.getElementById('audit_prevencionista_id');
    const plantillaSelect = document.getElementById('audit_plantilla_id');
    
    let obraNombre = '-';
    let prevNombre = '-';
    let plantillaNombre = '-';
    
    const d = window.currentAuditData;
    if (d && (aud_id === null || aud_id === d.id)) {
        // Try to get names from backend payload first, fallback to dropdown if populated
        obraNombre = d.obra_nombre || d.obra || "-";
        if (obraNombre === "-" && obraSelect && d.obra_id) {
            const opt = Array.from(obraSelect.options).find(o => String(o.value) === String(d.obra_id));
            obraNombre = opt ? opt.text : d.obra_id;
        }

        prevNombre = d.prevencionista_nombre || d.prevencionista || "-";
        if (prevNombre === "-" && prevSelect && d.prevencionista_id) {
            const opt = Array.from(prevSelect.options).find(o => String(o.value) === String(d.prevencionista_id));
            prevNombre = opt ? opt.text : d.prevencionista_id;
        }

        plantillaNombre = d.plantilla_nombre || d.plantilla || "-";
        if (plantillaNombre === "-" && plantillaSelect && d.plantilla_id) {
            const opt = Array.from(plantillaSelect.options).find(o => String(o.value) === String(d.plantilla_id));
            plantillaNombre = opt ? opt.text : d.plantilla_id;
        }
    } else {
        obraNombre = obraSelect?.options[obraSelect.selectedIndex]?.text || '-';
        prevNombre = prevSelect?.options[prevSelect.selectedIndex]?.text || '-';
        plantillaNombre = plantillaSelect?.options[plantillaSelect.selectedIndex]?.text || '-';
    }
    
    document.getElementById('pdf-auditoria-ref').innerText = `Ref: AUD-${aud_id || window.currentAuditoriaId || 'N/A'}`;
    document.getElementById('pdf-meta-obra').innerText = obraNombre;
    document.getElementById('pdf-meta-plantilla').innerText = plantillaNombre;
    document.getElementById('pdf-meta-prevencionista').innerText = prevNombre;
    
    // Si viene de Planes Aprobados, mostrar la fecha actual como fecha de reporte o la fecha de la auditoria
    document.getElementById('pdf-meta-fecha').innerText = (d && d.date) ? d.date : new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Calculate stats
    const respuestas = collectAuditResponses();
    let totalCumple = 0, totalNoCumple = 0, totalNA = 0;
    
    const categories = [];
    const domCategories = document.querySelectorAll('.audit-category');
    
    if (domCategories.length > 0) {
        domCategories.forEach(catDiv => {
            const catName = catDiv.querySelector('h3').innerText;
            const qDivs = catDiv.querySelectorAll('.audit-question');
            const catQuestions = [];
            let catC = 0, catNC = 0, catNA = 0;
            
            qDivs.forEach(qDiv => {
                const qId = qDiv.dataset.id;
                const text = qDiv.querySelector('strong').innerText;
                const r = respuestas.find(x => String(x.pregunta_id) === String(qId));
                const estado = r ? r.estado : 'Sin responder';
                const obs = r ? r.observacion : '';
                
                if(estado === 'Cumple') { catC++; totalCumple++; }
                else if(estado === 'No Cumple') { catNC++; totalNoCumple++; }
                else if(estado === 'N/A') { catNA++; totalNA++; }
                
                catQuestions.push({ text, estado, obs });
            });
            
            const catTotal = catC + catNC;
            const catPct = catTotal > 0 ? Math.round((catC / catTotal) * 100) : 0;
            
            categories.push({ name: catName, questions: catQuestions, c: catC, nc: catNC, na: catNA, pct: catPct });
        });
    } else if (d && d.respuestas) {
        const grouped = {};
        d.respuestas.forEach(r => {
            const cName = r.categoria_nombre || 'Categoría Desconocida';
            if (!grouped[cName]) {
                grouped[cName] = { name: cName, questions: [], c: 0, nc: 0, na: 0 };
            }
            const text = r.pregunta_texto || 'Pregunta ' + r.pregunta_id;
            const estado = r.estado || 'Sin responder';
            const obs = r.observacion || '';
            
            if(estado === 'Cumple') { grouped[cName].c++; totalCumple++; }
            else if(estado === 'No Cumple') { grouped[cName].nc++; totalNoCumple++; }
            else if(estado === 'N/A') { grouped[cName].na++; totalNA++; }
            
            grouped[cName].questions.push({ text, estado, obs });
        });
        
        Object.values(grouped).forEach(cat => {
            const catTotal = cat.c + cat.nc;
            cat.pct = catTotal > 0 ? Math.round((cat.c / catTotal) * 100) : 0;
            categories.push(cat);
        });
    }
    
    const totalCount = totalCumple + totalNoCumple;
    const totalPct = totalCount > 0 ? Math.round((totalCumple / totalCount) * 100) : 0;
    
    document.getElementById('pdf-meta-cumplimiento-pct').innerText = `${totalPct}%`;
    document.getElementById('pdf-meta-cumplimiento-stats').innerText = `${totalCumple} Cumple / ${totalNoCumple} No cumple / ${totalNA} N/A`;

    // 3. Render Chart
    const barsContainer = document.getElementById('pdf-chart-bars');
    let barsHtml = '';
    categories.forEach(cat => {
        let color = '#f39c12'; // orange
        if (cat.pct >= 90) color = '#2ecc71'; // green
        else if (cat.pct < 50) color = '#e74c3c'; // red
        
        barsHtml += `
            <div style="position: relative; height: 8px; margin-bottom: 30px;">
                <div style="position: absolute; left: -110px; width: 100px; text-align: right; font-size: 8px; font-weight: bold; color: #2c3e50; top: -2px;">${cat.name}</div>
                <div style="height: 100%; width: ${cat.pct}%; background-color: ${color}; border-radius: 4px; position: relative;"><span style="position: absolute; right: -30px; top: -2px; font-size: 9px; font-weight: bold; color: #2c3e50;">${cat.pct}%</span></div>
            </div>
        `;
    });
    barsContainer.innerHTML = barsHtml;

    // 4. Render Tables
    const tablesContainer = document.getElementById('pdf-tables-container');
    let tablesHtml = '';
    categories.forEach(cat => {
        let rowsHtml = '';
        cat.questions.forEach(q => {
            let color = '#34495e';
            if(q.estado === 'Cumple') color = '#27ae60';
            else if(q.estado === 'No Cumple') color = '#c0392b';
            
            rowsHtml += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #34495e;">${q.text}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; font-weight: bold; color: ${color}; text-align: center;">${q.estado}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #7f8c8d; font-style: italic;">${q.obs || '-'}</td>
                </tr>
            `;
        });
        
        tablesHtml += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4A47E3; margin: 0 0 5px 0; font-size: 12px;">${cat.name}</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f1f2f6;">
                            <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; text-align: left;">Pregunta / Requerimiento</th>
                            <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; width: 80px;">Evaluación</th>
                            <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; width: 150px;">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr style="background-color: #f8f9fa;">
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; font-weight: bold; color: #2c3e50;">CUMPLIMIENTO DEL NIVEL</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 11px; font-weight: bold; color: #f39c12; text-align: center;">${cat.pct}%</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 9px; color: #7f8c8d; text-align: center;">Cumple: ${cat.c} | No Cumple: ${cat.nc} | N/A: ${cat.na}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });
    tablesContainer.innerHTML = tablesHtml;

    // 5. Cierre Data
    if (d && (d.estado === 'Finalizada' || (d.estado && d.estado.toLowerCase() === 'planes aprobados') || d.estado_cierre === 'Cerrado' || document.getElementById('firma_coord_rut')?.value)) {
        document.getElementById('pdf-cierre-box').style.display = 'block';
        let complDate = "-";
        if (d && d.estado && d.estado.toLowerCase() === 'planes aprobados') {
            complDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
            document.getElementById('pdf-cierre-compromisos').innerText = `Planes de acción aprobados.`;
            document.getElementById('pdf-fecha-firma-prev').innerText = complDate;
            document.getElementById('pdf-fecha-firma-obra').innerText = complDate;
        } else {
            document.getElementById('pdf-cierre-compromisos').innerText = "Revisar anexo de planes de acción (si aplica).";
            document.getElementById('pdf-fecha-firma-prev').innerText = "";
            document.getElementById('pdf-fecha-firma-obra').innerText = "";
        }
        
        document.getElementById('pdf-firma-prev').innerText = prevNombre;
        document.getElementById('pdf-firma-obra').innerText = "Representante Obra";
    } else {
        document.getElementById('pdf-cierre-box').style.display = 'none';
        document.getElementById('pdf-fecha-firma-prev').innerText = "";
        document.getElementById('pdf-fecha-firma-obra').innerText = "";
        document.getElementById('pdf-firma-prev').innerText = prevNombre;
        document.getElementById('pdf-firma-obra').innerText = 'Representante Obra';
    }

    // (Page 3)
    // Render only if mode is 'planes' or there are planes requested
    const planesPage = document.getElementById('pdf-page-planes');
    const planesContainer = document.getElementById('pdf-planes-container');
    if (mode === 'blob_with_planes') {
        planesPage.style.display = 'block';
        const tbodyPlanes = document.getElementById('tabla-pendientes-plan-body');
        if (tbodyPlanes && tbodyPlanes.children.length > 0) {
            let planesHtml = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f2f6;">
                        <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; text-align: left;">Pregunta No Cumplida</th>
                        <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; text-align: left;">Plan de Acción Comprometido</th>
                        <th style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #2c3e50; width: 80px;">Plazo</th>
                    </tr>
                </thead>
                <tbody>
            `;
            Array.from(tbodyPlanes.querySelectorAll('tr')).forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if(tds.length >= 3) {
                    const preg = tds[0].innerText;
                    const planText = tr.querySelector('.plan-texto-input')?.value || '-';
                    const planDate = tr.querySelector('.plan-fecha-input')?.value || '-';
                    planesHtml += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #34495e;">${preg}</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #27ae60; font-weight: bold;">${planText}</td>
                            <td style="padding: 8px; border: 1px solid #bdc3c7; font-size: 10px; color: #e74c3c; text-align: center;">${planDate}</td>
                        </tr>
                    `;
                }
            });
            planesHtml += `</tbody></table>`;
            planesContainer.innerHTML = planesHtml;
        } else {
            planesContainer.innerHTML = '<p style="font-size: 12px; color: #7f8c8d;">No hay planes de acción comprometidos registrados en la tabla.</p>';
        }
    } else {
        planesPage.style.display = 'none';
    }

    // 7. Generate PDF
    const element = document.getElementById('pdf-export-content');
    element.parentElement.style.display = 'block'; // Make it visible temporarily for rendering
    
    const opt = {
        margin:       0,
        filename:     `Reporte_Auditoria_${aud_id || window.currentAuditoriaId || 'Preview'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    if (mode === 'download') {
        html2pdf().set(opt).from(element).save().then(() => {
            element.parentElement.style.display = 'none';
        });
    } else if (mode === 'blob' || mode === 'blob_with_planes') {
        html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
            element.parentElement.style.display = 'none';
            if (cb) cb(pdfBlob);
        });
    }
}

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
                    <td>${m.requiere_permiso ? 'SÃ­' : 'No'}</td>
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
    if(confirm('Â¿EstÃ¡ seguro de eliminar esta maquinaria?')) {
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
            let userObraId = window.currentObraId || localStorage.getItem('obra_id');
            data.forEach(o => {
                if (window.userProfile === 'jefe_obra' || window.userProfile === 'prevencionista' || window.userProfile === 'prevencionista_terreno') {
                    let userObras = window.userObras || [];
                    if (userObras.includes(o.id) || o.id == userObraId) {
                        obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                    }
                } else {
                    obraSelect.innerHTML += `<option value="${o.id}">${o.nombre}</option>`;
                }
            });
            if (userObraId) {
                obraSelect.value = userObraId;
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
