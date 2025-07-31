// Test script to verify order confirmation email functionality
const testOrderConfirmationEmail = async () => {
  try {
    console.log('Testing order confirmation email functionality...')
    
    const testData = {
      paymentId: 'TEST-PAYMENT-123',
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
      },
      serviceDetails: {
        startAddress: 'Berlin, Germany',
        endAddress: 'Munich, Germany',
        distance: 585,
        services: ['towing-germany'],
        notes: 'Test order confirmation email',
      },
      totalAmount: 1234.56,
    }

    console.log('Sending test order confirmation data:', testData)

    const response = await fetch('http://localhost:3000/api/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    const result = await response.json()
    console.log('Order confirmation result:', result)

    if (result.success) {
      console.log('✅ Order confirmation test successful!')
      console.log('Order ID:', result.orderId)
      console.log('Email sent:', result.emailSent)
      console.log('Email message:', result.emailMessage)
    } else {
      console.log('❌ Order confirmation test failed:', result.message)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testOrderConfirmationEmail() 