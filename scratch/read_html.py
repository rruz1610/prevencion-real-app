import os

with open(r'c:\Users\rruz8\Desktop\prevencion-real\static\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines[30:100]):
        print(f"{i+31}: {line.strip()}")
