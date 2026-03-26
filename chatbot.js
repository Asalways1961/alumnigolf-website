// ============================================
// ALUMNI GOLF CHATBOT - MAIN LOGIC
// ============================================

// Use var so pages that also declare SUPABASE_URL/sb don't get a clash error
var SUPABASE_URL = 'https://weztrzuxwycypheyiixr.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenRyenV4d3ljeXBoZXlpaXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzYzMTYsImV4cCI6MjA4NzAxMjMxNn0.t6P20qa8QZAMxxi1K0HLRaVJtH7XOmBeL851-ewaAWA';
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// CHATBOT STATE
// ============================================

let chatbotState = {
  isOpen: false,
  sessionId: generateSessionId(),
  conversationId: null,
  chatHistory: [],
  userInfo: { name: '', surname: '', email: '' },
  escalationCount: 0,
  currentPage: getCurrentPage(),
  allFAQs: []
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function getExcludedPages() {
  return ['schools.html', 'divisions.html'];
}

function shouldShowChatbot() {
  const page = getCurrentPage();
  return !getExcludedPages().includes(page);
}

// ============================================
// INITIALIZE CHATBOT
// ============================================

async function initializeChatbot() {
  if (!shouldShowChatbot()) {
    console.log('Chatbot hidden on this page:', getCurrentPage());
    return;
  }

  // Load FAQs from database
  await loadFAQsFromDatabase();
  
  // Create floating button
  createFloatingButton();
  
  // Create chat window
  createChatWindow();
  
  // Initialize session tracking
  initializeSession();
}

// ============================================
// LOAD FAQs FROM DATABASE
// ============================================

async function loadFAQsFromDatabase() {
  try {
    const { data, error } = await sb
      .from('chatbot_faqs')
      .select('*')
      .order('faq_id', { ascending: true });
    
    if (error) {
      console.error('Error loading FAQs:', error);
      // Fallback to local FAQ data if database fails
      chatbotState.allFAQs = getFallbackFAQs();
      return;
    }
    
    chatbotState.allFAQs = data || [];
    console.log('✅ Loaded', chatbotState.allFAQs.length, 'FAQs from database');
  } catch (err) {
    console.error('Failed to load FAQs:', err);
    chatbotState.allFAQs = getFallbackFAQs();
  }
}

// ============================================
// FLOATING BUTTON
// ============================================

function createFloatingButton() {
  const button = document.createElement('div');
  button.id = 'chatbot-floating-btn';
  button.innerHTML = `
    <div class="chatbot-btn-circle">
      <div class="chatbot-btn-text">💬</div>
    </div>
    <div class="chatbot-btn-tooltip">Chat to me</div>
  `;
  button.onclick = toggleChatWindow;
  document.body.appendChild(button);
  
  // Add styles for floating button
  addFloatingButtonStyles();
}

function addFloatingButtonStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #chatbot-floating-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9998;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .chatbot-btn-circle {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #1B3A6B 0%, #2D5A9F 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      border: 3px solid #C89B3C;
    }
    
    .chatbot-btn-circle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }
    
    .chatbot-btn-text {
      font-size: 28px;
      animation: pulse 2s infinite;
    }
    
    .chatbot-btn-tooltip {
      position: absolute;
      bottom: 70px;
      right: 0;
      background: #1B3A6B;
      color: #C89B3C;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    
    #chatbot-floating-btn:hover .chatbot-btn-tooltip {
      opacity: 1;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @media (max-width: 768px) {
      #chatbot-floating-btn {
        bottom: 15px;
        right: 15px;
      }
      
      .chatbot-btn-circle {
        width: 50px;
        height: 50px;
      }
      
      .chatbot-btn-text {
        font-size: 24px;
      }
    }
  `;
  document.head.appendChild(style);
}

function toggleChatWindow() {
  const chatWindow = document.getElementById('chatbot-window');
  if (chatbotState.isOpen) {
    chatWindow.classList.remove('open');
    chatbotState.isOpen = false;
  } else {
    chatWindow.classList.add('open');
    chatbotState.isOpen = true;
    
    // Show first message if first time
    if (chatbotState.chatHistory.length === 0) {
      showFirstMessage();
    }
  }
}

// ============================================
// CHAT WINDOW
// ============================================

function createChatWindow() {
  const windowDiv = document.createElement('div');
  windowDiv.id = 'chatbot-window';
  windowDiv.innerHTML = `
    <div class="chatbot-window-container">
      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-header-left">
          <div class="chatbot-avatar">👨‍🏫</div>
          <div class="chatbot-header-text">
            <div class="chatbot-name">Teacher</div>
            <div class="chatbot-status">Online</div>
          </div>
        </div>
        <button class="chatbot-close-btn" onclick="toggleChatWindow()">✕</button>
      </div>
      
      <!-- Chat Area -->
      <div class="chatbot-chat-area" id="chatbot-messages">
        <!-- Messages will appear here -->
      </div>
      
      <!-- Input Area -->
      <div class="chatbot-input-area">
        <input 
          type="text" 
          id="chatbot-input" 
          class="chatbot-input" 
          placeholder="Ask me anything..." 
          onkeypress="handleChatInput(event)"
        />
        <button class="chatbot-send-btn" onclick="sendChatMessage()">Send</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(windowDiv);
  addChatWindowStyles();
}

function addChatWindowStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #chatbot-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s ease;
    }
    
    #chatbot-window.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    
    .chatbot-window-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8f9fa;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .chatbot-header {
      background: linear-gradient(135deg, #1B3A6B 0%, #2D5A9F 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .chatbot-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .chatbot-avatar {
      font-size: 32px;
    }
    
    .chatbot-header-text {
      display: flex;
      flex-direction: column;
    }
    
    .chatbot-name {
      font-weight: 700;
      font-size: 14px;
    }
    
    .chatbot-status {
      font-size: 11px;
      opacity: 0.9;
      color: #C89B3C;
    }
    
    .chatbot-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .chatbot-close-btn:hover {
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
    }
    
    .chatbot-chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .chatbot-message {
      display: flex;
      margin-bottom: 12px;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .chatbot-message.user {
      justify-content: flex-end;
    }
    
    .chatbot-message.bot {
      justify-content: flex-start;
    }
    
    .chatbot-bubble {
      max-width: 80%;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .chatbot-message.user .chatbot-bubble {
      background: #1B3A6B;
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .chatbot-message.bot .chatbot-bubble {
      background: #e9ecef;
      color: #333;
      border-bottom-left-radius: 4px;
    }
    
    .chatbot-message a {
      color: #C89B3C;
      font-weight: 600;
      text-decoration: none;
    }
    
    .chatbot-message a:hover {
      text-decoration: underline;
    }
    
    .chatbot-rating {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      justify-content: flex-start;
    }
    
    .chatbot-rating-btn {
      background: none;
      border: 1px solid #ddd;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s ease;
    }
    
    .chatbot-rating-btn:hover {
      background: #f0f0f0;
      border-color: #C89B3C;
    }
    
    .chatbot-quick-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    
    .chatbot-quick-btn {
      background: #f0f0f0;
      border: 1px solid #ddd;
      padding: 8px 12px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      font-family: 'DM Sans', sans-serif;
    }
    
    .chatbot-quick-btn:hover {
      background: #C89B3C;
      color: white;
      border-color: #C89B3C;
    }
    
    .chatbot-input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #ddd;
    }
    
    .chatbot-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 10px 14px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      outline: none;
      transition: border-color 0.2s ease;
    }
    
    .chatbot-input:focus {
      border-color: #1B3A6B;
    }
    
    .chatbot-send-btn {
      background: #1B3A6B;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    .chatbot-send-btn:hover {
      background: #C89B3C;
    }
    
    @media (max-width: 480px) {
      #chatbot-window {
        width: calc(100vw - 20px);
        height: 70vh;
        right: 10px;
        bottom: 70px;
      }
      
      .chatbot-bubble {
        max-width: 90%;
      }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// CHAT LOGIC
// ============================================

function showFirstMessage() {
  const messagesDiv = document.getElementById('chatbot-messages');
  messagesDiv.innerHTML = '';
  
  addMessageToChat('bot', "Welcome, I'm Teacher. Happy to assist with your questions.");
  
  // Show search bar
  const searchDiv = document.createElement('div');
  searchDiv.className = 'chatbot-message bot';
  searchDiv.innerHTML = `
    <div class="chatbot-bubble">
      <div style="margin-bottom: 8px; font-weight: 600;">Search FAQs or browse categories:</div>
      <input 
        type="text" 
        id="chatbot-search" 
        class="chatbot-search-input" 
        placeholder="Search or type a question..." 
        onkeypress="if(event.key==='Enter') searchFAQs(this.value)"
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; margin-bottom: 8px;"
      />
      <div class="chatbot-quick-buttons">
        <button class="chatbot-quick-btn" onclick="browseCategory('Registration')">📝 Registration</button>
        <button class="chatbot-quick-btn" onclick="browseCategory('Rules')">📋 Rules</button>
        <button class="chatbot-quick-btn" onclick="browseCategory('Payment')">💳 Payment</button>
        <button class="chatbot-quick-btn" onclick="browseCategory('Portal')">🔓 Portal</button>
        <button class="chatbot-quick-btn" onclick="browseCategory('Divisions')">🏆 Divisions</button>
      </div>
    </div>
  `;
  messagesDiv.appendChild(searchDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addMessageToChat(sender, message) {
  const messagesDiv = document.getElementById('chatbot-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chatbot-message ${sender}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'chatbot-bubble';
  bubble.innerHTML = message;
  
  messageDiv.appendChild(bubble);
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  // Add to chat history
  chatbotState.chatHistory.push({ sender, message, timestamp: new Date() });
}

function handleChatInput(event) {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
}

function sendChatMessage() {
  const input = document.getElementById('chatbot-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  addMessageToChat('user', message);
  input.value = '';
  
  // Search for answer
  const answer = findBestMatch(message);
  
  if (answer.confidence >= 95) {
    // Bot can answer
    addMessageToChat('bot', answer.answer);
    
    // Add links if available
    if (answer.links) {
      const linksDiv = document.createElement('div');
      linksDiv.className = 'chatbot-message bot';
      linksDiv.innerHTML = `<div class="chatbot-bubble">📌 <strong>Helpful links:</strong><br/>${answer.links}</div>`;
      document.getElementById('chatbot-messages').appendChild(linksDiv);
    }
    
    // Add rating
    setTimeout(() => showRating(), 500);
  } else {
    // Need to escalate
    addMessageToChat('bot', "I'm not entirely sure about that. Let me connect you with an admin who can help better. Could you provide your contact information?");
    setTimeout(() => showEscalationForm(), 500);
  }
}

function findBestMatch(userQuestion) {
  const lowerQuestion = userQuestion.toLowerCase();
  let bestMatch = { question: '', answer: "I'm not sure about that. Could you rephrase your question?", confidence: 0, links: '' };
  
  chatbotState.allFAQs.forEach(faq => {
    const questionMatch = calculateSimilarity(lowerQuestion, faq.question.toLowerCase());
    const answerMatch = calculateSimilarity(lowerQuestion, faq.answer.toLowerCase());
    const confidence = Math.max(questionMatch, answerMatch);
    
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        question: faq.question,
        answer: faq.answer,
        confidence: confidence,
        links: faq.referenced_links ? formatLinks(faq.referenced_links) : ''
      };
    }
  });
  
  return bestMatch;
}

function calculateSimilarity(str1, str2) {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  let matches = 0;
  words1.forEach(word => {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  });
  
  return Math.min(100, (matches / Math.max(words1.length, words2.length)) * 100);
}

function formatLinks(linksString) {
  if (!linksString) return '';
  const links = linksString.split(',');
  return links.map(link => {
    const url = link.trim();
    const text = url.split('/').pop();
    return `<a href="${url}" target="_blank">${text}</a>`;
  }).join(' | ');
}

function showRating() {
  const messagesDiv = document.getElementById('chatbot-messages');
  const ratingDiv = document.createElement('div');
  ratingDiv.className = 'chatbot-message bot';
  ratingDiv.innerHTML = `
    <div class="chatbot-bubble">
      Was this answer helpful?
      <div class="chatbot-rating">
        <button class="chatbot-rating-btn" onclick="rateAnswer(true)">👍 Yes</button>
        <button class="chatbot-rating-btn" onclick="rateAnswer(false)">👎 No</button>
      </div>
    </div>
  `;
  messagesDiv.appendChild(ratingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function rateAnswer(helpful) {
  addMessageToChat('bot', helpful ? "Great! Glad I could help. 😊" : "Sorry about that. Would you like to escalate this to an admin?");
  if (!helpful) {
    setTimeout(() => showEscalationForm(), 500);
  }
}

function browseCategory(category) {
  const relevant = chatbotState.allFAQs.filter(faq => faq.category.includes(category));
  if (relevant.length === 0) {
    addMessageToChat('bot', `No FAQs found in the ${category} category.`);
    return;
  }
  
  addMessageToChat('bot', `Here are ${relevant.length} questions about ${category}:`);
  
  relevant.forEach((faq, index) => {
    const btnDiv = document.createElement('div');
    btnDiv.className = 'chatbot-message bot';
    btnDiv.innerHTML = `
      <div class="chatbot-bubble" style="cursor: pointer; background: #e9ecef; padding: 10px; margin: 4px 0;" onclick="displayFAQAnswer('${faq.faq_id}')">
        <strong>${index + 1}. ${faq.question.substring(0, 50)}...</strong>
      </div>
    `;
    document.getElementById('chatbot-messages').appendChild(btnDiv);
  });
}

function displayFAQAnswer(faqId) {
  const faq = chatbotState.allFAQs.find(f => f.faq_id == faqId);
  if (!faq) return;
  
  addMessageToChat('bot', faq.answer);
  if (faq.referenced_links) {
    const linksDiv = document.createElement('div');
    linksDiv.className = 'chatbot-message bot';
    linksDiv.innerHTML = `<div class="chatbot-bubble">📌 <strong>Links:</strong><br/>${formatLinks(faq.referenced_links)}</div>`;
    document.getElementById('chatbot-messages').appendChild(linksDiv);
  }
  setTimeout(() => showRating(), 500);
}

function searchFAQs(query) {
  const results = chatbotState.allFAQs.filter(faq => 
    faq.question.toLowerCase().includes(query.toLowerCase()) ||
    faq.answer.toLowerCase().includes(query.toLowerCase())
  );
  
  if (results.length === 0) {
    addMessageToChat('bot', `No results for "${query}". Would you like me to escalate this to an admin?`);
    setTimeout(() => showEscalationForm(), 500);
    return;
  }
  
  addMessageToChat('bot', `Found ${results.length} matching question(s):`);
  results.forEach((faq, index) => {
    const btnDiv = document.createElement('div');
    btnDiv.className = 'chatbot-message bot';
    btnDiv.innerHTML = `
      <div class="chatbot-bubble" style="cursor: pointer; background: #e9ecef; padding: 10px; margin: 4px 0;" onclick="displayFAQAnswer('${faq.faq_id}')">
        <strong>${index + 1}. ${faq.question}</strong>
      </div>
    `;
    document.getElementById('chatbot-messages').appendChild(btnDiv);
  });
}

function showEscalationForm() {
  // Check rate limiting
  if (chatbotState.escalationCount >= 5) {
    addMessageToChat('bot', "You've reached the maximum escalations for this session. Please try again later or contact admin@alumnigolf.net directly.");
    return;
  }
  
  const messagesDiv = document.getElementById('chatbot-messages');
  const formDiv = document.createElement('div');
  formDiv.className = 'chatbot-message bot';
  formDiv.innerHTML = `
    <div class="chatbot-bubble">
      <div style="margin-bottom: 12px; font-weight: 600;">Connect with Admin</div>
      <div style="margin-bottom: 8px;">
        <input type="text" id="esc-name" placeholder="First name" style="width: 100%; padding: 8px; margin-bottom: 6px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px;" />
        <input type="text" id="esc-surname" placeholder="Surname" style="width: 100%; padding: 8px; margin-bottom: 6px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px;" />
        <input type="email" id="esc-email" placeholder="Email address" style="width: 100%; padding: 8px; margin-bottom: 6px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px;" />
      </div>
      <button class="chatbot-quick-btn" onclick="submitEscalation()" style="width: 100%; background: #1B3A6B; color: white; margin-top: 8px;">Submit</button>
    </div>
  `;
  messagesDiv.appendChild(formDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function submitEscalation() {
  const name = document.getElementById('esc-name').value.trim();
  const surname = document.getElementById('esc-surname').value.trim();
  const email = document.getElementById('esc-email').value.trim();
  
  if (!name || !surname || !email) {
    addMessageToChat('bot', '❌ Please fill in all fields.');
    return;
  }
  
  chatbotState.userInfo = { name, surname, email };
  chatbotState.escalationCount++;
  
  // Save escalation to database
  try {
    const userQuestion = chatbotState.chatHistory[chatbotState.chatHistory.length - 2]?.message || 'No question provided';
    
    const { error } = await sb.from('chatbot_escalations').insert({
      original_question: userQuestion,
      user_name: name,
      user_surname: surname,
      user_email: email,
      escalation_reason: 'User couldn\'t get answer from FAQ'
    });
    
    if (error) {
      console.error('Error saving escalation:', error);
    }
  } catch (err) {
    console.error('Failed to save escalation:', err);
  }
  
  // Send email to admin
  sendEscalationEmail(name, surname, email);
  
  addMessageToChat('bot', `✅ Thank you, ${name}! Your question has been escalated to our admin team at admin@alumnigolf.net. They will respond to you shortly.`);
}

function sendEscalationEmail(name, surname, email) {
  const userQuestion = chatbotState.chatHistory[chatbotState.chatHistory.length - 2]?.message || 'No question provided';
  const emailBody = `
    Chatbot Escalation:
    
    Name: ${name} ${surname}
    Email: ${email}
    Page: ${chatbotState.currentPage}
    
    Original Question:
    ${userQuestion}
    
    Please respond to: ${email}
  `;
  
  // This would typically be handled by a backend service
  // For now, log it
  console.log('📧 Escalation Email:', emailBody);
}

function initializeSession() {
  // Track session for rate limiting
  const { data, error } = sb
    .from('chatbot_sessions')
    .insert({ session_id: chatbotState.sessionId, escalation_count: 0 })
    .select();
  
  if (error) {
    console.log('Session tracking note:', error);
  }
}

// ============================================
// FALLBACK FAQ DATA (if database fails)
// ============================================

function getFallbackFAQs() {
  // Empty array - will be populated from database
  // If database fails, provide minimal FAQs
  return [
    {
      faq_id: 1,
      question: "How do I register?",
      answer: "Visit our registration page at https://www.alumnigolf.net/register.html to create your account.",
      category: "Registration",
      confidence_level: 95,
      referenced_links: "https://www.alumnigolf.net/register.html"
    }
  ];
}

// ============================================
// START CHATBOT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  initializeChatbot();
});
