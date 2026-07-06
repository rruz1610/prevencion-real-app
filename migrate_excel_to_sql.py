import os
import pandas as pd
from sqlalchemy import create_engine

# Database Connection
NEON_URI = "postgresql+psycopg2://neondb_owner:npg_ts7VbInck3AR@ep-bitter-tooth-acrw6qlu-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_URI, pool_size=10, max_overflow=20)

EXCEL_PATH = "mantenedores.xlsx"
PREFIX = "MANT_"

def migrate_to_sql():
    if not os.path.exists(EXCEL_PATH):
        print(f"File {EXCEL_PATH} not found!")
        return

    print(f"Reading {EXCEL_PATH}...")
    try:
        all_dfs = pd.read_excel(EXCEL_PATH, sheet_name=None, dtype=str)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    for sheet_name, df in all_dfs.items():
        table_name = f"{PREFIX}{sheet_name}".lower()
        print(f"Migrating sheet '{sheet_name}' to table '{table_name}'...")
        
        # Clean column names (lowercase, remove spaces)
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
        
        try:
            # Write to SQL (replace existing table)
            df.to_sql(table_name, engine, if_exists="replace", index=False)
            print(f"  -> Successfully migrated {len(df)} rows.")
        except Exception as e:
            print(f"  -> Error migrating {sheet_name}: {e}")

if __name__ == "__main__":
    migrate_to_sql()
    print("Migration completed!")
