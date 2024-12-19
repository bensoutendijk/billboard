FROM node:20-alpine AS api

WORKDIR /app

# Install dependencies
COPY ./package.json ./package-lock.json ./
RUN npm install

COPY ./src ./src
COPY ./eslint.config.mjs ./
COPY ./tsconfig.json ./

# Build the API bundle
RUN npm run build

EXPOSE 8080

CMD [ "node", "build/app.js" ]