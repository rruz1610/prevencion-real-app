import sqlite3
import pandas as pd
import os

DB_PATH = 'database.db'
EXCEL_PATH = 'datos_operativos.xlsx'

def migrate_data():
    if not os.path.exists(DB_PATH):
        print(f"Base de datos {DB_PATH} no encontrada.")
        return

    conn = sqlite3.connect(DB_PATH)
    
    # Tablas a migrar
    tables = [
        "trabajadores",
        "epp_stock",
        "denuncias_karin",
        "entregas_documentos",
        "codigos_verificacion"
    ]
    
    all_dfs = {}
    
    # Leer de SQLite
    for table in tables:
        try:
            df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
            # Asegurar que todas las columnas sean strings para compatibilidad con Pandas
            df = df.astype(str)
            # Convertir 'None' string de vuelta a string vacío si SQLite lo importó así
            df = df.replace('None', '')
            df = df.replace('nan', '')
            
            # Agregar empresa_id vacio
            df['empresa_id'] = ""
            
            all_dfs[table] = df
            print(f"Tabla {table} leída. ({len(df)} filas)")
        except Exception as e:
            print(f"Error leyendo tabla {table}: {e}")
            all_dfs[table] = pd.DataFrame(columns=["id", "empresa_id"])
            
    conn.close()
    
    # Guardar en Excel
    with pd.ExcelWriter(EXCEL_PATH) as writer:
        for sheet_name, df in all_dfs.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
    print(f"Migración completada. Datos guardados en {EXCEL_PATH}")

if __name__ == '__main__':
    migrate_data()
