import pandas as pd
import os

data_path = 'prevencion_data.xlsx'

if os.path.exists(data_path):
    all_dfs = pd.read_excel(data_path, sheet_name=None, keep_default_na=False)
    
    with pd.ExcelWriter(data_path) as writer:
        for s_name, df in all_dfs.items():
            # Truncate all rows, keep columns
            empty_df = pd.DataFrame(columns=df.columns)
            empty_df.to_excel(writer, sheet_name=s_name, index=False)
            
    print("All sheets truncated successfully.")
else:
    print("File not found.")
