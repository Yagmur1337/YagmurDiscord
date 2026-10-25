$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like '*Yagmures Holding*' } | Select-Object -First 1
if (-not $cert) {
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Yagmures Holding, O=Yagmures Holding, OU=Yagmur Discord, C=TR" -CertStoreLocation "Cert:\CurrentUser\My" -HashAlgorithm "SHA256"
}

Write-Host "Code signing certificate Thumbprint: $($cert.Thumbprint)"
Write-Host "Subject: $($cert.Subject)"

# Add to TrustedPublisher (does not trigger security prompt like Root does)
try {
    $pubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store "TrustedPublisher", "CurrentUser"
    $pubStore.Open("ReadWrite")
    $pubStore.Add($cert)
    $pubStore.Close()
    Write-Host "Added certificate to Cert:\CurrentUser\TrustedPublisher"
} catch {
    Write-Host "Note: Could not add to TrustedPublisher: $_"
}

# Export public .cer for users who want to trust the certificate
Export-Certificate -Cert $cert -FilePath "release/YagmuresHolding.cer" -Force | Out-Null
Write-Host "Exported public certificate to release/YagmuresHolding.cer"

# Sign release executables
Set-AuthenticodeSignature -FilePath "release/YagmurMelekDcInstaller.exe" -Certificate $cert | Out-Null
Set-AuthenticodeSignature -FilePath "release/YagmurMelekDcCli.exe" -Certificate $cert | Out-Null

$sigInstaller = Get-AuthenticodeSignature "release/YagmurMelekDcInstaller.exe"
Write-Host "Installer Signature Status: $($sigInstaller.Status)"
Write-Host "Installer Signer: $($sigInstaller.SignerCertificate.Subject)"

$sigCli = Get-AuthenticodeSignature "release/YagmurMelekDcCli.exe"
Write-Host "CLI Signature Status: $($sigCli.Status)"
Write-Host "CLI Signer: $($sigCli.SignerCertificate.Subject)"

