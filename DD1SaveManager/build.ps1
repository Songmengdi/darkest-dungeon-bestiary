param([switch]$Test)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$cscCandidates = @(
    'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe',
    'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
)
$csc = $cscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) { throw 'csc.exe (.NET Framework 4.x) not found' }

$manifest = Join-Path $root 'app.manifest'
$out = Join-Path $root 'DD1SaveManager.exe'
$src = @(Get-ChildItem -LiteralPath (Join-Path $root 'src') -Filter '*.cs' | ForEach-Object { $_.FullName })
if ($src.Count -eq 0) { throw 'no source files found under src\' }

$refs = @(
    '/r:System.dll',
    '/r:System.Core.dll',
    '/r:System.Drawing.dll',
    '/r:System.Windows.Forms.dll',
    '/r:System.Web.Extensions.dll',
    '/r:Microsoft.CSharp.dll'
)

$cscArgs = @('/nologo', '/target:winexe', '/platform:anycpu', '/codepage:65001',
    ('/win32manifest:' + $manifest), ('/out:' + $out)) + $refs + $src

Write-Host "Compiling: $out"
& $csc $cscArgs
if ($LASTEXITCODE -ne 0) { throw "csc failed with exit code $LASTEXITCODE" }
Write-Host "Done: $out"

if ($Test) {
    $outTest = Join-Path $env:TEMP 'DD1SaveManager.LogicTest.exe'
    $srcTest = @((Join-Path $root 'src\SaveService.cs'), (Join-Path $root 'test\LogicTest.cs'))
    $testArgs = @('/nologo', '/target:exe', '/codepage:65001', ('/out:' + $outTest)) + $refs + $srcTest
    Write-Host "Compiling logic test: $outTest"
    & $csc $testArgs
    if ($LASTEXITCODE -ne 0) { throw "test compile failed" }
    & $outTest
    if ($LASTEXITCODE -ne 0) { throw "logic test failed" }

    $outProbe = Join-Path $env:TEMP 'DD1SaveManager.LayoutProbe.exe'
    $srcProbe = @((Join-Path $root 'src\SaveService.cs'), (Join-Path $root 'src\Settings.cs'), (Join-Path $root 'src\MainForm.cs'), (Join-Path $root 'test\LayoutProbe.cs'))
    $probeArgs = @('/nologo', '/target:exe', '/codepage:65001', ('/out:' + $outProbe)) + $refs + $srcProbe
    Write-Host "Compiling layout probe: $outProbe"
    & $csc $probeArgs
    if ($LASTEXITCODE -ne 0) { throw "probe compile failed" }
    & $outProbe
    if ($LASTEXITCODE -ne 0) { throw "layout probe failed" }
}
