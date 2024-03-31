FROM node:12-alpine AS build
WORKDIR /app
COPY ./package.json ./package-lock.json ./
COPY ./src ./src
COPY ./public ./public
COPY ./.eslintrc ./
COPY ./tsconfig.json ./

# Install dependencies
RUN npm install

# Build the client bundle
RUN npm run build

FROM caddy:2.4.3-alpine

# Copy the client bundle to the Caddy server
COPY --from=build /app/build /var/www

COPY Caddyfile /etc/caddy/Caddyfile