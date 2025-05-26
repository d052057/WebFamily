import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sort' })
export class SortPipe<T extends { time: number }> implements PipeTransform {
  transform(values: T[]): T[] {
    return values.sort((a, b) => a.time - b.time);
  }
}
