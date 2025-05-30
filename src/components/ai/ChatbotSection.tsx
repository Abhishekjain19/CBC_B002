import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Send, User, Bot } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getAIResponse, AIMessage } from '@/utils/openRouterApi';
import { SpeechRecognitionType, SpeechRecognitionEvent } from '@/types/speechRecognition';
import { useNavigate } from 'react-router-dom';
import { useCareerAdvice } from './CareerAdviceContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatbotSection = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI learning assistant. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const { addSearch, showCareerModal, careerPaths, topicTrend, setShowCareerModal } = useCareerAdvice();
  const navigate = useNavigate();

  // Speech recognition function
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Properly handle browser compatibility
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          setIsListening(true);
          toast({
            title: "Listening...",
            description: "Please speak clearly.",
          });
        };
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const speechResult = event.results[0][0].transcript;
          setInput(speechResult);
          setIsListening(false);
        };
        
        recognition.onerror = () => {
          setIsListening(false);
          toast({
            title: "Error",
            description: "Speech recognition error. Please try again.",
            variant: "destructive"
          });
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.start();
      }
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive"
      });
    }
  };

  // Helper to extract topic from user message (simple keyword extraction)
  const extractTopic = (text: string) => {
    // Naive: use first 2-3 significant words
    return text
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 2)
      .join(' ');
  };

  // Handle sending messages
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    // Track topics (shared)
    addSearch(userMessage.content);
    
    try {
      // Convert chat history to format expected by OpenRouter API
      const messageHistory: AIMessage[] = [
        { role: 'system', content: 'You are a helpful AI learning assistant for ThinkSpark educational platform. Provide concise, accurate, and detailed answers to help students learn. Please provide a detailed answer of at least 7-8 lines.' },
        ...messages.map(msg => ({ 
          role: msg.role as 'user' | 'assistant', 
          content: msg.content 
        })),
        { role: 'user', content: userMessage.content }
      ];
      
      // Get AI response using OpenRouter
      const response = await getAIResponse(messageHistory);
      
      // Add AI message
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Use useEffect for side effects
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-thinksparkPurple-300 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={startListening}
                disabled={isListening || isProcessing}
                className={isListening ? "bg-red-100" : ""}
              >
                <Mic className={`h-5 w-5 ${isListening ? "text-red-500" : ""}`} />
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isProcessing}
                className="flex-1"
              />
              
              <Button 
                type="submit" 
                disabled={!input.trim() || isProcessing}
                className="bg-thinksparkPurple-300 hover:bg-thinksparkPurple-400"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>

          {/* Modal for career suggestion */}
          {showCareerModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
                <h3 className="text-lg font-bold mb-2">Career Paths Related to "{topicTrend}"</h3>
                <ul className="mb-4 list-disc pl-5">
                  {careerPaths.map((path, i) => <li key={i}>{path}</li>)}
                </ul>
                <p className="mb-4">Do you want to build a resume for this path?</p>
                <div className="flex gap-2">
                  <Button onClick={() => { setShowCareerModal(false); navigate('/resume-builder'); }} className="bg-thinksparkPurple-300 hover:bg-thinksparkPurple-400">Yes, Build Resume</Button>
                  <Button variant="outline" onClick={() => setShowCareerModal(false)}>No, Thanks</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatbotSection;
