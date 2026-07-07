path = r'c:\Users\rruz8\Desktop\prevencion-real\static\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

head_close = '</head>'
script_tag = '    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n</head>'

if head_close in content:
    content = content.replace(head_close, script_tag)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added XLSX script")
else:
    print("Could not find </head>")
