#!/bin/bash

# Start with a known good version
cp client/src/pages/maintenance-calendar.tsx.bak client/src/pages/maintenance-calendar.tsx

# Add more robust checks for array operations
sed -i 's/const asset = assets.find/const asset = Array.isArray(assets) ? assets.find/g' client/src/pages/maintenance-calendar.tsx
sed -i 's/return asset ? asset.name : '\''Unknown Asset'\'';/return asset ? asset.name : '\''Unknown Asset'\'';/g' client/src/pages/maintenance-calendar.tsx

# Fix getAssetDetails function
sed -i 's/const getAssetDetails = (assetId: number) => {/const getAssetDetails = (assetId: number) => {/g' client/src/pages/maintenance-calendar.tsx
sed -i 's/return assets.find(a => a.id === assetId);/return Array.isArray(assets) ? assets.find(a => a.id === assetId) : undefined;/g' client/src/pages/maintenance-calendar.tsx

# Fix getCompletionHistory function
sed -i 's/return completions/return Array.isArray(completions) ? completions/g' client/src/pages/maintenance-calendar.tsx
sed -i 's/.filter(c => c.scheduleId === scheduleId)/.filter(c => c.scheduleId === scheduleId)/g' client/src/pages/maintenance-calendar.tsx
sed -i 's/.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());/.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()) : [];/g' client/src/pages/maintenance-calendar.tsx

# Fix filteredSchedules logic
sed -i 's/const filteredSchedules = schedules.filter/const filteredSchedules = Array.isArray(schedules) ? schedules.filter/g' client/src/pages/maintenance-calendar.tsx
sed -i 's/return true;/return true;\\n    }) : [];/g' client/src/pages/maintenance-calendar.tsx

# Fix assets.map calls
sed -i 's/{assets.map(asset => (/{Array.isArray(assets) ? assets.map(asset => (/g' client/src/pages/maintenance-calendar.tsx
sed -i 's/))}/))} : null}/g' client/src/pages/maintenance-calendar.tsx