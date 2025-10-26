import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'chapter' })
export class ChapterPipe implements PipeTransform {
  transform(seconds: number, chapters: { title: string; time: number; }[]): string {
    const chapter = [...chapters]
      .sort((a, b) => b.time - a.time)
      .find(chapter => seconds >= chapter.time);
    return chapter ? chapter.title : '';
  }
}
