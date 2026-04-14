FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY src/telemetry-agent/package*.json ./

# Install dependencies
RUN npm install --production

# Copy agent code
COPY src/telemetry-agent/*.js ./

# Run as non-root user
USER node

CMD ["node", "agent.js"]
