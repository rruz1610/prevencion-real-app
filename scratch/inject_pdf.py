import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

template_html = """
    <!-- PDF Export Template (Hidden from UI, used only for html2pdf) -->
    <div id="pdf-export-template" style="display: none;">
        <div id="pdf-export-content" style="background-color: #ffffff; color: #333333; font-family: 'Inter', 'Segoe UI', sans-serif; width: 800px; padding: 40px; box-sizing: border-box;">
            <!-- Page 1 -->
            <div class="pdf-page" style="page-break-after: always; position: relative;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px;">
                    <div>
                        <h1 style="color: #4A47E3; margin: 0; font-size: 24px; font-weight: bold;">PrevenEASY Pro</h1>
                        <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">GESTIÓN DE PREVENCIÓN Y SALUD OCUPACIONAL</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="color: #2c3e50; margin: 0; font-size: 16px; font-weight: 600;">Reporte de Auditoría SST</h2>
                        <p id="pdf-auditoria-ref" style="color: #95a5a6; margin: 2px 0 0 0; font-size: 10px;">Ref: AUD-</p>
                    </div>
                </div>
                <div style="height: 3px; background-color: #4A47E3; margin-bottom: 30px;"></div>

                <!-- Metadata Grid -->
                <div style="display: flex; gap: 20px; margin-bottom: 40px;">
                    <div style="flex: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background-color: #fafafa;">
                            <div style="color: #7f8c8d; font-size: 9px; font-weight: 600; margin-bottom: 5px;">OBRA / PROYECTO</div>
                            <div id="pdf-meta-obra" style="color: #2c3e50; font-size: 12px; font-weight: 500;">-</div>
                        </div>
                        <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background-color: #fafafa;">
                            <div style="color: #7f8c8d; font-size: 9px; font-weight: 600; margin-bottom: 5px;">PLANTILLA UTILIZADA</div>
                            <div id="pdf-meta-plantilla" style="color: #2c3e50; font-size: 12px; font-weight: 500;">-</div>
                        </div>
                        <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background-color: #fafafa;">
                            <div style="color: #7f8c8d; font-size: 9px; font-weight: 600; margin-bottom: 5px;">PREVENCIONISTA A CARGO</div>
                            <div id="pdf-meta-prevencionista" style="color: #2c3e50; font-size: 12px; font-weight: 500;">-</div>
                        </div>
                        <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background-color: #fafafa;">
                            <div style="color: #7f8c8d; font-size: 9px; font-weight: 600; margin-bottom: 5px;">FECHA DE EJECUCIÓN</div>
                            <div id="pdf-meta-fecha" style="color: #2c3e50; font-size: 12px; font-weight: 500;">-</div>
                        </div>
                    </div>
                    
                    <div style="flex: 1; border: 2px solid #f39c12; border-radius: 8px; padding: 15px; text-align: center; background-color: #fffaf0; display: flex; flex-direction: column; justify-content: center;">
                        <div style="color: #2c3e50; font-size: 11px; font-weight: 600; margin-bottom: 5px;">CUMPLIMIENTO</div>
                        <div id="pdf-meta-cumplimiento-pct" style="color: #f39c12; font-size: 36px; font-weight: bold; margin-bottom: 5px; line-height: 1;">0%</div>
                        <div id="pdf-meta-cumplimiento-stats" style="color: #7f8c8d; font-size: 9px; font-weight: 500;">0 Cumple / 0 No cumple / 0 N/A</div>
                    </div>
                </div>

                <!-- Chart -->
                <div>
                    <h3 style="color: #2c3e50; font-size: 14px; margin-bottom: 20px;">Cumplimiento por Nivel (Categoría)</h3>
                    
                    <div style="position: relative; padding-left: 120px; padding-bottom: 25px; margin-top: 30px;">
                        <!-- Grid lines -->
                        <div style="position: absolute; left: 120px; right: 0; top: 0; bottom: 25px; border-left: 1px solid #bdc3c7; border-bottom: 1px solid #bdc3c7;">
                            <div style="position: absolute; left: 10%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 20%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 30%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 40%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 50%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 60%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 70%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 80%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 90%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                            <div style="position: absolute; left: 100%; top: 0; bottom: 0; border-left: 1px solid #ecf0f1;"></div>
                        </div>
                        
                        <!-- Axis Labels -->
                        <div style="position: absolute; left: 120px; right: 0; bottom: 0; display: flex; justify-content: space-between; font-size: 9px; color: #7f8c8d; transform: translateX(-50%); width: calc(100% + 15px);">
                            <span style="transform: translateX(10px)">0%</span>
                            <span>10%</span>
                            <span>20%</span>
                            <span>30%</span>
                            <span>40%</span>
                            <span>50%</span>
                            <span>60%</span>
                            <span>70%</span>
                            <span>80%</span>
                            <span>90%</span>
                            <span>100%</span>
                        </div>

                        <!-- Bars Container -->
                        <div id="pdf-chart-bars" style="position: relative; z-index: 1; padding-top: 10px; display: flex; flex-direction: column; gap: 30px;">
                            <!-- Bars will be injected here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Page 2 -->
            <div class="pdf-page">
                <h3 style="color: #2c3e50; font-size: 14px; margin-bottom: 20px;">Detalle de Respuestas por Nivel</h3>
                
                <div id="pdf-tables-container">
                    <!-- Tables will be injected here -->
                </div>

                <div id="pdf-cierre-box" style="margin-top: 30px; display: none;">
                    <div style="border: 1px solid #bdc3c7; border-radius: 8px; padding: 15px; background-color: #fafafa;">
                        <h4 style="color: #4A47E3; margin: 0 0 15px 0; font-size: 13px;">Cierre de Auditoría</h4>
                        <div style="margin-bottom: 10px;">
                            <strong style="font-size: 11px; color: #2c3e50;">Comentarios / Observaciones:</strong><br>
                            <span id="pdf-cierre-comentarios" style="font-size: 11px; color: #34495e;">-</span>
                        </div>
                        <div>
                            <strong style="font-size: 11px; color: #2c3e50;">Compromisos / Medidas Correctivas:</strong><br>
                            <span id="pdf-cierre-compromisos" style="font-size: 11px; color: #34495e;">-</span>
                        </div>
                    </div>
                </div>

                <!-- Firmas -->
                <div style="margin-top: 60px; display: flex; justify-content: space-between; padding: 0 40px;">
                    <div style="text-align: center; width: 200px;">
                        <div style="border-bottom: 1px solid #7f8c8d; margin-bottom: 5px;"></div>
                        <div style="font-size: 10px; color: #7f8c8d;">Firma Experto Prevención</div>
                        <div id="pdf-firma-prev" style="font-size: 11px; color: #2c3e50; font-weight: bold; margin-top: 2px;">-</div>
                    </div>
                    <div style="text-align: center; width: 200px;">
                        <div style="border-bottom: 1px solid #7f8c8d; margin-bottom: 5px;"></div>
                        <div style="font-size: 10px; color: #7f8c8d;">Firma Jefe de Obra</div>
                        <div id="pdf-firma-obra" style="font-size: 11px; color: #2c3e50; font-weight: bold; margin-top: 2px;">Representante Obra</div>
                    </div>
                </div>
            </div>
            
            <!-- Page 3 Planes (Optional) -->
            <div id="pdf-page-planes" class="pdf-page" style="display: none; page-break-before: always; margin-top: 40px;">
                <h3 style="color: #4A47E3; font-size: 16px; margin-bottom: 20px; border-bottom: 2px solid #4A47E3; padding-bottom: 5px;">Planes de Acción Comprometidos</h3>
                <div id="pdf-planes-container">
                    <!-- Planes Table injected here -->
                </div>
            </div>
        </div>
    </div>
"""

content = content.replace('</body>', f'{template_html}\n</body>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Template injected to index.html")
