import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EventListenerService {
  private handlers = new Map<EventTarget, Map<string, EventListenerOrEventListenerObject>>();
  private keyboardHandlers: ((event: KeyboardEvent) => void)[] = [];
  public registerHandler(target: EventTarget, eventName: string, callback: EventListenerOrEventListenerObject): void {
    target.addEventListener(eventName, callback);

    if (!this.handlers.has(target)) {
      this.handlers.set(target, new Map());
    }

    this.handlers.get(target)!.set(eventName, callback);
  }

  public unregisterHandlers(target: EventTarget): void {
    const targetHandlers = this.handlers.get(target);
    if (!targetHandlers) return;

    targetHandlers.forEach((callback, eventName) => {
      target.removeEventListener(eventName, callback);
    });

    this.handlers.delete(target);
  }

  public unregisterAll(): void {
    this.handlers.forEach((events, target) => {
      events.forEach((callback, eventName) => {
        target.removeEventListener(eventName, callback);
      });
    });
    // Clear all handlers
    this.handlers.clear();
    this.keyboardHandlers = [];
    window.removeEventListener('keydown', this.handleKeyboardEvent);
  }

  registerKeyboardHandler(handler: (event: KeyboardEvent) => void): void {
    // Add to our list of handlers
    this.keyboardHandlers.push(handler);

    // If this is the first handler, add the actual event listener
    if (this.keyboardHandlers.length === 1) {
      window.addEventListener('keydown', this.handleKeyboardEvent);
    }
  }
  unregisterKeyboardHandler(handler: (event: KeyboardEvent) => void): void {
    // Remove from our list
    this.keyboardHandlers = this.keyboardHandlers.filter(h => h !== handler);

    // If no more handlers, remove the event listener
    if (this.keyboardHandlers.length === 0) {
      window.removeEventListener('keydown', this.handleKeyboardEvent);
    }
  }
  private handleKeyboardEvent = (event: KeyboardEvent) => {
    // Call all registered keyboard handlers
    this.keyboardHandlers.forEach(handler => handler(event));
  }
}

