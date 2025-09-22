FROM node:18-alpine

#metadata
LABEL   maintainer="ledat5934@gmail.com" \
        version="1.0.0" \
        description="Task tracker CLI"

RUN addgroup -g 1001 -S taskuser && \ 
    adduser -S taskuser -u 1001 -G taskuser

WORKDIR /app

# Copy package.json (cho metadata, mặc dù không có dependencies)
COPY package.json ./

# Copy source code
COPY task-cli.js ./
RUN mkdir -p /app/data && chown -R taskuser:taskuser /app
USER taskuser

VOLUME ["/app/data"]

# Set environment variable để app lưu data trong /app/data
ENV DATA_DIR=/app/data

ENTRYPOINT ["node", "task-cli.js"]
CMD ["help"]
