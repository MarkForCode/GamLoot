# Build stage
FROM rust:1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY rust/ ./rust/

RUN cargo build --release --manifest-path rust/Cargo.toml --bin order-worker

# Runtime stage
FROM alpine:3.19
WORKDIR /app

COPY --from=builder /app/rust/target/release/order-worker /app/order-worker

ENV DATABASE_URL=postgres://gam_trade:gam_trade_secure_pass@postgres:5432/gam_trade_dev
ENV REDIS_URL=redis://redis:6379

CMD ["/app/order-worker"]
