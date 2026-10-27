/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ScreenSource {
    id: string;
    name: string;
    url?: string;
    icon?: string;
    width?: number;
    height?: number;
}

export type ScreenLayout = "horizontal" | "grid";

export interface StreamOptions {
    fps?: number;
    layout?: ScreenLayout;
    resolution?: "source" | "720" | "1080" | "1440" | "2160";
    includeAudio?: boolean;
}

export interface ActiveSession {
    screens: ScreenSource[];
    streams: MediaStream[];
    videoElements: HTMLVideoElement[];
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    compositeStream: MediaStream;
    animFrameId?: number;
    intervalId?: any;
    layout: ScreenLayout;
    fps: number;
    stop: () => void;
}
