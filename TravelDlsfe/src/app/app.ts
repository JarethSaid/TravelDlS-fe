import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InteractionComponent } from './shared/components/interaction.ts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InteractionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('TravelDLS');
}
