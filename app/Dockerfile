# Use official Node.js 22 Alpine image
FROM node:22-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package management files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./

# Install dependencies using pnpm
RUN pnpm install --ignore-scripts

# Copy application source code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S discordbot && \
    adduser -S discordbot -u 1001 -G discordbot && \
    chown -R discordbot:discordbot /app

# Switch to non-root user
USER discordbot

# Start the bot
CMD ["pnpm", "start"]