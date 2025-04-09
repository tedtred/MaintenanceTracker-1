import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface Step {
  title: string;
  content: ReactNode;
  optional?: boolean;
}

interface MobileStepperProps {
  steps: Step[];
  onComplete?: () => void;
  completeButtonText?: string;
  className?: string;
}

export function MobileStepper({
  steps,
  onComplete,
  completeButtonText = "Complete",
  className,
}: MobileStepperProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  const handleNext = () => {
    setCompleted((prev) => [...prev, activeStep]);
    
    if (activeStep === steps.length - 1) {
      onComplete?.();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const isStepComplete = (index: number) => completed.includes(index);

  const currentStep = steps[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle>{currentStep.title}</CardTitle>
        <div className="flex mt-4 mb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-grow items-center"
              aria-current={activeStep === index ? "step" : undefined}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium",
                  activeStep === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : isStepComplete(index)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/25 text-muted-foreground"
                )}
                onClick={() => {
                  // Only allow clicking on completed steps or the next available step
                  if (isStepComplete(index) || index === activeStep) {
                    setActiveStep(index);
                  }
                }}
              >
                {isStepComplete(index) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-grow border-t mx-2",
                    (isStepComplete(index) && isStepComplete(index + 1)) ||
                      (isStepComplete(index) && activeStep === index + 1)
                      ? "border-primary"
                      : "border-muted-foreground/25"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-[25vh]">
        {currentStep.content}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          {isLastStep ? (
            completeButtonText
          ) : (
            <>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}