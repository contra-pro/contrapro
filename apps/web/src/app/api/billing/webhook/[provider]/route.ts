import { billingWebhook } from "../../../../../billing/webhook";
// No commercial provider has been selected or activated. After explicit approval,
// inject its isolated authenticated adapter + ProviderGateway here. Fails closed.
export async function POST(request:Request) {return billingWebhook(request,null);}
