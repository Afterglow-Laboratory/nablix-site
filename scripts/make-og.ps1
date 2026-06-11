# Generates src/assets/og.png (1200x630) from the app icon using GDI+ (no dependencies).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root 'src\assets\logo.png'
$outPath = Join-Path $root 'src\assets\og.png'

$bmp = New-Object System.Drawing.Bitmap(1200, 630)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# background
$bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 6, 6, 11))
$g.FillRectangle($bg, 0, 0, 1200, 630)

function Add-Glow($g, $cx, $cy, $r, $color) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($cx - $r, $cy - $r, $r * 2, $r * 2)
    $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
    $brush.CenterColor = $color
    $brush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 6, 6, 11))
    $g.FillEllipse($brush, $cx - $r, $cy - $r, $r * 2, $r * 2)
    $brush.Dispose(); $path.Dispose()
}

Add-Glow $g 240 300 460 ([System.Drawing.Color]::FromArgb(46, 0, 255, 247))
Add-Glow $g 1080 520 420 ([System.Drawing.Color]::FromArgb(34, 255, 61, 245))
Add-Glow $g 950 80 300 ([System.Drawing.Color]::FromArgb(22, 0, 200, 255))

# subtle dot grid
$dot = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 190, 230, 255))
for ($x = 30; $x -lt 1200; $x += 34) {
    for ($y = 24; $y -lt 630; $y += 34) {
        $g.FillEllipse($dot, $x, $y, 2, 2)
    }
}

# logo (rounded corners + faint cyan border)
$logo = [System.Drawing.Image]::FromFile($logoPath)
$lx = 96; $ly = 159; $ls = 312; $lr = 42
$rp = New-Object System.Drawing.Drawing2D.GraphicsPath
$rp.AddArc($lx, $ly, $lr, $lr, 180, 90)
$rp.AddArc($lx + $ls - $lr, $ly, $lr, $lr, 270, 90)
$rp.AddArc($lx + $ls - $lr, $ly + $ls - $lr, $lr, $lr, 0, 90)
$rp.AddArc($lx, $ly + $ls - $lr, $lr, $lr, 90, 90)
$rp.CloseFigure()
$state = $g.Save()
$g.SetClip($rp)
$g.DrawImage($logo, $lx, $ly, $ls, $ls)
$g.Restore($state)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 0, 255, 247), 2)
$g.DrawPath($pen, $rp)
$pen.Dispose(); $rp.Dispose()
$logo.Dispose()

# wordmark: "Nab" white + "lix" cyan
$fontBig = New-Object System.Drawing.Font('Segoe UI', 88, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 238, 244, 246))
$cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 255, 247))
$grey = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 167, 176, 188))
$dim = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 122, 232, 228))

$sf = [System.Drawing.StringFormat]::GenericTypographic
$x0 = 452.0; $y0 = 196.0
$g.DrawString('Nab', $fontBig, $white, $x0, $y0, $sf)
$nabSize = $g.MeasureString('Nab', $fontBig, [System.Drawing.PointF]::new($x0, $y0), $sf)
$g.DrawString('lix', $fontBig, $cyan, $x0 + $nabSize.Width + 2, $y0, $sf)

$fontTag = New-Object System.Drawing.Font('Segoe UI', 31, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('Your thoughts, linked. Your ideas, alive.', $fontTag, $grey, 458, 322)

# middle dot via char code to stay encoding-safe in PS 5.1
$mdot = [string][char]0x00B7
$fontSub = New-Object System.Drawing.Font('Segoe UI Semibold', 25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$subText = ('Markdown {0} Ink {0} Runnable code {0} Your own AI' -f $mdot)
$g.DrawString($subText, $fontSub, $dim, 458, 380)

# bottom bar
$fontUrl = New-Object System.Drawing.Font('Segoe UI Semibold', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('nablix.app', $fontUrl, $cyan, 460, 520)
$fontWin = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('Free for Windows', $fontWin, $grey, 640, 520)

$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Wrote $outPath"
