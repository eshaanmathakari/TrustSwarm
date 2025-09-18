#!/bin/bash

# Prophet Arena Setup Script
# This script sets up the environment for running the Prophet Arena data extraction pipeline

set -e

echo "🚀 Setting up Prophet Arena Data Extraction System..."
echo "=================================================="

# Check if we're in the right directory
if [[ ! -f "data_pipeline.py" ]]; then
    echo "❌ Error: Please run this script from the prophet-arena directory"
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p output
mkdir -p logs

# Make scripts executable
echo "🔧 Setting up scripts..."
chmod +x run_pipeline.sh

# Test the installation
echo "🧪 Testing installation..."
python3 -c "
import sqlite3, requests, bs4, selenium, pandas, numpy, scipy
print('✅ All dependencies are working!')
"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run: ./run_pipeline.sh -a scrape -l 5    # Test scraping with 5 events"
echo "2. Run: ./run_pipeline.sh -a status         # Check pipeline status"
echo "3. Run: ./run_pipeline.sh                   # Run full pipeline"
echo ""
echo "Output files will be saved to: output/"
echo "Database will be created as: prophet_arena.db"
