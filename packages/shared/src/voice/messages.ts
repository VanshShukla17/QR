export type VoiceLanguageCode = "en-IN" | "hi-IN" | "kn-IN";

export type VoiceVerdictType =
  "VERIFIED" | "RECENTLY_REGISTERED" | "UNVERIFIED" | "WARNING";

export interface VoiceLanguageMeta {
  code: VoiceLanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_VOICE_LANGUAGES: Record<VoiceLanguageCode, VoiceLanguageMeta> = {
  "en-IN": {
    code: "en-IN",
    label: "English",
    nativeLabel: "English",
  },
  "hi-IN": {
    code: "hi-IN",
    label: "Hindi",
    nativeLabel: "हिन्दी",
  },
  "kn-IN": {
    code: "kn-IN",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
  },
};

/**
 * Voice spoken templates.
 * NOTE: Hindi and Kannada strings marked as "needs native-speaker review".
 */
export const VOICE_TEMPLATES = {
  "en-IN": {
    VERIFIED:
      "You are about to pay {merchant}. This merchant is verified. You can pay safely.",
    VERIFIED_NO_NAME:
      "You are about to pay this merchant. This merchant is verified. You can pay safely.",
    RECENTLY_REGISTERED:
      "You are about to pay {merchant}. This merchant is recently registered and trust is still building. Please confirm with the shopkeeper before paying.",
    RECENTLY_REGISTERED_NO_NAME:
      "This merchant is recently registered and trust is still building. Please confirm with the shopkeeper before paying.",
    UNVERIFIED:
      "This QR code is not verified. We cannot confirm who it belongs to. Please confirm with the shopkeeper before paying.",
    WARNING: "Warning! Something is wrong with this QR code. Do not pay.",
  },
  // needs native-speaker review
  "hi-IN": {
    // needs native-speaker review
    VERIFIED:
      "आप {merchant} को भुगतान करने जा रहे हैं। यह व्यापारी सत्यापित है। आप सुरक्षित रूप से भुगतान कर सकते हैं।",
    // needs native-speaker review
    VERIFIED_NO_NAME:
      "आप इस व्यापारी को भुगतान करने जा रहे हैं। यह व्यापारी सत्यापित है। आप सुरक्षित रूप से भुगतान कर सकते हैं।",
    // needs native-speaker review
    RECENTLY_REGISTERED:
      "आप {merchant} को भुगतान करने जा रहे हैं। यह व्यापारी हाल ही में पंजीकृत हुआ है और भरोसा अभी बन रहा है। भुगतान से पहले दुकानदार से पुष्टि करें।",
    // needs native-speaker review
    RECENTLY_REGISTERED_NO_NAME:
      "यह व्यापारी हाल ही में पंजीकृत हुआ है और भरोसा अभी बन रहा है। भुगतान से पहले दुकानदार से पुष्टि करें।",
    // needs native-speaker review
    UNVERIFIED:
      "यह क्यूआर कोड सत्यापित नहीं है। हम पुष्टि नहीं कर सकते कि यह किसका है। भुगतान से पहले दुकानदार से पूछ लें।",
    // needs native-speaker review
    WARNING: "चेतावनी! इस क्यूआर कोड में गड़बड़ी पाई गई है। भुगतान न करें।",
  },
  // needs native-speaker review
  "kn-IN": {
    // needs native-speaker review
    VERIFIED:
      "ನೀವು {merchant} ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಪರಿಶೀಲಿತರಾಗಿದ್ದಾರೆ. ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಪಾವತಿಸಬಹುದು.",
    // needs native-speaker review
    VERIFIED_NO_NAME:
      "ನೀವು ಈ ವ್ಯಾಪಾರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಪರಿಶೀಲಿತರಾಗಿದ್ದಾರೆ. ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಪಾವತಿಸಬಹುದು.",
    // needs native-speaker review
    RECENTLY_REGISTERED:
      "ನೀವು {merchant} ಅವರಿಗೆ ಪಾವತಿ ಮಾಡಲಿದ್ದೀರಿ. ಈ ವ್ಯಾಪಾರಿ ಇತ್ತೀಚೆಗೆ ನೋಂದಾಯಿಸಿದ್ದಾರೆ, ವಿಶ್ವಾಸ ಇನ್ನೂ ಬೆಳೆಯುತ್ತಿದೆ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
    // needs native-speaker review
    RECENTLY_REGISTERED_NO_NAME:
      "ಈ ವ್ಯಾಪಾರಿ ಇತ್ತೀಚೆಗೆ ನೋಂದಾಯಿಸಿದ್ದಾರೆ, ವಿಶ್ವಾಸ ಇನ್ನೂ ಬೆಳೆಯುತ್ತಿದೆ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
    // needs native-speaker review
    UNVERIFIED:
      "ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ ಪರಿಶೀಲಿತವಾಗಿಲ್ಲ. ಇದು ಯಾರದು ಎಂದು ನಾವು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಪಾವತಿಸುವ ಮೊದಲು ಅಂಗಡಿಯವರನ್ನು ಕೇಳಿ.",
    // needs native-speaker review
    WARNING: "ಎಚ್ಚರಿಕೆ! ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ನಲ್ಲಿ ಸಮಸ್ಯೆ ಕಂಡುಬಂದಿದೆ. ಪಾವತಿ ಮಾಡಬೇಡಿ.",
  },
} as const;

/**
 * On-screen localized labels corresponding to the 4 verdicts so on-screen UI and audio match.
 */
export const VERDICT_DISPLAY_LABELS: Record<
  VoiceLanguageCode,
  Record<VoiceVerdictType, { title: string; subtitle: string }>
> = {
  "en-IN": {
    VERIFIED: {
      title: "VERIFIED",
      subtitle: "Verified Merchant • Safe to Pay",
    },
    RECENTLY_REGISTERED: {
      title: "RECENTLY REGISTERED",
      subtitle: "Trust Still Building • Confirm with Shopkeeper",
    },
    UNVERIFIED: {
      title: "NOT VERIFIED",
      subtitle: "Unregistered QR • Verify Before Paying",
    },
    WARNING: {
      title: "TAMPER WARNING",
      subtitle: "Suspicious QR Code • Do Not Pay",
    },
  },
  "hi-IN": {
    VERIFIED: {
      title: "सत्यापित",
      subtitle: "सत्यापित व्यापारी • भुगतान सुरक्षित है",
    },
    RECENTLY_REGISTERED: {
      title: "हाल ही में पंजीकृत",
      subtitle: "विश्वास प्रक्रियाधीन है • दुकानदार से पुष्टि करें",
    },
    UNVERIFIED: {
      title: "असत्यापित क्यूआर",
      subtitle: "अनाधिकृत क्यूआर कोड • भुगतान से पहले पुष्टि करें",
    },
    WARNING: {
      title: "चेतावनी",
      subtitle: "संदिग्ध क्यूआर कोड • भुगतान न करें",
    },
  },
  "kn-IN": {
    VERIFIED: {
      title: "ಪರಿಶೀಲಿತ",
      subtitle: "ಪರಿಶೀಲಿತ ವ್ಯಾಪಾರಿ • ಸುರಕ್ಷಿತ ಪಾವತಿ",
    },
    RECENTLY_REGISTERED: {
      title: "ಇತ್ತೀಚೆಗೆ ನೋಂದಾಯಿಸಲಾಗಿದೆ",
      subtitle: "ವಿಶ್ವಾಸ ಇನ್ನೂ ಬೆಳೆಯುತ್ತಿದೆ • ಅಂಗಡಿಯವರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿ",
    },
    UNVERIFIED: {
      title: "ಪರಿಶೀಲಿಸದ ಕ್ಯೂಆರ್",
      subtitle: "ನೋಂದಾಯಿಸದ ಕ್ಯೂಆರ್ ಕೋಡ್ • ಪಾವತಿಸುವ ಮುನ್ನ ಪರಿಶೀಲಿಸಿ",
    },
    WARNING: {
      title: "ಎಚ್ಚರಿಕೆ",
      subtitle: "ಅನುಮಾನಾಸ್ಪದ ಕ್ಯೂಆರ್ ಕೋಡ್ • ಪಾವತಿ ಮಾಡಬೇಡಿ",
    },
  },
};

/**
 * Formats the exact spoken text for a given verdict, language, and verified merchant name.
 *
 * Rules:
 * - Only verified / recently registered verdicts incorporate merchantDisplayName.
 * - UNVERIFIED and WARNING NEVER include merchant name (preventing attacker injection).
 * - If merchantDisplayName is missing, falls back cleanly to the no-name template.
 */
export function formatVoiceScript(
  verdict: VoiceVerdictType,
  lang: VoiceLanguageCode,
  merchantDisplayName?: string
): string {
  const languageTemplates = VOICE_TEMPLATES[lang] || VOICE_TEMPLATES["en-IN"];

  if (verdict === "UNVERIFIED") {
    return languageTemplates.UNVERIFIED;
  }

  if (verdict === "WARNING") {
    return languageTemplates.WARNING;
  }

  const cleanName = merchantDisplayName?.trim();

  if (verdict === "VERIFIED") {
    if (cleanName) {
      return languageTemplates.VERIFIED.replace("{merchant}", cleanName);
    }
    return languageTemplates.VERIFIED_NO_NAME;
  }

  if (verdict === "RECENTLY_REGISTERED") {
    if (cleanName) {
      return languageTemplates.RECENTLY_REGISTERED.replace("{merchant}", cleanName);
    }
    return languageTemplates.RECENTLY_REGISTERED_NO_NAME;
  }

  return languageTemplates.WARNING;
}
