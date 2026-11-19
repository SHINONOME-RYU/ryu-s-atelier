# make-web-images.ps1
# Turns ORIGINAL photos (any size, with EXIF) into web-ready JPEGs for every image area of the site.
#
#   set         source folder (put originals here)   output                         data file
#   ----------  -----------------------------------  -----------------------------  ------------------------
#   bike        images\about\<bike>                   images\bike\bike-NN(.-sm).jpg  data\bikes.js
#   activities  images\about\<activities>             images\activities\act-NN(-sm)  data\activities.js
#   photos      images\about\<photos>                 images\photos\<name>.jpg       data\photos-auto.js
#   profile     images\about\<profile>                images\about\profile.jpg       (none: newest file wins)
#
# For every output:
# - Resizes and re-encodes as JPEG (long edge 2000px / 1000px small version / 1400px for the profile)
# - Strips EXIF (GPS, camera, date) because the output is a brand-new bitmap
# - Honors EXIF orientation before stripping it
# - "photos" keeps the shooting DATE (read from EXIF before it is stripped) in data\photos-auto.js
#
# The carousels and the gallery check which files actually exist, so deleting or adding web-sized
# files works without running anything. Run this script (or double-click update-images.bat) only
# when you add or replace ORIGINAL photos in a source folder.
#
# Usage (from the project root):
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-web-images.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-web-images.ps1 -Only photos,activities

param(
  [string]$Only = '',            # comma separated set names; empty = all sets
  [string]$OriginalsRoot = ''    # folder that holds the four source folders (default: images\about)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$wanted = @($Only -split ',' | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ })

# Source folder names are Japanese. Build them from code points so this file stays pure ASCII
# and works on any PowerShell / encoding.
function Name-FromCodes([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$dirBike     = Name-FromCodes 0x30D0, 0x30A4, 0x30AF                      # bike folder
$dirPhotos   = Name-FromCodes 0x5199, 0x771F                              # photo folder
$dirActivity = Name-FromCodes 0x6D3B, 0x52D5                              # activity folder
$dirProfile  = Name-FromCodes 0x30D7, 0x30ED, 0x30D5, 0x30A3, 0x30FC, 0x30EB   # profile folder

# Where the originals live. Before publishing, move them OUT of the site folder (they still contain EXIF)
# and put the new location in tools\originals-root.txt (one line), or pass -OriginalsRoot.
$aboutDir = Join-Path $root 'images\about'
$rootFile = Join-Path $PSScriptRoot 'originals-root.txt'
if ($OriginalsRoot) {
  $aboutDir = $OriginalsRoot
} elseif (Test-Path -LiteralPath $rootFile) {
  $line = (Get-Content -LiteralPath $rootFile -Encoding UTF8 | Where-Object { $_.Trim() } | Select-Object -First 1)
  if ($line) { $aboutDir = $line.Trim() }
}
Write-Host ("Originals folder: {0}" -f $aboutDir)
$sets = @(
  @{ Name = 'bike';       Mode = 'numbered'; Source = (Join-Path $aboutDir $dirBike);     Out = 'images\bike';       Prefix = 'bike'; Data = 'data\bikes.js';       Var = 'BIKES' },
  @{ Name = 'activities'; Mode = 'numbered'; Source = (Join-Path $aboutDir $dirActivity); Out = 'images\activities'; Prefix = 'act';  Data = 'data\activities.js';  Var = 'ACTIVITIES' },
  @{ Name = 'photos';     Mode = 'named';    Source = (Join-Path $aboutDir $dirPhotos);   Out = 'images\photos';                      Data = 'data\photos-auto.js'; Var = 'PHOTOS_AUTO' },
  @{ Name = 'profile';    Mode = 'single';   Source = (Join-Path $aboutDir $dirProfile);  OutFile = 'images\about\profile.jpg' }
)

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

function Get-Sources([string]$dir) {
  @(Get-ChildItem -LiteralPath $dir -File |
    Where-Object { $_.Extension -match '^\.(jpe?g|png)$' } |
    Sort-Object Name)
}

function Open-Oriented([string]$path) {
  $img = [System.Drawing.Image]::FromFile($path)
  if ($img.PropertyIdList -contains 274) {
    switch ($img.GetPropertyItem(274).Value[0]) {
      3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
  }
  return $img
}

function Get-PhotoDate($img, [datetime]$fallback) {
  try {
    if ($img.PropertyIdList -contains 36867) {
      $s = [System.Text.Encoding]::ASCII.GetString($img.GetPropertyItem(36867).Value).Trim([char]0, ' ')
      $d = [datetime]::ParseExact($s, 'yyyy:MM:dd HH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture)
      return $d.ToString('yyyy-MM-dd')
    }
  } catch { }
  return $fallback.ToString('yyyy-MM-dd')
}

# Resize to the given long edge and save as a clean JPEG (no EXIF). Returns @(width, height).
function Export-Jpeg($img, [string]$path, [int]$longEdge, [int]$quality) {
  $scale = [Math]::Min(1.0, $longEdge / [double][Math]::Max($img.Width, $img.Height))
  $w = [int][Math]::Round($img.Width * $scale)
  $h = [int][Math]::Round($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  try {
    $bmp.SetResolution(72, 72)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
    $bmp.Save($path, $jpegCodec, $params)
  } finally {
    $bmp.Dispose()
  }
  return @($w, $h)
}

function Write-DataFile([string]$path, [string]$title, [string]$varName, [string[]]$entries) {
  $js = @"
/*
  $title (auto-generated by tools/make-web-images.ps1).
  Do not edit by hand: add or remove originals in the source folder and run update-images.bat.
*/
window.$varName = [
$($entries -join ",`n")
];
"@
  [System.IO.File]::WriteAllText($path, $js, (New-Object System.Text.UTF8Encoding($false)))
}

# --- numbered sets: <prefix>-01.jpg (2000px) + <prefix>-01-sm.jpg (1000px), listed in a data file ---
function Build-Numbered($set, $files) {
  $outDir = Join-Path $root $set.Out
  $dataFile = Join-Path $root $set.Data
  if ($files.Count -eq 0 -and -not (Test-Path -LiteralPath $outDir)) {
    Write-Host ("[{0}] no originals in the source folder - skipped" -f $set.Name); return
  }
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  Get-ChildItem -LiteralPath $outDir -Filter ($set.Prefix + '-*.jpg') | Remove-Item -Force
  $web = $set.Out -replace '\\', '/'
  $entries = @()
  $i = 0
  foreach ($f in $files) {
    $i++
    $name = '{0}-{1:D2}' -f $set.Prefix, $i
    $img = Open-Oriented $f.FullName
    try {
      $wh = Export-Jpeg $img (Join-Path $outDir "$name.jpg") 2000 82
      Export-Jpeg $img (Join-Path $outDir "$name-sm.jpg") 1000 80 | Out-Null
    } finally { $img.Dispose() }
    $entries += ('  {{ src: "{0}/{1}.jpg", sm: "{0}/{1}-sm.jpg", w: {2}, h: {3} }}' -f $web, $name, $wh[0], $wh[1])
    Write-Host ("[{0}] {1} -> {2}  ({3}x{4})" -f $set.Name, $f.Name, $name, $wh[0], $wh[1])
  }
  Write-DataFile $dataFile ('Photo list for the "' + $set.Name + '" carousel') $set.Var $entries
  Write-Host ("[{0}] done: {1} photos" -f $set.Name, $files.Count)
}

# --- named set (photo page): keeps a safe version of the file name, records the shooting date ---
function Build-Named($set, $files) {
  $outDir = Join-Path $root $set.Out
  $dataFile = Join-Path $root $set.Data
  $manifest = Join-Path $PSScriptRoot 'generated-photos.txt'
  $prev = @()
  if (Test-Path -LiteralPath $manifest) { $prev = @(Get-Content -LiteralPath $manifest | Where-Object { $_ }) }
  if ($files.Count -eq 0 -and $prev.Count -eq 0) {
    Write-Host ("[{0}] no originals in the source folder - skipped" -f $set.Name); return
  }
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  # remove only what this script generated last time (hand-placed images are never touched)
  foreach ($p in $prev) {
    $path = Join-Path $outDir $p
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
  }
  $web = $set.Out -replace '\\', '/'
  $used = @{}
  $made = @()
  $rows = @()
  foreach ($f in $files) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $safe = ($base -replace '[^A-Za-z0-9._-]', '-').Trim('-', '.')
    if (-not $safe) { $safe = 'photo' }
    $name = $safe
    $k = 2
    while ($used.ContainsKey($name.ToLower()) -or (Test-Path -LiteralPath (Join-Path $outDir "$name.jpg"))) {
      $name = "$safe-$k"; $k++
    }
    $used[$name.ToLower()] = 1
    $img = Open-Oriented $f.FullName
    try {
      $date = Get-PhotoDate $img $f.LastWriteTime
      $wh = Export-Jpeg $img (Join-Path $outDir "$name.jpg") 2000 82
    } finally { $img.Dispose() }
    $made += "$name.jpg"
    $rows += [pscustomobject]@{ file = "$web/$name.jpg"; date = $date; w = $wh[0]; h = $wh[1] }
    Write-Host ("[{0}] {1} -> {2}.jpg  ({3}x{4}, {5})" -f $set.Name, $f.Name, $name, $wh[0], $wh[1], $date)
  }
  $sorted = $rows | Sort-Object -Property @{ Expression = 'date'; Descending = $true }, @{ Expression = 'file' }
  $entries = @($sorted | ForEach-Object { '  {{ file: "{0}", date: "{1}", w: {2}, h: {3} }}' -f $_.file, $_.date, $_.w, $_.h })
  Write-DataFile $dataFile 'Photos found in the photo source folder (title/caption/place go in data/photos.js)' $set.Var $entries
  [System.IO.File]::WriteAllLines($manifest, [string[]]$made)
  Write-Host ("[{0}] done: {1} photos" -f $set.Name, $files.Count)
}

# --- single file (profile): the newest file in the folder becomes images\about\profile.jpg ---
function Build-Single($set, $files) {
  if ($files.Count -eq 0) {
    Write-Host ("[{0}] no originals in the source folder - kept the current photo" -f $set.Name); return
  }
  $f = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $img = Open-Oriented $f.FullName
  try {
    $wh = Export-Jpeg $img (Join-Path $root $set.OutFile) 1400 84
  } finally { $img.Dispose() }
  Write-Host ("[{0}] {1} -> {2}  ({3}x{4})" -f $set.Name, $f.Name, $set.OutFile, $wh[0], $wh[1])
}

foreach ($set in $sets) {
  if ($wanted.Count -gt 0 -and $wanted -notcontains $set.Name) { continue }
  try {
    if (-not (Test-Path -LiteralPath $set.Source)) {
      New-Item -ItemType Directory -Force -Path $set.Source | Out-Null
      Write-Host ("[{0}] created the source folder: {1}" -f $set.Name, $set.Source)
    }
    $files = Get-Sources $set.Source
    switch ($set.Mode) {
      'numbered' { Build-Numbered $set $files }
      'named'    { Build-Named $set $files }
      'single'   { Build-Single $set $files }
    }
  } catch {
    Write-Warning ("[{0}] failed: {1}" -f $set.Name, $_.Exception.Message)
  }
}
Write-Host 'All done.'
