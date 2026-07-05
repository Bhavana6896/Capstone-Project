document.addEventListener('DOMContentLoaded', () => {
  const trackerForm = document.getElementById('tracker-form');
  const dateInput = document.getElementById('log-date');
  const historyContainer = document.getElementById('history-container');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const notificationBar = document.getElementById('notification-bar');
  const latestScoreContainer = document.getElementById('latest-score-container');
  const submitBtn = document.getElementById('submit-btn');

  // Define our category configuration
  const CATEGORIES = {
    emotional_well_being: {
      title: '💜 Emotional Well-being',
      items: {
        called_friend_family: 'Called a friend/family',
        spent_time_loved_one: 'Spent time with loved one'
      }
    },
    physical_fitness: {
      title: '⚡ Physical Fitness',
      items: {
        exercised: 'Exercised',
        went_for_walk: 'Went for a walk'
      }
    },
    mental_resilience: {
      title: '🧘 Mental Resilience',
      items: {
        washed_dishes: 'Washed dishes',
        cleaned_house: 'Cleaned house',
        journaled: 'Journaled'
      }
    },
    financial_health: {
      title: '🌱 Financial Health',
      items: {
        work_task_done: 'Work task done',
        no_impulse_spend: 'No impulse spend'
      }
    }
  };

  // Set default date to today's date in local time
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  dateInput.value = getLocalDateString();

  // Load and display entries
  let logs = JSON.parse(localStorage.getItem('mood_tracker_logs')) || [];
  renderHistory();
  
  // Show the most recent log on page load so the AI suggestion is visible
  if (logs.length > 0) {
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    renderLatestScore(sortedLogs[0]);
  }

  // Show a status notification
  const showNotification = (message, type = 'success') => {
    notificationBar.textContent = message;
    notificationBar.className = `notification ${type}`;
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      notificationBar.style.display = 'none';
    }, 4000);
  };

  // Helper: calculate scoring values for a given entry
  function calculateEntryScores(entry) {
    let totalChecked = 0;
    const categoryBreakdown = {};
    let minChecked = Infinity;
    let lowestCategoryTitle = "";

    Object.keys(CATEGORIES).forEach(categoryKey => {
      const categoryConfig = CATEGORIES[categoryKey];
      const categoryData = entry[categoryKey] || {};
      
      let categoryCheckedCount = 0;
      const categoryTotalCount = Object.keys(categoryConfig.items).length;

      Object.keys(categoryConfig.items).forEach(itemKey => {
        if (categoryData[itemKey] === true) {
          categoryCheckedCount++;
        }
      });

      categoryBreakdown[categoryKey] = {
        checked: categoryCheckedCount,
        total: categoryTotalCount,
        title: categoryConfig.title
      };

      totalChecked += categoryCheckedCount;

      // Track lowest category. Lowest score wins.
      // Tie breaker: picks first matching category
      if (categoryCheckedCount < minChecked) {
        minChecked = categoryCheckedCount;
        lowestCategoryTitle = categoryConfig.title.split(' ').slice(1).join(' ');
      }
    });

    const overallScore = Math.min(5, 1 + totalChecked);

    return {
      overallScore,
      categoryBreakdown,
      lowestCategoryTitle
    };
  }

  // Fetch real AI Suggestion from our Express backend
  async function getAISuggestion(score, lowestCategory) {
    try {
      const savedKey = localStorage.getItem('bhavana_gemini_api_key') || '';
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': savedKey
        },
        body: JSON.stringify({ score, lowestCategory })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suggestion');
      }
      
      return data.suggestion;
    } catch (err) {
      console.error("AI fetch error:", err);
      throw err; // will be caught by the calling function
    }
  }

  // Helper: Animate the score badge counting up
  function animateScoreBadge() {
    const badge = latestScoreContainer.querySelector('.score-badge');
    if (!badge) return;
    
    const text = badge.textContent;
    const match = text.match(/Overall:\s*(\d+)\s*\/\s*5/);
    if (!match) return;

    const finalScore = parseInt(match[1], 10);
    let current = 1;
    
    badge.textContent = `Overall: 1 / 5`;
    badge.style.transform = 'scale(0.95)';
    badge.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    const interval = setInterval(() => {
      if (current >= finalScore) {
        clearInterval(interval);
        badge.textContent = `Overall: ${finalScore} / 5`;
        badge.style.transform = 'scale(1.1)';
        setTimeout(() => {
          badge.style.transform = 'scale(1)';
        }, 150);
      } else {
        current++;
        badge.textContent = `Overall: ${current} / 5`;
        badge.style.transform = `scale(${0.95 + (current * 0.03)})`;
      }
    }, 70);
  }

  // Helper: Render the score analysis display card
  function renderLatestScore(entry) {
    if (!entry) {
      latestScoreContainer.style.display = 'none';
      latestScoreContainer.innerHTML = '';
      return;
    }

    const scores = calculateEntryScores(entry);

    let breakdownHTML = '';
    Object.keys(scores.categoryBreakdown).forEach(key => {
      const info = scores.categoryBreakdown[key];
      breakdownHTML += `
        <div class="score-category-item">
          <div class="score-category-name">${info.title}</div>
          <div class="score-category-value">${info.checked} / ${info.total} checked</div>
        </div>
      `;
    });

    latestScoreContainer.innerHTML = `
      <div class="score-card-header">
        <div class="score-title-wrapper">
          <h3>Daily Score Summary</h3>
          <p>Calculated for ${formatDisplayDate(entry.date)}</p>
        </div>
        <div class="score-display">
          <span class="score-badge">Overall: ${scores.overallScore} / 5</span>
        </div>
      </div>
      <div class="score-breakdown-grid">
        ${breakdownHTML}
      </div>
      <div class="lowest-category-notice">
        <span>⚠️ Focus Area:</span>
        <span class="highlight">${scores.lowestCategoryTitle}</span>
        <span>has the lowest count of completed actions.</span>
      </div>
      <div id="ai-suggestion-box" class="ai-suggestion-card">
        <div class="ai-suggestion-loader">
          <span class="pulse-dot"></span>
          <span>Bhavana AI is generating a suggestion...</span>
        </div>
      </div>
    `;
    latestScoreContainer.style.display = 'block';

    // Call the AI agent asynchronously
    getAISuggestion(scores.overallScore, scores.lowestCategoryTitle)
      .then(suggestion => {
        const suggestionBox = document.getElementById('ai-suggestion-box');
        if (suggestionBox) {
          suggestionBox.innerHTML = `
            <span class="ai-suggestion-icon">💡</span>
            <div class="ai-suggestion-content">
              <span class="ai-suggestion-title">AI Suggestion</span>
              <p class="ai-suggestion-text">${suggestion}</p>
            </div>
          `;
          suggestionBox.classList.add('loaded');
        }
      })
      .catch(error => {
        console.error("AI Suggestion error:", error);
        const suggestionBox = document.getElementById('ai-suggestion-box');
        if (suggestionBox) {
          suggestionBox.innerHTML = `
            <span class="ai-suggestion-icon">💡</span>
            <div class="ai-suggestion-content">
              <span class="ai-suggestion-title">AI Suggestion</span>
              <p class="ai-suggestion-text">Keep focusing on your daily habits! You're doing great.</p>
            </div>
          `;
          suggestionBox.classList.add('loaded');
        }
      });
  }

  // Helper: Calculate and render monthly stats progress card
  function renderMonthlyProgress() {
    const container = document.getElementById('monthly-progress-container');
    if (!container) return;

    const today = new Date();
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthName = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // Filter logs matching current year and month (YYYY-MM)
    const currentMonthEntries = logs.filter(entry => entry.date.startsWith(currentMonthPrefix));

    if (currentMonthEntries.length === 0) {
      container.innerHTML = `
        <div class="monthly-progress-header">
          <h3>Progress for ${currentMonthName}</h3>
        </div>
        <p class="no-monthly-stats">No logs recorded for this month yet. Log habits to see your monthly trends!</p>
      `;
      return;
    }

    let totalScoreSum = 0;
    let daysGe3 = 0;

    currentMonthEntries.forEach(entry => {
      const scores = calculateEntryScores(entry);
      totalScoreSum += scores.overallScore;
      if (scores.overallScore >= 3) {
        daysGe3++;
      }
    });

    const avgScore = (totalScoreSum / currentMonthEntries.length).toFixed(1);
    const avgPercentage = Math.min(100, (avgScore / 5) * 100);
    const hitRatePercentage = ((daysGe3 / currentMonthEntries.length) * 100).toFixed(0);

    container.innerHTML = `
      <div class="monthly-progress-header">
        <h3>Progress for ${currentMonthName}</h3>
        <span class="monthly-stat-badge">Avg Score: ${avgScore} / 5</span>
      </div>
      
      <div class="progress-bar-wrapper">
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width: ${avgPercentage}%"></div>
        </div>
        <div class="progress-bar-labels">
          <span>Score: 1.0</span>
          <span>Average Score Progress</span>
          <span>5.0</span>
        </div>
      </div>

      <div class="monthly-stats-row">
        <div class="monthly-stat-card">
          <span class="monthly-stat-val">${daysGe3} / ${totalDaysInMonth}</span>
          <span class="monthly-stat-lbl">days in month ≥ 3</span>
        </div>
        <div class="monthly-stat-card">
          <span class="monthly-stat-val">${currentMonthEntries.length}</span>
          <span class="monthly-stat-lbl">total days logged</span>
        </div>
        <div class="monthly-stat-card">
          <span class="monthly-stat-val">${hitRatePercentage}%</span>
          <span class="monthly-stat-lbl">logged hit-rate (≥ 3)</span>
        </div>
      </div>
    `;
  }

  // Form submit handler
  trackerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedDate = dateInput.value;
    if (!selectedDate) {
      showNotification('Please select a valid date.', 'error');
      return;
    }

    // Capture the state of all checkboxes structured by category
    const dailyEntry = {
      date: selectedDate
    };

    Object.keys(CATEGORIES).forEach(categoryKey => {
      dailyEntry[categoryKey] = {};
      Object.keys(CATEGORIES[categoryKey].items).forEach(itemKey => {
        const checkbox = document.querySelector(`input[name="${categoryKey}"][value="${itemKey}"]`);
        dailyEntry[categoryKey][itemKey] = checkbox ? checkbox.checked : false;
      });
    });

    // Visual transition effect on submit button
    submitBtn.classList.add('submitting');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Entries...';

    // Delay writing to simulate a satisfying transition
    setTimeout(() => {
      submitBtn.classList.remove('submitting');
      submitBtn.disabled = false;
      submitBtn.textContent = "Log Today's Entries";

      // Check if an entry for this date already exists
      const existingIndex = logs.findIndex(entry => entry.date === selectedDate);
      if (existingIndex !== -1) {
        logs[existingIndex] = dailyEntry;
        showNotification(`Log updated for ${formatDisplayDate(selectedDate)}.`);
      } else {
        logs.push(dailyEntry);
        showNotification(`Log saved for ${formatDisplayDate(selectedDate)}.`);
      }

      // Save to localStorage
      saveLogs();

      // Render new score calculation and update history view
      renderLatestScore(dailyEntry);
      renderHistory();
      resetCheckboxes();

      // Smooth scroll to the result summary card
      latestScoreContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      animateScoreBadge();
    }, 600);
  });

  // Helper to format date for display (e.g. "July 5, 2026")
  function formatDisplayDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Clear checkboxes
  function resetCheckboxes() {
    const checkboxes = trackerForm.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  }

  // Save logs to local storage
  function saveLogs() {
    localStorage.setItem('mood_tracker_logs', JSON.stringify(logs));
  }

  // Re-open and edit a logged entry
  window.editEntry = (date) => {
    const entry = logs.find(log => log.date === date);
    if (!entry) return;

    // Load values
    dateInput.value = entry.date;
    Object.keys(CATEGORIES).forEach(categoryKey => {
      const categoryConfig = CATEGORIES[categoryKey];
      const categoryData = entry[categoryKey] || {};
      Object.keys(categoryConfig.items).forEach(itemKey => {
        const checkbox = document.querySelector(`input[name="${categoryKey}"][value="${itemKey}"]`);
        if (checkbox) {
          checkbox.checked = !!categoryData[itemKey];
        }
      });
    });

    // Scroll up smoothly to the form
    trackerForm.scrollIntoView({ behavior: 'smooth' });
    showNotification(`Loaded entry for ${formatDisplayDate(date)} for editing.`, 'success');
  };

  // Delete individual entry with user confirmation
  window.deleteEntry = (date) => {
    const confirmed = confirm(`Are you sure you want to delete the log for ${formatDisplayDate(date)}?`);
    if (!confirmed) return;

    logs = logs.filter(entry => entry.date !== date);
    saveLogs();
    
    // Hide latest score card if the deleted log was currently active on it
    const activeScoreHeader = latestScoreContainer.querySelector('p');
    if (activeScoreHeader && activeScoreHeader.textContent.includes(formatDisplayDate(date))) {
      renderLatestScore(null);
    }

    renderHistory();
    showNotification(`Log deleted for ${formatDisplayDate(date)}.`, 'error');
  };

  // Clear all entries with confirmation
  clearAllBtn.addEventListener('click', () => {
    if (logs.length === 0) return;
    if (confirm('Are you sure you want to clear all logged history? This action cannot be undone.')) {
      logs = [];
      saveLogs();
      renderLatestScore(null);
      renderHistory();
      showNotification('All history logs cleared.', 'error');
    }
  });

  // Render entry logs to history section
  function renderHistory() {
    historyContainer.innerHTML = '';
    
    // Refresh monthly stats card
    renderMonthlyProgress();

    if (logs.length === 0) {
      historyContainer.innerHTML = `<div class="no-entries">No logs saved yet. Submit the form above to add one!</div>`;
      return;
    }

    // Sort entries by date descending (newest first)
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

    sortedLogs.forEach(entry => {
      const entryCard = document.createElement('div');
      entryCard.className = 'entry-card';

      // Meta row with date/score and actions
      const metaRow = document.createElement('div');
      metaRow.className = 'entry-meta';
      
      const metaLeft = document.createElement('div');
      metaLeft.className = 'entry-score-indicator';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'entry-date';
      dateSpan.textContent = formatDisplayDate(entry.date);
      
      const scoreInfo = calculateEntryScores(entry);
      const scoreBadge = document.createElement('span');
      scoreBadge.className = 'entry-score-badge';
      scoreBadge.textContent = `Score: ${scoreInfo.overallScore}/5`;
      
      metaLeft.appendChild(dateSpan);
      metaLeft.appendChild(scoreBadge);
      
      // Action buttons: Edit and Delete
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'entry-actions-wrapper';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-entry-btn';
      editBtn.innerHTML = '✏️ Edit';
      editBtn.title = 'Edit this entry';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        window.editEntry(entry.date);
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-entry-btn';
      deleteBtn.innerHTML = '🗑️ Delete';
      deleteBtn.title = 'Delete this entry';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        window.deleteEntry(entry.date);
      };

      actionsWrapper.appendChild(editBtn);
      actionsWrapper.appendChild(deleteBtn);

      metaRow.appendChild(metaLeft);
      metaRow.appendChild(actionsWrapper);
      entryCard.appendChild(metaRow);

      // Categories summary grid
      const categoriesGrid = document.createElement('div');
      categoriesGrid.className = 'entry-categories';

      Object.keys(CATEGORIES).forEach(categoryKey => {
        const categoryConfig = CATEGORIES[categoryKey];
        const categoryData = entry[categoryKey] || {};
        const catScoreInfo = scoreInfo.categoryBreakdown[categoryKey];

        const catSummary = document.createElement('div');
        catSummary.className = 'entry-category-summary';

        const catTitle = document.createElement('div');
        catTitle.className = 'entry-category-title';
        catTitle.textContent = `${categoryConfig.title} (${catScoreInfo.checked}/${catScoreInfo.total})`;
        catSummary.appendChild(catTitle);

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'entry-item-tags';

        // Add visual indicator tag for each item
        Object.keys(categoryConfig.items).forEach(itemKey => {
          const itemLabel = categoryConfig.items[itemKey];
          const isChecked = !!categoryData[itemKey];

          const tag = document.createElement('span');
          tag.className = `tag ${isChecked ? 'checked' : ''}`;
          tag.textContent = `${isChecked ? '✓' : '✗'} ${itemLabel}`;
          tagsContainer.appendChild(tag);
        });

        catSummary.appendChild(tagsContainer);
        categoriesGrid.appendChild(catSummary);
      });

      entryCard.appendChild(categoriesGrid);

      // Add Area of Focus Banner to history card
      const lowestBanner = document.createElement('div');
      lowestBanner.className = 'entry-lowest-banner';
      lowestBanner.innerHTML = `⚠️ <strong>Lowest Area:</strong> ${scoreInfo.lowestCategoryTitle}`;
      entryCard.appendChild(lowestBanner);

      entryCard.onclick = (e) => {
        // Prevent trigger if they clicked edit or delete
        if (!editBtn.contains(e.target) && !deleteBtn.contains(e.target)) {
          renderLatestScore(entry);
          animateScoreBadge();
          latestScoreContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      historyContainer.appendChild(entryCard);
    });
  }

  // ==========================================
  // Chatbot Widget Logic
  // ==========================================
  const chatbotFab = document.getElementById('chatbot-fab');
  const chatbotPanel = document.getElementById('chatbot-panel');
  const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
  const chatbotSettingsBtn = document.getElementById('chatbot-settings-btn');
  const chatbotSettings = document.getElementById('chatbot-settings');
  const chatbotApiKeyInput = document.getElementById('chatbot-api-key');
  const chatbotSaveKeyBtn = document.getElementById('chatbot-save-key-btn');
  const chatbotForm = document.getElementById('chatbot-form');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotSendBtn = document.getElementById('chatbot-send-btn');

  let chatHistory = JSON.parse(localStorage.getItem('bhavana_chat_history')) || [];

  // Load saved API key on startup
  const savedApiKey = localStorage.getItem('bhavana_gemini_api_key') || '';
  if (savedApiKey) {
    chatbotApiKeyInput.value = savedApiKey;
  }

  // Initialize UI with saved history
  if (chatHistory.length > 0) {
    // Clear default greeting if we have history
    chatbotMessages.innerHTML = '';
    chatHistory.forEach(msg => appendMessage(msg.text, msg.role, false));
  } else {
    // Save the default initial greeting to history
    chatHistory.push({ role: 'ai', text: "Hi, I'm Bhavana. Your well-being assistant." });
    saveChatHistory();
  }

  // Toggle Chat Panel
  chatbotFab.addEventListener('click', () => {
    chatbotPanel.classList.remove('hidden');
    chatbotFab.style.transform = 'scale(0)';
    setTimeout(() => chatbotInput.focus(), 300);
    scrollToBottom();
  });

  chatbotCloseBtn.addEventListener('click', () => {
    chatbotPanel.classList.add('hidden');
    chatbotFab.style.transform = '';
  });

  // Toggle Settings Panel
  chatbotSettingsBtn.addEventListener('click', () => {
    chatbotSettings.classList.toggle('hidden');
    scrollToBottom();
  });

  // Save API Key
  chatbotSaveKeyBtn.addEventListener('click', () => {
    const key = chatbotApiKeyInput.value.trim();
    localStorage.setItem('bhavana_gemini_api_key', key);
    chatbotSettings.classList.add('hidden');
    showNotification('Gemini API key saved successfully.', 'success');
  });

  // Handle Form Submission
  chatbotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatbotInput.value.trim();
    if (!message) return;

    // Display user message
    appendMessage(message, 'user');
    chatHistory.push({ role: 'user', text: message });
    saveChatHistory();
    
    chatbotInput.value = '';
    chatbotSendBtn.disabled = true;

    // Show loading indicator
    const loaderId = appendLoader();

    try {
      const savedKey = localStorage.getItem('bhavana_gemini_api_key') || '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': savedKey
        },
        body: JSON.stringify({ message, history: chatHistory })
      });

      const data = await response.json();
      removeLoader(loaderId);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Display AI response
      appendMessage(data.reply, 'ai');
      chatHistory.push({ role: 'ai', text: data.reply });
      saveChatHistory();

    } catch (error) {
      console.error('Chat error:', error);
      removeLoader(loaderId);
      let friendlyMessage = 'Sorry, I encountered an error. Please check your API key and try again.';
      if (error.message.includes('Quota') || error.message.includes('limit') || error.message.includes('429') || error.message.includes('ResourceExhausted')) {
        friendlyMessage = 'You have exceeded the Gemini API rate limit. Please wait a moment before sending another message.';
      } else if (error.message.includes('GEMINI_API_KEY') || error.message.includes('API key')) {
        friendlyMessage = `I encountered an issue: ${error.message} Please set your Gemini API key by clicking the gear icon (⚙️) above.`;
      }
      appendMessage(friendlyMessage, 'ai');
    } finally {
      chatbotSendBtn.disabled = false;
      chatbotInput.focus();
    }
  });

  // Helper Functions
  function appendMessage(text, role, animate = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}-message`;
    if (!animate) msgDiv.style.animation = 'none';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    msgDiv.appendChild(contentDiv);
    chatbotMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  function appendLoader() {
    const id = 'loader-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ai-message';
    msgDiv.id = id;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span class="pulse-dot"></span><span class="pulse-dot" style="animation-delay:0.2s; margin:0 4px;"></span><span class="pulse-dot" style="animation-delay:0.4s"></span>';
    contentDiv.style.display = 'flex';
    contentDiv.style.padding = '12px 16px';
    
    msgDiv.appendChild(contentDiv);
    chatbotMessages.appendChild(msgDiv);
    scrollToBottom();
    return id;
  }

  function removeLoader(id) {
    const loader = document.getElementById(id);
    if (loader) loader.remove();
  }

  function scrollToBottom() {
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function saveChatHistory() {
    localStorage.setItem('bhavana_chat_history', JSON.stringify(chatHistory));
  }

});
