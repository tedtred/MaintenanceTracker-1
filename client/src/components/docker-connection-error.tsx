import React from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isDockerEnvironment } from '@/lib/config';
import { ConnectionError } from '@/lib/api-error';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Code } from "@/components/ui/code";

interface DockerConnectionErrorProps {
  error: Error | null;
}

export function DockerConnectionError({ error }: DockerConnectionErrorProps) {
  // Only show this error component in Docker environment and when there's a connection error
  if (!error || !isDockerEnvironment() || !(error instanceof ConnectionError)) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle className="text-lg font-bold">Docker Network Configuration Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          There appears to be a network configuration issue with your Docker environment.
          The application frontend is running at <span className="font-semibold">{window.location.origin}</span> but cannot 
          connect to the API.
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-md font-semibold">Common Docker Network Issues</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-inside mb-2 space-y-2">
                <li>The Docker container is not exposing port 5000 correctly</li>
                <li>The CORS settings are not allowing cross-origin requests</li>
                <li>Network security settings are blocking the connection</li>
                <li>The API service inside the container is not running</li>
                <li>Your Docker network configuration needs to be updated</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-md font-semibold">Suggested Fixes</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside mb-2 space-y-2">
                <li>Verify the Docker container is running: <Code>docker ps</Code></li>
                <li>Check if port 5000 is properly mapped: <Code>docker-compose ps</Code></li>
                <li>Ensure the ALLOW_ORIGIN environment variable is set to "*" in docker-compose.yml</li>
                <li>If you're accessing via IP address, make sure the server is binding to 0.0.0.0</li>
                <li>Try restarting the Docker containers: <Code>docker-compose down && docker-compose up -d</Code></li>
              </ol>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-md font-semibold">Technical Details</AccordionTrigger>
            <AccordionContent>
              <div className="bg-slate-900 text-slate-50 p-3 rounded text-sm font-mono overflow-auto whitespace-pre-wrap">
                {error.message}
                {error instanceof ConnectionError && error.originalError 
                  ? `\n\nOriginal error: ${error.originalError.toString()}`
                  : ''}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button 
            variant="default" 
            onClick={() => window.open('https://docs.docker.com/network/', '_blank')}
          >
            Docker Networking Docs
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}