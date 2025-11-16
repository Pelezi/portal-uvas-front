export interface DefaultCategory {
  name: string;
  type: 'EXPENSE' | 'INCOME';
  subcategories: string[];
}

export const defaultCategoriesEN: DefaultCategory[] = [
  {
    name: 'Children',
    type: 'EXPENSE',
    subcategories: ['Activities', 'Allowance', 'Medical', 'Childcare', 'Clothing', 'School', 'Toys', 'Other']
  },
  {
    name: 'Debt',
    type: 'EXPENSE',
    subcategories: ['Credit cards', 'Student loans', 'Other loans', 'Taxes', 'Other']
  },
  {
    name: 'Education',
    type: 'EXPENSE',
    subcategories: ['Tuition', 'Books', 'Music lessons', 'Other']
  },
  {
    name: 'Entertainment',
    type: 'EXPENSE',
    subcategories: ['Books', 'Concerts/shows', 'Games', 'Hobbies', 'Movies', 'Music', 'Outdoor activities', 'Photography', 'Sports', 'Theater/plays', 'TV', 'Other']
  },
  {
    name: 'Everyday',
    type: 'EXPENSE',
    subcategories: ['Groceries', 'Restaurants', 'Personal supplies', 'Clothes', 'Laundry/dry cleaning', 'Hair/beauty', 'Subscriptions', 'Other']
  },
  {
    name: 'Gifts',
    type: 'EXPENSE',
    subcategories: ['Gifts', 'Donations (charity)', 'Other']
  },
  {
    name: 'Health/medical',
    type: 'EXPENSE',
    subcategories: ['Doctors/dental/vision', 'Health insurance', 'Pharmacy', 'Emergency', 'Other']
  },
  {
    name: 'Home',
    type: 'EXPENSE',
    subcategories: ['Rent/mortgage', 'Property taxes', 'Furnishings', 'Lawn/garden', 'Supplies', 'Maintenance', 'Improvements', 'Moving', 'Other']
  },
  {
    name: 'Insurance',
    type: 'EXPENSE',
    subcategories: ['Car', 'Health', 'Home', 'Life', 'Other']
  },
  {
    name: 'Pets',
    type: 'EXPENSE',
    subcategories: ['Food', 'Vet/medical', 'Toys', 'Supplies', 'Other']
  },
  {
    name: 'Technology',
    type: 'EXPENSE',
    subcategories: ['Domains & hosting', 'Online services', 'Hardware', 'Software', 'Other']
  },
  {
    name: 'Transportation',
    type: 'EXPENSE',
    subcategories: ['Fuel', 'Car payments', 'Repairs', 'Registration/license', 'Supplies', 'Public transit', 'Other']
  },
  {
    name: 'Travel',
    type: 'EXPENSE',
    subcategories: ['Airfare', 'Hotels', 'Food', 'Transportation', 'Entertainment', 'Other']
  },
  {
    name: 'Utilities',
    type: 'EXPENSE',
    subcategories: ['Phone', 'TV', 'Internet', 'Electricity', 'Heat/gas', 'Water', 'Trash', 'Other']
  },
  {
    name: 'Wages',
    type: 'INCOME',
    subcategories: ['Paycheck', 'Tips', 'Bonus', 'Commission', 'Other']
  },
  {
    name: 'Other',
    type: 'INCOME',
    subcategories: ['Transfer from savings', 'Interest income', 'Dividends', 'Gifts', 'Refunds', 'Other']
  }
];

export const defaultCategoriesPT: DefaultCategory[] = [
  {
    name: 'Filhos',
    type: 'EXPENSE',
    subcategories: ['Atividades', 'Mesada', 'Saúde', 'Creche/babá', 'Roupas', 'Escola', 'Brinquedos', 'Outros']
  },
  {
    name: 'Dívidas',
    type: 'EXPENSE',
    subcategories: ['Cartões de crédito', 'Financiamento estudantil', 'Outros empréstimos', 'Impostos', 'Outros']
  },
  {
    name: 'Educação',
    type: 'EXPENSE',
    subcategories: ['Mensalidade', 'Livros', 'Aulas de música', 'Outros']
  },
  {
    name: 'Entretenimento',
    type: 'EXPENSE',
    subcategories: ['Livros', 'Shows/espetáculos', 'Jogos', 'Hobbies', 'Cinema', 'Música', 'Atividades ao ar livre', 'Fotografia', 'Esportes', 'Peças de teatro', 'TV', 'Outros']
  },
  {
    name: 'Despesas diárias',
    type: 'EXPENSE',
    subcategories: ['Supermercado', 'Restaurantes', 'Higiene pessoal', 'Roupas', 'Lavanderia/lavagem a seco', 'Cabelo/beleza', 'Assinaturas', 'Outros']
  },
  {
    name: 'Presentes',
    type: 'EXPENSE',
    subcategories: ['Presentes', 'Doações (caridade)', 'Outros']
  },
  {
    name: 'Saúde',
    type: 'EXPENSE',
    subcategories: ['Médico', 'Plano de saúde', 'Farmácia', 'Emergência', 'Outros']
  },
  {
    name: 'Casa',
    type: 'EXPENSE',
    subcategories: ['Aluguel/financiamento', 'IPTU', 'Móveis', 'Gramado/jardim', 'Suprimentos', 'Manutenção', 'Melhorias', 'Mudança', 'Outros']
  },
  {
    name: 'Seguro',
    type: 'EXPENSE',
    subcategories: ['Veículo', 'Saúde', 'Residencial', 'Vida', 'Outros']
  },
  {
    name: 'Animais de estimação',
    type: 'EXPENSE',
    subcategories: ['Alimentação', 'Veterinário', 'Brinquedos', 'Suprimentos', 'Outros']
  },
  {
    name: 'Tecnologia',
    type: 'EXPENSE',
    subcategories: ['Domínios e hospedagem', 'Serviços on-line', 'Hardware', 'Software', 'Outros']
  },
  {
    name: 'Transporte',
    type: 'EXPENSE',
    subcategories: ['Combustível', 'Prestações do carro', 'Consertos', 'Emplacamento/habilitação', 'Suprimentos', 'Transporte público', 'Outros']
  },
  {
    name: 'Viagens',
    type: 'EXPENSE',
    subcategories: ['Passagem aérea', 'Hotéis', 'Alimentação', 'Transporte', 'Entretenimento', 'Outros']
  },
  {
    name: 'Utilidades',
    type: 'EXPENSE',
    subcategories: ['Telefone', 'TV', 'Internet', 'Luz', 'Gás', 'Água', 'Lixo', 'Outros']
  },
  {
    name: 'Salário',
    type: 'INCOME',
    subcategories: ['Salário', 'Gorjetas', 'Bônus', 'Comissão', 'Outros']
  },
  {
    name: 'Outros',
    type: 'INCOME',
    subcategories: ['Transferência de poupança', 'Renda de juros', 'Dividendos', 'Presentes', 'Reembolsos', 'Outros']
  }
];
