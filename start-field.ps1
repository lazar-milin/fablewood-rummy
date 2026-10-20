param([int]$Port = 3042)
$fieldPortBefore = $env:PORT
$fieldHostBefore = $env:HOST
Push-Location $PSScriptRoot
try {
    $env:PORT = [string]$Port
    $env:HOST = '127.0.0.1'
    node server.mjs
} finally {
    $env:PORT = $fieldPortBefore
    $env:HOST = $fieldHostBefore
    Pop-Location
}
