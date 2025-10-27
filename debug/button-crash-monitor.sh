#!/bin/bash

DEVICE=$(adb devices | grep -v "List" | head -1 | cut -f1)
PACKAGE="com.edudashpro"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./debug/button-crash-logs-${TIMESTAMP}.log"

echo "🚀 Button Crash Monitor Starting..."
echo "📱 Device: $DEVICE"
echo "📦 Package: $PACKAGE"
echo "📝 Log file: $LOG_FILE"
echo ""
echo "🔍 Monitoring for button click crashes... Press Ctrl+C to stop"
echo "Now click the button that causes the crash!"
echo "----------------------------------------" | tee -a $LOG_FILE

# Clear existing logs
adb logcat -c

# Monitor with very specific filters for crashes and errors
adb logcat -v threadtime | grep -E "(FATAL|ERROR|CRASH|Exception|com\.edudashpro|ReactNative|Hermes|Metro|WebBrowser)" | \
while IFS= read -r line; do
  current_time=$(date +%H:%M:%S)
  echo "$current_time | $line" | tee -a "$LOG_FILE"
  
  # Check for specific crash indicators
  if echo "$line" | grep -q "FATAL\|Exception\|CRASH"; then
    echo "🚨 CRASH/ERROR DETECTED!" | tee -a "$LOG_FILE"
  fi
  
  # Check for WebBrowser issues
  if echo "$line" | grep -q "WebBrowser\|openBrowserAsync"; then
    echo "🌐 WEBBROWSER ACTIVITY DETECTED" | tee -a "$LOG_FILE"
  fi
  
  # Check for React Native JS errors  
  if echo "$line" | grep -q "ReactNativeJS\|Metro\|Hermes"; then
    echo "⚛️ REACT NATIVE ACTIVITY DETECTED" | tee -a "$LOG_FILE"
  fi
done