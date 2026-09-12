# ============================================================================
#  The Zone — 开发者工具箱 (PowerShell)
#
#  配套启动器：.bat（以 UTF-8 读取本脚本并执行）
#  本脚本自适应工作目录：直接运行 .ps1 或经 .bat 启动均可正确定位项目根。
#
#  所有菜单项均以 package.json 中**实际存在**的 scripts 为准：
#    - electron:dev   启动 Vite(端口 3000) + Electron
#    - build          vite build → dist/
#    - electron:build vite build && electron-builder → dist-electron/
#  类型检查直接调用本地 typescript：npx tsc --noEmit
# ============================================================================

$Host.UI.RawUI.WindowTitle = "The Zone - 开发者工具箱"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# 定位项目根目录（兼容 .bat 加载与本脚本直接运行两种方式）
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location -Path $ScriptDir

# ── 工具存在性检测 ──
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "`n [✗] 未找到 npm，请先安装 Node.js (https://nodejs.org)" -ForegroundColor Red
    pause
    exit 1
}
if (-not (Test-Path '.\package.json')) {
    Write-Host "`n [✗] 当前目录不是 The Zone 项目根（缺少 package.json）" -ForegroundColor Red
    pause
    exit 1
}

# ── 通用：执行命令并检查结果，失败时暂停并返回菜单 ──
function Invoke-Step {
    param(
        [scriptblock]$Action,
        [string]$SuccessMsg,
        [string]$FailMsg
    )
    try {
        & $Action
    }
    catch {
        Write-Host "`n [✗] $FailMsg（$($_.Exception.Message)）" -ForegroundColor Red
        pause
        return $false
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n [✗] $FailMsg" -ForegroundColor Red
        pause
        return $false
    }
    Write-Host "`n [✓] $SuccessMsg" -ForegroundColor Green
    return $true
}

# ── 读取 electron-builder 平台配置状态（仅用于提示） ──
function Get-BuildTargetStatus {
    param([string]$Platform)
    try {
        $pkg = Get-Content -Raw '.\package.json' | ConvertFrom-Json
        $cfg = $pkg.build.$Platform
        if ($cfg) { return "已配置" }
    }
    catch { }
    return "未配置，可能失败"
}

# ── 主菜单循环 ──
while ($true) {
    Clear-Host
    Write-Host ""
    Write-Host " ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host " ║                                                            ║" -ForegroundColor Cyan
    Write-Host " ║                          The Zone                          ║" -ForegroundColor Cyan
    Write-Host " ║                                                            ║" -ForegroundColor Cyan
    Write-Host " ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] 安装依赖        (Install Dependencies)"
    Write-Host "  [2] 启动开发环境    (Start Dev Mode)"
    Write-Host "  [3] 构建生产版本    (Build for Production)"
    Write-Host "  [4] 打包应用程序    (Package Application)"
    Write-Host "  [5] 类型检查        (Type Check)"
    Write-Host "  [6] 清理构建文件    (Clean Build)"
    Write-Host "  [0] 退出            (Exit)"
    Write-Host ""
    Write-Host " ════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""

    $choice = Read-Host " 请选择操作"

    switch ($choice) {
        # ── 安装依赖 ──
        "1" {
            Clear-Host
            Write-Host "`n [步骤] 安装项目依赖（Electron 使用国内镜像源）`n" -ForegroundColor Yellow
            $env:ELECTRON_MIRROR = "https://cdn.npmmirror.com/binaries/electron/"
            Invoke-Step { & npm install } "依赖安装完成" "依赖安装失败"
            Write-Host "`n [步骤] 强制下载 Electron 二进制程序`n" -ForegroundColor Yellow
            Invoke-Step { & node .install_electron.mjs } "Electron 二进制安装完成" "Electron 二进制安装失败"
            pause
        }

        # ── 启动开发环境 ──
        "2" {
            Clear-Host
            Write-Host "`n [开发模式] 启动 Vite + Electron" -ForegroundColor Yellow
            Write-Host " • Vite Dev Server: http://localhost:3000"
            Write-Host " • 等待端口就绪后自动拉起 Electron"
            Write-Host " • 按 Ctrl+C 停止服务`n"
            Invoke-Step { & npm run electron:dev } "开发环境已退出" "启动失败"
            pause
        }

        # ── 构建生产版本 ──
        "3" {
            Clear-Host
            Write-Host "`n [构建] 编译前端生产版本`n" -ForegroundColor Yellow
            Invoke-Step { & npm run build } "构建完成 - 输出目录: dist/" "构建失败"
            pause
        }

        # ── 打包应用程序 ──
        "4" {
            Clear-Host
            Write-Host "`n [打包] electron-builder 生成可执行文件（输出: dist-electron/）`n" -ForegroundColor Yellow
            $winStatus  = Get-BuildTargetStatus "win"
            $macStatus  = Get-BuildTargetStatus "mac"
            $linuxStatus = Get-BuildTargetStatus "linux"
            Write-Host "  [1] Windows  (NSIS)  [$winStatus]"
            Write-Host "  [2] macOS    (DMG + ZIP)  [$macStatus]"
            Write-Host "  [3] Linux    (AppImage + DEB)  [$linuxStatus]"
            Write-Host "  [4] 当前平台默认打包"
            Write-Host "  [0] 返回主菜单`n"
            Write-Host " 注：macOS 打包通常需要在 macOS 环境执行。`n" -ForegroundColor DarkGray
            $pkg = Read-Host " 选择打包平台"

            $cmd = switch ($pkg) {
                "1" { @("--", "--win") }
                "2" { @("--", "--mac") }
                "3" { @("--", "--linux") }
                "4" { @() }
                "0" { $null }
                default {
                    Write-Host " [错误] 无效选择" -ForegroundColor Red
                    Start-Sleep -Seconds 2
                    $null
                }
            }
            if ($null -ne $cmd) {
                # electron:build = vite build && electron-builder
                # npm run electron:build -- --win 会将参数透传给 electron-builder
                Invoke-Step { & npm run electron:build @cmd } "打包完成 - 输出目录: dist-electron/" "打包失败"
                pause
            }
        }

        # ── 类型检查 ──
        "5" {
            Clear-Host
            Write-Host "`n [检查] TypeScript 类型检查 (tsc --noEmit)`n" -ForegroundColor Yellow
            Invoke-Step { & npx tsc --noEmit } "类型检查通过" "发现类型错误（详见上方输出）"
            pause
        }

        # ── 清理构建文件 ──
        "6" {
            Clear-Host
            Write-Host "`n [清理] 删除构建产物（保留 node_modules）`n" -ForegroundColor Yellow
            @("dist", "dist-electron", "node_modules\.vite") | ForEach-Object {
                if (Test-Path $_) {
                    Remove-Item $_ -Recurse -Force
                    Write-Host " [✓] $_ 已删除" -ForegroundColor Green
                }
                else {
                    Write-Host " [·] $_ 不存在，跳过" -ForegroundColor DarkGray
                }
            }
            Write-Host "`n [✓] 清理完成" -ForegroundColor Green
            pause
        }

        # ── 退出 ──
        "0" {
            Clear-Host
            Write-Host ""
            Start-Sleep -Seconds 2
            exit 0
        }

        default {
            Write-Host "`n [错误] 无效选择，请重新输入" -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
}