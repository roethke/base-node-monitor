FROM node:18-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY src/ ./src/

# Create directory for database
RUN mkdir -p /app/data

# Expose API port
EXPOSE 8000

# Run as non-root user
USER node

# Default to running the API server
CMD ["node", "src/api/server.js"]
