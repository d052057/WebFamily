import { VideoSource } from './../models/video.model';
import { Component, ElementRef, HostListener, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-video-viewer',
  imports: [],
  templateUrl: './video-viewer.component.html',
  styleUrl: './video-viewer.component.scss'
})
export class VideoViewerComponent implements OnInit, OnChanges {
  @Input() videoInfo!: VideoSource;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;

  currentTime = 0;
  videoDuration = 0;
  isVideoLoaded = false;
  frameRate = 30; // Default frame rate (will be calculated if possible)
  currentFrame = 0;
  totalFrames = 0;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Ensure we remove keyboard event listeners when component is destroyed
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoInfo'] && changes['videoInfo'].currentValue) {
      this.isVideoLoaded = false;
      this.currentTime = 0;
      this.videoDuration = 0;
      this.currentFrame = 0;

      // We need to wait for the video to be loaded before we can draw the frame
      setTimeout(() => {
        this.initializeVideo();
      }, 100);
    }
  }

  initializeVideo(): void {
    const video = this.videoElement.nativeElement;

    // Set up event listeners
    video.addEventListener('loadedmetadata', () => {
      this.isVideoLoaded = true;
      this.videoDuration = video.duration;
      this.estimateFrameRate();
      this.calculateTotalFrames();
      this.drawCurrentFrame();

      // Add keyboard controls
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    });

    video.addEventListener('timeupdate', () => {
      this.currentTime = video.currentTime;
      this.calculateCurrentFrame();
    });

    // Load the video without playing it
    video.src = this.videoInfo.src;
    video.load();
  }

  // Estimate frame rate based on video properties (if available)
  estimateFrameRate(): void {
    // Try to get frame rate from video metadata if possible
    // Most browsers don't expose this property directly, so we use a fallback
    const video = this.videoElement.nativeElement;

    // For now we'll use the default 30fps, but this method could be extended
    // to detect frame rate using more advanced techniques if needed 
      this.frameRate = 30;   

    // Log for debugging
    console.log(`Using frame rate: ${this.frameRate} fps`);
  }

  calculateTotalFrames(): void {
    this.totalFrames = Math.floor(this.videoDuration * this.frameRate);
  }

  calculateCurrentFrame(): void {
    this.currentFrame = Math.floor(this.currentTime * this.frameRate);
  }

  // Handle keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isVideoLoaded) return;

    const frameDuration = 1 / this.frameRate;
    const video = this.videoElement.nativeElement;

    switch (event.key) {
      case 'ArrowLeft':
        // Previous frame
        event.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - frameDuration);
        break;
      case 'ArrowRight':
        // Next frame
        event.preventDefault();
        video.currentTime = Math.min(this.videoDuration, video.currentTime + frameDuration);
        break;
      case 'Home':
        // First frame
        event.preventDefault();
        video.currentTime = 0;
        break;
      case 'End':
        // Last frame
        event.preventDefault();
        video.currentTime = Math.max(0, this.videoDuration - frameDuration);
        break;
    }

    // After changing time, update and draw
    this.currentTime = video.currentTime;
    this.calculateCurrentFrame();
    this.drawCurrentFrame();
  }

  drawCurrentFrame(): void {
    if (!this.isVideoLoaded) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  exportCurrentFrame(): void {
    if (!this.isVideoLoaded) return;

    const canvas = this.canvas.nativeElement;

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = dataUrl;

    // Generate filename with video title, frame number and timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const filename = `${this.videoInfo.title.replace(/\s+/g, '_')}_frame${this.currentFrame}_${timestamp}.png`;

    link.download = filename;

    // Append to document, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();

    if (!this.isVideoLoaded) return;

    const video = this.videoElement.nativeElement;
    const duration = video.duration;

    // Calculate frame duration in seconds (e.g., for 30fps, one frame = 1/30 seconds)
    const frameDuration = 1 / this.frameRate;

    // Determine direction: scroll up (negative deltaY) = previous frame, scroll down = next frame
    const direction = event.deltaY > 0 ? 1 : -1;

    // Move exactly one frame forward or backward
    const timeChange = direction * frameDuration;

    // Update current time
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + timeChange));
    this.currentTime = video.currentTime;

    // Draw the current frame
    this.drawCurrentFrame();
  }

  onTimeSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const video = this.videoElement.nativeElement;

    video.currentTime = parseFloat(input.value);
    this.currentTime = video.currentTime;
    this.drawCurrentFrame();
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  toggleFullScreen(): void {
    const canvasContainer = this.canvas.nativeElement.parentElement;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (canvasContainer?.requestFullscreen) {
        canvasContainer.requestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}
