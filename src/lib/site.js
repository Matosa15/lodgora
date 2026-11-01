// Textos e valores da página pública. Para mudar preços ou o email de contacto, é só aqui.
export const SITE = {
  // Email público para "Request a demo". Define a variável VITE_CONTACT_EMAIL no Cloudflare.
  // Se estiver vazia, o botão não aparece.
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  pilotDays: 30,
  // Dados de quem explora o serviço. Aparecem nas páginas de privacidade e termos.
  // Preenche quando tiveres o contabilista/empresa definidos. O que ficar vazio não aparece.
  legal: {
    name: '',        // nome da empresa ou do empresário, por exemplo "Maria Silva (toiminimi)"
    businessId: '',  // Y-tunnus, se existir
    address: '',     // morada para correspondência
    updated: '1 November 2026'
  },
  plans: [
    { name: 'Small', rooms: 'Up to 20 rooms', max: 20, price: 39 },
    { name: 'Medium', rooms: '21 to 50 rooms', max: 50, price: 69 },
    { name: 'Large', rooms: '51 to 100 rooms', max: 100, price: 119 }
  ]
};
