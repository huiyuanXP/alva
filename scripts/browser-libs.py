"""Fetch verified public Ubuntu runtime libraries into this project's private runtime.
Does not use or modify the host package database, system files or permission settings.
"""
from pathlib import Path
import gzip, hashlib, json, subprocess, urllib.request
root = Path(__file__).resolve().parents[1]
out = root / '.runtime' / 'browser-libs'
out.mkdir(parents=True, exist_ok=True)
base = 'https://archive.ubuntu.com/ubuntu/'
index_path = out / 'Packages.gz'
if not index_path.exists():
    urllib.request.urlretrieve(base + 'dists/noble/main/binary-amd64/Packages.gz', index_path)
blocks = gzip.decompress(index_path.read_bytes()).decode().split('\n\n')
index = {}
for block in blocks:
    data = dict(line.split(': ', 1) for line in block.splitlines() if ': ' in line and not line.startswith(' '))
    if 'Package' in data:
        index[data['Package']] = data
names = ['libatk1.0-0t64', 'libatk-bridge2.0-0t64', 'libatspi2.0-0t64', 'libxcomposite1', 'libxdamage1', 'libxfixes3', 'libxrandr2', 'libgbm1', 'libasound2t64', 'libdrm2', 'libwayland-server0']
manifest = []
for name in names:
    item = index[name]
    path = out / (name + '.deb')
    if not path.exists():
        urllib.request.urlretrieve(base + item['Filename'], path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != item['SHA256']:
        raise RuntimeError('Checksum mismatch: ' + name)
    subprocess.run(['dpkg-deb', '-x', str(path), str(out)], check=True)
    manifest.append({'package': name, 'version': item['Version'], 'sha256': digest, 'source': base + item['Filename']})
    print('Verified and extracted', name)
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2))
