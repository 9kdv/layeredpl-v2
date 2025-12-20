export interface Product {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  images: string[];
  category: string;
  availability: 'available' | 'unavailable' | 'preorder';
  specifications: { label: string; value: string }[];
  featured: boolean;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Modularny Organizer na Biurko',
    description: 'Elegancki system organizacji biurka z wymiennymi modułami.',
    longDescription: 'Zaprojektowany z myślą o minimalistach, ten modularny organizer pozwala na idealne dopasowanie przestrzeni roboczej. Każdy moduł można dowolnie konfigurować - od przegródek na długopisy, przez uchwyty na telefon, po tacki na karteczki. Wydrukowany z wysokiej jakości PLA w matowym wykończeniu.',
    price: 89,
    images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
    category: 'Organizery',
    availability: 'available',
    specifications: [
      { label: 'Materiał', value: 'PLA Premium' },
      { label: 'Wymiary', value: '20 x 15 x 8 cm' },
      { label: 'Waga', value: '180g' },
      { label: 'Kolory', value: 'Czarny, Biały, Szary' },
    ],
    featured: true,
  },
  {
    id: '2',
    name: 'Geometryczna Lampa Stołowa',
    description: 'Nowoczesna lampa o unikalnej strukturze geometrycznej.',
    longDescription: 'Ta wyjątkowa lampa łączy w sobie nowoczesny design z funkcjonalnością. Geometryczna struktura tworzy fascynujące wzory świetlne na ścianach. Kompatybilna ze standardowymi żarówkami E27. Idealna do sypialni, salonu lub biura.',
    price: 249,
    images: ['/placeholder.svg', '/placeholder.svg'],
    category: 'Dekoracje',
    availability: 'available',
    specifications: [
      { label: 'Materiał', value: 'PETG' },
      { label: 'Wymiary', value: '25 x 25 x 35 cm' },
      { label: 'Gwint', value: 'E27' },
      { label: 'Max moc żarówki', value: '40W' },
    ],
    featured: true,
  },
  {
    id: '3',
    name: 'Minimalistyczny Stojak na Słuchawki',
    description: 'Prosty i elegancki stojak na słuchawki nauszne.',
    longDescription: 'Stworzony dla audiofilów i graczy, ten stojak utrzyma Twoje słuchawki w idealnym stanie. Stabilna podstawa i miękka powierzchnia kontaktu chronią przed zarysowaniami. Design pasuje do każdego setupu.',
    price: 59,
    images: ['/placeholder.svg'],
    category: 'Akcesoria',
    availability: 'available',
    specifications: [
      { label: 'Materiał', value: 'PLA Premium' },
      { label: 'Wymiary', value: '12 x 10 x 25 cm' },
      { label: 'Waga', value: '120g' },
      { label: 'Kompatybilność', value: 'Uniwersalna' },
    ],
    featured: true,
  },
  {
    id: '4',
    name: 'Doniczka Samonawadniająca',
    description: 'Inteligentna doniczka z systemem nawadniania.',
    longDescription: 'Idealna dla zapominalskich! Ta doniczka posiada wbudowany zbiornik na wodę, który automatycznie nawadnia roślinę przez kilka tygodni. Nowoczesny design z minimalistyczną estetyką pasuje do każdego wnętrza.',
    price: 79,
    images: ['/placeholder.svg'],
    category: 'Dom',
    availability: 'available',
    specifications: [
      { label: 'Materiał', value: 'PETG (wodoodporny)' },
      { label: 'Pojemność zbiornika', value: '500ml' },
      { label: 'Wymiary', value: '15 x 15 x 18 cm' },
      { label: 'Autonomia', value: 'do 3 tygodni' },
    ],
    featured: false,
  },
  {
    id: '5',
    name: 'Uchwyt na Kontroler',
    description: 'Uniwersalny stojak na kontrolery do gier.',
    longDescription: 'Trzymaj swoje kontrolery w porządku i zawsze pod ręką. Pasuje do większości kontrolerów - PlayStation, Xbox, Nintendo Switch Pro. Stabilna konstrukcja i elegancki wygląd.',
    price: 45,
    images: ['/placeholder.svg'],
    category: 'Gaming',
    availability: 'preorder',
    specifications: [
      { label: 'Materiał', value: 'PLA Premium' },
      { label: 'Kompatybilność', value: 'PS5, Xbox, Switch' },
      { label: 'Ilość miejsc', value: '2 kontrolery' },
      { label: 'Wymiary', value: '20 x 10 x 12 cm' },
    ],
    featured: false,
  },
  {
    id: '6',
    name: 'Ścienny Organizer na Klucze',
    description: 'Praktyczny wieszak na klucze z miejscem na pocztę.',
    longDescription: 'Koniec z szukaniem kluczy! Ten elegancki organizer ścienny pomieści wszystkie Twoje klucze plus ma dedykowaną półkę na listy i drobne przedmioty. Montaż na ścianę w zestawie.',
    price: 69,
    images: ['/placeholder.svg'],
    category: 'Dom',
    availability: 'available',
    specifications: [
      { label: 'Materiał', value: 'PLA Premium' },
      { label: 'Wymiary', value: '30 x 8 x 15 cm' },
      { label: 'Ilość haczyków', value: '5' },
      { label: 'Montaż', value: 'Śruby w zestawie' },
    ],
    featured: true,
  },
  {
    id: '7',
    name: 'Podstawka pod Laptop',
    description: 'Ergonomiczna podstawka poprawiająca wentylację.',
    longDescription: 'Pracuj wygodniej i chroń swój laptop przed przegrzewaniem. Ergonomiczny kąt nachylenia redukuje zmęczenie nadgarstków, a otwarta konstrukcja zapewnia doskonałą cyrkulację powietrza.',
    price: 119,
    images: ['/placeholder.svg'],
    category: 'Akcesoria',
    availability: 'available',
    specifications: [
      { label: 'Materiał', value: 'PETG' },
      { label: 'Max rozmiar laptopa', value: '17 cali' },
      { label: 'Kąt nachylenia', value: '15°' },
      { label: 'Nośność', value: 'do 5kg' },
    ],
    featured: false,
  },
  {
    id: '8',
    name: 'Zestaw Hakczyków Ściennych',
    description: 'Minimalistyczne haczyki do zawieszenia na ścianę.',
    longDescription: 'Zestaw 6 minimalistycznych haczyków w różnych rozmiarach. Idealne do zawieszenia kurtek, torebek, słuchawek czy roślin. Prosty montaż, nowoczesny wygląd.',
    price: 39,
    images: ['/placeholder.svg'],
    category: 'Dom',
    availability: 'unavailable',
    specifications: [
      { label: 'Materiał', value: 'PLA Premium' },
      { label: 'Ilość w zestawie', value: '6 szt.' },
      { label: 'Rozmiary', value: 'S, M, L' },
      { label: 'Nośność', value: 'do 2kg każdy' },
    ],
    featured: false,
  },
];

export const categories = [
  'Wszystkie',
  'Organizery',
  'Dekoracje',
  'Akcesoria',
  'Dom',
  'Gaming',
];
