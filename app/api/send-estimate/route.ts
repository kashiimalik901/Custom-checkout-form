import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, email, phone, startAddress, endAddress, distance, selectedServices, additionalNotes } = body

    // Here you would integrate with your email service (Gmail, SendGrid, etc.)
    // For now, we'll just log the estimate request
    console.log("Estimate request received:", {
      customerName,
      email,
      phone,
      startAddress,
      endAddress,
      distance,
      selectedServices,
      additionalNotes,
      timestamp: new Date().toISOString(),
    })

    // TODO: Send email to business owner and customer
    // Example with nodemailer or your preferred email service:
    /*
    await sendEmail({
      to: 'business@yourcompany.com',
      subject: 'New Transport Estimate Request',
      html: `
        <h2>New Estimate Request</h2>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Route:</strong> ${startAddress} → ${endAddress}</p>
        <p><strong>Distance:</strong> ${distance} km</p>
        <p><strong>Services:</strong> ${selectedServices.join(', ')}</p>
        <p><strong>Notes:</strong> ${additionalNotes}</p>
      `
    })
    */

    return NextResponse.json({
      success: true,
      message: "Estimate request received successfully",
    })
  } catch (error) {
    console.error("Error processing estimate request:", error)
    return NextResponse.json({ success: false, message: "Failed to process estimate request" }, { status: 500 })
  }
}
