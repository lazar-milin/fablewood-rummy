param([int]$Port = 3026)
$previousMovementPort = $env:PORT
$previousMovementHost = $env:HOST
Push-Location $PSScriptRoot
try {
    $env:PORT = [string]$Port
    $env:HOST = '127.0.0.1'
    node server.mjs
} finally {
    $env:PORT = $previousMovementPort
    $env:HOST = $previousMovementHost
    Pop-Location
}
