Payment prompt remake 
this req be you can call 
endpoint create booking first and when booking create successfully call endpoint payment/create-payment-intent
if user select their card already saved req call intent would be 
{
  "bookingId": 123,
  "paymentMethodId": "pm_123456789",
  "saveCard": false
} 
if user choose a new card req without saving

{
  "bookingId": 123,
  "paymentMethodId": null,
  "saveCard": false
}
else 
{
  "bookingId": 123,
  "paymentMethodId": null,
  "saveCard": true
}
for save on the future

remake the form for fe in stripe 
so when click use a new card 
i wanna use 
<Elements stripe={stripePromise}>

      <PaymentForm />

    </Elements>
    Payment form including

    <CardNumberElement />
       <CardExpiryElement />      
       <CardCvcElement />
       use  const cardNumber = elements.getElement(CardNumberElement); to manage this component
       when use click pay after select day and complete know the price 
       use array booking id to call intent req that i already said 
       be will res client secret use this res and fe call stripe.confirmCardPayment()
    
