#!/bin/bash
# Render deployment build script
# Build script for deploying backend to Render

echo "🔨 Installing dependencies..."
cd admin-api
npm install
echo "✅ Dependencies installed"
