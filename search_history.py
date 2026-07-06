import glob

files = glob.glob(r'C:\Users\rruz8\.gemini\antigravity-ide\brain\*\.system_generated\logs\transcript.jsonl')
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if "open('static/app.js', 'w'" in line or 'open("static/app.js", "w"' in line or 'TargetFile\":\"c:\\\\Users\\\\rruz8\\\\Desktop\\\\prevencion-real\\\\static\\\\app.js\"' in line or 'TargetFile\":\"c:\\\\\\\\Users\\\\\\\\rruz8\\\\\\\\Desktop\\\\\\\\prevencion-real\\\\\\\\static\\\\\\\\app.js\"' in line:
                print('Found in', file, 'line', i)
