param([int]$Port = 3043)
$rummikubPortBefore = $env:PORT
$rummikubHostBefore = $env:HOST
Push-Location $PSScriptRoot
try {
    $env:PORT = [string]$Port
    $env:HOST = '127.0.0.1'
    node server.mjs
} finally {
    $env:PORT = $rummikubPortBefore
    $env:HOST = $rummikubHostBefore
    Pop-Location
}
