import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../services/chatbot.service';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

@Component({
  selector: 'app-chat-bot',
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.css'],
  imports: [CommonModule, FormsModule],
})
export class ChatBotComponent implements OnInit {

  userInput = '';
  messages: Message[] = [];
  chatHistory: Message[][] = [];
  currentChatIndex = -1;

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit() {
    this.loadFromStorage();
  }

  sendMessage() {
  if (!this.userInput?.trim()) return;

  const userMsg: Message = {
    role: 'user',
    content: this.userInput
  };

  // 1. Push user message to UI
  this.messages.push(userMsg);

  const messageToSend = this.userInput;
  this.userInput = '';

  // 2. Optional: show loader message
  const loadingMsg: Message = {
    role: 'bot',
    content: 'Typing...'
  };
  this.messages.push(loadingMsg);

  // 3. Call API
  this.chatbotService.sendMessage(messageToSend).subscribe({
    next: (response: any) => {
      // Remove "Typing..."
      this.messages.pop();

      const botMsg: Message = {
        role: 'bot',
        content: response.reply
      };

      // 4. Push bot response
      this.messages.push(botMsg);

      // 5. Save chat
      this.saveChat();
    },
    error: (error) => {
      console.error(error);

      // Remove loader
      this.messages.pop();

      this.messages.push({
        role: 'bot',
        content: 'Something went wrong. Please try again.'
      } as Message);
    }
  });
}

  newChat() {
    if (this.messages.length) {
      this.chatHistory.push([...this.messages]);
    }
    this.messages = [];
    this.currentChatIndex = this.chatHistory.length;
    this.saveToStorage();
  }

  loadChat(index: number) {
    this.currentChatIndex = index;
    this.messages = [...this.chatHistory[index]];
  }

  saveChat() {
    if (this.currentChatIndex >= 0) {
      this.chatHistory[this.currentChatIndex] = [...this.messages];
    } else {
      this.chatHistory.push([...this.messages]);
      this.currentChatIndex = this.chatHistory.length - 1;
    }
    this.saveToStorage();
  }

  saveToStorage() {
    localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
  }

  loadFromStorage() {
    const data = localStorage.getItem('chatHistory');
    if (data) {
      this.chatHistory = JSON.parse(data);
    }
  }
}