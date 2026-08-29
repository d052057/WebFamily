import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-animate',
  styleUrl: './animate.scss',
  templateUrl: './animate.html',
})
export class Animate implements AfterViewInit {
  @ViewChild('khWord') khWord!: ElementRef<HTMLElement>;
  @ViewChild('moWord') moWord!: ElementRef<HTMLElement>;
  @ViewChild('resultSlot') resultSlot!: ElementRef<HTMLElement>;

  constructor(private host: ElementRef<HTMLElement>) { }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement.querySelector<HTMLElement>('.equation');
    if (!root) return;

    // 1. Persistent color — safe to do immediately, independent of the font.
    this.applyPersistentHighlight();

    // 2. Wait for Moulpali to actually finish loading before measuring any
    //    positions. Measuring too early gets fallback-font metrics, which
    //    silently sends the flight animation to the wrong spot.
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => this.play(root));
    });
  }

  private applyPersistentHighlight(): void {
    const CSSAny = CSS as any;
    const HighlightCtor = (window as any).Highlight;
    if (!CSSAny.highlights || typeof HighlightCtor !== 'function') {
      return; // unsupported browser — gracefully skip, no error
    }

    const khText = this.khWord.nativeElement.firstChild;
    const moText = this.moWord.nativeElement.firstChild;
    if (!khText || !moText) return;

    const khRange = document.createRange();
    khRange.setStart(khText, 0);
    khRange.setEnd(khText, 3); // ខ + coeng + ម — the whole subscript-stack cluster

    const moRange = document.createRange();
    moRange.setStart(moText, 0);
    moRange.setEnd(moText, 1); // ម alone

    const highlight = new HighlightCtor(khRange, moRange);
    CSSAny.highlights.set('equation-source', highlight);
  }

  private play(root: HTMLElement): void {
    const styles = getComputedStyle(root);
    const departDelay = parseFloat(styles.getPropertyValue('--equation-depart-delay')) * 1000 || 800;
    const flightDuration = parseFloat(styles.getPropertyValue('--equation-flight-duration')) * 1000 || 2500;
    const flightEase = styles.getPropertyValue('--equation-flight-ease').trim() || 'ease';
    const finalColor = styles.getPropertyValue('--equation-final-color').trim() || '#b8860b';
    const arcHeight = parseFloat(styles.getPropertyValue('--equation-arc-height')) || 90;

    const flights = [
      this.animateLetter(this.khWord.nativeElement, 'ខ', this.resultSlot.nativeElement, -arcHeight, departDelay, flightDuration, flightEase, finalColor),
      this.animateLetter(this.moWord.nativeElement, 'ម', this.resultSlot.nativeElement, arcHeight, departDelay, flightDuration, flightEase, finalColor),
    ];

    Promise.all(flights).then(() => {
      root.classList.add('is-combined');
      this.spawnSparkles(this.resultSlot.nativeElement, finalColor);
    });
  }

  private getFirstCharRect(word: HTMLElement): DOMRect {
    const textNode = word.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      return word.getBoundingClientRect();
    }
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    const rects = range.getClientRects();
    return (rects[0] as DOMRect) ?? word.getBoundingClientRect();
  }

  private async animateLetter(
    word: HTMLElement,
    char: string,
    target: HTMLElement,
    arcOffset: number,
    departDelay: number,
    flightDuration: number,
    ease: string,
    color: string
  ): Promise<void> {
    const rect = this.getFirstCharRect(word);

    const overlay = document.createElement('span');
    overlay.className = 'equation-flyer';
    overlay.textContent = char;
    overlay.style.fontSize = getComputedStyle(word).fontSize;
    overlay.style.color = color;
    overlay.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    document.body.appendChild(overlay);

    // A brief pause so the "departure" reads as intentional, not instant.
    await new Promise((resolve) => window.setTimeout(resolve, departDelay));

    const t = target.getBoundingClientRect();
    const sx = rect.left + rect.width / 2;
    const sy = rect.top + rect.height / 2;
    const tx = t.left + t.width / 2;
    const ty = t.top + t.height / 2;
    const cx = (sx + tx) / 2;
    const cy = (sy + ty) / 2 + arcOffset;

    const steps = 8;
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const x = (1 - p) ** 2 * sx + 2 * (1 - p) * p * cx + p ** 2 * tx;
      const y = (1 - p) ** 2 * sy + 2 * (1 - p) * p * cy + p ** 2 * ty;
      const scale = 1 - 0.25 * p;
      const opacity = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15;
      keyframes.push({
        transform: `translate(${x - rect.width / 2}px, ${y - rect.height / 2}px) scale(${scale})`,
        opacity,
      });
    }

    await overlay.animate(keyframes, { duration: flightDuration, easing: ease, fill: 'forwards' }).finished;
    overlay.remove();
  }

  private spawnSparkles(target: HTMLElement, color: string): void {
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 30 + Math.random() * 30;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      const spark = document.createElement('span');
      spark.className = 'equation-spark';
      spark.style.background = `radial-gradient(circle, #fff8dc 0%, ${color} 55%, transparent 75%)`;
      document.body.appendChild(spark);

      const duration = 600 + Math.random() * 400;
      const anim = spark.animate(
        [
          { transform: `translate(${cx}px, ${cy}px) scale(0)`, opacity: 0 },
          { transform: `translate(${cx}px, ${cy}px) scale(1)`, opacity: 1, offset: 0.2 },
          { transform: `translate(${cx + dx}px, ${cy + dy}px) scale(0.2)`, opacity: 0 },
        ],
        { duration, easing: 'ease-out', fill: 'forwards' }
      );
      anim.finished.then(() => spark.remove()).catch(() => spark.remove());
    }
  }
}
