import { Facebook, Youtube, Video, MessageCircle, Linkedin } from 'lucide-react';

export const SOCIAL_LINKS = [
  {
    key: 'social_whatsapp' as const,
    icon: MessageCircle,
    label: 'WhatsApp',
    href: 'https://whatsapp.com/channel/0029VanTjhu05MUXjsn0l51S',
    accent: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    key: 'social_facebook' as const,
    icon: Facebook,
    label: 'Facebook',
    href: 'https://www.facebook.com/cortexbenintv',
    accent: 'bg-blue-500/10 text-blue-500',
  },
  {
    key: 'social_youtube' as const,
    icon: Youtube,
    label: 'YouTube',
    href: 'https://youtube.com/@cortexbenintv',
    accent: 'bg-rose-500/10 text-rose-500',
  },
  {
    key: 'social_tiktok' as const,
    icon: Video,
    label: 'TikTok',
    href: 'https://vm.tiktok.com/ZS9Brm9XQDjB7-TbCqm/',
    accent: 'bg-slate-700 text-white',
  },
  {
    key: 'social_linkedin' as const,
    icon: Linkedin,
    label: 'LinkedIn',
    href: '',
    accent: 'bg-blue-700/10 text-blue-700',
  },
];
