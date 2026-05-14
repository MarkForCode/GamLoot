# Build stage
FROM rust:1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY rust/ ./rust/

RUN cargo build --release --manifest-path rust/Cargo.toml --bin user-api

# Runtime stage
FROM alpine:3.19
RUN apk add --no-cache libssl3
WORKDIR /app

COPY --from=builder /app/rust/target/release/user-api /app/user-api

ENV DATABASE_URL=postgres://gam_trade:gam_trade_secure_pass@postgres:5432/gam_trade_dev
ENV REDIS_URL=redis://redis:6379

EXPOSE 8080

CMD ["/app/user-api"]
