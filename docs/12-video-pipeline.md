# Video Pipeline and Provider Strategy

## Goals

Support video upload, streaming, progress tracking, transcript, caption, thumbnails, and AI indexing.

## Provider adapter

VideoProvider interface:

- uploadOriginal
- createPlaybackAsset
- getPlaybackUrl
- getSignedPlaybackUrl
- generateThumbnail
- getDuration
- deleteAsset
- getProcessingStatus

Production providers:

- Mux
- Cloudflare Stream
- Custom HLS provider

## MVP approach

For MVP, support:

- external video URL
- direct uploaded video playback
- basic progress tracking
- transcript upload

## Production approach

Prefer Mux or Cloudflare Stream for adaptive streaming.

If self-hosted later:

- upload original video
- queue video-processing job
- FFmpeg transcode
- generate HLS/DASH renditions
- generate thumbnails
- extract duration
- signed playback URL
- CDN delivery

## Advanced video learning

- playback speed
- resume playback
- watch progress
- minimum watch percentage completion
- subtitle/caption upload
- multi-language caption
- transcript viewer
- transcript search
- click transcript to seek
- timestamp notes
- video bookmark
- Picture-in-Picture
- AI summary from transcript
- AI quiz generation from transcript
