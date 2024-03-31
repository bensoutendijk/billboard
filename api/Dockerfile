FROM node:12-alpine AS api

WORKDIR /app

# Copy the source code and package.json from the ./api directory
COPY ./package.json ./package-lock.json ./
COPY ./src ./src
COPY ./.eslintrc ./
COPY ./tsconfig.json ./

# Install dependencies
RUN npm install

# Build the API bundle
RUN npm run build

CMD [ "node", "build/index.js" ]
