#!/bin/bash

echo "🚀 Starting CMMS application setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit https://nodejs.org/ for installation instructions."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ $NODE_MAJOR_VERSION -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required."
    echo "Current version: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Function to check and handle port conflicts
check_port() {
    if lsof -i:5000 > /dev/null 2>&1; then
        echo "⚠️ Port 5000 is already in use."
        echo "Attempting to free up the port..."
        if ! fuser -k 5000/tcp > /dev/null 2>&1; then
            echo "❌ Failed to free up port 5000. Please manually stop any process using port 5000."
            exit 1
        fi
        echo "✅ Port 5000 has been freed"
        # Wait a moment for the port to be fully released
        sleep 2
    fi
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PostgreSQL URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL environment variable is not set."
    echo "Please set it to your PostgreSQL connection string:"
    echo "export DATABASE_URL='postgresql://user:password@localhost:5432/dbname'"
    exit 1
fi

# Run database migrations non-interactively
echo "🗃️ Setting up database..."
npx drizzle-kit push:pg --yes

# Check port before starting
check_port

# Start the application
echo "🌟 Starting the application..."
npm run dev