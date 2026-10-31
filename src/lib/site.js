// Textos e valores da página pública. Para mudar preços ou o email de contacto, é só aqui.
export const SITE = {
  // Email público para "Request a demo". Define a variável VITE_CONTACT_EMAIL no Cloudflare.
  // Se estiver vazia, o botão não aparece.
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  pilotDays: 30,
  plans: [
    { name: 'Small', rooms: 'Up to 20 rooms', price: 39 },
    { name: 'Medium', rooms: '21 to 50 rooms', price: 69 },
    { name: 'Large', rooms: '51 to 100 rooms', price: 119 }
  ]
};
