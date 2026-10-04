FROM golang:1.24-alpine AS build

RUN apk add --no-cache git ca-certificates

RUN go install github.com/minio/minio@latest

FROM alpine:3.22

RUN apk add --no-cache ca-certificates

COPY --from=build /go/bin/minio /usr/local/bin/minio

ENTRYPOINT ["minio"]