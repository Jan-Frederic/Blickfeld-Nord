import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-band',
  imports: [MatCardModule],
  template: `
    <section id="band" class="section">
      <h2>Die Band</h2>
      <p class="lead">
        Blickfeld Nord – das sind drei Freunde aus dem Norden, die seit 2021 zusammen Musik machen.
        Zwischen flirrenden Gitarren, treibenden Drums und deutschen Texten erzählen wir von Fernweh,
        Heimkommen und dem Wind, der einem ins Gesicht bläst.
      </p>
      <div class="grid">
        @for (m of band.members; track m.name) {
          <mat-card appearance="outlined">
            <mat-card-header>
              <div mat-card-avatar class="avatar">{{ m.initials }}</div>
              <mat-card-title>{{ m.name }}</mat-card-title>
              <mat-card-subtitle>{{ m.role }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content><p>{{ m.bio }}</p></mat-card-content>
          </mat-card>
        }
      </div>
    </section>
  `,
  styles: `
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .avatar {
      display: grid; place-items: center; font-weight: 600;
      background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container);
    }
    mat-card-content p { margin-top: 12px; opacity: .85; }
  `,
})
export class Band {
  protected readonly band = inject(BandService);
}
