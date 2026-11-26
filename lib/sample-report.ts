import { runReportAgent } from "@/agents/ReportAgent";
import type { AuditEntry, ClarifyingQuestion, EdgeCase, Finding, Improvement, MissingRequirement, Report, ReportLanguage, Requirement } from "@/types";

/*
 * Example reports for the sample specifications in public/samples/ (English and Russian).
 * Each item is written once with both languages side by side; Russian quotes come
 * from the Russian sample document. The reports are assembled by the same
 * deterministic ReportAgent as live checks, so their scores follow the real formula.
 */

type Text = { en: string; ru: string };
const tx = (en: string, ru: string): Text => ({ en, ru });

interface SampleRequirement {
  n: number;
  ref: Text;
  section: string;
  type: Requirement["type"];
  priority: Requirement["priority"];
  text: Text;
  dependsOn?: string[];
  criteria?: Text[];
}

const REQUIREMENTS: SampleRequirement[] = [
  { n: 1, ref: tx("FR-1", "ФТ-1"), section: "2", type: "functional", priority: "must",
    text: tx("The customer shall be able to set a monthly spending limit in the mobile app.", "Клиент должен иметь возможность установить месячный лимит расходов в мобильном приложении."),
    criteria: [tx("The limit is saved.", "Лимит сохраняется.")] },
  { n: 2, ref: tx("FR-2", "ФТ-2"), section: "2", type: "business_rule", priority: "unspecified", dependsOn: ["REQ-001"],
    text: tx("The default limit is 50,000 KZT.", "Лимит по умолчанию составляет 50 000 KZT.") },
  { n: 3, ref: tx("FR-3", "ФТ-3"), section: "2", type: "functional", priority: "should",
    text: tx("The system should quickly send a push notification when the customer reaches the limit.", "Система должна быстро отправлять push-уведомление, когда клиент достигает лимита.") },
  { n: 4, ref: tx("FR-4", "ФТ-4"), section: "2", type: "functional", priority: "unspecified",
    text: tx("A warning notification is sent when 90% of the limit has been spent.", "Предупреждение отправляется при расходовании 90% лимита.") },
  { n: 5, ref: tx("FR-5", "ФТ-5"), section: "2", type: "functional", priority: "must", dependsOn: ["REQ-003", "REQ-004"],
    text: tx("The notification shall contain the purchase amount, the remaining limit and the current account balance.", "Уведомление должно содержать сумму покупки, остаток лимита и текущий баланс счёта.") },
  { n: 6, ref: tx("FR-6", "ФТ-6"), section: "2", type: "business_rule", priority: "unspecified",
    text: tx("Spending is counted across all of the customer's cards.", "Расходы учитываются по всем картам клиента.") },
  { n: 7, ref: tx("FR-7", "ФТ-7"), section: "2", type: "business_rule", priority: "unspecified",
    text: tx("The limit resets at the beginning of every month.", "Лимит обнуляется в начале каждого месяца.") },
  { n: 8, ref: tx("FR-8", "ФТ-8"), section: "2", type: "business_rule", priority: "could", dependsOn: ["REQ-001"],
    text: tx("The customer can change the limit no more than once per day.", "Клиент может изменять лимит не чаще одного раза в день.") },
  { n: 9, ref: tx("FR-9", "ФТ-9"), section: "2", type: "functional", priority: "must", dependsOn: ["REQ-003"],
    text: tx("If a notification is not delivered, the system shall retry sending it.", "Если уведомление не доставлено, система должна повторить отправку.") },
  { n: 10, ref: tx("FR-10", "ФТ-10"), section: "2", type: "functional", priority: "could",
    text: tx("The customer can turn notifications off.", "Клиент может отключить уведомления.") },
  { n: 11, ref: tx("FR-11", "ФТ-11"), section: "2", type: "ui", priority: "must",
    text: tx("The limit settings screen must be user-friendly and intuitive.", "Экран настройки лимита должен быть удобным и интуитивно понятным.") },
  { n: 12, ref: tx("FR-12", "ФТ-12"), section: "2", type: "data", priority: "could", dependsOn: ["REQ-001"],
    text: tx("The customer can set a limit from 1,000 to 10,000,000 KZT.", "Клиент может установить лимит от 1 000 до 10 000 000 KZT.") },
  { n: 13, ref: tx("FR-13", "ФТ-13"), section: "2", type: "functional", priority: "must",
    text: tx("The customer must be able to set a monthly spending limit in the mobile application.", "Клиент должен иметь возможность задать месячный лимит расходов в мобильном приложении.") },
  { n: 14, ref: tx("NFR-1", "НФТ-1"), section: "3", type: "performance", priority: "must",
    text: tx("The system shall handle high load.", "Система должна выдерживать высокую нагрузку.") },
  { n: 15, ref: tx("NFR-2", "НФТ-2"), section: "3", type: "performance", priority: "must", dependsOn: ["REQ-003"],
    text: tx("A notification shall be sent within 5 seconds.", "Уведомление должно отправляться в течение 5 секунд.") },
  { n: 16, ref: tx("NFR-3", "НФТ-3"), section: "3", type: "security", priority: "must",
    text: tx("Customer data must be protected.", "Данные клиента должны быть защищены.") },
  { n: 17, ref: tx("NFR-4", "НФТ-4"), section: "3", type: "non_functional", priority: "must",
    text: tx("Service availability shall be 99%.", "Доступность сервиса должна составлять 99%.") },
  { n: 18, ref: tx("API-1", "API-1"), section: "4", type: "api", priority: "unspecified", dependsOn: ["REQ-001"],
    text: tx(
      'POST /api/v1/limits sets the limit. Request body: { "customerId": "...", "amount": 50000 }. Returns 200 { "status": "ok" }. On error the endpoint also returns 200 with an error field.',
      'POST /api/v1/limits устанавливает лимит. Тело запроса: { "customerId": "...", "amount": 50000 }. Возвращает 200 { "status": "ok" }. При ошибке эндпоинт также возвращает 200 с полем error.',
    ) },
  { n: 19, ref: tx("API-2", "API-2"), section: "4", type: "api", priority: "unspecified",
    text: tx("GET /api/v1/limits/{customerId} returns the limit, the amount spent and the account balance.", "GET /api/v1/limits/{customerId} возвращает лимит, сумму расходов и баланс счёта.") },
  { n: 20, ref: tx("API-3", "API-3"), section: "4", type: "api", priority: "unspecified", dependsOn: ["REQ-003"],
    text: tx("POST /api/v1/notifications/send sends a notification to the customer. Used by the processing service.", "POST /api/v1/notifications/send отправляет уведомление клиенту. Используется сервисом процессинга.") },
  { n: 21, ref: tx("UI-1", "UI-1"), section: "5", type: "ui", priority: "unspecified",
    text: tx("The home screen shows a progress bar of limit usage. A warning is shown at 80% of the limit.", "На главном экране отображается индикатор использования лимита. Предупреждение показывается при 80% лимита.") },
  { n: 22, ref: tx("UI-2", "UI-2"), section: "5", type: "ui", priority: "unspecified", dependsOn: ["REQ-021"],
    text: tx("The progress bar turns red when the limit is exceeded.", "Индикатор становится красным при превышении лимита.") },
  { n: 23, ref: tx("LOG-1", "LOG-1"), section: "6", type: "constraint", priority: "unspecified",
    text: tx(
      "All API requests are logged in full, including the request body and the card number, to simplify troubleshooting.",
      "Все запросы к API логируются полностью, включая тело запроса и номер карты, чтобы упростить разбор инцидентов.",
    ) },
];

interface SampleFinding {
  category: Finding["category"];
  severity: Finding["severity"];
  requirementIds: string[];
  confidence: number;
  standardRef: Text;
  endpoint?: string;
  title: Text;
  description: Text;
  evidence: Text;
  rationale: Text;
  recommendation: Text;
}

const std = (ref: string) => tx(ref, ref);

const VALIDATION: SampleFinding[] = [
  {
    category: "consistency", severity: "critical", requirementIds: ["REQ-004", "REQ-021"], confidence: 0.95,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.6 Consistent (set)"),
    title: tx("Warning threshold is 90% in one place and 80% in another", "Порог предупреждения указан как 90% в одном месте и 80% в другом"),
    description: tx(
      "FR-4 sends the warning at 90% of the limit while UI-1 shows it at 80%. Developers and testers will implement different thresholds, and customers will see a warning in the app without a matching notification.",
      "ФТ-4 отправляет предупреждение при 90% лимита, а UI-1 показывает его при 80%. Разработчики и тестировщики реализуют разные пороги, и клиент увидит предупреждение в приложении без соответствующего уведомления.",
    ),
    evidence: tx("A warning notification is sent when 90% of the limit has been spent.", "Предупреждение отправляется при расходовании 90% лимита."),
    rationale: tx(
      "Both requirements define the same event (the warning threshold) with different numbers. Only one can be correct.",
      "Оба требования описывают одно и то же событие (порог предупреждения) с разными числами. Верным может быть только одно.",
    ),
    recommendation: tx("Agree one threshold with the product owner and use it for both the notification and the progress bar.", "Согласуйте с владельцем продукта один порог и используйте его и для уведомления, и для индикатора."),
  },
  {
    category: "ambiguity", severity: "high", requirementIds: ["REQ-003", "REQ-015"], confidence: 0.92,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.7 Requirement language"),
    title: tx("“Quickly” can't be measured", "«Быстро» нельзя измерить"),
    description: tx(
      "FR-3 uses “quickly”. NFR-2 gives 5 seconds but doesn't say it applies to FR-3, so the speed target is unclear.",
      "В ФТ-3 используется слово «быстро». НФТ-2 указывает 5 секунд, но не говорит, что это относится к ФТ-3, поэтому требуемая скорость неясна.",
    ),
    evidence: tx("The system should quickly send a push notification when the customer reaches the limit.", "Система должна быстро отправлять push-уведомление, когда клиент достигает лимита."),
    rationale: tx(
      "“Quickly” is one of the vague words the standard says to avoid, and “should” makes the main feature sound optional.",
      "«Быстро» входит в список размытых слов, которых стандарт советует избегать: у тестировщика нет числа для проверки.",
    ),
    recommendation: tx("Replace “quickly” with the 5-second target and use “shall”.", "Замените «быстро» на конкретное значение — 5 секунд — со ссылкой на НФТ-2."),
  },
  {
    category: "completeness", severity: "high", requirementIds: ["REQ-003", "REQ-022"], confidence: 0.88,
    standardRef: std("IEEE 830-1998 §4.3.3 Complete"),
    title: tx("What happens after the limit is exceeded is not described", "Не описано, что происходит после превышения лимита"),
    description: tx(
      "The document says what happens when the limit is reached, but not whether further purchases are allowed, declined, or trigger more notifications.",
      "Документ описывает момент достижения лимита, но не говорит, разрешены ли дальнейшие покупки, отклоняются ли они и отправляются ли новые уведомления.",
    ),
    evidence: tx("The progress bar turns red when the limit is exceeded.", "Индикатор становится красным при превышении лимита."),
    rationale: tx(
      "A complete specification describes the response to every input. Purchases after the limit is reached are a normal situation with no defined behaviour.",
      "Полная спецификация описывает реакцию на любые входные данные. Покупки после достижения лимита — обычная ситуация, но поведение для неё не задано.",
    ),
    recommendation: tx("State whether the limit blocks payments and which notification, if any, is sent for each purchase over the limit.", "Укажите, блокирует ли лимит платежи и какое уведомление отправляется при каждой покупке сверх лимита."),
  },
  {
    category: "ambiguity", severity: "high", requirementIds: ["REQ-006"], confidence: 0.9,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Unambiguous"),
    title: tx("It's not clear which payments count as spending", "Неясно, какие операции считаются расходами"),
    description: tx(
      "FR-6 doesn't say whether cash withdrawals, transfers, refunds, pending payments or foreign-currency purchases count toward the limit.",
      "ФТ-6 не уточняет, учитываются ли снятие наличных, переводы, возвраты, незавершённые операции и покупки в иностранной валюте.",
    ),
    evidence: tx("Spending is counted across all of the customer's cards.", "Расходы учитываются по всем картам клиента."),
    rationale: tx("“Spending” can be read in several ways, and each gives a different total.", "Слово «расходы» можно понять по-разному, и каждый вариант даёт другую сумму."),
    recommendation: tx("List which payment types count, how refunds work, and how other currencies are converted.", "Перечислите учитываемые типы операций, правила возвратов и пересчёта других валют."),
  },
  {
    category: "testability", severity: "high", requirementIds: ["REQ-011"], confidence: 0.95,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Verifiable"),
    title: tx("“User-friendly” can't be tested", "«Удобный» нельзя проверить"),
    description: tx("“User-friendly and intuitive” has no pass/fail criterion, so no test can prove it.", "«Удобный и интуитивно понятный» не имеет критерия успеха, поэтому никакой тест не может это подтвердить."),
    evidence: tx("The limit settings screen must be user-friendly and intuitive.", "Экран настройки лимита должен быть удобным и интуитивно понятным."),
    rationale: tx("Opinions such as “user-friendly” have no measurement method.", "Оценочные слова вроде «удобный» нельзя измерить."),
    recommendation: tx("Set a measurable target, such as the number of taps and the share of users who succeed without help.", "Задайте измеримую цель: число нажатий и долю пользователей, справившихся без помощи."),
  },
  {
    category: "testability", severity: "high", requirementIds: ["REQ-014"], confidence: 0.94,
    standardRef: std("IEEE 830-1998 §4.3.6 Verifiable"),
    title: tx("“High load” has no number", "У «высокой нагрузки» нет числа"),
    description: tx("NFR-1 gives no request rate, number of customers or peak period, so performance can't be tested.", "НФТ-1 не указывает число запросов, клиентов или пиковый период, поэтому производительность нельзя проверить."),
    evidence: tx("The system shall handle high load.", "Система должна выдерживать высокую нагрузку."),
    rationale: tx("Without a number there is no way to check the requirement.", "Без числа требование невозможно проверить."),
    recommendation: tx("State the peak load and the response time to keep under it.", "Укажите пиковую нагрузку и время отклика, которое нужно выдерживать."),
  },
  {
    category: "acceptance_criteria", severity: "medium", requirementIds: ["REQ-001"], confidence: 0.9,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Verifiable"),
    title: tx("Acceptance criteria are missing or too weak", "Критерии приёмки отсутствуют или слишком слабые"),
    description: tx(
      "Only FR-1 has an acceptance criterion, and “the limit is saved” doesn't cover validation or confirmation. All other requirements have none.",
      "Критерий приёмки есть только у ФТ-1, и «лимит сохраняется» не охватывает проверку ввода и подтверждение. У остальных требований критериев нет.",
    ),
    evidence: tx("Acceptance criteria: the limit is saved.", "Критерий приёмки: лимит сохраняется."),
    rationale: tx("Without clear criteria, testers have to guess the expected result.", "Без чётких критериев тестировщикам приходится угадывать ожидаемый результат."),
    recommendation: tx("Add Given / When / Then criteria to every functional requirement.", "Добавьте критерии «Дано / Когда / Тогда» к каждому функциональному требованию."),
  },
  {
    category: "performance", severity: "medium", requirementIds: ["REQ-015"], confidence: 0.84,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Unambiguous"),
    title: tx("It's unclear when the 5 seconds start", "Неясно, от какого момента отсчитываются 5 секунд"),
    description: tx(
      "NFR-2 doesn't say whether 5 seconds is counted from the card payment, its posting or the limit check, or what share of notifications must meet it.",
      "НФТ-2 не говорит, считаются ли 5 секунд от оплаты картой, от проводки или от проверки лимита, и какая доля уведомлений должна уложиться в срок.",
    ),
    evidence: tx("A notification shall be sent within 5 seconds.", "Уведомление должно отправляться в течение 5 секунд."),
    rationale: tx("A time limit needs a start point, an end point and a percentage to be testable.", "Для проверки ограничения по времени нужны начальная и конечная точки и доля случаев."),
    recommendation: tx("Measure from the payment to sending the notification, for 95% of notifications.", "Измеряйте время от платежа до отправки уведомления для 95% уведомлений."),
  },
  {
    category: "completeness", severity: "medium", requirementIds: ["REQ-009"], confidence: 0.86,
    standardRef: std("IEEE 830-1998 §4.3.3 Complete"),
    title: tx("The retry rule for failed notifications is not defined", "Правило повторной отправки уведомлений не задано"),
    description: tx("FR-9 doesn't say how many retries, how often, or whether SMS is used as a backup.", "ФТ-9 не говорит, сколько повторов, с каким интервалом и используется ли SMS как запасной канал."),
    evidence: tx("If a notification is not delivered, the system shall retry sending it.", "Если уведомление не доставлено, система должна повторить отправку."),
    rationale: tx("Without limits, retries can either spam customers or stop silently.", "Без ограничений повторы могут либо засыпать клиента сообщениями, либо незаметно прекратиться."),
    recommendation: tx("Set the number of retries, the interval and the backup channel.", "Задайте число повторов, интервал и запасной канал."),
  },
  {
    category: "edge_case", severity: "medium", requirementIds: ["REQ-007"], confidence: 0.85,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Unambiguous"),
    title: tx("The month boundary and time zone are not defined", "Не заданы граница месяца и часовой пояс"),
    description: tx("FR-7 doesn't say whether “month” is a calendar month or a statement period, or which time zone applies.", "ФТ-7 не уточняет, имеется в виду календарный месяц или расчётный период, и какой часовой пояс используется."),
    evidence: tx("The limit resets at the beginning of every month.", "Лимит обнуляется в начале каждого месяца."),
    rationale: tx("A payment late on the last day of the month can fall into either month.", "Платёж поздно вечером в последний день месяца может попасть в любой из двух месяцев."),
    recommendation: tx("Use the calendar month in Asia/Almaty time, based on the payment time.", "Используйте календарный месяц по времени Asia/Almaty, по моменту платежа."),
  },
  {
    category: "ambiguity", severity: "medium", requirementIds: ["REQ-008"], confidence: 0.78,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Unambiguous"),
    title: tx("“Once per day” is unclear", "«Раз в день» — неясно"),
    description: tx("FR-8 doesn't say whether a day is a calendar day or 24 hours, or whether the first setup counts as a change.", "ФТ-8 не уточняет, имеется в виду календарный день или 24 часа и считается ли первая установка изменением."),
    evidence: tx("The customer can change the limit no more than once per day.", "Клиент может изменять лимит не чаще одного раза в день."),
    rationale: tx("Two developers would reset the change counter at different times.", "Два разработчика сбросят счётчик изменений в разное время."),
    recommendation: tx("Define the day boundary and what counts as a change.", "Определите границу дня и то, что считается изменением."),
  },
  {
    category: "data_validation", severity: "medium", requirementIds: ["REQ-012", "REQ-018"], confidence: 0.75,
    standardRef: std("IEEE 830-1998 §4.3.3 Complete"),
    title: tx("Checks for the limit amount are incomplete", "Проверка суммы лимита неполная"),
    description: tx("The range is given, but not whether decimals are allowed, what the customer sees for a wrong value, or whether only KZT is accepted.", "Диапазон указан, но не сказано, допускаются ли дробные суммы, что видит клиент при неверном значении и принимается ли только KZT."),
    evidence: tx("The customer can set a limit from 1,000 to 10,000,000 KZT.", "Клиент может установить лимит от 1 000 до 10 000 000 KZT."),
    rationale: tx("Wrong input is input too; what happens to it must be described.", "Неверный ввод — тоже ввод, и реакция на него должна быть описана."),
    recommendation: tx("Specify whole KZT only, the error messages and the API response for out-of-range values.", "Укажите: только целые KZT, тексты ошибок и ответ API для значений вне диапазона."),
  },
  {
    category: "duplicate", severity: "low", requirementIds: ["REQ-001", "REQ-013"], confidence: 0.93,
    standardRef: std("IEEE 830-1998 §4.3.7 Modifiable"),
    title: tx("FR-1 and FR-13 say the same thing", "ФТ-1 и ФТ-13 говорят одно и то же"),
    description: tx("Both require that the customer can set a monthly spending limit in the app.", "Оба требуют, чтобы клиент мог задать месячный лимит в приложении."),
    evidence: tx("The customer must be able to set a monthly spending limit in the mobile application.", "Клиент должен иметь возможность задать месячный лимит расходов в мобильном приложении."),
    rationale: tx("Duplicates drift apart when only one copy is edited.", "Дубликаты расходятся, когда правят только одну копию."),
    recommendation: tx("Delete FR-13 and keep FR-1.", "Удалите ФТ-13 и оставьте ФТ-1."),
  },
  {
    category: "traceability", severity: "low", requirementIds: [], confidence: 0.8,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.8 Requirement attributes"),
    title: tx("Requirements have no priority, reason or source", "У требований нет приоритета, обоснования и источника"),
    description: tx("Most requirements have no priority, and none says why it exists or who asked for it.", "У большинства требований нет приоритета, и ни одно не объясняет, зачем оно нужно и кто его запросил."),
    evidence: tx("FR-2. The default limit is 50,000 KZT.", "ФТ-2. Лимит по умолчанию составляет 50 000 KZT."),
    rationale: tx("Without priority and reasons it's hard to plan releases or judge changes.", "Без приоритета и обоснования сложно планировать релизы и оценивать изменения."),
    recommendation: tx("Add priority, reason and source to each requirement.", "Добавьте к каждому требованию приоритет, обоснование и источник."),
  },
];

const API: SampleFinding[] = [
  {
    category: "security", severity: "critical", requirementIds: ["REQ-018", "REQ-019"], confidence: 0.9, endpoint: "POST /api/v1/limits",
    standardRef: std("OWASP API1:2023 Broken Object Level Authorization"),
    title: tx("customerId in the request lets anyone act for another customer", "customerId в запросе позволяет действовать от имени другого клиента"),
    description: tx(
      "Both endpoints take the customer ID from the request. Unless the server checks it against the signed-in user, anyone can read another customer's balance or change their limit.",
      "Оба эндпоинта берут ID клиента из запроса. Если сервер не сверяет его с вошедшим пользователем, любой может узнать чужой баланс или изменить чужой лимит.",
    ),
    evidence: tx('Request body: { "customerId": "...", "amount": 50000 }', 'Тело запроса: { "customerId": "...", "amount": 50000 }'),
    rationale: tx("IDs sent by the app with no ownership check are the most common API vulnerability.", "ID, передаваемые приложением без проверки владельца, — самая частая уязвимость API."),
    recommendation: tx("Take the customer from the access token and remove customerId from the request.", "Определяйте клиента по токену доступа и уберите customerId из запроса."),
  },
  {
    category: "security", severity: "critical", requirementIds: ["REQ-020"], confidence: 0.88, endpoint: "POST /api/v1/notifications/send",
    standardRef: std("OWASP API5:2023 Broken Function Level Authorization"),
    title: tx("The internal notification endpoint has no protection", "Внутренний эндпоинт уведомлений ничем не защищён"),
    description: tx(
      "This endpoint is meant for the processing service, but nothing restricts who can call it. An attacker could send fake bank notifications to customers.",
      "Эндпоинт предназначен для сервиса процессинга, но ничто не ограничивает, кто может его вызвать. Злоумышленник сможет рассылать клиентам поддельные уведомления банка.",
    ),
    evidence: tx(
      "POST /api/v1/notifications/send sends a notification to the customer. Used by the processing service.",
      "POST /api/v1/notifications/send отправляет уведомление клиенту. Используется сервисом процессинга.",
    ),
    rationale: tx("Internal operations without service authentication can be called by anyone who finds them.", "Внутренние операции без аутентификации сервиса может вызвать любой, кто их найдёт."),
    recommendation: tx("Require a service token or mutual TLS and keep the endpoint off the public gateway.", "Требуйте сервисный токен или взаимный TLS и уберите эндпоинт из публичного шлюза."),
  },
  {
    category: "api_contract", severity: "high", requirementIds: ["REQ-018"], confidence: 0.97, endpoint: "POST /api/v1/limits",
    standardRef: std("RFC 9110 §15 Status Codes"),
    title: tx("Errors are returned with code 200", "Ошибки возвращаются с кодом 200"),
    description: tx("Returning 200 with an error field hides failures from the app, monitoring and retries.", "Код 200 с полем ошибки скрывает сбои от приложения, мониторинга и механизма повторов."),
    evidence: tx("On error the endpoint also returns 200 with an error field.", "При ошибке эндпоинт также возвращает 200 с полем error."),
    rationale: tx("Code 200 means success; apps and gateways rely on response codes.", "Код 200 означает успех; приложения и шлюзы опираются на коды ответов."),
    recommendation: tx("Return 400 for wrong input, 401/403 for access problems, 409 when the daily change limit is used, and 5xx for server errors.", "Возвращайте 400 при неверном вводе, 401/403 при проблемах доступа, 409 при исчерпанном лимите изменений и 5xx при ошибках сервера."),
  },
  {
    category: "api_contract", severity: "medium", requirementIds: ["REQ-019"], confidence: 0.87, endpoint: "GET /api/v1/limits/{customerId}",
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Complete"),
    title: tx("Response formats are not described", "Форматы ответов не описаны"),
    description: tx("The response is described in words only: no field names, types or currency, and no error format.", "Ответ описан только словами: нет названий полей, типов, валюты и формата ошибок."),
    evidence: tx("returns the limit, the amount spent and the account balance", "возвращает лимит, сумму расходов и баланс счёта"),
    rationale: tx("App and server teams can't build against a contract with no format.", "Команды приложения и сервера не могут работать по контракту без формата."),
    recommendation: tx("Publish an OpenAPI description with field names, types and the error object.", "Опубликуйте описание OpenAPI с полями, типами и объектом ошибки."),
  },
  {
    category: "api_contract", severity: "medium", requirementIds: ["REQ-020", "REQ-009"], confidence: 0.8, endpoint: "POST /api/v1/notifications/send",
    standardRef: std("RFC 9110 §9.2.2 Idempotent Methods"),
    title: tx("A retry can send the same notification twice", "Повтор может отправить одно уведомление дважды"),
    description: tx("FR-9 requires retries, but nothing stops a retry after a timeout from sending a duplicate.", "ФТ-9 требует повторов, но ничто не мешает повтору после тайм-аута отправить дубликат."),
    evidence: tx("If a notification is not delivered, the system shall retry sending it.", "Если уведомление не доставлено, система должна повторить отправку."),
    rationale: tx("Repeated POST requests need a unique key to avoid duplicate effects.", "Повторным POST-запросам нужен уникальный ключ, чтобы не было двойного эффекта."),
    recommendation: tx("Add an Idempotency-Key header, for example the payment ID plus the threshold.", "Добавьте заголовок Idempotency-Key, например ID платежа плюс порог."),
  },
  {
    category: "performance", severity: "low", requirementIds: ["REQ-018"], confidence: 0.7, endpoint: "POST /api/v1/limits",
    standardRef: std("OWASP API4:2023 Unrestricted Resource Consumption"),
    title: tx("No request limits on changing the limit", "Нет ограничения частоты запросов на изменение лимита"),
    description: tx("Apart from the once-per-day rule, the API sets no request limits, which leaves it open to abuse by bots.", "Кроме правила «раз в день», API не ограничивает частоту запросов, что открывает его для злоупотреблений ботами."),
    evidence: tx("POST /api/v1/limits sets the limit.", "POST /api/v1/limits устанавливает лимит."),
    rationale: tx("Every public endpoint needs a request limit.", "Каждому публичному эндпоинту нужно ограничение частоты запросов."),
    recommendation: tx("Set per-customer and per-IP request limits and the 429 response.", "Задайте ограничения на клиента и на IP-адрес и ответ 429."),
  },
];

const RISK: SampleFinding[] = [
  {
    category: "security", severity: "critical", requirementIds: ["REQ-023"], confidence: 0.96,
    standardRef: std("PCI DSS v4.0 Requirement 3: protect stored account data"),
    title: tx("Full card numbers are written to logs", "Полные номера карт записываются в логи"),
    description: tx(
      "LOG-1 asks to log full card numbers and request bodies. Card industry rules forbid storing full card numbers unprotected, and logs are widely accessible.",
      "LOG-1 требует записывать в лог полные номера карт и тела запросов. Правила платёжной индустрии запрещают хранить полные номера карт без защиты, а логи доступны многим.",
    ),
    evidence: tx("including the request body and the card number", "включая тело запроса и номер карты"),
    rationale: tx("The requirement explicitly asks for sensitive card data in plain-text logs.", "Требование прямо предписывает хранить чувствительные данные карт в открытом виде в логах."),
    recommendation: tx("Mask card numbers (at most the first 6 and last 4 digits) and don't log request bodies.", "Маскируйте номера карт (не больше первых 6 и последних 4 цифр) и не пишите в лог тела запросов."),
  },
  {
    category: "privacy", severity: "high", requirementIds: ["REQ-005"], confidence: 0.85,
    standardRef: std("Personal data protection law (Law of the Republic of Kazakhstan “On Personal Data and Their Protection”)"),
    title: tx("The account balance is shown in push notifications", "Баланс счёта показывается в push-уведомлениях"),
    description: tx("Push notifications appear on the lock screen, so anyone near the phone can see the balance.", "Push-уведомления видны на заблокированном экране, поэтому баланс может увидеть любой рядом с телефоном."),
    evidence: tx("the remaining limit and the current account balance", "остаток лимита и текущий баланс счёта"),
    rationale: tx("The notification shows more financial data than it needs.", "Уведомление показывает больше финансовых данных, чем нужно."),
    recommendation: tx("Remove the balance from the notification, or let customers choose to show it.", "Уберите баланс из уведомления или позвольте клиенту включать его по желанию."),
  },
  {
    category: "security", severity: "high", requirementIds: ["REQ-016"], confidence: 0.9,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Verifiable"),
    title: tx("“Data must be protected” can't be built as written", "«Данные должны быть защищены» — нельзя реализовать в таком виде"),
    description: tx("NFR-3 names no protection measures: no encryption, sign-in method or access rules.", "НФТ-3 не называет ни одной меры защиты: ни шифрования, ни способа входа, ни правил доступа."),
    evidence: tx("Customer data must be protected.", "Данные клиента должны быть защищены."),
    rationale: tx("A security requirement without measures can't be designed or tested.", "Требование безопасности без конкретных мер нельзя ни спроектировать, ни проверить."),
    recommendation: tx("List the measures: TLS 1.2+, encryption of stored data, token sign-in and role-based access.", "Перечислите меры: TLS 1.2+, шифрование хранимых данных, вход по токену и доступ по ролям."),
  },
  {
    category: "performance", severity: "medium", requirementIds: ["REQ-017"], confidence: 0.8,
    standardRef: std("ISO/IEC/IEEE 29148:2018 §5.2.5 Correct"),
    title: tx("99% availability allows about 7 hours of downtime a month", "Доступность 99% допускает около 7 часов простоя в месяц"),
    description: tx("1% of a 30-day month is 7.2 hours, which is low for a banking service. How it's measured is not stated.", "1% от 30-дневного месяца — 7,2 часа, что мало для банковского сервиса. Способ измерения не указан."),
    evidence: tx("Service availability shall be 99%.", "Доступность сервиса должна составлять 99%."),
    rationale: tx("The target is measurable but probably lower than the bank expects.", "Цель измерима, но, вероятно, ниже ожиданий банка."),
    recommendation: tx("Confirm the target (for example 99.9% per month) and how it's measured.", "Подтвердите цель (например, 99,9% в месяц) и способ измерения."),
  },
  {
    category: "scalability", severity: "medium", requirementIds: ["REQ-014", "REQ-015"], confidence: 0.7,
    standardRef: std("OWASP API4:2023 Unrestricted Resource Consumption"),
    title: tx("Peak-time load is not considered", "Пиковая нагрузка не учтена"),
    description: tx("Salary days and holidays create spending peaks. Nothing describes how notifications are queued, so the 5-second target may fail exactly then.", "В дни зарплаты и праздники расходы резко растут. Не описано, как уведомления ставятся в очередь, поэтому 5 секунд могут не выдерживаться именно тогда."),
    evidence: tx("The system shall handle high load.", "Система должна выдерживать высокую нагрузку."),
    rationale: tx("Every payment triggers a limit check, so load follows card traffic peaks.", "Каждый платёж запускает проверку лимита, поэтому нагрузка повторяет пики по картам."),
    recommendation: tx("State peak payment rates and require a queue with monitoring of notification delay.", "Укажите пиковое число платежей и требуйте очередь с контролем задержки уведомлений."),
  },
  {
    category: "compliance", severity: "medium", requirementIds: ["REQ-010"], confidence: 0.62,
    standardRef: std("Banking regulation: mandatory transaction notifications (may apply)"),
    title: tx("Turning notifications off may conflict with required alerts", "Отключение уведомлений может противоречить обязательным оповещениям"),
    description: tx("If the bank must notify customers about card payments, FR-10 should turn off only limit notifications.", "Если банк обязан уведомлять клиентов об операциях по карте, ФТ-10 должен отключать только уведомления о лимите."),
    evidence: tx("The customer can turn notifications off.", "Клиент может отключить уведомления."),
    rationale: tx("“Notifications” may include alerts the bank is required to send.", "Под «уведомлениями» могут пониматься оповещения, которые банк обязан отправлять."),
    recommendation: tx("Limit FR-10 to spending-limit notifications and check with the compliance team.", "Ограничьте ФТ-10 уведомлениями о лимите и согласуйте с комплаенсом."),
  },
];

interface SampleMissing {
  category: MissingRequirement["category"];
  severity: MissingRequirement["severity"];
  standardRef: string;
  title: Text;
  description: Text;
  suggested: Text;
}

const MISSING: SampleMissing[] = [
  {
    category: "completeness", severity: "high", standardRef: "IEEE 830-1998 §4.3.3 Complete",
    title: tx("What happens when the limit is exceeded", "Что происходит при превышении лимита"),
    description: tx("No requirement says whether purchases over the limit are allowed and what the customer is told.", "Ни одно требование не говорит, разрешены ли покупки сверх лимита и что сообщается клиенту."),
    suggested: tx(
      "When a payment makes counted spending exceed the monthly limit, the system shall approve the payment [ASSUMPTION: the limit is informational] and send an “over limit” push notification for each such payment.",
      "Когда платёж приводит к превышению месячного лимита, система должна провести платёж [ДОПУЩЕНИЕ: лимит носит информационный характер] и отправить push-уведомление «Лимит превышен» по каждому такому платежу.",
    ),
  },
  {
    category: "security", severity: "high", standardRef: "OWASP API2:2023 Broken Authentication",
    title: tx("Sign-in and access rules for every endpoint", "Аутентификация и правила доступа для каждого эндпоинта"),
    description: tx("The API section never says how callers prove who they are or which customer they may act for.", "Раздел API не говорит, как вызывающая сторона подтверждает личность и от имени какого клиента может действовать."),
    suggested: tx(
      "Every customer-facing endpoint shall require a valid OAuth 2.0 access token and shall act only for the customer identified by that token.",
      "Каждый клиентский эндпоинт должен требовать действительный токен доступа OAuth 2.0 и действовать только от имени клиента, указанного в этом токене.",
    ),
  },
  {
    category: "security", severity: "medium", standardRef: "ISO/IEC/IEEE 29148:2018 §5.2.6 Complete (set)",
    title: tx("A history of limit changes", "История изменений лимита"),
    description: tx("Limit changes affect what customers are told about their money and should be traceable.", "Изменения лимита влияют на то, что клиент узнаёт о своих деньгах, и должны отслеживаться."),
    suggested: tx(
      "The system shall record every limit change with the customer ID, old value, new value, channel and time, and keep the record for [ASSUMPTION: 5 years].",
      "Система должна записывать каждое изменение лимита с ID клиента, старым и новым значением, каналом и временем и хранить запись [ДОПУЩЕНИЕ: 5 лет].",
    ),
  },
  {
    category: "completeness", severity: "medium", standardRef: "IEEE 830-1998 §4.3.3 Complete",
    title: tx("Payments in other currencies", "Платежи в других валютах"),
    description: tx("Customers may pay in other currencies; the conversion for the limit is not defined.", "Клиенты могут платить в других валютах; пересчёт для лимита не определён."),
    suggested: tx(
      "The system shall convert foreign-currency payments to KZT at the bank's rate on the payment date before counting them toward the limit.",
      "Система должна пересчитывать платежи в иностранной валюте в KZT по курсу банка на дату платежа перед учётом в лимите.",
    ),
  },
  {
    category: "completeness", severity: "medium", standardRef: "IEEE 830-1998 §4.3.3 Complete",
    title: tx("Refunds and cancellations", "Возвраты и отмены"),
    description: tx("Nothing says whether a refund lowers counted spending.", "Не сказано, уменьшает ли возврат учтённые расходы."),
    suggested: tx(
      "The system shall subtract refunds and cancellations of payments counted in the current month from counted spending.",
      "Система должна вычитать из учтённых расходов возвраты и отмены платежей, учтённых в текущем месяце.",
    ),
  },
  {
    category: "completeness", severity: "low", standardRef: "ISO/IEC/IEEE 29148:2018 §5.2.6 Complete (set)",
    title: tx("Notification language", "Язык уведомлений"),
    description: tx("The language of notifications is not stated, although customers speak different languages.", "Язык уведомлений не указан, хотя клиенты говорят на разных языках."),
    suggested: tx(
      "The system shall send notifications in the language selected in the app (Kazakh, Russian or English).",
      "Система должна отправлять уведомления на языке, выбранном в приложении (казахский, русский или английский).",
    ),
  },
];

const EDGE_CASES: Array<{ severity: EdgeCase["severity"]; requirementIds: string[]; scenario: Text; expected: Text }> = [
  {
    severity: "high", requirementIds: ["REQ-003", "REQ-004"],
    scenario: tx("One purchase moves spending from below 90% straight past 100% of the limit.", "Одна покупка переводит расходы с уровня ниже 90% сразу за 100% лимита."),
    expected: tx("Exactly one “limit reached” notification is sent; the warning is not sent afterwards.", "Отправляется ровно одно уведомление «Лимит достигнут»; предупреждение после него не отправляется."),
  },
  {
    severity: "medium", requirementIds: ["REQ-003"],
    scenario: tx("Spending equals the limit exactly (100.00%).", "Расходы ровно равны лимиту (100,00%)."),
    expected: tx("The limit counts as reached and the notification is sent.", "Лимит считается достигнутым, уведомление отправляется."),
  },
  {
    severity: "medium", requirementIds: ["REQ-006", "REQ-007"],
    scenario: tx("A purchase is made at 23:59 on the last day of the month and posted the next day.", "Покупка совершена в 23:59 в последний день месяца, а проведена на следующий день."),
    expected: tx("It counts toward the month of the purchase, in Asia/Almaty time.", "Она учитывается в месяце покупки по времени Asia/Almaty."),
  },
  {
    severity: "medium", requirementIds: ["REQ-001", "REQ-008"],
    scenario: tx("The customer lowers the limit below what was already spent this month.", "Клиент снижает лимит ниже уже потраченной в этом месяце суммы."),
    expected: tx("The new limit is saved and one “limit reached” notification is sent right away.", "Новый лимит сохраняется, и сразу отправляется одно уведомление «Лимит достигнут»."),
  },
  {
    severity: "medium", requirementIds: ["REQ-006"],
    scenario: tx("Two purchases on different cards happen at the same moment and together cross the threshold.", "Две покупки по разным картам происходят одновременно и вместе превышают порог."),
    expected: tx("Both are counted and exactly one notification is sent for the threshold.", "Учитываются обе, и по порогу отправляется ровно одно уведомление."),
  },
  {
    severity: "low", requirementIds: ["REQ-010"],
    scenario: tx("Notifications are off when the limit is reached and are turned on later the same month.", "Уведомления были отключены в момент достижения лимита и включены позже в том же месяце."),
    expected: tx("Missed notifications are not sent later.", "Пропущенные уведомления задним числом не отправляются."),
  },
];

const IMPROVEMENTS: Array<{ id: number; improved: Text; explanation: Text; criteria: Text[] }> = [
  {
    id: 3,
    improved: tx(
      "When counted spending in the current calendar month reaches or exceeds 100% of the monthly limit, the system shall send one “limit reached” push notification within 5 seconds of the payment (for 95% of notifications).",
      "Когда учтённые расходы за текущий календарный месяц достигают 100% месячного лимита или превышают его, система должна отправить одно push-уведомление «Лимит достигнут» в течение 5 секунд после платежа (для 95% уведомлений).",
    ),
    explanation: tx(
      "Replaces “quickly” with the 5-second target from NFR-2, defines “reaches” as 100% or more, and says it is sent once.",
      "«Быстро» заменено на 5 секунд из НФТ-2, «достигает» определено как 100% и более, указано, что уведомление отправляется один раз.",
    ),
    criteria: [
      tx(
        "Given a limit of 50,000 KZT and 49,000 KZT spent, when a 1,000 KZT purchase is made, then one “limit reached” notification arrives within 5 seconds.",
        "Дано: лимит 50 000 KZT, потрачено 49 000 KZT. Когда совершается покупка на 1 000 KZT, тогда в течение 5 секунд приходит одно уведомление «Лимит достигнут».",
      ),
      tx(
        "Given the notification was already sent this month, when another purchase is made, then no second “limit reached” notification is sent.",
        "Дано: уведомление уже отправлялось в этом месяце. Когда совершается ещё одна покупка, тогда повторное уведомление «Лимит достигнут» не отправляется.",
      ),
    ],
  },
  {
    id: 4,
    improved: tx(
      "When counted spending first reaches [ASSUMPTION: 80%] of the monthly limit in a calendar month, the system shall send one warning push notification and show the warning state on the home-screen progress bar.",
      "Когда учтённые расходы впервые за календарный месяц достигают [ДОПУЩЕНИЕ: 80%] месячного лимита, система должна отправить одно предупреждающее push-уведомление и показать предупреждение на индикаторе главного экрана.",
    ),
    explanation: tx("Removes the 90% / 80% conflict by using one threshold for both the notification and the app screen.", "Устраняет противоречие 90% / 80%: один порог и для уведомления, и для экрана приложения."),
    criteria: [
      tx(
        "Given a limit of 100,000 KZT and 79,000 KZT spent, when a 1,000 KZT purchase is made, then one warning is sent and the progress bar shows the warning state.",
        "Дано: лимит 100 000 KZT, потрачено 79 000 KZT. Когда совершается покупка на 1 000 KZT, тогда отправляется одно предупреждение, и индикатор показывает предупреждение.",
      ),
    ],
  },
  {
    id: 6,
    improved: tx(
      "The system shall count toward the monthly limit all purchases and cash withdrawals made with any of the customer's debit and credit cards, converted to KZT, except transfers between the customer's own accounts [ASSUMPTION: confirm with the product owner].",
      "Система должна учитывать в месячном лимите все покупки и снятия наличных по любым дебетовым и кредитным картам клиента в пересчёте на KZT, кроме переводов между собственными счетами клиента [ДОПУЩЕНИЕ: согласовать с владельцем продукта].",
    ),
    explanation: tx("Says exactly which payments count, the currency, and the main exception.", "Точно определено, какие операции учитываются, в какой валюте и какое основное исключение."),
    criteria: [
      tx(
        "Given two cards, when purchases of 10,000 KZT and 5,000 KZT are made with them, then counted spending grows by 15,000 KZT.",
        "Дано: две карты. Когда по ним совершены покупки на 10 000 KZT и 5 000 KZT, тогда учтённые расходы увеличиваются на 15 000 KZT.",
      ),
      tx(
        "Given a transfer to the customer's own savings account, when it completes, then counted spending doesn't change.",
        "Дано: перевод на собственный сберегательный счёт. Когда он выполнен, тогда учтённые расходы не меняются.",
      ),
    ],
  },
  {
    id: 11,
    improved: tx(
      "The limit settings screen shall let a customer set or change the limit in at most 3 taps from the home screen, and in a usability test with 10 customers at least 9 shall do it without help.",
      "Экран настройки лимита должен позволять установить или изменить лимит не более чем за 3 нажатия с главного экрана, а в тесте с 10 клиентами не менее 9 должны справиться без помощи.",
    ),
    explanation: tx("Turns opinions into two measurable targets.", "Оценочные слова заменены двумя измеримыми целями."),
    criteria: [
      tx("Given the home screen, when a tester sets a new limit, then it takes no more than 3 taps.", "Дано: главный экран. Когда тестировщик задаёт новый лимит, тогда это занимает не более 3 нажатий."),
    ],
  },
  {
    id: 14,
    improved: tx(
      "The limit-check service shall process at least [ASSUMPTION: 300] card payments per second, with 95% of checks finished within 1 second.",
      "Сервис проверки лимита должен обрабатывать не менее [ДОПУЩЕНИЕ: 300] платежей по картам в секунду, при этом 95% проверок должны завершаться за 1 секунду.",
    ),
    explanation: tx("Replaces “high load” with numbers that can be load-tested.", "«Высокая нагрузка» заменена числами, которые можно проверить нагрузочным тестом."),
    criteria: [
      tx(
        "Given a load test at 300 payments per second for 30 minutes, then 95% of checks finish within 1 second and none are lost.",
        "Дано: нагрузочный тест 300 платежей в секунду в течение 30 минут. Тогда 95% проверок завершаются за 1 секунду и ни одна не теряется.",
      ),
    ],
  },
  {
    id: 18,
    improved: tx(
      "POST /api/v1/limits shall identify the customer from the access token, accept { \"amount\": whole KZT from 1,000 to 10,000,000 }, and return 200 with the saved limit, 400 for a wrong amount, 401 without a valid token and 409 when the limit was already changed that day.",
      "POST /api/v1/limits должен определять клиента по токену доступа, принимать { \"amount\": целое число KZT от 1 000 до 10 000 000 } и возвращать 200 с сохранённым лимитом, 400 при неверной сумме, 401 без действительного токена и 409, если лимит уже менялся в этот день.",
    ),
    explanation: tx("Removes customerId from the request, defines the input, and uses proper response codes instead of 200 for errors.", "Убран customerId из запроса, определён формат входных данных, вместо 200 для ошибок используются правильные коды."),
    criteria: [
      tx("Given a valid token, when amount 500 is sent, then the response is 400.", "Дано: действительный токен. Когда передана сумма 500, тогда ответ — 400."),
      tx("Given no token, when the request is sent, then the response is 401.", "Дано: токена нет. Когда отправлен запрос, тогда ответ — 401."),
    ],
  },
  {
    id: 23,
    improved: tx(
      "The system shall log API requests without request bodies; card numbers shall appear in logs only masked (at most the first 6 and last 4 digits), and logs shall be kept for [ASSUMPTION: 1 year].",
      "Система должна логировать запросы к API без тел запросов; номера карт должны попадать в логи только в маскированном виде (не более первых 6 и последних 4 цифр), а логи должны храниться [ДОПУЩЕНИЕ: 1 год].",
    ),
    explanation: tx("Keeps logs useful for troubleshooting while removing card numbers and request bodies.", "Логи остаются полезными для разбора инцидентов, но без номеров карт и тел запросов."),
    criteria: [
      tx("Given a request with a card number, when it is logged, then the log shows only the masked number.", "Дано: запрос с номером карты. Когда он записывается в лог, тогда в логе только маскированный номер."),
    ],
  },
];

const QUESTIONS: Array<{
  priority: ClarifyingQuestion["priority"];
  askWho: ClarifyingQuestion["askWho"];
  requirementIds: string[];
  findingIds: string[];
  question: Text;
  why: Text;
  options: Text[];
}> = [
  {
    priority: "critical", askWho: "business", requirementIds: ["REQ-004", "REQ-021"], findingIds: ["F-01"],
    question: tx("FR-4 sends the warning at 90% of the limit, but UI-1 shows it at 80%. Which threshold is correct?", "ФТ-4 отправляет предупреждение при 90% лимита, а UI-1 показывает его при 80%. Какой порог верный?"),
    why: tx("Developers will build two different thresholds and customers will get inconsistent warnings.", "Разработчики реализуют два разных порога, и клиент получит противоречивые предупреждения."),
    options: [tx("80%", "80%"), tx("90%", "90%"), tx("Both: 80% in the app, 90% as a push notification", "Оба: 80% в приложении, 90% в push-уведомлении")],
  },
  {
    priority: "critical", askWho: "business", requirementIds: ["REQ-003", "REQ-022"], findingIds: ["F-09"],
    question: tx("What happens to purchases after the monthly limit is reached?", "Что происходит с покупками после достижения месячного лимита?"),
    why: tx(
      "It decides whether this is a notification feature or a spending block; design and legal review differ completely.",
      "От ответа зависит, это функция уведомлений или блокировки расходов; дизайн и юридическая проверка будут совсем разными.",
    ),
    options: [
      tx("Allowed; the limit only triggers notifications", "Разрешены; лимит только запускает уведомления"),
      tx("Declined until next month", "Отклоняются до следующего месяца"),
      tx("Allowed, but each purchase must be confirmed in the app", "Разрешены, но каждую покупку нужно подтвердить в приложении"),
    ],
  },
  {
    priority: "critical", askWho: "security", requirementIds: ["REQ-018", "REQ-019"], findingIds: ["F-02"],
    question: tx("How should the API identify the customer: from the access token, or from the customerId sent in the request?", "Как API должен определять клиента: по токену доступа или по customerId из запроса?"),
    why: tx("If the server trusts customerId, anyone can read another customer's balance or change their limit.", "Если сервер доверяет customerId, любой сможет узнать чужой баланс или изменить чужой лимит."),
    options: [
      tx("Only from the access token (remove customerId from the API)", "Только по токену доступа (убрать customerId из API)"),
      tx("Keep customerId, but the server checks it matches the token", "Оставить customerId, но сервер сверяет его с токеном"),
    ],
  },
  {
    priority: "critical", askWho: "security", requirementIds: ["REQ-023"], findingIds: ["F-04"],
    question: tx("Can full card numbers be removed from the logs, and how long must logs be kept?", "Можно ли убрать полные номера карт из логов и сколько хранить логи?"),
    why: tx("Full card numbers in logs break payment card rules and create a breach risk.", "Полные номера карт в логах нарушают правила платёжных карт и создают риск утечки."),
    options: [
      tx("Mask cards (first 6 and last 4 digits), keep logs for 1 year", "Маскировать карты (первые 6 и последние 4 цифры), хранить логи 1 год"),
      tx("Don't log card numbers at all", "Не записывать номера карт вообще"),
    ],
  },
  {
    priority: "high", askWho: "business", requirementIds: ["REQ-006"], findingIds: ["F-08"],
    question: tx("Which operations count as spending toward the limit?", "Какие операции учитываются в расходах по лимиту?"),
    why: tx("Each choice gives a different total, so notifications will arrive at different moments.", "Каждый вариант даёт другую сумму, и уведомления будут приходить в разное время."),
    options: [
      tx("Card purchases only", "Только покупки по карте"),
      tx("Card purchases and cash withdrawals", "Покупки и снятие наличных"),
      tx("All outgoing payments, including transfers", "Все исходящие платежи, включая переводы"),
    ],
  },
  {
    priority: "high", askWho: "tech", requirementIds: ["REQ-003", "REQ-015"], findingIds: ["F-07", "F-16"],
    question: tx("From which moment are the 5 seconds to the notification measured, and for what share of notifications?", "От какого момента считаются 5 секунд до уведомления и для какой доли уведомлений?"),
    why: tx("Without a start point and a percentage, the speed requirement can't be tested.", "Без начальной точки и доли случаев требование к скорости нельзя проверить."),
    options: [
      tx("From card authorisation, for 95% of notifications", "От авторизации по карте, для 95% уведомлений"),
      tx("From transaction posting, for 99% of notifications", "От проведения операции, для 99% уведомлений"),
    ],
  },
  {
    priority: "medium", askWho: "business", requirementIds: ["REQ-007"], findingIds: ["F-15"],
    question: tx("Is the limit period a calendar month, and in which time zone does it reset?", "Период лимита — календарный месяц, и в каком часовом поясе он начинается?"),
    why: tx("Payments near midnight at the end of the month would be counted in the wrong month.", "Платежи около полуночи в конце месяца попадут не в тот месяц."),
    options: [tx("Calendar month, Asia/Almaty time", "Календарный месяц, время Asia/Almaty"), tx("The card's statement period", "Расчётный период по карте")],
  },
  {
    priority: "medium", askWho: "compliance", requirementIds: ["REQ-005"], findingIds: ["F-12"],
    question: tx("Should the account balance appear in push notifications, which are visible on the lock screen?", "Показывать ли баланс счёта в push-уведомлениях, которые видны на заблокированном экране?"),
    why: tx("Anyone near the phone could see the customer's balance.", "Баланс клиента увидит любой, кто находится рядом с телефоном."),
    options: [tx("No, remove the balance", "Нет, убрать баланс"), tx("Only if the customer turns it on", "Только если клиент сам это включит")],
  },
];

const SUMMARY = {
  summary: tx(
    "The specification covers the main spending-limit flow and every requirement has an ID, but it needs revision before development starts. Four critical problems should be fixed first: the warning threshold is 90% in one place and 80% in another, the API trusts a customer ID sent by the app, the internal notification endpoint has no protection, and full card numbers are written to logs. Most other problems are vague words (“quickly”, “high load”, “user-friendly”) and missing rules for which payments count and when the month resets. Applying the seven suggested fixes and adding the missing requirements would remove the largest deductions.",
    "Спецификация описывает основной сценарий работы с лимитом, и у каждого требования есть номер, но перед началом разработки её нужно доработать. Сначала стоит исправить четыре критические проблемы: порог предупреждения указан как 90% в одном месте и 80% в другом, API доверяет ID клиента из запроса приложения, внутренний эндпоинт уведомлений не защищён, а полные номера карт пишутся в логи. Остальные проблемы — в основном размытые слова («быстро», «высокая нагрузка», «удобный») и отсутствие правил, какие операции учитываются и когда начинается месяц. Семь предложенных исправлений и недостающие требования уберут самые большие снижения оценки.",
  ),
  keyRisks: [
    tx("Anyone could read another customer's balance or change their limit through the customerId field.", "Любой может узнать чужой баланс или изменить чужой лимит через поле customerId."),
    tx("Full card numbers in logs create a card-data breach and compliance risk.", "Полные номера карт в логах создают риск утечки и нарушения требований к данным карт."),
    tx("Fake bank notifications could be sent through the unprotected internal endpoint.", "Через незащищённый внутренний эндпоинт можно рассылать поддельные уведомления банка."),
    tx("Different thresholds will show different warnings in the app and in notifications.", "Разные пороги приведут к разным предупреждениям в приложении и в уведомлениях."),
  ],
  strengths: [
    tx("Every requirement has an ID, which makes review and tracing easy.", "У каждого требования есть номер, что упрощает проверку и отслеживание."),
    tx("The limit has a clear default value and allowed range.", "У лимита есть понятное значение по умолчанию и допустимый диапазон."),
    tx("Notification speed has a numeric target (5 seconds).", "Для скорости уведомлений задано число (5 секунд)."),
  ],
};

const AUDIT: AuditEntry[] = [
  { agent: "extraction", status: "done", startedAt: "2026-11-26T10:29:12.000Z", durationMs: 6820, model: "gemini-2.5-flash", detail: "Found 23 requirements and 3 API endpoints", metrics: { requirements: 23, endpoints: 3 }, outputChars: 6104 },
  { agent: "validation", status: "done", startedAt: "2026-11-26T10:29:19.000Z", durationMs: 18410, model: "gemini-2.5-flash", detail: "14 problems, 4 missing requirements, 6 edge cases", metrics: { issues: 14, missing: 4, edgeCases: 6 }, outputChars: 14388 },
  { agent: "api", status: "done", startedAt: "2026-11-26T10:29:19.000Z", durationMs: 9240, model: "gemini-2.5-flash", detail: "6 API problems", metrics: { issues: 6 }, outputChars: 6012 },
  { agent: "risk", status: "done", startedAt: "2026-11-26T10:29:19.000Z", durationMs: 11730, model: "gemini-2.5-flash", detail: "6 risks, 2 missing safeguards", metrics: { issues: 6, missing: 2 }, outputChars: 7344 },
  { agent: "clarification", status: "done", startedAt: "2026-11-26T10:29:38.000Z", durationMs: 10840, model: "gemini-2.5-flash", detail: "8 clarifying questions", metrics: { questions: 8 }, outputChars: 5230 },
  { agent: "recommendation", status: "done", startedAt: "2026-11-26T10:29:38.000Z", durationMs: 12960, model: "gemini-2.5-flash", detail: "7 requirements rewritten", metrics: { rewritten: 7 }, outputChars: 8921 },
];

const STATS = {
  en: { words: 394, characters: 2485, requirements: 23, sections: 10, apiEndpoints: 3, language: "en" as const },
  ru: { words: 320, characters: 2482, requirements: 23, sections: 10, apiEndpoints: 3, language: "ru" as const },
};

const id = (n: number) => `REQ-${String(n).padStart(3, "0")}`;

function buildSampleReport(lang: ReportLanguage): Report {
  const pick = (text: Text) => text[lang];
  const requirements: Requirement[] = REQUIREMENTS.map((r) => ({
    id: id(r.n),
    sourceRef: pick(r.ref),
    section: r.section,
    type: r.type,
    priority: r.priority,
    text: pick(r.text),
    dependsOn: r.dependsOn ?? [],
    acceptanceCriteria: (r.criteria ?? []).map(pick),
  }));
  const toFinding = (f: SampleFinding): Finding => ({
    category: f.category,
    severity: f.severity,
    requirementIds: f.requirementIds,
    confidence: f.confidence,
    standardRef: pick(f.standardRef),
    endpoint: f.endpoint,
    title: pick(f.title),
    description: pick(f.description),
    evidence: pick(f.evidence),
    rationale: pick(f.rationale),
    recommendation: pick(f.recommendation),
  });
  const textById = new Map(requirements.map((r) => [r.id, r.text]));
  const improvements: Improvement[] = IMPROVEMENTS.map((imp) => ({
    requirementId: id(imp.id),
    original: textById.get(id(imp.id)) ?? "",
    improved: pick(imp.improved),
    explanation: pick(imp.explanation),
    acceptanceCriteria: imp.criteria.map(pick),
  }));

  const report = runReportAgent({
    id: lang === "ru" ? "sample-ru" : "sample",
    createdAt: "2026-11-26T10:30:00.000Z",
    fileName: lang === "ru" ? "spending-limit-srs-ru.md" : "spending-limit-srs.md",
    language: lang,
    models: ["gemini-2.5-flash"],
    document: {
      title: pick(tx("Monthly Spending Limit Notifications — Mobile Banking App", "Уведомления о месячном лимите расходов — мобильный банк")),
      domain: pick(tx("Retail banking, mobile notifications", "Розничный банк, мобильные уведомления")),
      summary: pick(
        tx(
          "Draft specification for a mobile banking feature that lets customers set a monthly spending limit and get push notifications as they approach and reach it, including the backend API.",
          "Черновик спецификации функции мобильного банка: клиент задаёт месячный лимит расходов и получает push-уведомления при приближении к нему и его достижении; включает серверный API.",
        ),
      ),
      stats: STATS[lang],
      truncated: false,
    },
    requirements,
    endpoints: [
      { method: "POST", path: "/api/v1/limits", description: pick(tx("Sets the monthly limit", "Устанавливает месячный лимит")) },
      { method: "GET", path: "/api/v1/limits/{customerId}", description: pick(tx("Returns limit, amount spent and balance", "Возвращает лимит, расходы и баланс")) },
      { method: "POST", path: "/api/v1/notifications/send", description: pick(tx("Sends a notification (internal)", "Отправляет уведомление (внутренний)")) },
    ],
    findings: { validation: VALIDATION.map(toFinding), api: API.map(toFinding), risk: RISK.map(toFinding) },
    missingRequirements: MISSING.map((m) => ({
      title: pick(m.title),
      description: pick(m.description),
      category: m.category,
      severity: m.severity,
      suggestedRequirement: pick(m.suggested),
      standardRef: m.standardRef,
    })),
    edgeCases: EDGE_CASES.map((e) => ({ scenario: pick(e.scenario), expectedBehavior: pick(e.expected), requirementIds: e.requirementIds, severity: e.severity })),
    improvements,
    clarifyingQuestions: QUESTIONS.map((q) => ({
      question: pick(q.question),
      why: pick(q.why),
      askWho: q.askWho,
      priority: q.priority,
      requirementIds: q.requirementIds,
      findingIds: q.findingIds,
      options: q.options.map(pick),
    })),
    executiveSummary: {
      summary: pick(SUMMARY.summary),
      keyRisks: SUMMARY.keyRisks.map(pick),
      strengths: SUMMARY.strengths.map(pick),
    },
    audit: AUDIT.map((a) => ({ ...a })),
    warnings: [],
  });

  report.audit.push({
    agent: "report",
    status: "done",
    startedAt: "2026-11-26T10:29:51.000Z",
    durationMs: 4,
    model: "rules",
    detail: `Quality ${report.scores.overall}/100, risk ${report.scores.risk}/100`,
    metrics: { overall: report.scores.overall, risk: report.scores.risk },
  });
  return report;
}

const cache: Partial<Record<ReportLanguage, Report>> = {};

/** The example report in the requested language (built once, then cached). */
export function getSampleReport(lang: ReportLanguage): Report {
  cache[lang] ??= buildSampleReport(lang);
  return cache[lang]!;
}
