# Bike Manager - Resale Analytics

A mobile-first bike resale management web application with comprehensive financial analytics, inventory tracking, and GitHub Gist sync capabilities.

## Features

### 🏍️ Bike Management
- Add, edit, and delete bike records
- Track purchase date, selling date, prices, repair costs, and expenses
- Automatic calculation of profit, margin %, and days held
- Live preview of financial metrics while entering data

### 📊 Dashboard
- **This Month**: Month profit (with trend), unsold count, sold count, month ROI
- **All-Time**: Total profit, unsold investment, average profit per sale, average days to sell
- 8-card responsive grid layout

### 📈 Advanced Analytics
Three comprehensive analytics tabs:

1. **Financial Analytics**
   - Monthly profit trend line chart
   - Top/Bottom performers bar chart
   - Category performance by model/source/price range
   - Key metrics cards

2. **Inventory Intelligence**
   - Aging donut chart (0-30, 31-60, 61-90, 90+ days)
   - Action Required list (60+ days unsold)
   - Quick Sellers list (<30 days)
   - Turnover rate, success rate, average holding cost

3. **Performance Insights**
   - Top 5 most profitable bikes
   - Bottom 5 losses
   - Best performing source/model/price range categories

### 🎯 Key Insights Panel
Always visible summary showing:
- Average profit per sale
- ROI (Return on Investment)
- Locked capital (unsold investment)
- Best month
- Average sale days
- Sweet spot (best price range)

### 🔍 Filters & Sorting
- **Sort Options**: Highest Profit, Lowest Profit, Longest Held, Newest, Oldest
- **Filter Chips**: High Value (>₹50k), Profitable, Unsold, Source type (Dealer/Owner/Auction)
- Filters persist in localStorage
- Combine multiple filters

### 💾 Data Storage
- All data stored in browser localStorage (offline-first)
- Optional GitHub Gist sync using personal access token
- Secure token storage (never logged)
- Export/Import JSON backup

### 📤 Export & Reporting
- **CSV Export**: All financial metrics with proper formatting (PapaParse)
- **PDF Reports**: Monthly reports with summary stats, best/worst bikes, 6-month profit trend, aging distribution (jsPDF)
- Mobile-friendly export buttons

### ⚙️ Settings
- Currency symbol selection (₹, $, €, £)
- Default profit margin configuration
- Advanced analytics toggle
- GitHub Gist sync configuration
- JSON backup/restore

### 🎨 Design
- Mobile-first responsive layout
- Dark/Light theme support (respects system preference)
- Accessible colors and ARIA roles
- Color-coded aging indicators (🟢🟡🟠🔴)
- Smooth animations and transitions
- Compact mobile cards with expandable details

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Mobile-first responsive design with CSS Grid/Flexbox
- **Vanilla JavaScript (ES6 Modules)** - No framework dependencies
- **Chart.js** - Interactive charts and visualizations
- **jsPDF** - PDF generation
- **PapaParse** - CSV parsing/generation
- **Fetch API** - GitHub Gist sync

## File Structure

```
index.html
├─ assets/              # Icons and images
├─ css/
│  └─ styles.css        # Main stylesheet
├─ js/
│  ├─ app.js            # Main entry, routing
│  ├─ utils/
│  │  ├─ financial.js   # Financial calculations
│  │  └─ helpers.js     # Helper functions
│  ├─ storage/
│  │  ├─ local.js       # LocalStorage CRUD
│  │  └─ gist.js        # Gist sync
│  ├─ components/
│  │  ├─ bikeForm.js    # Add/edit form
│  │  ├─ bikeCard.js    # Card component
│  │  ├─ dashboard.js   # Dashboard cards
│  │  ├─ analytics.js   # Analytics tabs
│  │  │  └─ analytics/  # Analytics sub-components
│  │  ├─ filters.js     # Filters/sorting
│  │  ├─ settings.js    # Settings page
│  │  └─ export.js      # CSV/PDF exports
│  └─ charts/
│     ├─ chartHelpers.js # Chart.js setup
│     └─ chartRender.js  # Chart rendering
└─ README.md
```

## Setup

1. **Clone or download** this repository

2. **No build step required** - This is a static web app using ES6 modules

3. **Serve via HTTP** - Open `index.html` directly or use a local server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```

4. **Access** - Open `http://localhost:8000` in your browser

## Usage

### Adding a Bike
1. Click "➕ Add Bike" button
2. Fill in required fields (model, source, purchase date, purchase price)
3. Add optional fields (repair cost, other expenses)
4. Set status to "Sold" to add selling date and price
5. View live preview of calculated metrics
6. Click "Add Bike" to save

### Viewing Analytics
1. Navigate to "Analytics" tab
2. Review Key Insights panel (always visible)
3. Switch between tabs:
   - Financial Analytics
   - Inventory Intelligence
   - Performance Insights

### Exporting Data
- **CSV**: Navigate to Bikes view, use export option (to be added to UI)
- **PDF**: Use export option in settings (to be added to UI)
- **Gist**: Configure GitHub token in Settings, then use "Export to Gist"

### GitHub Gist Sync

1. **Create a Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with `gist` scope
   - Copy the token

2. **Configure in App**:
   - Go to Settings
   - Paste token in "Personal Access Token" field
   - Click "Test Connection" to verify
   - Token is stored securely in localStorage

3. **Sync**:
   - "Export to Gist" - Uploads current data
   - "Import from Gist" - Downloads and merges data

## Data Model

Each bike record contains:
```javascript
{
  id: "unique-id",
  model: "Hero Splendor",
  source: "Dealer" | "Owner" | "Auction",
  purchaseDate: "2024-01-15",
  sellingDate: "2024-02-20", // Only if sold
  purchasePrice: 25000,
  repairCost: 2000,
  otherExpenses: 500,
  sellingPrice: 30000, // Only if sold
  notes: "Additional notes",
  status: "sold" | "unsold",
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

**Derived Fields** (calculated automatically):
- `totalInvestment = purchasePrice + repairCost + otherExpenses`
- `profit = sellingPrice - totalInvestment` (sold only)
- `marginPercent = (profit / totalInvestment) * 100` (sold only)
- `daysHeld = difference between purchaseDate and (sellingDate || today)`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Notes

- All data is stored locally in browser localStorage
- No server required - works completely offline
- GitHub Gist sync is optional
- Charts are lazy-loaded for performance
- Mobile-first design ensures great UX on all devices

## License

Free to use and modify for personal/professional use.

---

**Built with ❤️ for bike resale businesses**

