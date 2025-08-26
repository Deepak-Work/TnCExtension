#!/bin/bash

#Load config file
CONFIG_FILE="config.json"
CRAWL_PORT=$(jq -r '.crawlEndPoint' $CONFIG_FILE | grep -oE '[0-9]+')
SERVER_PORT=$(jq -r '.summarizerEndPoint' $CONFIG_FILE | grep -oE '[0-9]+')

# Start crawl service
echo "Starting crawl service on port $CRAWL_PORT ..."
(cd parser && uvicorn main:app --host 0.0.0.0 --port $CRAWL_PORT --reload &)

# Start summarization service
echo "Starting summarization service on port $SERVER_PORT ..."
(cd server && uvicorn main:app --host 0.0.0.0 --port $SERVER_PORT --reload &)

wait
