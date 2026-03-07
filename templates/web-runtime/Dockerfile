FROM node:20-slim

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Install pnpm and serve globally
RUN npm install -g pnpm serve

# Create workspace directory
RUN mkdir -p /home/user/app
WORKDIR /home/user/app

# Copy entrypoint script
COPY start.sh /home/user/start.sh
RUN chmod +x /home/user/start.sh
