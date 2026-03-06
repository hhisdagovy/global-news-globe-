# 🌍 Global News Globe

An interactive 3D spinning globe that displays the top 3 news headlines when you hover over countries. Built with Three.js, Globe.gl, and NewsData.io.

## Features

### 🌍 Globe Visualization
- **3D Interactive Globe**: Realistic spinning Earth with NASA Blue Marble textures
- **Country Hover Detection**: Hover over countries to see them highlighted with glow effects
- **Particle Effects**: 2000+ twinkling stars in space background for immersive experience
- **Visual Legend**: Color-coded legend showing which countries have news available
- **Glow Effects**: Countries with news availability have subtle blue glow
- **Pulse Animation**: Hovered countries pulse and elevate for better visibility
- **Auto-Rotation**: Globe continuously rotates automatically

### 📰 News & Content
- **Live News Headlines**: Click countries to see their top 3 news stories with images
- **News Images**: Beautiful high-resolution article images with each headline
- **Real-Time Weather**: Current weather conditions with temperature, humidity, wind speed & more
- **Weather Icons**: Beautiful animated weather icons for each condition
- **Skeleton Loading**: Professional loading states while fetching news
- **Smooth Fade-in**: News articles appear with elegant staggered animations
- **62+ Countries**: Extensive global coverage via NewsData.io API
- **Smart Caching**: News and weather cached per session to reduce API calls

### 🎵 Radio Mode
- **Live Radio Stations**: Toggle to Radio mode to discover local radio stations
- **14 Guaranteed Countries**: Curated stations for US, UK, FR, DE, CA, AU, BR, ES, IT, JP, MX, NL, SE, NO
- **Global Coverage**: Radio Browser API integration for worldwide stations
- **Built-in Player**: Play/pause, stop, and volume controls
- **Stream in Browser**: No additional software needed

### 🔍 Enhanced Search
- **Region Filtering**: Filter countries by Americas, Europe, Asia, Africa, Middle East, Oceania
- **Smart Autocomplete**: Real-time suggestions as you type (min 2 characters)
- **Voice Search**: 🎤 Speak country names using voice recognition (Chrome/Edge)
- **Keyboard Navigation**: Press Enter to select, ESC to close
- **Visual Indicators**: 📰 for supported countries, 🌍 for others

### 🎨 User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Zoom & Pan Controls**: Interactive controls to explore the world
- **Smooth Animations**: Beautiful transitions and hover effects throughout
- **Dark Theme**: Modern dark UI with glassmorphism effects

## Setup Instructions

### 1. Get a NewsData.io API Key

1. Visit [NewsData.io](https://newsdata.io/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes 200 requests per day with better global coverage

### 2. Configure the Application

1. Open `app.js` in your text editor
2. Find line 9: `NEWS_API_KEY: 'YOUR_API_KEY_HERE'`
3. Replace `YOUR_API_KEY_HERE` with your actual API key:
   ```javascript
   NEWS_API_KEY: 'abc123your-actual-key-here',
   ```

### 3. Run the Application

You have several options to run the application:

#### Option A: Using Python's HTTP Server
```bash
cd ~/global-news-globe
python3 -m http.server 8000
```
Then open http://localhost:8000 in your browser

#### Option B: Using Node.js HTTP Server
```bash
cd ~/global-news-globe
npx http-server -p 8000
```
Then open http://localhost:8000 in your browser

#### Option C: Using VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

#### Option D: Direct File Opening
Simply double-click `index.html` to open it in your browser (may have CORS limitations with some browsers)

## How to Use

### Basic Controls
1. **Rotate**: Click and drag to rotate the globe
2. **Zoom**: Scroll to zoom in/out
3. **Hover**: Move your mouse over countries to see them glow and highlight
4. **Click**: Click any country to see its top 3 news headlines with images
5. **Close Popup**: Click the X button or press ESC to close the news popup

### Enhanced Search Features
1. **Type Search**: Start typing a country name to see autocomplete suggestions
2. **Region Filter**: Select a region (Americas, Europe, Asia, etc.) to filter countries
3. **Voice Search**: Click the 🎤 microphone button and speak a country name
4. **Keyboard**: Press Enter to select first suggestion, ESC to close

### Visual Guide
- **Bright blue countries with white borders** = News available (62 countries)
- **Dim countries with faded borders** = No news coverage
- **Yellow/gold highlight** = Currently hovered country
- **Twinkling stars** = Particle effects in space background
- **Legend** = Bottom right corner shows color meanings

## Supported Countries

✅ **NewsData.io supports 62+ countries** with excellent global coverage including Africa, Asia, and Latin America!

**Supported countries include:**

**🌎 Americas:**
- 🇺🇸 United States, 🇨🇦 Canada, 🇲🇽 Mexico
- 🇧🇷 Brazil, 🇦🇷 Argentina, 🇨🇱 Chile, 🇨🇴 Colombia, 🇵🇪 Peru, 🇻🇪 Venezuela, 🇨🇺 Cuba

**🌍 Europe:**
- 🇬🇧 UK, 🇫🇷 France, 🇩🇪 Germany, 🇮🇹 Italy, 🇪🇸 Spain, 🇷🇺 Russia
- 🇳🇱 Netherlands, 🇵🇱 Poland, 🇺🇦 Ukraine, 🇸🇪 Sweden, 🇳🇴 Norway
- And 17 more European countries!

**🌏 Asia & Middle East:**
- 🇨🇳 China, 🇮🇳 India, 🇯🇵 Japan, 🇰🇷 South Korea, 🇹🇭 Thailand, 🇻🇳 Vietnam
- 🇸🇦 Saudi Arabia, 🇦🇪 UAE, 🇮🇱 Israel, 🇹🇷 Turkey, 🇪🇬 Egypt
- 🇮🇩 Indonesia, 🇵🇭 Philippines, 🇲🇾 Malaysia, 🇸🇬 Singapore, 🇵🇰 Pakistan, 🇧🇩 Bangladesh

**🌍 Africa:**
- 🇿🇦 South Africa, 🇳🇬 Nigeria, 🇰🇪 Kenya, 🇪🇹 Ethiopia, 🇲🇦 Morocco

**🌏 Oceania:**
- 🇦🇺 Australia, 🇳🇿 New Zealand

**Visual indicators on the globe:**
- 💎 **Brighter blue countries with bright white borders** = News available
- 🌫️ **Dim countries with faded borders** = News not available

When you click on an unsupported country, you'll see a helpful message explaining the limitation.

## Technology Stack

- **Three.js**: 3D rendering engine
- **Globe.gl**: Globe visualization library
- **NewsData.io**: News data provider with excellent global coverage
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling with animations

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Customization

### Change Globe Appearance
Edit the colors in `app.js`:
```javascript
COLORS: {
    globe: '#1a1f3a',
    atmosphere: '#4facfe',
    land: '#2a5298',
    border: '#4facfe',
    hover: '#00f2fe'
}
```

### Adjust Auto-Rotation Speed
Change the value in `app.js`:
```javascript
AUTO_ROTATE_SPEED: 0.3, // Increase for faster rotation
```

### Change News Results Count
Modify the `size` parameter in the fetch URL (around line 472 in `app.js`):
```javascript
const url = `${CONFIG.NEWS_API_URL}?apikey=${CONFIG.NEWS_API_KEY}&country=${newsApiCode}&size=3&language=en`;
```
Change `size=3` to any number between 1-10 to show more or fewer headlines.

## Troubleshooting

### "Please configure your NewsData.io key" error
- Make sure you've replaced `YOUR_API_KEY_HERE` with your actual API key
- Check that the API key is inside quotes
- Verify your API key from https://newsdata.io/

### Countries not showing news
- **Check if country is supported**: NewsData.io supports 62 countries
- Countries with news available have **brighter colors and borders** on the globe
- Unsupported countries will show a message explaining the limitation
- Check your API key is valid and not expired
- Verify you haven't exceeded the daily request limit (200 for free tier)

### Globe not loading
- Check your internet connection (requires external resources)
- Try a different browser
- Check browser console for errors (F12)

### CORS errors
- Use a local HTTP server instead of opening the file directly
- Follow one of the "Run the Application" methods above

## API Rate Limits

NewsData.io free tier benefits:
- **200 requests per day** (2x more than NewsAPI!)
- Better global coverage with 62+ countries
- Caching is implemented to reduce API calls
- News is cached per country per session
- Includes African and Asian countries that NewsAPI doesn't support

## Credits

- Globe textures: NASA Blue Marble
- Country data: Natural Earth
- News data: NewsData.io
- Built with Three.js and Globe.gl

## License

This project is open source and available for personal and educational use.

## Future Enhancements

Possible improvements:
- Add search functionality to find specific countries
- Category filters (business, sports, technology, etc.)
- Time range selection for news
- Bookmark favorite countries
- Dark/light theme toggle
- Share news articles
- Multiple language support

---

Enjoy exploring the world's news! 🌍📰

