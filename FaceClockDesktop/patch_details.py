from pathlib import Path
path = Path('src/components/RotationPlan.js')
text = path.read_text(encoding='utf-8')
old = '</section>\r\n\r\n        <details'
if old not in text:
    raise SystemExit('pattern missing CRLF')
text = text.replace(old, '</section>\r\n        </details>\r\n\r\n        <details')
path.write_text(text, encoding='utf-8')
