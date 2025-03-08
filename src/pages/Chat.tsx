import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { MessageSquare, Send, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';
import { askQuestionWithContext } from '../services/ai';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface Report {
  id: string;
  userId: string;
  fileName: string;
  date: string;
  summary: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportContext, setReportContext] = useState<string | null>(null);
  const [reportFile, setReportFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  // Load latest report for context
  useEffect(() => {
    const loadLatestReport = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const reportsRef = collection(db, 'reports');
        const q = query(
          reportsRef,
          where('userId', '==', currentUser.uid),
          orderBy('date', 'desc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const latestReport = querySnapshot.docs[0].data() as Report;
          setReportContext(latestReport.summary);
          setReportFile(latestReport.fileName);
          
          // Add initial welcome message
          setMessages([{
            id: Date.now().toString(),
            sender: 'ai',
            text: `Hello! I've analyzed your latest report (${latestReport.fileName}). How can I help you understand it better?`,
            timestamp: new Date(),
          }]);
        } else {
          setMessages([{
            id: Date.now().toString(),
            sender: 'ai',
            text: "You don't have any reports uploaded yet. Please upload a medical report first so I can help answer questions about it.",
            timestamp: new Date(),
          }]);
        }
      } catch (err) {
        console.error('Error loading report:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLatestReport();
  }, [currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !reportContext) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    
    try {
      const aiResponse = await askQuestionWithContext(inputMessage, reportContext);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "I'm sorry, I wasn't able to process your question. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex items-center">
          <MessageSquare className="h-6 w-6 text-indigo-600 mr-2" />
          <h1 className="text-xl font-semibold text-gray-800">Medical Report Assistant</h1>
          {reportFile && (
            <div className="ml-auto flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
              <FileText className="h-4 w-4 mr-1" />
              {reportFile}
            </div>
          )}
        </div>
        
        <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-3/4 rounded-lg px-4 py-2 ${
                        message.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.text}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <div className="border-t p-4">
            <div className="flex items-end space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your medical report..."
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                disabled={!reportContext || loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || !reportContext || loading}
                className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            {!reportContext && (
              <p className="text-sm text-red-500 mt-2">
                Please upload a medical report first to use the chat feature.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
