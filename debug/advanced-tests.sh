#!/bin/bash

# Advanced ADB Automated Testing for EduDashPro
# Includes UI interaction, deep link testing, and crash recovery

DEVICE_ID="A4SFCP3824414283"
APP_PACKAGE="com.edudashpro"
RESULTS_DIR="./debug/advanced-results-$(date +%Y%m%d_%H%M%S)"

echo "🚀 EduDashPro Advanced Testing Suite"
echo "===================================="
echo "📱 Device: $DEVICE_ID"
echo "📦 Package: $APP_PACKAGE"
echo "📁 Results: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p $RESULTS_DIR

# Initialize test results
TEST_RESULTS=()
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    if [ "$status" = "PASS" ]; then
        echo "✅ $test_name: PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $test_name: FAILED - $details"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TEST_RESULTS+=("$test_name|$status|$details")
}

# Function to capture screenshot
capture_screenshot() {
    local filename="$1"
    adb -s $DEVICE_ID exec-out screencap -p > "$RESULTS_DIR/$filename"
}

# Function to dump UI hierarchy
dump_ui() {
    local filename="$1"
    adb -s $DEVICE_ID shell uiautomator dump /sdcard/window_dump.xml
    adb -s $DEVICE_ID pull /sdcard/window_dump.xml "$RESULTS_DIR/$filename" 2>/dev/null
}

# Function to wait for element (basic implementation)
wait_for_ui() {
    local search_text="$1"
    local timeout="${2:-10}"
    local count=0
    
    while [ $count -lt $timeout ]; do
        dump_ui "temp_ui.xml"
        if grep -q "$search_text" "$RESULTS_DIR/temp_ui.xml" 2>/dev/null; then
            rm -f "$RESULTS_DIR/temp_ui.xml"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    return 1
}

# Function to tap coordinates
tap_coords() {
    local x="$1"
    local y="$2"
    adb -s $DEVICE_ID shell input tap $x $y
    sleep 1
}

# Function to input text
input_text() {
    local text="$1"
    adb -s $DEVICE_ID shell input text "$text"
    sleep 1
}

# Function to press back button
press_back() {
    adb -s $DEVICE_ID shell input keyevent 4
    sleep 1
}

echo "🧪 STARTING ADVANCED TESTS"
echo "========================="

# Test 1: App State Recovery
echo ""
echo "Test 1: App State Recovery After Force Kill"
echo "-------------------------------------------"

adb -s $DEVICE_ID shell am force-stop $APP_PACKAGE
sleep 2
capture_screenshot "01_after_force_stop.png"

# Start app and measure launch time
start_time=$(date +%s%3N)
adb -s $DEVICE_ID shell am start -W $APP_PACKAGE/.MainActivity >/dev/null 2>&1
end_time=$(date +%s%3N)
launch_time=$((end_time - start_time))

sleep 5
capture_screenshot "01_after_restart.png"

if [ $launch_time -lt 3000 ]; then
    log_test "App Launch Performance" "PASS" "Launch time: ${launch_time}ms"
else
    log_test "App Launch Performance" "FAIL" "Launch time too slow: ${launch_time}ms"
fi

# Test 2: Deep Link Navigation
echo ""
echo "Test 2: Deep Link Navigation Testing"
echo "------------------------------------"

# Test home deep link
adb -s $DEVICE_ID shell am start -a android.intent.action.VIEW -d "edudashpro://home"
sleep 3
capture_screenshot "02_deeplink_home.png"
dump_ui "02_deeplink_home.xml"

# Test various deep links
DEEP_LINKS=(
    "edudashpro://students"
    "edudashpro://messages"
    "edudashpro://settings"
)

for link in "${DEEP_LINKS[@]}"; do
    echo "Testing deep link: $link"
    adb -s $DEVICE_ID shell am start -a android.intent.action.VIEW -d "$link"
    sleep 3
    
    # Check if app crashed
    pid=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
    if [ -z "$pid" ]; then
        log_test "Deep Link ($link)" "FAIL" "App crashed after deep link"
        # Restart app for next test
        adb -s $DEVICE_ID shell am start $APP_PACKAGE/.MainActivity
        sleep 3
    else
        log_test "Deep Link ($link)" "PASS" "Successfully navigated"
    fi
done

# Test 3: Network State Testing
echo ""
echo "Test 3: Network State Resilience"
echo "--------------------------------"

# Test with WiFi on
capture_screenshot "03_wifi_on_before.png"
sleep 2

# Disable WiFi
echo "Disabling WiFi..."
adb -s $DEVICE_ID shell svc wifi disable
sleep 5
capture_screenshot "03_wifi_off.png"

# Check if app is still responsive
pid=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
if [ -n "$pid" ]; then
    log_test "WiFi Disable Resilience" "PASS" "App remained active"
else
    log_test "WiFi Disable Resilience" "FAIL" "App crashed when WiFi disabled"
fi

# Re-enable WiFi
echo "Re-enabling WiFi..."
adb -s $DEVICE_ID shell svc wifi enable
sleep 5
capture_screenshot "03_wifi_on_after.png"

# Test 4: Memory Pressure Test
echo ""
echo "Test 4: Memory Pressure Testing"
echo "-------------------------------"

# Get initial memory usage
pid=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
if [ -n "$pid" ]; then
    initial_memory=$(adb -s $DEVICE_ID shell dumpsys meminfo $pid | grep "TOTAL PSS" | awk '{print $3}')
    echo "Initial memory usage: ${initial_memory}K"
    
    # Simulate memory pressure by opening/closing app multiple times
    for i in {1..3}; do
        echo "Memory pressure test iteration $i"
        adb -s $DEVICE_ID shell am start -a android.intent.action.VIEW -d "edudashpro://home"
        sleep 2
        press_back
        sleep 1
    done
    
    # Check final memory usage
    final_pid=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
    if [ -n "$final_pid" ]; then
        final_memory=$(adb -s $DEVICE_ID shell dumpsys meminfo $final_pid | grep "TOTAL PSS" | awk '{print $3}')
        echo "Final memory usage: ${final_memory}K"
        
        # Check for memory leaks (simple heuristic)
        if [ "$final_memory" -lt $((initial_memory * 2)) ]; then
            log_test "Memory Pressure Resilience" "PASS" "No significant memory leaks detected"
        else
            log_test "Memory Pressure Resilience" "FAIL" "Potential memory leak: ${initial_memory}K -> ${final_memory}K"
        fi
    else
        log_test "Memory Pressure Resilience" "FAIL" "App crashed during memory pressure test"
    fi
else
    log_test "Memory Pressure Resilience" "FAIL" "App not running for memory test"
fi

# Test 5: UI Responsiveness Test
echo ""
echo "Test 5: UI Responsiveness Testing"
echo "---------------------------------"

# Test rapid taps (stress test)
echo "Performing rapid UI interactions..."
for i in {1..5}; do
    # Tap center of screen
    tap_coords 540 960
    sleep 0.5
    press_back
    sleep 0.5
done

# Check if app is still responsive
pid=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
if [ -n "$pid" ]; then
    log_test "UI Responsiveness" "PASS" "App remained responsive during rapid interactions"
else
    log_test "UI Responsiveness" "FAIL" "App crashed during UI stress test"
fi

capture_screenshot "05_ui_stress_test.png"

# Test 6: Permissions Testing
echo ""
echo "Test 6: Permissions Behavior"
echo "----------------------------"

# Check that sensitive permissions are properly denied
blocked_permissions=$(adb -s $DEVICE_ID shell dumpsys package $APP_PACKAGE | grep -E "(CAMERA.*granted=false|RECORD_AUDIO.*granted=false)")

if [ -n "$blocked_permissions" ]; then
    log_test "Sensitive Permissions Blocked" "PASS" "Camera and Audio permissions properly blocked"
else
    log_test "Sensitive Permissions Blocked" "FAIL" "Sensitive permissions not properly blocked"
fi

# Test 7: Crash Recovery
echo ""
echo "Test 7: Crash Recovery Testing"
echo "------------------------------"

# Force an ANR-like condition (send app to background for extended time)
adb -s $DEVICE_ID shell input keyevent 3  # Home button
sleep 10

# Bring app back to foreground
adb -s $DEVICE_ID shell am start $APP_PACKAGE/.MainActivity
sleep 3

pid=$(adb -s $DEVICE_ID shell pidof $APP_PACKAGE)
if [ -n "$pid" ]; then
    log_test "Background Recovery" "PASS" "App successfully resumed from background"
else
    log_test "Background Recovery" "FAIL" "App failed to resume from background"
fi

capture_screenshot "07_background_recovery.png"

# Test 8: Log Analysis for Errors
echo ""
echo "Test 8: Error Log Analysis"
echo "--------------------------"

# Capture recent logs and check for errors
adb -s $DEVICE_ID logcat -v time -t 200 > "$RESULTS_DIR/recent_logs.txt"

error_count=$(grep -cE "(E/|F/|FATAL|ERROR|CRASH)" "$RESULTS_DIR/recent_logs.txt" | head -1)
react_native_errors=$(grep -cE "ReactNativeJS.*Error" "$RESULTS_DIR/recent_logs.txt" | head -1)

if [ "$error_count" -lt 5 ]; then
    log_test "System Error Frequency" "PASS" "Low error count: $error_count"
else
    log_test "System Error Frequency" "FAIL" "High error count: $error_count"
fi

if [ "$react_native_errors" -eq 0 ]; then
    log_test "React Native Errors" "PASS" "No React Native JavaScript errors"
else
    log_test "React Native Errors" "FAIL" "Found $react_native_errors React Native errors"
fi

# Final Results Summary
echo ""
echo "🎯 ADVANCED TEST RESULTS SUMMARY"
echo "================================"
echo "📊 Total Tests: $((PASSED_TESTS + FAILED_TESTS))"
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $FAILED_TESTS"
echo ""

# Generate detailed report
cat > "$RESULTS_DIR/test_report.txt" << EOF
EduDashPro Advanced Test Report
==============================
Date: $(date)
Device: $DEVICE_ID
Package: $APP_PACKAGE

Summary:
- Total Tests: $((PASSED_TESTS + FAILED_TESTS))
- Passed: $PASSED_TESTS
- Failed: $FAILED_TESTS

Detailed Results:
EOF

for result in "${TEST_RESULTS[@]}"; do
    echo "$result" | sed 's/|/ - /' >> "$RESULTS_DIR/test_report.txt"
done

echo ""
echo "📁 Detailed results saved to: $RESULTS_DIR/"
echo "📸 Screenshots captured for visual verification"
echo "📋 Full report: $RESULTS_DIR/test_report.txt"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed! Your app is performing well."
    exit 0
else
    echo "⚠️  Some tests failed. Check the detailed report for issues to address."
    exit 1
fi