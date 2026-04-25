import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
    user: any = null;

    constructor(private router: Router) {}

    ngOnInit() {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
            this.user = JSON.parse(userJson);
        } else {
            // Not logged in, redirect to login
            this.router.navigate(['/login']);
        }
    }
}