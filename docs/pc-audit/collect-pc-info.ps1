# collect-pc-info.ps1
# Сбор характеристик ПК для технического аудита (Windows 10/11).
# Ничего не меняет в системе, только читает. Результат: pc-audit-<дата>.txt на Рабочем столе.
#
# Запуск (PowerShell от имени администратора, иначе часть данных о дисках будет пустой):
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\collect-pc-info.ps1
#
# Перед отправкой отчёта удали из него серийные номера, если не хочешь ими делиться.

$ErrorActionPreference = 'Continue'
$dir = [Environment]::GetFolderPath('Desktop')
if (-not $dir -or -not (Test-Path $dir)) { $dir = $HOME }
if (-not $dir -or -not (Test-Path $dir)) { $dir = (Get-Location).Path }
$out = Join-Path $dir ("pc-audit-{0}.txt" -f (Get-Date -Format 'yyyy-MM-dd_HH-mm'))
$lines = New-Object System.Collections.Generic.List[string]

function Section($title) { $lines.Add(''); $lines.Add("=== $title ==="); }
function Add($text) { $lines.Add([string]$text) }
function Try-Section($title, [scriptblock]$body) {
    Section $title
    try { & $body } catch { Add "  (не удалось прочитать: $($_.Exception.Message))" }
}
function Fmt($obj) { ($obj | Format-List | Out-String).Trim() }

Add ("Отчёт собран: {0}" -f (Get-Date))
try { Add ("Администратор: {0}" -f ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) } catch { Add 'Администратор: n/a' }

Try-Section 'МАТЕРИНСКАЯ ПЛАТА' {
    Add (Fmt (Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product, Version))
}

Try-Section 'BIOS / UEFI' {
    Add (Fmt (Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate))
    $fw = try { (Get-ComputerInfo -Property BiosFirmwareType).BiosFirmwareType } catch { 'n/a' }
    Add "Тип прошивки: $fw"
    $sb = try { Confirm-SecureBootUEFI } catch { 'n/a' }
    Add "Secure Boot: $sb"
}

Try-Section 'ПРОЦЕССОР' {
    Get-CimInstance Win32_Processor | ForEach-Object {
        Add (Fmt ($_ | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, CurrentClockSpeed, L2CacheSize, L3CacheSize, SocketDesignation, VirtualizationFirmwareEnabled))
    }
}

Try-Section 'ОПЕРАТИВНАЯ ПАМЯТЬ' {
    $total = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
    Add ("Всего: {0:N1} ГБ" -f $total)
    $arr = Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1
    Add ("Слотов на плате: {0}, максимум по данным SMBIOS: {1:N0} ГБ" -f $arr.MemoryDevices, ($arr.MaxCapacityEx / 1MB))
    Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
        Add ("  Слот {0}: {1:N0} ГБ, {2} МГц (настроено {3} МГц), {4} {5}, тип {6}, форм-фактор {7}" -f `
            $_.DeviceLocator, ($_.Capacity / 1GB), $_.Speed, $_.ConfiguredClockSpeed, $_.Manufacturer, ($_.PartNumber -replace '\s+$', ''), $_.SMBIOSMemoryType, $_.FormFactor)
    }
    Add "  (SMBIOSMemoryType: 20=DDR, 21=DDR2, 24=DDR3, 26=DDR4, 34=DDR5)"
}

Try-Section 'ВИДЕОКАРТА' {
    Get-CimInstance Win32_VideoController | ForEach-Object {
        Add (Fmt ($_ | Select-Object Name, DriverVersion, DriverDate, VideoProcessor, CurrentHorizontalResolution, CurrentVerticalResolution))
    }
    # AdapterRAM в WMI ограничен 4 ГБ, поэтому читаем реальный объём из реестра
    Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue |
      Where-Object { $_.PSChildName -match '^\d{4}$' } | ForEach-Object {
        $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
        if ($p.'HardwareInformation.qwMemorySize') {
            Add ("  {0}: видеопамять {1:N0} ГБ" -f $p.DriverDesc, ($p.'HardwareInformation.qwMemorySize' / 1GB))
        }
    }
    $smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
    if (-not $smi -and (Test-Path "$env:SystemRoot\System32\nvidia-smi.exe")) { $smi = "$env:SystemRoot\System32\nvidia-smi.exe" }
    if ($smi) {
        Add '  nvidia-smi:'
        Add ((& $smi --query-gpu=name,memory.total,temperature.gpu,power.draw,power.limit,utilization.gpu,driver_version,pcie.link.gen.current,pcie.link.width.current --format=csv) -join "`n")
    } else { Add '  nvidia-smi не найден (не NVIDIA или нет драйвера)' }
}

Try-Section 'НАКОПИТЕЛИ' {
    Get-PhysicalDisk | Sort-Object DeviceId | ForEach-Object {
        Add ("  {0}: {1} | {2} | {3} | {4:N0} ГБ | здоровье: {5}" -f $_.DeviceId, $_.FriendlyName, $_.MediaType, $_.BusType, ($_.Size / 1GB), $_.HealthStatus)
        $r = $_ | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
        if ($r) { Add ("      температура {0}°C, наработка {1} ч, износ {2}%, ошибок чтения {3}" -f $r.Temperature, $r.PowerOnHours, $r.Wear, $r.ReadErrorsTotal) }
    }
    Add '  Разделы:'
    Get-Volume | Where-Object DriveLetter | Sort-Object DriveLetter | ForEach-Object {
        Add ("  {0}: {1} {2:N0} ГБ всего, {3:N0} ГБ свободно" -f $_.DriveLetter, $_.FileSystem, ($_.Size / 1GB), ($_.SizeRemaining / 1GB))
    }
}

Try-Section 'ОПЕРАЦИОННАЯ СИСТЕМА' {
    $os = Get-CimInstance Win32_OperatingSystem
    Add ("{0} {1} (сборка {2}), {3}" -f $os.Caption, $os.Version, $os.BuildNumber, $os.OSArchitecture)
    $ubr = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').DisplayVersion
    Add "Версия: $ubr"
    Add ("Аптайм: {0:N1} ч" -f ((Get-Date) - $os.LastBootUpTime).TotalHours)
    $hv = try { (Get-ComputerInfo -Property HyperVisorPresent).HyperVisorPresent } catch { 'n/a' }
    Add "Hyper-V / WSL2 доступны (гипервизор): $hv"
    Add ("Схема питания: {0}" -f ((powercfg /getactivescheme) -replace '^.*\((.*)\).*$', '$1'))
}

Try-Section 'СЕТЬ' {
    Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object {
        Add ("  {0}: {1}, линк {2}" -f $_.Name, $_.InterfaceDescription, $_.LinkSpeed)
    }
    Add '  (Скорость интернета и тип IP проверь отдельно: speedtest.net и 2ip.ru → "тип IP")'
}

Try-Section 'ТЕМПЕРАТУРЫ (ориентировочно)' {
    $t = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
    if ($t) { $t | ForEach-Object { Add ("  {0}: {1:N0}°C" -f $_.InstanceName, (($_.CurrentTemperature / 10) - 273.15)) } }
    else { Add '  ACPI-датчики недоступны. Используй HWiNFO64 (см. чек-лист).' }
}

Try-Section 'БЛОК ПИТАНИЯ' {
    Add '  Программно не читается. Нужна фотография наклейки на БП (модель, мощность W, сертификат 80 PLUS).'
}

try {
    $lines | Set-Content -Path $out -Encoding UTF8
    Write-Host "Готово. Отчёт: $out"
    Write-Host "Открой файл, проверь, что нет лишних личных данных, и пришли его содержимое."
} catch {
    Write-Host "Не удалось сохранить файл ($($_.Exception.Message)). Вот отчёт целиком, скопируй его из окна:"
    $lines | ForEach-Object { Write-Host $_ }
}
