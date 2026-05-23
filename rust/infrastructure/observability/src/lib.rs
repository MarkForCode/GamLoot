use axum::{
    body::Body,
    extract::MatchedPath,
    http::{
        header::{HeaderName, HeaderValue},
        Request,
    },
    middleware::Next,
    response::{IntoResponse, Response},
};
use metrics::{counter, gauge, histogram};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use opentelemetry::{
    global,
    trace::{TraceContextExt, TracerProvider as _},
    KeyValue,
};
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{
    trace::{Sampler, SdkTracerProvider},
    Resource,
};
use std::{
    env,
    path::{Path, PathBuf},
    sync::OnceLock,
    time::{Duration, Instant},
};
use tracing::{info_span, Instrument};
use tracing_appender::{non_blocking::WorkerGuard, rolling};
use tracing_opentelemetry::OpenTelemetrySpanExt;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use uuid::Uuid;

static METRICS_HANDLE: OnceLock<PrometheusHandle> = OnceLock::new();

const REQUEST_ID_HEADER: &str = "x-request-id";

pub struct ObservabilityGuard {
    tracer_provider: Option<SdkTracerProvider>,
    _stdout_guard: WorkerGuard,
    _file_guard: Option<WorkerGuard>,
}

impl Drop for ObservabilityGuard {
    fn drop(&mut self) {
        if let Some(provider) = self.tracer_provider.take() {
            let _ = provider.shutdown();
        }
    }
}

#[derive(Debug, Clone)]
pub struct ObservabilityConfig {
    pub service_name: String,
    pub service_version: String,
    pub environment: String,
    pub log_file_path: Option<PathBuf>,
    pub otlp_endpoint: Option<String>,
    pub trace_sample_ratio: f64,
}

impl ObservabilityConfig {
    pub fn from_env(default_service_name: &str, service_version: &str) -> Self {
        Self {
            service_name: env::var("OTEL_SERVICE_NAME")
                .or_else(|_| env::var("SERVICE_NAME"))
                .unwrap_or_else(|_| default_service_name.to_owned()),
            service_version: env::var("SERVICE_VERSION")
                .unwrap_or_else(|_| service_version.to_owned()),
            environment: env::var("DEPLOYMENT_ENVIRONMENT")
                .or_else(|_| env::var("APP_ENV"))
                .unwrap_or_else(|_| "local-prod-like".to_owned()),
            log_file_path: env::var("LOG_FILE_PATH").ok().map(PathBuf::from),
            otlp_endpoint: env::var("OTEL_EXPORTER_OTLP_ENDPOINT").ok(),
            trace_sample_ratio: env::var("OTEL_TRACES_SAMPLER_ARG")
                .ok()
                .and_then(|value| value.parse::<f64>().ok())
                .unwrap_or(0.01)
                .clamp(0.0, 1.0),
        }
    }
}

pub fn init(config: ObservabilityConfig) -> ObservabilityGuard {
    let _ = PrometheusBuilder::new()
        .install_recorder()
        .map(|handle| METRICS_HANDLE.set(handle));

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let (stdout_writer, stdout_guard) = tracing_appender::non_blocking(std::io::stdout());
    let stdout_layer = tracing_subscriber::fmt::layer()
        .json()
        .flatten_event(true)
        .with_current_span(true)
        .with_span_list(false)
        .with_writer(stdout_writer);

    let (file_layer, file_guard) = match config.log_file_path.as_deref() {
        Some(path) => match rolling_file_appender(path) {
            Ok(appender) => {
                let (file_writer, guard) = tracing_appender::non_blocking(appender);
                let layer = tracing_subscriber::fmt::layer()
                    .json()
                    .flatten_event(true)
                    .with_current_span(true)
                    .with_span_list(false)
                    .with_writer(file_writer);
                (Some(layer), Some(guard))
            },
            Err(error) => {
                eprintln!(
                    "failed to initialize file logging at {}: {error}",
                    path.display()
                );
                (None, None)
            },
        },
        None => (None, None),
    };

    let tracer_provider = build_tracer_provider(&config);
    let otel_layer = tracer_provider.as_ref().map(|provider| {
        let tracer = provider.tracer(config.service_name.clone());
        tracing_opentelemetry::layer().with_tracer(tracer)
    });

    tracing_subscriber::registry()
        .with(env_filter)
        .with(stdout_layer)
        .with(file_layer)
        .with(otel_layer)
        .init();

    tracing::info!(
        service = config.service_name,
        version = config.service_version,
        environment = config.environment,
        "observability initialized"
    );

    ObservabilityGuard {
        tracer_provider,
        _stdout_guard: stdout_guard,
        _file_guard: file_guard,
    }
}

fn rolling_file_appender(
    path: &Path,
) -> Result<rolling::RollingFileAppender, Box<dyn std::error::Error + Send + Sync>> {
    let directory = path.parent().unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("app.log");

    std::fs::create_dir_all(directory)?;

    Ok(rolling::Builder::new()
        .rotation(rolling::Rotation::DAILY)
        .filename_prefix(file_name)
        .max_log_files(4)
        .build(directory)?)
}

fn build_tracer_provider(config: &ObservabilityConfig) -> Option<SdkTracerProvider> {
    let endpoint = config.otlp_endpoint.as_deref()?;
    let exporter = match opentelemetry_otlp::SpanExporter::builder()
        .with_tonic()
        .with_endpoint(endpoint)
        .with_timeout(Duration::from_secs(2))
        .build()
    {
        Ok(exporter) => exporter,
        Err(error) => {
            eprintln!("failed to initialize OTLP trace exporter: {error}");
            return None;
        },
    };

    let provider = SdkTracerProvider::builder()
        .with_sampler(Sampler::ParentBased(Box::new(Sampler::TraceIdRatioBased(
            config.trace_sample_ratio,
        ))))
        .with_batch_exporter(exporter)
        .with_resource(
            Resource::builder()
                .with_service_name(config.service_name.clone())
                .with_attribute(KeyValue::new(
                    "service.version",
                    config.service_version.clone(),
                ))
                .with_attribute(KeyValue::new(
                    "deployment.environment",
                    config.environment.clone(),
                ))
                .with_attribute(KeyValue::new("service.namespace", "backend"))
                .build(),
        )
        .build();

    global::set_tracer_provider(provider.clone());
    Some(provider)
}

pub async fn metrics() -> impl IntoResponse {
    METRICS_HANDLE
        .get()
        .map(PrometheusHandle::render)
        .unwrap_or_default()
}

pub async fn track_http_request(req: Request<Body>, next: Next) -> Response {
    let start = Instant::now();
    let method = req.method().clone();
    let route = req
        .extensions()
        .get::<MatchedPath>()
        .map(|matched| matched.as_str().to_owned())
        .unwrap_or_else(|| normalize_path(req.uri().path()));
    let service = env::var("OTEL_SERVICE_NAME")
        .or_else(|_| env::var("SERVICE_NAME"))
        .unwrap_or_else(|_| "unknown-service".to_owned());
    let request_id = request_id(&req);
    let span = info_span!(
        "http.request",
        service = %service,
        request_id = %request_id,
        method = %method,
        route = %route,
        status_code = tracing::field::Empty,
        latency_ms = tracing::field::Empty,
        trace_id = tracing::field::Empty,
        span_id = tracing::field::Empty,
    );

    gauge!(
        "http_server_active_requests",
        "service" => service.clone(),
        "method" => method.to_string(),
        "route" => route.clone(),
    )
    .increment(1.0);

    let instrument_span = span.clone();
    let response = async {
        let mut response = next.run(req).await;
        let status = response.status();
        let elapsed = start.elapsed();
        let latency_ms = elapsed.as_secs_f64() * 1000.0;
        let otel_context = tracing::Span::current().context();
        let span_context = otel_context.span().span_context().clone();
        let trace_id = span_context.trace_id().to_string();
        let span_id = span_context.span_id().to_string();

        span.record("status_code", status.as_u16());
        span.record("latency_ms", latency_ms);
        if span_context.is_valid() {
            span.record("trace_id", trace_id.as_str());
            span.record("span_id", span_id.as_str());
        }

        counter!(
            "http_server_requests_total",
            "service" => service.clone(),
            "method" => method.to_string(),
            "route" => route.clone(),
            "status_code" => status.as_u16().to_string(),
        )
        .increment(1);
        histogram!(
            "http_server_request_duration_seconds",
            "service" => service.clone(),
            "method" => method.to_string(),
            "route" => route.clone(),
            "status_code" => status.as_u16().to_string(),
        )
        .record(elapsed.as_secs_f64());
        gauge!(
            "http_server_active_requests",
            "service" => service.clone(),
            "method" => method.to_string(),
            "route" => route.clone(),
        )
        .decrement(1.0);

        if let Ok(value) = HeaderValue::from_str(&request_id) {
            response
                .headers_mut()
                .insert(HeaderName::from_static(REQUEST_ID_HEADER), value);
        }

        tracing::info!(
            service = %service,
            request_id = %request_id,
            method = %method,
            route = %route,
            status = status.as_u16(),
            latency_ms,
            trace_id = if span_context.is_valid() { trace_id.as_str() } else { "" },
            span_id = if span_context.is_valid() { span_id.as_str() } else { "" },
            "http request completed"
        );

        response
    }
    .instrument(instrument_span)
    .await;

    response
}

fn request_id(req: &Request<Body>) -> String {
    req.headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.trim().is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| Uuid::new_v4().to_string())
}

fn normalize_path(path: &str) -> String {
    path.split('/')
        .map(|segment| {
            if segment.is_empty() {
                String::new()
            } else if looks_dynamic(segment) {
                "{id}".to_owned()
            } else {
                segment.to_owned()
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn looks_dynamic(segment: &str) -> bool {
    segment.parse::<i64>().is_ok()
        || Uuid::parse_str(segment).is_ok()
        || (segment.chars().any(|ch| ch.is_ascii_digit()) && segment.len() > 8)
}
