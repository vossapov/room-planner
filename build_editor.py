#!/usr/bin/env python3
"""Build a dependency-free, file://-compatible editor from tested core and actual presets."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
presets={key:json.loads(((ROOT/'presets'/f'{key}.json') if (ROOT/'presets'/f'{key}.json').exists() else (ROOT.parent/'output/layout-variants'/folder/'scheme.json')).read_text()) for key,folder in [('variant-01','variant-01'),('concept-02','concept-02-reworked')]}
core=re.sub(r'^export\s+', '', (ROOT/'core.js').read_text(), flags=re.M)
html=(ROOT/'editor.html').read_text().replace('/*CORE*/',core).replace('/*PRESETS*/',json.dumps(presets,ensure_ascii=False).replace('</','<\\/')).replace('/*APP*/',(ROOT/'editor.js').read_text())
html=html.replace('/*CLOUD*/',re.sub(r'^export\s+', '', (ROOT/'cloud.mjs').read_text(), flags=re.M)).replace('/*CLOUD_UI*/',(ROOT/'cloud-ui.js').read_text())
assert not any(marker in html for marker in ('/*CORE*/','/*PRESETS*/','/*APP*/'))
(ROOT/'index.html').write_text(html)
print('Built',ROOT/'index.html',len(html.encode()),'bytes, 2 real presets')
