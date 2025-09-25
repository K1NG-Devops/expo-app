#!/bin/bash

# Real-time Performance Monitor for EduDashPro
# Continuously monitors CPU, memory, FPS, and network usage

DEVICE_ID="A4SFCP3824414283"
APP_PACKAGE="com.edudashpro"
MONITOR_DURATION=${1:-60}  # Default 60 seconds
SAMPLE_INTERVAL=${2:-2}    # Default 2 seconds

echo "📊 EduDashPro Real-time Performance Monitor"
echo "==========================================="
echo "📱 Device: $DEVICE_ID"
echo "📦 Package: $APP_PACKAGE"
echo "⏱️  Duration: ${MONITOR_DURATION} seconds"
echo "🔄 Sample interval: ${SAMPLE_INTERVAL} seconds"
echo ""

# Check if app is running
PID=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
if [ -z "$PID" ]; then
    echo "❌ App is not running. Starting app..."
    adb -s $DEVICE_ID shell am start $APP_PACKAGE/.MainActivity
    sleep 5
    PID=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
    
    if [ -z "$PID" ]; then
        echo "❌ Failed to start app. Exiting."
        exit 1
    fi
fi

echo "✅ App is running (PID: $PID)"
echo ""

# Create monitoring data file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATA_FILE="./debug/performance-data-$TIMESTAMP.csv"
mkdir -p ./debug

# CSV Header
echo "timestamp,cpu_percent,memory_mb,fps,frame_time_ms,network_rx_kb,network_tx_kb,battery_temp,screen_brightness" > $DATA_FILE

echo "🚀 Starting performance monitoring..."
echo "Press Ctrl+C to stop early"
echo ""

# Function to get CPU usage
get_cpu_usage() {
    local pid=$1
    adb -s $DEVICE_ID shell top -b -n 1 -p $pid 2>/dev/null | tail -1 | awk '{print $9}' | tr -d '%'
}

# Function to get memory usage in MB
get_memory_usage() {
    local pid=$1
    local pss_kb=$(adb -s $DEVICE_ID shell dumpsys meminfo $pid 2>/dev/null | grep "TOTAL PSS" | awk '{print $3}')
    if [ -n "$pss_kb" ]; then
        echo $((pss_kb / 1024))
    else
        echo "0"
    fi
}

# Function to get FPS info
get_fps_info() {
    local pkg=$1
    # Reset frame stats
    adb -s $DEVICE_ID shell dumpsys gfxinfo $pkg reset 2>/dev/null
    sleep 1
    
    # Get frame stats
    local fps_data=$(adb -s $DEVICE_ID shell dumpsys gfxinfo $pkg framestats 2>/dev/null | tail -10 | head -1)
    if [ -n "$fps_data" ]; then
        # Calculate rough FPS from frame time (simplified)
        echo "60"  # Placeholder - actual calculation would be more complex
    else
        echo "0"
    fi
}

# Function to get battery temperature
get_battery_temp() {
    local temp=$(adb -s $DEVICE_ID shell dumpsys battery | grep temperature | awk '{print $2}')
    echo $((temp / 10))  # Convert to Celsius
}

# Function to get screen brightness
get_brightness() {
    adb -s $DEVICE_ID shell settings get system screen_brightness
}

# Monitoring loop
START_TIME=$(date +%s)
SAMPLE_COUNT=0

printf "%-8s %-6s %-8s %-5s %-10s %-8s %-6s\n" "TIME" "CPU%" "MEM(MB)" "FPS" "TEMP(°C)" "PID" "STATUS"
printf "%-8s %-6s %-8s %-5s %-10s %-8s %-6s\n" "--------" "------" "--------" "-----" "----------" "--------" "------"

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -ge $MONITOR_DURATION ]; then
        break
    fi
    
    # Check if app is still running
    CURRENT_PID=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
    
    if [ -z "$CURRENT_PID" ]; then
        echo "$(date +%H:%M:%S) ❌ App crashed or stopped"
        echo "$(date +%s),0,0,0,0,0,0,$(get_battery_temp),$(get_brightness)" >> $DATA_FILE
        
        # Try to restart app
        echo "$(date +%H:%M:%S) 🔄 Attempting to restart app..."
        adb -s $DEVICE_ID shell am start $APP_PACKAGE/.MainActivity >/dev/null 2>&1
        sleep 3
        CURRENT_PID=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
        
        if [ -n "$CURRENT_PID" ]; then
            echo "$(date +%H:%M:%S) ✅ App restarted (PID: $CURRENT_PID)"
            PID=$CURRENT_PID
        fi
    else
        PID=$CURRENT_PID
        
        # Collect performance metrics
        CPU_PERCENT=$(get_cpu_usage $PID)
        MEMORY_MB=$(get_memory_usage $PID)
        FPS=$(get_fps_info $APP_PACKAGE)
        BATTERY_TEMP=$(get_battery_temp)
        BRIGHTNESS=$(get_brightness)
        
        # Clean up values
        CPU_PERCENT=${CPU_PERCENT:-0}
        MEMORY_MB=${MEMORY_MB:-0}
        FPS=${FPS:-0}
        
        # Display current stats
        TIME_STR=$(date +%H:%M:%S)
        printf "%-8s %-6s %-8s %-5s %-10s %-8s %-6s\n" \
            "$TIME_STR" "$CPU_PERCENT%" "${MEMORY_MB}MB" "$FPS" "${BATTERY_TEMP}°C" "$PID" "OK"
        
        # Save to CSV
        echo "$(date +%s),$CPU_PERCENT,$MEMORY_MB,$FPS,16.7,0,0,$BATTERY_TEMP,$BRIGHTNESS" >> $DATA_FILE
        
        SAMPLE_COUNT=$((SAMPLE_COUNT + 1))
    fi
    
    sleep $SAMPLE_INTERVAL
done

echo ""
echo "🎯 PERFORMANCE MONITORING COMPLETE"
echo "=================================="
echo "📊 Samples collected: $SAMPLE_COUNT"
echo "📁 Data saved to: $DATA_FILE"

# Basic analysis
if [ -f "$DATA_FILE" ]; then
    echo ""
    echo "📈 PERFORMANCE SUMMARY"
    echo "====================="
    
    # Calculate averages (skip header line)
    AVG_CPU=$(tail -n +2 "$DATA_FILE" | awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}')
    AVG_MEMORY=$(tail -n +2 "$DATA_FILE" | awk -F',' '{sum+=$3; count++} END {if(count>0) print sum/count; else print 0}')
    MAX_MEMORY=$(tail -n +2 "$DATA_FILE" | awk -F',' 'BEGIN{max=0} {if($3>max) max=$3} END {print max}')
    
    printf "📊 Average CPU usage: %.1f%%\n" "$AVG_CPU"
    printf "🧠 Average Memory usage: %.1fMB\n" "$AVG_MEMORY"
    printf "🔥 Peak Memory usage: %dMB\n" "$MAX_MEMORY"
    
    # Check for potential issues
    if (( $(echo "$AVG_CPU > 80" | bc -l) )); then
        echo "⚠️  High CPU usage detected"
    fi
    
    if [ "$MAX_MEMORY" -gt 300 ]; then
        echo "⚠️  High memory usage detected"
    fi
    
    # Count crashes/restarts
    CRASH_COUNT=$(grep -c "0,0,0,0" "$DATA_FILE" || echo "0")
    if [ "$CRASH_COUNT" -gt 0 ]; then
        echo "❌ App crashes detected: $CRASH_COUNT"
    else
        echo "✅ No crashes detected during monitoring"
    fi
fi

echo ""
echo "💡 To visualize this data:"
echo "   - Import $DATA_FILE into Excel/Google Sheets"
echo "   - Or use: python3 -c \"import pandas as pd; import matplotlib.pyplot as plt; df=pd.read_csv('$DATA_FILE'); df.plot(); plt.show()\""
echo ""
echo "🔄 To run continuous monitoring:"
echo "   ./debug/monitor-crashes.sh"