const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { contains: "kusi" } }
    });
    
    if (!user) {
      console.log("Mock user not found");
      return;
    }

    console.log("Found user:", user.email);

    const product = await prisma.product.findFirst({
      where: { title: "Precision Grooming Kit" }
    });

    if (!product) {
      console.log("Mock product not found");
      return;
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type: "RETAIL",
        status: "PENDING",
        fulfillmentStatus: "PENDING",
        subtotal: 57000,
        tax: 0,
        shipping: 800,
        total: 57800,
        shippingAddress: {
          create: {
            userId: user.id,
            label: "Checkout",
            line1: "123 Main St",
            line2: "",
            city: "Accra",
            state: "Greater Accra",
            country: "Ghana",
            postalCode: "GA 123-4567"
          }
        },
        items: {
          create: [{
            productId: product.id,
            quantity: 1,
            unitPrice: 57000,
            totalPrice: 57000,
          }]
        }
      }
    });

    console.log("Order created successfully:", order.id);

    // Delete it to clean up
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.address.deleteMany({ where: { id: order.shippingAddressId } });
    await prisma.order.delete({ where: { id: order.id } });
    
  } catch (error) {
    console.error("Prisma Error during order create testing:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
