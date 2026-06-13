import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

// SVG Icons as strings for the copy button
const copyIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C10.8954 4 10 4.89543 10 6H14C14 4.89543 13.1046 4 12 4ZM8.53516 6C8.83161 4.27712 10.306 3 12 3C13.694 3 15.1684 4.27712 15.4648 6H17.25C18.7964 6 20.05 7.2536 20.05 8.8V17.2C20.05 18.7464 18.7964 20 17.25 20H6.75C5.2036 20 3.95 18.7464 3.95 17.2V8.8C3.95 7.2536 5.2036 6 6.75 6H8.53516ZM6.75 7.5C6.03203 7.5 5.45 8.08203 5.45 8.8V17.2C5.45 17.918 6.03203 18.5 6.75 18.5H17.25C17.968 18.5 18.55 17.918 18.55 17.2V8.8C18.55 8.08203 17.968 7.5 17.25 7.5H6.75Z" fill="currentColor"></path></svg>Copy code`;
const checkIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"></path></svg>Copied!`;

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
        <span class="code-block-lang">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;">
            <path d="M9.4 16.6L4.8 12L9.4 7.4L8 6L2 12L8 18L9.4 16.6ZM14.6 16.6L19.2 12L14.6 7.4L16 6L22 12L16 18L14.6 16.6Z" fill="currentColor"></path>
          </svg>${lang || 'code'}
        </span>
        <button class="copy-code-btn" type="button">
          ${copyIconSvg}
        </button>
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
  showScrollButton = false;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

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

    // Scroll to bottom immediately on send
    setTimeout(() => this.scrollToBottom());

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
        this.scrollToBottomIfNeeded();
      },
      error: (error) => {
        console.error(error);
        botMsg.isStreaming = false;
        botMsg.content = 'Something went wrong. Please try again.';
        botMsg.htmlContent = this.sanitizer.bypassSecurityTrustHtml(botMsg.content);
        this.saveChat();
        this.scrollToBottomIfNeeded();
      },
      complete: () => {
        botMsg.isStreaming = false;
        const rawHtml = marked.parse(botMsg.content) as string;
        botMsg.htmlContent = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
        this.saveChat();
        this.scrollToBottomIfNeeded();
      }
    });
  }

  onScroll() {
    if (!this.messagesContainer) return;
    const el = this.messagesContainer.nativeElement;
    const threshold = 150;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    this.showScrollButton = !isAtBottom;
  }

  scrollToBottom() {
    if (!this.messagesContainer) return;
    const el = this.messagesContainer.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    this.showScrollButton = false;
  }

  private scrollToBottomIfNeeded() {
    if (!this.messagesContainer) return;
    const el = this.messagesContainer.nativeElement;
    const threshold = 200;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottom) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }

  async handleChatClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const btn = target.closest('.copy-code-btn') as HTMLButtonElement;
    if (btn) {
      const wrapper = btn.closest('.code-block-wrapper');
      const codeElement = wrapper?.querySelector('code');
      if (codeElement) {
        const codeText = codeElement.textContent || '';
        try {
          await navigator.clipboard.writeText(codeText);
          btn.innerHTML = checkIconSvg;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = copyIconSvg;
            btn.classList.remove('copied');
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
    setTimeout(() => this.scrollToBottom());
  }

  loadChat(index: number) {
    this.currentChatIndex = index;
    this.messages = [...this.chatHistory[index]];
    setTimeout(() => this.scrollToBottom());
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