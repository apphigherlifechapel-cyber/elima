import CheckoutSuccessClient from "@/components/checkout/CheckoutSuccessClient";

interface CheckoutSuccessPageProps {
  searchParams: {
    reference?: string;
    orderId?: string;
  };
}

export default function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const reference = searchParams.reference ?? "";
  const orderId = searchParams.orderId ?? "";

  return <CheckoutSuccessClient reference={reference} orderId={orderId} />;
}
