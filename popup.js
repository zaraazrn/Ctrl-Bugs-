// Popup script for AI Review Detector
class PopupManager {
  constructor() {
    console.log('PopupManager constructor called');
    this.currentView = 'main';
    this.analysisData = null;
    this.initializeElements();
    this.bindEvents();
    this.loadAnalysis();
    console.log('PopupManager initialization complete');
  }

  initializeElements() {
    console.log('Initializing popup elements...');
    
    this.elements = {
      loading: document.getElementById('loading'),
      content: document.getElementById('content'),
      error: document.getElementById('error'),
      closeBtn: document.getElementById('closeBtn'),
      retryBtn: document.getElementById('retryBtn'),
      
      // Stats
      totalReviews: document.getElementById('totalReviews'),
      authenticReviews: document.getElementById('authenticReviews'),
      suspiciousReviews: document.getElementById('suspiciousReviews'),
      fakePercentage: document.getElementById('fakePercentage'),
      
      // Recommendation
      recommendationCard: document.getElementById('recommendationCard'),
      recommendationIcon: document.getElementById('recommendationIcon'),
      recommendationTitle: document.getElementById('recommendationTitle'),
      recommendationReason: document.getElementById('recommendationReason'),
      confidenceValue: document.getElementById('confidenceValue'),
      confidenceFill: document.getElementById('confidenceFill'),
      
      // Sentiment
      positiveFill: document.getElementById('positiveFill'),
      negativeFill: document.getElementById('negativeFill'),
      neutralFill: document.getElementById('neutralFill'),
      positiveCount: document.getElementById('positiveCount'),
      negativeCount: document.getElementById('negativeCount'),
      neutralCount: document.getElementById('neutralCount'),
      
      // Actions
      showSuspiciousBtn: document.getElementById('showSuspiciousBtn'),
      showAuthenticBtn: document.getElementById('showAuthenticBtn'),
      
      // Reviews section
      reviewsSection: document.getElementById('reviewsSection'),
      reviewsTitle: document.getElementById('reviewsTitle'),
      reviewsList: document.getElementById('reviewsList'),
      backBtn: document.getElementById('backBtn'),
      
      // Summary section
      summarySection: document.getElementById('summarySection'),
      summaryTitle: document.getElementById('summaryTitle'),
      summaryList: document.getElementById('summaryList'),
      summaryBackBtn: document.getElementById('summaryBackBtn')
    };
    
  }

  bindEvents() {
    console.log('Binding events to buttons...');
    
    this.elements.closeBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      window.close();
    });

    this.elements.retryBtn.addEventListener('click', () => {
      console.log('Retry button clicked');
      this.refreshAnalysis();
    });

    this.elements.backBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      this.showMainView();
    });

    // Summary back button
    if (this.elements.summaryBackBtn) {
      this.elements.summaryBackBtn.addEventListener('click', () => {
        console.log('Summary back button clicked');
        this.showMainView();
      });
    }

    // Suspicious reviews button (currently disabled)
    // this.elements.showSuspiciousBtn.addEventListener('click', () => {
    //   console.log('Suspicious button clicked');
    //   this.showSuspiciousReviews();
    // });

    // Authentic summary button
    this.elements.showAuthenticBtn.addEventListener('click', () => {
      console.log('Authentic button clicked');
      this.showAuthenticSummary();
    });
    
    console.log('All event listeners bound successfully');
  }

  async loadAnalysis() {
    try {
      this.showLoading();
      
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.showError('No active tab found');
        return;
      }

      // Check if content script is loaded by trying to inject it first
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectionError) {
        console.log('Content script already loaded or injection failed:', injectionError);
      }

      // Wait a moment for content script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to communicate with content script
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script communication timeout'));
        }, 5000);

        chrome.tabs.sendMessage(tab.id, { action: 'getAnalysis' }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.analysis) {
        if (response.analysis.error) {
          this.showError(response.analysis.error);
        } else {
          this.analysisData = response.analysis;
          this.displayAnalysis();
        }
      } else {
        this.showError('No analysis data received');
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
      this.showError(error.message);
    }
  }

  async refreshAnalysis() {
    try {
      this.showLoading();
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.showError('No active tab found');
        return;
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script communication timeout'));
        }, 10000);

        chrome.tabs.sendMessage(tab.id, { action: 'refreshAnalysis' }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.analysis) {
        if (response.analysis.error) {
          this.showError(response.analysis.error);
        } else {
          this.analysisData = response.analysis;
          this.displayAnalysis();
        }
      } else {
        this.showError('No analysis data received');
      }
    } catch (error) {
      console.error('Error refreshing analysis:', error);
      this.showError(error.message);
    }
  }

  showLoading() {
    this.elements.loading.style.display = 'block';
    this.elements.content.style.display = 'none';
    this.elements.error.style.display = 'none';
    this.elements.reviewsSection.style.display = 'none';
    if (this.elements.summarySection) {
      this.elements.summarySection.style.display = 'none';
    }
  }

  showError(message = 'No reviews found on this page') {
    this.elements.loading.style.display = 'none';
    this.elements.content.style.display = 'none';
    this.elements.error.style.display = 'block';
    this.elements.reviewsSection.style.display = 'none';
    if (this.elements.summarySection) {
      this.elements.summarySection.style.display = 'none';
    }
    
    // Update error message if provided
    const errorText = document.getElementById('errorMessage');
    if (errorText && message) {
      errorText.textContent = message;
    }
  }

  displayAnalysis() {
    console.log('Displaying analysis data:', this.analysisData);
    
    this.elements.loading.style.display = 'none';
    this.elements.error.style.display = 'none';
    this.elements.content.style.display = 'block';
    this.elements.reviewsSection.style.display = 'none';
    if (this.elements.summarySection) {
      this.elements.summarySection.style.display = 'none';
    }

    const data = this.analysisData;

    // Update stats
    this.elements.totalReviews.textContent = data.total;
    this.elements.authenticReviews.textContent = data.authentic;
    this.elements.suspiciousReviews.textContent = data.suspicious;
    this.elements.fakePercentage.textContent = data.fakePercentage + '%';

    // Update recommendation
    this.updateRecommendation(data.recommendation);

    // Update sentiment breakdown
    this.updateSentimentBreakdown(data.sentimentBreakdown, data.authentic);

    // Update confidence
    this.elements.confidenceValue.textContent = data.overallConfidence + '%';
    this.elements.confidenceFill.style.width = data.overallConfidence + '%';

        // Update button states - suspicious button is always disabled but shows red if suspicious reviews exist
    this.elements.showSuspiciousBtn.disabled = true;
    if (data.suspicious > 0) {
      this.elements.showSuspiciousBtn.classList.add('has-suspicious');
    } else {
      this.elements.showSuspiciousBtn.classList.remove('has-suspicious');
    }
    // Enable buttons if we have data
    //this.elements.showSuspiciousBtn.disabled = !data.suspiciousReviews || data.suspiciousReviews.length === 0;
    this.elements.showAuthenticBtn.disabled = !data.authenticReviews || data.authenticReviews.length === 0;
  }

  updateRecommendation(recommendation) {
    const card = this.elements.recommendationCard;
    const icon = this.elements.recommendationIcon;
    const title = this.elements.recommendationTitle;
    const reason = this.elements.recommendationReason;

    // Remove existing classes
    card.classList.remove('recommended', 'not-recommended', 'caution');

    switch (recommendation.decision) {
      case 'recommended':
        card.classList.add('recommended');
        icon.textContent = '✓';
        title.textContent = 'YES BUY IT!!';
        break;
      case 'not_recommended':
        card.classList.add('not-recommended');
        icon.textContent = '✗';
        title.textContent = 'Nahh save your money..';
        break;
      default:
        card.classList.add('caution');
        icon.textContent = '⚠';
        title.textContent = 'Uhh.. up to you..';
    }

    reason.textContent = recommendation.reason;
  }

  updateSentimentBreakdown(breakdown, total) {
    const positive = breakdown.positive || 0;
    const negative = breakdown.negative || 0;
    const neutral = breakdown.neutral || 0;

    if (total > 0) {
      this.elements.positiveFill.style.width = (positive / total * 100) + '%';
      this.elements.negativeFill.style.width = (negative / total * 100) + '%';
      this.elements.neutralFill.style.width = (neutral / total * 100) + '%';
    }

    this.elements.positiveCount.textContent = positive;
    this.elements.negativeCount.textContent = negative;
    this.elements.neutralCount.textContent = neutral;
  }


// Updated showSuspiciousReviews method with better debugging
showSuspiciousReviews() {
  // Hide other sections
  this.elements.content.style.display = 'none';
  this.elements.reviewsSection.style.display = 'block';
  if (this.elements.summarySection) {
    this.elements.summarySection.style.display = 'none';
  }
  
  // Update title
  this.elements.reviewsTitle.textContent = `Suspicious Reviews (${this.analysisData.suspiciousReviews.length})`;
  
  // Render the reviews
  this.renderSuspiciousReviews(this.analysisData.suspiciousReviews);
  
  console.log('=== SUSPICIOUS REVIEWS DISPLAY COMPLETE ===');
}

  showAuthenticSummary() {
    console.log('Showing authentic summary:', this.analysisData?.authenticReviews);
    
    if (!this.analysisData || !this.analysisData.authenticReviews || this.analysisData.authenticReviews.length === 0) {
      console.error('No authentic reviews data available');
      return;
    }
    
    this.elements.content.style.display = 'none';
    this.elements.reviewsSection.style.display = 'none';
    
    if (this.elements.summarySection) {
      this.elements.summarySection.style.display = 'block';
      this.elements.summaryTitle.textContent = 'Authentic Reviews Summary';
      this.renderAuthenticSummary(this.analysisData.authenticReviews);
    } else {
      // Fallback to reviews section if summary section doesn't exist
      this.elements.reviewsSection.style.display = 'block';
      this.elements.reviewsTitle.textContent = 'Authentic Reviews Summary';
      this.renderAuthenticSummaryInReviews(this.analysisData.authenticReviews);
    }
  }

  // Updated renderSuspiciousReviews method with better error handling and debugging
renderSuspiciousReviews(reviews) {
  console.log('Rendering suspicious reviews:', reviews);
  console.log('Reviews length:', reviews ? reviews.length : 'null/undefined');
  
  const container = this.elements.reviewsList;
  if (!container) {
    console.error('Reviews list container not found');
    return;
  }
  
  container.innerHTML = '';

  if (!reviews || reviews.length === 0) {
    console.warn('No suspicious reviews to display');
    container.innerHTML = '<p class="no-reviews">No suspicious reviews found</p>';
    return;
  }

  // Sort by suspicious score (highest first) before limiting to 10
  const sortedReviews = reviews.sort((a, b) => (b.suspiciousScore || 0) - (a.suspiciousScore || 0));
  const limitedReviews = sortedReviews.slice(0, 10);
  const totalReviews = reviews.length;
  
  console.log(`Processing ${limitedReviews.length} suspicious reviews (showing top 10 of ${totalReviews})`);

  // Add a header if there are more than 10 reviews
  if (totalReviews > 10) {
    const headerElement = document.createElement('div');
    headerElement.className = 'reviews-header';
    headerElement.innerHTML = `
      <p class="reviews-limit-notice">
        <strong>Showing top 10 most suspicious reviews</strong> (${totalReviews} total found)
      </p>
    `;
    container.appendChild(headerElement);
  }

  limitedReviews.forEach((review, index) => {
    console.log(`Processing review ${index + 1}:`, review);
    
    const reviewElement = document.createElement('div');
    reviewElement.className = 'review-item suspicious';
    
    // Handle missing or undefined properties with fallbacks
    const author = review.author || review.reviewer || 'Anonymous';
    const rating = review.rating || review.stars || 'N/A';
    const text = review.text || review.content || review.review || 'No review text available';
    const date = review.date || review.reviewDate || review.timestamp || 'Unknown date';
    const suspiciousScore = review.suspiciousScore || review.score || review.confidence || 0;
    const flags = review.flags || review.reasons || review.warnings || [];
    
    // Create flags HTML
    let flagsHtml = '';
    if (flags && flags.length > 0) {
      flagsHtml = `
        <div class="review-flags">
          ${flags.map(flag => `<span class="flag-badge">${flag}</span>`).join('')}
        </div>
      `;
    }
    
    // Create the review HTML
    reviewElement.innerHTML = `
      <div class="review-header">
        <span class="review-author">${this.escapeHtml(author)}</span>
        <span class="review-rating">★ ${rating}</span>
      </div>
      ${flagsHtml}
      <div class="review-text">${this.escapeHtml(text)}</div>
      <div class="review-meta">
        <span class="suspicious-score">Suspicious Score: ${Math.round(suspiciousScore * 100)}%</span>
        <span class="review-date">${this.escapeHtml(date)}</span>
      </div>
    `;
    
    container.appendChild(reviewElement);
    console.log(`Added review ${index + 1} to container`);
  });
  
  console.log(`Finished rendering ${limitedReviews.length} suspicious reviews`);
}

// Helper method to escape HTML to prevent XSS
escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text);
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// Alternative method to check data structure
debugAnalysisData() {
  console.log('=== DEBUGGING ANALYSIS DATA ===');
  console.log('Full analysis data:', this.analysisData);
  
  if (this.analysisData) {
    console.log('Analysis data keys:', Object.keys(this.analysisData));
    
    // Check different possible property names for suspicious reviews
    const possibleKeys = [
      'suspiciousReviews',
      'suspicious_reviews', 
      'flaggedReviews',
      'fakeReviews',
      'artificialReviews'
    ];
    
    possibleKeys.forEach(key => {
      if (this.analysisData.hasOwnProperty(key)) {
        console.log(`Found ${key}:`, this.analysisData[key]);
      }
    });
  }
  
  console.log('=== END DEBUG ===');
}

// Enhanced button click handler for suspicious reviews
handleSuspiciousButtonClick() {
  console.log('=== SUSPICIOUS BUTTON CLICKED ===');
  
  // First, debug the data
  this.debugAnalysisData();
  
  // Check if button should be enabled
  const hasData = this.analysisData && 
                  this.analysisData.suspiciousReviews && 
                  this.analysisData.suspiciousReviews.length > 0;
  
  console.log('Has suspicious reviews data:', hasData);
  console.log('Button disabled state:', this.elements.showSuspiciousBtn.disabled);
  
  if (!hasData) {
    alert('No suspicious reviews found to display');
    return;
  }
  
  // Proceed with showing reviews
  this.showSuspiciousReviews();
}

// Method to manually trigger debugging from console
triggerDebug() {
  console.log('=== MANUAL DEBUG TRIGGER ===');
  console.log('Current view:', this.currentView);
  console.log('Elements check:', {
    showSuspiciousBtn: !!this.elements.showSuspiciousBtn,
    reviewsSection: !!this.elements.reviewsSection,
    reviewsList: !!this.elements.reviewsList,
    reviewsTitle: !!this.elements.reviewsTitle
  });
  
  this.debugAnalysisData();
  
  // Check if reviews section is visible
  if (this.elements.reviewsSection) {
    console.log('Reviews section display:', this.elements.reviewsSection.style.display);
    console.log('Reviews section HTML:', this.elements.reviewsSection.innerHTML);
  }
}
renderAuthenticSummary(reviews) {
    console.log('Rendering authentic summary for:', reviews.length, 'reviews');
    const container = this.elements.summaryList;
    container.innerHTML = '';

    if (!reviews || reviews.length === 0) {
      container.innerHTML = `
        <div class="no-reviews">
          <div class="no-reviews-icon">📝</div>
          <h4>No Authentic Reviews</h4>
          <p>No authentic reviews found to analyze</p>
        </div>
      `;
      return;
    }

    const summary = this.generateAuthenticSummary(reviews);
    
    const summaryHtml = `
      <div class="summary-overview-card">
        <div class="summary-card-header">
          <div class="summary-icon">📊</div>
          <h4>Overview</h4>
        </div>
        <div class="summary-stats-grid">
          <div class="summary-stat">
            <span class="stat-number">${reviews.length}</span>
            <span class="stat-label">Total Reviews</span>
          </div>
          <div class="summary-stat positive">
            <span class="stat-number">${summary.sentimentCounts.positive}</span>
            <span class="stat-label">Positive</span>
          </div>
          <div class="summary-stat negative">
            <span class="stat-number">${summary.sentimentCounts.negative}</span>
            <span class="stat-label">Negative</span>
          </div>
          <div class="summary-stat neutral">
            <span class="stat-number">${summary.sentimentCounts.neutral}</span>
            <span class="stat-label">Neutral</span>
          </div>
        </div>
      </div>
      
      <div class="summary-insights-card">
        <div class="summary-card-header">
          <div class="summary-icon">💡</div>
          <h4>Key Insights</h4>
        </div>
        <div class="insights-list">
          ${summary.insights.map(insight => `
            <div class="insight-item">
              <div class="insight-bullet"></div>
              <span>${insight}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="summary-themes-card">
        <div class="summary-card-header">
          <div class="summary-icon">🏷️</div>
          <h4>Common Themes</h4>
        </div>
        <div class="themes-container">
          ${summary.commonThemes.map(theme => `
            <div class="theme-tag">${theme}</div>
          `).join('')}
        </div>
      </div>
      
      <div class="summary-highlights-card">
        <div class="summary-card-header">
          <div class="summary-icon">⭐</div>
          <h4>Review Highlights</h4>
        </div>
        <div class="highlight-reviews">
          ${summary.highlightReviews.map(review => `
            <div class="highlight-review">
              <div class="highlight-header">
                <div class="sentiment-badge ${review.sentiment}">
                  ${review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
                </div>
                <div class="rating-display">
                  <span class="rating-stars">${'★'.repeat(review.rating)}</span>
                  <span class="rating-number">${review.rating}</span>
                </div>
              </div>
              <div class="highlight-text">
                "${review.text.substring(0, 150)}${review.text.length > 150 ? '...' : ''}"
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    container.innerHTML = summaryHtml;
  }

  renderAuthenticSummaryInReviews(reviews) {
    // Fallback method if summary section doesn't exist
    const container = this.elements.reviewsList;
    container.innerHTML = '';

    if (!reviews || reviews.length === 0) {
      container.innerHTML = `
        <div class="no-reviews">
          <div class="no-reviews-icon">📝</div>
          <h4>No Authentic Reviews</h4>
          <p>No authentic reviews found to analyze</p>
        </div>
      `;
      return;
    }

    const summary = this.generateAuthenticSummary(reviews);
    
    const summaryElement = document.createElement('div');
    summaryElement.className = 'authentic-summary-compact';
    summaryElement.innerHTML = `
      <div class="summary-compact-header">
        <div class="summary-icon">📊</div>
        <h4>Authentic Review Analysis</h4>
      </div>
      
      <div class="summary-compact-stats">
        <div class="compact-stat-row">
          <span class="compact-label">Total Reviews:</span>
          <span class="compact-value">${reviews.length}</span>
        </div>
        <div class="compact-stat-row">
          <span class="compact-label">Sentiment:</span>
          <div class="compact-sentiment">
            <span class="sentiment-chip positive">${summary.sentimentCounts.positive} Positive</span>
            <span class="sentiment-chip negative">${summary.sentimentCounts.negative} Negative</span>
            <span class="sentiment-chip neutral">${summary.sentimentCounts.neutral} Neutral</span>
          </div>
        </div>
      </div>
      
      <div class="summary-compact-section">
        <h5>💡 Key Insights</h5>
        <div class="compact-insights">
          ${summary.insights.map(insight => `
            <div class="compact-insight">
              <div class="insight-bullet"></div>
              <span>${insight}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="summary-compact-section">
        <h5>🏷️ Common Themes</h5>
        <div class="compact-themes">
          ${summary.commonThemes.map(theme => `
            <div class="compact-theme-tag">${theme}</div>
          `).join('')}
        </div>
      </div>
    `;
    
    container.appendChild(summaryElement);
  }

  generateAuthenticSummary(reviews) {
    console.log('Generating summary for reviews:', reviews.length);
    
    // Count sentiments
    const sentimentCounts = {
      positive: reviews.filter(r => r.sentiment === 'positive').length,
      negative: reviews.filter(r => r.sentiment === 'negative').length,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length
    };
    
    // Generate insights
    const insights = [];
    const total = reviews.length;
    
    if (sentimentCounts.positive > total * 0.7) {
      insights.push('Overwhelmingly positive customer feedback');
    } else if (sentimentCounts.negative > total * 0.7) {
      insights.push('Predominantly negative customer experience');
    } else {
      insights.push('Mixed customer opinions with varied experiences');
    }
    
    // Analyze review lengths
    const avgLength = reviews.reduce((sum, r) => sum + r.text.length, 0) / reviews.length;
    if (avgLength > 200) {
      insights.push('Customers provide detailed, thoughtful reviews');
    } else if (avgLength < 50) {
      insights.push('Most reviews are brief and to the point');
    }
    
    // Analyze ratings
    const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 3), 0) / reviews.length;
    if (avgRating > 4) {
      insights.push(`High average rating of ${avgRating.toFixed(1)}/5 stars`);
    } else if (avgRating < 2.5) {
      insights.push(`Low average rating of ${avgRating.toFixed(1)}/5 stars`);
    }
    
    // Extract common themes
    const commonThemes = this.extractCommonThemes(reviews);
    
    // Get highlight reviews
    const highlightReviews = this.getHighlightReviews(reviews);
    
    return {
      sentimentCounts,
      insights,
      commonThemes,
      highlightReviews
    };
  }

  extractCommonThemes(reviews) {
    const themes = [];
    const allText = reviews.map(r => r.text.toLowerCase()).join(' ');
    
    // Quality-related keywords
    const qualityKeywords = ['quality', 'build', 'material', 'construction', 'durable', 'sturdy', 'solid'];
    const qualityMentions = qualityKeywords.filter(keyword => allText.includes(keyword));
    if (qualityMentions.length > 0) {
      const positiveQuality = reviews.filter(r => 
        r.sentiment === 'positive' && qualityKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      const negativeQuality = reviews.filter(r => 
        r.sentiment === 'negative' && qualityKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      
      if (positiveQuality > negativeQuality) {
        themes.push('✅ Good build quality and materials');
      } else {
        themes.push('❌ Quality concerns mentioned');
      }
    }
    
    // Price/Value keywords
    const priceKeywords = ['price', 'cost', 'value', 'money', 'expensive', 'cheap', 'affordable'];
    const priceMentions = priceKeywords.filter(keyword => allText.includes(keyword));
    if (priceMentions.length > 0) {
      const positivePrice = reviews.filter(r => 
        r.sentiment === 'positive' && priceKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      const negativePrice = reviews.filter(r => 
        r.sentiment === 'negative' && priceKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      
      if (positivePrice > negativePrice) {
        themes.push('💰 Good value for money');
      } else {
        themes.push('💸 Price concerns raised');
      }
    }
    
    // Service keywords
    const serviceKeywords = ['service', 'support', 'help', 'staff', 'customer service'];
    const serviceMentions = serviceKeywords.filter(keyword => allText.includes(keyword));
    if (serviceMentions.length > 0) {
      const positiveService = reviews.filter(r => 
        r.sentiment === 'positive' && serviceKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      const negativeService = reviews.filter(r => 
        r.sentiment === 'negative' && serviceKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      
      if (positiveService > negativeService) {
        themes.push('🤝 Excellent customer service');
      } else {
        themes.push('😤 Customer service issues');
      }
    }
    
    // Delivery/Shipping keywords
    const deliveryKeywords = ['delivery', 'shipping', 'fast', 'quick', 'slow', 'delayed'];
    const deliveryMentions = deliveryKeywords.filter(keyword => allText.includes(keyword));
    if (deliveryMentions.length > 0) {
      const positiveDelivery = reviews.filter(r => 
        r.sentiment === 'positive' && deliveryKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      const negativeDelivery = reviews.filter(r => 
        r.sentiment === 'negative' && deliveryKeywords.some(k => r.text.toLowerCase().includes(k))
      ).length;
      
      if (positiveDelivery > negativeDelivery) {
        themes.push('🚚 Fast and reliable delivery');
      } else {
        themes.push('📦 Delivery issues reported');
      }
    }
    
    // Add generic themes if no specific ones found
    if (themes.length === 0) {
      const positiveReviews = reviews.filter(r => r.sentiment === 'positive');
      const negativeReviews = reviews.filter(r => r.sentiment === 'negative');
      
      if (positiveReviews.length > negativeReviews.length) {
        themes.push('✅ Generally positive customer experience');
      } else if (negativeReviews.length > positiveReviews.length) {
        themes.push('❌ Mixed to negative customer feedback');
      } else {
        themes.push('🤷 Varied customer experiences');
      }
    }
    
    return themes;
  }

  getHighlightReviews(reviews) {
    // Get a mix of positive and negative reviews that are informative
    const positiveReviews = reviews.filter(r => r.sentiment === 'positive' && r.text.length > 50);
    const negativeReviews = reviews.filter(r => r.sentiment === 'negative' && r.text.length > 50);
    
    // Sort by confidence and length
    positiveReviews.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    negativeReviews.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    
    const highlights = [];
    
    // Add top positive reviews
    if (positiveReviews.length > 0) {
      highlights.push(...positiveReviews.slice(0, 2));
    }
    
    // Add top negative reviews
    if (negativeReviews.length > 0) {
      highlights.push(...negativeReviews.slice(0, 1));
    }
    
    return highlights;
  }

  showMainView() {
    this.elements.content.style.display = 'block';
    this.elements.reviewsSection.style.display = 'none';
    if (this.elements.summarySection) {
      this.elements.summarySection.style.display = 'none';
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Initializing PopupManager');
  new PopupManager();
});

// Fallback initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Fallback DOM initialization');
    new PopupManager();
  });
} else {
  console.log('DOM already loaded - Initializing PopupManager immediately');
  new PopupManager();
}