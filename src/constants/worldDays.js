// ════════════════════════════════════════════════════════════════════
// WORLD DAYS — Calendario de días mundiales (módulo Social Media)
// ════════════════════════════════════════════════════════════════════
// Días internacionales vinculados a sustentabilidad y al rubro de
// certificación / consultoría. Sirven para planificar contenido de
// redes con anticipación.
//
// Cada día tiene:
//   id      — identificador estable (para notificaciones y keys)
//   name    — nombre en español
//   month   — 1..12
//   day     — día fijo del mes  (o bien)
//   rule    — { weekday: 0..6 (0 = domingo), nth: 1..5 } para fechas
//             tipo "segundo jueves de noviembre"
//   theme   — id de WORLD_DAY_THEMES
//   note    — por qué nos importa / normas relacionadas (para el brief)
//
// La lógica de fechas (próxima ocurrencia, aviso N días hábiles antes)
// vive en src/utils/worldDays.js.
// ════════════════════════════════════════════════════════════════════

// A quién se le avisa y con cuánta anticipación (días hábiles: lun–vie).
export const WORLD_DAYS_NOTIFY_USER = 'Delfina Palmero';
export const WORLD_DAYS_NOTICE_BUSINESS_DAYS = 3;

// ── Temáticas ──
// Las clases de color van escritas completas (no dinámicas) para que
// Tailwind las detecte sin tocar el safelist.
export const WORLD_DAY_THEMES = [
  { id: 'sustentabilidad', label: 'Sustentabilidad',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'clima',           label: 'Clima y ambiente',      color: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-500' },
  { id: 'energia',         label: 'Energía',               color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  { id: 'agua',            label: 'Agua y océanos',        color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  { id: 'biodiversidad',   label: 'Biodiversidad',         color: 'bg-green-50 text-green-700 border-green-200',       dot: 'bg-green-500' },
  { id: 'forestal',        label: 'Forestal',              color: 'bg-lime-50 text-lime-700 border-lime-200',          dot: 'bg-lime-500' },
  { id: 'agro',            label: 'Agro y ganadería',      color: 'bg-orange-50 text-orange-700 border-orange-200',    dot: 'bg-orange-500' },
  { id: 'alimentos',       label: 'Alimentos',             color: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500' },
  { id: 'textil',          label: 'Textil',                color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', dot: 'bg-fuchsia-500' },
  { id: 'circular',        label: 'Economía circular',     color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
  { id: 'social',          label: 'Social y laboral',      color: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500' },
  { id: 'calidad',         label: 'Calidad y normas',      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',    dot: 'bg-indigo-500' },
];

export const WORLD_DAY_THEME_BY_ID = WORLD_DAY_THEMES.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {});

// ── Calendario ──
export const WORLD_DAYS = [
  // Enero
  { id: 'educacion-ambiental',  name: 'Día Mundial de la Educación Ambiental',                       month: 1,  day: 26, theme: 'sustentabilidad', note: 'Concientización y capacitación en sustentabilidad.' },
  // Febrero
  { id: 'humedales',            name: 'Día Mundial de los Humedales',                                month: 2,  day: 2,  theme: 'agua',            note: 'Conservación de ecosistemas de agua dulce.' },
  { id: 'legumbres',            name: 'Día Mundial de las Legumbres',                                month: 2,  day: 10, theme: 'agro',            note: 'Cultivos sustentables, orgánico, GLOBALG.A.P.' },
  { id: 'energia',              name: 'Día Mundial de la Energía',                                   month: 2,  day: 14, theme: 'energia',         note: 'Energías renovables, ISO 50001, huella de carbono.' },
  { id: 'justicia-social',      name: 'Día Mundial de la Justicia Social',                           month: 2,  day: 20, theme: 'social',          note: 'Auditorías sociales, trabajo decente.' },
  // Marzo
  { id: 'vida-silvestre',       name: 'Día Mundial de la Vida Silvestre',                            month: 3,  day: 3,  theme: 'biodiversidad',   note: 'Conservación de fauna y flora.' },
  { id: 'eficiencia-energetica',name: 'Día Mundial de la Eficiencia Energética',                     month: 3,  day: 5,  theme: 'energia',         note: 'Gestión de la energía, ISO 50001.' },
  { id: 'mujer',                name: 'Día Internacional de la Mujer',                               month: 3,  day: 8,  theme: 'social',          note: 'Equidad de género, mujeres en la industria.' },
  { id: 'consumidor',           name: 'Día Mundial de los Derechos del Consumidor',                  month: 3,  day: 15, theme: 'calidad',         note: 'Trazabilidad, etiquetado y confianza en el producto.' },
  { id: 'bosques',              name: 'Día Internacional de los Bosques',                            month: 3,  day: 21, theme: 'forestal',        note: 'FSC, PEFC, EUDR, cadena de custodia.' },
  { id: 'agua',                 name: 'Día Mundial del Agua',                                        month: 3,  day: 22, theme: 'agua',            note: 'Huella hídrica, gestión del agua, AWS.' },
  { id: 'cero-desechos',        name: 'Día Internacional de Cero Desechos',                          month: 3,  day: 30, theme: 'circular',        note: 'Economía circular, reciclado, GRS / RCS.' },
  // Abril
  { id: 'madre-tierra',         name: 'Día Internacional de la Madre Tierra',                        month: 4,  day: 22, theme: 'sustentabilidad', note: 'Sustentabilidad en general, compromiso ambiental.' },
  { id: 'fashion-revolution',   name: 'Fashion Revolution Day',                                      month: 4,  day: 24, theme: 'textil',          note: 'Transparencia en la cadena textil: GOTS, OCS, GRS.' },
  { id: 'seguridad-trabajo',    name: 'Día Mundial de la Seguridad y la Salud en el Trabajo',        month: 4,  day: 28, theme: 'social',          note: 'ISO 45001, auditorías sociales.' },
  // Mayo
  { id: 'trabajadores',         name: 'Día Internacional de los Trabajadores',                       month: 5,  day: 1,  theme: 'social',          note: 'Trabajo decente, cumplimiento social.' },
  { id: 'sanidad-vegetal',      name: 'Día Internacional de la Sanidad Vegetal',                     month: 5,  day: 12, theme: 'agro',            note: 'Producción agrícola, buenas prácticas.' },
  { id: 'reciclaje',            name: 'Día Mundial del Reciclaje',                                   month: 5,  day: 17, theme: 'circular',        note: 'Contenido reciclado, GRS / RCS.' },
  { id: 'abejas',               name: 'Día Mundial de las Abejas',                                   month: 5,  day: 20, theme: 'biodiversidad',   note: 'Polinizadores, agricultura sustentable, miel orgánica.' },
  { id: 'metrologia',           name: 'Día Mundial de la Metrología',                                month: 5,  day: 20, theme: 'calidad',         note: 'Laboratorios, mediciones confiables, ISO/IEC 17025.' },
  { id: 'te',                   name: 'Día Internacional del Té',                                    month: 5,  day: 21, theme: 'agro',            note: 'Cultivos certificados: Rainforest Alliance, orgánico.' },
  { id: 'biodiversidad',        name: 'Día Internacional de la Diversidad Biológica',                month: 5,  day: 22, theme: 'biodiversidad',   note: 'Biodiversidad y producción responsable.' },
  // Junio
  { id: 'leche',                name: 'Día Mundial de la Leche',                                     month: 6,  day: 1,  theme: 'agro',            note: 'Lácteos, bienestar animal, inocuidad.' },
  { id: 'medio-ambiente',       name: 'Día Mundial del Medio Ambiente',                              month: 6,  day: 5,  theme: 'sustentabilidad', note: 'La fecha ambiental más importante del año. ISO 14001.' },
  { id: 'inocuidad',            name: 'Día Mundial de la Inocuidad de los Alimentos',                month: 6,  day: 7,  theme: 'alimentos',       note: 'BRCGS, FSSC 22000, IFS, PrimusGFS, HACCP.' },
  { id: 'oceanos',              name: 'Día Mundial de los Océanos',                                  month: 6,  day: 8,  theme: 'agua',            note: 'Pesca y acuicultura responsables: MSC, ASC.' },
  { id: 'acreditacion',         name: 'Día Mundial de la Acreditación',                              month: 6,  day: 9,  theme: 'calidad',         note: 'Valor de la certificación acreditada.' },
  { id: 'trabajo-infantil',     name: 'Día Mundial contra el Trabajo Infantil',                      month: 6,  day: 12, theme: 'social',          note: 'Auditorías sociales, SMETA, cadena de suministro.' },
  { id: 'viento',               name: 'Día Mundial del Viento',                                      month: 6,  day: 15, theme: 'energia',         note: 'Energía eólica y renovables.' },
  { id: 'desertificacion',      name: 'Día Mundial de Lucha contra la Desertificación y la Sequía',  month: 6,  day: 17, theme: 'clima',           note: 'Suelos, agricultura regenerativa.' },
  { id: 'gastronomia',          name: 'Día de la Gastronomía Sostenible',                            month: 6,  day: 18, theme: 'alimentos',       note: 'Alimentos con origen certificado.' },
  { id: 'bosques-tropicales',   name: 'Día Mundial de los Bosques Tropicales',                       month: 6,  day: 26, theme: 'forestal',        note: 'Deforestación cero, EUDR, RSPO.' },
  { id: 'arbol',                name: 'Día Mundial del Árbol',                                       month: 6,  day: 28, theme: 'forestal',        note: 'Manejo forestal responsable.' },
  // Julio
  { id: 'sin-bolsas',           name: 'Día Internacional Libre de Bolsas de Plástico',               month: 7,  day: 3,  theme: 'circular',        note: 'Plásticos, packaging, reciclado.' },
  { id: 'manglares',            name: 'Día Internacional de la Conservación del Ecosistema de Manglares', month: 7, day: 26, theme: 'biodiversidad', note: 'Acuicultura responsable, ASC.' },
  { id: 'conservacion',         name: 'Día Mundial de la Conservación de la Naturaleza',             month: 7,  day: 28, theme: 'biodiversidad',   note: 'Conservación y uso responsable de recursos.' },
  // Septiembre
  { id: 'aire-limpio',          name: 'Día Internacional del Aire Limpio por un cielo azul',         month: 9,  day: 7,  theme: 'clima',           note: 'Emisiones, huella de carbono.' },
  { id: 'capa-ozono',           name: 'Día Internacional de la Preservación de la Capa de Ozono',    month: 9,  day: 16, theme: 'clima',           note: 'Gestión ambiental, ISO 14001.' },
  { id: 'ods',                  name: 'Día de los Objetivos de Desarrollo Sostenible (ODS)',         month: 9,  day: 25, theme: 'sustentabilidad', note: 'Agenda 2030, reportes de sustentabilidad.' },
  { id: 'salud-ambiental',      name: 'Día Mundial de la Salud Ambiental',                           month: 9,  day: 26, theme: 'sustentabilidad', note: 'Ambiente y salud de las personas.' },
  { id: 'desperdicio',          name: 'Día Internacional de Concienciación sobre la Pérdida y el Desperdicio de Alimentos', month: 9, day: 29, theme: 'alimentos', note: 'Cadena de suministro alimentaria eficiente.' },
  // Octubre
  { id: 'cafe',                 name: 'Día Internacional del Café',                                  month: 10, day: 1,  theme: 'agro',            note: 'Café certificado: orgánico, Rainforest Alliance, 4C.' },
  { id: 'cacao',                name: 'Día Mundial del Cacao',                                       month: 10, day: 1,  theme: 'agro',            note: 'Cacao sustentable y trazable, EUDR.' },
  { id: 'animales',             name: 'Día Mundial de los Animales',                                 month: 10, day: 4,  theme: 'agro',            note: 'Bienestar animal en producción.' },
  { id: 'algodon',              name: 'Día Mundial del Algodón',                                     month: 10, day: 7,  theme: 'textil',          note: 'Algodón orgánico y responsable: GOTS, OCS, BCI.' },
  { id: 'normalizacion',        name: 'Día Mundial de la Normalización',                             month: 10, day: 14, theme: 'calidad',         note: 'Normas ISO y su rol en el comercio.' },
  { id: 'mujeres-rurales',      name: 'Día Internacional de las Mujeres Rurales',                    month: 10, day: 15, theme: 'social',          note: 'Género y agro, cadenas inclusivas.' },
  { id: 'alimentacion',         name: 'Día Mundial de la Alimentación',                              month: 10, day: 16, theme: 'alimentos',       note: 'Seguridad alimentaria, producción responsable.' },
  { id: 'cambio-climatico',     name: 'Día Internacional contra el Cambio Climático',                month: 10, day: 24, theme: 'clima',           note: 'Huella de carbono, ISO 14064, net zero.' },
  // Noviembre
  { id: 'calidad',              name: 'Día Mundial de la Calidad',                                   month: 11, rule: { weekday: 4, nth: 2 }, theme: 'calidad', note: 'Segundo jueves de noviembre. ISO 9001, cultura de calidad.' },
  { id: 'pesca',                name: 'Día Mundial de la Pesca',                                     month: 11, day: 21, theme: 'agro',            note: 'Pesca sustentable: MSC, ASC.' },
  { id: 'olivo',                name: 'Día Mundial del Olivo',                                       month: 11, day: 26, theme: 'agro',            note: 'Aceite de oliva, orgánico, origen.' },
  // Diciembre
  { id: 'suelo',                name: 'Día Mundial del Suelo',                                       month: 12, day: 5,  theme: 'agro',            note: 'Salud del suelo, agricultura regenerativa.' },
  { id: 'anticorrupcion',       name: 'Día Internacional contra la Corrupción',                      month: 12, day: 9,  theme: 'social',          note: 'Gobernanza, ISO 37001, integridad.' },
  { id: 'derechos-humanos',     name: 'Día de los Derechos Humanos',                                 month: 12, day: 10, theme: 'social',          note: 'Debida diligencia en derechos humanos, cadena de suministro.' },
];
