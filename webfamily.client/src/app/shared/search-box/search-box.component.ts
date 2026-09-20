import { Component, ChangeDetectionStrategy, Input, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { VoiceDirective } from '../directives/voice.directive';
import { languages } from '../../models/languages';

// The app's standard search pattern - text input + voice dictation (appVoice)
// + Khmer/English language switch - extracted here so any page can drop it
// in rather than re-inlining it (this was previously duplicated between
// app-audio-player and the song browser; extracted once a third page needed
// it too, to stop that duplication before it grows further).
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, VoiceDirective],
  templateUrl: './search-box.component.html',
  styleUrl: './search-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBoxComponent {
  @Input() label: string = 'Search';

  // Emits the current search text on every change - typed or dictated.
  readonly searchChange = output<string>();

  isUserSpeaking = false;
  langData = languages;
  langSelected = 0;
  readonly langSearch = signal(this.langData[this.langSelected].search);
  readonly searchVal = signal('');

  onSearch(value: string): void {
    this.searchVal.set(value);
    this.searchChange.emit(value);
  }

  onVoiceInput(transcript: string): void {
    const combined = `${this.searchVal()} ${transcript}`.trim();
    this.searchVal.set(combined);
    this.searchChange.emit(combined);
  }

  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }

  onLangSelectChange(): void {
    this.langSearch.set(this.langData[this.langSelected].search);
  }
}
