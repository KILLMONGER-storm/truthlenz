"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const shakeVariants1 = {
    shake: {
        x: [0, -2, 2, -1, 1, 0],
        transition: {
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: "easeInOut" as any,
        },
    },
};

const shakeVariants2 = {
    shake: {
        x: [0, 1.5, -1.5, 2, -2, 0],
        transition: {
            duration: 1.2,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: "easeInOut" as any,
        },
    },
};

const shakeVariants3 = {
    shake: {
        x: [0, -1, 1, -2, 2, -1, 0],
        transition: {
            duration: 0.5,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: "easeInOut" as any,
        },
    },
};

const shakeVariants4 = {
    shake: {
        x: [0, 2, -1, 1.5, -2, 0],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: "easeInOut" as any,
        },
    },
};

const shakeVariants5 = {
    shake: {
        x: [0, -1.5, 1, -1, 2, -2, 0],
        transition: {
            duration: 0.7,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: "easeInOut" as any,
        },
    },
};

const getVariants = (index: number) => {
    const variants = [
        shakeVariants1,
        shakeVariants2,
        shakeVariants3,
        shakeVariants4,
        shakeVariants5,
    ];
    return variants[index % variants.length];
};

const getRandomDelay = () => Math.random() * 2;

const FuzzyWrapper = ({
    children,
    baseIntensity = 0.3,
    className,
}: {
    children: React.ReactNode;
    baseIntensity?: number;
    className?: string;
}) => {
    const canvasRef = useRef<HTMLCanvasElement & { cleanupFuzzy?: () => void }>(
        null
    );
    const svgContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animationFrameId: number;
        let isCancelled = false;
        const canvas = canvasRef.current;
        const svgContainer = svgContainerRef.current;

        if (!canvas || !svgContainer) return;

        if (canvas.cleanupFuzzy) {
            canvas.cleanupFuzzy();
        }

        const init = async () => {
            if (isCancelled) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const svgElement = svgContainer.querySelector("svg");
            if (!svgElement) return;

            await new Promise((resolve) => setTimeout(resolve, 100));

            const svgRect = svgElement.getBoundingClientRect();
            const svgWidth = svgRect.width || 800;
            const svgHeight = svgRect.height || 232;

            const offscreen = document.createElement("canvas");
            const offCtx = offscreen.getContext("2d");
            if (!offCtx) return;

            offscreen.width = svgWidth;
            offscreen.height = svgHeight;

            const convertSvgToCanvas = () => {
                return new Promise<void>((resolve) => {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const img = new Image();
                    const svgBlob = new Blob([svgData], {
                        type: "image/svg+xml;charset=utf-8",
                    });
                    const url = URL.createObjectURL(svgBlob);

                    img.onload = () => {
                        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
                        offCtx.drawImage(img, 0, 0, svgWidth, svgHeight);
                        URL.revokeObjectURL(url);
                        resolve();
                    };

                    img.src = url;
                });
            };

            const horizontalMargin = 50;
            const verticalMargin = 50;
            canvas.width = svgWidth + horizontalMargin * 2;
            canvas.height = svgHeight + verticalMargin * 2;

            const fuzzRange = 20;

            const run = async () => {
                if (isCancelled) return;

                await convertSvgToCanvas();

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.translate(horizontalMargin, verticalMargin);

                for (let j = 0; j < svgHeight; j++) {
                    const dx = Math.floor(
                        baseIntensity * (Math.random() - 0.5) * fuzzRange
                    );
                    ctx.drawImage(offscreen, 0, j, svgWidth, 1, dx, j, svgWidth, 1);
                }

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                animationFrameId = window.requestAnimationFrame(run);
            };

            run();

            const cleanup = () => {
                window.cancelAnimationFrame(animationFrameId);
            };

            canvas.cleanupFuzzy = cleanup;
        };

        init();

        return () => {
            isCancelled = true;
            window.cancelAnimationFrame(animationFrameId);
            if (canvas && canvas.cleanupFuzzy) {
                canvas.cleanupFuzzy();
            }
        };
    }, [baseIntensity]);

    return (
        <div className="relative">
            <div
                ref={svgContainerRef}
                className="absolute inset-0 opacity-0 pointer-events-none"
                style={{ zIndex: -1 }}
            >
                {children}
            </div>

            <canvas
                ref={canvasRef}
                className={className}
                style={{ display: "block" }}
            />
        </div>
    );
};

interface GlitchyErrorProps {
    errorCode?: string;
    width?: number;
    height?: number;
}

export function GlitchyError({
    errorCode = "404",
    width = 860,
    height = 232,
}: GlitchyErrorProps) {
    const digits = errorCode.split("");
    const dotColor = "#EF4444";
    const backgroundColor = "#FACC15";

    return (
        <FuzzyWrapper baseIntensity={0.4} className="cursor-pointer max-w-full h-auto">
            <div className="relative">
                <svg
                    width={width}
                    height={height}
                    viewBox="0 0 100 29"
                    xmlns="http://www.w3.org/2000/svg"
                    className="cursor-pointer"
                >
                    <defs>
                        {/* Dot Pattern for Comic Effect */}
                        <pattern
                            id="dotPattern"
                            patternUnits="userSpaceOnUse"
                            width="2"
                            height="2"
                        >
                            <rect width="2" height="2" fill={backgroundColor} />
                            <circle cx="0.5" cy="0.5" r="0.3" fill={dotColor} />
                        </pattern>

                        {/* Comic Shadow Filter */}
                        <filter id="comicShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="1" dy="1" stdDeviation="0" floodColor="#000000" />
                            <feDropShadow dx="0.6" dy="0.6" stdDeviation="0" floodColor={dotColor} />
                        </filter>
                    </defs>

                    {/* Dynamic text rendering with comic style and glitchy layers */}
                    {digits.map((digit, i) => (
                        <React.Fragment key={i}>
                            <motion.g
                                variants={getVariants(i * 3)}
                                animate="shake"
                                transition={{ delay: getRandomDelay() }}
                                style={{ transformOrigin: `${25 + i * 25}px 15px` }}
                            >
                                <text
                                    x={20 + i * 25}
                                    y="22"
                                    fontSize="22"
                                    fontWeight="900"
                                    fontFamily="'Bangers', 'Comic Sans MS', 'Impact', sans-serif"
                                    fill="url(#dotPattern)"
                                    stroke="#000000"
                                    strokeWidth="0.8"
                                    filter="url(#comicShadow)"
                                    style={{
                                        transform: "skewX(-10deg)",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    {digit}
                                </text>
                            </motion.g>

                            {/* Ghost layer for extra glitchiness */}
                            <motion.g
                                variants={getVariants(i * 3 + 1)}
                                animate="shake"
                                transition={{ delay: getRandomDelay() }}
                                opacity="0.3"
                            >
                                <text
                                    x={20 + i * 25 + (Math.random() - 0.5) * 2}
                                    y="22"
                                    fontSize="22"
                                    fontWeight="900"
                                    fontFamily="'Bangers', 'Comic Sans MS', 'Impact', sans-serif"
                                    fill="transparent"
                                    stroke="#000000"
                                    strokeWidth="0.4"
                                    style={{
                                        transform: "skewX(-10deg)",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    {digit}
                                </text>
                            </motion.g>
                        </React.Fragment>
                    ))}
                </svg>
            </div>
        </FuzzyWrapper>
    );
}
