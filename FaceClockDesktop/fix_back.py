# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/components/RotationPlan.js')
text = path.read_text(encoding='utf-8')
text = text.replace("                ’'+? Back to Dashboard", '                ƒ+? Back to Dashboard')
path.write_text(text, encoding='utf-8')
