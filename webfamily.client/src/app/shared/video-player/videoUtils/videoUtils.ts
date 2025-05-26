export class VideoUtils {
  static getDuration(src: string): Promise<number> {
    const video = document.createElement('video');

    return new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => {
        resolve(video.duration);
      }, { once: true });

      video.addEventListener('error', () => {
        reject('Failed to load video metadata');
      }, { once: true });

      video.src = src;
    });
  }
}
export class VideoFrameExtractor {
  private static cache = new Map<string, string>();

  static async extractFrame(videoSrc: string, timeInSeconds: number): Promise<string> {
    const cacheKey = `${videoSrc}_${Math.floor(timeInSeconds)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoSrc;
      video.muted = true;
      video.preload = 'metadata';

      const dataURL = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Frame extraction timeout')), 5000);
        video.onseeked = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            if (document.fullscreenElement) {
              // If in fullscreen mode, use larger canvas size
              canvas.width = 640;
              canvas.height = 360;
            } else {
              canvas.width = 160;
              canvas.height = 90;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const result = canvas.toDataURL('image/jpeg', 0.8);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            video.remove();
          }
        };

        video.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error('Video loading failed'));
        };

        video.currentTime = timeInSeconds;
      });

      // Cache the result with size limit
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(cacheKey, dataURL);

      return dataURL;
    } catch (error) {
      console.error('Frame extraction failed:', error);
      return ''; // Return empty string as fallback
    }
  }
}

