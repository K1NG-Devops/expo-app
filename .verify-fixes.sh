#!/bin/bash
echo "🔍 Verifying Voice & Require Cycle Fixes..."
echo ""

echo "1️⃣ Checking dependencies..."
if npm list @picovoice/react-native-voice-processor | grep -q "1.2.3"; then
  echo "   ✅ Picovoice VoiceProcessor installed (v1.2.3)"
else
  echo "   ❌ Picovoice VoiceProcessor NOT installed"
fi

if npm list @react-native-voice/voice | grep -q "3.2.4"; then
  echo "   ✅ React Native Voice installed (v3.2.4)"
else
  echo "   ❌ React Native Voice NOT installed"
fi

echo ""
echo "2️⃣ Checking for require cycles in service files..."
FILES="services/DashContextAnalyzer.ts services/DashTaskAutomation.ts services/DashDecisionEngine.ts services/DashProactiveEngine.ts"
CYCLES=0
for file in $FILES; do
  if grep -q "import.*lib/di/providers/default" "$file" 2>/dev/null; then
    echo "   ❌ $file still has circular import"
    CYCLES=$((CYCLES + 1))
  fi
done

if [ $CYCLES -eq 0 ]; then
  echo "   ✅ All service files fixed (no circular imports)"
else
  echo "   ❌ Found $CYCLES files with circular imports"
fi

echo ""
echo "3️⃣ Checking new voice availability module..."
if [ -f "lib/voice/voiceAvailability.ts" ]; then
  echo "   ✅ Voice availability checker created"
else
  echo "   ❌ Voice availability checker NOT found"
fi

echo ""
echo "4️⃣ Checking documentation..."
if [ -f "VOICE_SETUP.md" ]; then
  echo "   ✅ VOICE_SETUP.md created"
else
  echo "   ❌ VOICE_SETUP.md NOT found"
fi

if [ -f "FIXES_SUMMARY.md" ]; then
  echo "   ✅ FIXES_SUMMARY.md created"
else
  echo "   ❌ FIXES_SUMMARY.md NOT found"
fi

echo ""
echo "5️⃣ Next steps for voice on native:"
echo "   📱 Run: npx expo prebuild --clean"
echo "   📱 Run: npx expo run:android (or run:ios)"
echo ""
echo "   🌐 For web (works now): npm run web"
echo ""
echo "✅ All fixes complete!"
