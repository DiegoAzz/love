FROM node:20-alpine

WORKDIR /app

# Copy package info
COPY package.json ./

# Copy application files
COPY server.cjs ./
COPY public ./public
COPY data ./data

# Production environment
ENV NODE_ENV=production
ENV PORT=3333

EXPOSE 3333

CMD ["node", "server.cjs"]
