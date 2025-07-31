# ENGEL-TRANS Service Checkout Form

A professional transport service booking application for ENGEL-TRANS, specializing in towing and transferring cars/trucks up to 5T with automatic distance calculation and payment integration, focused on Central European markets.

## 🌟 Features

### **Location Services**
- **Smart Address Search**: Autocomplete with street-level addresses
- **Geographic Restrictions**: Limited to Germany, Austria, Slovenia, and Croatia
- **Automatic Distance Calculation**: Real-time distance calculation using Google Routes API
- **Route Optimization**: Traffic-aware routing for accurate travel times

### **Service Types**
- **🇩🇪 Towing within Germany**: €60 base fee + €1 per km
- **🌍 Towing outside Germany**: €100 base fee + €0.80 per km  
- **🏠 Moving services**: €1.50 per km (no base fee)
- **🚗 Vehicle transfer**: €1.50 per km (no base fee)
- **💰 All prices include 19% VAT** (German tax rate)

### **Payment & Estimates**
- **PayPal Integration**: Secure payment processing
- **Detailed Estimates**: Email-based quote requests
- **Real-time Pricing**: Automatic cost calculation with VAT
- **Service Breakdown**: Transparent pricing display

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kashiimalik901/Custom-checkout-form.git
   cd Custom-checkout-form
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

4. **Enable required Google APIs**
   - [Routes API](https://console.developers.google.com/apis/api/routes.googleapis.com/overview)
   - [Places API](https://console.developers.google.com/apis/api/places.googleapis.com/overview)
   - [Maps JavaScript API](https://console.developers.google.com/apis/api/maps-javascript.googleapis.com/overview)

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Maps**: Google Maps APIs (Places, Routes, JavaScript)
- **Payment**: PayPal React SDK
- **Forms**: React Hook Form with Zod validation

## 📁 Project Structure

```
service-checkout-form/
├── app/
│   ├── api/                    # API routes
│   │   ├── calculate-distance/ # Distance calculation
│   │   ├── search-places/      # Address search
│   │   ├── send-estimate/      # Estimate requests
│   │   └── process-payment/    # Payment processing
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main application
├── components/
│   └── ui/                     # Reusable UI components
├── lib/
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

## 🔧 API Endpoints

### `POST /api/search-places`
Search for addresses in Central Europe
```json
{
  "query": "search term",
  "region": "DE"
}
```

### `POST /api/calculate-distance`
Calculate route distance between two places
```json
{
  "originPlaceId": "place_id_1",
  "destinationPlaceId": "place_id_2"
}
```

### `POST /api/send-estimate`
Send detailed estimate request
```json
{
  "customerName": "string",
  "email": "string",
  "phone": "string",
  "startAddress": "string",
  "endAddress": "string",
  "distance": "number",
  "selectedServices": ["array"],
  "additionalNotes": "string"
}
```

## 🌍 Geographic Coverage

The application is specifically designed for Central European transport services:

- **🇩🇪 Germany** (Deutschland)
- **🇦🇹 Austria** (Österreich)
- **🇸🇮 Slovenia**
- **🇭🇷 Croatia**

All address searches and distance calculations are optimized for these regions.

## 💰 Pricing Structure

All prices include 19% German VAT:

| Service | Base Fee | Per KM | Coverage |
|---------|----------|--------|----------|
| Towing (Germany) | €60 | €1.00 | Within Germany |
| Towing (International) | €100 | €0.80 | Outside Germany |
| Moving Services | €0 | €1.50 | All regions |
| Vehicle Transfer | €0 | €1.50 | All regions |

## 🔐 Environment Variables

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please contact the development team or create an issue in this repository.

---

**Built with ❤️ for ENGEL-TRANS - Professional Towing & Transport Services** 