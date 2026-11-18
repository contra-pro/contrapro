#requires -Version 7.2
<#
Preparation only: execute only after separate authorization.
Fixed ContratPro project: gllsiklbvqpxzucvkehw.
Sends SSLRequest and TLS records only. Never sends PostgreSQL StartupMessage,
credentials, authentication responses or SQL. Uses the Windows/.NET trust store.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$poolerHost = 'aws-0-eu-west-1.pooler.supabase.com'
$poolerPort = 5432
$networkTimeoutMs = 5000
$diagnostic = @{
    Stage = 'TCP_CONNECT'
    Failure = $null
    CleanupFailure = $null
    CallbackEntered = $false
    CertificateProvided = $false
    CaptureFailed = $false
    PolicyErrors = @()
}

# Only fixed categories and recognized SocketError names may reach output.
# Unwrap a bounded number of known .NET/PowerShell wrappers; never serialize errors.
function Get-SafeFailure {
    param([string]$Stage, [System.Exception]$Exception)
    $safeStages = @('TCP_CONNECT', 'SSL_REQUEST_WRITE', 'SSL_RESPONSE_READ',
        'TLS_SETUP', 'TLS_HANDSHAKE', 'CERTIFICATE_CAPTURE', 'CLEANUP')
    $result = [ordered]@{
        Stage = $(if ($Stage -cin $safeStages) { $Stage } else { 'TLS_SETUP' })
        Category = 'UNKNOWN'
    }
    $current = $Exception
    for ($depth = 0; $depth -lt 6 -and $null -ne $current; $depth++) {
        if ($current -is [System.Net.Sockets.SocketException]) {
            $code = $current.SocketErrorCode.ToString()
            if ($code -cin @('HostNotFound', 'TryAgain', 'NoData')) {
                $result.Category = 'DNS'; $result['Code'] = $code; break
            }
            if ($code -ceq 'TimedOut') {
                $result.Category = 'TIMEOUT'; $result['Code'] = $code; break
            }
            if ($code -cin @('ConnectionRefused', 'NetworkUnreachable', 'HostUnreachable',
                    'ConnectionReset', 'ConnectionAborted', 'Shutdown')) {
                $result.Category = 'NETWORK'; $result['Code'] = $code; break
            }
        }
        elseif ($current -is [System.TimeoutException]) { $result.Category = 'TIMEOUT'; break }
        elseif ($current -is [System.Security.Authentication.AuthenticationException]) {
            $result.Category = 'TLS_HANDSHAKE'
        }
        elseif ($current -is [System.Management.Automation.PSNotSupportedException] -or
                $current -is [System.PlatformNotSupportedException] -or
                $current -is [System.MissingMethodException] -or
                $current -is [System.Management.Automation.MethodException]) {
            $result.Category = 'RUNTIME_CONFIGURATION'
        }
        # InnerException is inspected only for these known wrapper types.
        if ($current -is [System.AggregateException]) {
            if ($current.InnerExceptions.Count -ne 1) { break }
            $current = $current.InnerExceptions[0]
        }
        elseif ($current -is [System.Management.Automation.RuntimeException] -or
                $current -is [System.Reflection.TargetInvocationException] -or
                $current -is [System.IO.IOException] -or
                $current -is [System.Security.Authentication.AuthenticationException]) {
            $current = $current.InnerException
        }
        else { break }
    }
    return $result
}
$certificateResult = @{
    Subject = $null
    Issuer = $null
    NotBeforeUtc = $null
    NotAfterUtc = $null
    Sha256Fingerprint = $null
    ChainStatusCodes = @()
    HostnameVerification = 'UNTESTED'
}
$tcpClient = $null
$networkStream = $null
$tlsStream = $null
$trustedHandshake = $false

try {
    if ($args.Count -ne 0) {
        $diagnostic.Failure = [ordered]@{ Stage = 'TCP_CONNECT'; Category = 'RUNTIME_CONFIGURATION' }
        throw [System.InvalidOperationException]::new()
    }
    $tcpClient = [System.Net.Sockets.TcpClient]::new()
    $connectTask = $tcpClient.ConnectAsync($poolerHost, $poolerPort)
    if (-not $connectTask.Wait($networkTimeoutMs)) { throw [System.TimeoutException]::new() }
    $connectTask.GetAwaiter().GetResult()
    $tcpClient.ReceiveTimeout = $networkTimeoutMs
    $tcpClient.SendTimeout = $networkTimeoutMs
    $networkStream = $tcpClient.GetStream()
    $networkStream.ReadTimeout = $networkTimeoutMs
    $networkStream.WriteTimeout = $networkTimeoutMs

    # Network byte order: int32 length 8, int32 SSLRequest code 80877103.
    [byte[]]$sslRequest = @(0, 0, 0, 8, 4, 210, 22, 47)
    $diagnostic.Stage = 'SSL_REQUEST_WRITE'
    $networkStream.Write($sslRequest, 0, $sslRequest.Length)
    $networkStream.Flush()
    $diagnostic.Stage = 'SSL_RESPONSE_READ'
    $sslResponse = $networkStream.ReadByte()
    if ($sslResponse -ne 83) {
        $diagnostic.Failure = [ordered]@{
            Stage = 'SSL_RESPONSE_READ'
            Category = $(if ($sslResponse -eq -1) { 'SSL_RESPONSE_EOF' }
                elseif ($sslResponse -eq 78) { 'SSL_NOT_SUPPORTED' } else { 'SSL_RESPONSE_UNEXPECTED' })
        }
        throw [System.InvalidOperationException]::new()
    }

    $diagnostic.Stage = 'TLS_SETUP'
    # Capture mutable state explicitly. Callback/runspace behavior still requires
    # later runtime verification; callback entry failure is not presumed a TLS error.
    $callbackBlock = {
        param($sender, $certificate, $chain, $policyErrors)
        $leaf = $null
        try {
            $diagnostic.CallbackEntered = $true
            $diagnostic.Stage = 'CERTIFICATE_CAPTURE'
            $diagnostic.CertificateProvided = $null -ne $certificate
            # Capture validation signals before copying/formatting certificates.
            try {
                $diagnostic.PolicyErrors = @()
                foreach ($flagName in @('RemoteCertificateNotAvailable', 'RemoteCertificateNameMismatch', 'RemoteCertificateChainErrors')) {
                    $flag = [System.Net.Security.SslPolicyErrors]::$flagName
                    if (($policyErrors -band $flag) -ne 0) { $diagnostic.PolicyErrors += $flagName }
                }
                if ($null -ne $certificate -and
                    ($policyErrors -band [System.Net.Security.SslPolicyErrors]::RemoteCertificateNotAvailable) -eq 0) {
                    $certificateResult.HostnameVerification = if (
                        ($policyErrors -band [System.Net.Security.SslPolicyErrors]::RemoteCertificateNameMismatch) -ne 0
                    ) { 'FAIL' } else { 'PASS' }
                }
            }
            catch { $diagnostic.CaptureFailed = $true }
            try {
                if ($null -ne $chain) {
                    # Enum names are allowlisted; never emit StatusInformation text.
                    $knownStatuses = [Enum]::GetNames([System.Security.Cryptography.X509Certificates.X509ChainStatusFlags])
                    $codes = @()
                    foreach ($status in $chain.ChainStatus) {
                        foreach ($name in $knownStatuses) {
                            $flag = [System.Security.Cryptography.X509Certificates.X509ChainStatusFlags]::$name
                            if ([int]$flag -ne 0 -and ($status.Status -band $flag) -ne 0) { $codes += $name }
                        }
                    }
                    $certificateResult.ChainStatusCodes = @($codes | Sort-Object -Unique)
                }
                else { $diagnostic.CaptureFailed = $true }
            }
            catch { $diagnostic.CaptureFailed = $true }
            if ($null -ne $certificate) {
                # Capture each field independently; keep fields already available.
                try { $leaf = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($certificate) }
                catch { $diagnostic.CaptureFailed = $true }
                if ($null -ne $leaf) {
                    try {
                        $text = [regex]::Replace($leaf.Subject, '\p{Cc}', ' ')
                        $certificateResult.Subject = $text.Substring(0, [Math]::Min($text.Length, 2048))
                    } catch { $diagnostic.CaptureFailed = $true }
                    try {
                        $text = [regex]::Replace($leaf.Issuer, '\p{Cc}', ' ')
                        $certificateResult.Issuer = $text.Substring(0, [Math]::Min($text.Length, 2048))
                    } catch { $diagnostic.CaptureFailed = $true }
                    try { $certificateResult.NotBeforeUtc = $leaf.NotBefore.ToUniversalTime().ToString('o') }
                    catch { $diagnostic.CaptureFailed = $true }
                    try { $certificateResult.NotAfterUtc = $leaf.NotAfter.ToUniversalTime().ToString('o') }
                    catch { $diagnostic.CaptureFailed = $true }
                    try { $certificateResult.Sha256Fingerprint = $leaf.GetCertHashString([System.Security.Cryptography.HashAlgorithmName]::SHA256) }
                    catch { $diagnostic.CaptureFailed = $true }
                }
            }
        }
        catch {
            $diagnostic.CaptureFailed = $true
        }
        finally {
            if ($null -ne $leaf) {
                try { $leaf.Dispose() } catch { $diagnostic.CaptureFailed = $true }
            }
        }
        if ($diagnostic.CaptureFailed) {
            if ($null -eq $diagnostic.Failure) {
                $diagnostic.Failure = [ordered]@{ Stage = 'CERTIFICATE_CAPTURE'; Category = 'CERTIFICATE_CAPTURE_FAILED' }
            }
            return $false
        }
        if ($null -eq $certificate -or $policyErrors -ne [System.Net.Security.SslPolicyErrors]::None) {
            $category = if ($null -eq $certificate) { 'CERTIFICATE_UNAVAILABLE' }
                elseif ($certificateResult.HostnameVerification -eq 'FAIL') { 'TLS_HOSTNAME' }
                else { 'TLS_CERTIFICATE' }
            if ($null -eq $diagnostic.Failure) {
                $diagnostic.Failure = [ordered]@{ Stage = 'CERTIFICATE_CAPTURE'; Category = $category }
            }
            return $false
        }
        $diagnostic.Stage = 'TLS_HANDSHAKE'
        return $true
    }.GetNewClosure()
    $validationCallback = [System.Net.Security.RemoteCertificateValidationCallback]$callbackBlock
    $tlsStream = [System.Net.Security.SslStream]::new($networkStream, $false, $validationCallback)
    $tlsStream.ReadTimeout = $networkTimeoutMs
    $tlsStream.WriteTimeout = $networkTimeoutMs
    $chainPolicy = [System.Security.Cryptography.X509Certificates.X509ChainPolicy]::new()
    $chainPolicy.RevocationMode = [System.Security.Cryptography.X509Certificates.X509RevocationMode]::Online
    $chainPolicy.VerificationFlags = [System.Security.Cryptography.X509Certificates.X509VerificationFlags]::NoFlag
    $chainPolicy.UrlRetrievalTimeout = [TimeSpan]::FromSeconds(3)
    $tlsOptions = [System.Net.Security.SslClientAuthenticationOptions]::new()
    $tlsOptions.TargetHost = $poolerHost
    $tlsOptions.EnabledSslProtocols = [System.Security.Authentication.SslProtocols]::Tls12 -bor [System.Security.Authentication.SslProtocols]::Tls13
    $tlsOptions.CertificateChainPolicy = $chainPolicy
    $diagnostic.Stage = 'TLS_HANDSHAKE'
    $tlsStream.AuthenticateAsClient($tlsOptions)
    $trustedHandshake = $diagnostic.CallbackEntered -and $diagnostic.CertificateProvided -and
        (-not $diagnostic.CaptureFailed) -and $tlsStream.IsAuthenticated -and $tlsStream.IsEncrypted -and $tlsStream.IsSigned
    if (-not $trustedHandshake -and $null -eq $diagnostic.Failure) {
        $diagnostic.Failure = [ordered]@{ Stage = 'TLS_HANDSHAKE'; Category = 'TLS_SAFEGUARD_FAILED' }
    }
    # Even on success, close immediately; never progress to PostgreSQL authentication.
}
catch {
    $trustedHandshake = $false
    if ($null -eq $diagnostic.Failure) {
        $diagnostic.Failure = Get-SafeFailure -Stage $diagnostic.Stage -Exception $_.Exception
    }
}
finally {
    foreach ($resource in @($tlsStream, $networkStream, $tcpClient)) {
        if ($null -ne $resource) {
            try { $resource.Dispose() }
            catch {
                if ($null -eq $diagnostic.CleanupFailure) {
                    $diagnostic.CleanupFailure = Get-SafeFailure -Stage 'CLEANUP' -Exception $_.Exception
                }
                $trustedHandshake = $false
            }
        }
    }
}

# Output contains fixed diagnostics and safe certificate metadata only.
[ordered]@{
    DiagnosticStage = $diagnostic.Stage
    Failure = $diagnostic.Failure
    CleanupFailure = $diagnostic.CleanupFailure
    CallbackEntered = $diagnostic.CallbackEntered
    CertificateProvided = $diagnostic.CertificateProvided
    CaptureFailed = $diagnostic.CaptureFailed
    TlsPolicyErrors = $diagnostic.PolicyErrors
    CertificateSubject = $certificateResult.Subject
    CertificateIssuer = $certificateResult.Issuer
    CertificateNotBeforeUtc = $certificateResult.NotBeforeUtc
    CertificateNotAfterUtc = $certificateResult.NotAfterUtc
    CertificateSha256Fingerprint = $certificateResult.Sha256Fingerprint
    CertificateChainStatusCodes = $certificateResult.ChainStatusCodes
    HostnameVerification = $certificateResult.HostnameVerification
} | ConvertTo-Json -Depth 3
if (-not $trustedHandshake) { exit 1 }
exit 0
