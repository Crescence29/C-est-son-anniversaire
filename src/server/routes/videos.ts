import { Router, Response } from 'express';
import { db } from '../dataStore.ts';

const router = Router();

// GET /api/videos (Moments Magiques matching Mockup 1)
router.get('/', (req, res: Response): void => {
  const activeVideos = db.featuredVideos
    .filter((v) => v.is_active)
    .sort((a, b) => a.position - b.position);

  res.json({ videos: activeVideos });
});

export default router;
