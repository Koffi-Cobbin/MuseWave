/**
 * useKeyboardShortcuts — global keyboard shortcuts for the player.
 *
 *  Space        → play / pause
 *  ArrowLeft    → seek −10 s
 *  ArrowRight   → seek +10 s
 *  ArrowUp      → volume +10 %
 *  ArrowDown    → volume −10 %
 *  M            → mute / unmute
 *
 * All shortcuts are suppressed when the focused element is an editable
 * control (input, textarea, select, contentEditable) so they don't
 * interfere with typing.
 *
 * `onAction` is called with a short display label each time a shortcut
 * fires — the consumer can use it to show a transient HUD badge.
 */

import { useEffect, useRef } from "react";
import type { Track } from "../../../shared/schema";

interface Options {
  active: Track | null;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  volume: number;
  setVolume: (v: number) => void;
  handleSeekDelta: (delta: number) => void;
  onAction?: (label: string) => void;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({
  active,
  isPlaying,
  setIsPlaying,
  audioRef,
  volume,
  setVolume,
  handleSeekDelta,
  onAction,
}: Options) {
  const isPlayingRef  = useRef(isPlaying);
  const volumeRef     = useRef(volume);
  const prevVolumeRef = useRef(volume > 0 ? volume : 1);
  const onActionRef   = useRef(onAction);

  useEffect(() => { isPlayingRef.current  = isPlaying; },  [isPlaying]);
  useEffect(() => { onActionRef.current   = onAction;  },  [onAction]);
  useEffect(() => {
    if (volume > 0) prevVolumeRef.current = volume;
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (!active) return;

    const act = (label: string) => onActionRef.current?.(label);

    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;

      switch (e.code) {
        case "Space": {
          e.preventDefault();
          const next = !isPlayingRef.current;
          setIsPlaying(next);
          act(next ? "▶  Play" : "⏸  Pause");
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          handleSeekDelta(-10);
          act("◀◀  −10 s");
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          handleSeekDelta(10);
          act("▶▶  +10 s");
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const up = Math.min(1, Math.round((volumeRef.current + 0.1) * 10) / 10);
          setVolume(up);
          if (audioRef.current) audioRef.current.volume = up;
          act(`🔊  ${Math.round(up * 100)} %`);
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const down = Math.max(0, Math.round((volumeRef.current - 0.1) * 10) / 10);
          setVolume(down);
          if (audioRef.current) audioRef.current.volume = down;
          act(down === 0 ? "🔇  Muted" : `🔊  ${Math.round(down * 100)} %`);
          break;
        }
        case "KeyM": {
          e.preventDefault();
          if (volumeRef.current > 0) {
            setVolume(0);
            if (audioRef.current) audioRef.current.volume = 0;
            act("🔇  Muted");
          } else {
            const restore = prevVolumeRef.current;
            setVolume(restore);
            if (audioRef.current) audioRef.current.volume = restore;
            act(`🔊  ${Math.round(restore * 100)} %`);
          }
          break;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, setIsPlaying, setVolume, handleSeekDelta, audioRef]);
}
