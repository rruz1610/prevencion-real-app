import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the signature block
old_sig = """                <!-- Firmas -->
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
                </div>"""

new_sig = """                <!-- Firmas -->
                <div style="margin-top: 60px; display: flex; justify-content: space-between; padding: 0 40px;">
                    <div style="text-align: center; width: 200px;">
                        <div id="pdf-fecha-firma-prev" style="font-size: 10px; color: #34495e; margin-bottom: 5px; min-height: 15px; font-weight: 500;"></div>
                        <div style="border-bottom: 1px solid #7f8c8d; margin-bottom: 5px;"></div>
                        <div style="font-size: 10px; color: #7f8c8d;">Firma Experto Prevención</div>
                        <div id="pdf-firma-prev" style="font-size: 11px; color: #2c3e50; font-weight: bold; margin-top: 2px;">-</div>
                    </div>
                    <div style="text-align: center; width: 200px;">
                        <div id="pdf-fecha-firma-obra" style="font-size: 10px; color: #34495e; margin-bottom: 5px; min-height: 15px; font-weight: 500;"></div>
                        <div style="border-bottom: 1px solid #7f8c8d; margin-bottom: 5px;"></div>
                        <div style="font-size: 10px; color: #7f8c8d;">Firma Jefe de Obra</div>
                        <div id="pdf-firma-obra" style="font-size: 11px; color: #2c3e50; font-weight: bold; margin-top: 2px;">Representante Obra</div>
                    </div>
                </div>"""

content = content.replace(old_sig, new_sig)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated signatures in HTML")
