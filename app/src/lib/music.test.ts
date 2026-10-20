import { describe, expect, it } from 'vitest';
import { cleanPlaylist } from './music';

describe('workout music', () => {
    it('keeps playlist links of the music services only', () => {
        expect(cleanPlaylist('Mira mi lista https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP?si=x')).toBe('https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP?si=x');
        expect(cleanPlaylist('https://music.apple.com/us/playlist/pl.123')).toBe('https://music.apple.com/us/playlist/pl.123');
        expect(cleanPlaylist('https://music.youtube.com/playlist?list=PL1')).toBe('https://music.youtube.com/playlist?list=PL1');
        expect(cleanPlaylist('https://evil.example.com/open.spotify.com')).toBeNull();
        expect(cleanPlaylist('http://open.spotify.com/playlist/1')).toBeNull();
        expect(cleanPlaylist('no link')).toBeNull();
    });
});
