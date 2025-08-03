import nodemailer from 'nodemailer'

interface EmailData {
  customerName: string
  email: string
  phone: string
  bookingDate?: string
  bookingTime?: string
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
    host: 'mail.privateemail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,     // sales@engel-trans.de
      pass: process.env.EMAIL_PASSWORD, // your account password
    },
    tls: {
      rejectUnauthorized: false, // Avoid certificate issues (optional)
    },
  })
}

// Format services for email
const formatServices = (selectedServices: string[]) => {
  const serviceMap = {
    'towing-germany': 'Abschleppen innerhalb Deutschlands (€60 Grundgebühr + €1/km)',
    'towing-outside': 'Abschleppen außerhalb Deutschlands (€100 Grundgebühr + €0.80/km)',
    'moving': 'Umzugsservice (€1.50/km)',
    'vehicle-transfer': 'Überführung Auf Eigene Achse( mit Tüv oder Ohne Tüv  Versichert) (€1.50/km)',
    'vip-transfer': 'VIP Transfer - Direktzahlung',
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
      <title>Neue Angebotsanfrage - ENGEL-TRANS</title>
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
          <h1>📋 Neue Angebotsanfrage</h1>
          <p><strong>Eingegangen:</strong> ${new Date().toLocaleString('de-DE')}</p>
        </div>

        <div class="priority">
          <p><strong>⚠️ Aktion erforderlich:</strong> Kunde fordert ein detailliertes Angebot an</p>
        </div>

        <div class="section">
          <h2>👤 Kundeninformationen</h2>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>E-Mail:</strong> ${data.email}</p>
          <p><strong>Telefon:</strong> ${data.phone}</p>
          ${data.bookingDate ? `<p><strong>Gewünschtes Datum:</strong> ${data.bookingDate}</p>` : ''}
          ${data.bookingTime ? `<p><strong>Gewünschte Uhrzeit:</strong> ${data.bookingTime}</p>` : ''}
        </div>

        <div class="section">
          <h2>📍 Routendetails</h2>
          <p><strong>Von:</strong> ${data.startAddress}</p>
          <p><strong>Nach:</strong> ${data.endAddress}</p>
          <p><strong>Entfernung:</strong> ${data.distance} km</p>
        </div>

        <div class="section">
          <h2>🛠️ Angefragte Dienstleistungen</h2>
          <ul>
            ${servicesList}
          </ul>
        </div>

        ${data.additionalNotes ? `
        <div class="section">
          <h2>📝 Kundennotizen</h2>
          <p>${data.additionalNotes}</p>
        </div>
        ` : ''}

        <div class="section">
          <h2>💰 Geschätzte Einnahmen</h2>
          <p class="total">Potenzielle Einnahmen (inklusive 19% MwSt): ${totalCost}</p>
        </div>

        <div class="footer">
          <p><strong>Servicebereich:</strong> Deutschland, Österreich, Slowenien, Kroatien</p>
          <p><strong>Alle Preise inklusive 19% deutscher MwSt</strong></p>
          <p><strong>Nächste Aktion:</strong> Kontaktieren Sie den Kunden innerhalb von 24 Stunden mit einem detaillierten Angebot</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Create manual payment instructions email HTML content
const createManualPaymentHTML = (data: EmailData) => {
  const servicesList = formatServices(data.selectedServices).map(service => `<li>${service}</li>`).join('')
  const totalCost = data.totalCost ? `€${data.totalCost.toFixed(2)}` : 'To be calculated'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Zahlungsanweisung - ENGEL-TRANS</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .bank-details { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .service-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .total { font-size: 18px; font-weight: bold; color: #f59e0b; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .important { background: #fef3c7; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏦 Zahlungsanweisung - ENGEL-TRANS</h1>
          <p><strong>Datum:</strong> ${new Date().toLocaleString('de-DE')}</p>
        </div>

        <div class="important">
          <p><strong>⚠️ Wichtig:</strong> Bitte überweisen Sie den Betrag an die folgenden Bankdaten</p>
        </div>

        <div class="section">
          <h2>👤 Ihre Bestelldetails</h2>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>E-Mail:</strong> ${data.email}</p>
          <p><strong>Telefon:</strong> ${data.phone}</p>
          ${data.bookingDate ? `<p><strong>Gewünschtes Datum:</strong> ${data.bookingDate}</p>` : ''}
          ${data.bookingTime ? `<p><strong>Gewünschte Uhrzeit:</strong> ${data.bookingTime}</p>` : ''}
        </div>

        <div class="section">
          <h2>📍 Routendetails</h2>
          <p><strong>Von:</strong> ${data.startAddress}</p>
          <p><strong>Nach:</strong> ${data.endAddress}</p>
          <p><strong>Entfernung:</strong> ${data.distance} km</p>
        </div>

        <div class="section">
          <h2>🛠️ Gebuchte Dienstleistungen</h2>
          <ul>
            ${servicesList}
          </ul>
        </div>

        ${data.additionalNotes ? `
        <div class="section">
          <h2>📝 Ihre Notizen</h2>
          <p>${data.additionalNotes}</p>
        </div>
        ` : ''}

        <div class="bank-details">
          <h2>🏦 Bankdaten für Überweisung</h2>
          <p><strong>Empfänger:</strong> Transport Online Handel</p>
          <p><strong>IBAN:</strong> DE76 7002 0270 0045 0809 78</p>
          <p><strong>BIC:</strong> HYVEDEMMXXX</p>
          <p><strong>Betrag:</strong> <span class="total">${totalCost}</span></p>
          <p><strong>Verwendungszweck:</strong> ENGEL-TRANS ${data.customerName}</p>
        </div>

        <div class="important">
          <h3>⚠️ Wichtige Hinweise</h3>
          <ul>
            <li>Bitte geben Sie Ihren Namen als Verwendungszweck an</li>
            <li>Die Zahlung wird nach Eingang bestätigt</li>
            <li>Service wird nach Zahlungseingang geplant</li>
            <li>Bei Fragen kontaktieren Sie uns: +49 152 13550785</li>
          </ul>
        </div>

        <div class="footer">
          <p><strong>Servicebereich:</strong> Deutschland, Österreich, Slowenien, Kroatien</p>
          <p><strong>Alle Preise inklusive 19% deutscher MwSt</strong></p>
          <p><strong>Kontakt:</strong> kashiimalik901@gmail.com | +49 152 13550785</p>
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
      <title>Neue Bestellung bestätigt - ENGEL-TRANS</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .payment-section { background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
        .service-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .total { font-size: 18px; font-weight: bold; color: #28a745; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .status { background: #fef3c7; color: black; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
        .priority { background: #fef3c7; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Neue Bestellung bestätigt</h1>
          <p><strong>Bestelldatum:</strong> ${new Date().toLocaleString('de-DE')}</p>
          <p><strong>Bestell-ID:</strong> ${data.orderId}</p>
        </div>

        <div class="priority">
          <p><strong>🎯 Aktion erforderlich:</strong> Service planen und Kunde kontaktieren</p>
        </div>

                 <div class="payment-section">
           <h2>💳 Zahlung erhalten</h2>
           <p><strong>Status:</strong> <span class="status"> ${data.transactionId.startsWith('MANUAL-') ? 'Ausstehend' : 'BEZAHLT'}BEZAHLT</span></p> 
           <p><strong>Transaktions-ID:</strong> ${data.transactionId}</p>
           <p><strong>Zahlungsmethode:</strong> ${data.transactionId.startsWith('MANUAL-') ? 'Überweisung (Banküberweisung)' : 'PayPal'}</p>
           <p><strong>Zahlungsstatus:</strong> ${data.transactionId.startsWith('MANUAL-') ? 'Anweisung gesendet - Wartend auf Zahlungseingang' : 'Bestätigt'}</p>
           <p><strong>Erhaltener Betrag:</strong> <span class="total">${totalCost}</span></p>
         </div>

        <div class="section">
          <h2>👤 Kundeninformationen</h2>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>E-Mail:</strong> ${data.email}</p>
          <p><strong>Telefon:</strong> ${data.phone}</p>
          ${data.bookingDate ? `<p><strong>Gewünschtes Datum:</strong> ${data.bookingDate}</p>` : ''}
          ${data.bookingTime ? `<p><strong>Gewünschte Uhrzeit:</strong> ${data.bookingTime}</p>` : ''}
        </div>

        <div class="section">
          <h2>📍 Routendetails</h2>
          <p><strong>Von:</strong> ${data.startAddress}</p>
          <p><strong>Nach:</strong> ${data.endAddress}</p>
          <p><strong>Entfernung:</strong> ${data.distance} km</p>
        </div>

        <div class="section">
          <h2>🛠️ Gebuchte Dienstleistungen</h2>
          <ul>
            ${servicesList}
          </ul>
        </div>

        ${data.additionalNotes ? `
        <div class="section">
          <h2>📝 Kundennotizen</h2>
          <p>${data.additionalNotes}</p>
        </div>
        ` : ''}

        <div class="section">
          <h2>📞 Kunde kontaktieren</h2>
          <p><strong>Nächste Aktion:</strong> Kontaktieren Sie den Kunden innerhalb von 24 Stunden, um Servicedetails zu bestätigen</p>
          <p><strong>Kundenkontakt:</strong> ${data.phone} | ${data.email}</p>
        </div>

        <div class="footer">
          <p><strong>Servicebereich:</strong> Deutschland, Österreich, Slowenien, Kroatien</p>
          <p><strong>Generierte Einnahmen:</strong> €${data.totalCost?.toFixed(2) || '0.00'}</p>
          <p><strong>Bestellstatus:</strong> Zahlung bestätigt, wartend auf Serviceplanung</p>
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
  console.log(`📅 Preferred Date: ${data.bookingDate || 'Not specified'}`)
  console.log(`🕐 Preferred Time: ${data.bookingTime || 'Not specified'}`)
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
  console.log(`📧 Email sent to: kashiimalik901@gmail.com`)
  console.log(`📧 CC sent to: kashiimalick@gmail.com`)
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
  console.log(`📅 Preferred Date: ${data.bookingDate || 'Not specified'}`)
  console.log(`🕐 Preferred Time: ${data.bookingTime || 'Not specified'}`)
  console.log(`📍 Route: ${data.startAddress} → ${data.endAddress}`)
  console.log(`📏 Distance: ${data.distance} km`)
  console.log(`🛠️ Booked Services: ${formatServices(data.selectedServices).join(', ')}`)
  if (data.additionalNotes) {
    console.log(`📝 Customer Notes: ${data.additionalNotes}`)
  }
  console.log(`📞 Next Action: Contact customer within 24 hours to confirm service details`)
  console.log(`📞 Customer Contact: ${data.phone} | ${data.email}`)
  console.log(`📧 Email sent to: kashiimalik901@gmail.com`)
  console.log(`📧 CC sent to: kashiimalick@gmail.com`)
  console.log('='.repeat(60) + '\n')
}

// Fallback function to log manual payment details to console
const logManualPaymentToConsole = (data: EmailData) => {
  console.log('\n' + '='.repeat(60))
  console.log('🏦 MANUAL PAYMENT REQUEST - ENGEL-TRANS')
  console.log('='.repeat(60))
  console.log(`⚠️ ACTION REQUIRED: Customer requesting bank transfer instructions`)
  console.log(`📅 Received: ${new Date().toLocaleString('de-DE')}`)
  console.log(`👤 Customer: ${data.customerName}`)
  console.log(`📧 Email: ${data.email}`)
  console.log(`📞 Phone: ${data.phone}`)
  console.log(`📅 Preferred Date: ${data.bookingDate || 'Not specified'}`)
  console.log(`🕐 Preferred Time: ${data.bookingTime || 'Not specified'}`)
  console.log(`📍 Route: ${data.startAddress} → ${data.endAddress}`)
  console.log(`📏 Distance: ${data.distance} km`)
  console.log(`🛠️ Requested Services: ${formatServices(data.selectedServices).join(', ')}`)
  if (data.additionalNotes) {
    console.log(`📝 Customer Notes: ${data.additionalNotes}`)
  }
  if (data.totalCost) {
    console.log(`💰 Amount Due (with 19% VAT): €${data.totalCost.toFixed(2)}`)
  }
  console.log(`🏦 Bank Details:`)
  console.log(`   Empfänger: Transport Online Handel`)
  console.log(`   IBAN: DE76 7002 0270 0045 0809 78`)
  console.log(`   BIC: HYVEDEMMXXX`)
  console.log(`   Betrag: €${data.totalCost?.toFixed(2) || '0.00'}`)
  console.log(`   Verwendungszweck: ENGEL-TRANS ${data.customerName}`)
  console.log(`📧 Payment instructions sent to: ${data.email}`)
  console.log(`📧 CC sent to: kashiimalik901@gmail.com`)
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
    console.log('Sending to: kashiimalik901@gmail.com')
    console.log('CC to: kashiimalick@gmail.com')
    const transporter = createTransporter()

    // Verify transporter
    await transporter.verify()
    console.log('Email transporter verified successfully')

    const mailOptions: any = {
      from: process.env.EMAIL_USER,
      to: 'kashiimalick@gmail.com', // Your email address
      cc: 'kashiimalik901@gmail.com', // CC to business email
      subject: `Transport Quote Request - ${data.customerName} (${data.distance}km)`,
      html: createQuoteEmailHTML(data),
      text: `
NEW QUOTE REQUEST - ENGEL-TRANS

⚠️ ACTION REQUIRED: Customer requesting detailed quote

Customer: ${data.customerName}
Email: ${data.email}
Phone: ${data.phone}
${data.bookingDate ? `Preferred Date: ${data.bookingDate}` : ''}
${data.bookingTime ? `Preferred Time: ${data.bookingTime}` : ''}

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
    // Add attachments if any
    if (data.attachments && data.attachments.length > 0) {
      console.log(`Adding ${data.attachments.length} attachments to email`)
      mailOptions.attachments = await Promise.all(
        data.attachments.map(async (file) => {
          // Convert File to Buffer for nodemailer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          return {
            filename: file.name,
            content: buffer,
            contentType: file.type,
          }
        }),
      )
    } else {
      // Explicitly set attachments to empty array when no attachments
      mailOptions.attachments = []
      console.log("No attachments to add")
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
    console.log('Sending to: kashiimalik901@gmail.com')
    console.log('CC to: kashiimalick@gmail.com')
    const transporter = createTransporter()

    // Verify transporter
    await transporter.verify()
    console.log('Email transporter verified successfully')

    const mailOptions: any = {
      from: process.env.EMAIL_USER,
      to: 'kashiimalick@gmail.com', // Your email address
      cc: 'kashiimalik901@gmail.com', // CC to business email
      subject: `✅ Order Confirmed - ${data.customerName} (Order #${data.orderId})`,
      html: createOrderConfirmationHTML(data),
      text: `
NEW ORDER CONFIRMED - ENGEL-TRANS

🎯 ACTION REQUIRED: Schedule service and contact customer

Order ID: ${data.orderId}
Transaction ID: ${data.transactionId}
Payment Status: PAID
Payment Method: ${data.transactionId.startsWith('MANUAL-') ? 'Überweisung (Banküberweisung)' : 'PayPal'}
Payment Status: ${data.transactionId.startsWith('MANUAL-') ? 'Anweisung gesendet - Wartend auf Zahlungseingang' : 'Confirmed'}
Amount Received: €${data.totalCost?.toFixed(2) || '0.00'}

Customer: ${data.customerName}
Email: ${data.email}
Phone: ${data.phone}
${data.bookingDate ? `Preferred Date: ${data.bookingDate}` : ''}
${data.bookingTime ? `Preferred Time: ${data.bookingTime}` : ''}

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
    // Add attachments if any
    if (data.attachments && data.attachments.length > 0) {
      console.log(`Adding ${data.attachments.length} attachments to email`)
      mailOptions.attachments = await Promise.all(
        data.attachments.map(async (file) => {
          // Convert File to Buffer for nodemailer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          return {
            filename: file.name,
            content: buffer,
            contentType: file.type,
          }
        }),
      )
    } else {
      // Explicitly set attachments to empty array when no attachments
      mailOptions.attachments = []
      console.log("No attachments to add")
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

// Send manual payment instructions email function
export const sendManualPaymentEmail = async (data: EmailData) => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('⚠️ Email credentials not configured. Logging manual payment to console instead.')
      logManualPaymentToConsole(data)
      return {
        success: true,
        messageId: 'console-log',
        message: 'Manual payment logged to console (email not configured)'
      }
    }

    console.log('Starting manual payment email send process...')
    console.log('Sending to:', data.email)
    console.log('CC to: kashiimalik901@gmail.com')
    const transporter = createTransporter()

    // Verify transporter
    await transporter.verify()
    console.log('Email transporter verified successfully')

    const mailOptions: any = {
      from: process.env.EMAIL_USER,
      to: data.email, // Send to customer
      subject: `🏦 Zahlungsanweisung - ENGEL-TRANS (€${data.totalCost?.toFixed(2) || '0.00'})`,
      html: createManualPaymentHTML(data),
      text: `
Zahlungsanweisung - ENGEL-TRANS

⚠️ Wichtig: Bitte überweisen Sie den Betrag an die folgenden Bankdaten

Ihre Bestelldetails:
Name: ${data.customerName}
E-Mail: ${data.email}
Telefon: ${data.phone}
${data.bookingDate ? `Gewünschtes Datum: ${data.bookingDate}` : ''}
${data.bookingTime ? `Gewünschte Uhrzeit: ${data.bookingTime}` : ''}

Routendetails:
Von: ${data.startAddress}
Nach: ${data.endAddress}
Entfernung: ${data.distance} km

Gebuchte Dienstleistungen: ${formatServices(data.selectedServices).join(', ')}

${data.additionalNotes ? `Ihre Notizen: ${data.additionalNotes}` : ''}

🏦 Bankdaten für Überweisung:
Empfänger: Transport Online Handel
IBAN: DE76 7002 0270 0045 0809 78
BIC: HYVEDEMMXXX
Betrag: €${data.totalCost?.toFixed(2) || '0.00'}
Verwendungszweck: ENGEL-TRANS ${data.customerName}

⚠️ Wichtige Hinweise:
- Bitte geben Sie Ihren Namen als Verwendungszweck an
- Die Zahlung wird nach Eingang bestätigt
- Service wird nach Zahlungseingang geplant
- Bei Fragen kontaktieren Sie uns: +49 152 13550785

---
Servicebereich: Deutschland, Österreich, Slowenien, Kroatien
Alle Preise inklusive 19% deutscher MwSt
Kontakt: kashiimalik901@gmail.com | +49 152 13550785
      `
    }

    console.log('Sending manual payment email...')
    const result = await transporter.sendMail(mailOptions)
    console.log('Manual payment email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending manual payment email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)

    // Fallback to console logging if email fails
    console.log('⚠️ Manual payment email failed. Logging to console as fallback.')
    logManualPaymentToConsole(data)

    return {
      success: false,
      error: errorMessage,
      message: 'Manual payment email failed but logged to console'
    }
  }
} 