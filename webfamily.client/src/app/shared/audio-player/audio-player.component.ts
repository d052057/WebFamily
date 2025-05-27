import { Component, ElementRef, output, signal, viewChild, effect, OnInit, OnDestroy, inject, computed, Input } from '@angular/core';
import { Subject, switchMap, takeUntil, map, from, catchError, of } from 'rxjs';
import { NgFor, NgIf } from '@angular/common';
import { AudioItem, AutoplayCapability, PlaybackMode } from './models/audio.model';
import { TimeConversionPipe } from './../pipes/time-conversion.pipe';
import { EventListenerService } from '../services/event-handler.service';
import { fadeInOut } from '../services/animations';


@Component({
  selector: 'app-audio-player',
  imports: [NgFor, NgIf, TimeConversionPipe],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss',
  animations: [fadeInOut]
})
export class AudioPlayerComponent {

  // Injected services
  private readonly eventListenerService = inject(EventListenerService);
  // Core state signals
  readonly audioList = signal<AudioItem[]>([]);
  readonly currentTrackIndex = signal<number>(0);
  readonly isAudioLoaded = signal<boolean>(false);
  readonly isAudioPlaying = signal<boolean>(false);
  readonly totalAudioLength = signal<number>(0);
  readonly currentAudioTime = signal<number>(0);

  // Player settings signals
  readonly audioVolume = signal<number>(50);
  readonly autoPlay = signal<boolean>(true);
  readonly isShuffle = signal<boolean>(false);
  readonly isRepeat = signal<boolean>(false);
  readonly isMute = signal<boolean>(false);
  readonly isAudioAutoPlay = signal<boolean>(false);

  // Computed values for better performance
  readonly currentAudio = computed(() => {
    const list = this.audioList();
    const index = this.currentTrackIndex();
    return list[index] || null;
  });

  readonly audioListState = computed(() => {
    const list = this.audioList();
    return !list || list.length === 0;
  });


  readonly canPlayNext = computed(() => {
    const list = this.audioList();
    return list.length > 1;
  });

  readonly canPlayPrevious = computed(() => {
    const list = this.audioList();
    return list.length > 1;
  });

  // Output events
  readonly audioTimeUpdate = output<number>();
  readonly audioTimeUpdateChange = output<number>();
  readonly audioVolumeChange = output<number>();
  readonly playEvent = output<void>();
  readonly pauseEvent = output<void>();
  readonly muteEvent = output<void>();
  readonly repeatEvent = output<void>();
  readonly trackEndEvent = output<void>();
  readonly trackChangeEvent = output<AudioItem>();
  readonly autoPlayChange = output<boolean>();

  // ViewChild references
  private readonly audioPlayer = viewChild.required<ElementRef<HTMLAudioElement>>('AngAudioPlayer');
  private readonly trackListContainer = viewChild.required<ElementRef>('trackListContainer');

  // Private properties
  private audio!: HTMLAudioElement;
  private readonly destroy$ = new Subject<void>();
  private shuffledIndices: number[] = [];
  private playHistory: number[] = [];
  private autoplayCapability: AutoplayCapability = 'blocked';

  // Constants
  private static readonly VOLUME_STEP = 10;
  private static readonly SEEK_STEP = 15;
  private static readonly MAX_HISTORY_LENGTH = 50;

  // Signals for reactive state management
  private readonly _audios = signal<AudioItem[]>([]);
  readonly videos = this._audios.asReadonly();

  @Input()
  set dataSource(value: AudioItem[]) {
    if (value?.length && value !== this._audios()) {
      this._audios.set(value);
      if (value.length > 0) {
        this.audioList.set(value);
        this.currentTrackIndex.set(0);    
        this.audio.src = encodeURI(value[0].url);
        this.isAudioLoaded.set(false);
      }
    }
  }

  get dataSource(): AudioItem[] {
    return this._audios();
  }

  constructor() {
    // Effects for reactive updates
    effect(() => {
      const volume = this.audioVolume();
      if (this.audio) {
        this.audio.volume = volume / 100;
      }
    });

    effect(() => {
      const muted = this.isMute();
      if (this.audio) {
        this.audio.muted = muted;
      }
    });

    effect(() => {
      const repeat = this.isRepeat();
      if (this.audio) {
        this.audio.loop = repeat;
      }
    });
  }
  async ngOnInit(): Promise<void> {
    try {
      await this.initializeComponent();
    } catch (error) {
      console.error('Failed to initialize audio player:', error);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initializeComponent(): Promise<void> {
    /*await this.loadAudioList();*/
    this.initializeAudioElement();
    await this.checkAutoplayCapability();
  }

  private loadAudioDurations(audioList: AudioItem[]) {
    const durationPromises = audioList.map(async (item: AudioItem) => {
      try {
        item.duration = await this.getAudioDuration(item.url);
        return item;
      } catch (error) {
        console.warn(`Failed to load duration for ${item.title}:`, error);
        item.duration = 0;
        return item;
      }
    });
    return from(Promise.all(durationPromises));
  }

  private initializeAudioElement(): void {
    setTimeout(() => {
      if (this.audioPlayer()) {
        this.audioPlayer().nativeElement.autoplay = this.autoPlay();
        this.audioPlayer().nativeElement.crossOrigin = 'anonymous'; // Ensure CORS is handled
        this.audio = this.audioPlayer().nativeElement;

        this.setupAudioProperties();
        this.registerEventListeners();

        if (this.autoPlay()) {
          this.handleAutoplay();
        }
      }
    }, 0);
  }

  private setupAudioProperties(): void {
    this.audio.volume = this.audioVolume() / 100;
    this.audio.autoplay = false; // Handle autoplay manually
    this.audio.preload = 'metadata';
    this.isAudioAutoPlay.set(this.autoPlay());
  }

  private registerEventListeners(): void {
    const events = [
      { event: 'playing', handler: this.handlePlaying },
      { event: 'pause', handler: this.handlePause },
      { event: 'loadeddata', handler: this.handleLoadedData },
      { event: 'timeupdate', handler: this.handleTimeUpdate },
      { event: 'ended', handler: this.handleEnded },
      { event: 'volumechange', handler: this.handleVolumeChange },
      { event: 'error', handler: this.handleError },
      { event: 'loadstart', handler: this.handleLoadStart }
    ];

    events.forEach(({ event, handler }) => {
      this.eventListenerService.registerHandler(this.audio, event, handler);
    });
  }

  private async handleAutoplay(): Promise<void> {
    if (!this.audio || !this.isAudioAutoPlay()) return;

    switch (this.autoplayCapability) {
      case 'allowed':
        await this.attemptNormalAutoplay();
        break;
      case 'muted-only':
        await this.attemptMutedAutoplay();
        break;
      case 'blocked':
        this.notifyAutoplayBlocked();
        this.audio.play();
        break;
    }
  }

  private async attemptNormalAutoplay(): Promise<void> {
    try {
      await this.audio.play();
      this.playEvent.emit();
    } catch (error) {
      console.warn('Normal autoplay failed:', error);
      await this.attemptMutedAutoplay();
    }
  }

  private async attemptMutedAutoplay(): Promise<void> {
    try {
      this.audio.muted = true;
      this.isMute.set(true);
      await this.audio.play();
      this.playEvent.emit();
      this.notifyMutedAutoplay();
    } catch (error) {
      console.warn('Muted autoplay failed:', error);
      this.notifyAutoplayBlocked();
    }
  }

  private notifyMutedAutoplay(): void {
    console.info('Audio started muted due to browser autoplay policy');
  }

  private notifyAutoplayBlocked(): void {
    console.info('Autoplay blocked - user interaction required');
  }

  // =============================================================================
  // AUTOPLAY MANAGEMENT
  // =============================================================================

  private async checkAutoplayCapability(): Promise<void> {
    try {
      const testAudio = new Audio();
      testAudio.autoplay = this.autoPlay(); 
      testAudio.volume = 0.1;
      testAudio.muted = true;

      await testAudio.play();
      testAudio.pause();

      // Test unmuted
      testAudio.muted = false;
      try {
        await testAudio.play();
        testAudio.pause();
        this.autoplayCapability = 'allowed';
      } catch {
        this.autoplayCapability = 'muted-only';
      }
    } catch {
      this.autoplayCapability = 'blocked';
    }
  }
  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  private handlePlaying = (): void => {
    this.isAudioPlaying.set(true);
    this.playEvent.emit();
  };

  private handlePause = (): void => {
    this.isAudioPlaying.set(false);
    this.pauseEvent.emit();
  };

  private handleLoadedData = (): void => {
    this.isAudioLoaded.set(true);
    const duration = Math.floor(this.audio.duration);
    this.totalAudioLength.set(duration);
  };

  private handleLoadStart = (): void => {
    this.isAudioLoaded.set(false);
  };

  private handleTimeUpdate = (): void => {
    const currentTime = Math.floor(this.audio.currentTime);
    this.currentAudioTime.set(currentTime);
    this.audioTimeUpdateChange.emit(currentTime);
  };

  private handleVolumeChange = (): void => {
    const volume = Math.floor(this.audio.volume * 100);
    this.audioVolumeChange.emit(volume);
  };

  private handleError = (event: Event): void => {
    console.error('Audio error occurred:', event);
    this.isAudioLoaded.set(false);
  };

  private handleEnded = (): void => {
    this.trackEndEvent.emit();

    if (this.isRepeat()) {
      this.restartCurrentTrack();
    } else if (this.canPlayNext()) {
      this.playNext();
    } else {
      this.handlePlaylistEnd();
    }
  };

  private restartCurrentTrack(): void {
    this.audio.currentTime = 0;
    this.currentAudioTime.set(0);
    this.play();
  }

  private handlePlaylistEnd(): void {
    this.isAudioPlaying.set(false);
    this.currentAudioTime.set(0);
    this.audio.currentTime = 0;
  }


  // =============================================================================
  // PUBLIC PLAYBACK CONTROL METHODS
  // =============================================================================

  async play(): Promise<void> {
    if (!this.audio) return;

    try {
      this.scrollToCurrentTrack();
      await this.audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  togglePlay(): void {
    this.isAudioPlaying() ? this.pause() : this.play();
  }

  toggleMute(): void {
    if (this.audio) {
      const newMuteState = !this.isMute();
      this.isMute.set(newMuteState);
      this.muteEvent.emit();
    }
  }

  toggleRepeat(): void {
    const newRepeatState = !this.isRepeat();
    this.isRepeat.set(newRepeatState);
    this.repeatEvent.emit();
  }

  toggleShuffle(): void {
    const newShuffleState = !this.isShuffle();
    this.isShuffle.set(newShuffleState);

    if (newShuffleState) {
      this.enableShuffle();
    } else {
      this.disableShuffle();
    }
  }

  toggleAutoPlay(): void {
    const newAutoPlayState = !this.isAudioAutoPlay();
    this.isAudioAutoPlay.set(newAutoPlayState);
    this.autoPlayChange.emit(newAutoPlayState);

    if (newAutoPlayState && this.isAudioLoaded() && !this.isAudioPlaying()) {
      this.handleAutoplay();
    }
  }

  // =============================================================================
  // TRACK NAVIGATION METHODS
  // =============================================================================

  playNext(): void {
    if (!this.canPlayNext()) return;

    const nextIndex = this.getNextTrackIndex();
    this.changeTrack(nextIndex);
  }

  playPrevious(): void {
    if (!this.canPlayPrevious()) return;

    const prevIndex = this.getPreviousTrackIndex();
    this.changeTrack(prevIndex);
  }

  playTrack(index: number): void {
    const audioList = this.audioList();
    if (!audioList.length || index < 0 || index >= audioList.length) return;

    this.changeTrack(index);
  }

  playRandom(): void {
    const audioList = this.audioList();
    if (audioList.length <= 1) return;

    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * audioList.length);
    } while (randomIndex === this.currentTrackIndex());

    this.changeTrack(randomIndex);

    if (this.isShuffle()) {
      this.updateShuffleHistory(randomIndex);
    }
  }

  private changeTrack(index: number): void {
    this.currentTrackIndex.set(index);
    this.resetAudioState();

    const currentAudio = this.currentAudio();
    if (currentAudio) {
      this.trackChangeEvent.emit(currentAudio);
    }
    this.audio.src = encodeURI(this.currentAudio().url);
    setTimeout(() => {
      if (this.isAudioAutoPlay()) {
        this.play();
      }
    }, 50);
  }

  private resetAudioState(): void {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.currentAudioTime.set(0);

      if (this.audio.muted && !this.isMute()) {
        this.audio.muted = false;
      }
    }
  }

  // =============================================================================
  // SEEK AND VOLUME CONTROLS
  // =============================================================================

  seek(event: Event): void {
    if (!this.audio) return;

    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    this.audio.currentTime = time;
    this.currentAudioTime.set(time);
  }

  seekForward(): void {
    if (this.audio) {
      const newTime = Math.min(
        this.audio.currentTime + AudioPlayerComponent.SEEK_STEP,
        this.audio.duration
      );
      this.audio.currentTime = newTime;
    }
  }

  seekBackward(): void {
    if (this.audio) {
      const newTime = Math.max(
        this.audio.currentTime - AudioPlayerComponent.SEEK_STEP,
        0
      );
      this.audio.currentTime = newTime;
    }
  }

  setVolume(event: Event): void {
    if (!this.audio) return;

    const input = event.target as HTMLInputElement;
    const volume = parseFloat(input.value);
    this.audioVolume.set(volume);
  }

  increaseVolume(): void {
    const newVolume = Math.min(
      this.audioVolume() + AudioPlayerComponent.VOLUME_STEP,
      100
    );
    this.audioVolume.set(newVolume);
  }

  decreaseVolume(): void {
    const newVolume = Math.max(
      this.audioVolume() - AudioPlayerComponent.VOLUME_STEP,
      0
    );
    this.audioVolume.set(newVolume);
  }

  // =============================================================================
  // SHUFFLE MANAGEMENT
  // =============================================================================

  private enableShuffle(): void {
    this.playHistory = [this.currentTrackIndex()];
    this.generateShuffleIndices();
  }

  private disableShuffle(): void {
    this.playHistory = [this.currentTrackIndex()];
    this.shuffledIndices = [];
  }

  private generateShuffleIndices(): void {
    const audioList = this.audioList();
    if (!audioList.length) return;

    // Create array of all indices except current
    const currentIndex = this.currentTrackIndex();
    this.shuffledIndices = Array.from({ length: audioList.length }, (_, i) => i)
      .filter(i => i !== currentIndex);

    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] =
        [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
  }

  private getNextTrackIndex(): number {
    const audioList = this.audioList();
    if (!audioList.length) return 0;

    if (this.isShuffle()) {
      return this.getNextShuffleIndex();
    } else {
      const nextIndex = this.currentTrackIndex() + 1;
      return nextIndex >= audioList.length ? 0 : nextIndex;
    }
  }

  private getPreviousTrackIndex(): number {
    const audioList = this.audioList();
    if (!audioList.length) return 0;

    if (this.isShuffle()) {
      return this.getPreviousShuffleIndex();
    } else {
      const prevIndex = this.currentTrackIndex() - 1;
      return prevIndex < 0 ? audioList.length - 1 : prevIndex;
    }
  }

  private getNextShuffleIndex(): number {
    if (this.shuffledIndices.length === 0) {
      this.regenerateShuffleForHistory();
    }

    const nextIndex = this.shuffledIndices.shift() || 0;
    this.addToPlayHistory(nextIndex);
    return nextIndex;
  }

  private getPreviousShuffleIndex(): number {
    if (this.playHistory.length > 1) {
      this.playHistory.pop(); // Remove current
      return this.playHistory[this.playHistory.length - 1];
    }
    return this.currentTrackIndex();
  }

  private regenerateShuffleForHistory(): void {
    this.generateShuffleIndices();

    // Remove already played tracks from shuffle
    this.playHistory.forEach(historyIndex => {
      const shuffleIndex = this.shuffledIndices.indexOf(historyIndex);
      if (shuffleIndex > -1) {
        this.shuffledIndices.splice(shuffleIndex, 1);
      }
    });

    // If all tracks played, reset history
    if (this.shuffledIndices.length === 0) {
      this.playHistory = [this.currentTrackIndex()];
      this.generateShuffleIndices();
    }
  }

  private addToPlayHistory(index: number): void {
    this.playHistory.push(index);

    // Limit history size
    if (this.playHistory.length > AudioPlayerComponent.MAX_HISTORY_LENGTH) {
      this.playHistory.shift();
    }
  }

  private updateShuffleHistory(index: number): void {
    this.addToPlayHistory(index);

    const shuffleIndex = this.shuffledIndices.indexOf(index);
    if (shuffleIndex > -1) {
      this.shuffledIndices.splice(shuffleIndex, 1);
    }
  }

  private attemptAutoplay(): void {
    if (!this.audioPlayer()) return;

    const audio = this.audioPlayer().nativeElement;

    audio.play()
      .then(() => {
        this.playEvent.emit();
      })
      .catch(error => {
        console.warn('Autoplay with sound was prevented:', error);

        if (!audio.muted) {
          audio.muted = true;
          this.isMute.set(true);

          audio.play()
            .then(() => {
              console.info('Autoplay succeeded with muted audio');
              this.playEvent.emit();
            })
            .catch(mutedError => {
              console.error('Even muted autoplay was prevented:', mutedError);
            });
        }
      });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  resetShuffle(): void {
    if (!this.isShuffle()) return;
    this.enableShuffle();
  }

  getRemainingShuffleTracks(): number {
    return this.shuffledIndices.length;
  }

  private scrollToCurrentTrack(): void {
    const container = this.trackListContainer();
    if (!container) return;

    const selectedTrack = container.nativeElement.children[this.currentTrackIndex()];
    if (selectedTrack) {
      selectedTrack.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  private async getAudioDuration(src: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audioTemp = new Audio();

      const cleanup = () => {
        this.eventListenerService.unregisterHandlers(audioTemp);
      };

      const onMetadata = () => {
        cleanup();
        resolve(Math.floor(audioTemp.duration || 0));
      };

      const onError = () => {
        cleanup();
        reject(new Error(`Failed to load audio: ${src}`));
      };

      this.eventListenerService.registerHandler(audioTemp, 'loadedmetadata', onMetadata);
      this.eventListenerService.registerHandler(audioTemp, 'error', onError);

      audioTemp.src = src;
    });
  }

  private cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.audio) {
      this.eventListenerService.unregisterAll();
    }
  }
}
