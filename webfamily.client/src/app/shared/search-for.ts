export class SearchFor {
  jsonArray: any[];
  searchTerm: string = '';
  constructor(dataSource: any[]) {
    this.jsonArray = dataSource;
  }
  filterItems() {
    if (!this.searchTerm) {
      return this.jsonArray;
    }

    const searchVar = this.searchTerm.toLowerCase();
    return this.jsonArray.filter(item => item.name.toLowerCase().includes(searchVar));
  }
}
