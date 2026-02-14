import { useState, useEffect } from 'react';
import type { ModelInfo } from '@/types/verification';

const AVAILABLE_MODELS: ModelInfo[] = [
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        description: 'Fast and efficient multimodal analysis',
        isAvailable: true
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        description: 'Deep reasoning and high-fidelity analysis',
        isAvailable: true
    },
    {
        id: 'gpt-4o',
        name: 'OpenAI GPT-4o',
        provider: 'openai',
        description: 'State-of-the-art multimodal reasoning',
        isAvailable: true
    },
    {
        id: 'gpt-4-turbo',
        name: 'OpenAI GPT-4 Turbo',
        provider: 'openai',
        description: 'Fast and reliable content verification',
        isAvailable: true
    }
];

const COOLDOWN_DURATION = 1000 * 60 * 5; // 5 minutes cooldown

export function useModelManagement() {
    const [models, setModels] = useState<ModelInfo[]>(AVAILABLE_MODELS);
    const [selectedModelId, setSelectedModelId] = useState<string>(AVAILABLE_MODELS[0].id);

    // Load state from localStorage
    useEffect(() => {
        const savedExhausted = localStorage.getItem('exhaustedModels');
        if (savedExhausted) {
            const exhaustedMap = JSON.parse(savedExhausted) as Record<string, number>;
            const now = Date.now();

            setModels(prev => prev.map(model => {
                const cooldownUntil = exhaustedMap[model.id];
                if (cooldownUntil && cooldownUntil > now) {
                    return { ...model, isAvailable: false, cooldownUntil };
                }
                return model;
            }));
        }

        const savedSelection = localStorage.getItem('selectedModelId');
        if (savedSelection && AVAILABLE_MODELS.some(m => m.id === savedSelection)) {
            setSelectedModelId(savedSelection);
        }
    }, []);

    // Save selection
    useEffect(() => {
        localStorage.setItem('selectedModelId', selectedModelId);
    }, [selectedModelId]);

    const markModelAsExhausted = (id: string) => {
        const cooldownUntil = Date.now() + COOLDOWN_DURATION;

        setModels(prev => {
            const updated = prev.map(m =>
                m.id === id ? { ...m, isAvailable: false, cooldownUntil } : m
            );

            // Persist to localStorage
            const exhaustedMap: Record<string, number> = {};
            updated.forEach(m => {
                if (!m.isAvailable && m.cooldownUntil) {
                    exhaustedMap[m.id] = m.cooldownUntil;
                }
            });
            localStorage.setItem('exhaustedModels', JSON.stringify(exhaustedMap));

            return updated;
        });

        // If the currently selected model is exhausted, try to switch to the next available one
        if (selectedModelId === id) {
            const nextAvailable = models.find(m => m.id !== id && m.isAvailable);
            if (nextAvailable) {
                setSelectedModelId(nextAvailable.id);
            }
        }
    };

    const getActiveModel = () => models.find(m => m.id === selectedModelId) || models[0];

    return {
        models,
        selectedModelId,
        setSelectedModelId,
        markModelAsExhausted,
        activeModel: getActiveModel(),
    };
}
