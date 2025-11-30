FROM node:20-alpine

WORKDIR /app

# Create simple HTML UI
RUN mkdir -p /app/public

# We'll create a simple static HTML page for job submission
COPY docker/simple-ui.html /app/public/index.html

# Simple Node server to serve UI and handle API
RUN npm install express body-parser pg ioredis bullmq

COPY docker/simple-server.js /app/server.js

EXPOSE 8080

CMD ["node", "server.js"]

