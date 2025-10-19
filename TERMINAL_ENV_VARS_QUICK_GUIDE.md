# Terminal Environment Variables Quick Guide
**For Background Agent Terminal (Linux Bash)**

---

## 🚀 Quick Start - Set All Variables at Once

### Method 1: Source a Script File

```bash
# Create the script
cat > /tmp/dash_env.sh << 'EOF'
#!/bin/bash
export EXPO_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export EXPO_PUBLIC_ANTHROPIC_API_KEY="sk-ant-api03-YOUR_KEY_HERE"
export EXPO_PUBLIC_ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
export EXPO_PUBLIC_DEEPGRAM_API_KEY="YOUR_DEEPGRAM_KEY"
export EXPO_PUBLIC_AZURE_SPEECH_KEY="YOUR_AZURE_KEY"
export EXPO_PUBLIC_AZURE_SPEECH_REGION="southafricanorth"
export EXPO_PUBLIC_AI_ENABLED="true"
EOF

# Make it executable
chmod +x /tmp/dash_env.sh

# Load variables into current session
source /tmp/dash_env.sh

# Verify
env | grep EXPO_PUBLIC
```

### Method 2: One-Liner Export

```bash
export EXPO_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
       EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
       EXPO_PUBLIC_ANTHROPIC_API_KEY="sk-ant-api03-YOUR_KEY_HERE" \
       EXPO_PUBLIC_ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
```

### Method 3: Load from .env File

```bash
# If you have a .env file in project root
cd /workspace

# Load all variables
export $(cat .env | xargs)

# Or load specific variables
export $(grep EXPO_PUBLIC .env | xargs)

# Verify
env | grep EXPO_PUBLIC
```

---

## 📝 Individual Variable Commands

### Set Single Variable
```bash
export EXPO_PUBLIC_ANTHROPIC_API_KEY="sk-ant-api03-YOUR_KEY"
```

### Check Single Variable
```bash
echo $EXPO_PUBLIC_ANTHROPIC_API_KEY
```

### Unset Variable
```bash
unset EXPO_PUBLIC_ANTHROPIC_API_KEY
```

### Check All EXPO_PUBLIC Variables
```bash
env | grep EXPO_PUBLIC
```

---

## 🔑 Required Variables for Dash AI

Copy and customize these commands:

```bash
# Supabase Connection (CRITICAL)
export EXPO_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Anthropic Claude API (CRITICAL for Dash AI)
export EXPO_PUBLIC_ANTHROPIC_API_KEY="sk-ant-api03-..."
export EXPO_PUBLIC_ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
export EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS="8192"

# Deepgram Voice (Optional - for voice transcription)
export EXPO_PUBLIC_DEEPGRAM_API_KEY="your_deepgram_key"

# Azure Speech (Optional - for TTS)
export EXPO_PUBLIC_AZURE_SPEECH_KEY="your_azure_key"
export EXPO_PUBLIC_AZURE_SPEECH_REGION="southafricanorth"

# Feature Flags
export EXPO_PUBLIC_AI_ENABLED="true"
export EXPO_PUBLIC_ENABLE_AI_FEATURES="true"
export EXPO_PUBLIC_AI_STREAMING_ENABLED="true"
```

---

## 🎯 Common Tasks

### Check if Variable is Set
```bash
if [ -z "$EXPO_PUBLIC_ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEY is not set"
else
  echo "✅ ANTHROPIC_API_KEY is set"
fi
```

### Print All Variables with Values
```bash
env | grep EXPO_PUBLIC | sort
```

### Print Variable Names Only
```bash
env | grep EXPO_PUBLIC | cut -d= -f1
```

### Save Current Variables to File
```bash
env | grep EXPO_PUBLIC > /tmp/current_env_vars.txt
cat /tmp/current_env_vars.txt
```

---

## 💾 Persistent Variables (Survive Terminal Restart)

### Option 1: Add to .bashrc (Permanent)
```bash
# Open .bashrc
nano ~/.bashrc

# Add at the end:
export EXPO_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export EXPO_PUBLIC_ANTHROPIC_API_KEY="sk-ant-api03-YOUR_KEY"

# Save and exit (Ctrl+X, Y, Enter)

# Reload .bashrc
source ~/.bashrc

# Verify
echo $EXPO_PUBLIC_SUPABASE_URL
```

### Option 2: Create .env File in Project
```bash
cd /workspace

# Create .env file
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-api03-...
EXPO_PUBLIC_ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
EXPO_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key
EXPO_PUBLIC_AZURE_SPEECH_KEY=your_azure_key
EXPO_PUBLIC_AZURE_SPEECH_REGION=southafricanorth
EXPO_PUBLIC_AI_ENABLED=true
EXPO_PUBLIC_ENABLE_AI_FEATURES=true
EOF

# Load whenever needed
export $(cat .env | xargs)
```

---

## ⚠️ Important Notes

### Security Best Practices
```bash
# ❌ NEVER commit .env to git
echo ".env" >> .gitignore

# ✅ Use .env.example for templates
cp .env.example .env
# Then edit .env with real values

# ✅ Check git status before committing
git status | grep ".env"
```

### Variable Scope
```bash
# Current terminal session only
export MY_VAR="value"

# All sessions (add to .bashrc)
echo 'export MY_VAR="value"' >> ~/.bashrc

# Current process only (no export)
MY_VAR="value"
```

### Debugging
```bash
# Check if variable is accessible
printenv EXPO_PUBLIC_ANTHROPIC_API_KEY

# Show first 20 characters of API key (for verification)
echo ${EXPO_PUBLIC_ANTHROPIC_API_KEY:0:20}

# Count how many EXPO_PUBLIC variables are set
env | grep -c EXPO_PUBLIC

# List all variable names
env | grep EXPO_PUBLIC | cut -d= -f1 | sort
```

---

## 🧪 Test Your Setup

After setting variables, test with:

```bash
# 1. Check critical variables
echo "Supabase URL: ${EXPO_PUBLIC_SUPABASE_URL:0:30}..."
echo "Anthropic Key: ${EXPO_PUBLIC_ANTHROPIC_API_KEY:0:20}..."
echo "Deepgram Key: ${EXPO_PUBLIC_DEEPGRAM_API_KEY:0:20}..."

# 2. Count total variables
echo "Total EXPO_PUBLIC variables: $(env | grep -c EXPO_PUBLIC)"

# 3. Validate required variables
required_vars=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  "EXPO_PUBLIC_ANTHROPIC_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Set: $var"
  fi
done
```

---

## 📋 Quick Reference Card

| Task | Command |
|------|---------|
| Set variable | `export VAR_NAME="value"` |
| Check variable | `echo $VAR_NAME` |
| Unset variable | `unset VAR_NAME` |
| List all EXPO vars | `env \| grep EXPO_PUBLIC` |
| Load from .env | `export $(cat .env \| xargs)` |
| Save to file | `env \| grep EXPO_PUBLIC > vars.txt` |
| Add to .bashrc | `echo 'export VAR="val"' >> ~/.bashrc` |
| Reload .bashrc | `source ~/.bashrc` |

---

## 🔄 Common Workflows

### Starting a New Session
```bash
cd /workspace
export $(cat .env | xargs)
env | grep EXPO_PUBLIC | wc -l  # Should show ~10-15 variables
```

### Switching Environments (Dev → Prod)
```bash
# Load dev environment
export $(cat .env.development | xargs)

# Switch to production
export $(cat .env.production | xargs)
```

### Temporary Override
```bash
# Keep existing variables, override one
export EXPO_PUBLIC_ANTHROPIC_MODEL="claude-3-opus-20240229"

# Run command with override
EXPO_PUBLIC_DEBUG_MODE=true npm start
```

---

## 📞 Help & Troubleshooting

### Variable Not Found?
```bash
# Check spelling
env | grep -i anthropic

# Check if it's exported (vs just defined)
declare -p EXPO_PUBLIC_ANTHROPIC_API_KEY
```

### Variables Disappear After Terminal Restart?
```bash
# They weren't added to .bashrc
# Add them permanently:
nano ~/.bashrc
# Or use .env file and load it in startup script
```

### Can't Load .env File?
```bash
# Check file exists
ls -la .env

# Check file format (no spaces around =)
cat .env

# Check for hidden characters
cat -A .env
```

---

**Need help?** Check `DASH_LINT_AND_MIGRATIONS_REPORT.md` for full details.
