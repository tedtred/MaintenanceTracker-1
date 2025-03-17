
# Computerized Maintenance Management System (CMMS)

A comprehensive platform designed to streamline asset tracking, work order management, and preventive maintenance workflows with advanced scheduling capabilities.

## Features

### Current Implementation

#### Authentication & User Management
- Secure user authentication system
- User registration and login functionality
- Protected routes for authenticated users only
- Administrator role for system management
- Default admin account for initial setup

#### Asset Management
- Complete asset tracking and management
- Asset details and status monitoring
- Asset maintenance history tracking

#### Work Order Management
- Create and manage work orders
- Track work order status and progress
- Attach files to work orders
- Detailed work order history

#### Maintenance Calendar
- Interactive calendar interface for maintenance scheduling
- Support for recurring maintenance tasks
- Multiple view options (month view and daily list)
- Mark maintenance tasks as completed
- Remove recurring maintenance schedules
- Notes and documentation for completed maintenance

#### Maintenance Analytics
- Work order performance metrics
- Time-range based analysis
- Visualization of maintenance trends
- Average completion time tracking

#### User Interface
- Modern, responsive design
- Dark/Light mode theme support
- Bubbly and vibrant visual theme
- Intuitive navigation sidebar
- Mobile-friendly layout
- Dashboard with at-a-glance metrics

### Technical Stack

#### Frontend
- React with TypeScript
- Zustand for state management
- TanStack Query for data fetching
- React Big Calendar for schedule visualization
- ShadcN UI components
- Tailwind CSS for styling

#### Backend
- Express.js server
- PostgreSQL database with Drizzle ORM
- RESTful API architecture
- File upload functionality
- Session-based authentication
- Automatic database migrations

#### Deployment
- Docker containerization
- Docker Compose for multi-container deployment
- Production-ready Dockerfile
- Automatic database schema migration
- Environment variable configuration

## Project Status

### Currently Implemented
✅ User authentication system
✅ Asset management
✅ Work order management
✅ Maintenance scheduling
✅ File attachments
✅ Theme switching
✅ Responsive design
✅ Maintenance analytics
✅ Dockerized deployment
✅ Automatic database migrations

### Planned Features
🔄 Real-time updates with WebSockets
🔄 Advanced role-based access control
🔄 File upload and storage system improvements

## Getting Started

### Prerequisites
- For Docker deployment:
  - Docker Engine
  - Docker Compose
- For manual deployment:
  - Node.js (v18 or later)
  - PostgreSQL database
  - NPM or Yarn package manager

### Docker Deployment (Recommended for Internal Networks)

1. Clone the repository:
```bash
git clone [repository-url]
cd cmms
```

2. Start the application using Docker Compose:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:5000`
The PostgreSQL database will be accessible at:
- Host: localhost (or your machine's IP)
- Port: 5432
- Username: postgres
- Password: postgres
- Database: cmms

The system comes with a default admin account:
- Username: admin
- Password: admin123
- **Important**: Change this password immediately after first login!

To stop the application:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f
```

### Manual Installation

If you prefer to set up manually, follow these steps:

1. Clone the repository
```bash
git clone [repository-url]
cd cmms
```

2. Install dependencies
```bash
npm install
```

3. Set up the database
```bash
npm run db:push
```

4. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Work Order Management
1. Navigate to the Work Orders page
2. Create new work orders with detailed information
3. Attach relevant files
4. Track progress and update status

### Maintenance Scheduling
1. Access the Maintenance Calendar
2. Create recurring maintenance tasks
3. View scheduled maintenance in monthly or daily list view
4. Mark tasks as completed
5. Add completion notes
6. Remove recurring schedules if needed

### Asset Management
1. Navigate to Assets page
2. Add new assets with detailed information
3. Track maintenance history
4. Monitor asset status

### Analytics
1. Visit the Maintenance Analytics page
2. Select time range for analysis
3. View performance metrics
4. Track average completion time

## Contact

For any questions or support, please contact the project maintainers.
