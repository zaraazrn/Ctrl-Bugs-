// Popup script for AI Review Detector
class PopupManager {
  constructor() {
    this.currentView = 'main';
    this.analysisData = null;
    this.initializeElements();
    this.bindEvents();
    this.loadAnalysis();
  }

  initializeElements() {
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
      backBtn: document.getElementById('backBtn')
    };
  }

  bindEvents() {
    this.elements.closeBtn.addEventListener('click', () => {
      window.close();
    });

    this.elements.retryBtn.addEventListener('click', () => {
      this.refreshAnalysis();
    });

    this.elements.showSuspiciousBtn.addEventListener('click', () => {
      this.showSuspiciousReviews();
    });

    this.elements.showAuthenticBtn.addEventListener('click', () => {
      this.showAuthenticSummary();
    });

    this.elements.backBtn.addEventListener('click', () => {
      this.showMainView();
    });
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
  }

  showError(message = 'No reviews found on this page') {
    this.elements.loading.style.display = 'none';
    this.elements.content.style.display = 'none';
    this.elements.error.style.display = 'block';
    
    // Update error message if provided
    const errorText = document.getElementById('errorMessage');
    if (errorText && message) {
      errorText.textContent = message;
    }
  }

  displayAnalysis() {
    this.elements.loading.style.display = 'none';
    this.elements.error.style.display = 'none';
    this.elements.content.style.display = 'block';

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

    // Update button states
    this.elements.showSuspiciousBtn.disabled = data.suspicious === 0;
    this.elements.showAuthenticBtn.disabled = data.authentic === 0;
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
        title.textContent = 'Recommended';
        break;
      case 'not_recommended':
        card.classList.add('not-recommended');
        icon.textContent = '✗';
        title.textContent = 'Not Recommended';
        break;
      default:
        card.classList.add('caution');
        icon.textContent = '⚠';
        title.textContent = 'Proceed with Caution';
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

  showSuspiciousReviews() {
    this.elements.content.style.display = 'none';
    this.elements.reviewsSection.style.display = 'block';
    this.elements.reviewsTitle.textContent = 'Suspicious Reviews';
    
    this.renderReviews(this.analysisData.suspiciousReviews, true);
  }

  showAuthenticSummary() {
    this.elements.content.style.display = 'none';
    this.elements.reviewsSection.style.display = 'block';
    this.elements.reviewsTitle.textContent = 'Authentic Reviews Summary';
    
    this.renderAuthenticSummary(this.analysisData.authenticReviews);
  }

  renderReviews(reviews, isSuspicious = false) {
    const container = this.elements.reviewsList;
    container.innerHTML = '';

    reviews.forEach(review => {
      const reviewElement = document.createElement('div');
      reviewElement.className = `review-item ${isSuspicious ? 'suspicious' : ''}`;
      
      reviewElement.innerHTML = `
        <div class="review-header">
          <span class="review-author">${review.author}</span>
          <div class="review-flags">
            ${review.flags ? review.flags.map(flag => 
              `<span class="flag-badge">${flag}</span>`
            ).join('') : ''}
          </div>
        </div>
        <div class="review-text">${review.text}</div>
        <div class="review-meta">
          <span>Rating: ${review.rating}/5</span>
          <span class="review-confidence">Confidence: ${Math.round(review.confidence * 100)}%</span>
        </div>
      `;
      
      container.appendChild(reviewElement);
    });
  }

  renderAuthenticSummary(reviews) {
    const container = this.elements.reviewsList;
    container.innerHTML = '';

    // Generate summary
    const summary = this.generateSummary(reviews);
    
    const summaryElement = document.createElement('div');
    summaryElement.className = 'authentic-summary';
    summaryElement.innerHTML = `
      <div class="summary-title">Key Insights from Authentic Reviews</div>
      <ul class="summary-points">
        ${summary.points.map(point => `<li>${point}</li>`).join('')}
      </ul>
    `;
    
    container.appendChild(summaryElement);

    // Show top authentic reviews
    const topReviews = reviews
      .filter(r => r.text.length > 50)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    topReviews.forEach(review => {
      const reviewElement = document.createElement('div');
      reviewElement.className = 'review-item';
      
      reviewElement.innerHTML = `
        <div class="review-header">
          <span class="review-author">${review.author}</span>
          <span class="sentiment-badge ${review.sentiment}">${review.sentiment}</span>
        </div>
        <div class="review-text">${review.text}</div>
        <div class="review-meta">
          <span>Rating: ${review.rating}/5</span>
          <span class="review-confidence">Confidence: ${Math.round(review.confidence * 100)}%</span>
        </div>
      `;
      
      container.appendChild(reviewElement);
    });
  }

  generateSummary(reviews) {
    const points = [];
    const positiveReviews = reviews.filter(r => r.sentiment === 'positive');
    const negativeReviews = reviews.filter(r => r.sentiment === 'negative');
    
    // Analyze common themes
    const commonWords = this.extractCommonWords(reviews);
    const qualityMentions = reviews.filter(r => 
      r.text.toLowerCase().includes('quality') || 
      r.text.toLowerCase().includes('build') ||
      r.text.toLowerCase().includes('material')
    );
    
    const serviceMentions = reviews.filter(r => 
      r.text.toLowerCase().includes('service') || 
      r.text.toLowerCase().includes('support') ||
      r.text.toLowerCase().includes('help')
    );

    const priceMentions = reviews.filter(r => 
      r.text.toLowerCase().includes('price') || 
      r.text.toLowerCase().includes('cost') ||
      r.text.toLowerCase().includes('value')
    );

    if (positiveReviews.length > negativeReviews.length) {
      points.push('Overall positive customer sentiment');
    } else if (negativeReviews.length > positiveReviews.length) {
      points.push('Mostly negative customer feedback');
    } else {
      points.push('Mixed customer opinions');
    }

    if (qualityMentions.length > 0) {
      const positiveQuality = qualityMentions.filter(r => r.sentiment === 'positive').length;
      if (positiveQuality > qualityMentions.length / 2) {
        points.push('Good product quality mentioned frequently');
      } else {
        points.push('Quality concerns raised by customers');
      }
    }

    if (serviceMentions.length > 0) {
      const positiveService = serviceMentions.filter(r => r.sentiment === 'positive').length;
      if (positiveService > serviceMentions.length / 2) {
        points.push('Positive customer service feedback');
      } else {
        points.push('Customer service issues reported');
      }
    }

    if (priceMentions.length > 0) {
      const positivePrice = priceMentions.filter(r => r.sentiment === 'positive').length;
      if (positivePrice > priceMentions.length / 2) {
        points.push('Good value for money according to customers');
      } else {
        points.push('Price concerns mentioned by customers');
      }
    }

    // Add common positive/negative themes
    if (commonWords.length > 0) {
      points.push(`Common topics: ${commonWords.slice(0, 3).join(', ')}`);
    }

    return { points };
  }

  extractCommonWords(reviews) {
    const words = {};
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'a', 'an'];
    
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      const wordList = text.match(/\b\w+\b/g) || [];
      
      wordList.forEach(word => {
        if (word.length > 3 && !stopWords.includes(word)) {
          words[word] = (words[word] || 0) + 1;
        }
      });
    });

    return Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  showMainView() {
    this.elements.content.style.display = 'block';
    this.elements.reviewsSection.style.display = 'none';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});