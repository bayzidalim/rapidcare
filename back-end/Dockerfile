FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall to avoid running migrations before code is copied)
RUN npm ci --only=production --ignore-scripts

# Copy source code
COPY . .

# Run migrations after code is copied
RUN npm run migrate

# Create database directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "start"]