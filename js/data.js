/*
  Fictional portfolio used by the home teaser and the projects model table. Every name, place and figure is illustrative.
  type: residential | commercial | infra | public | industrial        status: done | build
*/
export const TYPES = ['residential', 'commercial', 'infra', 'public', 'industrial'];

export const PROJECTS = [
  { id: 'zeytin', type: 'residential', status: 'done', year: 2024, floors: 18, area: 18400, unit: 'm²', city: { ar: 'غازي عنتاب', tr: 'Gaziantep', en: 'Gaziantep' },
    name: { ar: 'أبراج زيتون السكنية', tr: 'Zeytin Rezidans', en: 'Zeytin Residences' },
    blurb: { ar: 'برج سكني من ١٨ طابقاً بنواة خرسانية مقاومة للزلازل وواجهة زجاجية مزدوجة.', tr: 'Deprem perdeli betonarme çekirdekli ve çift cidarlı camlı cephesi olan 18 katlı konut kulesi.', en: 'An 18-storey residential tower with a seismic concrete core and a double-skin glass facade.' } },
  { id: 'pinar', type: 'commercial', status: 'done', year: 2025, floors: 22, area: 24800, unit: 'm²', city: { ar: 'إسطنبول', tr: 'İstanbul', en: 'Istanbul' },
    name: { ar: 'بينار بلازا للمكاتب', tr: 'Pınar Plaza', en: 'Pınar Plaza' },
    blurb: { ar: 'برج مكاتب من ٢٢ طابقاً ببلاطات بلا جسور لأقصى مرونة في التقسيم الداخلي.', tr: 'İç mekân esnekliği için kirişsiz döşemeli 22 katlı ofis kulesi.', en: 'A 22-storey office tower with flat slabs for maximum interior flexibility.' } },
  { id: 'kervan', type: 'infra', status: 'done', year: 2023, floors: 0, area: 480, unit: 'm', city: { ar: 'مرسين', tr: 'Mersin', en: 'Mersin' },
    name: { ar: 'جسر قافلة', tr: 'Kervan Köprüsü', en: 'Kervan Bridge' },
    blurb: { ar: 'جسر معلّق بالكابلات بطول ٤٨٠ متراً يختصر على المدينة ٣٥ دقيقة يومياً.', tr: 'Şehre günde 35 dakika kazandıran 480 metrelik askılı köprü.', en: 'A 480 m cable-stayed bridge that gives the city back 35 minutes a day.' } },
  { id: 'kuzey', type: 'industrial', status: 'done', year: 2024, floors: 1, area: 52000, unit: 'm²', city: { ar: 'غازي عنتاب', tr: 'Gaziantep OSB', en: 'Gaziantep OSB' },
    name: { ar: 'مركز كوزي اللوجستي', tr: 'Kuzey Lojistik Merkezi', en: 'Kuzey Logistics Hub' },
    blurb: { ar: 'مستودعات بمقاطع سقف منشارية وأرضيات صناعية مصقولة لحركة الرافعات الشوكية.', tr: 'Forklift trafiği için cilalı endüstriyel zemin ve shed çatılı depolar.', en: 'Sawtooth-roof warehouses with polished industrial floors for forklift traffic.' } },
  { id: 'sifa', type: 'public', status: 'build', year: 2026, floors: 6, area: 31500, unit: 'm²', city: { ar: 'قونية', tr: 'Konya', en: 'Konya' },
    name: { ar: 'مستشفى شفاء', tr: 'Şifa Hastanesi', en: 'Şifa Hospital' },
    blurb: { ar: 'مجمّع مستشفى على شكل صليب بعزل زلزالي قاعدي وغرف عمليات بلا اهتزاز.', tr: 'Taban izolatörlü, titreşimsiz ameliyathanelere sahip haç planlı hastane kampüsü.', en: 'A cross-plan hospital campus on base isolators, with vibration-free operating rooms.' } },
  { id: 'bahce', type: 'residential', status: 'done', year: 2022, floors: 2, area: 14200, unit: 'm²', city: { ar: 'بورصة', tr: 'Bursa', en: 'Bursa' },
    name: { ar: 'فلل الحديقة', tr: 'Bahçe Evleri', en: 'Bahçe Villas' },
    blurb: { ar: '٤٨ فيلا بسقوف مائلة وحدائق خاصة حول ساحة مشتركة.', tr: 'Ortak avlu çevresinde, eğimli çatılı ve özel bahçeli 48 villa.', en: '48 pitched-roof villas with private gardens around a shared court.' } },
  { id: 'cinar', type: 'commercial', status: 'done', year: 2023, floors: 4, area: 38000, unit: 'm²', city: { ar: 'قيصري', tr: 'Kayseri', en: 'Kayseri' },
    name: { ar: 'سوق جنار', tr: 'Çınar Çarşı', en: 'Çınar Mall' },
    blurb: { ar: 'مركز تسوّق من أربعة طوابق حول بهو زجاجي مفتوح للسماء.', tr: 'Gökyüzüne açılan camlı bir atriyum etrafında dört katlı alışveriş merkezi.', en: 'A four-level mall around a glazed atrium open to the sky.' } },
  { id: 'atlas', type: 'public', status: 'build', year: 2026, floors: 1, area: 12600, unit: 'm²', city: { ar: 'أربيل', tr: 'Erbil', en: 'Erbil' },
    name: { ar: 'قاعة أطلس الرياضية', tr: 'Atlas Spor Salonu', en: 'Atlas Sports Hall' },
    blurb: { ar: 'قاعة رياضية بقبة فولاذية بلا أعمدة داخلية تتّسع لخمسة آلاف متفرّج.', tr: 'İçeride kolonsuz çelik kubbeli, beş bin seyirci kapasiteli spor salonu.', en: 'A column-free steel-domed sports hall seating five thousand.' } }
];
export const byId = (id) => PROJECTS.find(p => p.id === id);
