import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule],
  template: `
    <section id="kontakt" class="section">
      <p class="kicker">Schreibt uns</p>
      <h2>Kontakt & Booking</h2>
      <p class="lead">Ihr wollt uns buchen, habt eine Presseanfrage oder wollt einfach Hallo sagen? Schreibt uns!</p>
      <form [formGroup]="form" (ngSubmit)="send()">
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-Mail</mat-label>
            <input matInput type="email" formControlName="email" />
            @if (form.controls.email.hasError('email')) {
              <mat-error>Bitte eine gültige E-Mail-Adresse angeben.</mat-error>
            }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Anliegen</mat-label>
          <mat-select formControlName="topic">
            <mat-option value="booking">Booking</mat-option>
            <mat-option value="presse">Presse</mat-option>
            <mat-option value="fan">Fanpost</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nachricht</mat-label>
          <textarea matInput rows="5" formControlName="message"></textarea>
        </mat-form-field>
        <mat-checkbox formControlName="newsletter">Newsletter abonnieren</mat-checkbox>
        <div><button mat-flat-button type="submit" [disabled]="form.invalid">Nachricht senden</button></div>
      </form>
    </section>
  `,
  styles: `
    form { display: flex; flex-direction: column; gap: 4px; max-width: 720px; }
    .row { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    mat-checkbox { margin-bottom: 16px; }
  `,
})
export class Contact {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    topic: ['booking', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10)]],
    newsletter: [false],
  });

  protected send(): void {
    if (this.form.invalid) return;
    this.snackBar.open(`Danke, ${this.form.controls.name.value}! Wir melden uns bald.`, 'OK', { duration: 4000 });
    this.form.reset();
  }
}
