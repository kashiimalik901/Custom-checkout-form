import { type NextRequest, NextResponse } from "next/server"
import { sendOrderConfirmationEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, customerInfo, serviceDetails, totalAmount } = body

    console.log("Payment processed:", {
      paymentId,
      customerInfo,
      serviceDetails,
      totalAmount,
      timestamp: new Date().toISOString(),
    })

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Send order confirmation email with payment details
    const emailData = {
      customerName: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      startAddress: serviceDetails.startAddress,
      endAddress: serviceDetails.endAddress,
      distance: serviceDetails.distance,
      selectedServices: serviceDetails.services,
      additionalNotes: serviceDetails.notes || "",
      totalCost: totalAmount,
      paymentId: paymentId,
      orderId: orderId,
      transactionId: paymentId, // PayPal transaction ID
    }

    console.log("Attempting to send order confirmation email...")
    console.log("Email data:", emailData)
    
    const emailResult = await sendOrderConfirmationEmail(emailData)
    console.log("Email result:", emailResult)

    if (!emailResult.success) {
      console.error("Failed to send order confirmation email:", emailResult.error)
      // Continue with payment processing even if email fails
    } else {
      console.log("✅ Order confirmation email sent successfully")
    }

    // TODO: Save to database
    // TODO: Schedule service

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      orderId: orderId,
      paymentId: paymentId,
      emailSent: emailResult.success,
      emailMessage: emailResult.message || "Email sent successfully",
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to process payment",
        error: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}
