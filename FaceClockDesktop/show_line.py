from pathlib import Path
for idx,line in enumerate(Path('src/components/RotationPlan.js').read_text(encoding='utf-8').splitlines(),1):
    if 'Back to Dashboard' in line:
        print(idx,line.encode('unicode_escape'))
        break
