from pathlib import Path
text = Path('src/components/RotationPlan.js').read_text(encoding='utf-8')
needle = 'overview-section'
idx = text.find(needle)
print(repr(text[idx-20:idx+40]))
