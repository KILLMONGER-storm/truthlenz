import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Twitter, Instagram, Loader2, Share2, CheckCircle2 } from 'lucide-react';
import type { VerificationResult } from '@/types/verification';

interface SocialShareDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    result: VerificationResult;
}

type Platform = 'x' | 'instagram';

export function SocialShareDialog({ isOpen, onOpenChange, result }: SocialShareDialogProps) {
    const [platform, setPlatform] = useState<Platform | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [caption, setCaption] = useState('');
    const [isConnected, setIsConnected] = useState<{ x: boolean; instagram: boolean }>({
        x: false,
        instagram: false,
    });

    // Default caption based on verdict
    useEffect(() => {
        if (result) {
            const verdictEmoji = result.verdict === 'reliable' ? '✅' : result.verdict === 'fake' ? '❌' : '⚠️';
            setCaption(`I just verified some content on TruthLenz! ${verdictEmoji}\nVerdict: ${result.verdict.toUpperCase()}\nConfidence: ${result.credibilityScore}%\n\n#TruthLenz #FactCheck #AI`);
        }
    }, [result]);

    // Check connection status (Mocked for now as Supabase tokens depend on provider setup)
    useEffect(() => {
        const checkConnections = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            // In a real app, we'd check if specific provider tokens exist in the session or a links table
            // For this feature, we'll assume they aren't connected until they click "Connect"
            setIsConnected({
                x: !!session?.provider_token, // Simplified check
                instagram: false, // Instagram often requires separate FB auth
            });
        };
        if (isOpen) {
            checkConnections();
        }
    }, [isOpen]);

    const handleConnect = async (targetPlatform: Platform) => {
        setIsConnecting(true);
        try {
            if (targetPlatform === 'x') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'twitter',
                    options: {
                        redirectTo: window.location.origin,
                        scopes: 'tweet.read tweet.write users.read',
                    }
                });
                if (error) throw error;
            } else {
                // Instagram via Facebook
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'facebook',
                    options: {
                        redirectTo: window.location.origin,
                        scopes: 'instagram_basic instagram_content_publish pages_show_list pages_read_engagement',
                    }
                });
                if (error) throw error;
            }
        } catch (error: any) {
            toast.error(`Connection failed: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handlePost = async () => {
        if (!platform) return;
        setIsPosting(true);
        try {
            const { shareVerdict } = await import('@/lib/verificationApi');
            await shareVerdict(result.id, platform, caption);

            toast.success(`Succesfully posted to ${platform === 'x' ? 'X (Twitter)' : 'Instagram'}!`);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(`Posting failed: ${error.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                        <Share2 className="w-6 h-6 text-primary" />
                        Share Verdict
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Connect your social media to automatically post this verdict.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex justify-center gap-4">
                        <Button
                            variant={platform === 'x' ? 'default' : 'outline'}
                            className={`flex-1 h-24 flex-col gap-2 rounded-2xl transition-all ${platform === 'x' ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'}`}
                            onClick={() => setPlatform('x')}
                        >
                            <Twitter className={`w-8 h-8 ${platform === 'x' ? 'text-primary-foreground' : 'text-[#1DA1F2]'}`} />
                            <span className="font-semibold">X (Twitter)</span>
                            {isConnected.x && <CheckCircle2 className="w-4 h-4 absolute top-2 right-2 text-green-500" />}
                        </Button>
                        <Button
                            variant={platform === 'instagram' ? 'default' : 'outline'}
                            className={`flex-1 h-24 flex-col gap-2 rounded-2xl transition-all ${platform === 'instagram' ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'}`}
                            onClick={() => setPlatform('instagram')}
                        >
                            <Instagram className={`w-8 h-8 ${platform === 'instagram' ? 'text-primary-foreground' : 'text-[#E4405F]'}`} />
                            <span className="font-semibold">Instagram</span>
                            {isConnected.instagram && <CheckCircle2 className="w-4 h-4 absolute top-2 right-2 text-green-500" />}
                        </Button>
                    </div>

                    {platform && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            {(!isConnected[platform]) ? (
                                <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col items-center gap-3 text-center">
                                    <p className="text-sm">You need to connect your {platform === 'x' ? 'X' : 'Instagram'} account first.</p>
                                    <Button
                                        onClick={() => handleConnect(platform)}
                                        disabled={isConnecting}
                                        className="w-full rounded-lg"
                                    >
                                        {isConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Connect {platform === 'x' ? 'X' : 'Instagram'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Post Caption</label>
                                    <Textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Enter post caption..."
                                        className="min-h-[120px] rounded-xl bg-background/50 border-primary/20 focus:border-primary"
                                    />
                                    <DialogFooter className="pt-2">
                                        <Button
                                            onClick={handlePost}
                                            disabled={isPosting}
                                            className="w-full rounded-xl h-12 text-lg font-bold shadow-lg shadow-primary/20"
                                        >
                                            {isPosting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : 'Post Now'}
                                        </Button>
                                    </DialogFooter>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
