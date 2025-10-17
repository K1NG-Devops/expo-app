#!/bin/bash

# ChatGPT Voice Mode Installation Script
# This script automates the installation of ChatGPT-style voice mode for Dash

set -e  # Exit on any error

echo "🚀 Installing ChatGPT Voice Mode for Dash..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from your project root directory."
    exit 1
fi

if [ ! -d "components" ]; then
    print_error "components directory not found. Are you in the right project directory?"
    exit 1
fi

print_status "Detected React Native/Expo project ✓"

# Step 1: Remove problematic files
print_status "Step 1: Removing problematic voice modal files..."

if [ -f "components/ai/VoiceRecorderSheet.tsx" ]; then
    rm "components/ai/VoiceRecorderSheet.tsx"
    print_success "Removed VoiceRecorderSheet.tsx"
else
    print_warning "VoiceRecorderSheet.tsx not found (already removed?)"
fi

if [ -f "components/ai/VoiceRecordingModal.tsx" ]; then
    rm "components/ai/VoiceRecordingModal.tsx"
    print_success "Removed VoiceRecordingModal.tsx"
else
    print_warning "VoiceRecordingModal.tsx not found (already removed?)"
fi

if [ -f "components/ai/VoiceRecorderSheet.tsx.bak" ]; then
    rm "components/ai/VoiceRecorderSheet.tsx.bak"
    print_success "Removed VoiceRecorderSheet.tsx.bak"
fi

# Step 2: Create directories if they don't exist
print_status "Step 2: Creating necessary directories..."

mkdir -p components/ai
mkdir -p hooks
mkdir -p docs

print_success "Directories ready ✓"

# Step 3: Create new files
print_status "Step 3: Creating new ChatGPT voice files..."

# Note: In a real script, you would either:
# 1. Have the file contents embedded here as heredocs
# 2. Download them from a repository
# 3. Copy them from a local source

print_warning "File creation step requires manual intervention."
print_warning "Please copy the files from the deployment package:"
echo ""
echo "Required files to create:"
echo "  📁 components/ai/SimpleVoiceModal.tsx"
echo "  📁 components/ai/ChatGPTVoiceMode.tsx"
echo "  📁 components/ai/VoiceModeSelector.tsx"
echo "  📁 hooks/useChatGPTVoice.ts"
echo "  📁 hooks/useVoiceModePreference.ts"
echo "  📁 docs/CHATGPT_VOICE_MODE_GUIDE.md"
echo ""

# Step 4: Backup existing files before modification
print_status "Step 4: Creating backups of files to be modified..."

if [ -f "components/ai/DashAssistant.tsx" ]; then
    cp "components/ai/DashAssistant.tsx" "components/ai/DashAssistant.tsx.backup"
    print_success "Backed up DashAssistant.tsx"
else
    print_error "DashAssistant.tsx not found!"
    exit 1
fi

if [ -f "components/ai/DashVoiceFloatingButton.tsx" ]; then
    cp "components/ai/DashVoiceFloatingButton.tsx" "components/ai/DashVoiceFloatingButton.tsx.backup"
    print_success "Backed up DashVoiceFloatingButton.tsx"
else
    print_warning "DashVoiceFloatingButton.tsx not found - skipping backup"
fi

# Step 5: Apply modifications (this would require more complex scripting)
print_status "Step 5: File modifications required..."

print_warning "Automatic file modification not implemented in this script."
print_warning "Please apply the changes manually using the FILE_MODIFICATIONS_GUIDE.md"
echo ""
echo "Files to modify:"
echo "  📝 components/ai/DashAssistant.tsx"
echo "  📝 components/ai/DashVoiceFloatingButton.tsx"
echo ""

# Step 6: Verification
print_status "Step 6: Installation verification..."

echo ""
echo "📋 Installation Checklist:"
echo "=========================="
echo ""
echo "✅ Step 1: Remove old files"
echo "⏳ Step 2: Create new files (manual)"
echo "⏳ Step 3: Modify existing files (manual)"
echo "⏳ Step 4: Test functionality"
echo ""

print_success "Automated steps completed!"
print_warning "Manual steps required - see deployment package for details."

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Copy the new files from NEW_FILES_PACKAGE.md"
echo "2. Apply modifications from FILE_MODIFICATIONS_GUIDE.md"
echo "3. Restart your development server: npm start"
echo "4. Test the ChatGPT voice mode functionality"
echo ""

print_success "Installation script completed! 🎉"
print_status "Check the deployment package files for detailed instructions."

exit 0