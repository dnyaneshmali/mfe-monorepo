import { Component } from "@angular/core";
import { ChatbotService } from "../services/chatbot.service";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-chat-bot',
    templateUrl: './chat-bot.component.html',
    styleUrls: ['./chat-bot.component.css'],
    imports: [CommonModule, FormsModule],
})
export class ChatbotComponent {
    message: string = '';
    reply: string = '';
    constructor(private chatbotService: ChatbotService) { }

    sendMessage() {
        this.chatbotService.sendMessage(this.message).subscribe({
            next: (response: any) => {
                this.reply = response.reply;
            },
            error: (error) => {
                console.error(error);
            }
        });
    }
}