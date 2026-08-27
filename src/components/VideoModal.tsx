import React from 'react';
import { FeaturedVideo } from '../types.ts';
import { X, Play, Volume2, Sparkles } from 'lucide-react';

interface VideoModalProps {
  video: FeaturedVideo | null;
  onClose: () => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
    }
  }

  return null;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
  if (!video) return null;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(video.video_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-2 sm:p-4 text-ink">
        {/* Header with Close */}
        <div className="flex items-center justify-between p-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-brand/20 text-rose-brand flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-ink">{video.title}</h3>
              <p className="text-xs text-ink/70">Moment Magique en direct</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-black/10 dark:hover:bg-white/15 rounded-full text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-[9/16] max-w-xs mx-auto rounded-2xl overflow-hidden bg-black shadow-inner">
          {youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <video
              src={video.video_url}
              poster={video.thumbnail_url}
              controls
              autoPlay
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Caption */}
        <div className="p-3 text-xs text-ink/80 leading-relaxed font-sans">
          {video.description}
        </div>
      </div>
    </div>
  );
};
