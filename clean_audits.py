import pandas as pd
import shutil
import os

files = [
    "plantillas_auditoria.xlsx",
    "respuestas_auditoria.xlsx",
    "PlanesAccion.xlsx",
    "ReportabilidadMensual.xlsx"
]

for f in files:
    if os.path.exists(f):
        print(f"Backing up and cleaning {f}...")
        shutil.copy(f, f + ".backup")
        
        try:
            # Read all sheets to get columns
            all_dfs = pd.read_excel(f, sheet_name=None)
            
            with pd.ExcelWriter(f, engine='openpyxl') as writer:
                for sheet_name, df in all_dfs.items():
                    # Create an empty DataFrame with the same columns
                    empty_df = pd.DataFrame(columns=df.columns)
                    empty_df.to_excel(writer, sheet_name=sheet_name, index=False)
                    print(f"  - Cleared sheet '{sheet_name}'")
        except Exception as e:
            print(f"Error cleaning {f}: {e}")
    else:
        print(f"File {f} not found.")

print("Cleaning complete.")
