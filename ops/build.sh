#!/bin/bash

docker build -t billboard-web:latest client
docker save billboard-web:latest -o billboard-web.tar

docker build -t billboard-api:latest api
docker save billboard-api:latest -o billboard-api.tar

docker build -t billboard-db:latest db
docker save billboard-db:latest -o billboard-db.tar