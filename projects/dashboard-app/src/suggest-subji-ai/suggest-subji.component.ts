import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { SuggestSubjiService } from '../app/services/suggest-subji.service';

interface Weather {
  temperature: number;
  condition: string;
}

interface YoutubeVideo {
  title: string;
  videoId: string;
  thumbnail: string;
  url: string;
}

interface ApiSuggestion {
  subji: string;
  reason: string;
  description: string;
  ingredients: string[];
  estimatedCookingTime: string;
  difficulty: string;
  youtube?: YoutubeVideo[];
}

interface ApiResponse {
  success: boolean;
  weather?: Weather;
  suggestions: ApiSuggestion[];
}

@Component({
  selector: 'app-suggest-subji',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './suggest-subji.component.html',
  styleUrls: ['./suggest-subji.component.scss']
})
export class SuggestSubjiComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private suggestService = inject(SuggestSubjiService);

  // Chip separator keys
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  // Location State
  latitude: number | null = null;
  longitude: number | null = null;
  location = '';
  loadingLocation = false;

  // Meal Selection State
  mealPreference: 'Veg' | 'Non Veg' = 'Veg';
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' = 'Dinner';

  // Vegetables State
  vegetables: string[] = [];
  vegInput = '';

  // Form Loading & Success State
  isLoading = false;
  hasSearched = false;

  // API Response States
  weather: Weather | null = null;
  suggestions: ApiSuggestion[] = [];
  activeSuggestionIndex = 0;

  ngOnInit(): void {
    this.mealType = this.calculateDefaultMealType();
  }

  private calculateDefaultMealType(): 'Breakfast' | 'Lunch' | 'Dinner' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Breakfast';
    if (hour >= 12 && hour < 16) return 'Lunch';
    return 'Dinner';
  }

  // Geolocation Handler
  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('📍 Geolocation is not supported by your browser.', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    this.loadingLocation = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.location = ''; // Clear manual input
        this.loadingLocation = false;
        this.snackBar.open('📍 GPS Location fetched successfully!', 'Dismiss', {
          duration: 2500,
          panelClass: ['snackbar-success']
        });
      },
      (error) => {
        this.loadingLocation = false;
        let errorMessage = '📍 Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = '📍 Geolocation permission denied. Please enter a manual location.';
        }
        this.snackBar.open(errorMessage, 'Close', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    );
  }

  // Clear GPS location
  clearGPS(): void {
    this.latitude = null;
    this.longitude = null;
    this.snackBar.open('📍 GPS coordinates cleared.', 'Dismiss', { duration: 1500 });
  }

  // On Manual Input Change: ignore GPS if manual entered
  onManualLocationChange(value: string): void {
    this.location = value;
    if (this.location.trim().length > 0) {
      this.latitude = null;
      this.longitude = null;
    }
  }

  // Chip list addition
  addVegetable(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    this.insertVeg(value);

    // Clear input
    event.chipInput!.clear();
    this.vegInput = '';
  }

  // Manual Add Button click
  addVegBtnClick(): void {
    const value = (this.vegInput || '').trim();
    if (value) {
      this.insertVeg(value);
      this.vegInput = '';
    }
  }

  insertVeg(value: string): void {
    if (!value) return;

    // Duplicate check (case insensitive)
    const exists = this.vegetables.some(
      (v) => v.toLowerCase() === value.toLowerCase()
    );

    if (exists) {
      this.snackBar.open(`⚠️ "${value}" is already added to the list!`, 'Dismiss', {
        duration: 2000,
        panelClass: ['snackbar-warning']
      });
      return;
    }

    this.vegetables.push(value);
  }

  // Chip list removal
  removeVegetable(veg: string): void {
    const index = this.vegetables.indexOf(veg);
    if (index >= 0) {
      this.vegetables.splice(index, 1);
    }
  }

  // Check if form is valid
  isFormValid(): boolean {
    const hasLocation = (this.latitude !== null && this.longitude !== null) || this.location.trim().length > 0;
    const hasVegetables = this.vegetables.length > 0;
    return hasLocation && hasVegetables && !this.isLoading;
  }

  // Search Action
  suggestSubji(): void {
    if (!this.isFormValid()) return;

    this.isLoading = true;
    this.hasSearched = false;
    this.weather = null;
    this.suggestions = [];
    this.activeSuggestionIndex = 0;

    // Map request payload dynamically based on location selection type
    const payload: any = {
      mealType: this.mealType,
      dietPreference: (this.mealPreference === 'Veg' ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
      vegetables: [...this.vegetables]
    };

    if (this.latitude !== null && this.longitude !== null) {
      payload.latitude = this.latitude;
      payload.longitude = this.longitude;
    } else {
      payload.location = this.location.trim();
    }

    // Print payload in browser console
    console.log('🍽️ Suggest My Subji - Search Payload:', payload);

    // Call API Service
    this.suggestService.suggestSubji(payload).subscribe({
      next: (response: ApiResponse) => {
        console.log('🍽️ Suggest My Subji - API Response:', response);
        
        if (response && response.success) {
          this.weather = response.weather || null;
          this.suggestions = response.suggestions || [];
          this.activeSuggestionIndex = 0;

          this.snackBar.open('✨ Suggested the best Subjis based on your ingredients!', 'Great', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
        } else {
          this.snackBar.open('⚠️ API did not return successful suggestions.', 'Close', {
            duration: 4000,
            panelClass: ['snackbar-warning']
          });
        }
        
        this.isLoading = false;
        this.hasSearched = true;
      },
      error: (error) => {
        console.error('🍽️ Suggest My Subji - API Error:', error);
        this.isLoading = false;
        this.hasSearched = true;

        this.snackBar.open('❌ Failed to fetch suggestions from API. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  // Calculate matched ingredients dynamically for a suggestion
  getMatchedIngredients(suggestion: ApiSuggestion): string[] {
    if (!suggestion || !suggestion.ingredients) return [];
    const userIngredients = this.vegetables.map(v => v.toLowerCase().trim());
    return suggestion.ingredients.filter(ing => 
      userIngredients.some(userIng => 
        ing.toLowerCase().includes(userIng) || userIng.includes(ing.toLowerCase())
      )
    );
  }

  // Calculate missing/needed ingredients dynamically for a suggestion
  getNeededIngredients(suggestion: ApiSuggestion): string[] {
    if (!suggestion || !suggestion.ingredients) return [];
    const userIngredients = this.vegetables.map(v => v.toLowerCase().trim());
    return suggestion.ingredients.filter(ing => 
      !userIngredients.some(userIng => 
        ing.toLowerCase().includes(userIng) || userIng.includes(ing.toLowerCase())
      )
    );
  }

  // Calculate match percentage score dynamically
  getMatchPercentage(suggestion: ApiSuggestion): number {
    if (!suggestion || !suggestion.ingredients || suggestion.ingredients.length === 0) return 0;
    const matched = this.getMatchedIngredients(suggestion);
    return Math.round((matched.length / suggestion.ingredients.length) * 100);
  }

  // Assign a matching emoji dynamically based on name
  getEmojiForDish(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('paneer') || n.includes('cheese')) return '🧀';
    if (n.includes('chicken') || n.includes('meat') || n.includes('murgh')) return '🍗';
    if (n.includes('egg') || n.includes('anda')) return '🍳';
    if (n.includes('potato') || n.includes('aloo')) return '🥔';
    if (n.includes('tomato') || n.includes('tamatar')) return '🍅';
    if (n.includes('onion') || n.includes('pyaz')) return '🧅';
    if (n.includes('rice') || n.includes('pulao') || n.includes('biryani')) return '🍚';
    if (n.includes('curry') || n.includes('gravy')) return '🍲';
    if (n.includes('bhurji') || n.includes('scrambled')) return '🍳';
    return '🥗';
  }
}
