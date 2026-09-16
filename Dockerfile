FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV NG_ALLOWED_HOSTS=dsa-drill.duckdns.org,localhost,127.0.0.1

# Copy pre-built dist output and package definitions uploaded via SCP
COPY package*.json ./
COPY dist ./dist

# Install ONLY runtime dependencies needed for Angular SSR
RUN npm ci --omit=dev

EXPOSE 4000

# Path to the compiled SSR server entry point
CMD ["node", "dist/dsa-drill-front/server/server.mjs"]