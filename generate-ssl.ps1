# Get package name from package.json
$packageName = (Get-Content package.json | ConvertFrom-Json).name
$certPath = "$env:APPDATA\ASP.NET\https"

# Create directory
New-Item -ItemType Directory -Force -Path $certPath | Out-Null

Write-Host "Generating SSL certificates for: $packageName" -ForegroundColor Cyan

# Generate cert
dotnet dev-certs https --clean | Out-Null
dotnet dev-certs https --trust
dotnet dev-certs https -ep "$certPath\$packageName.pfx" -p "dev"

# Convert to PEM/KEY
openssl pkcs12 -in "$certPath\$packageName.pfx" -clcerts -nokeys -out "$certPath\$packageName.pem" -passin pass:dev -passout pass:
openssl pkcs12 -in "$certPath\$packageName.pfx" -nocerts -out "$certPath\$packageName.key" -passin pass:dev -passout pass:

Write-Host "✅ Certificates generated at: $certPath" -ForegroundColor Green
Write-Host "   - $packageName.pem" -ForegroundColor Yellow
Write-Host "   - $packageName.key" -ForegroundColor Yellow