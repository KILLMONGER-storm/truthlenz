import React from 'react';
import { RetroTvError } from '@/components/ui/RetroTvError';
import { Alert, AlertTitle, AlertDescription, AlertContent } from '@/components/ui/alert-v2';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
    errorCode?: string;
    errorMessage?: string;
    description?: string;
    variant?: 'error' | 'warning' | 'info';
}

const ErrorPage: React.FC<ErrorPageProps> = ({
    errorCode = '404',
    errorMessage = 'NOT FOUND',
    description = "The page you are looking for does not exist or has been moved.",
    variant = 'error'
}) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-background to-black/20">
            <div className="max-w-2xl w-full flex flex-col items-center">
                <RetroTvError
                    errorCode={errorCode}
                    errorMessage={errorMessage}
                />

                <div className="w-full mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Alert variant={variant} size="lg" layout="complex" className="border-border/50 bg-card/30 backdrop-blur-xl shadow-2xl">
                        <ShieldAlert className="w-6 h-6 mt-1" />
                        <AlertContent className="text-left">
                            <AlertTitle className="text-lg font-bold mb-2 tracking-tight">System Notice: Error {errorCode}</AlertTitle>
                            <AlertDescription className="text-base font-medium text-foreground/90 leading-relaxed">
                                {description}
                            </AlertDescription>
                        </AlertContent>
                    </Alert>

                    <div className="mt-8 flex justify-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/')}
                            className="gap-2 border-border/50 hover:bg-muted"
                        >
                            <Home className="w-4 h-4" />
                            Return Home
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            className="gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
