#!/bin/bash
# ============================================
# Complete Dependency Injection Migration
# ============================================
# Removes singleton patterns from remaining services
# Usage: ./scripts/complete-di-migration.sh [--dry-run]

set -e

DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No files will be modified"
fi

echo "🚀 Dash DI Migration - Singleton Removal"
echo "========================================"
echo ""

# Services to migrate
SERVICES=(
    "services/DashAIAssistant.ts"
    "services/DashAgenticEngine.ts"
    "services/AgentOrchestrator.ts"
    "services/DashProactiveEngine.ts"
    "services/DashTaskAutomation.ts"
    "services/DashDecisionEngine.ts"
    "services/DashRealTimeAwareness.ts"
    "services/DashContextAnalyzer.ts"
    "services/SemanticMemoryEngine.ts"
    "services/DashNavigationHandler.ts"
    "services/DashWebSearchService.ts"
    "services/DashWhatsAppIntegration.ts"
    "services/DashDiagnosticEngine.ts"
)

echo "📋 Services to migrate (${#SERVICES[@]}):"
for svc in "${SERVICES[@]}"; do
    echo "  - $svc"
done
echo ""

if [ "$DRY_RUN" = false ]; then
    read -p "⚠️  This will modify ${#SERVICES[@]} files. Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Backup directory
BACKUP_DIR="backups/di-migration-$(date +%Y%m%d-%H%M%S)"
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"
    echo "📦 Backing up files to $BACKUP_DIR"
fi

# Function to check if service has getInstance
has_get_instance() {
    local file=$1
    grep -q "getInstance()" "$file"
}

# Function to backup file
backup_file() {
    local file=$1
    if [ "$DRY_RUN" = false ]; then
        cp "$file" "$BACKUP_DIR/$(basename $file).backup"
    fi
}

# Function to remove singleton pattern
remove_singleton() {
    local file=$1
    local class_name=$2
    
    echo "  🔧 Processing $class_name..."
    
    if [ "$DRY_RUN" = true ]; then
        echo "    [DRY RUN] Would remove singleton pattern"
        return
    fi
    
    # Backup first
    backup_file "$file"
    
    # Remove private static instance
    sed -i '/private static instance:/d' "$file"
    
    # Remove getInstance method (multi-line)
    # This is tricky - we'll create a marker
    echo "    ⚠️  Manual review required for getInstance() removal"
}

# Process each service
SUCCESS=0
SKIPPED=0
FAILED=0

for svc in "${SERVICES[@]}"; do
    if [ ! -f "$svc" ]; then
        echo "❌ File not found: $svc"
        FAILED=$((FAILED+1))
        continue
    fi
    
    if ! has_get_instance "$svc"; then
        echo "✅ $svc - Already migrated (no getInstance found)"
        SKIPPED=$((SKIPPED+1))
        continue
    fi
    
    # Extract class name from file
    CLASS_NAME=$(basename "$svc" .ts)
    
    echo "📝 Migrating: $svc"
    remove_singleton "$svc" "$CLASS_NAME"
    SUCCESS=$((SUCCESS+1))
    echo ""
done

echo "========================================"
echo "✅ Processed: $SUCCESS"
echo "⏭️  Skipped: $SKIPPED"  
echo "❌ Failed: $FAILED"
echo ""

if [ "$DRY_RUN" = false ] && [ $SUCCESS -gt 0 ]; then
    echo "📦 Backups saved to: $BACKUP_DIR"
    echo ""
    echo "⚠️  IMPORTANT: Manual steps required:"
    echo "  1. Remove getInstance() methods manually (they're complex)"
    echo "  2. Update import statements"
    echo "  3. Add helper functions for backward compatibility"
    echo "  4. Test all services"
    echo ""
    echo "See SINGLETON_VS_DI_ANALYSIS.md for detailed migration guide"
fi

echo ""
echo "🎉 Done!"
