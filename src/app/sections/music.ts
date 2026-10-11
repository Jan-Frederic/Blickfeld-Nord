import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BandService, Release } from '../data/band.service';

@Component({
  selector: 'app-music',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatListModule, MatChipsModule],
  template: `
    <section id="musik" class="section">
      <h2>Musik</h2>
      <div class="grid">
        @for (r of band.releases; track r.title) {
          <mat-card appearance="outlined">
            <div class="cover" [style.background]="r.cover">
              <span>{{ r.title }}</span>
            </div>
            <mat-card-header>
              <mat-card-title>{{ r.title }}</mat-card-title>
              <mat-card-subtitle>{{ r.type }} · {{ r.year }} · {{ r.tracks.length }} Songs</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <mat-list dense>
                @for (t of r.tracks; track t.title; let i = $index) {
                  <mat-list-item [class.playing]="isPlaying(r, t.title)" (click)="play(r, t.title)">
                    <mat-icon matListItemIcon>{{ isPlaying(r, t.title) ? 'equalizer' : 'play_circle' }}</mat-icon>
                    <span matListItemTitle>{{ i + 1 }}. {{ t.title }}</span>
                    <span matListItemMeta>{{ t.duration }}</span>
                  </mat-list-item>
                }
              </mat-list>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </section>
  `,
  styles: `
    .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .cover {
      aspect-ratio: 16 / 9; display: grid; place-items: center; border-radius: 12px 12px 0 0;
      font-family: 'Bebas Neue', sans-serif; font-size: 2.6rem; letter-spacing: .08em; color: rgba(255,255,255,.92);
    }
    mat-list-item { cursor: pointer; border-radius: 8px; }
    mat-list-item:hover { background: var(--mat-sys-surface-container-high); }
    .playing { color: var(--mat-sys-primary); }
  `,
})
export class Music {
  protected readonly band = inject(BandService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly current = signal<string | null>(null);

  protected isPlaying(r: Release, title: string): boolean {
    return this.current() === `${r.title}/${title}`;
  }

  protected play(r: Release, title: string): void {
    const key = `${r.title}/${title}`;
    if (this.current() === key) {
      this.current.set(null);
      return;
    }
    this.current.set(key);
    this.snackBar.open(`▶ „${title}“ aus ${r.title} – Hörprobe folgt bald!`, 'OK', { duration: 3000 });
  }
}
