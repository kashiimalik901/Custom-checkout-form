import { type NextRequest, NextResponse } from "next/server"
import { sendManualPaymentEmail, sendOrderConfirmationEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      email,
      phone,
      bookingDate,
      bookingTime,
      startAddress,
      endAddress,
      distance,
      selectedServices,
      additionalNotes,
      totalCost,
    } = body

    console.log("Manual payment request received:", {
      customerName,
      email,
      totalCost,
      distance,
    })

    // Send manual payment instructions email to customer
    const customerEmailResult = await sendManualPaymentEmail({
      customerName,
      email,
      phone,
      bookingDate,
      bookingTime,
      startAddress,
      endAddress,
      distance,
      selectedServices,
      additionalNotes,
      totalCost,
    })

    if (customerEmailResult.success) {
      // Generate order ID for manual payment
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const paymentId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Send order confirmation email to support
      const supportEmailResult = await sendOrderConfirmationEmail({
        customerName,
        email,
        phone,
        bookingDate,
        bookingTime,
        startAddress,
        endAddress,
        distance,
        selectedServices,
        additionalNotes,
        totalCost,
        paymentId,
        orderId,
        transactionId: paymentId,
      })

      console.log("Manual payment order confirmation email result:", supportEmailResult)

      return NextResponse.json({
        success: true,
        message: "Manual payment instructions sent successfully!",
        messageId: customerEmailResult.messageId,
        orderId: orderId,
        paymentId: paymentId,
        supportEmailSent: supportEmailResult.success,
      })
    } else {
      console.error("Manual payment email sending failed:", customerEmailResult.error)
      return NextResponse.json({
        success: false,
        message: "Failed to send payment instructions. Please contact us directly.",
      })
    }
  } catch (error) {
    console.error("Error processing manual payment request:", error)
    return NextResponse.json(
      { success: false, message: "Failed to process manual payment request" },
      { status: 500 }
    )
  }
} 