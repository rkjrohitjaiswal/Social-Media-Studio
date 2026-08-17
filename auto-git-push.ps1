$ProjectPath = Get-Location
$Branch = "main"

Write-Host "Git Auto-Push started for $ProjectPath"

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ProjectPath
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$ignored = @(
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".vercel"
)

$lastPush = Get-Date "2000-01-01"

function ShouldIgnore($path) {
    foreach ($item in $ignored) {
        if ($path -like "*\$item\*" -or $path -like "*\$item") {
            return $true
        }
    }
    return $false
}

function Push-Changes {

    $now = Get-Date

    # Prevent multiple pushes while Antigravity is changing many files
    if (($now - $script:lastPush).TotalSeconds -lt 15) {
        return
    }

    Start-Sleep -Seconds 5

    if (ShouldIgnore $ProjectPath) {
        return
    }

    $status = git status --porcelain

    if ($status) {

        Write-Host ""
        Write-Host "Changes detected. Uploading to GitHub..." -ForegroundColor Cyan

        git add .

        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

        git commit -m "Auto update $timestamp"

        git push origin $Branch

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully pushed to GitHub." -ForegroundColor Green
            $script:lastPush = Get-Date
        }
        else {
            Write-Host "Git push failed. Check your GitHub authentication." -ForegroundColor Red
        }
    }
}

$action = {
    if (-not (ShouldIgnore $Event.SourceEventArgs.FullPath)) {
        Push-Changes
    }
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

Write-Host ""
Write-Host "Watching for code changes..." -ForegroundColor Yellow
Write-Host "Press CTRL+C to stop."

while ($true) {
    Start-Sleep -Seconds 5
}