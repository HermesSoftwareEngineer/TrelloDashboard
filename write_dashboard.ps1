$path = "c:\Users\hermes.barbosa\PROJETOS_DEV\TrelloDashboard\trellodashboard\src\components\DashboardV2.jsx"

# Read current file and keep only lines 1 through first "export default DashboardV2"
$lines = Get-Content $path
$cutLine = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^export default DashboardV2") {
        $cutLine = $i
        break
    }
}

Write-Host "Cutting at line $($cutLine + 1) of $($lines.Count)"
$keep = $lines[0..$cutLine]
Set-Content -Path $path -Value $keep -Encoding UTF8
Write-Host "Done. New line count: $((Get-Content $path).Count)"
