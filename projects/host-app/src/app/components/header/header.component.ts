import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userName = '';
  private routerSub!: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkLoginState();
    
    // Re-check login state whenever route changes (like after login/logout redirect)
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkLoginState();
    });
  }

  checkLoginState() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.isLoggedIn = true;
      const user = JSON.parse(userJson);
      this.userName = user.name || user.username;
    } else {
      this.isLoggedIn = false;
      this.userName = '';
    }
  }

  logout(event: Event) {
    event.preventDefault();
    localStorage.removeItem('currentUser');
    this.checkLoginState();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
