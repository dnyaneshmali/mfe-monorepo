import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ChatbotComponent } from './chat-bot/chat-bot.component';

export const routes: Routes = [
    {
        path: '',
        component: DashboardComponent
    },
    {
        path: 'chatbot',
        component: ChatbotComponent
    }
];
