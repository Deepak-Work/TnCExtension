#!/bin/bash

# Extract ports from config.json using grep and sed
PORTS=($(cat ../config/config.json | grep -o "localhost:[0-9]*" | sed 's/localhost://g'))

# Function to check if a process was killed
killed_any=false

# Kill processes on each port
for PORT in "${PORTS[@]}"
do
    PID=$(lsof -ti:$PORT)
    if [ ! -z "$PID" ]; then
        echo "Killing process on port $PORT (PID: $PID)"
        kill -9 $PID
        killed_any=true
    fi
done

# Show appropriate message
if [ "$killed_any" = true ]; then
    echo "Development servers terminated successfully"
else
    echo "No development servers found running"
fi