export type InteractiveLessonId =
  | 'lesson-vrv-piping'
  | 'lesson-vrv-fahu-controls'
  | 'lesson-vrv-pcb-errors'
  | 'lesson-ahu-fahu-startup'
  | 'lesson-fxsq-ducted'
  | 'lesson-generator-elcb';

export type VideoLanguage = 'en' | 'ar';

export interface InteractiveLessonSpec {
  labelEn: string;
  labelAr: string;
  value: string;
  status?: 'nominal' | 'warn' | 'pass' | 'fault';
}

export interface InteractiveVideoChapter {
  id: string;
  startSec: number;
  endSec: number;
  sceneKey: string;
  titleEn: string;
  titleAr: string;
  captionEn: string;
  captionAr: string;
  specs: InteractiveLessonSpec[];
}

export interface InteractiveTrainingLesson {
  id: InteractiveLessonId;
  videoRecordId: string;
  titleEn: string;
  titleAr: string;
  category: string;
  manualRef: string;
  durationSeconds: number;
  chapters: InteractiveVideoChapter[];
}

export const INTERACTIVE_TRAINING_LESSONS: Record<InteractiveLessonId, InteractiveTrainingLesson> = {
  'lesson-vrv-piping': {
    id: 'lesson-vrv-piping',
    videoRecordId: 'vid_lesson_1',
    titleEn: 'VRV IV & VRV X Refrigerant Piping, 0.02 MPa N₂ Brazing & 40-Bar Pressure Testing',
    titleAr: 'تمديدات أنابيب التبريد لأنظمة VRV IV و VRV X، اللحام بالنيتروجين 0.02 ميجاباسكال واختبار الضغط 40 بار',
    category: 'VRV / VRF Systems',
    manualRef: 'DAME VRV-IV Installation Training PPT & RXQ-ARYFK Data Book',
    durationSeconds: 85,
    chapters: [
      {
        id: 'ch-vrv-1',
        startSec: 0,
        endSec: 17,
        sceneKey: 'vrv-piping-limits',
        titleEn: '1. Piping Limits, Refnet Straight Runs & Oil Traps',
        titleAr: '1. حدود أطوال الأنابيب ومفصلات Refnet ومصائد الزيت',
        captionEn:
          'Verify VRV IV piping limits before installation: maximum 165 m actual run, 190 m equivalent length, and 1000 m total piping. Keep at least 500 mm straight copper pipe before every Refnet Y-joint (1000 mm after a bend) and form a 200 mm inverted oil rise trap on multi-module outdoor headers.',
        captionAr:
          'تحقق من حدود أنابيب VRV IV قبل التركيب: الحد الأقصى للطول الفعلي 165 متراً، والطول المكافئ 190 متراً، والمجموع الكلي 1000 متر. حافظ على 500 مم أنبوب مستقيم قبل كل وصلة Refnet (و1000 مم بعد الكوع) مع تشكيل مصيدة زيت بارتفاع 200 مم بين الوحدات الخارجية.',
        specs: [
          { labelEn: 'Max Actual Run', labelAr: 'أقصى طول فعلي', value: '165 m', status: 'nominal' },
          { labelEn: 'Total Piping', labelAr: 'إجمالي الأنابيب', value: '1000 m', status: 'nominal' },
          { labelEn: 'Refnet Straight', labelAr: 'استقامة Refnet', value: '≥ 500 mm', status: 'pass' },
          { labelEn: 'Outdoor Oil Trap', labelAr: 'مصيدة الزيت', value: '≥ 200 mm', status: 'warn' },
        ],
      },
      {
        id: 'ch-vrv-2',
        startSec: 17,
        endSec: 34,
        sceneKey: 'vrv-n2-brazing',
        titleEn: '2. Continuous 0.02 MPa Dry Nitrogen Purge Brazing',
        titleAr: '2. اللحام النحاسي بتدفق النيتروجين الجاف 0.02 ميجاباسكال',
        captionEn:
          'Always sweep dry nitrogen at 0.02 MPa (0.2 bar) continuously through the copper pipe during brazing. Without nitrogen purge, black copper oxide scale forms inside the tube, clogging electronic expansion valves (EEV) and damaging inverter scroll compressors.',
        captionAr:
          'احرص دائماً على تمرير غاز النيتروجين الجاف بضغط 0.02 ميجاباسكال (0.2 بار) باستمرار داخل أنابيب النحاس أثناء اللحام. بدون النيتروجين تتكون قشور أكسيد النحاس السوداء فتسد صمامات التمدد الإلكترونية وتتلف الضواغط العاكسة.',
        specs: [
          { labelEn: 'N₂ Purge Pressure', labelAr: 'ضغط تطهير النيتروجين', value: '0.02 MPa', status: 'pass' },
          { labelEn: 'Flow Feel', labelAr: 'معدل التدفق', value: 'Light breeze', status: 'nominal' },
          { labelEn: 'Oxide Formation', labelAr: 'تكون الأكاسيد', value: '0% (Clean)', status: 'pass' },
          { labelEn: 'Forbidden Gas', labelAr: 'غاز ممنوع', value: 'No O₂ / Air', status: 'fault' },
        ],
      },
      {
        id: 'ch-vrv-3',
        startSec: 34,
        endSec: 52,
        sceneKey: 'vrv-pressure-test',
        titleEn: '3. Three-Step 40-Bar (4.0–4.15 MPa) Nitrogen Pressure Test',
        titleAr: '3. اختبار الضغط بالنيتروجين على 3 مراحل حتى 40 بار (4.0–4.15 ميجاباسكال)',
        captionEn:
          'Pressurize both liquid and gas lines stepwise using dry nitrogen: Step 1 at 0.3 MPa for 3 minutes, Step 2 at 1.5 MPa for 3 minutes, and Step 3 up to 4.0 MPa (40 bar / up to 4.15 MPa) held for 24 hours. Correct readings by 0.01 MPa per 1°C ambient shift.',
        captionAr:
          'اضغط خطي السائل والغاز تدريجياً بالنيتروجين الجاف: المرحلة الأولى 0.3 ميجاباسكال لمدة 3 دقائق، الثانية 1.5 ميجاباسكال لمدة 3 دقائق، والثالثة حتى 4.0 ميجاباسكال (40 بار / حتى 4.15 ميجاباسكال) لمدة 24 ساعة مع تعويض 0.01 ميجاباسكال لكل درجة مئوية.',
        specs: [
          { labelEn: 'Step 1 / Step 2', labelAr: 'المرحلة 1 و 2', value: '0.3 → 1.5 MPa', status: 'nominal' },
          { labelEn: 'Final Hold Test', labelAr: 'ضغط الاختبار النهائي', value: '4.0–4.15 MPa', status: 'warn' },
          { labelEn: 'Hold Duration', labelAr: 'مدة الثبات', value: '24 Hours', status: 'pass' },
          { labelEn: 'Temp Correction', labelAr: 'تصحيح الحرارة', value: '0.01 MPa/°C', status: 'nominal' },
        ],
      },
      {
        id: 'ch-vrv-4',
        startSec: 52,
        endSec: 69,
        sceneKey: 'vrv-vacuum-dry',
        titleEn: '4. Deep Vacuum Dehydration Below -100.7 kPa (500 Microns)',
        titleAr: '4. التفريغ العميق لإزالة الرطوبة أقل من 500 ميكرون (-100.7 كيلوباسكال)',
        captionEn:
          'Connect a two-stage vacuum pump through both liquid and gas service ports with stop valves closed. Pull vacuum to -100.7 kPa (-755 mmHg / under 500 microns) and run for at least 2 hours, then perform a 1-hour standing rise test verifying zero moisture regain.',
        captionAr:
          'صل مضخة تفريغ ثنائية المرحلة عبر صمامي خدمة السائل والغاز مع بقاء الصمامات الرئيسية مغلقة. اسحب التفريغ إلى -100.7 كيلوباسكال (أقل من 500 ميكرون) لمدة ساعتين على الأقل، ثم أجرِ اختبار ثبات لمدة ساعة للتأكد من خلو الدائرة من الرطوبة.',
        specs: [
          { labelEn: 'Target Vacuum', labelAr: 'التفريغ المستهدف', value: '< 500 Microns', status: 'pass' },
          { labelEn: 'Gauge Reading', labelAr: 'قراءة العداد', value: '-100.7 kPa', status: 'nominal' },
          { labelEn: 'Pump Runtime', labelAr: 'زمن المضخة', value: '≥ 2 Hours', status: 'nominal' },
          { labelEn: 'Rise Hold Check', labelAr: 'اختبار الثبات', value: '1 Hr Stable', status: 'pass' },
        ],
      },
      {
        id: 'ch-vrv-5',
        startSec: 69,
        endSec: 85,
        sceneKey: 'vrv-charge-insulation',
        titleEn: '5. Separate Pipe Insulation & Additional R-410A Charging',
        titleAr: '5. العزل المنفصل للأنابيب وحساب شحنة الفريون الإضافية R-410A',
        captionEn:
          'Insulate liquid and gas copper lines separately using closed-cell foam rated to 120°C to avoid thermal short-circuiting. Calculate additional R-410A weight solely from liquid pipe diameters and lengths, then charge liquid refrigerant accurately on a calibrated electronic scale.',
        captionAr:
          'اعزل أنبوب السائل وأنبوب الغاز بشكل منفصل تماماً باستخدام عازل مغلق الخلايا يتحمل 120 درجة مئوية لمنع التبادل الحراري. احسب الشحنة الإضافية لغاز R-410A بناءً على أطوال وأقطار خط السائل فقط، ثم اشحن الغاز بالحالة السائلة عبر ميزان إلكتروني معاير.',
        specs: [
          { labelEn: 'Pipe Insulation', labelAr: 'عزل الأنابيب', value: 'Separate Lines', status: 'pass' },
          { labelEn: 'Gas Line Rating', labelAr: 'تحمل خط الغاز', value: '≥ 120 °C', status: 'warn' },
          { labelEn: 'Charge Basis', labelAr: 'أساس الشحن', value: 'Liquid Pipe Only', status: 'nominal' },
          { labelEn: 'Refrigerant State', labelAr: 'حالة الشحن', value: 'Liquid R-410A', status: 'pass' },
        ],
      },
    ],
  },

  'lesson-vrv-fahu-controls': {
    id: 'lesson-vrv-fahu-controls',
    videoRecordId: 'vid_lesson_2',
    titleEn: 'VRV + FAHU 0–10V DC Control Wiring & EKEQFCB Capacity Step Sequence',
    titleAr: 'تسلسل التحكم 0–10 فولت وتوصيلات وحدة VRV مع FAHU وصندوق التحكم EKEQFCB',
    category: 'Fresh Air Handling Units (FAHU)',
    manualRef: 'Daikin VRV + FAHU Control Sequence & Wiring Block Diagram',
    durationSeconds: 85,
    chapters: [
      {
        id: 'ch-fahu-1',
        startSec: 0,
        endSec: 17,
        sceneKey: 'fahu-block-architecture',
        titleEn: '1. VRV + EKEXV + EKEQFCB + DDC System Architecture',
        titleAr: '1. معمارية الربط بين VRV وصمام EKEXV وصندوق EKEQFCB ونظام DDC',
        captionEn:
          'Daikin VRV-to-FAHU integration links four core blocks: the VRV Outdoor Condensing Unit, the EKEXV Electronic Expansion Valve Kit mounted near the DX coil, the EKEQFCB Control Box, and the site DDC/BMS panel regulating fresh air discharge temperature via 0–10V DC X-control.',
        captionAr:
          'يربط نظام دمج VRV مع FAHU أربع وحدات رئيسية: الوحدة الخارجية VRV، وطقم صمام التمدد الإلكتروني EKEXV قرب ملف التبريد، وصندوق التحكم EKEQFCB، ولوحة التحكم DDC/BMS التي تنظم حرارة هواء التغذية بإشارة 0–10 فولت مستمر.',
        specs: [
          { labelEn: 'Control Kit', labelAr: 'صندوق التحكم', value: 'EKEQFCBAV3', status: 'nominal' },
          { labelEn: 'Expansion Valve', labelAr: 'صمام التمدد', value: 'EKEXV Kit', status: 'nominal' },
          { labelEn: 'Control Mode', labelAr: 'وضع التحكم', value: 'X-Control 0-10V', status: 'pass' },
          { labelEn: 'Sensor Bus', labelAr: 'حساسات الملف', value: 'R1T / R2T / R3T', status: 'nominal' },
        ],
      },
      {
        id: 'ch-fahu-2',
        startSec: 17,
        endSec: 34,
        sceneKey: 'fahu-cable-separation',
        titleEn: '2. Power vs. Transmission Cable Specs (F1/F2, P1/P2, T1/T2)',
        titleAr: '2. مواصفات كوابل القدرة والاتصال (F1/F2 و P1/P2 و T1/T2)',
        captionEn:
          'Separate 230V AC power wiring (L/N/E) from low-voltage communication lines by at least 50 mm. Use 2-core 0.75–1.25 mm² non-polar shielded cable for F1/F2 outdoor-to-EKEQFCB transmission, P1/P2 for BRC remote service setup, and dry-contact interlocks on T1/T2.',
        captionAr:
          'افصل كوابل القدرة 230 فولت (L/N/E) عن خطوط الإشارة منخفضة الجهد بمسافة لا تقل عن 50 مم. استخدم كابل مزدوج معزول 0.75–1.25 مم² غير قطبي لخط الاتصال F1/F2، وخط P1/P2 للتحكم السلكي، وتلامس جاف على T1/T2 للربط التشغيلي.',
        specs: [
          { labelEn: 'F1/F2 Bus', labelAr: 'خط الاتصال F1/F2', value: '16V DC Non-Polar', status: 'nominal' },
          { labelEn: 'Cable Gauge', labelAr: 'مقطع الكابل', value: '0.75–1.25 mm²', status: 'pass' },
          { labelEn: 'HV Separation', labelAr: 'الفصل عن القدرة', value: '≥ 50 mm Gap', status: 'warn' },
          { labelEn: 'Run Interlock', labelAr: 'تلامس التشغيل', value: 'T1/T2 Dry Contact', status: 'pass' },
        ],
      },
      {
        id: 'ch-fahu-3',
        startSec: 34,
        endSec: 52,
        sceneKey: 'fahu-0-10v-curve',
        titleEn: '3. Live 0–10V DC Linear ΔT Capacity Step Control Curve',
        titleAr: '3. منحنى التحكم الخطي 0–10 فولت لتعديل سعة التبريد ΔT',
        captionEn:
          'In Daikin X-Control, the DDC panel drives EKEQFCB capacity via a 0–10V DC analog input: 5.0 V holds current compressor capacity constant, 5.5–10.0 V steps cooling capacity upward proportionally to load, and 0.0–4.5 V steps capacity downward smoothly to prevent coil freeze-up.',
        captionAr:
          'في نظام التحكم X-Control ترسل لوحة DDC إشارة تناظرية 0–10 فولت إلى EKEQFCB: الجهد 5.0 فولت يثبّت السعة الحالية، ومن 5.5 إلى 10.0 فولت يرفع قدرة التبريد تدريجياً، ومن 0.0 إلى 4.5 فولت يخفض السعة بسلاسة لمنع تجمد الملف.',
        specs: [
          { labelEn: 'Hold Band', labelAr: 'نطاق التثبيت', value: '5.0 V DC (Hold)', status: 'pass' },
          { labelEn: 'Step-Up Cooling', labelAr: 'زيادة التبريد', value: '5.5 → 10.0 V DC', status: 'nominal' },
          { labelEn: 'Step-Down', labelAr: 'خفض السعة', value: '0.0 → 4.5 V DC', status: 'warn' },
          { labelEn: 'Input Polarity', labelAr: 'قطبية الإشارة', value: 'Y1(+) / Y2(-)', status: 'nominal' },
        ],
      },
      {
        id: 'ch-fahu-4',
        startSec: 52,
        endSec: 69,
        sceneKey: 'fahu-relay-interlocks',
        titleEn: '4. Fan Proof, Damper End-Switch & Fault Relays (Y1–Y6, C1–C10)',
        titleAr: '4. تسلسل المروحة والدامبر ومفاتيح الأمان ومرحلات الأعطال',
        captionEn:
          'Never permit VRV compressor operation without confirmed FAHU supply airflow. Sequence start-up strictly: 1) Open motorized fresh air damper and confirm end-switch, 2) Start supply fan and verify differential pressure switch, 3) Close EKEQFCB run enable contact, and 4) Monitor fault & defrost output relays.',
        captionAr:
          'يُمنع تشغيل ضاغط VRV قبل تأكيد تدفق هواء مروحة FAHU. اتبع تسلسل البدء بدقة: 1) فتح الدامبر الآلي وتأكيد مفتاح النهاية، 2) تشغيل مروحة التغذية والتحقق من مفتاح فرق الضغط، 3) إغلاق تلامس التمكين على EKEQFCB، 4) مراقبة مرحلات الأعطال وإذابة الصقيع.',
        specs: [
          { labelEn: 'Step 1', labelAr: 'الخطوة 1', value: 'Damper End-Switch', status: 'nominal' },
          { labelEn: 'Step 2', labelAr: 'الخطوة 2', value: 'Airflow DPS Proof', status: 'pass' },
          { labelEn: 'Step 3', labelAr: 'الخطوة 3', value: 'T1/T2 Run Enable', status: 'pass' },
          { labelEn: 'Fire Alarm Cut', labelAr: 'فصل إنذار الحريق', value: 'Immediate Stop', status: 'fault' },
        ],
      },
      {
        id: 'ch-fahu-5',
        startSec: 69,
        endSec: 85,
        sceneKey: 'fahu-commissioning-verify',
        titleEn: '5. Thermistor Placement & Full-Load ΔT Verification',
        titleAr: '5. تثبيت حساسات الحرارة والتحقق من فرق الحرارة ΔT عند الحمل الكامل',
        captionEn:
          'Mount the R2T liquid pipe and R3T gas pipe thermistors tightly inside brazed copper pockets with thermal paste and aluminum tape insulation. During commissioning, sweep the DDC signal from 2V to 5V to 9V and confirm EKEXV pulse response, superheat stability, and clean supply air ΔT.',
        captionAr:
          'ثبّت حساسات الأنابيب R2T للسائل وR3T للغاز بإحكام داخل الجيوب النحاسية مع معجون حراري وشريط ألمنيوم عازل. أثناء التشغيل التجريبي اختبر إشارة DDC عند 2 فولت ثم 5 فولت ثم 9 فولت وتأكد من استجابة صمام EKEXV وثبات التحميص ودرجة هواء التغذية.',
        specs: [
          { labelEn: 'R2T / R3T Mount', labelAr: 'تثبيت الحساسات', value: 'Thermal Paste', status: 'pass' },
          { labelEn: 'EKEXV Max Distance', labelAr: 'أقصى مسافة EKEXV', value: '≤ 5 m to Coil', status: 'warn' },
          { labelEn: 'DDC Sweep Check', labelAr: 'فحص الإشارة', value: '2V → 5V → 9V', status: 'nominal' },
          { labelEn: 'Discharge Target', labelAr: 'حرارة التغذية', value: '13–15 °C DB', status: 'pass' },
        ],
      },
    ],
  },

  'lesson-vrv-pcb-errors': {
    id: 'lesson-vrv-pcb-errors',
    videoRecordId: 'vid_lesson_3',
    titleEn: 'VRV Outdoor A1P Control PCB Settings (BS1–BS3, DS1–DS2) & Error Code Diagnostics',
    titleAr: 'إعدادات اللوحة الرئيسية A1P للوحدة الخارجية VRV (أزرار BS1–BS3) وتشخيص رموز الأعطال',
    category: 'Troubleshooting & Error Codes',
    manualRef: 'RXYTQ General Operation & Maintenance Presentation & VRV Error Codes Manual',
    durationSeconds: 85,
    chapters: [
      {
        id: 'ch-pcb-1',
        startSec: 0,
        endSec: 17,
        sceneKey: 'pcb-preheat-layout',
        titleEn: '1. 6-Hour Crankcase Preheat & Refrigerant-Cooled A1P PCB Layout',
        titleAr: '1. التسخين المسبق لمدة 6 ساعات وتصميم لوحة A1P المبردة بالفريون',
        captionEn:
          'Energize the outdoor unit isolator at least 6 hours before starting compressors so the crankcase oil heater evaporates dissolved refrigerant. Inside the service compartment, locate the refrigerant-cooled inverter jacket and the A1P main PCB featuring LEDs H1P–H7P, 7-segment display SEG1–SEG3, pushbuttons BS1–BS3, and DIP switches DS1–DS2.',
        captionAr:
          'قم بتوصيل الكهرباء للوحدة الخارجية قبل التشغيل بـ 6 ساعات على الأقل ليعمل سخان زيت الكرنك ويبخر الفريون الذائب في الزيت. داخل حجرة الخدمة حدد موقع اللوحة الرئيسية A1P والمبردة بالفريون، والتي تضم مصابيح H1P–H7P وشاشة 7-Segment وأزرار BS1–BS3 ومفاتيح DS1–DS2.',
        specs: [
          { labelEn: 'Crankcase Preheat', labelAr: 'التسخين المسبق', value: '≥ 6 Hours', status: 'warn' },
          { labelEn: 'PCB Cooling', labelAr: 'تبريد اللوحة', value: 'Refrigerant Plate', status: 'nominal' },
          { labelEn: 'Pushbuttons', labelAr: 'أزرار البرمجة', value: 'BS1 / BS2 / BS3', status: 'nominal' },
          { labelEn: 'Max Ambient', labelAr: 'أقصى حرارة محيطة', value: '52 °C DB', status: 'pass' },
        ],
      },
      {
        id: 'ch-pcb-2',
        startSec: 17,
        endSec: 34,
        sceneKey: 'pcb-bs-navigation',
        titleEn: '2. Navigating Mode 1 (Monitor) & Mode 2 (Field Settings)',
        titleAr: '2. التنقل بين الوضع الأول (المراقبة) والوضع الثاني (الإعدادات الميدانية)',
        captionEn:
          'Press BS1 once to enter Mode 1 for live diagnostics (indoor count, compressor Hz, high/low pressure). Hold BS1 for 5 seconds to enter Mode 2 (Field Settings): press BS2 to select setting code such as [2-49] for 90 m height difference or [2-20] for manual additional charge, press BS3 to view/confirm, then press BS1 to return to normal display.',
        captionAr:
          'اضغط BS1 مرة واحدة للدخول إلى الوضع 1 لقراءة البيانات الحية (عدد الوحدات، تردد الضاغط، والضغط). اضغط مطولاً على BS1 لمدة 5 ثوانٍ للدخول إلى الوضع 2 للإعدادات الميدانية: استخدم BS2 لاختيار الكود مثل [2-49] لفارق الارتفاع 90 متراً، ثم BS3 للتأكيد، ثم BS1 للعودة.',
        specs: [
          { labelEn: 'Mode 1 Entry', labelAr: 'دخول الوضع 1', value: 'Tap BS1 (1×)', status: 'nominal' },
          { labelEn: 'Mode 2 Entry', labelAr: 'دخول الوضع 2', value: 'Hold BS1 (5s)', status: 'pass' },
          { labelEn: 'Select / Confirm', labelAr: 'الاختيار والتأكيد', value: 'BS2 → BS3', status: 'nominal' },
          { labelEn: '90m Height Code', labelAr: 'كود ارتفاع 90م', value: '[2-49] / [2-35]', status: 'warn' },
        ],
      },
      {
        id: 'ch-pcb-3',
        startSec: 34,
        endSec: 52,
        sceneKey: 'pcb-test-run',
        titleEn: '3. Mandatory Test Run Sequence (t01–t10) & 8-Hour Oil Recovery',
        titleAr: '3. تسلسل التشغيل التجريبي الإلزامي (t01–t10) ودورة استرجاع الزيت',
        captionEn:
          'Hold BS2 for 5 seconds in normal mode to launch the automatic Daikin Test Run (t01 through t10). The system checks stop valves, pipe/wiring matching, and indoor counts over 15–30 minutes. Skipping Test Run locks the controller with fault code U3. Once commissioned, VRV automatically runs oil recovery every 8 hours.',
        captionAr:
          'اضغط مطولاً على BS2 لمدة 5 ثوانٍ لبدء التشغيل التجريبي الآلي من t01 حتى t10. يتحقق النظام خلال 15–30 دقيقة من صمامات الخدمة وتطابق الأنابيب والأسلاك. تجاوز الاختبار يوقف النظام برمز العطل U3، وبعد نجاحه ينفذ النظام دورة استرجاع الزيت كل 8 ساعات تلقائياً.',
        specs: [
          { labelEn: 'Launch Test Run', labelAr: 'بدء الاختبار', value: 'Hold BS2 (5s)', status: 'pass' },
          { labelEn: 'Sequence Steps', labelAr: 'مراحل الفحص', value: 't01 → t10', status: 'nominal' },
          { labelEn: 'Unfinished Code', labelAr: 'كود عدم الإكمال', value: 'U3 Lockout', status: 'fault' },
          { labelEn: 'Oil Recovery', labelAr: 'استرجاع الزيت', value: 'Every 8 Hours', status: 'nominal' },
        ],
      },
      {
        id: 'ch-pcb-4',
        startSec: 52,
        endSec: 69,
        sceneKey: 'pcb-error-e3-u4',
        titleEn: '4. Diagnosing Critical Faults: E3, U4, UF & L5',
        titleAr: '4. تشخيص الأعطال الحرجة: E3 و U4 و UF و L5',
        captionEn:
          'Read malfunction codes directly on SEG1–SEG3 or the BRC remote: E3 signals High Pressure Switch actuation (closed stop valve, dirty condenser, or overcharge); U4 indicates broken F1/F2 transmission between indoor and outdoor units; UF flags mismatched piping-to-wiring; L5 indicates inverter overcurrent or compressor ground fault.',
        captionAr:
          'اقرأ رموز الأعطال من شاشة SEG1–SEG3 أو وحدة التحكم: الرمز E3 يعني ارتفاع الضغط العالي (صمام مغلق أو شحنة زائدة)، الرمز U4 يعني انقطاع اتصال F1/F2 بين الوحدات، الرمز UF يعني عدم تطابق الأنابيب مع الأسلاك، وL5 يشير لتيار زائد أو عطل في العاكس.',
        specs: [
          { labelEn: 'E3 Fault', labelAr: 'عطل E3', value: 'High Pressure Trip', status: 'fault' },
          { labelEn: 'U4 Fault', labelAr: 'عطل U4', value: 'F1/F2 Comm Loss', status: 'fault' },
          { labelEn: 'UF Fault', labelAr: 'عطل UF', value: 'Pipe/Wire Mismatch', status: 'warn' },
          { labelEn: 'L5 Fault', labelAr: 'عطل L5', value: 'Inverter Overcurrent', status: 'fault' },
        ],
      },
      {
        id: 'ch-pcb-5',
        startSec: 69,
        endSec: 85,
        sceneKey: 'pcb-emergency-backup',
        titleEn: '5. Emergency Backup Operation & Compressor Rotation',
        titleAr: '5. التشغيل الاحتياطي الطارئ وتناوب الضواغط',
        captionEn:
          'Multi-compressor VRV IV modules support emergency backup operation via Mode 2 settings so remaining healthy compressors maintain building cooling while a failed compressor or module is serviced. Always log fault history in Mode 1 before cycling main power.',
        captionAr:
          'تدعم وحدات VRV IV متعددة الضواغط وضع التشغيل الاحتياطي الطارئ عبر إعدادات الوضع 2 لتستمر الضواغط السليمة في التبريد لحين صيانة الضاغط المتعطل. احرص دائماً على تسجيل سجل الأعطال من الوضع 1 قبل فصل التيار الرئيسي.',
        specs: [
          { labelEn: 'Backup Mode', labelAr: 'وضع الطوارئ', value: 'Mode 2 Enable', status: 'pass' },
          { labelEn: 'Fault History', labelAr: 'سجل الأعطال', value: 'Mode 1 Readout', status: 'nominal' },
          { labelEn: 'Duty Rotation', labelAr: 'تناوب التشغيل', value: 'Auto Equalize', status: 'pass' },
          { labelEn: 'BMS Gateways', labelAr: 'بوابات BMS', value: 'iTM / BACnet', status: 'nominal' },
        ],
      },
    ],
  },

  'lesson-ahu-fahu-startup': {
    id: 'lesson-ahu-fahu-startup',
    videoRecordId: 'vid_lesson_4',
    titleEn: 'Modular AHU / FAHU Assembly, Spring Isolators, Siphon Drain & Start-Up',
    titleAr: 'تجميع وحدات مناولة الهواء AHU/FAHU، العوازل النابضية، مصيدة التصريف وبدء التشغيل',
    category: 'Air Handling Units (AHU)',
    manualRef: 'Daikin Middle East Modular AHU IOM Manual (DMA-IOM-15-01)',
    durationSeconds: 85,
    chapters: [
      {
        id: 'ch-ahu-1',
        startSec: 0,
        endSec: 17,
        sceneKey: 'ahu-rigging-assembly',
        titleEn: '1. Modular Rigging, Thermal-Break Panels & Airtight Gasketing',
        titleAr: '1. الرفع الآمن وتجميع الأجزاء المعزولة حرارياً وإحكام الحشوات',
        captionEn:
          'Lift each modular AHU section strictly using the base-frame rigging lugs with spreader bars to avoid crushing the 40 mm or 60 mm thermal-break aluminum panels. Apply continuous closed-cell perimeter gaskets between mating sections and bolt modules flush on a level concrete plinth.',
        captionAr:
          'ارفع كل قسم من وحدة مناولة الهواء عبر عروات الرفع السفلية مع قضبان التوزيع لتجنب إتلاف ألواح الألمنيوم المعزولة حرارياً (40 أو 60 مم). ضع حشوات مانعة للتسرب متصلة بين الأقسام واربطها بإحكام فوق قاعدة خرسانية مستوية تماماً.',
        specs: [
          { labelEn: 'Panel Profiles', labelAr: 'سماكة الألواح', value: '40 / 60 mm TB', status: 'nominal' },
          { labelEn: 'Spreader Bar', labelAr: 'قضيب التوزيع', value: 'Mandatory Lift', status: 'warn' },
          { labelEn: 'Section Seal', labelAr: 'إحكام التجميع', value: 'Airtight Gasket', status: 'pass' },
          { labelEn: 'Service Clearance', labelAr: 'خلوص الصيانة', value: '≥ Unit Width', status: 'nominal' },
        ],
      },
      {
        id: 'ch-ahu-2',
        startSec: 17,
        endSec: 34,
        sceneKey: 'ahu-isolators-belts',
        titleEn: '2. Backing Off Shipping Bolts, Spring Isolators & Belt Alignment',
        titleAr: '2. تحرير مسامير الشحن ومعايرة العوازل النابضية وشد السيور',
        captionEn:
          'With LOTO applied, unlock and back off all red transit shipping bolts on the internal fan-motor spring vibration isolators so the fan deck floats freely. Rotate the centrifugal wheel by hand to check clearance, verify laser pulley alignment, and calibrate V-belt deflection tension.',
        captionAr:
          'بعد تطبيق قفل العزل LOTO، فكّ جميع مسامير تثبيت الشحن الحمراء عن عوازل الاهتزاز النابضية لتطفو قاعدة المروحة بحرية. أدر دولاب المروحة باليد للتأكد من عدم الاحتكاك، واضبط استقامة البكرات بالليزر وشد السيور حسب المواصفة.',
        specs: [
          { labelEn: 'Shipping Bolts', labelAr: 'مسامير الشحن', value: 'Remove / Unlock', status: 'warn' },
          { labelEn: 'Pulley Check', labelAr: 'استقامة البكرات', value: 'Laser Aligned', status: 'pass' },
          { labelEn: 'Hand Spin Test', labelAr: 'تدوير يدوي', value: 'Free / No Rub', status: 'pass' },
          { labelEn: 'LOTO Status', labelAr: 'عزل الطاقة', value: 'Locked Off', status: 'fault' },
        ],
      },
      {
        id: 'ch-ahu-3',
        startSec: 34,
        endSec: 52,
        sceneKey: 'ahu-siphon-drain',
        titleEn: '3. Negative-Pressure Condensate Siphon Trap Sizing (H ≥ Fan Head)',
        titleAr: '3. تصميم مصيدة تصريف التكثيف للضغط السالب (H ≥ ضغط المروحة)',
        captionEn:
          'Draw-through cooling coils operate under negative static pressure. Without a properly sized water-sealed siphon trap, air sucks back up the drain pipe and floods the AHU casing. Size vertical trap height H greater than or equal to the maximum fan negative static pressure in mmWG plus 50 mm safety margin, and prime with water before start-up.',
        captionAr:
          'تعمل ملفات التبريد الساحبة تحت ضغط سالب؛ وبدون مصيدة مائية بالمقاس الصحيح يُسحب الهواء عبر أنبوب التصريف فيفيض الماء داخل الوحدة. صمّم ارتفاع المصيدة H ليكون أكبر من أو يساوي أقصى ضغط سكوني للمروحة بوحدة mmWG مضافاً إليه 50 مم أمان، واملأها بالماء قبل التشغيل.',
        specs: [
          { labelEn: 'Trap Depth H', labelAr: 'عمق المصيدة H', value: '≥ Fan Head + 50mm', status: 'pass' },
          { labelEn: 'Outlet Drop H/2', labelAr: 'فرق المخرج', value: '≥ 0.5 × H', status: 'nominal' },
          { labelEn: 'Pre-Start Prime', labelAr: 'التعبئة المسبقة', value: 'Fill Water Seal', status: 'warn' },
          { labelEn: 'Pan Slope', labelAr: 'ميل الحوض', value: 'Positive to Drain', status: 'pass' },
        ],
      },
      {
        id: 'ch-ahu-4',
        startSec: 52,
        endSec: 69,
        sceneKey: 'ahu-star-delta-rotation',
        titleEn: '4. Star-Delta Motor Wiring, Rotation Check & Filter Sealing',
        titleAr: '4. توصيل محرك ستار-دلتا، فحص اتجاه الدوران وإحكام الفلاتر',
        captionEn:
          'Verify motor nameplate wiring (DOL or Star-Delta / VFD), confirm clean filter installation with zero bypass gaps around pre-filters and bag filters, close all access doors, and bump-test the supply fan to confirm rotation direction matches the scroll casing arrow.',
        captionAr:
          'تحقق من توصيل المحرك حسب لوحة البيانات (DOL أو ستار-دلتا أو VFD)، وتأكد من إحكام الفلاتر الابتدائية والكيسية بدون أي فراغات جانبية، ثم أغلق الأبواب ونفذ اختبار نبضة قصيرة للتحقق من تطابق اتجاه دوران المروحة مع سهم الغلاف.',
        specs: [
          { labelEn: 'Motor Wiring', labelAr: 'توصيل المحرك', value: 'Star-Delta / VFD', status: 'nominal' },
          { labelEn: 'Rotation Test', labelAr: 'اتجاه الدوران', value: 'Match Arrow', status: 'pass' },
          { labelEn: 'Filter Frames', labelAr: 'إطارات الفلاتر', value: 'Zero Bypass', status: 'pass' },
          { labelEn: 'Door Interlock', labelAr: 'قفل الأبواب', value: 'Closed & Sealed', status: 'warn' },
        ],
      },
      {
        id: 'ch-ahu-5',
        startSec: 69,
        endSec: 85,
        sceneKey: 'ahu-commissioning-log',
        titleEn: '5. Full-Load Amps, Static Pressure & Heater Safety Cutout Test',
        titleAr: '5. قياس التيار الكامل والضغط السكوني واختبار قاطع أمان السخان',
        captionEn:
          'Measure running current across L1, L2, and L3 against nameplate FLA—never run an AHU fan with open doors or missing ductwork, which overloads the motor. Verify differential pressure across filters, and test electric heater high-limit safety cutouts with supply fans stopped.',
        captionAr:
          'قس تيار التشغيل على الأطوار الثلاثة L1 وL2 وL3 مقارنة بالتيار الاسمي FLA؛ ولا تشغل المروحة أبداً والأبواب مفتوحة لتجنب زيادة الحمل. تحقق من فرق الضغط عبر الفلاتر واختبر قاطع الحماية الحرارية للسخان الكهربائي أثناء توقف المروحة.',
        specs: [
          { labelEn: 'Running Amps', labelAr: 'تيار التشغيل', value: '≤ Nameplate FLA', status: 'pass' },
          { labelEn: 'Heater Cutout', labelAr: 'أمان السخان', value: 'Trip w/ Fan Off', status: 'fault' },
          { labelEn: 'Filter ΔP Check', labelAr: 'فرق ضغط الفلتر', value: 'Manometer Log', status: 'nominal' },
          { labelEn: 'Airflow Balance', labelAr: 'موازنة الهواء', value: 'Design CFM', status: 'pass' },
        ],
      },
    ],
  },

  'lesson-fxsq-ducted': {
    id: 'lesson-fxsq-ducted',
    videoRecordId: 'vid_lesson_5',
    titleEn: 'FXSQ Concealed Ceiling Ducted Indoor Installation, 625 mm Drain Pump & ESP Setup',
    titleAr: 'تركيب الوحدة المخفية FXSQ، مضخة التصريف 625 مم وضبط الضغط السكوني الخارجي ESP',
    category: 'Fan Coil Units (FCU)',
    manualRef: 'Daikin FXSQ15-140A2VEB Installation & Operation Manual',
    durationSeconds: 80,
    chapters: [
      {
        id: 'ch-fxsq-1',
        startSec: 0,
        endSec: 16,
        sceneKey: 'fxsq-suspension',
        titleEn: '1. M10 Suspension Bolts, Ceiling Leveling & Access Hatch',
        titleAr: '1. قضبان التعليق M10 وميزان الاستواء وفتحة الصيانة بالسقف',
        captionEn:
          'Suspend the FXSQ-A2VEB concealed ducted unit using four M10 threaded rods with double locking nuts and washers. Level the casing accurately in both axes so the internal drain pan drains cleanly toward the pump, and reserve at least a 450×450 mm service hatch under the switch box and drain pan.',
        captionAr:
          'علّق الوحدة المخفية FXSQ-A2VEB بأربعة قضبان مسننة M10 مع صواميل تثبيت مزدوجة وحلقات معدنية. اضبط استواء الوحدة بميزان الماء في المحورين لضمان تصريف سليم نحو المضخة، ووفّر فتحة صيانة لا تقل عن 450×450 مم أسفل صندوق الكهرباء وحوض التصريف.',
        specs: [
          { labelEn: 'Hanger Rods', labelAr: 'قضبان التعليق', value: '4 × M10 Double-Nut', status: 'pass' },
          { labelEn: 'Level Tolerance', labelAr: 'سماحية الاستواء', value: '≤ 1 mm / m', status: 'nominal' },
          { labelEn: 'Service Hatch', labelAr: 'فتحة الصيانة', value: '≥ 450 × 450 mm', status: 'warn' },
          { labelEn: 'Unit Height', labelAr: 'ارتفاع الوحدة', value: '245 mm Slim', status: 'nominal' },
        ],
      },
      {
        id: 'ch-fxsq-2',
        startSec: 16,
        endSec: 32,
        sceneKey: 'fxsq-suction-flare',
        titleEn: '2. Rear vs. Bottom Return Suction & Calibrated Flare Torque',
        titleAr: '2. تحويل السحب الخلفي أو السفلي وعزم شد صواميل التوسيع',
        captionEn:
          'FXSQ units ship configured for rear air suction and convert easily to bottom suction by relocating the bottom chamber plate and filter rail. Tighten refrigerant flare nuts strictly with two wrenches (backup + torque wrench) to Daikin specs: 14–17 Nm for 1/4", 33–39 Nm for 3/8", and 50–61 Nm for 1/2".',
        captionAr:
          'تأتي وحدات FXSQ مجهزة للسحب الخلفي ويمكن تحويلها بسهولة إلى السحب السفلي بنقل اللوحة السفلية ومجرى الفلتر. اربط صواميل التوسيع باستخدام مفتاحين (تثبيت + مفتاح عزم) حسب جدول دايكن: 14–17 نيوتن.متر لقياس 1/4"، و33–39 لـ 3/8"، و50–61 لـ 1/2".',
        specs: [
          { labelEn: 'Return Suction', labelAr: 'خيارات السحب', value: 'Rear / Bottom', status: 'nominal' },
          { labelEn: '1/4" Flare Torque', labelAr: 'عزم 1/4 بوصة', value: '14–17 Nm', status: 'pass' },
          { labelEn: '3/8" Flare Torque', labelAr: 'عزم 3/8 بوصة', value: '33–39 Nm', status: 'pass' },
          { labelEn: '1/2" Flare Torque', labelAr: 'عزم 1/2 بوصة', value: '50–61 Nm', status: 'pass' },
        ],
      },
      {
        id: 'ch-fxsq-3',
        startSec: 32,
        endSec: 48,
        sceneKey: 'fxsq-drain-pump',
        titleEn: '3. 625 mm High-Lift Drain Pump, 1:100 Slope & Water Pour Test',
        titleAr: '3. مضخة التصريف بارتفاع 625 مم وميل 1:100 واختبار صب الماء',
        captionEn:
          'The built-in FXSQ drain pump lifts condensate up to 625 mm from the unit base within 300 mm of the outlet socket. After the vertical rise, slope the insulated PVC drain header downward at 1:100 minimum, connect the flexible drain hose without kinks, and pour 1 liter of water into the pan to verify pump lift and float switch operation.',
        captionAr:
          'ترفع مضخة التصريف المدمجة في FXSQ ماء التكثيف حتى ارتفاع 625 مم من قاعدة الوحدة ضمن مسافة 300 مم من المخرج. بعد الارتفاع العمودي يجب أن يميل خط التصريف المعزول بنسبة 1:100 للأسفل على الأقل، ثم صب لتراً من الماء لاختبار عمل المضخة والعوامة.',
        specs: [
          { labelEn: 'Max Pump Lift', labelAr: 'أقصى رفع للمضخة', value: '625 mm Max', status: 'pass' },
          { labelEn: 'Horizontal Offset', labelAr: 'البعد الأفقي للرفع', value: '≤ 300 mm', status: 'warn' },
          { labelEn: 'Gravity Slope', labelAr: 'ميل التصريف', value: '≥ 1 : 100 Down', status: 'nominal' },
          { labelEn: 'Drain Insulation', labelAr: 'عزل خط الصرف', value: 'Full Vapor Seal', status: 'pass' },
        ],
      },
      {
        id: 'ch-fxsq-4',
        startSec: 48,
        endSec: 64,
        sceneKey: 'fxsq-esp-setup',
        titleEn: '4. External Static Pressure (ESP 30–150 Pa) Field Calibration',
        titleAr: '4. معايرة الضغط السكوني الخارجي (30–150 باسكال) حسب مجاري الهواء',
        captionEn:
          'Match the DC fan motor torque to the site ductwork resistance using the BRC1E62 remote field settings (Mode 13-06 or Auto Airflow Adjustment). FXSQ supports selectable External Static Pressure steps from 30 Pa up to 150 Pa, ensuring design airflow without excessive duct noise or coil freezing.',
        captionAr:
          'اضبط عزم محرك المروحة DC ليتوافق مع مقاومة مجاري الهواء عبر إعدادات وحدة التحكم BRC1E62 (الوضع 13-06 أو الضبط التلقائي لتدفق الهواء). تدعم FXSQ درجات ضغط سكوني خارجي من 30 باسكال حتى 150 باسكال لتحقيق التدفق التصميمي بدون ضجيج.',
        specs: [
          { labelEn: 'ESP Range', labelAr: 'نطاق الضغط السكوني', value: '30 – 150 Pa', status: 'pass' },
          { labelEn: 'Auto Airflow', labelAr: 'الضبط التلقائي', value: '±10% Rated CFM', status: 'nominal' },
          { labelEn: 'Fan Motor', labelAr: 'محرك المروحة', value: 'DC Inverter', status: 'nominal' },
          { labelEn: 'Canvas Collar', labelAr: 'الوصلة المرنة', value: 'Isolate Ducts', status: 'warn' },
        ],
      },
      {
        id: 'ch-fxsq-5',
        startSec: 64,
        endSec: 80,
        sceneKey: 'fxsq-brc-wiring',
        titleEn: '5. F1/F2 Transmission, P1/P2 Remote & Master/Slave Addressing',
        titleAr: '5. توصيل اتصال F1/F2 ووحدة التحكم P1/P2 وضبط الرئيس والتابع',
        captionEn:
          'Terminate outdoor-to-indoor transmission on F1/F2 (non-polar 16V DC) and wire the BRC1E62 navigation controller to P1/P2. When controlling two remotes on one group, set one controller to Main and the second to Sub via the BRC switch—never mix power wires onto F1/F2 or P1/P2 terminals.',
        captionAr:
          'وصّل خط الاتصال بين الوحدة الخارجية والداخلية على الطرفين F1/F2 (16 فولت غير قطبي) ووحدة التحكم BRC1E62 على الطرفين P1/P2. عند استخدام وحدتي تحكم لمجموعة واحدة اضبط إحداهما كرئيسية والأخرى كفرعية، وتجنب تماماً توصيل الجهد العالي على أطراف الإشارة.',
        specs: [
          { labelEn: 'VRV Bus', labelAr: 'خط VRV', value: 'F1 / F2 Non-Polar', status: 'nominal' },
          { labelEn: 'Remote Bus', labelAr: 'خط الريموت', value: 'P1 / P2 (BRC1E62)', status: 'pass' },
          { labelEn: 'Dual Remote', labelAr: 'تحكم مزدوج', value: 'Main / Sub Switch', status: 'warn' },
          { labelEn: 'Max Group', labelAr: 'الحد الأقصى للمجموعة', value: '16 Indoor Units', status: 'nominal' },
        ],
      },
    ],
  },

  'lesson-generator-elcb': {
    id: 'lesson-generator-elcb',
    videoRecordId: 'vid_lesson_6',
    titleEn: 'Generator Power Guidelines, ELCB/RCCB Protection & 500V Megger Electrical Checks',
    titleAr: 'إرشادات تشغيل أنظمة Daikin على المولدات الكهربائية وفحص القاطع ELCB والميجر 500 فولت',
    category: 'HVAC Controls and BMS Interfaces',
    manualRef: 'Daikin Guidelines for Using Generator Power & VRV-IV Installation PPT',
    durationSeconds: 80,
    chapters: [
      {
        id: 'ch-gen-1',
        startSec: 0,
        endSec: 16,
        sceneKey: 'gen-voltage-tolerance',
        titleEn: '1. Voltage Window (±10%), Phase Unbalance (≤2%) & Pure Sine Wave',
        titleAr: '1. حدود الجهد (±10%) وعدم توازن الأطوار (≤2%) والموجة الجيبية النقية',
        captionEn:
          'Daikin inverter VRV and DX systems require stable generator output: supply voltage must stay within ±10% of nominal, three-phase voltage unbalance must remain ≤2%, frequency within ±2%, and output waveform must be a clean pure sine wave with automatic voltage regulation (AVR).',
        captionAr:
          'تتطلب أنظمة VRV وDX العاكسة طاقة مستقرة من المولد: يجب أن يبقى الجهد ضمن ±10% من الجهد الاسمي، وعدم توازن الأطوار الثلاثة أقل أو يساوي 2%، والتردد ضمن ±2%، مع موجة جيبية نقية ومنظم جهد تلقائي AVR.',
        specs: [
          { labelEn: 'Voltage Window', labelAr: 'نطاق الجهد', value: 'Nominal ±10%', status: 'pass' },
          { labelEn: 'Phase Unbalance', labelAr: 'عدم توازن الأطوار', value: '≤ 2.0% Max', status: 'warn' },
          { labelEn: 'Waveform', labelAr: 'شكل الموجة', value: 'Pure Sine + AVR', status: 'pass' },
          { labelEn: 'Frequency Drift', labelAr: 'انحراف التردد', value: '50/60 Hz ±2%', status: 'nominal' },
        ],
      },
      {
        id: 'ch-gen-2',
        startSec: 16,
        endSec: 32,
        sceneKey: 'gen-phase-earthing',
        titleEn: '2. Zero Phase Swapping, Neutral-to-Earth (<1V) & Dedicated Ground',
        titleAr: '2. منع تبديل الأطوار وفحص جهد المحايد للأرض (<1 فولت) والتأريض المستقل',
        captionEn:
          'Never reverse phase sequence during generator-to-grid transfer—phase reversal trips protective relays and stresses rectifier bridges. Provide an independent low-impedance earth electrode verifying Neutral-to-Earth voltage strictly below 1.0 V AC under load.',
        captionAr:
          'يُمنع تماماً عكس ترتيب الأطوار أثناء التحويل بين الشبكة والمولد لأن ذلك يسبب فصل الحماية وإجهاد دوائر التقويم. وفّر قضيب تأريض مستقل بمقاومة منخفضة وتأكد أن الجهد بين المحايد والأرض أقل من 1.0 فولت تحت الحمل.',
        specs: [
          { labelEn: 'Phase Sequence', labelAr: 'ترتيب الأطوار', value: 'L1-L2-L3 Fixed', status: 'fault' },
          { labelEn: 'Neutral-to-Earth', labelAr: 'المحايد للأرض', value: '< 1.0 V AC', status: 'pass' },
          { labelEn: 'Transfer Switch', labelAr: 'مفتاح التحويل', value: 'Delay ≥ 3 min', status: 'warn' },
          { labelEn: 'Earthing Wire', labelAr: 'سلك التأريض', value: 'Dedicated Bond', status: 'pass' },
        ],
      },
      {
        id: 'ch-gen-3',
        startSec: 32,
        endSec: 48,
        sceneKey: 'gen-elcb-protection',
        titleEn: '3. Inverter-Compatible ELCB / RCCB Sizing (100–300 mA)',
        titleAr: '3. اختيار قاطع التسريب الأرضي المتوافق مع العواكس ELCB (100–300 مللي أمبير)',
        captionEn:
          'VRV inverter drives generate natural high-frequency leakage currents. Install an inverter-compatible (high-frequency resistant) Earth Leakage Circuit Breaker rated 100–300 mA on outdoor units—standard 30 mA residential RCDs cause nuisance tripping on multi-module VRV systems.',
        captionAr:
          'تولّد محركات العاكس في أنظمة VRV تيارات تسريب عالية التردد بشكل طبيعي. ركّب قاطع تسريب أرضي ELCB مخصص للعواكس بحساسية 100–300 مللي أمبير للوحدات الخارجية، لأن القواطع المنزلية 30 مللي أمبير تسبب فصلاً كاذباً متكرراً.',
        specs: [
          { labelEn: 'ODU ELCB Rating', labelAr: 'حساسية قاطع ODU', value: '100–300 mA', status: 'pass' },
          { labelEn: 'Breaker Type', labelAr: 'نوع القاطع', value: 'Inverter-Rated', status: 'warn' },
          { labelEn: 'Standard 30mA', labelAr: 'القاطع العادي 30mA', value: 'Nuisance Trip', status: 'fault' },
          { labelEn: 'Main Isolator', labelAr: 'القاطع الرئيسي', value: 'Lockable LOTO', status: 'nominal' },
        ],
      },
      {
        id: 'ch-gen-4',
        startSec: 48,
        endSec: 64,
        sceneKey: 'gen-megger-test',
        titleEn: '4. 500V DC Megger Insulation Resistance Test (≥ 2 MΩ)',
        titleAr: '4. اختبار مقاومة العزل بجهاز الميجر 500 فولت مستمر (≥ 2 ميجا أوم)',
        captionEn:
          'Before first energization, test power cables and compressor motor windings using a 500V DC Megger—minimum acceptable insulation resistance is 2 MΩ (≥ 10 MΩ preferred on new installs). CRITICAL: disconnect or isolate inverter PCBs and control wiring (F1/F2, P1/P2) before applying 500V DC to prevent instant board destruction.',
        captionAr:
          'قبل التغذية الكهربائية الأولى افحص كوابل القدرة وملفات الضواغط بجهاز ميجر 500 فولت مستمر بحيث لا تقل مقاومة العزل عن 2 ميجا أوم. تحذير حرج: افصل لوحات العاكس وخطوط الإشارة F1/F2 وP1/P2 تماماً قبل تطبيق 500 فولت لمنع تلف اللوحات فوراً.',
        specs: [
          { labelEn: 'Test Voltage', labelAr: 'جهد الاختبار', value: '500 V DC Max', status: 'warn' },
          { labelEn: 'Pass Threshold', labelAr: 'الحد الأدنى للقبول', value: '≥ 2.0 MΩ', status: 'pass' },
          { labelEn: 'PCB Safety Rule', labelAr: 'حماية اللوحات', value: 'Never Megger PCB', status: 'fault' },
          { labelEn: 'Signal Bus', labelAr: 'أسلاك الإشارة', value: 'Disconnect First', status: 'warn' },
        ],
      },
      {
        id: 'ch-gen-5',
        startSec: 64,
        endSec: 80,
        sceneKey: 'gen-daily-log-warranty',
        titleEn: '5. Daily Generator Power Logs & Daikin Warranty Compliance',
        titleAr: '5. سجلات المولد اليومية والالتزام بشروط ضمان دايكن',
        captionEn:
          'When running VRV systems on temporary or standby generators, maintain daily logs recording L1–L2–L3 voltages, frequency, load percentage, and oil/fuel service dates. Unstable generator voltage spikes, high harmonics, or missing ELCB protection void inverter PCB and compressor warranty coverage.',
        captionAr:
          'عند تشغيل أنظمة VRV على مولدات مؤقتة أو احتياطية يجب حفظ سجل يومي لقراءات جهود الأطوار والتردد ونسبة الحمل ومواعيد صيانة المولد. تذبذب جهد المولد أو التوافقيات العالية أو غياب قاطع ELCB يؤدي إلى إلغاء ضمان اللوحات والضواغط.',
        specs: [
          { labelEn: 'Daily Log Sheet', labelAr: 'السجل اليومي', value: 'V / Hz / Amps', status: 'pass' },
          { labelEn: 'Gen Sizing Margin', labelAr: 'هامش قدرة المولد', value: '≥ 1.5× VRV Load', status: 'nominal' },
          { labelEn: 'THD Harmonics', labelAr: 'التشوه التوافقي', value: '< 5% Target', status: 'warn' },
          { labelEn: 'Warranty Rule', labelAr: 'شرط الضمان', value: 'Log Mandatory', status: 'pass' },
        ],
      },
    ],
  },
};

export const INTERACTIVE_LESSONS_LIST: InteractiveTrainingLesson[] = Object.values(
  INTERACTIVE_TRAINING_LESSONS
);

export function getInteractiveLesson(id?: string | null): InteractiveTrainingLesson | null {
  if (!id) return null;
  return (INTERACTIVE_TRAINING_LESSONS as Record<string, InteractiveTrainingLesson>)[id] || null;
}
