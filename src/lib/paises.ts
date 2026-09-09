/**
 * Lista de países com códigos de discagem internacional (PT).
 * Ordenada com Moçambique e vizinhos/SADC primeiro para acesso rápido.
 */
export interface Pais {
  codigo: string; // ISO 3166-1 alpha-2
  nome: string;
  dial: string; // código de discagem, ex: "+258"
}

export const PAISES: Pais[] = [
  // Moçambique e prioritários
  { codigo: 'MZ', nome: 'Moçambique', dial: '+258' },
  { codigo: 'ZA', nome: 'África do Sul', dial: '+27' },
  { codigo: 'ZW', nome: 'Zimbabué', dial: '+263' },
  { codigo: 'MW', nome: 'Maláui', dial: '+265' },
  { codigo: 'TZ', nome: 'Tanzânia', dial: '+255' },
  { codigo: 'ZM', nome: 'Zâmbia', dial: '+260' },
  { codigo: 'AO', nome: 'Angola', dial: '+244' },
  { codigo: 'BW', nome: 'Botsuana', dial: '+267' },
  { codigo: 'SZ', nome: 'Essuatíni', dial: '+268' },
  { codigo: 'LS', nome: 'Lesoto', dial: '+266' },
  { codigo: 'NA', nome: 'Namíbia', dial: '+264' },
  { codigo: 'KE', nome: 'Quénia', dial: '+254' },
  { codigo: 'PT', nome: 'Portugal', dial: '+351' },
  { codigo: 'BR', nome: 'Brasil', dial: '+55' },
  // Resto de África
  { codigo: 'AF', nome: 'Afeganistão', dial: '+93' },
  { codigo: 'AL', nome: 'Albânia', dial: '+355' },
  { codigo: 'DZ', nome: 'Argélia', dial: '+213' },
  { codigo: 'AD', nome: 'Andorra', dial: '+376' },
  { codigo: 'AG', nome: 'Antígua e Barbuda', dial: '+1268' },
  { codigo: 'AR', nome: 'Argentina', dial: '+54' },
  { codigo: 'AM', nome: 'Arménia', dial: '+374' },
  { codigo: 'AU', nome: 'Austrália', dial: '+61' },
  { codigo: 'AT', nome: 'Áustria', dial: '+43' },
  { codigo: 'AZ', nome: 'Azerbeijão', dial: '+994' },
  { codigo: 'BS', nome: 'Bahamas', dial: '+1242' },
  { codigo: 'BH', nome: 'Barein', dial: '+973' },
  { codigo: 'BD', nome: 'Bangladesh', dial: '+880' },
  { codigo: 'BB', nome: 'Barbados', dial: '+1246' },
  { codigo: 'BY', nome: 'Bielorrússia', dial: '+375' },
  { codigo: 'BE', nome: 'Bélgica', dial: '+32' },
  { codigo: 'BZ', nome: 'Belize', dial: '+501' },
  { codigo: 'BJ', nome: 'Benim', dial: '+229' },
  { codigo: 'BT', nome: 'Butão', dial: '+975' },
  { codigo: 'BO', nome: 'Bolívia', dial: '+591' },
  { codigo: 'BA', nome: 'Bósnia e Herzegovina', dial: '+387' },
  { codigo: 'CV', nome: 'Cabo Verde', dial: '+238' },
  { codigo: 'KH', nome: 'Camboja', dial: '+855' },
  { codigo: 'CM', nome: 'Camarões', dial: '+237' },
  { codigo: 'CA', nome: 'Canadá', dial: '+1' },
  { codigo: 'CF', nome: 'República Centro-Africana', dial: '+236' },
  { codigo: 'TD', nome: 'Chade', dial: '+235' },
  { codigo: 'CL', nome: 'Chile', dial: '+56' },
  { codigo: 'CN', nome: 'China', dial: '+86' },
  { codigo: 'CO', nome: 'Colômbia', dial: '+57' },
  { codigo: 'KM', nome: 'Comores', dial: '+269' },
  { codigo: 'CG', nome: 'Congo', dial: '+242' },
  { codigo: 'CD', nome: 'RDC (Congo-Kinshasa)', dial: '+243' },
  { codigo: 'CR', nome: 'Costa Rica', dial: '+506' },
  { codigo: 'CI', nome: 'Costa do Marfim', dial: '+225' },
  { codigo: 'HR', nome: 'Croácia', dial: '+385' },
  { codigo: 'CU', nome: 'Cuba', dial: '+53' },
  { codigo: 'CY', nome: 'Chipre', dial: '+357' },
  { codigo: 'CZ', nome: 'Chéquia', dial: '+420' },
  { codigo: 'DK', nome: 'Dinamarca', dial: '+45' },
  { codigo: 'DJ', nome: 'Djibuti', dial: '+253' },
  { codigo: 'DM', nome: 'Dominica', dial: '+1767' },
  { codigo: 'DO', nome: 'República Dominicana', dial: '+1809' },
  { codigo: 'EC', nome: 'Equador', dial: '+593' },
  { codigo: 'EG', nome: 'Egipto', dial: '+20' },
  { codigo: 'SV', nome: 'El Salvador', dial: '+503' },
  { codigo: 'GQ', nome: 'Guiné Equatorial', dial: '+240' },
  { codigo: 'ER', nome: 'Eritreia', dial: '+291' },
  { codigo: 'EE', nome: 'Estónia', dial: '+372' },
  { codigo: 'ET', nome: 'Etiópia', dial: '+251' },
  { codigo: 'FJ', nome: 'Fiji', dial: '+679' },
  { codigo: 'FI', nome: 'Finlândia', dial: '+358' },
  { codigo: 'FR', nome: 'França', dial: '+33' },
  { codigo: 'GA', nome: 'Gabão', dial: '+241' },
  { codigo: 'GM', nome: 'Gâmbia', dial: '+220' },
  { codigo: 'GE', nome: 'Geórgia', dial: '+995' },
  { codigo: 'DE', nome: 'Alemanha', dial: '+49' },
  { codigo: 'GH', nome: 'Gana', dial: '+233' },
  { codigo: 'GR', nome: 'Grécia', dial: '+30' },
  { codigo: 'GD', nome: 'Granada', dial: '+1473' },
  { codigo: 'GT', nome: 'Guatemala', dial: '+502' },
  { codigo: 'GN', nome: 'Guiné', dial: '+224' },
  { codigo: 'GW', nome: 'Guiné-Bissau', dial: '+245' },
  { codigo: 'GY', nome: 'Guiana', dial: '+592' },
  { codigo: 'HT', nome: 'Haiti', dial: '+509' },
  { codigo: 'HN', nome: 'Honduras', dial: '+504' },
  { codigo: 'HK', nome: 'Hong Kong', dial: '+852' },
  { codigo: 'HU', nome: 'Hungria', dial: '+36' },
  { codigo: 'IS', nome: 'Islândia', dial: '+354' },
  { codigo: 'IN', nome: 'Índia', dial: '+91' },
  { codigo: 'ID', nome: 'Indonésia', dial: '+62' },
  { codigo: 'IR', nome: 'Irão', dial: '+98' },
  { codigo: 'IQ', nome: 'Iraque', dial: '+964' },
  { codigo: 'IE', nome: 'Irlanda', dial: '+353' },
  { codigo: 'IL', nome: 'Israel', dial: '+972' },
  { codigo: 'IT', nome: 'Itália', dial: '+39' },
  { codigo: 'JM', nome: 'Jamaica', dial: '+1876' },
  { codigo: 'JP', nome: 'Japão', dial: '+81' },
  { codigo: 'JO', nome: 'Jordânia', dial: '+962' },
  { codigo: 'KZ', nome: 'Cazaquistão', dial: '+7' },
  { codigo: 'KW', nome: 'Kuwait', dial: '+965' },
  { codigo: 'KG', nome: 'Quirguistão', dial: '+996' },
  { codigo: 'LA', nome: 'Laos', dial: '+856' },
  { codigo: 'LV', nome: 'Letónia', dial: '+371' },
  { codigo: 'LB', nome: 'Líbano', dial: '+961' },
  { codigo: 'LY', nome: 'Líbia', dial: '+218' },
  { codigo: 'LT', nome: 'Lituânia', dial: '+370' },
  { codigo: 'LU', nome: 'Luxemburgo', dial: '+352' },
  { codigo: 'MO', nome: 'Macau', dial: '+853' },
  { codigo: 'MG', nome: 'Madagáscar', dial: '+261' },
  { codigo: 'MY', nome: 'Malásia', dial: '+60' },
  { codigo: 'MV', nome: 'Maldivas', dial: '+960' },
  { codigo: 'ML', nome: 'Mali', dial: '+223' },
  { codigo: 'MT', nome: 'Malta', dial: '+356' },
  { codigo: 'MR', nome: 'Mauritânia', dial: '+222' },
  { codigo: 'MU', nome: 'Maurícias', dial: '+230' },
  { codigo: 'MX', nome: 'México', dial: '+52' },
  { codigo: 'MD', nome: 'Moldávia', dial: '+373' },
  { codigo: 'MC', nome: 'Mónaco', dial: '+377' },
  { codigo: 'MN', nome: 'Mongólia', dial: '+976' },
  { codigo: 'ME', nome: 'Montenegro', dial: '+382' },
  { codigo: 'MA', nome: 'Marrocos', dial: '+212' },
  { codigo: 'MM', nome: 'Mianmar', dial: '+95' },
  { codigo: 'NP', nome: 'Nepal', dial: '+977' },
  { codigo: 'NL', nome: 'Países Baixos', dial: '+31' },
  { codigo: 'NZ', nome: 'Nova Zelândia', dial: '+64' },
  { codigo: 'NI', nome: 'Nicarágua', dial: '+505' },
  { codigo: 'NE', nome: 'Níger', dial: '+227' },
  { codigo: 'NG', nome: 'Nigéria', dial: '+234' },
  { codigo: 'KP', nome: 'Coreia do Norte', dial: '+850' },
  { codigo: 'MK', nome: 'Macedónia do Norte', dial: '+389' },
  { codigo: 'NO', nome: 'Noruega', dial: '+47' },
  { codigo: 'OM', nome: 'Omã', dial: '+968' },
  { codigo: 'PK', nome: 'Paquistão', dial: '+92' },
  { codigo: 'PS', nome: 'Palestina', dial: '+970' },
  { codigo: 'PA', nome: 'Panamá', dial: '+507' },
  { codigo: 'PG', nome: 'Papua-Nova Guiné', dial: '+675' },
  { codigo: 'PY', nome: 'Paraguai', dial: '+595' },
  { codigo: 'PE', nome: 'Peru', dial: '+51' },
  { codigo: 'PH', nome: 'Filipinas', dial: '+63' },
  { codigo: 'PL', nome: 'Polónia', dial: '+48' },
  { codigo: 'QA', nome: 'Catar', dial: '+974' },
  { codigo: 'RO', nome: 'Roménia', dial: '+40' },
  { codigo: 'RU', nome: 'Rússia', dial: '+7' },
  { codigo: 'RW', nome: 'Ruanda', dial: '+250' },
  { codigo: 'SA', nome: 'Arábia Saudita', dial: '+966' },
  { codigo: 'SN', nome: 'Senegal', dial: '+221' },
  { codigo: 'RS', nome: 'Sérvia', dial: '+381' },
  { codigo: 'SC', nome: 'Seicheles', dial: '+248' },
  { codigo: 'SL', nome: 'Serra Leoa', dial: '+232' },
  { codigo: 'SG', nome: 'Singapura', dial: '+65' },
  { codigo: 'SK', nome: 'Eslováquia', dial: '+421' },
  { codigo: 'SI', nome: 'Eslovénia', dial: '+386' },
  { codigo: 'SO', nome: 'Somália', dial: '+252' },
  { codigo: 'KR', nome: 'Coreia do Sul', dial: '+82' },
  { codigo: 'SS', nome: 'Sudão do Sul', dial: '+211' },
  { codigo: 'ES', nome: 'Espanha', dial: '+34' },
  { codigo: 'LK', nome: 'Sri Lanka', dial: '+94' },
  { codigo: 'SD', nome: 'Sudão', dial: '+249' },
  { codigo: 'SR', nome: 'Suriname', dial: '+597' },
  { codigo: 'SE', nome: 'Suécia', dial: '+46' },
  { codigo: 'CH', nome: 'Suíça', dial: '+41' },
  { codigo: 'SY', nome: 'Síria', dial: '+963' },
  { codigo: 'TW', nome: 'Taiwan', dial: '+886' },
  { codigo: 'TJ', nome: 'Tajiquistão', dial: '+992' },
  { codigo: 'TH', nome: 'Tailândia', dial: '+66' },
  { codigo: 'TL', nome: 'Timor-Leste', dial: '+670' },
  { codigo: 'TG', nome: 'Togo', dial: '+228' },
  { codigo: 'TT', nome: 'Trindade e Tobago', dial: '+1868' },
  { codigo: 'TN', nome: 'Tunísia', dial: '+216' },
  { codigo: 'TR', nome: 'Turquia', dial: '+90' },
  { codigo: 'TM', nome: 'Turcomenistão', dial: '+993' },
  { codigo: 'UG', nome: 'Uganda', dial: '+256' },
  { codigo: 'UA', nome: 'Ucrânia', dial: '+380' },
  { codigo: 'AE', nome: 'Emirados Árabes Unidos', dial: '+971' },
  { codigo: 'GB', nome: 'Reino Unido', dial: '+44' },
  { codigo: 'US', nome: 'Estados Unidos', dial: '+1' },
  { codigo: 'UY', nome: 'Uruguai', dial: '+598' },
  { codigo: 'UZ', nome: 'Usbequistão', dial: '+998' },
  { codigo: 'VE', nome: 'Venezuela', dial: '+58' },
  { codigo: 'VN', nome: 'Vietname', dial: '+84' },
  { codigo: 'YE', nome: 'Iémen', dial: '+967' },
];

/** País por defeito do seletor */
export const PAIS_PADRAO = PAISES[0]; // Moçambique

/** Procura país pelo código de discagem (dial), ex: "+258" */
export function paisPorDial(dial: string): Pais | undefined {
  return PAISES.find((p) => p.dial === dial);
}

/**
 * Normaliza um número de telefone para formato internacional: +<dial><numero>
 * dial: "+258", numero: "84 123 4567" → "+258841234567"
 */
export function normalizarTelefone(dial: string, numero: string): string {
  const digitos = numero.replace(/[\s\-().]/g, '');
  // remove zeros iniciais (alguns escrevem 084... ou 00258...)
  const semZero = digitos.replace(/^0+/, '');
  return `${dial}${semZero}`;
}

/**
 * Valida número local por país (regras leves, foco em Moçambique).
 * Retorna mensagem de erro ou null se válido.
 */
export function validarNumeroLocal(dial: string, numero: string): string | null {
  const digitos = normalizarTelefone(dial, numero).slice(dial.length);
  if (digitos.length < 7 || digitos.length > 12) {
    return 'Número inválido: deve ter entre 7 e 12 dígitos após o código do país.';
  }
  // Moçambique: 9 dígitos, começa por 8 (Vodacom/Tmcel/Movitel) ou 6
  if (dial === '+258') {
    if (digitos.length !== 9 || !/^[86]/.test(digitos)) {
      return 'Número moçambicano inválido: 9 dígitos, começa por 8 ou 6 (ex: 84 123 4567).';
    }
  }
  return null;
}

/** Regex de telefone internacional completo: + e 7-15 dígitos (E.164) */
export const TELEFONE_REGEX = /^\+[1-9]\d{6,14}$/;
