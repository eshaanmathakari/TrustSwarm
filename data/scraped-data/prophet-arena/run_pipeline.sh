#!/bin/bash

# Prophet Arena Data Pipeline Runner
# This script provides easy commands to run the data extraction pipeline

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ACTION="full"
CATEGORIES="sports economics crypto"
LIMIT=50
HEADLESS=true
CONFIG="config.json"

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

# Function to show usage
show_usage() {
    echo "Prophet Arena Data Pipeline Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --action ACTION     Action to perform (scrape|metrics|reports|full|status) [default: full]"
    echo "  -c, --categories LIST   Space-separated list of categories [default: sports economics crypto]"
    echo "  -l, --limit NUMBER      Limit per category [default: 50]"
    echo "  -h, --headless          Run browser in headless mode [default: true]"
    echo "  -v, --visible           Run browser in visible mode (for debugging)"
    echo "  -f, --config FILE       Configuration file path [default: config.json]"
    echo "  --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run full pipeline with defaults"
    echo "  $0 -a scrape -l 10                   # Scrape 10 events per category"
    echo "  $0 -a metrics                        # Calculate trust metrics only"
    echo "  $0 -c \"sports economics\" -l 25       # Scrape sports and economics only"
    echo "  $0 -v                                # Run with visible browser for debugging"
    echo "  $0 -a status                         # Check pipeline status"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -c|--categories)
            # Handle categories with proper quoting
            CATEGORIES="$2"
            shift 2
            ;;
        -l|--limit)
            LIMIT="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS=true
            shift
            ;;
        -v|--visible)
            HEADLESS=false
            shift
            ;;
        -f|--config)
            CONFIG="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate action
case $ACTION in
    scrape|metrics|reports|full|status)
        ;;
    *)
        print_error "Invalid action: $ACTION"
        print_error "Valid actions: scrape, metrics, reports, full, status"
        exit 1
        ;;
esac

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Check if required files exist
if [[ ! -f "data_pipeline.py" ]]; then
    print_error "data_pipeline.py not found. Please run this script from the prophet-arena directory"
    exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
    print_warning "Configuration file $CONFIG not found. Will create default config."
fi

# Check if requirements are installed
print_status "Checking dependencies..."
if ! python3 -c "import selenium, bs4, pandas, numpy, scipy" 2>/dev/null; then
    print_warning "Some dependencies may be missing. Installing requirements..."
    if [[ -f "requirements.txt" ]]; then
        pip3 install -r requirements.txt
    else
        print_error "requirements.txt not found"
        exit 1
    fi
fi

# Create output directory if it doesn't exist
mkdir -p output

# Build command
CMD="python3 data_pipeline.py --action $ACTION --config $CONFIG"

if [[ "$ACTION" == "scrape" || "$ACTION" == "full" ]]; then
    CMD="$CMD --categories $CATEGORIES --limit $LIMIT"
fi

if [[ "$HEADLESS" == "false" ]]; then
    CMD="$CMD --headless"
fi

# Print configuration
print_status "Running Prophet Arena Data Pipeline"
print_status "Action: $ACTION"
if [[ "$ACTION" == "scrape" || "$ACTION" == "full" ]]; then
    print_status "Categories: $CATEGORIES"
    print_status "Limit per category: $LIMIT"
fi
print_status "Headless mode: $HEADLESS"
print_status "Config file: $CONFIG"
echo ""

# Run the pipeline
print_status "Executing: $CMD"
echo ""

if eval $CMD; then
    print_success "Pipeline completed successfully!"
    
    # Show status if not already showing it
    if [[ "$ACTION" != "status" ]]; then
        echo ""
        print_status "Current pipeline status:"
        python3 data_pipeline.py --action status --config $CONFIG
    fi
else
    print_error "Pipeline failed!"
    exit 1
fi
