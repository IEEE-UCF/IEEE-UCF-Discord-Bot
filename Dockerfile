# Use the official Bun image as the base
FROM oven/bun:1.2-alpine AS base

# Set working directory
WORKDIR /app

# Yoink the package files first
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S discordbot && \
    adduser -S discordbot -u 1001 -G discordbot

# Change ownership of the app directory
RUN chown -R discordbot:discordbot /app

# Switch to non-root user
USER discordbot

# Start the bot
CMD ["bun", "run", "main.ts"]