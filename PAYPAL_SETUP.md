# PayPal Setup Guide for ENGEL-TRANS

## 🔧 Quick Fix for PayPal Errors

The console errors you're seeing are because PayPal isn't properly configured. Here's how to fix it:

### 1. Get Your PayPal Client ID

1. **Go to PayPal Developer Portal**: https://developer.paypal.com/
2. **Sign in** with your PayPal account
3. **Navigate to "My Apps & Credentials"**
4. **Click "Create App"**
5. **Choose "Business" app type**
6. **Give your app a name** (e.g., "ENGEL-TRANS")
7. **Copy the "Client ID"** from your new app

### 2. Add to Environment Variables

Create or update your `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_actual_paypal_client_id_here
```

### 3. Test vs Live Environment

- **For Testing**: Use "Sandbox" environment (no real payments)
- **For Production**: Use "Live" environment (real payments)

### 4. Restart Your Development Server

```bash
npm run dev
```

## 🚨 Common Issues

### Issue: "400 Bad Request" Error
**Solution**: Make sure you're using a real PayPal Client ID, not the placeholder

### Issue: PayPal buttons don't appear
**Solution**: Check that your Client ID is correct and the environment variable is loaded

### Issue: Country dropdown shows only USA
**Solution**: This should be fixed with the updated configuration

## ✅ Verification

After setup, you should see:
- ✅ PayPal buttons appear when you click "Proceed to PayPal Payment"
- ✅ No console errors
- ✅ Payment flow works correctly
- ✅ Email confirmations are sent

## 📞 Support

If you still have issues:
1. Check the browser console for errors
2. Verify your PayPal Client ID is correct
3. Make sure you're using the right environment (Sandbox/Live)
4. Contact PayPal Developer Support if needed

---

**Note**: The PayPal Client ID should look something like: `AY-nyN3hj2U5t1B-9Lucrqi0jTGCbKzCasP...` 