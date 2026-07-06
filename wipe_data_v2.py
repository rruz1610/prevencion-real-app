import pandas as pd
import os

files_to_wipe = [
    'mantenedores.xlsx',
    'respuestas_auditoria.xlsx',
    'PlanesAccion.xlsx',
    'ReportabilidadMensual.xlsx'
]

for data_path in files_to_wipe:
    if os.path.exists(data_path):
        all_dfs = pd.read_excel(data_path, sheet_name=None, keep_default_na=False)
        with pd.ExcelWriter(data_path) as writer:
            for s_name, df in all_dfs.items():
                empty_df = pd.DataFrame(columns=df.columns)
                empty_df.to_excel(writer, sheet_name=s_name, index=False)
        print(f"Truncated {data_path}")
    else:
        print(f"Skipped {data_path} (not found)")
