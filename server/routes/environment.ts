import { Request, Response } from 'express';

export function setupEnvironmentRoutes(app: any) {
  // Get environment information
  app.get('/api/environment', (req: Request, res: Response) => {
    res.json({
      isDocker: process.env.IS_DOCKER === 'true',
      nodeEnv: process.env.NODE_ENV || 'development',
      serverInfo: {
        host: process.env.HOST || '0.0.0.0',
        port: process.env.PORT || 5000
      }
    });
  });
}