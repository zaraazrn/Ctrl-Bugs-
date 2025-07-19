# CapSniffer Chrome Extension

A sophisticated Chrome extension that uses AI to detect fake reviews and analyze authentic ones to help users make informed purchase decisions.

## Features

### Core Functionality
- **AI-Powered Fake Review Detection**: Advanced algorithms analyze text patterns, reviewer behavior, and sentiment consistency
- **Sentiment Analysis**: Categorizes authentic reviews as positive, negative, or neutral
- **Purchase Recommendations**: Clear buy/don't buy suggestions with reasoning
- **Confidence Scoring**: Visual indicators showing analysis reliability

### Detection Methods
- **Text Analysis**: Identifies generic phrases, repetitive language, and grammar patterns
- **Reviewer Patterns**: Detects suspicious usernames, new accounts, and bulk posting
- **Temporal Analysis**: Identifies unnatural review clustering and posting patterns
- **Sentiment Consistency**: Compares star ratings with review text sentiment

### User Interface
- **Modern Design**: Clean, professional interface with glass-morphism effects
- **Interactive Elements**: Smooth animations and hover effects
- **Expandable Sections**: Detailed views for suspicious and authentic reviews
- **Flag Indicators**: Shows why reviews were flagged (spam, excessive enthusiasm, etc.)

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your browser toolbar

## Usage

1. Visit any website with product reviews
2. Click the AI Review Detector icon in your browser toolbar
3. The extension will automatically analyze reviews on the page
4. View the analysis summary with purchase recommendations
5. Note: "See Suspicious Reviews" and "See Authentic Summary" buttons are currently disabled and will only be modified and used in the future.

## Note
Our Chrome extension is designed to help online shoppers identify suspicious or fake reviews directly on product pages, and is currently optimized for Amazon, where it works best. While it can also be used on other popular e-commerce platforms such as Shopee, Lazada, Sephora, and Uniqlo, the detection accuracy may vary. Expanding support and improving performance across these sites is part of our planned future enhancements.

## Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension API
- **Service Worker**: Background processing for AI analysis
- **Content Scripts**: Extract reviews from any website
- **Popup Interface**: Clean, responsive UI for displaying results

### AI Analysis Features
- Pattern recognition for fake review detection
- Sentiment analysis using natural language processing
- Confidence scoring for reliability assessment
- Multi-factor analysis combining text, user, and temporal data

### Security & Privacy
- All analysis is performed locally in the browser
- No data is sent to external servers
- Minimal permissions required
- Respects user privacy

## Browser Support

- Chrome (Primary)
- Edge (Chromium-based)
- Brave
- Other Chromium-based browsers

## License

This project is open source and available under the MIT License.