import re

path = r'c:\Users\rruz8\Desktop\prevencion-real\static\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'const cacheUrl = cacheUrl\.includes\("\?"\) \? `\$\{cacheUrl\}&_t=\$\{Date\.now\(\)\}` : `\$\{cacheUrl\}\?_t=\$\{Date\.now\(\)\}`;\s+const ([a-zA-Z0-9_]+) = await fetchAPI\(url\);',
    r'const cacheUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;\n    const \1 = await fetchAPI(cacheUrl);',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed cacheUrl bugs")
