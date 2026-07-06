import pandas as pd
from sqlalchemy import create_engine
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

NEON_URI = "postgresql+psycopg2://neondb_owner:npg_ts7VbInck3AR@ep-bitter-tooth-acrw6qlu-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_URI)

EXCELS = {
    'mantenedores.xlsx': 'MANT_',
    'datos_operativos.xlsx': 'OPER_',
    'plantillas_auditoria.xlsx': 'AUDIT_',
    'respuestas_auditoria.xlsx': 'RESP_',
    'PlanesAccion.xlsx': 'PLANES_'
}

def migrate_all():
    print("Starting migration to NEON PostgreSQL...")
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
                table_name = f"{prefix}{sheet}".lower() # Postgres prefers lowercase tables
                df.to_sql(table_name, engine, if_exists='replace', index=False)
                print(f"  -> Created table {table_name} with {len(df)} rows.")
        except Exception as e:
            print(f"Error migrating {excel_file}: {e}")
            
    print("Migration complete.")

if __name__ == '__main__':
    migrate_all()
