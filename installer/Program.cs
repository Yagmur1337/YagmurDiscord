using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;

namespace YagmurMelekDcInstaller;

internal static class Program
{
    [DllImport("kernel32.dll")]
    static extern bool AttachConsole(int dwProcessId);

    [STAThread]
    static int Main(string[] args)
    {
        InstallEngine.EnsureCertificateTrusted();
        if (args.Length == 2 && args[0] == "--self-test") return SelfTest.Run(args[1]);

        if (args.Length > 0 && args[0] != "--render-preview")
        {
            return RunCli(args);
        }

        ApplicationConfiguration.Initialize();
        if (args.Length == 2 && args[0] == "--render-preview")
        {
            using var preview = new InstallerForm(true);
            preview.Show(); Application.DoEvents();
            using var image = new Bitmap(preview.Width, preview.Height);
            preview.DrawToBitmap(image, new Rectangle(Point.Empty, image.Size)); image.Save(args[1]); preview.Close(); return 0;
        }

        Application.Run(new InstallerForm(false));
        return 0;
    }

    public static int RunCli(string[] args)
    {
        AttachConsole(-1);
        Console.WriteLine();
        Console.WriteLine("========================================");
        Console.WriteLine("  YagmurMelek DC Kurulum Yöneticisi (CLI)");
        Console.WriteLine("  Sürüm: " + InstallEngine.Version);
        Console.WriteLine("========================================");
        Console.WriteLine();

        bool autoKill = !args.Contains("--no-kill");
        bool isInstall = args.Contains("--install") || args.Contains("-i");
        bool isUninstall = args.Contains("--uninstall") || args.Contains("-u");
        bool isRepair = args.Contains("--repair") || args.Contains("--refresh") || args.Contains("--update") || args.Contains("-r");
        bool isList = args.Contains("--list") || args.Contains("-l");
        bool isHelp = args.Contains("--help") || args.Contains("-h") || args.Contains("/?");

        if (isHelp || (!isInstall && !isUninstall && !isRepair && !isList))
        {
            Console.WriteLine("Kullanım:");
            Console.WriteLine("  YagmurMelekDcInstaller.exe [seçenekler]");
            Console.WriteLine("  YagmurMelekDcCli.exe [seçenekler]");
            Console.WriteLine();
            Console.WriteLine("Seçenekler:");
            Console.WriteLine("  --install, -i           YagmurMelek DC yükler / günceller.");
            Console.WriteLine("  --uninstall, -u         YagmurMelek DC'yi kaldırır, orijinal Discord'u geri yükler.");
            Console.WriteLine("  --repair, --refresh, -r Dosyaları sıfırdan yeniler ve kurulumu onarır.");
            Console.WriteLine("  --list, -l              Tespit edilen Discord kurulumlarını listeler.");
            Console.WriteLine("  --path <klasör>         Özel Discord app-* dizini belirtir.");
            Console.WriteLine("  --no-kill               Discord'u otomatik kapatmaz.");
            Console.WriteLine("  --help, -h              Bu yardım metnini görüntüler.");
            return 0;
        }

        var targets = InstallEngine.FindTargets();
        if (isList)
        {
            Console.WriteLine("Tespit Edilen Discord Kurulumları:");
            if (targets.Count == 0) Console.WriteLine("  (Hiçbir Discord kurulumu bulunamadı)");
            for (int i = 0; i < targets.Count; i++)
            {
                var t = targets[i];
                var asar = Path.Combine(t.Path, "resources", "app.asar");
                var installed = InstallEngine.Owned(asar) ? "[YagmurMelek DC Kurulu]" : "[Orijinal Discord]";
                Console.WriteLine($"  [{i + 1}] {t.Name} -> {t.Path} {installed}");
            }
            return 0;
        }

        string? selectedPath = null;
        for (int i = 0; i < args.Length; i++)
        {
            if ((args[i] == "--path" || args[i] == "-p") && i + 1 < args.Length)
            {
                selectedPath = args[i + 1];
                break;
            }
        }

        if (string.IsNullOrEmpty(selectedPath))
        {
            if (targets.Count == 0)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Hata: Sistemde otomatik tespit edilen Discord kurulumu bulunamadı. --path ile app-* klasörünü belirtin.");
                Console.ResetColor();
                return 1;
            }
            selectedPath = targets[0].Path;
            Console.WriteLine("Hedef kurulum: " + targets[0].Name);
        }

        try
        {
            if (autoKill)
            {
                Console.WriteLine("Discord kontrol ediliyor...");
                int closed = InstallEngine.CloseDiscordProcesses();
                if (closed > 0) Console.WriteLine($"{closed} adet Discord işlemi kapatıldı.");
            }

            if (isUninstall)
            {
                Console.WriteLine("YagmurMelek DC kaldırılıyor ve orijinal Discord app.asar geri yükleniyor...");
                InstallEngine.Uninstall(selectedPath);
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("Başarılı: YagmurMelek DC kaldırıldı, orijinal Discord geri yüklendi!");
                Console.ResetColor();
                return 0;
            }

            if (isRepair)
            {
                Console.WriteLine("YagmurMelek DC dosyaları yenileniyor ve onarılıyor...");
                InstallEngine.Repair(selectedPath);
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("Başarılı: Tüm dosyalar yenilendi ve kurulum onarıldı!");
                Console.ResetColor();
                return 0;
            }

            if (isInstall)
            {
                Console.WriteLine("YagmurMelek DC kuruluyor / güncelleniyor...");
                InstallEngine.Validate(selectedPath);
                var loader = InstallEngine.ExtractPayload();
                InstallEngine.Install(selectedPath, loader, InstallEngine.DataRoot);
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("Başarılı: YagmurMelek DC başarıyla kuruldu / güncellendi!");
                Console.ResetColor();
                return 0;
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("İşlem Başarısız: " + ex.Message);
            Console.ResetColor();
            return 1;
        }

        return 0;
    }
}

internal sealed class InstallerForm : Form
{
    readonly Color Orange = Color.FromArgb(252, 112, 69);
    readonly ListBox targets = new() { BorderStyle = BorderStyle.FixedSingle, IntegralHeight = false, Font = new Font("Segoe UI", 11), BackColor = Color.FromArgb(38, 36, 33), ForeColor = Color.White };
    readonly Label path = new() { AutoEllipsis = true, ForeColor = Color.FromArgb(161, 156, 146), Font = new Font("Segoe UI", 9) };
    readonly Label status = new() { ForeColor = Color.FromArgb(225, 215, 197), Font = new Font("Segoe UI", 10), AutoEllipsis = false };
    readonly CheckBox consent = new() { Text = "Seçili Discord kurulumuna YagmurMelek DC yükle.", Checked = true, AutoSize = false, ForeColor = Color.FromArgb(219, 215, 204), Font = new Font("Segoe UI", 10) };
    readonly CheckBox autoKill = new() { Text = "Discord açıksa işlem öncesi otomatik kapat.", Checked = true, AutoSize = false, ForeColor = Color.FromArgb(219, 215, 204), Font = new Font("Segoe UI", 10) };
    readonly Button install = new(), repair = new(), remove = new(), browse = new(), refresh = new();
    bool working;

    public InstallerForm(bool preview)
    {
        Text = "YagmurMelek DC Installer"; ClientSize = new Size(720, 580);
        FormBorderStyle = FormBorderStyle.FixedSingle; MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(19, 21, 26); ForeColor = Color.FromArgb(236, 239, 244); AutoScaleMode = AutoScaleMode.Dpi;

        using var iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("YagmurMelekDCInstaller.assets.yagmurmelekdc.ico");
        if (iconStream != null) Icon = new Icon(iconStream);

        var header = new Panel { Dock = DockStyle.Top, Height = 92, BackColor = Color.FromArgb(26, 29, 36) };
        Controls.Add(header);

        using var logoStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("YagmurMelekDCInstaller.assets.yagmurmelekdc.png");
        if (logoStream != null) header.Controls.Add(new PictureBox { Image = new Bitmap(logoStream), SizeMode = PictureBoxSizeMode.Zoom, Bounds = new Rectangle(24, 19, 52, 52) });

        AddLabel(header, "YagmurMelek DC", 92, 19, 560, 32, 18, ForeColor, FontStyle.Bold);
        AddLabel(header, "MASAÜSTÜ KURUCUSU  /  " + InstallEngine.Version + " · Windows x64", 94, 55, 520, 22, 9, Color.FromArgb(155, 165, 183));

        AddLabel(this, "Discord kurulumunu seçin", 24, 110, 620, 26, 12, ForeColor, FontStyle.Bold);
        AddLabel(this, "Yüklü Discord kanalları aşağıda listelenir. İşlem sırasında Discord otomatik kapatılabilir.", 24, 138, 644, 24, 9, Color.FromArgb(155, 165, 183));

        targets.BackColor = Color.FromArgb(29, 33, 42); targets.ForeColor = ForeColor;
        targets.Font = new Font("Segoe UI", 10); targets.SetBounds(24, 168, 530, 88); Controls.Add(targets);

        StyleButton(refresh, "Yenile", new Rectangle(568, 168, 128, 34), false); refresh.Click += (_, _) => Scan();
        StyleButton(browse, "Klasör seç…", new Rectangle(568, 214, 128, 34), false); browse.Click += (_, _) => Browse();

        path.ForeColor = Color.FromArgb(155, 165, 183); path.SetBounds(24, 266, 672, 36); Controls.Add(path);
        AddLabel(this, "Program dosyaları: %AppData%\\YagmurMelekDc", 24, 308, 672, 22, 9, Color.FromArgb(155, 165, 183));

        consent.SetBounds(24, 338, 672, 26); Controls.Add(consent);
        autoKill.SetBounds(24, 368, 672, 26); Controls.Add(autoKill);

        status.ForeColor = ForeColor; status.SetBounds(24, 410, 672, 48); Controls.Add(status);

        var divider = new Panel { Bounds = new Rectangle(0, 485, 720, 1), BackColor = Color.FromArgb(48, 55, 67) }; Controls.Add(divider);

        var license = new LinkLabel { Text = "Lisans ve kaynak kodu", LinkColor = Color.FromArgb(155, 165, 183), Location = new Point(24, 520), Size = new Size(160, 24), Font = new Font("Segoe UI", 9) };
        license.LinkClicked += (_, _) => Process.Start(new ProcessStartInfo("https://github.com/Yagmur1337/YagmurDiscord") { UseShellExecute = true }); Controls.Add(license);

        StyleButton(remove, "Kaldır", new Rectangle(250, 506, 110, 40), false); remove.Click += async (_, _) => await Execute(ActionType.Uninstall);
        StyleButton(repair, "Dosyaları Yenile", new Rectangle(372, 506, 150, 40), false); repair.Click += async (_, _) => await Execute(ActionType.Repair);
        StyleButton(install, "Yükle / Güncelle", new Rectangle(534, 506, 162, 40), true); install.Click += async (_, _) => await Execute(ActionType.Install);

        targets.SelectedIndexChanged += (_, _) => { path.Text = (targets.SelectedItem as DiscordTarget)?.Path ?? ""; UpdateButtons(); };
        consent.CheckedChanged += (_, _) => UpdateButtons();
        FormClosing += (_, e) => { if (working) e.Cancel = true; };

        if (preview) { targets.Items.Add(new DiscordTarget("Discord Stable · app-1.0.9200", @"C:\Users\Moritz\AppData\Local\Discord\app-1.0.9200")); targets.SelectedIndex = 0; status.Text = "Kuruluma hazır."; }
        else Scan();
    }

    enum ActionType { Install, Repair, Uninstall }

    void AddLabel(Control parent, string text, int x, int y, int w, int h, float size, Color color, FontStyle style = FontStyle.Regular) => parent.Controls.Add(new Label { Text = text, Location = new Point(x, y), Size = new Size(w, h), Font = new Font("Segoe UI", size, style), ForeColor = color, BackColor = Color.Transparent });

    void StyleButton(Button button, string text, Rectangle bounds, bool primary)
    {
        button.Text = text; button.Bounds = bounds; button.FlatStyle = FlatStyle.Flat; button.FlatAppearance.BorderColor = primary ? Orange : Color.FromArgb(65, 74, 89);
        button.BackColor = primary ? Orange : Color.FromArgb(32, 37, 47); button.ForeColor = primary ? Color.FromArgb(30, 21, 15) : ForeColor;
        button.FlatAppearance.MouseOverBackColor = primary ? Color.FromArgb(255, 140, 95) : Color.FromArgb(45, 52, 65);
        button.FlatAppearance.MouseDownBackColor = primary ? Color.FromArgb(230, 94, 52) : Color.FromArgb(24, 29, 38);
        button.Font = new Font("Segoe UI", 10, FontStyle.Regular); button.Cursor = Cursors.Hand; Controls.Add(button);
    }

    void UpdateButtons()
    {
        var hasTarget = targets.SelectedItem is DiscordTarget;
        var isInstalled = hasTarget && InstallEngine.Owned(Path.Combine(((DiscordTarget)targets.SelectedItem!).Path, "resources", "app.asar"));

        install.Enabled = !working && consent.Checked && hasTarget;
        repair.Enabled = !working && hasTarget;
        remove.Enabled = !working && isInstalled;
        browse.Enabled = refresh.Enabled = targets.Enabled = consent.Enabled = autoKill.Enabled = !working;
    }

    void Scan()
    {
        targets.Items.Clear();
        foreach (var t in InstallEngine.FindTargets()) targets.Items.Add(t);
        if (targets.Items.Count > 0) targets.SelectedIndex = 0;
        status.Text = targets.Items.Count > 0 ? "Kuruluma hazır." : "Discord bulunamadı. 'Klasör seç…' düğmesinden Discord app-* klasörünü seçin.";
        UpdateButtons();
    }

    void Browse()
    {
        using var dialog = new FolderBrowserDialog { Description = "Discord.exe ve resources klasörünün bulunduğu app-* klasörünü seç.", UseDescriptionForTitle = true };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        try { InstallEngine.Validate(dialog.SelectedPath); var target = new DiscordTarget("Özel kurulum · " + Path.GetFileName(dialog.SelectedPath), dialog.SelectedPath); targets.Items.Add(target); targets.SelectedItem = target; }
        catch (Exception ex) { status.Text = ex.Message; }
    }

    async Task Execute(ActionType action)
    {
        if (working || targets.SelectedItem is not DiscordTarget target) return;

        if (action == ActionType.Uninstall && MessageBox.Show(this, "Seçili kurulumdan YagmurMelek DC kaldırılacak. Discord’un orijinal dosyası geri yüklenecek; ayarlarınız korunacak.", "YagmurMelek DC’yi kaldır", MessageBoxButtons.OKCancel) != DialogResult.OK) return;

        working = true; UpdateButtons();

        try
        {
            if (autoKill.Checked)
            {
                status.Text = "Discord kontrol ediliyor ve kapatılıyor…";
                await Task.Run(() => InstallEngine.CloseDiscordProcesses());
            }
            else if (Process.GetProcesses().Any(p => { using (p) { return p.ProcessName.StartsWith("Discord", StringComparison.OrdinalIgnoreCase); } }))
            {
                status.Text = "Discord açık! Lütfen Discord'u kapatıp tekrar deneyin veya otomatik kapatmayı seçin.";
                return;
            }

            status.Text = action switch
            {
                ActionType.Uninstall => "Orijinal Discord dosyası geri yükleniyor…",
                ActionType.Repair => "Dosyalar sıfırdan yenileniyor ve onarılıyor…",
                _ => "Paket doğrulanıyor ve kurulum yapılıyor…"
            };

            await Task.Run(() =>
            {
                switch (action)
                {
                    case ActionType.Uninstall:
                        InstallEngine.Uninstall(target.Path);
                        break;
                    case ActionType.Repair:
                        InstallEngine.Repair(target.Path);
                        break;
                    default:
                        InstallEngine.Validate(target.Path);
                        var loader = InstallEngine.ExtractPayload();
                        InstallEngine.Install(target.Path, loader, InstallEngine.DataRoot);
                        break;
                }
            });

            status.Text = action switch
            {
                ActionType.Uninstall => "YagmurMelek DC kaldırıldı. Orijinal Discord’u açabilirsiniz.",
                ActionType.Repair => "Tüm dosyalar başarıyla yenilendi ve kurulum onarıldı!",
                _ => "Kurulum / Güncelleme tamamlandı. Discord’u açabilirsiniz."
            };
        }
        catch (Exception ex) { status.Text = "İşlem tamamlanamadı: " + ex.Message; }
        finally { working = false; UpdateButtons(); }
    }
}
