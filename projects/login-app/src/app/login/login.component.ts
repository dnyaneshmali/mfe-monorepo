import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
})
export class LoginComponent {
    loginForm: FormGroup;
    submitted = false;
    errorMessage: string | null = null;
    isLoading = false;

    constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
        this.loginForm = this.fb.group({
            username: ['', [Validators.required, Validators.minLength(3)]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    get f() { return this.loginForm.controls; }

    async onSubmit() {
        this.submitted = true;
        this.errorMessage = null;

        if (this.loginForm.invalid) {
            return;
        }

        this.isLoading = true;
        try {
            const { username, password } = this.loginForm.value;
            const user = await this.authService.login(username, password);
            
            // Store user details in local storage
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            console.log('Login successful', user);
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            this.errorMessage = error.message;
        } finally {
            this.isLoading = false;
        }
    }
}