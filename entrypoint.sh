
#!/bin/sh
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
for i in $(seq 1 30); do
  pg_isready -h db -U postgres && break
  sleep 1
done

# Start the application
echo "Starting application..."
exec "$@"
