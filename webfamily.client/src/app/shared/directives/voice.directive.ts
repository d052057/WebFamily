import { Directive, ElementRef, OnDestroy, input, output, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appVoice]'
})
export class VoiceDirective implements OnDestroy, OnChanges {
  /*readonly microphone = input<boolean>(false);*/
  @Input() microphone: boolean = false;
  readonly language = input<string>('en-US');
  readonly voiceInput = output<string>();
  private recognition: any;
  private isRecognizing = false;
  private handlers = new Map<string, EventListenerOrEventListenerObject>();

  private handleResult = (event: any) => {
    let transcript = '';
    for (const result of event.results) {
      if (result.isFinal) {
        transcript += result[0].transcript + ' ';
      }
    }
    this.voiceInput.emit(transcript.trim());
  };

  private handleEnd = () => {
    if (this.isRecognizing) {
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e) {
          console.error('[Voice] Restart error:', e);
        }
      }, 100);
    }
  };

  constructor(private el: ElementRef) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = this.language();
    // Register event handlers
    this.registerHandler('result', this.handleResult.bind(this));
    this.registerHandler('end', this.handleEnd.bind(this));
  }
  // add event listeners
  private registerHandler(eventName: string, callback: EventListenerOrEventListenerObject): void {
    this.recognition.addEventListener(eventName, callback);
    this.handlers.set(eventName, callback);
  }
  // remove event listeners 
  private unregisterHandlers(): void {
    this.handlers.forEach((callback, eventName) => {
      this.recognition.removeEventListener(eventName, callback);
    });
    this.handlers.clear();
  }

  ngOnDestroy() {
    if (this.isRecognizing) {
      this.isRecognizing = false;
      this.unregisterHandlers();
      this.recognition.stop();
    }
  }

  ngOnChanges() {
    if (this.microphone) {
      this.startRecognition();
    } else {
      this.stopRecognition();
    }
  }

  startRecognition() {
    /*if (this.isRecognizing) return;*/
    if (!this.recognition || this.isRecognizing) return;
    try {
      this.recognition.lang = this.language();
      this.recognition.start();
      this.isRecognizing = true;
    } catch (e) {
      console.error('[Voice] Start error:', e);
    }
  }

  stopRecognition() {
    //if (!this.isRecognizing) return;
    if (!this.recognition || !this.isRecognizing) return;
    try {
      this.recognition.stop();
      this.isRecognizing = false;
    } catch (e) {
      console.error('[Voice] Stop error:', e);
    }
  }
}
