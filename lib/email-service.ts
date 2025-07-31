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

// Create transporter for Google SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASSWORD, // Your Gmail app password
    },
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

// Create email HTML content
const createEmailHTML = (data: EmailData) => {
  const servicesList = formatServices(data.selectedServices).map(service => `<li>${service}</li>`).join('')
  const totalCost = data.totalCost ? `€${data.totalCost.toFixed(2)}` : 'To be calculated'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Transport Service Quote</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .service-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .total { font-size: 18px; font-weight: bold; color: #28a745; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚛 Transport Service Quote</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
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
          <h2>🛠️ Selected Services</h2>
          <ul>
            ${servicesList}
          </ul>
        </div>

        ${data.additionalNotes ? `
        <div class="section">
          <h2>📝 Additional Notes</h2>
          <p>${data.additionalNotes}</p>
        </div>
        ` : ''}

        <div class="section">
          <h2>💰 Estimated Total</h2>
          <p class="total">Total Cost (including 19% VAT): ${totalCost}</p>
        </div>

        <div class="footer">
          <p><strong>Service Area:</strong> Germany, Austria, Slovenia, Croatia</p>
          <p><strong>All prices include 19% German VAT</strong></p>
          <p>This is an automated quote. For detailed pricing and booking, please contact us directly.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Send email function
export const sendQuoteEmail = async (data: EmailData) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions: any = {
      from: process.env.EMAIL_USER,
      to: 'kashiimalick@gmail.com', // Your email address
      subject: `Transport Quote - ${data.customerName} (${data.distance}km)`,
      html: createEmailHTML(data),
      text: `
Transport Service Quote

Customer: ${data.customerName}
Email: ${data.email}
Phone: ${data.phone}

Route: ${data.startAddress} → ${data.endAddress}
Distance: ${data.distance} km

Services: ${formatServices(data.selectedServices).join(', ')}

${data.additionalNotes ? `Notes: ${data.additionalNotes}` : ''}

Total Cost (including 19% VAT): ${data.totalCost ? `€${data.totalCost.toFixed(2)}` : 'To be calculated'}

---
Service Area: Germany, Austria, Slovenia, Croatia
All prices include 19% German VAT
      `
    }

    // Add attachments if any
    if (data.attachments && data.attachments.length > 0) {
      mailOptions.attachments = data.attachments.map(file => ({
        filename: file.name,
        content: file,
      }))
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 