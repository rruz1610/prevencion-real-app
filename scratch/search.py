import os
import re

def search(query, extensions):
    pattern = re.compile(query, re.IGNORECASE)
    for root, dirs, files in os.walk('.'):
        if 'scratch' in root or '.git' in root or '__pycache__' in root:
            continue
        for f in files:
            if f.endswith(extensions):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        for i, line in enumerate(file):
                            if pattern.search(line):
                                print(f"{path}:{i+1}:{line.strip()}")
                except Exception:
                    pass

search('prevensaas', ('.html', '.js', '.py', '.css'))
search('admin', ('.html', '.js'))
search('\(excel\)', ('.html', '.js'))
