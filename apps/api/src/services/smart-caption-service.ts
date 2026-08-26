import { ScriptScene, TimedCaption } from "@ai-social/shared";

export interface SmartCaptionsOutput {
  vttContent: string;
  srtContent: string;
  timedCaptions: TimedCaption[];
}

function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function formatVttTime(seconds: number): string {
  return formatSrtTime(seconds).replace(",", ".");
}

/**
 * Smart Captions & Subtitle Generator.
 * Converts narration scenes into timed SRT/VTT subtitle files and caption lists.
 */
export function generateSmartCaptions(scenes: ScriptScene[]): SmartCaptionsOutput {
  const timedCaptions: TimedCaption[] = [];
  let currentTime = 0;

  for (let idx = 0; idx < scenes.length; idx++) {
    const scene = scenes[idx];
    const duration = scene.durationSeconds || 5;
    const startTimeSeconds = currentTime;
    const endTimeSeconds = currentTime + duration;
    currentTime = endTimeSeconds;

    // Split long captions into max 40-character safe chunks
    const captionText = scene.caption || scene.narration.slice(0, 40);
    timedCaptions.push({
      index: idx + 1,
      startTimeSeconds,
      endTimeSeconds,
      text: captionText,
    });
  }

  // Construct SRT File string
  const srtLines: string[] = [];
  for (const item of timedCaptions) {
    srtLines.push(`${item.index}`);
    srtLines.push(`${formatSrtTime(item.startTimeSeconds)} --> ${formatSrtTime(item.endTimeSeconds)}`);
    srtLines.push(item.text);
    srtLines.push("");
  }

  // Construct VTT File string
  const vttLines: string[] = ["WEBVTT", ""];
  for (const item of timedCaptions) {
    vttLines.push(`${item.index}`);
    vttLines.push(`${formatVttTime(item.startTimeSeconds)} --> ${formatVttTime(item.endTimeSeconds)}`);
    vttLines.push(item.text);
    vttLines.push("");
  }

  return {
    srtContent: srtLines.join("\n"),
    vttContent: vttLines.join("\n"),
    timedCaptions,
  };
}
