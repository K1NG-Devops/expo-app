#!/bin/bash

# EduDashPro Crash Monitor Script
# This script monitors ADB logs for crashes and provides detailed crash analysis

DEVICE_ID="A4SFCP3824414283"
APP_PACKAGE="com.edudashpro"
LOG_FILE="./debug/crash-logs-$(date +%Y%m%d_%H%M%S).log"

echo "🚀 EduDashPro Crash Monitor Starting..."
echo "📱 Device: $DEVICE_ID"
echo "📦 Package: $APP_PACKAGE" 
echo "📝 Log file: $LOG_FILE"
echo ""

# Create debug directory if it doesn't exist
mkdir -p ./debug

# Clear existing logs
adb -s $DEVICE_ID logcat -c

echo "🔍 Monitoring for crashes... Press Ctrl+C to stop"
echo "----------------------------------------"

# Monitor logs with multiple filters to catch different types of crashes
adb -s $DEVICE_ID logcat -v time | tee $LOG_FILE | grep -E \
  --line-buffered \
  --color=always \
  "($APP_PACKAGE|ReactNativeJS|AndroidRuntime|FATAL|SIGSEGV|SIGABRT|expo|ExponentGLView|chromium|E/ReactNativeJS|F/libc|tombstone|CRASH|Exception|Error)" \
  | while read line; do
    echo "$(date '+%H:%M:%S') | $line"
    
    # Check for specific crash patterns
    if echo "$line" | grep -q "STATE_DEAD"; then
      echo "💀 APP CRASH DETECTED - Process died"
    fi
    
    if echo "$line" | grep -qE "(FATAL|SIGSEGV|SIGABRT)"; then
      echo "🔴 CRITICAL ERROR DETECTED"
    fi
    
    if echo "$line" | grep -q "ReactNativeJS"; then
      echo "⚛️  React Native Error"
    fi
  done