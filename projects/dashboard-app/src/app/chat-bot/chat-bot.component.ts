import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, SecurityContext } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../services/chatbot.service';
import { marked } from 'marked';
import { MarkdownComponent, provideMarkdown } from 'ngx-markdown';
import * as hljs from 'highlight.js';

// Register highlight.js globally for ngx-markdown syntax highlighting
(window as any).hljs = hljs;

interface Message {
  role: 'user' | 'bot';
  content: string;
  isStreaming?: boolean;
}

// SVG Icons as strings for the copy button
const copyIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const checkIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

// Set up marked custom renderer for ngx-markdown
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
        <div class="code-block-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon" style="margin-right: 6px; vertical-align: middle;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span class="code-block-lang">${(lang || 'code').toUpperCase()}</span>
        </div>
        <div class="code-block-actions">
          <button class="action-btn-circle" type="button" aria-label="Code structure">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </button>
          <button class="action-btn" type="button" aria-label="Run code">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <button class="copy-code-btn" type="button" aria-label="Copy code">
            ${copyIconSvg}
          </button>
        </div>
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
  imports: [CommonModule, FormsModule, MarkdownComponent],
  providers: [
    provideMarkdown({
      sanitize: SecurityContext.NONE
    })
  ]
})
export class ChatBotComponent implements OnInit {

  userInput = '';
  messages: Message[] = [];
  chatHistory: Message[][] = [];
  currentChatIndex = -1;
  showScrollButton = false;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

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

    // Scroll to bottom immediately on send
    setTimeout(() => this.scrollToBottom());

    // 2. Create bot message object with streaming state
    const botMsg: Message = {
      role: 'bot',
      content: '',
      isStreaming: true
    };
    this.messages.push(botMsg);

    // 3. Call API streaming method
    this.chatbotService.sendMessageStream(messageToSend).subscribe({
      next: (chunk: string) => {
        botMsg.content += chunk;
        this.scrollToBottomIfNeeded();
      },
      error: (error) => {
        console.error(error);
        botMsg.isStreaming = false;
        botMsg.content = 'Something went wrong. Please try again.';
        this.saveChat();
        this.scrollToBottomIfNeeded();
      },
      complete: () => {
        botMsg.isStreaming = false;
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
      this.chatHistory = JSON.parse(data) as Message[][];
    }
  }
}