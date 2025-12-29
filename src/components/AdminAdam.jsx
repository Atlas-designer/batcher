import { useState, useRef, useEffect } from 'react';
import { knowledgeBase, getCategories } from '../data/adamKnowledgeBase';

/**
 * Admin Adam - AI Chatbot for answering admin questions
 */
export default function AdminAdam() {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hi! I'm Admin Adam. Ask me any questions about Cycle to Work, vouchers, cancellations, MAPS, or admin processes and I'll help you find the answer!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Calculate similarity score between user input and a question
   */
  const calculateScore = (userInput, item) => {
    const inputLower = userInput.toLowerCase();
    const inputWords = inputLower.split(/\s+/).filter(w => w.length > 2);

    let score = 0;
    let matchedKeywords = 0;

    // Check keyword matches
    item.keywords.forEach(keyword => {
      if (inputLower.includes(keyword.toLowerCase())) {
        score += 15;
        matchedKeywords++;
      }
    });

    // Check word-by-word matches
    inputWords.forEach(word => {
      item.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
          score += 5;
        }
      });

      // Check question text too
      if (item.question.toLowerCase().includes(word)) {
        score += 3;
      }
    });

    // Bonus for multiple keyword matches
    if (matchedKeywords >= 2) score += 20;
    if (matchedKeywords >= 3) score += 30;

    // Normalize score (max ~100)
    return Math.min(score, 100);
  };

  /**
   * Find best matching answers for user input
   */
  const findMatches = (userInput) => {
    const scored = knowledgeBase.map(item => ({
      ...item,
      score: calculateScore(userInput, item)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.filter(item => item.score > 0).slice(0, 5);
  };

  /**
   * Handle user submitting a question
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      text: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setSuggestions(null);

    // Find matches
    const matches = findMatches(input);

    setTimeout(() => {
      if (matches.length === 0 || matches[0].score < 15) {
        // No good matches
        setMessages(prev => [...prev, {
          type: 'bot',
          text: "I'm sorry, I'm not sure what this means! Try rephrasing your question or browse the categories below.",
          timestamp: new Date()
        }]);
      } else if (matches[0].score >= 50) {
        // High confidence - give direct answer
        setMessages(prev => [...prev, {
          type: 'bot',
          text: matches[0].answer,
          category: matches[0].category,
          timestamp: new Date()
        }]);
      } else if (matches.length >= 1 && matches[0].score >= 20) {
        // Medium confidence - offer suggestions
        const topMatches = matches.slice(0, 3).filter(m => m.score >= 15);
        setSuggestions(topMatches);
        setMessages(prev => [...prev, {
          type: 'bot',
          text: "Did you mean one of these?",
          timestamp: new Date()
        }]);
      } else {
        // Low confidence
        setMessages(prev => [...prev, {
          type: 'bot',
          text: "I'm sorry, I'm not sure what this means! Try rephrasing your question or ask about vouchers, cancellations, LOCs, or admin processes.",
          timestamp: new Date()
        }]);
      }
    }, 500);

    setInput('');
  };

  /**
   * Handle clicking a suggestion
   */
  const handleSuggestionClick = (item) => {
    setSuggestions(null);
    setMessages(prev => [...prev,
      {
        type: 'user',
        text: item.question,
        timestamp: new Date()
      },
      {
        type: 'bot',
        text: item.answer,
        category: item.category,
        timestamp: new Date()
      }
    ]);
  };

  /**
   * Handle clicking a category to see questions
   */
  const handleCategoryClick = (category) => {
    const questions = knowledgeBase.filter(item => item.category === category);
    const questionList = questions.map(q => `• ${q.question}`).join('\n');

    setMessages(prev => [...prev, {
      type: 'bot',
      text: `**${category}** - Here are the questions I can answer:\n\n${questionList}\n\nClick or type any of these questions to get the answer!`,
      timestamp: new Date()
    }]);
  };

  /**
   * Format message text (handle bold with **)
   */
  const formatMessage = (text) => {
    // Split by ** for bold
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  };

  return (
    <div className="admin-adam">
      {/* Header */}
      <div className="adam-header">
        <img src="/robot.GIF" alt="Admin Adam" className="adam-avatar" />
        <div>
          <h2>Admin Adam</h2>
          <p>Your C2W Assistant</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="adam-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`adam-message ${msg.type}`}>
            {msg.type === 'bot' && (
              <img src="/robot.GIF" alt="Adam" className="adam-message-avatar" />
            )}
            <div className="adam-message-content">
              {msg.category && (
                <span className="adam-category-tag">{msg.category}</span>
              )}
              <p style={{ whiteSpace: 'pre-wrap' }}>{formatMessage(msg.text)}</p>
            </div>
          </div>
        ))}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="adam-suggestions">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                className="adam-suggestion-btn"
                onClick={() => handleSuggestionClick(item)}
              >
                {item.question}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Category Quick Access */}
      <div className="adam-categories">
        <p>Browse by category:</p>
        <div className="adam-category-chips">
          {getCategories().slice(0, 6).map((cat, idx) => (
            <button
              key={idx}
              className="adam-category-chip"
              onClick={() => handleCategoryClick(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form className="adam-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me a question..."
          className="adam-input"
        />
        <button type="submit" className="btn btn-primary adam-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}
