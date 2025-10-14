#!/bin/bash

# Debug Trace Script for EduDash Pro
# Purpose: Build, install, and capture comprehensive logs to trace sign-in errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="com.edudashpro"
LOG_DIR="$HOME/Desktop/edudashpro-debug-logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/debug-$TIMESTAMP.log"

# Create log directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  EduDash Pro - Debug Trace Tool${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Function to check if device is connected
check_device() {
    echo -e "${YELLOW}Checking for connected Android device...${NC}"
    if ! adb devices | grep -q "device$"; then
        echo -e "${RED}❌ No Android device connected!${NC}"
        echo "Please connect your device and enable USB debugging"
        exit 1
    fi
    echo -e "${GREEN}✓ Device connected${NC}"
    adb devices | tail -n +2
    echo ""
}

# Function to choose build type
choose_build_type() {
    echo -e "${YELLOW}Choose build type:${NC}"
    echo "1) Development build (fastest, best for debugging)"
    echo "2) Preview APK (local build, production-like)"
    echo "3) Skip build (use existing installation)"
    read -p "Enter choice [1-3]: " choice
    echo ""
    
    case $choice in
        1)
            BUILD_TYPE="development"
            ;;
        2)
            BUILD_TYPE="preview"
            ;;
        3)
            BUILD_TYPE="skip"
            ;;
        *)
            echo -e "${RED}Invalid choice. Defaulting to development build.${NC}"
            BUILD_TYPE="development"
            ;;
    esac
}

# Function to build development version
build_development() {
    echo -e "${YELLOW}Building development version...${NC}"
    echo "This will start Metro bundler in the background"
    
    # Kill any existing Metro processes
    pkill -f "react-native.*start" || true
    pkill -f "metro" || true
    sleep 2
    
    # Clear React Native cache
    echo -e "${YELLOW}Clearing React Native cache...${NC}"
    npm run start:clear &
    METRO_PID=$!
    
    echo "Metro bundler started (PID: $METRO_PID)"
    echo "Waiting for bundler to initialize..."
    sleep 10
    
    # Build and install
    echo -e "${YELLOW}Building and installing app...${NC}"
    npm run android
    
    echo -e "${GREEN}✓ Development build installed${NC}"
    echo ""
}

# Function to build preview APK
build_preview() {
    echo -e "${YELLOW}Building preview APK locally...${NC}"
    echo "This will take ~15-20 minutes"
    
    eas build --platform android --profile preview --local
    
    # Find the generated APK
    APK_PATH=$(find . -name "*.apk" -type f -mmin -30 | head -n 1)
    
    if [ -z "$APK_PATH" ]; then
        echo -e "${RED}❌ Could not find generated APK${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Installing APK: $APK_PATH${NC}"
    adb install -r "$APK_PATH"
    
    echo -e "${GREEN}✓ Preview APK installed${NC}"
    echo ""
}

# Function to clear app data
clear_app_data() {
    echo -e "${YELLOW}Clearing app data for fresh start...${NC}"
    adb shell pm clear "$PACKAGE_NAME" 2>/dev/null || true
    echo -e "${GREEN}✓ App data cleared${NC}"
    echo ""
}

# Function to start log capture
start_log_capture() {
    echo -e "${YELLOW}Starting log capture...${NC}"
    echo "Logs will be saved to: $LOG_FILE"
    echo ""
    
    # Clear existing logs
    adb logcat -c
    
    # Start capturing logs
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Log Capture Started - Reproduce the issue now${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Instructions:"
    echo "1. Sign in to the app"
    echo "2. Close the app completely (swipe away from recents)"
    echo "3. Reopen the app"
    echo "4. Wait for the 'Unexpected error' to appear"
    echo "5. Press Ctrl+C to stop log capture"
    echo ""
    echo -e "${GREEN}Watching logs...${NC}"
    echo ""
    
    # Capture logs with multiple filters
    adb logcat | tee "$LOG_FILE" | grep -E "ReactNativeJS|SessionManager|SIGN IN|Auth|Route|ERROR|Exception"
}

# Function to analyze logs
analyze_logs() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Log Analysis${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check for specific error patterns
    echo -e "${YELLOW}Searching for error patterns...${NC}"
    echo ""
    
    if grep -q "SIGN IN ERROR DEBUG" "$LOG_FILE"; then
        echo -e "${RED}Found sign-in error:${NC}"
        grep -A 8 "SIGN IN ERROR DEBUG" "$LOG_FILE" | head -n 10
        echo ""
    fi
    
    if grep -q "SessionManager.*error" "$LOG_FILE"; then
        echo -e "${RED}Found SessionManager error:${NC}"
        grep "SessionManager.*error" "$LOG_FILE" | tail -n 5
        echo ""
    fi
    
    if grep -q "Storage failed" "$LOG_FILE"; then
        echo -e "${RED}Found storage error:${NC}"
        grep "Storage failed" "$LOG_FILE"
        echo ""
    fi
    
    if grep -q "Failed to load user profile" "$LOG_FILE"; then
        echo -e "${RED}Found profile loading error:${NC}"
        grep "Failed to load user profile" "$LOG_FILE"
        echo ""
    fi
    
    echo -e "${GREEN}Full logs saved to: $LOG_FILE${NC}"
    echo ""
    echo "To view full logs:"
    echo "  cat $LOG_FILE"
    echo ""
    echo "To search for specific terms:"
    echo "  grep 'search_term' $LOG_FILE"
    echo ""
}

# Main execution
main() {
    check_device
    choose_build_type
    
    case $BUILD_TYPE in
        development)
            build_development
            ;;
        preview)
            build_preview
            ;;
        skip)
            echo -e "${YELLOW}Skipping build, using existing installation${NC}"
            echo ""
            ;;
    esac
    
    # Ask if user wants to clear app data
    read -p "Clear app data for fresh test? (y/n): " clear_choice
    if [[ $clear_choice == "y" ]]; then
        clear_app_data
    fi
    
    # Start capturing logs
    start_log_capture
}

# Handle Ctrl+C gracefully
trap 'echo ""; echo "Log capture stopped"; analyze_logs; exit 0' INT

# Run main function
main
