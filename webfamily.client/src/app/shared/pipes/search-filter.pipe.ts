import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchFilter',
  standalone: true
})
export class SearchFilterPipe implements PipeTransform {
  transform(items: any[], searchTerm: string, fieldName: string | null = null): any[] {
    if (!searchTerm) {
      return items;
    }
    searchTerm = searchTerm.toLowerCase();
    if (fieldName) {
      return items.filter(item => item[fieldName].toLowerCase().includes(searchTerm)); // Filter based on a property of the item
    }
    else {
      return items.filter(item => item.toLowerCase().includes(searchTerm)); // Filter based on a property of the item
    }
  }
}
