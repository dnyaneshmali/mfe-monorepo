import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private usersUrl = 'http://localhost:4201/users.json'; // Point explicitly to the loginApp server where public/users.json is served

  constructor() { }

  async login(username: string, password: string):Promise<any> {
    try {
      const response = await fetch(this.usersUrl);
      if (!response.ok) {
        throw new Error('Failed to load users data');
      }
      
      const users = await response.json();
      
      const user = users.find((u: any) => u.username === username);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.password !== password) {
        throw new Error('Incorrect password');
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
      
    } catch (error: any) {
      // Re-throw so the component can handle it
      throw new Error(error.message || 'An error occurred during login');
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
  }

  getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  }
}
