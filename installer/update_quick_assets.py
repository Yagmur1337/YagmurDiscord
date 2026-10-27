import json
import subprocess
import urllib.request
from pathlib import Path

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
out, _ = p.communicate('protocol=https\nhost=github.com\n\n')
token = ''
for line in out.splitlines():
    if line.startswith('password='):
        token = line.split('=', 1)[1]

if not token:
    raise RuntimeError("GitHub token could not be retrieved from git credential helper.")

headers = {
    "Authorization": f"Bearer {token}",
    "User-Agent": "YagmurRelease",
    "Accept": "application/vnd.github+json"
}

req = urllib.request.Request("https://api.github.com/repos/Yagmur1337/YagmurDiscord/releases/tags/0.6.2", headers=headers)
release = json.loads(urllib.request.urlopen(req).read().decode())
release_id = release["id"]
print("Release ID:", release_id)

for asset in release.get("assets", []):
    asset_name = asset["name"]
    asset_id = asset["id"]
    if asset_name in ["YagmurMelekDc-update.json", "YagmurMelek-DC-0.6.2-dist.zip"]:
        print(f"Deleting previous {asset_name} (ID: {asset_id})...")
        del_req = urllib.request.Request(
            f"https://api.github.com/repos/Yagmur1337/YagmurDiscord/releases/assets/{asset_id}",
            headers=headers,
            method="DELETE"
        )
        urllib.request.urlopen(del_req)

for name, path, content_type in [
    ("YagmurMelekDc-update.json", Path("release/YagmurMelekDc-update.json"), "application/json"),
    ("YagmurMelek-DC-0.6.2-dist.zip", Path("release/YagmurMelek-DC-0.6.2-dist.zip"), "application/zip")
]:
    data = path.read_bytes()
    upload_url = f"https://uploads.github.com/repos/Yagmur1337/YagmurDiscord/releases/{release_id}/assets?name={name}"
    up_headers = dict(headers)
    up_headers["Content-Type"] = content_type
    up_req = urllib.request.Request(upload_url, data=data, headers=up_headers, method="POST")
    res = json.loads(urllib.request.urlopen(up_req).read().decode())
    print(f"Uploaded {name} -> ID {res['id']}")
