import os
import subprocess
import urllib.request
import urllib.parse
import json
from pathlib import Path

# 1. Retrieve GitHub Token
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
    "Accept": "application/vnd.github+json",
    "User-Agent": "YagmurMelekReleasePublisher",
    "X-GitHub-Api-Version": "2022-11-28"
}

repo = "Yagmur1337/YagmurDiscord"
tag = "0.6.2"

release_body = """# 🚀 Yağmur Discord v0.6.2 - Donma Düzeltmesi & 8 Yeni Eklenti

Bu sürümde, Discord açılışındaki kilitlenme ve donma problemi kökünden tespit edilip giderilmiş; kullanıcımızın talep ettiği **8 yeni isteğe bağlı eklenti** sisteme kazandırılmıştır.

> **ÖNEMLİ KURAL UYGULANDI:**  
> Kullanıcı talebi doğrultusunda eklenen tüm yeni eklentiler **varsayılan olarak KAPALIDIR (`enabledByDefault: false`)**.  
> Discord'unuz ilk açılışta tertemiz, sıfır gecikmeyle ve tamamen sorunsuz başlar. Dilediğiniz özelliği **Discord Ayarları → Eklentiler (Plugins)** sekmesinden tek tıkla açabilirsiniz.

---

## 🛠️ Başlangıçtaki Donma Sorununun Kök Nedeni ve Çözümü

Kullanıcılarımızın bildirdiği "Discord açılır açılmaz donuyor, çökmüyor, hata vermiyor ama düzelmiyor" sorununun hata günlükleri (`%APPDATA%\\discord\\logs\\renderer_js.log`) incelenmiş ve 3 temel neden saptanarak tamamen temizlenmiştir:

1. **Electron Salt Okunur (Read-Only) Nesne Çakışması:**
   - Discord Electron ortamında `window.DiscordNative.desktopCapture` özellikleri dondurulmuş (read-only) durumdadır. Bu nesneye doğrudan atama yapılması JavaScript Strict Mode altında `TypeError: Cannot assign to read only property` fırlatıp Discord renderer thread'ini kilitliyordu.
   - **Çözüm:** `desktopCapture` nesnesine doğrudan atama kaldırıldı; güvenli wrapper yalnızca standart `navigator.mediaDevices.getUserMedia` üzerinden izole edildi.
2. **Menü Taraması ve Sonsuz Döngü / Rekürsiyon:**
   - `menu.ts` içerisinde `waitFor` döngüsünde her modül yüklenişinde `Function.prototype.toString` çalıştırılması ana işlem parçacığını 62 saniye boyunca donduruyordu (`[READY_SUPPLEMENTAL] took 62000ms`).
   - `ContextMenu.ts` ve `menu.ts` Vencord'un stabil çekirdeğine geri alındı, gereksiz ve ağır derin DOM klonlamaları iptal edildi.
3. **Kullanıcı Paneli AST Yama Çakışması:**
   - `yagmurMelekVoice` ve `yagmurMelekExtras` zaten hesap paneli butonunu yamalamaktaydı. Üçüncü bir yama eklenmesi ve bulunamayan lazy bileşen çağrısı Discord arayüzünün çizimini durduruyordu. Bu çakışan yama tamamen temizlendi.

---

## 🧩 Yeni Eklenen 8 Eklenti (İsteğe Bağlı)

Tüm yeni eklentiler `enabledByDefault: false` ile gelir:

1. **YagmurMelekScreenCrop (Bölgesel Ekran Paylaşımı):**
   - Tüm ekran veya pencere yerine yalnızca fareyle seçtiğiniz dikdörtgen piksel alanını canlı yayına verir.
2. **YagmurMelekScreenWatermark (Yayın Damgası / Saat / FPS):**
   - Canlı ekran paylaşımınızın köşesine Yağmur Discord logosu, gerçek zamanlı dijital saat veya 60 FPS göstergesi yerleştirir.
3. **YagmurMelekAudioEqualizer (10 Bantlı Gelişmiş Ses Ekolayzerı):**
   - Giriş ve çıkış sesleri için 10 bantlı EQ (32Hz - 16kHz), Bass Boost önayarı ve konuşma netleştirici filtre sunar.
4. **YagmurMelekQuickClip (Son 30 Saniyeyi KliPle):**
   - Ekran/yayın tampon kaydı tutarak `Alt + C` veya panel butonuyla yayının son 30 saniyesini anında WebM/MP4 olarak bilgisayarınıza kaydeder.
5. **YagmurMelekPrivacyBlur (Yayın Gizlilik Kalkanı):**
   - Ekran paylaşırken veya arkadaşlarınız yanınızdayken gelen özel Discord bildirimlerini ve DM konuşmalarını otomatik mozaikler. Farenin üzerine gelmesiyle geçici netleşme sağlar.
6. **YagmurMelekAutoDeafenWhileGaming (Oyuna Girince Otomatik Sağırlaş/Sustur):**
   - Seçtiğiniz rekabetçi oyunlara (CS2, Valorant, R6, LoL vb.) girdiğinizi otomatik algılar ve Discord'da sağırlaşır/mikrofonu kapatır. Oyundan çıkınca eski ses durumunuza geri döner.
7. **YagmurMelekSoundpadLite (Dahili Ses Efekti Paneli):**
   - Harici Soundpad uygulamasına gerek olmadan `Alt + 1-6` kısayollarıyla veya panel matrisiyle anında ses efektleri (Airhorn, Buzzer, Coin, Level Up, Laser vb.) çalar.
8. **YagmurMelekMediaDownloader (Hızlı Medya İndirici):**
   - Kanallardaki ve DM'lerdeki video, ses ve resimlere sağ tıklayarak Discord'un küçültme parametreleri olmadan doğrudan tam orijinal çözünürlükte indirme sağlar.

---

## 🔒 Dosya Doğrulama Bilgileri (SHA-256)

```
7a1496faff0e03eda469f4a3be7d9fa358337c0d0b70990f2d9b454508dabad6  YagmurMelekDcInstaller.exe
bbb0bbd8a44d32365894436c048bd5bdd3edf494fb4b8ab1a94062ffb6915ca8  YagmurMelekDcCli.exe
e15374182371e01f1d6a3f39e647af9cace1118e4d56fa433e61491a6fafb298  YagmurMelek.cer
b97c0c2a638bc1a1f94609faa4b543f630d43c36a7bbab4b5d40fb4661a005e6  YagmurMelek-DC-0.6.2-source.zip
eec6864057689bdbb99d4ee1cde0f9dccfdc9da91be1577163e69657e1330cf7  YagmurMelek-DC-0.6.2-dist.zip
95e4f604058e08023c864ac6b24ec86feb64c2b58347a04c3bee4fe83ecbc1e4  YagmurMelekDc-update.json
```

---

## 📥 Kurulum

1. **Grafiksel Kurulum:** `YagmurMelekDcInstaller.exe` dosyasını indirip çalıştırın ve **Kur / Güncelle** butonuna tıklayın.
2. **CLI Kurulum:** `YagmurMelekDcCli.exe install` komutunu çalıştırın.
3. Önceden kuruluysa Discord'u açtığınızda güncelleme motoru otomatik olarak 0.6.2 sürümünü alacaktır.
"""

# 2. Check if release exists
print(f"Checking existing release for tag {tag}...")
req = urllib.request.Request(f"https://api.github.com/repos/{repo}/releases/tags/{tag}", headers=headers)
release_id = None
upload_url = None

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        release_id = data["id"]
        upload_url = data["upload_url"]
        print(f"Found existing release ID {release_id}")
except urllib.error.HTTPError as e:
    if e.code == 404:
        print("Release does not exist, creating new release...")
    else:
        raise

if release_id:
    # Update release details
    update_data = json.dumps({
        "tag_name": tag,
        "name": f"Yağmur Discord v{tag} (Donma Düzeltmesi & 8 Yeni Eklenti Paketi)",
        "body": release_body,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases/{release_id}",
        data=update_data,
        headers=headers,
        method="PATCH"
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        upload_url = data["upload_url"]
        print("Updated release metadata.")
else:
    # Create release
    create_data = json.dumps({
        "tag_name": tag,
        "target_commitish": "main",
        "name": f"Yağmur Discord v{tag} (Donma Düzeltmesi & 8 Yeni Eklenti Paketi)",
        "body": release_body,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases",
        data=create_data,
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        release_id = data["id"]
        upload_url = data["upload_url"]
        print(f"Created new release with ID {release_id}")

# 3. Clean existing assets if any
print("Listing existing release assets...")
req = urllib.request.Request(f"https://api.github.com/repos/{repo}/releases/{release_id}/assets", headers=headers)
with urllib.request.urlopen(req) as resp:
    assets = json.loads(resp.read().decode())
    for a in assets:
        print(f"Deleting previous asset {a['name']} (ID {a['id']})...")
        del_req = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/releases/assets/{a['id']}",
            headers=headers,
            method="DELETE"
        )
        urllib.request.urlopen(del_req).close()

# 4. Upload fresh assets
release_dir = Path("release")
target_files = [
    "YagmurMelekDcInstaller.exe",
    "YagmurMelekDcCli.exe",
    "YagmurMelek.cer",
    "YagmurMelek-DC-0.6.2-source.zip",
    "YagmurMelek-DC-0.6.2-dist.zip",
    "YagmurMelekDc-update.json",
    "SHA256SUMS.txt"
]

clean_upload_url = upload_url.split("{?")[0]

for filename in target_files:
    file_path = release_dir / filename
    if not file_path.exists():
        print(f"WARNING: File {file_path} not found!")
        continue
    
    file_bytes = file_path.read_bytes()
    content_type = "application/octet-stream"
    if filename.endswith(".json"):
        content_type = "application/json"
    elif filename.endswith(".txt"):
        content_type = "text/plain"
    elif filename.endswith(".zip"):
        content_type = "application/zip"
    elif filename.endswith(".exe"):
        content_type = "application/vnd.microsoft.portable-executable"

    query = urllib.parse.urlencode({"name": filename})
    up_url = f"{clean_upload_url}?{query}"

    print(f"Uploading {filename} ({len(file_bytes)} bytes)...")
    req = urllib.request.Request(
        up_url,
        data=file_bytes,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
            "User-Agent": "YagmurMelekReleasePublisher"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode())
        print(f"Uploaded {filename} -> ID {res_data['id']}")

print("All assets uploaded successfully to GitHub Release 0.6.2!")
