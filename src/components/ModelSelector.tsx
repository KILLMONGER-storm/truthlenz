import React from 'react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Server, Zap, ShieldAlert } from 'lucide-react';
import type { ModelInfo } from '@/types/verification';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
    models: ModelInfo[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export function ModelSelector({ models, selectedId, onSelect }: ModelSelectorProps) {
    const googleModels = models.filter(m => m.provider === 'google');
    const openaiModels = models.filter(m => m.provider === 'openai');

    const getModelIcon = (provider: string) => {
        switch (provider) {
            case 'google': return <Zap className="w-3.5 h-3.5 text-blue-400" />;
            case 'openai': return <Server className="w-3.5 h-3.5 text-emerald-400" />;
            default: return null;
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={selectedId} onValueChange={onSelect}>
                <SelectTrigger className="h-9 w-[180px] bg-background/50 backdrop-blur-md border-border/50 hover:border-primary/50 transition-all text-xs">
                    <SelectValue placeholder="Select Server" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                    <SelectGroup>
                        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Google Gemini
                        </div>
                        {googleModels.map(model => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                disabled={!model.isAvailable}
                                className="text-xs"
                            >
                                <div className="flex items-center justify-between w-full gap-2">
                                    <span className="flex items-center gap-2">
                                        {getModelIcon(model.provider)}
                                        {model.name}
                                    </span>
                                    {!model.isAvailable && (
                                        <ShieldAlert className="w-3 h-3 text-destructive animate-pulse" />
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                    <div className="h-px bg-border/50 my-1" />
                    <SelectGroup>
                        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            OpenAI
                        </div>
                        {openaiModels.map(model => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                disabled={!model.isAvailable}
                                className="text-xs"
                            >
                                <div className="flex items-center justify-between w-full gap-2">
                                    <span className="flex items-center gap-2">
                                        {getModelIcon(model.provider)}
                                        {model.name}
                                    </span>
                                    {!model.isAvailable && (
                                        <ShieldAlert className="w-3 h-3 text-destructive animate-pulse" />
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
