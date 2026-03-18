import CheckoutSuccessClient from "@/components/checkout/CheckoutSuccessClient";

interface CheckoutSuccessPageProps {
  searchParams: Promise<{
    reference?: string;
    orderId?: string;
    trxref?: string;
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const reference = params.trxref ?? params.reference ?? "";
  const orderId = params.orderId ?? "";

  return <CheckoutSuccessClient reference={reference} orderId={orderId} />;
}
