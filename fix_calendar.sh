#!/bin/bash

# Fix line 449 - First instance of assets.map
sed -i '449s/{assets.map(asset => (/{Array.isArray(assets) ? assets.map(asset => (/' client/src/pages/maintenance-calendar.tsx
sed -i '451s/)))/)) : null}/' client/src/pages/maintenance-calendar.tsx

# Fix line 518 - Second instance of assets.map
sed -i '518s/{assets.map(asset => (/{Array.isArray(assets) ? assets.map(asset => (/' client/src/pages/maintenance-calendar.tsx
sed -i '520s/)))/)) : null}/' client/src/pages/maintenance-calendar.tsx

# Other checks that might need fixes - getAssetName function
sed -i '296s/const asset = assets.find/const asset = Array.isArray(assets) ? assets.find/' client/src/pages/maintenance-calendar.tsx
sed -i '297s/return asset/return asset : undefined; return asset/' client/src/pages/maintenance-calendar.tsx

# Fix any issues with completions.filter
sed -i '334s/return completions/return Array.isArray(completions) ? completions/' client/src/pages/maintenance-calendar.tsx
sed -i '336s/\.sort/: []; return completions.sort/' client/src/pages/maintenance-calendar.tsx

# Fix getAssetDetails function
sed -i '330s/return assets.find/return Array.isArray(assets) ? assets.find/' client/src/pages/maintenance-calendar.tsx
sed -i '330s/return assets.find(a => a.id === assetId);/return Array.isArray(assets) ? assets.find(a => a.id === assetId) : undefined;/' client/src/pages/maintenance-calendar.tsx