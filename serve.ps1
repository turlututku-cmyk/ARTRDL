# Local preview server for Windows (no Node/Python needed).
# Run:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Then open http://localhost:5174 in your browser. Press Ctrl+C to stop.
param([int]$Port = 5174)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

$mime = @{
    ".html" = "text/html"; ".js" = "application/javascript"; ".css" = "text/css";
    ".json" = "application/json"; ".png" = "image/png"; ".svg" = "image/svg+xml";
    ".ico" = "image/x-icon";
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $res = $context.Response
    try {
        $path = [uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart("/")))
        if (-not $filePath.StartsWith([System.IO.Path]::GetFullPath($root))) {
            $res.StatusCode = 403
        } elseif (Test-Path $filePath -PathType Leaf) {
            $ct = $mime[[System.IO.Path]::GetExtension($filePath)]
            if (-not $ct) { $ct = "application/octet-stream" }
            $res.ContentType = $ct
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
    } catch {
        $res.StatusCode = 500
    } finally {
        $res.Close()
    }
}
