$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error '未找到 Node.js。请先安装 Node.js 18 或更高版本。'
  exit 1
}

Write-Host '正在启动 OI 尖塔 II ...'
Start-Process 'http://localhost:8787'
node server.js
