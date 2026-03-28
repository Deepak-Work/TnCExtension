#!/bin/bash

# Load config file
CONFIG_FILE="../config/config.json"
CRAWL_PORT=$(jq -r '.crawlEndPoint' $CONFIG_FILE | grep -oE '[0-9]+')
SERVER_PORT=$(jq -r '.summarizerEndPoint' $CONFIG_FILE | grep -oE '[0-9]+')

# Kill any existing processes on the required ports
kill_port() {
    local port=$1
    local pid=$(lsof -ti tcp:$port)
    if [ -n "$pid" ]; then
        echo "Killing existing process on port $port (PID $pid)..."
        kill -9 $pid
    fi
}

kill_port $CRAWL_PORT
kill_port $SERVER_PORT

# Start crawl service
echo "Starting crawl service on port $CRAWL_PORT ..."
(cd ../src/backend/parser && uvicorn main:app --host 0.0.0.0 --port $CRAWL_PORT --reload &)

# Start summarization service
echo "Starting summarization service on port $SERVER_PORT ..."
(cd ../src/backend/summarizer && uvicorn main:app --host 0.0.0.0 --port $SERVER_PORT --reload &)

wait
