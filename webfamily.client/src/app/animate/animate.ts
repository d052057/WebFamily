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

  private readonly khFull = 'ខ្មែរ';
  private readonly moFull = 'មន';
  private readonly khHighlightEnd = 3; // ខ + coeng + ម — the whole subscript-stack cluster
  private readonly moHighlightEnd = 1; // ម alone
  private readonly typeSpeed = 180; // ms per character

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const root = this.host.nativeElement.querySelector<HTMLElement>('.equation');
    if (!root) return;

    document.fonts.ready.then(() => {
      requestAnimationFrame(() => this.play(root));
    });
  }

  private async play(root: HTMLElement): Promise<void> {
    const styles = getComputedStyle(root);
    const finalColor = styles.getPropertyValue('--equation-final-color').trim() || '#b8860b';
    const flightDuration =
      parseFloat(styles.getPropertyValue('--equation-flight-duration')) * 1000 || 2500;
    const flightEase = styles.getPropertyValue('--equation-flight-ease').trim() || 'ease';
    const arcHeight = parseFloat(styles.getPropertyValue('--equation-arc-height')) || 90;

    const khEl = this.khWord.nativeElement;
    const moEl = this.moWord.nativeElement;

    // Type both words at once. Each resolves with the permanent, colored
    // overlay it created over its target letter.
    const [khOverlay, moOverlay] = await Promise.all([
      this.typeWord(khEl, this.khFull, this.khHighlightEnd, finalColor),
      this.typeWord(moEl, this.moFull, this.moHighlightEnd, finalColor),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 600)); // brief pause once typed

    // Fly CLONES of the overlays to the result — the originals stay put,
    // so the words never lose their color.
    await Promise.all([
      this.flyOverlayClone(khOverlay, this.resultSlot.nativeElement, -arcHeight, flightDuration, flightEase),
      this.flyOverlayClone(moOverlay, this.resultSlot.nativeElement, arcHeight, flightDuration, flightEase),
    ]);

    root.classList.add('is-combined');
    this.spawnSparkles(this.resultSlot.nativeElement, finalColor);
  }

  /**
   * Types `full` into `el` one character at a time by appending to a single
   * Text node (never replacing/recreating it), so Khmer shaping — e.g. the
   * ខ + coeng + ម subscript stack — stays correct at every step. Once
   * `highlightEnd` characters have been typed, places a PERMANENT colored
   * overlay exactly on top of that span of text. This overlay is a plain,
   * independent DOM element — not a live-tracked Range/Highlight — so it
   * cannot silently collapse or revert the way the Custom Highlight API did.
   */
  private typeWord(
    el: HTMLElement,
    full: string,
    highlightEnd: number,
    color: string
  ): Promise<HTMLElement> {
    return new Promise((resolve) => {
      const textNode = document.createTextNode('');
      el.appendChild(textNode);
      let overlay: HTMLElement | null = null;

      let i = 0;
      const tick = () => {
        textNode.appendData(full[i]);
        i++;

        if (i < full.length) {
          setTimeout(tick, this.typeSpeed);
        } else {
          // The word is fully typed and its layout has settled — including
          // any pre-base vowel reordering (e.g. ែ visually shifting before
          // ខ). Only now is it safe to measure and place the overlay;
          // doing it mid-word left it stranded once later characters
          // reflowed the cluster's position.
          overlay = this.createPersistentOverlay(textNode, highlightEnd, color);
          resolve(overlay as HTMLElement);
        }
      };
      setTimeout(tick, this.typeSpeed);
    });
  }

  /**
   * Measures the on-screen position of textNode[0..end) ONCE (a plain,
   * one-time snapshot — not something the DOM keeps "live"), then places a
   * separate, permanently-colored span exactly on top of it. The real text
   * underneath stays black and untouched; this overlay is purely visual.
   */
  private createPersistentOverlay(textNode: Text, end: number, color: string): HTMLElement {
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, end);
    const rect =
      (range.getClientRects()[0] as DOMRect) ??
      (textNode.parentElement as HTMLElement).getBoundingClientRect();

    const parentEl = textNode.parentElement as HTMLElement;
    const overlay = document.createElement('span');
    overlay.className = 'equation-flyer';
    overlay.textContent = textNode.data.slice(0, end);
    overlay.style.fontSize = getComputedStyle(parentEl).fontSize;
    overlay.style.color = color;
    overlay.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Clones the persistent overlay and arcs the CLONE toward the result
   * slot, leaving the original overlay untouched and in place — so the
   * word's coloring never disappears once the "letter" departs.
   */
  private async flyOverlayClone(
    sourceOverlay: HTMLElement,
    target: HTMLElement,
    arcOffset: number,
    duration: number,
    ease: string
  ): Promise<void> {
    const rect = sourceOverlay.getBoundingClientRect();
    const clone = sourceOverlay.cloneNode(true) as HTMLElement;
    clone.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    document.body.appendChild(clone);

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

    await clone.animate(keyframes, { duration, easing: ease, fill: 'forwards' }).finished;
    clone.remove();
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
