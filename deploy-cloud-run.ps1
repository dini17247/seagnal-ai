param(
  [string]$ProjectId = "urbandata-458900",
  [string]$Region = "us-central1",
  [string]$ServiceName = "seagnal-ai"
)

$ErrorActionPreference = "Stop"

function Import-DotEnv {
  param(
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    throw "The .env file was not found at $Path"
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()

    if (
      -not $trimmed -or
      $trimmed.StartsWith("#") -or
      -not $trimmed.Contains("=")
    ) {
      continue
    }

    $parts = $trimmed -split "=", 2

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable(
      $name,
      $value,
      "Process"
    )
  }
}

function ConvertTo-YamlScalar {
  param(
    [AllowEmptyString()]
    [string]$Value
  )

  return "'" + $Value.Replace("'", "''") + "'"
}

Write-Host "Loading .env file..."

Import-DotEnv -Path (Join-Path $PSScriptRoot ".env")

$requiredVariables = @(
  "GCP_PROJECT_ID",
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
  "CSRF_SECRET",
  "WORKOS_ORGANIZATION_ID",
  "GEMINI_API_KEY"
)

$missingVariables = @()

foreach ($name in $requiredVariables) {
  $value = [Environment]::GetEnvironmentVariable(
    $name,
    "Process"
  )

  if ([string]::IsNullOrWhiteSpace($value)) {
    $missingVariables += $name
  }
}

if ($missingVariables.Count -gt 0) {
  throw "Missing values in .env: $($missingVariables -join ', ')"
}

$bigQueryDataset =
  if ($env:BIGQUERY_DATASET_ID) {
    $env:BIGQUERY_DATASET_ID
  } else {
    "seagnal_ai"
  }

$bigQueryLocation =
  if ($env:BIGQUERY_LOCATION) {
    $env:BIGQUERY_LOCATION
  } else {
    "US"
  }

$bigQueryVesselsTable =
  if ($env:BIGQUERY_VESSELS_TABLE) {
    $env:BIGQUERY_VESSELS_TABLE
  } else {
    "vessels"
  }

$bigQueryMovementsTable =
  if ($env:BIGQUERY_MOVEMENTS_TABLE) {
    $env:BIGQUERY_MOVEMENTS_TABLE
  } else {
    "vessel_movements"
  }

$bigQueryAlertsTable =
  if ($env:BIGQUERY_ALERTS_TABLE) {
    $env:BIGQUERY_ALERTS_TABLE
  } else {
    "alerts"
  }

$bigQueryZonesTable =
  if ($env:BIGQUERY_ZONES_TABLE) {
    $env:BIGQUERY_ZONES_TABLE
  } else {
    "maritime_zones"
  }

$geminiModel =
  if ($env:GEMINI_MODEL) {
    $env:GEMINI_MODEL
  } else {
    "gemini-3.5-flash"
  }

$cloudRunVariables =
  [ordered]@{
    NODE_ENV = "production"

    USE_MOCK_DATA = "false"

    AUTH_REQUIRED = "true"

    USE_MOCK_AUTH = "false"

    CLOUD_SQL_ENABLED = "true"

    GCP_PROJECT_ID = $ProjectId

    BIGQUERY_DATASET_ID = $bigQueryDataset

    BIGQUERY_LOCATION = $bigQueryLocation

    BIGQUERY_VESSELS_TABLE = $bigQueryVesselsTable

    BIGQUERY_MOVEMENTS_TABLE = $bigQueryMovementsTable

    BIGQUERY_ALERTS_TABLE = $bigQueryAlertsTable

    BIGQUERY_ZONES_TABLE = $bigQueryZonesTable

    WORKOS_API_KEY = $env:WORKOS_API_KEY

    WORKOS_CLIENT_ID = $env:WORKOS_CLIENT_ID

    WORKOS_COOKIE_PASSWORD = $env:WORKOS_COOKIE_PASSWORD

    CSRF_SECRET = $env:CSRF_SECRET

    WORKOS_ORGANIZATION_ID = $env:WORKOS_ORGANIZATION_ID

    WORKOS_ADMIN_EMAILS = $env:WORKOS_ADMIN_EMAILS

    GEMINI_API_KEY = $env:GEMINI_API_KEY

    GEMINI_MODEL = $geminiModel

    CLOUD_SQL_CONNECTION_NAME = $env:CLOUD_SQL_CONNECTION_NAME

    CLOUD_SQL_DATABASE = $env:CLOUD_SQL_DATABASE

    CLOUD_SQL_USER = $env:CLOUD_SQL_USER

    CLOUD_SQL_PASSWORD = $env:CLOUD_SQL_PASSWORD
  }

$tempEnvFile =
  Join-Path `
    $env:TEMP `
    "seagnal-cloudrun-env-$PID.yaml"

try {
  $yamlLines =
    foreach ($entry in $cloudRunVariables.GetEnumerator()) {
      if (
        -not [string]::IsNullOrWhiteSpace(
          [string]$entry.Value
        )
      ) {
        "$($entry.Key): $(ConvertTo-YamlScalar ([string]$entry.Value))"
      }
    }

  Set-Content `
    -Path $tempEnvFile `
    -Value $yamlLines `
    -Encoding utf8

  Write-Host "Setting Google Cloud project..."
  & gcloud config set project $ProjectId

  if ($LASTEXITCODE -ne 0) {
    throw "Could not select Google Cloud project $ProjectId"
  }

  Write-Host "Checking local production build..."
  & npm install

  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed."
  }

  & npm run build

  if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed."
  }

  Write-Host "Deploying to Cloud Run..."

  $deployArguments = @(
    "run",
    "deploy",
    $ServiceName,
    "--project=$ProjectId",
    "--region=$Region",
    "--source=.",
    "--allow-unauthenticated",
    "--env-vars-file=$tempEnvFile",
    "--memory=1Gi",
    "--cpu=1",
    "--min-instances=0",
    "--max-instances=3",
    "--timeout=300"
  )

  if (-not [string]::IsNullOrWhiteSpace($env:CLOUD_SQL_INSTANCE_CONNECTION_NAME)) {
    $deployArguments += "--add-cloudsql-instances=$($env:CLOUD_SQL_INSTANCE_CONNECTION_NAME)"
  }

  & gcloud @deployArguments

  if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run deployment failed. Read the error shown above."
  }

  $serviceUrl =
    (
      & gcloud run services describe `
        $ServiceName `
        --project=$ProjectId `
        --region=$Region `
        --format="value(status.url)"
    ).Trim()

  Write-Host ""
  Write-Host "Deployment completed." -ForegroundColor Green
  Write-Host "Application URL: $serviceUrl" -ForegroundColor Green
  Write-Host ""
  Write-Host "Add this in WorkOS Redirect URI:" -ForegroundColor Cyan
  Write-Host "$serviceUrl/callback" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Add this in WorkOS Sign-out Return URI:" -ForegroundColor Cyan
  Write-Host "$serviceUrl/login" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Auth health check:"
  Write-Host "$serviceUrl/api/health/auth"
  Write-Host ""
  Write-Host "BigQuery health check:"
  Write-Host "$serviceUrl/api/health/bigquery"
}
finally {
  if (Test-Path $tempEnvFile) {
    Remove-Item `
      $tempEnvFile `
      -Force
  }
}