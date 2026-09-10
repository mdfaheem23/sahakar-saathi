import { DistrictInsight, daysUntil } from "./districtData";
import { LangCode, LocalizedText } from "./types";

// Builds the message an automated IVR call / SMS would push to farmers in a
// district — the "push, not pull" half of the novelty. In production this
// would be triggered server-side by a scheduled job watching the PMFBY
// deadline calendar and IMD/weather peril feeds, fired through the same
// toll-free IVR line described in the hardware section.
export function buildOutreachMessage(d: DistrictInsight, lang: LangCode): string {
  const days = daysUntil(d.enrollmentDeadline);

  if (d.perilAlert) {
    const templates: LocalizedText = {
      en: `PACS Sahayak alert: a ${d.perilAlert.type.toLowerCase()} has been reported in ${d.district}. If your ${d.crop} crop is affected, you can file a PMFBY claim within ${d.perilAlert.windowHours} hours. Press 1 or say "file claim" to start now, or visit your nearest PACS kiosk.`,
      hi: `पीएसीएस सहायक अलर्ट: ${d.district} में ${d.perilAlert.type} की सूचना मिली है। यदि आपकी ${d.crop} फसल प्रभावित हुई है, तो आप ${d.perilAlert.windowHours} घंटों के भीतर पीएमएफबीवाई दावा दर्ज कर सकते हैं। अभी शुरू करने के लिए 1 दबाएं या "दावा दर्ज करें" कहें, या अपने नजदीकी पीएसीएस कियोस्क पर जाएं।`,
      ta: `பாக்ஸ் சகாயக் எச்சரிக்கை: ${d.district}-ல் ${d.perilAlert.type} தெரிவிக்கப்பட்டுள்ளது. உங்கள் ${d.crop} பயிர் பாதிக்கப்பட்டிருந்தால், ${d.perilAlert.windowHours} மணி நேரத்திற்குள் பிஎம்எஃப்பிவை உரிமைகோரலை பதிவு செய்யலாம். இப்போதே தொடங்க 1 அழுத்தவும் அல்லது "உரிமைகோரல் பதிவு" எனச் சொல்லுங்கள், அல்லது அருகிலுள்ள பாக்ஸ் கியோஸ்க்கிற்குச் செல்லுங்கள்.`,
      te: `PACS సహాయక్ హెచ్చరిక: ${d.district}లో ${d.perilAlert.type} నమోదైంది. మీ ${d.crop} పంట దెబ్బతింటే, ${d.perilAlert.windowHours} గంటల లోపల PMFBY క్లెయిమ్ దాఖలు చేయవచ్చు. ఇప్పుడే ప్రారంభించడానికి 1 నొక్కండి లేదా "క్లెయిమ్ దాఖలు" అని చెప్పండి, లేదా మీ సమీప PACS కియోస్క్‌కు వెళ్లండి.`,
      kn: `PACS ಸಹಾಯಕ ಎಚ್ಚರಿಕೆ: ${d.district}ನಲ್ಲಿ ${d.perilAlert.type} ವರದಿಯಾಗಿದೆ. ನಿಮ್ಮ ${d.crop} ಬೆಳೆ ಹಾನಿಗೊಳಗಾದರೆ, ${d.perilAlert.windowHours} ಗಂಟೆಗಳ ಒಳಗೆ PMFBY ಕ್ಲೇಮ್ ದಾಖಲಿಸಬಹುದು. ಈಗಲೇ ಆರಂಭಿಸಲು 1 ಒತ್ತಿ ಅಥವಾ "ಕ್ಲೇಮ್ ದಾಖಲಿಸು" ಎಂದು ಹೇಳಿ, ಅಥವಾ ಹತ್ತಿರದ PACS ಕಿಯೋಸ್ಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ.`,
      ml: `PACS സഹായക് മുന്നറിയിപ്പ്: ${d.district}ൽ ${d.perilAlert.type} റിപ്പോർട്ട് ചെയ്തിട്ടുണ്ട്. നിങ്ങളുടെ ${d.crop} വിള നശിച്ചെങ്കിൽ, ${d.perilAlert.windowHours} മണിക്കൂറിനുള്ളിൽ PMFBY ക്ലെയിം നൽകാം. ഇപ്പോൾ തുടങ്ങാൻ 1 അമർത്തുക അല്ലെങ്കിൽ "ക്ലെയിം നൽകുക" എന്ന് പറയുക, അല്ലെങ്കിൽ അടുത്തുള്ള PACS കിയോസ്കിൽ പോകുക.`,
    };
    return templates[lang] ?? templates.en;
  }

  const templates: LocalizedText = {
    en: `PACS Sahayak reminder: PMFBY enrollment for ${d.crop} in ${d.district} closes in ${days} days. Say "enroll" or visit your PACS office before the deadline to stay covered this season.`,
    hi: `पीएसीएस सहायक अनुस्मारक: ${d.district} में ${d.crop} के लिए पीएमएफबीवाई नामांकन ${days} दिनों में बंद हो रहा है। इस मौसम कवर रहने के लिए "नामांकन" कहें या समय सीमा से पहले अपने पीएसीएस कार्यालय जाएं।`,
    ta: `பாக்ஸ் சகாயக் நினைவூட்டல்: ${d.district}-ல் ${d.crop}-க்கான பிஎம்எஃப்பிவை பதிவு ${days} நாட்களில் முடிவடைகிறது. இந்த பருவம் காப்பீடு பெற "பதிவு" எனச் சொல்லுங்கள் அல்லது கடைசி தேதிக்கு முன் உங்கள் பாக்ஸ் அலுவலகத்திற்குச் செல்லுங்கள்.`,
    te: `PACS సహాయక్ గుర్తుచేత: ${d.district}లో ${d.crop} కోసం PMFBY నమోదు ${days} రోజుల్లో ముగుస్తుంది. ఈ సీజన్‌లో బీమా పొందడానికి "నమోదు" అని చెప్పండి లేదా గడువుకు ముందు మీ PACS కార్యాలయానికి వెళ్లండి.`,
    kn: `PACS ಸಹಾಯಕ ಜ್ಞಾಪನೆ: ${d.district}ನಲ್ಲಿ ${d.crop}ಗಾಗಿ PMFBY ನೋಂದಣಿ ${days} ದಿನಗಳಲ್ಲಿ ಮುಗಿಯುತ್ತದೆ. ಈ ಋತುವಿನಲ್ಲಿ ವಿಮೆ ಪಡೆಯಲು "ನೋಂದಣಿ" ಎಂದು ಹೇಳಿ ಅಥವಾ ಗಡುವಿನ ಮೊದಲು ನಿಮ್ಮ PACS ಕಚೇರಿಗೆ ಭೇಟಿ ನೀಡಿ.`,
    ml: `PACS സഹായക് ഓർമ്മപ്പെടുത്തൽ: ${d.district}ൽ ${d.crop}നുള്ള PMFBY രജിസ്ട്രേഷൻ ${days} ദിവസത്തിനുള്ളിൽ അവസാനിക്കും. ഈ സീസണിൽ ഇൻഷുറൻസ് ലഭിക്കാൻ "രജിസ്റ്റർ" എന്ന് പറയുക അല്ലെങ്കിൽ സമയപരിധിക്ക് മുൻപ് നിങ്ങളുടെ PACS ഓഫീസിൽ പോകുക.`,
  };
  return templates[lang] ?? templates.en;
}
