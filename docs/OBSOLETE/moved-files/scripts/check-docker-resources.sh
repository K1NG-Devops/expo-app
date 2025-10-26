#!/bin/bash

# Docker Resource Monitor for EduDash Pro
# Ensures Docker doesn't consume excessive resources

echo "🔍 Docker Resource Check"
echo "========================"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "✅ Docker is not running - no resource usage"
    exit 0
fi

# Get system memory
total_mem=$(free -m | awk 'NR==2{print $2}')
used_mem=$(free -m | awk 'NR==2{print $3}')
available_mem=$(free -m | awk 'NR==2{print $7}')

echo "💾 System Memory:"
echo "   Total: ${total_mem}MB"
echo "   Used: ${used_mem}MB"
echo "   Available: ${available_mem}MB"

# Check Docker containers
containers=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(supabase|postgres)")

if [ -z "$containers" ]; then
    echo "✅ No Supabase containers running"
else
    echo ""
    echo "🐳 Docker Containers:"
    echo "$containers"
    
    # Calculate total Docker memory usage
    total_docker_mem=$(docker stats --no-stream --format "{{.MemUsage}}" | grep -o '[0-9.]*MiB' | sed 's/MiB//' | awk '{sum+=$1} END {print sum}')
    
    if [ ! -z "$total_docker_mem" ]; then
        echo ""
        echo "📊 Docker Memory Usage: ${total_docker_mem}MB"
        
        # Warning if using too much memory
        if (( $(echo "$total_docker_mem > 1024" | bc -l) )); then
            echo "⚠️  WARNING: Docker using > 1GB memory"
            echo "   Consider: supabase stop"
        fi
    fi
fi

# Check if system memory is low
if (( available_mem < 2048 )); then
    echo "🚨 WARNING: Low system memory (< 2GB available)"
    echo "   Consider stopping Docker: supabase stop"
fi

echo ""
echo "🔧 Commands:"
echo "   Start Supabase: supabase start"
echo "   Stop Supabase:  supabase stop"
echo "   Check status:   supabase status"