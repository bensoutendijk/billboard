#!/bin/bash

# Check if $CI is true
if [ "$CI" = true ]; then
# Set the path for the tar files to /tmp
    path="/tmp"
else
# Set the path for the tar files to ./
    path="."
fi

docker load -i $path/billboard-web.tar
docker load -i $path/billboard-api.tar
docker load -i $path/billboard-db.tar

docker compose -f compose.production.yml up -d
