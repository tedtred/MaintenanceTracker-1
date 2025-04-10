#!/bin/bash

# Fix dashboard.tsx with a complete rewrite of the maintenanceTasks block
cat > client/src/pages/dashboard.tsx.fix << 'EOF'
  // Process maintenance schedules
  const schedules = maintenanceSchedulesQuery.data || [];
  
  // Create task objects with additional calculated properties
  const maintenanceTasks = Array.isArray(schedules) 
    ? schedules
        .filter(schedule => schedule.status === MaintenanceStatus.ACTIVE)
        .map(schedule => {
          const lastCompleted = getCompletionHistory(schedule.id)[0];
          
          // Calculate the next due date based on frequency and last completion
          let dueDate = new Date(schedule.startDate);
          if (lastCompleted) {
            dueDate = new Date(lastCompleted.completedDate);
            
            switch (schedule.frequency) {
              case MaintenanceFrequency.DAILY:
                dueDate.setDate(dueDate.getDate() + 1);
                break;
              case MaintenanceFrequency.WEEKLY:
                dueDate.setDate(dueDate.getDate() + 7);
                break;
              case MaintenanceFrequency.BIWEEKLY:
                dueDate.setDate(dueDate.getDate() + 14);
                break;
              case MaintenanceFrequency.MONTHLY:
                dueDate.setMonth(dueDate.getMonth() + 1);
                break;
              case MaintenanceFrequency.QUARTERLY:
                dueDate.setMonth(dueDate.getMonth() + 3);
                break;
              case MaintenanceFrequency.SEMIANNUALLY:
                dueDate.setMonth(dueDate.getMonth() + 6);
                break;
              case MaintenanceFrequency.ANNUALLY:
                dueDate.setFullYear(dueDate.getFullYear() + 1);
                break;
              default:
                break;
            }
          }
          
          const isOverdue = dueDate < new Date();
          const daysOverdue = isOverdue ? differenceInDays(new Date(), dueDate) : 0;
          
          return {
            id: schedule.id,
            title: schedule.title,
            description: schedule.description,
            frequency: schedule.frequency,
            date: dueDate,
            isOverdue,
            daysOverdue,
            assetId: schedule.assetId,
            assetName: getAssetName(schedule.assetId),
            schedule: schedule,
          };
        })
        .sort((a, b) => a.date - b.date)
    : [];
EOF

# Apply the fix using sed to replace this block
sed -i -e '/\/\/ Process maintenance schedules/,/const filteredTasks/c\
  // Process maintenance schedules\
  const schedules = maintenanceSchedulesQuery.data || [];\
  \
  // Create task objects with additional calculated properties\
  const maintenanceTasks = Array.isArray(schedules) \
    ? schedules\
        .filter(schedule => schedule.status === MaintenanceStatus.ACTIVE)\
        .map(schedule => {\
          const lastCompleted = getCompletionHistory(schedule.id)[0];\
          \
          // Calculate the next due date based on frequency and last completion\
          let dueDate = new Date(schedule.startDate);\
          if (lastCompleted) {\
            dueDate = new Date(lastCompleted.completedDate);\
            \
            switch (schedule.frequency) {\
              case MaintenanceFrequency.DAILY:\
                dueDate.setDate(dueDate.getDate() + 1);\
                break;\
              case MaintenanceFrequency.WEEKLY:\
                dueDate.setDate(dueDate.getDate() + 7);\
                break;\
              case MaintenanceFrequency.BIWEEKLY:\
                dueDate.setDate(dueDate.getDate() + 14);\
                break;\
              case MaintenanceFrequency.MONTHLY:\
                dueDate.setMonth(dueDate.getMonth() + 1);\
                break;\
              case MaintenanceFrequency.QUARTERLY:\
                dueDate.setMonth(dueDate.getMonth() + 3);\
                break;\
              case MaintenanceFrequency.SEMIANNUALLY:\
                dueDate.setMonth(dueDate.getMonth() + 6);\
                break;\
              case MaintenanceFrequency.ANNUALLY:\
                dueDate.setFullYear(dueDate.getFullYear() + 1);\
                break;\
              default:\
                break;\
            }\
          }\
          \
          const isOverdue = dueDate < new Date();\
          const daysOverdue = isOverdue ? differenceInDays(new Date(), dueDate) : 0;\
          \
          return {\
            id: schedule.id,\
            title: schedule.title,\
            description: schedule.description,\
            frequency: schedule.frequency,\
            date: dueDate,\
            isOverdue,\
            daysOverdue,\
            assetId: schedule.assetId,\
            assetName: getAssetName(schedule.assetId),\
            schedule: schedule,\
          };\
        })\
        .sort((a, b) => a.date - b.date)\
    : [];\
  \
  // Filter tasks based on selected tab\
  const filteredTasks = maintenanceTasks.filter((task) => {' client/src/pages/dashboard.tsx

echo "Fixed dashboard.tsx file"
