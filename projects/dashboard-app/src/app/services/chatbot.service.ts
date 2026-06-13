import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    constructor(private http: HttpClient) { }

    sendMessage(message: string) {
        return this.http.post('http://localhost:3000/api/chat', { message });
    }

    sendMessageStream(message: string): Observable<string> {
        return new Observable<string>((subscriber) => {
            const controller = new AbortController();
            const signal = controller.signal;

            fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message }),
                signal
            })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                if (!reader) {
                    throw new Error('ReadableStream not supported.');
                }

                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        if (trimmedLine.startsWith('data: ')) {
                            const dataContent = trimmedLine.substring(6).trim();
                            if (dataContent === '[DONE]') {
                                subscriber.complete();
                                return;
                            }
                            try {
                                const parsed = JSON.parse(dataContent);
                                if (parsed.chunk) {
                                    subscriber.next(parsed.chunk);
                                } else if (parsed.error) {
                                    subscriber.error(new Error(parsed.error));
                                    return;
                                }
                            } catch (e) {
                                // Ignore json parse errors for non-json lines
                            }
                        }
                    }
                }
                subscriber.complete();
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    subscriber.error(err);
                }
            });

            return () => {
                controller.abort();
            };
        });
    }
}