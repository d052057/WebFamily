import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'time' })
export class TimePipe implements PipeTransform {
  transform(value: number): string {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value - hours * 3600) / 60);
    const minuteString = hours ? minutes < 10 ? `0${minutes}` : `${minutes}` : `${minutes}`;
    const seconds = Math.floor(value - hours * 3600 - minutes * 60);
    const secondString = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${hours ? hours : ''}${hours ? ':' : ''}${minuteString}:${secondString}`;
  }
}
