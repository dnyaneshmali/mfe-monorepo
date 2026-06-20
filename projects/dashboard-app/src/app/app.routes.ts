import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ChatBotComponent } from './chat-bot/chat-bot.component';

export const routes: Routes = [
    {
        path: '',
        component: DashboardComponent
    },
    {
        path: 'chatbot',
        component: ChatBotComponent
    },
    {
        path: 'suggest-subji',
        loadComponent: () => import('../suggest-subji-ai/suggest-subji.component').then(m => m.SuggestSubjiComponent)
    }
];
