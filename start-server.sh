#!/bin/bash

# Global News Globe - Quick Start Script

echo "🌍 Starting Global News Globe Server..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    echo "🚀 Starting server on http://localhost:8000"
    echo ""
    echo "📌 Press Ctrl+C to stop the server"
    echo "📌 Open http://localhost:8000 in your browser"
    echo ""
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python found"
    echo "🚀 Starting server on http://localhost:8000"
    echo ""
    echo "📌 Press Ctrl+C to stop the server"
    echo "📌 Open http://localhost:8000 in your browser"
    echo ""
    python -m SimpleHTTPServer 8000
else
    echo "❌ Python not found"
    echo ""
    echo "Please install Python or use one of these alternatives:"
    echo "  1. npx http-server -p 8000"
    echo "  2. Open index.html directly in your browser"
    exit 1
fi

