import pandas as pd

file_path = r'C:\Users\rruz8\Desktop\prevencion\AUDITORIA INTERNA SST 2025.xlsx'
xl = pd.ExcelFile(file_path)
df = pd.read_excel(xl, xl.sheet_names[0])
print(df.iloc[10:30].to_string())
