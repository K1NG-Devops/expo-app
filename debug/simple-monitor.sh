#!/bin/bash

DEVICE=$(adb devices | grep -v "List" | head -1 | cut -f1)
PACKAGE="com.edudashpro"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./debug/simple-logs-${TIMESTAMP}.log"

echo "🚀 Simple EduDashPro Monitor Starting..."
echo "📱 Device: $DEVICE"
echo "📦 Package: $PACKAGE"
echo "📝 Log file: $LOG_FILE"
echo ""
echo "🔍 Monitoring ALL app activity... Press Ctrl+C to stop"
echo "----------------------------------------" | tee -a $LOG_FILE

# Clear existing logs
adb logcat -c

# Monitor with very broad filtering - capture everything related to the app
adb logcat -v threadtime | grep -i "edudashpro\|expo\|react\|hermes\|metro\|fatal\|error\|crash\|exception" | \
while IFS= read -r line; do
  current_time=$(date +%H:%M:%S)
  echo "$current_time | $line" | tee -a "$LOG_FILE"
done