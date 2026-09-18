import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cleanTrackTitle',
  standalone: true
})
export class CleanTrackTitlePipe implements PipeTransform {

  transform(raw: string | null | undefined): string {
    if (!raw) return raw ?? '';

    const withoutExt = raw.replace(/\.[^./\\]+$/, '');

    const discMatch = withoutExt.match(/^\s*(\d{1,2})-(\d{1,3})[\s.\-_)]+\s*(.+)$/);
    if (discMatch) {
      return discMatch[3].trim();
    }

    const trackMatch = withoutExt.match(/^\s*(?:track\s*)?\(?(\d{1,3})\)?[\s.\-_)]+\s*(.+)$/i);
    if (trackMatch) {
      return trackMatch[2].trim();
    }

    return withoutExt.trim();
  }
}
