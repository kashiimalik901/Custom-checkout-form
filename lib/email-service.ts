import nodemailer from 'nodemailer'

interface EmailData {
  customerName: string
  email: string
  phone: string
  startAddress: string
  endAddress: string
  distance: number
  selectedServices: string[]
  additionalNotes: string
  totalCost?: number
  attachments?: File[]
}

interface PaymentData extends EmailData {
  paymentId: string
  orderId: string
  transactionId: string
}

// Create transporter for Google SMTP
const createTransporter = () => {
  console.log('Creating email transporter...')
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set')
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set')
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    secure: true,
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Format services for email
const formatServices = (selectedServices: string[]) => {
  const serviceMap = {
    'towing-germany': 'Towing within Germany (€60 base + €1/km)',
    'towing-outside': 'Towing outside Germany (€100 base + €0.80/km)',
    'moving': 'Moving services (€1.50/km)',
    'vehicle-transfer': 'Vehicle transfer (€1.50/km)',
  }

  return selectedServices.map(serviceId => serviceMap[serviceId as keyof typeof serviceMap] || serviceId)
}

// Create quote email HTML content
const createQuoteEmailHTML = (data: EmailData) => {
  const servicesList = formatServices(data.selectedServices).map(service => `<li>${service}</li>`).join('')
  const totalCost = data.totalCost ? `€${data.totalCost.toFixed(2)}` : 'To be calculated'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Quote Request - ENGEL-TRANS</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .service-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .total { font-size: 18px; font-weight: bold; color: #28a745; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .priority { background: #fef3c7; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Quote Request</h1>
          <p><strong>Received:</strong> ${new Date().toLocaleString('de-DE')}</p>
        </div>

        <div class="priority">
          <p><strong>⚠️ Action Required:</strong> Customer is requesting a detailed quote</p>
        </div>

        <div class="section">
          <h2>👤 Customer Information</h2>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
        </div>

        <div class="section">
          <h2>📍 Route Details</h2>
          <p><strong>From:</strong> ${data.startAddress}</p>
          <p><strong>To:</strong> ${data.endAddress}</p>
          <p><strong>Distance:</strong> ${data.distance} km</p>
        </div>

        <div class="section">
          <h2>🛠️ Requested Services</h2>
          <ul>
            ${servicesList}
          </ul>
        </div>

        ${data.additionalNotes ? `
        <div class="section">
          <h2>📝 Customer Notes</h2>
          <p>${data.additionalNotes}</p>
        </div>
        ` : ''}

        <div class="section">
          <h2>💰 Estimated Revenue</h2>
          <p class="total">Potential Revenue (including 19% VAT): ${totalCost}</p>
        </div>

        <div class="footer">
          <p><strong>Service Area:</strong> Germany, Austria, Slovenia, Croatia</p>
          <p><strong>All prices include 19% German VAT</strong></p>
          <p><strong>Next Action:</strong> Contact customer within 24 hours with detailed quote</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Create order confirmation email HTML content
const createOrderConfirmationHTML = (data: PaymentData) => {
  const servicesList = formatServices(data.selectedServices).map(service => `<li>${service}</li>`).join('')
  const totalCost = data.totalCost ? `€${data.totalCost.toFixed(2)}` : 'To be calculated'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order Confirmed - ENGEL-TRANS</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .payment-section { background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
        .service-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .total { font-size: 18px; font-weight: bold; color: #28a745; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .status { background: #28a745; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
        .priority { background: #fef3c7; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ New Order Confirmed</h1>
          <p><strong>Order Date:</strong> ${new Date().toLocaleString('de-DE')}</p>
          <p><strong>Order ID:</strong> ${data.orderId}</p>
        </div>

        <div class="priority">
          <p><strong>🎯 Action Required:</strong> Schedule service and contact customer</p>
        </div>

        <div class="payment-section">
          <h2>💳 Payment Received</h2>
          <p><strong>Status:</strong> <span class="status">PAID</span></p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Payment Method:</strong> PayPal</p>
          <p><strong>Amount Received:</strong> <span class="total">${totalCost}</span></p>
        </div>

        <div class="section">
          <h2>👤 Customer Information</h2>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
        </div>

        <div class="section">
          <h2>📍 Route Details</h2>
          <p><strong>From:</strong> ${data.startAddress}</p>
          <p><strong>To:</strong> ${data.endAddress}</p>
          <p><strong>Distance:</strong> ${data.distance} km</p>
        </div>

        <div class="section">
          <h2>🛠️ Booked Services</h2>
          <ul>
            ${servicesList}
          </ul>
        </div>

        ${data.additionalNotes ? `
        <div class="section">
          <h2>📝 Customer Notes</h2>
          <p>${data.additionalNotes}</p>
        </div>
        ` : ''}

        <div class="section">
          <h2>📞 Contact Customer</h2>
          <p><strong>Next Action:</strong> Contact customer within 24 hours to confirm service details</p>
          <p><strong>Customer Contact:</strong> ${data.phone} | ${data.email}</p>
        </div>

        <div class="footer">
          <p><strong>Service Area:</strong> Germany, Austria, Slovenia, Croatia</p>
          <p><strong>Revenue Generated:</strong> €${data.totalCost?.toFixed(2) || '0.00'}</p>
          <p><strong>Order Status:</strong> Payment confirmed, awaiting service scheduling</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Fallback function to log quote details to console
const logQuoteToConsole = (data: EmailData) => {
  console.log('\n' + '='.repeat(60))
  console.log('📋 NEW QUOTE REQUEST - ENGEL-TRANS')
  console.log('='.repeat(60))
  console.log(`⚠️ ACTION REQUIRED: Customer requesting detailed quote`)
  console.log(`📅 Received: ${new Date().toLocaleString('de-DE')}`)
  console.log(`👤 Customer: ${data.customerName}`)
  console.log(`📧 Email: ${data.email}`)
  console.log(`📞 Phone: ${data.phone}`)
  console.log(`📍 Route: ${data.startAddress} → ${data.endAddress}`)
  console.log(`📏 Distance: ${data.distance} km`)
  console.log(`🛠️ Requested Services: ${formatServices(data.selectedServices).join(', ')}`)
  if (data.additionalNotes) {
    console.log(`📝 Customer Notes: ${data.additionalNotes}`)
  }
  if (data.totalCost) {
    console.log(`💰 Potential Revenue (with 19% VAT): €${data.totalCost.toFixed(2)}`)
  }
  if (data.attachments && data.attachments.length > 0) {
    console.log(`📎 Attachments: ${data.attachments.length} file(s)`)
    data.attachments.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    })
  }
  console.log(`📞 Next Action: Contact customer within 24 hours with detailed quote`)
  console.log(`📧 Email sent to: kashiimalick@gmail.com`)
  console.log(`📧 CC sent to: transport2023de@gmail.com`)
  console.log('='.repeat(60) + '\n')
}

// Fallback function to log order confirmation to console
const logOrderConfirmationToConsole = (data: PaymentData) => {
  console.log('\n' + '='.repeat(60))
  console.log('✅ NEW ORDER CONFIRMED - ENGEL-TRANS')
  console.log('='.repeat(60))
  console.log(`🎯 ACTION REQUIRED: Schedule service and contact customer`)
  console.log(`📅 Order Date: ${new Date().toLocaleString('de-DE')}`)
  console.log(`🆔 Order ID: ${data.orderId}`)
  console.log(`💳 Transaction ID: ${data.transactionId}`)
  console.log(`💰 Revenue Generated: €${data.totalCost?.toFixed(2) || '0.00'}`)
  console.log(`👤 Customer: ${data.customerName}`)
  console.log(`📧 Email: ${data.email}`)
  console.log(`📞 Phone: ${data.phone}`)
  console.log(`📍 Route: ${data.startAddress} → ${data.endAddress}`)
  console.log(`📏 Distance: ${data.distance} km`)
  console.log(`🛠️ Booked Services: ${formatServices(data.selectedServices).join(', ')}`)
  if (data.additionalNotes) {
    console.log(`📝 Customer Notes: ${data.additionalNotes}`)
  }
  console.log(`📞 Next Action: Contact customer within 24 hours to confirm service details`)
  console.log(`📞 Customer Contact: ${data.phone} | ${data.email}`)
  console.log(`📧 Email sent to: kashiimalick@gmail.com`)
  console.log(`📧 CC sent to: transport2023de@gmail.com`)
  console.log('='.repeat(60) + '\n')
}

// Send quote email function
export const sendQuoteEmail = async (data: EmailData) => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('⚠️ Email credentials not configured. Logging quote to console instead.')
      logQuoteToConsole(data)
      return { 
        success: true, 
        messageId: 'console-log',
        message: 'Quote logged to console (email not configured)' 
      }
    }

    console.log('Starting quote email send process...')
    console.log('Sending to: kashiimalick@gmail.com')
    console.log('CC to: transport2023de@gmail.com')
    const transporter = createTransporter()
    
    // Verify transporter
    await transporter.verify()
    console.log('Email transporter verified successfully')
    
         const mailOptions: any = {
       from: process.env.EMAIL_USER,
       to: 'transport2023de@gmail.com', // Your email address
       cc: 'kashiimalick@gmail.com', // CC to business email
       subject: `Transport Quote Request - ${data.customerName} (${data.distance}km)`,
      html: createQuoteEmailHTML(data),
      text: `
NEW QUOTE REQUEST - ENGEL-TRANS

⚠️ ACTION REQUIRED: Customer requesting detailed quote

Customer: ${data.customerName}
Email: ${data.email}
Phone: ${data.phone}

Route: ${data.startAddress} → ${data.endAddress}
Distance: ${data.distance} km

Requested Services: ${formatServices(data.selectedServices).join(', ')}

${data.additionalNotes ? `Customer Notes: ${data.additionalNotes}` : ''}

Potential Revenue (including 19% VAT): ${data.totalCost ? `€${data.totalCost.toFixed(2)}` : 'To be calculated'}

---
Service Area: Germany, Austria, Slovenia, Croatia
Next Action: Contact customer within 24 hours with detailed quote
      `
    }

    // Add attachments if any
    if (data.attachments && data.attachments.length > 0) {
      console.log(`Adding ${data.attachments.length} attachments to email`)
      mailOptions.attachments = await Promise.all(data.attachments.map(async file => {
        // Convert File to Buffer for nodemailer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        return {
          filename: file.name,
          content: buffer,
          contentType: file.type,
        }
      }))
    }

    console.log('Sending quote email...')
    const result = await transporter.sendMail(mailOptions)
    console.log('Quote email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending quote email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)
    
    // Fallback to console logging if email fails
    console.log('⚠️ Quote email failed. Logging to console as fallback.')
    logQuoteToConsole(data)
    
    return { 
      success: false, 
      error: errorMessage,
      message: 'Quote email failed but logged to console' 
    }
  }
}

// Send order confirmation email function
export const sendOrderConfirmationEmail = async (data: PaymentData) => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('⚠️ Email credentials not configured. Logging order confirmation to console instead.')
      logOrderConfirmationToConsole(data)
      return { 
        success: true, 
        messageId: 'console-log',
        message: 'Order confirmation logged to console (email not configured)' 
      }
    }

    console.log('Starting order confirmation email send process...')
    console.log('Sending to: kashiimalick@gmail.com')
    console.log('CC to: transport2023de@gmail.com')
    const transporter = createTransporter()
    
    // Verify transporter
    await transporter.verify()
    console.log('Email transporter verified successfully')
    
         const mailOptions: any = {
       from: process.env.EMAIL_USER,
       to: 'transport2023de@gmail.com', // Your email address
       cc: 'kashiimalick@gmail.com', // CC to business email
       subject: `✅ Order Confirmed - ${data.customerName} (Order #${data.orderId})`,
      html: createOrderConfirmationHTML(data),
      text: `
NEW ORDER CONFIRMED - ENGEL-TRANS

🎯 ACTION REQUIRED: Schedule service and contact customer

Order ID: ${data.orderId}
Transaction ID: ${data.transactionId}
Payment Status: PAID
Payment Method: PayPal
Amount Received: €${data.totalCost?.toFixed(2) || '0.00'}

Customer: ${data.customerName}
Email: ${data.email}
Phone: ${data.phone}

Route: ${data.startAddress} → ${data.endAddress}
Distance: ${data.distance} km

Booked Services: ${formatServices(data.selectedServices).join(', ')}

${data.additionalNotes ? `Customer Notes: ${data.additionalNotes}` : ''}

---
Next Action: Contact customer within 24 hours to confirm service details
Customer Contact: ${data.phone} | ${data.email}
Revenue Generated: €${data.totalCost?.toFixed(2) || '0.00'}
      `
    }

    // Add attachments if any
    if (data.attachments && data.attachments.length > 0) {
      console.log(`Adding ${data.attachments.length} attachments to email`)
      mailOptions.attachments = await Promise.all(data.attachments.map(async file => {
        // Convert File to Buffer for nodemailer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        return {
          filename: file.name,
          content: buffer,
          contentType: file.type,
        }
      }))
    }

    console.log('Sending order confirmation email...')
    const result = await transporter.sendMail(mailOptions)
    console.log('Order confirmation email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending order confirmation email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)
    
    // Fallback to console logging if email fails
    console.log('⚠️ Order confirmation email failed. Logging to console as fallback.')
    logOrderConfirmationToConsole(data)
    
    return { 
      success: false, 
      error: errorMessage,
      message: 'Order confirmation email failed but logged to console' 
    }
  }
} 