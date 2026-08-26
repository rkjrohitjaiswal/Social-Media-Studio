export interface AudioTrackInfo {
  id: string;
  name: string;
  genre: string;
  publicUrl: string;
  durationSeconds: number;
}

export const ROYALTY_FREE_MUSIC_CATALOG: AudioTrackInfo[] = [
  {
    id: "track_luxury_lounge",
    name: "Luxury Lounge & Soft Ambient",
    genre: "LUXURY",
    publicUrl: "https://storage.ai-social.studio/audio/catalog/luxury_lounge.mp3",
    durationSeconds: 180,
  },
  {
    id: "track_upbeat_future",
    name: "Upbeat Corporate Electronic",
    genre: "ELECTRONIC",
    publicUrl: "https://storage.ai-social.studio/audio/catalog/upbeat_future.mp3",
    durationSeconds: 120,
  },
  {
    id: "track_cinematic_epic",
    name: "Cinematic Warm Orchestral",
    genre: "CINEMATIC",
    publicUrl: "https://storage.ai-social.studio/audio/catalog/cinematic_epic.mp3",
    durationSeconds: 240,
  },
];

export interface AudioMixingOptions {
  musicUrl?: string;
  musicVolume?: number; // default 0.25 (ducked under voiceover)
  voiceoverVolume?: number; // default 1.0
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}

export function selectMusicTrack(genre?: string): AudioTrackInfo & { url: string } {
  if (!genre) {
    const t = ROYALTY_FREE_MUSIC_CATALOG[0];
    (t as any).url = t.publicUrl;
    return t as any;
  }
  const match = ROYALTY_FREE_MUSIC_CATALOG.find(
    (t) => t.genre.toLowerCase() === genre.toLowerCase() || t.id.includes(genre.toLowerCase())
  );
  const selected = match || ROYALTY_FREE_MUSIC_CATALOG[0];
  (selected as any).url = selected.publicUrl;
  return selected as any;
}

export function calculateAudioDuckingOptions(hasVoiceover: boolean): AudioMixingOptions {
  return {
    musicVolume: hasVoiceover ? 0.2 : 0.8,
    voiceoverVolume: 1.0,
    fadeInSeconds: 1.0,
    fadeOutSeconds: 1.5,
  };
}
