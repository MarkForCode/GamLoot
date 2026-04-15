# Build stage
FROM rust:1.75-alpine AS builder
WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY rust/ ./rust/
COPY Cargo.toml rust/Cargo.toml ./

RUN cargo build --release --bin cms-api

# Runtime stage
FROM alpine:3.19
RUN apk add --no-cache libssl3
WORKDIR /app

COPY --from=builder /app/target/release/cms-api /app/cms-api

ENV DATABASE_URL=postgres://gam_trade:gam_trade_secure_pass@postgres:5432/gam_trade_dev
ENV REDIS_URL=redis://redis:6379

EXPOSE 8081

CMD ["/app/cms-api"]