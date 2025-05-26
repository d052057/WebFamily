import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, fromEvent, merge } from 'rxjs';

import { AudioTrack, VideoSource, Speed_array } from './models/video.model';
import { EventListenerService } from './services/event-handler.service';
import { TimeConversionPipe } from '../pipes/time-conversion.pipe';
import { VideoFrameExtractor } from './videoUtils/videoUtils';

// Optimized frame extraction with caching and error handling


// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = {
  SPACE: ' ',
  MUTE: 'm',
  FULLSCREEN: ['f', 'F'],
  SEEK_BACKWARD: 'ArrowLeft',
  SEEK_FORWARD: 'ArrowRight',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown'
} as const;

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss', './playlist.scss'],
  imports: [CommonModule, FormsModule, NgbModule, TimeConversionPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPlayerComponent implements OnInit, AfterViewInit {
  @ViewChild('videoPlayer', { static: true }) videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('thumbnailPreview', { static: true }) thumbnailPreviewRef!: ElementRef<HTMLDivElement>;
  @ViewChild('externalAudio', { static: true }) externalAudioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('figure', { static: true }) figure!: ElementRef<HTMLElement>;

  // Signals for reactive state management
  private readonly _videos = signal<VideoSource[]>([]);
  readonly videos = this._videos.asReadonly();

  private readonly _currentVideo = signal<VideoSource | null>(null);
  readonly currentVideo = this._currentVideo.asReadonly();

  private readonly _isPlaying = signal(false);
  readonly isPlaying = this._isPlaying.asReadonly();

  private readonly _isMuted = signal(false);
  readonly isMuted = this._isMuted.asReadonly();

  private readonly _isFullscreen = signal(false);
  readonly isFullscreen = this._isFullscreen.asReadonly();

  private readonly _volume = signal(0.1);
  readonly volume = this._volume.asReadonly();

  private readonly _currentTime = signal(0);
  readonly currentTime = this._currentTime.asReadonly();

  private readonly _duration = signal(0);
  readonly duration = this._duration.asReadonly();

  private readonly _videoProgress = signal(0);
  readonly videoProgress = this._videoProgress.asReadonly();

  private readonly _bufferProgress = signal(0);
  readonly bufferProgress = this._bufferProgress.asReadonly();

  private readonly _playbackRate = signal(1);
  readonly playbackRate = this._playbackRate.asReadonly();

  private readonly _isDefaultAudio = signal(true);
  readonly isDefaultAudio = this._isDefaultAudio.asReadonly();

  public readonly _showThumbnail = signal(false);
  readonly showThumbnail = this._showThumbnail.asReadonly();

  private readonly _thumbnailTime = signal(0);
  readonly thumbnailTime = this._thumbnailTime.asReadonly();

  // Computed values
  readonly currentVideoIndex = computed(() => {
    const current = this.currentVideo();
    const videoList = this.videos();
    return current ? videoList.findIndex(v => v.id === current.id) : 0;
  });

  // Traditional properties for complex objects
  textTracks: TextTrack[] = [];
  audioTracks: AudioTrack[] = [];
  currentAudioTrack: AudioTrack | null = null;
  currentAudioIndex = 0;
  speed = Speed_array;
  captionsEnabled = false;
  isAudioMuted = false;
  audioVolume = 0.1;

  private lastThumbnailPosition = 0;
  private player!: HTMLVideoElement;
  private audio!: HTMLAudioElement;

  // Injected services
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly eventService = inject(EventListenerService);

  @Input()
  set dataSource(value: VideoSource[]) {
    if (value?.length && value !== this._videos()) {
      this._videos.set(value);
      if (value.length > 0) {
        this.playVideo(value[0]);
      }
    }
  }

  get dataSource(): VideoSource[] {
    return this._videos();
  }

  ngOnInit(): void {
    this.setVolume(0.1);
  }

  ngAfterViewInit(): void {
    this.player = this.videoPlayerRef.nativeElement;
    this.audio = this.externalAudioRef.nativeElement;
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    

  }

  private setupEventListeners(): void {
    const eventMappings = [
      { event: 'timeupdate', handler: this.onTimeUpdate },
      { event: 'durationchange', handler: this.onDurationChange },
      { event: 'progress', handler: this.onProgress },
      { event: 'play', handler: this.onPlay },
      { event: 'pause', handler: this.onPause },
      { event: 'volumechange', handler: this.onVolChange },
      { event: 'loadedmetadata', handler: this.onLoadedMetadata },
      { event: 'ended', handler: this.onEnded }
    ];

    eventMappings.forEach(({ event, handler }) => {
      this.eventService.registerHandler(this.player, event, handler.bind(this));
    });

    this.eventService.registerHandler(document, 'fullscreenchange', this.onFullscreenChange.bind(this));
  }

  private setupKeyboardShortcuts(): void {
    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleKeyDown(event));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const { key } = event;

    switch (key) {
      case KEYBOARD_SHORTCUTS.SPACE:
        event.preventDefault();
        this.togglePlay();
        break;
      case KEYBOARD_SHORTCUTS.MUTE:
        this.toggleMute();
        break;
      case KEYBOARD_SHORTCUTS.FULLSCREEN[0]:
      case KEYBOARD_SHORTCUTS.FULLSCREEN[1]:
        this.toggleFullscreen();
        break;
      case KEYBOARD_SHORTCUTS.SEEK_BACKWARD:
        this.seekRelative(-5);
        break;
      case KEYBOARD_SHORTCUTS.SEEK_FORWARD:
        this.seekRelative(5);
        break;
      case KEYBOARD_SHORTCUTS.VOLUME_UP:
        this.adjustVolume(0.1);
        break;
      case KEYBOARD_SHORTCUTS.VOLUME_DOWN:
        this.adjustVolume(-0.1);
        break;
    }
  }

  private seekRelative(seconds: number): void {
    const newTime = Math.max(0, Math.min(this.player.duration, this.player.currentTime + seconds));
    this.setCurrentTime(newTime);
  }

  private adjustVolume(delta: number): void {
    const newVolume = Math.max(0, Math.min(1, this._volume() + delta));
    this.setVolume(newVolume);
  }

  // Event handlers with optimized change detection
  private onTimeUpdate = (): void => {
    const currentTime = this.player.currentTime * 1000;
    const progress = (this.player.currentTime / this.player.duration) * 100 || 0;

    this._currentTime.set(currentTime);
    this._videoProgress.set(progress);
  };

  private onDurationChange = (): void => {
    this._duration.set(this.player.duration * 1000);
  };

  private onProgress = (): void => {
    if (this.player.buffered.length > 0) {
      const bufferedEnd = this.player.buffered.end(this.player.buffered.length - 1);
      const progress = (bufferedEnd / this.player.duration) * 100 || 0;
      this._bufferProgress.set(progress);
    }
  };

  private onPlay = (): void => {
    this._isPlaying.set(true);
    if (!this._isDefaultAudio() && this.audio) {
      this.audio.play();
    }
  };

  private onPause = (): void => {
    this._isPlaying.set(false);
    if (!this._isDefaultAudio() && this.audio) {
      this.audio.pause();
    }
  };

  private onVolChange = (): void => {
    this._isMuted.set(this.player.muted);
    this._volume.set(this.player.volume);
  };

  private onLoadedMetadata = (): void => {
    this.textTracks = Array.from(this.player.textTracks);
    this.cdr.markForCheck();
  };

  private onEnded = (): void => {
    // Use RAF for smoother transition
    requestAnimationFrame(() => {
      this.playNextVideo();
    });
  };

  private onFullscreenChange = (): void => {
    this._isFullscreen.set(!!document.fullscreenElement);
  };

  playVideo(video: VideoSource): void {
    this.setDefaultAudio(true);
    this._currentVideo.set(video);
    this.resetCaptions();
    this._playbackRate.set(1);
    this.player.playbackRate = 1;

    this.player.src = video.src;

    if (video.poster) {
      this.player.poster = video.poster;
    }

    this.resetPlayerState();
    this.player.load();

    // Use requestAnimationFrame for smoother playback start
    requestAnimationFrame(() => {
      this.player.play().catch(this.handlePlayError);
    });
  }

  private resetPlayerState(): void {
    this._videoProgress.set(0);
    this._bufferProgress.set(0);
    this.setCurrentTime(0);
  }

  private handlePlayError = (error: Error): void => {
    console.error('Error playing video:', error);
    if (error.name === 'NotAllowedError') {
      console.log('Autoplay prevented by browser. Click play to start the video.');
    }
  };

  playNextVideo(): void {
    const videoList = this.videos();
    if (videoList.length === 0) return;

    const nextIndex = (this.currentVideoIndex() + 1) % videoList.length;
    this.playVideo(videoList[nextIndex]);
  }

  togglePlay(): void {
    if (this.player.paused) {
      this.player.play().catch(this.handlePlayError);
    } else {
      this.player.pause();
    }
  }

  toggleMute(): void {
    this.player.muted = !this.player.muted;
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.figure.nativeElement.requestFullscreen()
        .catch(err => console.error("Fullscreen error:", err));
    }
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseFloat(target.value);
    this.setVolume(volume);

    if (this.player.muted && volume > 0) {
      this.player.muted = false;
    }
  }

  onProgressBarClick(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    this.seekToPosition(pos);
  }

  seekToPosition(pos: number): void {
    if (isNaN(this.player.duration)) return;
    this.setCurrentTime(pos * this.player.duration);
  }

  seekToTime(timeInSeconds: number): void {
    this.setCurrentTime(timeInSeconds);
  }

  private setCurrentTime(time: number): void {
    this.player.currentTime = time;
    if (this.audio && !this._isDefaultAudio()) {
      this.audio.currentTime = time;
    }
  }

  private setVolume(volume: number): void {
    this._volume.set(volume);
    this.player.volume = volume;

    if (this.audio) {
      this.audio.volume = volume;
      this.audioVolume = volume;
    }
  }

  private setDefaultAudio(isDefault: boolean): void {
    this._isDefaultAudio.set(isDefault);
    this.setVolume(this._volume());

    if (isDefault) {
      this.silentAudio();
      this.player.muted = false;
      this.audio?.pause();
    } else {
      this.player.muted = true;
    }
  }

  private silentAudio(): void {
    if (!this._isDefaultAudio() && this.audio) {
      this.audio.muted = true;
      this.audio.volume = 0;
      this.audio.currentTime = 0;
      this.isAudioMuted = true;
    }
  }

  toggleSpeed(speed: number): void {
    this._playbackRate.set(speed);
    this.player.playbackRate = speed;

    if (this.audio && !this._isDefaultAudio()) {
      this.audio.playbackRate = speed;
    }
  }

  async selectAudioTrack(audioTrack: AudioTrack): Promise<void> {
    this.currentAudioIndex = audioTrack.id;

    if (audioTrack && audioTrack.label !== 'Default') {
      this.setDefaultAudio(false);
      await this.initializeExternalAudio(audioTrack);
    } else {
      this.setDefaultAudio(true);
    }
  }

  private async initializeExternalAudio(audioTrack: AudioTrack): Promise<void> {
    try {
      this.audio.src = audioTrack.src;
      this.audio.load();
      this.audio.playbackRate = this._playbackRate();
      this.audio.currentTime = this.player.currentTime;

      if (!this.player.paused) {
        await this.audio.play();
      }
    } catch (error) {
      console.error('Error initializing external audio:', error);
    }
  }

  // Optimized thumbnail preview with debouncing
  onProgressBarMove(event: MouseEvent): void {
    if (!this._showThumbnail()) return;

    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;

    this.updateThumbnailPosition(event, rect);
    this.updateThumbnailPreview(pos);
  }

  private updateThumbnailPosition(event: MouseEvent, rect: DOMRect): void {
    const thumbnailEl = this.thumbnailPreviewRef.nativeElement;
    thumbnailEl.style.left = `${event.clientX}px`;
    thumbnailEl.style.bottom = `${rect.height + 5}px`;
  }

  private updateThumbnailPreview(pos: number): void {
    const timeInSeconds = pos * this.player.duration;
    this._thumbnailTime.set(timeInSeconds * 1000);

    if (Math.abs(this.lastThumbnailPosition - pos) > 0.05) {
      this.lastThumbnailPosition = pos;
      this.extractThumbnailFrame(timeInSeconds);
    }
  }

  private async extractThumbnailFrame(timeInSeconds: number): Promise<void> {
    try {
      const dataURL = await VideoFrameExtractor.extractFrame(this.player.src, timeInSeconds);
      if (dataURL) {
        const thumbnailImage = this.thumbnailPreviewRef.nativeElement
          .querySelector('.thumbnail-image') as HTMLElement;

        if (thumbnailImage) {
          Object.assign(thumbnailImage.style, {
            backgroundImage: `url(${dataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          });
        }
      }
    } catch (error) {
      console.error('Thumbnail extraction failed:', error);
    }
  }

  toggleCaptions(track: TextTrack | null): void {
    // Disable all tracks
    Array.from(this.player.textTracks).forEach(t => t.mode = 'disabled');

    // Enable selected track
    if (track) {
      track.mode = 'showing';
      this.captionsEnabled = true;
    } else {
      this.captionsEnabled = false;
    }
  }

  private resetCaptions(): void {
    Array.from(this.player.textTracks).forEach(track => track.mode = 'disabled');
    this.player.querySelectorAll('track').forEach(el => el.remove());
  }

  // Additional audio methods
  toggleAudioMute(): void {
    if (this.audio) {
      this.audio.muted = !this.audio.muted;
      this.isAudioMuted = this.audio.muted;
    }
  }

  onAudioVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseFloat(target.value);
    this.setVolume(volume);

    if (this.audio?.muted && volume > 0) {
      this.audio.muted = false;
    }
  }

  // TrackBy functions for optimal *ngFor performance
  trackByVideo = (index: number, video: VideoSource): any => video.id;
  trackByCaption = (index: number, caption: any): any => caption.src || index;
  trackByAudioTrack = (index: number, track: AudioTrack): any => track.id;
  trackByTextTrack = (index: number, track: TextTrack): any => track.id || track.label || index;
  trackByChapter = (index: number, chapter: any): any => chapter.start || index;
  trackBySpeed = (index: number, speed: number): number => speed;

  // Expose private signals for template access (needed for thumbnail)
  //get _showThumbnail() {
  //  return this._showThumbnail;
  //}
}
