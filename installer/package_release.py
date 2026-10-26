import pathlib,zipfile,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
release=root/'release'; release.mkdir(exist_ok=True)
ignore={'.git','node_modules','dist','release','bin','obj','website','YagmurMelek-DC'}
with zipfile.ZipFile(release/'YagmurMelek-DC-0.5.8-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in root.rglob('*'):
  rel=p.relative_to(root)
  if p.is_file() and not any(x in ignore for x in rel.parts) and p.name != 'payload.zip': z.write(p,'YagmurMelek-DC/'+str(rel).replace('\\','/'))
with zipfile.ZipFile(release/'YagmurMelek-DC-0.5.8-dist.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in (root/'dist').iterdir():
  if p.is_file(): z.write(p,p.name)
 z.write(root/'LICENSE','LICENSE')
names=['YagmurMelekDcInstaller.exe','YagmurMelekDcCli.exe','YagmurMelek.cer','YagmurMelek-DC-0.5.8-source.zip','YagmurMelek-DC-0.5.8-dist.zip','YagmurMelekDc-update.json']
(release/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256((release/n).read_bytes()).hexdigest()+'  '+n for n in names if (release/n).exists())+'\n')
