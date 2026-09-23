import type { LetterLang } from './appointment-letter-fields'

/**
 * Appointment-order wording, in the three languages HR issues it in.
 *
 * English and Gujarati follow the HR source documents clause for clause; Hindi
 * is a translation kept aligned with the English set. Gujarati carries 33
 * clauses and the other two 29, which is why the template paginates by
 * measurement rather than breaking at a fixed clause.
 *
 * `{placeholder}` tokens ({designation}, {workplace}, {joiningDate},
 * {reportTime}, {company}, {city}) are filled by `fillTemplate()`.
 */

export interface AppointmentUi {
  title: string
  /** Heading used when the same order is re-issued for a contract renewal. */
  renewalTitle: string
  to: string
  subjectLabel: string
  subject: string
  /** Subject line for the renewal (re-appointment) variant. */
  renewalSubject: string
  dateLabel: string
  cityLabel: string
  cellLabel: string
  agree: string
  employeeSignature: string
  managerLines: string[]
  venueLabel: string
  pageLabel: (n: number, total: number) => string
}

export const APPOINTMENT_UI: Record<LetterLang, AppointmentUi> = {
  en: {
    title: 'APPOINTMENT ORDER',
    renewalTitle: 'RE-APPOINTMENT ORDER',
    to: 'To,',
    subjectLabel: 'SUBJECT :',
    subject:
      'Appointment for the post of {designation} on contractual basis at {workplace} by {company}',
    renewalSubject:
      'Re-appointment (renewal of contract) for the post of {designation} on contractual basis at {workplace} by {company}',
    dateLabel: 'Dt.',
    cityLabel: 'City :',
    cellLabel: 'Mo. :',
    agree: 'I agree to all the above-mentioned conditions.',
    employeeSignature: "Employee's Signature",
    managerLines: ['Manager (HR)', '{company}', 'Outsource Contract', '{city}'],
    venueLabel: 'VENUE OF REPORTING :',
    pageLabel: (n, total) => `Page ${n} of ${total}`,
  },
  hi: {
    title: 'नियुक्ति आदेश',
    renewalTitle: 'पुनर्नियुक्ति आदेश',
    to: 'सेवा में,',
    subjectLabel: 'विषय :',
    subject:
      '{workplace} में {company} द्वारा {designation} के पद पर संविदा आधारित नियुक्ति के संबंध में।',
    renewalSubject:
      '{workplace} में {company} द्वारा {designation} के पद पर संविदा आधारित पुनर्नियुक्ति (अनुबंध नवीनीकरण) के संबंध में।',
    dateLabel: 'दिनांक',
    cityLabel: 'शहर :',
    cellLabel: 'मोबाइल :',
    agree: 'उपरोक्त सभी शर्तें मुझे स्वीकार्य हैं।',
    employeeSignature: 'कर्मचारी के हस्ताक्षर',
    managerLines: ['मैनेजर (एच.आर.)', '{company}', 'आउटसोर्स कॉन्ट्रैक्टर', '{city}'],
    venueLabel: 'उपस्थित होने का स्थान :',
    pageLabel: (n, total) => `पृष्ठ ${n} / ${total}`,
  },
  gu: {
    title: 'નિમણૂક આદેશ (APPOINTMENT ORDER)',
    renewalTitle: 'પુનઃ નિમણૂક આદેશ (RE-APPOINTMENT ORDER)',
    to: 'પ્રતિ,',
    subjectLabel: 'વિષય :',
    subject:
      '{designation} તરીકે આઉટસોર્સથી કરાર આધારિત નિમણૂક આપવા બાબત. ({workplace})',
    renewalSubject:
      '{designation} તરીકે આઉટસોર્સથી કરાર આધારિત પુનઃ નિમણૂક (કરાર રીન્યુ) આપવા બાબત. ({workplace})',
    dateLabel: 'તા.',
    cityLabel: 'શહેર :',
    cellLabel: 'મો. :',
    agree: 'ઉપરોકત તમામ શરતો મેં વાંચી સમજી લીધી છે. મને તમામ શરતો મંજુર છે.',
    employeeSignature: 'કર્મચારી સહી',
    managerLines: ['મેનેજર', '{company}', 'આઉટસોર્સ કોન્ટ્રાકટર', '{city}'],
    venueLabel: 'હાજર થવાનું સ્થળ :',
    pageLabel: (n, total) => `પાનું ${n} / ${total}`,
  },
}

export const APPOINTMENT_CLAUSES_EN: string[] = [
  "On the basis of your application and qualification, you are being appointed as {designation} on contractual basis. You have to report at under mentioned address before {reportTime} on Dt. {joiningDate}.",
  "You will have to follow all the rules regulations and all the conditions and responsibilities related to job. In case of breach of any of the conditions, you will be terminated from the job with immediate effect.",
  "During the contract period, if any of your activity likes misbehavior, strike, group activities which will be considered as indiscipline and are against company policy, on receiving any such complaints in verbal or written form, you will be terminated with immediate effect and your due amount shall be credited in your bank account in appropriate time frame. In such incidences, company will terminate you without giving any kind of notice. For such incidences, you cannot claim in court or any of the offices.",
  "You shall not be considered a central government employee today or in future. Also, you shall not have any rights or claims for the job in our company as there would not be any kind of liability of our company.",
  "This order is passed on temporary basis. You will be relieved without prior notice if in future any appointment is done for this post on permanent basis through direct recruitment by the government.",
  "Your job timings will be 8 hours according to the department at which you have been placed. If your department requires, you have to be at workplace for more than 8 hours or you may be called from home to perform duty.",
  "Name, surname date of birth etc should be the same in your entire document otherwise you shall not be able to get PF and ESIC benefits and you will be held responsible for that.",
  "If any incidence was happen like demise or accident when on duty you will be entitled for official PF and ESIC Benefit but you need to inform office within 24 hours time span so official procedure can be conducted on time.",
  "As per PF rule, you are only entitled to get both sides PF if your 180 days in the job has been completed.",
  "If you are caught or involved in theft of any kind at the institute/department, we shall immediately report to the police for which we shall not be liable in anyways.",
  "In case of any damage caused by you to the equipment at the institute, the loss shall be borne by you and we shall not be liable in anyways whatsoever.",
  "You have to provide the affidavit on Rs. 300/ stamp paper that all the conditions mentioned in this contract is agreeable and acceptable to you, in case of not providing the affidavit, you will be released from the work immediately.",
  "If necessary for Extra work, you will have to remain present on duty even on Sunday or holiday.",
  "As you are a contractual employee, you have to speak to the contract office on any matter of correspondence or leave. You cannot directly contact head office. If you directly speak to our office without approval of contract office, it will be considered a matter of indiscipline and strict action will be taken for the same.",
  "You cannot use any place of the company as your residence. Also, you cannot do any other business activity or profession during the contract period.",
  "If there is any kind of complaint during your duty, a notice (memo) will be given to you by us. Note that your job shall be considered terminated after three such notices (memos).",
  "If any kind of difficulty or rift arises during your duty immediately inform site office manager and supervisor must be informed first before any authority or any outside persons.",
  "You will have to pay fine as per rule, if found Alcohol consumption within the premises or reporting to duty in an intoxicated condition is strictly prohibited. Also, if any administrative office complains about it, we will be forced to terminate you from job.",
  "You will have to give police verification clearance which is supposed to be presented in 15 days after receiving order.",
  "If you happen to be involved into any kind of illegal act, all the liability of that will be yours, contract agency will not be liable or responsible for such an offensive act. Any of legal consequences like legal procedures, expenses or loss will be your personal responsibility. If any of loss to contract agency due to your illegal act, you have to pay for the losses to the agency.",
  "You will be paid as per as per minimum wages decided by government, any kind of salary increase will be entitled. In case of increase of minimum wages, Contract Company will pass on to you. Your salary will be paid after salary bill is passed from Department. No argument shall be attained regarding this matter.",
  "At the time of joining the duty, you are supposed to prepare 3 copies of joining report and deposit one copy at our office.",
  "At the end of every month, you have to submit the attendance sheet duly authenticated by your supervisior.",
  "You will have to intimate in written to your supervisor /contract office one month prior to leaving the job. If you fail to do so, one month salary will be debited to your account.",
  "You expected to perform your duty honestly, loyally and timely.",
  "You will be abided to follow any of the changes in rules and regulations done by the Company in future.",
  "You will adhere the organization anti-bribery and anti-corruption policy.",
  "You will not perform any misconduct against the organization reputation or nuisance, if you found guilty then the organization will take the necessary action or terminate the contract on immediate basis.",
  "Any further changes, if applicable, will be communicated in due course.",
]

export const APPOINTMENT_CLAUSES_GU: string[] = [
  "આપની અરજી તથા લાયકાતને ધ્યાને લઈને આપને {designation} તરીકેની નિમણુક {workplace} ખાતે કરાર આધારિત નિમણુક કરવામાં આવે છે. આપને નીચે જણાવેલ સ્થળ ઉપર તા.: {joiningDate} ના રોજ ૦૮:૦૦ કલાકે હાજર થવાનું રહશે. આ કોન્ટ્રાકટનો સમય ગાળો ૧૧ માસનો રહશે. નીચે જણાવેલ તમામ નીતિનિયમ તથા તમામ જવાબદારી અને શરતો નીભવવાની રહશે. નીચે જણાવેલ શરતોમાં કોઈપણ શરતચુક થશે તો તાત્કાલિક અસરથી આપને ફરજ પરથી મુક્ત કરવામાં આવશે. આપની નોકરી આઉટસોર્સ કરાર આધારિત રહશે.",
  "આપને નિષ્ઠાપૂર્વક, પ્રમાણિકપણે અને સમયસર ફરજ બજાવવાની રહશે. આપની ફરજનો સમય જે તે વિભાગ દ્વારા નક્કી કરવામાં આવે તે સમયે આપને હાજર રહેવાનું રહશે જો સમયસર હાજર નહીં રહો અને અમોને જાણ થશે તો આપની નોકરી જોખમી રહશે.કર્મચારીએ ઈમરજન્સી કામ વગર ચાલુ નોકરી પર મોબાઇલનો ઉપયોગ કરવો નહીં.",
  "આપની નોકરીનો સમય જે તે વિભાગનાં સમય પ્રમાણે ૦૮:૦૦ કલાકનો રહશે. તેમજ વિભાગનાં કામને ધ્યાનમાં લઈને ૦૮:૦૦ કલાક કરતાં વધુ સમય માટે અથવા જરૂરી જણાય તો ધેરથી પણ ફરજ પર હાજર થવું પડશે. જેના માટે આપને કોઈપણ પ્રકારનો વધારનો લાભ આપવામાં આવશે નહીં.",
  "આપની નોકરી ટ્રાન્સફર (બદલી) તરીકે રહશે, અમોને જ્યાં જરૂર હશે ત્યાં આપને મૂકવામાં આવશે, જે બાબતે કોઈ પણ પ્રકારની દલીલ કરવાની રહશે નહીં. કર્મચારીની દર ત્રણ મહીને અથવા જરૂર જણાય ત્યારે ફેરબદલી કરવામાં આવશે. અને એમાં કોઈ પણ કર્મચારી વાંધો ઉઠાવી શકશે નહીં. સૂચના મુજબ જે-તે વિભાગમાં જતું રહવાનું રહશે.",
  "આપ ફરજ પર હાજર થતા સમયે હાજર રિપોર્ટ ત્રણ નકલમાં બનાવીને એક નકલ અમારી ઓફિસમાં રજુ કરવાની રહશે. આપના વિભાગમાંથી હાજરીની માહિતી વિભાગના વડાનાં સહી સિક્કા સાથે માસ પૂર્ણ થતા તાત્કાલિક રજુ કરવાની રહશે",
  "આપને ફરજ દરમ્યાન જે તે વિભાગમાં તેમજ અમારી ઓફિસમાં રહેલ બાયોમેટ્રિક મશીનમાં તેમજ મોબાઇલ અપ્લિકેસનમાં તથા નમૂનો નં- ૧૬ હાજરીપત્રકમાં સમયસરને નિયમિત હાજરી પુરવાની રહશે. જો તેમાં કોઈપણ શરતચુક થશે તો તે દિવસે તમોને ગેરહાજર સમજવામાં આવશે. અને પછી કોઈપણ પ્રકારની દલીલ કરી શકશે નહીં. આપની માસ દરમ્યાન જેટલી હાજરી પૂરી હશે એટલા જ દિવસનો પગાર આપવામાં આવશે જે બાબતની ખાસ નોંધ લેવી. તેમજ કચેરીના કામ-કાજ સબબ આપને વડી કચેરી કે અન્ય જગ્યાએ જવાનું થાય તો તે અંગેની જાણ કોન્ટ્રાકટર ઓફિસને કરવાની રહશે.",
  "આપને કંપની તરફથી આપવામાં આવેલ ગણવેશ તથા આઈકાર્ડ ફરજ દરમ્યાન ફરજિયાત પણે પહેરવાનું રહશે. જો આપ ગણવેશ તથા આઈકાર્ડ વગર માલુમ પડશો તો તે દિવસે રૂ।. ૧૦૦/- પગારમાથી કાપી લેવામાં આવશે. તેમજ આવું ત્રણ વખત થશે, તો તમારા પગારમાંથી એક દિવસનો પગાર કાપવામાં આવશે.",
  "{workplace}ની કામગીરીના અનુસંધાને રવિવાર તથા રજાના દિવસોમાં પણ કામગીરી હોય તો આપે ફરજ પર અચુક હાજર રેહવું પડશે. અને એક સાથે ત્રણ દિવસથી વધુ રાજા મળી શકશે નહીં અને ત્રણ દિવસ કરતાં વધારે સમય માટે ફરજ પર ગેરહાજર રહેશો તો તે સમયે તમારી નોકરી સમાપ્ત ગણવામાં આવશે. અનિવાર્ય સંજોગો વસાત ત્રણ દિવસથી વધારે દિવસની જરૂરિયાત હોય તો ઓફિસનો સંપર્ક કરી લેખિતમાં જાણ કરી જવાનું રહશે.",
  "નોટિસ બોર્ડ પર અમારા ધ્વારા પગારની નોટિસ પ્રસિદ્ધ કરવામાં આવે ત્યારે એ નોટિસમાં જે સમય લખેલ હોય એ સમય દરમ્યાન આપે પગાર પત્રકમાં સહી કરી જવાની રહશે.",
  "તેમજ અમારા ધ્વારા આપને જે પગાર સ્લીપ આપવામાં આવે છે. જે પગાર સ્લીપ સાચવવાની જવાબદારી આપની રહશે. જો પગાર સ્લીપ આપ ધ્વારા ખોવાશે તો પગાર સ્લીપ મેળવવા માટે આપે લેખિતમાં અમોને જાણ કરવાની રહશે. આપની અરજી મળ્યા બાદ દિવસ-૧૫ માં કાઢી આપવામાં આવશે. તેમજ અમારા ધ્વારા છેલ્લા ત્રણ માસની જ પગાર સ્લીપ કાઢી આપવામાં આવશે. જે બાબતે કોઈપણ જાતની દલીલ કરવાની રહશે નહી. તેમજ અનુભવનું પ્રમાણપત્ર પણ અરજીના ૧૫ દિવસ બાદ આપવામાં આવશે.",
  "આપનો પાછલો રેકર્ડ ગુના રહિત હોવા અંગેનું પોલિસ વેરીફિકેસન કરાવી અમારી ઓફિસમાં રજૂ કરવાનું રહશે. જે આદેશ મળ્યાની તારીખથી આઠ દિવસમાં અચુક્પણે રજુ કરવાનું રહશે.",
  "સરકારશ્રીના ટેન્ડર મુજબ હોદા પ્રમાણે ક્રાઇટ એરિયા જે નક્કી કરવામાં આવેલ છે. તે પ્રમાણે તમામ કાગળ (સર્ટિફિકેટ) આપે આપવાના રહશે. જો ખોટા કાગળ આપ દ્વારા અમોને રજૂ કરશો અને એ બાબતે અમોને જાણ થશે તો કાનુની કાર્યવાહી કરવામાં આવશે જેની ખાસ નોધ લેવી.",
  "આપની તમામ ડોકયુમેંટમાં નામ, અટક, જન્મ તારીખ વગેરે એક સરખા હોવા જોઇએ અન્યથા પી. એફ. તથા ઇ.એસ.આઈ.સી વગેરેમાં લાભો લેવા માટે જો આમાં કોઈપણ પ્રકારની વિસંગતા જણાશે તો આપને લાભ મળવાપાત્ર રહશે નહીં જે બાબતે જવાબદાર આપ રહશો.",
  "ચાલુ નોકરી પર આપનું મૃત્યુ થાય તો નિયમ પ્રમાણે પી.એફ. અને ઇ. એસ. આઈ દ્વારા જે લાભ મળતો હશે, એ જ આપને મળવા પાત્ર છે આમાં અમારી એજન્સીની કોઇ જવાબદારી રહશે નહીં. અને તે અંગેની જાણ ચોવીસ કલાકની અંદર કરવાની રહશે. આપને કોઈપણ જાતની જૂની બીમારી હોય તો અમોને ફરજ પર હાજર થતાં જ જાણ કરવાની રહશે ફરજ દરમ્યાન બીમારીના કારણે આપની સાથે કોઈ અણબનાવ બની જાય તો અમારી જવાબદારી રહશે નહીં. આપ દ્વારા અમોને આપની હેલ્થનું ચેકઅપ કરાવી ફિટનેસ બાબતનું સર્ટિફિકેટ રજૂ કરવાનું રહશે.",
  "આપની હાજરી છ (૬) મહિના પુરી હશે તો જ આપ બન્ને તરફના પી. એફ.તથા ઇ.એસ.આઈ.સી ના હક દાર બનશો. જો આપની હાજરી છ મહિના કરતાં ઓછી હશે તો નિયમ પ્રમાણે જે રકમ મળવા પાત્ર હશે તે જ મળશે.",
  "ભવિષ્યમાં {workplace} સંસ્થા ખાતે નીતિ નિયમમાં કોઈપણ ફેરફાર થશે તો તે આપને બંધન કર્તા રહશે. આપ દ્વારા સંસ્થાના કોઈપણ અધિકારી કે કર્મચારી સાથે ગેરવર્તન કરવું નહીં જો આમ કરતાં અમોને જણાશે તો તાત્કાલિક ધોરણે ફરજ પરથી મુકત કવામાં આવશે.",
  "તમો કોંન્ટ્રાકટનાં કર્મચારી હોય. તમારે કોઈપણ પ્રકારનો પત્ર વ્યવહાર કે રજા કે અન્ય બાબત અંગે કોંન્ટ્રાકટ ઓફિસ જ સંપર્ક કરવાનો રહેશે. તમો સીધો જ કચેરીનો સંપર્ક કરી શકશો નહીં. જો કોંન્ટ્રાકટ ઓફિસને બાદ કરી સીધો પત્ર વ્યવહાર કરશો તો તે તમારી ગેરશિસ્ત ગણાશે. અને એ અંગે તમારા વિરુદ્ધ પગલાં લેવામાં આવશે.",
  "આપની ફરજ દરમ્યાન કોઈપણ પ્રકારનું ગેરવર્તન, હડતાલ પાડવી અથવા જુથમાં થઈ રજુઆત કરવી, જે ગેરશિસ્ત ઠરશે. જે અંગેની લેખિત કે મોંખિક ફરિયાદ અમોને મળશે તો તમારી સેવાઓ તુરંત જ સમાપ્ત્ત કરી દેવામાં આવશે. જે અંગે કોઈપણ કારણ દર્શાવ્યા વગર જ આપને સેવાઓમાંથી મુકત કરી દેવામાં આવશે. આ અંગે કોઇ કોર્ટ -કચેરીનો દાવો કરી શકશે નહીં.",
  "આપ દ્વારા સંસ્થા ખાતે કોઈપણ જાતની ચોરીમાં પકડાશો અથવા ચોરી કરવામાં સામેલ હશો તો અમારા દ્વારા તુરંત પોલીસને જાણ કરવામાં આવશે જેની અમારી કોઈપણ જાતની જવાબદારી રહશે નહીં.",
  "આપના નામ પર કોઈ અન્ય ફરજ બજાવી રહૈયા હશે. તો આપને તાત્કાલિક છૂટા કરવામાં આવશે. અને કાનુની કાર્યવાહી કરવામાં આવશે.",
  "આપ આજે કે ભવિષ્યમાં કોઈપણ સંજોગોમાં રાજય સરકારના કર્મચારી ગણાશો નહીં. તેમજ તેને લગતા કોઈપણ જાતનાં પગાર ભથ્થા, સવલતો કે રજાઓ વગેરે માટેના હકદાર ગણાશો નહીં. તથા આપને અમારા ખાતે કે {workplace} ખાતે કોઈપણ પ્રકારનો હક્ક હીસ્સો રહેશે નહીં.",
  "આ આદેશ હંગામી ધોરણે આપવામાં આવેલ છે. ભવિષ્યમાં ખાલી પડેલ જગ્યા પર સરકારશ્રી દ્વારા કાયમી ધોરણે ભરતી કરવામાં આવશે તો તમને વગર નોટીસ છુટા કરવામાં આવશે.",
  "આપના દ્વારા સંસ્થા ખાતેની સાધન સામગ્રીને નુકશાન પહોચાડવામાં આવશે જેની ભરપાઈ આપના શીરે રહશે જેમાં અમારી કોઈપણ જાતની જવાબદારી રહશે નહીં.",
  "આપ {workplace}ના કોઈપણ સ્થળનો ક્યારેય રહેઠાણ તરીકે ઉપયોગ કરી શકશો નહીં. તેમજ કોઈપણ પ્રવૃતિ, ધંધો, વ્યવસાય કરી શકશો નહીં.",
  "આપ {workplace}નાં પરિસરમાં ધૂમ્રપાન, પાન, માવો અન્ય વ્યસનો કરતાં પકડાશો તો તમારી પાસેથી કાયદેસરનો દંડ રૂ.૫૦૦ વસુલ કરવામાં આવશે.",
  "આપના દ્વારા કોઈપણ ગુનાહિત પ્રવૃતિ થશે કે કરવામાં આવશે તો તેની સંપૂર્ણ જવાબદારી વ્યક્તિગત આપની રહશે. તથા તેમની કાયદાકીય કાર્યવાહી, ખર્ચ, ખોટીપો તથા તે કારણે એજન્સીને જો કોઈ નુકસાન થાય તો તેની સંપુણ જવાબદારી આપે વ્યક્તિગત ભોગવવાની રહશે.",
  "આપનો પગાર સરકારશ્રી દ્વારા નક્કી કરવામાં આવેલ લઘુતમ વેતન પ્રમાણે ચુકવવામાં આવશે. અને પગાર વધારા બાબતે કોઈ રજૂઆત ગ્રાહય રખવામાં આવશે નહીં. જે તે સમયે લધુતમ વેતનમાં વધારો થશે તે પ્રમાણે પેઢી દ્વારા તે ચૂકવવામાં આવશે. {workplace}માંથી પગાર બીલ પાસ થયા બાદ પગાર કરવામાં આવશે. સરકારશ્રીના નિયમ પ્રમાણે આપનો પગાર ESCROW અકાઉન્ટ મારફતે આપના બેંક ખાતામાં કરવામાં આવશે. સંસ્થા દ્વારા જ્યારે ESCROW અકાઉન્ટમાં પગારના નાણાં જમા કરવામાં આવશે ત્યાર બાદ આપનો પગાર દિવસ -૫ માં કરવામાં આવશે. જે બાબતે કોઈ પણ જાતની દલીલ સાંભળવામાં આવશે નહીં.",
  "પગાર સીવાઈના કોઈ પણ જાતના વધારાના નાણાં અમારા તરફથી આપને આપવામાં આવશે નહીં. જેવા કે લોન (ઉપાડ) તદન સુવિધા બંધ છે જે બાબતે કોઈ દલીલ કરવાની રહશે નહીં.",
  "આપે નોકરી છોડતા પેહલા એક (૧) મહિના અગાઉ જાણ કરવાની રહશે. જો જાણ કરવામાં નહીં આવે તો આપનો ૧ માસનો પગાર જમા લેવામાં આવશે. જેની ખાસ નોધ લેવી.કર્મચારીએ છૂટા થયાના ત્રણ (૩) મહીના સુધીમાં પોતાની અનુભવનું પ્રમાણપત્ર , પી. એફની પ્રોસેસ કરાવી લેવાની રહેશે.",
  "આપ અન્ય જગ્યા પર બીજી કોઈપણ પ્રકારની નોકરી કરતા હોય તો અમોને અચૂક જાણ કરવાની રહશે.",
  "આપની ફરજ દરમ્યાન કોઈપણ પ્રકારની ફરિયાદ આવશે તો જે બાબતનોં અમારા દ્વારા નોટિસ (મેમો) આપવામાં આવશે , ત્રણ નોટિસ (મેમો) થયે આપની નોકરી સમાપ્ત ગણવામાં આવશે જેની નોધ લેવી.",
  "આપણે ફરજ દરમ્યાન કોઈપણ પ્રકારની મુશ્કેલી ઊભી થાય કે અણબનાવ બને તો તુરંત જ એચ. આર. મેનેજર, એસ. આઈ., કે સુપરવાઈઝરને સૌવપ્રથમ જાણ કરવાની રહશે કોઈ અન્ય માણસનો સંપર્ક કરવાનો રહશે નહીં જો આપ દ્વારા અન્ય આગેવાન કે અન્ય માણસને અમારી સમક્ષ રજૂ કરશો તો આપની નોકરી જોખમમાં પડશે, જેની તકેદારી આપને રાખવાની રહશે.",
  "ઉપરોકત તમામ શરતો આપને કબુલ છે તે પ્રકારનું એફિડેવીટ રૂ. ૫૦ / રૂ.૧૦૦ ના પોતાના નામનાં સ્ટેમ પેપર પર અહીની ઓફિસ દિવસ-૫માં રજુ કરવાનું રહશે. જો રજુ કરવામાં નહીં આવે તો ફરજ પરથી મુકત કરવામાં આવશે.",
]

export const APPOINTMENT_CLAUSES_HI: string[] = [
  "आपके आवेदन एवं योग्यता के आधार पर आपको {designation} के पद पर संविदा (कॉन्ट्रैक्ट) आधार पर नियुक्त किया जा रहा है। आपको नीचे दिए गए पते पर दिनांक {joiningDate} को {reportTime} बजे से पहले उपस्थित होना होगा।",
  "आपको नौकरी से संबंधित सभी नियमों, विनियमों, शर्तों तथा जिम्मेदारियों का पालन करना होगा। किसी भी शर्त का उल्लंघन होने पर आपको तत्काल प्रभाव से सेवा से मुक्त कर दिया जाएगा।",
  "संविदा अवधि के दौरान यदि आपकी ओर से दुर्व्यवहार, हड़ताल अथवा समूह बनाकर की गई कोई गतिविधि पाई जाती है, तो उसे अनुशासनहीनता एवं कंपनी की नीति के विरुद्ध माना जाएगा। ऐसी कोई भी मौखिक या लिखित शिकायत प्राप्त होने पर आपको तत्काल प्रभाव से सेवामुक्त कर दिया जाएगा और आपकी देय राशि उचित समय में आपके बैंक खाते में जमा कर दी जाएगी। ऐसी स्थिति में कंपनी बिना किसी नोटिस के आपकी सेवा समाप्त करेगी और आप इस संबंध में न्यायालय या किसी कार्यालय में कोई दावा नहीं कर सकेंगे।",
  "आप आज अथवा भविष्य में किसी भी स्थिति में केंद्र सरकार के कर्मचारी नहीं माने जाएँगे। साथ ही हमारी कंपनी में नौकरी संबंधी कोई अधिकार या दावा आपका नहीं रहेगा तथा इस संबंध में कंपनी की कोई जिम्मेदारी नहीं होगी।",
  "यह आदेश अस्थायी आधार पर दिया गया है। भविष्य में यदि इस पद पर सरकार द्वारा सीधी भर्ती के माध्यम से स्थायी नियुक्ति की जाती है, तो आपको बिना पूर्व सूचना के सेवामुक्त कर दिया जाएगा।",
  "आपकी ड्यूटी का समय उस विभाग के अनुसार 8 घंटे का रहेगा जिसमें आपको तैनात किया गया है। विभाग की आवश्यकता होने पर आपको 8 घंटे से अधिक समय तक कार्यस्थल पर रहना पड़ सकता है अथवा घर से भी ड्यूटी हेतु बुलाया जा सकता है।",
  "आपके समस्त दस्तावेजों में नाम, उपनाम, जन्म तिथि आदि एक समान होने चाहिए, अन्यथा आपको पी.एफ. तथा ई.एस.आई.सी. के लाभ प्राप्त नहीं होंगे, जिसके लिए आप स्वयं उत्तरदायी रहेंगे।",
  "ड्यूटी के दौरान मृत्यु अथवा दुर्घटना जैसी कोई घटना होने पर आप नियमानुसार पी.एफ. एवं ई.एस.आई.सी. लाभ के हकदार होंगे, परंतु इसकी सूचना 24 घंटे के भीतर कार्यालय को देना अनिवार्य है, ताकि आधिकारिक प्रक्रिया समय पर पूर्ण की जा सके।",
  "पी.एफ. नियम के अनुसार, नौकरी में 180 दिन पूर्ण होने पर ही आप दोनों पक्षों के पी.एफ. के हकदार होंगे।",
  "यदि आप संस्थान/विभाग में किसी भी प्रकार की चोरी में पकड़े जाते हैं अथवा संलिप्त पाए जाते हैं, तो हम तत्काल पुलिस को सूचित करेंगे, जिसके लिए हमारी किसी भी प्रकार की जिम्मेदारी नहीं होगी।",
  "आपके द्वारा संस्थान के उपकरणों को किसी प्रकार की क्षति पहुँचाने पर उसकी भरपाई आपको स्वयं करनी होगी, इसमें हमारी किसी भी प्रकार की जिम्मेदारी नहीं होगी।",
  "आपको रु. 300/- के स्टाम्प पेपर पर शपथपत्र (एफिडेविट) प्रस्तुत करना होगा कि इस अनुबंध में उल्लिखित सभी शर्तें आपको स्वीकार्य हैं। शपथपत्र प्रस्तुत न करने की स्थिति में आपको तत्काल कार्य से मुक्त कर दिया जाएगा।",
  "आवश्यकता पड़ने पर अतिरिक्त कार्य हेतु आपको रविवार अथवा अवकाश के दिन भी ड्यूटी पर उपस्थित रहना होगा।",
  "आप संविदा कर्मचारी होने के कारण किसी भी पत्राचार अथवा अवकाश संबंधी विषय पर केवल कॉन्ट्रैक्ट कार्यालय से ही संपर्क करेंगे। आप सीधे मुख्यालय से संपर्क नहीं कर सकते। कॉन्ट्रैक्ट कार्यालय की अनुमति के बिना सीधे हमारे कार्यालय से बात करने पर इसे अनुशासनहीनता माना जाएगा और उसके लिए कड़ी कार्रवाई की जाएगी।",
  "आप कंपनी के किसी भी स्थान का उपयोग अपने निवास के रूप में नहीं कर सकते। साथ ही संविदा अवधि के दौरान कोई अन्य व्यवसाय अथवा पेशा नहीं कर सकते।",
  "ड्यूटी के दौरान किसी भी प्रकार की शिकायत मिलने पर हमारे द्वारा आपको नोटिस (मेमो) दिया जाएगा। ध्यान दें कि ऐसे तीन नोटिस (मेमो) के बाद आपकी नौकरी समाप्त मानी जाएगी।",
  "ड्यूटी के दौरान किसी भी प्रकार की कठिनाई अथवा विवाद उत्पन्न होने पर किसी भी अधिकारी अथवा बाहरी व्यक्ति से पहले तुरंत साइट ऑफिस मैनेजर एवं सुपरवाइजर को सूचित करना अनिवार्य है।",
  "परिसर में मदिरापान अथवा नशे की स्थिति में ड्यूटी पर आना पूर्णतः निषिद्ध है; ऐसा पाए जाने पर आपको नियमानुसार जुर्माना देना होगा। साथ ही इस संबंध में किसी प्रशासनिक कार्यालय से शिकायत आने पर हमें आपकी सेवा समाप्त करनी पड़ेगी।",
  "आपको पुलिस वेरिफिकेशन क्लीयरेंस देना होगा, जिसे आदेश प्राप्ति के 15 दिनों के भीतर प्रस्तुत करना अनिवार्य है।",
  "यदि आप किसी भी प्रकार के अवैध कृत्य में संलिप्त पाए जाते हैं, तो उसकी संपूर्ण जिम्मेदारी आपकी होगी; कॉन्ट्रैक्ट एजेंसी ऐसे किसी अपराध के लिए उत्तरदायी नहीं होगी। कानूनी कार्यवाही, व्यय अथवा हानि जैसे सभी परिणाम आपकी व्यक्तिगत जिम्मेदारी होंगे। आपके अवैध कृत्य के कारण कॉन्ट्रैक्ट एजेंसी को कोई हानि होने पर उसकी भरपाई भी आपको करनी होगी।",
  "आपका वेतन सरकार द्वारा निर्धारित न्यूनतम वेतन के अनुसार दिया जाएगा। न्यूनतम वेतन में वृद्धि होने पर कॉन्ट्रैक्ट कंपनी द्वारा वह वृद्धि आपको दी जाएगी। विभाग से वेतन बिल पास होने के बाद ही आपका वेतन भुगतान किया जाएगा। इस संबंध में कोई भी तर्क मान्य नहीं होगा।",
  "ड्यूटी पर उपस्थित होते समय आपको जॉइनिंग रिपोर्ट की 3 प्रतियाँ तैयार कर एक प्रति हमारे कार्यालय में जमा करानी होगी।",
  "प्रत्येक माह के अंत में आपको अपने सुपरवाइजर द्वारा विधिवत प्रमाणित उपस्थिति पत्रक (अटेंडेंस शीट) जमा करानी होगी।",
  "नौकरी छोड़ने से एक माह पूर्व आपको अपने सुपरवाइजर/कॉन्ट्रैक्ट कार्यालय को लिखित सूचना देनी होगी। ऐसा न करने पर आपके खाते से एक माह का वेतन काट लिया जाएगा।",
  "आपसे अपेक्षा की जाती है कि आप अपनी ड्यूटी ईमानदारी, निष्ठा एवं समयबद्धता के साथ निभाएँ।",
  "भविष्य में कंपनी द्वारा नियमों एवं विनियमों में किए गए किसी भी परिवर्तन का पालन करना आपके लिए बाध्यकारी होगा।",
  "आप संस्था की रिश्वत-विरोधी एवं भ्रष्टाचार-विरोधी नीति का पालन करेंगे।",
  "आप संस्था की प्रतिष्ठा के विरुद्ध कोई कदाचार अथवा उपद्रव नहीं करेंगे; दोषी पाए जाने पर संस्था आवश्यक कार्रवाई करेगी अथवा तत्काल प्रभाव से अनुबंध समाप्त कर देगी।",
  "आगे कोई भी परिवर्तन लागू होने पर उसकी सूचना यथासमय दी जाएगी।",
]
