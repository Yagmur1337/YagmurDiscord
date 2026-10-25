# YagmurMelek DC



Vencord tabanlı Discord modifikasyonu. YagmurMelek Quiet eklentisi ve YagmurMelek DC’ye özel Windows installer içerir.



[Web sitesi](https://yagmur1337.github.io/YagmurDiscord/) · [İndirmeler](https://github.com/Yagmur1337/YagmurDiscord/releases) · [Orijinal Vencord](https://github.com/Vendicated/Vencord)

 YagmurMelekDc Katkıda bulunanlar: [Yagmur1337](https://github.com/Yagmur1337).



[Vencord Katkıcıları](https://github.com/Vendicated/Vencord/graphs/contributors) · [Topluluk kuralları](CODE_OF_CONDUCT.md) · [Lisans hakkında](LISANS.md)



## Windows kurulumu



1. Releases bölümünden **YagmurMelekDcInstaller.exe** dosyasını indir.

2. Discord’u sistem tepsisi dahil tamamen kapat.

3. YagmurMelek DC Installer’ı aç, Discord Stable / PTB / Canary kurulumunu seç.

4. Seçimi onaylayıp **YagmurMelek DC’yi yükle** düğmesine bas.

5. Discord’u yeniden aç. Ayarlar → YagmurMelek DC → Plugins bölümünde **YagmurMelekQuiet** ayarlarını aç.



Installer Windows x64 içindir, .NET çalışma zamanını ve YagmurMelek DC paketini içerir. Kurulumda ayrıca VencordInstaller indirmez veya çalıştırmaz. Dosya dijital olarak imzalı değildir.



### Ayrı dosya konumu



YagmurMelek DC, mevcut Vencord klasörünü kullanmaz:



- Uygulama dosyaları: `%AppData%\YagmurMelekDc\builds\<sürüm-paket-hash>`

- Ayarlar: `%AppData%\YagmurMelekDc\settings`

- Temalar: `%AppData%\YagmurMelekDc\themes`

- Yerel tarayıcı verileri: `YagmurMelekDcData` adlı IndexedDB veritabanı



Discord’un `resources/app.asar` dosyası YagmurMelek DC’ye bağlanır; orijinali `resources/_app.asar` olarak korunur. Başka bir mod kurulumu veya yabancı yedek varsa installer üzerine yazmaz; önce mevcut modun kendi kaldırma işlemini kullan. Vencord kullanıcı verileri taşınmaz veya silinmez.



Kaldırmak için installer’dan aynı Discord sürümünü seçip **YagmurMelek DC’yi kaldır** düğmesine bas. Orijinal Discord dosyası geri yüklenir; YagmurMelek DC ayarları korunur.



## Kaynaktan derleme



Gereksinimler: Node.js 22+ (test komutu için Node.js 24+), pnpm, Python 3, Windows x64 ve .NET 9 SDK.



```powershell

pnpm install --frozen-lockfile

$env:VENCORD_HASH = "yagmurmelekdc-0.2.0"

node scripts/build/build.mjs --standalone --disable-updater

node node_modules/typescript/bin/tsc --noEmit

node tests/yagmurMelekQuiet.test.mjs

python installer/package_payload.py

dotnet publish installer/YagmurMelekDcInstaller.csproj -c Release -r win-x64 -o release

```



İkon kaynakları `installer/assets` altındadır. İkonu yeniden üretmek için Pillow ile `python installer/assets/make_icon.py` çalıştırılabilir; mevcut ICO derleme için yeterlidir.



`--disable-updater` bilerek kullanılır: bu paket upstream Vencord güncellemesiyle değiştirilmez. Yeni YagmurMelek DC sürümleri bu reponun Releases bölümünden yüklenir. Upstream’in `pnpm inject` komutu bu projede kullanılmaz.



### Kontroller



- Masaüstü bundle derlemesi ve TypeScript kontrolü.

- YagmurMelekQuiet mantık testleri: modlar, kanal seçeneği, ilk yedeğin korunması ve silinen kanal filtreleme.

- Installer self-test: kurulum, yeniden kurulum, kaldırma, ASAR düzeni, hata geri dönüşü ve yabancı mod koruması.



```powershell

.\release\YagmurMelekDcInstaller.exe --self-test "$PWD\release\installer-tests.txt"

```



Self-test geçici bir örnek kurulum üzerinde çalışır; gerçek Discord dosyalarını değiştirmez.



## Lisans ve kaynak



Vencord kaynakları, orijinal telif bildirimleri ve katkı geçmişi korunur. YagmurMelek DC değişiklikleri GPL-3.0-or-later kapsamında sunulur. Installer’ın ASAR yapısı Vencord Installer’ın açık kaynak yaklaşımıyla uyumludur; arayüz ve kurulum uygulaması YagmurMelek DC için ayrı yazılmıştır.



YagmurMelek DC, Discord veya Vencord’un resmî ürünü değildir. Discord istemci modifikasyonları Discord kullanım koşullarına aykırı olabilir.


## YagmurMelekDc katkıcıları

- [Yagmur1337](https://github.com/Yagmur1337)


## Kendi JavaScript eklentini kullan

YagmurMelekLocalPlugins ile `.plugin.js` dosyanı eklenti klasörüne koyup derleme yapmadan çalıştırabilirsin. Eklentiler kendi panellerinde buton ve form oluşturabilir, verdiğin metni işleyebilir ve ayrıca izin verirsen kendi ayarlarını saklayabilir. Kod incelemesi ve elle etkinleştirme gerekir; Discord hesabına, mesajlara ve ağa erişim verilmez. Hazır Vencord eklentileri bu API ile uyumlu değildir.

[Kullanım, API ve güvenlik sınırları](examples/local-plugins/KULLANIM.md) · [Form ve ayar örneği](examples/local-plugins/metin-atolyesi.plugin.js) · [Basit örnek](examples/local-plugins/kelime-sayaci.plugin.js)
