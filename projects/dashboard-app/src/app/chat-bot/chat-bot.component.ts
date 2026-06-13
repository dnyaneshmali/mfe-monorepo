import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatbotService } from '../services/chatbot.service';
import { marked } from 'marked';

interface Message {
  role: 'user' | 'bot';
  content: string;
  isStreaming?: boolean;
  htmlContent?: SafeHtml;
}

// Set up marked custom renderer
const renderer = new marked.Renderer();
renderer.code = (token: any) => {
  let code = '';
  let lang = '';
  if (typeof token === 'object') {
    code = token.text || '';
    lang = token.lang || '';
  } else {
    code = token || '';
    lang = '';
  }

  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-block-lang">${lang || 'code'}</span>
        <button class="copy-code-btn" type="button">Copy</button>
      </div>
      <pre><code>${escapedCode}</code></pre>
    </div>
  `;
};

marked.use({ renderer, breaks: true, gfm: true });

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

  constructor(
    private chatbotService: ChatbotService,
    private sanitizer: DomSanitizer
  ) {}

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

    // 2. Create bot message object with streaming state
    const botMsg: Message = {
      role: 'bot',
      content: '',
      isStreaming: true,
      htmlContent: this.sanitizer.bypassSecurityTrustHtml('')
    };
    this.messages.push(botMsg);

    // 3. Call API streaming method
    this.chatbotService.sendMessageStream(messageToSend).subscribe({
      next: (chunk: string) => {
        botMsg.content += chunk;
        const rawHtml = marked.parse(botMsg.content) as string;
        botMsg.htmlContent = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
      },
      error: (error) => {
        console.error(error);
        botMsg.isStreaming = false;
        botMsg.content = 'Something went wrong. Please try again.';
        botMsg.htmlContent = this.sanitizer.bypassSecurityTrustHtml(botMsg.content);
        this.saveChat();
      },
      complete: () => {
        botMsg.isStreaming = false;
        const rawHtml = marked.parse(botMsg.content) as string;
        botMsg.htmlContent = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
        this.saveChat();
      }
    });
  }

  async handleChatClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('copy-code-btn')) {
      const wrapper = target.closest('.code-block-wrapper');
      const codeElement = wrapper?.querySelector('code');
      if (codeElement) {
        const codeText = codeElement.textContent || '';
        try {
          await navigator.clipboard.writeText(codeText);
          target.textContent = 'Copied!';
          target.classList.add('copied');
          setTimeout(() => {
            target.textContent = 'Copy';
            target.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
      }
    }
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
    // Strip htmlContent and isStreaming before storing to clean the state
    const cleanHistory = this.chatHistory.map(chat => 
      chat.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    );
    localStorage.setItem('chatHistory', JSON.stringify(cleanHistory));
  }

  loadFromStorage() {
    const data = localStorage.getItem('chatHistory');
    if (data) {
      const parsedHistory = JSON.parse(data) as Message[][];
      this.chatHistory = parsedHistory.map(chat => 
        chat.map(msg => {
          if (msg.role === 'bot') {
            const rawHtml = marked.parse(msg.content) as string;
            return {
              ...msg,
              htmlContent: this.sanitizer.bypassSecurityTrustHtml(rawHtml)
            };
          }
          return msg;
        })
      );
    }
  }
}