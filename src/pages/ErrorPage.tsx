import React from 'react';
import { GlitchyError } from '@/components/ui/GlitchyError';
import { PatternText } from '@/components/ui/PatternText';
import { Alert, AlertTitle, AlertDescription, AlertContent } from '@/components/ui/alert-v2';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

interface ErrorPageProps {
    errorCode?: string;
    errorMessage?: string;
    description?: string;
    variant?: 'error' | 'warning' | 'info';
}

const ErrorPage: React.FC<ErrorPageProps> = ({
    errorCode: propErrorCode,
    errorMessage: propErrorMessage,
    description: propDescription,
    variant: propVariant = 'error'
}) => {
    const navigate = useNavigate();
    const { code: pathCode } = useParams();
    const [searchParams] = useSearchParams();

    // Priority:
    // 1. Props passed directly (from catch-all route)
    // 2. Path parameter (e.g., /error/429)
    // 3. Search parameter (e.g., ?code=500)
    // 4. Default to 404
    const errorCode = propErrorCode || pathCode || searchParams.get('code') || '404';

    // Custom mapping for specific error codes to keep PatternText concise
    const getCompactMessage = (code: string, originalMsg?: string) => {
        if (originalMsg && originalMsg !== 'NOT FOUND' && originalMsg !== 'ERROR OCCURRED') return originalMsg;
        if (code === '429') return 'QUOTA REACHED';
        if (code === '404') return 'NOT FOUND';
        if (code === '500') return 'SYSTEM ERROR';
        return 'ERROR';
    };

    const errorMessage = getCompactMessage(errorCode, propErrorMessage || searchParams.get('message'));
    const description = propDescription || searchParams.get('desc') || (errorCode === '404' ? "The page you are looking for does not exist or has been moved." : "The forensic engine encountered an issue.");
    const variant = propVariant;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-background to-black overflow-hidden">
            <div className="max-w-4xl w-full flex flex-col items-center">
                <GlitchyError
                    errorCode={errorCode}
                />

                <div className="text-center -mt-16 mb-12 relative z-10 scale-75 md:scale-100">
                    <PatternText
                        text={errorMessage}
                        className="text-[6em] md:text-[8em] tracking-tighter"
                    />
                </div>

                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
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
