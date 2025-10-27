#!/bin/bash

# Enhanced crash monitor for native and JS crashes
DEVICE=$(adb devices | grep -v "List" | head -1 | cut -f1)
PACKAGE="com.edudashpro"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./debug/enhanced-crash-logs-${TIMESTAMP}.log"

echo "🚀 Enhanced EduDashPro Crash Monitor Starting..."
echo "📱 Device: $DEVICE"
echo "📦 Package: $PACKAGE"
echo "📝 Log file: $LOG_FILE"
echo ""

# Get app UID for filtering
APP_UID=$(adb shell dumpsys package $PACKAGE | grep "userId=" | head -1 | sed 's/.*userId=\([0-9]*\).*/\1/')
echo "🆔 App UID: $APP_UID"

echo "🔍 Monitoring for crashes, native errors, and JS errors... Press Ctrl+C to stop"
echo "----------------------------------------" | tee -a $LOG_FILE

# Clear existing logs
adb logcat -c

# Monitor with comprehensive filters (no PID filtering to catch startup crashes)
adb logcat -v threadtime \
  -s "AndroidRuntime:E" \
  -s "ReactNativeJS:*" \
  -s "ExceptionsManager:*" \
  -s "System.err:*" \
  -s "DEBUG:*" \
  -s "libc:F" \
  -s "tombstoned:*" \
  -s "crash_dump:*" \
  -s "mtkpower:*" \
  "*:F" "*:E" | grep -E "($PACKAGE|ReactNative|Metro|Expo|Hermes|FATAL|tombstone|crash_dump)" |
while IFS= read -r line; do
  current_time=$(date +%H:%M:%S)
  echo "$current_time | $line" | tee -a "$LOG_FILE"
  
  # Check for app process death
  if echo "$line" | grep -q "STATE_DEAD.*$PACKAGE"; then
    echo "💀 APP CRASH DETECTED - Process died" | tee -a "$LOG_FILE"
  fi
  
  # Check for native crashes
  if echo "$line" | grep -q "FATAL EXCEPTION\|AndroidRuntime.*FATAL\|tombstone\|crash_dump"; then
    echo "⚠️  NATIVE CRASH DETECTED" | tee -a "$LOG_FILE"
  fi
  
  # Check for React Native JS errors
  if echo "$line" | grep -q "ReactNativeJS.*Error\|ExceptionsManager"; then
    echo "🔴 REACT NATIVE ERROR DETECTED" | tee -a "$LOG_FILE"
  fi
done