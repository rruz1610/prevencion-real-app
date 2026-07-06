import pandas as pd
import re
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_EXCEL = os.path.join(BASE_DIR, 'Planilla Auditoria SST.xlsx')
DEST_EXCEL = os.path.join(BASE_DIR, 'plantillas_auditoria.xlsx')

def extract_audits():
    xl = pd.ExcelFile(SOURCE_EXCEL)
    
    # Preparamos los dataframes
    df_plantillas = pd.DataFrame([{"id": 1, "nombre": "AUDITORIA INTERNA SST 2025"}])
    
    categorias_data = []
    preguntas_data = []
    
    cat_id_counter = 1
    preg_id_counter = 1
    
    for i, sheet_name in enumerate(xl.sheet_names):
        if 'Cierre' in sheet_name:
            continue # Saltamos la ultima hoja
            
        df = pd.read_excel(xl, sheet_name)
        
        # Find first question to get the title from the row above it
        title = ""
        if 'Unnamed: 1' in df.columns:
            first_q_idx = None
            for idx, row in df.iterrows():
                val = str(row['Unnamed: 1']).strip()
                if val == 'nan':
                    continue
                if re.match(r'^\d+\.\d+', val) or val.startswith('¿') or val.startswith(chr(191)):
                    first_q_idx = idx
                    break
            if first_q_idx is not None:
                for idx in range(first_q_idx - 1, -1, -1):
                    val = str(df.iloc[idx]['Unnamed: 1']).strip()
                    if val != 'nan' and val != '':
                        title = val
                        break
        
        # Agregamos categoria
        cat_name = f"{sheet_name}: {title}" if title else sheet_name
        categorias_data.append({
            "id": cat_id_counter,
            "plantilla_id": 1,
            "nombre": cat_name,
            "orden": i + 1
        })
        
        # Extraemos preguntas de la hoja
        # Asumimos que las preguntas estan en la columna 'Unnamed: 1' y empiezan con numero o signo de interrogacion
        if 'Unnamed: 1' in df.columns:
            for idx, row in df.iterrows():
                val = str(row['Unnamed: 1']).strip()
                if val == 'nan':
                    continue
                # Check si empieza con numero.numero (ej: 1.1, 2.14) o ¿
                if re.match(r'^\d+\.\d+', val) or val.startswith('¿') or val.startswith(chr(191)):
                    preguntas_data.append({
                        "id": preg_id_counter,
                        "categoria_id": cat_id_counter,
                        "texto": val
                    })
                    preg_id_counter += 1
                    
        cat_id_counter += 1
        
    df_categorias = pd.DataFrame(categorias_data)
    df_preguntas = pd.DataFrame(preguntas_data)
    
    with pd.ExcelWriter(DEST_EXCEL) as writer:
        df_plantillas.to_excel(writer, sheet_name="Plantillas", index=False)
        df_categorias.to_excel(writer, sheet_name="Categorias", index=False)
        df_preguntas.to_excel(writer, sheet_name="Preguntas", index=False)
        
    print(f"Exportación exitosa. Categorias: {len(categorias_data)}, Preguntas: {len(preguntas_data)}")

if __name__ == "__main__":
    extract_audits()

