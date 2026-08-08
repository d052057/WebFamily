import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timezoneDate',
  standalone: true,
  pure: false
})
export class TimezoneDatePipe implements PipeTransform {

  private khmerWeekdays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  private khmerMonths = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  private khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

  transform(
    value: Date | string | number,
    timeZone: string = 'UTC',
    options?: Intl.DateTimeFormatOptions,
    useOrdinal: boolean = false,
    locale: string = 'en-US'
  ): string {
    if (!value) return '';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '';

    // Browsers commonly lack 'km' ICU data, so Khmer is rendered manually
    if (locale.startsWith('km')) {
      return this.formatKhmer(date, timeZone, options);
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    // Always merge timeZone in, regardless of custom options passed
    const finalOptions: Intl.DateTimeFormatOptions = {
      timeZone,
      ...(options ?? defaultOptions)
    };

    if (!useOrdinal) {
      return new Intl.DateTimeFormat(locale, finalOptions).format(date);
    }

    const parts = new Intl.DateTimeFormat(locale, finalOptions).formatToParts(date);
    return parts
      .map(part => {
        if (part.type === 'day') {
          const n = parseInt(part.value, 10);
          return `${n}${this.getSuffix(n)}`;
        }
        return part.value;
      })
      .join('');
  }
  private toKhmerDigits(str: string): string {
    return str.split('').map(d => this.khmerDigits[+d]).join('');
  }
  private formatKhmer(
    date: Date,
    timeZone: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    // Use en-US internally only to reliably extract numeric parts + timezone conversion
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(date);

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';

    const weekdayEn = get('weekday');
    const dayNum = parseInt(get('day'), 10);
    const monthNum = parseInt(get('month'), 10);
    const yearNum = parseInt(get('year'), 10);
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');

    const weekdayIndex = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].indexOf(weekdayEn);

    const opts = options ?? {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    };

    const segments: string[] = [];
    if (opts.weekday) segments.push(this.khmerWeekdays[weekdayIndex]);
    if (opts.day) segments.push(this.toKhmerNumber(dayNum));
    if (opts.month) segments.push(this.khmerMonths[monthNum - 1]);
    if (opts.year) segments.push(this.toKhmerNumber(yearNum));

    // Time is built separately and joined with colons, then appended
    const timeParts: string[] = [];
    if (opts.hour) timeParts.push(this.toKhmerDigits(hour));
    if (opts.minute) timeParts.push(this.toKhmerDigits(minute));
    if (opts.second) timeParts.push(this.toKhmerDigits(second));


    if (timeParts.length) {
      const hour24 = parseInt(hour, 10);
      segments.push(`${timeParts.join(':')} ${this.getKhmerPeriod(hour24)}`);
    }

    return segments.join(' ');
  }
  private getKhmerPeriod(hour24: number): string {
    if (hour24 >= 5 && hour24 < 11) return 'ព្រឹក';
    if (hour24 >= 11 && hour24 < 13) return 'ថ្ងៃត្រង់';
    if (hour24 >= 13 && hour24 < 18) return 'រសៀល';
    if (hour24 >= 18 && hour24 < 21) return 'ល្ងាច';
    return 'យប់';
  }

  private toKhmerNumber(n: number): string {
    return n.toString().split('').map(d => this.khmerDigits[+d]).join('');
  }

  private getSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
}
