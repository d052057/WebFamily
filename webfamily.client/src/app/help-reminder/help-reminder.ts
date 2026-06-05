import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
interface Command {
  title: string;
  lines: string[];
}
type CommandData = Command[];

@Component({
  selector: 'app-help-reminder',
  imports: [],
  templateUrl: './help-reminder.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './help-reminder.scss'
})
export class HelpReminder implements OnInit {
  http = inject(HttpClient);
  copiedCommands = new Set<string>();
  failedCommands = new Set<string>();
  commandData: CommandData | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit() {
    this.loadCommands();
  }
  loadCommands() {
    this.loading = true;
    this.error = null;

    this.http.get<CommandData>('assets/data/help.json').subscribe({
      next: (data) => {
        this.commandData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load data';
        this.loading = false;
      }
    });
  }
  copyToClipboard(command: any): void {
    const codeText = command.lines.join('\n');

    // Clear any previous states for this command
    this.clearCommandState(command);

    if (navigator.clipboard && window.isSecureContext) {
      // Modern async clipboard API
      navigator.clipboard.writeText(codeText).then(() => {
        this.showCopyFeedback(command, true);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        this.fallbackCopyTextToClipboard(codeText, command);
      });
    } else {
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(codeText, command);
    }
  }

  private fallbackCopyTextToClipboard(text: string, command: any): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      this.showCopyFeedback(command, successful);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      this.showCopyFeedback(command, false);
    }

    document.body.removeChild(textArea);
  }

  private showCopyFeedback(command: any, success: boolean): void {
    if (success) {
      this.copiedCommands.add(command.title);
      setTimeout(() => {
        this.copiedCommands.delete(command.title);
      }, 2000);
    } else {
      this.failedCommands.add(command.title);
      setTimeout(() => {
        this.failedCommands.delete(command.title);
      }, 3000); // Show failed state a bit longer
    }
  }

  private clearCommandState(command: any): void {
    this.copiedCommands.delete(command.title);
    this.failedCommands.delete(command.title);
  }

  isCopied(command: any): boolean {
    return this.copiedCommands.has(command.title);
  }

  isFailed(command: any): boolean {
    return this.failedCommands.has(command.title);
  }

  getButtonState(command: any): 'default' | 'copied' | 'failed' {
    if (this.isCopied(command)) return 'copied';
    if (this.isFailed(command)) return 'failed';
    return 'default';
  }
}
