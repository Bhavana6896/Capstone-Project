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
        spent_time_relaxing: 'Spent time relaxing - Netflix & Chill or PS5',
        positive_self_talk: 'Practiced positive self-talk or self-compassion',
        expressed_gratitude: 'Expressed gratitude to someone',
        deep_conversation: 'Had a deep or meaningful conversation'
      }
    },
    physical_fitness: {
      title: '⚡ Physical Fitness',
      items: {
        exercised: 'Exercised',
        walk_or_run: 'Went for a walk or run',
        stretch_or_yoga: 'Stretched or did yoga',
        drink_water: 'Drank 8+ glasses of water',
        sleep_hours: 'Got 7–8 hours of restful sleep'
      }
    },
    mental_resilience: {
      title: '🧘 Mental Resilience',
      items: {
        washed_dishes: 'Washed dishes',
        cleaned_house: 'Cleaned house',
        journaled: 'Journaled',
        mindfulness_meditation: 'Practiced mindfulness or meditation',
        learning_something_new: 'Spent time learning something new - book, podcast, documentary, coding, etc.'
      }
    },
    financial_health: {
      title: '🌱 Financial Health',
      items: {
        work_task_done: 'Work task done',
        no_impulse_spend: 'No impulse spend',
        review_budget: 'Reviewed daily budget or tracked expenses',
        save_invest: 'Saved or invested money',
        cooked_food: 'Cooked food instead of spontaneously eating-out'
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
  
  // Calendar View State
  const todayDate = new Date();
  let currentCalendarYear = todayDate.getFullYear();
  let currentCalendarMonth = todayDate.getMonth(); // 0-indexed
  
  renderHistory();
  renderCalendar();
  
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
      
      // Calculate dynamic keys combining default items and any logged custom items
      const allItemKeys = new Set([
        ...Object.keys(categoryConfig.items),
        ...Object.keys(categoryData).filter(k => k !== 'ai_suggestion')
      ]);
      const categoryTotalCount = allItemKeys.size;

      allItemKeys.forEach(itemKey => {
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
          <span>Happy B! :) AI is generating a suggestion...</span>
        </div>
      </div>
    `;
    latestScoreContainer.style.display = 'block';

    // If suggestion is already cached for this entry, load it directly without API call
    if (entry.ai_suggestion) {
      const suggestionBox = document.getElementById('ai-suggestion-box');
      if (suggestionBox) {
        suggestionBox.innerHTML = `
          <span class="ai-suggestion-icon">💡</span>
          <div class="ai-suggestion-content">
            <span class="ai-suggestion-title">AI Suggestion</span>
            <p class="ai-suggestion-text">${entry.ai_suggestion}</p>
          </div>
        `;
        suggestionBox.classList.add('loaded');
      }
      return;
    }

    // Call the AI agent asynchronously
    getAISuggestion(scores.overallScore, scores.lowestCategoryTitle)
      .then(suggestion => {
        // Cache the suggestion in the log entry and save logs
        entry.ai_suggestion = suggestion;
        saveLogs();

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

  // Helper: Render interactive monthly calendar
  function renderCalendar() {
    const container = document.getElementById('calendar-card-container');
    if (!container) return;

    // Get current calendar focus details
    const calendarDate = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const monthName = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Find the weekday of the 1st of the month (0 = Sun, 6 = Sat)
    const firstDayIndex = calendarDate.getDay();

    // Get total number of days in the month
    const totalDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();

    // Generate weekdays headers (Sun-Sat)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdaysGridHTML = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('');

    // Generate empty cells for days before the 1st of the month
    let daysHTML = '';
    for (let i = 0; i < firstDayIndex; i++) {
      daysHTML += `<div class="calendar-cell empty"></div>`;
    }

    const todayStr = getLocalDateString();

    // Generate day cells
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = logs.find(log => log.date === dateStr);
      
      let cellClass = 'calendar-cell';
      let scoreBadge = '';
      
      const cellDate = new Date(currentCalendarYear, currentCalendarMonth, day);
      const isToday = dateStr === todayStr;
      const isFuture = cellDate > todayDate && !isToday;

      if (isToday) {
        cellClass += ' today';
      }

      if (entry) {
        // Logged day
        cellClass += ' logged';
        const scores = calculateEntryScores(entry);
        
        if (scores.overallScore >= 4) {
          cellClass += ' score-high';
        } else if (scores.overallScore === 3) {
          cellClass += ' score-med';
        } else {
          cellClass += ' score-low';
        }
        
        scoreBadge = `<div class="calendar-score-dot" title="Score: ${scores.overallScore}/5">${scores.overallScore}</div>`;
      } else if (isFuture) {
        // Future day
        cellClass += ' future';
      } else {
        // Past unlogged day
        cellClass += ' past-unlogged';
      }

      daysHTML += `
        <div class="${cellClass}" data-date="${dateStr}" title="${entry ? `Logged: ${calculateEntryScores(entry).overallScore}/5` : isFuture ? '' : 'Not logged - click to log'}">
          <span class="day-number">${day}</span>
          ${scoreBadge}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="calendar-header">
        <h3>Calendar — ${monthName}</h3>
        <div class="calendar-nav-buttons">
          <button id="calendar-prev-btn" class="calendar-nav-btn" title="Previous Month">◀</button>
          <button id="calendar-next-btn" class="calendar-nav-btn" title="Next Month">▶</button>
        </div>
      </div>
      <div class="calendar-weekdays-grid">
        ${weekdaysGridHTML}
      </div>
      <div class="calendar-days-grid">
        ${daysHTML}
      </div>
    `;

    // Wire up navigation buttons
    const prevBtn = document.getElementById('calendar-prev-btn');
    const nextBtn = document.getElementById('calendar-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentCalendarMonth--;
        if (currentCalendarMonth < 0) {
          currentCalendarMonth = 11;
          currentCalendarYear--;
        }
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentCalendarMonth++;
        if (currentCalendarMonth > 11) {
          currentCalendarMonth = 0;
          currentCalendarYear++;
        }
        renderCalendar();
      });
    }

    // Wire up cell click events
    const cells = container.querySelectorAll('.calendar-cell:not(.empty):not(.future)');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const clickedDate = cell.getAttribute('data-date');
        const clickedEntry = logs.find(log => log.date === clickedDate);
        
        if (clickedEntry) {
          // Logged: show summary card and scroll to it
          renderLatestScore(clickedEntry);
          latestScoreContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          animateScoreBadge();
        } else {
          // Unlogged: set date inputs and scroll to form to backfill
          dateInput.value = clickedDate;
          resetCheckboxes();
          trackerForm.scrollIntoView({ behavior: 'smooth' });
          showNotification(`Set date to ${formatDisplayDate(clickedDate)} to log habits.`);
        }
      });
    });
  }

  // Form submit handler
  trackerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedDate = dateInput.value;
    if (!selectedDate) {
      showNotification('Please select a valid date.', 'error');
      return;
    }

    // Capture the state of all checkboxes structured by category (including custom ones)
    const dailyEntry = {
      date: selectedDate
    };

    Object.keys(CATEGORIES).forEach(categoryKey => {
      dailyEntry[categoryKey] = {};
      const card = document.querySelector(`.category-card[data-category="${categoryKey}"]`);
      if (card) {
        const checkboxes = card.querySelectorAll(`input[name="${categoryKey}"]`);
        checkboxes.forEach(cb => {
          dailyEntry[categoryKey][cb.value] = cb.checked;
        });
      }
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
        // Clear cached suggestion on edit so a fresh one can be generated
        dailyEntry.ai_suggestion = null;
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
      renderCalendar();
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
    // Also reset completion glows
    document.querySelectorAll('.category-card').forEach(card => {
      card.classList.remove('completed');
    });
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
      const categoryData = entry[categoryKey] || {};
      
      // Self-healing: if the entry contains custom tasks not in the current view, restore them
      Object.keys(categoryData).forEach(itemKey => {
        if (itemKey.startsWith('custom_')) {
          const checkbox = document.querySelector(`input[name="${categoryKey}"][value="${itemKey}"]`);
          if (!checkbox) {
            // Restore task label from key format
            const rawLabel = itemKey.replace(/^custom_/, '').replace(/_/g, ' ');
            const capitalizedLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
            
            if (!customTasks[categoryKey]) {
              customTasks[categoryKey] = [];
            }
            if (!customTasks[categoryKey].includes(capitalizedLabel)) {
              customTasks[categoryKey].push(capitalizedLabel);
              saveCustomTasks();
              renderCustomCheckboxes(categoryKey);
            }
          }
        }
      });

      // Set checked states and update completion glows
      const card = document.querySelector(`.category-card[data-category="${categoryKey}"]`);
      if (card) {
        const checkboxes = card.querySelectorAll(`input[name="${categoryKey}"]`);
        checkboxes.forEach(cb => {
          cb.checked = !!categoryData[cb.value];
        });
        checkCategoryCompletion(card);
      }
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
    renderCalendar();
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
      renderCalendar();
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

        // Add visual indicator tag for each item (including custom ones)
        const allKeys = new Set([
          ...Object.keys(categoryConfig.items),
          ...Object.keys(categoryData).filter(k => k !== 'ai_suggestion')
        ]);

        allKeys.forEach(itemKey => {
          let itemLabel = categoryConfig.items[itemKey];
          if (!itemLabel && itemKey.startsWith('custom_')) {
            const rawLabel = itemKey.replace(/^custom_/, '').replace(/_/g, ' ');
            itemLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
          }
          if (!itemLabel) return;

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
  const chatbotClearHistoryBtn = document.getElementById('chatbot-clear-history-btn');

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

  // Clear Chat History
  if (chatbotClearHistoryBtn) {
    chatbotClearHistoryBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
        localStorage.removeItem('bhavana_chat_history');
        chatHistory = [];
        chatbotMessages.innerHTML = '';
        
        // Restore default greeting
        chatHistory.push({ role: 'ai', text: "Hi, I'm Bhavana. Your well-being assistant." });
        saveChatHistory();
        appendMessage("Hi, I'm Bhavana. Your well-being assistant.", 'ai');
        
        chatbotSettings.classList.add('hidden');
        showNotification('Chat history cleared successfully.', 'success');
      }
    });
  }

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

  // ==========================================
  // Collapsible Blurb & Custom Tasks Logic
  // ==========================================
  
  let customTasks = JSON.parse(localStorage.getItem('bhavana_custom_tasks')) || {
    emotional_well_being: [],
    physical_fitness: [],
    mental_resilience: [],
    financial_health: []
  };

  function saveCustomTasks() {
    localStorage.setItem('bhavana_custom_tasks', JSON.stringify(customTasks));
  }

  function renderCustomCheckboxes(categoryKey) {
    const card = document.querySelector(`.category-card[data-category="${categoryKey}"]`);
    if (!card) return;
    const container = card.querySelector('.custom-checkboxes-list');
    if (!container) return;
    container.innerHTML = '';
    
    const tasks = customTasks[categoryKey] || [];
    tasks.forEach(taskText => {
      const taskKey = `custom_${taskText.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const checkboxRow = document.createElement('label');
      checkboxRow.className = 'checkbox-row custom-checkbox-row';
      checkboxRow.innerHTML = `
        <input type="checkbox" name="${categoryKey}" value="${taskKey}">
        <span class="checkmark"></span>
        <span class="checkbox-label">${taskText}</span>
        <button type="button" class="delete-custom-task-btn" title="Remove custom task">🗑️</button>
      `;
      
      // Delete custom task
      const deleteBtn = checkboxRow.querySelector('.delete-custom-task-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm(`Remove custom task "${taskText}"? This will not delete past logs.`)) {
          customTasks[categoryKey] = customTasks[categoryKey].filter(t => t !== taskText);
          saveCustomTasks();
          renderCustomCheckboxes(categoryKey);
          checkCategoryCompletion(card);
        }
      });

      // Recalculate completion when custom checkboxes are toggled
      const cb = checkboxRow.querySelector('input[type="checkbox"]');
      cb.addEventListener('change', () => {
        checkCategoryCompletion(card);
      });
      
      container.appendChild(checkboxRow);
    });
  }

  function renderAllCustomCheckboxes() {
    Object.keys(CATEGORIES).forEach(categoryKey => {
      renderCustomCheckboxes(categoryKey);
    });
  }

  function checkCategoryCompletion(card) {
    const checkboxes = card.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length === 0) {
      card.classList.remove('completed');
      return;
    }
    
    let allChecked = true;
    checkboxes.forEach(cb => {
      if (!cb.checked) {
        allChecked = false;
      }
    });
    
    if (allChecked) {
      card.classList.add('completed');
    } else {
      card.classList.remove('completed');
    }
  }

  // Render initial checkboxes
  renderAllCustomCheckboxes();

  // Watch default checkboxes for completion glows
  document.querySelectorAll('.category-card').forEach(card => {
    checkCategoryCompletion(card);
    
    card.addEventListener('change', (e) => {
      if (e.target && e.target.type === 'checkbox') {
        checkCategoryCompletion(card);
      }
    });
  });

  // Collapsible Info Blurb toggles
  document.querySelectorAll('.info-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.category-card');
      if (!card) return;
      const panel = card.querySelector('.category-info-panel');
      if (!panel) return;
      
      const isHidden = panel.classList.contains('hidden');
      if (isHidden) {
        panel.classList.remove('hidden');
        btn.classList.add('active');
      } else {
        panel.classList.add('hidden');
        btn.classList.remove('active');
      }
    });
  });

  // Add custom tasks listeners
  document.querySelectorAll('.category-card').forEach(card => {
    const categoryKey = card.getAttribute('data-category');
    const addBtn = card.querySelector('.add-custom-task-btn');
    const inputWrapper = card.querySelector('.custom-task-input-wrapper');
    const inputField = card.querySelector('.custom-task-input');
    const saveBtn = card.querySelector('.save-custom-btn');
    const cancelBtn = card.querySelector('.cancel-custom-btn');
    
    if (!addBtn || !inputWrapper || !inputField || !saveBtn || !cancelBtn) return;
    
    addBtn.addEventListener('click', () => {
      addBtn.classList.add('hidden');
      inputWrapper.classList.remove('hidden');
      inputField.focus();
    });
    
    const hideInput = () => {
      inputField.value = '';
      inputWrapper.classList.add('hidden');
      addBtn.classList.remove('hidden');
    };
    
    cancelBtn.addEventListener('click', hideInput);
    
    saveBtn.addEventListener('click', () => {
      const taskText = inputField.value.trim();
      if (!taskText) {
        showNotification('Please enter a task name.', 'error');
        return;
      }
      
      if (taskText.length > 50) {
        showNotification('Task name is too long (max 50 chars).', 'error');
        return;
      }
      
      const currentTasks = customTasks[categoryKey] || [];
      if (currentTasks.includes(taskText)) {
        showNotification('This task already exists.', 'error');
        return;
      }
      
      if (!customTasks[categoryKey]) {
        customTasks[categoryKey] = [];
      }
      customTasks[categoryKey].push(taskText);
      saveCustomTasks();
      
      renderCustomCheckboxes(categoryKey);
      checkCategoryCompletion(card);
      hideInput();
      showNotification('Custom task added.', 'success');
    });
    
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn.click();
      }
    });
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
