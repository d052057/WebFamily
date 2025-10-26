// models/menu-item.model.ts
export interface MenuItem {
  id: number;
  title: string;
  param: string;
}

export interface MenuData {
  version: string;
  lastUpdated: string;
  items: MenuItem[];
}

export interface MenuUpdateRequest {
  action: 'add' | 'remove';
  item?: MenuItem;
  itemId?: number;
}
