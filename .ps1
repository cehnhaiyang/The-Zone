$Host.UI.RawUI.WindowTitle = "The Zone"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 通用：执行命令并检查结果，失败时暂停并返回菜单
function Invoke-Step {
    param(
        [string]$Command,
        [string]$SuccessMsg,
        [string]$FailMsg
    )
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n [✗] $FailMsg" -ForegroundColor Red
        pause
        return $false
    }
    Write-Host "`n [✓] $SuccessMsg" -ForegroundColor Green
    return $true
}

# 主菜单循环
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
            Write-Host "`n [步骤] 安装项目依赖 (淘宝镜像源)`n" -ForegroundColor Yellow
            $env:ELECTRON_MIRROR = "https://cdn.npmmirror.com/binaries/electron/"
            Invoke-Step "npm install" "依赖安装完成" "依赖安装失败"
            Write-Host "`n [步骤] 强制下载 Electron 二进制程序`n" -ForegroundColor Yellow
            Invoke-Step "node .install_electron.mjs" "Electron二进制安装完成" "Electron二进制安装失败"
            pause
        }

        # ── 启动开发环境 ──
        "2" {
            Clear-Host
            Write-Host "`n [开发模式] 启动 Vite + Electron" -ForegroundColor Yellow
            Write-Host " • Vite Dev Server: http://localhost:5173"
            Write-Host " • 热重载已启用"
            Write-Host " • 按 Ctrl+C 停止服务`n"
            Invoke-Step "npm run electron:dev" "开发环境已退出" "启动失败"
            pause
        }

        # ── 构建生产版本 ──
        "3" {
            Clear-Host
            Write-Host "`n [构建] 编译生产版本`n" -ForegroundColor Yellow
            Invoke-Step "npm run build" "构建完成 - 输出目录: dist/" "构建失败"
            pause
        }

        # ── 打包应用程序 ──
        "4" {
            Clear-Host
            Write-Host "`n [打包] 生成可执行文件`n" -ForegroundColor Yellow
            Write-Host "  [1] Windows (NSIS + Portable)"
            Write-Host "  [2] macOS (DMG + ZIP)"
            Write-Host "  [3] Linux (AppImage + DEB)"
            Write-Host "  [4] 全平台打包"
            Write-Host "  [0] 返回主菜单`n"
            $pkg = Read-Host " 选择打包平台"

            $cmd = switch ($pkg) {
                "1" { "npm run electron:package:win" }
                "2" { "npm run electron:package:mac" }
                "3" { "npm run electron:package:linux" }
                "4" { "npm run electron:package" }
                "0" { $null }
                default {
                    Write-Host " [错误] 无效选择" -ForegroundColor Red
                    Start-Sleep -Seconds 2
                    $null
                }
            }
            if ($cmd) {
                Invoke-Step $cmd "打包完成 - 输出目录: release/" "打包失败"
                pause
            }
        }

        # ── 类型检查 ──
        "5" {
            Clear-Host
            Write-Host "`n [检查] TypeScript 类型检查`n" -ForegroundColor Yellow
            Invoke-Step "npm run type-check" "类型检查通过" "发现类型错误"
            pause
        }

        # ── 清理构建文件 ──
        "6" {
            Clear-Host
            Write-Host "`n [清理] 删除构建产物`n" -ForegroundColor Yellow
            @("dist", "release", "node_modules\.vite") | ForEach-Object {
                if (Test-Path $_) {
                    Remove-Item $_ -Recurse -Force
                    Write-Host " [✓] $_ 已删除" -ForegroundColor Green
                }
            }
            Write-Host "`n [✓] 清理完成" -ForegroundColor Green
            pause
        }

        # ── 退出 ──
        "0" {
            Clear-Host
            Write-Host ""
            Write-Host " ════════════════════════════════════════════════════════════" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "   感谢使用幻觉开发工具"
            Write-Host "   Powered by GROQ & FLUX"
            Write-Host ""
            Write-Host " ════════════════════════════════════════════════════════════" -ForegroundColor Cyan
            Start-Sleep -Seconds 2
            exit 0
        }

        default {
            Write-Host "`n [错误] 无效选择，请重新输入" -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
}
