// Mapping from the v7 app (data.js era) to the Markdown catalog, used once to migrate
// progress stored under konsp-mini-v2 / konsp-mini-v1 and to redirect old deep links.

export const LEGACY_STORES = ['konsp-mini-v2', 'konsp-mini-v1'];

export const SUBJECTS = {
  'английский-язык': 'english',
  'теория-алгоритмов-и-матлогика': 'mlita',
  'история-россии': 'history',
  'линейная-алгебра': 'linear-algebra',
  'математический-анализ': 'math-analysis',
  'физика': 'physics',
};

/** old lecture id → new lecture key */
export const LECTURES = {
  'english-higher-education': 'english/higher-education',
  'matlogika-mnozhestva': 'mlita/sets',
  'istoriya-vvedenie': 'history/introduction',
  'istoriya-ot-pervobytnosti-do-srednevekovya': 'history/prehistory-to-middle-ages',
  'linal-opredeliteli': 'linear-algebra/determinants',
  'matan-osnovy': 'math-analysis/sets-bounds-limits',
  'physics-kinematics': 'physics/kinematics',
};

/** "<old subject id>/<lecture number>" → new lecture key (old #/lecture/<id>/<num> links) */
export const LECTURE_NUMBERS = {
  'английский-язык/1': 'english/higher-education',
  'теория-алгоритмов-и-матлогика/1': 'mlita/sets',
  'история-россии/1': 'history/introduction',
  'история-россии/2': 'history/prehistory-to-middle-ages',
  'линейная-алгебра/1': 'linear-algebra/determinants',
  'математический-анализ/1': 'math-analysis/sets-bounds-limits',
  'физика/1': 'physics/kinematics',
};

/** old session id → new exam key */
export const EXAMS = {
  history: 'history/exam',
  mlita: 'mlita/exam',
  english: 'english/exam',
  linalg: 'linear-algebra/exam',
  matan: 'math-analysis/exam',
};

/** old quiz question id → new card key (filled by the content migration) */
export const QUIZ = {
  'english-higher-education-q1': 'english/higher-education#v-chem-raznica-mezhdu-to-enrol-i-to-graduate',
  'english-higher-education-q2': 'english/higher-education#kakie-tri-urovnya-obrazovaniya-nazvany-v-spiske',
  'english-higher-education-q3': 'english/higher-education#chto-takoe-sandwich-course-perevedi-i-obyasni-sv',
  'english-higher-education-q4': 'english/higher-education#sostav-predlozhenie-s-passing-grade-i-entrance-e',
  'english-higher-education-q5': 'english/higher-education#chem-internship-otlichaetsya-ot-tutorial',
  'matlogika-mnozhestva-q1': 'mlita/sets#v-chem-raznica-mezhdu-i',
  'matlogika-mnozhestva-q2': 'mlita/sets#kak-vyrazit-simmetricheskuyu-raznost-cherez-obed',
  'matlogika-mnozhestva-q3': 'mlita/sets#sformuliruy-oba-zakona-de-morgana-slovami-ne-for',
  'matlogika-mnozhestva-q4': 'mlita/sets#chemu-ravno-a-a-a-u',
  'matlogika-mnozhestva-q5': 'mlita/sets#reshi-u-1-dots-10-a-1-2-3-4-5-b-4-5-6-7-naydi-a',
  'istoriya-vvedenie-q1': 'history/introduction#nazovi-vse-5-funkciy-istorii',
  'istoriya-vvedenie-q2': 'history/introduction#chto-otlichaet-istoricheskiy-fakt-ot-istorichesk',
  'istoriya-vvedenie-q3': 'history/introduction#privedi-po-odnomu-primeru-veschestvennogo-pismen',
  'istoriya-vvedenie-q4': 'history/introduction#v-chem-principialnoe-razlichie-materialistichesk',
  'istoriya-vvedenie-q5': 'history/introduction#perechisli-5-stadiy-razvitiya-civilizacii-po-civ',
  'istoriya-vvedenie-q6': 'history/introduction#chem-zapadnaya-civilizaciya-otlichaetsya-ot-vost',
  'istoriya-vvedenie-q7': 'history/introduction#pochemu-rossiyu-nazyvayut-mostom-mezhdu-zapadom',
  'istoriya-perehod-2-q1': 'history/prehistory-to-middle-ages#pochemu-poyavlenie-proizvodyaschego-hozyaystva-n',
  'istoriya-perehod-2-q2': 'history/prehistory-to-middle-ages#chem-rod-otlichaetsya-ot-plemeni',
  'istoriya-perehod-2-q3': 'history/prehistory-to-middle-ages#kakie-tri-elementa-vhodyat-v-skifskuyu-triadu',
  'istoriya-perehod-2-q4': 'history/prehistory-to-middle-ages#chto-takoe-etnogenez',
  'istoriya-perehod-2-q5': 'history/prehistory-to-middle-ages#nazovi-chetyre-priznaka-ranney-civilizacii',
  'istoriya-perehod-2-q6': 'history/prehistory-to-middle-ages#pochemu-476-god-schitaetsya-granicey-mezhdu-anti',
  'istoriya-perehod-2-q7': 'history/prehistory-to-middle-ages#kogda-suschestvovala-vizantiyskaya-imperiya',
  'linal-opredeliteli-q1': 'linear-algebra/determinants#kak-svyazany-minor-m-ij-i-algebraicheskoe-dopoln',
  'linal-opredeliteli-q2': 'linear-algebra/determinants#pochemu-vygodno-raskladyvat-opredelitel-po-strok',
  'linal-opredeliteli-q3': 'linear-algebra/determinants#kak-izmenitsya-opredelitel-esli-pomenyat-mestami',
  'linal-opredeliteli-q4': 'linear-algebra/determinants#pochemu-opredelitel-treugolnoy-matricy-raven-pro',
  'linal-opredeliteli-q5': 'linear-algebra/determinants#sformuliruy-metod-kramera-chto-takoe-a-i-i-kogda',
  'linal-opredeliteli-q6': 'linear-algebra/determinants#poschitay-samostoyatelno-begin-vmatrix-2-1-3-4-e',
  'matan-osnovy-q1': 'math-analysis/sets-bounds-limits#sformuliruy-opredelenie-supremuma-svoimi-slovami',
  'matan-osnovy-q2': 'math-analysis/sets-bounds-limits#privedi-primer-mnozhestva-u-kotorogo-sup-ne-yavl',
  'matan-osnovy-q3': 'math-analysis/sets-bounds-limits#v-chem-raznica-mezhdu-svoystvom-arhimeda-i-svoys',
  'matan-osnovy-q4': 'math-analysis/sets-bounds-limits#zapishi-opredelenie-predela-cherez-n-i-obyasni-k',
  'matan-osnovy-q5': 'math-analysis/sets-bounds-limits#perechisli-vse-7-klassicheskih-neopredelennyh-fo',
  'matan-osnovy-q6': 'math-analysis/sets-bounds-limits#kak-raskryt-neopredelennost-esli-v-vyrazhenii-es',
  'matan-osnovy-q7': 'math-analysis/sets-bounds-limits#poschitay-samostoyatelno-displaystyle-lim-n-2n-3',
  'physics-kinematics-q1': 'physics/kinematics#chem-tangencialnoe-uskorenie-otlichaetsya-ot-nor',
  'physics-kinematics-q2': 'physics/kinematics#zapishi-vse-tri-formuly-ravnouskorennogo-dvizhen',
  'physics-kinematics-q3': 'physics/kinematics#v-kakoy-tochke-traektorii-broska-pod-uglom-skoro',
  'physics-kinematics-q4': 'physics/kinematics#vyvedi-svyaz-a-n-2-r-iz-a-n-v-2-r-i-v-r',
  'physics-kinematics-q5': 'physics/kinematics#pochemu-dalnost-poleta-maksimalna-pri-ugle-45-ci',
  'physics-kinematics-q6': 'physics/kinematics#chto-takoe-i-kakaya-fizicheskaya-velichina-ey-an',
};

export const PALETTE_FROM_THEME = {
  midnight: 'violet', graphite: 'graphite', ocean: 'ocean', emerald: 'emerald', violet: 'violet', rose: 'rose',
  sunset: 'warm', lavender: 'indigo', mint: 'mint', sky: 'blue', sand: 'amber', paper: 'warm', snow: 'blue',
};
