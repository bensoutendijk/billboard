FROM node:12-alpine AS client

WORKDIR /app

# Copy the source code and package.json from the ./client directory
COPY ./client/package.json ./client/package-lock.json ./
COPY ./client/src ./src
COPY ./client/public ./public
COPY ./client/.eslintrc ./
COPY ./client/tsconfig.json ./

# Install dependencies
RUN npm install

# Build the client bundle
RUN npm run build

FROM node:12-alpine AS api

WORKDIR /app

# Copy the source code and package.json from the ./api directory
COPY ./api/package.json ./api/package-lock.json ./
COPY ./api/src ./src
COPY ./api/.eslintrc ./
COPY ./api/tsconfig.json ./

# Install dependencies
RUN npm install

# Build the API bundle
RUN npm run build

FROM node:12-bullseye-slim

RUN apt-get update && \
  apt-get install -y \
  gnupg \
  curl \
  debian-keyring \
  debian-archive-keyring \
  apt-transport-https

# Add the Caddy repository
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list

# Add the MongoDB repository
RUN curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
  --dearmor
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

RUN apt-get update && \
  apt-get install -y \ 
  supervisor \
  caddy \
  mongodb-org 

# Create the MongoDB data directory
RUN mkdir -p /data/db

# Copy the supervisord configuration file
COPY ./supervisord.conf /etc/supervisord.conf

WORKDIR /app

# Copy the client bundle from the client stage
COPY --from=client /app/build /var/www

# Copy the API bundle from the api stage
COPY --from=api /app/build ./api/build
COPY --from=api /app/node_modules ./api/node_modules

# Copy the Caddyfile
COPY ./Caddyfile /etc/caddy/Caddyfile

# Expose port 80
EXPOSE 80

# Set supervisord as the entrypoint
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]