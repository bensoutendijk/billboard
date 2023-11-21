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

FROM node:12-alpine

# Install supervisord
RUN apk add --no-cache supervisor

# Install caddy
RUN apk add --no-cache caddy=2.4.6-r3

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