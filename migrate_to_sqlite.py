import pandas as pd
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database.db')

EXCELS = {
    'mantenedores.xlsx': 'MANT_',
    'datos_operativos.xlsx': 'OPER_',
    'plantillas_auditoria.xlsx': 'AUDIT_',
    'respuestas_auditoria.xlsx': 'RESP_',
    'PlanesAccion.xlsx': 'PLANES_'
}

def migrate_all():
    conn = sqlite3.connect(DB_PATH)
    for excel_file, prefix in EXCELS.items():
        path = os.path.join(BASE_DIR, excel_file)
        if not os.path.exists(path):
            print(f"Skipping {excel_file}, does not exist.")
            continue
            
        print(f"Migrating {excel_file}...")
        try:
            xls = pd.ExcelFile(path)
            for sheet in xls.sheet_names:
                df = pd.read_excel(path, sheet_name=sheet, dtype=str)
                table_name = f"{prefix}{sheet}"
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                print(f"  -> Created table {table_name} with {len(df)} rows.")
        except Exception as e:
            print(f"Error migrating {excel_file}: {e}")
            
    conn.close()
    print("Migration complete.")

if __name__ == '__main__':
    migrate_all()
