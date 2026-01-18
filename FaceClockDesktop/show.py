from pathlib import Path
text = Path('src/components/RotationPlan.js').read_text(encoding='utf-8')
start = text.find('// Getting Started Section')
print(text[start-200:start+800])
