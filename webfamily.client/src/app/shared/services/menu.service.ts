// services/menu.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { MenuItem, MenuData } from '../../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  }
  private readonly baseUrl = '/api/menu'; // Adjust your API URL
  
  // In-memory storage - no localStorage
  private menuStore = new Map<string, MenuData>();
  private menuSubjects = new Map<string, BehaviorSubject<MenuItem[]>>();
  
  // Signals for reactive UI (Angular 17+ style)
  private bookMenuSignal = signal<MenuItem[]>([]);
  private photoMenuSignal = signal<MenuItem[]>([]);
  private movieMenuSignal = signal<MenuItem[]>([]);
  private videoMenuSignal = signal<MenuItem[]>([]);
  private musicMenuSignal = signal<MenuItem[]>([]);
  private linkMenuSignal = signal<MenuItem[]>([]);
  
  // Computed signals for easy access
  public bookMenu = computed(() => this.bookMenuSignal());
  public photoMenu = computed(() => this.photoMenuSignal());
  public movieMenu = computed(() => this.movieMenuSignal());
  public videoMenu = computed(() => this.videoMenuSignal());
  public musicMenu = computed(() => this.musicMenuSignal());
  public linkMenu = computed(() => this.linkMenuSignal());
  
  // Observable streams for components that prefer observables
  public bookMenu$ = this.getMenuObservable('books');
  public photoMenu$ = this.getMenuObservable('photos');
  public movieMenu$ = this.getMenuObservable('movies');
  public videoMenu$ = this.getMenuObservable('videos');
  public musicMenu$ = this.getMenuObservable('musics');
  public linkMenu$ = this.getMenuObservable('links');

  constructor() {
    this.initializeMenus();
  }

  // Initialize all menus at startup
  private async initializeMenus(): Promise<void> {
    try {
      /*console.log('Initializing menus...');*/
      
      // Load both menus in parallel
      const [bookData, photoData, movieData, videoData, musicData, linkData] = await Promise.all([
        this.loadMenuFromServer('books'),
        this.loadMenuFromServer('photos'),
        this.loadMenuFromServer('movies'),
        this.loadMenuFromServer('videos'),
        this.loadMenuFromServer('musics'),
        this.loadMenuFromServer('links')
      ]);

      // Store in memory and update signals
      if (bookData) {
        this.menuStore.set('book', bookData);
        this.bookMenuSignal.set(bookData.items);
        this.updateMenuSubject('books', bookData.items);
      }

      if (photoData) {
        this.menuStore.set('photos', photoData);
        this.photoMenuSignal.set(photoData.items);
        this.updateMenuSubject('photos', photoData.items);
      }
      if (movieData) {
        this.menuStore.set('movies', movieData);
        this.movieMenuSignal.set(movieData.items);
        this.updateMenuSubject('movies', movieData.items);
      }
      if (videoData) {
        this.menuStore.set('videos', videoData);
        this.videoMenuSignal.set(videoData.items);
        this.updateMenuSubject('videos', videoData.items);
      }
      if (musicData) {
        this.menuStore.set('musics', musicData);
        this.musicMenuSignal.set(musicData.items);
        this.updateMenuSubject('musics', musicData.items);
      }
      if (linkData) {
        this.menuStore.set('links', linkData);
        this.linkMenuSignal.set(linkData.items);
        this.updateMenuSubject('links', linkData.items);
      }
      /*console.log('Menus initialized successfully');*/
    } catch (error) {
      console.error('Failed to initialize menus:', error);
      // Set empty arrays as fallback
      this.bookMenuSignal.set([]);
      this.photoMenuSignal.set([]);
      this.movieMenuSignal.set([]);
      this.videoMenuSignal.set([]);
      this.musicMenuSignal.set([]);
      this.linkMenuSignal.set([]);
    }
  }

  // Get menu as Observable (for components that prefer observables)
  private getMenuObservable(menuId: string): Observable<MenuItem[]> {
    if (!this.menuSubjects.has(menuId)) {
      this.menuSubjects.set(menuId, new BehaviorSubject<MenuItem[]>([]));
    }
    return this.menuSubjects.get(menuId)!.asObservable();
  }

  // Update menu subject
  private updateMenuSubject(menuId: string, items: MenuItem[]): void {
    if (!this.menuSubjects.has(menuId)) {
      this.menuSubjects.set(menuId, new BehaviorSubject<MenuItem[]>([]));
    }
    this.menuSubjects.get(menuId)!.next(items);
  }

  // Load menu from server
  private async loadMenuFromServer(menuId: string): Promise<MenuData | null> {
    try {
      const menuData = await firstValueFrom(
        this.http.get<MenuData>(`${this.baseUrl}/${menuId}`)
      );
      return menuData;
    } catch (error) {
      console.error(`Failed to load ${menuId} menu:`, error);
      return null;
    }
  }

  // Public methods for components

  // Get menu items synchronously (fastest)
  getMenuItems(menuId: string): MenuItem[] {
    const menuData = this.menuStore.get(menuId);
    return menuData ? menuData.items : [];
  }

  // Get menu data with version info
  getMenuData(menuId: string): MenuData | null {
    return this.menuStore.get(menuId) || null;
  }

  // Check if menu is loaded
  isMenuLoaded(menuId: string): boolean {
    return this.menuStore.has(menuId);
  }

  // Get menu version
  getMenuVersion(menuId: string): string | null {
    const menuData = this.menuStore.get(menuId);
    return menuData ? menuData.version : null;
  }

  // Add menu item
  async addMenuItem(menuId: string, newItem: Omit<MenuItem, 'id'>): Promise<boolean> {
    try {
      const menuData = await firstValueFrom(
        this.http.post<MenuData>(`${this.baseUrl}/addMenuItem/${menuId}/items`, newItem)
      );

      // Update memory store
      this.menuStore.set(menuId, menuData);
      
      // Update signals and observables
      this.updateMenuSignals(menuId, menuData.items);

      console.log(`Added item '${newItem.title}' to ${menuId} menu`);
      return true;
    } catch (error) {
      console.error(`Failed to add item to ${menuId} menu:`, error);
      return false;
    }
  }

  // Remove menu item
  async removeMenuItem(menuId: string, itemId: string): Promise<boolean> {
    const encodedItemId = encodeURIComponent(itemId); 
    try {
      const menuData = await firstValueFrom(
        this.http.delete<MenuData>(`${this.baseUrl}/removeMenuItem/${menuId}/items/${encodedItemId}`)
      );

      // Update memory store
      this.menuStore.set(menuId, menuData);
      
      // Update signals and observables
      this.updateMenuSignals(menuId, menuData.items);

      console.log(`Removed item with ID ${itemId} from ${menuId} menu`);
      return true;
    } catch (error) {
      console.error(`Failed to remove item from ${itemId} menu:`, error);
      return false;
    }
  }

  // Update menu signals based on menuId
  private updateMenuSignals(menuId: string, items: MenuItem[]): void {
    switch (menuId) {
      case 'book':
        this.bookMenuSignal.set(items);
        break;
      case 'photo':
        this.photoMenuSignal.set(items);
        break;
      case 'movie':
        this.movieMenuSignal.set(items);
        break;
      case 'video':
        this.videoMenuSignal.set(items);
        break;
      case 'music':
        this.musicMenuSignal.set(items);
        break;
      case 'link':
        this.linkMenuSignal.set(items);
        break;
    }
    
    // Also update observable
    this.updateMenuSubject(menuId, items);
  }

  // Refresh menu from server (useful for debugging or manual refresh)
  async refreshMenu(menuId: string): Promise<void> {
    const menuData = await this.loadMenuFromServer(menuId);
    if (menuData) {
      this.menuStore.set(menuId, menuData);
      this.updateMenuSignals(menuId, menuData.items);
    }
  }

  // Refresh all menus
  async refreshAllMenus(): Promise<void> {
    await this.initializeMenus();
  }

  // Get all menu names
  getAvailableMenus(): string[] {
    return Array.from(this.menuStore.keys());
  }

  // Get memory usage info (for debugging)
  getMemoryInfo(): { menuCount: number; totalItems: number } {
    let totalItems = 0;
    this.menuStore.forEach(menu => {
      totalItems += menu.items.length;
    });

    return {
      menuCount: this.menuStore.size,
      totalItems
    };
  }
  RenameFile(record: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/RenameFile`, record)
  }
  deleteFile(recordId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Deletefile/recordId/${recordId}`)
  }
  initDatabaseUpdate(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/initMediaDatabaseAsync`,null);
  }
}
